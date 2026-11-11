import { describe, it, expect } from "vitest";
import { hostileUnderReticle } from "../../src/systems/reticle-target.js";
import { WEAPONS } from "../../src/data/weapons.js";
import { Npc } from "../../js/npc.js";

const PISTOL = 0;
const SHOTGUN = 1;

const open = (n = 40) => Array.from({ length: n }, () => Array(n).fill(0));
const enemy = (over = {}) => ({
  x: 10.5, y: 5.5, angle: Math.PI,
  health: 100, maxHealth: 100,
  state: "chase", active: true,
  type: "enemy", enemyType: "drone",
  def: {},
  ...over,
});
/** Looking straight down +x from (5.5, 5.5) with `weapon` in hand. */
function game(entities, { weapon = PISTOL, grid = open() } = {}) {
  return {
    player: {
      x: 5.5, y: 5.5, angle: 0, aimOffsetX: 0, aimOffsetY: 0, lookShiftY: 0, isAiming: false, alive: true,
      getWeaponDef: () => WEAPONS[weapon],
    },
    settings: { fov: 70, hudStyle: 0 },
    canvas: { width: 800, height: 400 },
    entities,
    map: { width: grid[0].length, height: grid.length, grid },
  };
}

describe("hostileUnderReticle", () => {
  it("true for a live enemy under the reticle within range", () => {
    expect(hostileUnderReticle(game([enemy()]))).toBe(true);
    // The shotgun's full-damage reach holds it too, 5 tiles out.
    expect(hostileUnderReticle(game([enemy()], { weapon: SHOTGUN }))).toBe(true);
  });

  it("false beyond falloff[0] for the shotgun", () => {
    expect(WEAPONS[SHOTGUN].falloff[0]).toBe(10);
    const far = enemy({ x: 17.5 }); // 12 tiles out
    expect(hostileUnderReticle(game([far], { weapon: SHOTGUN }))).toBe(false);
    // The pistol (no falloff, range 50) still reaches it.
    expect(WEAPONS[PISTOL].falloff).toBeUndefined();
    expect(hostileUnderReticle(game([far]))).toBe(true);
  });

  it("false behind a wall", () => {
    const grid = open();
    grid[5][8] = 1;
    expect(hostileUnderReticle(game([enemy()], { grid }))).toBe(false);
  });

  it("false for a dead, frozen or friendly entity", () => {
    expect(hostileUnderReticle(game([enemy({ health: 0 })]))).toBe(false);
    expect(hostileUnderReticle(game([enemy({ state: "dead" })]))).toBe(false);
    // Held by a stasis room (src/systems/chrono-hazards.js _hold).
    expect(hostileUnderReticle(game([enemy({ _stasis: "s1" })]))).toBe(false);
    const officer = new Npc(10.5, 5.5, "officer");
    expect(hostileUnderReticle(game([officer]))).toBe(false);
  });

  it("false on the Final Form while he stops time, red again in his window", () => {
    const boss = enemy();
    const g = game([boss]);
    // Stands in for src/systems/chrono-powers.js damageScale (eleven-seconds.js).
    let scale = 0;
    g.chronoPowers = { damageScale: (e) => (e === boss ? scale : 1) };
    expect(hostileUnderReticle(g)).toBe(false);
    scale = 2;
    expect(hostileUnderReticle(g)).toBe(true);
  });

  it("an enemy held by the stop but still hurt by a round stays red", () => {
    const g = game([enemy()]);
    g.chronoPowers = { damageScale: () => 1, frozen: () => true };
    expect(hostileUnderReticle(g)).toBe(true);
  });

  it("false when an untouchable enemy stands between the reticle and a live one", () => {
    const front = enemy({ x: 8.5 });
    const g = game([enemy(), front]);
    g.chronoPowers = { damageScale: (e) => (e === front ? 0 : 1) };
    expect(hostileUnderReticle(g)).toBe(false);
    expect(hostileUnderReticle(game([enemy(), enemy({ x: 8.5, _stasis: "s1" })]))).toBe(false);
  });

  it("red through a friendly in front: the shot passes them", () => {
    const officer = new Npc(8.5, 5.5, "officer");
    expect(hostileUnderReticle(game([enemy(), officer]))).toBe(true);
  });

  it("false off to the side of the reticle and with no gun or a dead player", () => {
    expect(hostileUnderReticle(game([enemy({ y: 9.5 })]))).toBe(false);
    const g = game([enemy()]);
    g.player.getWeaponDef = () => undefined;
    expect(hostileUnderReticle(g)).toBe(false);
    const d = game([enemy()]);
    d.player.alive = false;
    expect(hostileUnderReticle(d)).toBe(false);
  });
});
