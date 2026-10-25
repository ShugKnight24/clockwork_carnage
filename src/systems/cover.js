// ─── Cover ──────────────────────────────────────────────────────────────────
// Hugging a wall, Gears of War style, on the raycaster's grid. Pure queries
// and arithmetic; src/systems/cover-play.js applies them to the game.
//
// A cover *face* is one side of a solid cell, with the open floor in front of
// it. Neighbouring cells of the same kind along the same side join it into a
// run, so a counter four tiles long is one face the player slides along. A
// full or shoulder-high wall is high cover (you lean out round its ends); a
// waist-high block (see LAYER in src/data/levels/map-helpers.js) is low cover
// (you stand up over it). Knee-high blocks hide nothing and are not cover.
//
// Coordinates on a face: `s` runs along it (world x for a face that runs
// along x, world y otherwise), `depth` is the fixed distance out from the
// face where the player's centre sits. The run spans cells kLo..kHi.
// ─────────────────────────────────────────────────────────────────────────────
import { wallHeight, isPassable, hasLineOfSight, EYE_Z } from "./physics.js";

/** How far in front of the face the player's centre sits once snapped. */
export const COVER_OFFSET = 0.32;
/** How far away a face can be and still be taken (tiles, along the view). */
export const COVER_REACH = 1.3;
/** Below this a block is a step, not cover: a crouch behind it hides nothing. */
export const COVER_MIN_HEIGHT = 0.35;
/** The player's centre stays this far inside the ends of a run. */
export const COVER_EDGE_MARGIN = 0.3;
/** Within this of a run's end, aiming leans out round it. */
export const COVER_EDGE_NEAR = 0.3;
/** How far past the end of high cover a lean takes the eye. */
export const COVER_LEAN = 0.7;
/** Cover-to-cover: the furthest face a slide will carry you to. */
export const COVER_DASH_RANGE = 4.5;
/** Blind fire scatters this many times wider than the weapon's hip cone... */
export const BLIND_FIRE_SPREAD_MULT = 2;
/** ...and never tighter than this (radians), even for a precise rifle. */
export const BLIND_FIRE_MIN_CONE = 0.03;

// Doors open and secret walls slide away: neither is something to stand behind.
const NOT_COVER = new Set([5, 6]);

/** "low", "high" or null for a cell. */
export function coverClass(map, cx, cy) {
  if (!map?.grid || cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) return null;
  const v = map.grid[cy][cx];
  if (v === 0 || NOT_COVER.has(v)) return null;
  const h = wallHeight(map, cx, cy);
  if (h < COVER_MIN_HEIGHT) return null;
  // Only cover under the standing eye can be seen and shot over.
  return h < EYE_Z ? "low" : "high";
}

/**
 * March a ray to the first solid cell within `maxDist`. Low cover stops it
 * too: the question is what the player is facing, not what they can see.
 * `skip(cx, cy)` lets a caller look past cells (its own cover).
 * @returns {{ cx, cy, nx, ny, dist, x, y } | null} the cell, the normal of the
 *   side the ray entered by, and where it met that side
 */
export function castToFace(map, x, y, dirX, dirY, maxDist, skip = null) {
  let mapX = Math.floor(x);
  let mapY = Math.floor(y);
  const ddx = Math.abs(1 / (Math.abs(dirX) < 1e-9 ? 1e-9 : dirX));
  const ddy = Math.abs(1 / (Math.abs(dirY) < 1e-9 ? 1e-9 : dirY));
  const stepX = dirX < 0 ? -1 : 1;
  const stepY = dirY < 0 ? -1 : 1;
  let sideX = dirX < 0 ? (x - mapX) * ddx : (mapX + 1 - x) * ddx;
  let sideY = dirY < 0 ? (y - mapY) * ddy : (mapY + 1 - y) * ddy;
  for (;;) {
    let dist, side;
    if (sideX < sideY) {
      dist = sideX;
      sideX += ddx;
      mapX += stepX;
      side = 0;
    } else {
      dist = sideY;
      sideY += ddy;
      mapY += stepY;
      side = 1;
    }
    if (dist > maxDist) return null;
    if (mapX < 0 || mapY < 0 || mapX >= map.width || mapY >= map.height) return null;
    if (map.grid[mapY][mapX] === 0) continue;
    if (skip?.(mapX, mapY)) continue;
    return {
      cx: mapX,
      cy: mapY,
      nx: side === 0 ? -stepX : 0,
      ny: side === 1 ? -stepY : 0,
      dist,
      x: x + dirX * dist,
      y: y + dirY * dist,
    };
  }
}

/**
 * The cover face on side (nx, ny) of cell (cx, cy), grown along its side into
 * the whole run of same-kind cover with floor in front. Null when the cell is
 * not cover or there is nowhere to stand.
 */
