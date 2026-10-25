// ─── Cover in play ──────────────────────────────────────────────────────────
// Taking, holding and leaving cover, on top of the pure geometry in
// src/systems/cover.js. Runs once a frame after the player's movement
// (game.updatePlayer), which hands it the frame's movement intent instead of
// moving the player while they are in cover.
//
// What the rest of the game reads off the player:
//   inCover          (getter) in cover now
//   cover            { face, s, peek, lean, … } or null
//   coverDown        crouched behind low cover; the stance eases down for it
//   coverPeeking     exposed: stood up over low cover, or leaned out of high
//   coverAvailable   the face the cover key would take right now, or null
//   coverDashTarget  the face a dash would slide to from cover, or null
// And off the game: `coverStats` counters (tookCover, peekKills,
// blindFireKills, coverDashes, shotsBlocked), and `onCoverEvent(type)` when
// something sets it, for the prologue to teach with.
// ─────────────────────────────────────────────────────────────────────────────
import {
  findCover,
  coverClass,
  facePoint,
  clampS,
  edgeAt,
  leanS,
  coverHides,
  coverDashTarget,
  coverViewAngle,
  BLIND_FIRE_SPREAD_MULT,
  BLIND_FIRE_MIN_CONE,
} from "./cover.js";
import { activeDevice } from "../ui/input-glyphs.js";
import { playerEyeZ } from "./physics.js";
import { distanceToWall } from "./combat.js";

/** The ease onto the face. */
const SNAP_SECONDS = 0.16;
/** Sliding along cover is a crouch-walk, slower than walking. */
const COVER_MOVE_MULT = 0.7;
/** Holding away from the cover this long steps out of it. */
const AWAY_SECONDS = 0.18;
/** Rate the peek / lean blend eases at (per second). */
const PEEK_RATE = 12;
/** How near the aim line an enemy must be to be what a blind-fired round is sent at (radians). */
const BLIND_AIM_CONE = 0.2;
/** With nothing under the reticle, blind fire converges this far out (cells). */
const BLIND_AIM_FALLBACK = 8;
/** A kill this soon after a blind-fire shot counts as a blind-fire kill (ms). */
const BLIND_KILL_MS = 800;

export function createCoverStats() {
  return { tookCover: 0, peekKills: 0, blindFireKills: 0, coverDashes: 0, shotsBlocked: 0 };
}

function emit(game, stat, type) {
  if (!game.coverStats) game.coverStats = createCoverStats();
  game.coverStats[stat]++;
  game.onCoverEvent?.(type);
}

const ease = (t) => t * t * (3 - 2 * t);
const wrapAngle = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/** Snap onto face `f` (from findCover / coverDashTarget). */
export function takeCover(game, f, { viaDash = false } = {}) {
  const p = game.player;
  p.cover = {
    face: f,
    s: f.s,
    peek: 0,
    lean: 0,
    awayT: 0,
    since: game.time,
    snap: { x0: p.x, y0: p.y, a0: p.angle, a1: coverViewAngle(f, f.s, p.angle), t: 0 },
  };
  p.isSprinting = false;
  p.coverAvailable = null;
  p.coverDown = f.low;
  game.audio?.coverSnap?.(f.low);
  game.screenShake = Math.max(game.screenShake || 0, 1.5);
  game.gamepad?.vibrateLight?.();
  emit(game, viaDash ? "coverDashes" : "tookCover", viaDash ? "coverDash" : "tookCover");
}

export function leaveCover(game) {
  const p = game.player;
  p.cover = null;
  p.coverDown = false;
  p.coverPeeking = false;
  p.coverDashTarget = null;
}

/** The cover key: take the face in front, or step out. */
export function coverPress(game) {
  const p = game.player;
  if (!p?.alive || game.world || !game.map || game.mode === "meltdown") return false;
  if (p.cover) {
    leaveCover(game);
    return true;
  }
  if (p.isDashing || p.isSliding) return false;
  const f = findCover(game.map, p.x, p.y, p.angle);
  if (!f) return false;
  takeCover(game, f);
  return true;
}

/**
 * A dash with cover involved. From cover: slide to the cover the view is on
 * (a roadie run), or step out and let the dash go. On a pad or touch, where
 * the dash button doubles as the cover button, a dash toward a face in reach
 * takes it instead. @returns {boolean} handled: no ordinary dash
 */
