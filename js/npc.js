/**
 * Friendly characters in the world: officers in the locker room, the
 * Supervisor walking you to the range, the office floor's staff and clerks.
 * They are not enemies: no AI, no hit box, nothing to shoot (every combat
 * check asks for type "enemy"). A scene drives them: walk a route, turn to
 * face someone, salute, point the way, leave.
 *
 * They draw on the enemies' sprite rig (src/rendering/svg-art/sprites/
 * humanoids.js) from their NPC_TYPES def; `gesture` picks a held pose.
 *
 * Walking is a person's, not a cursor's: they ease into a stride and out of
 * it, round corners instead of pivoting on a waypoint, turn at a human rate,
 * and keep out of each other's way. Each one walks a shared route a little to
 * one side of it (its lane); a walker gives anyone standing, and the player,
 * a sidestep's room; and one who comes up behind another going the same way
 * falls in behind and waits, a queue at the door rather than a stack in it.
 * The sprite reads `stride` (the step cycle, advanced by ground covered),
 * `moveSpeed`, `lean` and `gestureT` to pose them.
 */
import { NPC_TYPES } from "../src/data/npcs.js";

let _serial = 0;

/** Ground covered by one full step cycle (left and right foot), in map units. */
export const STRIDE = 1.25;
/** Seconds to reach walking speed from a standstill, and to stop from it. */
const ACCEL_S = 0.35;
const DECEL_S = 0.3;
/** Turning speed, radians a second, and how quickly the turn eases in. */
const TURN_RATE = 7;
/** How close two people come before they move apart (centre to centre). */
export const PERSONAL = 0.62;
/** Room left to the player. */
const PLAYER_ROOM = 0.7;
/** How far behind a walker going the same way another holds back. */
export const QUEUE_GAP = 0.85;
/** Waiting longer than this, a queued walker squeezes past instead. */
const QUEUE_PATIENCE = 2.2;
/** Within this of a waypoint that is not the last, start for the next one. */
const CORNER = 0.3;
/** Collision margin for the avoidance step against the map's walls. */
const MARGIN = 0.18;

/**
 * Where the people look for each other, the player and the walls: the game
 * (anything with `entities`, `player` and `map`). Set once by the game; a
 * scene with no world still walks its routes, just without the courtesy.
 */
let world = null;
export function setNpcWorld(w) {
  world = w;
}

const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

function clear(map, x, y) {
  const g = map?.grid;
  if (!g) return true;
  for (const [cx, cy] of [[x - MARGIN, y - MARGIN], [x + MARGIN, y - MARGIN], [x - MARGIN, y + MARGIN], [x + MARGIN, y + MARGIN]]) {
    const mx = Math.floor(cx);
    const my = Math.floor(cy);
    if (mx < 0 || my < 0 || my >= g.length || mx >= g[my].length || g[my][mx] !== 0) return false;
  }
  return true;
}

export class Npc {
  /**
   * @param {number} x
   * @param {number} y
   * @param {"officer"|"officerKit"|"rasczakKit"|"kaelKit"|"supervisor"|"supervisorKit"|"staff"|"clerk"} kind
   * @param {{ angle?: number, name?: string, look?: number }} [opts]
   *   `look` picks one of the kind's variants (a staff member in a lab coat
   *   or in coveralls); left out, the person gets one from their id.
   */
  constructor(x, y, kind, { angle = Math.PI / 2, name = null, look = null } = {}) {
    this.type = "npc";
    // The sprite rig is keyed by type, as an enemy's is.
    this.enemyType = kind;
    this.def = NPC_TYPES[kind];
    this.serial = ++_serial;
    this.id = `npc-${kind}-${this.serial}`;
    this.name = name ?? this.def?.name ?? kind;
    this.look = look;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.active = true;
    this.state = "idle";
    this.health = 1;
    this.maxHealth = 1;
    this.speed = this.def?.speed ?? 1.5;
    /** Points still to walk to, in order. */
    this.path = [];
    /** A held pose ("salute", "point", "cower"...) while standing still. */
    this.gesture = null;
    /** Seconds since the gesture began (the sprite eases the arm into it). */
    this.gestureT = 0;
    this._gestureLeft = 0;
    this._onArrive = null;
    this._leave = false;
    this._face = null;
    /** Ground speed now, easing toward `speed` and back to 0. */
    this.moveSpeed = 0;
    /** The step cycle: 0..1 is one left and one right step; .0 and .5 are footfalls. */
    this.stride = (this.serial % 2) * 0.5;
    /** Lean into a turn, radians (+ toward the person's right). */
    this.lean = 0;
    /** Sideways offset from a shared route, map units: everyone walks their own line. */
    this.lane = ((this.serial * 0.618034) % 1 - 0.5) * 0.5;
    /** True while held up behind someone. */
    this.waiting = false;
    this._waitT = 0;
    /** Where the last route segment started, for the lane's side. */
    this._from = null;
    /** Stopped by the pulse (freeze()): the "frozen" pose for good, and nothing moves them. */
    this.frozen = false;
  }

