export function renderCorruptCop(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
      // Corrupt Cop
      const copW = bodyWidth * 0.75;
      const torsoH = bodyBottom - bodyTop;
      // Body
      ctx.fillStyle = "#cc8800";
      ctx.fillRect(screenX - copW, bodyTop, copW * 2, torsoH);

      // Rim light (right edge highlight for pseudo-3D depth)
      const rimGrad = ctx.createLinearGradient(screenX + copW * 0.4, 0, screenX + copW, 0);
      rimGrad.addColorStop(0, 'transparent');
      rimGrad.addColorStop(1, `rgba(255,220,160,${hitFlash ? 0.5 : 0.2})`);
      ctx.fillStyle = rimGrad;
      ctx.fillRect(screenX - copW, bodyTop, copW * 2, torsoH);

      // Shadow gradient (left edge for depth)
      const shdGrad = ctx.createLinearGradient(screenX - copW, 0, screenX - copW * 0.2, 0);
      shdGrad.addColorStop(0, 'rgba(0,0,0,0.28)');
      shdGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shdGrad;
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
          torsoH * 0.12
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
}
