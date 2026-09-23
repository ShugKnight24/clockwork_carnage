import { describe, it, expect } from "vitest";
import {
  ACTS,
  NG_PLUS,
  getAct,
  getActLevel,
  isLastAct,
  totalActs,
  maxActLevels,
  bossLevelIndex,
} from "../../src/data/campaign/acts.js";
import { CUTSCENE_KEYS } from "../../src/data/cutscene-keys.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { ARIA_COMMS } from "../../src/data/dialogue.js";

// The shape of the story as data (spec §Testing, acts.test.js), scoped to
// what phase 1 describes: today's three acts over the nine station maps.

const CAST = new Set(["kael", "nova", "rook", "lyra"]);

describe("ACTS", () => {
  it("numbers acts 1..n in order", () => {
    expect(ACTS.map((a) => a.id)).toEqual(ACTS.map((_, i) => i + 1));
  });

  it("gives every act a palette, roster, boss card, ARIA line and outro", () => {
    for (const act of ACTS) {
      expect(act.palette, `act ${act.id} palette`).toBeTruthy();
      expect(act.roster.length, `act ${act.id} roster`).toBeGreaterThan(0);
      expect(act.boss.card.title, `act ${act.id} card`).toBeTruthy();
      expect(act.boss.card.subtitle, `act ${act.id} card`).toBeTruthy();
      expect(ARIA_COMMS[act.boss.aria], `act ${act.id} boss line`).toBeDefined();
      expect(act.outro.length, `act ${act.id} outro`).toBeGreaterThan(0);
      expect(act.scale).toBeGreaterThan(0);
    }
  });

  it("uses only real enemy types in rosters, substitutes and bosses", () => {
    for (const act of ACTS) {
      for (const t of act.roster) expect(ENEMY_TYPES[t], `${act.id}: ${t}`).toBeDefined();
      for (const [from, to] of Object.entries(act.substitutes)) {
        expect(ENEMY_TYPES[from], `${act.id}: ${from}`).toBeDefined();
        expect(act.roster, `act ${act.id} swaps ${from} for ${to}`).toContain(to);
      }
      expect(ENEMY_TYPES[act.boss.type]?.boss, `act ${act.id} boss`).toBe(true);
    }
  });

  it("names only scenes that exist", () => {
    const keys = (act) => [
      ...act.intro,
      ...act.outro,
      ...act.levels.flatMap((l) => l.briefing ?? []),
    ];
    for (const act of ACTS) {
      for (const k of keys(act)) expect(CUTSCENE_KEYS.has(k), `act ${act.id}: ${k}`).toBe(true);
    }
    for (const k of NG_PLUS.trueEnding) expect(CUTSCENE_KEYS.has(k), k).toBe(true);
  });

  it("names only ARIA pools that exist", () => {
    for (const act of ACTS) {
      if (act.ambient) expect(ARIA_COMMS[act.ambient], act.ambient).toBeDefined();
      if (act.boss.squadPool != null) {
        expect(ARIA_COMMS[`bossPhase${act.boss.squadPool}Squad`]).toBeDefined();
      }
      for (const l of act.levels) {
        for (const line of l.onStart) expect(ARIA_COMMS[line.aria], line.aria).toBeDefined();
      }
    }
  });

  it("ends every act on exactly one boss level", () => {
    for (const act of ACTS) {
      const bosses = act.levels.filter((l) => l.boss);
      expect(bosses, `act ${act.id}`).toHaveLength(1);
      expect(act.levels.at(-1).boss, `act ${act.id} ends on its boss`).toBe(true);
      expect(bossLevelIndex(act.id)).toBe(act.levels.length - 1);
    }
  });

  it("lists only cast members as squad, and presence never shrinks inside an act", () => {
    for (const act of ACTS) {
      let before = [];
      for (const [i, l] of act.levels.entries()) {
        for (const m of l.squad) expect(CAST.has(m), `${act.id}.${i}: ${m}`).toBe(true);
        for (const m of before) expect(l.squad, `${act.id}.${i} lost ${m}`).toContain(m);
        before = l.squad;
      }
    }
  });

  it("looks acts and levels up by 1-based act and 0-based level", () => {
    expect(getAct(2).id).toBe(2);
    expect(getAct(0)).toBeUndefined();
    expect(getAct(ACTS.length + 1)).toBeUndefined();
    expect(getActLevel(1, 0)).toBe(ACTS[0].levels[0]);
    expect(getActLevel(1, ACTS[0].levels.length)).toBeUndefined();
    expect(isLastAct(ACTS.at(-1).id)).toBe(true);
    expect(isLastAct(1)).toBe(ACTS.length === 1);
    expect(totalActs()).toBe(ACTS.length);
    expect(maxActLevels()).toBe(Math.max(...ACTS.map((a) => a.levels.length)));
  });
});

describe("ACTS against the MAPS registry", async () => {
  const { MAPS, campaignMap, campaignLevelMap, campaignMaps } = await import(
    "../../src/data/levels/campaign.js"
  );

  it("resolves every level's map id", () => {
    for (const act of ACTS) {
      for (const [i, l] of act.levels.entries()) {
        expect(MAPS[l.map], `${act.id}.${i}: ${l.map}`).toBeDefined();
        expect(campaignLevelMap(act.id, i)).toBe(campaignMap(l));
      }
    }
  });

  it("flags as boss exactly the levels whose map is a boss map", () => {
    for (const act of ACTS) {
      for (const [i, l] of act.levels.entries()) {
        expect(!!campaignMap(l).isBossLevel, `${act.id}.${i}`).toBe(l.boss);
      }
    }
  });

  it("prepares a map once per seed and rotation, leaving the registry untouched", () => {
    const before = JSON.stringify(MAPS.entry.grid);
    const a = campaignMap({ map: "entry", seed: 1, rotation: 0 });
    const b = campaignMap({ map: "entry", seed: 2, rotation: 90 });
    expect(campaignMap({ map: "entry", seed: 1, rotation: 0 })).toBe(a);
    expect(b).not.toBe(a);
    expect(JSON.stringify(MAPS.entry.grid)).toBe(before);
    expect(campaignMap({ map: "nope", seed: 1 })).toBeNull();
    expect(campaignLevelMap(99, 0)).toBeNull();
  });

  it("lists each distinct campaign map once", () => {
    const maps = campaignMaps();
    expect(new Set(maps).size).toBe(maps.length);
    expect(maps.map((m) => m.name)).toContain("The Paradox Core");
  });
});
