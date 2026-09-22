import { describe, it, expect, vi } from "vitest";
import { rleEncode, rleDecode, encodeWorld, decodeWorld, packWorld, unpackWorld, toShareHash, fromShareHash } from "../../src/world/world-codec.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { World } from "../../src/world/world.js";

describe("rle", () => {
  it("round-trips and compresses runs", () => {
    const u8 = new Uint8Array([0, 0, 0, 1, 1, 2, 0]);
    const pairs = rleEncode(u8);
    expect(pairs).toEqual([0, 3, 1, 2, 2, 1, 0, 1]);
    expect(Array.from(rleDecode(pairs, 7))).toEqual(Array.from(u8));
  });
  it("splits runs longer than 65535", () => {
    const u8 = new Uint8Array(70000).fill(3);
    const pairs = rleEncode(u8);
    expect(pairs).toEqual([3, 65535, 3, 4465]);
    expect(rleDecode(pairs, 70000).every((v) => v === 3)).toBe(true);
  });
});

describe("v4 codec", () => {
  it("encodes a flat world to a small v4 object and decodes it back", () => {
    const w = generateWorld({ terrain: false });
    w.set(5, 5, 32, 8); w.meta.name = "Test"; w.meta.exit = { x: 3, y: 4, z: 32 };
    const o = encodeWorld(w);
    expect(o.version).toBe(4); expect(o.size).toEqual([128, 128, 64]);
    expect(JSON.stringify(o).length).toBeLessThan(6000);
    const back = decodeWorld(o);
    expect(back.get(5, 5, 32)).toBe(8); expect(back.meta.name).toBe("Test"); expect(back.meta.exit).toEqual({ x: 3, y: 4, z: 32 });
    expect(Buffer.from(back.blocks).equals(Buffer.from(w.blocks))).toBe(true);
  });

  it("packs with gzip and unpacks", async () => {
    const w = generateWorld({ terrain: true, seed: 3 });
    const bytes = await packWorld(w);
    expect(bytes[0]).toBe(1); // gzip tag
    expect(bytes.length).toBeLessThan(60000);
    const back = await unpackWorld(bytes);
    expect(Buffer.from(back.blocks).equals(Buffer.from(w.blocks))).toBe(true);
  });

  it("round-trips without CompressionStream", async () => {
    const CS = globalThis.CompressionStream, DS = globalThis.DecompressionStream;
    vi.stubGlobal("CompressionStream", undefined); vi.stubGlobal("DecompressionStream", undefined);
    try {
      const w = generateWorld({ terrain: false });
      const bytes = await packWorld(w);
      expect(bytes[0]).toBe(0); // raw tag
      const back = await unpackWorld(bytes);
      expect(back.get(1, 1, 31)).toBe(11);
    } finally { vi.stubGlobal("CompressionStream", CS); vi.stubGlobal("DecompressionStream", DS); }
  });

  it("share hash round-trips for a small world and refuses a big one", async () => {
    const w = generateWorld({ terrain: false });
    const hash = await toShareHash(w);
    expect(hash.startsWith("v4.")).toBe(true);
    expect((await fromShareHash(hash)).get(0, 0, 31)).toBe(11);
    const noisy = new World();
    // A plain `(i * C >>> 0) & 15` collapses to `i % 16` whenever C ≡ 1 (mod 16) —
    // 2654435761 is exactly such a C, so that formula is a perfectly periodic
    // (period-16) sequence, not noise, and gzip crushes it well under the share
    // limit. Mix the bits (splitmix32-style) so each cell is genuinely
    // high-entropy and RLE/gzip can't rescue it.
    for (let i = 0; i < noisy.blocks.length; i++) {
      let h = (i ^ 0x9e3779b9) >>> 0;
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
      h ^= h >>> 16;
      noisy.blocks[i] = h & 15;
    }
    expect(await toShareHash(noisy)).toBeNull();
  });
});

import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
describe("WorldStore", () => {
  it("saves, lists and loads through a backend", async () => {
    const s = new WorldStore(new MemoryBackend());
    const w = generateWorld({ terrain: false }); w.meta.name = "One";
    await s.save(0, w);
    expect((await s.list()).map((r) => r.name)).toEqual(["One"]);
    expect((await s.load(0)).meta.name).toBe("One");
    expect(await s.nextId()).toBe(1);
    await s.remove(0); expect(await s.load(0)).toBeNull();
  });
});
