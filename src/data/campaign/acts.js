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
 *   resonance  whether shifting is loud (Resonance, hunters): off in Act I,
 *              where the suit's governor is still on
 *   hunters    enemy types a hunter response drops through the rift
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
 *   grants     Chronos powers that are yours from the start of this level
 *              (src/systems/chrono-powers.js powersFor adds up every grant
 *              before a slot, so a loaded save has exactly the powers its
 *              position implies)
 *   setPiece   SET_PIECES id (src/data/campaign/set-pieces.js): the level's
 *              hazards, seals and teach room, laid over its map
 *   gifts      Act IV: powers whose ally stays behind in this level and
 *              leaves a last upgrade to it (chrono-powers.js giftsFor; only an
 *              ally who was actually recruited can leave one)
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
 * One level: on a station map (its own, or standing in for one not built
 * yet), or on an act's own map, which names its seed and, for a finale, the
 * boss flag. An own map's env is its id and it is played as authored.
 * @param {string} map - STATION id, or a MAPS id
 * @param {string[]|null} briefing
 * @param {SquadMember[]} squad
 * @param {{ onStart?: object[], callsigns?: Record<string, string>,
 *   grants?: string[], setPiece?: string, seed?: number, boss?: boolean }} [extra]
 */
function level(map, briefing, squad, { onStart = [], callsigns = null, grants = [], setPiece = null, seed = 0, boss = false } = {}) {
  return {
    ...(STATION[map] ?? { map, env: map, rotation: 0, seed, boss }),
    briefing,
    squad,
    ...(callsigns ? { callsigns } : {}),
    onStart,
    grants,
    ...(setPiece ? { setPiece } : {}),
  };
}

/**
 * One level on a map of its own rather than a station map: the rotation,
 * seed and boss flag are the entry's, and its env shares the map's id.
 * @param {string} map - MAPS id
 * @param {{ rotation?: number, seed: number, boss?: boolean }} at
 * @param {string[]|null} briefing
 * @param {SquadMember[]} squad
 * @param {{ onStart?: object[], grants?: string[], gifts?: string[],
 *   setPiece?: string }} [extra]
 */
