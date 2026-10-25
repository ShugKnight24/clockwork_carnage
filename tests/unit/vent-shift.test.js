import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ChronoHazards, HAZARD_CHRONO, VENT_CHRONO, cycleOn } from "../../src/systems/chrono-hazards.js";
import { SET_PIECES } from "../../src/data/campaign/set-pieces.js";
import { ACTS } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";

// Plasma vents and Chrono Shift: a shift slows a vent's cycle to VENT_CHRONO
// of real time. On the level clock (0.15 of the world's 0.3) a shift all but
// froze them, so a lit vent stayed lit through the whole shift.

const WALK = 3.5; // Player.moveSpeed
const SPRINT = WALK * 1.6;
const SHIFT_SCALE = 0.3; // game.timeScale while shifting
const SHIFT_PLAYER = 0.85; // CHRONO_PLAYER_SPEED: the agent keeps near full speed
const SHIFT_SECONDS = 100 / 33; // a full bar at the base drain

function galleryGame() {
  let at = null;
  ACTS.forEach((a) => a.levels.forEach((l, i) => l.setPiece === "vent_gallery" && (at ??= { act: a.id, level: i, entry: l })));
  const map = structuredClone(campaignMap(at.entry));
  const hits = [];
  const game = {
    mode: "campaign",
    campaign: { act: at.act, level: at.level },
    map,
    entities: [],
    projectiles: [],
    player: { x: 1.5, y: 1.5, angle: 0, chronoActive: false, health: 100 },
    deltaTime: 1 / 60,
    damagePlayer: (d) => hits.push(d),
    queueAriaMessage: () => {},
    getDifficultyMultipliers: () => ({ healthMul: 1, damageMul: 1, speedMul: 1 }),
  };
  const hz = new ChronoHazards();
  hz.load(game, at.entry);
  return { game, hz, hits };
}

/** Whether a body at y (radius 0.3) overlaps vent v's rows. */
const inRows = (v, y) => y + 0.3 > v.rect[1] && y - 0.3 < v.rect[3] + 1;

/**
 * Walk from y0 to y1 starting at `start` on the vent clock, with `shift`
 * real seconds of Chrono Shift from the start; `rate` is the vent cycle's
 * speed against real time in a shift. A player who reads the vents waits at
 * a lit strip's edge and steps in as it goes dark. Returns { hits, done }:
 * the burns taken and the real seconds the crossing took.
 */
function crossStrips(vents, { y0, y1, start, shift = 0, sprint = false, rate = VENT_CHRONO, wait = true }) {
  const dt = 1 / 240;
  const dir = Math.sign(y1 - y0);
  let t = 0;
  let clock = start;
  let y = y0;
  let hits = 0;
  let touching = false;
  while ((y1 - y) * dir > 0 && t < 30) {
    const shifting = t < shift;
    const next = y + dir * (sprint ? SPRINT : WALK) * (shifting ? SHIFT_PLAYER : 1) * dt;
    // Hold at the edge of a lit strip you are not already in.
    const blocked = wait && vents.some((v) => cycleOn(v, clock) && inRows(v, next) && !inRows(v, y));
    if (!blocked) y = next;
    clock += shifting ? rate * dt : dt;
    t += dt;
    const now = vents.some((v) => cycleOn(v, clock) && inRows(v, y));
    if (now && !touching) hits++;
    touching = now;
  }
  return { hits, done: t };
}

/** The vent clock at which `v` has `left` seconds of its burn to go. */
const burnLeft = (v, left) => (((v.on - left - (v.phase ?? 0)) % v.period) + v.period) % v.period;

