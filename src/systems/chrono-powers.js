/**
 * Chronos powers: what the stolen shard in C-0017 can do, and what it costs.
 *
 * Spec docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md
 * §3-§4 and §16.3. Every power runs on the one chrono energy pool, so there is
 * no new resource; what is new is that from Act II every shift is *heard*.
 *
 *   Chrono Shift   the suit (hold Q / Y / SLOW): engage and drain come from here
 *   Foresight      Lyra: while shifting, enemies cast ghosts of where they go
 *   Chrono Dash    Rook: a dash while shifting; quieter shift thresholds
 *   Rewind Echo    Nova: back three seconds, an echo left behind as a decoy
 *   Time-Lock      Kael: a plane of frozen time that catches rounds
 *
 * Unlocks are not saved. Each level entry in src/data/campaign/acts.js carries
 * the `grants` that are yours from its start; `powersFor` adds up every grant
 * up to a slot, so a loaded save always has exactly the powers its position
 * implies. NG+ grants everything. There are no powers outside the campaign
 * (spec decision 5).
 *
 * The pure pieces (the unlock rule, Resonance, the rewind buffer, the lock's
 * geometry, Foresight's prediction) are exported for tests; `ChronoPowers` is
 * the per-game runtime js/game.js calls from its chrono update, time scale
 * and dash, so game.js keeps only the calls.
 */
import { ACTS, getAct, getActLevel } from "../data/campaign/acts.js";
import { ENEMY_TYPES } from "../data/enemies.js";
import { Enemy } from "../../js/entities.js";
import { hasLineOfSight, isPassable } from "./physics.js";
import { playChronoSound } from "../audio/chrono-sounds.js";
import { ElevenSeconds } from "./eleven-seconds.js";

/** In the order they are granted, which is also the HUD's order. */
export const POWER_IDS = ["foresight", "dash", "rewind", "timeLock"];

/**
 * Chrono Shift's thresholds. Rook cannot put the governor back ("It's
 * slag"), but from II-3 he has made it quieter and cheaper.
 */
export const SHIFT = {
  base: { engage: 15, drain: 33 },
  tuned: { engage: 10, drain: 28 },
};

/** Costs are chrono energy; cooldowns and lifetimes are real seconds. */
export const POWERS = {
  foresight: { label: "FORESIGHT", short: "SEE", horizon: 0.6, color: "#ffae3a" },
  dash: { label: "CHRONO DASH", short: "DASH", cost: 20, cooldown: 1.0, distance: 2.2, color: "#3dff8a" },
  rewind: { label: "REWIND", short: "RWD", cost: 40, cooldown: 12, window: 3, healCap: 35, echoLife: 2, color: "#ff5fb4" },
  timeLock: {
    label: "TIME-LOCK", short: "LOCK", cost: 30, cooldown: 10,
    duration: 4, ahead: 1.5, width: 3, depth: 0.5, slow: 0.1, color: "#4f9dff",
  },
};

/**
 * Every power granted up to and including `level` of `act`, in POWER_IDS
 * order. Acts before this one count in full.
 * @param {number} act - 1-based
 * @param {number} level - 0-based
 * @param {{ ngPlus?: number }} [opts]
 * @returns {string[]}
 */
export function powersFor(act, level, { ngPlus = 0, acts = ACTS } = {}) {
  if (!acts.some((a) => a.id === act)) return [];
  if (ngPlus > 0) return [...POWER_IDS];
  const got = new Set();
  for (const a of acts) {
    if (a.id > act) break;
    a.levels.forEach((l, i) => {
      if (a.id < act || i <= level) for (const g of l.grants ?? []) got.add(g);
    });
  }
  return POWER_IDS.filter((p) => got.has(p));
}

// ── Parting gifts ────────────────────────────────────────────────────────────

/**
 * Spec decision 9: an ally who stays behind in Act IV leaves a last upgrade
 * to the power they gave you, in the briefing of the level they stay in.
 * Each gift overrides fields of its power's POWERS entry.
 *
 *   Kael   Time-Lock holds 6 s, not 4        "Take the rest of it."
 *   Nova   Rewind is back in 7 s; the echo stands 4 s
 *   Rook   Chrono Dash costs 12 and rings nothing
 *   Lyra   Foresight without a shift, 0.9 s ahead: the Final Form punishes
 *          shifting, and she will not have you ringing the bell to see him
 */
