/**
 * Save format v5: { version: 5, meta, columns: [[cx, cy, overlay, placed?], ...] }
 * — the generator settings ride in `meta.gen`, and only columns that differ
 * from what the generator makes are listed, each as a run-length encoded
 * delta (world-delta.js). An unedited world is its meta and nothing else.
 *
 * v4, { version: 4, size: [128,128,64], meta, blocks: [id, run, ...] }, is
 * still read, forever: every world, file and share hash from before v5.
 *
 * packWorld → one byte tag (1 = gzip, 0 = raw utf-8) + payload, so the same
 * bytes serve .ccw export and (base64url) the share hash. IndexedDB keeps the
 * same deltas one row per column instead (world-store.js).
 */
import { World, DEFAULT_BOUNDS, colKey } from "./world.js";
import { convertLegacyMap } from "./legacy-convert.js";
import { rleEncode, rleDecode, rleLength } from "./rle.js";
import { GEN_VERSION } from "./column-gen.js";
import { checkGen, foldEdits, restoreColumns, PLACED_BYTES } from "./world-delta.js";
import { randomSeed } from "./world-gen.js";

export { rleEncode, rleDecode };

const COLUMN_CELLS = 16 * 16 * World.H;
/** Column coordinates inside the ±2²⁰ border. */
const COL_LIMIT = World.BORDER >> 4;

/** The document for `w`: its meta and a delta per edited column, in key order. */
export function encodeWorld(w) {
  foldEdits(w);
  const columns = [...w.edits.entries()].sort((a, b) => a[0] - b[0]).map(([, d]) =>
    d.placed ? [d.cx, d.cy, d.overlay, d.placed] : [d.cx, d.cy, d.overlay]);
  return { version: 5, meta: structuredClone(w.meta), columns };
}

export function decodeWorld(o) {
  if (!o || typeof o !== "object") throw new Error("bad world");
  if (o.version === 5) return decodeV5(o);
  if (o.version === 4) return decodeV4(o);
  // Legacy 2D maps are version 2 or 3, or carry none at all.
  if (typeof o.version === "number" && o.version > 5) throw new Error(`unsupported world version ${o.version}`);
  return migrated(convertLegacyMap(o));
}

/**
 * A v5 document into a world. `edits` is filled first and every resident
 * column is then built from the generator with its delta laid over it, which
 * is exactly how a streamed column will load. Anything malformed is refused
 * whole rather than half-loaded.
 */
function decodeV5(o) {
  const meta = o.meta && typeof o.meta === "object" ? o.meta : {};
  if (meta.gen !== undefined) checkGen(meta.gen);
  if (!Array.isArray(o.columns)) throw new Error("v5 world without columns");
  const w = new World(meta);
  const inside = (v) => Number.isInteger(v) && v >= -COL_LIMIT && v < COL_LIMIT;
  for (const c of o.columns) {
    const [cx, cy, overlay, placed] = Array.isArray(c) ? c : [];
    if (!inside(cx) || !inside(cy)) throw new Error(`column out of range ${cx},${cy}`);
    if (rleLength(overlay) !== COLUMN_CELLS) throw new Error(`bad overlay at ${cx},${cy}`);
    if (placed != null && rleLength(placed) !== PLACED_BYTES) throw new Error(`bad placed bits at ${cx},${cy}`);
    const key = colKey(cx, cy);
    if (w.edits.has(key)) throw new Error(`column ${cx},${cy} listed twice`);
    w.edits.set(key, { cx, cy, overlay, placed: placed ?? null, rev: 0 });
  }
  restoreColumns(w);
  return w;
}

/**
 * v4 stores one flat array, `(z * 128 + y) * 128 + x`, over the 128 box at the
 * origin. Only that box has a v4 form. Nothing writes v4 any more; `encodeV4`
 * stays for tests and for building v4 fixtures.
 */
const V4 = DEFAULT_BOUNDS.x1, V4_CELLS = V4 * V4 * World.H;
const isV4Box = (b) => b.x0 === 0 && b.y0 === 0 && b.x1 === V4 && b.y1 === V4;

