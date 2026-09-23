import { describe, it, expect } from "vitest";
import {
  ChronoPowers,
  GIFTS,
  POWERS,
  RESONANCE,
  giftsFor,
  huntRules,
  hunterCap,
  newResonance,
  powersFor,
  stepResonance,
} from "../../src/systems/chrono-powers.js";
import { ACTS } from "../../src/data/campaign/acts.js";

// Act IV's rules for the powers: the parting gifts (spec decision 9), harder
// hunters in NG+ (decision 10), and Nova drawing the hunters off in IV-4.

function open(w = 40, h = 40) {
  const grid = Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => (r === 0 || c === 0 || r === h - 1 || c === w - 1 ? 1 : 0)),
  );
  return { width: w, height: h, grid };
}

function fakeGame({ act = 4, level = 0, difficulty = 1, ngPlus = 0, piece = null } = {}) {
  const aria = [];
  const said = [];
  return {
    mode: "campaign",
    map: open(),
    time: 0,
    settings: { difficulty, hunterResponse: 1 },
    campaign: { act, level, ngPlusCycle: ngPlus },
    player: {
      x: 20, y: 20, angle: 0, health: 60, maxHealth: 100, alive: true,
      chronoEnergy: 100, maxChronoEnergy: 100, chronoActive: false, isDashing: false,
    },
    entities: [],
    projectiles: [],
    aria,
    said,
    chronoHazards: piece ? { piece, notify() {} } : null,
    squadComms: { say: (m, t) => said.push([m, t]) },
    queueAriaMessage: (k) => aria.push(k),
    getDifficultyMultipliers: () => ({ healthMul: 1, damageMul: 1, speedMul: 1 }),
  };
}

describe("parting gifts", () => {
  it("arrive one per level from IV-3, in the reverse of the order they joined", () => {
    const iv = ACTS.at(-1);
    const seen = iv.levels.map((_, i) => giftsFor(4, i));
    expect(seen).toEqual([
      [],
      [],
      ["timeLock"],
      ["rewind", "timeLock"],
      ["dash", "rewind", "timeLock"],
      ["foresight", "dash", "rewind", "timeLock"],
      ["foresight", "dash", "rewind", "timeLock"],
    ]);
    for (let a = 1; a <= 3; a++) {
      ACTS[a - 1].levels.forEach((_, i) => expect(giftsFor(a, i), `${a}.${i}`).toEqual([]));
    }
  });

  it("come only from allies the player actually recruited", () => {
    // A campaign where Kael never joined: his gift slot leaves nothing.
    const acts = [
      { id: 1, levels: [{ squad: ["lyra"], grants: ["foresight", "timeLock"] }] },
      { id: 2, levels: [{ squad: ["lyra"], gifts: ["timeLock"] }, { squad: [], gifts: ["foresight"] }] },
    ];
    expect(giftsFor(2, 0, { acts })).toEqual([]);
    expect(giftsFor(2, 1, { acts })).toEqual(["foresight"]);
    // And only for a power you hold: a gift for a power never granted is nothing.
    const noPower = [{ id: 1, levels: [{ squad: ["kael"], gifts: ["timeLock"] }] }];
    expect(powersFor(1, 0, { acts: noPower })).toEqual([]);
    expect(giftsFor(1, 0, { acts: noPower })).toEqual([]);
  });

  it("name their giver", () => {
    expect(Object.fromEntries(Object.entries(GIFTS).map(([k, g]) => [k, g.from]))).toEqual({
      timeLock: "kael", rewind: "nova", dash: "rook", foresight: "lyra",
    });
  });

  it("Kael's: a Time-Lock holds six seconds", () => {
    const cp = new ChronoPowers();
    const before = fakeGame({ level: 1 });
    cp.startLevel(before);
    cp.tryTimeLock(before);
    expect(cp.lock.until - cp.lock.born).toBe(POWERS.timeLock.duration);
    const after = fakeGame({ level: 2 });
    cp.startLevel(after);
    expect(cp.freshGifts).toEqual(["timeLock"]);
    cp.tryTimeLock(after);
    expect(cp.lock.until - cp.lock.born).toBe(6);
  });

  it("Nova's: the rewind comes back sooner, and the echo stands longer", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ level: 3 });
    cp.startLevel(game);
    expect(cp.freshGifts).toEqual(["rewind"]);
    for (let i = 0; i < 80; i++) cp.update(game, 0.05, 0.05);
    expect(cp.tryRewind(game)).toBe(true);
    expect(cp.cooldowns.rewind).toBe(7);
    expect(cp.echo.until - cp.echo.born).toBe(4);
    expect(cp.cooldown("rewind").frac).toBe(1);
  });

  it("Rook's: a Chrono Dash costs less and rings nothing", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ level: 4 });
    cp.startLevel(game);
    game.player.chronoActive = true;
    expect(cp.tryChronoDash(game, 1, 0)).toBe(true);
    expect(game.player.chronoEnergy).toBe(100 - 12);
    expect(cp._pendingRing ?? 0).toBe(0);
    // Before Rook stays behind, the dash still rings.
    const earlier = new ChronoPowers();
    const g2 = fakeGame({ level: 3 });
    earlier.startLevel(g2);
    g2.player.chronoActive = true;
    earlier.tryChronoDash(g2, 1, 0);
    expect(earlier._pendingRing).toBe(RESONANCE.events.dash);
  });

  it("Lyra's: Foresight runs without a shift, and sees further", () => {
    const cp = new ChronoPowers();
    const game = fakeGame({ level: 4 });
    cp.startLevel(game);
    expect(cp.foresightOn(game.player)).toBe(false);
    game.player.chronoActive = true;
    expect(cp.foresightOn(game.player)).toBe(true);
    const lyra = fakeGame({ level: 5 });
    cp.startLevel(lyra);
    expect(cp.foresightOn(lyra.player)).toBe(true);
    expect(cp.spec("foresight").horizon).toBeGreaterThan(POWERS.foresight.horizon);
  });
});