export const GIFTS = {
  timeLock: { from: "kael", duration: 6 },
  rewind: { from: "nova", cooldown: 7, echoLife: 4 },
  dash: { from: "rook", cost: 12, resonance: 0 },
  foresight: { from: "lyra", horizon: 0.9, passive: true },
};

/**
 * Every gift yours at `level` of `act`: named by a level entry's `gifts` at
 * or before the slot, for a power you hold there, from an ally who has been
 * present in a squad list by then. Only the allies the player actually
 * recruited leave one.
 * @returns {string[]} power ids, in POWER_IDS order
 */
export function giftsFor(act, level, { ngPlus = 0, acts = ACTS } = {}) {
  const powers = powersFor(act, level, { ngPlus, acts });
  const met = new Set();
  const given = new Set();
  for (const a of acts) {
    if (a.id > act) break;
    a.levels.forEach((l, i) => {
      if (a.id === act && i > level) return;
      for (const m of l.squad ?? []) met.add(m);
      for (const g of l.gifts ?? []) if (met.has(GIFTS[g]?.from)) given.add(g);
    });
  }
  return POWER_IDS.filter((p) => given.has(p) && powers.includes(p));
}

// ── NG+ hunters ──────────────────────────────────────────────────────────────

/**
 * Spec decision 10: in NG+ the hunter responses get harder. Per cycle, up to
 * two: one more response allowed a level, a pack one bigger, and ten seconds
 * off the cooldown.
 */
export const NG_PLUS_HUNT = { cycles: 2, cap: 1, pack: 1, cooldown: 10 };

/** Caps, pack size and cooldown for a difficulty and NG+ cycle. */
export function huntRules(difficulty, ngPlus = 0) {
  const c = Math.min(NG_PLUS_HUNT.cycles, Math.max(0, ngPlus | 0));
  return {
    cap: hunterCap(difficulty) + c * NG_PLUS_HUNT.cap,
    packMin: 2 + c * NG_PLUS_HUNT.pack,
    packMax: 4 + c * NG_PLUS_HUNT.pack,
    cooldown: RESONANCE.cooldown - c * NG_PLUS_HUNT.cooldown,
  };
}

/** Engage cost and drain for a power set: Rook's tuning comes with the dash. */
export function shiftTuning(powers) {
  return powers.includes("dash") ? SHIFT.tuned : SHIFT.base;
}

// ── Resonance ────────────────────────────────────────────────────────────────

/**
 * Voss can hear every shift. A short tap is nearly silent and a long hold is
 * loud; the powers ring it once each. It only decays once you have stopped
 * shifting for a moment, so a string of taps still adds up.
 */
export const RESONANCE = {
  max: 100,
  quietFor: 1.5,
  quietRate: 6,
  loudRate: 20,
  idleDelay: 2,
  decay: 8,
  warn: 50,
  whisper: 75,
  // A line fires once per climb and rearms when the meter falls back under
  // these, so a meter hovering on a threshold does not nag.
  warnRearm: 40,
  whisperRearm: 65,
  cooldown: 45,
  events: { dash: 4, rewind: 10, timeLock: 8 },
};

/** Hunter responses allowed per level, by difficulty index (Easy..Nightmare). */
const HUNTER_CAPS = [1, 2, 3, 3];

export function hunterCap(difficulty) {
  return HUNTER_CAPS[difficulty] ?? HUNTER_CAPS[1];
}

/**
 * The "Hunter response" setting: 0 Auto, 1 On, 2 Story only, 3 Off. Auto is
 * Story only on Easy and On above it (spec decision 3).
 * @returns {"on"|"story"|"off"}
 */
export function hunterPolicy(setting, difficulty) {
  if (setting === 1) return "on";
  if (setting === 2) return "story";
  if (setting === 3) return "off";
  return difficulty === 0 ? "story" : "on";
}

export function newResonance() {
  return { value: 0, shiftTime: 0, idleTime: 0, cooldown: 0, responses: 0, warned: false, whispered: false };
}

