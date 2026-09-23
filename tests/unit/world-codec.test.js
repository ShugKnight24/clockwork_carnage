import { describe, it, expect, vi } from "vitest";
import {
  rleEncode, rleDecode, encodeWorld, encodeV4, decodeWorld, packWorld, unpackWorld,
  toShareHash, fromShareHash, isShareHash, SHARE_LIMIT,
} from "../../src/world/world-codec.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { World } from "../../src/world/world.js";
import { World as FlatWorld } from "./fixtures/flat-world.js";
import { createHash } from "node:crypto";

/** Every resident cell, in column order. */
const cells = (w) => Buffer.concat([...w.columns.values()].map((c) => Buffer.from(c.blocks)));
const sha = (o) => createHash("sha256").update(JSON.stringify(o)).digest("hex");
/** sha of {version, size, blocks} of a flat world's v4 document, from before generator v1. */
const FLAT_BLOCKS_SHA = "1488c496429bac426847a081dd4b26aa7969abbfdd33e4f35b6e7997f02fd9ac";

/** The v4 hash format, built the way the pre-v5 encoder built it. */
async function v4Hash(w) {
  const json = new TextEncoder().encode(JSON.stringify(encodeV4(w)));
  const gz = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  const bytes = new Uint8Array(gz.length + 1); bytes[0] = 1; bytes.set(gz, 1);
  return "v4." + Buffer.from(bytes).toString("base64url");
}

/** A small house: floor, four walls with a door gap, a roof — 1,000-odd blocks. */
function buildHouse(w, ox, oy, oz) {
  let n = 0;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    for (let z = 0; z < 8; z++) {
      const wall = x === 0 || y === 0 || x === 11 || y === 11;
      if (z === 0 || z === 7 || (wall && !(x === 5 && y === 0 && z < 3))) { w.set(ox + x, oy + y, oz + z, z === 7 ? 4 : 2); n++; }
    }
  }
  return n;
}

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

