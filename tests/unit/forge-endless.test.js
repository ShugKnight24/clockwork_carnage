import { describe, it, expect } from "vitest";
import { ForgeMode, placementAllowed } from "../../js/forge.js";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import { World } from "../../src/world/world.js";
import { GEN_VERSION } from "../../src/world/column-gen.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { overheadWindow, newWorldLabel, OVERHEAD_SPAN } from "../../src/ui/forge-hud.js";
import { fallbackEnemyArea, FALLBACK_REACH } from "../../src/systems/voxel-glue.js";
import { oldVoidWorld } from "./fixtures/old-world.js";

const forge = () =>
  new ForgeMode({
    renderer: {},
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: { fov: 70, sensitivity: 1 },
    keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD" },
    canvas: null,
    store: new WorldStore(new MemoryBackend()),
  });
const key = (f, code, ctrl = false, shift = false) => f.handleKeyDown({ code, ctrlKey: ctrl, metaKey: false, shiftKey: shift, preventDefault() {} });

describe("the Forge in an endless world", () => {
  it("makes its first world endless and stands the player on loaded ground", async () => {
    const f = forge();
    await f.start();
    expect(f.world.endless).toBe(true);
    expect(f.world.meta.endless).toBe(true);
    expect(f.world.isLoaded(Math.floor(f.player.x), Math.floor(f.player.y))).toBe(true);
    expect(f.world.columns.size).toBe(9);
    expect(f.player.z).toBe(f.world.topSolid(Math.floor(f.player.x), Math.floor(f.player.y)) + 1);
  });

  it("makes the next world bounded after Shift+V, and endless again after another", async () => {
    const f = forge();
    await f.start();
    expect(newWorldLabel(f)).toBe("NEW: TERRAIN · ENDLESS  [V/⇧V]");
    expect(key(f, "KeyV", false, true)).toBe(true);
    expect(f.boundedNew).toBe(true);
    expect(f.terrainNew).toBe(true);
    expect(newWorldLabel(f)).toBe("NEW: TERRAIN · BOUNDED 128×128  [V/⇧V]");
    key(f, "KeyV");
    expect(newWorldLabel(f)).toBe("NEW: FLAT · BOUNDED 128×128  [V/⇧V]");
    await f.newMap();
    expect(f.world.endless).toBe(false);
    expect(f.world.bounds).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
    expect(f.world.meta.gen.kind).toBe("flat");
    key(f, "KeyV", false, true);
    await f.newMap();
    expect(f.world.endless).toBe(true);
  });

  it("reopens an endless world endless", async () => {
    const f = forge();
    await f.start();
    f._editBlock(Math.floor(f.player.x), Math.floor(f.player.y), 60, 3);
    await f.saveMap();
    const w = await f.store.load(f.currentSlot);
    expect(w.endless).toBe(true);
    w.loadAround(f.player.x, f.player.y, 0);
    expect(w.get(Math.floor(f.player.x), Math.floor(f.player.y), 60)).toBe(3);
  });

  it("loads the ground under a player put down somewhere new", async () => {
    const f = forge();
    await f.start();
    f.player.x = 250_000.5; f.player.y = -3_000.5; f.player.z = 60;
    expect(f.world.isLoaded(250_000, -3_001)).toBe(false);
    f.update(1 / 60);
    for (const [dx, dy] of [[0, 0], [-16, -16], [16, 16]]) expect(f.world.isLoaded(250_000 + dx, -3_001 + dy)).toBe(true);
  });

  it("walks up to the edge of what is loaded and waits there", async () => {
    const f = forge();
    await f.start();
    const w = f.world;
    const edge = ((Math.floor(f.player.x) >> 4) + 2) * 16; // the east edge of the 3 × 3
    f.player.angle = 0;
    f.keys = { KeyW: true };
    for (let i = 0; i < 60 * 8; i++) f.update(1 / 60);
    expect(f.player.x).toBeLessThanOrEqual(edge);
    expect(w.unloadedAt(edge, Math.floor(f.player.y))).toBe(true);
  });
});

describe("placement", () => {
  it("is refused in a column that is not loaded", () => {
    const w = new World({ gen: { kind: "flat", v: GEN_VERSION }, endless: true });
    w.loadAround(8, 8, 0);
    expect(placementAllowed(w, 8, 8, 40)).toBe(true);
    expect(placementAllowed(w, 20, 8, 40)).toBe(false);
  });
});

