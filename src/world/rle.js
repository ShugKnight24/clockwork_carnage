// src/world/rle.js
/**
 * Run-length encoding as flat `[value, count, value, count, ...]` arrays: the
 * v4 block array, v5 column overlays and placed bits all use it. Runs stop at
 * 65,535 so the counts stay small in JSON and in IndexedDB.
 */
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

/**
 * Cells a run array covers, or -1 when it is not one: an even-length array of
 * byte values and positive integer counts. Untrusted input (files, share
 * hashes) is checked with this before it is decoded, because `rleDecode` would
 * silently truncate or zero-fill a wrong length.
 */
export function rleLength(pairs) {
  if (!Array.isArray(pairs) || pairs.length % 2) return -1;
  let n = 0;
  for (let i = 0; i < pairs.length; i += 2) {
    const v = pairs[i], c = pairs[i + 1];
    if (!Number.isInteger(v) || v < 0 || v > 255 || !Number.isInteger(c) || c < 1) return -1;
    n += c;
  }
  return n;
}
