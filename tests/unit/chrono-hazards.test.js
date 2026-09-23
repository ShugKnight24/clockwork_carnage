import { describe, it, expect } from "vitest";
import {
  HAZARD_CHRONO,
  cycleOn,
  collapseFront,
  bladeHits,
  turretShots,
  hazardState,
  ngPlusHazard,
  ChronoHazards,
} from "../../src/systems/chrono-hazards.js";
import { SET_PIECES, SEAL_TILE, setPieceFor, rotateSetPiece } from "../../src/data/campaign/set-pieces.js";
import { ACTS } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";
import { POWERS, makeTimeLock, lockCrossing } from "../../src/systems/chrono-powers.js";

// Spec §5: every hazard's state is a pure function of one level clock, which
// runs at 0.15x while the player shifts; each is passable with a shift.

const WALK = 3.5; // Player.moveSpeed
const SPRINT = WALK * 1.6;
const SHIFT_SCALE = 0.3; // game.timeScale while shifting

/**
 * Walk a body along y from `y0` to `y1` at `speed`, the level clock starting
 * at `start`. `shift` holds Chrono Shift for the first `shift` real seconds.
 * Returns the hits taken, per `hit(clock, x, y)`.
 */
function crossing({ x, y0, y1, speed, start, shift = 0, hit }) {
  const dt = 1 / 120;
  let t = 0;
  let clock = start;
  let y = y0;
  let hits = 0;
  let touching = false;
  const dir = Math.sign(y1 - y0);
  while ((y1 - y) * dir > 0 && t < 30) {
    const shifting = t < shift;
    const sim = dt * (shifting ? SHIFT_SCALE : 1);
    y += dir * speed * sim;
    clock += sim * (shifting ? HAZARD_CHRONO : 1);
    t += dt;
    const now = hit(clock, x, y);
    if (now && !touching) hits++;
    touching = now;
  }
  return hits;
}

/** Fraction of 120 starting phases in [0, period) that cross untouched. */
function safeFraction(period, cross) {
  let safe = 0;
  for (let i = 0; i < 120; i++) if (cross((i / 120) * period) === 0) safe++;
  return safe / 120;
}

describe("the level clock", () => {
  it("vents and gates burn `on` seconds of every period", () => {
    const v = { period: 2.4, on: 1.4, phase: 0 };
    expect(cycleOn(v, 0.1)).toBe(true);
    expect(cycleOn(v, 1.5)).toBe(false);
    expect(cycleOn(v, 2.5)).toBe(true);
    expect(cycleOn({ ...v, phase: 1.2 }, 0.1)).toBe(true);
    expect(cycleOn({ ...v, phase: 1.2 }, 0.3)).toBe(false);
  });

  it("a collapse starts after its delay and fills a step per 1/rate seconds", () => {
    const c = { steps: [[], [], [], []], delay: 0.5, rate: 2 };
    expect(collapseFront(c, 10, null)).toBe(-1);
    expect(collapseFront(c, 10.4, 10)).toBe(-1);
    expect(collapseFront(c, 10.5, 10)).toBe(0);
    expect(collapseFront(c, 11.6, 10)).toBe(2);
    expect(collapseFront(c, 99, 10)).toBe(3);
  });

  it("a turret fires its bursts on the clock, no shot counted twice", () => {
    const t = { interval: 1, burst: 3, gap: 0.1 };
    expect(turretShots(t, 0, 0.25)).toEqual([0.1, 0.2]);
    const all = [];
    for (let i = 0; i < 58; i++) all.push(...turretShots(t, i * 0.05, (i + 1) * 0.05));
    expect(all.length).toBe(8); // 0.1, 0.2 | 1.0, 1.1, 1.2 | 2.0, 2.1, 2.2 (0.0 is not in (0, ...])
  });

  it("is a pure function of the clock and the trigger time", () => {
    for (const piece of Object.values(SET_PIECES)) {
      for (const h of piece.hazards ?? []) {
        expect(hazardState(h, 7.3, 2)).toEqual(hazardState(h, 7.3, 2));
      }
    }
  });
});

