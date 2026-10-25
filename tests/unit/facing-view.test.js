import { describe, it, expect } from "vitest";
import { facingView, FLANK_DEG } from "../../src/rendering/facing-view.js";
import { buildEnemyModel } from "../../src/rendering/svg-art/sprites/enemies.js";
import { turnShield, inFrontArc } from "../../src/systems/ai.js";
import { calculateEnemyDamage } from "../../src/systems/combat.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";

// An enemy at the origin facing +x; the camera on a circle round it at
// `deg`, looking at it. Returns the view it is drawn from.
function viewAt(deg, shieldSide = -1, prev = null) {
  const a = (deg * Math.PI) / 180;
  const camX = Math.cos(a) * 3;
  const camY = Math.sin(a) * 3;
  // Looking back at the enemy: forward = -(cam), right = forward turned +90°.
  const fx = -Math.cos(a);
  const fy = -Math.sin(a);
  return facingView(0, camX, camY, -fy, fx, shieldSide, prev, {});
}

describe("a shield bearer's view from the camera", () => {
  it("is front-on within the front band, the back from behind", () => {
    expect(viewAt(0).view).toBe("front");
    expect(viewAt(15).view).toBe("front");
    expect(viewAt(180).view).toBe("back");
    expect(viewAt(-150).view).toBe("back");
  });

  it("shows its side exactly where the shield stops covering it", () => {
    expect(viewAt(FLANK_DEG - 0.5).view).toMatch(/^three/);
    expect(viewAt(FLANK_DEG + 0.5).view).toBe("side");
    expect(viewAt(-90).view).toBe("side");
  });

  it("tells the shield arm swinging toward you from away", () => {
    // Camera at +90° sees its facing (+x) run screen right; the Sentinel's
    // shield is on screen left from the front, so it turns away from it.
    const right = viewAt(45);
    const left = viewAt(-45);
    expect(right.view).toBe("threeNear");
    expect(left.view).toBe("threeFar");
    // The Time Warden's shield is on the other side: the other way round.
    expect(viewAt(45, 1).view).toBe("threeFar");
    expect(viewAt(-45, 1).view).toBe("threeNear");
  });

  it("mirrors the profile only when it faces away from its shield side", () => {
    expect(viewAt(90).flip).toBe(true);
    expect(viewAt(-90).flip).toBe(false);
    expect(viewAt(90, 1).flip).toBe(false);
    expect(viewAt(0).flip).toBe(false);
    expect(viewAt(180).flip).toBe(false);
  });

  it("holds a view a few degrees past its edge, but never the front arc's", () => {
    const front = viewAt(10);
    expect(viewAt(23.5, -1, front).view).toBe("front");
    expect(viewAt(27, -1, front).view).not.toBe("front");
    const three = viewAt(50);
    expect(viewAt(60.5, -1, three).view).toBe("side");
    const side = viewAt(80);
    expect(viewAt(59.5, -1, side).view).toMatch(/^three/);
    const back = viewAt(150);
    expect(viewAt(123, -1, back).view).toBe("back");
  });
});

describe("turned views are drawn", () => {
  for (const type of ["sentinel", "shieldCommander", "timeWarden"]) {
    it(`${type} has its own art for each side`, () => {
      const m = buildEnemyModel(type);
      expect(m.views).toBeTruthy();
      const poses = m.variants[0].poses;
      const ids = new Set(["idle", "idle@threeNear", "idle@threeFar", "idle@side", "idle@back"].map((p) => poses[p].body.id));
      expect(ids.size).toBe(5);
      // The back shows the power core: a glow layer of its own.
      expect(poses["idle@back"].glow.markup).toContain("#ff7a1e");
      // The bash's tell stays front-on: it has no turned views.
      expect(poses["windup@side"]).toBeUndefined();
    });
  }

  it("a type drawn from one side only costs no extra bitmaps", () => {
    const m = buildEnemyModel("henchman");
    expect(m.views).toBeNull();
    expect(m.variants[0].poses["idle@back"].body).toBe(m.variants[0].poses.idle.body);
  });
});

describe("its shield can be beaten round at range", () => {
  // Circle it at `speed` cells/s, `r` cells out; seconds until out of its arc.
  const flankTime = (type, r, speed) => {
    const e = { x: 0, y: 0, angle: 0, def: ENEMY_TYPES[type] };
    const dt = 1 / 60;
    let th = 0;
    for (let t = 0; t < 15; t += dt) {
      th += (speed / r) * dt;
      const p = { x: Math.cos(th) * r, y: Math.sin(th) * r };
      turnShield(e, Math.atan2(p.y, p.x), dt, t * 1000, p);
      if (!inFrontArc(e, p)) return t;
    }
    return Infinity;
  };
  for (const type of ["sentinel", "shieldCommander", "timeWarden"]) {
    it(`${type}: a walk gets round it from 2 to 8 cells, a sprint in under 3 s`, () => {
      for (const r of [2, 4, 6, 8]) {
        expect(flankTime(type, r, 3.5)).toBeLessThan(10);
        expect(flankTime(type, r, 5.6)).toBeLessThan(3);
      }
    });
  }
});

describe("a hit past the shield is told apart from a block", () => {
  const sentinel = () => ({ x: 0, y: 0, angle: 0, def: ENEMY_TYPES.sentinel, _shield: 0 });
  it("flags a hit in its back, not one into its shield", () => {
    expect(calculateEnemyDamage(20, sentinel(), 0, { x: -3, y: 0 }).flank).toBe(true);
    const front = calculateEnemyDamage(20, sentinel(), 0, { x: 3, y: 0 });
    expect(front.flank).toBe(false);
    expect(front.shieldSpark).toBe(true);
  });
});
