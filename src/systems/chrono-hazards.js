/**
 * Chrono hazards: the set pieces you get through by bending time.
 *
 * Spec docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md
 * §5. Every hazard advances on one level clock that runs at
 * `dt × (shifting ? 0.15 : 1)`, the convention enemies already use, and its
 * state is a pure function of that clock and the moment it was triggered:
 * `hazardState` below. The runtime (`ChronoHazards`) only reads that state
 * and applies it: damage, grid writes for a collapse, rounds for a turret, a
 * teleport for a loop. So `serialize()` is two numbers per hazard and a
 * restore resumes a collapse mid-fall exactly where it was.
 *
 *   collapse  cells fill with rubble step by step once a zone triggers it
 *   blade     a rotor: arms sweep a disc (dashable: a Chrono Dash goes through)
 *   vent      a zone that burns for `on` seconds out of every `period`
 *   gate      a laser line on the same cycle, or a turret firing real rounds
 *             a Time-Lock can catch
 *   stasis    a room frozen at one instant: story, never damage
 *   loop      leaving through the seam puts you back at the start, until you
 *             cross it while shifting
 *
 * The set piece's teach room lives here too: its seal, the room it clears,
 * the enemies it adds, its goal and the card (drawn by the HUD).
 */
import { Enemy, Projectile } from "../../js/entities.js";
import { getAct } from "../data/campaign/acts.js";
import { SEAL_TILE, setPieceFor } from "../data/campaign/set-pieces.js";
import { playChronoSound } from "../audio/chrono-sounds.js";

/** The level clock's rate while the player shifts. */
export const HAZARD_CHRONO = 0.15;
/** The player's body, for hazard contact. */
const BODY = 0.3;
/** Seconds between two hits from the same hazard (sim time). */
const REHIT = { blade: 0.5, vent: 0.3, gate: 0.3, collapse: 0.35 };

const cellIn = ([c1, r1, c2, r2], x, y) => x >= c1 && x < c2 + 1 && y >= r1 && y < r2 + 1;

/** Is the body at (x, y) touching the rect? */
const bodyIn = ([c1, r1, c2, r2], x, y, r = BODY) => x + r > c1 && x - r < c2 + 1 && y + r > r1 && y - r < r2 + 1;

/** `on` seconds out of every `period`, starting `phase` in. */
export function cycleOn(h, clock) {
  const t = (((clock + (h.phase ?? 0)) % h.period) + h.period) % h.period;
  return t < h.on;
}

/** The last step of a collapse that should be rubble, or -1 before it starts. */
export function collapseFront(h, clock, triggeredAt) {
  if (triggeredAt == null) return -1;
  const t = clock - triggeredAt - (h.delay ?? 0);
  if (t < 0) return -1;
  return Math.min(h.steps.length - 1, Math.floor(t * h.rate));
}

/** The rotor's angle at `clock`. */
export function bladeAngle(h, clock) {
  return (h.phase ?? 0) + h.speed * clock;
}

/** Does any arm of the rotor touch a body at (x, y)? */
export function bladeHits(h, clock, x, y, body = BODY) {
  const dx = x - h.x;
  const dy = y - h.y;
  if (Math.hypot(dx, dy) > h.radius + body) return false;
  const a0 = bladeAngle(h, clock);
  for (let i = 0; i < h.arms; i++) {
    const a = a0 + (i * Math.PI * 2) / h.arms;
    const along = dx * Math.cos(a) + dy * Math.sin(a);
    const across = -dx * Math.sin(a) + dy * Math.cos(a);
    if (along >= -body && along <= h.radius && Math.abs(across) <= h.width / 2 + body) return true;
  }
  return false;
}

/** Distance from (x, y) to the segment a-b. */
function segDist(a, b, x, y) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / len2));
  return Math.hypot(x - (a.x + vx * t), y - (a.y + vy * t));
}

/**
 * Shot times of a turret in (from, to]: every `interval` a burst of `burst`
 * rounds `gap` apart.
 */
