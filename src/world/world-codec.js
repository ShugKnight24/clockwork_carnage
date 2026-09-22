/**
 * Save format v4: { version: 4, size: [128,128,64], meta, blocks: [id, run, ...] }.
 * packWorld → one byte tag (1 = gzip, 0 = raw utf-8) + payload, so the same
 * bytes serve IndexedDB, .ccw export, and (base64url) the share hash.
 */
import { World } from "./world.js";
import { convertLegacyMap } from "./legacy-convert.js";

export function rleEncode(u8) {
  const out = [];
  let i = 0;
  while (i < u8.length) {
    const v = u8[i]; let n = 1;
    while (i + n < u8.length && u8[i + n] === v && n < 65535) n++;
    out.push(v, n); i += n;
  }
  return out;
}

export function rleDecode(pairs, length) {
  const u8 = new Uint8Array(length); let p = 0;
  for (let i = 0; i < pairs.length; i += 2) { u8.fill(pairs[i], p, p + pairs[i + 1]); p += pairs[i + 1]; }
  return u8;
}

export function encodeWorld(w) {
  return { version: 4, size: [World.W, World.D, World.H], meta: structuredClone(w.meta), blocks: rleEncode(w.blocks) };
}

export function decodeWorld(o) {
  if (!o || typeof o !== "object") throw new Error("bad world");
  if (o.version !== 4) return convertLegacyMap(o);
  const [x, y, z] = o.size || [];
  if (x !== World.W || y !== World.D || z !== World.H) throw new Error(`unsupported size ${o.size}`);
  const w = new World(o.meta || {});
  w.blocks = rleDecode(o.blocks, w.blocks.length);
  w.dirty.fill(1); w.version++;
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