describe("hazards are passable with a shift", () => {
  const fans = SET_PIECES.spine_fans.hazards.filter((h) => h.type === "blade");
  const fan = fans[1];
  const hitFan = (clock, x, y) => fans.some((f) => bladeHits(f, clock, x, y));
  const period = (Math.PI * 2) / fan.speed;
  // Between two rotors: the hubs are solid, the gaps between arms are the way.
  const through = { x: (fans[0].x + fans[1].x) / 2, y0: fan.y + 2.2, y1: fan.y - 2.2 };

  it("a fan catches a normal crossing at every phase", () => {
    expect(safeFraction(period, (start) => crossing({ ...through, speed: SPRINT, start, hit: hitFan }))).toBe(0);
  });

  it("a shift opens gaps in the same fan", () => {
    const safe = safeFraction(period, (start) => crossing({ ...through, speed: WALK, start, shift: 10, hit: hitFan }));
    expect(safe).toBeGreaterThan(0.2);
  });

  it("a normal dash cannot clear the fan's disc; a Chrono Dash can, untouchable", () => {
    const band = fan.radius * 2 + 0.6;
    const dash = (mult) => 0.15 * WALK * 3.5 * mult;
    expect(dash(1)).toBeLessThan(band);
    expect(dash(POWERS.dash.distance)).toBeGreaterThan(band);
    expect(fan.dashable).toBe(true);
  });

  it("a vent's gap is wider in a shift", () => {
    const vent = SET_PIECES.vent_gallery.hazards[0];
    const hitVent = (clock, x, y) => cycleOn(vent, clock) && y + 0.3 > vent.rect[1] && y - 0.3 < vent.rect[3] + 1;
    const across = { x: 8.5, y0: 11, y1: 8 };
    const normal = safeFraction(vent.period, (start) => crossing({ ...across, speed: WALK, start, hit: hitVent }));
    const shifted = safeFraction(vent.period, (start) => crossing({ ...across, speed: WALK, start, shift: 10, hit: hitVent }));
    expect(shifted).toBeGreaterThan(normal);
    expect(shifted).toBeGreaterThan(0.3);
  });

  it("a train crossing is the same: wider in a shift", () => {
    const gate = SET_PIECES.transit_crossings.hazards[0];
    const hitGate = (clock, x, y) => cycleOn(gate, clock) && Math.abs(y - gate.a.y) < 0.4;
    const across = { x: 10, y0: 32, y1: 29 };
    const normal = safeFraction(gate.period, (start) => crossing({ ...across, speed: WALK, start, hit: hitGate }));
    const shifted = safeFraction(gate.period, (start) => crossing({ ...across, speed: WALK, start, shift: 10, hit: hitGate }));
    expect(shifted).toBeGreaterThan(normal);
  });

  it("a collapse crushes a sprinter who never shifts and not one who shifts once", () => {
    const shaft = SET_PIECES.evac_shafts.hazards[0];
    const run = (shift) => {
      const dt = 1 / 120;
      let t = 0;
      let clock = 0;
      let y = 42.5;
      let crushed = 0;
      while (y > 21 && t < 30) {
        const shifting = t < shift;
        const sim = dt * (shifting ? SHIFT_SCALE : 1);
        y -= SPRINT * sim;
        clock += sim * (shifting ? HAZARD_CHRONO : 1);
        t += dt;
        const front = collapseFront(shaft, clock, 0);
        const step = 43 - Math.floor(y); // rows 43..21 are steps 0..22
        if (front >= step) crushed += sim;
      }
      return crushed;
    };
    expect(run(0)).toBeGreaterThan(0.5);
    expect(run(3)).toBe(0); // one tank of chrono, at 33/s
  });

  it("a Time-Lock from the start tile, facing the sentry, lies across the Foundry's stream", () => {
    const sentry = SET_PIECES.foundry_lock.hazards[0];
    const lock = makeTimeLock(29.5, 55.5, sentry.angle + Math.PI, 0);
    const end = { x: sentry.x + Math.cos(sentry.angle) * 8, y: sentry.y + Math.sin(sentry.angle) * 8 };
    expect(lockCrossing(lock, sentry.x, sentry.y, end.x, end.y)).not.toBeNull();
  });
});