  /**
   * Walk a route ([{x, y}] or [[x, y]]), then `then()`; with `leave`, the NPC
   * is gone when it gets there (out of the door, off down the corridor).
   */
  walk(points, { then = null, leave = false, speed = null } = {}) {
    // A stopped person goes nowhere until thawed.
    if (this.frozen) return;
    this.path = points.map((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { ...p }));
    this._onArrive = then;
    this._leave = leave;
    this._from = { x: this.x, y: this.y };
    if (speed) this.speed = speed;
    this.gesture = null;
    this._face = null;
  }

  /** Hold a pose for `seconds` (Infinity: until told otherwise). */
  pose(name, seconds = 2) {
    if (name !== this.gesture) this.gestureT = 0;
    this.gesture = name;
    this._gestureLeft = seconds;
  }

  /**
   * Caught by the pulse: stopped where they stand, in the "frozen" pose, for
   * good. They do not turn, settle a step or give way to anyone; the
   * renderer drains their colour and gives them the echo (src/rendering/
   * frozen-look.js), and walking into them stops the player, not them
   * (src/systems/stillness.js). `face` turns them once, before the stop.
   */
  freeze({ face = null } = {}) {
    if (face) this.angle = Math.atan2(face.y - this.y, face.x - this.x);
    this.path = [];
    this._onArrive = null;
    this._face = null;
    this.moveSpeed = 0;
    this.waiting = false;
    this.frozen = true;
    this.pose("frozen", Infinity);
    // Caught at once, not eased into: the pose is whole from the first frame.
    this.gestureT = 1;
  }

  /** Let go of the instant: they stand as they were, and the scene may move them again. */
  thaw() {
    this.frozen = false;
    if (this.gesture === "frozen") this.gesture = null;
  }

  /** Change into another look (an officer into heavy armour): same person, new sprite. */
  dress(kind) {
    this.enemyType = kind;
    this.def = NPC_TYPES[kind] ?? this.def;
  }

  /** Keep turned toward someone (the player) while standing. */
  faceTo(target) {
    this._face = target;
  }

  get walking() {
    return this.path.length > 0;
  }

  /** Still finishing a step after the route ended (the sprite keeps walking frames). */
  get settling() {
    if (this.path.length) return false;
    const frac = (this.stride * 2) % 1;
    return this.moveSpeed > 0.05 || (frac > 0.02 && frac < 0.98);
  }

  update(dt) {
    if (!this.active || !(dt > 0)) return;
    if (this.gesture) {
      this.gestureT += dt;
      if (Number.isFinite(this._gestureLeft)) {
        this._gestureLeft -= dt;
        if (this._gestureLeft <= 0) this.gesture = null;
      }
    }
    // Held in the instant: no turn toward anyone, no last half-step, no sway.
    // (A bare pose("frozen") still finishes turning to whoever it faces.)
    if (this.frozen) return;
    if (!this.path.length) {
      this._stand(dt);
      return;
    }
    this._walk(dt);
  }

  /** Standing: come to rest on a footfall, turn toward whoever we face. */
  _stand(dt) {
    this.waiting = false;
    this._waitT = 0;
    if (this.moveSpeed > 0) {
      // The last half-step after the route ends: slow to a stop with both feet down.
      this.moveSpeed = Math.max(0, this.moveSpeed - (this.speed / DECEL_S) * dt);
      this._advanceStride(this.moveSpeed * dt);
    }
    this._settleStride(dt);
    if (this._face) this._turnTo(Math.atan2(this._face.y - this.y, this._face.x - this.x), dt, 0);
    this.lean += (0 - this.lean) * Math.min(1, dt * 6);
  }

