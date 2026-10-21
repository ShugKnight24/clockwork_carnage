/**
 * Friendly characters in the world: officers in the locker room, the
 * Supervisor walking you to the range. They are not enemies: no AI, no hit
 * box, nothing to shoot (every combat check asks for type "enemy"). A scene
 * drives them: walk a route, turn to face someone, salute, point the way,
 * leave.
 *
 * They draw on the enemies' sprite rig (src/rendering/svg-art/sprites/
 * humanoids.js) from their NPC_TYPES def; `gesture` picks a held pose.
 */
import { NPC_TYPES } from "../src/data/npcs.js";

let _serial = 0;

export class Npc {
  /**
   * @param {number} x
   * @param {number} y
   * @param {"officer"|"officerKit"|"supervisor"} kind
   * @param {{ angle?: number, name?: string }} [opts]
   */
  constructor(x, y, kind, { angle = Math.PI / 2, name = null } = {}) {
    this.type = "npc";
    // The sprite rig is keyed by type, as an enemy's is.
    this.enemyType = kind;
    this.def = NPC_TYPES[kind];
    this.id = `npc-${kind}-${++_serial}`;
    this.name = name ?? this.def?.name ?? kind;
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
    /** A held pose ("salute", "point") while standing still. */
    this.gesture = null;
    this._gestureLeft = 0;
    this._onArrive = null;
    this._leave = false;
    this._face = null;
  }

  /**
   * Walk a route ([{x, y}] or [[x, y]]), then `then()`; with `leave`, the NPC
   * is gone when it gets there (out of the door, off down the corridor).
   */
  walk(points, { then = null, leave = false, speed = null } = {}) {
    this.path = points.map((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { ...p }));
    this._onArrive = then;
    this._leave = leave;
    if (speed) this.speed = speed;
    this.gesture = null;
    this._face = null;
  }

  /** Hold a pose for `seconds` (Infinity: until told otherwise). */
  pose(name, seconds = 2) {
    this.gesture = name;
    this._gestureLeft = seconds;
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

  update(dt) {
    if (!this.active) return;
    if (this.gesture && Number.isFinite(this._gestureLeft)) {
      this._gestureLeft -= dt;
      if (this._gestureLeft <= 0) this.gesture = null;
    }
    if (!this.path.length) {
      if (this._face) this.angle = Math.atan2(this._face.y - this.y, this._face.x - this.x);
      return;
    }
    const p = this.path[0];
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d > 1e-6) this.angle = Math.atan2(dy, dx);
    if (d <= step) {
      this.x = p.x;
      this.y = p.y;
      this.path.shift();
      if (!this.path.length) {
        if (this._leave) this.active = false;
        const then = this._onArrive;
        this._onArrive = null;
        then?.(this);
      }
      return;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }
}
