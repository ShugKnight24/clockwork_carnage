// ─── Physics System ─────────────────────────────────────────────────────────
// Pure spatial queries against the map grid.
// No state — every call receives the map explicitly.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a map cell is walkable (within bounds and grid value === 0).
 * @param {object} map - { width, height, grid[][] }
 * @param {number} mx - Grid X coordinate (integer)
 * @param {number} my - Grid Y coordinate (integer)
 * @returns {boolean}
 */
/**
 * Eye height in wall units: the floor is 0, the top of the wall art 1, and the
 * horizon — where a standing agent looks — is halfway up.
 */
export const EYE_Z = 0.5;

/**
 * Height of the ceiling plane, and of a full wall, as drawn. The figures and
 * the wall art keep their scale (art on 0..1, see wallHeight); the raycaster
 * runs each full wall on up to here with an upper band above its art, so a
 * room has headroom over people drawn about a wall tall. Drawing only: line
 * of sight, shots and cover still measure against 1.
 */
export const CEILING_Z = 1.4;

/**
 * Where the player's own eye sits standing. People are drawn about 0.9 of a
 * wall tall with their eyes near 0.8, so a camera at EYE_Z looked up at
 * everyone from their chest, a head shorter than the room. EYE_Z stays the
 * line the art and the hit zones are measured from (sprites are drawn
 * `EYE_Z - eye` lower from a higher eye; shots start `eyeOffsetZ` above it).
 */
export const STAND_EYE_Z = 0.74;

/**
 * Crouched eye height: under the top of waist-high cover (LAYER.WAIST, 0.4),
 * so it actually covers, and the raycaster draws the crouched view from here.
 */
export const CROUCH_EYE_Z = 0.29;

/**
 * Sliding eye height: low enough that the prologue's half-down shutters
 * pass overhead.
 */
export const SLIDE_EYE_Z = 0.21;

/**
 * Eye height for a player: the eased crouch blend takes it from standing to
 * crouched, and the slide blend on top of that takes it lower still.
 */
export function playerEyeZ(player) {
  const t = player?.crouchBlend || 0;
  const s = player?.slideBlend || 0;
  return STAND_EYE_Z + (CROUCH_EYE_Z - STAND_EYE_Z) * t + (SLIDE_EYE_Z - CROUCH_EYE_Z) * s;
}

/**
 * How far a player's eye sits above (positive) or below the standing eye.
 * A grid level measures shots and drawn figures from the standing eye line,
 * so a crouched shot starts this far down it.
 */
export function eyeOffsetZ(player) {
  return playerEyeZ(player) - EYE_Z;
}

/**
 * Height of the wall in a cell, 0 (open) to 1 (floor to ceiling). `heightMap`
 * counts builder layers out of 5; a map without one is all full-height walls.
 */
export function wallHeight(map, mx, my) {
  if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) return 1;
  if (map.grid[my][mx] === 0) return 0;
  const layers = map.heightMap?.[my]?.[mx];
  if (layers == null || layers >= 5 || layers <= 0) return 1;
  return layers / 5;
}

export function isPassable(map, mx, my) {
  if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) return false;
  return map.grid[my][mx] === 0;
}

/**
 * DDA-style ray march to check line of sight between two world positions.
 * Steps at 0.2-unit increments and checks grid cells for walls.
 * @param {object} map - { width, height, grid[][] }
 * @param {number} x1 - Start X (world coords)
 * @param {number} y1 - Start Y (world coords)
 * @param {number} x2 - End X (world coords)
 * @param {number} y2 - End Y (world coords)
 * @returns {boolean}
 */
export function hasLineOfSight(map, x1, y1, x2, y2, z1 = EYE_Z, z2 = EYE_Z) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist / 0.2);
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 1; i < steps; i++) {
    const cx = Math.floor(x1 + stepX * i);
    const cy = Math.floor(y1 + stepY * i);
    if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) return false;
    if (map.grid[cy][cx] === 0) continue;
    // A short wall only blocks sight below its top edge, so waist-high cover
    // hides a crouched agent and not a standing one.
    if (wallHeight(map, cx, cy) > z1 + (z2 - z1) * (i / steps)) return false;
  }
  return true;
}

/**
 * Attempt to move an entity with axis-separated collision.
 * Tries full move first, then each axis independently.
 * @param {object} map
 * @param {number} x - Current X
 * @param {number} y - Current Y
 * @param {number} dx - Desired delta X
 * @param {number} dy - Desired delta Y
 * @param {number} margin - Collision margin (0.2 for player, 0.3 for enemies)
 * @returns {{ x: number, y: number }} New position
 */
export function moveWithCollision(map, x, y, dx, dy, margin) {
  const nx = x + dx;
  const ny = y + dy;

  // Try full move
  if (
    isPassable(map, Math.floor(nx - margin), Math.floor(ny - margin)) &&
    isPassable(map, Math.floor(nx + margin), Math.floor(ny - margin)) &&
    isPassable(map, Math.floor(nx - margin), Math.floor(ny + margin)) &&
    isPassable(map, Math.floor(nx + margin), Math.floor(ny + margin))
  ) {
    return { x: nx, y: ny };
  }

  // Try X only
  let rx = x, ry = y;
  if (
    isPassable(map, Math.floor(nx - margin), Math.floor(y - margin)) &&
    isPassable(map, Math.floor(nx + margin), Math.floor(y - margin)) &&
    isPassable(map, Math.floor(nx - margin), Math.floor(y + margin)) &&
    isPassable(map, Math.floor(nx + margin), Math.floor(y + margin))
  ) {
    rx = nx;
  }

  // Try Y only
  if (
    isPassable(map, Math.floor(x - margin), Math.floor(ny - margin)) &&
    isPassable(map, Math.floor(x + margin), Math.floor(ny - margin)) &&
    isPassable(map, Math.floor(x - margin), Math.floor(ny + margin)) &&
    isPassable(map, Math.floor(x + margin), Math.floor(ny + margin))
  ) {
    ry = ny;
  }

  return { x: rx, y: ry };
}
