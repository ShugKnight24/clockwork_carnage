/**
 * The Paradox Lord's three forms: what each one does, and how each one lies.
 *
 * Every form looks like the answer to the last one, and isn't.
 *
 *   1  The Shell (Act I). A towering hulk under a riveted carapace: slow,
 *      loud, everything telegraphed a long way off. A ground slam throws a
 *      ring of slow rounds with a gap in it; a lumbering charge stops dead on
 *      a wall and leaves him stuck. It is a casing. At half health it cracks:
 *      he staggers, the casing falls away (the sprite sheds its "shell"
 *      parts and shrinks), and what is left takes full damage, scrambles and
 *      darts aside from your fire: a short, frantic second phase. The
 *      false_victory scene says why.
 *   2  The Brute (Act III). The plating torn off, all muscle, and genuinely
 *      stronger: he closes, pounces twice in a row, stomps, sprays a fan of
 *      rounds, and below 40% gets faster. Each pounce chain ends in a
 *      recovery where he stands and breathes: the opening. He keeps Form 2's
 *      Counter-shift and Replay (boss-form2.js).
 *   3  The Remainder (Act IV). Small, thin and quiet, and the best of them.
 *      He keeps his distance, steps out of the line of your fire the moment
 *      you pull the trigger, fires short bursts of fully led needles, warps
 *      behind you, and twice undoes a burst of damage by taking back the last
 *      two seconds. Eleven Seconds (eleven-seconds.js) is his too. The
 *      opening: he cannot dodge while he winds up.
 *
 * Each form says a few lines (TAUNTS) on the comms plate, once each, through
 * the AI's effects (`fx.lines`, which the game queues on ARIA's channel).
 *
 * ai.js calls `updateBossForm` once per boss per frame while the boss is
 * awake, with what it needs passed in (no import back into ai.js). The rest
 * of the game reads plain fields on the enemy: `_bossWindup` {kind, t, total}
 * and `_bossCharging` (the telegraphs), `_shellCracked` / `_crackT` (the
 * sprite), `_spriteScale` (sprite and hit span), `_takenMul` (damage taken),
 * `_rateMul` (fire rate), `_bossHold` (seconds he stands still).
 */
import { Projectile } from "../../js/entities.js";
import { isPassable } from "./physics.js";
import { playChronoSound } from "../audio/chrono-sounds.js";
import { recordShot } from "./boss-form2.js";

// Durations in seconds of the boss's own time unless noted.
export const FORMS = {
  1: {
    speaker: "PARADOX LORD",
    color: "#46eeff",
    charge: { cooldown: 7, windup: 1.3, speedMul: 5, duration: 1.1, damageMul: 1.6, stun: 1.4, minDist: 4, maxDist: 18 },
    slam: { cooldown: 6, windup: 1.2, range: 5.5, radius: 3.2, damageMul: 1, ring: 16, gap: 3, ringSpeed: 4.5, ringDamageMul: 0.5 },
    // Cracked, the core takes full damage (no carapace; def.armor.crackedCap
    // still caps one round) and darts aside from your fire (`dodge`).
    shell: { crackAt: 0.5, takenMul: 1, stagger: 1.6, speedMul: 1.6, rateMul: 0.5, shrink: 0.74, chargeWindup: 0.8, dodge: { cooldown: 0.8, dist: 1.6 } },
  },
  2: {
    speaker: "PARADOX LORD",
    color: "#ff3a58",
    charge: { cooldown: 4.5, windup: 0.55, speedMul: 4.2, duration: 0.6, damageMul: 1.2, stun: 0.9, chain: 2, chainWindup: 0.3, recover: 0.9, minDist: 3, maxDist: 16 },
    slam: { cooldown: 4, windup: 0.6, range: 4, radius: 3.4, damageMul: 0.8, ring: 10, gap: 2, ringSpeed: 6.5, ringDamageMul: 0.4 },
    barrage: { cooldown: 3.4, count: 5, spread: 0.8, speed: 8.5, damageMul: 0.5, minDist: 4 },
    enrage: { at: 0.4, speedMul: 1.25, cooldownMul: 0.7 },
  },
  3: {
    speaker: "VOSS",
    color: "#b98aff",
    sidestep: { cooldown: 1, dist: 1.9 },
    needles: { cooldown: 2.4, windup: 0.5, count: 3, gap: 0.12, speed: 15, lead: 0.9, damageMul: 0.55, minDist: 2.5 },
    warp: { cooldown: 7, windup: 0.45, behind: 2.6, minDist: 7 },
    undo: { uses: 2, window: 1.5, burst: 0.08, heal: 0.5, back: 2 },
  },
};

