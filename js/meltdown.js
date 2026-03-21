/**
 * MELTDOWN: Reactor Run
 * ─────────────────────
 * Endless forward-scrolling raycaster mode.
 * Theme: "Meltdown Imminent" | Constraint: "Forward Motion"
 *
 * The reactor is going critical. ARIA screams warnings.
 * You auto-run forward through Chronos Station corridors.
 * Strafe, dash, shoot — but you never stop moving.
 * Speed increases. Heat rises. How far can you get?
 */

// ── Corridor Segment Templates ───────────────────────────────────
// Each is a 15-wide section (rows). 0=floor, 1=wall, 2=obstacle (crate/pillar)
// Hazards are tracked separately as {x,y} arrays (floor damage zones).
// Segments are stitched vertically; player moves from bottom to top (-Y direction).

const SEG_W = 15;

const SEGMENTS = [
  // 0: Wide straight corridor
  {
    rows: [
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    ],
    enemies: [],
    pickups: [],
  },
  // 1: Narrow squeeze
  {
    rows: [
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    ],
    enemies: [{ x: 7, y: 2, type: "drone" }],
    pickups: [],
  },
  // 2: Obstacle slalom
  {
    rows: [
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ],
    enemies: [],
    pickups: [{ x: 7, y: 3, type: "ammo" }],
  },
  // 3: Hazard zone (glowing floor damage)
  {
    rows: [
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ],
    enemies: [],
    pickups: [],
    hazards: [
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 10, y: 1 },
      { x: 11, y: 1 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 9, y: 2 },
      { x: 10, y: 2 },
      { x: 11, y: 2 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 9, y: 4 },
      { x: 10, y: 4 },
      { x: 11, y: 4 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 10, y: 5 },
      { x: 11, y: 5 },
    ],
  },
  // 4: Column gauntlet
  {
    rows: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ],
    enemies: [
      { x: 4, y: 1, type: "drone" },
      { x: 10, y: 5, type: "drone" },
    ],
    pickups: [],
  },
  // 5: Supply cache
  {
    rows: [
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ],
    enemies: [],
    pickups: [
      { x: 5, y: 3, type: "health" },
      { x: 9, y: 3, type: "ammo" },
    ],
  },
  // 6: Enemy ambush
  {
    rows: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ],
    enemies: [
      { x: 7, y: 1, type: "drone" },
      { x: 4, y: 3, type: "glitchling" },
      { x: 10, y: 3, type: "glitchling" },
    ],
    pickups: [],
  },
  // 7: Vent corridor (tight with steam hazards)
  {
    rows: [
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    ],
    enemies: [{ x: 7, y: 3, type: "phantom" }],
    pickups: [],
    hazards: [
      { x: 5, y: 1 },
      { x: 9, y: 1 },
      { x: 5, y: 5 },
      { x: 9, y: 5 },
    ],
  },
  // 8: Wide arena (mini-fight)
  {
    rows: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    ],
    enemies: [
      { x: 3, y: 2, type: "henchman" },
      { x: 11, y: 2, type: "henchman" },
      { x: 7, y: 1, type: "chronoBomber" },
    ],
    pickups: [{ x: 7, y: 5, type: "health" }],
  },
  // 9: Boss corridor
  {
    rows: [
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    ],
    enemies: [{ x: 7, y: 2, type: "shieldCommander" }],
    pickups: [
      { x: 4, y: 4, type: "ammo" },
      { x: 10, y: 4, type: "health" },
    ],
  },
];

// ── Additional corridor segments for variety ─────────────────────
// 10: Cross junction
SEGMENTS.push({
  rows: [
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  ],
  enemies: [
    { x: 2, y: 2, type: "drone" },
    { x: 12, y: 4, type: "drone" },
  ],
  pickups: [{ x: 7, y: 3, type: "health" }],
});

// 11: Zigzag corridor
SEGMENTS.push({
  rows: [
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  ],
  enemies: [{ x: 7, y: 3, type: "phantom" }],
  pickups: [],
});

