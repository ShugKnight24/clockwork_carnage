/**
 * Act III's set pieces: rewriting walls, the Archive's replaying blast, the
 * Engine's holding stasis, and objectives (racks, valves against heat).
 */
import { describe, it, expect } from "vitest";
import {
  ChronoHazards,
  HAZARD_CHRONO,
  hazardState,
  rewriteState,
  stepHeat,
} from "../../src/systems/chrono-hazards.js";
import { SET_PIECES, SEAL_TILE, setPieceFor } from "../../src/data/campaign/set-pieces.js";
import { ACTS } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";

const ACT3 = ACTS.find((a) => a.id === 3);

/** A level of Act III loaded far enough for the set piece runtime. */
function levelGame(level) {
  const entry = ACT3.levels[level];
  const map = structuredClone(campaignMap(entry));
  const game = {
    mode: "campaign",
    campaign: { act: 3, level },
    map,
    time: 1000,
    entities: map.entities
      .filter((e) => e.type === "enemy")
      .map((e) => ({ ...e, active: true, state: "idle", health: 100, maxHealth: 100 })),
    player: { x: map.playerStart.x, y: map.playerStart.y, angle: 0, chronoActive: false, health: 100 },
    hits: [],
    aria: [],
    said: [],
    screenShake: 0,
    damagePlayer(d) {
      this.hits.push(d);
    },
    queueAriaMessage(k) {
      this.aria.push(k);
    },
    squadComms: { say: (m, t) => game.said.push([m, t]) },
  };
  const hz = new ChronoHazards();
  hz.load(game, entry);
  return { game, hz, entry, piece: setPieceFor(entry) };
}

/** Put the player in the middle of a rect [c1, r1, c2, r2]. */
const stand = (game, [c1, r1, c2, r2]) => {
  game.player.x = (c1 + c2 + 1) / 2;
  game.player.y = (r1 + r2 + 1) / 2;
};

describe("rewriting walls", () => {
  const piece = SET_PIECES.rewritten_walls;

  it("are a pure function of the clock: closed `on` seconds in every `period`, priming before", () => {
    const h = piece.hazards[0];
    expect(rewriteState(h, 1)).toEqual({ closed: true, priming: false });
    expect(rewriteState(h, 8)).toEqual({ closed: false, priming: false });
    expect(rewriteState(h, 11)).toEqual({ closed: false, priming: true });
    expect(hazardState(h, 11)).toEqual(rewriteState(h, 11));
  });

  it("leave one way open through each gate at every instant", () => {
    for (const gate of ["gate1", "gate2"]) {
      const group = piece.hazards.filter((h) => h.id.startsWith(gate));
      expect(group).toHaveLength(3);
      for (let t = 0; t < 24; t += 0.05) {
        expect(group.some((h) => !rewriteState(h, t).closed), `${gate} at ${t.toFixed(2)}`).toBe(true);
      }
    }
  });

  it("close their cells on the clock, wait for whoever stands in one, and reopen only their own", () => {
    const { game, hz, piece: turned } = levelGame(0);
    const h = turned.hazards.find((x) => x.id === "gate1_w");
    const [c0, r0] = h.cells[0];
    game.player.x = c0 + 0.5;
    game.player.y = r0 + 0.5;
    hz.update(game, 0.5); // clock 0.5: closed
    expect(game.map.grid[r0][c0]).toBe(0);
    for (const [c, r] of h.cells.slice(1)) expect(game.map.grid[r][c]).toBe(SEAL_TILE);
    // Step out: the waiting cell closes behind you.
    game.player.x += 3;
    hz.update(game, 0.1);
    expect(game.map.grid[r0][c0]).toBe(SEAL_TILE);
    // At 7 s it opens again, every cell of it.
    hz.update(game, 6.6);
    for (const [c, r] of h.cells) expect(game.map.grid[r][c]).toBe(0);
    expect(game.aria).toContain("rewriteWalls");
  });

  it("run at a fraction while you shift, so the windows are long enough to read", () => {
    const { game, hz } = levelGame(0);
    game.player.chronoActive = true;
    hz.update(game, 1);
    expect(hz.clock).toBeCloseTo(HAZARD_CHRONO);
  });
});

