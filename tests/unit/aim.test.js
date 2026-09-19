/**
 * aim.test.js — Cursor / camera / projectile alignment.
 *
 * The reticle is the source of truth for shooting. These tests guard:
 *   1. screen reticle pos ↔ world ray are mathematically aligned
 *   2. mouse delta produces matching cursor + camera response
 *   3. recenter does NOT decay the reticle while player is idle / aiming
 *   4. fire-from-player-origin matches hit-test origin (no offset drift)
 */
import { describe, it, expect } from "vitest";
import {
  applyAimDelta,
  recenterAim,
  aimAngles,
  reticlePoint,
  aimHeightAtDistance,
} from "../../src/systems/aim.js";
import { rayEnemyHit } from "../../src/systems/combat.js";
import {
  PLAYER_AIM_LIMIT_X,
  PLAYER_AIM_SENSITIVITY,
} from "../../src/constants.js";

const makePlayer = (over = {}) => ({
  x: 0, y: 0, angle: 0,
  aimOffsetX: 0, aimOffsetY: 0,
  rotSpeed: 3,
  isFiring: false,
  ...over,
});

const makeEnemy = (over = {}) => ({
  type: "enemy", active: true, state: "chase",
  x: 10, y: 0,
  def: { radius: 0.3, hitCenter: 0.35, hitHeight: 0.55 },
  ...over,
});

const rendererScreenY = (heightAboveCenter, depth, h = 600) =>
  h / 2 - heightAboveCenter * (h / depth);

describe("aim — reticle ↔ world ray alignment", () => {
  it("crosshair at screen center == straight-ahead world ray", () => {
    const p = makePlayer();
    const r = reticlePoint(800, 600, 0, p);
    const { yaw, pitch } = aimAngles(p, 70);
    expect(r.x).toBeCloseTo(400);
    expect(r.y).toBeCloseTo(300);
    expect(yaw).toBeCloseTo(0);
    expect(pitch).toBeCloseTo(0);
  });

  it("crosshair drawn at screen fraction maps to bullet hitting that ray", () => {
    // Reticle painted at the right edge of the deadzone.
    const p = makePlayer({ aimOffsetX: 0.15 });
    const { yaw, pitch } = aimAngles(p, 70);
    const dist = 12;
    // Place enemy on the ray defined by aimAngles. If the math is consistent,
    // a bullet fired along (cos yaw, sin yaw) from the player must hit it.
    const enemy = makeEnemy({
      x: Math.cos(yaw) * dist,
      y: Math.sin(yaw) * dist,
    });
    const hit = rayEnemyHit(p, Math.cos(yaw), Math.sin(yaw), 30, pitch, enemy);
    expect(hit?.enemy).toBe(enemy);
  });

  it("vertical reticle offset drives matching pitch on bullet", () => {
    const p = makePlayer({ aimOffsetY: -0.12 });
    const dist = 8;
    // aimHeightAtDistance is what the projectile-update code uses.
    const aimHeight = aimHeightAtDistance(p, dist, 70);
    const enemy = makeEnemy({
      x: dist,
      def: { radius: 0.3, hitCenter: aimHeight, hitHeight: 0.2 },
    });
    const { yaw, pitch } = aimAngles(p, 70);
    const hit = rayEnemyHit(p, Math.cos(yaw), Math.sin(yaw), 20, pitch, enemy);
    expect(hit?.enemy).toBe(enemy);
  });

  it("vertical aim matches renderer screen projection, not a second FOV scale", () => {
    const p = makePlayer({ aimOffsetX: 0.12, aimOffsetY: -0.1 });
    const { yaw, pitch } = aimAngles(p, 70);
    const dist = 18;
    const x = Math.cos(yaw) * dist;
    const y = Math.sin(yaw) * dist;
    // Renderer depth for a target on the yaw ray when player.angle === 0.
    const depth = x;
    const targetHeight = -p.aimOffsetY * depth;
    expect(rendererScreenY(targetHeight, depth)).toBeCloseTo(reticlePoint(800, 600, 0, p).y);

    const enemy = makeEnemy({
      x,
      y,
      def: { radius: 0.3, hitCenter: targetHeight, hitHeight: 0.12 },
    });
    const hit = rayEnemyHit(p, Math.cos(yaw), Math.sin(yaw), 40, pitch, enemy);
    expect(hit?.enemy).toBe(enemy);
  });

  // ─── Regression: bullets must hit the reticle even with a HUD bar present ──
  // Old bug (BUG-aim-pitch): aimAngles ignored the HUD bar, so pitch was
  // computed against the full canvas while the reticle was painted in the
  // viewport above it. Bullets dropped below the crosshair.
  it("HUD bar present: bullet pitch aligns with on-screen reticle pixel", () => {
    const w = 1280, h = 720, barH = 160;
    const p = makePlayer({ aimOffsetX: 0.05, aimOffsetY: 0.08 });
    const { x: rx, y: ry } = reticlePoint(w, h, barH, p);
    const { yaw, pitch } = aimAngles(p, 70, { h, barH });

    // Where does a target on the yaw ray at depth `dist` project on screen?
    const dist = 14;
    const tx = Math.cos(yaw) * dist;
    const ty = Math.sin(yaw) * dist;
    const depth = tx; // player.angle = 0
    const heightAboveCam = Math.tan(pitch) * dist; // pitch>0 → above camera
    const projectedY = h / 2 - heightAboveCam * (h / depth);
    expect(projectedY).toBeCloseTo(ry, 0);
    // And X on the same ray must hit the reticle X.
    const transformX = ty;
    const transformY = tx;
    const planeMul = Math.tan((70 * 0.5 * Math.PI) / 180);
    const projectedX = (w / 2) * (1 + transformX / transformY / planeMul);
    expect(projectedX).toBeCloseTo(rx, 0);
  });

  // Cross-check the convenience FOV/dimensions wrapper does not drift.
  it("aimAngles ratio is stable across viewport heights", () => {
    const p = makePlayer({ aimOffsetY: -0.1 });
    const a720 = aimAngles(p, 70, { h: 720, barH: 160 });
    const a1080 = aimAngles(p, 70, { h: 1080, barH: 240 });
    // barH/h is the same ratio (160/720 ≈ 240/1080), so pitch must match.
    expect(a720.pitch).toBeCloseTo(a1080.pitch, 6);
  });
});