/** A level loaded far enough for the set piece runtime. */
function levelGame(act, level, extra = {}) {
  const entry = ACTS.find((a) => a.id === act).levels[level];
  const map = structuredClone(campaignMap(entry));
  const hits = [];
  const aria = [];
  const said = [];
  const game = {
    mode: "campaign",
    campaign: { act, level },
    map,
    entities: map.entities.filter((e) => e.type === "enemy").map((e) => ({ ...e, type: "enemy", active: true, state: "idle" })),
    projectiles: [],
    player: { x: map.playerStart.x, y: map.playerStart.y, angle: 0, chronoActive: false, health: 100 },
    hits,
    aria,
    said,
    damagePlayer: (d) => hits.push(d),
    queueAriaMessage: (k) => aria.push(k),
    squadComms: { say: (m, t) => said.push([m, t]) },
    getDifficultyMultipliers: () => ({ healthMul: 1, damageMul: 1, speedMul: 1 }),
    ...extra,
  };
  const hz = new ChronoHazards();
  hz.load(game, entry);
  return { game, hz, entry };
}

describe("set pieces on their levels", () => {
  const withPieces = [];
  for (const act of ACTS) act.levels.forEach((l, i) => l.setPiece && withPieces.push({ act: act.id, level: i, entry: l }));

  it("names only set pieces that exist, each once", () => {
    const ids = withPieces.map((w) => w.entry.setPiece);
    for (const id of ids) expect(SET_PIECES[id], id).toBeDefined();
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(SET_PIECES).sort()).toEqual([...ids].sort());
  });

  it("puts Act I's only set piece, the optional Vent Gallery, in Reactor Access", () => {
    const actI = withPieces.filter((w) => w.act === 1);
    expect(actI.map((w) => w.entry.setPiece)).toEqual(["vent_gallery"]);
    expect(actI[0].entry.map).toBe("reactor");
    expect(SET_PIECES.vent_gallery.teach).toBeUndefined(); // optional: nothing sealed
    expect(SET_PIECES.vent_gallery.seals).toBeUndefined();
  });

  it("teaches each power on the level that grants it", () => {
    for (const { entry } of withPieces) {
      const teach = SET_PIECES[entry.setPiece].teach;
      if (teach) expect(entry.grants, entry.setPiece).toContain(teach.power);
    }
    const taught = withPieces.map((w) => SET_PIECES[w.entry.setPiece].teach?.power).filter(Boolean);
    expect(taught.sort()).toEqual(["dash", "foresight", "rewind", "timeLock"]);
  });

  it.each(withPieces.map((w) => [w.entry.setPiece, w]))("%s sits on open floor of its turned map", (_id, { entry }) => {
    const map = campaignMap(entry);
    const piece = setPieceFor(entry);
    const open = (x, y) => map.grid[Math.floor(y)]?.[Math.floor(x)] === 0;
    for (const h of piece.hazards ?? []) {
      if (h.type === "blade" || (h.type === "gate" && h.kind === "turret")) expect(open(h.x, h.y), h.id).toBe(true);
      if (h.back) expect(open(h.back.x, h.back.y), h.id).toBe(true);
      if (h.rect) {
        const [c1, r1, c2, r2] = h.rect;
        let floor = 0;
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (map.grid[r][c] === 0) floor++;
        expect(floor, h.id).toBeGreaterThan(0);
      }
    }
    for (const s of piece.teach?.spawn ?? []) expect(open(s.x, s.y)).toBe(true);
    for (const [c, r] of [...(piece.seals ?? []), ...(piece.teach?.seal ?? [])]) {
      expect([0, SEAL_TILE], `${c},${r}`).toContain(map.grid[r][c]);
    }
    if (piece.cache) expect(open(piece.cache.x, piece.cache.y)).toBe(true);
  });

  it("turns with its level: rotating by 90 four times is the identity", () => {
    const piece = SET_PIECES.precinct_rewind;
    let p = piece;
    for (let i = 0; i < 4; i++) p = rotateSetPiece(p, 60, 60, 90);
    expect(p.teach.seal).toEqual(piece.teach.seal);
    expect(p.hazards[0].x).toBeCloseTo(piece.hazards[0].x);
  });
});