/**
 * Advance the meter. Mutates `r` and returns the lines and responses this step
 * set off: "warn" (ARIA at 50), "whisper" (Voss at 75), "hunt" (at 100).
 * @param {ReturnType<typeof newResonance>} r
 * @param {{ dt: number, shifting: boolean, add?: number, policy: string,
 *   cap: number, bossLevel: boolean, cooldown?: number }} input
 */
export function stepResonance(r, { dt, shifting, add = 0, policy, cap, bossLevel, cooldown = RESONANCE.cooldown }) {
  const events = [];
  if (policy === "off") return events;
  const R = RESONANCE;
  r.cooldown = Math.max(0, r.cooldown - dt);
  if (shifting) {
    const quiet = Math.max(0, Math.min(dt, R.quietFor - r.shiftTime));
    r.value += quiet * R.quietRate + (dt - quiet) * R.loudRate;
    r.shiftTime += dt;
    r.idleTime = 0;
  } else {
    r.shiftTime = 0;
    r.idleTime += dt;
    const decaying = Math.max(0, Math.min(dt, r.idleTime - R.idleDelay));
    r.value -= decaying * R.decay;
  }
  r.value = Math.max(0, Math.min(R.max, r.value + add));

  if (r.value < R.warnRearm) r.warned = false;
  if (r.value < R.whisperRearm) r.whispered = false;
  if (!r.warned && r.value >= R.warn) {
    r.warned = true;
    events.push("warn");
  }
  if (!r.whispered && r.value >= R.whisper) {
    r.whispered = true;
    events.push("whisper");
  }
  if (
    r.value >= R.max &&
    policy === "on" &&
    !bossLevel &&
    r.cooldown <= 0 &&
    r.responses < cap
  ) {
    events.push("hunt");
    r.value = 0;
    r.responses++;
    r.cooldown = cooldown;
    r.warned = false;
    r.whispered = false;
  }
  return events;
}

/**
 * Where a hunter rift opens: a floor cell 8-12 tiles from the player that the
 * pack can walk to them from, out of their line of sight when there is one.
 * @returns {{x:number, y:number}|null} a cell centre
 */
export function pickRiftCell(map, player, rng = Math.random, { min = 8, max = 12 } = {}) {
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  if (!isPassable(map, px, py)) return null;
  // Reachable floor, by a flood from the player's cell.
  const seen = new Uint8Array(map.width * map.height);
  const queue = [py * map.width + px];
  seen[queue[0]] = 1;
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i] % map.width;
    const r = (queue[i] / map.width) | 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (!isPassable(map, nc, nr)) continue;
      const k = nr * map.width + nc;
      if (seen[k]) continue;
      seen[k] = 1;
      queue.push(k);
    }
  }
  const hidden = [];
  const seenOnes = [];
  for (const k of queue) {
    const x = (k % map.width) + 0.5;
    const y = ((k / map.width) | 0) + 0.5;
    const d = Math.hypot(x - player.x, y - player.y);
    if (d < min || d > max) continue;
    (hasLineOfSight(map, player.x, player.y, x, y) ? seenOnes : hidden).push({ x, y });
  }
  const pool = hidden.length ? hidden : seenOnes;
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

// ── Rewind Echo ──────────────────────────────────────────────────────────────

/** Rewind's health rule: the better of now and then, but never more than +cap. */
export function rewindHealth(now, then, cap = POWERS.rewind.healCap) {
  return Math.min(Math.max(now, then), now + cap);
}

/**
 * The last few seconds of the player: `{ t, x, y, angle, health }` samples.
 * It lives on the runtime, so it never survives a level load: a rewind is a
 * move, not a save-scum.
 */
export class RewindBuffer {
  constructor(window = POWERS.rewind.window) {
    this.window = window;
    this.samples = [];
  }

  push(t, snap) {
    this.samples.push({ t, ...snap });
    // Keep one sample older than the window, so "three seconds ago" is
    // always answerable once three seconds have passed.
    while (this.samples.length > 2 && this.samples[1].t <= t - this.window) this.samples.shift();
  }

  oldest() {
    return this.samples[0] ?? null;
  }

  /** The first sample at or after `t`, or the oldest one when `t` predates them all. */
  sampleAt(t) {
    for (const s of this.samples) if (s.t >= t - 1e-9) return s;
    return this.samples[this.samples.length - 1] ?? null;
  }