export function coverDash(game, dirX, dirY) {
  const p = game.player;
  if (!p || game.world || !game.map) return false;
  if (p.cover) {
    const t = coverDashTarget(game.map, p.x, p.y, p.angle, p.cover.face);
    leaveCover(game);
    if (!t) return false;
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    // The slide's own movement carries you there, crouched, at slide speed.
    p.isSliding = true;
    p.slideTime = p.slideDuration;
    p.slideDirX = dx / d;
    p.slideDirY = dy / d;
    p.slideCooldown = 0.8;
    p.staminaRegenDelay = 0.5;
    p._coverDash = { face: t, until: game.time + p.slideDuration * 1000 + 200 };
    game.audio?.dashSound?.();
    game.audio?.playerGrunt?.(game.getVoiceProfile?.(), "slide");
    return true;
  }
  const device = activeDevice(game);
  if (device !== "gamepad" && device !== "touch") return false;
  const f = p.coverAvailable;
  if (!f || p.isDashing || p.isSliding) return false;
  // Toward the face, or no direction at all: take it. Sideways: dash.
  if (-(dirX * f.nx + dirY * f.ny) < 0.5) return false;
  takeCover(game, f);
  return true;
}

/** Arrive from a cover-to-cover slide: snap onto the target, or give up. */
function updateCoverDash(game) {
  const p = game.player;
  const run = p._coverDash;
  const t = run.face;
  // How far the target still is along the slide: at or past it, arrive.
  const ahead = (t.x - p.x) * p.slideDirX + (t.y - p.y) * p.slideDirY;
  const left = Math.hypot(t.x - p.x, t.y - p.y);
  if (ahead > 0.3 && p.isSliding && game.time < run.until) return;
  p._coverDash = null;
  if (left > 1.2) return;
  p.isSliding = false;
  p.slideTime = 0;
  // The snap eases the rest of the way from wherever the slide stopped.
  takeCover(game, t, { viaDash: true });
}

/** Once a frame, after the player's movement. */
export function updateCover(game, dt) {
  const p = game.player;
  if (!p) return;
  const map = game.map;
  // Meltdown is a runner with no stopping; a voxel level has no grid faces.
  if (game.world || !map?.grid || !p.alive || game.mode === "meltdown") {
    if (p.cover) leaveCover(game);
    p._coverDash = null;
    p.coverAvailable = null;
    return;
  }
  if (p._coverDash) updateCoverDash(game);

  const c = p.cover;
  if (!c) {
    p.coverDown = false;
    p.coverPeeking = false;
    p.coverDashTarget = null;
    p.coverIntentX = p.coverIntentY = 0;
    p.coverAvailable = p.isDashing || p.isSliding ? null : findCover(map, p.x, p.y, p.angle);
    return;
  }
  p.coverAvailable = null;
  const f = c.face;

  // Moved out by something else (a dash, a slide, a teleport), or the cover
  // went (a wall knocked through): out of cover.
  const at = facePoint(f, c.s);
  const drift = c.snap ? 0 : Math.hypot(p.x - at.x, p.y - at.y);
  if (p.isDashing || p.isSliding || coverClass(map, f.cx, f.cy) !== f.kind || drift > 1.2) {
    leaveCover(game);
    return;
  }

  const ix = p.coverIntentX || 0;
  const iy = p.coverIntentY || 0;
  p.coverIntentX = p.coverIntentY = 0;

  if (c.snap) {
    c.snap.t = Math.min(1, c.snap.t + dt / SNAP_SECONDS);
    const k = ease(c.snap.t);
    const to = facePoint(f, c.s);
    p.x = c.snap.x0 + (to.x - c.snap.x0) * k;
    p.y = c.snap.y0 + (to.y - c.snap.y0) * k;
    p.angle = c.snap.a0 + wrapAngle(c.snap.a1 - c.snap.a0) * k;
    if (c.snap.t >= 1) c.snap = null;
  } else {
    const len = Math.hypot(ix, iy);
    // Pulling away from the cover (the back key while facing it) steps out;
    // a sprint anywhere but into the cover breaks out at a run.
    const away = len > 0 ? (ix * f.nx + iy * f.ny) / len : 0;
    if (p.isSprinting && len > 0 && away > -0.5) {
      leaveCover(game);
      return;
    }
    c.awayT = away > 0.8 ? c.awayT + dt : 0;
    if (c.awayT > AWAY_SECONDS) {
      leaveCover(game);
      return;
    }
    // Along the face only; into it does nothing. Held still while leaning.
    if (!c.lean) c.s = clampS(f, c.s + (f.alongX ? ix : iy) * COVER_MOVE_MULT);
  }

  // Peek: aiming stands you up over low cover, or leans you out round the
  // end of high cover you are at. Elsewhere along high cover it does nothing.
  const edge = edgeAt(f, c.s);
  if (!f.low && p.isAiming && !c.lean && edge && !c.snap) c.lean = edge;
  const wantPeek = p.isAiming && !c.snap && (f.low || !!c.lean);
  c.peek += ((wantPeek ? 1 : 0) - c.peek) * Math.min(1, PEEK_RATE * dt);
  if (!wantPeek && c.peek < 0.02) {
    c.peek = 0;
    c.lean = 0;
  }
  if (!c.snap) {
    const s = c.lean ? c.s + (leanS(f, c.lean) - c.s) * c.peek : c.s;
    const pt = facePoint(f, s);
    p.x = pt.x;
    p.y = pt.y;
  }
  p.coverDown = f.low && !wantPeek;
  p.coverPeeking = wantPeek && c.peek > 0.5;
  p.coverDashTarget = c.snap ? null : coverDashTarget(map, p.x, p.y, p.angle, f);
}