describe("the Archive's replaying blast", () => {
  const blasts = SET_PIECES.archive_takes.hazards.filter((h) => h.blast);

  it("goes off every eleven seconds and primes two seconds before", () => {
    for (const h of blasts) {
      expect(h.period).toBe(11);
      const fire = (11 - (h.phase ?? 0)) % 11;
      expect(hazardState(h, fire + 0.1).on, h.id).toBe(true);
      expect(hazardState(h, fire - 1.5).priming, h.id).toBe(true);
      expect(hazardState(h, fire - 2.5).priming, h.id).toBe(false);
    }
  });

  it("hits once per blast, not once per frame", () => {
    const { game, hz, piece } = levelGame(4);
    const h = piece.hazards.find((x) => x.id === "take0417_blast");
    stand(game, [h.rect[0] + 2, h.rect[1], h.rect[0] + 2, h.rect[1]]);
    for (let i = 0; i < 40; i++) hz.update(game, 1 / 60);
    expect(game.hits).toEqual([h.damage]);
  });

  it("sits in a loop room that only lets you out shifting", () => {
    const { game, hz, piece } = levelGame(4);
    const loop = piece.hazards.find((x) => x.id === "take0417_loop");
    game.player.x = loop.out.x;
    game.player.y = loop.out.y + 1.8;
    hz.update(game, 0.01);
    game.player.y = loop.out.y;
    hz.update(game, 0.01);
    expect(game.player.y).toBeCloseTo(loop.back.y);
    expect(game.aria).toContain("loopRepeats");
  });
});

describe("the Engine's holding stasis", () => {
  it("freezes what stands in the field, mid-step", () => {
    const { game, piece } = levelGame(5);
    const field = piece.hazards.find((h) => h.holds);
    const held = game.entities.filter((e) => e._stasis === field.id);
    expect(held.length).toBeGreaterThanOrEqual(4);
    for (const e of held) expect(e._empDisabledUntil).toBe(Infinity);
    expect(game.entities.some((e) => !e._stasis)).toBe(true);
  });

  it("desaturates the walk, and breaks when you leave it at the north end", () => {
    const { game, hz, piece } = levelGame(5);
    const field = piece.hazards.find((h) => h.holds);
    stand(game, [field.rect[0] + 3, field.rect[1] + 10, field.rect[0] + 3, field.rect[1] + 10]);
    hz.update(game, 0.1);
    expect(hz.inStasis).toBe(true);
    expect(hazardState(field, hz.clock, hz.triggers[field.id]).broken).toBe(false);
    stand(game, field.release);
    hz.update(game, 0.1);
    expect(hz.inStasis).toBe(false);
    expect(hazardState(field, hz.clock, hz.triggers[field.id]).broken).toBe(true);
    const woke = game.entities.filter((e) => e._empDisabledUntil === 0);
    expect(woke.length).toBeGreaterThanOrEqual(4);
    for (const e of woke) {
      expect(e.state).toBe("chase");
      expect(e.lastAttackTime).toBe(game.time);
    }
    expect(game.aria).toContain("stasisBreaks");
    expect(game.said.map(([m]) => m)).toContain("kael");
  });

  it("breaks when you hurt anything it holds", () => {
    const { game, hz, piece } = levelGame(5);
    const field = piece.hazards.find((h) => h.holds);
    const e = game.entities.find((x) => x._stasis === field.id);
    e.health -= 10;
    hz.update(game, 0.1);
    expect(hz.triggers[field.id]).toBeDefined();
    expect(e._empDisabledUntil).toBe(0);
  });
});

