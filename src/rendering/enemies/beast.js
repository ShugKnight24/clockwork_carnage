import { drawGlow, drawTechLines } from "../draw-utils.js";

export function renderBeast(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
      // Beast (Cerberus)
      const bW = bodyWidth * 1.4;
      const breathe = Math.sin(time * 0.006 + enemy.x * 3) * halfH * 0.015;
      const backY = centerY - halfH * 0.22 + breathe;
      const chestY = centerY - halfH * 0.28 + breathe;
      const bellyY = centerY + halfH * 0.18;
      const rumpY = centerY - halfH * 0.08 + breathe;

      // Ground shadow (Procedural Glow as shadow)
      drawGlow(ctx, screenX, bellyY + halfH * 0.28, bW * 0.9, "rgba(0,0,0,0.4)", 0.6);

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

      // Rim light (right edge for pseudo-3D depth)
      const rimGrad = ctx.createLinearGradient(screenX + bW * 0.3, 0, screenX + bW * 0.75, 0);
      rimGrad.addColorStop(0, 'transparent');
      rimGrad.addColorStop(1, `rgba(255,180,120,${hitFlash ? 0.5 : 0.15})`);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.85, bellyY + halfH * 0.05);
      ctx.quadraticCurveTo(screenX - bW * 0.7, rumpY - halfH * 0.06, screenX - bW * 0.4, backY);
      ctx.quadraticCurveTo(screenX, backY - halfH * 0.08, screenX + bW * 0.3, chestY);
      ctx.quadraticCurveTo(screenX + bW * 0.55, chestY - halfH * 0.02, screenX + bW * 0.65, chestY + halfH * 0.03);
      ctx.quadraticCurveTo(screenX + bW * 0.72, chestY + halfH * 0.12, screenX + bW * 0.68, bellyY - halfH * 0.02);
      ctx.quadraticCurveTo(screenX + bW * 0.65, bellyY + halfH * 0.06, screenX + bW * 0.55, bellyY + halfH * 0.08);
      ctx.quadraticCurveTo(screenX + bW * 0.2, bellyY + halfH * 0.12, screenX - bW * 0.3, bellyY + halfH * 0.08);
      ctx.quadraticCurveTo(screenX - bW * 0.6, bellyY + halfH * 0.06, screenX - bW * 0.85, bellyY + halfH * 0.05);
      ctx.closePath();
      ctx.fill();

      // Shadow gradient (left edge)
      const shdGrad = ctx.createLinearGradient(screenX - bW * 0.9, 0, screenX - bW * 0.2, 0);
      shdGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
      shdGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shdGrad;
      ctx.beginPath();
      ctx.moveTo(screenX - bW * 0.85, bellyY + halfH * 0.05);
      ctx.quadraticCurveTo(screenX - bW * 0.7, rumpY - halfH * 0.06, screenX - bW * 0.4, backY);
      ctx.quadraticCurveTo(screenX, backY - halfH * 0.08, screenX + bW * 0.3, chestY);
      ctx.quadraticCurveTo(screenX + bW * 0.55, chestY - halfH * 0.02, screenX + bW * 0.65, chestY + halfH * 0.03);
      ctx.quadraticCurveTo(screenX + bW * 0.72, chestY + halfH * 0.12, screenX + bW * 0.68, bellyY - halfH * 0.02);
      ctx.quadraticCurveTo(screenX + bW * 0.65, bellyY + halfH * 0.06, screenX + bW * 0.55, bellyY + halfH * 0.08);
      ctx.quadraticCurveTo(screenX + bW * 0.2, bellyY + halfH * 0.12, screenX - bW * 0.3, bellyY + halfH * 0.08);
      ctx.quadraticCurveTo(screenX - bW * 0.6, bellyY + halfH * 0.06, screenX - bW * 0.85, bellyY + halfH * 0.05);
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
      // Ribcage lines (Enhanced with procedural tech-lines)
      drawTechLines(ctx, screenX - bW * 0.1, backY, bW * 0.45, bellyY - backY, baseColor);
      
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
}
