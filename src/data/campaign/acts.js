/**
 * The campaign as data: one row per act, one entry per level.
 *
 * Nothing else in the code should assume how many acts there are or how many
 * levels an act has. CampaignManager, the spawner, squad comms, ARIA's idle
 * pools, unlocks and the playtest gate all read this table.
 *
 * Phase 1 of the story restructure (docs/superpowers/specs/
 * 2026-09-22-campaign-story-restructure-design.md) describes today's campaign
 * and nothing more: three acts that each replay the nine station maps, with
 * the act changing the briefings, roster, boss form and squad. Where today's
 * behaviour is a known bug the spec fixes later, the value is kept and the
 * comment says so. This module imports no maps, so light modules can read it;
 * src/data/levels/campaign.js turns a level entry into a playable map.
 *
 * Act fields:
 *   palette    ENV_PALETTES id for the base look
 *   roster     enemy types that belong in the act; anything else is swapped
 *   substitutes  type -> replacement for enemies outside the roster
 *   scale      health and damage multiplier for non-boss enemies
 *   boss       type replacing the map's "boss" placeholder, name card, ARIA
 *              line, and squad pool (ARIA_COMMS.bossPhase{N}Squad)
 *   ambient    ARIA idle pool for the act, or null
 *   intro      scenes played on entering the act from the one before
 *   outro      scenes played when the act's boss falls
 *
 * Level fields:
 *   map, env   MAPS id and LEVEL_ENVS id
 *   rotation   degrees the finished map is turned
 *   seed       cover-variation seed
 *   boss       the act's boss fight: it ends on the kill, not at an exit
 *   briefing   scenes played before the level, or null
 *   squad      members present for comms
 *   onStart    one-shot ARIA lines: { aria, delay, minNgPlus? }
 */

/** @typedef {"kael"|"nova"|"rook"|"lyra"} SquadMember */

/**
 * The nine station maps, in the order every act plays them. Rotations and
 * seeds are the values the maps have always been prepared with, so no tile
 * moves: the seed was 7919 + index * 104729.
 */
const STATION = [
  { map: "entry", rotation: 0 },
  { map: "checkpoint", rotation: 90 },
  { map: "research", rotation: 0 },
  { map: "containment", rotation: 0 },
  { map: "server_farm", rotation: 180 },
  { map: "reactor", rotation: 0 },
  { map: "voss_lab", rotation: 0 },
  { map: "nexus", rotation: 270 },
  { map: "core", rotation: 0, boss: true },
].map((s, i) => ({ boss: false, ...s, env: s.map, seed: 7919 + i * 104729 }));

/** NG+ runs hear the dead squad at the start of every act. */
const NG_PLUS_BARK = { aria: "ngPlusDeadSquad", delay: 5000, minNgPlus: 1 };

/**
 * One act's pass over the station maps.
 * @param {(string|null)[]} briefings - scene key per level
 * @param {(level: number) => SquadMember[]} squad
 * @param {Record<number, object[]>} [onStart] - extra lines by level
 */
function stationLevels(briefings, squad, onStart = {}) {
  return STATION.map((s, i) => ({
    ...s,
    briefing: briefings[i] ? [briefings[i]] : null,
    squad: squad(i),
    onStart: [...(onStart[i] || []), ...(i === 0 ? [NG_PLUS_BARK] : [])],
  }));
}

const FULL_SQUAD = ["kael", "nova", "rook", "lyra"];