export function coverFace(map, cx, cy, nx, ny) {
  const kind = coverClass(map, cx, cy);
  if (!kind || (!nx && !ny)) return null;
  // A face with its normal on y runs along x, and the other way round.
  const alongX = ny !== 0;
  const cell = (k) => (alongX ? [k, cy] : [cx, k]);
  const stand = (k) => (alongX ? [k, cy + ny] : [cx + nx, k]);
  const k0 = alongX ? cx : cy;
  if (!isPassable(map, ...stand(k0))) return null;
  const joins = (k) => coverClass(map, ...cell(k)) === kind && isPassable(map, ...stand(k));
  let kLo = k0;
  let kHi = k0;
  while (joins(kLo - 1)) kLo--;
  while (joins(kHi + 1)) kHi++;
  // An end you can lean round: open floor past it, in the cover's row and in
  // the row you stand in.
  const open = (k) => {
    const [a, b] = cell(k);
    return map.grid[b]?.[a] === 0 && isPassable(map, ...stand(k));
  };
  const face = alongX ? cy + (ny > 0 ? 1 : 0) : cx + (nx > 0 ? 1 : 0);
  return {
    cx,
    cy,
    nx,
    ny,
    kind,
    low: kind === "low",
    alongX,
    face,
    depth: face + (alongX ? ny : nx) * COVER_OFFSET,
    kLo,
    kHi,
    sMin: kLo + COVER_EDGE_MARGIN,
    sMax: kHi + 1 - COVER_EDGE_MARGIN,
    edgeLo: open(kLo - 1),
    edgeHi: open(kHi + 1),
  };
}

/** World point on a face's standing line at `s`. */
export function facePoint(f, s) {
  return f.alongX ? { x: s, y: f.depth } : { x: f.depth, y: s };
}

/** A world point's coordinate along a face. */
export function tangentOf(f, x, y) {
  return f.alongX ? x : y;
}

/** How far a point is in front of a face's plane (negative: behind it). */
export function signedDepth(f, x, y) {
  return f.alongX ? (y - f.face) * f.ny : (x - f.face) * f.nx;
}

/** Same run on the same side? */
export function sameFace(a, b) {
  return !!a && !!b && a.nx === b.nx && a.ny === b.ny && a.face === b.face && a.kLo === b.kLo && a.kHi === b.kHi;
}

/** Does cell (cx, cy) belong to face `f`'s run? */
export function inRun(f, cx, cy) {
  if (!f) return false;
  return f.alongX
    ? cy === f.cy && cx >= f.kLo && cx <= f.kHi
    : cx === f.cx && cy >= f.kLo && cy <= f.kHi;
}

export const clampS = (f, s) => Math.max(f.sMin, Math.min(f.sMax, s));

/**
 * Can a body of radius `margin` walk the straight line from (x0, y0) to
 * (x1, y1)? Sampled every tenth of a tile.
 */
export function pathClear(map, x0, y0, x1, y1, margin = 0.2) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(d / 0.1));
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    if (
      !isPassable(map, Math.floor(x - margin), Math.floor(y - margin)) ||
      !isPassable(map, Math.floor(x + margin), Math.floor(y - margin)) ||
      !isPassable(map, Math.floor(x - margin), Math.floor(y + margin)) ||
      !isPassable(map, Math.floor(x + margin), Math.floor(y + margin))
    ) return false;
  }
  return true;
}

// The view ray, then a little either side, so a face taken at an angle or
// across a corner still counts as the one being looked at.
const LOOK_OFFSETS = [0, -0.3, 0.3];

/**
 * The cover face the player is facing, close enough to take, with the point
 * they would snap to: `{ ...face, s, x, y }`, or null.
 */
export function findCover(map, x, y, angle, reach = COVER_REACH) {
  if (!map?.grid) return null;
  for (const off of LOOK_OFFSETS) {
    const a = angle + off;
    const hit = castToFace(map, x, y, Math.cos(a), Math.sin(a), reach);
    if (!hit) continue;
    const f = coverFace(map, hit.cx, hit.cy, hit.nx, hit.ny);
    if (!f) continue;
    const depth = signedDepth(f, x, y);
    if (depth < 0 || depth > reach + 0.2) continue;
    const here = tangentOf(f, x, y);
    const s = clampS(f, here);
    // A snap is a short step to the wall, not a hop round a corner.
    if (Math.abs(s - here) > 0.9) continue;
    const p = facePoint(f, s);
    if (!pathClear(map, x, y, p.x, p.y)) continue;
    return { ...f, s, x: p.x, y: p.y };
  }
  return null;
}

/** -1 or 1 when `s` is at an end of the run that can be leaned round, else 0. */
export function edgeAt(f, s) {
  if (f.edgeLo && s <= f.sMin + COVER_EDGE_NEAR) return -1;
  if (f.edgeHi && s >= f.sMax - COVER_EDGE_NEAR) return 1;
  return 0;
}

/** Where a full lean round the `dir` end puts the player's centre along the face. */
export function leanS(f, dir) {
  return dir < 0 ? f.sMin - COVER_LEAN : f.sMax + COVER_LEAN;
}

/**
 * Would cover face `f` stop a shot from (fromX, fromY) at a player at
 * (px, py)? Yes when the shooter is beyond the face and the line between them
 * crosses the run. The caller decides whether the player is down behind it;
 * leaning out of high cover moves the player past the run's end, so the line
 * misses it by itself.
 */
