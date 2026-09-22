// Pure helpers shared by the Forge, the voxel render pipeline and the
// play-test spawner. Everything here reads its inputs and returns a value —
// no game state, so it is unit-testable without a browser.

import { getArtStyle, ART_LEGACY, ART_REALISTIC } from "../rendering/art-style.js";
import { PLAYER, aabbOverlapsSolid, playerEyeZ3D } from "../world/voxel-physics.js";
import { World } from "../world/world.js";

/**
 * Art style id → the name `VoxelRenderer.setStyle` understands.
 * Players see Legacy / Comic / Modern; ART_MODERN (1) is Comic.
 */
export function styleName(style = getArtStyle()) {
  if (style === ART_LEGACY) return "legacy";
  if (style === ART_REALISTIC) return "modern";
  return "comic";
}

/**
 * Camera for the voxel renderer from a gameplay player. `z` is the feet
 * height, so the eye rides the crouch blend the same way `playerEyeZ` does
 * for the raycaster.
 * @param {object} player
 * @param {object} [settings] supplies the default FOV
 * @param {number} [fovDeg] effective FOV (ADS/sprint) when the caller has one
 */
export function camFromPlayer(player, settings = {}, fovDeg = settings.fov || 70) {
  return {
    x: player.x,
    y: player.y,
    z: playerEyeZ3D(player),
    yaw: player.angle || 0,
    pitch: player.pitch || 0,
    fovDeg,
  };
}

/** Gap looked through for a floor; matches the support test in voxel-physics. */
const SUPPORT = 0.05;

/**
 * Room for a standing body at (x, y, z) with something under its feet.
 * Support matters: a spawn hanging over a hole drops whatever stands there
 * forever in a world that has no floor under it.
 */
function standable(world, x, y, z, half = PLAYER.half, height = PLAYER.height) {
  if (z < 0 || z + height >= World.H) return false;
  if (aabbOverlapsSolid(world, x, y, z, half, height)) return false;
  return aabbOverlapsSolid(world, x, y, z - SUPPORT, half, height);
}

/** Cells of the square ring at radius `r` around (cx, cy), the centre when r is 0. */
function* ring(cx, cy, r) {
  if (r === 0) { yield [cx, cy]; return; }
  for (let d = -r; d <= r; d++) {
    yield [cx + d, cy - r];
    yield [cx + d, cy + r];
  }
  for (let d = -r + 1; d <= r - 1; d++) {
    yield [cx - r, cy + d];
    yield [cx + r, cy + d];
  }
}

const SEARCH_RADIUS = 24;

/**
 * The nearest cell to (x, y, z) where a body of this size stands with something
 * under its feet. A marker buried by a later edit — a block dropped on it, or a
 * legacy import that landed it inside converted terrain — resolves to the top
 * of what buried it: the column is searched upward first, then the columns
 * around it, so the body starts on the nearest free supported cell.
 * @returns {{x:number,y:number,z:number}|null} null when nowhere within reach fits
 */
export function standableNear(world, x, y, z, half = PLAYER.half, height = PLAYER.height) {
  if (standable(world, x, y, z, half, height)) return { x, y, z };
  for (let up = Math.floor(z) + 1; up + height < World.H; up++) {
    if (standable(world, x, y, up, half, height)) return { x, y, z: up };
  }
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  for (let r = 0; r <= SEARCH_RADIUS; r++) {
    for (const [bx, by] of ring(cx, cy, r)) {
      if (bx < 0 || by < 0 || bx >= World.W || by >= World.D) continue;
      const top = world.topSolid(bx, by) + 1;
      if (top <= 0) continue; // an empty column has no floor to stand on
      if (standable(world, bx + 0.5, by + 0.5, top, half, height)) {
        return { x: bx + 0.5, y: by + 0.5, z: top };
      }
    }
  }
  return null;
}

/**
 * Where a play-test starts. The world's own spawn wins; when it is buried the
 * nearest standable cell is used instead.
 * @returns {{x:number,y:number,z:number,yaw:number}|null} null when nowhere fits
 */
export function spawnFromMeta(world) {
  if (!world || !world.meta) return null;
  const s = world.meta.spawn;
  const at = standableNear(
    world,
    s?.x ?? World.W / 2,
    s?.y ?? World.D / 2,
    s?.z ?? World.GROUND,
  );
  return at ? { ...at, yaw: s?.yaw || 0 } : null;
}