/** Health fraction at which every form says its last line. */
export const LOW_AT = 0.2;

/**
 * Wry and terse. The Shell blusters in capitals until it cracks; the Brute
 * means it; the Remainder barely raises his voice.
 */
export const TAUNTS = {
  1: {
    open: "KNEEL. I AM THE END OF YOUR TIMELINE.",
    slam: "FEEL THE WEIGHT OF EVERY CENTURY.",
    crack: "...Hm. That was load-bearing.",
    low: "Fine. It was a rental.",
  },
  2: {
    open: "No shell this time. Just me.",
    charge: "Keep up.",
    enrage: "Now I'm trying.",
    low: "This one bleeds. Noted.",
  },
  3: {
    open: "There you are. Smaller than you pictured?",
    sidestep: "You aimed where I was.",
    undo: "No. Again.",
    low: "...Well. That's new.",
  },
};

/** The form a boss is in: its def's `form`, 1 for anything else. */
export const formOf = (e) => e.def?.form ?? 1;

/** Has the Shell's casing taken enough to crack, and not cracked yet? */
export function shellCrackDue(e, spec = FORMS[1].shell) {
  return !e._shellCracked && e.maxHealth > 0 && e.health > 0 && e.health / e.maxHealth <= spec.crackAt;
}

/**
 * The directions of a slam's ring: `count` rounds evenly round the circle
 * with `gap` neighbours left out, starting at index `skip`. Pure, so the
 * telegraph can draw it and a test can count it.
 */
export function ringAngles(count, gap, skip = 0, offset = 0) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const k = (i - skip + count) % count;
    if (k < gap) continue;
    out.push(offset + (i / count) * Math.PI * 2);
  }
  return out;
}

/**
 * Undo: has he lost more than `burst` of his health in the last `window`
 * seconds? Returns the log entry to go back to (`back` seconds ago, or the
 * oldest he has) and how much to heal, or null.
 * @param {{ t: number, hp: number, x: number, y: number }[]} log - oldest first, t in seconds
 */
export function undoDue(log, now, health, maxHealth, spec = FORMS[3].undo) {
  if (!log?.length || !(maxHealth > 0)) return null;
  const from = log.find((s) => s.t >= now - spec.window);
  if (!from) return null;
  const lost = from.hp - health;
  if (lost < spec.burst * maxHealth) return null;
  const to = log.find((s) => s.t >= now - spec.back) ?? log[0];
  return { to, heal: lost * spec.heal };
}

/**
 * What runs even while he staggers: the Shell's casing falling away, and the
 * figure under it settling to its real size.
 */
export function tickBossForm(e, dt) {
  if (!e._shellCracked) return;
  e._crackT = (e._crackT ?? 0) + dt;
  const shrink = FORMS[1].shell.shrink;
  e._spriteScale = Math.max(shrink, (e._spriteScale ?? 1) - dt * 0.4);
}

/** One line, once per fight, on the comms plate and over his head. */
function taunt(e, key, c) {
  const form = formOf(e);
  const text = TAUNTS[form]?.[key];
  const said = (e._taunts ??= {});
  if (!text || said[key]) return;
  said[key] = true;
  const F = FORMS[form];
  c.fx.lines?.push({ speaker: F.speaker, text, color: F.color, voice: "lord", emotion: form === 3 ? "calm" : "menacing", duration: 3.2, prominent: false });
}

function callout(e, c, value, life = 1) {
  c.damageNumbers.push({ x: e.x, y: e.y, value, crit: true, life, vx: (Math.random() - 0.5) * 20 });
}

/**
 * Step aside, square to the player, when they fire (c.noise) and the step
 * is off cooldown; not in the middle of a telegraph. Returns whether it did.
 */
