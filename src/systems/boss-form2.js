/**
 * The Paradox Lord, Form 2: the fight where the loud, long shift that carried
 * you through Act II becomes how he beats you.
 *
 * Spec docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md
 * §6 (Form 2) and §16.5.
 *
 *   Counter-shift  he is unaffected by your shift (chronoMultiplier 1.0). Hold
 *                  one for 2 s and he takes it from you: the shift ends, you
 *                  cannot start another and you move at half speed for 2 s,
 *                  while he moves at his own. At 1 s he reaches for it: a ring
 *                  fills round him, the suit ticks, ARIA warns once. Let go
 *                  before the ring closes and nothing happens; short, sharp
 *                  shifts are the answer.
 *   Replay         at 66% and 33% health he re-fires his last four seconds of
 *                  firing as ghost volleys, each round from where it was first
 *                  fired, in its first direction, on its first timing. For a
 *                  second first, every origin is marked; Foresight draws the
 *                  paths. The rounds fly where he aimed then, not where you
 *                  are now.
 *
 * Anything whose enemy def sets `counterShift` or `replay` gets the trick,
 * so a later form can carry them over (spec §6: "Counter-shift carries over
 * from Form 2"). The AI calls `updateForm2` once per boss per frame and
 * `recordShot` for every round the boss fires; the game calls
 * `counterShiftScale` on the player's movement and `canShift` before a shift.
 */
import { Projectile } from "../../js/entities.js";
import { playChronoSound } from "../audio/chrono-sounds.js";

export const FORM2 = {
  counterShift: { warnAt: 1.0, takeAt: 2.0, slowFor: 2.0, playerScale: 0.5 },
  replay: {
    thresholds: [0.66, 0.33],
    window: 4,
    telegraph: 1.0,
    maxShots: 24,
    damageMul: 0.75,
    color: "#c58bff",
  },
};

// ── Counter-shift ────────────────────────────────────────────────────────────

export function newCounterShift() {
  return { held: 0, warned: false, takes: 0, told: false };
}

/**
 * Advance the hold on your shift. Only one continuous shift counts: letting
 * go, or a boss that is not engaged, resets it.
 * @param {ReturnType<typeof newCounterShift>} s
 * @param {{ dt: number, shifting: boolean, engaged: boolean }} input - dt in real seconds
 * @returns {("warn"|"take")[]}
 */
export function stepCounterShift(s, { dt, shifting, engaged }, spec = FORM2.counterShift) {
  const events = [];
  if (!shifting || !engaged) {
    s.held = 0;
    s.warned = false;
    return events;
  }
  s.held += dt;
  if (!s.warned && s.held >= spec.warnAt) {
    s.warned = true;
    events.push("warn");
  }
  if (s.held >= spec.takeAt) {
    events.push("take");
    s.held = 0;
    s.warned = false;
    s.takes++;
  }
  return events;
}

/** He takes the shift: it ends, and you are held back. */
export function takeShift(player, spec = FORM2.counterShift) {
  player.chronoActive = false;
  player.counterShifted = spec.slowFor;
}

/** Can the player start a shift? Not while he is holding theirs. */
export function canShift(player) {
  return !(player.counterShifted > 0);
}

/**
 * The player's movement scale this frame, and the countdown on being held
 * back (real seconds). 1 when nothing is holding them.
 */
export function counterShiftScale(player, realDt, spec = FORM2.counterShift) {
  if (!(player.counterShifted > 0)) return 1;
  player.counterShifted = Math.max(0, player.counterShifted - realDt);
  return spec.playerScale;
}

// ── Replay ───────────────────────────────────────────────────────────────────

/** Note a round the boss just fired, on its own clock (ms). */
export function recordShot(e, proj) {
  const log = (e._replayLog ??= []);
  const t = e._form2Clock ?? 0;
  log.push({ t, x: proj.x, y: proj.y, dx: proj.dirX, dy: proj.dirY, speed: proj.speed, damage: proj.damage });
  // Two windows back is all a replay can ever reach for.
  const cutoff = t - FORM2.replay.window * 2000;
  while (log.length && log[0].t < cutoff) log.shift();
}

/**
 * His last `window` seconds of firing: the rounds fired within `window` of
 * his latest shot (so a boss you hid from still has something to replay),
 * newest `maxShots` of them, each with `at`, its offset in seconds from the
 * first.
 */