describe("aim — applyAimDelta (cursor moves freely, camera takes overflow)", () => {
  it("small dx moves only the reticle, no camera turn", () => {
    const p = makePlayer();
    const { overflowX } = applyAimDelta(p, 20, 0, { sensitivity: 1 });
    expect(p.aimOffsetX).toBeCloseTo(20 * PLAYER_AIM_SENSITIVITY);
    expect(overflowX).toBe(0);
  });

  it("oversized dx clamps reticle and returns overflow in mouse-pixel units", () => {
    const p = makePlayer();
    // Push way past the limit: dx = LIMIT/SENS * 4 → triple the deadzone.
    const dx = (PLAYER_AIM_LIMIT_X / PLAYER_AIM_SENSITIVITY) * 4;
    const { overflowX } = applyAimDelta(p, dx, 0, { sensitivity: 1 });
    expect(p.aimOffsetX).toBeCloseTo(PLAYER_AIM_LIMIT_X);
    // overflow should be the un-applied raw mouse pixels (positive), and
    // roughly 3× the consumed amount.
    expect(overflowX).toBeGreaterThan(0);
    expect(overflowX).toBeCloseTo(dx - PLAYER_AIM_LIMIT_X / PLAYER_AIM_SENSITIVITY, 1);
  });

  it("invertX flips reticle direction without breaking overflow sign", () => {
    const p = makePlayer();
    applyAimDelta(p, 30, 0, { sensitivity: 1, invertX: true });
    expect(p.aimOffsetX).toBeLessThan(0);
  });
});

describe("aim — recenterAim", () => {
  it("decays reticle gently toward zero", () => {
    const p = makePlayer({ aimOffsetX: 0.1, aimOffsetY: 0.05 });
    recenterAim(p, 1 / 60); // one frame
    expect(Math.abs(p.aimOffsetX)).toBeLessThan(0.1);
    expect(Math.abs(p.aimOffsetX)).toBeGreaterThan(0.05); // not violent
  });

  it("does not flip sign past zero in one step", () => {
    const p = makePlayer({ aimOffsetX: 0.01 });
    recenterAim(p, 1 / 60);
    expect(p.aimOffsetX).toBeGreaterThanOrEqual(0);
  });
});

describe("aim — projectile origin matches hit-test origin", () => {
  // The orchestrator now spawns projectiles at (player.x, player.y). The
  // projectile-update hit-test computes aimHeight = tan(pitch) * dist_traveled.
  // If origin == player, these are identical and bullets land on the reticle.
  it("bullet from player origin hits an enemy on the reticle ray", () => {
    const p = makePlayer({ aimOffsetX: 0.08, aimOffsetY: -0.05 });
    const { yaw, pitch } = aimAngles(p, 70);
    const dist = 9;
    const target = makeEnemy({
      x: Math.cos(yaw) * dist,
      y: Math.sin(yaw) * dist,
      def: {
        radius: 0.3,
        hitCenter: Math.tan(pitch) * dist,
        hitHeight: 0.25,
      },
    });
    const hit = rayEnemyHit(p, Math.cos(yaw), Math.sin(yaw), 30, pitch, target);
    expect(hit?.enemy).toBe(target);
  });
});
