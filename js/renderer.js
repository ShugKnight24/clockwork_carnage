import { WALL_COLORS } from "./data.js";

import { generateWallTextures, generateFloorCeilTextures } from "../src/rendering/textures.js";
import { ENEMY_RENDERERS } from "../src/rendering/enemies/index.js";
import {
  drawPickup,
  drawHealthPickup,
  drawAmmoPickup,
  drawWeaponPickup,
  drawExit,
  drawProjectile,
  drawExoticPickup,
} from "../src/rendering/pickups.js";
import { drawProp, setFovScale } from "../src/rendering/props.js";
import { GLRenderer } from "../src/rendering/webgl/gl-renderer.js";

// --- Performance: Pre-computed fog rgba string LUT ---
// Quantize fog alpha to 64 discrete steps to avoid per-column string creation
const FOG_CACHE_STEPS = 64;
const _fogCache = new Map(); // key: "r,g,b" -> Array[FOG_CACHE_STEPS+1] of rgba strings

function _getFogString(r, g, b, alpha) {
  const step = Math.min(FOG_CACHE_STEPS, (alpha * FOG_CACHE_STEPS + 0.5) | 0);
  const key = `${r},${g},${b}`;
  let lut = _fogCache.get(key);
  if (!lut) {
    lut = new Array(FOG_CACHE_STEPS + 1);
    for (let i = 0; i <= FOG_CACHE_STEPS; i++) {
      const a = (i / FOG_CACHE_STEPS).toFixed(4);
      lut[i] = `rgba(${r},${g},${b},${a})`;
    }
    _fogCache.set(key, lut);
  }
  return lut[step];
}

// --- Performance: Pre-allocated sprite sort arrays ---
// Reused each frame to avoid per-frame allocation + GC pressure.
let _spriteDistBuf = new Float64Array(256);
let _spriteOrderBuf = new Int32Array(256);
let _spriteOrderCount = 0;

// TODO: Improve variety w/ textures
// TODO: These are all procedurally generated at runtime... lol... Could be optimized by pre-generating and caching, or by using actual image files for more complex textures
// TODO: Asset Pipeline for the above or is this overkill
// TODO: Refine assets and improve variety
export class Renderer {
  constructor(canvas, renderMode = 0) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.textures = {};
    this.zBuffer = new Float64Array(this.width);
    // BUG-030: Store wall-top screen Y per column so sprites behind short
    // walls can render their upper portion above the wall.
    // -1 means full-height wall (no sprite pass-through).
    this.wallTopY = new Float64Array(this.width);
    this._visualStyle = 0; // 0 = Clockwork (cartoony), 1 = Brutal
    this._actPalette = 1;  // 1 = Act1 (teal), 2 = Act2 (amber), 3 = Act3 (crimson)
    this.textures = generateWallTextures();
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;

