export function renderChronoBomber(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
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

      // Rim light (right edge highlight for pseudo-3D depth)
      const rimGrad = ctx.createLinearGradient(screenX + cbW * 0.4, 0, screenX + cbW, 0);
      rimGrad.addColorStop(0, 'transparent');
      rimGrad.addColorStop(1, `rgba(255,200,150,${hitFlash ? 0.5 : 0.18})`);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.roundRect(screenX - cbW, cbTop, cbW * 2, cbBot - cbTop, cbW * 0.1);
      ctx.fill();

      // Shadow gradient (left edge)
      const shdGrad = ctx.createLinearGradient(screenX - cbW, 0, screenX - cbW * 0.3, 0);
      shdGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
      shdGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shdGrad;
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
}
