// src/world/voxel-physics.js
// Swept-AABB collision, block picking and line of sight against the voxel World.
// Everything here is pure: it reads the world and returns a new position, so the
// player, enemies and the build tools can all share one notion of "solid".
import { isSolid } from "./blocks.js";
import { World } from "./world.js";

export const PLAYER = { half: 0.3, height: 1.7, crouchHeight: 1.2, eye: 1.6, crouchEye: 1.1, gravity: 24, jump: 8.5, step: 1.0, reach: 6, fallDamageFrom: 6 };

/** Penetration a body may have before it counts as overlapping; keeps a flush body out of the next cell. */
const EPS = 1e-3;
/** Gap left between a body and the face it stopped against, so the contact is never knife-edge. */
const SKIN = 1e-4;
/** Sweep granularity. A block blocks at least 1 unit of travel, so a sub-step this short can never skip one. */
const SUBSTEP = 0.25;
/** How far under the feet we look for support before allowing a step-up. */
const SUPPORT = 0.05;

const AXES = ["x", "y", "z"];

/**
 * Eye height of a player whose feet are at `z`, riding the crouch blend the
 * same way the camera and the raycaster's `playerEyeZ` do. Sight lines — the
 * camera's, the enemies' — all start here.
 */
export function playerEyeZ3D(player) {
  const t = Math.min(1, Math.max(0, player.crouchBlend || 0));
  return (player.z || 0) + PLAYER.eye + (PLAYER.crouchEye - PLAYER.eye) * t;
}

/** Any solid block inside the box [x±half, y±half, z..z+height)? */
export function aabbOverlapsSolid(world, x, y, z, half, height) {
  const x0 = Math.floor(x - half), x1 = Math.floor(x + half - EPS);
  const y0 = Math.floor(y - half), y1 = Math.floor(y + half - EPS);
  const z0 = Math.floor(z), z1 = Math.floor(z + height - EPS);
  for (let bz = z0; bz <= z1; bz++) for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) {
    if (isSolid(world.get(bx, by, bz))) return true;
  }
  return false;
}

/** z just above the highest solid block in a column (0 when the column holds none). */
function columnTop(world, x, y) {
  for (let z = World.H - 1; z >= 0; z--) if (isSolid(world.get(x, y, z))) return z + 1;
  return 0;
}

/** Highest solid top under the footprint (0 if none). */
export function groundHeight(world, x, y, half) {
  let g = 0;
  const x0 = Math.floor(x - half), x1 = Math.floor(x + half - EPS), y0 = Math.floor(y - half), y1 = Math.floor(y + half - EPS);
  for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) g = Math.max(g, columnTop(world, bx, by));
  return g;
}

/** Overlap test for a body whose `axis` coordinate is `v` instead of its own. */
function overlapsAt(world, b, axis, v) {
  return aabbOverlapsSolid(world, axis === 0 ? v : b.x, axis === 1 ? v : b.y, axis === 2 ? v : b.z, b.half, b.height);
}

/**
 * Where the body rests against the block it entered at `v` moving along `axis` in
 * direction `dir`. Only the leading face can enter a new cell within one sub-step,
 * so the blocker's near plane is that cell's boundary.
 */
function contactPos(b, axis, v, dir) {
  const reach = axis === 2 ? b.height : b.half; // origin to the leading face
  if (dir > 0) return Math.floor(v + reach - EPS) - reach - SKIN;
  const far = Math.floor(axis === 2 ? v : v - b.half) + 1; // the blocker's far edge, an exact integer
  // Landing sits flush on the block top — that top is the floor of the air cell the feet occupy.
  return axis === 2 ? far : far + b.half + SKIN;
}

/**
 * Move `b` along one axis, stopping against the first block in the way. Travels in
 * sub-steps no longer than SUBSTEP so a fast body cannot tunnel, and only ever
 * leaves `b` somewhere `aabbOverlapsSolid` calls free. A body that starts inside a
 * solid has nothing to rest against, so it is reported blocked and left where it is —
 * this never pushes a body out of a block.
 * @returns {boolean} true when something blocked the move
 */
function sweepAxis(world, b, axis, delta) {
  const key = AXES[axis];
  const start = b[key];
  const n = Math.max(1, Math.ceil(Math.abs(delta) / SUBSTEP));
  const s = delta / n;
  let pos = start;
  for (let i = 0; i < n; i++) {
    const next = pos + s;
    if (!overlapsAt(world, b, axis, next)) { pos = next; continue; }
    const flush = contactPos(b, axis, next, Math.sign(s));
    b[key] = overlapsAt(world, b, axis, flush) ? pos : flush;
    return true;
  }
  b[key] = start + delta; // the whole move landed: take the exact destination, not the summed sub-steps
  return false;
}

/**
 * Hold a body inside the world box. The world is 128×128×64 blocks and nothing
 * beyond it: the sides are walls and the bottom is the floor, so a body that
 * walks off the map stops at the edge instead of falling forever onto whatever
 * an out-of-bounds read happens to answer. Clamping here rather than leaning on
 * `World.get`'s below-zero BEDROCK makes the physics independent of it.
 * Sets `hitX`/`hitY`/`hitZ` on `out` for whichever axis a clamp engaged.
 */
