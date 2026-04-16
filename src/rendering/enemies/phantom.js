import { drawGlow } from "../draw-utils.js";

export function renderPhantom(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
      // Phantom (Enhanced ethereal wraith)
      const phaseOff = Math.sin(time * 0.003 + enemy.y * 5) * bodyWidth * 0.15;
      const drift = Math.sin(time * 0.002 + enemy.x * 3) * halfH * 0.01;
      const phantomPulse = (Math.sin(time * 0.004 + enemy.y * 2) + 1) * 0.5;

      // Outer ethereal aura (Procedural Glow)
      drawGlow(ctx, screenX + phaseOff, centerY + drift, bodyWidth * 1.5, baseColor, 0.2 * phantomPulse);
      
      // Secondary aura
      drawGlow(ctx, screenX - phaseOff, centerY - drift, bodyWidth * 1.2, "#ffffff", 0.05);

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

      const tsW = bodyWidth * 0.82;
      const tsTop = centerY - halfH * 0.52;

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
        ctx.ellipse(
          rx,
          ry,
          tsW * 0.06,
          tsW * 0.02,
          ra + time * 0.0012,
          0,
          Math.PI * 2,
        );
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
}