  _walk(dt) {
    const p = this.path[0];
    const last = this.path.length === 1;
    const target = this._laneTarget(p, last);
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    // Round the corner: the next leg starts before this waypoint is reached.
    if (!last && d < CORNER) {
      this._from = { x: p.x, y: p.y };
      this.path.shift();
      this._walk(dt);
      return;
    }
    const hx = d > 1e-6 ? dx / d : Math.cos(this.angle);
    const hy = d > 1e-6 ? dy / d : Math.sin(this.angle);

    // Ease in from a standstill; ease out onto the final mark.
    let want = this.speed;
    if (last) want = Math.min(want, Math.sqrt(2 * (this.speed / DECEL_S) * d) + 0.15);
    const avoid = this._avoid(hx, hy, dt);
    want *= avoid.slow;
    const rate = want > this.moveSpeed ? this.speed / ACCEL_S : this.speed / DECEL_S;
    this.moveSpeed += Math.max(-rate * dt, Math.min(rate * dt, want - this.moveSpeed));
    const step = this.moveSpeed * dt;

    // Face where we are going (not where we are being nudged), at a human rate.
    const prev = this.angle;
    if (d > 1e-6) this._turnTo(Math.atan2(hy, hx), dt, this.moveSpeed);
    const turn = wrap(this.angle - prev) / dt;
    const leanTo = Math.max(-0.09, Math.min(0.09, turn * 0.03 * Math.min(1, this.moveSpeed / 1.5)));
    this.lean += (leanTo - this.lean) * Math.min(1, dt * 8);

    // Leaving, near enough is gone: two making for the same exit do not
    // jostle on its last few inches.
    if (last && d <= Math.max(step, this._leave ? 0.35 : 0.02)) {
      this.x = target.x;
      this.y = target.y;
      this._advanceStride(d);
      this.path.shift();
      if (this._leave) this.active = false;
      const then = this._onArrive;
      this._onArrive = null;
      then?.(this);
      return;
    }
    const bx = this.x + hx * Math.min(step, d);
    const by = this.y + hy * Math.min(step, d);
    let nx = bx + avoid.x * dt;
    let ny = by + avoid.y * dt;
    // The sidestep may not take anyone into a wall; the route itself is trusted.
    if ((avoid.x || avoid.y) && world?.map && !clear(world.map, nx, ny)) {
      if (clear(world.map, bx + avoid.x * dt, by)) ny = by;
      else if (clear(world.map, bx, by + avoid.y * dt)) nx = bx;
      else {
        nx = bx;
        ny = by;
      }
    }
    this._advanceStride(Math.hypot(nx - this.x, ny - this.y));
    this.x = nx;
    this.y = ny;
  }

  /**
   * A waypoint moved sideways by this walker's lane, so a squad on one route
   * walks it as a file of people rather than a single point. The final mark
   * of a route that ends somewhere (not a leave) is kept exact, and a lane
   * that would put the walker in a wall is dropped.
   */
  _laneTarget(p, last) {
    if (!this.lane || (last && !this._leave)) return p;
    const from = this._from ?? this;
    const sx = p.x - from.x;
    const sy = p.y - from.y;
    const len = Math.hypot(sx, sy);
    if (len < 1e-6) return p;
    const q = { x: p.x - (sy / len) * this.lane, y: p.y + (sx / len) * this.lane };
    return world?.map && !clear(world.map, q.x, q.y) ? p : q;
  }

