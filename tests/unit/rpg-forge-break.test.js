// tests/unit/rpg-forge-break.test.js
import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { ForgeMode } from "../../js/forge.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { breakTime } from "../../src/rpg/gather.js";
import { TOOLS } from "../../src/rpg/tools.js";
import { PlayerStore, MemoryPlayerBackend } from "../../src/rpg/player-store.js";

/**
 * Drives the session the way ForgeMode.update() does, without a GL context:
 * hold advances, release cancels.
 */
function rig() {
  const world = new World({ mode: "survival" });
  world.set(5, 5, 32, 10); // dirt
  const s = new SurvivalSession();
  const cell = { x: 5, y: 5, z: 32 };
  return {
    world, s, cell,
    hold: (ms) => s.tickBreak(ms, cell, world.get(cell.x, cell.y, cell.z)),
  };
}

describe("hold to break", () => {
  it("needs the full break time held, not one click", () => {
    const { s, cell, hold } = rig();
    s.beginBreak(cell, 10);
    const need = breakTime(10, 1, TOOLS.HAND);
    expect(hold(need * 0.9).broke).toBe(false);
    expect(s.progress).toBeCloseTo(0.9, 1);
    expect(hold(need * 0.2).broke).toBe(true);
  });

  it("discards partial progress on release", () => {
    const { s, cell, hold } = rig();
    s.beginBreak(cell, 10);
    hold(breakTime(10, 1, TOOLS.HAND) * 0.9);
    s.cancelBreak();
    expect(s.progress).toBe(0);
    s.beginBreak(cell, 10);
    expect(s.progress).toBe(0);
  });

  it("removes the block from the world once the session says it broke", () => {
    const { world, s, cell, hold } = rig();
    s.beginBreak(cell, 10);
    const res = hold(1e6);
    expect(res.broke).toBe(true);
    world.set(cell.x, cell.y, cell.z, 0);
    expect(world.get(cell.x, cell.y, cell.z)).toBe(0);
    expect(s.inventory.count("dirt")).toBe(1);
  });
});

/**
 * The same loop through `ForgeMode` itself. Nothing here touches GL: the
 * renderer is only stored, and both stores are lazy about IndexedDB.
 */
function forge(mode) {
  const f = new ForgeMode({
    renderer: null,
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: {},
    keybinds: {},
    canvas: null,
    playerStore: new PlayerStore(new MemoryPlayerBackend()),
  });
  f.world = new World(mode ? { mode } : undefined);
  f.world.set(5, 5, 32, 10); // dirt
  f.survival = mode === "survival" ? f.survivalSession : null;
  f.active = true;
  f.target = { x: 5, y: 5, z: 32 };
  return f;
}

describe("ForgeMode hold to break", () => {
  it("does not break on the click alone in survival", () => {
    const f = forge("survival");
    f.handleMouseDown(2);
    expect(f.holdingBreak).toBe(true);
    expect(f.world.get(5, 5, 32)).toBe(10);
  });

  it("breaks once the button has been held for the full time", () => {
    const f = forge("survival");
    f.handleMouseDown(2);
    f.update(1); // seconds — 1000ms, past dirt's break time
    expect(f.world.get(5, 5, 32)).toBe(0);
    expect(f.survival.inventory.count("dirt")).toBe(1);
    expect(f.breakProgress).toBe(0);
  });

  it("discards progress when the button is released", () => {
    const f = forge("survival");
    f.handleMouseDown(2);
    f.update(0.1); // 100ms of a 500ms break
    expect(f.breakProgress).toBeGreaterThan(0);
    f.handleMouseUp(2);
    expect(f.holdingBreak).toBe(false);
    expect(f.survival.breaking).toBe(null);
    expect(f.breakProgress).toBe(0);
    expect(f.world.get(5, 5, 32)).toBe(10);
  });

  it("releases on any non-left button, and never on left", () => {
    const f = forge("survival");
    f.handleMouseDown(1);
    expect(f.holdingBreak).toBe(true);
    f.handleMouseUp(0);
    expect(f.holdingBreak).toBe(true); // left is place; it must not release
    f.handleMouseUp(1);
    expect(f.holdingBreak).toBe(false);
  });

  it("still breaks instantly on one click in creative", () => {
    const f = forge(null);
    f.handleMouseDown(2);
    expect(f.world.get(5, 5, 32)).toBe(0);
  });
});
