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
} from "../src/rendering/pickups.js";
import { drawProp, setFovScale } from "../src/rendering/props.js";

// TODO: Improve variety w/ textures
// TODO: These are all procedurally generated at runtime... lol... Could be optimized by pre-generating and caching, or by using actual image files for more complex textures
// TODO: Asset Pipeline for the above or is this overkill
// TODO: Refine assets and improve variety
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.textures = {};
    this.zBuffer = new Float64Array(this.width);
    this._visualStyle = 0; // 0 = Clockwork (cartoony), 1 = Brutal
    this._actPalette = 1;  // 1 = Act1 (teal), 2 = Act2 (amber), 3 = Act3 (crimson)
    this.textures = generateWallTextures();
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;
  }

  /** Called by game.js when the campaign act changes */
  applyActPalette(act) {
    const a = act ?? 1;
    if (this._actPalette === a) return;
    this._actPalette = a;
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;
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
    this._floorCeilBuffer = null;
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

    // Fill entire buffer with fog first (handles exposed rows from pitch shift)
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = fogR; buf[i + 1] = fogG; buf[i + 2] = fogB; buf[i + 3] = 255;
    }

    const floorStart = Math.max(1, halfH + 1);
    const loopEnd = h % 2 === 0 ? h : h - 1;
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

      for (let x = 0; x < w; x++) {
        const tx = ((fx * 128) | 0) & 127;
        const ty = ((fy * 128) | 0) & 127;
        const ti = (ty * 128 + tx) * 4;

        // Floor pixel
        if (y < h) {
          const fi = (y * w + x) * 4;
          const fr = floorTex[ti] * invFog + fR;
          const fg = floorTex[ti + 1] * invFog + fG;
          const fb = floorTex[ti + 2] * invFog + fB;
          buf[fi] = fr;
          buf[fi + 1] = fg;
          buf[fi + 2] = fb;
          buf[fi + 3] = 255;
          // Copy to skipped row
          if (y - 1 >= 0) {
            const fi2 = ((y - 1) * w + x) * 4;
            buf[fi2] = fr;
            buf[fi2 + 1] = fg;
            buf[fi2 + 2] = fb;
            buf[fi2 + 3] = 255;
          }
        }

        // Ceiling pixel (mirrored around shifted horizon)
        const cy = 2 * halfH - 1 - y;
        if (cy >= 0 && cy < h) {
          const ci = (cy * w + x) * 4;
          const cr = ceilTex[ti] * invFog + fR;
          const cg = ceilTex[ti + 1] * invFog + fG;
          const cb = ceilTex[ti + 2] * invFog + fB;
          buf[ci] = cr;
          buf[ci + 1] = cg;
          buf[ci + 2] = cb;
          buf[ci + 3] = 255;
          // Copy ceiling skipped row
          const cy2 = cy + 1;
          if (cy2 >= 0 && cy2 < h) {
            const ci2 = (cy2 * w + x) * 4;
            buf[ci2] = cr;
            buf[ci2 + 1] = cg;
            buf[ci2 + 2] = cb;
            buf[ci2 + 3] = 255;
          }
        }

        fx += stepX;
        fy += stepY;
      }
    }

    // Horizon line (at shifted position, if visible)
    if (halfH >= 0 && halfH < h) {
      const hi = halfH * w * 4;
      for (let x = 0; x < w; x++) {
        const idx = hi + x * 4;
        buf[idx] = fogR;
        buf[idx + 1] = fogG;
        buf[idx + 2] = fogB;
        buf[idx + 3] = 255;
      }
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
      this._renderFloorCeiling(
        camX,
        camY,
        dirX,
        dirY,
        -dirY * planeMul,
        dirX * planeMul,
        yShift,
      );
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

      let mapX = Math.floor(camX);
      let mapY = Math.floor(camY);

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

      // TODO: For short walls (heightFrac < 1), store wall-top Y per column
      // so renderSprites() can show sprites above short walls instead of
      // fully occluding them based on distance alone.
      this.zBuffer[x] = perpWallDist;

      const lineHeight = Math.floor(h / perpWallDist);
      const fullDrawStart = Math.floor(-lineHeight / 2 + h / 2 + yShift);
      const fullDrawEnd = Math.floor(lineHeight / 2 + h / 2 + yShift);

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
        const hCount = map.heightMap[mapY][mapX];
        if (hCount > 0 && hCount < 5) {
          heightFrac = hCount / 5;
        }
      }

      let drawStart, drawEnd;
      if (heightFrac < 1) {
        // Short wall: grows upward from floor level
        drawEnd = fullDrawEnd;
        const wallPx = fullDrawEnd - fullDrawStart;
        drawStart = Math.floor(drawEnd - wallPx * heightFrac);
      } else {
        drawStart = fullDrawStart;
        drawEnd = fullDrawEnd;
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
        let texX = Math.floor(wallX * 128);
        if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
          texX = 127 - texX;
        }

        // Draw textured wall strip
        const texHeight = 128;
        const step = texHeight / lineHeight;
        let texPos = (drawStart - h / 2 + lineHeight / 2) * step;

        // Use drawImage for textured columns
        const srcY = Math.max(0, texPos);
        const srcH = Math.min(128, (drawEnd - drawStart) * step);
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

        // Distance fog
        const wallFogMax = this._visualStyle === 1 ? 0.85 : 0.6;
        const fogAmount = Math.min(wallFogMax, perpWallDist / 20);
        if (fogAmount > 0) {
          const [wfR, wfG, wfB] =
            this._visualStyle === 1 ? [8, 8, 20] : [10, 18, 32];
          ctx.fillStyle = `rgba(${wfR},${wfG},${wfB},${fogAmount})`;
          ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
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
            ctx.fillStyle = `rgba(0,180,120,${frameAlpha})`;
            ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
          }
        }
      }
    }

    // Set FOV scale for prop minimum-size floors
    setFovScale(fov);

    // Render sprites
    this.renderSprites(player, entities, time, planeMul, camX, camY);

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

      const screenX = Math.floor((w / 2) * (1 + transformX / transformY));

      // Basic occlusion check
      if (
        screenX < 0 ||
        screenX >= w ||
        transformY > this.zBuffer[screenX] + 0.1
      )
        continue;

      const size = Math.abs(Math.floor((h / transformY) * (p.size || 0.05)));
      // p.z is height offset (0 = floor level, negative = up)
      const screenY = Math.floor(halfH + (p.z || 0) * (h / transformY));

      const r = p.r ?? 255;
      const g = p.g ?? 255;
      const b = p.b ?? 255;
      const a = p.life ?? 1;

      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillRect(
        Math.floor(screenX - size / 2),
        Math.floor(screenY - size / 2),
        Math.max(1, size),
        Math.max(1, size),
      );
    }
  }

  // --- Entity Rendering ---
  renderSprites(player, entities, time, planeMul = 0.66, camX, camY) {
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

    // Sort entities by distance from camera (index sort — avoids per-frame object copies)
    const spriteDist = [];
    const spriteOrder = [];
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].active === false && !entities[i].dissolving) continue;
      spriteOrder.push(i);
      spriteDist[i] = (cx - entities[i].x) ** 2 + (cy - entities[i].y) ** 2;
    }
    spriteOrder.sort((a, b) => spriteDist[b] - spriteDist[a]);

    for (let si = 0; si < spriteOrder.length; si++) {
      const entity = entities[spriteOrder[si]];
      const spriteX = entity.x - cx;
      const spriteY = entity.y - cy;

      const invDet = 1.0 / (planeX * dirY - dirX * planeY);
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

      if (transformY <= 0.1) continue;

      const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
      const spriteHeight = Math.abs(Math.floor(h / transformY));
      const spriteWidth = Math.abs(Math.floor(h / transformY));

      const drawStartY = Math.max(0, Math.floor(-spriteHeight / 2 + h / 2));
      const drawEndY = Math.min(h - 1, Math.floor(spriteHeight / 2 + h / 2));
      const drawStartX = Math.max(
        0,
        Math.floor(-spriteWidth / 2 + spriteScreenX),
      );
      const drawEndX = Math.min(
        w - 1,
        Math.floor(spriteWidth / 2 + spriteScreenX),
      );

      // Check if any column is visible
      let visible = false;
      for (let x = drawStartX; x <= drawEndX; x++) {
        if (transformY < this.zBuffer[x]) {
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
    const centerY = Math.floor(h / 2);

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
    const centerY = Math.floor(h / 2);
    const halfW = sprWidth / 2;
    const halfH = sprHeight / 2;

    const def = enemy.def;
    if (!def) return;

    const c1 = def.color1;
    const c2 = def.color2;

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
