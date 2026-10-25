import { describe, it, expect } from "vitest";
import { parSeconds, gradeLevel, finishesEarned, surveyGrid, formatClock } from "../../src/systems/level-debrief.js";
import { syncGearStats } from "../../src/systems/gear-sync.js";
import { ACHIEVEMENTS } from "../../src/data/achievements.js";
import { STATION_MAPS } from "../../src/data/levels/station-maps.js";
import { ACTS } from "../../src/data/campaign/acts.js";
import { campaignLevelMap } from "../../src/data/levels/campaign.js";

const perfect = { shotsFired: 100, shotsHit: 60, seconds: 100, par: 200, damageTaken: 0, maxHealth: 100, secretsFound: 2, secretsTotal: 2 };

describe("parSeconds", () => {
  it("grows with floor, enemies and power cells, rounded to 5 s", () => {
    const base = parSeconds({ openCells: 1800, enemies: 15 });
    expect(base % 5).toBe(0);
    expect(parSeconds({ openCells: 1800, enemies: 20 })).toBeGreaterThan(base);
    expect(parSeconds({ openCells: 2400, enemies: 15 })).toBeGreaterThan(base);
    expect(parSeconds({ openCells: 1800, enemies: 15, powerCells: 3 })).toBe(base + 45);
  });

  it("never falls under a minute", () => {
    expect(parSeconds({})).toBe(60);
  });

  it("gives every Act I level a par between two and five minutes", () => {
    ACTS[0].levels.forEach((_, i) => {
      const m = campaignLevelMap(1, i);
      const { openCells } = surveyGrid(m.grid);
      const par = parSeconds({ openCells, enemies: m.entities.filter((e) => e.type === "enemy").length });
      expect(par).toBeGreaterThanOrEqual(120);
      expect(par).toBeLessThanOrEqual(300);
    });
  });
});

describe("gradeLevel", () => {
  it("a clean, fast, thorough clear is an S", () => {
    const g = gradeLevel(perfect);
    expect(g.score).toBe(100);
    expect(g.letter).toBe("S");
  });

  it("time falls from full at par to none at twice par", () => {
    expect(gradeLevel({ ...perfect, seconds: 200 }).parts.time).toBe(30);
    expect(gradeLevel({ ...perfect, seconds: 300 }).parts.time).toBe(15);
    expect(gradeLevel({ ...perfect, seconds: 400 }).parts.time).toBe(0);
  });

  it("damage taken costs up to 30 at one and a half health bars", () => {
    expect(gradeLevel({ ...perfect, damageTaken: 75 }).parts.damage).toBe(15);
    expect(gradeLevel({ ...perfect, damageTaken: 500 }).parts.damage).toBe(0);
  });

  it("accuracy is full at half the shots landing; no shots fired is no misses", () => {
    expect(gradeLevel({ ...perfect, shotsHit: 25 }).parts.accuracy).toBe(15);
    expect(gradeLevel({ ...perfect, shotsFired: 0, shotsHit: 0 }).parts.accuracy).toBe(30);
  });

  it("secrets count against the level's own total, and a level without any gives the 10", () => {
    expect(gradeLevel({ ...perfect, secretsFound: 1 }).parts.secrets).toBe(5);
    expect(gradeLevel({ ...perfect, secretsFound: 0, secretsTotal: 0 }).parts.secrets).toBe(10);
  });

  it("maps scores onto the letter bands", () => {
    // A slow, sloppy, bloody run.
    const g = gradeLevel({ shotsFired: 100, shotsHit: 10, seconds: 390, par: 200, damageTaken: 140, maxHealth: 100, secretsFound: 0, secretsTotal: 2 });
    expect(g.letter).toBe("D");
    expect(gradeLevel({ ...perfect, seconds: 260, damageTaken: 60 }).letter).toBe("A");
  });
});

describe("finishesEarned", () => {
  it("lists each finish threshold crossed this level, per weapon", () => {
    const got = finishesEarned({ 0: 10, 1: 39 }, { 0: 16, 1: 76, 2: 3 });
    expect(got.map((f) => `${f.weaponId}:${f.finish.id}`)).toEqual(["0:carbon", "1:chrome", "1:frost"]);
  });

  it("is empty when nothing crossed", () => {
    expect(finishesEarned({ 0: 15 }, { 0: 20 })).toEqual([]);
  });
});

