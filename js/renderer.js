import { WALL_COLORS } from "./data.js";

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
    this.generateTextures();
    this._generateFloorCeilTextures();
    this._floorCeilBuffer = null;
  }

  /** Called by settings onChange — 0 = Clockwork, 1 = Brutal */
  applyVisualStyle(styleIndex) {
    const idx = styleIndex ?? 0;
    if (this._visualStyle === idx) return;
    this._visualStyle = idx;
    this._generateFloorCeilTextures(); // regenerate floor/ceiling for new palette
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

  generateTextures() {
    const size = 64;
    for (const [id, color] of Object.entries(WALL_COLORS)) {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      const imgData = ctx.createImageData(size, size);
      const d = imgData.data;
      const wid = parseInt(id);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          let r = color.r,
            g = color.g,
            b = color.b;
          const noise = (Math.random() * 10 - 5) | 0;

          if (wid === 1) {
            // Stone - brick pattern
            const brickH = 16,
              brickW = 32;
            const row = Math.floor(y / brickH);
            const offset = (row % 2) * (brickW / 2);
            const bx = (x + offset) % brickW;
            if (y % brickH < 1 || bx < 1) {
              r -= 30;
              g -= 30;
              b -= 30;
            }
          } else if (wid === 2) {
            // Tech - circuit lines
            if (x % 16 === 0 || y % 16 === 0) {
              r += 40;
              g += 60;
              b += 80;
            }
            if (x % 32 < 4 && y % 32 < 4) {
              r += 60;
              g += 100;
              b += 80;
            }
          } else if (wid === 3) {
            // Metal - rivets
            if ((x === 4 || x === 60) && (y === 4 || y === 60)) {
              r += 50;
              g += 50;
              b += 50;
            }
            if (x < 2 || x > 62 || y < 2 || y > 62) {
              r -= 20;
              g -= 20;
              b -= 20;
            }
          } else if (wid === 4) {
            // Energy - glowing pulse lines
            const wave = Math.sin(y * 0.2 + x * 0.1) * 30;
            r += wave;
            g += wave * 0.3;
            b += wave;
            if (y % 8 === 0) {
              r += 40;
              b += 60;
            }
          } else if (wid === 5) {
            // Door
            if (x > 4 && x < 60 && y > 4 && y < 60) {
              r += 20;
              g += 10;
              b -= 10;
            }
            if (x >= 28 && x <= 36 && y >= 28 && y <= 36) {
              r += 40;
              g += 40;
              b += 40;
            }
          } else if (wid === 6) {
            // Secret - same as stone with subtle difference
            const brickH = 16,
              brickW = 32;
            const row = Math.floor(y / brickH);
            const offset = (row % 2) * (brickW / 2);
            const bx = (x + offset) % brickW;
            if (y % brickH < 1 || bx < 1) {
              r -= 30;
              g -= 30;
              b -= 30;
            }
          } else if (wid === 7) {
            // Boss walls - ominous
            const glow = Math.sin(x * 0.15) * Math.sin(y * 0.15) * 25;
            r += glow * 2;
            g += glow * 0.5;
            b += glow;
          } else if (wid === 9) {
            // Temporal rift
            const wave1 = Math.sin(x * 0.3 + y * 0.2) * 20;
            const wave2 = Math.cos(x * 0.15 - y * 0.25) * 15;
            r += wave1;
            g += wave1 + wave2;
            b += wave2 + 40;
          }

          r = Math.max(0, Math.min(255, r + noise));
          g = Math.max(0, Math.min(255, g + noise));
          b = Math.max(0, Math.min(255, b + noise));
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      this.textures[id] = c;
    }
  }

  _generateFloorCeilTextures() {
    const size = 64;
    const brutal = this._visualStyle === 1;

    // Floor texture
    // Clockwork: warm teal-tinted tiles with cyan glow accents
    // Brutal:    dark metallic grating (original look)
    const floorBase = brutal
      ? { r: 22, g: 25, b: 32 }
      : { r: 28, g: 42, b: 48 };
    const floorGrid = brutal
      ? { r: 12, g: 15, b: 20 }
      : { r: 15, g: 28, b: 35 };
    const floorGlow = brutal ? { r: 8, g: 18, b: 30 } : { r: 5, g: 40, b: 60 };

    const floorImg = new ImageData(size, size);
    const fd = floorImg.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        let r = floorBase.r,
          g = floorBase.g,
          b = floorBase.b;
        const noise = (Math.random() * 8 - 4) | 0;
        // Grid lines every 16px
        if (x % 16 === 0 || y % 16 === 0) {
          r += floorGrid.r;
          g += floorGrid.g;
          b += floorGrid.b;
        }
        // Heavier seam every 32px
        if (x % 32 < 2 || y % 32 < 2) {
          r += 8;
          g += brutal ? 10 : 14;
          b += brutal ? 14 : 18;
        }
        // Rivets at intersections
        const rx = x % 32,
          ry = y % 32;
        if (rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4) {
          r += brutal ? 20 : 10;
          g += brutal ? 22 : 30;
          b += brutal ? 28 : 45;
        }
        // Glow spots (embedded floor lights)
        const cx = (x % 32) - 16,
          cy = (y % 32) - 16;
        const d = Math.sqrt(cx * cx + cy * cy);
        if (d < 2.5) {
          r += floorGlow.r;
          g += floorGlow.g;
          b += floorGlow.b;
        }
        fd[i] = Math.max(0, Math.min(255, r + noise));
        fd[i + 1] = Math.max(0, Math.min(255, g + noise));
        fd[i + 2] = Math.max(0, Math.min(255, b + noise));
        fd[i + 3] = 255;
      }
    }
    this._floorTexPixels = fd;

    // Ceiling texture
    // Clockwork: sky-toned panels with warm amber light accents
    // Brutal:    dark panels with cold recessed lights (original look)
    const ceilBase = brutal ? { r: 10, g: 10, b: 20 } : { r: 18, g: 22, b: 38 };
    const ceilLight = brutal
      ? { r: 15, g: 20, b: 35 }
      : { r: 40, g: 35, b: 18 };

    const ceilImg = new ImageData(size, size);
    const cd = ceilImg.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        let r = ceilBase.r,
          g = ceilBase.g,
          b = ceilBase.b;
        const noise = (Math.random() * 6 - 3) | 0;
        // Panel edges
        if (x % 32 === 0 || y % 32 === 0) {
          r -= 3;
          g -= 3;
          b -= 3;
        }
        // Structural beam strips every 32px (horizontal)
        if (y % 32 < 3) {
          r += brutal ? 6 : 10;
          g += brutal ? 6 : 8;
          b += brutal ? 8 : 6;
        }
        // Recessed light in panel center
        const px = (x % 32) - 16,
          py = (y % 32) - 16;
        const dl = Math.sqrt(px * px + py * py);
        if (dl < 2) {
          r += ceilLight.r;
          g += ceilLight.g;
          b += ceilLight.b;
        }
        cd[i] = Math.max(0, Math.min(255, r + noise));
        cd[i + 1] = Math.max(0, Math.min(255, g + noise));
        cd[i + 2] = Math.max(0, Math.min(255, b + noise));
        cd[i + 3] = 255;
      }
    }
    this._ceilTexPixels = cd;
  }

  _renderFloorCeiling(camX, camY, dirX, dirY, planeX, planeY) {
    const w = this.width;
    const h = this.height;
    const halfH = h >> 1;

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

    const fogR = this._visualStyle === 1 ? 8 : 12;
    const fogG = this._visualStyle === 1 ? 8 : 22;
    const fogB = this._visualStyle === 1 ? 20 : 38;
    const fogMaxOpacity = this._visualStyle === 1 ? 0.92 : 0.7;

    const loopEnd = h % 2 === 0 ? h : h - 1;
    for (let y = halfH + 1; y < loopEnd; y += 2) {
      const p = y - halfH;
      const rowDist = halfH / p;
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
        const tx = ((fx * 64) | 0) & 63;
        const ty = ((fy * 64) | 0) & 63;
        const ti = (ty * 64 + tx) * 4;

        // Floor pixel
        const fi = (y * w + x) * 4;
        const fr = floorTex[ti] * invFog + fR;
        const fg = floorTex[ti + 1] * invFog + fG;
        const fb = floorTex[ti + 2] * invFog + fB;
        buf[fi] = fr;
        buf[fi + 1] = fg;
        buf[fi + 2] = fb;
        buf[fi + 3] = 255;
        // Copy to skipped row
        const fi2 = ((y - 1) * w + x) * 4;
        buf[fi2] = fr;
        buf[fi2 + 1] = fg;
        buf[fi2 + 2] = fb;
        buf[fi2 + 3] = 255;

        // Ceiling pixel (mirrored)
        const cy = h - 1 - y;
        const ci = (cy * w + x) * 4;
        const cr = ceilTex[ti] * invFog + fR;
        const cg = ceilTex[ti + 1] * invFog + fG;
        const cb = ceilTex[ti + 2] * invFog + fB;
        buf[ci] = cr;
        buf[ci + 1] = cg;
        buf[ci + 2] = cb;
        buf[ci + 3] = 255;
        // Copy ceiling skipped row
        const ci2 = ((cy + 1) * w + x) * 4;
        buf[ci2] = cr;
        buf[ci2 + 1] = cg;
        buf[ci2 + 2] = cb;
        buf[ci2 + 3] = 255;

        fx += stepX;
        fy += stepY;
      }
    }

    // Fill leftover row when height is odd
    if (h % 2 !== 0 && h > halfH + 1) {
      const lastY = h - 1;
      const prevY = lastY - 1;
      for (let x = 0; x < w; x++) {
        const src = (prevY * w + x) * 4;
        const dst = (lastY * w + x) * 4;
        buf[dst] = buf[src];
        buf[dst + 1] = buf[src + 1];
        buf[dst + 2] = buf[src + 2];
        buf[dst + 3] = 255;
        // Mirror for ceiling top row
        const cSrc = ((h - 1 - prevY) * w + x) * 4;
        const cDst = ((h - 1 - lastY) * w + x) * 4;
        if (cDst >= 0) {
          buf[cDst] = buf[cSrc] || fogR;
          buf[cDst + 1] = buf[cSrc + 1] || fogG;
          buf[cDst + 2] = buf[cSrc + 2] || fogB;
          buf[cDst + 3] = 255;
        }
      }
    }

    // Horizon line
    const hi = halfH * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = hi + x * 4;
      buf[idx] = fogR;
      buf[idx + 1] = fogG;
      buf[idx + 2] = fogB;
      buf[idx + 3] = 255;
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

    // Draw textured floor and ceiling (or gradient fallback for builder)
    if (!skipFloorCeil) {
      this._renderFloorCeiling(
        camX,
        camY,
        dirX,
        dirY,
        -dirY * planeMul,
        dirX * planeMul,
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
        let texX = Math.floor(wallX * 64);
        if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
          texX = 63 - texX;
        }

        // Draw textured wall strip
        const texHeight = 64;
        const step = texHeight / lineHeight;
        let texPos = (drawStart - h / 2 + lineHeight / 2) * step;

        // Use drawImage for textured columns
        const srcY = Math.max(0, texPos);
        const srcH = Math.min(64, (drawEnd - drawStart) * step);
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
      }
    }

    // Render sprites
    this.renderSprites(player, entities, time, planeMul, camX, camY);
  }

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
      if (entities[i].active === false) continue;
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
      this.drawHealthPickup(
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
      this.drawAmmoPickup(
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
      this.drawWeaponPickup(
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
      this.drawExit(
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
      this.drawProjectile(
        ctx,
        screenX,
        centerY,
        sprWidth,
        dist,
        entity,
        time,
        fogFactor,
      );
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

    if (enemy.enemyType === "drone") {
      // Drone (Enhanced hovering combat sphere)
      const sphereR = bodyWidth * 0.8;
      const sphereCY = centerY - halfH * 0.05;
      const dronePulse = Math.sin(time * 0.004 + enemy.x * 3);
      const hover = Math.sin(time * 0.005 + enemy.y * 2) * halfH * 0.01;

      // Outer energy field
      ctx.fillStyle = `rgba(0,255,170,${0.04 + dronePulse * 0.02})`;
      ctx.beginPath();
      ctx.arc(screenX, sphereCY + hover, sphereR * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Main sphere body
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(screenX, sphereCY + hover, sphereR, 0, Math.PI * 2);
      ctx.fill();

      // Equator ring (tech seam)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(
        screenX,
        sphereCY + hover,
        sphereR * 0.95,
        sphereR * 0.15,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();

      // Upper hemisphere highlight
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.arc(
        screenX,
        sphereCY + hover - sphereR * 0.2,
        sphereR * 0.75,
        Math.PI,
        0,
      );
      ctx.fill();

      // Inner glow ring
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(screenX, sphereCY + hover, sphereR * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Panel seams (4 meridian lines)
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1;
      for (let ps = 0; ps < 4; ps++) {
        const angle = (ps / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(
          screenX + Math.cos(angle) * sphereR * 0.15,
          sphereCY + hover - sphereR * 0.85,
        );
        ctx.quadraticCurveTo(
          screenX + Math.cos(angle) * sphereR * 0.9,
          sphereCY + hover,
          screenX + Math.cos(angle) * sphereR * 0.15,
          sphereCY + hover + sphereR * 0.85,
        );
        ctx.stroke();
      }

      // Specular highlight
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(
        screenX - sphereR * 0.25,
        sphereCY + hover - sphereR * 0.3,
        sphereR * 0.18,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(
        screenX - sphereR * 0.15,
        sphereCY + hover - sphereR * 0.2,
        sphereR * 0.08,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Eye housing (recessed ring)
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, sphereCY + hover, sphereR * 0.32, 0, Math.PI * 2);
      ctx.stroke();

      // Eye
      const blink = Math.sin(time * 0.005 + enemy.x * 10) > 0.95;
      if (!blink) {
        // Eye glow halo
        ctx.fillStyle = "rgba(0,255,170,0.15)";
        ctx.beginPath();
        ctx.arc(screenX, sphereCY + hover, sphereR * 0.35, 0, Math.PI * 2);
        ctx.fill();
        // Iris
        ctx.fillStyle = "#00ffaa";
        ctx.beginPath();
        ctx.arc(screenX, sphereCY + hover, sphereR * 0.25, 0, Math.PI * 2);
        ctx.fill();
        // Iris ring detail
        ctx.strokeStyle = "rgba(0,200,150,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenX, sphereCY + hover, sphereR * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        // Pupil (tracks slightly)
        const pupilTrack = Math.sin(time * 0.002 + enemy.y) * sphereR * 0.04;
        ctx.fillStyle = "#003322";
        ctx.beginPath();
        ctx.arc(
          screenX + pupilTrack,
          sphereCY + hover,
          sphereR * 0.1,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Pupil highlight
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          screenX + pupilTrack + sphereR * 0.04,
          sphereCY + hover - sphereR * 0.04,
          sphereR * 0.04,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else {
        // Blink — thin line
        ctx.strokeStyle = "#00ffaa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX - sphereR * 0.2, sphereCY + hover);
        ctx.lineTo(screenX + sphereR * 0.2, sphereCY + hover);
        ctx.stroke();
      }

      // Sensor dots (3 around equator)
      for (let sd = 0; sd < 3; sd++) {
        const sda = (sd / 3) * Math.PI * 2 + time * 0.002;
        const sdx = screenX + Math.cos(sda) * sphereR * 0.8;
        const sdy = sphereCY + hover + Math.sin(sda) * sphereR * 0.12;
        ctx.fillStyle = `rgba(0,255,170,${0.3 + dronePulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(sdx, sdy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Antenna (more detailed)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      const antBaseY = sphereCY + hover - sphereR;
      const antTipY = antBaseY - halfH * 0.2;
      ctx.beginPath();
      ctx.moveTo(screenX, antBaseY);
      ctx.lineTo(screenX, antTipY);
      ctx.stroke();
      // Antenna joint
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(screenX, antBaseY, 2, 0, Math.PI * 2);
      ctx.fill();
      // Antenna tip glow
      ctx.fillStyle = `rgba(0,255,170,${0.3 + dronePulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(screenX, antTipY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00ffaa";
      ctx.beginPath();
      ctx.arc(screenX, antTipY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Thruster jets underneath (3 small vents)
      const thrustBase = sphereCY + hover + sphereR * 0.7;
      for (let tj = 0; tj < 3; tj++) {
        const txOff = (tj - 1) * bodyWidth * 0.25;
        // Vent housing
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(screenX + txOff - 3, thrustBase, 6, sphereR * 0.2);
        // Thrust glow
        const thrustFlicker = 0.5 + Math.sin(time * 0.015 + tj * 2) * 0.3;
        ctx.fillStyle = `rgba(0,255,170,${0.15 * thrustFlicker})`;
        ctx.beginPath();
        ctx.moveTo(screenX + txOff - 4, thrustBase + sphereR * 0.15);
        ctx.lineTo(
          screenX + txOff,
          thrustBase + sphereR * 0.4 + thrustFlicker * sphereR * 0.1,
        );
        ctx.lineTo(screenX + txOff + 4, thrustBase + sphereR * 0.15);
        ctx.fill();
      }

      // Hover glow underneath (enhanced)
      ctx.fillStyle = `rgba(0,255,170,${0.06 + dronePulse * 0.03})`;
      ctx.beginPath();
      ctx.ellipse(
        screenX,
        bodyBottom + halfH * 0.1,
        bodyWidth * 0.6,
        halfH * 0.08,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = alpha * 0.2;
      ctx.beginPath();
      ctx.ellipse(
        screenX,
        bodyBottom + halfH * 0.1,
        bodyWidth * 0.35,
        halfH * 0.04,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = alpha;
    } else if (enemy.enemyType === "phantom") {
      // Phantom (Enhanced ethereal wraith)
      const phaseOff = Math.sin(time * 0.003 + enemy.y * 5) * bodyWidth * 0.15;
      const drift = Math.sin(time * 0.002 + enemy.x * 3) * halfH * 0.01;
      const phantomPulse = (Math.sin(time * 0.004 + enemy.y * 2) + 1) * 0.5;

      // Outer ethereal aura
      ctx.fillStyle = "rgba(150,50,255,0.04)";
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.ellipse(
        screenX + phaseOff,
        centerY + drift,
        bodyWidth * 1.2,
        halfH * 0.55,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Ghostly body
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.moveTo(screenX - bodyWidth * 0.3 + phaseOff, bodyTop + drift);
      ctx.quadraticCurveTo(
        screenX - bodyWidth * 1.0 + phaseOff,
        centerY + drift,
        screenX - bodyWidth * 0.6,
        bodyBottom + drift,
      );
      ctx.lineTo(screenX + bodyWidth * 0.6, bodyBottom + drift);
      ctx.quadraticCurveTo(
        screenX + bodyWidth * 1.0 + phaseOff,
        centerY + drift,
        screenX + bodyWidth * 0.3 + phaseOff,
        bodyTop + drift,
      );
      ctx.closePath();
      ctx.fill();

      // Secondary body layer (depth)
      ctx.fillStyle = darkColor;
      ctx.globalAlpha = alpha * 0.2;
      ctx.beginPath();
      ctx.moveTo(
        screenX - bodyWidth * 0.2 + phaseOff * 0.5,
        bodyTop + halfH * 0.05 + drift,
      );
      ctx.quadraticCurveTo(
        screenX - bodyWidth * 0.8 + phaseOff * 0.5,
        centerY + drift,
        screenX - bodyWidth * 0.5,
        bodyBottom - halfH * 0.02 + drift,
      );
      ctx.lineTo(screenX + bodyWidth * 0.5, bodyBottom - halfH * 0.02 + drift);
      ctx.quadraticCurveTo(
        screenX + bodyWidth * 0.8 + phaseOff * 0.5,
        centerY + drift,
        screenX + bodyWidth * 0.2 + phaseOff * 0.5,
        bodyTop + halfH * 0.05 + drift,
      );
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Rotating glyph overlay (adds mystical motion)
      ctx.save();
      ctx.translate(screenX, tsTop + halfH * 0.02);
      ctx.rotate(time * 0.002 + (enemy.id || 0) * 0.13);
      ctx.globalAlpha = alpha * 0.12;
      ctx.strokeStyle = "rgba(240,190,255,0.9)";
      ctx.lineWidth = 1.2;
      for (let g = 0; g < 6; g++) {
        const ra = (Math.PI * 2 * g) / 6;
        const rx = Math.cos(ra) * tsW * 0.85;
        const ry = Math.sin(ra) * tsW * 0.42;
        ctx.beginPath();
        ctx.ellipse(rx, ry, tsW * 0.06, tsW * 0.02, ra + time * 0.0012, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = alpha;

      // Inner ethereal core
      ctx.fillStyle = darkColor;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.ellipse(
        screenX + phaseOff,
        centerY - halfH * 0.05 + drift,
        bodyWidth * 0.45,
        halfH * 0.25,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Rib-like internal structures (showing through translucent body)
      ctx.strokeStyle = "rgba(100,30,180,0.15)";
      ctx.lineWidth = 1;
      for (let rb = 0; rb < 4; rb++) {
        const rby = centerY - halfH * 0.08 + rb * halfH * 0.08 + drift;
        ctx.beginPath();
        ctx.moveTo(screenX - bodyWidth * 0.3 + phaseOff, rby);
        ctx.quadraticCurveTo(
          screenX + phaseOff,
          rby + halfH * 0.02,
          screenX + bodyWidth * 0.3 + phaseOff,
          rby - halfH * 0.01,
        );
        ctx.stroke();
      }

      // Two hollow eyes (enhanced with glow layers)
      const eyeY = centerY - halfH * 0.1 + drift;
      // Left eye glow
      ctx.fillStyle = `rgba(204,102,255,${0.15 + phantomPulse * 0.1})`;
      ctx.beginPath();
      ctx.arc(
        screenX - bodyWidth * 0.25 + phaseOff,
        eyeY,
        bodyWidth * 0.18,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Right eye glow
      ctx.beginPath();
      ctx.arc(
        screenX + bodyWidth * 0.25 + phaseOff,
        eyeY,
        bodyWidth * 0.18,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Eye orbs
      ctx.fillStyle = "#cc66ff";
      ctx.beginPath();
      ctx.arc(
        screenX - bodyWidth * 0.25 + phaseOff,
        eyeY,
        bodyWidth * 0.12,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        screenX + bodyWidth * 0.25 + phaseOff,
        eyeY,
        bodyWidth * 0.12,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Dark eye centers
      ctx.fillStyle = "#220033";
      ctx.beginPath();
      ctx.arc(
        screenX - bodyWidth * 0.25 + phaseOff,
        eyeY,
        bodyWidth * 0.05,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        screenX + bodyWidth * 0.25 + phaseOff,
        eyeY,
        bodyWidth * 0.05,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Eye highlights
      ctx.fillStyle = "rgba(255,200,255,0.4)";
      ctx.beginPath();
      ctx.arc(
        screenX - bodyWidth * 0.28 + phaseOff,
        eyeY - bodyWidth * 0.04,
        bodyWidth * 0.03,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        screenX + bodyWidth * 0.22 + phaseOff,
        eyeY - bodyWidth * 0.04,
        bodyWidth * 0.03,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Wailing mouth
      const mouthOpen = 0.5 + Math.sin(time * 0.006 + enemy.x * 4) * 0.3;
      ctx.fillStyle = "#110022";
      ctx.beginPath();
      ctx.ellipse(
        screenX + phaseOff,
        centerY + halfH * 0.08 + drift,
        bodyWidth * 0.1,
        halfH * 0.04 * mouthOpen,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Tendrils hanging down (more variety)
      ctx.globalAlpha = alpha * 0.4;
      ctx.lineWidth = 2;
      for (let t = 0; t < 5; t++) {
        const tx = screenX - bodyWidth * 0.5 + t * bodyWidth * 0.25;
        const tWave = Math.sin(time * 0.004 + t * 1.7) * bodyWidth * 0.1;
        const tLen = halfH * (0.2 + (t % 2) * 0.12);
        ctx.strokeStyle = `rgba(${150 + t * 15},${50 + t * 10},255,0.4)`;
        ctx.beginPath();
        ctx.moveTo(tx, bodyBottom + drift);
        ctx.quadraticCurveTo(
          tx + tWave,
          bodyBottom + drift + tLen * 0.5,
          tx + tWave * 0.5,
          bodyBottom + drift + tLen,
        );
        ctx.stroke();
        // Tendril tip fade
        ctx.fillStyle = `rgba(150,50,255,${0.15 - t * 0.02})`;
        ctx.beginPath();
        ctx.arc(
          tx + tWave * 0.5,
          bodyBottom + drift + tLen,
          1.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = alpha;

      // Floating soul wisps (orbiting particles)
      for (let w = 0; w < 3; w++) {
        const wa = time * 0.003 + w * ((Math.PI * 2) / 3);
        const wDist = bodyWidth * (0.7 + Math.sin(time * 0.002 + w) * 0.15);
        const wx = screenX + Math.cos(wa) * wDist;
        const wy = centerY + drift + Math.sin(wa) * halfH * 0.3;
        ctx.fillStyle = `rgba(180,100,255,${0.2 + phantomPulse * 0.15})`;
        ctx.beginPath();
        ctx.arc(wx, wy, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glitch lines (2 for more effect)
      ctx.fillStyle = `rgba(150,50,255,0.35)`;
      const glitchY =
        bodyTop + ((time * 0.7 + enemy.x * 100) % (bodyBottom - bodyTop));
      ctx.fillRect(screenX - bodyWidth - 3, glitchY, bodyWidth * 2 + 6, 2);
      const glitchY2 =
        bodyTop + ((time * 0.4 + enemy.y * 80) % (bodyBottom - bodyTop));
      ctx.fillStyle = `rgba(100,30,200,0.2)`;
      ctx.fillRect(screenX - bodyWidth * 0.5, glitchY2, bodyWidth, 1);
    } else if (enemy.enemyType === "beast") {
      // Beast (Cerberus)
      const bW = bodyWidth * 1.4;
      const breathe = Math.sin(time * 0.006 + enemy.x * 3) * halfH * 0.015;
      const backY = centerY - halfH * 0.22 + breathe;
      const chestY = centerY - halfH * 0.28 + breathe;
      const bellyY = centerY + halfH * 0.18;
      const rumpY = centerY - halfH * 0.08 + breathe;

      // Ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(
        screenX,
        bellyY + halfH * 0.28,
        bW * 0.9,
        halfH * 0.04,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Torso
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.85, bellyY + halfH * 0.05);
      ctx.quadraticCurveTo(
        screenX - bW * 0.7,
        rumpY - halfH * 0.06,
        screenX - bW * 0.4,
        backY,
      );
      ctx.quadraticCurveTo(
        screenX,
        backY - halfH * 0.08,
        screenX + bW * 0.3,
        chestY,
      );
      ctx.quadraticCurveTo(
        screenX + bW * 0.55,
        chestY - halfH * 0.02,
        screenX + bW * 0.65,
        chestY + halfH * 0.03,
      );
      // Rounded chest front
      ctx.quadraticCurveTo(
        screenX + bW * 0.72,
        chestY + halfH * 0.12,
        screenX + bW * 0.68,
        bellyY - halfH * 0.02,
      );
      ctx.quadraticCurveTo(
        screenX + bW * 0.65,
        bellyY + halfH * 0.06,
        screenX + bW * 0.55,
        bellyY + halfH * 0.08,
      );
      ctx.quadraticCurveTo(
        screenX + bW * 0.2,
        bellyY + halfH * 0.12,
        screenX - bW * 0.3,
        bellyY + halfH * 0.08,
      );
      ctx.quadraticCurveTo(
        screenX - bW * 0.6,
        bellyY + halfH * 0.06,
        screenX - bW * 0.85,
        bellyY + halfH * 0.05,
      );
      ctx.closePath();
      ctx.fill();

      // Belly underside highlight
      ctx.strokeStyle = hitFlash ? "#ffcccc" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.4, bellyY + halfH * 0.1);
      ctx.quadraticCurveTo(
        screenX + bW * 0.1,
        bellyY + halfH * 0.13,
        screenX + bW * 0.5,
        bellyY + halfH * 0.08,
      );
      ctx.stroke();

      // Muscle definition
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.5;
      // Shoulder muscles
      ctx.beginPath();
      ctx.arc(
        screenX + bW * 0.35,
        centerY - halfH * 0.05,
        bW * 0.3,
        Math.PI * 1.2,
        Math.PI * 1.9,
      );
      ctx.stroke();
      // Shoulder highlight
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        screenX + bW * 0.35,
        centerY - halfH * 0.06,
        bW * 0.28,
        Math.PI * 1.3,
        Math.PI * 1.7,
      );
      ctx.stroke();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.5;
      // Haunch muscles
      ctx.beginPath();
      ctx.arc(
        screenX - bW * 0.5,
        centerY + halfH * 0.02,
        bW * 0.26,
        Math.PI * 1.3,
        Math.PI * 1.8,
      );
      ctx.stroke();
      // Haunch highlight
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        screenX - bW * 0.5,
        centerY + halfH * 0.01,
        bW * 0.24,
        Math.PI * 1.4,
        Math.PI * 1.7,
      );
      ctx.stroke();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.5;
      // Ribcage lines
      for (let r = 0; r < 3; r++) {
        const rx = screenX - bW * 0.1 + r * bW * 0.15;
        ctx.beginPath();
        ctx.moveTo(rx, backY + halfH * 0.02);
        ctx.quadraticCurveTo(
          rx + bW * 0.02,
          centerY + halfH * 0.02,
          rx,
          bellyY,
        );
        ctx.stroke();
      }
      // Chest/pectoral muscles
      ctx.beginPath();
      ctx.arc(
        screenX + bW * 0.45,
        centerY - halfH * 0.12,
        bW * 0.18,
        Math.PI * 0.8,
        Math.PI * 1.5,
      );
      ctx.stroke();

      // Fur texture strokes along the back and sides
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let f = 0; f < 8; f++) {
        const ft = f / 7;
        const fx = screenX - bW * 0.65 + ft * bW * 1.2;
        const fy =
          rumpY +
          (backY - rumpY) * ft +
          breathe -
          Math.sin(ft * Math.PI) * halfH * 0.03;
        const fDir = -1 + Math.sin(f * 2.3) * 0.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + bW * 0.03 * fDir, fy + halfH * 0.06);
        ctx.stroke();
      }
      // Darker fur strokes on belly
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      for (let f = 0; f < 5; f++) {
        const fx = screenX - bW * 0.3 + f * bW * 0.15;
        ctx.beginPath();
        ctx.moveTo(fx, bellyY);
        ctx.lineTo(fx + bW * 0.02, bellyY + halfH * 0.05);
        ctx.stroke();
      }

      // Battle scars
      ctx.strokeStyle = "rgba(80,20,20,0.4)";
      ctx.lineWidth = 1.5;
      // Scar across shoulder
      ctx.beginPath();
      ctx.moveTo(screenX + bW * 0.15, backY + halfH * 0.05);
      ctx.lineTo(screenX + bW * 0.3, backY + halfH * 0.12);
      ctx.lineTo(screenX + bW * 0.25, backY + halfH * 0.18);
      ctx.stroke();
      // Scar on flank
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.35, centerY - halfH * 0.02);
      ctx.lineTo(screenX - bW * 0.2, centerY + halfH * 0.03);
      ctx.stroke();

      // Neck muscles
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX + bW * 0.5, chestY + halfH * 0.02);
      ctx.quadraticCurveTo(
        screenX + bW * 0.55,
        chestY - halfH * 0.04,
        screenX + bW * 0.65,
        chestY - halfH * 0.06,
      );
      ctx.stroke();
      ctx.lineWidth = 1.5;
      // Heads
      const neckBaseX = screenX + bW * 0.55;
      const neckBaseY = chestY;

      // Shared neck mass
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX + bW * 0.4, chestY - halfH * 0.08);
      ctx.quadraticCurveTo(
        screenX + bW * 0.65,
        chestY - halfH * 0.18,
        screenX + bW * 0.75,
        chestY - halfH * 0.06,
      );
      ctx.quadraticCurveTo(
        screenX + bW * 0.75,
        bellyY - halfH * 0.05,
        screenX + bW * 0.5,
        chestY + halfH * 0.12,
      );
      ctx.quadraticCurveTo(
        screenX + bW * 0.35,
        chestY + halfH * 0.1,
        screenX + bW * 0.4,
        chestY - halfH * 0.08,
      );
      ctx.fill();

      // Chain collar around neck mass
      ctx.strokeStyle = "#555566";
      ctx.lineWidth = 2.5;
      const collarY = chestY + halfH * 0.02;
      ctx.beginPath();
      ctx.ellipse(
        screenX + bW * 0.55,
        collarY,
        bW * 0.18,
        halfH * 0.06,
        -0.2,
        Math.PI * 0.3,
        Math.PI * 1.7,
      );
      ctx.stroke();
      // Chain links
      ctx.strokeStyle = "#777788";
      ctx.lineWidth = 1.5;
      for (let cl = 0; cl < 4; cl++) {
        const ca = Math.PI * 0.4 + cl * 0.35;
        const cx = screenX + bW * 0.55 + Math.cos(ca) * bW * 0.17;
        const cy = collarY + Math.sin(ca) * halfH * 0.055;
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Hanging chain segment
      ctx.strokeStyle = "#555566";
      ctx.lineWidth = 2;
      const chainHangX = screenX + bW * 0.55 + bW * 0.15;
      ctx.beginPath();
      ctx.moveTo(chainHangX, collarY + halfH * 0.04);
      ctx.quadraticCurveTo(
        chainHangX + bW * 0.05,
        collarY + halfH * 0.12,
        chainHangX - bW * 0.02,
        collarY + halfH * 0.16,
      );
      ctx.stroke();

      const drawHoundHead = (hx, hy, sc) => {
        const sw = bW * 0.28 * sc;
        const sh = halfH * 0.12 * sc;
        const jawAmt =
          Math.sin(time * 0.005 + hx) * halfH * 0.012 + halfH * 0.025;

        // Neck
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(neckBaseX, neckBaseY - halfH * 0.02);
        ctx.quadraticCurveTo(
          neckBaseX + (hx - neckBaseX) * 0.6,
          neckBaseY + (hy - neckBaseY) * 0.5,
          hx - sw * 0.2,
          hy - sh * 0.3,
        );
        ctx.lineTo(hx - sw * 0.2, hy + sh * 0.3);
        ctx.quadraticCurveTo(
          neckBaseX + (hx - neckBaseX) * 0.6,
          neckBaseY + (hy - neckBaseY) * 0.5 + halfH * 0.05,
          neckBaseX,
          neckBaseY + halfH * 0.04,
        );
        ctx.fill();

        // Skull
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.9, hy + sh * 0.1);
        ctx.quadraticCurveTo(
          hx + sw,
          hy - sh * 0.3,
          hx + sw * 0.5,
          hy - sh * 0.8,
        );
        ctx.quadraticCurveTo(hx, hy - sh, hx - sw * 0.35, hy - sh * 0.5);
        ctx.quadraticCurveTo(hx - sw * 0.4, hy, hx - sw * 0.3, hy + sh * 0.4);
        ctx.quadraticCurveTo(
          hx + sw * 0.1,
          hy + sh * 0.8,
          hx + sw * 0.5,
          hy + sh * 0.5,
        );
        ctx.quadraticCurveTo(
          hx + sw * 0.8,
          hy + sh * 0.35,
          hx + sw * 0.9,
          hy + sh * 0.1,
        );
        ctx.fill();

        // Pointed ear
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.1, hy - sh * 0.85);
        ctx.lineTo(hx - sw * 0.05, hy - sh * 1.7);
        ctx.lineTo(hx + sw * 0.3, hy - sh * 0.9);
        ctx.fill();
        // Inner ear
        ctx.fillStyle = "#440000";
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.12, hy - sh * 0.9);
        ctx.lineTo(hx + sw * 0.0, hy - sh * 1.4);
        ctx.lineTo(hx + sw * 0.24, hy - sh * 0.95);
        ctx.fill();

        // Eye (layered glow, no shadowBlur for performance)
        const er = sw * 0.14;
        const eyeX = hx + sw * 0.28;
        const eyeBaseY = hy - sh * 0.25;
        ctx.fillStyle = "rgba(255,34,0,0.15)";
        ctx.beginPath();
        ctx.arc(eyeX, eyeBaseY, er * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,34,0,0.3)";
        ctx.beginPath();
        ctx.arc(eyeX, eyeBaseY, er * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff2200";
        ctx.beginPath();
        ctx.arc(eyeX, eyeBaseY, er, 0, Math.PI * 2);
        ctx.fill();
        // Slit pupil
        ctx.fillStyle = "#000000";
        ctx.fillRect(hx + sw * 0.26, hy - sh * 0.3, er * 0.3, er * 1.2);
        // Eye highlight
        ctx.fillStyle = "rgba(255,200,150,0.35)";
        ctx.beginPath();
        ctx.arc(
          eyeX - er * 0.25,
          eyeBaseY - er * 0.25,
          er * 0.25,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Brow ridge (heavier)
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.02, hy - sh * 0.48);
        ctx.quadraticCurveTo(
          hx + sw * 0.25,
          hy - sh * 0.55,
          hx + sw * 0.48,
          hy - sh * 0.4,
        );
        ctx.stroke();
        ctx.lineWidth = 1.5;

        // Snout wrinkles
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        for (let wr = 0; wr < 3; wr++) {
          const wry = hy + sh * 0.0 + wr * sh * 0.1;
          ctx.beginPath();
          ctx.moveTo(hx + sw * 0.55, wry);
          ctx.quadraticCurveTo(
            hx + sw * 0.7,
            wry - sh * 0.03,
            hx + sw * 0.85,
            wry + sh * 0.01,
          );
          ctx.stroke();
        }

        // Upper jaw / snout
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.5, hy + sh * 0.05);
        ctx.lineTo(hx + sw * 1.1, hy + sh * 0.1);
        ctx.lineTo(hx + sw * 1.1, hy + sh * 0.32);
        ctx.lineTo(hx + sw * 0.4, hy + sh * 0.37);
        ctx.closePath();
        ctx.fill();
        // Nose
        ctx.fillStyle = "#111111";
        ctx.beginPath();
        ctx.ellipse(
          hx + sw * 1.05,
          hy + sh * 0.2,
          sw * 0.07,
          sh * 0.1,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Nostrils
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(
          hx + sw * 1.02,
          hy + sh * 0.19,
          sw * 0.03,
          sh * 0.04,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(
          hx + sw * 1.08,
          hy + sh * 0.19,
          sw * 0.03,
          sh * 0.04,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Nostril smoke/breath
        const smokePhase = Math.sin(time * 0.004 + hx * 2);
        if (smokePhase > 0) {
          ctx.globalAlpha = smokePhase * 0.2;
          ctx.fillStyle = "rgba(180,120,120,0.3)";
          for (let sm = 0; sm < 3; sm++) {
            const smOff = sm * sw * 0.08;
            const smY = hy + sh * 0.15 - smOff * 0.5 - smokePhase * sh * 0.15;
            const smR = sw * 0.04 + sm * sw * 0.03;
            ctx.beginPath();
            ctx.arc(hx + sw * 1.12 + smOff * 0.3, smY, smR, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // Lower jaw
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.3, hy + sh * 0.42 + jawAmt);
        ctx.lineTo(hx + sw * 1.0, hy + sh * 0.38 + jawAmt * 0.6);
        ctx.lineTo(hx + sw * 1.0, hy + sh * 0.52 + jawAmt);
        ctx.lineTo(hx + sw * 0.3, hy + sh * 0.65 + jawAmt);
        ctx.closePath();
        ctx.fill();
        // Mouth interior
        ctx.fillStyle = "#330000";
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.4, hy + sh * 0.33);
        ctx.lineTo(hx + sw * 0.95, hy + sh * 0.28);
        ctx.lineTo(hx + sw * 0.95, hy + sh * 0.42 + jawAmt * 0.4);
        ctx.lineTo(hx + sw * 0.4, hy + sh * 0.5 + jawAmt * 0.3);
        ctx.fill();
        // Tongue
        ctx.fillStyle = "#881133";
        ctx.beginPath();
        ctx.ellipse(
          hx + sw * 0.65,
          hy + sh * 0.46 + jawAmt * 0.3,
          sw * 0.15,
          sh * 0.08,
          0,
          0,
          Math.PI,
        );
        ctx.fill();

        // Upper fangs
        ctx.fillStyle = "#eeeedd";
        const fl = sh * 0.65;
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.48 - 1.5, hy + sh * 0.28);
        ctx.lineTo(hx + sw * 0.48, hy + sh * 0.28 + fl);
        ctx.lineTo(hx + sw * 0.48 + 1.5, hy + sh * 0.28);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.85 - 1.5, hy + sh * 0.24);
        ctx.lineTo(hx + sw * 0.85, hy + sh * 0.24 + fl * 0.8);
        ctx.lineTo(hx + sw * 0.85 + 1.5, hy + sh * 0.24);
        ctx.fill();
        // Smaller teeth
        for (let t = 0; t < 3; t++) {
          const tx = hx + sw * 0.52 + t * sw * 0.1;
          ctx.beginPath();
          ctx.moveTo(tx - 1, hy + sh * 0.3);
          ctx.lineTo(tx, hy + sh * 0.3 + fl * 0.35);
          ctx.lineTo(tx + 1, hy + sh * 0.3);
          ctx.fill();
        }
        // Lower fangs
        for (let t = 0; t < 2; t++) {
          const tx = hx + sw * 0.5 + t * sw * 0.25;
          ctx.beginPath();
          ctx.moveTo(tx - 1, hy + sh * 0.47 + jawAmt * 0.4);
          ctx.lineTo(tx, hy + sh * 0.47 + jawAmt * 0.4 - fl * 0.3);
          ctx.lineTo(tx + 1, hy + sh * 0.47 + jawAmt * 0.4);
          ctx.fill();
        }
        // Drool (thicker, more strands)
        ctx.lineWidth = 1;
        for (let d = 0; d < 3; d++) {
          const dx = hx + sw * 0.45 + d * sw * 0.2;
          const dLen =
            halfH * 0.05 + Math.sin(time * 0.008 + d + hx) * halfH * 0.025;
          // Drool strand
          ctx.strokeStyle = `rgba(200,50,50,${0.3 + d * 0.1})`;
          ctx.beginPath();
          ctx.moveTo(dx, hy + sh * 0.46 + jawAmt * 0.3);
          ctx.quadraticCurveTo(
            dx + Math.sin(time * 0.003 + d) * 2.5,
            hy + sh * 0.46 + jawAmt * 0.3 + dLen * 0.6,
            dx + Math.sin(time * 0.004 + d) * 1.5,
            hy + sh * 0.46 + jawAmt * 0.3 + dLen,
          );
          ctx.stroke();
          // Drool droplet at tip
          if (d < 2) {
            ctx.fillStyle = "rgba(200,50,50,0.3)";
            ctx.beginPath();
            ctx.arc(
              dx + Math.sin(time * 0.004 + d) * 1.5,
              hy + sh * 0.46 + jawAmt * 0.3 + dLen,
              1.2,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      };

      // Draw order
      drawHoundHead(screenX + bW * 0.65, chestY + halfH * 0.12, 0.7);
      drawHoundHead(screenX + bW * 0.68, chestY - halfH * 0.18, 0.72);
      drawHoundHead(screenX + bW * 0.82, chestY - halfH * 0.02, 1.0);
      // Legs
      ctx.fillStyle = darkColor;
      // Front legs
      const drawDogLeg = (lx, ly, isRear) => {
        const legW = bW * 0.1;
        const upperLen = halfH * 0.18;
        const lowerLen = halfH * 0.16;
        const pawY = ly + upperLen + lowerLen;
        // Upper leg
        ctx.fillRect(lx - legW * 0.6, ly, legW * 1.2, upperLen);
        // Upper leg muscle highlight
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx - legW * 0.2, ly + 2);
        ctx.lineTo(lx - legW * 0.15, ly + upperLen * 0.7);
        ctx.stroke();
        // Joint
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(lx, ly + upperLen, legW * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Joint ring
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.arc(lx, ly + upperLen, legW * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        // Lower leg
        const offset = isRear ? -legW * 0.3 : legW * 0.3;
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(lx - legW * 0.4, ly + upperLen);
        ctx.lineTo(lx + offset - legW * 0.3, pawY);
        ctx.lineTo(lx + offset + legW * 0.3, pawY);
        ctx.lineTo(lx + legW * 0.4, ly + upperLen);
        ctx.fill();
        // Paw base
        ctx.fillRect(lx + offset - legW * 0.6, pawY, legW * 1.2, halfH * 0.03);
        // Paw pad
        ctx.fillStyle = "#1a1008";
        ctx.beginPath();
        ctx.ellipse(
          lx + offset,
          pawY + halfH * 0.015,
          legW * 0.35,
          halfH * 0.012,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Claws
        ctx.fillStyle = "#ccccaa";
        for (let c = 0; c < 3; c++) {
          ctx.beginPath();
          ctx.moveTo(
            lx + offset - legW * 0.4 + c * legW * 0.4,
            pawY + halfH * 0.03,
          );
          ctx.lineTo(
            lx + offset - legW * 0.4 + c * legW * 0.4,
            pawY + halfH * 0.07,
          );
          ctx.lineTo(
            lx + offset - legW * 0.4 + c * legW * 0.4 + 1,
            pawY + halfH * 0.03,
          );
          ctx.fill();
        }
        ctx.fillStyle = darkColor;
      };
      drawDogLeg(screenX + bW * 0.55, bellyY + halfH * 0.02, false);
      drawDogLeg(screenX + bW * 0.3, bellyY + halfH * 0.04, false);
      drawDogLeg(screenX - bW * 0.5, bellyY + halfH * 0.01, true);
      drawDogLeg(screenX - bW * 0.7, bellyY + halfH * 0.03, true);
      // Tail
      const tailBaseX = screenX - bW * 0.7;
      const tailBaseY = rumpY + breathe;
      const tailSwing = Math.sin(time * 0.006 + enemy.y * 2) * halfH * 0.08;
      const tailMidX = tailBaseX - bW * 0.25;
      const tailMidY = tailBaseY - halfH * 0.18 + tailSwing * 0.5;
      const tailEndX = tailBaseX - bW * 0.3;
      const tailEndY = tailBaseY - halfH * 0.22 + tailSwing;
      // Tail body
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(tailBaseX + bW * 0.08, tailBaseY - halfH * 0.04);
      ctx.quadraticCurveTo(
        tailMidX,
        tailMidY - halfH * 0.025,
        tailEndX,
        tailEndY,
      );
      ctx.lineTo(tailEndX + 1, tailEndY + halfH * 0.01);
      ctx.quadraticCurveTo(
        tailMidX + bW * 0.02,
        tailMidY + halfH * 0.03,
        tailBaseX + bW * 0.08,
        tailBaseY + halfH * 0.04,
      );
      ctx.closePath();
      ctx.fill();
      // Sword blade tip
      const swordLen = bW * 0.25;
      const sAng = Math.atan2(tailEndY - tailMidY, tailEndX - tailMidX);
      ctx.save();
      ctx.translate(tailEndX, tailEndY);
      ctx.rotate(sAng);
      // Blade glow
      ctx.fillStyle = "rgba(176,184,192,0.15)";
      ctx.beginPath();
      ctx.moveTo(-2, -halfH * 0.08);
      ctx.lineTo(swordLen + 2, 0);
      ctx.lineTo(-2, halfH * 0.08);
      ctx.fill();
      // Main blade
      ctx.fillStyle = "#b0b8c0";
      ctx.beginPath();
      ctx.moveTo(0, -halfH * 0.06);
      ctx.lineTo(swordLen, 0);
      ctx.lineTo(0, halfH * 0.06);
      ctx.fill();
      // Blade edge highlight
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(1, -halfH * 0.04);
      ctx.lineTo(swordLen * 0.9, 0);
      ctx.stroke();
      // Blood edge
      ctx.strokeStyle = "rgba(180,30,30,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, halfH * 0.04);
      ctx.lineTo(swordLen * 0.7, halfH * 0.01);
      ctx.stroke();
      // Cross guard (more detailed)
      ctx.fillStyle = "#665544";
      ctx.fillRect(-4, -halfH * 0.09, 8, halfH * 0.18);
      // Guard ornamentation
      ctx.fillStyle = "#887766";
      ctx.fillRect(-3, -halfH * 0.09, 6, 2);
      ctx.fillRect(-3, halfH * 0.07, 6, 2);
      ctx.restore();

      // Spines (enhanced with glow tips)
      for (let sp = 0; sp < 7; sp++) {
        const t = sp / 6;
        const sx = screenX - bW * 0.65 + t * bW * 1.1;
        const backCurveY =
          rumpY +
          (backY - rumpY) * t +
          breathe -
          Math.sin(t * Math.PI) * halfH * 0.04;
        const spH = halfH * (0.055 + Math.sin(sp * 1.5 + time * 0.003) * 0.015);
        // Spine base shadow
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.beginPath();
        ctx.moveTo(sx - 3, backCurveY);
        ctx.lineTo(sx, backCurveY - spH * 0.3);
        ctx.lineTo(sx + 3, backCurveY);
        ctx.fill();
        // Spine
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(sx - 2, backCurveY);
        ctx.lineTo(sx, backCurveY - spH);
        ctx.lineTo(sx + 2, backCurveY);
        ctx.fill();
        // Spine highlight
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sx - 1, backCurveY);
        ctx.lineTo(sx, backCurveY - spH);
        ctx.stroke();
      }
    } else if (
      enemy.enemyType === "boss" ||
      enemy.enemyType === "boss_form2" ||
      enemy.enemyType === "boss_form3"
    ) {
      // ─── Paradox Lord (all forms) ───
      const bossForm = enemy.def.form || 1;
      const formScale = 1 + (bossForm - 1) * 0.08;
      const bW = bodyWidth * 1.15 * formScale;
      const bTop = bodyTop - halfH * 0.12;
      const bBot = bodyBottom + halfH * 0.05;
      const torsoH = bBot - bTop;
      const breathe = Math.sin(time * 0.002) * halfH * 0.015;
      const pulse = (Math.sin(time * 0.004) + 1) * 0.5;

      // Form-dependent brighter colors (original c1/c2 are too dark)
      const formBaseColors = ["#ff3399", "#ff2277", "#ff1155"];
      const formDarkColors = ["#881144", "#771144", "#991133"];
      const formAccents = ["#ff66bb", "#ff44aa", "#ff2299"];
      const bossBaseColor = hitFlash ? "#ffffff" : formBaseColors[bossForm - 1];
      const bossDarkColor = hitFlash ? "#ffaaaa" : formDarkColors[bossForm - 1];
      const bossAccent = hitFlash ? "#ffcccc" : formAccents[bossForm - 1];

      // Dark aura — intensifies with form
      ctx.save();
      const auraR = bW * (1.8 + (bossForm - 1) * 0.3) + pulse * bW * 0.3;
      const auraGrad = ctx.createRadialGradient(
        screenX,
        centerY,
        bW * 0.3,
        screenX,
        centerY,
        auraR,
      );
      auraGrad.addColorStop(0, `rgba(120,0,50,${0.18 + bossForm * 0.04})`);
      auraGrad.addColorStop(0.6, `rgba(60,0,25,${0.08 + bossForm * 0.02})`);
      auraGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(screenX, centerY, auraR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Shadow/cape mass behind body
      ctx.fillStyle = "#1a0010";
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 1.1, bTop + torsoH * 0.1);
      ctx.quadraticCurveTo(
        screenX - bW * 1.4,
        centerY,
        screenX - bW * 1.0,
        bBot + halfH * 0.4,
      );
      ctx.lineTo(screenX + bW * 1.0, bBot + halfH * 0.4);
      ctx.quadraticCurveTo(
        screenX + bW * 1.4,
        centerY,
        screenX + bW * 1.1,
        bTop + torsoH * 0.1,
      );
      ctx.closePath();
      ctx.fill();
      // Cape rim glow
      ctx.strokeStyle = `rgba(255,0,100,${0.12 + pulse * 0.08})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Main body
      ctx.fillStyle = bossDarkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.85, bTop + breathe);
      ctx.lineTo(screenX - bW, bTop + torsoH * 0.15 + breathe);
      ctx.lineTo(screenX - bW * 0.95, bBot);
      ctx.lineTo(screenX + bW * 0.95, bBot);
      ctx.lineTo(screenX + bW, bTop + torsoH * 0.15 + breathe);
      ctx.lineTo(screenX + bW * 0.85, bTop + breathe);
      ctx.closePath();
      ctx.fill();
      // Body edge highlight
      ctx.strokeStyle = `rgba(255,80,160,${0.2 + pulse * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Chest armor plate
      ctx.fillStyle = bossBaseColor;
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.7, bTop + torsoH * 0.08 + breathe);
      ctx.lineTo(screenX - bW * 0.8, bTop + torsoH * 0.2 + breathe);
      ctx.lineTo(screenX - bW * 0.75, bBot - torsoH * 0.15);
      ctx.lineTo(screenX, bBot - torsoH * 0.1);
      ctx.lineTo(screenX + bW * 0.75, bBot - torsoH * 0.15);
      ctx.lineTo(screenX + bW * 0.8, bTop + torsoH * 0.2 + breathe);
      ctx.lineTo(screenX + bW * 0.7, bTop + torsoH * 0.08 + breathe);
      ctx.closePath();
      ctx.fill();
      // Armor ribbing
      ctx.strokeStyle = hitFlash ? "#ff8888" : bossAccent;
      ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ry = bTop + torsoH * (0.2 + r * 0.12) + breathe;
        ctx.beginPath();
        ctx.moveTo(screenX - bW * 0.7, ry);
        ctx.lineTo(screenX + bW * 0.7, ry);
        ctx.stroke();
      }
      // Center chest seam
      ctx.strokeStyle = hitFlash ? "#ff8888" : formAccents[bossForm - 1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX, bTop + torsoH * 0.08 + breathe);
      ctx.lineTo(screenX, bBot - torsoH * 0.1);
      ctx.stroke();

      // Chest energy core (layered glow, no shadowBlur for performance)
      const coreY = bTop + torsoH * 0.3 + breathe;
      const coreR = bW * 0.12 + pulse * bW * 0.04;
      ctx.fillStyle = `rgba(255,0,68,${0.12 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(screenX, coreY, coreR * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,0,68,${0.3 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(screenX, coreY, coreR * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,0,136,${0.5 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(screenX, coreY, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,136,187,${0.6 + pulse * 0.2})`;
      ctx.beginPath();
      ctx.arc(screenX, coreY, coreR * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Shoulder pauldrons with spikes
      const drawPauldron = (side) => {
        const sx = screenX + side * bW * 0.85;
        const sy = bTop + torsoH * 0.05 + breathe;
        const pW = bW * 0.4;
        const pH = torsoH * 0.25;
        // Base plate
        ctx.fillStyle = bossDarkColor;
        ctx.beginPath();
        ctx.arc(sx + side * pW * 0.2, sy + pH * 0.4, pW * 0.55, 0, Math.PI * 2);
        ctx.fill();
        // Outer armor shell
        ctx.fillStyle = bossBaseColor;
        ctx.beginPath();
        ctx.ellipse(
          sx + side * pW * 0.15,
          sy + pH * 0.35,
          pW * 0.45,
          pH * 0.4,
          side * 0.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Edge highlight
        ctx.strokeStyle = hitFlash ? "#ffcccc" : bossAccent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(
          sx + side * pW * 0.15,
          sy + pH * 0.35,
          pW * 0.45,
          pH * 0.4,
          side * 0.2,
          -Math.PI * 0.8,
          Math.PI * 0.3,
        );
        ctx.stroke();
        // Spikes
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#882244";
        // Main spike
        ctx.beginPath();
        ctx.moveTo(sx + side * pW * 0.2, sy + pH * 0.1);
        ctx.lineTo(sx + side * pW * 0.9, sy - pH * 0.6);
        ctx.lineTo(sx + side * pW * 0.35, sy + pH * 0.25);
        ctx.fill();
        // Secondary spike
        ctx.beginPath();
        ctx.moveTo(sx + side * pW * 0.45, sy + pH * 0.15);
        ctx.lineTo(sx + side * pW * 1.1, sy - pH * 0.2);
        ctx.lineTo(sx + side * pW * 0.55, sy + pH * 0.35);
        ctx.fill();
        // Back spike
        ctx.beginPath();
        ctx.moveTo(sx - side * pW * 0.05, sy + pH * 0.05);
        ctx.lineTo(sx + side * pW * 0.3, sy - pH * 0.8);
        ctx.lineTo(sx + side * pW * 0.1, sy + pH * 0.2);
        ctx.fill();
      };
      drawPauldron(-1);
      drawPauldron(1);

      // Head
      const headW = bW * 0.55;
      const headH = torsoH * 0.3;
      const headTop = bTop - headH * 0.65 + breathe;
      const headCX = screenX;
      const headCY = headTop + headH * 0.5;
      // Neck
      ctx.fillStyle = bossDarkColor;
      ctx.fillRect(
        screenX - bW * 0.2,
        headTop + headH * 0.7,
        bW * 0.4,
        torsoH * 0.15,
      );
      // Skull shape
      ctx.fillStyle = bossDarkColor;
      ctx.beginPath();
      ctx.moveTo(headCX - headW * 0.8, headCY + headH * 0.15);
      ctx.quadraticCurveTo(
        headCX - headW * 0.85,
        headCY - headH * 0.2,
        headCX - headW * 0.5,
        headCY - headH * 0.5,
      );
      ctx.quadraticCurveTo(
        headCX,
        headCY - headH * 0.65,
        headCX + headW * 0.5,
        headCY - headH * 0.5,
      );
      ctx.quadraticCurveTo(
        headCX + headW * 0.85,
        headCY - headH * 0.2,
        headCX + headW * 0.8,
        headCY + headH * 0.15,
      );
      ctx.quadraticCurveTo(
        headCX + headW * 0.6,
        headCY + headH * 0.55,
        headCX,
        headCY + headH * 0.6,
      );
      ctx.quadraticCurveTo(
        headCX - headW * 0.6,
        headCY + headH * 0.55,
        headCX - headW * 0.8,
        headCY + headH * 0.15,
      );
      ctx.fill();
      // Helmet plate
      ctx.fillStyle = bossBaseColor;
      ctx.beginPath();
      ctx.moveTo(headCX - headW * 0.65, headCY - headH * 0.1);
      ctx.quadraticCurveTo(
        headCX,
        headCY - headH * 0.55,
        headCX + headW * 0.65,
        headCY - headH * 0.1,
      );
      ctx.quadraticCurveTo(
        headCX + headW * 0.5,
        headCY + headH * 0.1,
        headCX,
        headCY + headH * 0.15,
      );
      ctx.quadraticCurveTo(
        headCX - headW * 0.5,
        headCY + headH * 0.1,
        headCX - headW * 0.65,
        headCY - headH * 0.1,
      );
      ctx.fill();
      // Center ridge
      ctx.strokeStyle = hitFlash ? "#ffcccc" : bossAccent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headCX, headCY - headH * 0.5);
      ctx.lineTo(headCX, headCY + headH * 0.15);
      ctx.stroke();

      // Horns
      const drawHorn = (side, length, curve, thickness) => {
        const hx = headCX + side * headW * 0.5;
        const hy = headCY - headH * 0.35;
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#773344";
        ctx.beginPath();
        ctx.moveTo(hx - thickness, hy);
        ctx.quadraticCurveTo(
          hx + side * headW * curve,
          hy - length * 0.6,
          hx + side * headW * curve * 0.8,
          hy - length,
        );
        ctx.lineTo(hx + side * headW * curve * 0.8 + side * 1, hy - length + 2);
        ctx.quadraticCurveTo(
          hx + side * headW * curve * 0.5,
          hy - length * 0.5,
          hx + thickness,
          hy,
        );
        ctx.fill();
        // Horn ridges
        ctx.strokeStyle = hitFlash ? "#ff8888" : "#553322";
        ctx.lineWidth = 0.8;
        for (let rr = 0; rr < 3; rr++) {
          const t = 0.2 + rr * 0.25;
          const rx = hx + side * headW * curve * t * 0.8;
          const ry = hy - length * t * 0.7;
          ctx.beginPath();
          ctx.moveTo(rx - thickness * (1 - t * 0.5), ry);
          ctx.lineTo(rx + thickness * (1 - t * 0.5), ry);
          ctx.stroke();
        }
        // Glowing tip (layered glow, no shadowBlur)
        ctx.fillStyle = `rgba(255,0,68,${0.15 + pulse * 0.15})`;
        ctx.beginPath();
        ctx.arc(
          hx + side * headW * curve * 0.8,
          hy - length + 1,
          5 + pulse * 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = `rgba(255,0,68,${0.4 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(
          hx + side * headW * curve * 0.8,
          hy - length + 1,
          2 + pulse,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      };
      drawHorn(-1, halfH * 0.35, 0.7, 3);
      drawHorn(1, halfH * 0.35, 0.7, 3);
      // Center horn (taller)
      const chx = headCX;
      const chy = headCY - headH * 0.45;
      ctx.fillStyle = hitFlash ? "#ffaaaa" : "#883344";
      ctx.beginPath();
      ctx.moveTo(chx - 3.5, chy);
      ctx.quadraticCurveTo(
        chx - 2,
        chy - halfH * 0.25,
        chx,
        chy - halfH * 0.45,
      );
      ctx.quadraticCurveTo(chx + 2, chy - halfH * 0.25, chx + 3.5, chy);
      ctx.fill();
      ctx.fillStyle = `rgba(255,0,68,${0.15 + pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(chx, chy - halfH * 0.45, 6 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,0,68,${0.5 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(chx, chy - halfH * 0.45, 2.5 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Three eyes
      const eyeY = headCY - headH * 0.05;
      const drawEye = (ex, ey, size, isCenter) => {
        const sw = size * (isCenter ? 1.4 : 1.0);
        const sh = size * (isCenter ? 0.8 : 0.6);
        // Eye socket shadow
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(ex, ey, sw * 1.3, sh * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye glow (layered fills, no shadowBlur for performance)
        ctx.fillStyle = `rgba(255,0,0,${0.12 + pulse * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, sw * 1.8, sh * 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,0,0,${0.3 + pulse * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, sw * 1.3, sh * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,0,0,${0.7 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, sw, sh, 0, 0, Math.PI * 2);
        ctx.fill();
        // Bright iris
        ctx.fillStyle = `rgba(255,${80 + pulse * 50},${80 + pulse * 50},0.9)`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, sw * 0.55, sh * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Slit pupil
        ctx.fillStyle = "#000000";
        const pupilTrack = Math.sin(time * 0.0015 + enemy.x) * sw * 0.15;
        ctx.beginPath();
        ctx.ellipse(
          ex + pupilTrack,
          ey,
          sw * 0.12,
          sh * 0.8,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        // Specular highlight
        ctx.fillStyle = "rgba(255,200,200,0.5)";
        ctx.beginPath();
        ctx.arc(ex - sw * 0.25, ey - sh * 0.3, sw * 0.15, 0, Math.PI * 2);
        ctx.fill();
      };
      const eSize = bW * 0.09;
      drawEye(headCX - headW * 0.35, eyeY, eSize, false);
      drawEye(headCX, eyeY - headH * 0.05, eSize, true);
      drawEye(headCX + headW * 0.35, eyeY, eSize, false);
      // Form 2+: extra eyes
      if (bossForm >= 2) {
        drawEye(headCX - headW * 0.55, eyeY + headH * 0.12, eSize * 0.7, false);
        drawEye(headCX + headW * 0.55, eyeY + headH * 0.12, eSize * 0.7, false);
      }
      // Form 3: even more eyes
      if (bossForm >= 3) {
        drawEye(
          headCX - headW * 0.15,
          eyeY + headH * 0.18,
          eSize * 0.55,
          false,
        );
        drawEye(
          headCX + headW * 0.15,
          eyeY + headH * 0.18,
          eSize * 0.55,
          false,
        );
      }

      // Jaw / mouth
      const jawY = headCY + headH * 0.2;
      const jawOpen = 1.5 + Math.sin(time * 0.003) * 1.5;
      // Upper jaw
      ctx.fillStyle = bossDarkColor;
      ctx.beginPath();
      ctx.moveTo(headCX - headW * 0.5, jawY);
      ctx.lineTo(headCX - headW * 0.55, jawY + headH * 0.15);
      ctx.lineTo(headCX + headW * 0.55, jawY + headH * 0.15);
      ctx.lineTo(headCX + headW * 0.5, jawY);
      ctx.fill();
      // Lower jaw
      ctx.fillStyle = hitFlash ? "#ffaaaa" : "#441122";
      ctx.beginPath();
      ctx.moveTo(headCX - headW * 0.45, jawY + headH * 0.15 + jawOpen);
      ctx.quadraticCurveTo(
        headCX,
        jawY + headH * 0.35 + jawOpen * 1.5,
        headCX + headW * 0.45,
        jawY + headH * 0.15 + jawOpen,
      );
      ctx.lineTo(headCX + headW * 0.5, jawY + headH * 0.12);
      ctx.lineTo(headCX - headW * 0.5, jawY + headH * 0.12);
      ctx.fill();
      // Mouth interior
      ctx.fillStyle = "#1a0005";
      ctx.beginPath();
      ctx.moveTo(headCX - headW * 0.4, jawY + headH * 0.12);
      ctx.lineTo(headCX + headW * 0.4, jawY + headH * 0.12);
      ctx.quadraticCurveTo(
        headCX,
        jawY + headH * 0.28 + jawOpen,
        headCX - headW * 0.4,
        jawY + headH * 0.12,
      );
      ctx.fill();
      // Upper fangs
      ctx.fillStyle = "#eeddcc";
      const fangH = headH * 0.2 + jawOpen * 0.5;
      for (let f = 0; f < 6; f++) {
        const fx = headCX - headW * 0.35 + f * headW * 0.14;
        const big = f === 0 || f === 5 ? 1.6 : f === 1 || f === 4 ? 1.2 : 0.7;
        ctx.beginPath();
        ctx.moveTo(fx - 1.5 * big, jawY + headH * 0.12);
        ctx.lineTo(fx, jawY + headH * 0.12 + fangH * big);
        ctx.lineTo(fx + 1.5 * big, jawY + headH * 0.12);
        ctx.fill();
      }
      // Lower fangs
      for (let f = 0; f < 4; f++) {
        const fx = headCX - headW * 0.25 + f * headW * 0.17;
        const big = f === 0 || f === 3 ? 1.3 : 0.6;
        const fy = jawY + headH * 0.15 + jawOpen * 0.7;
        ctx.beginPath();
        ctx.moveTo(fx - 1.2 * big, fy);
        ctx.lineTo(fx, fy - fangH * big * 0.6);
        ctx.lineTo(fx + 1.2 * big, fy);
        ctx.fill();
      }
      // Drool
      ctx.strokeStyle = "rgba(180,0,40,0.5)";
      ctx.lineWidth = 1;
      for (let d = 0; d < 3; d++) {
        const dx = headCX - headW * 0.2 + d * headW * 0.2;
        const dLen =
          halfH * 0.04 + Math.sin(time * 0.007 + d * 2) * halfH * 0.025;
        ctx.beginPath();
        ctx.moveTo(dx, jawY + headH * 0.12 + fangH * 0.8);
        ctx.lineTo(
          dx + Math.sin(time * 0.003 + d) * 2,
          jawY + headH * 0.12 + fangH * 0.8 + dLen,
        );
        ctx.stroke();
      }

      // Arms
      const drawArm = (side) => {
        const shX = screenX + side * bW * 0.85;
        const shY = bTop + torsoH * 0.12 + breathe;
        const elbX = screenX + side * bW * 1.15;
        const elbY = centerY + halfH * 0.1;
        const handX = screenX + side * bW * 0.9;
        const handY = bBot + halfH * 0.15;
        // Upper arm
        ctx.strokeStyle = bossDarkColor;
        ctx.lineWidth = bW * 0.22;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(shX, shY);
        ctx.quadraticCurveTo(elbX, elbY, handX, handY);
        ctx.stroke();
        // Armor on upper arm
        ctx.strokeStyle = bossBaseColor;
        ctx.lineWidth = bW * 0.15;
        ctx.beginPath();
        ctx.moveTo(shX, shY + torsoH * 0.05);
        ctx.lineTo(elbX * 0.7 + shX * 0.3, (shY + elbY) * 0.5);
        ctx.stroke();
        // Elbow spike
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#882244";
        ctx.beginPath();
        ctx.moveTo(elbX, elbY - bW * 0.05);
        ctx.lineTo(elbX + side * bW * 0.2, elbY - halfH * 0.08);
        ctx.lineTo(elbX, elbY + bW * 0.05);
        ctx.fill();
        // Forearm armor
        ctx.strokeStyle = bossBaseColor;
        ctx.lineWidth = bW * 0.13;
        ctx.beginPath();
        ctx.moveTo(elbX, elbY);
        ctx.lineTo((elbX + handX) * 0.5, (elbY + handY) * 0.5);
        ctx.stroke();
        // Clawed hand
        ctx.fillStyle = bossDarkColor;
        ctx.beginPath();
        ctx.arc(handX, handY, bW * 0.12, 0, Math.PI * 2);
        ctx.fill();
        // Claws
        ctx.fillStyle = "#eeddcc";
        for (let cl = 0; cl < 4; cl++) {
          const ang =
            (side > 0 ? Math.PI * 0.3 : -Math.PI * 0.3) + cl * 0.35 * side;
          const clawLen = bW * 0.15;
          const cx1 = handX + Math.cos(ang) * bW * 0.1;
          const cy1 = handY + Math.sin(ang) * bW * 0.1;
          ctx.beginPath();
          ctx.moveTo(cx1 - 1.5, cy1);
          ctx.lineTo(
            cx1 + Math.cos(ang) * clawLen,
            cy1 + Math.sin(ang) * clawLen,
          );
          ctx.lineTo(cx1 + 1.5, cy1);
          ctx.fill();
        }
      };
      drawArm(-1);
      drawArm(1);

      // Belt / midsection
      ctx.fillStyle = hitFlash ? "#666666" : "#331118";
      ctx.fillRect(
        screenX - bW * 0.85,
        bBot - torsoH * 0.12,
        bW * 1.7,
        torsoH * 0.08,
      );
      // Buckle
      ctx.fillStyle = bossBaseColor;
      ctx.beginPath();
      ctx.arc(screenX, bBot - torsoH * 0.08, bW * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,0,68,${0.3 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(screenX, bBot - torsoH * 0.08, bW * 0.04, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      const drawLeg = (side) => {
        const hipX = screenX + side * bW * 0.35;
        const hipY = bBot - torsoH * 0.04;
        const kneeX = hipX + side * bW * 0.1;
        const kneeY = bBot + halfH * 0.25;
        const footX = hipX;
        const footY = bBot + halfH * 0.5;
        const legW = bW * 0.25;
        // Upper leg
        ctx.fillStyle = bossDarkColor;
        ctx.beginPath();
        ctx.moveTo(hipX - legW, hipY);
        ctx.lineTo(kneeX - legW * 0.8, kneeY);
        ctx.lineTo(kneeX + legW * 0.8, kneeY);
        ctx.lineTo(hipX + legW, hipY);
        ctx.fill();
        // Knee armor
        ctx.fillStyle = bossBaseColor;
        ctx.beginPath();
        ctx.arc(kneeX, kneeY, legW * 0.7, 0, Math.PI * 2);
        ctx.fill();
        // Knee spike
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#882244";
        ctx.beginPath();
        ctx.moveTo(kneeX + side * legW * 0.4, kneeY - legW * 0.3);
        ctx.lineTo(kneeX + side * legW * 1.2, kneeY);
        ctx.lineTo(kneeX + side * legW * 0.4, kneeY + legW * 0.3);
        ctx.fill();
        // Shin
        ctx.fillStyle = bossDarkColor;
        ctx.beginPath();
        ctx.moveTo(kneeX - legW * 0.7, kneeY);
        ctx.lineTo(footX - legW * 0.9, footY);
        ctx.lineTo(footX + legW * 0.9, footY);
        ctx.lineTo(kneeX + legW * 0.7, kneeY);
        ctx.fill();
        // Shin guard
        ctx.fillStyle = bossBaseColor;
        ctx.fillRect(
          kneeX - legW * 0.4,
          kneeY + legW * 0.3,
          legW * 0.8,
          (footY - kneeY) * 0.6,
        );
        // Boot
        ctx.fillStyle = hitFlash ? "#552222" : "#0a0004";
        ctx.beginPath();
        ctx.moveTo(footX - legW * 1.1, footY);
        ctx.lineTo(
          footX - legW * 0.5 + side * legW * 0.8,
          footY + halfH * 0.06,
        );
        ctx.lineTo(footX + legW * 1.1, footY);
        ctx.fill();
      };
      drawLeg(-1);
      drawLeg(1);

      // Crackling temporal energy
      ctx.strokeStyle = `rgba(255,0,136,${0.15 + pulse * 0.2})`;
      ctx.lineWidth = 1;
      for (let e = 0; e < 4; e++) {
        const eAng = time * 0.002 + e * Math.PI * 0.5;
        const eR = bW * 0.9 + Math.sin(time * 0.005 + e) * bW * 0.3;
        const ex1 = screenX + Math.cos(eAng) * eR * 0.3;
        const ey1 = centerY + Math.sin(eAng) * eR * 0.3;
        const ex2 = screenX + Math.cos(eAng + 0.5) * eR;
        const ey2 = centerY + Math.sin(eAng + 0.5) * eR;
        ctx.beginPath();
        ctx.moveTo(ex1, ey1);
        ctx.lineTo(
          (ex1 + ex2) * 0.5 + Math.sin(time * 0.01 + e) * 5,
          (ey1 + ey2) * 0.5,
        );
        ctx.lineTo(ex2, ey2);
        ctx.stroke();
      }

      // Floating debris / temporal shards
      const shardCount = 5 + (bossForm - 1) * 3;
      for (let s = 0; s < shardCount; s++) {
        const sAng = time * 0.001 + s * Math.PI * 0.4;
        const sR = bW * 1.2 + Math.sin(time * 0.003 + s * 2) * bW * 0.2;
        const sx2 = screenX + Math.cos(sAng) * sR;
        const sy2 = centerY + Math.sin(sAng) * sR * 0.6;
        const sSize = 2 + Math.sin(s * 3) * 1.5;
        ctx.fillStyle = `rgba(255,0,68,${0.15 + Math.sin(time * 0.004 + s) * 0.1})`;
        ctx.save();
        ctx.translate(sx2, sy2);
        ctx.rotate(time * 0.002 + s);
        ctx.fillRect(-sSize, -sSize * 0.5, sSize * 2, sSize);
        ctx.restore();
      }

      // Form 2+: crackling energy corona
      if (bossForm >= 2) {
        ctx.strokeStyle = `rgba(255,0,100,${0.2 + pulse * 0.15})`;
        ctx.lineWidth = 1.5;
        for (let arc = 0; arc < 3 + bossForm; arc++) {
          const arcAng =
            time * (0.0015 + arc * 0.0003) +
            (arc * Math.PI * 2) / (3 + bossForm);
          const arcR = bW * (1.4 + bossForm * 0.15);
          ctx.beginPath();
          ctx.arc(screenX, centerY, arcR, arcAng, arcAng + 0.8);
          ctx.stroke();
        }
      }

      // Form 3: reality distortion rings
      if (bossForm >= 3) {
        ctx.save();
        ctx.globalAlpha = alpha * (0.08 + pulse * 0.06);
        for (let ring = 0; ring < 3; ring++) {
          const ringR =
            bW * (1.6 + ring * 0.4) + Math.sin(time * 0.002 + ring) * bW * 0.1;
          ctx.strokeStyle = `rgba(255,${ring * 40},${200 - ring * 60},0.4)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(
            screenX,
            centerY,
            ringR,
            ringR * 0.3,
            time * 0.001 + ring * 0.5,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        ctx.globalAlpha = alpha;
        ctx.restore();
      }
    } else if (enemy.enemyType === "corruptCop") {
      // Corrupt Cop
      const copW = bodyWidth * 0.75;
      const torsoH = bodyBottom - bodyTop;
      // Body
      ctx.fillStyle = "#cc8800";
      ctx.fillRect(screenX - copW, bodyTop, copW * 2, torsoH);
      // Armor panels
      ctx.fillStyle = "#aa6600";
      ctx.fillRect(
        screenX - copW * 0.8,
        bodyTop + torsoH * 0.06,
        copW * 1.6,
        torsoH * 0.88,
      );
      // Center chest plate
      ctx.fillStyle = "#996600";
      ctx.fillRect(
        screenX - copW * 0.4,
        bodyTop + torsoH * 0.12,
        copW * 0.8,
        torsoH * 0.4,
      );
      // Molle webbing
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for (let p = 0; p < 3; p++) {
        ctx.fillRect(
          screenX - copW * 0.35 + p * copW * 0.28,
          bodyTop + torsoH * 0.15,
          copW * 0.22,
          torsoH * 0.12,
        );
      }
      // Shoulder pads
      ctx.fillStyle = "#bb7700";
      ctx.fillRect(
        screenX - copW * 1.05,
        bodyTop - torsoH * 0.02,
        copW * 0.35,
        torsoH * 0.2,
      );
      ctx.fillRect(
        screenX + copW * 0.7,
        bodyTop - torsoH * 0.02,
        copW * 0.35,
        torsoH * 0.2,
      );
      // Helmet
      const hR = copW * 0.55;
      const hCY = bodyTop - hR * 0.5;
      ctx.fillStyle = "#bb7700";
      ctx.beginPath();
      ctx.ellipse(screenX, hCY, hR * 1.1, hR, 0, 0, Math.PI * 2);
      ctx.fill();
      // Helmet ridge
      ctx.fillStyle = "#996600";
      ctx.fillRect(screenX - hR * 1.2, hCY + hR * 0.1, hR * 2.4, hR * 0.25);
      // Visor
      ctx.fillStyle = "#ffbb00";
      ctx.globalAlpha = alpha * (0.75 + Math.sin(time * 0.004) * 0.15);
      ctx.fillRect(screenX - hR * 0.85, hCY + hR * 0.15, hR * 1.7, hR * 0.35);
      ctx.globalAlpha = alpha;
      // Visor reflection
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(screenX - hR * 0.6, hCY + hR * 0.2, hR * 0.5, hR * 0.15);
      // NVG mount
      ctx.fillStyle = "#885500";
      ctx.fillRect(screenX + hR * 0.5, hCY - hR * 0.6, hR * 0.3, hR * 0.5);
      ctx.fillStyle = "#00ff44";
      ctx.fillRect(screenX + hR * 0.55, hCY - hR * 0.55, hR * 0.15, hR * 0.12);
      // Neck guard
      ctx.fillStyle = "#885500";
      ctx.fillRect(screenX - hR * 0.6, hCY + hR * 0.5, hR * 1.2, hR * 0.4);
      // SWAT label on shoulder
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(6, bodyWidth * 0.15)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("SWAT", screenX - copW * 0.88, bodyTop + torsoH * 0.12);
      ctx.textAlign = "left";
      // Belt
      ctx.fillStyle = "#333333";
      ctx.fillRect(
        screenX - copW * 0.7,
        bodyBottom - torsoH * 0.12,
        copW * 1.4,
        torsoH * 0.1,
      );
      // Belt pouches
      ctx.fillStyle = "#444444";
      ctx.fillRect(
        screenX - copW * 0.65,
        bodyBottom - torsoH * 0.16,
        copW * 0.18,
        torsoH * 0.12,
      );
      ctx.fillRect(
        screenX + copW * 0.5,
        bodyBottom - torsoH * 0.16,
        copW * 0.18,
        torsoH * 0.12,
      );
      // Riot Shield
      const rshX = screenX - copW * 1.15;
      const rshY = bodyTop - torsoH * 0.15;
      const rshW = copW * 1.1;
      const rshH = torsoH * 1.5;
      // Left arm holding shield
      ctx.fillStyle = "#aa6600";
      ctx.fillRect(
        screenX - copW * 1.0,
        bodyTop + torsoH * 0.12,
        copW * 0.18,
        torsoH * 0.45,
      );
      // Shield body
      ctx.fillStyle = "rgba(180,220,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(rshX - rshW * 0.48, rshY + rshH * 0.05);
      ctx.quadraticCurveTo(rshX - rshW * 0.5, rshY, rshX, rshY);
      ctx.quadraticCurveTo(
        rshX + rshW * 0.5,
        rshY,
        rshX + rshW * 0.48,
        rshY + rshH * 0.05,
      );
      ctx.lineTo(rshX + rshW * 0.48, rshY + rshH * 0.92);
      ctx.quadraticCurveTo(
        rshX + rshW * 0.48,
        rshY + rshH,
        rshX + rshW * 0.38,
        rshY + rshH,
      );
      ctx.lineTo(rshX - rshW * 0.38, rshY + rshH);
      ctx.quadraticCurveTo(
        rshX - rshW * 0.48,
        rshY + rshH,
        rshX - rshW * 0.48,
        rshY + rshH * 0.92,
      );
      ctx.closePath();
      ctx.fill();
      // Shield border / frame
      ctx.strokeStyle = "rgba(200,230,255,0.5)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rshX - rshW * 0.48, rshY + rshH * 0.05);
      ctx.quadraticCurveTo(rshX - rshW * 0.5, rshY, rshX, rshY);
      ctx.quadraticCurveTo(
        rshX + rshW * 0.5,
        rshY,
        rshX + rshW * 0.48,
        rshY + rshH * 0.05,
      );
      ctx.lineTo(rshX + rshW * 0.48, rshY + rshH * 0.92);
      ctx.quadraticCurveTo(
        rshX + rshW * 0.48,
        rshY + rshH,
        rshX + rshW * 0.38,
        rshY + rshH,
      );
      ctx.lineTo(rshX - rshW * 0.38, rshY + rshH);
      ctx.quadraticCurveTo(
        rshX - rshW * 0.48,
        rshY + rshH,
        rshX - rshW * 0.48,
        rshY + rshH * 0.92,
      );
      ctx.closePath();
      ctx.stroke();
      // Shield reflection
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(
        rshX - rshW * 0.1,
        rshY + rshH * 0.22,
        rshW * 0.18,
        rshH * 0.18,
        -0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.ellipse(
        rshX + rshW * 0.15,
        rshY + rshH * 0.55,
        rshW * 0.12,
        rshH * 0.12,
        0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Shield horizontal braces
      ctx.strokeStyle = "rgba(180,210,240,0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rshX - rshW * 0.4, rshY + rshH * 0.3);
      ctx.lineTo(rshX + rshW * 0.4, rshY + rshH * 0.3);
      ctx.moveTo(rshX - rshW * 0.4, rshY + rshH * 0.55);
      ctx.lineTo(rshX + rshW * 0.4, rshY + rshH * 0.55);
      ctx.moveTo(rshX - rshW * 0.38, rshY + rshH * 0.8);
      ctx.lineTo(rshX + rshW * 0.38, rshY + rshH * 0.8);
      ctx.stroke();
      // Assault Rifle
      // Right arm
      ctx.fillStyle = "#aa6600";
      ctx.fillRect(
        screenX + copW * 0.75,
        bodyTop + torsoH * 0.15,
        copW * 0.22,
        torsoH * 0.55,
      );
      // Rifle body
      const rifleY = bodyTop + torsoH * 0.42;
      ctx.fillStyle = "#333333";
      ctx.fillRect(screenX + copW * 0.55, rifleY, copW * 0.8, copW * 0.22);
      // Barrel shroud
      ctx.fillStyle = "#444444";
      ctx.fillRect(
        screenX + copW * 1.3,
        rifleY + copW * 0.02,
        copW * 0.55,
        copW * 0.14,
      );
      // Barrel tip / muzzle brake
      ctx.fillStyle = "#555555";
      ctx.fillRect(
        screenX + copW * 1.8,
        rifleY - copW * 0.01,
        copW * 0.12,
        copW * 0.2,
      );
      // Cooling vents on barrel
      ctx.fillStyle = "#2a2a2a";
      for (let v = 0; v < 3; v++) {
        ctx.fillRect(
          screenX + copW * 1.35 + v * copW * 0.15,
          rifleY + copW * 0.03,
          copW * 0.08,
          copW * 0.08,
        );
      }
      // Stock
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(
        screenX + copW * 0.35,
        rifleY + copW * 0.02,
        copW * 0.25,
        copW * 0.16,
      );
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(
        screenX + copW * 0.3,
        rifleY + copW * 0.04,
        copW * 0.1,
        copW * 0.1,
      );
      // Magazine
      ctx.fillStyle = "#cc8800";
      ctx.fillRect(
        screenX + copW * 0.85,
        rifleY + copW * 0.18,
        copW * 0.14,
        copW * 0.28,
      );
      // Scope
      ctx.fillStyle = "#222222";
      ctx.fillRect(
        screenX + copW * 0.75,
        rifleY - copW * 0.1,
        copW * 0.3,
        copW * 0.1,
      );
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(
        screenX + copW * 0.8,
        rifleY - copW * 0.06,
        copW * 0.2,
        copW * 0.06,
      );
      // Scope lens glow
      ctx.fillStyle = "#ff3300";
      ctx.beginPath();
      ctx.arc(
        screenX + copW * 1.0,
        rifleY - copW * 0.04,
        copW * 0.035,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Foregrip
      ctx.fillStyle = "#aa6600";
      ctx.fillRect(
        screenX + copW * 1.15,
        rifleY + copW * 0.18,
        copW * 0.12,
        copW * 0.18,
      );
      // Tactical light under barrel
      ctx.fillStyle = "#444444";
      ctx.fillRect(
        screenX + copW * 1.4,
        rifleY + copW * 0.14,
        copW * 0.08,
        copW * 0.1,
      );
      ctx.fillStyle = "#ffff88";
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(
        screenX + copW * 1.41,
        rifleY + copW * 0.15,
        copW * 0.06,
        copW * 0.04,
      );
      ctx.globalAlpha = alpha;
      // Tactical gloves
      ctx.fillStyle = "#333333";
      ctx.fillRect(
        screenX - copW * 1.02,
        bodyTop + torsoH * 0.5,
        copW * 0.22,
        torsoH * 0.08,
      );
      ctx.fillRect(
        screenX + copW * 0.78,
        bodyTop + torsoH * 0.52,
        copW * 0.24,
        torsoH * 0.08,
      );
      // Legs
      ctx.fillStyle = "#996600";
      const clegW = copW * 0.38;
      ctx.fillRect(screenX - copW * 0.5, bodyBottom, clegW, halfH * 0.32);
      ctx.fillRect(screenX + copW * 0.12, bodyBottom, clegW, halfH * 0.32);
      // Knee pads
      ctx.fillStyle = "#775500";
      ctx.fillRect(
        screenX - copW * 0.48,
        bodyBottom + halfH * 0.08,
        clegW * 0.8,
        halfH * 0.08,
      );
      ctx.fillRect(
        screenX + copW * 0.14,
        bodyBottom + halfH * 0.08,
        clegW * 0.8,
        halfH * 0.08,
      );
      // Combat boots
      ctx.fillStyle = "#222222";
      ctx.fillRect(
        screenX - copW * 0.55,
        bodyBottom + halfH * 0.26,
        clegW + copW * 0.12,
        halfH * 0.07,
      );
      ctx.fillRect(
        screenX + copW * 0.08,
        bodyBottom + halfH * 0.26,
        clegW + copW * 0.12,
        halfH * 0.07,
      );
    } else if (enemy.enemyType === "sentinel") {
      // Sentinel
      const sentW = bodyWidth * 1.4;
      const sentTop = bodyTop - halfH * 0.15;
      const sentBot = bodyBottom + halfH * 0.05;
      const sentH = sentBot - sentTop;
      // Massive plate armor body
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - sentW, sentTop + sentH * 0.08);
      ctx.lineTo(screenX - sentW * 0.5, sentTop);
      ctx.lineTo(screenX + sentW * 0.5, sentTop);
      ctx.lineTo(screenX + sentW, sentTop + sentH * 0.08);
      ctx.lineTo(screenX + sentW * 0.9, sentBot);
      ctx.lineTo(screenX - sentW * 0.9, sentBot);
      ctx.closePath();
      ctx.fill();
      // Chest plate
      ctx.fillStyle = baseColor;
      ctx.fillRect(
        screenX - sentW * 0.75,
        sentTop + sentH * 0.06,
        sentW * 1.5,
        sentH * 0.88,
      );
      // Upper chest plate detail
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - sentW * 0.5, sentTop + sentH * 0.1);
      ctx.lineTo(screenX, sentTop + sentH * 0.22);
      ctx.lineTo(screenX + sentW * 0.5, sentTop + sentH * 0.1);
      ctx.lineTo(screenX + sentW * 0.45, sentTop + sentH * 0.35);
      ctx.lineTo(screenX - sentW * 0.45, sentTop + sentH * 0.35);
      ctx.closePath();
      ctx.fill();
      // Battle damage scratches on chest
      ctx.strokeStyle = "rgba(200,200,220,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(screenX - sentW * 0.3, sentTop + sentH * 0.25);
      ctx.lineTo(screenX + sentW * 0.1, sentTop + sentH * 0.4);
      ctx.moveTo(screenX + sentW * 0.2, sentTop + sentH * 0.3);
      ctx.lineTo(screenX + sentW * 0.4, sentTop + sentH * 0.5);
      ctx.stroke();
      // Waist plate / fauld
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX - sentW * 0.65,
        sentTop + sentH * 0.55,
        sentW * 1.3,
        sentH * 0.08,
      );
      // Tassets
      for (let t = 0; t < 4; t++) {
        const tx = screenX - sentW * 0.5 + t * sentW * 0.35;
        ctx.fillStyle = t % 2 === 0 ? darkColor : baseColor;
        ctx.fillRect(tx, sentTop + sentH * 0.62, sentW * 0.28, sentH * 0.15);
      }
      // Shoulder pauldrons
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.ellipse(
        screenX - sentW * 0.72,
        sentTop + sentH * 0.08,
        sentW * 0.26,
        sentH * 0.1,
        -0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        screenX + sentW * 0.72,
        sentTop + sentH * 0.08,
        sentW * 0.26,
        sentH * 0.1,
        0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Pauldron edge trim
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        screenX - sentW * 0.72,
        sentTop + sentH * 0.08,
        sentW * 0.23,
        Math.PI * 0.8,
        Math.PI * 2.2,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        screenX + sentW * 0.72,
        sentTop + sentH * 0.08,
        sentW * 0.23,
        Math.PI * 0.8,
        Math.PI * 2.2,
      );
      ctx.stroke();
      // Rivets on pauldrons
      ctx.fillStyle = "#aabbcc";
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.arc(
          screenX - sentW * (0.58 + r * 0.08),
          sentTop + sentH * 0.08,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
          screenX + sentW * (0.58 + r * 0.08),
          sentTop + sentH * 0.08,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // Great Helm
      const helmW = sentW * 0.48;
      const helmH = sentH * 0.28;
      const helmY = sentTop - helmH * 0.55;
      // Helm body
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - helmW, helmY + helmH * 0.2);
      ctx.lineTo(screenX - helmW * 0.7, helmY);
      ctx.lineTo(screenX + helmW * 0.7, helmY);
      ctx.lineTo(screenX + helmW, helmY + helmH * 0.2);
      ctx.lineTo(screenX + helmW * 0.9, helmY + helmH);
      ctx.lineTo(screenX - helmW * 0.9, helmY + helmH);
      ctx.closePath();
      ctx.fill();
      // Helm face plate
      ctx.fillStyle = baseColor;
      ctx.fillRect(
        screenX - helmW * 0.75,
        helmY + helmH * 0.15,
        helmW * 1.5,
        helmH * 0.7,
      );
      // Visor slit
      ctx.fillStyle = "#111122";
      // Horizontal slit
      ctx.fillRect(
        screenX - helmW * 0.5,
        helmY + helmH * 0.35,
        helmW * 1.0,
        helmH * 0.12,
      );
      // Vertical slit
      ctx.fillRect(
        screenX - helmW * 0.06,
        helmY + helmH * 0.25,
        helmW * 0.12,
        helmH * 0.35,
      );
      // Glowing eyes behind visor slit (layered glow, no shadowBlur)
      ctx.fillStyle = "rgba(136,187,255,0.2)";
      ctx.fillRect(
        screenX - helmW * 0.35 - 3,
        helmY + helmH * 0.37 - 3,
        helmW * 0.2 + 6,
        helmH * 0.08 + 6,
      );
      ctx.fillRect(
        screenX + helmW * 0.15 - 3,
        helmY + helmH * 0.37 - 3,
        helmW * 0.2 + 6,
        helmH * 0.08 + 6,
      );
      ctx.fillStyle = "#aaddff";
      ctx.fillRect(
        screenX - helmW * 0.35,
        helmY + helmH * 0.37,
        helmW * 0.2,
        helmH * 0.08,
      );
      ctx.fillRect(
        screenX + helmW * 0.15,
        helmY + helmH * 0.37,
        helmW * 0.2,
        helmH * 0.08,
      );
      // Breathing holes on face plate
      ctx.fillStyle = "#111122";
      for (let bh = 0; bh < 3; bh++) {
        ctx.beginPath();
        ctx.arc(
          screenX - helmW * 0.2 + bh * helmW * 0.2,
          helmY + helmH * 0.7,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // Helm crest / plume ridge
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX - helmW * 0.06,
        helmY - helmH * 0.1,
        helmW * 0.12,
        helmH * 0.3,
      );
      // Cross emblem on helm
      ctx.fillStyle = baseColor;
      ctx.fillRect(screenX - 1.5, helmY + helmH * 0.05, 3, helmH * 0.12);
      ctx.fillRect(screenX - helmW * 0.1, helmY + helmH * 0.08, helmW * 0.2, 3);
      // Tower Shield
      const shieldX = screenX - sentW * 0.55;
      const shieldY = sentTop - sentH * 0.02;
      const shieldW = sentW * 0.6;
      const shieldSH = sentH * 1.08;
      // Left arm behind shield
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX - sentW * 0.7,
        sentTop + sentH * 0.12,
        sentW * 0.18,
        sentH * 0.5,
      );
      // Shield body
      ctx.fillStyle = "#445566";
      ctx.beginPath();
      ctx.moveTo(shieldX - shieldW * 0.5, shieldY + shieldSH * 0.06);
      ctx.quadraticCurveTo(shieldX - shieldW * 0.5, shieldY, shieldX, shieldY);
      ctx.quadraticCurveTo(
        shieldX + shieldW * 0.5,
        shieldY,
        shieldX + shieldW * 0.5,
        shieldY + shieldSH * 0.06,
      );
      ctx.lineTo(shieldX + shieldW * 0.5, shieldY + shieldSH * 0.94);
      ctx.quadraticCurveTo(
        shieldX + shieldW * 0.5,
        shieldY + shieldSH,
        shieldX + shieldW * 0.4,
        shieldY + shieldSH,
      );
      ctx.lineTo(shieldX - shieldW * 0.4, shieldY + shieldSH);
      ctx.quadraticCurveTo(
        shieldX - shieldW * 0.5,
        shieldY + shieldSH,
        shieldX - shieldW * 0.5,
        shieldY + shieldSH * 0.94,
      );
      ctx.closePath();
      ctx.fill();
      // Shield inner field
      ctx.fillStyle = "#667788";
      ctx.fillRect(
        shieldX - shieldW * 0.38,
        shieldY + shieldSH * 0.08,
        shieldW * 0.76,
        shieldSH * 0.84,
      );
      // Cross emblem
      ctx.fillStyle = "#334455";
      ctx.fillRect(shieldX - 3, shieldY + shieldSH * 0.1, 6, shieldSH * 0.72);
      ctx.fillRect(
        shieldX - shieldW * 0.25,
        shieldY + shieldSH * 0.38,
        shieldW * 0.5,
        6,
      );
      // Horizontal reinforcement bands
      ctx.fillStyle = "#556677";
      ctx.fillRect(
        shieldX - shieldW * 0.45,
        shieldY + shieldSH * 0.22,
        shieldW * 0.9,
        3,
      );
      ctx.fillRect(
        shieldX - shieldW * 0.45,
        shieldY + shieldSH * 0.58,
        shieldW * 0.9,
        3,
      );
      ctx.fillRect(
        shieldX - shieldW * 0.45,
        shieldY + shieldSH * 0.85,
        shieldW * 0.9,
        3,
      );
      // Shield border
      ctx.strokeStyle = "#889aaa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(shieldX - shieldW * 0.5, shieldY + shieldSH * 0.06);
      ctx.quadraticCurveTo(shieldX - shieldW * 0.5, shieldY, shieldX, shieldY);
      ctx.quadraticCurveTo(
        shieldX + shieldW * 0.5,
        shieldY,
        shieldX + shieldW * 0.5,
        shieldY + shieldSH * 0.06,
      );
      ctx.lineTo(shieldX + shieldW * 0.5, shieldY + shieldSH * 0.94);
      ctx.quadraticCurveTo(
        shieldX + shieldW * 0.5,
        shieldY + shieldSH,
        shieldX + shieldW * 0.4,
        shieldY + shieldSH,
      );
      ctx.lineTo(shieldX - shieldW * 0.4, shieldY + shieldSH);
      ctx.quadraticCurveTo(
        shieldX - shieldW * 0.5,
        shieldY + shieldSH,
        shieldX - shieldW * 0.5,
        shieldY + shieldSH * 0.94,
      );
      ctx.closePath();
      ctx.stroke();
      // Shield boss
      ctx.fillStyle = "#889aaa";
      ctx.beginPath();
      ctx.arc(
        shieldX,
        shieldY + shieldSH * 0.38,
        shieldW * 0.08,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Corner rivets
      ctx.fillStyle = "#aabbcc";
      for (const [rx, ry] of [
        [shieldX - shieldW * 0.4, shieldY + shieldSH * 0.1],
        [shieldX + shieldW * 0.4, shieldY + shieldSH * 0.1],
        [shieldX - shieldW * 0.4, shieldY + shieldSH * 0.9],
        [shieldX + shieldW * 0.4, shieldY + shieldSH * 0.9],
      ]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Halberd
      // Right arm
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX + sentW * 0.75,
        sentTop + sentH * 0.1,
        sentW * 0.2,
        sentH * 0.5,
      );
      // Gauntlet
      ctx.fillStyle = baseColor;
      ctx.fillRect(
        screenX + sentW * 0.72,
        sentTop + sentH * 0.48,
        sentW * 0.26,
        sentH * 0.1,
      );
      // Shaft
      const shaftX = screenX + sentW * 0.85;
      const shaftTop = sentTop - sentH * 0.35;
      const shaftBot = sentBot + halfH * 0.25;
      ctx.fillStyle = "#665544";
      ctx.fillRect(shaftX - 2, shaftTop, 4, shaftBot - shaftTop);
      // Shaft wrap / grip
      ctx.fillStyle = "#443322";
      ctx.fillRect(shaftX - 3, sentTop + sentH * 0.42, 6, sentH * 0.18);
      // Axe blade
      ctx.fillStyle = "#b0b8c0";
      ctx.beginPath();
      ctx.moveTo(shaftX, shaftTop + sentH * 0.02);
      ctx.quadraticCurveTo(
        shaftX + sentW * 0.4,
        shaftTop + sentH * 0.04,
        shaftX + sentW * 0.35,
        shaftTop + sentH * 0.2,
      );
      ctx.quadraticCurveTo(
        shaftX + sentW * 0.3,
        shaftTop + sentH * 0.35,
        shaftX,
        shaftTop + sentH * 0.42,
      );
      ctx.closePath();
      ctx.fill();
      // Blade shading
      ctx.fillStyle = "#9aa0a8";
      ctx.beginPath();
      ctx.moveTo(shaftX, shaftTop + sentH * 0.06);
      ctx.quadraticCurveTo(
        shaftX + sentW * 0.28,
        shaftTop + sentH * 0.08,
        shaftX + sentW * 0.24,
        shaftTop + sentH * 0.2,
      );
      ctx.quadraticCurveTo(
        shaftX + sentW * 0.2,
        shaftTop + sentH * 0.3,
        shaftX,
        shaftTop + sentH * 0.36,
      );
      ctx.closePath();
      ctx.fill();
      // Blade edge
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shaftX + sentW * 0.02, shaftTop + sentH * 0.03);
      ctx.quadraticCurveTo(
        shaftX + sentW * 0.38,
        shaftTop + sentH * 0.05,
        shaftX + sentW * 0.33,
        shaftTop + sentH * 0.2,
      );
      ctx.quadraticCurveTo(
        shaftX + sentW * 0.28,
        shaftTop + sentH * 0.34,
        shaftX + sentW * 0.02,
        shaftTop + sentH * 0.41,
      );
      ctx.stroke();
      // Back spike
      ctx.fillStyle = "#a0a8b0";
      ctx.beginPath();
      ctx.moveTo(shaftX, shaftTop + sentH * 0.1);
      ctx.lineTo(shaftX - sentW * 0.15, shaftTop + sentH * 0.18);
      ctx.lineTo(shaftX, shaftTop + sentH * 0.25);
      ctx.fill();
      // Top spike
      ctx.fillStyle = "#c0c8d0";
      ctx.beginPath();
      ctx.moveTo(shaftX - 3, shaftTop + sentH * 0.02);
      ctx.lineTo(shaftX, shaftTop - sentH * 0.08);
      ctx.lineTo(shaftX + 3, shaftTop + sentH * 0.02);
      ctx.fill();
      // Spike edge highlight
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.moveTo(shaftX - 2, shaftTop + sentH * 0.01);
      ctx.lineTo(shaftX, shaftTop - sentH * 0.07);
      ctx.stroke();
      // Langet
      ctx.fillStyle = "#888899";
      ctx.fillRect(shaftX - 3, shaftTop + sentH * 0.02, 2, sentH * 0.15);
      ctx.fillRect(shaftX + 1, shaftTop + sentH * 0.02, 2, sentH * 0.15);
      // Legs
      ctx.fillStyle = darkColor;
      const slegW = sentW * 0.4;
      ctx.fillRect(screenX - sentW * 0.55, sentBot, slegW, halfH * 0.32);
      ctx.fillRect(screenX + sentW * 0.15, sentBot, slegW, halfH * 0.32);
      // Knee cops
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.ellipse(
        screenX - sentW * 0.35,
        sentBot + halfH * 0.06,
        slegW * 0.35,
        halfH * 0.06,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        screenX + sentW * 0.35,
        sentBot + halfH * 0.06,
        slegW * 0.35,
        halfH * 0.06,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Sabatons
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX - sentW * 0.6,
        sentBot + halfH * 0.26,
        slegW + sentW * 0.12,
        halfH * 0.08,
      );
      ctx.fillRect(
        screenX + sentW * 0.1,
        sentBot + halfH * 0.26,
        slegW + sentW * 0.12,
        halfH * 0.08,
      );
    } else if (enemy.enemyType === "glitchling") {
      // Glitchling
      const glitchOff = Math.sin(time * 0.02 + enemy.x * 7) * bodyWidth * 0.15;
      const glitchOff2 = Math.cos(time * 0.015 + enemy.y * 5) * bodyWidth * 0.1;
      const gW = bodyWidth * 0.7;
      const gTop = centerY - halfH * 0.2;
      const gBot = centerY + halfH * 0.3;

      // Afterimage/ghost trail
      ctx.globalAlpha = alpha * 0.12;
      ctx.fillStyle = "#00ff66";
      ctx.beginPath();
      ctx.moveTo(screenX + glitchOff * 2.5, gTop - halfH * 0.12);
      ctx.lineTo(screenX - gW * 1.1 + glitchOff2 * 2, gBot + halfH * 0.02);
      ctx.lineTo(screenX + gW * 1.1 + glitchOff2 * 2, gBot + halfH * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Triangular body - outer
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX + glitchOff, gTop - halfH * 0.1);
      ctx.lineTo(screenX - gW + glitchOff2, gBot);
      ctx.lineTo(screenX + gW + glitchOff2, gBot);
      ctx.closePath();
      ctx.fill();

      // Inner triangle
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(screenX + glitchOff, gTop + halfH * 0.02);
      ctx.lineTo(screenX - gW * 0.65 + glitchOff2, gBot - halfH * 0.04);
      ctx.lineTo(screenX + gW * 0.65 + glitchOff2, gBot - halfH * 0.04);
      ctx.closePath();
      ctx.fill();

      // Data corruption pattern inside body
      ctx.fillStyle = "#00ff44";
      ctx.globalAlpha = alpha * 0.15;
      const patternY = gTop + halfH * 0.08;
      const patternH = (gBot - gTop) * 0.7;
      for (let p = 0; p < 6; p++) {
        const py = patternY + (p / 6) * patternH;
        const pw = gW * 0.4 * (1 - p / 8);
        if (Math.sin(time * 0.03 + p * 1.7) > 0) {
          ctx.fillRect(screenX - pw + glitchOff * 0.5, py, pw * 2, 1.5);
        }
      }
      ctx.globalAlpha = alpha;

      // Eye - pulsing
      const eyePulse = 0.7 + Math.sin(time * 0.012) * 0.3;
      const eyeSize2 = gW * 0.3;

      // Eye glow
      ctx.fillStyle = "#00ff66";
      ctx.globalAlpha = alpha * 0.3 * eyePulse;
      ctx.beginPath();
      ctx.arc(screenX + glitchOff, centerY, eyeSize2 * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Eye core
      ctx.fillStyle = "#00ff66";
      ctx.fillRect(
        screenX - eyeSize2 / 2 + glitchOff,
        centerY - eyeSize2 / 2,
        eyeSize2,
        eyeSize2,
      );

      // Eye pupil
      ctx.fillStyle = "#003311";
      const pupilS = eyeSize2 * 0.35;
      ctx.fillRect(
        screenX - pupilS / 2 + glitchOff,
        centerY - pupilS / 2,
        pupilS,
        pupilS,
      );

      // Scan line across eye
      ctx.fillStyle = "#00ff66";
      ctx.globalAlpha = alpha * 0.6;
      const scanY = centerY - eyeSize2 / 2 + ((time * 0.05) % eyeSize2);
      ctx.fillRect(screenX - eyeSize2 / 2 + glitchOff, scanY, eyeSize2, 1);
      ctx.globalAlpha = alpha;

      // Chromatic jitter (subtle) for digital feel
      const chromAlpha = 0.18;
      ctx.globalAlpha = alpha * chromAlpha;
      ctx.fillStyle = "rgba(0,255,180,1)";
      ctx.fillRect(screenX - eyeSize2 / 2 + glitchOff - 1.6, centerY - eyeSize2 / 2, eyeSize2, eyeSize2);
      ctx.fillStyle = "rgba(255,0,200,1)";
      ctx.globalAlpha = alpha * 0.12;
      ctx.fillRect(screenX - eyeSize2 / 2 + glitchOff + 1.6, centerY - eyeSize2 / 2, eyeSize2, eyeSize2);
      ctx.globalAlpha = alpha;

      // Glitch static lines (more varied)
      ctx.fillStyle = "#00ff44";
      ctx.globalAlpha = alpha * 0.5;
      for (let g = 0; g < 5; g++) {
        const gy = gTop + Math.random() * (gBot - gTop);
        const gx = (Math.random() - 0.5) * bodyWidth * 0.4;
        const gLen = gW * (0.5 + Math.random() * 1.5);
        ctx.fillRect(screenX - gLen / 2 + gx, gy, gLen, 1);
      }
      ctx.globalAlpha = alpha;

      // Floating data fragments around body
      ctx.fillStyle = "#00ff66";
      ctx.globalAlpha = alpha * 0.35;
      for (let f = 0; f < 3; f++) {
        const fAngle = time * 0.004 + f * ((Math.PI * 2) / 3);
        const fDist = gW * 1.1;
        const fx = screenX + Math.cos(fAngle) * fDist;
        const fy = centerY + Math.sin(fAngle) * halfH * 0.3;
        ctx.fillRect(fx - 2, fy - 1, 4, 2);
      }
      ctx.globalAlpha = alpha;

      // No legs - it floats/glitches
    } else if (enemy.enemyType === "shieldCommander") {
      // ── Shield Commander (polished) ───────────────────────────
      // Tactical riot commander — refined energy shield, crisp visor, beveled armor
      const scW = bodyWidth * 0.86;
      const scTop = centerY - halfH * 0.46;
      const scBot = centerY + halfH * 0.46;
      const scMid = (scTop + scBot) / 2;
      const breathe = Math.sin(time * 0.0035) * halfH * 0.01;

      // Shield (energy wall) — add surface ripples and sharper rim
      const shW = scW * 1.58;
      const shH = (scBot - scTop) * 1.12;
      const shX = screenX - shW * 0.5;
      const shY = scTop - halfH * 0.06;
      const shPulse = 0.55 + Math.sin(time * 0.006) * 0.18;

      // Outer soft glow
      ctx.fillStyle = "#3677b8";
      ctx.globalAlpha = alpha * 0.14 * shPulse;
      ctx.beginPath();
      ctx.ellipse(screenX, scMid, shW * 0.66, shH * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Energy plane with subtle ripple bands
      ctx.fillStyle = "#3f7fdc";
      ctx.globalAlpha = alpha * 0.28;
      ctx.beginPath();
      ctx.roundRect(shX, shY, shW, shH, scW * 0.12);
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Ripple accents
      ctx.strokeStyle = "rgba(170,200,255,0.18)";
      ctx.lineWidth = 1;
      for (let r = 0; r < 3; r++) {
        const ry = shY + (r + 1) * (shH / 5) + Math.sin(time * 0.005 + r) * 1.2;
        ctx.beginPath();
        ctx.moveTo(shX + scW * 0.08, ry);
        ctx.lineTo(shX + shW - scW * 0.08, ry);
        ctx.stroke();
      }

      // Shield rim (crisper)
      ctx.strokeStyle = "#88bfff";
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.7 * shPulse;
      ctx.beginPath();
      ctx.roundRect(shX, shY, shW, shH, scW * 0.12);
      ctx.stroke();
      ctx.globalAlpha = alpha;

      // Small rim sparks for visual impact
      for (let sp = 0; sp < 3; sp++) {
        const a = time * 0.01 + (enemy.x || 0) * 2.7 + sp * 1.9;
        const sx = screenX + Math.cos(a) * (shW * 0.45 + Math.sin(a * 0.7) * 3);
        const sy = scMid + Math.sin(a) * (shH * 0.36 + Math.cos(a * 0.9) * 2);
        ctx.strokeStyle = "rgba(255,255,220,0.95)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * (0.35 + Math.sin(a * 0.5) * 0.18) * shPulse;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a) * 8, sy + Math.sin(a) * 8);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;

      // Body (beveled armor)
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.roundRect(screenX - scW, scTop + breathe, scW * 2, scBot - scTop, scW * 0.12);
      ctx.fill();

      // Inner beveled plate
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.roundRect(screenX - scW * 0.74, scTop + halfH * 0.06 + breathe, scW * 1.48, (scBot - scTop) * 0.82, scW * 0.06);
      ctx.fill();

      // Pauldrons with edge highlights
      const pauldW = scW * 0.56;
      const pauldH = halfH * 0.18;
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.ellipse(screenX - scW * 0.92, scTop + halfH * 0.06 + breathe, pauldW * 0.52, pauldH * 0.5, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(screenX + scW * 0.92, scTop + halfH * 0.06 + breathe, pauldW * 0.52, pauldH * 0.5, 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Pauldron edge
      ctx.strokeStyle = "#66aacc";
      ctx.lineWidth = 1;
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.ellipse(screenX - scW * 0.92, scTop + halfH * 0.06 + breathe, pauldW * 0.52, pauldH * 0.5, -0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(screenX + scW * 0.92, scTop + halfH * 0.06 + breathe, pauldW * 0.52, pauldH * 0.5, 0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha;

      // Chest chevrons with small metal shine
      ctx.strokeStyle = "#ffdd55";
      ctx.lineWidth = 1.2;
      for (let ch = 0; ch < 3; ch++) {
        const chY = scMid - halfH * 0.05 + ch * halfH * 0.05 + breathe;
        ctx.beginPath();
        ctx.moveTo(screenX - scW * 0.18, chY);
        ctx.lineTo(screenX, chY - halfH * 0.02);
        ctx.lineTo(screenX + scW * 0.18, chY);
        ctx.stroke();
      }

      // Helmet with sharper visor
      const headR = scW * 0.44;
      const headY = scTop - headR * 0.36 + breathe;
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(screenX, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      // Visor
      const visorW = headR * 1.5;
      const visorH = headR * 0.28;
      ctx.fillStyle = "#4ca0ff";
      ctx.globalAlpha = alpha * (0.75 + Math.sin(time * 0.006) * 0.12);
      ctx.beginPath();
      ctx.roundRect(screenX - visorW * 0.5, headY - visorH * 0.28, visorW, visorH, visorH * 0.45);
      ctx.fill();
      // Thin highlight
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.globalAlpha = alpha * 0.36;
      ctx.fillRect(screenX - visorW * 0.32, headY - visorH * 0.12, visorW * 0.64, 1);
      ctx.globalAlpha = alpha;

      // Legs: tightened silhouette
      const legW = scW * 0.33;
      const legH = halfH * 0.28;
      ctx.fillStyle = darkColor;
      ctx.fillRect(screenX - scW * 0.56, scBot + breathe, legW, legH);
      ctx.fillRect(screenX + scW * 0.23, scBot + breathe, legW, legH);
      // Boots
      ctx.fillStyle = "#0f2430";
      ctx.fillRect(screenX - scW * 0.58, scBot + legH * 0.82 + breathe, legW * 1.12, legH * 0.2);
      ctx.fillRect(screenX + scW * 0.21, scBot + legH * 0.82 + breathe, legW * 1.12, legH * 0.2);
      // subtle scuff lines on boots
      ctx.globalAlpha = alpha * 0.18;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(screenX - scW * 0.56, scBot + legH * 0.9); ctx.lineTo(screenX - scW * 0.38, scBot + legH * 0.92); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(screenX + scW * 0.18, scBot + legH * 0.9); ctx.lineTo(screenX + scW * 0.36, scBot + legH * 0.92); ctx.stroke();
      ctx.globalAlpha = alpha;
    } else if (enemy.enemyType === "temporalSummoner") {
      // ── Temporal Summoner (polished) ──────────────────────────
      // Robed rift mage — stronger rune glow, swirling portal, richer sigils
      const tsW = bodyWidth * 0.82;
      const tsTop = centerY - halfH * 0.52;
      const tsBot = centerY + halfH * 0.58;
      const hover = Math.sin(time * 0.0032) * halfH * 0.03;

      // Summoning portal (more depth, swirl)
      const portalRadius = tsW * 1.18;
      ctx.globalAlpha = alpha * 0.28;
      // Outer ring
      ctx.strokeStyle = "#b04cff";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(screenX, tsBot + halfH * 0.12, portalRadius, portalRadius * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner rotating swirl
      ctx.globalAlpha = alpha * 0.14;
      ctx.fillStyle = "#5a007a";
      ctx.beginPath();
      ctx.ellipse(screenX, tsBot + halfH * 0.12, portalRadius * 0.78, portalRadius * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      // Light streaks
      ctx.globalAlpha = alpha * 0.22;
      ctx.strokeStyle = "#dd66ff";
      for (let s = 0; s < 6; s++) {
        const a = time * 0.004 + s * 1.04;
        ctx.beginPath();
        ctx.moveTo(screenX + Math.cos(a) * portalRadius * 0.4, tsBot + halfH * 0.12 + Math.sin(a) * portalRadius * 0.06);
        ctx.lineTo(screenX + Math.cos(a) * portalRadius * 0.9, tsBot + halfH * 0.12 + Math.sin(a) * portalRadius * 0.22);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;

      // Robe silhouette (smoother curves)
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - tsW * 0.52, tsTop + halfH * 0.14 + hover);
      ctx.quadraticCurveTo(screenX, tsTop + halfH * 0.05 + hover, screenX + tsW * 0.52, tsTop + halfH * 0.14 + hover);
      ctx.lineTo(screenX + tsW * 1.05, tsBot + hover);
      ctx.lineTo(screenX - tsW * 1.05, tsBot + hover);
      ctx.closePath();
      ctx.fill();

      // Inner trim with stronger glow
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.moveTo(screenX - tsW * 0.34, tsTop + halfH * 0.22 + hover);
      ctx.quadraticCurveTo(screenX, tsTop + halfH * 0.12 + hover, screenX + tsW * 0.34, tsTop + halfH * 0.22 + hover);
      ctx.lineTo(screenX + tsW * 0.78, tsBot - halfH * 0.02 + hover);
      ctx.lineTo(screenX - tsW * 0.78, tsBot - halfH * 0.02 + hover);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Enhanced rune patterns (thicker, animated)
      ctx.strokeStyle = "#c77eff";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = alpha * 0.45;
      for (let r = 0; r < 5; r++) {
        const rY = tsTop + halfH * 0.32 + r * halfH * 0.11 + hover + Math.sin(time * 0.006 + r) * 0.6;
        const rW = tsW * (0.36 + r * 0.09);
        ctx.beginPath();
        ctx.moveTo(screenX - rW, rY);
        ctx.bezierCurveTo(screenX - rW * 0.28, rY - halfH * 0.02, screenX + rW * 0.28, rY + halfH * 0.02, screenX + rW, rY);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;

      // Hood and eyes — increase contrast
      const hoodW = tsW * 0.72;
      const hoodH = halfH * 0.36;
      const hoodY = tsTop - hoodH * 0.28 + hover;
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX, hoodY - hoodH * 0.2);
      ctx.bezierCurveTo(screenX - hoodW, hoodY, screenX - hoodW * 0.88, hoodY + hoodH, screenX, hoodY + hoodH * 0.7);
      ctx.bezierCurveTo(screenX + hoodW * 0.88, hoodY + hoodH, screenX + hoodW, hoodY, screenX, hoodY - hoodH * 0.2);
      ctx.fill();

      // Eyes
      const eyeGlow = 0.75 + Math.sin(time * 0.01) * 0.25;
      ctx.fillStyle = "#d96bff";
      ctx.globalAlpha = alpha * eyeGlow;
      const eyeS = hoodW * 0.15;
      ctx.beginPath(); ctx.arc(screenX - hoodW * 0.22, hoodY + hoodH * 0.32, eyeS, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(screenX + hoodW * 0.22, hoodY + hoodH * 0.32, eyeS, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha;

      // Floating sigils — give more variety and subtle rotation
      ctx.lineWidth = 1.4;
      for (let s = 0; s < 5; s++) {
        const sAngle = time * 0.0035 + s * (Math.PI * 0.9);
        const sRadius = tsW * (1.25 + (s % 2) * 0.15);
        const sx = screenX + Math.cos(sAngle) * sRadius;
        const sy = centerY + Math.sin(sAngle) * halfH * 0.28 + hover;
        const sigSize = tsW * 0.12;
        ctx.globalAlpha = alpha * (0.35 + Math.sin(time * 0.006 + s) * 0.18);
        ctx.strokeStyle = "#e08eff";
        ctx.beginPath();
        ctx.moveTo(sx, sy - sigSize);
        ctx.lineTo(sx + sigSize * 0.7, sy);
        ctx.lineTo(sx, sy + sigSize);
        ctx.lineTo(sx - sigSize * 0.7, sy);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = "#ffd9ff";
        ctx.beginPath(); ctx.arc(sx, sy, sigSize * 0.22, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = alpha;

      // Casting hands with brighter tendrils
      const handY = tsTop + halfH * 0.26 + hover;
      ctx.fillStyle = "#bf3bff";
      ctx.beginPath(); ctx.arc(screenX - tsW * 1.02, handY, tsW * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(screenX + tsW * 1.02, handY, tsW * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#d76bff";
      ctx.lineWidth = 1.1;
      ctx.globalAlpha = alpha * 0.5;
      for (const dir of [-1, 1]) {
        const hx = screenX + dir * tsW * 1.02;
        for (let t = 0; t < 4; t++) {
          const tAngle = time * 0.005 + t * 0.7 + dir * 0.2;
          ctx.beginPath();
          ctx.moveTo(hx, handY);
          ctx.lineTo(hx + Math.cos(tAngle) * tsW * 0.58 * dir, handY + Math.sin(tAngle) * halfH * 0.16);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = alpha;
      // ── Voss's Henchman ────────────────────────────────────────
      // Fast flanker — lean build, tactical vest, dual energy blades, speed lines
      const hmW = bodyWidth * 0.6;
      const hmTop = centerY - halfH * 0.4;
      const hmBot = centerY + halfH * 0.4;
      const lean = Math.sin(time * 0.006 + enemy.x * 3) * hmW * 0.05;

      // ── Speed lines (afterimage trail) ──
      ctx.globalAlpha = alpha * 0.08;
      ctx.fillStyle = "#ff6600";
      for (let sl = 1; sl <= 3; sl++) {
        const slOff = sl * hmW * 0.3;
        ctx.fillRect(
          screenX - hmW * 0.4 - slOff,
          hmTop + halfH * 0.05,
          hmW * 0.12,
          hmBot - hmTop - halfH * 0.1,
        );
      }
      // Extra subtle afterimages for sharper motion feel
      for (let sl2 = 1; sl2 <= 2; sl2++) {
        const slOff2 = (sl2 + 3) * hmW * 0.22;
        ctx.globalAlpha = alpha * 0.04 * (1 - sl2 * 0.18);
        ctx.fillRect(
          screenX - hmW * 0.35 - slOff2,
          hmTop + halfH * 0.06,
          hmW * 0.1,
          hmBot - hmTop - halfH * 0.12,
        );
      }
      ctx.globalAlpha = alpha;

      // ── Torso (lean, angular) ──
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - hmW * 0.7 + lean, hmTop);
      ctx.lineTo(screenX + hmW * 0.7 + lean, hmTop);
      ctx.lineTo(screenX + hmW * 0.55 + lean, hmBot);
      ctx.lineTo(screenX - hmW * 0.55 + lean, hmBot);
      ctx.closePath();
      ctx.fill();

      // Tactical vest
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(screenX - hmW * 0.5 + lean, hmTop + halfH * 0.04);
      ctx.lineTo(screenX + hmW * 0.5 + lean, hmTop + halfH * 0.04);
      ctx.lineTo(screenX + hmW * 0.4 + lean, hmBot - halfH * 0.06);
      ctx.lineTo(screenX - hmW * 0.4 + lean, hmBot - halfH * 0.06);
      ctx.closePath();
      ctx.fill();

      // Vest pouches
      ctx.fillStyle = "#884422";
      for (let p = 0; p < 3; p++) {
        const px = screenX - hmW * 0.3 + p * hmW * 0.3 + lean;
        const py = hmBot - halfH * 0.12;
        ctx.fillRect(px - hmW * 0.08, py, hmW * 0.16, halfH * 0.04);
      }

      // ── Voss insignia (V) ──
      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 1.5;
      const insY = (hmTop + hmBot) / 2 - halfH * 0.02;
      ctx.beginPath();
      ctx.moveTo(screenX - hmW * 0.15 + lean, insY - halfH * 0.04);
      ctx.lineTo(screenX + lean, insY + halfH * 0.04);
      ctx.lineTo(screenX + hmW * 0.15 + lean, insY - halfH * 0.04);
      ctx.stroke();

      // ── Head (sleek helmet) ──
      const headR2 = hmW * 0.4;
      const headY2 = hmTop - headR2 * 0.6 + lean * 0.3;

      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(screenX + lean, headY2, headR2, 0, Math.PI * 2);
      ctx.fill();

      // Visor — narrow, orange
      ctx.fillStyle = "#ff6600";
      ctx.globalAlpha = alpha * 0.85;
      const vis2W = headR2 * 1.4;
      const vis2H = headR2 * 0.22;
      ctx.fillRect(
        screenX - vis2W * 0.5 + lean,
        headY2 - vis2H * 0.5,
        vis2W,
        vis2H,
      );
      ctx.globalAlpha = alpha;

      // ── Energy blades (one per side) ──
      const bladeLen = halfH * 0.35;
      const bladeW2 = hmW * 0.08;
      const bladeFlicker = 0.7 + Math.sin(time * 0.01) * 0.3;

      for (const dir of [-1, 1]) {
        const bx = screenX + dir * hmW * 0.85 + lean;
        const by = hmTop + halfH * 0.15;

        // Blade glow
        ctx.fillStyle = "#ff6600";
        ctx.globalAlpha = alpha * 0.15 * bladeFlicker;
        ctx.fillRect(bx - bladeW2 * 2, by - bladeLen, bladeW2 * 4, bladeLen);
        ctx.globalAlpha = alpha;

        // Blade core
        ctx.fillStyle = "#ffaa44";
        ctx.globalAlpha = alpha * bladeFlicker;
        ctx.fillRect(bx - bladeW2 * 0.5, by - bladeLen, bladeW2, bladeLen);
        ctx.globalAlpha = alpha;

        // Blade tip
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = alpha * 0.6 * bladeFlicker;
        ctx.beginPath();
        ctx.moveTo(bx, by - bladeLen - halfH * 0.04);
        ctx.lineTo(bx - bladeW2, by - bladeLen);
        ctx.lineTo(bx + bladeW2, by - bladeLen);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = alpha;

        // Hilt
        ctx.fillStyle = "#663300";
        ctx.fillRect(bx - bladeW2 * 1.2, by, bladeW2 * 2.4, halfH * 0.04);
      }

      // ── Legs (athletic, dynamic pose) ──
      const legH2 = halfH * 0.28;
      ctx.fillStyle = darkColor;
      // Staggered stance
      ctx.fillRect(screenX - hmW * 0.45 + lean, hmBot, hmW * 0.28, legH2);
      ctx.fillRect(
        screenX + hmW * 0.15 + lean,
        hmBot - halfH * 0.03,
        hmW * 0.28,
        legH2 + halfH * 0.03,
      );

      // Boot accents
      ctx.fillStyle = "#442200";
      ctx.fillRect(
        screenX - hmW * 0.48 + lean,
        hmBot + legH2 * 0.8,
        hmW * 0.34,
        legH2 * 0.25,
      );
      ctx.fillRect(
        screenX + hmW * 0.12 + lean,
        hmBot + legH2 * 0.77,
        hmW * 0.34,
        legH2 * 0.25,
      );
    } else if (enemy.enemyType === "chronoBomber") {
      // ── Chrono-Bomber ──────────────────────────────────────────
      // Heavy demolitions — bomb pack on back, glowing charges, hazard markings
      const cbW = bodyWidth * 0.85;
      const cbTop = centerY - halfH * 0.4;
      const cbBot = centerY + halfH * 0.45;
      const tick = Math.sin(time * 0.008);

      // ── Hazard warning aura ──
      ctx.fillStyle = "#ffaa00";
      ctx.globalAlpha = alpha * 0.06 * (0.5 + tick * 0.5);
      ctx.beginPath();
      ctx.arc(screenX, centerY, cbW * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;

      // ── Bomb pack (visible on back/shoulders) ──
      const packW = cbW * 0.7;
      const packH = (cbBot - cbTop) * 0.5;
      const packY = cbTop + halfH * 0.05;

      // Pack body
      ctx.fillStyle = "#554422";
      ctx.beginPath();
      ctx.roundRect(screenX - packW * 0.5, packY, packW, packH, cbW * 0.06);
      ctx.fill();

      // Pack straps
      ctx.fillStyle = "#443311";
      ctx.fillRect(screenX - cbW * 0.55, packY, cbW * 0.08, packH * 1.2);
      ctx.fillRect(screenX + cbW * 0.47, packY, cbW * 0.08, packH * 1.2);

      // Bomb charges (3 glowing cylinders on pack)
      for (let b = 0; b < 3; b++) {
        const bx = screenX - packW * 0.25 + b * packW * 0.25;
        const by = packY + packH * 0.15;
        const bPulse = 0.5 + Math.sin(time * 0.01 + b * 1.5) * 0.5;

        // Cylinder
        ctx.fillStyle = "#887744";
        ctx.beginPath();
        ctx.roundRect(bx - cbW * 0.06, by, cbW * 0.12, packH * 0.6, 3);
        ctx.fill();

        // Glowing tip
        ctx.fillStyle = "#ffaa00";
        ctx.globalAlpha = alpha * bPulse;
        ctx.beginPath();
        ctx.arc(bx, by, cbW * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
      }

      // ── Body (stocky, armored) ──
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.roundRect(screenX - cbW, cbTop, cbW * 2, cbBot - cbTop, cbW * 0.1);
      ctx.fill();

      // Inner armor
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.roundRect(
        screenX - cbW * 0.75,
        cbTop + halfH * 0.05,
        cbW * 1.5,
        (cbBot - cbTop) * 0.85,
        cbW * 0.06,
      );
      ctx.fill();

      // Hazard stripes on torso
      ctx.fillStyle = "#ffaa00";
      ctx.globalAlpha = alpha * 0.35;
      for (let hz = 0; hz < 4; hz++) {
        const hzY = cbTop + halfH * 0.1 + hz * halfH * 0.08;
        const hzSkew = hz * cbW * 0.08;
        ctx.beginPath();
        ctx.moveTo(screenX - cbW * 0.6 + hzSkew, hzY);
        ctx.lineTo(screenX - cbW * 0.6 + hzSkew + cbW * 0.25, hzY);
        ctx.lineTo(
          screenX - cbW * 0.6 + hzSkew + cbW * 0.15,
          hzY + halfH * 0.03,
        );
        ctx.lineTo(
          screenX - cbW * 0.6 + hzSkew - cbW * 0.1,
          hzY + halfH * 0.03,
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = alpha;

      // Radioactive/hazard symbol on chest
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 1.5;
      const symY = (cbTop + cbBot) / 2;

      // Trefoil (simplified)
      for (let t = 0; t < 3; t++) {
        const tAngle = t * ((Math.PI * 2) / 3) - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(
          screenX + Math.cos(tAngle) * cbW * 0.12,
          symY + Math.sin(tAngle) * cbW * 0.12,
          cbW * 0.08,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      // Center dot
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(screenX, symY, cbW * 0.04, 0, Math.PI * 2);
      ctx.fill();

      // ── Head (heavy helmet with blast visor) ──
      const headR3 = cbW * 0.45;
      const headY3 = cbTop - headR3 * 0.35;

      // Helmet
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(screenX, headY3, headR3, 0, Math.PI * 2);
      ctx.fill();

      // Blast visor (gold-tinted)
      ctx.fillStyle = "#ffcc44";
      ctx.globalAlpha = alpha * 0.7;
      const bVisW = headR3 * 1.5;
      const bVisH = headR3 * 0.45;
      ctx.beginPath();
      ctx.roundRect(
        screenX - bVisW * 0.5,
        headY3 - bVisH * 0.3,
        bVisW,
        bVisH,
        bVisH * 0.4,
      );
      ctx.fill();
      ctx.globalAlpha = alpha;

      // Visor reflection
      ctx.fillStyle = "#ffeebb";
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(screenX - bVisW * 0.3, headY3 - bVisH * 0.1, bVisW * 0.6, 1);
      ctx.globalAlpha = alpha;

      // Chin guard
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX - headR3 * 0.6,
        headY3 + headR3 * 0.5,
        headR3 * 1.2,
        headR3 * 0.3,
      );

      // ── Timer display on wrist ──
      const timerX = screenX + cbW * 0.9;
      const timerY = cbTop + halfH * 0.25;
      ctx.fillStyle = "#111100";
      ctx.fillRect(timerX - cbW * 0.12, timerY, cbW * 0.24, halfH * 0.06);
      // Blinking countdown
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = alpha * (0.5 + tick * 0.5);
      ctx.font = `${Math.max(6, cbW * 0.12)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(
        "00:" + String(Math.floor((time * 0.01) % 60)).padStart(2, "0"),
        timerX,
        timerY + halfH * 0.05,
      );
      ctx.globalAlpha = alpha;

      // ── Legs (heavy, planted) ──
      const legH3 = halfH * 0.3;
      ctx.fillStyle = darkColor;
      ctx.fillRect(screenX - cbW * 0.6, cbBot, cbW * 0.4, legH3);
      ctx.fillRect(screenX + cbW * 0.2, cbBot, cbW * 0.4, legH3);

      // Armored shin guards
      ctx.fillStyle = "#887744";
      ctx.fillRect(
        screenX - cbW * 0.55,
        cbBot + legH3 * 0.3,
        cbW * 0.3,
        legH3 * 0.4,
      );
      ctx.fillRect(
        screenX + cbW * 0.25,
        cbBot + legH3 * 0.3,
        cbW * 0.3,
        legH3 * 0.4,
      );

      // Heavy boots
      ctx.fillStyle = "#332200";
      ctx.fillRect(
        screenX - cbW * 0.65,
        cbBot + legH3 * 0.85,
        cbW * 0.5,
        legH3 * 0.2,
      );
      ctx.fillRect(
        screenX + cbW * 0.15,
        cbBot + legH3 * 0.85,
        cbW * 0.5,
        legH3 * 0.2,
      );
    } else {
      // Fallback: generic rectangle
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX - bodyWidth,
        bodyTop,
        bodyWidth * 2,
        bodyBottom - bodyTop,
      );
      ctx.fillStyle = baseColor;
      ctx.fillRect(
        screenX - bodyWidth * 0.7,
        bodyTop + (bodyBottom - bodyTop) * 0.1,
        bodyWidth * 1.4,
        (bodyBottom - bodyTop) * 0.8,
      );
      ctx.fillStyle = "#00ffaa";
      const eyeSize3 = bodyWidth * 0.2;
      ctx.fillRect(
        screenX - eyeSize3,
        bodyTop + (bodyBottom - bodyTop) * 0.25 - eyeSize3 / 2,
        eyeSize3 * 2,
        eyeSize3,
      );
      ctx.fillStyle = darkColor;
      const legW3 = bodyWidth * 0.3;
      ctx.fillRect(screenX - bodyWidth * 0.5, bodyBottom, legW3, halfH * 0.3);
      ctx.fillRect(screenX + bodyWidth * 0.2, bodyBottom, legW3, halfH * 0.3);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawPickup(
    ctx,
    screenX,
    centerY,
    sprWidth,
    sprHeight,
    dist,
    color,
    symbol,
    time,
    fog,
  ) {
    if (fog <= 0) return;
    const size = Math.max(4, sprWidth * 0.3);
    const bob = Math.sin(time * 0.004) * size * 0.2;
    const spin = time * 0.003;
    const y = centerY + sprHeight * 0.15 + bob;

    // Outer pulsing glow
    const pulse = 0.3 + Math.sin(time * 0.006) * 0.15;
    ctx.globalAlpha = fog * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screenX, y, size * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.globalAlpha = fog * 0.4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screenX, y, size * 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Diamond-shaped core (rotates)
    ctx.save();
    ctx.translate(screenX, y);
    ctx.rotate(spin);
    ctx.globalAlpha = fog;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.55, 0);
    ctx.lineTo(0, size * 0.55);
    ctx.lineTo(-size * 0.55, 0);
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(0, size * 0.3);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Sparkle particles
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 3; i++) {
      const angle = spin * 2 + i * ((Math.PI * 2) / 3);
      const sparkR = size * 0.8;
      const sx = Math.cos(angle) * sparkR;
      const sy = Math.sin(angle) * sparkR;
      ctx.globalAlpha = fog * (0.3 + Math.sin(time * 0.01 + i) * 0.3);
      ctx.beginPath();
      ctx.arc(screenX + sx, y + sy, Math.max(1, size * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawHealthPickup(
    ctx,
    screenX,
    centerY,
    sprWidth,
    sprHeight,
    dist,
    time,
    fog,
  ) {
    if (fog <= 0) return;
    const size = Math.max(6, sprWidth * 0.35);
    const bob = Math.sin(time * 0.004) * size * 0.2;
    const y = centerY + sprHeight * 0.15 + bob;
    const pulse = 0.8 + Math.sin(time * 0.006) * 0.2;

    // Outer radial glow
    ctx.globalAlpha = fog * 0.2 * pulse;
    ctx.fillStyle = "#00ff44";
    ctx.beginPath();
    ctx.arc(screenX, y, size * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Soft glow ring
    ctx.globalAlpha = fog * 0.3;
    ctx.fillStyle = "#00ff44";
    ctx.beginPath();
    ctx.arc(screenX, y, size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // White background with rounded look
    ctx.globalAlpha = fog;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(screenX - size * 0.6, y - size * 0.6, size * 1.2, size * 1.2);

    // Highlight on box
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(screenX - size * 0.6, y - size * 0.6, size * 0.4, size * 1.2);

    // Red cross
    const crossT = size * 0.22;
    ctx.fillStyle = "#ff2222";
    ctx.fillRect(screenX - crossT / 2, y - size * 0.45, crossT, size * 0.9);
    ctx.fillRect(screenX - size * 0.45, y - crossT / 2, size * 0.9, crossT);

    // Cross highlight
    ctx.fillStyle = "rgba(255,100,100,0.3)";
    ctx.fillRect(
      screenX - crossT / 2,
      y - size * 0.45,
      crossT * 0.4,
      size * 0.9,
    );

    // Border with pulse
    ctx.strokeStyle = "#00cc44";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = fog * pulse;
    ctx.strokeRect(
      screenX - size * 0.6,
      y - size * 0.6,
      size * 1.2,
      size * 1.2,
    );

    // Corner dots
    ctx.fillStyle = "#00ff44";
    ctx.globalAlpha = fog * 0.6;
    const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(
        screenX + cx * size * 0.6,
        y + cy * size * 0.6,
        Math.max(1, size * 0.06),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  drawAmmoPickup(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
    if (fog <= 0) return;
    const size = Math.max(6, sprWidth * 0.35);
    const bob = Math.sin(time * 0.004 + 1) * size * 0.2;
    const y = centerY + sprHeight * 0.15 + bob;
    // Soft glow
    ctx.globalAlpha = fog * 0.3;
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(screenX, y, size * 1.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fog;
    // Magazine body
    const magW = size * 0.5;
    const magH = size * 1.0;
    ctx.fillStyle = "#555555";
    ctx.fillRect(screenX - magW / 2, y - magH / 2, magW, magH);
    // Highlight strip on magazine
    ctx.fillStyle = "#777777";
    ctx.fillRect(
      screenX - magW / 2 + 1,
      y - magH / 2 + 1,
      magW * 0.3,
      magH - 2,
    );
    // Cartridge tips
    const tipH = magH * 0.15;
    ctx.fillStyle = "#ddaa33";
    ctx.fillRect(
      screenX - magW / 2 + 1,
      y - magH / 2 - tipH + 1,
      magW * 0.25,
      tipH,
    );
    ctx.fillRect(screenX, y - magH / 2 - tipH + 1, magW * 0.25, tipH);
    ctx.fillRect(
      screenX - magW / 4,
      y - magH / 2 - tipH * 0.7 + 1,
      magW * 0.25,
      tipH * 0.7,
    );
    // Feed lip detail at top
    ctx.fillStyle = "#666666";
    ctx.fillRect(screenX - magW / 2 - 1, y - magH / 2, magW + 2, 2);
    // Border
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX - magW / 2, y - magH / 2, magW, magH);
    ctx.globalAlpha = 1;
  }

  drawWeaponPickup(
    ctx,
    screenX,
    centerY,
    sprWidth,
    sprHeight,
    dist,
    time,
    fog,
  ) {
    if (fog <= 0) return;
    const size = Math.max(6, sprWidth * 0.35);
    const bob = Math.sin(time * 0.004 + 2) * size * 0.2;
    const y = centerY + sprHeight * 0.15 + bob;
    // Soft glow
    ctx.globalAlpha = fog * 0.3;
    ctx.fillStyle = "#00ccff";
    ctx.beginPath();
    ctx.arc(screenX, y, size * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fog;
    // Metal crate body
    const crW = size * 0.9;
    const crH = size * 0.7;
    ctx.fillStyle = "#667788";
    ctx.fillRect(screenX - crW / 2, y - crH / 2, crW, crH);
    // Top face
    ctx.fillStyle = "#889aaa";
    ctx.beginPath();
    ctx.moveTo(screenX - crW / 2, y - crH / 2);
    ctx.lineTo(screenX - crW / 2 + crW * 0.15, y - crH / 2 - crH * 0.2);
    ctx.lineTo(screenX + crW / 2 + crW * 0.15, y - crH / 2 - crH * 0.2);
    ctx.lineTo(screenX + crW / 2, y - crH / 2);
    ctx.closePath();
    ctx.fill();
    // Right face
    ctx.fillStyle = "#556677";
    ctx.beginPath();
    ctx.moveTo(screenX + crW / 2, y - crH / 2);
    ctx.lineTo(screenX + crW / 2 + crW * 0.15, y - crH / 2 - crH * 0.2);
    ctx.lineTo(screenX + crW / 2 + crW * 0.15, y + crH / 2 - crH * 0.2);
    ctx.lineTo(screenX + crW / 2, y + crH / 2);
    ctx.closePath();
    ctx.fill();
    // Cross straps
    ctx.strokeStyle = "#88aacc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenX - crW / 2, y - crH / 2);
    ctx.lineTo(screenX + crW / 2, y + crH / 2);
    ctx.moveTo(screenX + crW / 2, y - crH / 2);
    ctx.lineTo(screenX - crW / 2, y + crH / 2);
    ctx.stroke();
    // Corner rivets
    ctx.fillStyle = "#aaccee";
    const rivetR = Math.max(1, size * 0.05);
    [
      [-crW / 2 + 2, -crH / 2 + 2],
      [crW / 2 - 2, -crH / 2 + 2],
      [-crW / 2 + 2, crH / 2 - 2],
      [crW / 2 - 2, crH / 2 - 2],
    ].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(screenX + rx, y + ry, rivetR, 0, Math.PI * 2);
      ctx.fill();
    });
    // Border
    ctx.strokeStyle = "#00ccff";
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX - crW / 2, y - crH / 2, crW, crH);
    ctx.globalAlpha = 1;
  }

  drawExit(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
    if (fog <= 0) return;
    const size = Math.max(8, sprWidth * 0.5);
    const t = time * 0.003;
    const pulse = 0.7 + Math.sin(t * 1.4) * 0.3;

    ctx.save();
    ctx.translate(screenX, centerY);

    // ── Airlock door frame ──────────────────────────────────────────
    const dW = size * 1.4; // door half-width
    const dH = size * 2.0; // door half-height
    const frameThick = Math.max(2, size * 0.12);

    // Ambient glow behind door
    ctx.globalAlpha = fog * pulse * 0.18;
    const grd = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 2.4);
    grd.addColorStop(0, "#00ffaa");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(-size * 2.4, -size * 2.4, size * 4.8, size * 4.8);

    // Door panel (dark interior)
    ctx.globalAlpha = fog * 0.7;
    ctx.fillStyle = "#0a1a12";
    ctx.fillRect(-dW, -dH, dW * 2, dH * 2);

    // Scan-line shimmer inside door
    ctx.globalAlpha = fog * 0.08;
    ctx.fillStyle = "#00ff88";
    const scanOff = (time * 0.04) % (dH * 2);
    ctx.fillRect(-dW, -dH + scanOff, dW * 2, 2);

    // Outer frame
    ctx.globalAlpha = fog * pulse * 0.85;
    ctx.strokeStyle = "#00cc88";
    ctx.lineWidth = frameThick;
    ctx.strokeRect(-dW, -dH, dW * 2, dH * 2);

    // Inner frame bevel
    ctx.globalAlpha = fog * 0.4;
    ctx.strokeStyle = "#005533";
    ctx.lineWidth = frameThick * 0.5;
    ctx.strokeRect(
      -dW + frameThick,
      -dH + frameThick,
      (dW - frameThick) * 2,
      (dH - frameThick) * 2,
    );

    // Hazard stripes — top bar
    ctx.globalAlpha = fog * 0.55;
    const stripeH = Math.max(3, size * 0.18);
    const stripeCount = 6;
    const stripeW = (dW * 2) / stripeCount;
    for (let s = 0; s < stripeCount; s++) {
      ctx.fillStyle = s % 2 === 0 ? "#ffcc00" : "#111111";
      ctx.fillRect(-dW + s * stripeW, -dH, stripeW, stripeH);
      ctx.fillRect(-dW + s * stripeW, dH - stripeH, stripeW, stripeH);
    }

    // Status indicator lights (left frame)
    const lightR = Math.max(2, size * 0.1);
    const lightSpacing = dH * 0.4;
    const greenPulse = 0.8 + Math.sin(t * 2.2) * 0.2;
    for (let li = 0; li < 3; li++) {
      const ly = -dH * 0.35 + li * lightSpacing;
      // Glow
      ctx.globalAlpha = fog * greenPulse * 0.4;
      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.arc(-dW - lightR * 0.5, ly, lightR * 2, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.globalAlpha = fog * greenPulse;
      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.arc(-dW - lightR * 0.5, ly, lightR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Door centre seam (vertical split line)
    ctx.globalAlpha = fog * pulse * 0.5;
    ctx.strokeStyle = "#00ffaa";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -dH + stripeH);
    ctx.lineTo(0, dH - stripeH);
    ctx.stroke();

    // Horizontal locking bolt indicator (recessed)
    ctx.globalAlpha = fog * 0.3;
    ctx.fillStyle = "#004422";
    ctx.fillRect(-dW * 0.6, -size * 0.08, dW * 1.2, size * 0.16);
    ctx.globalAlpha = fog * pulse * 0.7;
    ctx.strokeStyle = "#00cc88";
    ctx.lineWidth = 1;
    ctx.strokeRect(-dW * 0.6, -size * 0.08, dW * 1.2, size * 0.16);

    // "AIRLOCK" label above door
    if (size > 14) {
      const fontSize = Math.max(7, size * 0.22);
      ctx.globalAlpha = fog * pulse * 0.75;
      ctx.fillStyle = "#00ffcc";
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("AIRLOCK", 0, -dH - fontSize * 0.3);
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.restore();
  }

  drawProjectile(ctx, screenX, centerY, sprWidth, dist, entity, time, fog) {
    if (fog <= 0) return;
    const size = Math.max(3, sprWidth * 0.15);
    const color = entity.color || "#ff0044";
    const t = time * 0.006;

    // Outer glow halo
    ctx.globalAlpha = fog * 0.35;
    const glow = ctx.createRadialGradient(
      screenX,
      centerY,
      0,
      screenX,
      centerY,
      size * 3,
    );
    glow.addColorStop(0, color);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(screenX - size * 3, centerY - size * 3, size * 6, size * 6);

    // Core orb
    ctx.globalAlpha = fog * 0.8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screenX, centerY, size * 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.globalAlpha = fog;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(screenX, centerY, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Sparks
    ctx.globalAlpha = fog * 0.6;
    for (let i = 0; i < 3; i++) {
      const a = t + i * 2.1;
      const sx = screenX + Math.cos(a) * size * 1.4;
      const sy = centerY + Math.sin(a) * size * 1.4;
      ctx.fillStyle = color;
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }

    ctx.globalAlpha = 1;
  }
}
