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