// 12: Darkness corridor (no hazards, many enemies)
SEGMENTS.push({
  rows: [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  ],
  enemies: [
    { x: 3, y: 1, type: "glitchling" },
    { x: 11, y: 1, type: "glitchling" },
    { x: 7, y: 3, type: "phantom" },
    { x: 4, y: 5, type: "drone" },
    { x: 10, y: 5, type: "drone" },
  ],
  pickups: [{ x: 7, y: 6, type: "ammo" }],
});

// 13: Boss segment (wide arena with pillars)
SEGMENTS.push({
  rows: [
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  ],
  enemies: [
    { x: 7, y: 1, type: "shieldCommander" },
    { x: 4, y: 4, type: "henchman" },
    { x: 10, y: 4, type: "henchman" },
  ],
  pickups: [
    { x: 3, y: 6, type: "health" },
    { x: 11, y: 6, type: "ammo" },
  ],
});

// ── Enemy type escalation by distance ────────────────────────────
const THREAT_TABLE = [
  { dist: 0, types: ["drone"] },
  { dist: 50, types: ["drone", "glitchling"] },
  { dist: 120, types: ["drone", "glitchling", "phantom"] },
  { dist: 200, types: ["drone", "phantom", "henchman", "corruptCop"] },
  { dist: 350, types: ["phantom", "henchman", "chronoBomber", "corruptCop"] },
  {
    dist: 500,
    types: ["henchman", "chronoBomber", "shieldCommander", "beast"],
  },
  {
    dist: 700,
    types: ["shieldCommander", "temporalSummoner", "beast", "sentinel"],
  },
];

// ── Hero Definitions ─────────────────────────────────────────────
export const MELTDOWN_HEROES = {
  agent: {
    name: "Agent",
    description: "Balanced all-rounder. Standard loadout.",
    baseSpeed: 3.5,
    maxSpeed: 12.0,
    baseDamage: 1.0,
    baseHealth: 100,
    ability: null,
    abilityCooldown: 0,
    color: "#00e5ff",
  },
  blitz: {
    name: "Blitz",
    description: "Speed demon. Faster base speed, dash ability every 8s.",
    baseSpeed: 4.2,
    maxSpeed: 14.0,
    baseDamage: 0.85,
    baseHealth: 80,
    ability: "dash",
    abilityCooldown: 8,
    color: "#ffcc00",
  },
  tank: {
    name: "Tank",
    description: "Armored up. More HP, damage reduction, slower speed.",
    baseSpeed: 2.8,
    maxSpeed: 9.0,
    baseDamage: 1.2,
    baseHealth: 150,
    ability: "shield",
    abilityCooldown: 12,
    color: "#ff4444",
  },
  ghost: {
    name: "Ghost",
    description: "Phase through obstacles briefly. Fragile but elusive.",
    baseSpeed: 3.5,
    maxSpeed: 11.0,
    baseDamage: 0.9,
    baseHealth: 70,
    ability: "phase",
    abilityCooldown: 10,
    color: "#aa44ff",
  },
};

