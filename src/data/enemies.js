// Enemy definitions
// TODO: Add more enemy types with unique behaviors (e.g. teleporting, summoning minions, etc.)
// TODO: Add different variants of the same enemy type with different stats /colors unique designs for later levels?
//
// hitZones schema: optional per-enemy table of weak/tough spots. Each zone:
//   { name, top, bottom, mult, tight?: bool, frontOnly?: bool, rearOnly?: bool }
//   - top/bottom: world-units relative to enemy feet (0 = ground), so a 1u-tall
//     enemy with `head` at top: 0.95 / bottom: 0.75 covers the head region.
//   - mult: damage multiplier (e.g. 2.5 = headshot, 0.7 = legs, 0.4 = armor).
//   - tight: zone uses HEADSHOT_PRECISION_PAD instead of body angular pad (less
//     forgiving). Default false.
//   - frontOnly/rearOnly: zone only applies when bullet hits from that arc
//     relative to enemy.angle. Used for armor plates / weak backs.
//
// First zone matched (top→bottom order) wins. Fallback = "body" with mult 1.
//
// `flying: true` marks a def whose renderer draws it off the ground (the drone
// spheres hover and bob). In a voxel level VoxelAISystem keeps a flyer at its
// spawn altitude instead of walking it along the floor; everything without the
// flag falls, walks and steps up like the player. The raycast levels ignore it.
//
// Defaults provided for ranged-class enemies (head + body); melee/swarm use a
// looser body-only profile so headshots aren't over-rewarded vs glass cannons.
const HUMANOID_ZONES = [
  { name: "head", top: 1.05, bottom: 0.85, mult: 2.5, tight: true },
  { name: "legs", top: 0.45, bottom: 0.0,  mult: 0.7 },
];
const ROBOT_ZONES = [
  { name: "head", top: 1.05, bottom: 0.85, mult: 2.5, tight: true },
  { name: "core", top: 0.75, bottom: 0.55, mult: 2.5 },
  { name: "legs", top: 0.40, bottom: 0.0,  mult: 0.7 },
];
// A shield bearer (Sentinel, Shield Commander, Time Warden): from the front
// the plate covers it from the knees to the shoulders, and a head shot
// only grazes through the visor slit (`visor`, a fraction of a head shot,
// not cut by the shield). From the side or behind, the head and the power
// core on its back are the weak points, so getting round it is the fast
// answer and a good aim from the front the slow one.
const SHIELDED_FRONT_ZONES = [
  { name: "head",  top: 1.05, bottom: 0.85, mult: 2.5, tight: true, rearOnly: true },
  { name: "visor", top: 1.05, bottom: 0.85, mult: 1.3, tight: true, frontOnly: true },
  { name: "armor", top: 0.85, bottom: 0.30, mult: 0.4, frontOnly: true },
  { name: "core",  top: 0.85, bottom: 0.45, mult: 1.8, rearOnly: true },
  { name: "legs",  top: 0.30, bottom: 0.0,  mult: 0.9 },
];
const BOSS_ZONES = [
  { name: "head", top: 1.20, bottom: 0.95, mult: 2.5, tight: true },
  { name: "core", top: 0.90, bottom: 0.55, mult: 2.5 },
  { name: "legs", top: 0.40, bottom: 0.0,  mult: 0.7 },
];
// The Shell (Form 1) stands far taller than the others, and most of the top
// of it is carapace: armour, worth little. Under it a small head, and the
// clock-core in the belly plate, a big target. On a grid level the zones are
// stretched over the figure as drawn, so these are fractions of its height.
const SHELL_ZONES = [
  { name: "shell", top: 1.20, bottom: 0.98, mult: 0.6 },
  { name: "head",  top: 0.97, bottom: 0.80, mult: 2.5, tight: true },
  { name: "core",  top: 0.72, bottom: 0.50, mult: 2.5 },
  { name: "legs",  top: 0.32, bottom: 0.0,  mult: 0.7 },
];
// The Final Form is a thin man under a crown of spires: a head, and nothing
// soft to aim for.
const REMAINDER_ZONES = [
  { name: "crown", top: 1.20, bottom: 1.07, mult: 1 },
  { name: "head",  top: 1.06, bottom: 0.92, mult: 2.5, tight: true },
  { name: "legs",  top: 0.50, bottom: 0.0,  mult: 0.7 },
];