  /** The most health the player had inside the window: what a rewind can undo. */
  maxHealth() {
    return this.samples.reduce((m, s) => Math.max(m, s.health), 0);
  }

  clear() {
    this.samples.length = 0;
  }
}

// ── Time-Lock ────────────────────────────────────────────────────────────────

/**
 * Kael's line: a plane of frozen time `ahead` tiles in front of the player,
 * across where they look, `width` tiles wide. `n` is its normal (the facing),
 * `t` runs along it.
 */
export function makeTimeLock(x, y, angle, now, spec = POWERS.timeLock) {
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  return {
    cx: x + nx * spec.ahead,
    cy: y + ny * spec.ahead,
    nx,
    ny,
    tx: -ny,
    ty: nx,
    half: spec.width / 2,
    born: now,
    until: now + spec.duration,
    caught: 0,
    held: [],
  };
}

/** Where the segment (x0,y0)→(x1,y1) crosses the lock, or null. */
export function lockCrossing(lock, x0, y0, x1, y1) {
  const d0 = (x0 - lock.cx) * lock.nx + (y0 - lock.cy) * lock.ny;
  const d1 = (x1 - lock.cx) * lock.nx + (y1 - lock.cy) * lock.ny;
  if ((d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0) || d0 === d1) return null;
  const f = d0 / (d0 - d1);
  const x = x0 + (x1 - x0) * f;
  const y = y0 + (y1 - y0) * f;
  const along = (x - lock.cx) * lock.tx + (y - lock.cy) * lock.ty;
  if (Math.abs(along) > lock.half) return null;
  return { x, y };
}

/** Is (x, y) standing in the frozen slab? Enemies there run at `slow`. */
export function inLockSlab(lock, x, y, depth = POWERS.timeLock.depth) {
  const dx = x - lock.cx;
  const dy = y - lock.cy;
  return Math.abs(dx * lock.nx + dy * lock.ny) <= depth && Math.abs(dx * lock.tx + dy * lock.ty) <= lock.half;
}

// ── Foresight ────────────────────────────────────────────────────────────────

/** Walk from (x, y) along `angle` for `dist` tiles, stopping short of walls. */
function walk(map, x, y, angle, dist, step = 0.1) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let travelled = 0;
  while (travelled < dist) {
    const s = Math.min(step, dist - travelled);
    const nx = x + dx * s;
    const ny = y + dy * s;
    if (!isPassable(map, Math.floor(nx + dx * 0.2), Math.floor(ny + dy * 0.2))) break;
    x = nx;
    y = ny;
    travelled += s;
  }
  return { x, y };
}

/**
 * Lyra's model: where an enemy will stand `horizon` seconds from now, at
 * normal speed, from the intent the AI exposes (`_moveAngle`, `_moveSpeed`,
 * or a beast's charge line). An enemy holding still stays put.
 */
export function predictEnemy(e, map, horizon = POWERS.foresight.horizon) {
  if (e._chargeState === "sprint") {
    const speed = (e.speed ?? e.def?.speed ?? 0) * (e.def?.chargeSpeedMul ?? 1);
    return walk(map, e.x, e.y, e._chargeAngle ?? 0, speed * horizon);
  }
  if (e.state === "chase" && e._moveSpeed > 0) {
    return walk(map, e.x, e.y, e._moveAngle ?? 0, e._moveSpeed * horizon);
  }
  return { x: e.x, y: e.y };
}

/**
 * The thin red line of a telegraphed attack: a windup aims at its target, a
 * beast's charge windup down the lane it is about to run.
 */
export function windupLine(e, target) {
  if (e._chargeState === "windup") {
    const len = (e.speed ?? e.def?.speed ?? 0) * (e.def?.chargeSpeedMul ?? 1) * (e.def?.chargeDuration ?? 0.9);
    const a = e._chargeAngle ?? 0;
    return { x0: e.x, y0: e.y, x1: e.x + Math.cos(a) * len, y1: e.y + Math.sin(a) * len };
  }
  if (e.state === "windup") return { x0: e.x, y0: e.y, x1: target.x, y1: target.y };
  return null;
}

