import { drawGlow, drawTechLines } from "../draw-utils.js";

export function renderDrone(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
      // Drone (Enhanced hovering combat sphere)
      const sphereR = bodyWidth * 0.8;
      const sphereCY = centerY - halfH * 0.05;
      const dronePulse = Math.sin(time * 0.004 + enemy.x * 3);
      const hover = Math.sin(time * 0.005 + enemy.y * 2) * halfH * 0.01;

      // Outer energy field (Procedural Glow)
      const gStr = def.glowStrength || 0.15;
      drawGlow(ctx, screenX, sphereCY + hover, sphereR * 1.5, baseColor, gStr + dronePulse * 0.05);

      // Tech Grid Overlay (Procedural sharpness)
      const tOpac = def.techLineOpacity || 0.3;
      drawTechLines(ctx, screenX - sphereR, sphereCY + hover - sphereR, sphereR * 2, sphereR * 2, baseColor, tOpac);

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
      ctx.arc(screenX, sphereCY + hover, sphereR * 0.45, 0, Math.PI * 2);
      ctx.stroke();

      // Core "Sharp" Eye
      const eyeColor = hitFlash ? "#ffffff" : "#ff0044";
      drawGlow(ctx, screenX, sphereCY + hover, sphereR * 0.35, eyeColor, 0.6);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.rect(screenX - 1, sphereCY + hover - sphereR * 0.1, 2, sphereR * 0.2);
      ctx.fill();
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
}
