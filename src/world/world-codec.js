/**
 * Save format v4: { version: 4, size: [128,128,64], meta, blocks: [id, run, ...] }.
 * packWorld → one byte tag (1 = gzip, 0 = raw utf-8) + payload, so the same
 * bytes serve IndexedDB, .ccw export, and (base64url) the share hash.
 */
import { World, DEFAULT_BOUNDS } from "./world.js";
import { convertLegacyMap } from "./legacy-convert.js";
import { rleEncode, rleDecode } from "./rle.js";

export { rleEncode, rleDecode };

/**
 * v4 stores one flat array, `(z * 128 + y) * 128 + x`, over the 128 box at the
 * origin. A world with other bounds has no v4 form; it waits for v5.
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

export function encodeWorld(w) {
  if (!isV4Box(w.bounds)) throw new Error("only the 128 box has a v4 form");
  const flat = new Uint8Array(V4_CELLS);
  eachV4Row(w, (col, c, f) => flat.set(col.subarray(c, c + 16), f));
  return { version: 4, size: [V4, V4, World.H], meta: structuredClone(w.meta), blocks: rleEncode(flat) };
}

export function decodeWorld(o) {
  if (!o || typeof o !== "object") throw new Error("bad world");
  if (o.version !== 4) return convertLegacyMap(o);
  const [x, y, z] = o.size || [];
  if (x !== V4 || y !== V4 || z !== World.H) throw new Error(`unsupported size ${o.size}`);
  const w = new World(o.meta || {});
  if (!isV4Box(w.bounds)) throw new Error("v4 world with bounds other than its box");
  const flat = rleDecode(o.blocks, V4_CELLS);
  eachV4Row(w, (col, c, f) => col.set(flat.subarray(f, f + 16), c));
  w.markAllDirty(); w.version++;
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

/** @returns {Promise<string|null>} "v4.<base64url>" or null when too large to share by URL */
export async function toShareHash(w) {
  const bytes = await packWorld(w);
  let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const hash = "v4." + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return hash.length < SHARE_LIMIT ? hash : null;
}

export async function fromShareHash(hash) {
  if (!hash.startsWith("v4.")) throw new Error("not a v4 share hash");
  return unpackWorld(unb64u(hash.slice(3)));
}