/** Copy between the columns and a flat v4 array, one 16-cell row at a time. */
function eachV4Row(w, fn) {
  for (let cy = 0; cy < V4 / 16; cy++) for (let cx = 0; cx < V4 / 16; cx++) {
    const col = w.ensureColumn(cx, cy).blocks;
    for (let z = 0; z < World.H; z++) for (let ly = 0; ly < 16; ly++) {
      fn(col, (z << 8) | (ly << 4), (z * V4 + cy * 16 + ly) * V4 + cx * 16);
    }
  }
}

export function encodeV4(w) {
  if (!isV4Box(w.bounds)) throw new Error("only the 128 box has a v4 form");
  const flat = new Uint8Array(V4_CELLS);
  eachV4Row(w, (col, c, f) => flat.set(col.subarray(c, c + 16), f));
  return { version: 4, size: [V4, V4, World.H], meta: structuredClone(w.meta), blocks: rleEncode(flat) };
}

/**
 * A v4 document keeps its content cell for cell and stays the bounded 128
 * box. Every column is marked modified, so the first v5 save diffs them all
 * against the world's generator and keeps what differs: only the real edits
 * of a world that has a generator (made since phase 2), the whole content of
 * one that does not.
 */
function decodeV4(o) {
  const [x, y, z] = o.size || [];
  if (x !== V4 || y !== V4 || z !== World.H) throw new Error(`unsupported size ${o.size}`);
  if (rleLength(o.blocks) !== V4_CELLS) throw new Error("bad v4 blocks");
  const w = new World(o.meta || {});
  if (!isV4Box(w.bounds)) throw new Error("v4 world with bounds other than its box");
  const flat = rleDecode(o.blocks, V4_CELLS);
  eachV4Row(w, (col, c, f) => col.set(flat.subarray(f, f + 16), c));
  for (const col of w.columns.values()) col.modified = true;
  w.markAllDirty(); w.version++;
  return migrated(w);
}

/**
 * A world from before stored generators gets a void one, and a seed of its
 * own, on first open (endless-world decision #1). Void makes only air, so its
 * deltas are its full content — the old terrain, edge heights and all, which a
 * later blend band feathers new terrain out from. The seed is unused until
 * then; it is drawn now so it is saved with the world and never changes.
 */
function migrated(w) {
  let ok = false;
  try { ok = w.meta.gen !== undefined && !!checkGen(w.meta.gen); } catch (_) { /* replaced below */ }
  if (!ok) w.meta.gen = { kind: "void", seed: randomSeed(), v: GEN_VERSION };
  return w;
}

const enc = new TextEncoder(), dec = new TextDecoder();
const hasGzip = () => typeof globalThis.CompressionStream === "function" && typeof globalThis.DecompressionStream === "function";

async function pipe(bytes, stream) {
  const r = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(r).arrayBuffer());
}

export async function packWorld(w) {
  const json = enc.encode(JSON.stringify(encodeWorld(w)));
  const body = hasGzip() ? await pipe(json, new CompressionStream("gzip")) : json;
  const out = new Uint8Array(body.length + 1);
  out[0] = hasGzip() ? 1 : 0; out.set(body, 1);
  return out;
}

export async function unpackWorld(bytes) {
  const tag = bytes[0], body = bytes.subarray(1);
  const json = tag === 1 ? await pipe(body, new DecompressionStream("gzip")) : body;
  return decodeWorld(JSON.parse(dec.decode(json)));
}

const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export const SHARE_LIMIT = 60_000;

/**
 * A share hash is the packed document behind a version prefix. The prefix only
 * tells the host "this is a world"; the document inside names its own version,
 * so `v4.` links made before v5 open through the same path.
 */
export const isShareHash = (hash) => /^v[45]\./.test(hash);

/** @returns {Promise<string|null>} "v5.<base64url>" or null when too large to share by URL */
export async function toShareHash(w) {
  const bytes = await packWorld(w);
  let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const hash = "v5." + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return hash.length < SHARE_LIMIT ? hash : null;
}

export async function fromShareHash(hash) {
  if (!isShareHash(hash)) throw new Error("not a world share hash");
  return unpackWorld(unb64u(hash.slice(3)));
}