function own(map, { rotation = 0, seed, boss = false }, briefing, squad, { onStart = [], grants = [], gifts = [], setPiece = null } = {}) {
  return {
    map,
    env: map,
    rotation,
    seed,
    boss,
    briefing,
    squad,
    onStart,
    grants,
    ...(gifts.length ? { gifts } : {}),
    ...(setPiece ? { setPiece } : {}),
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
    resonance: false,
    hunters: [],
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
      // The optional Vent Gallery: the one set piece before the governor burns.
      level("reactor", ["reactor_briefing"], [], { setPiece: "vent_gallery" }),
      level("voss_lab", ["voss_lab_briefing"], []),
      level("core", ["paradox_core_briefing"], []),
    ]),
  },
  {
    id: 2,
    title: "THE GATHERING",
    palette: 2,
    // Spec §7's roster, plus what its levels name: II-1's Act I leftovers
    // (glitchlings, phantoms), the Precinct's sentinels and the Foundry's
    // rift leapers and echo drones.
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
      "glitchling",
      "phantom",
      "sentinel",
      "riftLeaper",
      "echoDrone",
    ],
    substitutes: {
      timeWarden: "temporalEngineer",
    },
    scale: 1.2,
    boss: {
      type: "hound",
      card: { title: "THE HOUND", subtitle: "SUIT C-0016. NOBODY INSIDE." },
      aria: "bossHound",
      squadPool: "houndSquad",
    },
    ambient: "gatheringAmbient",
    resonance: true,
    hunters: ["riftLeaper", "echoDrone"],
    intro: ["act2_transition_fb", "gathering_extraction"],
    outro: ["gathering_finale", "lyra_reveal"],
    // Its own maps (src/data/levels/act2-maps.js): six new, and the Precinct,
    // a remix of the tutorial station.
    levels: levels([
      // Evac Shafts. Lyra guides you out before she has a name.
      level("evac_shafts", null, ["lyra"], { callsigns: { lyra: "UNKNOWN" }, setPiece: "evac_shafts", seed: 20101 }),
      // Salvage Deck. Lyra names herself in the lift, so the old Act 3
      // Analyst L.M. and encrypted-channel barks are retired.
      // Lyra's Foresight is loaded in the lift, and taught in the first hall.
      level("salvage_deck", ["gathering_lyra", "gathering_rook"], ["lyra"], {
        grants: ["foresight"],
        setPiece: "salvage_foresight",
        seed: 20203,
      }),
      // Maintenance Spine.
      // Rook tunes the shard before the level: Chrono Dash and a quieter shift.
      level("maintenance_spine", ["gathering_rook_shard", "the_hunt_begins"], ["lyra", "rook"], {
        grants: ["dash"],
        setPiece: "spine_fans",
        seed: 20305,
      }),
      // Transit Loop.
      level("transit_loop", ["gathering_nova"], ["lyra", "rook"], { setPiece: "transit_crossings", seed: 20407 }),
      // The Greenhouse.
      level("greenhouse", ["gathering_greenhouse"], ["lyra", "rook", "nova"], { setPiece: "greenhouse_stasis", seed: 20509 }),
      // The Precinct.
      // Nova's rewind came back with her after the Hound; the Precinct's
      // sentry teaches it.
      level("precinct", ["hound_attack", "gathering_kael"], ["lyra", "rook", "nova"], {
        grants: ["rewind"],
        setPiece: "precinct_rewind",
        seed: 20611,
      }),
      // The Foundry, the Hound's den.
      // Kael's shield, wired into the shard, meets the Foundry's sentry line.
      level("foundry", ["gathering_kael_joins", "hound_intro"], [...ALL], {
        grants: ["timeLock"],
        setPiece: "foundry_lock",
        seed: 20713,
        boss: true,
      }),
    ]),
  },
  {
    id: 3,
    title: "THE HUNT",
    palette: 3,
    // Today's Act 2 roster plus wardens, and the types the Act III levels
    // name in the spec (phase 5): summoners (III-3, III-4), phantoms (III-4),
    // echo drones and rift leapers (III-5), sentinels (III-6).
    roster: [
      "corruptCop",
      "henchman",
      "beast",
      "phaseStalker",
      "chronoBomber",
      "temporalEngineer",
      "shieldCommander",
      "timeWarden",
      "temporalSummoner",
      "phantom",
      "echoDrone",
      "riftLeaper",
      "sentinel",
    ],
    substitutes: {
      drone: "corruptCop",
      glitchling: "phaseStalker",
    },
    scale: 1.4,
    boss: {
      type: "boss_form2",
      card: { title: "PARADOX LORD", subtitle: "SECOND INCURSION" },
      aria: "bossForm2",
      squadPool: "bossPhase2Squad",
    },
    ambient: "act2Ambient",
    resonance: true,
    hunters: ["riftLeaper", "echoDrone", "timeWarden"],
    intro: ["hunt_transition_fb", "hunt_intro", "act2_level2"],
    outro: ["act2_victory"],
    // Act III's own maps (src/data/levels/act3-maps.js): five remixes of the
    // Act I places they rewrite, and the Archive and the Engine. Each entry
    // is built on its source station map's entry and then names its own map,
    // env, turn and seed.
    levels: levels([
      // III-1 The Rewritten Wing: Checkpoint and Research, merged. Lyra leads.
      { ...level("checkpoint", null, [...ALL], { setPiece: "rewritten_walls" }),
        map: "rewritten_wing", env: "rewritten_wing", rotation: 270, seed: 31001 },
      // III-2 Server Farm Siege: burn the racks. Rook leads.
      { ...level("server_farm", ["act2_level5"], [...ALL], { setPiece: "rack_burn" }),
        map: "server_siege", env: "server_siege", rotation: 90, seed: 31002 },
      // III-3 Reactor Overload: valves against the heat clock. Kael leads.
      { ...level("reactor", ["act2_level6"], [...ALL], { setPiece: "coolant_valves" }),
        map: "reactor_overload", env: "reactor_overload", rotation: 180, seed: 31003 },
      // III-4 The Lord's Laboratory: the one surviving take.
      { ...level("voss_lab", ["act2_level7", "voss_confrontation", "act2_level3"], [...ALL], { setPiece: "surviving_take" }),
        map: "lords_lab", env: "lords_lab", rotation: 0, seed: 31004 },
      // III-5 The Archive of Rewinds (new).
      { ...level("research", ["archive_briefing"], [...ALL], { setPiece: "archive_takes" }),
        map: "archive", env: "archive", rotation: 0, seed: 31005 },
      // III-6 The Chronos Engine (new).
      { ...level("nexus", ["engine_briefing"], [...ALL], { setPiece: "engine_stasis" }),
        map: "engine", env: "engine", rotation: 90, seed: 31006 },
      // III-7 The Paradox Core, second visit: broken rings, Form 2.
      { ...level("core", ["level3_briefing", "act2_level9"], [...ALL]),
        map: "core_broken", env: "core_broken", rotation: 0, seed: 31007 },
    ]),
  },
  {
    id: 4,
    title: "THE SACRIFICE",
    // The white-hot rift light bleaching the Act III violet.
    palette: 4,
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
      card: { title: "PARADOX LORD", subtitle: "FINAL FORM · ELEVEN SECONDS" },
      aria: "bossForm3",
      // You walk in alone.
      squadPool: null,
    },
    ambient: "act3Ambient",
    resonance: true,
    hunters: ["riftLeaper", "echoDrone", "timeWarden"],
    intro: ["act3_transition_fb", "act3_intro", "act3_level2"],
    // The ending, then Lyra, weeks later, closing the reactor channel.
    outro: ["true_victory", "epilogue_message"],
    // Act IV's own maps (src/data/levels/act4-maps.js). They stay behind in
    // the reverse of the order they joined, and each leaves a last upgrade
    // to their power in the briefing of the level they stay in (`gifts`).
    levels: levels([
      // Entry — Last Time: the airlock where it began, running east now.
      own("entry_last", { rotation: 90, seed: 3137 }, null, [...ALL], { setPiece: "entry_falls" }),
      // The Loop: "one wing at a time". Rewind through the seam.
      own("the_loop", { rotation: 180, seed: 3251 }, ["act3_boss"], [...ALL], { setPiece: "the_loop" }),
      // Containment — Last Stand: Kael holds the doors. "Take the rest of it."
      own("containment_last", { rotation: 90, seed: 3373 }, ["act3_level4"], [...ALL], {
        setPiece: "last_stand",
        gifts: ["timeLock"],
      }),
      // Temporal Nexus — The Decoy: Nova runs toward them.
      own("nexus_decoy", { rotation: 0, seed: 3491 }, ["nexus_briefing", "act2_level8", "nova_decoy"], ["lyra", "rook", "nova"], {
        setPiece: "nova_decoy",
        gifts: ["rewind"],
      }),
      // The Archive Burns: Rook stays to blow it, and hands you Kai's anchor.
      own("archive_burns", { rotation: 0, seed: 3613 }, ["act3_level5"], ["lyra", "rook"], {
        setPiece: "archive_fire",
        gifts: ["dash"],
      }),
      // The Engine — Firing: Lyra pulls the trigger, and records one line.
      own("engine_firing", { rotation: 180, seed: 3739 }, ["act3_level6", "act3_level8"], ["lyra"], {
        setPiece: "engine_countdown",
        gifts: ["foresight"],
      }),
      // The Paradox Core — Endgame: you, alone. ARIA is the last voice left.
      own("core_endgame", { rotation: 0, seed: 3863, boss: true }, ["act3_level7", "act3_level9"], [], {
        onStart: [{ aria: "ariaStillHere", delay: 9000 }],
      }),
    ]),
  },
];