// ── Upgrade / Power-Up Pool ──────────────────────────────────────
const MELTDOWN_UPGRADES = [
  {
    id: "speedBoost",
    name: "Overclock Servos",
    description: "+15% movement speed",
    icon: "⚡",
    apply: (mode) => { mode.speed *= 1.15; mode.maxSpeed *= 1.05; },
  },
  {
    id: "heatResist",
    name: "Thermal Dampeners",
    description: "-25% heat buildup rate",
    icon: "🧊",
    apply: (mode) => { mode.heatRate *= 0.75; },
  },
  {
    id: "shieldBurst",
    name: "Emergency Shield",
    description: "Absorb the next 30 damage",
    icon: "🛡",
    apply: (mode) => { mode.shieldHP = (mode.shieldHP || 0) + 30; },
  },
  {
    id: "doubleDamage",
    name: "Overcharged Rounds",
    description: "+40% weapon damage",
    icon: "💥",
    apply: (mode) => { mode.damageMultiplier = (mode.damageMultiplier || 1) * 1.4; },
  },
  {
    id: "healPulse",
    name: "Nano-Repair Pulse",
    description: "Restore 25 HP instantly",
    icon: "💚",
    apply: (mode) => { mode._healPending = (mode._healPending || 0) + 25; },
  },
  {
    id: "hazardImmunity",
    name: "Mag-Lev Boots",
    description: "Immune to floor hazards for 60m",
    icon: "🥾",
    apply: (mode) => { mode.hazardImmuneUntil = mode.distance + 60; },
  },
  {
    id: "extraLife",
    name: "Temporal Anchor",
    description: "Survive one fatal hit (1 HP)",
    icon: "⏳",
    apply: (mode) => { mode.extraLives = (mode.extraLives || 0) + 1; },
  },
  {
    id: "scoreMultiplier",
    name: "Risk Amplifier",
    description: "+50% score multiplier",
    icon: "🎯",
    apply: (mode) => { mode.scoreMultiplier = (mode.scoreMultiplier || 1) * 1.5; },
  },
];

// ── ARIA Meltdown Comms ──────────────────────────────────────────
const MELTDOWN_ARIA = {
  start: [
    "REACTOR CONTAINMENT FAILURE. All personnel evacuate toward docking bay.",
    "Meltdown imminent. I'm plotting the fastest route. DO NOT STOP MOVING.",
  ],
  startIronman: [
    "Ironman protocol engaged. No pickups. No second chances. Just you and speed.",
    "We're doing this the hard way. No supplies. No safety net. RUN.",
  ],
  heat25: [
    "Core temperature at 25%. Structural integrity declining.",
    "Coolant systems offline. We need to move faster.",
  ],
  heat50: [
    "CRITICAL: Reactor at 50%. Corridor sections collapsing behind us.",
    "Half the station is gone. Keep pushing forward, Agent.",
  ],
  heat75: [
    "EMERGENCY: 75% thermal load. Hull breach in multiple sections.",
    "I'm losing sensor coverage. Trust your instincts. KEEP MOVING.",
  ],
  heat90: [
    "CATASTROPHIC MELTDOWN IN PROGRESS. This is it. Run. NOW.",
    "If we stop, we die. If we slow down, we die. Forward. FORWARD.",
  ],
  pickup: [
    "Supplies detected. Grab what you can, don't slow down.",
    "Emergency cache ahead. Quick hands, Agent.",
  ],
  enemyWave: [
    "Hostiles in the corridor. Shoot through them.",
    "Contacts ahead. No time to fight clean — just survive.",
    "They're between us and the exit. Weapons hot.",
  ],
  death: [
    "Signal lost. Reactor detonation in 3... 2...",
    "Agent down. ... The station didn't make it either.",
  ],
  extraLife: [
    "Temporal anchor activated! You should be dead. You're not. MOVE!",
    "The anchor pulled you back. That was your last one. Don't waste it.",
  ],
  upgrade: [
    "Upgrade systems online. Choose wisely — no time to deliberate.",
    "Emergency upgrade cache. Pick one and keep moving.",
  ],
  milestone100: ["100 meters. You're past the reactor wing."],
  milestone250: ["250 meters. Engineering section cleared."],
  milestone500: ["500 meters. We're in the residential ring. Almost there."],
  milestone750: ["750 meters. Agent, you're setting records."],
  milestone1000: ["One kilometer. I... didn't think we'd make it this far."],
  milestone2000: ["Two kilometers. You're a legend. The station won't be."],
};

// ── Shared segment-stitching helper ──────────────────────────────

/**
 * Append one segment to the grid. Returns the segment index used.
 * Player runs in +Y direction, so new segments are appended at the end.
 */