/** Dotted path of a round in flight: points every `step` tiles until a wall. */
export function projectilePath(p, map, seconds = 1.2, step = 0.25) {
  const out = [];
  const len = Math.min(p.speed * seconds, 18);
  for (let d = step; d <= len; d += step) {
    const x = p.x + p.dirX * d;
    const y = p.y + p.dirY * d;
    if (!isPassable(map, Math.floor(x), Math.floor(y))) break;
    out.push({ x, y });
  }
  return out;
}

// ── Runtime ──────────────────────────────────────────────────────────────────

/** Seconds between rewind samples. */
const SAMPLE_EVERY = 0.05;
/** The Hound's shimmer: a new drawn position this often, like a bad frame rate. */
const STUTTER_EVERY = 0.12;
const TRAIL_EVERY = 0.1;
const TRAIL_LEN = 4;
const FOOTPRINT_EVERY = 0.9;
const FOOTPRINTS = 8;
const TICK_EVERY = 0.55;
/** Voss's whisper is his, not the tactician's. */
const VOSS_WHISPER = { speaker: "VOSS", color: "#ff2a4a", voice: "lord", emotion: "menacing" };

/**
 * One game's Chronos state. `startLevel` on every level load (it forgets the
 * rewind buffer and the lock), `update` once per frame.
 */
export class ChronoPowers {
  constructor() {
    this.powers = [];
    this.resonanceOn = false;
    this.res = newResonance();
    this.cooldowns = { dash: 0, rewind: 0, timeLock: 0 };
    this.buffer = new RewindBuffer();
    this.lock = null;
    this.echo = null;
    this.rifts = [];
    this.clock = 0;
    this.caughtTotal = 0;
    this._sampleIn = 0;
    this._announced = false;
    this._pool = "chronoShiftActivated";
    this.gifts = [];
    this.freshGifts = [];
    this.rules = huntRules(1, 0);
    /** The Final Form's stopped time (src/systems/eleven-seconds.js). */
    this.stop = new ElevenSeconds();
    this._decoyLine = 0;
  }

  /** Read the slot from the game and forget everything from the last level. */
  startLevel(game) {
    const campaign = game.mode === "campaign";
    const act = game.campaign?.act ?? 1;
    const level = game.campaign?.level ?? 0;
    const actDef = getAct(act);
    const entry = getActLevel(act, level);
    const difficulty = game.settings?.difficulty ?? 1;
    const ngPlus = campaign ? (game.campaign?.ngPlusCycle ?? 0) : 0;
    this.powers = campaign ? powersFor(act, level, { ngPlus }) : [];
    // What the allies who stayed behind left in the suit, and which of those
    // arrived at this slot (for ARIA's line).
    this.gifts = campaign ? giftsFor(act, level, { ngPlus }) : [];
    this.freshGifts = campaign ? (entry?.gifts ?? []).filter((g) => this.gifts.includes(g)) : [];
    this.policy = campaign && actDef?.resonance ? hunterPolicy(game.settings?.hunterResponse ?? 0, difficulty) : "off";
    this.resonanceOn = this.policy !== "off";
    this.rules = huntRules(difficulty, ngPlus);
    this.cap = this.rules.cap;
    this.bossLevel = !!entry?.boss;
    this.hunters = actDef?.hunters ?? [];
    this.act = act;
    this._pool = actDef?.resonance ? "chronoShiftLoud" : "chronoShiftActivated";
    this.res = newResonance();
    this.cooldowns = { dash: 0, rewind: 0, timeLock: 0 };
    this.buffer.clear();
    this._releaseLock();
    this.echo = null;
    this.rifts = [];
    this.clock = 0;
    this.caughtTotal = 0;
    if (game.player) {
      game.player.chronoDashMult = 1;
      // Form 2's hold on your shift never follows you out of the fight.
      game.player.counterShifted = 0;
    }
    this._sampleIn = 0;
    this._announced = false;
    this._decoyLine = 0;
    this.stop.reset();
    /** Powers granted at this slot, for the unlock line and teach card. */
    this.fresh = campaign && !(game.campaign?.ngPlusCycle > 0) ? (entry?.grants ?? []) : [];
  }

  has(id) {
    return this.powers.includes(id);
  }

  /** A power's numbers, with its parting gift applied once it has one. */
  spec(id) {
    const base = POWERS[id];
    return this.gifts.includes(id) ? { ...base, ...GIFTS[id] } : base;
  }

