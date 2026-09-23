import { describe, it, expect } from "vitest";
import { AISystem, quillFan } from "../../src/systems/ai.js";
import { windupLine } from "../../src/systems/chrono-powers.js";
import { Enemy } from "../../js/entities.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { buildEnemyModel } from "../../src/rendering/svg-art/sprites/enemies.js";
import { ENEMY_RENDERERS } from "../../src/rendering/enemies/index.js";
import { getAct } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";
import { hasSvgArt } from "../../src/rendering/svg-art/index.js";
import { MODELS as HOUND_ART } from "../../src/rendering/svg-art/models/hound.js";
import { drawCutsceneArt } from "../../src/rendering/cutscene-art.js";
import { setArtStyle, getArtStyle, ART_LEGACY } from "../../src/rendering/art-style.js";
import { CUTSCENE_SCRIPTS } from "../../src/data/cutscene-scripts.js";

// The Hound, suit C-0016 (spec §6): always visible, solid only while you
// shift, and every attack it has comes with a tell you can read and still
// lands while it is phased.

const DT = 1 / 60;
const HOUND = ENEMY_TYPES.hound;
const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, enemyBark: () => {} };

function openMap(size = 40) {
  return { width: size, height: size, grid: Array.from({ length: size }, () => new Array(size).fill(0)) };
}

/** A chasing Hound and a player `dist` tiles east of it, on open floor. */
function setup(dist, { phased = false, health = null } = {}) {
  const e = new Enemy(10.5, 20.5, "hound");
  e.state = "chase";
  e.lastAttackTime = -1e9;
  e._phased = phased;
  if (health != null) e.health = health;
  const player = { x: 10.5 + dist, y: 20.5, angle: Math.PI, chronoActive: false };
  const world = { entities: [e], projectiles: [], map: openMap() };
  return { e, player, world };
}

/** Step the AI `ticks` frames; returns damage calls and a per-frame log. */
function run(ai, { e, player, world }, ticks, t0 = 0) {
  const hits = [];
  const log = [];
  let time = t0;
  for (let i = 0; i < ticks; i++) {
    time += DT * 1000;
    const fx = ai.update(
      { ...world, player, time, timeScale: 1, chronoBombs: [], damageNumbers: [], audio },
      DT,
    );
    hits.push(...fx.damagePlayerCalls);
    log.push({ quill: e._quillState, charge: e._chargeState, rounds: world.projectiles.length, x: e.x, angle: e._chargeAngle });
  }
  return { hits, log, time };
}

describe("the Hound's definition", () => {
  it("is Act II's boss: phased, and not scaled with the act", () => {
    expect(HOUND.boss).toBe(true);
    expect(HOUND.phased).toBe(true);
    expect(getAct(2).boss.type).toBe("hound");
    expect(HOUND.chronoMultiplier).toBe(1.5); // it runs faster when you shift
  });

  it("stands in the Foundry's boss slot", () => {
    const foundry = campaignMap(getAct(2).levels[6]);
    expect(foundry.isBossLevel).toBe(true);
    expect(foundry.entities.filter((x) => x.enemyType === "boss")).toHaveLength(1);
  });

  it("gives every attack a tell of most of a second", () => {
    expect(HOUND.chargeWindup).toBeGreaterThanOrEqual(0.8);
    expect(HOUND.quills.windup).toBeGreaterThanOrEqual(0.6);
    expect(HOUND.attackWindupMs).toBeGreaterThanOrEqual(450);
  });
});

describe("quill volleys", () => {
  it("fan out evenly about the aim", () => {
    const fan = quillFan(HOUND.quills, 0);
    expect(fan).toHaveLength(HOUND.quills.count);
    expect(fan[0]).toBeCloseTo(-HOUND.quills.spread / 2);
    expect(fan.at(-1)).toBeCloseTo(HOUND.quills.spread / 2);
    expect(fan[2]).toBeCloseTo(0);
  });

  it("bristle first, then fire: no quill before the tell has run", () => {
    const ai = new AISystem();
    const s = setup(9);
    s.e._chargeCD = 99; // no lunge in this test
    const { log } = run(ai, s, 60 * 6);
    const firstBristle = log.findIndex((f) => f.quill === "bristle");
    const firstRound = log.findIndex((f) => f.rounds > 0);
    expect(firstBristle).toBeGreaterThanOrEqual(0);
    expect(firstRound).toBeGreaterThan(firstBristle);
    expect((firstRound - firstBristle) * DT).toBeGreaterThanOrEqual(HOUND.quills.windup - DT * 1.5);
    const quills = s.world.projectiles.filter((p) => p._quill);
    expect(quills).toHaveLength(HOUND.quills.count);
    expect(quills.every((q) => q.owner === "enemy" && q.damage === HOUND.quills.damage)).toBe(true);
  });

  it("plants its feet while it bristles", () => {
    const ai = new AISystem();
    const s = setup(9);
    s.e._chargeCD = 99;
    const { log } = run(ai, s, 60 * 4);
    const bristling = log.filter((f) => f.quill === "bristle");
    expect(bristling.length).toBeGreaterThan(10);
    expect(new Set(bristling.map((f) => f.x.toFixed(4))).size).toBe(1);
  });

  it("fires even while phased: its quills still land", () => {
    const ai = new AISystem();
    const s = setup(9, { phased: true });
    s.e._chargeCD = 99;
    run(ai, s, 60 * 4);
    expect(s.world.projectiles.filter((p) => p._quill).length).toBe(HOUND.quills.count);
  });

  it("fires two volleys back to back below half health", () => {
    const ai = new AISystem();
    const s = setup(9, { health: HOUND.health * 0.4 });
    s.e._chargeCD = 99;
    run(ai, s, 60 * 4);
    expect(s.world.projectiles.filter((p) => p._quill).length).toBe(HOUND.quills.count * 2);
  });
});

