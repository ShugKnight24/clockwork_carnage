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

// ── ARIA Meltdown Comms ──────────────────────────────────────────
const MELTDOWN_ARIA = {
  start: [
    "REACTOR CONTAINMENT FAILURE. All personnel evacuate toward docking bay.",
    "Meltdown imminent. I'm plotting the fastest route. DO NOT STOP MOVING.",
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
  milestone100: ["100 meters. You're past the reactor wing."],
  milestone250: ["250 meters. Engineering section cleared."],
  milestone500: ["500 meters. We're in the residential ring. Almost there."],
  milestone1000: ["One kilometer. I... didn't think we'd make it this far."],
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

    // ARIA state
    this.ariaQueue = [];
    this.ariaActive = null;
    this.ariaTimer = 0;
    this.ariaMilestones = {};

    // High scores (local storage)
    this.highScores = this._loadScores();
  }

  /** Initialize a new run */
  start() {
    this.map = generateMeltdownMap(50);
    this.distance = 0;
    this.maxDistance = 0;
    this.speed = 3.5;
    this.heat = 0;
    this.alive = true;
    this.score = 0;
    this.startTime = performance.now();
    this.runTime = 0;
    this.ariaMilestones = {};
    this.ariaQueue = [];
    this.ariaActive = null;
    this.ariaTimer = 0;

    // Queue start dialogue
    this._queueAria("start");

    return this.map;
  }

  /**
   * Per-frame update. Called from game's update loop.
   * Returns { moveY, hazardDmg, ariaMsg, events[] }
   */
  update(dt, playerX, playerY) {
    if (!this.alive)
      return { moveY: 0, hazardDmg: 0, ariaMsg: null, events: [] };

    const events = [];

    // ── Speed acceleration ──
    this.speed = Math.min(this.maxSpeed, this.speed + 0.12 * dt);

    // ── Forward motion (auto-run) ──
    // Player moves in +Y direction (toward higher rows / deeper into the station)
    const moveY = this.speed * dt;

    // ── Distance tracking ──
    this.distance += Math.abs(moveY);
    this.maxDistance = Math.max(this.maxDistance, this.distance);
    this.runTime = (performance.now() - this.startTime) / 1000;

    // Score = distance × speed multiplier
    this.score = Math.floor(this.distance * 10);

    // ── Heat buildup ──
    const prevHeat = this.heat;
    this.heat = Math.min(100, this.heat + this.heatRate * dt);

    // Heat rate increases over time
    this.heatRate = 0.8 + this.distance * 0.002;

    // ── ARIA triggers ──
    const heatThresholds = [
      { key: "heat25", val: 25 },
      { key: "heat50", val: 50 },
      { key: "heat75", val: 75 },
      { key: "heat90", val: 90 },
    ];
    for (const t of heatThresholds) {
      if (
        this.heat >= t.val &&
        prevHeat < t.val &&
        !this.ariaMilestones[t.key]
      ) {
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
      { key: "milestone1000", val: 1000 },
    ];
    for (const m of distMilestones) {
      if (this.distance >= m.val && !this.ariaMilestones[m.key]) {
        this.ariaMilestones[m.key] = true;
        this._queueAria(m.key);
        events.push({ type: "milestone", dist: m.val });
      }
    }

    // ── Check if map needs extending ──
    if (this.map && playerY > this.map.height - 40) {
      events.push({ type: "extend" });
    }

    // ── Hazard check (tile under player) ──
    let hazardDmg = 0;
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

    return { moveY, hazardDmg, ariaMsg, events };
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

  // ── Internal helpers ──

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
    });
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 10);
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