describe("the overhead map", () => {
  it("shows a bounded world's whole bounds", () => {
    const w = generateWorld({ terrain: false });
    expect(overheadWindow(w, { x: 3.5, y: 100.5 })).toBe(w.bounds);
  });

  it("is a 128 × 128 window around the player in an endless world", () => {
    const w = generateWorld({ terrain: false, endless: true });
    expect(OVERHEAD_SPAN).toBe(128);
    expect(overheadWindow(w, { x: -900_000.5, y: 12.2 })).toEqual({ x0: -900_065, y0: -52, x1: -899_937, y1: 76 });
  });
});

describe("play-test fallback enemies", () => {
  it("scatter across a bounded level's box, as before", () => {
    const w = generateWorld({ terrain: false });
    expect(fallbackEnemyArea(w, { x: 64.5, y: 64.5 })).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128, reach: Infinity });
  });

  it("stay within 48 blocks of the spawn in an endless world", () => {
    const w = generateWorld({ terrain: false, endless: true });
    const a = fallbackEnemyArea(w, { x: 1000.5, y: -20.5 });
    expect(FALLBACK_REACH).toBe(48);
    expect(a).toEqual({ x0: 952.5, y0: -68.5, x1: 1048.5, y1: 27.5, reach: 48 });
  });
});

describe("growing a bounded world endless (Ctrl+B, twice)", () => {
  /** A Forge on a bounded world from before v5: a void world with a flat floor and a mark. */
  async function onOldWorld() {
    const f = forge();
    await f.start();
    const old = oldVoidWorld(() => 31, { seed: 8 });
    old.set(100, 64, 40, 3);
    await f.store.save(1, old);
    f.mapIndex = await f.store.list();
    await f.switchMap(1);
    expect(f.world.endless).toBe(false);
    return f;
  }

  it("asks first, and changes nothing on one press", async () => {
    const f = await onOldWorld();
    const w = f.world;
    expect(key(f, "KeyB", true)).toBe(true);
    expect(f.world).toBe(w);
    expect(f.notice.text).toMatch(/endless/i);
    expect(f.boundedNew).toBe(false); // Ctrl+B is not B
  });

  it("grows the world on the second press, keeps the player where they stand, and saves it endless", async () => {
    const f = await onOldWorld();
    f.player.x = 120.5; f.player.y = 64.5; f.player.z = 32; f.player.angle = 1.25;
    key(f, "KeyB", true);
    for (let i = 0; i < 60; i++) f.update(1 / 60); // a second later: still asking
    key(f, "KeyB", true);
    const w = f.world;
    expect(w.endless).toBe(true);
    expect(w.meta.gen.kind).toBe("blend");
    expect([f.player.x, f.player.y, f.player.angle]).toEqual([120.5, 64.5, 1.25]);
    expect(w.isLoaded(120, 64)).toBe(true);
    expect(w.isLoaded(130, 64)).toBe(true); // the new land next to the player
    expect(w.get(100, 64, 40)).toBe(3);
    await f.saveMap();
    const back = await f.store.load(f.currentSlot);
    expect(back.endless).toBe(true);
    expect(back.meta.expandedFrom).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
  });

  it("forgets the question once its notice has gone", async () => {
    const f = await onOldWorld();
    key(f, "KeyB", true);
    for (let i = 0; i < 60 * 6; i++) f.update(1 / 60);
    key(f, "KeyB", true);
    expect(f.world.endless).toBe(false);
  });

  it("puts an expanded world back inside its old edge the same way", async () => {
    const f = await onOldWorld();
    key(f, "KeyB", true); key(f, "KeyB", true);
    expect(f.world.endless).toBe(true);
    key(f, "KeyB", true);
    expect(f.notice.text).toMatch(/old edge/i);
    key(f, "KeyB", true);
    expect(f.world.endless).toBe(false);
    expect(f.world.bounds).toEqual({ x0: 0, y0: 0, x1: 128, y1: 128 });
    expect(f.world.get(100, 64, 40)).toBe(3);
  });

  it("says so in a world that was born endless", async () => {
    const f = forge();
    await f.start();
    const w = f.world;
    key(f, "KeyB", true); key(f, "KeyB", true);
    expect(f.world).toBe(w);
    expect(f.notice.text).toMatch(/already endless/i);
  });
});
