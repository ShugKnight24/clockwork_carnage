import { describe, it, expect } from "vitest";
import {
  ACTS,
  NG_PLUS,
  RECRUITS,
  getAct,
  getActLevel,
  isLastAct,
  totalActs,
  maxActLevels,
  bossLevelIndex,
  sceneSlots,
} from "../../src/data/campaign/acts.js";
import { CUTSCENE_KEYS } from "../../src/data/cutscene-keys.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { ARIA_COMMS } from "../../src/data/dialogue.js";

// The shape of the story as data (spec §Testing, acts.test.js): four acts,
// 29 slots, one recruit per chapter of Act II, one farewell per level of IV.

const CAST = new Set(["kael", "nova", "rook", "lyra"]);

describe("ACTS", () => {
  it("is four acts of 8 + 7 + 7 + 7 levels", () => {
    expect(ACTS.map((a) => a.id)).toEqual([1, 2, 3, 4]);
    expect(ACTS.map((a) => a.levels.length)).toEqual([8, 7, 7, 7]);
    expect(ACTS.reduce((n, a) => n + a.levels.length, 0)).toBe(29);
    expect(ACTS.map((a) => a.title)).toEqual(["THE FALL", "THE GATHERING", "THE HUNT", "THE SACRIFICE"]);
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

  it("climbs the boss ladder: Form 1, the Hound, Form 2, the Final Form", () => {
    expect(ACTS.map((a) => a.boss.type)).toEqual(["boss", "hound", "boss_form2", "boss_form3"]);
    expect(ACTS.map((a) => a.scale)).toEqual([...ACTS.map((a) => a.scale)].sort((a, b) => a - b));
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
    for (const { key, act, level } of sceneSlots()) {
      expect(CUTSCENE_KEYS.has(key), `act ${act}.${level}: ${key}`).toBe(true);
    }
    for (const k of NG_PLUS.trueEnding) expect(CUTSCENE_KEYS.has(k), k).toBe(true);
  });

  it("plays each scene in one slot only", () => {
    const keys = sceneSlots().map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("names only ARIA pools that exist", () => {
    for (const act of ACTS) {
      expect(ARIA_COMMS[act.ambient], `act ${act.id} ambient`).toBeDefined();
      if (act.boss.squadPool != null) expect(ARIA_COMMS[act.boss.squadPool], act.boss.squadPool).toBeDefined();
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

  it("looks acts and levels up by 1-based act and 0-based level", () => {
    expect(getAct(2).id).toBe(2);
    expect(getAct(0)).toBeUndefined();
    expect(getAct(ACTS.length + 1)).toBeUndefined();
    expect(getActLevel(1, 0)).toBe(ACTS[0].levels[0]);
    expect(getActLevel(1, ACTS[0].levels.length)).toBeUndefined();
    expect(isLastAct(4)).toBe(true);
    expect(isLastAct(3)).toBe(false);
    expect(totalActs()).toBe(4);
    expect(maxActLevels()).toBe(8);
  });
});

describe("Act I", () => {
  it("plays eight of the station maps, without the Nexus", () => {
    expect(ACTS[0].levels.map((l) => l.map)).toEqual([
      "entry", "checkpoint", "research", "containment", "server_farm", "reactor", "voss_lab", "core",
    ]);
  });

  it("is ARIA alone: no squad anywhere, not even at the boss (problem 4)", () => {
    for (const l of ACTS[0].levels) expect(l.squad).toEqual([]);
    expect(ACTS[0].boss.squadPool).toBeNull();
  });

  it("has its own ambient pool (act1Ambient used to be dead)", () => {
    expect(ACTS[0].ambient).toBe("act1Ambient");
  });

  it("keeps its Shield Commander rather than swapping it (problem 6)", () => {
    expect(ACTS[0].roster).toContain("shieldCommander");
    expect(ACTS[0].substitutes.shieldCommander).toBeUndefined();
  });
});

describe("the Gathering (Act II)", () => {
  const act = getAct(2);

  it("recruits Lyra, Rook, Nova, Kael, in that order", () => {
    expect(RECRUITS.map((r) => r.member)).toEqual(["lyra", "rook", "nova", "kael"]);
    const levels = RECRUITS.map((r) => r.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(new Set(levels).size).toBe(4);
  });

  it("has nobody present before they join, and presence never shrinks", () => {
    for (const [i, l] of act.levels.entries()) {
      for (const m of l.squad) expect(CAST.has(m), `2.${i}: ${m}`).toBe(true);
      const joined = RECRUITS.filter((r) => r.level <= i).map((r) => r.member);
      expect([...l.squad].sort(), `2.${i}`).toEqual([...joined].sort());
    }
  });

  it("stands on its own maps: six new and the Precinct", () => {
    expect(act.levels.map((l) => l.map)).toEqual([
      "evac_shafts", "salvage_deck", "maintenance_spine", "transit_loop", "greenhouse", "precinct", "foundry",
    ]);
  });

  it("keeps Lyra's name off the comms until the lift", () => {
    expect(act.levels[0].callsigns).toEqual({ lyra: "UNKNOWN" });
    for (const l of act.levels.slice(1)) expect(l.callsigns).toBeUndefined();
  });

  it("tells one recruit per chapter, each scene in its slot", () => {
    const slot = (key) => sceneSlots().find((s) => s.key === key);
    const order = [
      "gathering_extraction", "gathering_lyra", "gathering_rook", "gathering_rook_shard",
      "gathering_nova", "gathering_greenhouse", "hound_attack", "gathering_kael",
      "gathering_kael_joins", "hound_intro", "gathering_finale", "lyra_reveal",
    ];
    for (const k of order) expect(slot(k)?.act, k).toBe(2);
    const levels = order.map((k) => slot(k).level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
});

describe("Acts III and IV", () => {
  it("fields the whole squad through Act III", () => {
    for (const l of getAct(3).levels) expect([...l.squad].sort()).toEqual([...CAST].sort());
  });

  it("lets them go in Act IV in the reverse of the order they joined", () => {
    const iv = getAct(4).levels;
    const leaving = [];
    for (let i = 1; i < iv.length; i++) {
      for (const m of iv[i - 1].squad) if (!iv[i].squad.includes(m)) leaving.push(m);
      for (const m of iv[i].squad) expect(iv[i - 1].squad, `4.${i} gains ${m}`).toContain(m);
    }
    expect(leaving).toEqual(RECRUITS.map((r) => r.member).reverse());
    expect(iv.at(-1).squad).toEqual([]);
    expect(getAct(4).boss.squadPool).toBeNull();
  });

  it("stands Act III on its own maps: five remixes, the Archive and the Engine", () => {
    expect(getAct(3).levels.map((l) => l.map)).toEqual([
      "rewritten_wing", "server_siege", "reactor_overload", "lords_lab", "archive", "engine", "core_broken",
    ]);
    // Each map has its own look, turn and cover seed.
    expect(getAct(3).levels.map((l) => l.env)).toEqual(getAct(3).levels.map((l) => l.map));
    const seeds = getAct(3).levels.map((l) => l.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it("plays Act IV on its own seven maps, in the white-hot palette", () => {
    const iv = getAct(4);
    expect(iv.levels.map((l) => l.map)).toEqual([
      "entry_last", "the_loop", "containment_last", "nexus_decoy", "archive_burns", "engine_firing", "core_endgame",
    ]);
    expect(iv.palette).toBe(4);
    for (const l of iv.levels) expect(l.env).toBe(l.map);
    // No two Act IV slots share a seed and rotation with anything else.
    const keys = ACTS.flatMap((a) => a.levels).map((l) => `${l.map}|${l.seed}|${l.rotation}`);
    for (const l of iv.levels) expect(keys.filter((k) => k === `${l.map}|${l.seed}|${l.rotation}`)).toHaveLength(1);
  });

  it("leaves one parting gift per ally, in the level they stay behind in", () => {
    const iv = getAct(4).levels;
    const gifts = iv.map((l) => l.gifts ?? []);
    expect(gifts).toEqual([[], [], ["timeLock"], ["rewind"], ["dash"], ["foresight"], []]);
    // Each is given where its ally is last present.
    const giver = { timeLock: "kael", rewind: "nova", dash: "rook", foresight: "lyra" };
    iv.forEach((l, i) => {
      for (const g of l.gifts ?? []) {
        expect(l.squad, `4.${i}`).toContain(giver[g]);
        expect(iv[i + 1].squad, `4.${i + 1}`).not.toContain(giver[g]);
      }
    });
  });

  it("closes the Final Form on Eleven Seconds and the epilogue", () => {
    const iv = getAct(4);
    expect(iv.boss.card.subtitle).toMatch(/ELEVEN SECONDS/);
    expect(iv.outro).toEqual(["true_victory", "epilogue_message"]);
    expect(iv.levels.at(-1).onStart.map((l) => l.aria)).toContain("ariaStillHere");
  });
});

describe("NG+", () => {
  it("opens the true ending at NG+1 with all twelve fragments (spec decision 2)", async () => {
    const { earnsTrueEnding } = await import("../../src/data/campaign/acts.js");
    const { MEMORY_FRAGMENTS } = await import("../../src/data/memory-fragments.js");
    expect(MEMORY_FRAGMENTS).toHaveLength(NG_PLUS.fragments);
    expect(earnsTrueEnding(0, 12)).toBe(false);
    expect(earnsTrueEnding(1, 12)).toBe(true);
    expect(earnsTrueEnding(1, 11)).toBe(false);
    expect(earnsTrueEnding(3, 11)).toBe(false);
  });

  it("gives every echoed scene a script, a key, and an Act II original", async () => {
    const { sceneFor } = await import("../../src/data/campaign/acts.js");
    const act2 = new Set(sceneSlots().filter((s) => s.act === 2).map((s) => s.key));
    for (const [from, to] of Object.entries(NG_PLUS.scenes)) {
      expect(act2.has(from), from).toBe(true);
      expect(CUTSCENE_KEYS.has(to), to).toBe(true);
      expect(sceneFor(from, 0)).toBe(from);
      expect(sceneFor(from, 1)).toBe(to);
    }
    expect(sceneFor("true_victory", 2)).toBe("true_victory");
  });

  it("keeps a hook for NG+ levels of its own", () => {
    expect(NG_PLUS.extraLevels).toEqual({});
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

  it("lists each distinct campaign map once, every map in play", () => {
    const maps = campaignMaps();
    expect(new Set(maps).size).toBe(maps.length);
    // Act I's eight station maps. The old Temporal Nexus is out of play now
    // that Act IV has its own reworked Nexus and Act II its own Transit Loop.
    const station = ["entry", "checkpoint", "research", "containment", "server_farm", "reactor", "voss_lab", "core"];
    for (const id of station) expect(maps.map((m) => m.name), id).toContain(MAPS[id].name);
    // One prepared map per distinct (map, seed, rotation) the acts name.
    const distinct = new Set(ACTS.flatMap((a) => a.levels).map((l) => `${l.map}|${l.seed}|${l.rotation}`));
    expect(maps).toHaveLength(distinct.size);
    const names = maps.map((m) => m.name);
    expect(names).toContain("The Paradox Core");
    expect(names).toContain("The Paradox Core — Endgame");
  });

  it("places Act I's Shield Commander in Containment", () => {
    const containment = campaignLevelMap(1, 3);
    expect(containment.entities.some((e) => e.enemyType === "shieldCommander")).toBe(true);
  });
});