export function replayVolley(log, spec = FORM2.replay) {
  if (!log?.length) return [];
  const last = log[log.length - 1].t;
  const shots = log.filter((s) => s.t >= last - spec.window * 1000).slice(-spec.maxShots);
  const start = shots[0].t;
  return shots.map((s) => ({ ...s, at: (s.t - start) / 1000 }));
}

/** Health thresholds at or below `frac` that have not fired yet, highest first. */
export function dueThresholds(frac, fired, spec = FORM2.replay) {
  return spec.thresholds.filter((th) => frac <= th && !fired.includes(th));
}

// ── Runtime ──────────────────────────────────────────────────────────────────

/**
 * One boss's Form 2 for one frame.
 * @param {object} e - the boss
 * @param {{ dt: number, realDt: number, player: object, projectiles: object[],
 *   entities: object[], damageNumbers: object[], audio: object, fx: object }} ctx
 *   dt is the boss's own sim step, realDt wall seconds
 */
export function updateForm2(e, ctx) {
  if (!e.active || e.state === "dead" || e.dissolving) return;
  const def = e.def;
  const p = ctx.player;
  e._form2Clock = (e._form2Clock ?? 0) + ctx.dt * 1000;

  if (def.counterShift) {
    const cs = (e._counterShift ??= newCounterShift());
    const engaged = e.state !== "idle" && Math.hypot(p.x - e.x, p.y - e.y) <= (def.sightRange ?? 30);
    const before = cs.held;
    for (const ev of stepCounterShift(cs, { dt: ctx.realDt, shifting: !!p.chronoActive, engaged })) {
      if (ev === "warn") {
        if (!cs.told) {
          cs.told = true;
          ctx.fx.ariaMessages.push("counterShift");
        }
      } else if (ev === "take") {
        takeShift(p);
        ctx.fx.screenShake = Math.max(ctx.fx.screenShake, 6);
        ctx.damageNumbers?.push({ x: e.x, y: e.y, value: "COUNTER-SHIFT!", crit: true, life: 1.4, vx: 0 });
        playChronoSound(ctx.audio, "counterShift");
      }
    }
    // The suit ticks faster as his hand closes.
    if (cs.warned && Math.floor(cs.held * 6) !== Math.floor(before * 6)) playChronoSound(ctx.audio, "tick");
    e._counterCharge = cs.held / FORM2.counterShift.takeAt;
  }

  if (def.replay) {
    const spec = FORM2.replay;
    const fired = (e._replayFired ??= []);
    const frac = e.maxHealth > 0 ? e.health / e.maxHealth : 1;
    for (const th of dueThresholds(frac, fired)) {
      fired.push(th);
      const shots = replayVolley(e._replayLog);
      if (!shots.length) continue;
      (e._replays ??= []).push({ shots, t: 0, next: 0 });
      ctx.fx.ariaMessages.push("replayVolley");
      ctx.damageNumbers?.push({ x: e.x, y: e.y, value: "REPLAY", crit: true, life: 1.2, vx: 0 });
      playChronoSound(ctx.audio, "replay");
    }
    // One volley at a time: the next waits for the last round of this one.
    const r = e._replays?.[0];
    if (r) {
      r.t += ctx.dt;
      while (r.next < r.shots.length && r.t >= spec.telegraph + r.shots[r.next].at) {
        fireGhost(r.shots[r.next++], ctx);
      }
      if (r.next >= r.shots.length) e._replays.shift();
    }
  }
}

/** A ghost round: the old shot again, from where it was fired, a little weaker. */
function fireGhost(s, ctx) {
  const spec = FORM2.replay;
  const round = new Projectile(s.x, s.y, s.dx, s.dy, s.damage * spec.damageMul, s.speed, "enemy");
  round.color = spec.color;
  round._replay = true;
  ctx.projectiles.push(round);
  ctx.entities.push(round);
  const p = ctx.player;
  ctx.audio?.enemyShoot?.(ctx.audio.calculatePan?.(s.x, s.y, p.x, p.y, p.angle) ?? 0);
}

/** The origins still to fire in a boss's current replay, for the telegraph. */
export function pendingReplay(e) {
  const r = e._replays?.[0];
  if (!r) return [];
  return r.shots.slice(r.next).map((s) => ({ ...s, in: FORM2.replay.telegraph + s.at - r.t }));
}
