import { describe, it, expect } from "vitest";
import { findAssistTarget, assistFriction, applyAssistPull, ASSIST_OFF, ASSIST_LOW, ASSIST_STANDARD } from "../../src/systems/aim-assist.js";

const open = (n = 40) => Array.from({ length: n }, () => Array(n).fill(0));
const enemy = (x, y, over = {}) => ({ type: "enemy", active: true, state: "chase", x, y, enemyType: "drone", def: {}, ...over });
function game(entities, player = {}, map = { grid: open() }) {
  return {
    player: { x: 5, y: 5, angle: 0, aimOffsetX: 0, aimOffsetY: 0, isAiming: false, ...player },
    settings: { fov: 70, hudStyle: 0 },
    canvas: { height: 400 },
    isTouchDevice: true,
    entities,
    map,
  };
}

describe("touch aim assist", () => {
  it("finds the enemy just off the reticle, not one well wide of it", () => {
    const near = enemy(17, 5.3);
    const wide = enemy(17, 12);
    const t = findAssistTarget(game([wide, near]));
    expect(t?.enemy).toBe(near);
    expect(t.dYaw).toBeGreaterThan(0);
    expect(findAssistTarget(game([wide]))).toBeNull();
  });

  it("ignores the dead, the phased, the far and the ones behind a wall", () => {
    expect(findAssistTarget(game([enemy(15, 5, { state: "dead" })]))).toBeNull();
    expect(findAssistTarget(game([enemy(15, 5, { _phased: true })]))).toBeNull();
    expect(findAssistTarget(game([enemy(35, 5)]))).toBeNull();
    const grid = open();
    for (let y = 0; y < 40; y++) grid[y][10] = 1;
    expect(findAssistTarget(game([enemy(15, 5)], {}, { grid }))).toBeNull();
  });

  it("leans higher through the sights (the head) than from the hip", () => {
    const e = enemy(14, 5, {
      def: { hitZones: [{ name: "head", top: 2, bottom: 1.6, mult: 2, tight: true }, { name: "body", top: 1.6, bottom: 0, mult: 1 }] },
    });
    const hip = findAssistTarget(game([e]));
    const ads = findAssistTarget(game([e], { isAiming: true }));
    expect(ads.dPitch).toBeGreaterThan(hip.dPitch);
  });

  it("slows look on a target, less at Low, not at all when off", () => {
    const t = findAssistTarget(game([enemy(15, 5)]));
    expect(assistFriction(t, ASSIST_STANDARD)).toBeLessThan(assistFriction(t, ASSIST_LOW));
    expect(assistFriction(t, ASSIST_LOW)).toBeLessThan(1);
    expect(assistFriction(t, ASSIST_OFF)).toBe(1);
    expect(assistFriction(null, ASSIST_STANDARD)).toBe(1);
  });

  it("pulls toward the target only while the player steers", () => {
    const g = game([enemy(17, 5.4)]);
    const t = findAssistTarget(g);
    applyAssistPull(g, t, ASSIST_STANDARD, 1 / 60, 0);
    expect(g.player.angle).toBe(0);
    for (let i = 0; i < 30; i++) applyAssistPull(g, findAssistTarget(g), ASSIST_STANDARD, 1 / 60, 1);
    const after = findAssistTarget(g);
    expect(Math.abs(after.dYaw)).toBeLessThan(Math.abs(t.dYaw) * 0.25);
  });
});
