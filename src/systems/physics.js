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
 * Eye height in wall units: the floor is 0, the ceiling 1, and the horizon —
 * where a standing agent looks — is halfway up.
 */
export const EYE_Z = 0.5;

/** Crouched eye height. Low enough that waist-high cover actually covers. */
export const CROUCH_EYE_Z = 0.3;

/** Eye height for a player, following the eased crouch blend. */
export function playerEyeZ(player) {
  const t = player?.crouchBlend || 0;
  return EYE_Z + (CROUCH_EYE_Z - EYE_Z) * t;
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