describe("a shift slows the vents, never stops them", () => {
  it("runs a vent's cycle at VENT_CHRONO of real time in a shift; the level clock keeps its crawl", () => {
    const { game, hz } = galleryGame();
    game.player.chronoActive = true;
    for (let i = 0; i < 180; i++) hz.update(game, SHIFT_SCALE / 60);
    expect(hz.ventClock).toBeCloseTo(3 * VENT_CHRONO, 6);
    expect(hz.clock).toBeCloseTo(3 * SHIFT_SCALE * HAZARD_CHRONO, 6);
    // Out of a shift both run with the world.
    game.player.chronoActive = false;
    hz.update(game, 1);
    expect(hz.ventClock).toBeCloseTo(3 * VENT_CHRONO + 1, 6);
  });

  it("is a real slow: each gap at least three times as long, a burn out within two shifts", () => {
    for (const v of SET_PIECES.vent_gallery.hazards) {
      expect((v.period - v.on) / VENT_CHRONO).toBeGreaterThanOrEqual(3 * (v.period - v.on));
      expect(v.on / VENT_CHRONO).toBeLessThan(2 * SHIFT_SECONDS);
      // The level clock would have held it lit for half a minute.
      expect(v.on / (SHIFT_SCALE * HAZARD_CHRONO)).toBeGreaterThan(30);
    }
  });

  it("burns in a shift on the vent clock, and saves and restores it", () => {
    const { game, hz, hits } = galleryGame();
    const vent = hz.hazards.find((h) => h.id === "vent_a");
    game.player.x = 8.5;
    game.player.y = vent.rect[1] + 0.5;
    game.player.chronoActive = true;
    hz.ventClock = (vent.period - (vent.phase ?? 0)) % vent.period; // just lit
    hz.update(game, SHIFT_SCALE / 60);
    expect(hits.length).toBe(1);
    const again = new ChronoHazards();
    again.load(game, ACTS.flatMap((a) => a.levels).find((l) => l.setPiece === "vent_gallery"));
    again.restore(hz.serialize());
    expect(again.ventClock).toBeCloseTo(hz.ventClock, 9);
  });

  it("shifting as a strip burns out gets you through it within the shift; the frozen shift did not", () => {
    for (const v of SET_PIECES.vent_gallery.hazards.filter((h) => h.rect[1] === h.rect[3])) {
      const edge = v.rect[3] + 1 + 0.35; // waiting just south of the strip
      const go = { y0: edge, y1: v.rect[1] - 0.35, start: burnLeft(v, 0.4), shift: SHIFT_SECONDS };
      const slowed = crossStrips([v], go);
      expect(slowed.hits, v.id).toBe(0);
      expect(slowed.done, v.id).toBeLessThan(SHIFT_SECONDS);
      // At the level clock's crawl the vent was still lit when the bar ran dry.
      expect(crossStrips([v], { ...go, rate: SHIFT_SCALE * HAZARD_CHRONO }).done, v.id).toBeGreaterThan(SHIFT_SECONDS);
    }
  });
});

describe("the prologue's vents", () => {
  const src = readFileSync(fileURLToPath(new URL("../../js/tutorial-system.js", import.meta.url)), "utf8");
  const num = (name) => Number(src.match(new RegExp(`const ${name} = ([0-9.]+);`))[1]);
  const cycle = num("VENT_CYCLE");
  const on = num("VENT_ON");
  const strips = [...src.matchAll(/\{ rows: \[(\d+), (\d+)\], phase: ([0-9.]+) \}/g)].map((m) => ({ top: +m[1], bottom: +m[2], phase: +m[3] }));
  const vents = strips.map((s) => ({ rect: [27, s.top, 32, s.bottom], period: cycle, on, phase: s.phase }));
  // North to south, the way the step runs: the first strip, then the second.
  const across = { y0: strips[0].top - 0.35, y1: strips[1].bottom + 1.35 };

  it("has its two strips", () => {
    expect(strips).toHaveLength(2);
    expect(src).toContain("g.deltaTime * VENT_CHRONO");
  });

  it("cannot be crossed without a shift, even sprinting", () => {
    // A strip's gap is shorter than a sprint across its rows and the body.
    for (const v of vents) expect((v.period - v.on) * SPRINT).toBeLessThan(v.rect[3] - v.rect[1] + 1.6);
    for (let i = 0; i < 60; i++) {
      expect(crossStrips(vents, { ...across, start: (i / 60) * cycle, sprint: true }).hits).toBeGreaterThan(0);
    }
  });

  it("is crossed walking, both strips, in the one shift you start as the first burns out", () => {
    const run = crossStrips(vents, { ...across, start: burnLeft(vents[0], 0.25), shift: SHIFT_SECONDS });
    expect(run.hits).toBe(0);
    expect(run.done).toBeLessThan(SHIFT_SECONDS);
  });
});
