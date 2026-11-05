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
import { playerEyeZ, EYE_Z } from "./physics.js";
import { distanceToWall, hitSpan } from "./combat.js";

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
/** A blind-fired round sent at an enemy stays this far (of its height) inside its top and bottom. */
const BLIND_SPAN_INSET = 0.2;
/** A kill this soon after a blind-fire shot counts as a blind-fire kill (ms). */
const BLIND_KILL_MS = 800;
/**
 * Cover-to-cover: the furthest face a dash slides to (cells). The geometry's
 * own 4.5 fell short of the sim hall's drill blocks from most of the first
 * one, and a dash there only stood you up out of cover.
 */
const COVER_DASH_REACH = 5.5;
/** A cover slide may run this long past the slide's own length to get there (ms). */
const COVER_DASH_OVERRUN_MS = 400;

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
function takeCover(game, f, { viaDash = false } = {}) {
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
 * (a roadie run), or step out and let the dash go; on a keyboard a dash
 * straight into the cover with nowhere to slide stays put. On a pad or touch, where
 * the dash button doubles as the cover button, a dash toward a face in reach
 * takes it instead. @returns {boolean} handled: no ordinary dash
 */
export function coverDash(game, dirX, dirY) {
  const p = game.player;
  if (!p || game.world || !game.map) return false;
  if (p.cover) {
    const face = p.cover.face;
    // The cover the view is on; failing that, the cover the dash is pointed
    // at (a strafe key held with it).
    let t = coverDashTarget(game.map, p.x, p.y, p.angle, face, COVER_DASH_REACH);
    if (!t && (dirX || dirY)) t = coverDashTarget(game.map, p.x, p.y, Math.atan2(dirY, dirX), face, COVER_DASH_REACH);
    if (!t) {
      // Straight into your own cover a dash goes nowhere: stay on it rather
      // than stand up out of it for nothing. On a pad or touch the dash
      // button is also how you leave cover, so there it always steps out.
      const device = activeDevice(game);
      const leaves = device === "gamepad" || device === "touch";
      if (!leaves && dirX * face.nx + dirY * face.ny < -0.7) return true;
      leaveCover(game);
      return false;
    }
    leaveCover(game);
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
    p._coverDash = { face: t, until: game.time + p.slideDuration * 1000 + COVER_DASH_OVERRUN_MS };
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
  if (ahead > 0.3 && game.time < run.until) {
    // The slide ran out short of a far face: keep it going at its tail
    // speed, or it stopped in the open and dropped you out of cover.
    if (!p.isSliding) {
      p.isSliding = true;
      p.slideTime = p.slideDuration * 0.1;
    }
    return;
  }
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
  // end of high cover you are at. Elsewhere along high cover (and against a
  // wall with no end to lean round) the sights still come up, with nothing
  // to pop out of: you stay hidden. The sights wait on `peek`
  // (src/systems/aim.js), and it used to stay at 0 there, so aiming did
  // nothing at all against most of a wall.
  const edge = edgeAt(f, c.s);
  if (!f.low && p.isAiming && !c.lean && edge && !c.snap) {
    c.lean = edge;
    c.peek = 0; // ease out round the end from the wall, not from sights already up
  }
  const wantPeek = p.isAiming && !c.snap && (f.low || !!c.lean);
  const sightsUp = p.isAiming && !c.snap;
  c.peek += ((sightsUp ? 1 : 0) - c.peek) * Math.min(1, PEEK_RATE * dt);
  if (!sightsUp && c.peek < 0.02) {
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
  p.coverDashTarget = c.snap ? null : coverDashTarget(map, p.x, p.y, p.angle, f, COVER_DASH_REACH);
}

/** Firing from cover without the sights up: blind fire, if the cover is in the shot's way. */
const isBlindFiring = (p) => !!p?.cover && !p.isAiming;

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
 * cover) at what the reticle is pointed at. Down behind low cover the view
 * is all block, so the reticle can only be pointed roughly the way an enemy
 * is: the round goes at the nearest enemy close to the aim line, at the
 * reticle's height on it kept inside the figure, and the blind spread is
 * what makes it wild. Aimed only past the camera's own line, it needed the
 * reticle within a body's width of a figure the player could not see, and
 * blind fire took many rounds to land one. With no enemy near the line it
 * goes at the point under the reticle a few cells out.
 * @returns {{ yaw: number, pitch: number }}
 */
export function coverShotAim(game, saved, yaw, pitch) {
  if (!saved) return { yaw, pitch };
  const p = game.player;
  let dist = BLIND_AIM_FALLBACK;
  let mark = null;
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.active || e.state === "dead") continue;
    const d = Math.hypot(e.x - saved.x, e.y - saved.y);
    const off = Math.atan2(e.y - saved.y, e.x - saved.x) - yaw;
    if (d > 0.5 && d < dist && Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) < BLIND_AIM_CONE) {
      dist = d;
      mark = e;
    }
  }
  // The reticle's height out there, as the camera behind the cover sees it.
  let z = saved.eye + Math.tan(pitch) * dist;
  let tx = saved.x + Math.cos(yaw) * dist - p.x;
  let ty = saved.y + Math.sin(yaw) * dist - p.y;
  if (mark) {
    // hitSpan is measured from the standing eye line (EYE_Z); z from the floor.
    const [lo, hi] = hitSpan(mark);
    const inset = (hi - lo) * BLIND_SPAN_INSET;
    z = Math.max(lo + inset + EYE_Z, Math.min(hi - inset + EYE_Z, z));
    tx = mark.x - p.x;
    ty = mark.y - p.y;
  }
  const along = Math.max(0.5, Math.hypot(tx, ty));
  const rise = z - playerEyeZ(p);
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
