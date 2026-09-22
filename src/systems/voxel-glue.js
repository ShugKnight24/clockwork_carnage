// Pure helpers shared by the Forge, the voxel render pipeline and the
// play-test spawner. Everything here reads its inputs and returns a value —
// no game state, so it is unit-testable without a browser.

import { getArtStyle, ART_LEGACY, ART_REALISTIC } from "../rendering/art-style.js";
import { PLAYER, aabbOverlapsSolid } from "../world/voxel-physics.js";
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
  const t = Math.min(1, Math.max(0, player.crouchBlend || 0));
  const eye = PLAYER.eye + (PLAYER.crouchEye - PLAYER.eye) * t;
  return {
    x: player.x,
    y: player.y,
    z: (player.z || 0) + eye,
    yaw: player.angle || 0,
    pitch: player.pitch || 0,
    fovDeg,
  };
}

/** Gap looked through for a floor; matches the support test in voxel-physics. */
const SUPPORT = 0.05;

/**
 * Room for a standing player at (x, y, z) with something under their feet.
 * Support matters: a spawn hanging over a hole drops the player forever in a
 * world that has no floor there.
 */
function standable(world, x, y, z) {
  if (z < 0 || z + PLAYER.height >= World.H) return false;
  if (aabbOverlapsSolid(world, x, y, z, PLAYER.half, PLAYER.height)) return false;
  return aabbOverlapsSolid(world, x, y, z - SUPPORT, PLAYER.half, PLAYER.height);
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
 * Where a play-test starts. The world's own spawn wins; when it is buried (an
 * edit dropped blocks on it, or a legacy import landed it inside terrain) the
 * nearest column whose top has standing room is used instead.
 * @returns {{x:number,y:number,z:number,yaw:number}|null} null when nowhere fits
 */
export function spawnFromMeta(world) {
  if (!world || !world.meta) return null;
  const s = world.meta.spawn;
  const yaw = s?.yaw || 0;
  if (s && standable(world, s.x, s.y, s.z)) return { x: s.x, y: s.y, z: s.z, yaw };

  const cx = Math.floor(s?.x ?? World.W / 2);
  const cy = Math.floor(s?.y ?? World.D / 2);
  for (let r = 0; r <= SEARCH_RADIUS; r++) {
    for (const [x, y] of ring(cx, cy, r)) {
      if (x < 0 || y < 0 || x >= World.W || y >= World.D) continue;
      const z = world.topSolid(x, y) + 1;
      if (z <= 0) continue; // an empty column has no floor to stand on
      if (standable(world, x + 0.5, y + 0.5, z)) return { x: x + 0.5, y: y + 0.5, z, yaw };
    }
  }
  return null;
}