describe("the lunge", () => {
  it("coils before it runs, and runs the lane its tell drew", () => {
    const ai = new AISystem();
    const s = setup(12);
    s.e._quillCD = 99; // no volley in this test
    s.e._chargeCD = 0;
    const { log } = run(ai, s, 60 * 3);
    const coil = log.findIndex((f) => f.charge === "windup");
    const sprint = log.findIndex((f) => f.charge === "sprint");
    expect(coil).toBeGreaterThanOrEqual(0);
    expect((sprint - coil) * DT).toBeGreaterThanOrEqual(HOUND.chargeWindup - DT * 1.5);
    // It plants for the coil: the lane starts where it stands.
    expect(new Set(log.slice(coil, sprint).map((f) => f.x.toFixed(4))).size).toBe(1);
    // The lane locks before the run: the last angle drawn is the angle run.
    expect(log[sprint].angle).toBeCloseTo(log[sprint - 1].angle);
  });

  it("commits to its lane: stepping aside late makes it miss", () => {
    const ai = new AISystem();
    const s = setup(12);
    s.e._quillCD = 99;
    s.e._chargeCD = 0;
    // Wait until the lane has locked (the last 30% of the tell), then sidestep.
    let t = 0;
    for (let i = 0; i < 60 * 2 && !(s.e._chargeState === "windup" && s.e._chargeTimer < HOUND.chargeWindup * 0.25); i++) {
      t = run(ai, s, 1, t).time;
    }
    const lane = s.e._chargeAngle;
    s.player.y += 3;
    const { log } = run(ai, s, 20, t);
    const sprint = log.find((f) => f.charge === "sprint");
    expect(sprint.angle).toBeCloseTo(lane);
  });

  it("lands on impact even while phased, and a Foresight line shows the lane", () => {
    const ai = new AISystem();
    const s = setup(6, { phased: true });
    s.e._quillCD = 99;
    s.e._chargeCD = 0;
    let line = null;
    let hits = [];
    let t = 0;
    for (let i = 0; i < 60 * 3 && hits.length === 0; i++) {
      const r = run(ai, s, 1, t);
      t = r.time;
      hits = r.hits;
      if (s.e._chargeState === "windup") line = windupLine(s.e, s.player);
    }
    expect(line).not.toBeNull();
    expect(Math.atan2(line.y1 - line.y0, line.x1 - line.x0)).toBeCloseTo(0, 1);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].attacker).toBe(s.e);
  });
});

describe("the Hound's art", () => {
  it("has its own sprite in Comic and Modern, with the bristle pose", () => {
    for (const real of [false, true]) {
      const m = buildEnemyModel("hound", real);
      const poses = m.variants[0].poses;
      expect(m.sideOn).toBe(true);
      for (const p of ["idle", "moveA", "moveB", "windup", "attack", "hurt", "bristle"]) expect(poses[p].body.markup, p).toBeTruthy();
      expect(poses.bristle.body.markup).not.toBe(poses.idle.body.markup);
      expect(poses.windup.body.markup).not.toBe(poses.idle.body.markup);
      expect(poses.bristle.glow.markup).toContain("#fff0c8"); // the ridge runs hot
    }
  });

  it("is no longer the beast in other colours", () => {
    const hound = buildEnemyModel("hound").variants[0].poses.idle.body.markup;
    const beast = buildEnemyModel("beast").variants[0].poses.idle.body.markup;
    expect(hound).toContain("url(#void)");
    expect(beast).not.toContain("url(#void)");
  });

  it("has a Legacy renderer of its own", () => {
    expect(typeof ENEMY_RENDERERS.hound).toBe("function");
    expect(ENEMY_RENDERERS.hound).not.toBe(ENEMY_RENDERERS.beast);
  });
});

describe("the Hound in the cutscenes", () => {
  it("appears in the scenes that show it: through the glass, in the den, fallen open", () => {
    const arts = (key) => CUTSCENE_SCRIPTS[key].map((f) => f.art);
    expect(arts("hound_attack")).toContain("hound");
    expect(arts("hound_intro")).toContain("hound");
    expect(arts("gathering_finale")[0]).toBe("hound_fallen");
  });

  it("has a vector model for Comic and Modern, cut from its sprite", () => {
    for (const key of ["hound", "hound_fallen"]) {
      expect(hasSvgArt(key), key).toBe(true);
      const m = HOUND_ART[key];
      expect(m.layers.length).toBeGreaterThan(1);
      expect(m.layers.some((l) => l.markup.includes("url(#void)")), key).toBe(true);
      expect(m.defs).toContain('id="quill"');
    }
  });

  it("draws in Legacy without throwing", () => {
    const before = getArtStyle();
    setArtStyle(ART_LEGACY);
    const grad = { addColorStop() {} };
    const ctx = new Proxy({}, {
      get: (_t, prop) => (prop === "createRadialGradient" || prop === "createLinearGradient" ? () => grad : () => {}),
      set: () => true,
    });
    try {
      for (const key of ["hound", "hound_fallen"]) expect(() => drawCutsceneArt(ctx, 1600, 900, key, 1.5)).not.toThrow();
    } finally {
      setArtStyle(before);
    }
  });
});
