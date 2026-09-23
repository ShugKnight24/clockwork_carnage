/**
 * The campaign as data: one row per act, one entry per level.
 *
 * Nothing else in the code should assume how many acts there are or how many
 * levels an act has. CampaignManager, the spawner, squad comms, ARIA's idle
 * pools, unlocks and the playtest gate all read this table.
 *
 * Phase 2 of the story restructure (docs/superpowers/specs/
 * 2026-09-22-campaign-story-restructure-design.md, §16.2): four acts, 29
 * levels. Act I plays eight of the nine station maps. Acts II-IV stand on
 * placeholder maps until their own are built, so each placeholder keeps the
 * station map's seed and rotation; only the story, roster and squad are the
 * act's. This module imports no maps, so light modules can read it;
 * src/data/levels/campaign.js turns a level entry into a playable map.
 *
 * Act fields:
 *   palette    ENV_PALETTES id for the base look
 *   roster     enemy types that belong in the act; anything else is swapped
 *   substitutes  type -> replacement for enemies outside the roster
 *   scale      health and damage multiplier for non-boss enemies
 *   boss       type replacing the map's "boss" placeholder, name card, ARIA
 *              line, and the ARIA_COMMS pool the squad reacts from (or null)
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
 *   squad      members present for comms, and in the party art of the
 *              scenes played in this slot
 *   callsigns  member -> comms label, for someone present but not yet named
 *   onStart    one-shot ARIA lines: { aria, delay, minNgPlus? }
 */

/** @typedef {"kael"|"nova"|"rook"|"lyra"} SquadMember */

/**
 * The nine station maps, keyed by id. Rotations and seeds are the values the
 * maps have always been prepared with, so no tile moves: the seed was
 * 7919 + index * 104729 in the order Act I used to play them.
 */
const STATION = Object.fromEntries(
  [
    { map: "entry", rotation: 0 },
    { map: "checkpoint", rotation: 90 },
    { map: "research", rotation: 0 },
    { map: "containment", rotation: 0 },
    { map: "server_farm", rotation: 180 },
    { map: "reactor", rotation: 0 },
    { map: "voss_lab", rotation: 0 },
    { map: "nexus", rotation: 270 },
    { map: "core", rotation: 0, boss: true },
  ].map((s, i) => [s.map, { boss: false, ...s, env: s.map, seed: 7919 + i * 104729 }]),
);

/** NG+ runs hear the dead squad at the start of every act. */
const NG_PLUS_BARK = { aria: "ngPlusDeadSquad", delay: 5000, minNgPlus: 1 };

/**
 * One level on a station map (its own, or standing in for one not built yet).
 * @param {string} map - STATION id
 * @param {string[]|null} briefing
 * @param {SquadMember[]} squad
 * @param {{ onStart?: object[], callsigns?: Record<string, string> }} [extra]
 */
function level(map, briefing, squad, { onStart = [], callsigns = null } = {}) {
  return {
    ...STATION[map],
    briefing,
    squad,
    ...(callsigns ? { callsigns } : {}),
    onStart,
  };
}

/** The first level of every act carries the NG+ bark. */
function levels(list) {
  list[0].onStart = [...list[0].onStart, NG_PLUS_BARK];
  return list;
}

/**
 * Who joins, in order, and the Act II level (0-based) where they are first
 * present. Act IV lets them go in the reverse order: the last to join is the
 * first to stay behind.
 */
export const RECRUITS = [
  { member: "lyra", act: 2, level: 0 },
  { member: "rook", act: 2, level: 2 },
  { member: "nova", act: 2, level: 4 },
  { member: "kael", act: 2, level: 6 },
];

const ALL = ["lyra", "rook", "nova", "kael"];