export const ACTS = [
  {
    id: 1,
    title: "THE FALL",
    palette: 1,
    roster: ["drone", "glitchling", "phantom", "corruptCop", "sentinel"],
    substitutes: {
      henchman: "corruptCop",
      beast: "sentinel",
      phaseStalker: "phantom",
      chronoBomber: "phantom",
      temporalEngineer: "phantom",
      shieldCommander: "sentinel",
      riftLeaper: "phantom",
      timeWarden: "sentinel",
      temporalSummoner: "phantom",
      echoDrone: "drone",
    },
    scale: 1,
    boss: {
      type: "boss",
      card: { title: "PARADOX LORD", subtitle: "FIRST INCURSION" },
      aria: "bossEncounter",
      // The player is alone in Act I, yet the squad still chimes in at this
      // boss. Phase 2 sets this to null (spec problem 4).
      squadPool: 1,
    },
    // act1Ambient exists but has never played; phase 2 wires it.
    ambient: null,
    // A new campaign's prologue (flipbook, clocking in, intro, first memory)
    // is sequenced by CampaignManager.start, and NG+ by startNgPlus.
    intro: [],
    outro: ["false_victory"],
    levels: stationLevels(
      [
        null,
        "security_briefing",
        "research_briefing",
        "containment_briefing",
        "server_briefing",
        "reactor_briefing",
        "voss_lab_briefing",
        "nexus_briefing",
        "paradox_core_briefing",
      ],
      () => [],
    ),
  },
  {
    id: 2,
    title: "THE BONDS",
    palette: 2,
    roster: [
      "corruptCop",
      "henchman",
      "beast",
      "phaseStalker",
      "chronoBomber",
      "temporalEngineer",
      "shieldCommander",
    ],
    substitutes: {
      drone: "corruptCop",
      glitchling: "phaseStalker",
      phantom: "henchman",
      sentinel: "shieldCommander",
      riftLeaper: "phaseStalker",
      timeWarden: "shieldCommander",
      temporalSummoner: "temporalEngineer",
      echoDrone: "chronoBomber",
    },
    scale: 1.4,
    boss: {
      type: "boss_form2",
      card: { title: "PARADOX LORD", subtitle: "SECOND INCURSION" },
      aria: "bossForm2",
      squadPool: 2,
    },
    ambient: "act2Ambient",
    intro: ["act2_transition_fb", "act2_intro"],
    outro: ["act2_victory"],
    levels: stationLevels(
      [
        null,
        "act2_level2",
        "act2_level3",
        "act2_level4",
        "act2_level5",
        "act2_level6",
        "voss_confrontation",
        "act2_level8",
        "act2_level9",
      ],
      // Lyra is revealed in act2_level2, the briefing before level 1.
      (i) => (i >= 1 ? [...FULL_SQUAD] : ["kael", "nova", "rook"]),
    ),
  },
  {
    id: 3,
    title: "THE SACRIFICE",
    palette: 3,
    roster: [
      "beast",
      "riftLeaper",
      "timeWarden",
      "temporalSummoner",
      "echoDrone",
      "sentinel",
      "phaseStalker",
    ],
    substitutes: {
      drone: "echoDrone",
      glitchling: "phaseStalker",
      corruptCop: "sentinel",
      phantom: "riftLeaper",
      henchman: "riftLeaper",
      chronoBomber: "temporalSummoner",
      temporalEngineer: "temporalSummoner",
      shieldCommander: "timeWarden",
    },
    scale: 1.8,
    boss: {
      type: "boss_form3",
      card: { title: "PARADOX LORD", subtitle: "FINAL INCURSION" },
      aria: "bossForm3",
      squadPool: 3,
    },
    ambient: "act3Ambient",
    intro: ["act3_transition_fb", "lyra_reveal", "act3_intro"],
    outro: ["true_victory"],
    levels: stationLevels(
      [
        null,
        "act3_level2",
        "act3_boss",
        "act3_level4",
        "act3_level5",
        "act3_level6",
        "origin_panels",
        "act3_level8",
        "act3_level9",
      ],
      () => [...FULL_SQUAD],
      {
        0: [{ aria: "encryptedChannelReveal", delay: 3000 }],
        1: [{ aria: "analystLMReveal", delay: 3000 }],
      },
    ),
  },
];

/**
 * New Game+: where a cycle starts, and the cycle whose final victory plays
 * the true ending instead of offering another loop.
 */
export const NG_PLUS = {
  startAct: 1,
  startLevel: 0,
  trueEndingCycle: 3,
  trueEnding: ["ng_plus_true_ending"],
};

/** @param {number} id - 1-based act number */
export function getAct(id) {
  return ACTS.find((a) => a.id === id);
}

/** @param {number} act - 1-based act number @param {number} level - 0-based */
export function getActLevel(act, level) {
  return getAct(act)?.levels[level];
}

export function isLastAct(id) {
  return ACTS[ACTS.length - 1].id === id;
}

export function totalActs() {
  return ACTS.length;
}

/** The most levels any one act has. */
export function maxActLevels() {
  return Math.max(...ACTS.map((a) => a.levels.length));
}

/** Index of the act's boss level, or -1. */
export function bossLevelIndex(act) {
  return getAct(act)?.levels.findIndex((l) => l.boss) ?? -1;
}