describe("ChronoHazards runtime", () => {
  it("seals a teach room, clears it and fills it with the lesson", () => {
    const { game, hz } = levelGame(2, 1);
    const piece = setPieceFor(ACTS[1].levels[1]);
    for (const [c, r] of piece.teach.seal) expect(game.map.grid[r][c]).toBe(SEAL_TILE);
    const stalkers = game.entities.filter((e) => e._teach);
    expect(stalkers.map((e) => e.enemyType)).toEqual(["phaseStalker", "phaseStalker", "phaseStalker"]);
    expect(game.entities.filter((e) => !e._teach && e.y > 44 && e.y < 53 && e.x > 13 && e.x < 47)).toEqual([]);
    expect(hz.teach.done).toBe(false);
  });

  it("opens Foresight's hall after two kills while shifting, not before", () => {
    const { game, hz } = levelGame(2, 1);
    const [a, b] = game.entities.filter((e) => e._teach);
    hz.notify("kill", { enemy: a, shifting: false });
    hz.notify("kill", { enemy: a, shifting: true });
    hz.update(game, 0.016);
    expect(hz.teach.done).toBe(false);
    hz.notify("kill", { enemy: b, shifting: true });
    hz.update(game, 0.016);
    expect(hz.teach.done).toBe(true);
    const piece = setPieceFor(ACTS[1].levels[1]);
    for (const [c, r] of piece.teach.seal) expect(game.map.grid[r][c]).toBe(0);
  });

  it("brings the stalkers back if they all die without a shift", () => {
    const { game, hz } = levelGame(2, 1, { totalEnemies: 10 });
    for (const e of game.entities.filter((e) => e._teach)) e.active = false;
    hz.update(game, 0.016);
    expect(game.entities.filter((e) => e._teach && e.active).length).toBe(3);
    expect(game.totalEnemies).toBe(13);
  });

  it("opens the Precinct after a rewind that undid 20 or more", () => {
    const { game, hz } = levelGame(2, 5);
    hz.notify("rewind", { lost: 12 });
    hz.update(game, 0.016);
    expect(hz.teach.done).toBe(false);
    hz.notify("rewind", { lost: 21 });
    hz.update(game, 0.016);
    expect(hz.teach.done).toBe(true);
  });

  it("opens the Foundry after five caught rounds and silences its sentry", () => {
    const powers = { caughtTotal: 0, isInvulnerable: () => false };
    const { game, hz } = levelGame(2, 6, { chronoPowers: powers });
    hz.update(game, 1);
    expect(game.projectiles.length).toBeGreaterThan(0);
    powers.caughtTotal = 5;
    hz.update(game, 0.016);
    expect(hz.teach.done).toBe(true);
    const n = game.projectiles.length;
    hz.update(game, 2);
    expect(game.projectiles.length).toBe(n);
  });

  it("hands the Precinct sentry's burst to the echo while it stands", () => {
    const powers = { echo: null, isInvulnerable: () => false };
    const { game, hz } = levelGame(2, 5, { chronoPowers: powers });
    const sentry = hz.hazards[0];
    powers.echo = { x: sentry.x - 3, y: sentry.y };
    hz.update(game, 3.3);
    const r = game.projectiles[0];
    expect(Math.atan2(r.dirY, r.dirX)).toBeCloseTo(Math.PI, 1);
  });

  it("burns for the vent's cycle and no faster than its rehit gap", () => {
    const { game, hz } = levelGame(1, 5);
    const vent = hz.hazards[0];
    game.player.x = vent.rect[0] + 3.5;
    game.player.y = vent.rect[1] + 0.5;
    for (let i = 0; i < 60; i++) hz.update(game, 1 / 60); // the first second: on
    expect(game.hits.length).toBe(4); // t = 0, 0.3, 0.6, 0.9
    expect(game.hits.every((d) => d === vent.damage)).toBe(true);
  });

  it("drops a blade's damage through a Chrono Dash", () => {
    const powers = { isInvulnerable: () => true };
    const { game, hz } = levelGame(2, 2, { chronoPowers: powers });
    const fan = hz.hazards[0];
    game.player.x = fan.x;
    game.player.y = fan.y;
    for (let i = 0; i < 30; i++) hz.update(game, 1 / 60);
    expect(game.hits).toEqual([]);
  });

  it("fills a collapse behind the player and never in front", () => {
    const { game, hz } = levelGame(2, 0);
    const shaft = hz.hazards.find((h) => h.id === "shaft_west");
    const p = game.player;
    p.x = 8.5;
    p.y = 41.5; // in the trigger
    hz.update(game, 0.016);
    expect(hz.triggers.shaft_west).toBeDefined();
    p.y = 35.5;
    for (let i = 0; i < 300; i++) hz.update(game, 1 / 60); // five seconds: the front reaches the player
    const grid = game.map.grid;
    expect(grid[43][8]).not.toBe(0); // behind: rubble
    expect(grid[35][8]).toBe(0); // under the player: waiting
    expect(grid[30][8]).toBe(0); // ahead: waiting
    expect(game.hits.length).toBeGreaterThan(0); // crushed at the front
    p.y = 19.5; // out of the shaft
    hz.update(game, 1 / 60);
    expect(grid[30][8]).not.toBe(0);
    expect(shaft.steps.length).toBe(23);
  });

  it("resumes a collapse mid-fall from its saved clock", () => {
    const { game, hz } = levelGame(2, 0);
    game.player.x = 8.5;
    game.player.y = 41.5;
    hz.update(game, 0.016);
    for (let i = 0; i < 40; i++) hz.update(game, 1 / 60);
    const saved = JSON.parse(JSON.stringify(hz.serialize()));
    const again = new ChronoHazards();
    again.load(game, ACTS[1].levels[0]);
    again.restore(saved);
    const shaft = hz.hazards[0];
    expect(collapseFront(shaft, again.clock, again.triggers.shaft_west)).toBe(collapseFront(shaft, hz.clock, hz.triggers.shaft_west));
    expect(hazardState(shaft, again.clock, again.triggers.shaft_west)).toEqual(hazardState(shaft, hz.clock, hz.triggers.shaft_west));
  });

  it("runs the level clock at 0.15x while the player shifts", () => {
    const { game, hz } = levelGame(2, 2);
    hz.update(game, 1);
    game.player.chronoActive = true;
    hz.update(game, 1);
    expect(hz.clock).toBeCloseTo(1 + HAZARD_CHRONO);
  });

  it("never hurts in a stasis room, only marks it", () => {
    const { game, hz } = levelGame(2, 4);
    const room = hz.hazards[0];
    game.player.x = room.rect[0] + 2.5;
    game.player.y = room.rect[1] + 2.5;
    hz.update(game, 1);
    expect(hz.inStasis).toBe(true);
    expect(game.hits).toEqual([]);
    expect(game.aria).toContain("stasisRoom");
  });

  /** A point inside a loop's rect, and one just past its seam. */
  function loopPoints(loop) {
    const [c1, r1, c2, r2] = loop.rect;
    const seamMid = { x: (loop.seamA.x + loop.seamB.x) / 2, y: (loop.seamA.y + loop.seamB.y) / 2 };
    return {
      inside: { x: (c1 + c2 + 1) / 2, y: (r1 + r2 + 1) / 2 },
      outside: { x: seamMid.x + (loop.out.x - seamMid.x) * 1.2, y: seamMid.y + (loop.out.y - seamMid.y) * 1.2 },
    };
  }

  it("loops the Archive's reading room back toward the fire until you cross its seam shifting", () => {
    const { game, hz } = levelGame(4, 4);
    const loop = hz.hazards.find((h) => h.type === "loop");
    const p = game.player;
    const { inside, outside } = loopPoints(loop);
    Object.assign(p, inside);
    hz.update(game, 0.016);
    Object.assign(p, outside);
    hz.update(game, 0.016);
    expect(p.x).toBeCloseTo(loop.back.x);
    expect(p.y).toBeCloseTo(loop.back.y);
    expect(game.aria).toContain("loopRepeats");
    Object.assign(p, inside);
    hz.update(game, 0.016);
    p.chronoActive = true;
    Object.assign(p, outside);
    hz.update(game, 0.016);
    expect(p.x).toBeCloseTo(outside.x);
    expect(hazardState(loop, hz.clock, hz.triggers[loop.id]).broken).toBe(true);
  });

  it("loops the Loop's boulevard until you rewind back through its seam (spec IV-2)", () => {
    const { game, hz } = levelGame(4, 1);
    const loop = hz.hazards.find((h) => h.type === "loop");
    expect(loop.breaksOn).toBe("rewind");
    const p = game.player;
    const { inside, outside } = loopPoints(loop);
    const walkOut = (shifting = false) => {
      p.chronoActive = false;
      Object.assign(p, inside);
      hz.update(game, 0.016);
      p.chronoActive = shifting;
      Object.assign(p, outside);
      hz.update(game, 0.016);
    };
    // A rewind before it has ever thrown you back does nothing.
    hz.notify("rewind", { lost: 0 });
    expect(hz.triggers[loop.id]).toBeUndefined();
    // A shift does not break this seam.
    walkOut(true);
    expect(p.y).toBeCloseTo(loop.back.y);
    expect(game.aria).toContain("loopRewind");
    // Too long after the throw-back and a rewind misses it.
    for (let i = 0; i < 300; i++) hz.update(game, 0.02);
    hz.notify("rewind", { lost: 0 });
    expect(hz.triggers[loop.id]).toBeUndefined();
    // Thrown back, then a rewind straight away: back through the seam in time.
    walkOut();
    expect(p.y).toBeCloseTo(loop.back.y);
    hz.notify("rewind", { lost: 0 });
    expect(hazardState(loop, hz.clock, hz.triggers[loop.id]).broken).toBe(true);
    expect(game.aria).toContain("loopBroken");
    walkOut();
    expect(p.x).toBeCloseTo(outside.x);
    expect(p.y).toBeCloseTo(outside.y);
  });

  it("hardens set pieces in NG+: faster collapses and rotors, longer burns, quicker turrets", () => {
    const collapse = { type: "collapse", rate: 2, delay: 1 };
    const blade = { type: "blade", speed: 7 };
    const vent = { type: "vent", period: 3, on: 1.3 };
    const turret = { type: "gate", kind: "turret", interval: 1 };
    expect(ngPlusHazard(collapse, 0)).toBe(collapse);
    expect(ngPlusHazard(collapse, 1).rate).toBeCloseTo(2.5);
    expect(ngPlusHazard(collapse, 1).delay).toBeCloseTo(0.8);
    expect(ngPlusHazard(blade, 2).speed).toBeCloseTo(10.5);
    expect(ngPlusHazard(vent, 1).on).toBeGreaterThan(1.3);
    // A burn never takes more than three quarters of its cycle: a gap stays.
    expect(ngPlusHazard(vent, 9).on).toBeLessThanOrEqual(3 * 0.75);
    expect(ngPlusHazard(turret, 1).interval).toBeLessThan(1);
    // Capped at three cycles.
    expect(ngPlusHazard(blade, 9).speed).toBeCloseTo(ngPlusHazard(blade, 3).speed);
    // The runtime lays the hardened piece.
    const ng = levelGame(4, 0, { campaign: { act: 4, level: 0, ngPlusCycle: 1 } });
    const base = levelGame(4, 0);
    expect(ng.hz.hazards[0].rate).toBeGreaterThan(base.hz.hazards[0].rate);
  });

  it("drops the first hunters and the bell line in the Evac Shafts", () => {
    const hunts = [];
    const powers = { resonanceOn: true, huntNow: (_g, o) => hunts.push(o) };
    const { game, hz } = levelGame(2, 0, { chronoPowers: powers });
    const s = setPieceFor(ACTS[1].levels[0]).scripted[0];
    game.player.x = s.rect[0] + 10.5;
    game.player.y = s.rect[1] + 2.5;
    hz.update(game, 0.016);
    hz.update(game, 0.016);
    expect(hunts).toEqual([{ scripted: true }]);
    expect(game.said).toEqual([["lyra", s.squad.text]]);
  });

  it("lays nothing over a level outside the campaign", () => {
    const hz = new ChronoHazards();
    hz.load({ mode: "arena", map: { grid: [] }, entities: [] }, ACTS[1].levels[1]);
    expect(hz.piece).toBeNull();
  });
});