function _appendSegment(
  grid,
  hazardSet,
  enemySpawns,
  pickupSpawns,
  segNum,
  lastIdx,
) {
  const dist = segNum * 7;

  let segIdx;
  if (segNum < 3) {
    segIdx = [0, 2, 5][segNum % 3];
  } else {
    do {
      segIdx = Math.floor(Math.random() * SEGMENTS.length);
    } while (segIdx === lastIdx);
  }

  const seg = SEGMENTS[segIdx];
  const baseY = grid.length;

  for (const row of seg.rows) grid.push([...row]);

  if (seg.hazards) {
    for (const hz of seg.hazards) hazardSet.add(`${hz.x},${baseY + hz.y}`);
  }

  let availTypes = ["drone"];
  for (const t of THREAT_TABLE) {
    if (dist >= t.dist) availTypes = t.types;
  }

  for (const e of seg.enemies) {
    const type = availTypes[Math.floor(Math.random() * availTypes.length)];
    enemySpawns.push({ x: e.x + 0.5, y: baseY + e.y + 0.5, type });
  }

  for (const p of seg.pickups) {
    pickupSpawns.push({ x: p.x + 0.5, y: baseY + p.y + 0.5, type: p.type });
  }

  if (segNum > 5 && Math.random() < 0.4) {
    const ex = 2 + Math.floor(Math.random() * 11);
    const ey = baseY + 3;
    if (grid[ey] && grid[ey][ex] === 0) {
      const type = availTypes[Math.floor(Math.random() * availTypes.length)];
      enemySpawns.push({ x: ex + 0.5, y: ey + 0.5, type });
    }
  }

  return segIdx;
}

// ── Map Generation ───────────────────────────────────────────────

/**
 * Generate a meltdown corridor map by stitching random segments.
 * Player runs in +Y direction so the map can extend infinitely via push().
 */
function generateMeltdownMap(segCount = 50) {
  const grid = [];
  const hazardSet = new Set();
  const enemySpawns = [];
  const pickupSpawns = [];

  // Start pad at top (low Y) — player spawns here
  grid.push(new Array(SEG_W).fill(1)); // row 0: wall
  grid.push([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]); // row 1: open

  let lastIdx = -1;
  for (let s = 0; s < segCount; s++) {
    lastIdx = _appendSegment(
      grid,
      hazardSet,
      enemySpawns,
      pickupSpawns,
      s,
      lastIdx,
    );
  }

  // Bottom wall cap (removed + re-added when extending)
  grid.push(new Array(SEG_W).fill(1));

  return {
    name: "Reactor Run",
    width: SEG_W,
    height: grid.length,
    grid,
    hazardSet,
    playerStart: { x: 7.5, y: 1.5, dir: Math.PI / 2 },
    enemySpawns,
    pickupSpawns,
    _segCount: segCount,
    _lastSegIdx: lastIdx,
  };
}

// ── Meltdown Mode Controller ─────────────────────────────────────

export class MeltdownMode {
  constructor() {
    this.map = null;
    this.distance = 0;
    this.maxDistance = 0;
    this.speed = 3.5; // tiles/sec — increases over time
    this.maxSpeed = 12.0;
    this.heat = 0; // 0-100
    this.heatRate = 0.8; // % per second
    this.alive = true;
    this.score = 0;
    this.startTime = 0;
    this.runTime = 0;
    this.hazardDamageRate = 15; // hp/sec on hazard tiles

    // ── New systems ──
    this.heroKey = "agent";
    this.hero = MELTDOWN_HEROES.agent;
    this.ironman = false;
    this.upgrades = [];            // applied upgrades this run
    this.upgradesPending = null;   // { choices: [...] } when upgrade screen is showing
    this.nextUpgradeAt = 100;      // distance for next upgrade milestone
    this.damageMultiplier = 1.0;
    this.scoreMultiplier = 1.0;
    this.shieldHP = 0;
    this.extraLives = 0;
    this.hazardImmuneUntil = 0;
    this._healPending = 0;
    this.killCount = 0;

    // Hero ability
    this.abilityCooldown = 0;
    this.abilityActive = false;
    this.abilityTimer = 0;

    // ARIA state
    this.ariaQueue = [];
    this.ariaActive = null;
    this.ariaTimer = 0;
    this.ariaMilestones = {};

    // High scores (local storage)
    this.highScores = this._loadScores();
  }

