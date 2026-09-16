export function renderSentinel(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const def = enemy.def;
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
      // Rim light (right edge highlight for pseudo-3D depth)
      const rimGrad = ctx.createLinearGradient(screenX + sentW * 0.4, 0, screenX + sentW * 0.95, 0);
      rimGrad.addColorStop(0, 'transparent');
      rimGrad.addColorStop(1, `rgba(255,200,150,${hitFlash ? 0.5 : 0.18})`);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.moveTo(screenX - sentW, sentTop + sentH * 0.08);
      ctx.lineTo(screenX - sentW * 0.5, sentTop);
      ctx.lineTo(screenX + sentW * 0.5, sentTop);
      ctx.lineTo(screenX + sentW, sentTop + sentH * 0.08);
      ctx.lineTo(screenX + sentW * 0.9, sentBot);
      ctx.lineTo(screenX - sentW * 0.9, sentBot);
      ctx.closePath();
      ctx.fill();
      // Shadow gradient (left edge for depth)
      const shdGrad = ctx.createLinearGradient(screenX - sentW * 0.95, 0, screenX - sentW * 0.3, 0);
      shdGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
      shdGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shdGrad;
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
}