function sidestep(e, c, atp, spec) {
  const cd = (e._bossCD ??= {});
  if (!c.noise || e._bossWindup || e.state === "windup" || cd.sidestep > 0) return false;
  const side = Math.random() < 0.5 ? -1 : 1;
  for (const s of [side, -side]) {
    const a = atp + (s * Math.PI) / 2;
    const tx = e.x + Math.cos(a) * spec.dist;
    const ty = e.y + Math.sin(a) * spec.dist;
    if (!clear(c.map, tx, ty)) continue;
    e.x = tx;
    e.y = ty;
    cd.sidestep = spec.cooldown;
    playChronoSound(c.audio, "dash");
    return true;
  }
  return false;
}

/** Can a boss of this size stand here? */
function clear(map, x, y, r = 0.3) {
  return (
    isPassable(map, Math.floor(x), Math.floor(y)) &&
    isPassable(map, Math.floor(x + r), Math.floor(y)) &&
    isPassable(map, Math.floor(x - r), Math.floor(y)) &&
    isPassable(map, Math.floor(x), Math.floor(y + r)) &&
    isPassable(map, Math.floor(x), Math.floor(y - r))
  );
}

/** A round from him. Aimed ones go in Form 2's replay log; a slam's ring does not. */
function fire(e, c, angle, speed, damage, color, aimed = true) {
  const proj = new Projectile(e.x + Math.cos(angle) * 0.5, e.y + Math.sin(angle) * 0.5, Math.cos(angle), Math.sin(angle), damage, speed, "enemy");
  proj.color = color;
  c.projectiles.push(proj);
  c.entities.push(proj);
  if (aimed && e.def.replay) recordShot(e, proj);
  return proj;
}

/**
 * One boss, one frame, awake.
 * @param {object} e
 * @param {{ dt: number, time: number, dist: number, player: object, map: object,
 *   projectiles: object[], entities: object[], damageNumbers: object[],
 *   audio: object, fx: object, noise: object|null, playerVel: {x:number,y:number},
 *   sees: boolean, timeStopped: boolean,
 *   step: (e: object, angle: number, step: number, map: object) => boolean }} c
 */
