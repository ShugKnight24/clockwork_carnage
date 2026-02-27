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
    this.generateTextures();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.zBuffer = new Float64Array(w);
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

  renderScene(player, map, entities, time) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear z-buffer
    this.zBuffer.fill(Infinity);

    // Draw ceiling gradient
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, h / 2);
    ceilGrad.addColorStop(0, "#0a0a1a");
    ceilGrad.addColorStop(1, "#141428");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, w, h / 2);

    // Draw floor gradient
    const floorGrad = ctx.createLinearGradient(0, h / 2, 0, h);
    floorGrad.addColorStop(0, "#1a1a24");
    floorGrad.addColorStop(1, "#0d0d14");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h / 2, w, h / 2);

    // Raycasting
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * 0.66;
    const planeY = dirX * 0.66;

    for (let x = 0; x < w; x++) {
      const cameraX = (2 * x) / w - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      const deltaDistX = Math.abs(1 / rayDirX);
      const deltaDistY = Math.abs(1 / rayDirY);

      let stepX, stepY, sideDistX, sideDistY;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
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
        perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
      } else {
        perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      }

      if (perpWallDist < 0.01) perpWallDist = 0.01;

      this.zBuffer[x] = perpWallDist;

      const lineHeight = Math.floor(h / perpWallDist);
      let drawStart = Math.floor(-lineHeight / 2 + h / 2);
      let drawEnd = Math.floor(lineHeight / 2 + h / 2);

      if (drawStart < 0) drawStart = 0;
      if (drawEnd >= h) drawEnd = h - 1;

      // Texture coordinate
      let wallX;
      if (side === 0) {
        wallX = player.y + perpWallDist * rayDirY;
      } else {
        wallX = player.x + perpWallDist * rayDirX;
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
        const fogAmount = Math.min(0.85, perpWallDist / 20);
        if (fogAmount > 0) {
          ctx.fillStyle = `rgba(8,8,20,${fogAmount})`;
          ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
        }
      }
    }

    // Render sprites
    this.renderSprites(player, entities, time);
  }

  renderSprites(player, entities, time) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * 0.66;
    const planeY = dirX * 0.66;

    // Sort entities by distance
    const sorted = entities
      .filter((e) => e.active !== false)
      .map((e) => ({
        ...e,
        dist: (player.x - e.x) ** 2 + (player.y - e.y) ** 2,
      }))
      .sort((a, b) => b.dist - a.dist);

    for (const entity of sorted) {
      const spriteX = entity.x - player.x;
      const spriteY = entity.y - player.y;

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
    const fogFactor = Math.max(0, 1 - dist / 20);

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
      // Drone
      const sphereR = bodyWidth * 0.8;
      const sphereCY = centerY - halfH * 0.05;
      // Main sphere body
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(screenX, sphereCY, sphereR, 0, Math.PI * 2);
      ctx.fill();
      // Inner glow
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(screenX, sphereCY, sphereR * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(
        screenX - sphereR * 0.25,
        sphereCY - sphereR * 0.3,
        sphereR * 0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Eye
      const blink = Math.sin(time * 0.005 + enemy.x * 10) > 0.95;
      if (!blink) {
        ctx.fillStyle = "#00ffaa";
        ctx.beginPath();
        ctx.arc(screenX, sphereCY, sphereR * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(screenX, sphereCY, sphereR * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Antenna
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, sphereCY - sphereR);
      ctx.lineTo(screenX, sphereCY - sphereR - halfH * 0.2);
      ctx.stroke();
      ctx.fillStyle = "#00ffaa";
      ctx.beginPath();
      ctx.arc(screenX, sphereCY - sphereR - halfH * 0.2, 3, 0, Math.PI * 2);
      ctx.fill();
      // Hover glow underneath
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.ellipse(
        screenX,
        bodyBottom + halfH * 0.1,
        bodyWidth * 0.5,
        halfH * 0.06,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = alpha;
    } else if (enemy.enemyType === "phantom") {
      // Phantom
      const phaseOff = Math.sin(time * 0.003 + enemy.y * 5) * bodyWidth * 0.15;
      // Ghostly body
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.moveTo(screenX - bodyWidth * 0.3 + phaseOff, bodyTop);
      ctx.quadraticCurveTo(
        screenX - bodyWidth * 1.0 + phaseOff,
        centerY,
        screenX - bodyWidth * 0.6,
        bodyBottom,
      );
      ctx.lineTo(screenX + bodyWidth * 0.6, bodyBottom);
      ctx.quadraticCurveTo(
        screenX + bodyWidth * 1.0 + phaseOff,
        centerY,
        screenX + bodyWidth * 0.3 + phaseOff,
        bodyTop,
      );
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;
      // Inner ethereal core
      ctx.fillStyle = darkColor;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.ellipse(
        screenX + phaseOff,
        centerY - halfH * 0.05,
        bodyWidth * 0.45,
        halfH * 0.25,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.globalAlpha = alpha;
      // Two hollow eyes
      ctx.fillStyle = "#cc66ff";
      ctx.beginPath();
      ctx.arc(
        screenX - bodyWidth * 0.25 + phaseOff,
        centerY - halfH * 0.1,
        bodyWidth * 0.12,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        screenX + bodyWidth * 0.25 + phaseOff,
        centerY - halfH * 0.1,
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
        centerY - halfH * 0.1,
        bodyWidth * 0.05,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
        screenX + bodyWidth * 0.25 + phaseOff,
        centerY - halfH * 0.1,
        bodyWidth * 0.05,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      // Tendrils hanging down
      ctx.strokeStyle = baseColor;
      ctx.globalAlpha = alpha * 0.4;
      ctx.lineWidth = 2;
      for (let t = 0; t < 4; t++) {
        const tx = screenX - bodyWidth * 0.45 + t * bodyWidth * 0.3;
        const tWave = Math.sin(time * 0.004 + t * 2) * bodyWidth * 0.1;
        ctx.beginPath();
        ctx.moveTo(tx, bodyBottom);
        ctx.quadraticCurveTo(
          tx + tWave,
          bodyBottom + halfH * 0.15,
          tx + tWave * 0.5,
          bodyBottom + halfH * 0.3,
        );
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      // Glitch lines
      ctx.fillStyle = `rgba(150,50,255,0.4)`;
      const glitchY = bodyTop + Math.random() * (bodyBottom - bodyTop);
      ctx.fillRect(screenX - bodyWidth - 3, glitchY, bodyWidth * 2 + 6, 2);
    } else if (enemy.enemyType === "beast") {
      // Beast
      const bW = bodyWidth * 1.4;
      const breathe = Math.sin(time * 0.006 + enemy.x * 3) * halfH * 0.015;
      const backY = centerY - halfH * 0.22 + breathe;
      const chestY = centerY - halfH * 0.28 + breathe;
      const bellyY = centerY + halfH * 0.18;
      const rumpY = centerY - halfH * 0.08 + breathe;
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
      // Neck muscles
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

        // Eye
        ctx.fillStyle = "#ff2200";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 8 * sc;
        const er = sw * 0.14;
        ctx.beginPath();
        ctx.arc(hx + sw * 0.28, hy - sh * 0.25, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Slit pupil
        ctx.fillStyle = "#000000";
        ctx.fillRect(hx + sw * 0.26, hy - sh * 0.3, er * 0.3, er * 1.2);
        // Brow ridge
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx + sw * 0.05, hy - sh * 0.45);
        ctx.lineTo(hx + sw * 0.45, hy - sh * 0.38);
        ctx.stroke();

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
        // Drool
        ctx.strokeStyle = "rgba(200,50,50,0.4)";
        ctx.lineWidth = 1;
        for (let d = 0; d < 2; d++) {
          const dx = hx + sw * 0.5 + d * sw * 0.25;
          const dLen =
            halfH * 0.04 + Math.sin(time * 0.008 + d + hx) * halfH * 0.02;
          ctx.beginPath();
          ctx.moveTo(dx, hy + sh * 0.46 + jawAmt * 0.3);
          ctx.lineTo(
            dx + Math.sin(time * 0.003 + d) * 1.5,
            hy + sh * 0.46 + jawAmt * 0.3 + dLen,
          );
          ctx.stroke();
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
        // Joint
        ctx.beginPath();
        ctx.arc(lx, ly + upperLen, legW * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Lower leg
        const offset = isRear ? -legW * 0.3 : legW * 0.3;
        ctx.beginPath();
        ctx.moveTo(lx - legW * 0.4, ly + upperLen);
        ctx.lineTo(lx + offset - legW * 0.3, pawY);
        ctx.lineTo(lx + offset + legW * 0.3, pawY);
        ctx.lineTo(lx + legW * 0.4, ly + upperLen);
        ctx.fill();
        // Paw with claws
        ctx.fillRect(lx + offset - legW * 0.6, pawY, legW * 1.2, halfH * 0.03);
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
      ctx.fillStyle = "#b0b8c0";
      ctx.beginPath();
      ctx.moveTo(0, -halfH * 0.06);
      ctx.lineTo(swordLen, 0);
      ctx.lineTo(0, halfH * 0.06);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(1, -halfH * 0.04);
      ctx.lineTo(swordLen * 0.9, 0);
      ctx.stroke();
      // Cross guard
      ctx.fillStyle = "#665544";
      ctx.fillRect(-3, -halfH * 0.08, 6, halfH * 0.16);
      ctx.restore();
      // Spines
      ctx.fillStyle = baseColor;
      for (let sp = 0; sp < 5; sp++) {
        const t = sp / 4; // 0 to 1 along the back
        const sx = screenX - bW * 0.6 + t * bW * 1.0;
        // Interpolate Y along back curve (rump to chest)
        const backCurveY =
          rumpY +
          (backY - rumpY) * t +
          breathe -
          Math.sin(t * Math.PI) * halfH * 0.04;
        const spH = halfH * (0.05 + Math.sin(sp * 1.5 + time * 0.003) * 0.015);
        ctx.beginPath();
        ctx.moveTo(sx - 2, backCurveY);
        ctx.lineTo(sx, backCurveY - spH);
        ctx.lineTo(sx + 2, backCurveY);
        ctx.fill();
      }
    } else if (enemy.enemyType === "boss") {
      // ─── Paradox Lord ───
      const bW = bodyWidth * 1.15;
      const bTop = bodyTop - halfH * 0.12;
      const bBot = bodyBottom + halfH * 0.05;
      const torsoH = bBot - bTop;
      const breathe = Math.sin(time * 0.002) * halfH * 0.015;
      const pulse = (Math.sin(time * 0.004) + 1) * 0.5;

      // Dark aura
      ctx.save();
      const auraR = bW * 1.8 + pulse * bW * 0.3;
      const auraGrad = ctx.createRadialGradient(
        screenX,
        centerY,
        bW * 0.3,
        screenX,
        centerY,
        auraR,
      );
      auraGrad.addColorStop(0, "rgba(80,0,30,0.15)");
      auraGrad.addColorStop(0.6, "rgba(40,0,15,0.06)");
      auraGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(screenX, centerY, auraR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Shadow/cape mass behind body
      ctx.fillStyle = "#0a0004";
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

      // Main body
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.85, bTop + breathe);
      ctx.lineTo(screenX - bW, bTop + torsoH * 0.15 + breathe);
      ctx.lineTo(screenX - bW * 0.95, bBot);
      ctx.lineTo(screenX + bW * 0.95, bBot);
      ctx.lineTo(screenX + bW, bTop + torsoH * 0.15 + breathe);
      ctx.lineTo(screenX + bW * 0.85, bTop + breathe);
      ctx.closePath();
      ctx.fill();

      // Chest armor plate
      ctx.fillStyle = baseColor;
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
      ctx.strokeStyle = hitFlash ? "#ff8888" : "#660033";
      ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ry = bTop + torsoH * (0.2 + r * 0.12) + breathe;
        ctx.beginPath();
        ctx.moveTo(screenX - bW * 0.7, ry);
        ctx.lineTo(screenX + bW * 0.7, ry);
        ctx.stroke();
      }
      // Center chest seam
      ctx.strokeStyle = hitFlash ? "#ff8888" : "#880044";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(screenX, bTop + torsoH * 0.08 + breathe);
      ctx.lineTo(screenX, bBot - torsoH * 0.1);
      ctx.stroke();

      // Chest energy core
      const coreY = bTop + torsoH * 0.3 + breathe;
      const coreR = bW * 0.12 + pulse * bW * 0.04;
      ctx.shadowColor = "#ff0044";
      ctx.shadowBlur = 15 * (0.5 + pulse * 0.5);
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
      ctx.shadowBlur = 0;

      // Shoulder pauldrons with spikes
      const drawPauldron = (side) => {
        const sx = screenX + side * bW * 0.85;
        const sy = bTop + torsoH * 0.05 + breathe;
        const pW = bW * 0.4;
        const pH = torsoH * 0.25;
        // Base plate
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(sx + side * pW * 0.2, sy + pH * 0.4, pW * 0.55, 0, Math.PI * 2);
        ctx.fill();
        // Outer armor shell
        ctx.fillStyle = baseColor;
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
        ctx.strokeStyle = hitFlash ? "#ffcccc" : "#aa0055";
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
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#550028";
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
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        screenX - bW * 0.2,
        headTop + headH * 0.7,
        bW * 0.4,
        torsoH * 0.15,
      );
      // Skull shape
      ctx.fillStyle = darkColor;
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
      ctx.fillStyle = baseColor;
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
      ctx.strokeStyle = hitFlash ? "#ffcccc" : "#880044";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headCX, headCY - headH * 0.5);
      ctx.lineTo(headCX, headCY + headH * 0.15);
      ctx.stroke();

      // Horns
      const drawHorn = (side, length, curve, thickness) => {
        const hx = headCX + side * headW * 0.5;
        const hy = headCY - headH * 0.35;
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#440020";
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
        ctx.strokeStyle = hitFlash ? "#ff8888" : "#330015";
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
        // Glowing tip
        ctx.shadowColor = "#ff0044";
        ctx.shadowBlur = 6;
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
        ctx.shadowBlur = 0;
      };
      drawHorn(-1, halfH * 0.35, 0.7, 3);
      drawHorn(1, halfH * 0.35, 0.7, 3);
      // Center horn (taller)
      const chx = headCX;
      const chy = headCY - headH * 0.45;
      ctx.fillStyle = hitFlash ? "#ffaaaa" : "#550028";
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
      ctx.shadowColor = "#ff0044";
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(255,0,68,${0.5 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(chx, chy - halfH * 0.45, 2.5 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

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
        // Eye glow
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 10 + pulse * 8;
        ctx.fillStyle = `rgba(255,0,0,${0.7 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, sw, sh, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
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

      // Jaw / mouth
      const jawY = headCY + headH * 0.2;
      const jawOpen = 1.5 + Math.sin(time * 0.003) * 1.5;
      // Upper jaw
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(headCX - headW * 0.5, jawY);
      ctx.lineTo(headCX - headW * 0.55, jawY + headH * 0.15);
      ctx.lineTo(headCX + headW * 0.55, jawY + headH * 0.15);
      ctx.lineTo(headCX + headW * 0.5, jawY);
      ctx.fill();
      // Lower jaw
      ctx.fillStyle = hitFlash ? "#ffaaaa" : "#220010";
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
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = bW * 0.22;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(shX, shY);
        ctx.quadraticCurveTo(elbX, elbY, handX, handY);
        ctx.stroke();
        // Armor on upper arm
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = bW * 0.15;
        ctx.beginPath();
        ctx.moveTo(shX, shY + torsoH * 0.05);
        ctx.lineTo(elbX * 0.7 + shX * 0.3, (shY + elbY) * 0.5);
        ctx.stroke();
        // Elbow spike
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#550028";
        ctx.beginPath();
        ctx.moveTo(elbX, elbY - bW * 0.05);
        ctx.lineTo(elbX + side * bW * 0.2, elbY - halfH * 0.08);
        ctx.lineTo(elbX, elbY + bW * 0.05);
        ctx.fill();
        // Forearm armor
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = bW * 0.13;
        ctx.beginPath();
        ctx.moveTo(elbX, elbY);
        ctx.lineTo((elbX + handX) * 0.5, (elbY + handY) * 0.5);
        ctx.stroke();
        // Clawed hand
        ctx.fillStyle = darkColor;
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
      ctx.fillStyle = hitFlash ? "#666666" : "#1a000a";
      ctx.fillRect(
        screenX - bW * 0.85,
        bBot - torsoH * 0.12,
        bW * 1.7,
        torsoH * 0.08,
      );
      // Buckle
      ctx.fillStyle = baseColor;
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
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(hipX - legW, hipY);
        ctx.lineTo(kneeX - legW * 0.8, kneeY);
        ctx.lineTo(kneeX + legW * 0.8, kneeY);
        ctx.lineTo(hipX + legW, hipY);
        ctx.fill();
        // Knee armor
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(kneeX, kneeY, legW * 0.7, 0, Math.PI * 2);
        ctx.fill();
        // Knee spike
        ctx.fillStyle = hitFlash ? "#ffaaaa" : "#550028";
        ctx.beginPath();
        ctx.moveTo(kneeX + side * legW * 0.4, kneeY - legW * 0.3);
        ctx.lineTo(kneeX + side * legW * 1.2, kneeY);
        ctx.lineTo(kneeX + side * legW * 0.4, kneeY + legW * 0.3);
        ctx.fill();
        // Shin
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(kneeX - legW * 0.7, kneeY);
        ctx.lineTo(footX - legW * 0.9, footY);
        ctx.lineTo(footX + legW * 0.9, footY);
        ctx.lineTo(kneeX + legW * 0.7, kneeY);
        ctx.fill();
        // Shin guard
        ctx.fillStyle = baseColor;
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
      for (let s = 0; s < 5; s++) {
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
      // Glowing eyes behind visor slit
      ctx.fillStyle = "#aaddff";
      ctx.shadowColor = "#88bbff";
      ctx.shadowBlur = 8;
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
      ctx.shadowBlur = 0;
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
      // Triangular body
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
      // Eye
      ctx.fillStyle = "#00ff66";
      const eyeSize2 = gW * 0.3;
      ctx.fillRect(
        screenX - eyeSize2 / 2 + glitchOff,
        centerY - eyeSize2 / 2,
        eyeSize2,
        eyeSize2,
      );
      // Glitch static lines
      ctx.fillStyle = "#00ff44";
      ctx.globalAlpha = alpha * 0.5;
      for (let g = 0; g < 4; g++) {
        const gy = gTop + Math.random() * (gBot - gTop);
        const gx = (Math.random() - 0.5) * bodyWidth * 0.4;
        ctx.fillRect(screenX - gW + gx, gy, gW * 2, 1);
      }
      ctx.globalAlpha = alpha;
      // No legs - it floats/glitches
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
    const y = centerY + sprHeight * 0.15 + bob;

    // Glow
    ctx.globalAlpha = fog * 0.4;
    ctx.fillStyle = color;
    ctx.fillRect(screenX - size * 0.8, y - size * 0.8, size * 1.6, size * 1.6);

    // Core
    ctx.globalAlpha = fog;
    ctx.fillStyle = color;
    ctx.fillRect(screenX - size / 2, y - size / 2, size, size);

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
    // Soft glow
    ctx.globalAlpha = fog * 0.3;
    ctx.fillStyle = "#00ff44";
    ctx.beginPath();
    ctx.arc(screenX, y, size * 1.2, 0, Math.PI * 2);
    ctx.fill();
    // Background
    ctx.globalAlpha = fog;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(screenX - size * 0.6, y - size * 0.6, size * 1.2, size * 1.2);
    // Red cross
    const crossT = size * 0.22;
    ctx.fillStyle = "#ff2222";
    ctx.fillRect(screenX - crossT / 2, y - size * 0.45, crossT, size * 0.9);
    ctx.fillRect(screenX - size * 0.45, y - crossT / 2, size * 0.9, crossT);
    // Border
    ctx.strokeStyle = "#00cc44";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      screenX - size * 0.6,
      y - size * 0.6,
      size * 1.2,
      size * 1.2,
    );
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
    const pulse = 0.7 + Math.sin(time * 0.005) * 0.3;

    ctx.globalAlpha = fog * pulse * 0.6;
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(screenX - size, centerY - size * 1.5, size * 2, size * 3);

    ctx.globalAlpha = fog * pulse;
    ctx.fillStyle = "#aaffdd";
    ctx.fillRect(
      screenX - size * 0.6,
      centerY - size * 1.2,
      size * 1.2,
      size * 2.4,
    );

    ctx.globalAlpha = 1;
  }

  drawProjectile(ctx, screenX, centerY, sprWidth, dist, entity, time, fog) {
    if (fog <= 0) return;
    const size = Math.max(3, sprWidth * 0.15);
    const color = entity.color || "#ff0044";

    ctx.globalAlpha = fog * 0.7;
    ctx.fillStyle = color;
    ctx.fillRect(
      screenX - size * 1.5,
      centerY - size * 1.5,
      size * 3,
      size * 3,
    );

    ctx.globalAlpha = fog;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(screenX - size / 2, centerY - size / 2, size, size);

    ctx.globalAlpha = 1;
  }
}