function clampToWorld(b, out) {
  const cx = Math.min(World.W - b.half, Math.max(b.half, b.x));
  const cy = Math.min(World.D - b.half, Math.max(b.half, b.y));
  const cz = Math.min(World.H - b.height, Math.max(0, b.z));
  if (cx !== b.x) { b.x = cx; out.hitX = true; }
  if (cy !== b.y) { b.y = cy; out.hitY = true; }
  if (cz !== b.z) { b.z = cz; out.hitZ = true; }
}

/**
 * Axis-separated swept move with one-block step-up, bounded by the world box.
 * @param {{x:number,y:number,z:number,half:number,height:number}} body feet at z
 * @returns {{x:number,y:number,z:number,hitX:boolean,hitY:boolean,hitZ:boolean,grounded:boolean,stepped:boolean}}
 */
export function moveAABB(world, body, dx, dy, dz, { step = PLAYER.step } = {}) {
  const b = { x: body.x, y: body.y, z: body.z, half: body.half, height: body.height };
  const out = { hitX: false, hitY: false, hitZ: false, grounded: false, stepped: false };
  // Only a body that is standing on something may climb; one in mid-air just hits the wall.
  const supported = (p) => aabbOverlapsSolid(world, p.x, p.y, p.z - SUPPORT, b.half, b.height);

  const sweepWithStep = (axis, delta) => {
    const key = AXES[axis];
    const from = { x: b.x, y: b.y, z: b.z };
    // Asked per axis: an earlier axis may have stepped the body up, or off a ledge.
    const onGround = supported(from);
    const blocked = sweepAxis(world, b, axis, delta);
    if (!blocked || step <= 0 || !onGround) return blocked;
    const gained = Math.abs(b[key] - from[key]);
    // Retry the move one step higher, then drop back onto whatever is up there.
    const up = { x: from.x, y: from.y, z: from.z + step, half: b.half, height: b.height };
    if (aabbOverlapsSolid(world, up.x, up.y, up.z, b.half, b.height)) return true; // no headroom to lift into
    const blockedUp = sweepAxis(world, up, axis, delta);
    if (Math.abs(up[key] - from[key]) <= gained + EPS) return true; // the obstacle is more than one block tall
    sweepAxis(world, up, 2, -step);
    b.x = up.x; b.y = up.y; b.z = up.z;
    out.stepped ||= up.z > from.z + EPS; // a later axis settling back down does not undo an earlier climb
    return blockedUp;
  };

  if (dx !== 0) out.hitX = sweepWithStep(0, dx);
  if (dy !== 0) out.hitY = sweepWithStep(1, dy);
  if (dz !== 0) out.hitZ = sweepAxis(world, b, 2, dz);
  clampToWorld(b, out);
  // `b.z <= 0` is the world floor itself, stood on without a block to stand on.
  out.grounded = (out.hitZ && dz < 0) || b.z <= 0 || supported(b);
  return { x: b.x, y: b.y, z: b.z, ...out };
}

/**
 * 3D DDA. Returns the first non-air block within `maxDist`, with the face entered.
 * The cell the ray starts in is skipped, so a ray cast from inside a block still gets out.
 * @returns {{x:number,y:number,z:number,face:number[],dist:number,id:number}|null}
 */
export function raycastBlocks(world, ox, oy, oz, dx, dy, dz, maxDist) {
  const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9)), tdz = Math.abs(1 / (dz || 1e-9));
  let tx = dx === 0 ? Infinity : dx > 0 ? (x + 1 - ox) * tdx : (ox - x) * tdx;
  let ty = dy === 0 ? Infinity : dy > 0 ? (y + 1 - oy) * tdy : (oy - y) * tdy;
  let tz = dz === 0 ? Infinity : dz > 0 ? (z + 1 - oz) * tdz : (oz - z) * tdz;
  let face = [0, 0, 0], t = 0;
  for (let i = 0; i < 4 * maxDist + 8; i++) {
    const id = world.get(x, y, z);
    if (i > 0 && isSolid(id)) return { x, y, z, id, face, dist: t };
    if (tx < ty && tx < tz) { t = tx; tx += tdx; x += sx; face = [-sx, 0, 0]; }
    else if (ty < tz) { t = ty; ty += tdy; y += sy; face = [0, -sy, 0]; }
    else { t = tz; tz += tdz; z += sz; face = [0, 0, -sz]; }
    if (t > maxDist) return null;
    if (z < 0 || z >= World.H) return null;
  }
  return null;
}

/** Nothing solid between the two points (the ray stops before the target). */
export function hasLineOfSight3D(world, x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, d = Math.hypot(dx, dy, dz);
  if (d < 1e-6) return true;
  return !raycastBlocks(world, x1, y1, z1, dx, dy, dz, d);
}