  /**
   * Initialize a new run.
   * @param {string} heroKey — key from MELTDOWN_HEROES (default: "agent")
   * @param {boolean} ironman — if true, no pickups spawn (pure skill run)
   */
  start(heroKey = "agent", ironman = false) {
    this.heroKey = heroKey;
    this.hero = MELTDOWN_HEROES[heroKey] || MELTDOWN_HEROES.agent;
    this.ironman = ironman;

    this.map = generateMeltdownMap(50);
    this.distance = 0;
    this.maxDistance = 0;
    this.speed = this.hero.baseSpeed;
    this.maxSpeed = this.hero.maxSpeed;
    this.heat = 0;
    this.heatRate = 0.8;
    this.alive = true;
    this.score = 0;
    this.startTime = performance.now();
    this.runTime = 0;
    this.ariaMilestones = {};
    this.ariaQueue = [];
    this.ariaActive = null;
    this.ariaTimer = 0;

    // Reset new systems
    this.upgrades = [];
    this.upgradesPending = null;
    this.nextUpgradeAt = 100;
    this.damageMultiplier = this.hero.baseDamage;
    this.scoreMultiplier = 1.0;
    this.shieldHP = 0;
    this.extraLives = 0;
    this.hazardImmuneUntil = 0;
    this._healPending = 0;
    this.killCount = 0;
    this.abilityCooldown = 0;
    this.abilityActive = false;
    this.abilityTimer = 0;

    // Queue start dialogue
    this._queueAria(ironman ? "startIronman" : "start");

    return this.map;
  }

