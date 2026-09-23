/**
 * Eleven Seconds: the Paradox Lord's Final Form stops time.
 *
 * Spec docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md
 * §6, Form 3. He spends his own eleven seconds as a weapon, three times, at
 * 75%, 50% and 25% of his health, and loses because you are the fixed point.
 *
 *   telegraph  1.4 s. The clock winds down and a white ring closes on the
 *              screen. He stands with his hand raised and takes no damage.
 *   scripted   the first stop, 6 s, no input. Everything freezes, you too.
 *              He walks up and lands a heavy hit that never kills, says so
 *              on the comms plate, and then Lyra's recorded line plays: "It
 *              can bend everything. Except you."
 *   window     every later stop, eleven real seconds. Everything freezes
 *              but the two of you, and his armour freezes with the rest:
 *              double damage, and he drags it at 0.6x. He still comes for
 *              you, with a lunge that telegraphs (a windup, and Foresight's
 *              red line) before it lands.
 *
 * Rounds in flight when he stops time hang where they are and fly on when it
 * ends. Chrono-bombs hold their fuse. Other enemies stand still and their
 * attack timers wait with them.
 *
 * The rest of the game asks one question each: the AI `frozen(e)`, the
 * projectiles `holdsProjectile(p)`, the bombs `stopped`, damage
 * `damageScale(e)`, the player `playerFrozen()`. The renderer reads `view()`.
 * `ChronoPowers` owns the runtime and updates it with real seconds.
 */
import { isPassable } from "./physics.js";
import { playChronoSound } from "../audio/chrono-sounds.js";

export const ELEVEN = {
  /** Fractions of his health that each start a stop, in order. */
  thresholds: [0.75, 0.5, 0.25],
  telegraph: 1.4,
  scripted: {
    duration: 6,
    /** He starts walking once the world has stopped settling. */
    walkFrom: 0.6,
    walkSpeed: 3.2,
    reach: 1.3,
    hitAt: 3.6,
    /** A fraction of your full health; never more than leaves you at 1. */
    hitFrac: 0.35,
    lyraAt: 4.4,
  },
  window: {
    duration: 11,
    damage: 2,
    speed: 0.6,
    lungeEvery: 2.4,
    lungeRange: 7,
    windup: 0.8,
    lungeTime: 0.35,
    lungeSpeed: 10,
    lungeReach: 1.2,
    lungeDamage: 0.9,
  },
  /** Seconds after a stop before the next threshold can start one. */
  rest: 2,
};

export const PHASE = { IDLE: "idle", TELEGRAPH: "telegraph", SCRIPTED: "scripted", WINDOW: "window" };

/** His line when the first stop lands, and hers, recorded. */
const LORD = { speaker: "VOSS", color: "#ff2a4a", voice: "lord", emotion: "menacing" };
const LYRA = { speaker: "LYRA · RECORDED", color: "#ffaa44", voice: "lyra", emotion: "tender" };

/** Is this the enemy that stops time? */
export function isTimeStopper(e) {
  return e?.type === "enemy" && !!e.def?.elevenSeconds;
}