export function turretShots(h, from, to) {
  const out = [];
  const burst = h.burst ?? 1;
  const gap = h.gap ?? 0;
  const first = Math.max(0, Math.floor(from / h.interval) - 1);
  for (let k = first; k * h.interval <= to; k++) {
    for (let i = 0; i < burst; i++) {
      const t = k * h.interval + i * gap;
      if (t > from && t <= to) out.push(t);
    }
  }
  return out;
}

/**
 * Everything drawable or dangerous about a hazard at `clock`: the one place
 * the renderer, the HUD and the runtime read.
 */
export function hazardState(h, clock, triggeredAt = null) {
  switch (h.type) {
    case "collapse":
      return { front: collapseFront(h, clock, triggeredAt), triggered: triggeredAt != null };
    case "blade":
      return { angle: bladeAngle(h, clock) };
    case "vent":
      return { on: cycleOn(h, clock), priming: !cycleOn(h, clock) && cycleOn(h, clock + 0.5) };
    case "gate":
      return h.kind === "turret" ? { firing: true } : { on: cycleOn(h, clock), priming: !cycleOn(h, clock) && cycleOn(h, clock + 0.5) };
    case "loop":
      return { broken: triggeredAt != null };
    default:
      return {};
  }
}

export class ChronoHazards {
  constructor() {
    this.reset();
  }

  reset() {
    this.piece = null;
    this.hazards = [];
    this.clock = 0;
    this.triggers = {};
    this.teach = null;
    this.inStasis = false;
    this._hitAt = {};
    this._pending = {};
    this._simTime = 0;
    this._entered = new Set();
    this._prev = null;
  }

  /**
   * Lay the level entry's set piece over the freshly loaded level: seals,
   * blown doors, the cleared teach room and its enemies, a cache. Call before
   * the level counts its enemies.
   */
  load(game, entry) {
    this.reset();
    const piece = game.mode === "campaign" ? setPieceFor(entry) : null;
    if (!piece) return;
    this.piece = piece;
    this.hazards = piece.hazards ?? [];
    const grid = game.map.grid;
    for (const [c, r] of piece.seals ?? []) if (grid[r]?.[c] === 0) grid[r][c] = SEAL_TILE;
    for (const [c, r] of piece.open ?? []) if (grid[r]?.[c] != null) grid[r][c] = 0;
    if (piece.cache) game.spawnGearCache?.(piece.cache.x, piece.cache.y);

    const t = piece.teach;
    if (t) {
      this.teach = { ...t, progress: 0, done: false, shownAt: 0, doneAt: null };
      for (const [c, r] of t.seal ?? []) if (grid[r]?.[c] === 0) grid[r][c] = SEAL_TILE;
      if (t.clear) {
        game.entities = game.entities.filter((e) => e.type !== "enemy" || !cellIn(t.clear, e.x, e.y));
      }
      this._spawnTeach(game);
    }
  }

  _spawnTeach(game) {
    const t = this.teach;
    if (!t?.spawn) return 0;
    const diff = game.getDifficultyMultipliers?.() ?? { healthMul: 1, damageMul: 1, speedMul: 1 };
    const scale = getAct(game.campaign?.act ?? 1)?.scale ?? 1;
    for (const s of t.spawn) {
      const e = new Enemy(s.x, s.y, s.type);
      e.health = Math.floor(e.health * diff.healthMul * scale);
      e.maxHealth = e.health;
      e.def = { ...e.def, damage: Math.floor(e.def.damage * diff.damageMul * scale), speed: e.def.speed * diff.speedMul };
      e._teach = true;
      game.entities.push(e);
    }
    return t.spawn.length;
  }

  /** Teach goals hear about kills, rewinds and catches from the powers. */
  notify(kind, data = {}) {
    const t = this.teach;
    if (!t || t.done) return;
    const g = t.goal;
    if (kind === "kill" && g.kind === "shiftKills" && data.enemy?._teach && data.shifting) t.progress++;
    else if (kind === "rewind" && g.kind === "rewind" && (data.lost ?? 0) >= g.damage) t.progress = 1;
    else if (kind === "catch" && g.kind === "catches") t.progress++;
    else if (kind === "reach" && g.kind === "reach") t.progress = 1;
  }

  _goalMet() {
    const t = this.teach;
    const need = t.goal.count ?? 1;
    return t.progress >= need;
  }

