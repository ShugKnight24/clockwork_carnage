import { describe, it, expect, beforeEach, vi } from "vitest";

// The pool is module state shared by every cache, so each test gets a fresh copy.
let mod;
beforeEach(async () => {
  vi.resetModules();
  mod = await import("../../src/rendering/sprite-cache.js");
});

/** A stand-in canvas: the cache only reads width and height. */
const canvas = (w, h) => ({ width: w, height: h });
const KB = 1024;

describe("SpriteCache", () => {
  it("counts each canvas as w*h*4 bytes, per cache and in the shared pool", () => {
    const a = new mod.SpriteCache(1e9);
    const b = new mod.SpriteCache(1e9);
    a.set("x", canvas(10, 10));
    b.set("y", canvas(20, 5));
    expect(a.bytes).toBe(400);
    expect(b.bytes).toBe(400);
    expect(mod.spriteBytes()).toBe(800);
    a.set("x", canvas(1, 1)); // replacing a key releases the old bitmap's bytes
    expect(a.bytes).toBe(4);
    expect(mod.spriteBytes()).toBe(404);
  });

  it("returns the cached canvas on a hit and undefined on a miss", () => {
    const a = new mod.SpriteCache(1e9);
    const c = canvas(4, 4);
    expect(a.set("k", c)).toBe(c);
    expect(a.get("k")).toBe(c);
    expect(a.get("nope")).toBeUndefined();
  });

  it("evicts least recently used first once past its byte cap", () => {
    const a = new mod.SpriteCache(3 * 4 * KB); // three 1 KB-px sprites
    a.set("a", canvas(32, 32));
    a.set("b", canvas(32, 32));
    a.set("c", canvas(32, 32));
    a.get("a"); // a is now newer than b
    a.set("d", canvas(32, 32));
    expect(a.get("b")).toBeUndefined();
    expect(a.get("a")).toBeDefined();
    expect(a.get("c")).toBeDefined();
    expect(a.get("d")).toBeDefined();
    expect(a.bytes).toBe(3 * 4 * KB);
    expect(mod.spriteBytes()).toBe(3 * 4 * KB);
  });

  it("keeps a sprite larger than the cap, alone, so the caller can draw it", () => {
    const a = new mod.SpriteCache(100);
    a.set("small", canvas(2, 2));
    const big = canvas(100, 100);
    a.set("big", big);
    expect(a.size).toBe(1);
    expect(a.get("big")).toBe(big);
  });

  it("clear drops every sprite and its bytes from the pool", () => {
    const a = new mod.SpriteCache(1e9);
    const b = new mod.SpriteCache(1e9);
    a.set("x", canvas(10, 10));
    a.set("y", canvas(10, 10));
    b.set("z", canvas(10, 10));
    a.clear();
    expect(a.size).toBe(0);
    expect(a.bytes).toBe(0);
    expect(a.get("x")).toBeUndefined();
    expect(mod.spriteBytes()).toBe(400);
  });

  it("trims the oldest sprite across caches when the shared pool is full", () => {
    mod.setSpriteBudget(3 * 400);
    const a = new mod.SpriteCache(1e9);
    const b = new mod.SpriteCache(1e9);
    a.set("a1", canvas(10, 10));
    b.set("b1", canvas(10, 10));
    a.set("a2", canvas(10, 10));
    a.get("a1"); // b1 is now the oldest anywhere
    b.set("b2", canvas(10, 10));
    expect(b.get("b1")).toBeUndefined();
    expect(a.size + b.size).toBe(3);
    expect(mod.spriteBytes()).toBe(1200);
  });
});

describe("phone budget", () => {
  it("setRasterBudget gives the sprite pool a quarter and trims to it at once", async () => {
    const { setRasterBudget, PHONE_RASTER_BUDGET } = await import("../../src/rendering/svg-art/raster.js");
    const a = new mod.SpriteCache(1e9);
    // 24 MB of 1 MB sprites fits the desktop pool (64 MB).
    for (let i = 0; i < 24; i++) a.set(i, canvas(512, 512));
    expect(mod.spriteBytes()).toBe(24 * 1024 * KB);
    setRasterBudget(PHONE_RASTER_BUDGET);
    expect(mod.spriteBytes()).toBeLessThanOrEqual(PHONE_RASTER_BUDGET / 4);
    expect(mod.spriteBytes()).toBe(16 * 1024 * KB);
    expect(a.get(0)).toBeUndefined(); // the oldest went first
    expect(a.get(23)).toBeDefined();
  });
});