  /**
   * Keep clear of the others and of the player. Returns a sideways velocity
   * (map units a second) and a speed factor: below 1 when someone walking
   * the same way is just ahead (queue behind them), or someone stands right
   * in the way (slow while stepping round).
   */
  _avoid(hx, hy, dt) {
    const out = { x: 0, y: 0, slow: 1 };
    if (!world) return out;
    let blocked = false;
    const others = world.entities || [];
    for (let i = 0; i < others.length; i++) {
      const o = others[i];
      if (o === this || o.type !== "npc" || !o.active) continue;
      // Queue: someone ahead, within the gap, walking our way. We fall in
      // behind them rather than stepping round (no overtaking in a file).
      const rx = o.x - this.x;
      const ry = o.y - this.y;
      const along = rx * hx + ry * hy;
      const across = Math.abs(rx * hy - ry * hx);
      const queued =
        along > 0 && along <= QUEUE_GAP && across <= PERSONAL * 0.8 && o.walking &&
        Math.cos(o.angle) * hx + Math.sin(o.angle) * hy >= 0.2 &&
        // Two each waiting on the other (converging at a merge): the elder goes first.
        !(o._blockedBy === this && this.serial < o.serial);
      this._keepClear(o, PERSONAL, hx, hy, out, !queued || this._waitT > QUEUE_PATIENCE);
      if (!queued) continue;
      blocked = true;
      this._blockedBy = o;
      // Close the gap to the one ahead at their pace, no faster.
      const room = Math.max(0, (along - PERSONAL * 0.9) / (QUEUE_GAP - PERSONAL * 0.9));
      out.slow = Math.min(out.slow, room + (1 - room) * Math.min(1, (o.moveSpeed || 0) / Math.max(0.1, this.speed)) * 0.9);
    }
    if (world.player) this._keepClear(world.player, PLAYER_ROOM, hx, hy, out);
    if (blocked) {
      // Patience runs out only behind someone stood still, not one walking slowly.
      if ((this._blockedBy?.moveSpeed ?? 0) < 0.3) this._waitT += dt;
      this.waiting = out.slow < 0.25;
      // Too long in line (the one ahead has stopped in a doorway): squeeze by.
      if (this._waitT > QUEUE_PATIENCE) out.slow = Math.max(out.slow, 0.45);
    } else {
      this._waitT = Math.max(0, this._waitT - dt * 2);
      this.waiting = false;
      this._blockedBy = null;
    }
    // Never sidestep faster than a walk.
    const v = Math.hypot(out.x, out.y);
    const cap = this.speed * 0.8;
    if (v > cap) {
      out.x *= cap / v;
      out.y *= cap / v;
    }
    return out;
  }

  /**
   * Push away from `o` when inside `room`, mostly sideways to our heading
   * (a sidestep, not a stagger backwards); something standing in the path
   * also slows us while we go round it.
   */
  _keepClear(o, room, hx, hy, out, sidestep = true) {
    const rx = this.x - o.x;
    const ry = this.y - o.y;
    const d = Math.hypot(rx, ry);
    const reach = room + 0.35;
    if (d >= reach) return;
    const ahead = -(rx * hx + ry * hy);
    // Which side to pass on: away from them, or our right if dead ahead.
    let side = rx * -hy + ry * hx;
    if (Math.abs(side) < 0.02) side = this.serial % 2 ? 1 : -1;
    const sx = -hy * Math.sign(side);
    const sy = hx * Math.sign(side);
    // Sidestep only what is in front: the one behind is theirs to mind.
    const k = sidestep && ahead > 0 ? (1 - d / reach) * this.speed * 1.6 : 0;
    out.x += sx * k;
    out.y += sy * k;
    if (d < room) {
      // Inside their space: straight apart as well.
      const ux = d > 1e-6 ? rx / d : sx;
      const uy = d > 1e-6 ? ry / d : sy;
      out.x += ux * (room - d) * 3;
      out.y += uy * (room - d) * 3;
    }
    if (ahead > 0 && !o.walking) out.slow = Math.min(out.slow, 0.55 + 0.45 * Math.min(1, d / reach));
  }

  _turnTo(a, dt, moving) {
    const diff = wrap(a - this.angle);
    // Ease into a turn: fast for a big one, gentle at the end of it. Walking,
    // the turn rate scales down a little so a corner is a curve.
    const max = TURN_RATE * (moving > 0.2 ? 0.75 : 1) * dt;
    const stepA = Math.sign(diff) * Math.min(Math.abs(diff), max, Math.abs(diff) * Math.min(1, dt * 12));
    this.angle = wrap(this.angle + stepA);
  }

  _advanceStride(dist) {
    this.stride = (this.stride + dist / STRIDE) % 1;
  }

  /** Stopped: finish the step in hand so both feet land, then stand. */
  _settleStride(dt) {
    const frac = (this.stride * 2) % 1;
    if (frac < 0.02 || frac > 0.98) return;
    const left = 1 - frac;
    this.stride = (this.stride + Math.min(left / 2, dt * 0.9)) % 1;
  }
}