  _completeTeach(game) {
    const t = this.teach;
    t.done = true;
    t.doneAt = this.clock;
    const grid = game.map.grid;
    for (const [c, r] of t.seal ?? []) if (grid[r]?.[c] === SEAL_TILE) grid[r][c] = 0;
    if (t.seal?.length) playChronoSound(game.audio, "seal");
    for (const id of t.stopOnDone ?? []) {
      const h = this.hazards.find((hz) => hz.id === id);
      if (h) h.stopped = true;
    }
    game.queueAriaMessage?.("teachDone");
  }

  /**
   * @param {object} game
   * @param {number} dt - sim seconds (already time-scaled)
   */
  update(game, dt) {
    if (!this.piece) return;
    if (game.mode !== "campaign") {
      this.reset();
      return;
    }
    const p = game.player;
    const prevClock = this.clock;
    this.clock += dt * (p.chronoActive ? HAZARD_CHRONO : 1);
    this._simTime += dt;
    this.inStasis = false;

    for (const h of this.hazards) {
      if (h.stopped) continue;
      if (h.type === "collapse") this._collapse(game, h);
      else if (h.type === "blade") {
        if (bladeHits(h, this.clock, p.x, p.y)) this._hit(game, h);
      } else if (h.type === "vent") {
        if (cycleOn(h, this.clock) && bodyIn(h.rect, p.x, p.y)) this._hit(game, h);
      } else if (h.type === "gate" && h.kind === "turret") this._turret(game, h, prevClock);
      else if (h.type === "gate") {
        if (cycleOn(h, this.clock) && segDist(h.a, h.b, p.x, p.y) < BODY + 0.1) this._hit(game, h);
      } else if (h.type === "stasis") {
        if (cellIn(h.rect, p.x, p.y)) this.inStasis = true;
      } else if (h.type === "loop") this._loop(game, h);
    }

    for (const s of this.piece.scripted ?? []) {
      if (this._entered.has(s.id) || !cellIn(s.rect, p.x, p.y)) continue;
      this._entered.add(s.id);
      if (s.hunt && game.chronoPowers?.resonanceOn) game.chronoPowers.huntNow(game, { scripted: true });
      if (s.squad) game.squadComms?.say?.(s.squad.member, s.squad.text);
    }
    const enter = this.piece.enter;
    if (enter && !this._entered.has("enter") && cellIn(enter.rect, p.x, p.y)) {
      this._entered.add("enter");
      game.queueAriaMessage?.(enter.aria);
    }

    const t = this.teach;
    if (t && !t.done) {
      if (t.goal.kind === "reach" && cellIn(t.goal.rect, p.x, p.y)) this.notify("reach");
      if (t.goal.kind === "catches") t.progress = game.chronoPowers?.caughtTotal ?? t.progress;
      if (this._goalMet()) this._completeTeach(game);
      else if (t.goal.kind === "shiftKills" && t.spawn && !game.entities.some((e) => e._teach && e.active && e.state !== "dead")) {
        // Killed them all without shifting: the lesson comes round again.
        game.totalEnemies = (game.totalEnemies ?? 0) + this._spawnTeach(game);
      }
    }
    this._prev = { x: p.x, y: p.y };
  }

  _hit(game, h) {
    const gap = REHIT[h.type] ?? 0.4;
    const last = this._hitAt[h.id];
    if (last != null && this._simTime - last < gap) return;
    // A Chrono Dash goes through anything flagged dashable, and its i-frames
    // cover the rest (game.damagePlayer checks them).
    if (h.dashable && game.chronoPowers?.isInvulnerable(game.player)) return;
    this._hitAt[h.id] = this._simTime;
    game.damagePlayer?.(h.damage);
    if (h.type === "blade") playChronoSound(game.audio, "blade");
    else if (h.type === "vent") playChronoSound(game.audio, "vent");
  }