  /** Foresight draws while you shift, or always once Lyra has left you hers. */
  foresightOn(player) {
    return this.has("foresight") && (!!player?.chronoActive || !!this.spec("foresight").passive);
  }

  // ── Eleven Seconds: the questions the rest of the game asks ──

  /** Is this enemy held still (or driven) by the Final Form's stopped time? */
  frozen(e) {
    return this.stop.frozen(e);
  }

  playerFrozen() {
    return this.stop.playerFrozen();
  }

  holdsProjectile(p) {
    return this.stop.holdsProjectile(p);
  }

  damageScale(e) {
    return this.stop.damageScale(e);
  }

  timeStopped() {
    return this.stop.stopped;
  }

  engageCost() {
    return shiftTuning(this.powers).engage;
  }

  drainRate() {
    return shiftTuning(this.powers).drain;
  }

  /** Seconds left on a power's cooldown, and its fraction remaining (0..1). */
  cooldown(id) {
    const left = this.cooldowns[id] ?? 0;
    const full = (POWERS[id] && this.spec(id).cooldown) ?? 1;
    return { left, frac: Math.max(0, Math.min(1, left / full)) };
  }

  /** The first shift of a level: governed in Act I, loud from Act II. */
  onShiftStart(game) {
    // The tutorial and the other modes keep their own shift; this is the story's.
    if (this._announced || game.mode !== "campaign") return;
    this._announced = true;
    game.queueAriaMessage?.(this._pool);
    playChronoSound(game.audio, this.resonanceOn ? "shiftLoud" : "shift");
  }

  isInvulnerable(player) {
    return !!(player.isDashing && player.chronoDashMult > 1);
  }

  /**
   * A dash while shifting, once Rook has tuned the shard: chrono instead of
   * stamina, 2.2x as far, untouchable the whole way, on its own cooldown.
   * Returns false to hand the press to the ordinary dash.
   */
  tryChronoDash(game, dirX, dirY) {
    const p = game.player;
    if (!p.chronoActive || !this.has("dash") || this.stop.playerFrozen()) return false;
    const spec = this.spec("dash");
    if (this.cooldowns.dash > 0 || p.isDashing || p.chronoEnergy < spec.cost) return false;
    p.chronoEnergy -= spec.cost;
    p.isDashing = true;
    p.dashTime = 0.15;
    p.dashDirX = dirX;
    p.dashDirY = dirY;
    p.chronoDashMult = spec.distance;
    this.cooldowns.dash = spec.cooldown;
    this._ring(game, "dash");
    playChronoSound(game.audio, "dash");
    return true;
  }

  /** Nova's rewind: back three seconds, an echo left where you stood. */
  tryRewind(game) {
    if (!this.has("rewind") || this.stop.playerFrozen()) return false;
    const spec = this.spec("rewind");
    const p = game.player;
    if (this.cooldowns.rewind > 0 || p.chronoEnergy < spec.cost || p.alive === false) return false;
    const then = this.buffer.sampleAt(this.clock - spec.window);
    if (!then) return false;
    // What the rewind undoes, for the Precinct's teach room.
    const lost = this.buffer.maxHealth() - p.health;
    p.chronoEnergy -= spec.cost;
    this.echo = { x: p.x, y: p.y, angle: p.angle, born: this.clock, until: this.clock + spec.echoLife };
    p.x = then.x;
    p.y = then.y;
    p.angle = then.angle;
    p.health = rewindHealth(p.health, then.health);
    // A rewind cancels a dash in flight, Chrono Dash or not.
    p.isDashing = false;
    p.chronoDashMult = 1;
    this.buffer.clear();
    this.cooldowns.rewind = spec.cooldown;
    this._ring(game, "rewind");
    playChronoSound(game.audio, "rewind");
    game.chronoHazards?.notify?.("rewind", { lost });
    return true;
  }

  /** Kael's Time-Lock. It does not need a shift. */
  tryTimeLock(game) {
    if (!this.has("timeLock") || this.stop.playerFrozen()) return false;
    const spec = this.spec("timeLock");
    const p = game.player;
    if (this.cooldowns.timeLock > 0 || p.chronoEnergy < spec.cost) return false;
    p.chronoEnergy -= spec.cost;
    this._releaseLock();
    this.lock = makeTimeLock(p.x, p.y, p.angle, this.clock, spec);
    this.cooldowns.timeLock = spec.cooldown;
    this._ring(game, "timeLock");
    playChronoSound(game.audio, "lock");
    return true;
  }