  /**
   * Per-frame update. Called from game's update loop.
   * Returns { moveY, hazardDmg, ariaMsg, events[], healAmount }
   */
  update(dt, playerX, playerY) {
    if (!this.alive)
      return { moveY: 0, hazardDmg: 0, ariaMsg: null, events: [], healAmount: 0 };

    // If upgrade screen is pending, pause the run
    if (this.upgradesPending) {
      return { moveY: 0, hazardDmg: 0, ariaMsg: null, events: [{ type: "upgradeScreen", choices: this.upgradesPending.choices }], healAmount: 0 };
    }

    const events = [];

    // ── Hero ability cooldown ──
    if (this.abilityCooldown > 0) this.abilityCooldown -= dt;
    if (this.abilityActive) {
      this.abilityTimer -= dt;
      if (this.abilityTimer <= 0) {
        this.abilityActive = false;
        events.push({ type: "abilityEnd", ability: this.hero.ability });
      }
    }

    // ── Speed acceleration ──
    this.speed = Math.min(this.maxSpeed, this.speed + 0.12 * dt);

    // ── Forward motion (auto-run) ──
    const moveY = this.speed * dt;

    // ── Distance tracking ──
    this.distance += Math.abs(moveY);
    this.maxDistance = Math.max(this.maxDistance, this.distance);
    this.runTime = (performance.now() - this.startTime) / 1000;

    // Score = distance × speed multiplier × score multiplier
    this.score = Math.floor(this.distance * 10 * this.scoreMultiplier);

    // ── Heat buildup ──
    const prevHeat = this.heat;
    this.heat = Math.min(100, this.heat + this.heatRate * dt);
    this.heatRate = 0.8 + this.distance * 0.002;

    // ── ARIA triggers ──
    const heatThresholds = [
      { key: "heat25", val: 25 },
      { key: "heat50", val: 50 },
      { key: "heat75", val: 75 },
      { key: "heat90", val: 90 },
    ];
    for (const t of heatThresholds) {
      if (this.heat >= t.val && prevHeat < t.val && !this.ariaMilestones[t.key]) {
        this.ariaMilestones[t.key] = true;
        this._queueAria(t.key);
        events.push({ type: "heatWarning", level: t.val });
      }
    }

    // Distance milestones
    const distMilestones = [
      { key: "milestone100", val: 100 },
      { key: "milestone250", val: 250 },
      { key: "milestone500", val: 500 },
      { key: "milestone750", val: 750 },
      { key: "milestone1000", val: 1000 },
      { key: "milestone2000", val: 2000 },
    ];
    for (const m of distMilestones) {
      if (this.distance >= m.val && !this.ariaMilestones[m.key]) {
        this.ariaMilestones[m.key] = true;
        this._queueAria(m.key);
        events.push({ type: "milestone", dist: m.val });
      }
    }

    // ── Upgrade milestone check (every 100m, not in ironman) ──
    if (!this.ironman && this.distance >= this.nextUpgradeAt) {
      const choices = this._rollUpgradeChoices(3);
      if (choices.length > 0) {
        this.upgradesPending = { choices };
        this.nextUpgradeAt += 100 + this.upgrades.length * 25; // Increasing intervals
        this._queueAria("upgrade");
        events.push({ type: "upgradeAvailable" });
      }
    }

    // ── Check if map needs extending ──
    if (this.map && playerY > this.map.height - 40) {
      events.push({ type: "extend" });
    }

    // ── Hazard check (with immunity support) ──
    let hazardDmg = 0;
    if (this.distance < this.hazardImmuneUntil) {
      // Immune — no hazard damage
    } else {
      const py = Math.floor(playerY);
      const px = Math.floor(playerX);
      if (this.map.hazardSet) {
        for (let cx = px - 1; cx <= px + 1; cx++) {
          if (this.map.hazardSet.has(`${cx},${py}`)) {
            hazardDmg = this.hazardDamageRate * dt;
            break;
          }
        }
      }
    }

    // ── Shield absorption ──
    if (hazardDmg > 0 && this.shieldHP > 0) {
      const absorbed = Math.min(this.shieldHP, hazardDmg);
      this.shieldHP -= absorbed;
      hazardDmg -= absorbed;
    }

    // ── Heal pending ──
    let healAmount = 0;
    if (this._healPending > 0) {
      healAmount = this._healPending;
      this._healPending = 0;
    }

    // ── ARIA message processing ──
    let ariaMsg = null;
    if (this.ariaActive) {
      this.ariaTimer -= dt;
      if (this.ariaTimer <= 0) this.ariaActive = null;
    }
    if (!this.ariaActive && this.ariaQueue.length > 0) {
      this.ariaActive = this.ariaQueue.shift();
      this.ariaTimer = 4;
      ariaMsg = this.ariaActive;
    }

    return { moveY, hazardDmg, ariaMsg, events, healAmount };
  }

  /**
   * Use the hero's special ability.
   * Returns { type, duration } if activated, or null if on cooldown.
   */
  useAbility() {
    if (!this.hero.ability || this.abilityCooldown > 0 || !this.alive) return null;

    this.abilityCooldown = this.hero.abilityCooldown;
    this.abilityActive = true;

    switch (this.hero.ability) {
      case "dash":
        this.abilityTimer = 0.3;
        return { type: "dash", duration: 0.3, speedBoost: 3.0 };
      case "shield":
        this.abilityTimer = 4.0;
        this.shieldHP += 50;
        return { type: "shield", duration: 4.0, shieldHP: 50 };
      case "phase":
        this.abilityTimer = 2.0;
        return { type: "phase", duration: 2.0 };
      default:
        return null;
    }
  }

  /**
   * Select an upgrade from the pending choices.
   * @param {number} index — 0, 1, or 2
   */
  selectUpgrade(index) {
    if (!this.upgradesPending) return;
    const choice = this.upgradesPending.choices[index];
    if (choice) {
      choice.apply(this);
      this.upgrades.push(choice.id);
    }
    this.upgradesPending = null;
  }

  /** Record a kill (for scoring) */
  onKill() {
    this.killCount++;
    this.score += Math.floor(50 * this.scoreMultiplier);
  }

