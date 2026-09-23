import { describe, it, expect } from "vitest";
import { PlayerUpdateSystem } from "../../src/systems/player-update.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { PLAYER } from "../../src/world/voxel-physics.js";
import { PLAYER_PITCH_LIMIT } from "../../src/constants.js";
import { Player } from "../../js/entities.js";

const DT = 1 / 60;
const GROUND = 32; // generateWorld({ terrain: false }) fills z 0..31

const flat = () => generateWorld({ terrain: false });

/** A play-test player standing on the ground at (x, y). */
function mkPlayer(x = 20.5, y = 20.5, z = GROUND) {
  const p = new Player(x, y);
  p.z = z;
  p.vz = 0;
  p.pitch = 0;
  p.angle = 0;
  p.grounded = true;
  return p;
}

const mkCtx = (world, player, over = {}) => ({
  player,
  world,
  map: null,
  keys: {},
  keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD", sprint: "ShiftLeft", crouch: "ControlLeft" },
  mouse: { dx: 0, dy: 0 },
  settings: {},
  mode: "playtest",
  noclip: false,
  audio: { setFootstepCadence() {}, updateFootsteps() {}, playerGrunt() {} },
  ...over,
});

/** Run `n` frames, returning the fall damage billed across them. */
function run(sys, ctx, n) {
  let damage = 0;
  for (let i = 0; i < n; i++) {
    const flags = sys.update(ctx, DT);
    if (flags?.fallDamage) damage += flags.fallDamage;
  }
  return damage;
}

describe("PlayerUpdateSystem — voxel branch", () => {
  it("bills a long fall in a play-test, once, on landing", () => {
    const sys = new PlayerUpdateSystem();
    const p = mkPlayer(20.5, 20.5, GROUND + 11);
    const ctx = mkCtx(flat(), p);
    const damage = run(sys, ctx, 180);
    expect(p.z).toBe(GROUND);
    expect(p.grounded).toBe(true);
    // (drop - 6) * 5, measured from the height the feet left the ground at —
    // one frame of gravity below the starting height, hence the tolerance.
    expect(damage).toBeCloseTo((11 - PLAYER.fallDamageFrom) * 5, 1);
    // Standing there costs nothing more
    expect(run(sys, ctx, 60)).toBe(0);
  });

  it("does not bill the same fall outside a play-test", () => {
    const sys = new PlayerUpdateSystem();
    const p = mkPlayer(20.5, 20.5, GROUND + 11);
    const ctx = mkCtx(flat(), p, { mode: "builder" });
    expect(run(sys, ctx, 180)).toBe(0);
    expect(p.z).toBe(GROUND);
  });

  it("a jump costs no health", () => {
    const sys = new PlayerUpdateSystem();
    const p = mkPlayer();
    const ctx = mkCtx(flat(), p);
    ctx.keys.Space = true;
    let damage = run(sys, ctx, 10);
    expect(p.z).toBeGreaterThan(GROUND); // it left the ground
    ctx.keys.Space = false;
    damage += run(sys, ctx, 120);
    expect(damage).toBe(0);
    expect(p.z).toBe(GROUND);
    expect(p.grounded).toBe(true);
  });

  it("jumping onto a ledge lands higher and costs nothing", () => {
    const sys = new PlayerUpdateSystem();
    const w = flat();
    for (let x = 22; x < 26; x++) for (let y = 19; y < 23; y++) w.set(x, y, GROUND, 1);
    const p = mkPlayer(21.0, 20.5);
    const ctx = mkCtx(w, p);
    ctx.keys.Space = true;
    ctx.keys.KeyW = true;
    let damage = run(sys, ctx, 10);
    ctx.keys.Space = false;
    damage += run(sys, ctx, 50);
    expect(p.z).toBe(GROUND + 1); // standing on the ledge
    expect(damage).toBe(0);
  });

  it("walks up a one-block step without jumping", () => {
    const sys = new PlayerUpdateSystem();
    const w = flat();
    for (let y = 19; y < 23; y++) w.set(23, y, GROUND, 1);
    const p = mkPlayer(21.0, 20.5);
    const ctx = mkCtx(w, p);
    ctx.keys.KeyW = true;
    run(sys, ctx, 120);
    expect(p.x).toBeGreaterThan(23.5);
    expect(p.z).toBe(GROUND); // up onto the step and back down the far side
  });

  it("mouse look drives pitch and clamps it at 85 degrees", () => {
    const sys = new PlayerUpdateSystem();
    const p = mkPlayer();
    const ctx = mkCtx(flat(), p);

    ctx.mouse.dy = -100;
    sys.update(ctx, DT);
    expect(p.pitch).toBeCloseTo(0.2, 6); // 100 px × 0.002 rad
    expect(ctx.mouse.dy).toBe(0); // consumed

    ctx.mouse.dy = -1e6;
    sys.update(ctx, DT);
    expect(p.pitch).toBe(PLAYER_PITCH_LIMIT);

    ctx.mouse.dy = 1e6;
    sys.update(ctx, DT);
    expect(p.pitch).toBe(-PLAYER_PITCH_LIMIT);

    ctx.settings.invertY = true;
    ctx.mouse.dy = -1e6;
    sys.update(ctx, DT);
    expect(p.pitch).toBe(-PLAYER_PITCH_LIMIT);
  });

  it("noclip does not fall, and the flight is never billed afterwards", () => {
    const sys = new PlayerUpdateSystem();
    const p = mkPlayer(20.5, 20.5, GROUND + 20);
    const ctx = mkCtx(flat(), p);

    // Falling from height, then noclip on mid-drop
    run(sys, ctx, 10);
    expect(p.z).toBeLessThan(GROUND + 20);
    ctx.noclip = true;
    expect(run(sys, ctx, 30)).toBe(0);
    const held = p.z;
    expect(p.z).toBe(held); // no gravity while noclipping

    // Flew down close to the floor, then switched noclip off: only that last
    // couple of blocks can count, and they are under the threshold.
    p.z = GROUND + 2;
    ctx.noclip = false;
    expect(run(sys, ctx, 120)).toBe(0);
    expect(p.z).toBe(GROUND);
  });
});