export function updateBossForm(e, c) {
  const form = formOf(e);
  const F = FORMS[form] ?? FORMS[1];
  const { dt, dist, player } = c;
  const atp = Math.atan2(player.y - e.y, player.x - e.x);
  const pan = c.audio.calculatePan?.(e.x, e.y, player.x, player.y, player.angle) ?? 0;
  const cd = (e._bossCD ??= {});
  const cdMul = e._cdMul ?? 1;
  for (const k in cd) cd[k] -= dt;
  if (e._bossHold > 0) e._bossHold -= dt;

  taunt(e, "open", c);
  if (e.health / e.maxHealth <= LOW_AT) taunt(e, "low", c);

  // ── The Shell cracks ──
  if (form === 1 && shellCrackDue(e, F.shell)) {
    const s = F.shell;
    e._shellCracked = true;
    e._crackT = 0;
    e._takenMul = s.takenMul;
    e._rateMul = s.rateMul;
    e.speed *= s.speedMul;
    e._bossWindup = null;
    e._bossCharging = false;
    e._stagger = true;
    e.painTimer = s.stagger * 1000;
    c.fx.screenShake = Math.max(c.fx.screenShake, 14);
    callout(e, c, "SHELL CRACKED", 1.8);
    playChronoSound(c.audio, "collapse");
    c.audio.tremor?.();
    taunt(e, "crack", c);
    return;
  }
  // ── Form 2: enrage ──
  if (form === 2 && !e._enraged && e.health / e.maxHealth <= F.enrage.at) {
    e._enraged = true;
    e.speed *= F.enrage.speedMul;
    e._cdMul = F.enrage.cooldownMul;
    callout(e, c, "ENRAGED", 1.4);
    c.fx.screenShake = Math.max(c.fx.screenShake, 8);
    c.audio.tremor?.();
    taunt(e, "enrage", c);
  }

  if (c.timeStopped) return;

  // ── Form 3: undo, then the sidestep ──
  if (form === 3) {
    const t = c.time / 1000;
    const log = (e._hpLog ??= []);
    if (!log.length || t - log[log.length - 1].t >= 0.1) log.push({ t, hp: e.health, x: e.x, y: e.y });
    while (log.length && log[0].t < t - 3) log.shift();
    const used = e._undoUsed ?? 0;
    const due = used < F.undo.uses ? undoDue(log, t, e.health, e.maxHealth, F.undo) : null;
    if (due) {
      e._undoUsed = used + 1;
      e.health = Math.min(e.maxHealth, e.health + due.heal);
      if (clear(c.map, due.to.x, due.to.y)) {
        e.x = due.to.x;
        e.y = due.to.y;
      }
      log.length = 0;
      e._bossWindup = null;
      callout(e, c, "UNDO", 1.3);
      playChronoSound(c.audio, "rewind");
      taunt(e, "undo", c);
      return;
    }
    if (sidestep(e, c, atp, F.sidestep)) taunt(e, "sidestep", c);
  }
  // ── The cracked Shell's core: frantic, darting aside from your fire ──
  if (form === 1 && e._shellCracked && e.painTimer <= 0) sidestep(e, c, atp, F.shell.dodge);

  // ── A telegraph running ──
  if (e._bossWindup) {
    const w = e._bossWindup;
    w.t -= dt;
    // A charge tracks you until the last third of its tell, then commits.
    if (w.kind === "charge" && w.t > w.total * 0.33) e._bossChargeAngle = atp;
    if (w.kind === "needles") e._needleAim = atp;
    if (w.t > 0) return;
    e._bossWindup = null;
    resolve(e, w.kind, c, F, atp, pan);
    return;
  }

  // ── A charge or pounce in flight ──
  if (e._bossCharging) {
    const ch = F.charge;
    e._bossChargeTimer += dt;
    const moved = c.step(e, e._bossChargeAngle, e.speed * ch.speedMul * dt, c.map);
    if (Math.hypot(player.x - e.x, player.y - e.y) < 1.4) {
      c.fx.damagePlayerCalls.push({ damage: e.def.damage * ch.damageMul, attacker: e });
      c.fx.screenShake = Math.max(c.fx.screenShake, 8);
      endCharge(e, c, F, false);
    } else if (!moved) {
      // Into a wall: the Shell sticks there, stunned, a while.
      c.fx.screenShake = Math.max(c.fx.screenShake, 6);
      endCharge(e, c, F, true);
    } else if (e._bossChargeTimer >= ch.duration) {
      endCharge(e, c, F, false);
    }
    return;
  }

  // ── Form 3: a burst of needles in flight ──
  if (e._burst) {
    e._burst.t -= dt;
    if (e._burst.t <= 0) {
      const n = F.needles;
      const lead = Math.min(1.2, dist / n.speed) * n.lead;
      const a = Math.atan2(player.y + c.playerVel.y * lead - e.y, player.x + c.playerVel.x * lead - e.x);
      fire(e, c, a, n.speed, e.def.damage * n.damageMul, "#e6d8ff");
      c.audio.enemyShoot?.(pan);
      e._burst.left--;
      e._burst.t = n.gap;
      if (e._burst.left <= 0) e._burst = null;
    }
    return;
  }
  if (e._bossHold > 0) return;

  const windup = (kind, seconds, label) => {
    e._bossWindup = { kind, t: seconds, total: seconds };
    if (kind === "charge") e._bossChargeAngle = atp;
    callout(e, c, label, seconds + 0.4);
    c.audio.telegraph?.(pan, kind === "slam" ? "stomp" : kind === "needles" ? "shot" : kind, dist);
  };

  if (form === 1) {
    if (!e._shellCracked && !(cd.slam > 0) && dist < F.slam.range) {
      cd.slam = F.slam.cooldown;
      windup("slam", F.slam.windup, "SLAM!");
      c.audio.tremor?.();
      taunt(e, "slam", c);
      return;
    }
    if (!(cd.charge > 0) && c.sees && dist > F.charge.minDist && dist < F.charge.maxDist) {
      cd.charge = F.charge.cooldown;
      windup("charge", e._shellCracked ? F.shell.chargeWindup : F.charge.windup, "CHARGE!");
    }
    return;
  }

  if (form === 2) {
    if (!(cd.slam > 0) && dist < F.slam.range) {
      cd.slam = F.slam.cooldown * cdMul;
      windup("slam", F.slam.windup, "STOMP!");
      return;
    }
    if (!(cd.charge > 0) && c.sees && dist > F.charge.minDist && dist < F.charge.maxDist) {
      cd.charge = F.charge.cooldown * cdMul;
      e._chain = F.charge.chain;
      windup("charge", F.charge.windup, "POUNCE!");
      taunt(e, "charge", c);
      return;
    }
    if (!(cd.barrage > 0) && c.sees && dist > F.barrage.minDist) {
      cd.barrage = F.barrage.cooldown * cdMul;
      const b = F.barrage;
      for (let i = 0; i < b.count; i++) fire(e, c, atp - b.spread / 2 + (b.spread * i) / (b.count - 1), b.speed, e.def.damage * b.damageMul, "#ff5a3a");
      c.audio.enemyShoot?.(pan);
    }
    return;
  }

  // Form 3: few moves, each one meant.
  if (!(cd.warp > 0) && dist > F.warp.minDist) {
    cd.warp = F.warp.cooldown;
    windup("warp", F.warp.windup, "WARP");
    return;
  }
  if (!(cd.needles > 0) && c.sees && dist > F.needles.minDist) {
    cd.needles = F.needles.cooldown;
    windup("needles", F.needles.windup, "·  ·  ·");
  }
}