  /**
   * Handle fatal damage. Returns true if extra life saved the player.
   */
  onFatalHit() {
    if (this.extraLives > 0) {
      this.extraLives--;
      this._queueAria("extraLife");
      return true; // Survived — set HP to 1 in game.js
    }
    return false; // Actually dead
  }

  /**
   * Extend the map with more segments. Returns new spawns for game.js.
   */
  extend(count = 25) {
    if (!this.map) return { enemySpawns: [], pickupSpawns: [] };

    // Remove bottom wall cap
    this.map.grid.pop();

    const newEnemies = [];
    const newPickups = [];

    for (let i = 0; i < count; i++) {
      this.map._lastSegIdx = _appendSegment(
        this.map.grid,
        this.map.hazardSet,
        newEnemies,
        newPickups,
        this.map._segCount + i,
        this.map._lastSegIdx,
      );
    }
    this.map._segCount += count;

    // Remove pickups in ironman mode
    if (this.ironman) {
      newPickups.length = 0;
    }

    // Re-add bottom wall cap
    this.map.grid.push(new Array(SEG_W).fill(1));
    this.map.height = this.map.grid.length;

    return { enemySpawns: newEnemies, pickupSpawns: newPickups };
  }

  /** Player died */
  onDeath() {
    this.alive = false;
    this._queueAria("death");

    // Save high score
    this._saveScore(this.score, this.distance, this.runTime);
  }

  /** Get current run stats for HUD */
  getHUD() {
    return {
      distance: Math.floor(this.distance),
      speed: this.speed.toFixed(1),
      heat: Math.floor(this.heat),
      score: this.score,
      time: this.runTime.toFixed(1),
      ariaText: this.ariaActive,
      // New fields
      heroName: this.hero.name,
      heroColor: this.hero.color,
      ironman: this.ironman,
      shieldHP: Math.floor(this.shieldHP),
      extraLives: this.extraLives,
      upgradeCount: this.upgrades.length,
      killCount: this.killCount,
      abilityCooldown: Math.max(0, this.abilityCooldown),
      abilityReady: this.hero.ability && this.abilityCooldown <= 0,
      abilityName: this.hero.ability,
    };
  }

  /** Get the heat-based red tint for the renderer overlay */
  getHeatOverlay() {
    if (this.heat < 10) return null;
    const intensity = Math.min(0.4, (this.heat / 100) * 0.4);
    const pulse =
      1 + Math.sin(performance.now() * 0.004) * 0.15 * (this.heat / 100);
    return `rgba(255, ${Math.floor(60 - this.heat * 0.5)}, 0, ${(intensity * pulse).toFixed(3)})`;
  }

  /** Get leaderboard formatted for display */
  getLeaderboard(filterHero = null, filterIronman = null) {
    let scores = [...this.highScores];
    if (filterHero) scores = scores.filter(s => s.hero === filterHero);
    if (filterIronman !== null) scores = scores.filter(s => !!s.ironman === filterIronman);
    return scores.slice(0, 10);
  }

  // ── Internal helpers ──

  _rollUpgradeChoices(count) {
    const pool = [...MELTDOWN_UPGRADES];
    const choices = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      choices.push(pool.splice(idx, 1)[0]);
    }
    return choices;
  }

  _queueAria(key) {
    const msgs = MELTDOWN_ARIA[key];
    if (!msgs || msgs.length === 0) return;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.ariaQueue.push(msg);
  }

  _loadScores() {
    try {
      return JSON.parse(localStorage.getItem("cc_meltdown_scores") || "[]");
    } catch {
      return [];
    }
  }

  _saveScore(score, dist, time) {
    this.highScores.push({
      score,
      distance: Math.floor(dist),
      time: Math.floor(time),
      date: Date.now(),
      hero: this.heroKey,
      ironman: this.ironman,
      kills: this.killCount,
      upgrades: this.upgrades.length,
    });
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 25); // expanded from 10 to 25
    try {
      localStorage.setItem(
        "cc_meltdown_scores",
        JSON.stringify(this.highScores),
      );
    } catch {
      /* quota */
    }
  }
}