export class ElevenSeconds {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = PHASE.IDLE;
    this.t = 0;
    this.next = 0;
    this.stopIndex = -1;
    this.rest = 0;
    this.boss = null;
    this._hit = false;
    this._lyra = false;
    this._lunge = null;
    this._lungeIn = ELEVEN.window.lungeEvery / 2;
  }

  /** Time is stopped (for everyone else). */
  get stopped() {
    return this.phase === PHASE.SCRIPTED || this.phase === PHASE.WINDOW;
  }

  /** The AI leaves this enemy alone: frozen in a stop, or driven from here. */
  frozen(e) {
    if (this.phase === PHASE.IDLE || e?.type !== "enemy") return false;
    if (e === this.boss) return true;
    return this.stopped;
  }

  /** You cannot move, turn, shoot or shift: the first stop only. */
  playerFrozen() {
    return this.phase === PHASE.SCRIPTED;
  }

  /** Enemy rounds hang while time is stopped. */
  holdsProjectile(p) {
    return this.stopped && p?.owner === "enemy";
  }

  /** What a hit on `e` is worth: nothing while he stops time, double in his window. */
  damageScale(e) {
    if (e !== this.boss || this.phase === PHASE.IDLE) return 1;
    return this.phase === PHASE.WINDOW ? ELEVEN.window.damage : 0;
  }

  /** For the screen: which stop, how far in, and his seconds left on the clock. */
  view() {
    if (this.phase === PHASE.IDLE) return null;
    const dur =
      this.phase === PHASE.TELEGRAPH
        ? ELEVEN.telegraph
        : this.phase === PHASE.SCRIPTED
          ? ELEVEN.scripted.duration
          : ELEVEN.window.duration;
    const frac = Math.min(1, this.t / dur);
    return {
      phase: this.phase,
      stop: this.stopIndex,
      frac,
      // The first stop spends his eleven seconds faster than yours.
      seconds: this.phase === PHASE.TELEGRAPH ? 11 : Math.max(0, 11 * (1 - frac)),
      lunge: this._lunge?.stage ?? null,
    };
  }

  /**
   * @param {object} game
   * @param {number} dt - real seconds: his stopped time is not slowed by yours
   */
  update(game, dt) {
    if (game.mode !== "campaign") {
      if (this.phase !== PHASE.IDLE || this.boss) this.reset();
      return;
    }
    const boss = this._findBoss(game);
    if (!boss) {
      if (this.phase !== PHASE.IDLE) this._release(game);
      this.boss = null;
      return;
    }
    this.boss = boss;
    if (this.stopped) this._holdOthers(game, dt);

    switch (this.phase) {
      case PHASE.IDLE: {
        this.rest = Math.max(0, this.rest - dt);
        const frac = boss.health / (boss.maxHealth || 1);
        if (this.next < ELEVEN.thresholds.length && this.rest <= 0 && frac <= ELEVEN.thresholds[this.next]) {
          this.stopIndex = this.next++;
          this._enter(game, PHASE.TELEGRAPH);
          playChronoSound(game.audio, "stopWind");
        }
        break;
      }
      case PHASE.TELEGRAPH:
        this.t += dt;
        if (this.t >= ELEVEN.telegraph) this._stop(game);
        break;
      case PHASE.SCRIPTED:
        this.t += dt;
        this._scripted(game, dt);
        if (this.t >= ELEVEN.scripted.duration) this._release(game);
        break;
      case PHASE.WINDOW:
        this.t += dt;
        this._window(game, dt);
        if (this.t >= ELEVEN.window.duration) this._release(game);
        break;
    }
  }

  _findBoss(game) {
    if (this.boss && this._alive(this.boss)) return this.boss;
    return game.entities?.find((e) => isTimeStopper(e) && this._alive(e)) ?? null;
  }

  _alive(e) {
    return e.active && e.state !== "dead" && !e.dissolving && e.health > 0;
  }

  _enter(game, phase) {
    this.phase = phase;
    this.t = 0;
    this._hit = false;
    this._lyra = false;
    this._lunge = null;
    this._lungeIn = ELEVEN.window.lungeEvery / 2;
    if (this.boss) this.boss._bossCharging = false;
  }

  _stop(game) {
    const first = this.stopIndex === 0;
    this._enter(game, first ? PHASE.SCRIPTED : PHASE.WINDOW);
    const p = game.player;
    // Stopped time has no room for a shift, a dash in flight, or a fall.
    p.chronoActive = false;
    p.isDashing = false;
    p.isFiring = false;
    game.screenShake = Math.max(game.screenShake ?? 0, 6);
    playChronoSound(game.audio, "timeStop");
    if (first) {
      game.ariaComms?.queueSquadMessage?.(LORD.speaker, "lordStopsTime", LORD.color, null, { voice: LORD.voice, emotion: LORD.emotion });
    } else {
      game.queueAriaMessage?.("elevenSeconds");
    }
  }

  /** Frozen enemies' attack clocks wait with them, so nobody fires the instant time resumes. */
  _holdOthers(game, dt) {
    for (const e of game.entities) {
      if (e.type === "enemy" && e !== this.boss && e.lastAttackTime != null) e.lastAttackTime += dt * 1000;
    }
  }

  _towardPlayer(game, speed, dt, stopAt) {
    const b = this.boss;
    const p = game.player;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy);
    b.angle = Math.atan2(dy, dx);
    if (d <= stopAt) return d;
    const step = Math.min(speed * dt, d - stopAt);
    this._step(game, (dx / d) * step, (dy / d) * step);
    return d - step;
  }

  /** Stand `reach` from the player, on the first open side found. */
  _arrive(game, reach) {
    const b = this.boss;
    const p = game.player;
    const a0 = Math.atan2(b.y - p.y, b.x - p.x);
    for (let k = 0; k < 8; k++) {
      const a = a0 + (k * Math.PI) / 4;
      const x = p.x + Math.cos(a) * reach;
      const y = p.y + Math.sin(a) * reach;
      if (isPassable(game.map, Math.floor(x), Math.floor(y))) {
        b.x = x;
        b.y = y;
        b.angle = a + Math.PI;
        return;
      }
    }
  }

  _step(game, mx, my) {
    const b = this.boss;
    const nx = b.x + mx;
    const ny = b.y + my;
    if (isPassable(game.map, Math.floor(nx), Math.floor(b.y))) b.x = nx;
    if (isPassable(game.map, Math.floor(b.x), Math.floor(ny))) b.y = ny;
  }

  _scripted(game, dt) {
    const S = ELEVEN.scripted;
    const p = game.player;
    const b = this.boss;
    if (this.t >= S.walkFrom && !this._hit) {
      // An unhurried walk that still arrives on time: it is his time.
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      const left = Math.max(0.1, S.hitAt - this.t);
      this._towardPlayer(game, Math.max(S.walkSpeed, (d - S.reach) / left), dt, S.reach);
    }
    if (!this._hit && this.t >= S.hitAt) {
      this._hit = true;
      // A wall between you does not stop a man outside time: he is simply there.
      if (Math.hypot(p.x - b.x, p.y - b.y) > S.reach + 0.3) this._arrive(game, S.reach);
      // Heavy, and never the last hit: it leaves you standing on 1.
      const dmg = Math.min(p.maxHealth * S.hitFrac, p.health - 1);
      if (dmg > 0) {
        p.health -= dmg;
        p.hurtTime = game.time;
        p.lastDamageAngle = Math.atan2(this.boss.y - p.y, this.boss.x - p.x);
      }
      game.screenShake = Math.max(game.screenShake ?? 0, 16);
      game.audio?.playerHit?.();
      playChronoSound(game.audio, "collapse");
    }
    if (!this._lyra && this.t >= S.lyraAt) {
      this._lyra = true;
      game.ariaComms?.queueSquadMessage?.(LYRA.speaker, "lyraRecorded", LYRA.color, null, { voice: LYRA.voice, emotion: LYRA.emotion });
    }
  }

  _window(game, dt) {
    const Wn = ELEVEN.window;
    const b = this.boss;
    const p = game.player;
    const speed = (b.def?.speed ?? 1.8) * Wn.speed;
    const l = this._lunge;
    if (!l) {
      b.state = "chase";
      const d = this._towardPlayer(game, speed, dt, 1.1);
      this._lungeIn -= dt;
      if (this._lungeIn <= 0 && d <= Wn.lungeRange) {
        // The windup: he plants, and Foresight draws the line he will take.
        this._lunge = { stage: "windup", t: 0, angle: Math.atan2(p.y - b.y, p.x - b.x), landed: false };
        b.state = "windup";
      }
      return;
    }
    l.t += dt;
    if (l.stage === "windup") {
      b.state = "windup";
      if (l.t >= Wn.windup) {
        l.stage = "lunge";
        l.t = 0;
        b.state = "chase";
      }
    } else {
      this._step(game, Math.cos(l.angle) * Wn.lungeSpeed * dt, Math.sin(l.angle) * Wn.lungeSpeed * dt);
      if (!l.landed && Math.hypot(p.x - b.x, p.y - b.y) <= Wn.lungeReach) {
        l.landed = true;
        game.damagePlayer?.((b.def?.damage ?? 70) * Wn.lungeDamage, b);
        game.screenShake = Math.max(game.screenShake ?? 0, 8);
      }
      if (l.t >= Wn.lungeTime) {
        this._lunge = null;
        this._lungeIn = Wn.lungeEvery;
      }
    }
  }

  _release(game) {
    const b = this.boss;
    if (b && this._alive(b)) {
      b.state = "chase";
      b.stateTime = 0;
      b.painTimer = 0;
      b.lastAttackTime = game.time ?? 0;
    }
    const wasStopped = this.stopped;
    this.phase = PHASE.IDLE;
    this.t = 0;
    this._lunge = null;
    this.rest = ELEVEN.rest;
    if (wasStopped) playChronoSound(game.audio, "timeResume");
  }
}