/**
 * New Game+: where a cycle starts, and what earns the true ending.
 *
 * Spec decision 2: finishing any NG+ cycle (from `trueEndingCycle` on) with
 * all `fragments` memory fragments plays the true ending instead of offering
 * another loop. Without them the loop goes round again, as NG+2 and NG+3
 * always did.
 *
 * `scenes` are the déjà-vu versions of the Gathering (spec decision 10): in
 * NG+ the allies half-remember you, their lines change, and Nova is
 * recruited out of order, pulling you out of the Core before she has ever
 * met you. Every scene is played through `sceneFor`, so a key without a
 * variant plays as written.
 *
 * `extraLevels` is the hook for NG+ levels of their own (decision 2, "NG+
 * adds extra levels rather than only replaying"): act id -> level entries,
 * shaped like any other, to be inserted for cycles >= 1. Nothing reads it
 * yet; it is here so they arrive as data.
 */
export const NG_PLUS = {
  startAct: 1,
  startLevel: 0,
  trueEndingCycle: 1,
  fragments: 12,
  trueEnding: ["ng_plus_true_ending"],
  scenes: {
    gathering_extraction: "gathering_extraction_echo",
    gathering_lyra: "gathering_lyra_echo",
    gathering_rook: "gathering_rook_echo",
    gathering_nova: "gathering_nova_echo",
    hound_attack: "hound_attack_echo",
    gathering_kael: "gathering_kael_echo",
  },
  extraLevels: {},
};

/** The scene to play for `key` in NG+ cycle `ngPlus`: its echo, or itself. */
export function sceneFor(key, ngPlus = 0) {
  return (ngPlus > 0 && NG_PLUS.scenes[key]) || key;
}

/**
 * Does finishing the last act now play the true ending? Every fragment,
 * from the gate cycle on.
 */
export function earnsTrueEnding(ngPlus, fragmentsFound) {
  return ngPlus >= NG_PLUS.trueEndingCycle && fragmentsFound >= NG_PLUS.fragments;
}

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