export const ENEMY_TYPES = {
  drone: {
    name: "Glitched Drone",
    health: 30,
    speed: 1.5,
    damage: 8,
    attackRate: 1000,
    attackRange: 8,
    sightRange: 12,
    radius: 0.3,
    score: 100,
    color1: "#00ccff",
    color2: "#004466",
    xp: 10,
    attackType: "ranged",
    ai: "strafe_fire", // Orbits player while firing
    flying: true,
    chronoMultiplier: 0.0, // Drones fully freeze during Chrono Shift
    hitZones: ROBOT_ZONES,
  },
  phantom: {
    name: "Time Phantom",
    health: 60,
    speed: 2.0,
    // Its rifle only harasses (~6/s); the threat is the blink-in strike.
    damage: 8,
    attackRate: 1400,
    attackRange: 10,
    sightRange: 16,
    radius: 0.35,
    score: 250,
    color1: "#cc44ff",
    color2: "#440066",
    xp: 25,
    attackType: "ranged",
    ai: "flanker",
    teleportCooldown: 4000, // Blink/teleport to reposition
    // From beyond minDist cells it blinks in 1.5 cells away and winds up a
    // strike (damage × damageMul) that lands only within reach. 0.75 s to
    // step out of; a shift (0.5) makes it 1.5 s. The first blink comes
    // firstAfterMs after it engages, then one per teleportCooldown.
    blinkStrike: { minDist: 3.5, windupMs: 750, damageMul: 3, reach: 2.2, firstAfterMs: 1500 },
    chronoMultiplier: 0.5, // Phantoms resist slowdown: half speed while you shift (the world runs at 0.3)
    hitZones: HUMANOID_ZONES,
  },
  beast: {
    name: "Chrono Beast",
    health: 120,
    speed: 1.2,
    damage: 25,
    attackRate: 1500,
    attackRange: 3,
    sightRange: 14,
    radius: 0.45,
    score: 500,
    color1: "#ff4400",
    color2: "#661100",
    xp: 50,
    attackType: "melee",
    attackWindupMs: 450,
    ai: "ambush",
    chargeCooldown: 5, // seconds between charges (ai.js counts it down in dt)
    chargeWindup: 0.6, // seconds to telegraph before sprint
    chargeDuration: 0.9, // seconds of sprint
    chargeSpeedMul: 3.0, // speed multiplier during charge
    chargeDamageMul: 1.5, // damage multiplier on charge impact
    chronoMultiplier: 1.5, // Beasts accelerate when time warps: 1.5× real time while you shift
    // Beasts are quadrupedal — head is forward/low, no separate leg zone.
    hitZones: [
      { name: "head", top: 0.85, bottom: 0.65, mult: 2.5, tight: true },
      { name: "core", top: 0.65, bottom: 0.30, mult: 1.4 },
    ],
  },
  // The Paradox Lord's forms, built to mislead (src/systems/paradox-forms.js
  // has their attacks and lines, svg-art/models/villain.js their looks).
  // Form 1, the Shell: towering, loud and slow, with every attack a long way
  // off; it cracks at half health, then takes double damage and goes down fast.
  boss: {
    name: "Paradox Lord",
    health: 1500,
    speed: 0.75,
    // A long fight (its carapace, below), so each hit is lighter than a
    // three-round boss's was: 30 every 1.5 s became 10 every 2.1 s.
    damage: 10,
    attackRate: 2100,
    attackRange: 15,
    sightRange: 30,
    radius: 0.7,
    score: 5000,
    color1: "#22e6ff",
    color2: "#0a2a44",
    xp: 200,
    attackType: "ranged",
    attackWindupMs: 700,
    projectileSpeed: 5,
    ai: "behemoth",
    form: 1,
    // A campaign boss: isBossEnemy reads this rather than a list of names.
    boss: true,
    // Your shift slows it like the world (0.3): it helps, it does not end
    // the fight. (chronoMultiplier is the enemy's rate against real time
    // while you shift; the default 0.15 would all but stop it.)
    chronoMultiplier: 0.3,
    // The carapace, until it cracks at half health: a fifth of every hit,
    // and no round more than 40, so a sniper bolt glances off (combat.js).
    // Stuck after a charge into a wall, the core takes full damage (still
    // capped). Cracked, the casing is gone: the core takes full damage, no
    // round more than crackedCap, and darts aside (paradox-forms.js).
    armor: { mul: 0.2, cap: 40, crackedCap: 18 },
    hitZones: SHELL_ZONES,
  },
  // Form 2, the Brute: no casing, all muscle, and genuinely stronger. He
  // closes and keeps up the pressure; each pounce chain ends in a recovery.
  boss_form2: {
    name: "Paradox Lord — Evolved",
    health: 1800,
    speed: 2.0,
    damage: 38,
    attackRate: 850,
    attackRange: 14,
    sightRange: 30,
    radius: 0.6,
    score: 10000,
    color1: "#ff2a4a",
    color2: "#660033",
    xp: 400,
    attackType: "ranged",
    attackWindupMs: 320,
    projectileSpeed: 9,
    ai: "brute",
    form: 2,
    boss: true,
    // Form 2 (spec §6): your shift does not slow him, he takes a shift held
    // too long, and he replays his volleys (src/systems/boss-form2.js).
    chronoMultiplier: 1.0,
    counterShift: true,
    replay: true,
    // No round takes more than 40 (combat.js): a sniper bolt is a hit, not
    // a fifth of his health.
    armor: { cap: 40 },
    hitZones: BOSS_ZONES,
  },
  // Form 3, the Remainder: small, thin, quiet, and the hardest of the three.
  // Precise, fully led rounds; he sidesteps your fire, warps behind you and
  // undoes a burst of damage, twice.
  boss_form3: {
    name: "Paradox Lord — Final Form",
    health: 2600,
    speed: 2.6,
    damage: 48,
    attackRate: 1300,
    attackRange: 20,
    sightRange: 30,
    radius: 0.32,
    score: 25000,
    color1: "#b98aff",
    color2: "#2a1060",
    xp: 1000,
    attackType: "ranged",
    attackWindupMs: 420,
    projectileSpeed: 14,
    lead: 0.9,
    ai: "duelist",
    form: 3,
    boss: true,
    // Eleven Seconds (src/systems/eleven-seconds.js): he stops time at 75%,
    // 50% and 25%. Your shift does not slow him; waiting for his stop is
    // the answer.
    elevenSeconds: true,
    chronoMultiplier: 1,
    // As the Brute: no single round takes more than 40.
    armor: { cap: 40 },
    hitZones: REMAINDER_ZONES,
  },
  // Act II's boss: suit C-0016, the prototype before yours, walking with
  // nobody inside (spec §6). Always visible as a heat-shimmer, solid only
  // while the player shifts (decision 7): src/systems/chrono-powers.js sets
  // `_phased`. Its attacks land either way, and each has a long tell:
  //   lunge  a beast's charge (the charge fields are SECONDS here, which is
  //          what _updateBeastCharge counts in): coil for 0.9 s with the lane
  //          drawn on the floor, then run it
  //   quills a bristle, then five slow quills in a fan (ai.js _updateQuills);
  //          two volleys back to back below half health
  // It sheds echo drones as it hunts: kills that feed the chrono pool the
  // fight runs on.
  hound: {
    name: "The Hound",
    health: 900,
    speed: 1.35,
    damage: 30,
    attackRate: 1300,
    attackRange: 2.6,
    sightRange: 30,
    radius: 0.55,
    score: 8000,
    color1: "#e8c9a0",
    color2: "#3a2a1e",
    xp: 300,
    attackType: "melee",
    attackWindupMs: 520,
    ai: "ambush",
    chargeCooldown: 4.2,
    chargeWindup: 0.9,
    chargeDuration: 0.95,
    chargeSpeedMul: 5,
    chargeDamageMul: 1.4,
    lungeLock: true,
    quills: {
      cooldown: 5.5,
      windup: 0.75,
      count: 5,
      spread: 0.7,
      speed: 6.5,
      damage: 12,
      minRange: 3.5,
      maxRange: 16,
      volleysHurt: 2,
      gap: 0.45,
    },
    summonType: "echoDrone",
    summonInterval: 15000,
    summonMax: 2,
    chronoMultiplier: 1.5,
    boss: true,
    phased: true,
    hitZones: [
      { name: "head", top: 0.85, bottom: 0.65, mult: 2.5, tight: true },
      { name: "core", top: 0.65, bottom: 0.30, mult: 1.4 },
    ],
  },
  corruptCop: {
    name: "Corrupt SWAT Officer",
    health: 50,
    speed: 1.8,
    damage: 12,
    attackRate: 900,
    attackRange: 10,
    sightRange: 14,
    radius: 0.3,
    score: 200,
    color1: "#ddaa00",
    color2: "#664400",
    xp: 20,
    attackType: "ranged",
    ai: "patrol",
    hitZones: HUMANOID_ZONES,
  },
  sentinel: {
    name: "Chrono Sentinel",
    health: 180,
    speed: 0.9,
    damage: 20,
    attackRate: 2600,
    attackRange: 2.5,
    sightRange: 12,
    radius: 0.5,
    score: 600,
    color1: "#88aacc",
    color2: "#334466",
    xp: 60,
    attackType: "melee",
    attackWindupMs: 550,
    // Advances behind its shield and bashes; the bash shoves you back (cells).
    ai: "guard",
    shove: 0.9,
    // Radians/s its shield turns (~65°/s): a run round it at bash range, or
    // a sprint round it a few cells out, gets behind it.
    shieldTurnRate: 1.1,
    frontShield: true,
    shieldRegen: true,
    shieldRegenRate: 3,
    hitZones: SHIELDED_FRONT_ZONES,
  },
  glitchling: {
    name: "Glitchling",
    health: 18,
    speed: 3.0,
    damage: 6,
    attackRate: 500,
    attackRange: 1.8,
    sightRange: 18,
    radius: 0.2,
    score: 75,
    color1: "#00ff44",
    color2: "#004411",
    xp: 8,
    attackType: "melee",
    attackWindupMs: 180,
    ai: "erratic",
  },
  // ── Sub-bosses & Henchmen (v0.8.0) ──
  // The two Act I mini-bosses. The Commander holds a line: a front shield
  // to flank and an energy shield under it, a shield-bash charge with a long
  // tell, a three-round suppressing fan, and a rally that shields the allies
  // round it. Kill it first.
  shieldCommander: {
    name: "Shield Commander",
    health: 650,
    speed: 1.1,
    damage: 22,
    attackRate: 1300,
    attackRange: 9,
    sightRange: 18,
    radius: 0.5,
    score: 1600,
    color1: "#4488dd",
    color2: "#223366",
    xp: 160,
    attackType: "ranged",
    ai: "patrol",
    subBoss: true,
    frontShield: true,
    shieldRegen: true,
    shieldMax: 120,
    shieldRegenRate: 12,
    chargeCooldown: 6.5,
    chargeWindup: 0.9,
    chargeDuration: 0.8,
    // Bashes from 3–7.5 cells at a run that carries it ~8 cells: step out of
    // the lane and it ends up past you, back turned.
    chargeMinRange: 3,
    chargeMaxRange: 7.5,
    chargeSpeedMul: 9,
    chargeDamageMul: 1.6,
    // A bash that misses leaves it planted, shield the way it ran: its back
    // is yours for this long (seconds).
    chargeRecover: 1.6,
    // Radians/s its shield turns (~57°/s): circling it at a walk a few
    // cells out gets you behind it, and it holds fire while it turns.
    shieldTurnRate: 1.0,
    lungeLock: true,
    quills: {
      cooldown: 4.5,
      windup: 0.6,
      count: 3,
      spread: 0.3,
      speed: 9,
      damage: 14,
      minRange: 3,
      maxRange: 14,
      volleysHurt: 2,
      gap: 0.3,
    },
    rally: { interval: 9000, radius: 8, shield: 40 },
    hitZones: SHIELDED_FRONT_ZONES,
  },
  // The Phantom Sorcerer: keeps its distance and blinks away from you, fires
  // fans of slow orbs, and channels two summons at a time. Its ward soaks
  // your fire and comes back only while its summons live: kill them, then it.
  temporalSummoner: {
    name: "Temporal Summoner",
    health: 520,
    speed: 0.9,
    damage: 16,
    attackRate: 1600,
    attackRange: 13,
    sightRange: 20,
    radius: 0.45,
    score: 1800,
    color1: "#cc44ff",
    color2: "#440066",
    xp: 180,
    attackType: "ranged",
    ai: "support",
    subBoss: true,
    // One drone per call, two at most, with a long channel to punish: the
    // fight is the Summoner, not a swarm (fair without a shift).
    summonType: "drone",
    summonInterval: 9000,
    summonMax: 2,
    summonCount: 1,
    summonChannel: 1.8,
    // Fails over `fade` seconds once its last summon dies.
    ward: { max: 160, regen: 30, fade: 2 },
    blinkAway: { range: 3.5, dist: 5, cooldown: 5 },
    // Slow orbs on a long bristle, one volley: sidestep the fan.
    quills: {
      cooldown: 6,
      windup: 0.9,
      count: 5,
      spread: 0.9,
      speed: 4.5,
      damage: 9,
      minRange: 3,
      maxRange: 15,
      volleysHurt: 1,
      gap: 0.5,
    },
    hitZones: HUMANOID_ZONES,
  },
  henchman: {
    name: "Syndicate Henchman",
    health: 90,
    speed: 1.6,
    damage: 18,
    attackRate: 800,
    attackRange: 10,
    sightRange: 16,
    radius: 0.35,
    score: 400,
    color1: "#ff6600",
    color2: "#663300",
    xp: 40,
    attackType: "ranged",
    ai: "flanker",
    hitZones: HUMANOID_ZONES,
  },
  chronoBomber: {
    name: "Chrono-Bomber",
    health: 70,
    speed: 1.4,
    damage: 10,
    attackRate: 1200,
    attackRange: 9,
    sightRange: 15,
    radius: 0.35,
    score: 350,
    color1: "#ffaa00",
    color2: "#664400",
    xp: 35,
    attackType: "ranged",
    ai: "patrol",
    dropsBombs: true,
    bombDamage: 25,
    bombRadius: 2.0,
    hitZones: ROBOT_ZONES,
  },
  // New Act 2 / Act 3 enemy archetypes
  phaseStalker: {
    name: "Phase Stalker",
    health: 80,
    speed: 2.6,
    damage: 22,
    attackRate: 700,
    attackRange: 2.5,
    sightRange: 18,
    radius: 0.28,
    score: 450,
    color1: "#66ffdd",
    color2: "#006644",
    xp: 60,
    attackType: "melee",
    attackWindupMs: 420,
    ai: "teleport_strike",
    teleportCooldown: 3500,
    hitZones: HUMANOID_ZONES,
  },
  timeWarden: {
    name: "Time Warden",
    health: 240,
    speed: 0.9,
    damage: 28,
    attackRate: 1400,
    attackRange: 10,
    sightRange: 20,
    radius: 0.5,
    score: 1200,
    color1: "#4488ff",
    color2: "#223377",
    xp: 160,
    attackType: "ranged",
    ai: "guard",
    shieldRegen: true,
    shieldRegenRate: 5, // per 5s
    frontShield: true,
    shieldTurnRate: 1.0,
    hitZones: SHIELDED_FRONT_ZONES,
  },
  echoDrone: {
    name: "Echo Drone",
    health: 40,
    speed: 2.2,
    damage: 10,
    attackRate: 600,
    attackRange: 9,
    sightRange: 18,
    radius: 0.25,
    score: 180,
    color1: "#aaffff",
    color2: "#114444",
    xp: 28,
    attackType: "ranged",
    ai: "swarm",
    flying: true,
    echoCloneOnDeath: true,
    cloneCount: 1,
    hitZones: ROBOT_ZONES,
  },
  riftLeaper: {
    name: "Rift Leaper",
    health: 100,
    speed: 2.8,
    damage: 30,
    attackRate: 1000,
    attackRange: 2,
    sightRange: 16,
    radius: 0.4,
    score: 600,
    color1: "#ff66ff",
    color2: "#662266",
    xp: 80,
    attackType: "melee",
    attackWindupMs: 500,
    ai: "teleport_melee",
    leapDistance: 6,
    hitZones: HUMANOID_ZONES,
  },
  temporalEngineer: {
    name: "Temporal Engineer",
    health: 160,
    speed: 1.0,
    damage: 12,
    attackRate: 1600,
    attackRange: 12,
    sightRange: 22,
    radius: 0.45,
    score: 900,
    color1: "#ffd36b",
    color2: "#664411",
    xp: 120,
    attackType: "ranged",
    ai: "support",
    disablesHUD: true,
    disableDuration: 3000,
    hitZones: HUMANOID_ZONES,
  },
};