describe("surveyGrid / formatClock", () => {
  it("counts open floor and secret walls", () => {
    expect(surveyGrid([[0, 1, 6], [0, 6, 0]])).toEqual({ openCells: 3, secrets: 2 });
  });
  it("formats m:ss", () => {
    expect(formatClock(205)).toBe("3:25");
  });
});

describe("syncGearStats", () => {
  const fresh = () => ({ maxHealth: 100, health: 80, maxChronoEnergy: 100, chronoEnergy: 100, maxStamina: 100, stamina: 40, dashStaminaCost: 20, armor: 0, moveSpeed: 3.5 });

  it("applies a piece put on mid-run once, however often it is called", () => {
    const p = fresh();
    syncGearStats(p, {});
    syncGearStats(p, { maxHealthAdd: 15, armorAdd: 4, moveSpeedAdd: -0.1 });
    syncGearStats(p, { maxHealthAdd: 15, armorAdd: 4, moveSpeedAdd: -0.1 });
    expect(p.maxHealth).toBe(115);
    expect(p.health).toBe(95);
    expect(p.armor).toBe(4);
    expect(p.moveSpeed).toBeCloseTo(3.4);
  });

  it("takes a removed piece's additive bonuses back off", () => {
    const p = fresh();
    syncGearStats(p, { maxStaminaAdd: 15, maxChronoEnergyAdd: 10 });
    syncGearStats(p, {});
    expect(p.maxStamina).toBe(100);
    expect(p.maxChronoEnergy).toBe(100);
    expect(p.chronoEnergy).toBe(100);
  });
});

describe("rewards that can be earned", () => {
  it("no achievement is a placeholder that can never trigger", () => {
    for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
      expect(id.startsWith("_"), id).toBe(false);
      expect(a.name).not.toBe("???");
    }
    expect(ACHIEVEMENTS.topMarks.check({ levelsAced: 1 })).toBe(true);
    expect(ACHIEVEMENTS.treasureHunter.check({ levelsFullySearched: 1 })).toBe(true);
    expect(ACHIEVEMENTS.fullArsenal.check({ fullArsenal: true })).toBe(true);
    expect(ACHIEVEMENTS.fullArsenal.check({})).toBe(false);
  });
});

describe("Act I weapon cadence", () => {
  it("levels 1-8 never place a weapon an earlier level already gave", () => {
    const seen = new Set([0]);
    ACTS[0].levels.forEach((entry) => {
      const ids = STATION_MAPS[entry.map].entities.filter((e) => e.type === "weapon").map((e) => e.weaponId);
      for (const id of ids) {
        expect(seen.has(id), `${entry.map} repeats weapon ${id}`).toBe(false);
        seen.add(id);
      }
    });
    // Act I hands out six; the Phase Scattergun and Quantum Cannon wait for
    // Act II, so the arsenal keeps growing past the first boss.
    expect(seen.size).toBe(6);
    expect(seen.has(4) || seen.has(3)).toBe(false);
  });

  it("Act II hands out the rest, each in its first three levels", () => {
    const firstAt = (id) =>
      ACTS[1].levels.findIndex((_, i) =>
        campaignLevelMap(2, i).entities.some((e) => e.type === "weapon" && e.weaponId === id),
      );
    for (const id of [4, 3]) {
      expect(firstAt(id), `weapon ${id}`).toBeGreaterThanOrEqual(0);
      expect(firstAt(id), `weapon ${id}`).toBeLessThan(3);
    }
  });

  it("no more than one level in a row goes without a new weapon", () => {
    let dry = 0;
    for (const entry of ACTS[0].levels.slice(0, -1)) {
      const has = STATION_MAPS[entry.map].entities.some((e) => e.type === "weapon");
      dry = has ? 0 : dry + 1;
      expect(dry).toBeLessThan(2);
    }
  });
});

describe("level-complete card text", async () => {
  const { earnedLines, debriefHeading } = await import("../../src/ui/game-over-screens.js");
  it("names the act, level and map", () => {
    expect(debriefHeading({ act: 1, levelNumber: 3, levelName: "Research Wing" })).toBe("Act I · Level 3 — Research Wing");
  });
  it("caps the earned list and says how many more", () => {
    const earned = [1, 2, 3, 4, 5].map((n) => ({ kind: "Gear", name: `P${n}` }));
    expect(earnedLines(earned, 4)).toEqual(["Gear: P1", "Gear: P2", "Gear: P3", "+2 more"]);
    expect(earnedLines(earned.slice(0, 2), 4)).toEqual(["Gear: P1", "Gear: P2"]);
  });
});