  /**
   * A round moved from (x0,y0) to (x1,y1) this step: an enemy round that
   * crossed the lock stops there and hangs. Returns true when it was caught.
   */
  captureProjectile(p, x0, y0, x1, y1) {
    const lock = this.lock;
    if (!lock || p.owner !== "enemy" || p.frozen) return false;
    const hit = lockCrossing(lock, x0, y0, x1, y1);
    if (!hit) return false;
    p.x = hit.x;
    p.y = hit.y;
    p.frozen = true;
    lock.caught++;
    lock.held.push(p);
    // Across every lock this level: the Foundry's seal counts them.
    this.caughtTotal++;
    return true;
  }

  /** Multiplier on an enemy's dt: a tenth inside the lock's slab. */
  enemyTimeScale(e) {
    return this.lock && inLockSlab(this.lock, e.x, e.y) ? POWERS.timeLock.slow : 1;
  }

  /** Hunters pay out; the Foundry and Salvage Deck count kills while shifting. */
  onEnemyKill(game, enemy) {
    if (enemy?._hunter) {
      const p = game.player;
      p.chronoEnergy = Math.min(p.maxChronoEnergy, p.chronoEnergy + 40);
    }
    game.chronoHazards?.notify?.("kill", { enemy, shifting: !!game.player.chronoActive });
  }

  /**
   * @param {object} game
   * @param {number} dt - sim seconds (already time-scaled)
   * @param {number} realDt - wall seconds: cooldowns, the lock and the echo
   */
  update(game, dt, realDt) {
    const p = game.player;
    // Arena, meltdown and the rest start without calling startLevel: a
    // campaign's powers must not follow the player there (spec decision 5).
    if (game.mode !== "campaign" && (this.powers.length || this.resonanceOn)) this.startLevel(game);
    // The Hunter response setting can change mid-level.
    if (game.mode === "campaign" && getAct(this.act)?.resonance) {
      this.policy = hunterPolicy(game.settings?.hunterResponse ?? 0, game.settings?.difficulty ?? 1);
      this.resonanceOn = this.policy !== "off";
    }
    this.clock += realDt;
    for (const k of Object.keys(this.cooldowns)) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - realDt);

    this._sampleIn -= realDt;
    if (this._sampleIn <= 0) {
      this._sampleIn = SAMPLE_EVERY;
      this.buffer.push(this.clock, { x: p.x, y: p.y, angle: p.angle, health: p.health });
    }

    if (this.lock && this.clock >= this.lock.until) this._releaseLock();
    if (this.echo && this.clock >= this.echo.until) this.echo = null;
    this.rifts = this.rifts.filter((r) => this.clock - r.born < 2.5);

    if (this.resonanceOn) {
      const events = stepResonance(this.res, {
        dt: realDt,
        shifting: !!p.chronoActive,
        add: this._pendingRing ?? 0,
        policy: this.policy,
        cap: this.cap,
        bossLevel: this.bossLevel,
        cooldown: this.rules.cooldown,
      });
      this._pendingRing = 0;
      for (const ev of events) this._onResonance(game, ev);
    }