describe("v5 codec", () => {
  it("encodes a flat world to meta plus its edited columns and decodes it back", () => {
    const w = generateWorld({ terrain: false });
    w.set(5, 5, 32, 8); w.meta.name = "Test"; w.meta.exit = { x: 3, y: 4, z: 32 };
    const o = encodeWorld(w);
    expect(o.version).toBe(5);
    expect(o.columns.map(([cx, cy]) => [cx, cy])).toEqual([[0, 0]]);
    expect(JSON.stringify(o).length).toBeLessThan(1000);
    const back = decodeWorld(JSON.parse(JSON.stringify(o)));
    expect(back.get(5, 5, 32)).toBe(8); expect(back.meta.name).toBe("Test"); expect(back.meta.exit).toEqual({ x: 3, y: 4, z: 32 });
    expect(cells(back).equals(cells(w))).toBe(true);
    expect(back.dirty.size).toBe(256);
  });

  it("saves an unedited world as its meta and nothing else", () => {
    const o = encodeWorld(generateWorld({ terrain: true, seed: 77 }));
    expect(o.columns).toEqual([]);
    expect(JSON.stringify(o).length).toBeLessThan(600);
  });

  it("round-trips an edited terrain world with placed bits through packWorld", async () => {
    const w = generateWorld({ terrain: true, seed: 3 });
    buildHouse(w, 20, 20, 48);
    for (let x = 60; x < 70; x++) for (let z = 1; z < 40; z++) w.set(x, 100, z, 0); // a trench
    w.markPlaced(20, 20, 48); w.markPlaced(31, 31, 55);
    const bytes = await packWorld(w);
    expect(bytes[0]).toBe(1); // gzip tag
    const back = await unpackWorld(bytes);
    expect(cells(back).equals(cells(w))).toBe(true);
    expect(back.wasPlaced(20, 20, 48)).toBe(true);
    expect(back.wasPlaced(31, 31, 55)).toBe(true);
    expect(back.wasPlaced(21, 20, 48)).toBe(false);
    expect(back.meta.gen).toEqual(w.meta.gen);
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

  it("refuses what it cannot reproduce or does not recognise", () => {
    const good = () => encodeWorld(generateWorld({ terrain: true, seed: 9 }));
    const edited = () => { const w = generateWorld({ terrain: false }); w.set(1, 1, 40, 3); return encodeWorld(w); };
    const bad = [
      (o) => { o.meta.gen = { kind: "caves", seed: 1, v: 1 }; },
      (o) => { o.meta.gen.v = 3; },
      (o) => { o.meta.gen = { kind: "terrain", v: 1 }; },
      (o) => { delete o.columns; },
    ];
    for (const spoil of bad) { const o = good(); spoil(o); expect(() => decodeWorld(o)).toThrow(); }
    const badCols = [
      (o) => { o.columns[0][2] = [255, 100]; },         // overlay too short
      (o) => { o.columns[0][2] = [256, 16384]; },       // not a byte
      (o) => { o.columns[0][3] = [0, 10]; },            // placed bits too short
      (o) => { o.columns[0][0] = 70000; },              // past the border
      (o) => { o.columns[0][1] = 0.5; },
      (o) => { o.columns.push(o.columns[0]); },         // listed twice
    ];
    for (const spoil of badCols) { const o = edited(); spoil(o); expect(() => decodeWorld(o)).toThrow(); }
    expect(() => decodeWorld({ version: 6, meta: {}, columns: [] })).toThrow(/version 6/);
  });
});

describe("v4 still opens", () => {
  it("writes the same v4 document the flat array did", () => {
    const w = generateWorld({ terrain: true, seed: 11 });
    for (let z = 30; z < 50; z++) { w.set(15, 16, z, 8); w.set(16, 15, z, 5); w.set(127, 0, z, 2); w.set(0, 127, z, 3); }
    w.meta.name = "Borders";
    const flat = new FlatWorld(structuredClone(w.meta));
    for (let z = 0; z < 64; z++) for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) flat.blocks[flat.index(x, y, z)] = w.get(x, y, z);
    const before = { version: 4, size: [128, 128, 64], meta: structuredClone(flat.meta), blocks: rleEncode(flat.blocks) };
    expect(JSON.stringify(encodeV4(w))).toBe(JSON.stringify(before));
    const back = decodeWorld(JSON.parse(JSON.stringify(before)));
    expect(cells(back).equals(cells(w))).toBe(true);
    expect(back.dirty.size).toBe(256);
  });

  it("keeps a flat world's blocks byte-identical to the flat-array build", () => {
    // The block half of the v4 document of generateWorld({terrain: false})
    // hashed on feat/v0.8.0 before columns. Terrain moved to generator v1
    // (hashed in column-gen.test.js); flat worlds only gained meta.gen, and
    // are the same in every generator version.
    const o = encodeV4(generateWorld({ terrain: false }));
    expect(sha({ version: o.version, size: o.size, blocks: o.blocks })).toBe(FLAT_BLOCKS_SHA);
    expect(o.meta.gen).toEqual({ kind: "flat", seed: 1, v: 2 });
  });

  it("has no v4 form for a world with other bounds", () => {
    const w = new World({ bounds: { x0: -64, y0: 0, x1: 64, y1: 128 } });
    expect(() => encodeV4(w)).toThrow();
    const o = encodeV4(generateWorld({ terrain: false }));
    o.meta.bounds = { x0: -64, y0: 0, x1: 64, y1: 128 };
    expect(() => decodeWorld(o)).toThrow();
  });

  it("migrates a v4 world with no generator into a seeded void world, cell for cell", () => {
    // Every world saved before phase 2: old terrain, no meta.gen.
    const src = generateWorld({ terrain: true, seed: 21 });
    buildHouse(src, 40, 40, 45);
    delete src.meta.gen;
    const v4 = JSON.parse(JSON.stringify(encodeV4(src)));
    const w = decodeWorld(v4);
    expect(w.meta.gen).toMatchObject({ kind: "void", v: 1 });
    expect(Number.isInteger(w.meta.gen.seed)).toBe(true);
    expect(w.meta.bounds).toBeUndefined(); // still the default box, not a chosen one
    expect(w.bounds).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
    expect(cells(w).equals(cells(src))).toBe(true);
    expect([...w.columns.values()].every((c) => c.modified)).toBe(true);

    // Stored as v5 it keeps every column in full, so it reloads identically
    // and a later blend band can read the old edge heights from it.
    const v5 = JSON.parse(JSON.stringify(encodeWorld(w)));
    expect(v5.columns).toHaveLength(64);
    const back = decodeWorld(v5);
    expect(cells(back).equals(cells(src))).toBe(true);
    expect(back.meta.gen).toEqual(w.meta.gen);
    expect(back.topSolid(127, 64)).toBe(src.topSolid(127, 64));
  });

  it("keeps the generator of a v4 world made since phase 2, so only real edits are stored", () => {
    const src = generateWorld({ terrain: true, seed: 31 });
    src.set(10, 10, 50, 5); src.set(100, 100, 50, 6);
    const w = decodeWorld(JSON.parse(JSON.stringify(encodeV4(src))));
    expect(w.meta.gen).toEqual({ kind: "terrain", seed: 31, v: 2 });
    const v5 = encodeWorld(w);
    expect(v5.columns.map(([cx, cy]) => `${cx},${cy}`)).toEqual(["0,0", "6,6"]);
    expect(cells(decodeWorld(v5)).equals(cells(src))).toBe(true);
  });

  it("gives a converted legacy map a seeded void generator", () => {
    const grid = Array.from({ length: 60 }, () => Array(60).fill(0));
    grid[3][2] = 1;
    const w = decodeWorld({ version: 3, name: "Old", width: 60, height: 60, grid });
    expect(w.meta.gen).toMatchObject({ kind: "void", v: 1 });
    const back = decodeWorld(encodeWorld(w));
    expect(cells(back).equals(cells(w))).toBe(true);
  });
});

describe("share hashes", () => {
  it("writes v5. and opens both v5. and v4. hashes", async () => {
    const w = generateWorld({ terrain: false });
    w.set(40, 40, 40, 9);
    const hash = await toShareHash(w);
    expect(hash.startsWith("v5.")).toBe(true);
    expect((await fromShareHash(hash)).get(40, 40, 40)).toBe(9);

    const old = await v4Hash(w);
    expect(isShareHash(old)).toBe(true);
    const fromOld = await fromShareHash(old);
    expect(fromOld.get(40, 40, 40)).toBe(9);
    expect(cells(fromOld).equals(cells(w))).toBe(true);
    expect(isShareHash("v6.abc")).toBe(false);
    await expect(fromShareHash("x1.abc")).rejects.toThrow();
  });

  it("is tiny for an unedited world", async () => {
    const hash = await toShareHash(generateWorld({ terrain: true, seed: 123456 }));
    expect(hash.length).toBeLessThan(400);
  });

  it("fits a 1,000-block build easily", async () => {
    const w = generateWorld({ terrain: true, seed: 5 });
    expect(buildHouse(w, 60, 60, 48)).toBeGreaterThan(500);
    buildHouse(w, 80, 60, 48);
    const hash = await toShareHash(w);
    expect(hash).not.toBeNull();
    expect(hash.length).toBeLessThan(SHARE_LIMIT / 20);
  });

  it("refuses a world whose edits are noise in every column", async () => {
    const noisy = generateWorld({ terrain: true, seed: 8 });
    // splitmix32-style mixing, so each cell is genuinely high-entropy and
    // neither the overlay's runs nor gzip can rescue it.
    let i = 0;
    for (const col of noisy.columns.values()) {
      for (let c = 0; c < col.blocks.length; c++, i++) {
        let h = (i ^ 0x9e3779b9) >>> 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
        h ^= h >>> 16;
        col.blocks[c] = h & 15;
      }
      col.modified = true; // written behind set()'s back
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