describe("NG+ hunters", () => {
  it("allow more responses, bigger packs and a shorter cooldown per cycle, capped at two", () => {
    const base = huntRules(1, 0);
    expect(base).toEqual({ cap: hunterCap(1), packMin: 2, packMax: 4, cooldown: RESONANCE.cooldown });
    const one = huntRules(1, 1);
    expect(one.cap).toBe(base.cap + 1);
    expect(one.packMin).toBe(3);
    expect(one.cooldown).toBe(RESONANCE.cooldown - 10);
    expect(huntRules(1, 5)).toEqual(huntRules(1, 2));
    expect(huntRules(1, 2).cooldown).toBeGreaterThanOrEqual(25);
  });

  it("send bigger packs in NG+", () => {
    const sizes = (ngPlus) => {
      const cp = new ChronoPowers();
      const game = fakeGame({ act: 3, level: 0, ngPlus });
      cp.startLevel(game);
      const out = new Set();
      for (let i = 0; i < 20; i++) out.add(cp.huntNow(game, { rng: () => i / 20 }).length);
      return [...out].sort();
    };
    expect(sizes(0)).toEqual([2, 3, 4]);
    expect(sizes(1)).toEqual([3, 4, 5]);
  });

  it("come round again sooner in NG+", () => {
    const r = newResonance();
    r.value = 100;
    stepResonance(r, { dt: 0.01, shifting: true, policy: "on", cap: 5, bossLevel: false, cooldown: huntRules(1, 1).cooldown });
    expect(r.cooldown).toBe(RESONANCE.cooldown - 10);
  });
});

describe("Nova's decoy (IV-4)", () => {
  it("takes the pack he sends, and says so", () => {
    const piece = { decoy: { member: "nova", lines: ["one", "two"] } };
    const cp = new ChronoPowers();
    const game = fakeGame({ level: 3, piece });
    cp.startLevel(game);
    cp._onResonance(game, "hunt");
    cp._onResonance(game, "hunt");
    cp._onResonance(game, "hunt");
    expect(game.entities).toEqual([]);
    expect(game.said).toEqual([["nova", "one"], ["nova", "two"], ["nova", "one"]]);
    // The warnings still come.
    cp._onResonance(game, "warn");
    expect(game.aria).toContain("resonanceRising");
  });

  it("is IV-4's set piece, and nowhere else", async () => {
    const { SET_PIECES } = await import("../../src/data/campaign/set-pieces.js");
    const withDecoy = Object.entries(SET_PIECES).filter(([, p]) => p.decoy).map(([k]) => k);
    expect(withDecoy).toEqual(["nova_decoy"]);
    expect(ACTS.at(-1).levels[3].setPiece).toBe("nova_decoy");
    expect(SET_PIECES.nova_decoy.decoy.member).toBe("nova");
    expect(ACTS.at(-1).levels[3].squad).toContain("nova");
  });
});
