export function renderGlitchling(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
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
}
