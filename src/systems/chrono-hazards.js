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
 *   collapse  cells fill with rubble step by step once a zone triggers it;
 *             if the front reaches you it catches you once (one hit, never
 *             lethal) and sets you down on the last landing you passed
 *   blade     a rotor: arms sweep a disc (dashable: a Chrono Dash goes through)
 *   vent      a zone that burns for `on` seconds out of every `period`
 *   gate      a laser line on the same cycle, or a turret firing real rounds
 *             a Time-Lock can catch
 *   piston    cells that slam shut for `on` seconds of every `period`: they
 *             never close on you; they hit you and shove you out instead
 *   train     a train running down a line on a timetable: its body sweeps
 *             the track from `a` to `b`, and knocks you off it
 *   stasis    a room frozen at one instant: story, never damage. One that
 *             `holds` keeps the enemies inside it frozen mid-step until you
 *             leave through its `release` zone or hurt one of them
 *   loop      leaving through the seam puts you back at the start, until you
 *             cross it while shifting (or, with `breaksOn: "rewind"`, until
 *             you rewind back through it just after it threw you back)
 *   rewrite   walls that close and open on the level clock (Act III's
 *             rewritten station): a closing cell waits for whoever stands in
 *             it, and a rewrite only ever reopens the cells it closed
 *
 * A set piece may also carry an `objective` (racks to burn, valves to turn
 * against a heat clock): stations you hold still in, a seal it opens when
 * they are all done, and a card drawn like a teach card.
 *
 * In NG+ every hazard is harder (`ngPlusHazard`).
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
const REHIT = { blade: 0.5, vent: 0.3, gate: 0.3, piston: 0.6, train: 1 };

/**
 * What the rubble costs when a collapse catches you, by difficulty (Easy,
 * Normal, Hard, Nightmare). One hit per catch, never below 1 HP.
 */
export const COLLAPSE_HIT = [5, 10, 20, 20];
/** Seconds from being set down on a landing until the front reaches it again. */
export const COLLAPSE_GRACE = 1.6;
/** The card the second catch brings up. */
export const COLLAPSE_HINT = {
  title: "{SHIFT} — OUTRUN IT IN TIME",
  hint: "ARIA: \"It falls at a crawl while you shift, and you don't.\" {SHIFT} as the red line closes, and run.",
};

/** The one hit a catch costs on this difficulty. */
export function collapseHit(difficulty = 1) {
  return COLLAPSE_HIT[difficulty] ?? COLLAPSE_HIT[1];
}

/** The collapse step the body at (x, y) stands in, or -1 outside its path. */
export function collapseStepAt(h, x, y) {
  const c = Math.floor(x);
  const r = Math.floor(y);
  return h.steps.findIndex((s) => s.some(([sc, sr]) => sc === c && sr === r));
}

/** The last landing at or behind step `at` (the first landing if none). */
export function collapseLanding(h, at) {
  const lands = h.landings?.length ? h.landings : [0];
  let best = lands[0];
  for (const l of lands) if (l <= at && l > best) best = l;
  return Math.min(best, at);
}

/**
 * Where a caught runner is set down on landing step `land`: its open cell
 * nearest the step's middle, facing on up the path.
 */
export function landingSpot(h, land, grid) {
  const centre = (cells) => {
    const n = cells.length || 1;
    return { x: cells.reduce((a, [c]) => a + c + 0.5, 0) / n, y: cells.reduce((a, [, r]) => a + r + 0.5, 0) / n };
  };
  const cells = h.steps[land].filter(([c, r]) => grid[r]?.[c] === 0);
  const pool = cells.length ? cells : h.steps[land];
  const mid = centre(pool);
  let best = pool[0];
  for (const cell of pool) {
    if (Math.hypot(cell[0] + 0.5 - mid.x, cell[1] + 0.5 - mid.y) < Math.hypot(best[0] + 0.5 - mid.x, best[1] + 0.5 - mid.y)) best = cell;
  }
  const ahead = centre(h.steps[Math.min(h.steps.length - 1, land + 3)]);
  const x = best[0] + 0.5;
  const y = best[1] + 0.5;
  return { x, y, dir: Math.atan2(ahead.y - y, ahead.x - x) };
}

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
 * A train's body along its line at `clock`, as distances from `a`: the
 * head and the tail, or null while the line is empty between runs.
 */