/** Firing from cover without the sights up: blind fire, if the cover is in the shot's way. */
export const isBlindFiring = (p) => !!p?.cover && !p.isAiming;

/** How near the cover must stop a shot for it to be fired blind (cells). */
const BLIND_REACH = 1.6;

/**
 * Whether a shot from cover along (yaw, pitch) is blind fire: no sights up,
 * and the cover itself in the way of it. With a clear line from the eye to
 * what the reticle is on (over low cover you can see over, past the end of
 * high cover) it is an ordinary hip-fire shot, from the eye, at hip spread.
 */
export function blindFireNow(game, yaw, pitch) {
  const p = game.player;
  if (!isBlindFiring(p) || !game.map) return false;
  return distanceToWall(p, Math.cos(yaw), Math.sin(yaw), game.map, BLIND_REACH, pitch, playerEyeZ(p)) < BLIND_REACH;
}

/** The shot cone from cover: blind fire sprays. */
export function coverCone(p, cone, blind = isBlindFiring(p)) {
  if (!blind) return cone;
  return Math.max(cone * BLIND_FIRE_SPREAD_MULT, BLIND_FIRE_MIN_CONE);
}

/**
 * Move the shot to where a blind-fired round leaves: up over low cover (the
 * standing eye, while the camera stays down), or round the end of high cover
 * when at one. Returns what endCoverShot needs to put the player back, or null
 * when this is not blind fire. Even if a shot threw between the two, the next
 * frame's updateCover puts the player back on the face.
 */
export function beginCoverShot(game, blind = isBlindFiring(game.player)) {
  const p = game.player;
  if (!blind) return null;
  p._blindFireAt = game.time;
  const saved = { x: p.x, y: p.y, crouchBlend: p.crouchBlend, eye: playerEyeZ(p) };
  const f = p.cover.face;
  if (f.low) p.crouchBlend = 0;
  else {
    const edge = edgeAt(f, p.cover.s);
    if (edge) {
      const pt = facePoint(f, leanS(f, edge));
      p.x = pt.x;
      p.y = pt.y;
    }
  }
  return saved;
}

/**
 * Where a blind-fired round is sent: from where it leaves (beginCoverShot's
 * standing eye over low cover, or the lean point round the end of high
 * cover) at the point under the reticle, as the camera behind the cover sees
 * it. Flown on the camera's own yaw and pitch it passed beside or over what
 * the reticle was on, by the whole lean or lift. That point is on the
 * nearest enemy close to the aim line, or a few cells out with none.
 * @returns {{ yaw: number, pitch: number }}
 */
export function coverShotAim(game, saved, yaw, pitch) {
  if (!saved) return { yaw, pitch };
  const p = game.player;
  let dist = BLIND_AIM_FALLBACK;
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.active || e.state === "dead") continue;
    const d = Math.hypot(e.x - saved.x, e.y - saved.y);
    const off = Math.atan2(e.y - saved.y, e.x - saved.x) - yaw;
    if (d > 0.5 && d < dist && Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) < BLIND_AIM_CONE) dist = d;
  }
  const tx = saved.x + Math.cos(yaw) * dist - p.x;
  const ty = saved.y + Math.sin(yaw) * dist - p.y;
  const along = Math.max(0.5, Math.hypot(tx, ty));
  const rise = saved.eye + Math.tan(pitch) * dist - playerEyeZ(p);
  return { yaw: Math.atan2(ty, tx), pitch: Math.atan(rise / along) };
}

export function endCoverShot(game, saved) {
  if (!saved) return;
  const p = game.player;
  p.x = saved.x;
  p.y = saved.y;
  p.crouchBlend = saved.crouchBlend;
}

/** Bolts fired from low cover fly over the block they were fired across. */
export const shotClearsCover = (p) => !!p?.cover?.face.low;

/** A kill from cover: peeked or blind-fired? */
export function noteCoverKill(game) {
  const p = game.player;
  if (!p?.cover) return;
  if (p.coverPeeking) emit(game, "peekKills", "peekKill");
  else if (game.time - (p._blindFireAt ?? -Infinity) < BLIND_KILL_MS) emit(game, "blindFireKills", "blindFireKill");
}

/**
 * Does the player's cover stop a shot from (fromX, fromY)? Only while down
 * behind it: standing up over low cover or leaning out exposes them.
 */
export function coverShields(game, fromX, fromY) {
  if (!coverHides(game.player, fromX, fromY)) return false;
  emit(game, "shotsBlocked", "shotBlocked");
  return true;
}
