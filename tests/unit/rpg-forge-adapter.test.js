// tests/unit/rpg-forge-adapter.test.js
import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { ForgeMode, attachSurvival } from "../../js/forge.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { packWorld, unpackWorld } from "../../src/world/world-codec.js";
import { AIR } from "../../src/world/blocks.js";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import { PlayerStore, MemoryPlayerBackend } from "../../src/rpg/player-store.js";
import { xpForLevel } from "../../src/rpg/skills.js";
import { xpFor } from "../../src/rpg/gather.js";

describe("survival mode flag", () => {
  it("defaults to creative and attaches no session", () => {
    const w = new World();
    expect(w.meta.mode ?? "creative").toBe("creative");
    expect(attachSurvival(w, new SurvivalSession())).toBe(null);
  });

  it("attaches the session only for a survival world", () => {
    const w = new World({ mode: "survival" });
    const s = new SurvivalSession();
    expect(attachSurvival(w, s)).toBe(s);
  });

  it("survives a codec round trip without a version bump", async () => {
    const w = new World({ mode: "survival" });
    const back = await unpackWorld(await packWorld(w));
    expect(back.meta.mode).toBe("survival");
  });

  it("loads a pre-existing world with no mode as creative", async () => {
    const w = new World();
    delete w.meta.mode;
    const back = await unpackWorld(await packWorld(w));
    expect(back.meta.mode).toBe(undefined);
    expect(attachSurvival(back, new SurvivalSession())).toBe(null);
  });
});

const ROCK = 13;

/**
 * A Forge on an adopted world. Only the HUD and the renderer want a GL
 * context, and neither the mutators nor the history touch one.
 */
function forge(meta) {
  const f = new ForgeMode({
    renderer: {},
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: { fov: 70, sensitivity: 1 },
    keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD" },
    canvas: null,
    store: new WorldStore(new MemoryBackend()),
    playerStore: new PlayerStore(new MemoryPlayerBackend()),
  });
  f._adopt(new World(meta), 0);
  return f;
}

/** Mines `cell` the way the Forge will: session credits it, editor removes it. */
function mine(f, cell) {
  f.survival.beginBreak(cell, ROCK);
  const res = f.survival.tickBreak(1e6, cell, ROCK);
  f._editBlock(cell.x, cell.y, cell.z, AIR);
  return res;
}

describe("undo and redo in survival", () => {
  it("pays no mining xp for a block undo put back", () => {
    const f = forge({ mode: "survival" });
    const cell = { x: 5, y: 5, z: 40 };
    f.world.set(cell.x, cell.y, cell.z, ROCK);
    f.survival.skills.grant("mining", xpForLevel(5));
    const banked = f.survival.skills.xp.mining;

    expect(mine(f, cell).xp).toBe(xpFor(ROCK));
    expect(f.survival.skills.xp.mining).toBe(banked + xpFor(ROCK));

    f.undo(); // Ctrl+Z hands the Rock back without asking the session
    expect(f.world.get(cell.x, cell.y, cell.z)).toBe(ROCK);
    expect(f.survival.wasPlaced(cell.x, cell.y, cell.z)).toBe(true);

    // Breaking it a second time yields the drop but no xp, so undo cannot be
    // held down for infinite mining levels.
    const again = mine(f, cell);
    expect(again.broke).toBe(true);
    expect(again.xp).toBe(0);
    expect(f.survival.skills.xp.mining).toBe(banked + xpFor(ROCK));
  });

  it("forgets the mark when redo takes the block away again", () => {
    const f = forge({ mode: "survival" });
    const cell = { x: 6, y: 6, z: 40 };
    f.world.set(cell.x, cell.y, cell.z, ROCK);
    f.survival.skills.grant("mining", xpForLevel(5));

    mine(f, cell);
    f.undo();
    f.redo();
    expect(f.world.get(cell.x, cell.y, cell.z)).toBe(AIR);
    expect(f.survival.wasPlaced(cell.x, cell.y, cell.z)).toBe(false);
  });

  it("replays a marker edit, which has no cell of its own", () => {
    const f = forge({ mode: "survival" });
    const exit = { x: 8.5, y: 8.5, z: 40 };
    f._editMeta("exit", exit);
    expect(() => {
      f.undo();
      f.redo();
    }).not.toThrow();
    expect(f.world.meta.exit).toEqual(exit);
  });

  it("leaves a creative world with no session to reconcile", () => {
    const f = forge({});
    expect(f.survival).toBe(null);
    f._editBlock(7, 7, 40, ROCK);
    f.undo();
    expect(f.world.get(7, 7, 40)).toBe(AIR);
    f.redo();
    expect(f.world.get(7, 7, 40)).toBe(ROCK);
    expect(f.survival).toBe(null);
  });
});