export function coverBlocksShot(f, px, py, fromX, fromY) {
  if (!f) return false;
  const dp = signedDepth(f, px, py);
  const ds = signedDepth(f, fromX, fromY);
  if (!(ds < 0) || !(dp > 0)) return false;
  const u = dp / (dp - ds);
  const sp = tangentOf(f, px, py);
  const q = sp + (tangentOf(f, fromX, fromY) - sp) * u;
  return q >= f.kLo - 0.05 && q <= f.kHi + 1.05;
}

/**
 * Is a player hidden by their cover from (x, y)? Only while down behind it:
 * not mid-snap, not standing up over it or leaned out round it.
 */
export function coverHides(player, x, y) {
  const c = player?.cover;
  if (!c || c.snap || player.coverPeeking) return false;
  return coverBlocksShot(c.face, player.x, player.y, x, y);
}

/**
 * A different cover face along the view, within slide range, that the player
 * can reach in a straight line: `{ ...face, s, x, y }`, or null. The ray looks
 * past the player's own cover (`current`), which is what a view over a
 * counter sees first.
 */
export function coverDashTarget(map, x, y, angle, current = null, range = COVER_DASH_RANGE) {
  if (!map?.grid) return null;
  const skip = current ? (cx, cy) => inRun(current, cx, cy) && current.low : null;
  for (const off of [0, -0.2, 0.2]) {
    const a = angle + off;
    const hit = castToFace(map, x, y, Math.cos(a), Math.sin(a), range + COVER_OFFSET + 0.5, skip);
    if (!hit) continue;
    const f = coverFace(map, hit.cx, hit.cy, hit.nx, hit.ny);
    if (!f || sameFace(f, current)) continue;
    const s = clampS(f, tangentOf(f, hit.x, hit.y));
    const p = facePoint(f, s);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < 1 || d > range) continue;
    if (!pathClear(map, x, y, p.x, p.y)) continue;
    return { ...f, s, x: p.x, y: p.y };
  }
  return null;
}

/**
 * The yaw to settle the view on after snapping. Over low cover the player
 * already looks where they want to shoot. Against high cover, staring at the
 * wall from a third of a tile shows nothing, so the view turns along the wall
 * toward the end it can lean round (the nearer one when both can), angled
 * out past the wall the way a lean will look.
 */
export function coverViewAngle(f, s, angle) {
  if (f.low) return angle;
  let dir;
  if (f.edgeLo && f.edgeHi) dir = s - f.sMin <= f.sMax - s ? -1 : 1;
  else if (f.edgeLo) dir = -1;
  else if (f.edgeHi) dir = 1;
  else dir = s - f.sMin <= f.sMax - s ? -1 : 1;
  const tx = f.alongX ? dir : 0;
  const ty = f.alongX ? 0 : dir;
  const turn = 0.7;
  return Math.atan2(ty * Math.cos(turn) - f.ny * Math.sin(turn), tx * Math.cos(turn) - f.nx * Math.sin(turn));
}

/**
 * A tile an enemy at `from` can move to for an angle on a player in cover:
 * open floor 2.5-7 tiles from the player with sight of them at `eyeZ`,
 * favouring tiles near the enemy and about four tiles out. With the player's
 * cover `face`, only tiles on the player's own side of it count: from the end
 * of a counter, sight can graze the corner a round would still hit. Null when
 * there is none.
 */
export function flankSpot(map, player, eyeZ, from, face = null, minR = 2.5, maxR = 7) {
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  const R = Math.ceil(maxR);
  let best = null;
  let bestScore = Infinity;
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const r = Math.hypot(dx, dy);
      if (r < minR || r > maxR) continue;
      const cx = px + dx;
      const cy = py + dy;
      if (!isPassable(map, cx, cy)) continue;
      const x = cx + 0.5;
      const y = cy + 0.5;
      if (face && signedDepth(face, x, y) < 0.3) continue;
      const score = Math.hypot(x - from.x, y - from.y) + Math.abs(r - 4) * 0.5;
      // Scored before the sight test, which is the expensive part.
      if (score >= bestScore) continue;
      if (!hasLineOfSight(map, x, y, player.x, player.y, EYE_Z, eyeZ)) continue;
      best = { x, y };
      bestScore = score;
    }
  }
  return best;
}

/**
 * Does a bolt fly over the low cell (mx, my) rather than die on it? A player
 * round fired from low cover clears the block it was fired over; an enemy
 * round clears the block a player is standing up over. Anything else stops
 * at the cell as before.
 */
export function boltClearsCover(p, map, mx, my, player) {
  if (wallHeight(map, mx, my) >= EYE_Z) return false;
  if (p.owner === "player") {
    return !!p._overCover && Math.hypot(p.x - p.originX, p.y - p.originY) < 1.6;
  }
  const f = player?.cover?.face;
  return !!(player?.coverPeeking && f?.low && inRun(f, mx, my) && Math.hypot(p.x - player.x, p.y - player.y) < 1.6);
}