export function trainSpan(h, clock) {
  const len = Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y);
  const t = (((clock + (h.phase ?? 0)) % h.period) + h.period) % h.period;
  const head = t * h.speed;
  const tail = head - h.length;
  if (tail >= len) return null;
  return { head: Math.min(head, len), tail: Math.max(0, tail), len };
}

/** Does the train touch a body at (x, y)? */
export function trainHits(h, clock, x, y, body = BODY) {
  const span = trainSpan(h, clock);
  if (!span) return false;
  const ux = (h.b.x - h.a.x) / span.len;
  const uy = (h.b.y - h.a.y) / span.len;
  const along = (x - h.a.x) * ux + (y - h.a.y) * uy;
  const across = Math.abs(-(x - h.a.x) * uy + (y - h.a.y) * ux);
  return across < h.half + body && along > span.tail - body && along < span.head + body;
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
 * Spec decision 10: in NG+ the set pieces get harder. Per cycle (up to three)
 * collapses and rotors run a quarter faster, vents and laser gates burn a
 * little longer (never more than three quarters of their cycle, so a gap is
 * always there), and turrets fire a fifth faster.
 */
export function ngPlusHazard(h, ngPlus = 0) {
  const c = Math.min(3, Math.max(0, ngPlus | 0));
  if (!c) return h;
  const fast = 1 + 0.25 * c;
  switch (h.type) {
    case "collapse":
      return { ...h, rate: h.rate * fast, delay: (h.delay ?? 0) / fast };
    case "blade":
      return { ...h, speed: h.speed * fast };
    case "vent":
      return { ...h, on: Math.min(h.period * 0.75, h.on * (1 + 0.15 * c)) };
    case "gate":
      return h.kind === "turret"
        ? { ...h, interval: h.interval / (1 + 0.2 * c) }
        : { ...h, on: Math.min(h.period * 0.75, h.on * (1 + 0.15 * c)) };
    default:
      return h;
  }
}

/** Sim seconds after a loop throws you back in which a rewind breaks it. */
export const LOOP_REWIND_WINDOW = 4;

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
      return { on: cycleOn(h, clock), priming: !cycleOn(h, clock) && cycleOn(h, clock + (h.warn ?? 0.5)) };
    case "gate":
      return h.kind === "turret" ? { firing: true } : { on: cycleOn(h, clock), priming: !cycleOn(h, clock) && cycleOn(h, clock + (h.warn ?? 0.5)) };
    case "piston":
      return { closed: cycleOn(h, clock), priming: !cycleOn(h, clock) && cycleOn(h, clock + 0.5) };
    case "train": {
      const span = trainSpan(h, clock);
      // The horn: the next run is under a second and a half away.
      return { span, horn: !span && !!trainSpan(h, clock + 1.5) };
    }
    case "loop":
      return { broken: triggeredAt != null };
    case "stasis":
      return { broken: triggeredAt != null };
    case "rewrite":
      return rewriteState(h, clock);
    default:
      return {};
  }
}

/**
 * A rewriting wall: closed for `on` seconds of every `period`, and priming
 * (its cells flicker) for `warn` seconds before it closes.
 */
export function rewriteState(h, clock) {
  const closed = cycleOn(h, clock);
  return { closed, priming: !closed && cycleOn(h, clock + (h.warn ?? 1)) };
}

/**
 * Heat after `dClock` more seconds of level clock: it climbs at `rate`, and
 * at `max` it overloads (the caller pulses) and falls back to `reset`.
 * @returns {{ heat: number, overload: boolean }}
 */
export function stepHeat(spec, heat, dClock) {
  const next = heat + dClock * spec.rate;
  if (next >= spec.max) return { heat: spec.reset, overload: true };
  return { heat: next, overload: false };
}