describe("the mode toggle — the player-facing way into survival", () => {
  const forge = () => {
    const f = new ForgeMode({
      renderer: null,
      audio: { menuSelect() {}, menuConfirm() {} },
      settings: {},
      keybinds: {},
      canvas: null,
    });
    f._adopt(new World(), 0);
    return f;
  };

  it("starts creative and flips to survival, attaching a session", () => {
    const f = forge();
    expect(f.isSurvival()).toBe(false);
    expect(f.survival).toBe(null);

    f.handleKeyDown({ code: "KeyM" });
    expect(f.isSurvival()).toBe(true);
    expect(f.survival).not.toBe(null);
    expect(f.world.meta.mode).toBe("survival");
  });

  it("flips back, detaching the session and closing the craft menu", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyM" });
    f.craftOpen = true;
    f.holdingBreak = true;

    f.handleKeyDown({ code: "KeyM" });
    expect(f.survival).toBe(null);
    expect(f.craftOpen).toBe(false);
    expect(f.holdingBreak).toBe(false);
    expect(f.world.meta.mode).toBe("creative");
  });

  it("keeps progression across a mode flip but not the placed flags", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyM" });
    f.survival.skills.grant("mining", 300);
    f.survival.inventory.add("rock", 5);
    f.survival.markPlaced(1, 2, 3);

    f.handleKeyDown({ code: "KeyM" }); // to creative
    f.handleKeyDown({ code: "KeyM" }); // and back
    expect(f.survival.skills.xp.mining).toBe(300);
    expect(f.survival.inventory.count("rock")).toBe(5);
    expect(f.survival.wasPlaced(1, 2, 3)).toBe(false);
  });

  it("consumes the key and does not fall through to the host", () => {
    expect(forge().handleKeyDown({ code: "KeyM" })).toBe(true);
    expect(forge().handleKeyDown({ code: "KeyM", ctrlKey: true })).not.toBe(true);
  });

  it("survives a save and reload as a survival world", async () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyM" });
    const back = await unpackWorld(await packWorld(f.world));
    expect(back.meta.mode).toBe("survival");
    expect(attachSurvival(back, new SurvivalSession())).not.toBe(null);
  });
});

describe("placement comes from the hotbar, not the palette", () => {
  const forge = () => {
    const f = new ForgeMode({
      renderer: null,
      audio: { menuSelect() {}, menuConfirm() {} },
      settings: {},
      keybinds: {},
      canvas: null,
    });
    f._adopt(new World(), 0);
    f.active = true;
    return f;
  };

  it("keeps the creative palette at the original fourteen, water and wood", async () => {
    const { PLACEABLE_BLOCKS } = await import("../../js/forge.js");
    const f = forge();
    expect(f._palette()).toBe(PLACEABLE_BLOCKS);
    expect(PLACEABLE_BLOCKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 19, 20, 21, 22, 23]);
  });

  it("uses the same palette in survival, because placement no longer reads it", async () => {
    const { PLACEABLE_BLOCKS } = await import("../../js/forge.js");
    const f = forge();
    f.handleKeyDown({ code: "KeyM" });
    expect(f._palette()).toBe(PLACEABLE_BLOCKS);
    expect(f._palette()).not.toContain(16);
  });

  it("places a station from a hotbar slot, which the palette could never reach", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyM" });
    f.survival.inventory.slots[0] = { item: "workbench", n: 1 };
    f.selectHotbar(0);
    expect(f.heldItem).toBe("workbench");
    expect(f.survival.tryPlace(f.heldItem)).toEqual({ ok: true, blockId: 16 });
  });

  it("steps the hotbar on the wheel in survival and leaves the tile alone", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyM" });
    const tile = f.tile;
    f.handleWheel(1);
    expect(f.hotbarIndex).toBe(1);
    expect(f.tile).toBe(tile);
  });

  it("still cycles the palette on the wheel in creative", () => {
    const f = forge();
    const before = f.tile;
    f.handleWheel(1);
    expect(f.tile).not.toBe(before);
  });

  it("refuses to place with an empty hand rather than doing nothing", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyM" });
    f.selectHotbar(0); // empty slot
    expect(f.heldItem).toBe(null);
    // `face` is an [x,y,z] array, and the cell it points at must be free.
    // Well clear of the spawn, or placementAllowed refuses for overlapping
    // the player and we never reach the guard under test.
    f.world.set(70, 70, 32, 1);
    f.target = { x: 70, y: 70, z: 32, face: [0, 0, 1] };
    f.notice = null; // drop the mode-toggle notice so the assertion is clean
    f.placeBlock();
    expect(f.notice?.text).toBe("Nothing selected");
    expect(f.world.get(70, 70, 33)).toBe(0); // and nothing was placed
  });
});