describe("objectives", () => {
  it("burn the racks in any order, then open the north door", () => {
    const { game, hz, piece } = levelGame(1);
    const o = piece.objective;
    for (const [c, r] of o.seal) expect(game.map.grid[r][c]).toBe(SEAL_TILE);
    expect(hz.objective.card.hint).toContain("0/4");
    for (const s of [...o.stations].reverse()) {
      // Cover variation may have cleared a rack pillar; the rest burn.
      const racks = s.burn.filter(([c, r]) => game.map.grid[r][c] !== 0);
      expect(racks.length, s.id).toBeGreaterThan(1);
      stand(game, s.rect);
      for (let t = 0; t < o.hold + 0.2; t += 0.1) hz.update(game, 0.1);
      expect(hz.objective.cleared).toContain(s.id);
      for (const [c, r] of racks) expect(game.map.grid[r][c], `${s.id} ${c},${r}`).toBe(4);
    }
    expect(hz.objective.done).toBe(true);
    for (const [c, r] of o.seal) expect(game.map.grid[r][c]).toBe(0);
    expect(game.said.map(([m]) => m)).toEqual(["lyra", "rook", "kael", "nova", "rook"]);
  });

  it("forget a hold you walk away from", () => {
    const { game, hz, piece } = levelGame(1);
    const s = piece.objective.stations[0];
    stand(game, s.rect);
    for (let i = 0; i < 10; i++) hz.update(game, 0.1);
    game.player.x += 8;
    for (let i = 0; i < 10; i++) hz.update(game, 0.1);
    expect(hz.objective.held[s.id]).toBe(0);
    expect(hz.objective.cleared).toEqual([]);
  });

  it("turn the valves only in order", () => {
    const { game, hz, piece } = levelGame(2);
    const [first, second] = piece.objective.stations;
    stand(game, second.rect);
    for (let i = 0; i < 30; i++) hz.update(game, 0.1);
    expect(hz.objective.cleared).toEqual([]);
    stand(game, first.rect);
    for (let i = 0; i < 20; i++) hz.update(game, 0.1);
    expect(hz.objective.cleared).toEqual(["core"]);
  });

  it("start the heat clock at the core, cool on each valve, and pulse on overload", () => {
    const { game, hz, piece } = levelGame(2);
    const heat = piece.objective.heatClock;
    hz.update(game, 5);
    expect(hz.objective.heat).toBe(0); // not in the core yet
    // In the core room, away from the first valve.
    const [c1, r1] = heat.trigger;
    stand(game, [c1 + 1, r1 + 1, c1 + 1, r1 + 1]);
    hz.update(game, 0.1);
    expect(hz.objective.heatOn).toBe(true);
    expect(game.aria).toContain("reactorHeat");
    hz.update(game, 32);
    expect(hz.objective.heat).toBeCloseTo(32 * heat.rate, 0);
    expect(game.aria).toContain("reactorHeatHigh");
    hz.update(game, 20);
    expect(hz.objective.overloads).toBe(1);
    expect(game.hits).toContain(heat.damage);
    expect(game.aria).toContain("reactorOverload");
    expect(hz.objective.heat).toBeLessThan(heat.max);
  });

  it("let a shift stretch the heat window", () => {
    const heat = SET_PIECES.coolant_valves.objective.heatClock;
    const run = (shifting) => {
      const { game, hz } = levelGame(2);
      stand(game, [heat.trigger[0] + 1, heat.trigger[1] + 1, heat.trigger[0] + 1, heat.trigger[1] + 1]);
      hz.update(game, 0.01);
      game.player.chronoActive = shifting;
      hz.update(game, 10);
      return hz.objective.heat;
    };
    expect(run(true)).toBeLessThan(run(false) * 0.2);
  });

  it("step heat purely: climb at rate, reset on overload", () => {
    const spec = { rate: 2, max: 100, reset: 55 };
    expect(stepHeat(spec, 10, 5)).toEqual({ heat: 20, overload: false });
    expect(stepHeat(spec, 98, 5)).toEqual({ heat: 55, overload: true });
  });

  it("save and restore their progress", () => {
    const a = levelGame(2);
    stand(a.game, a.piece.objective.stations[0].rect);
    for (let i = 0; i < 20; i++) a.hz.update(a.game, 0.1);
    const saved = a.hz.serialize();
    expect(saved.objective.cleared).toEqual(["core"]);
    const b = levelGame(2);
    b.hz.restore(saved);
    expect(b.hz.objective.cleared).toEqual(["core"]);
    expect(b.hz.objective.heat).toBeCloseTo(saved.objective.heat);
    expect(b.hz.objective.card.hint).toContain("1/3");
  });
});
