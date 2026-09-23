export function renderTemporalSummoner(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
      // Temporal Summoner (polished)
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

      // Rim lighting — right edge (mystical purple tint)
      const rimGrad = ctx.createLinearGradient(
        screenX + tsW * 0.4, tsTop + hover,
        screenX + tsW * 1.05, tsBot + hover
      );
      rimGrad.addColorStop(0, "rgba(180,150,255,0)");
      rimGrad.addColorStop(0.5, "rgba(180,150,255,0.10)");
      rimGrad.addColorStop(0.85, "rgba(200,170,255,0.18)");
      rimGrad.addColorStop(1, "rgba(220,190,255,0.08)");
      ctx.fillStyle = rimGrad;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(screenX - tsW * 0.52, tsTop + halfH * 0.14 + hover);
      ctx.quadraticCurveTo(screenX, tsTop + halfH * 0.05 + hover, screenX + tsW * 0.52, tsTop + halfH * 0.14 + hover);
      ctx.lineTo(screenX + tsW * 1.05, tsBot + hover);
      ctx.lineTo(screenX - tsW * 1.05, tsBot + hover);
      ctx.closePath();
      ctx.fill();

      // Shadow gradient — left edge (deep darkness)
      const shadowGrad = ctx.createLinearGradient(
        screenX - tsW * 1.05, tsBot + hover,
        screenX - tsW * 0.2, tsTop + hover
      );
      shadowGrad.addColorStop(0, "rgba(15,5,30,0.22)");
      shadowGrad.addColorStop(0.4, "rgba(25,10,50,0.14)");
      shadowGrad.addColorStop(0.75, "rgba(40,15,60,0.06)");
      shadowGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = shadowGrad;
      ctx.globalAlpha = alpha;
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
}