describe("placed flags are saved with the world", () => {
  /** A Forge on `store` that opens its world the way the game does, through start(). */
  const stored = (store) =>
    new ForgeMode({
      renderer: {},
      audio: { menuSelect() {}, menuConfirm() {} },
      settings: { fov: 70, sensitivity: 1 },
      keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD" },
      canvas: null,
      store,
      playerStore: new PlayerStore(new MemoryPlayerBackend()),
    });

  /**
   * Load the column holding (x, y). The seed is random, and a spawn far from
   * the origin leaves it unloaded, where edits and placed bits are dropped.
   */
  const resident = (f, x, y) => f.world.ensureColumn(x >> 4, y >> 4);

  const was = (f, x, y, z) => (resident(f, x, y), f.survival.wasPlaced(x, y, z));

  /** What placeBlock does once the hotbar has paid for the block. */
  const place = (f, { x, y, z }, id = ROCK) => {
    resident(f, x, y);
    f._editBlock(x, y, z, id);
    f.survival.markPlaced(x, y, z);
  };

  it("a reload keeps a placed block from paying mining xp", async () => {
    // The survival core spec's open loop: place, reload, break for xp, repeat.
    const store = new WorldStore(new MemoryBackend());
    const f = stored(store);
    await f.start();
    f.handleKeyDown({ code: "KeyM" });
    const cell = { x: 5, y: 5, z: 55 };
    place(f, cell);
    await f.saveMap();

    const g = stored(store);
    await g.start();
    expect(g.isSurvival()).toBe(true);
    resident(g, 5, 5);
    expect(g.world.get(5, 5, 55)).toBe(ROCK);
    expect(was(g, 5, 5, 55)).toBe(true);
    g.survival.skills.grant("mining", xpForLevel(5));
    const banked = g.survival.skills.xp.mining;
    const res = mine(g, cell);
    expect(res.broke).toBe(true);
    expect(res.xp).toBe(0);
    expect(g.survival.skills.xp.mining).toBe(banked);
  });

  it("keeps each world's bits to itself across a switch", async () => {
    const store = new WorldStore(new MemoryBackend());
    const f = stored(store);
    await f.start();
    f.handleKeyDown({ code: "KeyM" });
    const first = f.currentSlot;
    place(f, { x: 9, y: 9, z: 56 });
    await f.newMap();
    f.handleKeyDown({ code: "KeyM" });
    expect(was(f, 9, 9, 56)).toBe(false);
    place(f, { x: 10, y: 9, z: 56 });

    await f.switchMap(1); // back to the first world, saving this one
    expect(f.currentSlot).toBe(first);
    expect(was(f, 9, 9, 56)).toBe(true);
    expect(was(f, 10, 9, 56)).toBe(false);
    await f.switchMap(1);
    expect(was(f, 10, 9, 56)).toBe(true);
    expect(was(f, 9, 9, 56)).toBe(false);
  });

  it("the mode toggle still clears them, and the clear is saved", async () => {
    const store = new WorldStore(new MemoryBackend());
    const f = stored(store);
    await f.start();
    f.handleKeyDown({ code: "KeyM" });
    place(f, { x: 5, y: 5, z: 55 });
    await f.saveMap();
    expect(f._dirty).toBe(false);

    f.handleKeyDown({ code: "KeyM" });
    f.handleKeyDown({ code: "KeyM" });
    expect(f._dirty).toBe(true); // meta.mode and the bits both changed
    expect(was(f, 5, 5, 55)).toBe(false);
    await f.stop();

    const g = stored(store);
    await g.start();
    expect(was(g, 5, 5, 55)).toBe(false);
  });
});

