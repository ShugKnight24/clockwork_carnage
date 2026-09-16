export function renderShieldCommander(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
      // Shield Commander (polished)
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

      // Rim light (right edge highlight)
      const rimGrad = ctx.createLinearGradient(screenX + scW * 0.3, 0, screenX + scW, 0);
      rimGrad.addColorStop(0, 'transparent');
      rimGrad.addColorStop(1, `rgba(255,200,150,${hitFlash ? 0.5 : 0.18})`);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.roundRect(screenX - scW, scTop + breathe, scW * 2, scBot - scTop, scW * 0.12);
      ctx.fill();

      // Shadow gradient (left edge)
      const shdGrad = ctx.createLinearGradient(screenX - scW, 0, screenX - scW * 0.3, 0);
      shdGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
      shdGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shdGrad;
      ctx.beginPath();
      ctx.roundRect(screenX - scW, scTop + breathe, scW * 2, scBot - scTop, scW * 0.12);
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
}