function endCharge(e, c, F, wall) {
  e._bossCharging = false;
  const ch = F.charge;
  if (e._chain > 1) {
    // The Brute's next pounce, re-aimed, on a short tell.
    e._chain--;
    e._bossWindup = { kind: "charge", t: ch.chainWindup, total: ch.chainWindup };
    return;
  }
  e._chain = 0;
  if (wall && formOf(e) === 1) {
    e._stagger = true;
    e.painTimer = ch.stun * 1000;
    c.damageNumbers.push({ x: e.x, y: e.y, value: "STUCK", crit: false, life: 1.2, vx: 0 });
  } else if (ch.recover) {
    e._bossHold = ch.recover;
  }
}

function resolve(e, kind, c, F, atp, pan) {
  const { dist, player } = c;
  if (kind === "charge") {
    e._bossCharging = true;
    e._bossChargeTimer = 0;
    e._bossChargeDuration = F.charge.duration;
    return;
  }
  if (kind === "slam") {
    const s = F.slam;
    if (dist < s.radius) c.fx.damagePlayerCalls.push({ damage: e.def.damage * s.damageMul, attacker: e });
    // The ring leaves a gap; where is anyone's guess until it lands.
    const skip = Math.floor(Math.random() * s.ring);
    for (const a of ringAngles(s.ring, s.gap, skip, atp)) fire(e, c, a, s.ringSpeed, e.def.damage * s.ringDamageMul, formOf(e) === 1 ? "#7fe8ff" : "#ff6a3a", false);
    c.fx.screenShake = Math.max(c.fx.screenShake, formOf(e) === 1 ? 14 : 10);
    playChronoSound(c.audio, "collapse");
    return;
  }
  if (kind === "warp") {
    const behind = player.angle + Math.PI;
    const tx = player.x + Math.cos(behind) * F.warp.behind;
    const ty = player.y + Math.sin(behind) * F.warp.behind;
    if (clear(c.map, tx, ty)) {
      e.x = tx;
      e.y = ty;
      c.fx.screenShake = Math.max(c.fx.screenShake, 4);
      playChronoSound(c.audio, "rewind");
      // He does not waste the arrival: the needles follow straight away.
      e._bossCD.needles = 0;
      e._bossWindup = { kind: "needles", t: F.needles.windup * 0.8, total: F.needles.windup * 0.8 };
    }
    return;
  }
  if (kind === "needles") {
    e._burst = { left: F.needles.count, t: 0 };
    c.audio.telegraph?.(pan, "shot", dist);
  }
}