    this._updatePhased(game, realDt);
    this.stop.update(game, realDt);
  }

  /** Spawn a hunter pack out of a rift; `scripted` ignores the meter and caps. */
  huntNow(game, { scripted = false, rng = Math.random } = {}) {
    if (!this.hunters.length || (!scripted && this.policy !== "on")) return [];
    const cell = pickRiftCell(game.map, game.player, rng);
    if (!cell) return [];
    const diff = game.getDifficultyMultipliers?.() ?? { healthMul: 1, damageMul: 1, speedMul: 1 };
    const scale = getAct(this.act)?.scale ?? 1;
    const { packMin, packMax } = this.rules;
    const count = packMin + Math.floor(rng() * (packMax - packMin + 1));
    const pack = [];
    for (let i = 0; i < count; i++) {
      const type = this.hunters[i % this.hunters.length];
      if (!ENEMY_TYPES[type]) continue;
      const a = (i / count) * Math.PI * 2;
      let x = cell.x + Math.cos(a) * 0.6;
      let y = cell.y + Math.sin(a) * 0.6;
      if (!isPassable(game.map, Math.floor(x), Math.floor(y))) {
        x = cell.x;
        y = cell.y;
      }
      const e = new Enemy(x, y, type);
      e.health = Math.floor(e.health * diff.healthMul * scale);
      e.maxHealth = e.health;
      e.def = { ...e.def, damage: Math.floor(e.def.damage * diff.damageMul * scale), speed: e.def.speed * diff.speedMul };
      // Hunters come for you: no idle, no alert range to wander into.
      e.state = "chase";
      e.alertRange = 99;
      e._hunter = true;
      game.entities.push(e);
      pack.push(e);
    }
    this.rifts.push({ x: cell.x, y: cell.y, born: this.clock });
    game.queueAriaMessage?.("hunterResponse");
    playChronoSound(game.audio, "rift", { x: cell.x, y: cell.y, player: game.player });
    return pack;
  }

  _ring(game, id) {
    if (!this.resonanceOn) return;
    // Rook's last tune: a gifted Chrono Dash rings nothing.
    this._pendingRing = (this._pendingRing ?? 0) + (this.spec(id)?.resonance ?? RESONANCE.events[id] ?? 0);
  }

  _onResonance(game, ev) {
    if (ev === "warn") game.queueAriaMessage?.("resonanceRising");
    else if (ev === "whisper") {
      const w = VOSS_WHISPER;
      game.ariaComms?.queueSquadMessage?.(w.speaker, "lordHearsYou", w.color, null, { voice: w.voice, emotion: w.emotion });
      playChronoSound(game.audio, "whisper");
    } else if (ev === "hunt") {
      // IV-4: the pack he sends goes after Nova instead, and she says so.
      const decoy = game.chronoHazards?.piece?.decoy;
      if (decoy) this._decoyTakes(game, decoy);
      else this.huntNow(game);
    }
  }

  /** The hunters a decoy draws off: a line from her, and nothing comes through. */
  _decoyTakes(game, decoy) {
    const lines = decoy.lines ?? [];
    if (lines.length) game.squadComms?.say?.(decoy.member, lines[this._decoyLine++ % lines.length]);
    playChronoSound(game.audio, "whisper");
  }

  _releaseLock() {
    if (!this.lock) return;
    // The rounds it held drop out of the air, harmlessly.
    for (const p of this.lock.held) p.active = false;
    this.lock = null;
  }

  /**
   * The Hound (and anything else `phased`): always visible, never solid until
   * you shift. The renderer draws it from a stuttered position with a trail
   * of afterimages and scorched footprints; you hear it tick first.
   */
  _updatePhased(game, realDt) {
    const p = game.player;
    for (const e of game.entities) {
      if (e.type !== "enemy" || !e.def?.phased) continue;
      e._phased = e.active && !p.chronoActive;
      const s = (e._shimmer ??= { x: e.x, y: e.y, t: 0, trail: [], trailIn: 0, steps: [], stepAt: { x: e.x, y: e.y }, tickIn: 0 });
      s.t -= realDt;
      if (s.t <= 0) {
        s.t = STUTTER_EVERY;
        s.x = e.x;
        s.y = e.y;
      }
      s.trailIn -= realDt;
      if (s.trailIn <= 0) {
        s.trailIn = TRAIL_EVERY;
        s.trail.unshift({ x: e.x, y: e.y });
        if (s.trail.length > TRAIL_LEN) s.trail.length = TRAIL_LEN;
      }
      if (Math.hypot(e.x - s.stepAt.x, e.y - s.stepAt.y) >= FOOTPRINT_EVERY) {
        s.steps.unshift({ x: e.x, y: e.y, t: this.clock });
        if (s.steps.length > FOOTPRINTS) s.steps.length = FOOTPRINTS;
        s.stepAt = { x: e.x, y: e.y };
      }
      s.tickIn -= realDt;
      if (s.tickIn <= 0 && e.active) {
        s.tickIn = TICK_EVERY;
        playChronoSound(game.audio, "tick", { x: e.x, y: e.y, player: p });
      }
    }
  }
}