/** An objective's card hint with its progress filled in. */
export function objectiveHint(o) {
  return o.hintTemplate
    .replace("{DONE}", String(o.cleared.length))
    .replace("{COUNT}", String(o.stations.length))
    .replace("{HEAT}", String(Math.round(o.heat)));
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
    this.objective = null;
    this.inStasis = false;
    this._owned = {};
    this._hitAt = {};
    this._loopedAt = {};
    this._game = null;
    this._pending = {};
    this._filled = {};
    this._reached = {};
    this._cleared = new Set();
    this.caught = 0;
    this.hint = null;
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
    const ngPlus = game.campaign?.ngPlusCycle ?? 0;
    this.hazards = (piece.hazards ?? []).map((h) => ngPlusHazard(h, ngPlus));
    const grid = game.map.grid;
    for (const [c, r] of piece.seals ?? []) if (grid[r]?.[c] === 0) grid[r][c] = SEAL_TILE;
    for (const [c, r] of piece.open ?? []) if (grid[r]?.[c] != null) grid[r][c] = 0;
    if (piece.cache) game.spawnGearCache?.(piece.cache.x, piece.cache.y);
    for (const h of this.hazards) if (h.type === "stasis" && h.holds) this._hold(game, h);
    if (piece.objective) this._loadObjective(game, piece.objective);

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
    if (kind === "rewind") this._rewindThroughSeam();
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
    this._game = game;
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
        if (h.holds && this.triggers[h.id] == null) this._watchHold(game, h);
        if (this.triggers[h.id] == null && cellIn(h.rect, p.x, p.y)) this.inStasis = true;
      } else if (h.type === "loop") this._loop(game, h);
      else if (h.type === "rewrite") this._rewrite(game, h);
      else if (h.type === "piston") this._piston(game, h);
      else if (h.type === "train") {
        if (trainHits(h, this.clock, p.x, p.y)) this._trainHit(game, h);
      }
    }
    if (this.objective) this._updateObjective(game, dt, this.clock - prevClock);

    for (const s of this.piece.scripted ?? []) {
      if (this._entered.has(s.id) || !cellIn(s.rect, p.x, p.y)) continue;
      this._entered.add(s.id);
      if (s.hunt && game.chronoPowers?.resonanceOn) game.chronoPowers.huntNow(game, { scripted: true });
      if (s.squad) game.squadComms?.say?.(s.squad.member, s.squad.text, { joining: !!s.squad.joining });
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
    const gap = h.rehit ?? REHIT[h.type] ?? 0.4;
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

  /**
   * A crusher: its cells are wall while it is closed. It never closes on you
   * or an enemy; if you are under it when it comes down it hits you and
   * shoves you out the nearer side.
   */
  _piston(game, h) {
    const grid = game.map.grid;
    const mine = (this._filled[h.id] ??= new Set());
    if (!cycleOn(h, this.clock)) {
      for (const key of mine) {
        const r = Math.floor(key / 1000);
        const c = key % 1000;
        if (grid[r]?.[c] === (h.wall ?? 3)) grid[r][c] = 0;
      }
      mine.clear();
      return;
    }
    const p = game.player;
    const [c1, r1, c2, r2] = h.rect;
    if (bodyIn(h.rect, p.x, p.y)) {
      this._hit(game, h);
      // Out the nearer side, along the way you were crossing.
      const wide = c2 - c1 >= r2 - r1;
      if (!wide) p.x = p.x - c1 < c2 + 1 - p.x ? c1 - BODY - 0.05 : c2 + 1 + BODY + 0.05;
      else p.y = p.y - r1 < r2 + 1 - p.y ? r1 - BODY - 0.05 : r2 + 1 + BODY + 0.05;
      playChronoSound(game.audio, "collapse");
    }
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const key = r * 1000 + c;
        if (mine.has(key) || grid[r]?.[c] !== 0) continue;
        if (Math.floor(p.x) === c && Math.floor(p.y) === r) continue;
        const occupied = game.entities.some(
          (e) => e.type === "enemy" && e.active && e.state !== "dead" && Math.floor(e.x) === c && Math.floor(e.y) === r,
        );
        if (occupied) continue;
        grid[r][c] = h.wall ?? 3;
        mine.add(key);
      }
    }
  }

  /** A train: one hit, and it throws you clear of the track. */
  _trainHit(game, h) {
    const p = game.player;
    const last = this._hitAt[h.id];
    if (last != null && this._simTime - last < REHIT.train) return;
    this._hit(game, h);
    const len = Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y);
    const nx = -(h.b.y - h.a.y) / len;
    const ny = (h.b.x - h.a.x) / len;
    const side = (p.x - h.a.x) * nx + (p.y - h.a.y) * ny >= 0 ? 1 : -1;
    const open = (x, y) => game.map.grid[Math.floor(y)]?.[Math.floor(x)] === 0;
    for (const s of [side, -side]) {
      for (const d of [h.half + 0.45, h.half + 1.45, h.half + 2.45]) {
        const across = (p.x - h.a.x) * nx + (p.y - h.a.y) * ny;
        const x = p.x + nx * (s * d - across);
        const y = p.y + ny * (s * d - across);
        if (open(x, y) && !trainHits(h, this.clock, x, y)) {
          p.x = x;
          p.y = y;
          game.screenShake = Math.max(game.screenShake ?? 0, 9);
          playChronoSound(game.audio, "collapse");
          return;
        }
      }
    }
  }

  /**
   * A collapse chases you along its steps. It never fills the step you stand
   * on or anything ahead of it, and it never deals damage over time: when
   * the front reaches you it catches you once (`_catchCollapse`). Back out of
   * its start before you finish it and it re-arms instead of sealing you out.
   */
  _collapse(game, h) {
    const p = game.player;
    const at = collapseStepAt(h, p.x, p.y);
    if (this.triggers[h.id] == null) {
      if (!cellIn(h.trigger, p.x, p.y)) return;
      this.triggers[h.id] = this.clock;
      this._reached[h.id] = Math.max(0, at);
      playChronoSound(game.audio, "collapse");
      if (h.aria && !this._entered.has("collapse:told")) {
        this._entered.add("collapse:told");
        game.queueAriaMessage?.(h.aria);
      }
    }
    if (at >= 0) this._reached[h.id] = Math.max(this._reached[h.id] ?? 0, at);
    if (at < 0 && !this._cleared.has(h.id)) {
      // Out of its path: through the far end (it may come down now), or
      // back out of the start, or in a side room off it (it waits).
      if ((this._reached[h.id] ?? 0) >= h.steps.length - 2) this._cleared.add(h.id);
      else if (collapseFront(h, this.clock, this.triggers[h.id]) < 0) {
        this._rearmCollapse(game, h);
        return;
      } else return;
    }
    const front = collapseFront(h, this.clock, this.triggers[h.id]);
    if (front < 0) return;
    const grid = game.map.grid;
    const done = (this._pending[h.id] ??= new Set());
    const filled = (this._filled[h.id] ??= new Set());
    for (let i = 0; i <= front; i++) {
      // Never trap: the step you stand on and everything ahead of it wait.
      if (at >= 0 && i >= at) break;
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
        filled.add(key);
      }
    }
    // A Chrono Dash is untouchable, even by a ceiling.
    if (at >= 0 && front >= at && !game.chronoPowers?.isInvulnerable(p)) this._catchCollapse(game, h, at);
  }

  /** Clear what a collapse filled from step `from` on, so it can fall again. */
  _unfill(game, h, from = 0) {
    const grid = game.map.grid;
    const done = this._pending[h.id];
    const filled = this._filled[h.id];
    if (!filled) return;
    for (let i = from; i < h.steps.length; i++) {
      for (const [c, r] of h.steps[i]) {
        const key = r * 1000 + c;
        if (!filled.has(key)) continue;
        if (grid[r]?.[c] === (h.wall ?? 3)) grid[r][c] = 0;
        filled.delete(key);
        done?.delete(key);
      }
    }
  }

  /** You backed out before it really started: as if it never went off. */
  _rearmCollapse(game, h) {
    this._unfill(game, h, 0);
    delete this.triggers[h.id];
    delete this._reached[h.id];
  }

  /**
   * The rubble caught you. One hit, never lethal; a shake; and you are set
   * down on the last landing you passed with the front re-armed behind it.
   * The second time in a level, the card says how to outrun it.
   */
  _catchCollapse(game, h, at) {
    const p = game.player;
    const land = collapseLanding(h, at);
    this._unfill(game, h, land);
    const spot = landingSpot(h, land, game.map.grid);
    p.x = spot.x;
    p.y = spot.y;
    p.angle = spot.dir;
    p.isDashing = false;
    p.isSliding = false;
    // The front comes back to the landing COLLAPSE_GRACE seconds from now.
    this.triggers[h.id] = this.clock + COLLAPSE_GRACE - (h.delay ?? 0) - land / h.rate;
    this._reached[h.id] = land;

    const hit = Math.min(collapseHit(game.settings?.difficulty), Math.max(0, p.health - 1));
    if (hit > 0) {
      p.health -= hit;
      game.roundDamageTaken = (game.roundDamageTaken ?? 0) + hit;
    }
    p.hurtTime = game.time;
    game.screenShake = Math.max(game.screenShake ?? 0, 12);
    game.audio?.playerHit?.();
    playChronoSound(game.audio, "collapse");
    this.caught++;
    if (this.caught === 1) game.queueAriaMessage?.("collapseCaught");
    else if (this.caught === 2) {
      this.hint = { card: COLLAPSE_HINT, power: "shift", at: this.clock };
      game.queueAriaMessage?.("collapseHoldShift");
    }
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
    if (p.chronoActive && (h.breaksOn ?? "shift") === "shift") {
      this._breakLoop(h, game);
      return;
    }
    p.x = h.back.x;
    p.y = h.back.y;
    // A rewind now takes you back through the seam, in time rather than space.
    this._loopedAt[h.id] = this._simTime;
    playChronoSound(game.audio, "loop");
    if (!this._entered.has(`${h.id}:told`)) {
      this._entered.add(`${h.id}:told`);
      game.queueAriaMessage?.(h.breaksOn === "rewind" ? "loopRewind" : "loopRepeats");
    }
  }

  _breakLoop(h, game = this._game) {
    this.triggers[h.id] = this.clock; // the seam breaks
    game?.queueAriaMessage?.("loopBroken");
    playChronoSound(game?.audio, "seal");
  }

  /** IV-2: a rewind soon after the loop threw you back breaks a rewind-seamed loop. */
  _rewindThroughSeam() {
    for (const h of this.hazards) {
      if (h.type !== "loop" || h.breaksOn !== "rewind" || this.triggers[h.id] != null) continue;
      const at = this._loopedAt[h.id];
      if (at != null && this._simTime - at <= LOOP_REWIND_WINDOW) this._breakLoop(h);
    }
  }

  /** Is anyone (the player, or a live enemy) standing in cell (c, r)? */
  _occupied(game, c, r) {
    const p = game.player;
    if (bodyIn([c, r, c, r], p.x, p.y)) return true;
    return game.entities.some(
      (e) => e.type === "enemy" && e.active && e.state !== "dead" && bodyIn([c, r, c, r], e.x, e.y, 0.25),
    );
  }

  /**
   * Walls that close and open on the level clock. A closing cell waits for
   * whoever stands in it, so a rewrite never traps anyone, and it only ever
   * opens the cells it closed itself.
   */
  _rewrite(game, h) {
    const { closed } = rewriteState(h, this.clock);
    const grid = game.map.grid;
    const wall = h.wall ?? SEAL_TILE;
    const own = (this._owned[h.id] ??= new Set());
    for (const [c, r] of h.cells) {
      const key = r * 1000 + c;
      if (closed) {
        if (own.has(key) || grid[r]?.[c] !== 0 || this._occupied(game, c, r)) continue;
        grid[r][c] = wall;
        own.add(key);
      } else if (own.has(key)) {
        if (grid[r][c] === wall) grid[r][c] = 0;
        own.delete(key);
      }
    }
    if (h.aria && !this._entered.has("rewrite:told")) {
      const p = game.player;
      if (h.cells.some(([c, r]) => Math.hypot(c + 0.5 - p.x, r + 0.5 - p.y) < 5)) {
        this._entered.add("rewrite:told");
        game.queueAriaMessage?.(h.aria);
      }
    }
  }

  /** Freeze the enemies inside a holding stasis field, mid-step. */
  _hold(game, h) {
    for (const e of game.entities) {
      if (e.type !== "enemy" || !cellIn(h.rect, e.x, e.y)) continue;
      e._stasis = h.id;
      e._stasisHp = e.health;
      // The AI skips anything EMP-disabled: no step, no shot, no alert.
      e._empDisabledUntil = Infinity;
    }
  }

  /** The field breaks when you leave through its `release`, or hurt what it holds. */
  _watchHold(game, h) {
    const p = game.player;
    const held = game.entities.filter((e) => e._stasis === h.id);
    const hurt = held.some((e) => !e.active || e.health < e._stasisHp);
    if (!hurt && !(h.release && cellIn(h.release, p.x, p.y))) return;
    this.triggers[h.id] = this.clock;
    for (const e of held) {
      e._empDisabledUntil = 0;
      e._stasis = null;
      if (e.state === "dead" || !e.active) continue;
      e.state = "chase";
      e.stateTime = 0;
      e.alertRange = 99;
      // Woken, not firing: the first shot waits a full attack cycle.
      e.lastAttackTime = game.time ?? 0;
    }
    playChronoSound(game.audio, "collapse");
    if (h.aria) game.queueAriaMessage?.(h.aria);
    if (h.squad) game.squadComms?.say?.(h.squad.member, h.squad.text);
  }

  _loadObjective(game, spec) {
    const grid = game.map.grid;
    for (const [c, r] of spec.seal ?? []) if (grid[r]?.[c] === 0) grid[r][c] = SEAL_TILE;
    const o = {
      ...spec,
      hintTemplate: spec.card.hint,
      card: { ...spec.card },
      cleared: [],
      held: {},
      heat: 0,
      heatOn: !!spec.heatClock && !spec.heatClock.trigger,
      heatWarned: false,
      overloads: 0,
      overloadAt: null,
      done: false,
      doneAt: null,
    };
    o.card.hint = objectiveHint(o);
    this.objective = o;
  }

  /**
   * Stand in a station for `hold` seconds (sim time) to clear it; `order`
   * takes them one at a time. A heat clock climbs on the level clock, so a
   * shift stretches the window, and every station cleared cools it by `drop`.
   */
  _updateObjective(game, dt, dClock) {
    const o = this.objective;
    if (o.done) return;
    const p = game.player;
    const hs = o.heatClock;
    if (hs) {
      if (!o.heatOn && cellIn(hs.trigger, p.x, p.y)) {
        o.heatOn = true;
        if (hs.aria) game.queueAriaMessage?.(hs.aria);
      }
      if (o.heatOn) {
        const step = stepHeat(hs, o.heat, dClock);
        o.heat = step.heat;
        if (step.overload) {
          o.overloads++;
          o.overloadAt = this.clock;
          o.heatWarned = false;
          game.damagePlayer?.(hs.damage);
          game.screenShake = Math.max(game.screenShake ?? 0, 10);
          playChronoSound(game.audio, "collapse");
          if (hs.overloadAria) game.queueAriaMessage?.(hs.overloadAria);
        } else if (!o.heatWarned && o.heat >= hs.warnAt) {
          o.heatWarned = true;
          if (hs.warnAria) game.queueAriaMessage?.(hs.warnAria);
        } else if (o.heat < hs.warnAt - 20) o.heatWarned = false;
      }
    }
    const next = o.stations.find((s) => !o.cleared.includes(s.id));
    for (const s of o.stations) {
      if (o.cleared.includes(s.id) || (o.order && s !== next)) continue;
      if (bodyIn(s.rect, p.x, p.y, 0)) {
        o.held[s.id] = (o.held[s.id] ?? 0) + dt;
        if (o.held[s.id] >= o.hold) this._clearStation(game, s);
      } else {
        o.held[s.id] = Math.max(0, (o.held[s.id] ?? 0) - dt * 2);
      }
    }
    if (o.cleared.length === o.stations.length) {
      o.done = true;
      o.doneAt = this.clock;
      const grid = game.map.grid;
      for (const [c, r] of o.seal ?? []) if (grid[r]?.[c] === SEAL_TILE) grid[r][c] = 0;
      playChronoSound(game.audio, "seal");
      if (o.doneAria) game.queueAriaMessage?.(o.doneAria);
      if (o.doneLine) game.squadComms?.say?.(o.doneLine.member, o.doneLine.text);
    }
    o.card.hint = objectiveHint(o);
  }

  _clearStation(game, s) {
    const o = this.objective;
    o.cleared.push(s.id);
    const grid = game.map.grid;
    for (const [c, r] of s.burn ?? []) if (grid[r]?.[c]) grid[r][c] = o.burnTile ?? 4;
    if (o.heatClock) o.heat = Math.max(0, o.heat - o.heatClock.drop);
    playChronoSound(game.audio, "seal");
    if (s.line) game.squadComms?.say?.(s.line.member, s.line.text);
    else if (o.stationAria) game.queueAriaMessage?.(o.stationAria);
  }

  /** The state a save needs: the clock and when each hazard was set off. */
  serialize() {
    const o = this.objective;
    return {
      clock: this.clock,
      triggers: { ...this.triggers },
      ...(o ? { objective: { cleared: [...o.cleared], heat: o.heat, heatOn: o.heatOn } } : {}),
    };
  }

  restore(state) {
    if (!state) return;
    this.clock = state.clock ?? 0;
    this.triggers = { ...(state.triggers ?? {}) };
    const o = this.objective;
    if (o && state.objective) {
      o.cleared = o.stations.filter((s) => state.objective.cleared?.includes(s.id)).map((s) => s.id);
      o.heat = state.objective.heat ?? 0;
      o.heatOn = !!state.objective.heatOn;
      o.card.hint = objectiveHint(o);
    }
  }
}

/** The teach card to show, if any: `{ card, power, done, age }`. */
export function activeTeachCard(hazards) {
  const t = hazards?.teach;
  if (!t?.card) return null;
  return { card: t.card, power: t.power, done: t.done, progress: t.progress, goal: t.goal };
}