  _collapse(game, h) {
    const p = game.player;
    if (this.triggers[h.id] == null && cellIn(h.trigger, p.x, p.y)) {
      this.triggers[h.id] = this.clock;
      playChronoSound(game.audio, "collapse");
      if (h.aria && !this._entered.has("collapse:told")) {
        this._entered.add("collapse:told");
        game.queueAriaMessage?.(h.aria);
      }
    }
    const front = collapseFront(h, this.clock, this.triggers[h.id]);
    if (front < 0) return;
    const pc = Math.floor(p.x);
    const pr = Math.floor(p.y);
    const playerStep = h.steps.findIndex((s) => s.some(([c, r]) => c === pc && r === pr));
    const grid = game.map.grid;
    const done = (this._pending[h.id] ??= new Set());
    for (let i = 0; i <= front; i++) {
      // Never trap: the step you stand on and everything ahead of it wait.
      if (playerStep >= 0 && i >= playerStep) break;
      for (const [c, r] of h.steps[i]) {
        const key = r * 1000 + c;
        if (done.has(key)) continue;
        if (grid[r]?.[c] !== 0) {
          done.add(key);
          continue;
        }
        const occupied = game.entities.some(
          (e) => e.type === "enemy" && e.active && e.state !== "dead" && Math.floor(e.x) === c && Math.floor(e.y) === r,
        );
        if (occupied) continue;
        grid[r][c] = h.wall ?? 3;
        done.add(key);
      }
    }
    if (playerStep >= 0 && front >= playerStep) this._hit(game, h);
  }

  _turret(game, h, prevClock) {
    const shots = turretShots(h, prevClock, this.clock);
    if (!shots.length) return;
    const p = game.player;
    const echo = game.chronoPowers?.echo;
    // The echo decoy draws the sentry's next burst.
    const target = echo ?? p;
    let angle = h.angle ?? 0;
    if (h.aim === "player") {
      if (Math.hypot(target.x - h.x, target.y - h.y) > (h.range ?? 14)) return;
      angle = Math.atan2(target.y - h.y, target.x - h.x);
    } else if (Math.hypot(p.x - h.x, p.y - h.y) > (h.range ?? 14) + 6) return;
    for (let i = 0; i < shots.length; i++) {
      const spread = h.aim === "player" ? (i - (shots.length - 1) / 2) * 0.02 : 0;
      const a = angle + spread;
      const round = new Projectile(h.x + Math.cos(a) * 0.3, h.y + Math.sin(a) * 0.3, Math.cos(a), Math.sin(a), h.damage, h.speed, "enemy");
      round.color = "#ffb347";
      round._hazard = h.id;
      game.projectiles?.push(round);
      game.entities?.push(round);
    }
    game.audio?.enemyShoot?.(game.audio.calculatePan?.(h.x, h.y, p.x, p.y, p.angle) ?? 0);
  }

  _loop(game, h) {
    const p = game.player;
    const prev = this._prev;
    if (!prev || this.triggers[h.id] != null) return;
    const wasIn = cellIn(h.rect, prev.x, prev.y);
    if (!wasIn || cellIn(h.rect, p.x, p.y)) return;
    // Out through the seam, not back the way you came.
    const side = (pt) => Math.sign((h.seamB.x - h.seamA.x) * (pt.y - h.seamA.y) - (h.seamB.y - h.seamA.y) * (pt.x - h.seamA.x));
    if (side(p) !== side(h.out)) return;
    if (p.chronoActive) {
      this.triggers[h.id] = this.clock; // the seam breaks
      game.queueAriaMessage?.("loopBroken");
      playChronoSound(game.audio, "seal");
      return;
    }
    p.x = h.back.x;
    p.y = h.back.y;
    playChronoSound(game.audio, "loop");
    if (!this._entered.has(`${h.id}:told`)) {
      this._entered.add(`${h.id}:told`);
      game.queueAriaMessage?.("loopRepeats");
    }
  }

  /** The state a save needs: the clock and when each hazard was set off. */
  serialize() {
    return { clock: this.clock, triggers: { ...this.triggers } };
  }

  restore(state) {
    if (!state) return;
    this.clock = state.clock ?? 0;
    this.triggers = { ...(state.triggers ?? {}) };
  }
}

/** The teach card to show, if any: `{ card, power, done, age }`. */
export function activeTeachCard(hazards) {
  const t = hazards?.teach;
  if (!t?.card) return null;
  return { card: t.card, power: t.power, done: t.done, progress: t.progress, goal: t.goal };
}