    // WebGL hybrid renderer (renderMode: 0=auto, 1=2D only, 2=3D/WebGL)
    this.glRenderer = null;
    this.useWebGL = false;
    if (renderMode !== 1) {
      // Try to initialize WebGL (auto or explicit 3D)
      this.glRenderer = GLRenderer.create(this.width, this.height);
      if (this.glRenderer) {
        this.useWebGL = true;
        this._uploadFloorCeilToGL();
        console.log('[Renderer] WebGL2 hybrid renderer active');
      } else if (renderMode === 2) {
        console.warn('[Renderer] WebGL2 requested but unavailable — falling back to Canvas2D');
      }
    }
  }

  /** Called by game.js when the campaign act changes */
  applyActPalette(act) {
    const a = act ?? 1;
    if (this._actPalette === a) return;
    this._actPalette = a;
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;
    if (this.useWebGL) this._uploadFloorCeilToGL();
  }

  /** Called by settings onChange — 0 = Clockwork, 1 = Brutal */
  applyVisualStyle(styleIndex) {
    const idx = styleIndex ?? 0;
    if (this._visualStyle === idx) return;
    this._visualStyle = idx;
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.zBuffer = new Float64Array(w);
    this.wallTopY = new Float64Array(w);
    this._floorCeilBuffer = null;
    if (this.glRenderer) this.glRenderer.resize(w, h);
  }

  /** Upload floor/ceiling pixel data to WebGL textures */
  _uploadFloorCeilToGL() {
    if (!this.glRenderer) return;
    // Convert raw pixel arrays to RGBA Uint8ClampedArray for GL upload
    const floorRGBA = new Uint8ClampedArray(256 * 256 * 4);
    const ceilRGBA = new Uint8ClampedArray(256 * 256 * 4);
    for (let i = 0; i < 256 * 256; i++) {
      const si = i * 4;
      floorRGBA[si] = this._floorTexPixels[si];
      floorRGBA[si + 1] = this._floorTexPixels[si + 1];
      floorRGBA[si + 2] = this._floorTexPixels[si + 2];
      floorRGBA[si + 3] = 255;
      ceilRGBA[si] = this._ceilTexPixels[si];
      ceilRGBA[si + 1] = this._ceilTexPixels[si + 1];
      ceilRGBA[si + 2] = this._ceilTexPixels[si + 2];
      ceilRGBA[si + 3] = 255;
    }
    this.glRenderer.uploadFloorCeilTextures(floorRGBA, ceilRGBA);
  }

  _regenerateFloorCeil() {
    const { floorPixels, ceilPixels } = generateFloorCeilTextures(this._actPalette, this._visualStyle);
    this._floorTexPixels = floorPixels;
    this._ceilTexPixels = ceilPixels;
  }

  _renderFloorCeiling(camX, camY, dirX, dirY, planeX, planeY, yShift = 0) {
    const w = this.width;
    const h = this.height;
    const halfH = (h >> 1) + Math.round(yShift);

    // Projection height for distance calc (unshifted for correct perspective)
    const projH = h >> 1;

    if (
      !this._floorCeilBuffer ||
      this._floorCeilBuffer.width !== w ||
      this._floorCeilBuffer.height !== h
    ) {
      this._floorCeilBuffer = this.ctx.createImageData(w, h);
    }
    const buf = this._floorCeilBuffer.data;
    // Uint32Array view for single 32-bit pixel writes (4× fewer stores)
    const buf32 = new Uint32Array(buf.buffer);
    const floorTex = this._floorTexPixels;
    const ceilTex = this._ceilTexPixels;

    const rayDirX0 = dirX - planeX;
    const rayDirY0 = dirY - planeY;
    const rayDirX1 = dirX + planeX;
    const rayDirY1 = dirY + planeY;

    // Act-tinted fog: Act1=teal, Act2=amber, Act3=crimson
    const act = this._actPalette || 1;
    const actFog = act === 2
      ? { r: 20, g: 10, b: 4 }
      : act === 3
        ? { r: 22, g: 4, b: 8 }
        : { r: 8, g: 18, b: 30 }; // Act 1 default teal
    const brutal = this._visualStyle === 1;
    const fogR = brutal ? actFog.r : actFog.r + 4;
    const fogG = brutal ? actFog.g : actFog.g + 4;
    const fogB = brutal ? actFog.b : actFog.b + 8;
    const fogMaxOpacity = brutal ? 0.92 : 0.7;

    // Pre-pack fog as 32-bit ABGR (little-endian) for fast fill
    const fogPacked = (255 << 24) | (fogB << 16) | (fogG << 8) | fogR;
    // Fill entire buffer with fog (single 32-bit writes)
    buf32.fill(fogPacked);

    const floorStart = Math.max(1, halfH + 1);
    const loopEnd = h % 2 === 0 ? h : h - 1;

    // Pre-compute per-row fog LUT to avoid redundant math per-pixel
    for (let y = floorStart; y < loopEnd; y += 2) {
      const p = y - halfH;
      if (p <= 0) continue;
      const rowDist = projH / p;
      const stepX = (rowDist * (rayDirX1 - rayDirX0)) / w;
      const stepY = (rowDist * (rayDirY1 - rayDirY0)) / w;
      let fx = camX + rowDist * rayDirX0;
      let fy = camY + rowDist * rayDirY0;

      const fog = Math.min(fogMaxOpacity, rowDist / 12);
      const invFog = 1 - fog;
      const fR = fogR * fog,
        fG = fogG * fog,
        fB = fogB * fog;

      const rowOff = y * w;
      const rowOff1 = (y - 1) * w;

      for (let x = 0; x < w; x++) {
        const tx = ((fx * 256) | 0) & 255;
        const ty = ((fy * 256) | 0) & 255;
        const ti = (ty * 256 + tx) * 4;

        // Floor pixel — single 32-bit write
        if (y < h) {
          const fr = (floorTex[ti] * invFog + fR) | 0;
          const fg = (floorTex[ti + 1] * invFog + fG) | 0;
          const fb = (floorTex[ti + 2] * invFog + fB) | 0;
          const packed = (255 << 24) | (fb << 16) | (fg << 8) | fr;
          buf32[rowOff + x] = packed;
          // Copy to skipped row
          if (y - 1 >= 0) buf32[rowOff1 + x] = packed;
        }

        // Ceiling pixel (mirrored around shifted horizon)
        const cy = 2 * halfH - 1 - y;
        if (cy >= 0 && cy < h) {
          const cr = (ceilTex[ti] * invFog + fR) | 0;
          const cg = (ceilTex[ti + 1] * invFog + fG) | 0;
          const cb = (ceilTex[ti + 2] * invFog + fB) | 0;
          const cPacked = (255 << 24) | (cb << 16) | (cg << 8) | cr;
          buf32[cy * w + x] = cPacked;
          // Copy ceiling skipped row
          const cy2 = cy + 1;
          if (cy2 >= 0 && cy2 < h) buf32[cy2 * w + x] = cPacked;
        }

        fx += stepX;
        fy += stepY;
      }
    }

    // Horizon line (at shifted position, if visible)
    if (halfH >= 0 && halfH < h) {
      const hi = halfH * w;
      for (let x = 0; x < w; x++) buf32[hi + x] = fogPacked;
    }

    this.ctx.putImageData(this._floorCeilBuffer, 0, 0);
  }

  renderScene(
    player,
    map,
    entities,
    time,
    fov = 70,
    viewMode = 0,
    skipFloorCeil = false,
    yShift = 0,
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear z-buffer
    this.zBuffer.fill(Infinity);
    this.wallTopY.fill(-1); // -1 = full-height wall (no pass-through)

    // Convert FOV degrees to camera plane multiplier
    const planeMul = Math.tan((fov * 0.5 * Math.PI) / 180);

    // Camera position (offset behind player in third-person)
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    let camX = player.x;
    let camY = player.y;

    if (viewMode === 1) {
      const offset = 1.8;
      let tryX = player.x - dirX * offset;
      let tryY = player.y - dirY * offset;
      // Push camera forward if it would be inside a wall
      for (let step = 0; step < 6; step++) {
        const mx = Math.floor(tryX);
        const my = Math.floor(tryY);
        if (
          mx >= 0 &&
          my >= 0 &&
          mx < map.width &&
          my < map.height &&
          map.grid[my][mx] === 0
        ) {
          break;
        }
        tryX += dirX * 0.3;
        tryY += dirY * 0.3;
      }
      camX = tryX;
      camY = tryY;
    }

    // Draw textured floor and ceiling (with yShift for pitch support)
    if (!skipFloorCeil) {
      if (this.useWebGL && this.glRenderer) {
        // GPU-accelerated floor/ceiling with dynamic lighting
        const act = this._actPalette || 1;
        const brutal = this._visualStyle === 1;
        const actFog = act === 2
          ? [24 / 255, 14 / 255, 12 / 255]
          : act === 3
            ? [26 / 255, 8 / 255, 16 / 255]
            : [12 / 255, 22 / 255, 38 / 255];
        const fogMax = brutal ? 0.92 : 0.7;
        this.glRenderer.renderFloorCeiling(
          camX, camY, dirX, dirY,
          -dirY * planeMul, dirX * planeMul,
          Math.round(yShift),
          actFog, fogMax,
          this.lights || [],
        );
        // Composite WebGL result onto Canvas2D
        ctx.drawImage(this.glRenderer.canvas, 0, 0);
      } else {
        this._renderFloorCeiling(
          camX,
          camY,
          dirX,
          dirY,
          -dirY * planeMul,
          dirX * planeMul,
          yShift,
        );
      }
    } else {
      // Gradient fallback for builder mode (uses yShift for vertical offset)
      const centerY = (h >> 1) + yShift;
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, centerY);
      ceilGrad.addColorStop(0, "#0a0a1a");
      ceilGrad.addColorStop(1, "#1a1a2e");
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, w, centerY);
      const floorGrad = ctx.createLinearGradient(0, centerY, 0, h);
      floorGrad.addColorStop(0, "#1a1a2e");
      floorGrad.addColorStop(1, "#0d0d1a");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, centerY, w, h - centerY);
    }

    // Raycasting
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;

    for (let x = 0; x < w; x++) {
      const cameraX = (2 * x) / w - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      let mapX = camX | 0;
      let mapY = camY | 0;

      const deltaDistX = Math.abs(1 / rayDirX);
      const deltaDistY = Math.abs(1 / rayDirY);

      let stepX, stepY, sideDistX, sideDistY;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (camX - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - camX) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (camY - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - camY) * deltaDistY;
      }

      let hit = 0;
      let side = 0;
      let wallType = 0;

      // DDA
      while (hit === 0) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= map.width || mapY >= map.height) {
          hit = 1;
          wallType = 1;
          break;
        }
        if (map.grid[mapY][mapX] > 0) {
          hit = 1;
          wallType = map.grid[mapY][mapX];
        }
      }

      let perpWallDist;
      if (side === 0) {
        perpWallDist = (mapX - camX + (1 - stepX) / 2) / rayDirX;
      } else {
        perpWallDist = (mapY - camY + (1 - stepY) / 2) / rayDirY;
      }

      if (perpWallDist < 0.01) perpWallDist = 0.01;

      // BUG-030: Store wall-top Y so sprite pass can draw above short walls.
      this.zBuffer[x] = perpWallDist;

      const lineHeight = (h / perpWallDist) | 0;
      const fullDrawStart = (-lineHeight / 2 + h / 2 + yShift) | 0;
      const fullDrawEnd = (lineHeight / 2 + h / 2 + yShift) | 0;

      // Variable height: heightMap determines how tall the wall renders
      // 5 layers = full wall, 1 layer = 20% wall (from ground up)
      let heightFrac = 1;
      if (
        map.heightMap &&
        mapX >= 0 &&
        mapY >= 0 &&
        mapX < map.width &&
        mapY < map.height
      ) {
        const hCount = map.heightMap[mapY]?.[mapX] ?? 5;
        if (hCount > 0 && hCount < 5) {
          heightFrac = hCount / 5;
        }
      }

      let drawStart, drawEnd;
      if (heightFrac < 1) {
        // Short wall: grows upward from floor level
        drawEnd = fullDrawEnd;
        const wallPx = fullDrawEnd - fullDrawStart;
        drawStart = (drawEnd - wallPx * heightFrac) | 0;
        // BUG-030: Record wall-top screen Y for short walls
        this.wallTopY[x] = drawStart;
      } else {
        drawStart = fullDrawStart;
        drawEnd = fullDrawEnd;
        this.wallTopY[x] = -1; // Full-height wall — fully occluding
      }

      if (drawStart < 0) drawStart = 0;
      if (drawEnd >= h) drawEnd = h - 1;

      // Texture coordinate
      let wallX;
      if (side === 0) {
        wallX = camY + perpWallDist * rayDirY;
      } else {
        wallX = camX + perpWallDist * rayDirX;
      }
      wallX -= Math.floor(wallX);

      const tex = this.textures[wallType];
      if (tex) {
        let texX = (wallX * 256) | 0;
        if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
          texX = 255 - texX;
        }

        // Draw textured wall strip
        const texHeight = 256;
        const step = texHeight / lineHeight;
        let texPos = (drawStart - h / 2 + lineHeight / 2) * step;

        // Use drawImage for textured columns
        const srcY = Math.max(0, texPos);
        const srcH = Math.min(256, (drawEnd - drawStart) * step);
        if (srcH > 0 && drawEnd > drawStart) {
          ctx.drawImage(
            tex,
            texX,
            srcY,
            1,
            srcH,
            x,
            drawStart,
            1,
            drawEnd - drawStart,
          );
        }

        // Darken side walls for depth
        if (side === 1) {
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
        }

        // Distance fog (cached rgba strings to avoid per-column string creation)
        const wallFogMax = this._visualStyle === 1 ? 0.85 : 0.6;
        const fogAmount = Math.min(wallFogMax, perpWallDist / 20);
        if (fogAmount > 0) {
          const [wfR, wfG, wfB] =
            this._visualStyle === 1 ? [8, 8, 20] : [10, 18, 32];
          ctx.fillStyle = _getFogString(wfR, wfG, wfB, fogAmount);
          ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
        }

        // Dynamic lights — additive radial bleed at the wall hit point.
        // Each active light is sampled by squared distance for cheap falloff.
        // Skipped entirely when no lights are present (zero overhead common case).
        if (this.lights && this.lights.length > 0) {
          const hitWX = camX + perpWallDist * rayDirX;
          const hitWY = camY + perpWallDist * rayDirY;
          let lr = 0, lg = 0, lb = 0;
          for (let li = 0; li < this.lights.length; li++) {
            const L = this.lights[li];
            const ldx = L.x - hitWX;
            const ldy = L.y - hitWY;
            const d2 = ldx * ldx + ldy * ldy;
            const r2 = L.radius * L.radius;
            if (d2 >= r2) continue;
            // Quadratic falloff (1 - d/r)^2 reads better than linear.
            const fall = 1 - Math.sqrt(d2) / L.radius;
            const k = fall * fall * L.intensity;
            lr += L.color[0] * k;
            lg += L.color[1] * k;
            lb += L.color[2] * k;
          }
          if (lr + lg + lb > 1) {
            // Cap alpha so big stacks don't blow out the column.
            const peak = Math.max(lr, lg, lb);
            const a = Math.min(0.85, peak / 255);
            const nr = Math.min(255, lr | 0);
            const ng = Math.min(255, lg | 0);
            const nb = Math.min(255, lb | 0);
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = _getFogString(nr, ng, nb, a);
            ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
            ctx.globalCompositeOperation = prev;
          }
        }

        // Door frame overlay — teal accent on walls adjacent to door tiles
        if (wallType !== 5 && wallType > 0 && perpWallDist < 15) {
          let hasDoorNeighbor = false;
          if (side === 0) {
            // Vertical face — check tiles above/below for doors
            if ((wallX < 0.12 && mapY > 0 && map.grid[mapY - 1][mapX] === 5) ||
                (wallX > 0.88 && mapY < map.height - 1 && map.grid[mapY + 1][mapX] === 5)) {
              hasDoorNeighbor = true;
            }
          } else {
            // Horizontal face — check tiles left/right for doors
            if ((wallX < 0.12 && mapX > 0 && map.grid[mapY][mapX - 1] === 5) ||
                (wallX > 0.88 && mapX < map.width - 1 && map.grid[mapY][mapX + 1] === 5)) {
              hasDoorNeighbor = true;
            }
          }
          if (hasDoorNeighbor) {
            const frameAlpha = Math.max(0, (1 - fogAmount) * 0.5);
            ctx.fillStyle = _getFogString(0, 180, 120, frameAlpha);
            ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
          }
        }
      }
    }

    // Set FOV scale for prop minimum-size floors
    setFovScale(fov);

    // Render sprites
    this.renderSprites(player, entities, time, planeMul, camX, camY, player._drawDistance);

    // Render particles
    if (player.particles) {
      this.renderParticles(player, player.particles, time, planeMul, camX, camY);
    }
  }

  renderParticles(player, particles, time, planeMul = 0.66, camX, camY) {
    if (!particles || particles.length === 0) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;
    const cx = camX != null ? camX : player.x;
    const cy = camY != null ? camY : player.y;
    const halfH = h / 2;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const spriteX = p.x - cx;
      const spriteY = p.y - cy;

      const invDet = 1.0 / (planeX * dirY - dirX * planeY);
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

      if (transformY <= 0.1) continue;

      const screenX = ((w / 2) * (1 + transformX / transformY)) | 0;

      // Basic occlusion check
      if (
        screenX < 0 ||
        screenX >= w ||
        transformY > this.zBuffer[screenX] + 0.1
      )
        continue;

      const size = Math.abs((h / transformY) * (p.size || 0.05)) | 0;
      // p.z is height offset (0 = floor level, negative = up)
      const screenY = (halfH + (p.z || 0) * (h / transformY)) | 0;

      const r = p.r ?? 255;
      const g = p.g ?? 255;
      const b = p.b ?? 255;
      const a = p.life ?? 1;

      ctx.fillStyle = _getFogString(r, g, b, a);
      ctx.fillRect(
        (screenX - size / 2) | 0,
        (screenY - size / 2) | 0,
        Math.max(1, size),
        Math.max(1, size),
      );
    }
  }

  /** Project a world position into screen space using the same camera math as
   * sprite/particle passes. Returns null if behind the near plane. */
  _projectWorld(player, x, y, planeMul, camX, camY, zHeight = 0) {
    const w = this.width;
    const h = this.height;
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;
    const cx = camX != null ? camX : player.x;
    const cy = camY != null ? camY : player.y;
    const sx = x - cx;
    const sy = y - cy;
    const invDet = 1.0 / (planeX * dirY - dirX * planeY);
    const tx = invDet * (dirY * sx - dirX * sy);
    const ty = invDet * (-planeY * sx + planeX * sy);
    if (ty <= 0.1) return null;
    const screenX = (w / 2) * (1 + tx / ty);
    const screenY = h / 2 + zHeight * (h / ty);
    return { x: screenX, y: screenY, depth: ty };
  }

  /** Hitscan tracers — short fading streaks from barrel to impact. */
  renderTracers(player, tracers, planeMul = 0.66, camX, camY) {
    if (!tracers || tracers.length === 0) return;
    const ctx = this.ctx;
    const w = this.width;
    for (const tr of tracers) {
      const t = Math.max(0, tr.life / tr.maxLife);
      if (t <= 0) continue;
      // Slight elevation so tracer reads as gun-height, not floor-height
      const startZ = -0.05;
      const endZ = -0.05 + Math.tan(tr.pitch || 0) * 0.0; // pitched aim already encoded in (x2,y2)
      const a = this._projectWorld(player, tr.x1, tr.y1, planeMul, camX, camY, startZ);
      const b = this._projectWorld(player, tr.x2, tr.y2, planeMul, camX, camY, endZ);
      if (!a || !b) continue;
      // Z-buffer occlusion at endpoint (if hidden behind wall, skip)
      const xb = Math.max(0, Math.min(w - 1, Math.floor(b.x)));
      if (b.depth > this.zBuffer[xb] + 0.1) continue;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      // Outer glow
      ctx.globalAlpha = 0.35 * t;
      ctx.strokeStyle = `rgba(${tr.color},1)`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // Hot core
      ctx.globalAlpha = t;
      ctx.strokeStyle = `rgba(255,255,240,1)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- Entity Rendering ---
  renderSprites(player, entities, time, planeMul = 0.66, camX, camY, drawDistance) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;

    // Use camera position for sprite rendering (defaults to player pos)
    const cx = camX != null ? camX : player.x;
    const cy = camY != null ? camY : player.y;
    const maxDistSq = drawDistance ? drawDistance * drawDistance : Infinity;

    // Sort entities by distance from camera (pre-allocated arrays to avoid per-frame GC)
    // Grow backing buffers if entity count exceeds capacity
    if (entities.length > _spriteDistBuf.length) {
      _spriteDistBuf = new Float64Array(entities.length * 2);
      _spriteOrderBuf = new Int32Array(entities.length * 2);
    }
    _spriteOrderCount = 0;
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].active === false && !entities[i].dissolving) continue;
      const distSq = (cx - entities[i].x) ** 2 + (cy - entities[i].y) ** 2;
      if (distSq > maxDistSq && entities[i].type !== "exit") continue;
      _spriteOrderBuf[_spriteOrderCount++] = i;
      _spriteDistBuf[i] = distSq;
    }
    // Sort the active portion of the order buffer
    const spriteOrder = Array.prototype.slice.call(_spriteOrderBuf, 0, _spriteOrderCount);
    spriteOrder.sort((a, b) => _spriteDistBuf[b] - _spriteDistBuf[a]);

    for (let si = 0; si < spriteOrder.length; si++) {
      const entity = entities[spriteOrder[si]];
      const spriteX = entity.x - cx;
      const spriteY = entity.y - cy;

      const invDet = 1.0 / (planeX * dirY - dirX * planeY);
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

      if (transformY <= 0.1) continue;

      const spriteScreenX = ((w / 2) * (1 + transformX / transformY)) | 0;
      const spriteHeight = (Math.abs(h / transformY)) | 0;
      const spriteWidth = spriteHeight;

      const drawStartY = Math.max(0, (-spriteHeight / 2 + h / 2) | 0);
      const drawEndY = Math.min(h - 1, (spriteHeight / 2 + h / 2) | 0);
      const drawStartX = Math.max(
        0,
        (-spriteWidth / 2 + spriteScreenX) | 0,
      );
      const drawEndX = Math.min(
        w - 1,
        (spriteWidth / 2 + spriteScreenX) | 0,
      );

      // Check if any column is visible (BUG-030: account for short walls)
      let visible = false;
      for (let x = drawStartX; x <= drawEndX; x++) {
        if (transformY < this.zBuffer[x]) {
          visible = true;
          break;
        }
        // Sprite is behind wall, but if it's a short wall and the sprite
        // extends above the wall-top, it's still partially visible.
        if (this.wallTopY[x] >= 0 && drawStartY < this.wallTopY[x]) {
          visible = true;
          break;
        }
      }
      if (!visible) continue;

      // Ground shadow — dark ellipse at entity's feet
      if (entity.type === "enemy" && !entity.dissolving) {
        const shadowW = spriteWidth * 0.6;
        const shadowH = spriteHeight * 0.12;
        const shadowY = Math.floor(spriteHeight / 2 + h / 2) - shadowH * 0.5;
        ctx.save();
        ctx.globalAlpha = Math.min(0.35, 2.0 / transformY); // fade with distance
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(spriteScreenX, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw the entity
      this.drawEntity(
        ctx,
        entity,
        spriteScreenX,
        drawStartY,
        drawEndY,
        drawStartX,
        drawEndX,
        spriteWidth,
        spriteHeight,
        transformY,
        time,
      );
    }
  }

  drawEntity(
    ctx,
    entity,
    screenX,
    startY,
    endY,
    startX,
    endX,
    sprWidth,
    sprHeight,
    dist,
    time,
  ) {
    const w = this.width;
    const h = this.height;
    const centerY = (h / 2) | 0;

    // Distance fog factor
    const fogDist = this._visualStyle === 1 ? 20 : 30;
    const fogFactor = Math.max(0, 1 - dist / fogDist);

    if (entity.type === "enemy") {
      this.drawEnemy(
        ctx,
        entity,
        screenX,
        startY,
        endY,
        startX,
        endX,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "health") {
      drawHealthPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "ammo") {
      drawAmmoPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "weapon") {
      drawWeaponPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "damage2x" || entity.type === "invuln") {
      drawExoticPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
        entity.type,
      );
    } else if (entity.type === "exit") {
      drawExit(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "projectile") {
      drawProjectile(
        ctx,
        screenX,
        centerY,
        sprWidth,
        dist,
        entity,
        time,
        fogFactor,
      );
    } else if (entity.type === "prop") {
      // Z-buffer clipping — same pattern as enemies so props behind walls don't bleed through
      ctx.save();
      ctx.beginPath();
      for (let x = startX; x <= endX; x++) {
        if (dist < this.zBuffer[x]) {
          ctx.rect(x, startY, 1, endY - startY);
        }
      }
      ctx.clip();
      drawProp(ctx, entity, screenX, centerY, sprWidth, sprHeight, dist, time, fogFactor);
      ctx.restore();
    }
  }

  drawEnemy(
    ctx,
    enemy,
    screenX,
    startY,
    endY,
    startX,
    endX,
    sprWidth,
    sprHeight,
    dist,
    time,
    fog,
  ) {
    const h = this.height;
    const centerY = (h / 2) | 0;
    const halfW = sprWidth / 2;
    const halfH = sprHeight / 2;

    const def = enemy.def;
    if (!def) return;

    // Prefer per-instance palette (set at spawn with slight HSL jitter so
    // a horde of drones doesn't read as 30 identical sprites). Falls back
    // to the def palette if spawner didn't seed an override.
    const c1 = enemy.baseColor || def.color1;
    const c2 = enemy.darkColor || def.color2;

    // Only draw columns not occluded by walls
    ctx.save();
    ctx.beginPath();
    for (let x = startX; x <= endX; x++) {
      if (dist < this.zBuffer[x]) {
        ctx.rect(x, startY, 1, endY - startY);
      }
    }
    ctx.clip();

    const alpha = fog;
    if (alpha <= 0) {
      ctx.restore();
      return;
    }

    const bodyTop = centerY - halfH * 0.4;
    const bodyBottom = centerY + halfH * 0.5;
    const bodyWidth = halfW * 0.6;

    // Hit flash
    const hitFlash = enemy.hitTime && time - enemy.hitTime < 100;
    const baseColor = hitFlash ? "#ffffff" : c1;
    const darkColor = hitFlash ? "#ffaaaa" : c2;

    ctx.globalAlpha = alpha;

    // Death dissolve effect — fade out + scanline noise
    let dissolveAlpha = 1;
    if (enemy.dissolving && enemy.dissolveTimer != null) {
      dissolveAlpha = Math.max(0, enemy.dissolveTimer / 0.5);
      ctx.globalAlpha = alpha * dissolveAlpha;
      // Shift hue toward white during dissolve
      if (dissolveAlpha < 0.5) {
        ctx.globalCompositeOperation = "lighter";
      }
    }

    const renderFn = ENEMY_RENDERERS[enemy.enemyType];
    if (renderFn) {
      renderFn(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash);
    } else {
      // Fallback: generic rectangle
      ctx.fillStyle = darkColor;
      ctx.fillRect(screenX - bodyWidth, bodyTop, bodyWidth * 2, bodyBottom - bodyTop);
      ctx.fillStyle = baseColor;
      ctx.fillRect(screenX - bodyWidth * 0.7, bodyTop + (bodyBottom - bodyTop) * 0.1, bodyWidth * 1.4, (bodyBottom - bodyTop) * 0.8);
      ctx.fillStyle = "#00ffaa";
      const eyeSize = bodyWidth * 0.2;
      ctx.fillRect(screenX - eyeSize, bodyTop + (bodyBottom - bodyTop) * 0.25 - eyeSize / 2, eyeSize * 2, eyeSize);
      ctx.fillStyle = darkColor;
      const legW = bodyWidth * 0.3;
      ctx.fillRect(screenX - bodyWidth * 0.5, bodyBottom, legW, halfH * 0.3);
      ctx.fillRect(screenX + bodyWidth * 0.2, bodyBottom, legW, halfH * 0.3);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

}