export const ACTS = [
  {
    id: 1,
    title: "THE FALL",
    palette: 1,
    roster: [
      "drone",
      "glitchling",
      "phantom",
      "corruptCop",
      "sentinel",
      "shieldCommander",
      "temporalSummoner",
    ],
    substitutes: {
      henchman: "corruptCop",
      beast: "sentinel",
      phaseStalker: "phantom",
      chronoBomber: "phantom",
      temporalEngineer: "phantom",
      riftLeaper: "phantom",
      timeWarden: "sentinel",
      echoDrone: "drone",
    },
    scale: 1,
    boss: {
      type: "boss",
      card: { title: "PARADOX LORD", subtitle: "FIRST INCURSION" },
      aria: "bossEncounter",
      // Alone: ARIA only (spec problem 4).
      squadPool: null,
    },
    ambient: "act1Ambient",
    // A new campaign's prologue (flipbook, clocking in, intro, first memory)
    // is sequenced by CampaignManager.start, and NG+ by startNgPlus.
    intro: [],
    outro: ["false_victory"],
    // The Temporal Nexus moved to Act IV (spec decision 8).
    levels: levels([
      level("entry", null, []),
      level("checkpoint", ["security_briefing"], []),
      level("research", ["research_briefing"], []),
      level("containment", ["containment_briefing"], []),
      level("server_farm", ["server_briefing"], []),
      level("reactor", ["reactor_briefing"], []),
      level("voss_lab", ["voss_lab_briefing"], []),
      level("core", ["paradox_core_briefing"], []),
    ]),
  },
  {
    id: 2,
    title: "THE GATHERING",
    palette: 2,
    roster: [
      "henchman",
      "corruptCop",
      "drone",
      "phaseStalker",
      "chronoBomber",
      "temporalEngineer",
      "beast",
      "shieldCommander",
      "temporalSummoner",
    ],
    substitutes: {
      glitchling: "phaseStalker",
      phantom: "henchman",
      sentinel: "corruptCop",
      riftLeaper: "phaseStalker",
      timeWarden: "temporalEngineer",
      echoDrone: "drone",
    },
    scale: 1.2,
    boss: {
      type: "hound",
      card: { title: "THE HOUND", subtitle: "SUIT C-0016. NOBODY INSIDE." },
      aria: "bossHound",
      squadPool: "houndSquad",
    },
    ambient: "gatheringAmbient",
    intro: ["act2_transition_fb", "gathering_extraction"],
    outro: ["gathering_finale", "lyra_reveal"],
    // Placeholder maps per spec §16.2 until the Act II maps are built.
    levels: levels([
      // Evac Shafts. Lyra guides you out before she has a name.
      level("reactor", null, ["lyra"], { callsigns: { lyra: "UNKNOWN" } }),
      // Salvage Deck. Lyra names herself in the lift, so the old Act 3
      // Analyst L.M. and encrypted-channel barks are retired.
      level("containment", ["gathering_lyra", "gathering_rook"], ["lyra"]),
      // Maintenance Spine.
      level("server_farm", ["gathering_rook_shard", "the_hunt_begins"], ["lyra", "rook"]),
      // Transit Loop.
      level("nexus", ["gathering_nova"], ["lyra", "rook"]),
      // The Greenhouse.
      level("research", ["gathering_greenhouse"], ["lyra", "rook", "nova"]),
      // The Precinct.
      level("checkpoint", ["hound_attack", "gathering_kael"], ["lyra", "rook", "nova"]),
      // The Foundry, with the Hound in the Core's boss slot.
      level("core", ["gathering_kael_joins", "hound_intro"], [...ALL]),
    ]),
  },
  {
    id: 3,
    title: "THE HUNT",
    palette: 3,
    roster: [
      "corruptCop",
      "henchman",
      "beast",
      "phaseStalker",
      "chronoBomber",
      "temporalEngineer",
      "shieldCommander",
      "timeWarden",
    ],
    substitutes: {
      drone: "corruptCop",
      glitchling: "phaseStalker",
      phantom: "henchman",
      sentinel: "shieldCommander",
      riftLeaper: "phaseStalker",
      temporalSummoner: "temporalEngineer",
      echoDrone: "chronoBomber",
    },
    scale: 1.4,
    boss: {
      type: "boss_form2",
      card: { title: "PARADOX LORD", subtitle: "SECOND INCURSION" },
      aria: "bossForm2",
      squadPool: "bossPhase2Squad",
    },
    ambient: "act2Ambient",
    intro: ["hunt_transition_fb", "hunt_intro", "act2_level2"],
    outro: ["act2_victory"],
    // Each level stands on the station map its remix will start from; the
    // Archive and the Engine borrow Research and the Nexus.
    levels: levels([
      level("checkpoint", null, [...ALL]),
      level("server_farm", ["act2_level5"], [...ALL]),
      level("reactor", ["act2_level6"], [...ALL]),
      level("voss_lab", ["act2_level7", "voss_confrontation", "act2_level3"], [...ALL]),
      level("research", ["archive_briefing"], [...ALL]),
      level("nexus", ["engine_briefing"], [...ALL]),
      level("core", ["level3_briefing", "act2_level9"], [...ALL]),
    ]),
  },
  {
    id: 4,
    title: "THE SACRIFICE",
    // Palette 4 (the white-hot rift) comes with the Act IV maps.
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
      // You walk in alone.
      squadPool: null,
    },
    ambient: "act3Ambient",
    intro: ["act3_transition_fb", "act3_intro", "act3_level2"],
    outro: ["true_victory"],
    // They stay behind in the reverse of the order they joined.
    levels: levels([
      level("entry", null, [...ALL]),
      // The Loop has no source map; the Server Farm's aisles repeat.
      level("server_farm", ["act3_boss"], [...ALL]),
      level("containment", ["act3_level4"], [...ALL]),
      level("nexus", ["nexus_briefing", "act2_level8", "nova_decoy"], ["lyra", "rook", "nova"]),
      level("research", ["act3_level5"], ["lyra", "rook"]),
      level("nexus", ["act3_level6", "act3_level8"], ["lyra"]),
      level("core", ["act3_level7", "act3_level9"], []),
    ]),
  },
];

/**
 * New Game+: where a cycle starts, and the cycle whose final victory plays
 * the true ending instead of offering another loop. The spec moves the true
 * ending to NG+1 with every fragment once the Act IV fragments exist.
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

/** Levels in every act before this one: level L of act A is campaign level levelsBefore(A) + L. */
export function levelsBefore(act) {
  return ACTS.filter((a) => a.id < act).reduce((n, a) => n + a.levels.length, 0);
}

/** Levels in the whole campaign. */
export function totalLevels() {
  return levelsBefore(Infinity);
}

/** Index of the act's boss level, or -1. */
export function bossLevelIndex(act) {
  return getAct(act)?.levels.findIndex((l) => l.boss) ?? -1;
}

/**
 * Where each scene the table names plays: `{ key, act, level }`, with the
 * level whose squad is present while it plays. A briefing plays in its own
 * slot; an act's intro at its first level; its outro at its boss level.
 */
export function sceneSlots() {
  const out = [];
  for (const act of ACTS) {
    for (const key of act.intro) out.push({ key, act: act.id, level: 0 });
    act.levels.forEach((l, i) => {
      for (const key of l.briefing ?? []) out.push({ key, act: act.id, level: i });
    });
    const boss = act.levels.findIndex((l) => l.boss);
    for (const key of act.outro) out.push({ key, act: act.id, level: boss });
  }
  return out;
}
