/**
 * Procedural cutscene character and set-piece art, keyed by the `art` field of
 * a cutscene frame or flipbook panel. Pure canvas drawing: no engine state.
 * Split out of js/cutscene.js, which keeps timing, text and panel layout.
 */

import { drawSvgArt } from "./svg-art/index.js";

export function drawCutsceneArt(ctx, w, h, art, t, isTouchDevice = false) {
  const cx = w / 2;
  const cy = h * 0.38;
  ctx.save();
  ctx.translate(cx, cy);

  // Base scale: proportional to screen — characters fill the scene
  const rawBaseScale = 2.0 * (h / 900);
  const baseScale = isTouchDevice
    ? Math.max(1.64, rawBaseScale)
    : rawBaseScale;
  ctx.scale(baseScale, baseScale);

  // Vector models win when one exists and has decoded; procedural art below
  // stays as the fallback for the first frames and for keys without a model.
  if (drawSvgArt(ctx, art, t)) {
    ctx.restore();
    return;
  }

  switch (art) {
    case "villain":
    case "villain_form2":
    case "villain_final": {
      const phase = art === "villain_final" ? 3 : art === "villain_form2" ? 2 : 1;
      drawParadoxAbomination(ctx, t, phase);
      break;
    }
    case "hero": {
      // Armored temporal agent — adult proportions (tall torso, long legs)
      const fadeIn = Math.min(1, t / 1.2);
      const scale = 0.9 + fadeIn * 0.1;
      ctx.scale(scale, scale);
      ctx.globalAlpha = fadeIn;

      // Glow aura
      const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
      glowGrad.addColorStop(0, "rgba(0,255,200,0.15)");
      glowGrad.addColorStop(1, "rgba(0,255,200,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(-120, -120, 240, 240);

      // Cape (shoulder-length, not floor-length)
      ctx.fillStyle = "#6b1515";
      ctx.beginPath();
      ctx.moveTo(-16, -30);
      ctx.quadraticCurveTo(-26, 0, -22 + Math.sin(t * 2) * 3, 30);
      ctx.lineTo(-10 + Math.sin(t * 1.8) * 2, 28);
      ctx.quadraticCurveTo(-8, -5, -10, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7a1818";
      ctx.beginPath();
      ctx.moveTo(-10, -30);
      ctx.quadraticCurveTo(-4, 5, 0 + Math.sin(t * 2.2) * 2, 32);
      ctx.lineTo(12 + Math.sin(t * 1.9) * 2, 30);
      ctx.quadraticCurveTo(8, 0, 4, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5c1212";
      ctx.beginPath();
      ctx.moveTo(4, -30);
      ctx.quadraticCurveTo(18, -2, 20 + Math.sin(t * 2.4) * 3, 28);
      ctx.lineTo(22 + Math.sin(t * 2.1) * 2, 26);
      ctx.quadraticCurveTo(20, -6, 14, -30);
      ctx.closePath();
      ctx.fill();

      // Torso (wide, tall — adult proportions)
      ctx.fillStyle = "#2a3a4a";
      ctx.beginPath();
      ctx.moveTo(-14, -38);
      ctx.lineTo(-16, 12);
      ctx.lineTo(16, 12);
      ctx.lineTo(14, -38);
      ctx.closePath();
      ctx.fill();

      // Chest plate (broad)
      ctx.fillStyle = "#334455";
      ctx.beginPath();
      ctx.moveTo(-10, -36);
      ctx.quadraticCurveTo(0, -30, 10, -36);
      ctx.lineTo(9, -16);
      ctx.quadraticCurveTo(0, -13, -9, -16);
      ctx.closePath();
      ctx.fill();

      // Pec detail lines
      ctx.strokeStyle = "#446688";
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = fadeIn * 0.4;
      ctx.beginPath();
      ctx.moveTo(-8, -30);
      ctx.quadraticCurveTo(-3, -27, 0, -30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.quadraticCurveTo(3, -27, 8, -30);
      ctx.stroke();
      ctx.globalAlpha = fadeIn;

      // Abs detail lines
      ctx.strokeStyle = "#446688";
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = fadeIn * 0.3;
      for (let i = 0; i < 4; i++) {
        const ay = -12 + i * 5;
        ctx.beginPath();
        ctx.moveTo(-7, ay);
        ctx.lineTo(7, ay);
        ctx.stroke();
      }
      ctx.globalAlpha = fadeIn;

      // Belt
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(-15, 8, 30, 4);
      ctx.fillStyle = "#00aacc";
      ctx.fillRect(-3, 9, 6, 2);

      // Collar
      ctx.fillStyle = "#3a4a5a";
      ctx.beginPath();
      ctx.moveTo(-14, -38);
      ctx.quadraticCurveTo(0, -34, 14, -38);
      ctx.lineTo(12, -41);
      ctx.quadraticCurveTo(0, -37, -12, -41);
      ctx.closePath();
      ctx.fill();

      // Shoulder pauldrons (large, curved)
      ctx.fillStyle = "#3a4a5a";
      ctx.beginPath();
      ctx.arc(-18, -36, 10, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18, -36, 10, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#556688";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-18, -36, 10, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(18, -36, 10, Math.PI, 0);
      ctx.stroke();

      // Neck
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(-5, -46, 10, 8);

      // Helmet (shaped, not just a circle)
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.moveTo(-10, -48);
      ctx.quadraticCurveTo(-13, -56, -10, -64);
      ctx.quadraticCurveTo(0, -69, 10, -64);
      ctx.quadraticCurveTo(13, -56, 10, -48);
      ctx.quadraticCurveTo(0, -45, -10, -48);
      ctx.closePath();
      ctx.fill();

      // Helmet ridge
      ctx.strokeStyle = "#334466";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, -66);
      ctx.quadraticCurveTo(0, -70, 5, -66);
      ctx.stroke();

      // Visor (curved, glowing)
      ctx.fillStyle = "#00aadd";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-8, -57);
      ctx.quadraticCurveTo(-10, -53, -7, -50);
      ctx.quadraticCurveTo(0, -48, 7, -50);
      ctx.quadraticCurveTo(10, -53, 8, -57);
      ctx.quadraticCurveTo(0, -59, -8, -57);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#00ddff";
      ctx.globalAlpha = fadeIn * 0.3;
      ctx.beginPath();
      ctx.moveTo(-6, -56);
      ctx.quadraticCurveTo(0, -58, 6, -56);
      ctx.quadraticCurveTo(4, -53, 0, -52);
      ctx.quadraticCurveTo(-4, -53, -6, -56);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = fadeIn;
      ctx.shadowBlur = 0;

      // Upper arms
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.moveTo(-18, -30);
      ctx.quadraticCurveTo(-22, -18, -20, -6);
      ctx.lineTo(-15, -6);
      ctx.quadraticCurveTo(-14, -18, -14, -30);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, -30);
      ctx.quadraticCurveTo(22, -18, 20, -6);
      ctx.lineTo(15, -6);
      ctx.quadraticCurveTo(14, -18, 14, -30);
      ctx.closePath();
      ctx.fill();

      // Forearms
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(-21, -6, 6, 16);
      ctx.fillRect(15, -6, 6, 16);
      ctx.fillStyle = "#243d50";
      ctx.fillRect(-20, 0, 4, 5);
      ctx.fillRect(16, 0, 4, 5);

      // Fists
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(-18, 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18, 12, 3, 0, Math.PI * 2);
      ctx.fill();

      // Legs (long — adult proportions)
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(-11, 12, 9, 32);
      ctx.fillRect(2, 12, 9, 32);
      // Knee detail
      ctx.fillStyle = "#243d50";
      ctx.fillRect(-10, 24, 7, 4);
      ctx.fillRect(3, 24, 7, 4);
      // Shin armor stripe
      ctx.fillStyle = "#2a4055";
      ctx.fillRect(-9, 32, 5, 6);
      ctx.fillRect(4, 32, 5, 6);

      // Boots
      ctx.fillStyle = "#111a22";
      ctx.fillRect(-12, 42, 10, 6);
      ctx.fillRect(2, 42, 10, 6);

      ctx.globalAlpha = 1;
      break;
    }

    case "hero_armed": {
      // Armed temporal agent — adult proportions, rifle in hand
      const fadeIn = Math.min(1, t / 0.8);
      ctx.globalAlpha = fadeIn;

      // Glow
      const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
      glowGrad.addColorStop(0, "rgba(0,255,200,0.2)");
      glowGrad.addColorStop(1, "rgba(0,255,200,0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(-120, -120, 240, 240);

      // Cape (shoulder-length, dramatic flow)
      ctx.fillStyle = "#8b1a1a";
      ctx.beginPath();
      ctx.moveTo(-16, -30);
      ctx.quadraticCurveTo(-30, 2, -26 + Math.sin(t * 2.5) * 4, 34);
      ctx.lineTo(-12 + Math.sin(t * 2) * 2, 32);
      ctx.quadraticCurveTo(-10, -3, -10, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#9a1e1e";
      ctx.beginPath();
      ctx.moveTo(-10, -30);
      ctx.quadraticCurveTo(-2, 6, 2 + Math.sin(t * 2.3) * 3, 36);
      ctx.lineTo(14 + Math.sin(t * 2.1) * 2, 34);
      ctx.quadraticCurveTo(10, 2, 4, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6b1515";
      ctx.beginPath();
      ctx.moveTo(4, -30);
      ctx.quadraticCurveTo(20, 0, 24 + Math.sin(t * 2.6) * 4, 32);
      ctx.lineTo(26 + Math.sin(t * 2.2) * 2, 30);
      ctx.quadraticCurveTo(22, -4, 14, -30);
      ctx.closePath();
      ctx.fill();

      // Torso (wide, tall)
      ctx.fillStyle = "#2a3a4a";
      ctx.beginPath();
      ctx.moveTo(-14, -38);
      ctx.lineTo(-16, 12);
      ctx.lineTo(16, 12);
      ctx.lineTo(14, -38);
      ctx.closePath();
      ctx.fill();

      // Chest plate
      ctx.fillStyle = "#334455";
      ctx.beginPath();
      ctx.moveTo(-10, -36);
      ctx.quadraticCurveTo(0, -30, 10, -36);
      ctx.lineTo(9, -16);
      ctx.quadraticCurveTo(0, -13, -9, -16);
      ctx.closePath();
      ctx.fill();

      // Belt
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(-15, 8, 30, 4);
      ctx.fillStyle = "#00aacc";
      ctx.fillRect(-3, 9, 6, 2);

      // Collar
      ctx.fillStyle = "#3a4a5a";
      ctx.beginPath();
      ctx.moveTo(-14, -38);
      ctx.quadraticCurveTo(0, -34, 14, -38);
      ctx.lineTo(12, -41);
      ctx.quadraticCurveTo(0, -37, -12, -41);
      ctx.closePath();
      ctx.fill();

      // Pauldrons
      ctx.fillStyle = "#3a4a5a";
      ctx.beginPath();
      ctx.arc(-18, -36, 10, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(18, -36, 10, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#556688";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-18, -36, 10, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(18, -36, 10, Math.PI, 0);
      ctx.stroke();

      // Neck
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(-5, -46, 10, 8);

      // Helmet
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.moveTo(-10, -48);
      ctx.quadraticCurveTo(-13, -56, -10, -64);
      ctx.quadraticCurveTo(0, -69, 10, -64);
      ctx.quadraticCurveTo(13, -56, 10, -48);
      ctx.quadraticCurveTo(0, -45, -10, -48);
      ctx.closePath();
      ctx.fill();

      // Helmet ridge
      ctx.strokeStyle = "#334466";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, -66);
      ctx.quadraticCurveTo(0, -70, 5, -66);
      ctx.stroke();

      // Visor
      ctx.fillStyle = "#00aadd";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(-8, -57);
      ctx.quadraticCurveTo(-10, -53, -7, -50);
      ctx.quadraticCurveTo(0, -48, 7, -50);
      ctx.quadraticCurveTo(10, -53, 8, -57);
      ctx.quadraticCurveTo(0, -59, -8, -57);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Left arm (at side)
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.moveTo(-18, -30);
      ctx.quadraticCurveTo(-22, -18, -20, -6);
      ctx.lineTo(-15, -6);
      ctx.quadraticCurveTo(-14, -18, -14, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-21, -6, 6, 16);
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(-18, 12, 3, 0, Math.PI * 2);
      ctx.fill();

      // Right arm + Rifle (held forward)
      ctx.fillStyle = "#1a2a3a";
      ctx.save();
      ctx.translate(18, -30);
      ctx.rotate(-0.3);
      // Upper arm
      ctx.fillRect(-3, 0, 7, 18);
      // Forearm + hand
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(0.5, 20, 3, 0, Math.PI * 2);
      ctx.fill();
      // Rifle
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(-2, 17, 36, 6);
      // Barrel
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(30, 18, 12, 4);
      // Magazine
      ctx.fillStyle = "#1a3a4a";
      ctx.fillRect(8, 23, 6, 10);
      // Muzzle glow
      ctx.fillStyle = "#00ccff";
      ctx.shadowColor = "#00ccff";
      ctx.shadowBlur = 10;
      ctx.fillRect(40, 18.5, 4, 3);
      ctx.shadowBlur = 0;
      // Rail
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(2, 16, 28, 2);
      ctx.restore();

      // Legs (long)
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(-11, 12, 9, 32);
      ctx.fillRect(2, 12, 9, 32);
      ctx.fillStyle = "#243d50";
      ctx.fillRect(-10, 24, 7, 4);
      ctx.fillRect(3, 24, 7, 4);

      // Boots
      ctx.fillStyle = "#111a22";
      ctx.fillRect(-12, 42, 10, 6);
      ctx.fillRect(2, 42, 10, 6);

      ctx.globalAlpha = 1;
      break;
    }

    case "hero_human": {
      // Unarmored agent in casual work clothes — adult male proportions
      const fadeIn = Math.min(1, t / 1.0);
      ctx.globalAlpha = fadeIn;

      // Hair (short, dark)
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.moveTo(-9, -62);
      ctx.quadraticCurveTo(-12, -68, -8, -72);
      ctx.quadraticCurveTo(0, -76, 8, -72);
      ctx.quadraticCurveTo(12, -68, 9, -62);
      ctx.closePath();
      ctx.fill();

      // Head (skin tone)
      ctx.fillStyle = "#c8956c";
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.quadraticCurveTo(-10, -56, -8, -64);
      ctx.quadraticCurveTo(0, -68, 8, -64);
      ctx.quadraticCurveTo(10, -56, 8, -48);
      ctx.quadraticCurveTo(0, -45, -8, -48);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-5, -58, 4, 3);
      ctx.fillRect(1, -58, 4, 3);
      ctx.fillStyle = "#2a4a3a";
      ctx.fillRect(-4, -57, 2, 2);
      ctx.fillRect(2, -57, 2, 2);

      // Eyebrows
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -60);
      ctx.lineTo(-1, -61);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, -61);
      ctx.lineTo(6, -60);
      ctx.stroke();

      // Mouth
      ctx.strokeStyle = "#8a6050";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -50);
      ctx.quadraticCurveTo(0, -49, 3, -50);
      ctx.stroke();

      // Neck
      ctx.fillStyle = "#c8956c";
      ctx.fillRect(-4, -48, 8, 8);

      // Jacket/shirt (casual work — dark grey jacket, white shirt)
      ctx.fillStyle = "#3a3a44";
      ctx.beginPath();
      ctx.moveTo(-14, -40);
      ctx.lineTo(-16, 12);
      ctx.lineTo(16, 12);
      ctx.lineTo(14, -40);
      ctx.closePath();
      ctx.fill();

      // Shirt collar (white V-neck visible)
      ctx.fillStyle = "#d8d8d8";
      ctx.beginPath();
      ctx.moveTo(-5, -40);
      ctx.lineTo(0, -32);
      ctx.lineTo(5, -40);
      ctx.closePath();
      ctx.fill();

      // Jacket lapels
      ctx.strokeStyle = "#2a2a30";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -40);
      ctx.lineTo(-8, -20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(6, -40);
      ctx.lineTo(8, -20);
      ctx.stroke();

      // ID badge clipped to pocket
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-12, -18, 6, 8);
      ctx.fillStyle = "#0066aa";
      ctx.fillRect(-11, -16, 4, 4);
      // Badge lanyard
      ctx.strokeStyle = "#0066aa";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-9, -18);
      ctx.quadraticCurveTo(-6, -30, -4, -40);
      ctx.stroke();

      // Belt
      ctx.fillStyle = "#2a2020";
      ctx.fillRect(-15, 8, 30, 4);
      ctx.fillStyle = "#888888";
      ctx.fillRect(-2, 9, 4, 2);

      // Arms (jacket sleeves)
      ctx.fillStyle = "#3a3a44";
      ctx.beginPath();
      ctx.moveTo(-14, -36);
      ctx.quadraticCurveTo(-20, -20, -18, -4);
      ctx.lineTo(-13, -4);
      ctx.quadraticCurveTo(-12, -20, -10, -36);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -36);
      ctx.quadraticCurveTo(20, -20, 18, -4);
      ctx.lineTo(13, -4);
      ctx.quadraticCurveTo(12, -20, 10, -36);
      ctx.closePath();
      ctx.fill();

      // Hands (skin)
      ctx.fillStyle = "#c8956c";
      ctx.beginPath();
      ctx.arc(-15.5, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(15.5, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pants (dark slacks)
      ctx.fillStyle = "#2a2a33";
      ctx.fillRect(-11, 12, 9, 32);
      ctx.fillRect(2, 12, 9, 32);

      // Shoes
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-12, 42, 10, 5);
      ctx.fillRect(2, 42, 10, 5);

      ctx.globalAlpha = 1;
      break;
    }

    case "hero_at_desk": {
      // Hero standing at front desk, secretary ignoring him
      const fadeIn = Math.min(1, t / 1.0);
      ctx.globalAlpha = fadeIn;

      // --- Front desk counter ---
      ctx.fillStyle = "#3a3022";
      ctx.fillRect(-60, 5, 120, 8);
      // Desk front panel
      ctx.fillStyle = "#2a2418";
      ctx.fillRect(-60, 13, 120, 35);
      // Desk edge highlight
      ctx.strokeStyle = "#4a4030";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-60, 5);
      ctx.lineTo(60, 5);
      ctx.stroke();

      // --- Secretary (right side, behind desk, looking at monitor) ---
      ctx.save();
      ctx.translate(28, 0);

      // Monitor
      ctx.fillStyle = "#111111";
      ctx.fillRect(10, -22, 20, 16);
      ctx.fillStyle = "#2244aa";
      ctx.fillRect(11, -21, 18, 14);
      // Screen glare
      ctx.fillStyle = "rgba(100,150,255,0.15)";
      ctx.fillRect(12, -20, 8, 6);
      // Monitor stand
      ctx.fillStyle = "#222222";
      ctx.fillRect(18, -6, 4, 6);

      // Hair (long, flowing — she's not looking at hero, facing her screen)
      ctx.fillStyle = "#2a1508";
      ctx.beginPath();
      ctx.moveTo(-6, -52);
      ctx.quadraticCurveTo(-10, -46, -10, -38);
      ctx.quadraticCurveTo(-12, -20, -10, -10);
      ctx.lineTo(-6, -10);
      ctx.quadraticCurveTo(-6, -30, -4, -42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -52);
      ctx.quadraticCurveTo(10, -46, 10, -38);
      ctx.quadraticCurveTo(12, -20, 10, -10);
      ctx.lineTo(6, -10);
      ctx.quadraticCurveTo(6, -30, 4, -42);
      ctx.closePath();
      ctx.fill();

      // Face (turned toward monitor — 3/4 view)
      ctx.fillStyle = "#dba882";
      ctx.beginPath();
      ctx.moveTo(-6, -42);
      ctx.quadraticCurveTo(-8, -48, -6, -54);
      ctx.quadraticCurveTo(2, -58, 8, -54);
      ctx.quadraticCurveTo(10, -48, 8, -42);
      ctx.quadraticCurveTo(2, -39, -6, -42);
      ctx.closePath();
      ctx.fill();

      // Eye (one visible — looking at screen, NOT at hero)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(2, -50, 4, 2.5);
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(4, -49.5, 1.5, 1.5);

      // Eyelash
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(1, -50.5);
      ctx.lineTo(7, -51.5);
      ctx.stroke();

      // Lips
      ctx.fillStyle = "#cc6666";
      ctx.beginPath();
      ctx.moveTo(0, -43);
      ctx.quadraticCurveTo(3, -41.5, 6, -43);
      ctx.quadraticCurveTo(3, -42, 0, -43);
      ctx.closePath();
      ctx.fill();

      // Blouse (professional, teal)
      ctx.fillStyle = "#2a7a7a";
      ctx.beginPath();
      ctx.moveTo(-8, -36);
      ctx.lineTo(-10, 4);
      ctx.lineTo(10, 4);
      ctx.lineTo(8, -36);
      ctx.closePath();
      ctx.fill();

      // Necklace
      ctx.strokeStyle = "#ccaa44";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-4, -36);
      ctx.quadraticCurveTo(1, -32, 4, -36);
      ctx.stroke();
      ctx.fillStyle = "#ccaa44";
      ctx.beginPath();
      ctx.arc(1, -33, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Arm (on desk, typing — visible above counter)
      ctx.fillStyle = "#dba882";
      ctx.fillRect(8, -6, 10, 3);
      // Hand on keyboard area
      ctx.beginPath();
      ctx.arc(19, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // --- Hero (left side, standing at counter, facing desk) ---
      ctx.save();
      ctx.translate(-30, 0);

      // Head (3/4 view facing right toward desk)
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.moveTo(-7, -56);
      ctx.quadraticCurveTo(-10, -62, -7, -66);
      ctx.quadraticCurveTo(0, -69, 7, -66);
      ctx.quadraticCurveTo(10, -62, 7, -56);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c8956c";
      ctx.beginPath();
      ctx.moveTo(-7, -44);
      ctx.quadraticCurveTo(-9, -52, -7, -58);
      ctx.quadraticCurveTo(0, -61, 7, -58);
      ctx.quadraticCurveTo(9, -52, 7, -44);
      ctx.quadraticCurveTo(0, -41, -7, -44);
      ctx.closePath();
      ctx.fill();
      // Eye (looking toward desk/secretary)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(2, -52, 3.5, 2.5);
      ctx.fillStyle = "#2a4a3a";
      ctx.fillRect(4, -51.5, 1.5, 1.5);

      // Neck
      ctx.fillStyle = "#c8956c";
      ctx.fillRect(-3, -44, 6, 6);

      // Jacket
      ctx.fillStyle = "#3a3a44";
      ctx.beginPath();
      ctx.moveTo(-12, -38);
      ctx.lineTo(-14, 12);
      ctx.lineTo(14, 12);
      ctx.lineTo(12, -38);
      ctx.closePath();
      ctx.fill();

      // Badge on chest
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(5, -26, 5, 7);
      ctx.fillStyle = "#0066aa";
      ctx.fillRect(6, -24, 3, 3);

      // Arm resting on counter
      ctx.fillStyle = "#3a3a44";
      ctx.beginPath();
      ctx.moveTo(12, -34);
      ctx.quadraticCurveTo(18, -20, 16, -2);
      ctx.lineTo(11, -2);
      ctx.quadraticCurveTo(10, -18, 8, -34);
      ctx.closePath();
      ctx.fill();
      // Hand on counter
      ctx.fillStyle = "#c8956c";
      ctx.beginPath();
      ctx.arc(14, -1, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Other arm at side
      ctx.fillStyle = "#3a3a44";
      ctx.beginPath();
      ctx.moveTo(-12, -34);
      ctx.quadraticCurveTo(-18, -18, -16, 0);
      ctx.lineTo(-11, 0);
      ctx.quadraticCurveTo(-10, -18, -8, -34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c8956c";
      ctx.beginPath();
      ctx.arc(-13.5, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Belt
      ctx.fillStyle = "#2a2020";
      ctx.fillRect(-13, 8, 26, 3);

      // Pants
      ctx.fillStyle = "#2a2a33";
      ctx.fillRect(-9, 12, 8, 28);
      ctx.fillRect(1, 12, 8, 28);

      // Shoes
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-10, 38, 9, 5);
      ctx.fillRect(1, 38, 9, 5);

      ctx.restore();

      ctx.globalAlpha = 1;
      break;
    }

    case "villain_legacy": {
      // ── THE BEHEMOTH — Industrial diving-suit titan ──
      const fadeIn = Math.min(1, t / 1.5);
      const breathe = 1 + Math.sin(t * 1.5) * 0.02;
      const pulse = (Math.sin(t * 3) + 1) * 0.5;
      ctx.scale(breathe * 1.5, breathe * 1.5);
      ctx.globalAlpha = fadeIn;

      // Industrial smoke aura
      const auraGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 110);
      auraGrad.addColorStop(0, "rgba(40,30,15,0.3)");
      auraGrad.addColorStop(0.6, "rgba(20,15,8,0.12)");
      auraGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = auraGrad;
      ctx.fillRect(-130, -130, 260, 260);

      // Cyan energy wisps
      for (let i = 0; i < 3; i++) {
        const angle = t * (1.5 + i * 0.4) + (i * Math.PI * 2) / 3;
        ctx.strokeStyle = `rgba(0,255,255,${0.1 + Math.sin(t * 3 + i) * 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -10, 55 + i * 12, angle, angle + 0.6);
        ctx.stroke();
      }

      // Backpack / reactor housing
      ctx.fillStyle = "#1a1008";
      ctx.beginPath();
      ctx.moveTo(-28, -30);
      ctx.quadraticCurveTo(-34, 10, -30, 55);
      ctx.lineTo(30, 55);
      ctx.quadraticCurveTo(34, 10, 28, -30);
      ctx.closePath();
      ctx.fill();

      // Exhaust stacks
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#333";
        ctx.fillRect(side * 18 - 2, -55, 4, 18);
        ctx.fillStyle = "#71797e";
        ctx.fillRect(side * 18 - 3, -56, 6, 3);
        // Steam puffs
        ctx.fillStyle = `rgba(180,180,160,${0.12 + pulse * 0.08})`;
        for (let p = 0; p < 2; p++) {
          ctx.beginPath();
          ctx.arc(
            side * 18 + Math.sin(t * 2 + p) * 2,
            -58 - p * 5,
            2 + p * 1.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }

      // Heavy plated torso
      ctx.fillStyle = "#7a5c1d";
      ctx.beginPath();
      ctx.moveTo(-22, -30);
      ctx.lineTo(-25, -24);
      ctx.lineTo(-24, 10);
      ctx.lineTo(24, 10);
      ctx.lineTo(25, -24);
      ctx.lineTo(22, -30);
      ctx.closePath();
      ctx.fill();

      // Chest plate overlay
      ctx.fillStyle = "#b58e3d";
      ctx.beginPath();
      ctx.moveTo(-16, -27);
      ctx.lineTo(16, -27);
      ctx.lineTo(15, -5);
      ctx.lineTo(-15, -5);
      ctx.closePath();
      ctx.fill();

      // Chest rivets
      ctx.fillStyle = "#444";
      for (let r = 0; r < 4; r++) {
        ctx.beginPath();
        ctx.arc(-12 + r * 8, -25, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reactor core porthole
      const coreY = -16;
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(0, coreY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b87333";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Cyan glow
      const coreGlow = ctx.createRadialGradient(0, coreY, 0, 0, coreY, 6);
      coreGlow.addColorStop(0, `rgba(0,255,255,${0.7 + pulse * 0.3})`);
      coreGlow.addColorStop(0.6, "rgba(0,255,255,0.2)");
      coreGlow.addColorStop(1, "rgba(0,255,255,0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(0, coreY, 6, 0, Math.PI * 2);
      ctx.fill();
      // Grill bars
      ctx.strokeStyle = "#71797e";
      ctx.lineWidth = 1.5;
      for (let g = 0; g < 3; g++) {
        const gx = -4 + g * 4;
        ctx.beginPath();
        ctx.moveTo(gx, coreY - 5);
        ctx.lineTo(gx, coreY + 5);
        ctx.stroke();
      }

      // Massive pauldrons
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#b58e3d";
        ctx.beginPath();
        ctx.ellipse(side * 24, -28, 12, 6, side * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#7a5c1d";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Pauldron spikes
        ctx.fillStyle = "#b87333";
        ctx.beginPath();
        ctx.moveTo(side * 28, -30);
        ctx.lineTo(side * 36, -28);
        ctx.lineTo(side * 28, -26);
        ctx.fill();
      }

      // Diving helmet — brass dome
      ctx.fillStyle = "#b58e3d";
      ctx.beginPath();
      ctx.arc(0, -42, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b87333";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Helmet seam
      ctx.strokeStyle = "#7a5c1d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.lineTo(0, -28);
      ctx.stroke();

      // Main porthole (single glowing eye)
      ctx.fillStyle = "#0a1a1a";
      ctx.beginPath();
      ctx.arc(0, -41, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b87333";
      ctx.lineWidth = 2;
      ctx.stroke();
      const eyeGrad = ctx.createRadialGradient(0, -41, 0, 0, -41, 4.5);
      eyeGrad.addColorStop(0, `rgba(0,255,255,${0.6 + pulse * 0.4})`);
      eyeGrad.addColorStop(0.6, "rgba(0,255,255,0.15)");
      eyeGrad.addColorStop(1, "rgba(0,255,255,0)");
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(0, -41, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Side portholes
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(side * 8, -44, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(0,255,255,${0.2 + pulse * 0.1})`;
        ctx.beginPath();
        ctx.arc(side * 8, -44, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chin guard
      ctx.fillStyle = "#71797e";
      ctx.beginPath();
      ctx.moveTo(-6, -34);
      ctx.lineTo(6, -34);
      ctx.lineTo(3, -30);
      ctx.lineTo(-3, -30);
      ctx.closePath();
      ctx.fill();

      // Arms — thick with drill/clamp
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#7a5c1d";
        ctx.fillRect(side * 24 - 4, -24, 8, 22);
        ctx.fillStyle = "#b58e3d";
        ctx.fillRect(side * 24 - 3, -18, 6, 4);
        ctx.fillRect(side * 24 - 3, -8, 6, 4);
        // Hand
        if (side > 0) {
          // Drill
          ctx.fillStyle = "#aaa";
          ctx.beginPath();
          ctx.moveTo(24, -1);
          ctx.lineTo(38, 2);
          ctx.lineTo(24, 5);
          ctx.closePath();
          ctx.fill();
        } else {
          // Clamp
          ctx.fillStyle = "#999";
          const jaw = 2 + Math.sin(t * 4) * 2;
          ctx.beginPath();
          ctx.moveTo(-24, 0 - jaw);
          ctx.lineTo(-36, -2);
          ctx.lineTo(-36, 0 - jaw + 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-24, 0 + jaw);
          ctx.lineTo(-36, 4);
          ctx.lineTo(-36, 0 + jaw - 2);
          ctx.fill();
        }
      }

      // Legs
      ctx.fillStyle = "#7a5c1d";
      ctx.fillRect(-10, 10, 8, 20);
      ctx.fillRect(2, 10, 8, 20);
      // Knee plates
      ctx.fillStyle = "#b58e3d";
      ctx.fillRect(-9, 18, 6, 4);
      ctx.fillRect(3, 18, 6, 4);
      // Boots
      ctx.fillStyle = "#0a0004";
      ctx.fillRect(-11, 28, 10, 5);
      ctx.fillRect(1, 28, 10, 5);

      ctx.globalAlpha = 1;
      break;
    }

    case "villain_form2_legacy": {
      // ── THE VOLCANIC TITAN — Cracked armor, exposed ember muscle ──
      const fadeIn = Math.min(1, t / 1.2);
      const breathe = 1 + Math.sin(t * 2) * 0.03;
      const pulse = (Math.sin(t * 4) + 1) * 0.5;
      const heavePulse = (Math.sin(t * 2.5) + 1) * 0.5;
      ctx.scale(breathe * 1.7, breathe * 1.7);
      ctx.globalAlpha = fadeIn;

      // Heat shimmer aura
      const auraGrad = ctx.createRadialGradient(0, -5, 15, 0, -5, 110);
      auraGrad.addColorStop(0, "rgba(80,20,0,0.35)");
      auraGrad.addColorStop(0.4, "rgba(40,8,0,0.15)");
      auraGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = auraGrad;
      ctx.fillRect(-130, -130, 260, 260);

      // Rising heat particles
      for (let h = 0; h < 5; h++) {
        const hx = Math.sin(h * 1.7 + t * 2) * 22;
        const hy = -50 - ((t * 30 + h * 25) % 40);
        ctx.fillStyle = `rgba(255,120,20,${0.08 + Math.sin(h + t * 3) * 0.04})`;
        ctx.beginPath();
        ctx.arc(hx, hy, 2 + Math.sin(h * 2) * 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ember corona arcs
      for (let i = 0; i < 4; i++) {
        const angle = t * (2 + i * 0.5) + (i * Math.PI) / 2;
        ctx.strokeStyle = `rgba(255,100,0,${0.2 + Math.sin(t * 4 + i) * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -8, 50 + i * 10, angle, angle + 0.7);
        ctx.stroke();
      }

      // Massive muscle torso — dark red/brown flesh
      ctx.fillStyle = "#3a1515";
      ctx.beginPath();
      ctx.moveTo(-26, -28);
      ctx.quadraticCurveTo(-30, 10, -27, 55);
      ctx.lineTo(27, 55);
      ctx.quadraticCurveTo(30, 10, 26, -28);
      ctx.closePath();
      ctx.fill();

      // Pectoral muscle definition
      for (const side of [-1, 1]) {
        const pecGrad = ctx.createRadialGradient(
          side * 8,
          -18,
          2,
          side * 8,
          -18,
          10,
        );
        pecGrad.addColorStop(0, "#4a2020");
        pecGrad.addColorStop(1, "#3a1515");
        ctx.fillStyle = pecGrad;
        ctx.beginPath();
        ctx.ellipse(side * 8, -18, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Abs visible
      ctx.fillStyle = "#4a1818";
      for (let row = 0; row < 3; row++) {
        for (const side of [-0.5, 0.5]) {
          ctx.beginPath();
          ctx.ellipse(side * 5, -4 + row * 7, 3.5, 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Cracked armor fragments — obsidian plates clinging to body
      ctx.fillStyle = "#2a0a0a";
      // Left chest fragment
      ctx.beginPath();
      ctx.moveTo(-18, -26);
      ctx.lineTo(-4, -24);
      ctx.lineTo(-6, -12);
      ctx.lineTo(-20, -15);
      ctx.closePath();
      ctx.fill();
      // Right chest fragment — smaller
      ctx.beginPath();
      ctx.moveTo(5, -23);
      ctx.lineTo(16, -25);
      ctx.lineTo(14, -14);
      ctx.closePath();
      ctx.fill();
      // Lower plate
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.lineTo(8, 6);
      ctx.lineTo(9, 16);
      ctx.lineTo(-11, 18);
      ctx.closePath();
      ctx.fill();

      // Ember vein cracks glowing through
      ctx.lineWidth = 1.5;
      const crackAlpha = 0.5 + pulse * 0.3;
      const crackPaths = [
        [
          [-4, -24],
          [-1, -14],
          [3, -4],
        ],
        [
          [14, -14],
          [10, -4],
          [9, 8],
        ],
        [
          [-18, -15],
          [-14, -5],
          [-15, 8],
        ],
        [
          [-5, 6],
          [0, 12],
          [4, 18],
        ],
      ];
      for (const path of crackPaths) {
        // Glow bloom
        ctx.strokeStyle = `rgba(255,100,0,${crackAlpha * 0.3})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++)
          ctx.lineTo(path[i][0], path[i][1]);
        ctx.stroke();
        // Bright core
        ctx.strokeStyle = `rgba(255,100,0,${crackAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++)
          ctx.lineTo(path[i][0], path[i][1]);
        ctx.stroke();
      }

      // Molten core — exposed through shattered chest
      const mCoreGrad = ctx.createRadialGradient(
        0,
        -15,
        0,
        0,
        -15,
        8 + heavePulse * 2,
      );
      mCoreGrad.addColorStop(0, `rgba(255,200,50,0.9)`);
      mCoreGrad.addColorStop(0.4, `rgba(255,100,0,0.6)`);
      mCoreGrad.addColorStop(1, `rgba(200,40,0,0)`);
      ctx.fillStyle = mCoreGrad;
      ctx.beginPath();
      ctx.arc(0, -15, 8 + heavePulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,240,200,${0.5 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, -15, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Massive shoulders — bulging muscle with armor fragments
      for (const side of [-1, 1]) {
        // Trap muscle bulge
        ctx.fillStyle = "#3a1515";
        ctx.beginPath();
        ctx.ellipse(side * 18, -28, 12, 5, side * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Remaining pauldron fragment
        ctx.fillStyle = "#2a0a0a";
        ctx.beginPath();
        ctx.ellipse(side * 22, -30, 6, 3, side * 0.3, 0, Math.PI);
        ctx.fill();
        // Shoulder ember vein
        ctx.strokeStyle = `rgba(255,100,0,${0.3 + pulse * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(side * 8, -27);
        ctx.quadraticCurveTo(side * 15, -32, side * 22, -28);
        ctx.stroke();
      }

      // Head — partially destroyed helmet, face visible
      // Thick neck
      ctx.fillStyle = "#3a1515";
      ctx.fillRect(-5, -32, 10, 6);
      // Neck veins
      ctx.strokeStyle = "rgba(255,100,0,0.25)";
      ctx.lineWidth = 1;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 2, -28);
        ctx.quadraticCurveTo(side * 4, -34, side * 3, -38);
        ctx.stroke();
      }
      // Remaining helmet — cracked on one side
      ctx.fillStyle = "#2a0a0a";
      ctx.beginPath();
      ctx.arc(0, -42, 11, -Math.PI * 0.8, Math.PI * 0.3);
      ctx.closePath();
      ctx.fill();
      // Exposed face
      ctx.fillStyle = "#4a1a1a";
      ctx.beginPath();
      ctx.arc(2, -42, 9, 0, Math.PI * 2);
      ctx.fill();
      // Blazing eyes
      for (const side of [-1, 1]) {
        const eyeX = side * 4 + 1;
        ctx.fillStyle = "#1a0505";
        ctx.beginPath();
        ctx.ellipse(eyeX, -43, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        const eyeGrad = ctx.createRadialGradient(
          eyeX,
          -43,
          0,
          eyeX,
          -43,
          2.5,
        );
        eyeGrad.addColorStop(0, `rgba(255,220,100,${0.8 + pulse * 0.2})`);
        eyeGrad.addColorStop(0.6, "rgba(255,80,0,0.4)");
        eyeGrad.addColorStop(1, "rgba(200,30,0,0)");
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.ellipse(eyeX, -43, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Broken porthole on helmet remains
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(-5, -40, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,80,0,${0.2 + pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(-5, -40, 2, 0, Math.PI * 2);
      ctx.fill();

      // Arms — massive exposed muscle
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#3a1515";
        ctx.fillRect(side * 24 - 5, -24, 10, 26);
        // Bicep highlight
        ctx.fillStyle = "#4a2020";
        ctx.beginPath();
        ctx.ellipse(side * 24 + side * 2, -14, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Arm veins
        ctx.strokeStyle = `rgba(255,100,0,${0.25 + pulse * 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(side * 24 + side, -22);
        ctx.lineTo(side * 24 + side * 2, -8);
        ctx.stroke();
        // Fist — ember knuckles
        ctx.fillStyle = "#3a1515";
        ctx.beginPath();
        ctx.arc(side * 24, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,100,0,${0.2 + pulse * 0.15})`;
        ctx.beginPath();
        ctx.arc(side * 24 + side * 2, 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legs — tree-trunk muscle
      ctx.fillStyle = "#3a1515";
      ctx.fillRect(-12, 10, 10, 22);
      ctx.fillRect(2, 10, 10, 22);
      // Remaining shin armor
      ctx.fillStyle = "#2a0a0a";
      ctx.fillRect(-10, 18, 6, 8);
      ctx.fillRect(4, 18, 6, 8);
      // Boots
      ctx.fillStyle = "#1a0505";
      ctx.fillRect(-13, 30, 12, 5);
      ctx.fillRect(1, 30, 12, 5);

      // Molten drip particles
      for (let d = 0; d < 3; d++) {
        const dx = Math.sin(d * 2.1) * 15;
        const dy = 35 + ((t * 25 + d * 20) % 20);
        const dAlpha = 0.25 - ((dy - 35) / 20) * 0.25;
        if (dAlpha > 0) {
          ctx.fillStyle = `rgba(255,120,0,${dAlpha})`;
          ctx.beginPath();
          ctx.ellipse(dx, dy, 1.5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      break;
    }

    case "villain_final_legacy": {
      // ── THE COSMIC ENTITY — Void body, starfield, dimensional tears ──
      const fadeIn = Math.min(1, t / 1.5);
      const breathe = 1 + Math.sin(t * 1.5) * 0.03;
      const pulse = (Math.sin(t * 5) + 1) * 0.5;
      const cosmicPulse = (Math.sin(t * 2) + 1) * 0.5;
      ctx.scale(breathe * 2.0, breathe * 2.0);
      ctx.globalAlpha = fadeIn;

      // Reality distortion field
      const distGrad = ctx.createRadialGradient(0, -10, 10, 0, -10, 100);
      distGrad.addColorStop(0, "rgba(40,0,80,0.3)");
      distGrad.addColorStop(0.3, "rgba(20,0,60,0.12)");
      distGrad.addColorStop(0.6, "rgba(10,0,40,0.06)");
      distGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = distGrad;
      ctx.fillRect(-120, -120, 240, 240);

      // Dimensional rift tears
      for (let r = 0; r < 3; r++) {
        const rAng = t * 1 + r * Math.PI * 0.67;
        const rDist = 55 + Math.sin(t * 3 + r) * 10;
        const rx = Math.cos(rAng) * rDist;
        const ry = -10 + Math.sin(rAng) * rDist * 0.4;
        const rLen = 10 + Math.sin(t * 4 + r * 2) * 4;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(t * 2 + r);
        ctx.strokeStyle = `rgba(120,40,200,${0.12 + pulse * 0.08})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-rLen, 0);
        ctx.lineTo(-rLen * 0.3, -2);
        ctx.lineTo(rLen * 0.3, 2);
        ctx.lineTo(rLen, 0);
        ctx.stroke();
        ctx.strokeStyle = `rgba(200,200,255,${0.3 + pulse * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-rLen, 0);
        ctx.lineTo(-rLen * 0.3, -2);
        ctx.lineTo(rLen * 0.3, 2);
        ctx.lineTo(rLen, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Orbiting reality rings
      for (let ring = 0; ring < 3; ring++) {
        const ringR = 45 + ring * 12 + Math.sin(t * 2 + ring) * 3;
        const ringRot = t * (ring % 2 === 0 ? 1 : -1) + ring * 0.8;
        ctx.strokeStyle =
          ring % 2 === 0
            ? `rgba(120,60,200,${0.12 + cosmicPulse * 0.08})`
            : `rgba(60,140,255,${0.1 + cosmicPulse * 0.06})`;
        ctx.lineWidth = 1 + ring * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -10, ringR, ringR * 0.2, ringRot, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Void body — humanoid silhouette
      ctx.save();
      ctx.beginPath();
      // Head
      ctx.arc(0, -42, 11, 0, Math.PI * 2);
      // Torso
      ctx.moveTo(-18, -28);
      ctx.quadraticCurveTo(-22, 5, -19, 45);
      ctx.lineTo(19, 45);
      ctx.quadraticCurveTo(22, 5, 18, -28);
      ctx.closePath();
      // Arms
      for (const side of [-1, 1]) {
        ctx.moveTo(side * 18, -25);
        ctx.quadraticCurveTo(side * 32, 0, side * 24, 30);
        ctx.lineTo(side * 20, 30);
        ctx.quadraticCurveTo(side * 28, 2, side * 15, -22);
      }
      ctx.clip();

      // Fill with deep void
      ctx.fillStyle = "#0a0010";
      ctx.fillRect(-40, -60, 80, 110);

      // Starfield inside body
      for (let s = 0; s < 35; s++) {
        const sx = Math.sin(s * 127.1 + 42) * 22;
        const sy = -50 + Math.sin(s * 311.7 + 42) * 30 + 35;
        const sBright = 0.25 + Math.sin(t * 3 + s * 0.7) * 0.25;
        const sSize = 0.8 + Math.sin(s * 73.1) * 0.4;
        ctx.fillStyle =
          s % 5 === 0
            ? `rgba(180,140,255,${sBright})`
            : s % 3 === 0
              ? `rgba(100,180,255,${sBright})`
              : `rgba(220,220,255,${sBright})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Swirling nebula
      for (let n = 0; n < 2; n++) {
        const nx = Math.sin(t * 0.8 + n * 2) * 8;
        const ny = -10 + Math.cos(t * 0.6 + n * 3) * 10;
        const nR = 12 + n * 4;
        const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nR);
        nebGrad.addColorStop(
          0,
          n === 0 ? "rgba(100,30,160,0.12)" : "rgba(30,80,160,0.1)",
        );
        nebGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = nebGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, nR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore(); // end body clip

      // Body edge glow
      ctx.strokeStyle = `rgba(120,40,200,${0.2 + pulse * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -28);
      ctx.quadraticCurveTo(-22, 5, -19, 45);
      ctx.lineTo(19, 45);
      ctx.quadraticCurveTo(22, 5, 18, -28);
      ctx.closePath();
      ctx.stroke();

      // Cosmic crown / halo
      ctx.strokeStyle = `rgba(200,200,255,${0.15 + cosmicPulse * 0.12})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, -55, 18, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(200,160,255,${0.25 + cosmicPulse * 0.15})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, -55, 15, 3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Crown spikes — cosmic geometry
      for (let sp = 0; sp < 7; sp++) {
        const spAng = -Math.PI * 0.8 + (Math.PI * 1.6 * sp) / 6;
        const spBase = 11;
        const spTip = 20 + Math.sin(t * 4 + sp) * 2;
        const bx = Math.cos(spAng) * spBase;
        const by = -55 + Math.sin(spAng) * spBase * 0.3;
        const tx = Math.cos(spAng) * spTip;
        const ty = -55 + Math.sin(spAng) * spTip * 0.3;
        // Spike glow
        ctx.strokeStyle = `rgba(120,40,200,${0.12 + pulse * 0.08})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Spike core
        ctx.strokeStyle = `rgba(200,200,255,${0.35 + pulse * 0.2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Tip orb
        ctx.fillStyle = `rgba(200,200,255,${0.4 + pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes — cosmic void with bright pupils
      for (const side of [-1, 1]) {
        const eyeX = side * 4;
        const eyeGrad = ctx.createRadialGradient(eyeX, -43, 0, eyeX, -43, 4);
        eyeGrad.addColorStop(0, `rgba(255,255,255,${0.7 + pulse * 0.3})`);
        eyeGrad.addColorStop(0.4, "rgba(120,40,200,0.5)");
        eyeGrad.addColorStop(1, "rgba(120,40,200,0)");
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.ellipse(eyeX, -43, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Third eye — center forehead
      const teGrad = ctx.createRadialGradient(0, -48, 0, 0, -48, 3);
      teGrad.addColorStop(0, `rgba(255,200,255,0.8)`);
      teGrad.addColorStop(0.5, "rgba(120,40,200,0.4)");
      teGrad.addColorStop(1, "rgba(120,40,200,0)");
      ctx.fillStyle = teGrad;
      ctx.beginPath();
      ctx.arc(0, -48, 3, 0, Math.PI * 2);
      ctx.fill();

      // Floating armor fragments
      for (let f = 0; f < 6; f++) {
        const fAng = t * 1.5 + f * Math.PI * 0.33;
        const fDist = 35 + Math.sin(f * 1.3) * 5 + Math.sin(t * 2 + f) * 3;
        const fx = Math.cos(fAng) * fDist;
        const fy = -10 + Math.sin(fAng) * fDist * 0.4;
        const fSize = 3 + Math.sin(f * 2.7) * 1;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(t * 3 + f * 1.5);
        ctx.fillStyle = `rgba(30,10,50,${0.4 + Math.sin(t * 4 + f) * 0.15})`;
        ctx.fillRect(-fSize, -fSize * 0.5, fSize * 2, fSize);
        ctx.strokeStyle = `rgba(120,40,200,${0.2 + pulse * 0.1})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-fSize, -fSize * 0.5, fSize * 2, fSize);
        ctx.restore();
      }

      // Energy tendrils from hands
      for (const side of [-1, 1]) {
        const handX = side * 24;
        const handY = 30;
        for (let tr = 0; tr < 2; tr++) {
          const tAng = side * (0.4 + tr * 0.5) + Math.sin(t * 3 + tr) * 0.2;
          const tLen = 10 + tr * 5 + Math.sin(t * 4 + tr * 2) * 3;
          const tx = handX + Math.cos(tAng) * tLen;
          const ty = handY + Math.sin(tAng) * tLen * 0.6;
          ctx.strokeStyle = `rgba(120,40,200,${0.08 + pulse * 0.06})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(handX, handY);
          ctx.quadraticCurveTo(
            (handX + tx) * 0.5 + Math.sin(t * 5 + tr) * 4,
            (handY + ty) * 0.5,
            tx,
            ty,
          );
          ctx.stroke();
          ctx.strokeStyle = `rgba(200,200,255,${0.2 + pulse * 0.15})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(handX, handY);
          ctx.quadraticCurveTo(
            (handX + tx) * 0.5 + Math.sin(t * 5 + tr) * 4,
            (handY + ty) * 0.5,
            tx,
            ty,
          );
          ctx.stroke();
        }
      }

      // Void singularity at center
      const singGrad = ctx.createRadialGradient(0, -10, 0, 0, -10, 10);
      singGrad.addColorStop(0, "rgba(0,0,0,0.8)");
      singGrad.addColorStop(0.3, "rgba(40,0,80,0.4)");
      singGrad.addColorStop(0.7, "rgba(120,40,200,0.15)");
      singGrad.addColorStop(1, "rgba(120,40,200,0)");
      ctx.fillStyle = singGrad;
      ctx.beginPath();
      ctx.arc(0, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Accretion disk
      ctx.strokeStyle = `rgba(200,160,255,${0.2 + pulse * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -10, 12, 2.5, t * 1, 0, Math.PI * 2);
      ctx.stroke();

      // Cosmic particles
      for (let p = 0; p < 8; p++) {
        const pAng = t * 1 + p * Math.PI * 0.25;
        const pDist = 50 + Math.sin(t * 3 + p * 1.5) * 10;
        const px = Math.cos(pAng) * pDist;
        const py = -10 + Math.sin(pAng) * pDist * 0.5;
        const pBright = 0.15 + Math.sin(t * 5 + p) * 0.1;
        ctx.fillStyle =
          p % 3 === 0
            ? `rgba(120,40,200,${pBright})`
            : p % 3 === 1
              ? `rgba(60,140,255,${pBright})`
              : `rgba(200,200,255,${pBright})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5 + Math.sin(p * 4.1) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      break;
    }

    case "hero_fallen": {
      // Hero defeated — lying on the ground, scaled up to fill the scene
      const fadeIn = Math.min(1, t / 1.5);
      ctx.globalAlpha = fadeIn;
      ctx.scale(1.8, 1.8); // Much bigger fallen hero

      // Dim glow (fading)
      const dimGrad = ctx.createRadialGradient(0, 15, 10, 0, 15, 80);
      dimGrad.addColorStop(0, "rgba(0,100,80,0.12)");
      dimGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = dimGrad;
      ctx.fillRect(-100, -60, 200, 140);

      // Ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 35, 50, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (lying horizontal)
      ctx.save();
      ctx.translate(0, 10);
      ctx.rotate(Math.PI / 2.2);

      // Cape (crumpled, larger)
      ctx.fillStyle = "#4a1010";
      ctx.fillRect(-14, -8, 28, 40);
      // Cape tattered edge
      ctx.fillStyle = "#3a0808";
      ctx.beginPath();
      ctx.moveTo(-14, 32);
      ctx.lineTo(-16, 38);
      ctx.lineTo(-8, 35);
      ctx.lineTo(0, 40);
      ctx.lineTo(8, 35);
      ctx.lineTo(14, 38);
      ctx.lineTo(14, 32);
      ctx.closePath();
      ctx.fill();

      // Body (larger)
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(-10, -30, 20, 38);

      // Armor detail lines
      ctx.strokeStyle = "rgba(0,200,255,0.15)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-8, -20);
      ctx.lineTo(-8, 5);
      ctx.moveTo(8, -20);
      ctx.lineTo(8, 5);
      ctx.stroke();

      // Helmet (cracked — visor flickering)
      ctx.fillStyle = "#1a2a3a";
      ctx.beginPath();
      ctx.arc(0, -38, 12, 0, Math.PI * 2);
      ctx.fill();
      // Visor (flickering)
      ctx.fillStyle = `rgba(0,255,200,${0.2 + Math.sin(t * 8) * 0.15})`;
      ctx.fillRect(-7, -41, 14, 3);
      // Visor crack
      ctx.strokeStyle = "rgba(255,100,50,0.6)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-2, -41);
      ctx.lineTo(3, -38);
      ctx.stroke();

      // Crack lines on armor (more prominent)
      ctx.strokeStyle = "rgba(255,100,50,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -24);
      ctx.lineTo(3, -14);
      ctx.lineTo(-2, -4);
      ctx.lineTo(4, 4);
      ctx.stroke();

      // Arm reaching out
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(10, -20, 18, 6);
      // Hand
      ctx.fillStyle = "#2a3a4a";
      ctx.beginPath();
      ctx.arc(28, -17, 4, 0, Math.PI * 2);
      ctx.fill();

      // Sparking energy fragments around the body
      for (let i = 0; i < 4; i++) {
        const px = Math.cos(t * 3 + i * 1.5) * (25 + i * 8);
        const py = Math.sin(t * 2.5 + i * 2) * 15 - 10;
        ctx.fillStyle = `rgba(0,255,200,${0.15 + Math.sin(t * 5 + i) * 0.1})`;
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }

      ctx.restore();

      ctx.globalAlpha = 1;
      break;
    }

    case "party": {
      // The five-person squad — silhouettes with class identifiers
      const fadeIn = Math.min(1, t / 1.2);
      ctx.globalAlpha = fadeIn;

      // Group glow
      const partyGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 130);
      partyGrad.addColorStop(0, "rgba(0,200,255,0.1)");
      partyGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = partyGrad;
      ctx.fillRect(-140, -80, 280, 160);

      const members = [
        { x: -56, color: "#4488ff", visor: "#4488ff", label: "KAEL" }, // Vanguard
        { x: -28, color: "#ffaa44", visor: "#ffaa44", label: "LYRA" }, // Chrono-Analyst
        { x: 0, color: "#00ffcc", visor: "#00ffcc", label: "YOU" }, // Agent
        { x: 28, color: "#ff4488", visor: "#ff4488", label: "NOVA" }, // Striker
        { x: 56, color: "#44ff88", visor: "#44ff88", label: "ROOK" }, // Engineer
      ];

      for (const m of members) {
        ctx.save();
        ctx.translate(m.x, 0);

        // Cape (small)
        ctx.fillStyle =
          m.label === "YOU"
            ? "#6b1515"
            : m.label === "LYRA"
              ? "#3a2a10"
              : "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-6, -12);
        ctx.quadraticCurveTo(-9, 8, -8 + Math.sin(t * 2 + m.x) * 1.5, 28);
        ctx.lineTo(8 + Math.sin(t * 2.3 + m.x) * 1, 27);
        ctx.quadraticCurveTo(9, 8, 6, -12);
        ctx.closePath();
        ctx.fill();

        // Body
        ctx.fillStyle = "#2a3a4a";
        ctx.fillRect(-6, -22, 12, 22);

        // Helmet
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.arc(0, -28, 7, 0, Math.PI * 2);
        ctx.fill();

        // Visor (class-colored)
        ctx.fillStyle = m.visor;
        ctx.shadowColor = m.visor;
        ctx.shadowBlur = 6;
        ctx.fillRect(-4, -30, 8, 2);
        ctx.shadowBlur = 0;

        // Shoulders
        ctx.fillStyle = "#3a4a5a";
        ctx.fillRect(-9, -20, 4, 7);
        ctx.fillRect(5, -20, 4, 7);

        // Legs
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-4, 0, 3.5, 12);
        ctx.fillRect(0.5, 0, 3.5, 12);

        // Class indicator glow at feet
        ctx.fillStyle = m.color;
        ctx.globalAlpha = 0.3 + Math.sin(t * 2 + m.x * 0.1) * 0.15;
        ctx.fillRect(-5, 13, 10, 2);
        ctx.globalAlpha = fadeIn;

        // Name label
        ctx.fillStyle = m.color;
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText(m.label, 0, 22);

        ctx.restore();
      }

      ctx.globalAlpha = 1;
      break;
    }

    case "lyra": {
      // LYRA — The Chrono-Analyst, holographic data displays around her
      const fadeIn = Math.min(1, t / 1.0);
      ctx.globalAlpha = fadeIn;

      // Ambient glow
      const lyraGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
      lyraGlow.addColorStop(0, "rgba(255,170,68,0.12)");
      lyraGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lyraGlow;
      ctx.fillRect(-100, -80, 200, 160);

      // Holographic data panels floating around her
      const panelAlpha = 0.15 + Math.sin(t * 1.5) * 0.08;
      ctx.save();
      // Left panel
      ctx.translate(-55, -20);
      ctx.rotate(-0.15 + Math.sin(t * 0.8) * 0.03);
      ctx.fillStyle = `rgba(255,170,68,${panelAlpha})`;
      ctx.fillRect(0, 0, 28, 40);
      ctx.strokeStyle = `rgba(255,170,68,${panelAlpha + 0.15})`;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(0, 0, 28, 40);
      // Data lines
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `rgba(255,200,100,${panelAlpha * 0.7})`;
        ctx.fillRect(3, 4 + i * 6, 10 + Math.sin(t + i) * 4, 1.5);
      }
      ctx.restore();

      // Right panel
      ctx.save();
      ctx.translate(28, -30);
      ctx.rotate(0.12 + Math.sin(t * 0.9 + 1) * 0.03);
      ctx.fillStyle = `rgba(255,170,68,${panelAlpha})`;
      ctx.fillRect(0, 0, 24, 35);
      ctx.strokeStyle = `rgba(255,170,68,${panelAlpha + 0.15})`;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(0, 0, 24, 35);
      // Timeline graph
      ctx.strokeStyle = `rgba(255,200,100,${panelAlpha + 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3, 25);
      for (let i = 0; i < 18; i++) {
        ctx.lineTo(3 + i, 25 - Math.sin(t * 0.5 + i * 0.5) * 8 - i * 0.3);
      }
      ctx.stroke();
      ctx.restore();

      // --- Character body ---
      // Hair — long, dark with amber highlights, flowing past shoulders
      ctx.fillStyle = "#1a1208";
      ctx.beginPath();
      ctx.moveTo(-9, -62);
      ctx.quadraticCurveTo(-14, -50, -13, -30);
      ctx.quadraticCurveTo(-14, -10, -11 + Math.sin(t * 1.5) * 1, 5);
      ctx.lineTo(-7, 5);
      ctx.quadraticCurveTo(-8, -20, -7, -45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -62);
      ctx.quadraticCurveTo(14, -50, 13, -30);
      ctx.quadraticCurveTo(14, -10, 11 + Math.sin(t * 1.5 + 0.5) * 1, 5);
      ctx.lineTo(7, 5);
      ctx.quadraticCurveTo(8, -20, 7, -45);
      ctx.closePath();
      ctx.fill();
      // Amber shimmer strand
      ctx.strokeStyle = "rgba(255,170,68,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, -48);
      ctx.quadraticCurveTo(-12, -30, -10 + Math.sin(t * 1.2) * 1, 0);
      ctx.stroke();

      // Face
      ctx.fillStyle = "#dba882";
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.quadraticCurveTo(-10, -56, -8, -62);
      ctx.quadraticCurveTo(0, -66, 8, -62);
      ctx.quadraticCurveTo(10, -56, 8, -48);
      ctx.quadraticCurveTo(0, -44, -8, -48);
      ctx.closePath();
      ctx.fill();

      // Eyes — warm amber
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-5, -57, 4, 3);
      ctx.fillRect(2, -57, 4, 3);
      ctx.fillStyle = "#cc7722";
      ctx.fillRect(-3.5, -56.5, 2, 2);
      ctx.fillRect(3.5, -56.5, 2, 2);
      // Pupils
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-3, -56, 1, 1);
      ctx.fillRect(4, -56, 1, 1);

      // Eyebrows
      ctx.strokeStyle = "#2a1a08";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6, -59);
      ctx.lineTo(-1, -60);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, -60);
      ctx.lineTo(6, -59);
      ctx.stroke();

      // Lips
      ctx.fillStyle = "#cc6655";
      ctx.beginPath();
      ctx.moveTo(-3, -49);
      ctx.quadraticCurveTo(0, -47, 3, -49);
      ctx.quadraticCurveTo(0, -48, -3, -49);
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = "#dba882";
      ctx.fillRect(-3, -48, 6, 6);

      // Analyst coat — dark with amber trim
      ctx.fillStyle = "#1a1a2a";
      ctx.beginPath();
      ctx.moveTo(-12, -42);
      ctx.lineTo(-14, 20);
      ctx.lineTo(14, 20);
      ctx.lineTo(12, -42);
      ctx.closePath();
      ctx.fill();
      // Amber collar trim
      ctx.strokeStyle = "#ffaa44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, -42);
      ctx.lineTo(-4, -38);
      ctx.lineTo(4, -38);
      ctx.lineTo(8, -42);
      ctx.stroke();

      // Chrono-Analyst badge — glowing amber circle
      ctx.fillStyle = "#ffaa44";
      ctx.shadowColor = "#ffaa44";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(6, -32, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Belt with data modules
      ctx.fillStyle = "#2a2020";
      ctx.fillRect(-13, 8, 26, 3);
      ctx.fillStyle = "#ffaa44";
      ctx.fillRect(-4, 8.5, 3, 2);
      ctx.fillRect(1, 8.5, 3, 2);

      // Arms — one raised, palm-up projecting holo
      ctx.fillStyle = "#1a1a2a";
      // Left arm at side
      ctx.beginPath();
      ctx.moveTo(-12, -38);
      ctx.quadraticCurveTo(-16, -22, -14, 2);
      ctx.lineTo(-10, 2);
      ctx.quadraticCurveTo(-10, -20, -8, -38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#dba882";
      ctx.beginPath();
      ctx.arc(-12, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Right arm raised, projecting
      ctx.fillStyle = "#1a1a2a";
      ctx.beginPath();
      ctx.moveTo(12, -38);
      ctx.quadraticCurveTo(20, -42, 22, -36);
      ctx.lineTo(18, -34);
      ctx.quadraticCurveTo(16, -38, 10, -36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#dba882";
      ctx.beginPath();
      ctx.arc(22, -35, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Holographic emission from raised hand
      ctx.strokeStyle = `rgba(255,170,68,${0.3 + Math.sin(t * 3) * 0.15})`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(22, -35, 6 + i * 4, -0.8, 0.8);
        ctx.stroke();
      }

      // Legs
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(-6, 12, 5, 22);
      ctx.fillRect(1, 12, 5, 22);

      // Boots — sleek with amber accents
      ctx.fillStyle = "#111118";
      ctx.fillRect(-7, 32, 6, 6);
      ctx.fillRect(1, 32, 6, 6);
      ctx.fillStyle = "#ffaa44";
      ctx.fillRect(-7, 32, 6, 1);
      ctx.fillRect(1, 32, 6, 1);

      ctx.globalAlpha = 1;
      break;
    }

    case "aria": {
      // ARIA — Armor-Resident Intelligence Assistant
      // AI companion rendered as holographic female face in visor HUD
      const fadeIn = Math.min(1, t / 0.8);
      ctx.globalAlpha = fadeIn;

      // Holographic interference / boot-up scanlines
      const bootProg = Math.min(1, t / 2.0);
      if (bootProg < 1) {
        for (let sl = 0; sl < 20; sl++) {
          const sly = -80 + sl * 8 + Math.sin(t * 10 + sl) * 2;
          ctx.fillStyle = `rgba(0,220,255,${0.03 * (1 - bootProg)})`;
          ctx.fillRect(-60, sly, 120, 1);
        }
      }

      // Hexagonal visor frame (the HUD window ARIA lives in)
      const visorPulse = 0.6 + Math.sin(t * 2) * 0.1;
      ctx.strokeStyle = `rgba(0,200,255,${visorPulse * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-45, -60);
      ctx.lineTo(-55, -20);
      ctx.lineTo(-45, 25);
      ctx.lineTo(45, 25);
      ctx.lineTo(55, -20);
      ctx.lineTo(45, -60);
      ctx.closePath();
      ctx.stroke();
      // Inner visor glow
      ctx.fillStyle = `rgba(0,180,255,${0.03 + Math.sin(t * 1.5) * 0.01})`;
      ctx.fill();

      // Ambient holographic glow behind her
      const ariaGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
      ariaGlow.addColorStop(0, "rgba(0,200,255,0.08)");
      ariaGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ariaGlow;
      ctx.fillRect(-80, -90, 160, 130);

      // --- Hair: short asymmetric bob, electric blue-black ---
      ctx.fillStyle = "#0a0a1a";
      // Left side (longer)
      ctx.beginPath();
      ctx.moveTo(-9, -62);
      ctx.quadraticCurveTo(-16, -56, -15, -42);
      ctx.quadraticCurveTo(-14, -30, -12 + Math.sin(t * 2) * 0.5, -22);
      ctx.lineTo(-7, -22);
      ctx.quadraticCurveTo(-8, -35, -7, -50);
      ctx.closePath();
      ctx.fill();
      // Right side (shorter, swept)
      ctx.beginPath();
      ctx.moveTo(9, -62);
      ctx.quadraticCurveTo(14, -56, 12, -46);
      ctx.quadraticCurveTo(11, -38, 9, -34);
      ctx.lineTo(7, -34);
      ctx.quadraticCurveTo(8, -42, 7, -50);
      ctx.closePath();
      ctx.fill();
      // Cyan highlight streak (left side)
      ctx.strokeStyle = `rgba(0,220,255,${0.35 + Math.sin(t * 3) * 0.1})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-10, -58);
      ctx.quadraticCurveTo(-13, -44, -11 + Math.sin(t * 2) * 0.5, -24);
      ctx.stroke();

      // --- Face (holographic skin tone — pale with blue tint) ---
      ctx.fillStyle = "#c8bdd4";
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.quadraticCurveTo(-10, -56, -8, -62);
      ctx.quadraticCurveTo(0, -66, 8, -62);
      ctx.quadraticCurveTo(10, -56, 8, -48);
      ctx.quadraticCurveTo(0, -44, -8, -48);
      ctx.closePath();
      ctx.fill();
      // Holographic grid faintly overlaid on face
      ctx.strokeStyle = `rgba(0,200,255,${0.06 + Math.sin(t * 2.5) * 0.02})`;
      ctx.lineWidth = 0.3;
      for (let gy = -62; gy < -44; gy += 4) {
        ctx.beginPath();
        ctx.moveTo(-8, gy);
        ctx.lineTo(8, gy);
        ctx.stroke();
      }

      // --- Eyes: bright cyan, sharp, expressive ---
      // Whites
      ctx.fillStyle = "#e0e8f0";
      ctx.beginPath();
      ctx.ellipse(-3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Iris — glowing cyan
      const eyeGlow = `rgba(0,220,255,${0.8 + Math.sin(t * 4) * 0.2})`;
      ctx.fillStyle = eyeGlow;
      ctx.beginPath();
      ctx.arc(-3.5, -55.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, -55.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      // Pupil
      ctx.fillStyle = "#0a0a2a";
      ctx.beginPath();
      ctx.arc(-3.5, -55.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, -55.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Eye highlight
      ctx.fillStyle = "rgba(200,240,255,0.6)";
      ctx.beginPath();
      ctx.arc(-4.2, -56.2, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.8, -56.2, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Eyeliner (sharp, tech-styled)
      ctx.strokeStyle = "#1a1a3a";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-6.5, -56);
      ctx.quadraticCurveTo(-3.5, -58, -0.5, -56.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.5, -56.5);
      ctx.quadraticCurveTo(3.5, -58, 6.5, -56);
      ctx.stroke();

      // Eyebrows — thin, angular
      ctx.strokeStyle = "#2a2040";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-6, -59);
      ctx.lineTo(-1, -60.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, -60.5);
      ctx.lineTo(6, -59);
      ctx.stroke();

      // --- Nose (subtle) ---
      ctx.strokeStyle = "rgba(180,170,190,0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -54);
      ctx.lineTo(-0.5, -50.5);
      ctx.stroke();

      // --- Lips (soft lilac) ---
      ctx.fillStyle = "#b088a0";
      ctx.beginPath();
      ctx.moveTo(-3, -49);
      ctx.quadraticCurveTo(0, -47.5, 3, -49);
      ctx.quadraticCurveTo(0, -47.8, -3, -49);
      ctx.closePath();
      ctx.fill();

      // --- Headset (over-ear, tech) ---
      // Left earpiece
      ctx.fillStyle = "#1a1a2a";
      ctx.beginPath();
      ctx.ellipse(-11, -54, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,200,255,${0.5 + Math.sin(t * 3) * 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-11, -54, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Pulsing LED on earpiece
      ctx.fillStyle = `rgba(0,255,220,${0.5 + Math.sin(t * 5) * 0.4})`;
      ctx.beginPath();
      ctx.arc(-12, -52, 0.8, 0, Math.PI * 2);
      ctx.fill();
      // Right earpiece
      ctx.fillStyle = "#1a1a2a";
      ctx.beginPath();
      ctx.ellipse(11, -54, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,200,255,${0.5 + Math.sin(t * 3) * 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(11, -54, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Headband arc over hair
      ctx.strokeStyle = "#2a2a3a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -54, 12.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = `rgba(0,200,255,${0.2 + Math.sin(t * 2) * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, -54, 12.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      // Boom microphone extending from left earpiece
      ctx.strokeStyle = "#2a2a3a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-11, -50);
      ctx.quadraticCurveTo(-8, -46, -4, -46);
      ctx.stroke();
      // Mic tip
      ctx.fillStyle = "#2a2a3a";
      ctx.beginPath();
      ctx.arc(-4, -46, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Mic active indicator
      ctx.fillStyle = `rgba(0,255,180,${0.4 + Math.sin(t * 6) * 0.3})`;
      ctx.beginPath();
      ctx.arc(-4, -46, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // --- Neck ---
      ctx.fillStyle = "#c8bdd4";
      ctx.fillRect(-3, -47, 6, 6);

      // --- Body: sleek tech suit, high collar ---
      ctx.fillStyle = "#0f0f1a";
      ctx.beginPath();
      ctx.moveTo(-12, -41);
      ctx.lineTo(-14, 18);
      ctx.lineTo(14, 18);
      ctx.lineTo(12, -41);
      ctx.closePath();
      ctx.fill();
      // High collar
      ctx.fillStyle = "#1a1a30";
      ctx.beginPath();
      ctx.moveTo(-8, -42);
      ctx.quadraticCurveTo(-5, -44, -3, -42);
      ctx.lineTo(3, -42);
      ctx.quadraticCurveTo(5, -44, 8, -42);
      ctx.lineTo(8, -38);
      ctx.lineTo(-8, -38);
      ctx.closePath();
      ctx.fill();
      // Cyan trim lines on suit
      ctx.strokeStyle = `rgba(0,200,255,${0.3 + Math.sin(t * 2) * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-5, -38);
      ctx.lineTo(-5, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, -38);
      ctx.lineTo(5, 0);
      ctx.stroke();
      // Center chest line
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(0, 18);
      ctx.stroke();

      // Status indicator on chest
      ctx.fillStyle = `rgba(0,255,200,${0.5 + Math.sin(t * 4) * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, -30, 2, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      ctx.fillStyle = "#0f0f1a";
      // Left arm (at side)
      ctx.beginPath();
      ctx.moveTo(-12, -38);
      ctx.quadraticCurveTo(-16, -22, -14, 0);
      ctx.lineTo(-10, 0);
      ctx.quadraticCurveTo(-10, -20, -8, -38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c8bdd4";
      ctx.beginPath();
      ctx.arc(-12, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Right arm (raised, touching headset)
      ctx.fillStyle = "#0f0f1a";
      ctx.beginPath();
      ctx.moveTo(12, -38);
      ctx.quadraticCurveTo(17, -44, 14, -50);
      ctx.lineTo(11, -49);
      ctx.quadraticCurveTo(13, -43, 10, -36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c8bdd4";
      ctx.beginPath();
      ctx.arc(13, -51, 2, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = "#0f0f1a";
      ctx.fillRect(-6, 12, 5, 22);
      ctx.fillRect(1, 12, 5, 22);
      // Boots
      ctx.fillStyle = "#0a0a14";
      ctx.fillRect(-7, 32, 6, 6);
      ctx.fillRect(1, 32, 6, 6);
      // Cyan boot trim
      ctx.fillStyle = `rgba(0,200,255,${0.3})`;
      ctx.fillRect(-7, 32, 6, 0.8);
      ctx.fillRect(1, 32, 6, 0.8);

      // Floating data readouts (near her hand / headset)
      const dataAlpha = 0.2 + Math.sin(t * 2.5) * 0.08;
      ctx.save();
      ctx.translate(-50, -15);
      ctx.rotate(-0.1 + Math.sin(t * 0.7) * 0.02);
      ctx.fillStyle = `rgba(0,200,255,${dataAlpha})`;
      ctx.fillRect(0, 0, 22, 30);
      ctx.strokeStyle = `rgba(0,200,255,${dataAlpha + 0.15})`;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(0, 0, 22, 30);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(0,255,220,${dataAlpha * 0.6})`;
        ctx.fillRect(2, 3 + i * 5, 8 + Math.sin(t * 2 + i) * 4, 1.2);
      }
      ctx.restore();

      // Waveform readout (right side — voice analysis)
      ctx.save();
      ctx.translate(30, -25);
      ctx.rotate(0.08);
      ctx.strokeStyle = `rgba(0,255,200,${dataAlpha + 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 15);
      for (let i = 0; i < 20; i++) {
        ctx.lineTo(i, 15 - Math.sin(t * 4 + i * 0.8) * 6 * (1 - i / 25));
      }
      ctx.stroke();
      ctx.restore();

      ctx.globalAlpha = 1;
      break;
    }

    case "rift": {
      const pulse = 0.7 + 0.3 * Math.sin(t * 3);
      // Outer ring
      for (let ring = 3; ring >= 0; ring--) {
        const r = 40 + ring * 20;
        const alpha = (0.15 - ring * 0.03) * pulse;
        const riftGrad = ctx.createRadialGradient(0, 0, r - 15, 0, 0, r);
        riftGrad.addColorStop(0, `rgba(0,200,255,0)`);
        riftGrad.addColorStop(0.7, `rgba(0,200,255,${alpha})`);
        riftGrad.addColorStop(1, `rgba(100,0,200,${alpha * 0.5})`);
        ctx.fillStyle = riftGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core
      ctx.fillStyle = "rgba(200,220,255,0.3)";
      ctx.shadowColor = "#00ccff";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spinning arcs
      for (let i = 0; i < 3; i++) {
        const angle = t * (1.5 + i * 0.3) + (i * Math.PI * 2) / 3;
        ctx.strokeStyle = `rgba(0,200,255,${0.4 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 30 + i * 12, angle, angle + 1.2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      break;
    }

    case "portrait_voss": {
      // VOSS — Tactician: sharp features, military bearing, cyan/blue palette
      const fadeIn = Math.min(1, t / 0.9);
      ctx.globalAlpha = fadeIn;

      // Tactical holographic backdrop
      const vossGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
      vossGlow.addColorStop(0, "rgba(0,180,255,0.10)");
      vossGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vossGlow;
      ctx.fillRect(-80, -90, 160, 140);

      // Floating tactical grid behind him
      ctx.save();
      ctx.translate(-48, -30);
      ctx.rotate(-0.08 + Math.sin(t * 0.6) * 0.02);
      const gridAlpha = 0.12 + Math.sin(t * 1.5) * 0.05;
      ctx.strokeStyle = `rgba(0,180,255,${gridAlpha})`;
      ctx.lineWidth = 0.4;
      for (let gx = 0; gx < 5; gx++) {
        ctx.beginPath();
        ctx.moveTo(gx * 6, 0);
        ctx.lineTo(gx * 6, 30);
        ctx.stroke();
      }
      for (let gy = 0; gy < 6; gy++) {
        ctx.beginPath();
        ctx.moveTo(0, gy * 6);
        ctx.lineTo(24, gy * 6);
        ctx.stroke();
      }
      // Blinking dot on grid (target)
      ctx.fillStyle = `rgba(255,100,80,${0.5 + Math.sin(t * 4) * 0.4})`;
      ctx.beginPath();
      ctx.arc(12, 12, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Hair — short, swept back, silver-grey
      ctx.fillStyle = "#8090a0";
      ctx.beginPath();
      ctx.moveTo(-9, -62);
      ctx.quadraticCurveTo(-12, -70, -7, -74);
      ctx.quadraticCurveTo(0, -77, 8, -73);
      ctx.quadraticCurveTo(13, -68, 10, -62);
      ctx.closePath();
      ctx.fill();
      // Lighter streak
      ctx.strokeStyle = "rgba(200,210,220,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -73);
      ctx.quadraticCurveTo(4, -72, 8, -68);
      ctx.stroke();

      // Face — angular, weathered
      ctx.fillStyle = "#b89070";
      ctx.beginPath();
      ctx.moveTo(-7, -48);
      ctx.quadraticCurveTo(-9, -56, -7, -63);
      ctx.quadraticCurveTo(0, -66, 7, -63);
      ctx.quadraticCurveTo(9, -56, 7, -48);
      ctx.quadraticCurveTo(0, -44, -7, -48);
      ctx.closePath();
      ctx.fill();

      // Jaw line (angular, strong)
      ctx.strokeStyle = "rgba(160,120,90,0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-7, -50);
      ctx.quadraticCurveTo(-8, -46, 0, -44);
      ctx.quadraticCurveTo(8, -46, 7, -50);
      ctx.stroke();

      // Scar across left cheek
      ctx.strokeStyle = "rgba(200,160,140,0.5)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-7, -54);
      ctx.lineTo(-3, -50);
      ctx.stroke();

      // Eyes — sharp, focused, pale blue
      ctx.fillStyle = "#e0e8f0";
      ctx.fillRect(-5, -58, 4, 2.5);
      ctx.fillRect(1, -58, 4, 2.5);
      ctx.fillStyle = "#5090cc";
      ctx.fillRect(-4, -57.5, 2, 2);
      ctx.fillRect(2, -57.5, 2, 2);
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(-3.5, -57, 1, 1);
      ctx.fillRect(2.5, -57, 1, 1);

      // Eyebrows — thick, angular (stern)
      ctx.strokeStyle = "#5a6a7a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -60);
      ctx.lineTo(-1, -61.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, -61.5);
      ctx.lineTo(6, -60);
      ctx.stroke();

      // Nose (aquiline)
      ctx.strokeStyle = "rgba(160,120,90,0.3)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -55);
      ctx.lineTo(1, -50);
      ctx.lineTo(-0.5, -49.5);
      ctx.stroke();

      // Mouth — thin, stern line
      ctx.strokeStyle = "#8a6a55";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -47);
      ctx.lineTo(3, -47);
      ctx.stroke();

      // Neck
      ctx.fillStyle = "#b89070";
      ctx.fillRect(-4, -47, 8, 7);

      // Tactical jacket — dark navy, high collar, officer-grade
      ctx.fillStyle = "#1a2030";
      ctx.beginPath();
      ctx.moveTo(-13, -40);
      ctx.lineTo(-15, 18);
      ctx.lineTo(15, 18);
      ctx.lineTo(13, -40);
      ctx.closePath();
      ctx.fill();

      // Raised officer collar
      ctx.fillStyle = "#222838";
      ctx.beginPath();
      ctx.moveTo(-9, -42);
      ctx.lineTo(-7, -46);
      ctx.lineTo(7, -46);
      ctx.lineTo(9, -42);
      ctx.lineTo(9, -38);
      ctx.lineTo(-9, -38);
      ctx.closePath();
      ctx.fill();
      // Collar trim
      ctx.strokeStyle = `rgba(0,180,255,${0.3 + Math.sin(t * 2) * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-7, -46);
      ctx.lineTo(7, -46);
      ctx.stroke();

      // Rank insignia — triple chevrons on right chest
      ctx.strokeStyle = "#00aadd";
      ctx.lineWidth = 0.8;
      for (let ch = 0; ch < 3; ch++) {
        const chY = -34 + ch * 3;
        ctx.beginPath();
        ctx.moveTo(3, chY);
        ctx.lineTo(6, chY - 1.5);
        ctx.lineTo(9, chY);
        ctx.stroke();
      }

      // Shoulder pads (angular, tactical)
      ctx.fillStyle = "#2a3444";
      ctx.fillRect(-17, -40, 6, 8);
      ctx.fillRect(11, -40, 6, 8);
      ctx.strokeStyle = "#3a4a5a";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-17, -40, 6, 8);
      ctx.strokeRect(11, -40, 6, 8);

      // Belt
      ctx.fillStyle = "#111820";
      ctx.fillRect(-14, 6, 28, 3);
      ctx.fillStyle = "#00aadd";
      ctx.fillRect(-2, 6.5, 4, 2);

      // Arms
      ctx.fillStyle = "#1a2030";
      ctx.beginPath();
      ctx.moveTo(-13, -36);
      ctx.quadraticCurveTo(-17, -20, -15, 0);
      ctx.lineTo(-11, 0);
      ctx.quadraticCurveTo(-10, -18, -9, -36);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -36);
      ctx.quadraticCurveTo(17, -20, 15, 0);
      ctx.lineTo(11, 0);
      ctx.quadraticCurveTo(10, -18, 9, -36);
      ctx.closePath();
      ctx.fill();
      // Gloved hands
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.arc(-13, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(13, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = "#151c28";
      ctx.fillRect(-7, 10, 6, 24);
      ctx.fillRect(1, 10, 6, 24);
      // Knee guards
      ctx.fillStyle = "#2a3444";
      ctx.fillRect(-6, 22, 4, 4);
      ctx.fillRect(2, 22, 4, 4);

      // Boots — military, dark
      ctx.fillStyle = "#0d1018";
      ctx.fillRect(-8, 32, 7, 6);
      ctx.fillRect(1, 32, 7, 6);
      ctx.fillStyle = "#00aadd";
      ctx.fillRect(-8, 32, 7, 0.8);
      ctx.fillRect(1, 32, 7, 0.8);

      ctx.globalAlpha = 1;
      break;
    }

    case "portrait_miri": {
      // MIRI — Medic: warm face, green/teal palette, med-pack, healer vibes
      const fadeIn = Math.min(1, t / 0.9);
      ctx.globalAlpha = fadeIn;

      // Soft healing glow backdrop
      const miriGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
      miriGlow.addColorStop(0, "rgba(100,255,180,0.10)");
      miriGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = miriGlow;
      ctx.fillRect(-80, -90, 160, 140);

      // Floating medical readout (left side)
      ctx.save();
      ctx.translate(-50, -20);
      ctx.rotate(-0.1 + Math.sin(t * 0.8) * 0.02);
      const readAlpha = 0.14 + Math.sin(t * 1.8) * 0.06;
      ctx.fillStyle = `rgba(100,255,180,${readAlpha})`;
      ctx.fillRect(0, 0, 24, 32);
      ctx.strokeStyle = `rgba(100,255,180,${readAlpha + 0.12})`;
      ctx.lineWidth = 0.6;
      ctx.strokeRect(0, 0, 24, 32);
      // Heartbeat line
      ctx.strokeStyle = `rgba(100,255,160,${readAlpha + 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, 10);
      ctx.lineTo(6, 10);
      ctx.lineTo(8, 4);
      ctx.lineTo(10, 16);
      ctx.lineTo(12, 8);
      ctx.lineTo(14, 10);
      ctx.lineTo(22, 10);
      ctx.stroke();
      // Vitals text lines
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(100,255,160,${readAlpha * 0.6})`;
        ctx.fillRect(2, 20 + i * 4, 8 + Math.sin(t + i) * 3, 1.2);
      }
      ctx.restore();

      // Hair — tied back in a practical bun, dark brown with warm highlights
      ctx.fillStyle = "#2a1a10";
      // Left side framing face
      ctx.beginPath();
      ctx.moveTo(-9, -62);
      ctx.quadraticCurveTo(-13, -56, -11, -46);
      ctx.lineTo(-7, -46);
      ctx.quadraticCurveTo(-8, -54, -7, -60);
      ctx.closePath();
      ctx.fill();
      // Right side
      ctx.beginPath();
      ctx.moveTo(9, -62);
      ctx.quadraticCurveTo(13, -56, 11, -46);
      ctx.lineTo(7, -46);
      ctx.quadraticCurveTo(8, -54, 7, -60);
      ctx.closePath();
      ctx.fill();
      // Top
      ctx.beginPath();
      ctx.moveTo(-8, -63);
      ctx.quadraticCurveTo(0, -72, 8, -63);
      ctx.closePath();
      ctx.fill();
      // Bun at back (offset to right-top)
      ctx.fillStyle = "#2a1a10";
      ctx.beginPath();
      ctx.arc(4, -70, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,40,20,0.5)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(4, -70, 6, 0, Math.PI * 2);
      ctx.stroke();
      // Warm highlight strand
      ctx.strokeStyle = "rgba(180,120,60,0.3)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -68);
      ctx.quadraticCurveTo(2, -72, 6, -68);
      ctx.stroke();

      // Face — warm, kind features
      ctx.fillStyle = "#c8956c";
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.quadraticCurveTo(-10, -56, -8, -62);
      ctx.quadraticCurveTo(0, -66, 8, -62);
      ctx.quadraticCurveTo(10, -56, 8, -48);
      ctx.quadraticCurveTo(0, -44, -8, -48);
      ctx.closePath();
      ctx.fill();

      // Eyes — warm brown, expressive
      ctx.fillStyle = "#f0e8e0";
      ctx.beginPath();
      ctx.ellipse(-3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Iris — warm hazel-green
      ctx.fillStyle = "#5a8a50";
      ctx.beginPath();
      ctx.arc(-3.5, -55.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, -55.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(-3.5, -55.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.5, -55.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Eye highlights
      ctx.fillStyle = "rgba(255,255,240,0.5)";
      ctx.beginPath();
      ctx.arc(-4.2, -56.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.8, -56.2, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Eyebrows — soft, arched
      ctx.strokeStyle = "#3a2a18";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6, -59);
      ctx.quadraticCurveTo(-3, -61, -0.5, -59.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.5, -59.5);
      ctx.quadraticCurveTo(3, -61, 6, -59);
      ctx.stroke();

      // Nose
      ctx.strokeStyle = "rgba(170,120,80,0.3)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -54);
      ctx.lineTo(-0.3, -50);
      ctx.stroke();

      // Smile — warm, reassuring
      ctx.fillStyle = "#b06850";
      ctx.beginPath();
      ctx.moveTo(-3, -48);
      ctx.quadraticCurveTo(0, -46, 3, -48);
      ctx.quadraticCurveTo(0, -46.5, -3, -48);
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = "#c8956c";
      ctx.fillRect(-3, -47, 6, 6);

      // Medic uniform — teal/white with red cross emblem
      ctx.fillStyle = "#1a3a3a";
      ctx.beginPath();
      ctx.moveTo(-12, -41);
      ctx.lineTo(-14, 18);
      ctx.lineTo(14, 18);
      ctx.lineTo(12, -41);
      ctx.closePath();
      ctx.fill();
      // White front panel
      ctx.fillStyle = "#d8d8d0";
      ctx.beginPath();
      ctx.moveTo(-5, -39);
      ctx.lineTo(-5, 10);
      ctx.lineTo(5, 10);
      ctx.lineTo(5, -39);
      ctx.closePath();
      ctx.fill();

      // Red cross on chest
      ctx.fillStyle = "#cc3333";
      ctx.fillRect(-1.5, -34, 3, 8);
      ctx.fillRect(-4, -31.5, 8, 3);

      // Collar — V-neck with teal trim
      ctx.strokeStyle = "#4ac0a0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, -41);
      ctx.lineTo(-3, -35);
      ctx.lineTo(3, -35);
      ctx.lineTo(8, -41);
      ctx.stroke();

      // Shoulder patches (medic insignia)
      ctx.fillStyle = "#2a4a4a";
      ctx.fillRect(-16, -40, 5, 6);
      ctx.fillRect(11, -40, 5, 6);
      // Mini crosses on patches
      ctx.fillStyle = "#4ac0a0";
      ctx.fillRect(-14.5, -38.5, 2, 0.8);
      ctx.fillRect(-14, -39, 0.8, 2);
      ctx.fillRect(12.5, -38.5, 2, 0.8);
      ctx.fillRect(13, -39, 0.8, 2);

      // Utility belt with med pouches
      ctx.fillStyle = "#1a2a2a";
      ctx.fillRect(-13, 6, 26, 3);
      // Med pouches
      ctx.fillStyle = "#2a4040";
      ctx.fillRect(-10, 4, 5, 5);
      ctx.fillRect(5, 4, 5, 5);
      // Pouch crosses
      ctx.fillStyle = "#4ac0a0";
      ctx.fillRect(-8.5, 5.5, 2, 0.6);
      ctx.fillRect(-8, 5, 0.6, 2);
      ctx.fillRect(6.5, 5.5, 2, 0.6);
      ctx.fillRect(7, 5, 0.6, 2);

      // Arms
      ctx.fillStyle = "#1a3a3a";
      // Left arm (holding scanner)
      ctx.beginPath();
      ctx.moveTo(-12, -38);
      ctx.quadraticCurveTo(-16, -26, -14, -8);
      ctx.lineTo(-10, -8);
      ctx.quadraticCurveTo(-10, -24, -8, -38);
      ctx.closePath();
      ctx.fill();
      // Right arm (at side)
      ctx.beginPath();
      ctx.moveTo(12, -38);
      ctx.quadraticCurveTo(16, -22, 14, 0);
      ctx.lineTo(10, 0);
      ctx.quadraticCurveTo(10, -20, 8, -38);
      ctx.closePath();
      ctx.fill();
      // Hands
      ctx.fillStyle = "#c8956c";
      ctx.beginPath();
      ctx.arc(-12, -6, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(12, 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Med-scanner in left hand (glowing device)
      ctx.fillStyle = "#2a3a3a";
      ctx.fillRect(-16, -14, 8, 4);
      ctx.fillStyle = `rgba(100,255,180,${0.5 + Math.sin(t * 3) * 0.3})`;
      ctx.fillRect(-15, -13, 6, 2);
      // Scanner beam
      ctx.strokeStyle = `rgba(100,255,180,${0.2 + Math.sin(t * 4) * 0.1})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-12, -10);
      ctx.lineTo(-18, 4);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.stroke();

      // Legs
      ctx.fillStyle = "#152a2a";
      ctx.fillRect(-6, 10, 5, 24);
      ctx.fillRect(1, 10, 5, 24);

      // Boots — practical, teal-trimmed
      ctx.fillStyle = "#0d1818";
      ctx.fillRect(-7, 32, 6, 6);
      ctx.fillRect(1, 32, 6, 6);
      ctx.fillStyle = "#4ac0a0";
      ctx.fillRect(-7, 32, 6, 0.8);
      ctx.fillRect(1, 32, 6, 0.8);

      ctx.globalAlpha = 1;
      break;
    }

    case "portrait_kai": {
      // KAI — Engineer: stocky build, amber/orange palette, goggles, tools
      const fadeIn = Math.min(1, t / 0.9);
      ctx.globalAlpha = fadeIn;

      // Warm workshop glow backdrop
      const kaiGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
      kaiGlow.addColorStop(0, "rgba(255,180,80,0.10)");
      kaiGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = kaiGlow;
      ctx.fillRect(-80, -90, 160, 140);

      // Floating schematic (right side)
      ctx.save();
      ctx.translate(30, -28);
      ctx.rotate(0.1 + Math.sin(t * 0.7) * 0.03);
      const schAlpha = 0.12 + Math.sin(t * 1.6) * 0.05;
      ctx.strokeStyle = `rgba(255,180,80,${schAlpha + 0.1})`;
      ctx.lineWidth = 0.5;
      // Blueprint rectangle
      ctx.strokeRect(0, 0, 22, 28);
      // Gear schematic inside
      ctx.beginPath();
      ctx.arc(11, 12, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(11, 12, 3, 0, Math.PI * 2);
      ctx.stroke();
      // Gear teeth
      for (let gt = 0; gt < 8; gt++) {
        const ga = (gt / 8) * Math.PI * 2 + t * 0.5;
        ctx.beginPath();
        ctx.moveTo(11 + Math.cos(ga) * 5.5, 12 + Math.sin(ga) * 5.5);
        ctx.lineTo(11 + Math.cos(ga) * 7.5, 12 + Math.sin(ga) * 7.5);
        ctx.stroke();
      }
      // Dimension lines
      ctx.fillStyle = `rgba(255,180,80,${schAlpha * 0.6})`;
      ctx.fillRect(2, 22, 10, 1);
      ctx.fillRect(2, 25, 14, 1);
      ctx.restore();

      // Hair — messy, dark with soot streaks, pushed up by goggles
      ctx.fillStyle = "#1a1408";
      ctx.beginPath();
      ctx.moveTo(-9, -60);
      ctx.quadraticCurveTo(-12, -68, -6, -74);
      ctx.quadraticCurveTo(2, -78, 10, -72);
      ctx.quadraticCurveTo(14, -66, 9, -60);
      ctx.closePath();
      ctx.fill();
      // Messy tufts sticking up
      ctx.beginPath();
      ctx.moveTo(-4, -73);
      ctx.quadraticCurveTo(-5, -79, -2, -80);
      ctx.quadraticCurveTo(0, -78, -1, -74);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3, -72);
      ctx.quadraticCurveTo(4, -78, 7, -78);
      ctx.quadraticCurveTo(8, -76, 6, -72);
      ctx.closePath();
      ctx.fill();
      // Soot streak
      ctx.strokeStyle = "rgba(60,50,30,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -70);
      ctx.quadraticCurveTo(-2, -72, 2, -70);
      ctx.stroke();

      // Face — broad, friendly, a bit rough
      ctx.fillStyle = "#d4a070";
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.quadraticCurveTo(-10, -56, -8, -62);
      ctx.quadraticCurveTo(0, -66, 8, -62);
      ctx.quadraticCurveTo(10, -56, 8, -48);
      ctx.quadraticCurveTo(0, -43, -8, -48);
      ctx.closePath();
      ctx.fill();

      // Stubble (dotted texture on jaw)
      ctx.fillStyle = "rgba(80,60,40,0.15)";
      for (let sx = -5; sx <= 5; sx += 2) {
        for (let sy = -48; sy <= -45; sy += 1.5) {
          ctx.fillRect(sx, sy, 0.8, 0.8);
        }
      }

      // Goggles pushed up on forehead
      ctx.fillStyle = "#3a2a1a";
      ctx.beginPath();
      ctx.moveTo(-9, -64);
      ctx.quadraticCurveTo(0, -66, 9, -64);
      ctx.lineTo(9, -60);
      ctx.quadraticCurveTo(0, -62, -9, -60);
      ctx.closePath();
      ctx.fill();
      // Goggle lenses
      ctx.fillStyle = "#ffaa44";
      ctx.shadowColor = "#ffaa44";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.ellipse(-4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Goggle rims
      ctx.strokeStyle = "#2a1a0a";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(-4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Bridge between lenses
      ctx.strokeStyle = "#3a2a1a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-0.5, -62);
      ctx.lineTo(0.5, -62);
      ctx.stroke();

      // Eyes — brown, lively
      ctx.fillStyle = "#f0e8e0";
      ctx.fillRect(-5, -57, 4, 2.5);
      ctx.fillRect(1, -57, 4, 2.5);
      ctx.fillStyle = "#8a5a30";
      ctx.fillRect(-4, -56.5, 2, 2);
      ctx.fillRect(2, -56.5, 2, 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-3.5, -56, 1, 1);
      ctx.fillRect(2.5, -56, 1, 1);

      // Eyebrows — expressive, slightly raised
      ctx.strokeStyle = "#2a1a08";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -59.5);
      ctx.quadraticCurveTo(-3, -61, -0.5, -59.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.5, -59.5);
      ctx.quadraticCurveTo(3, -61, 6, -59.5);
      ctx.stroke();

      // Nose — slightly broad
      ctx.strokeStyle = "rgba(180,130,70,0.3)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -54);
      ctx.lineTo(0, -50);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1.5, -49.5);
      ctx.quadraticCurveTo(0, -49, 1.5, -49.5);
      ctx.stroke();

      // Grin — lopsided, confident
      ctx.strokeStyle = "#8a6050";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -47);
      ctx.quadraticCurveTo(0, -45, 4, -46.5);
      ctx.stroke();

      // Neck (slightly thicker — stocky build)
      ctx.fillStyle = "#d4a070";
      ctx.fillRect(-4.5, -47, 9, 7);

      // Engineer jumpsuit — burnt orange with utility pockets
      ctx.fillStyle = "#8a4a1a";
      ctx.beginPath();
      ctx.moveTo(-14, -40);
      ctx.lineTo(-16, 18);
      ctx.lineTo(16, 18);
      ctx.lineTo(14, -40);
      ctx.closePath();
      ctx.fill();

      // Collar — open, casual
      ctx.fillStyle = "#6a3a12";
      ctx.beginPath();
      ctx.moveTo(-7, -40);
      ctx.lineTo(-4, -36);
      ctx.lineTo(4, -36);
      ctx.lineTo(7, -40);
      ctx.closePath();
      ctx.fill();
      // Undershirt visible
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.moveTo(-4, -40);
      ctx.lineTo(-3, -36);
      ctx.lineTo(3, -36);
      ctx.lineTo(4, -40);
      ctx.closePath();
      ctx.fill();

      // Chest pockets
      ctx.fillStyle = "#7a4218";
      ctx.fillRect(-10, -32, 7, 5);
      ctx.fillRect(3, -32, 7, 5);
      ctx.strokeStyle = "#6a3a12";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-10, -32, 7, 5);
      ctx.strokeRect(3, -32, 7, 5);
      // Wrench/pen sticking out of pocket
      ctx.fillStyle = "#888";
      ctx.fillRect(-8, -34, 1.2, 6);
      ctx.fillStyle = "#ffaa44";
      ctx.fillRect(-8, -34, 1.2, 1.5);

      // Name patch on left chest
      ctx.fillStyle = "#ddd";
      ctx.fillRect(-10, -25, 7, 3);
      ctx.fillStyle = "#333";
      ctx.font = "2px monospace";

      // Shoulder pads (bulkier — engineer kit)
      ctx.fillStyle = "#7a4218";
      ctx.fillRect(-18, -40, 6, 8);
      ctx.fillRect(12, -40, 6, 8);
      // Gear badge on right shoulder
      ctx.strokeStyle = "#ffaa44";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(15, -36, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      // Inner gear
      for (let gt = 0; gt < 6; gt++) {
        const ga = (gt / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(15 + Math.cos(ga) * 2, -36 + Math.sin(ga) * 2);
        ctx.lineTo(15 + Math.cos(ga) * 3.2, -36 + Math.sin(ga) * 3.2);
        ctx.stroke();
      }

      // Heavy tool belt
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(-15, 5, 30, 4);
      // Tools hanging from belt
      // Wrench
      ctx.fillStyle = "#666";
      ctx.fillRect(-11, 9, 2, 7);
      ctx.fillStyle = "#888";
      ctx.fillRect(-12, 14, 4, 2);
      // Hammer
      ctx.fillStyle = "#5a3a1a";
      ctx.fillRect(8, 9, 1.5, 6);
      ctx.fillStyle = "#888";
      ctx.fillRect(6, 9, 5, 3);
      // Buckle
      ctx.fillStyle = "#ffaa44";
      ctx.fillRect(-2, 5.5, 4, 3);

      // Arms (slightly thicker — strong build)
      ctx.fillStyle = "#8a4a1a";
      ctx.beginPath();
      ctx.moveTo(-14, -36);
      ctx.quadraticCurveTo(-20, -20, -18, 2);
      ctx.lineTo(-12, 2);
      ctx.quadraticCurveTo(-11, -18, -10, -36);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -36);
      ctx.quadraticCurveTo(20, -20, 18, 2);
      ctx.lineTo(12, 2);
      ctx.quadraticCurveTo(11, -18, 10, -36);
      ctx.closePath();
      ctx.fill();
      // Rolled-up sleeves showing forearms
      ctx.fillStyle = "#d4a070";
      ctx.fillRect(-18, -4, 6, 8);
      ctx.fillRect(12, -4, 6, 8);
      // Work gloves
      ctx.fillStyle = "#5a4a2a";
      ctx.beginPath();
      ctx.arc(-15, 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(15, 6, 3, 0, Math.PI * 2);
      ctx.fill();

      // Legs (stocky)
      ctx.fillStyle = "#6a3a12";
      ctx.fillRect(-7, 10, 6, 24);
      ctx.fillRect(1, 10, 6, 24);
      // Knee pads
      ctx.fillStyle = "#4a3018";
      ctx.fillRect(-6, 22, 4, 5);
      ctx.fillRect(2, 22, 4, 5);

      // Heavy boots — steel-toed, scuffed
      ctx.fillStyle = "#2a1a0a";
      ctx.fillRect(-8, 32, 7, 7);
      ctx.fillRect(1, 32, 7, 7);
      // Steel toe caps
      ctx.fillStyle = "#666";
      ctx.fillRect(-8, 35, 3, 4);
      ctx.fillRect(5, 35, 3, 4);

      ctx.globalAlpha = 1;
      break;
    }

    // ── Fragmented memory portraits — corrupted silhouettes ──
    case "fragment_blue":
    case "fragment_green":
    case "fragment_amber": {
      const palettes = {
        fragment_blue: {
          base: "#0066aa",
          glow: "rgba(0,140,255,0.12)",
          scan: "#00aaff",
          static: "#003366",
        },
        fragment_green: {
          base: "#008855",
          glow: "rgba(80,255,160,0.12)",
          scan: "#44ffaa",
          static: "#003322",
        },
        fragment_amber: {
          base: "#885500",
          glow: "rgba(255,170,60,0.12)",
          scan: "#ffaa33",
          static: "#442200",
        },
      };
      const pal = palettes[art];
      const fadeIn = Math.min(1, t / 0.6);
      const glitch = Math.sin(t * 11) * 0.15; // rapid jitter

      ctx.globalAlpha = fadeIn * 0.7;

      // Corrupted glow backdrop
      const fragGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 80);
      fragGlow.addColorStop(0, pal.glow);
      fragGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fragGlow;
      ctx.fillRect(-90, -100, 180, 160);

      // Humanoid silhouette — intentionally vague
      ctx.save();
      ctx.translate(glitch * 8, 0);

      // Head (oval, blurred edges)
      ctx.fillStyle = pal.static;
      ctx.beginPath();
      ctx.ellipse(0, -60, 11, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders + torso
      ctx.fillStyle = pal.static;
      ctx.beginPath();
      ctx.moveTo(-18, -44);
      ctx.quadraticCurveTo(-22, -30, -20, 10);
      ctx.lineTo(20, 10);
      ctx.quadraticCurveTo(22, -30, 18, -44);
      ctx.closePath();
      ctx.fill();

      // Horizontal corruption lines (tear through the figure)
      ctx.globalAlpha = fadeIn * 0.5;
      for (let i = 0; i < 8; i++) {
        const ly = -70 + i * 15 + Math.sin(t * 7 + i * 3) * 3;
        const lw = 30 + Math.sin(t * 5 + i) * 15;
        const lx = Math.sin(t * 9 + i * 2) * 6;
        ctx.fillStyle = pal.scan;
        ctx.fillRect(lx - lw / 2, ly, lw, 1.5);
      }

      // Static noise blocks
      ctx.globalAlpha = fadeIn * 0.3;
      for (let i = 0; i < 12; i++) {
        const nx = Math.sin(t * 13 + i * 7.7) * 30;
        const ny = -80 + (Math.sin(t * 11 + i * 5.3) * 50 + 50);
        const ns = 3 + Math.sin(t * 19 + i) * 2;
        ctx.fillStyle = i % 3 === 0 ? pal.scan : pal.static;
        ctx.fillRect(nx, ny, ns, ns);
      }

      // Glitch offset duplicate (color-shifted)
      ctx.globalAlpha = fadeIn * 0.15;
      ctx.fillStyle = pal.base;
      ctx.translate(3 + glitch * 12, -2);
      ctx.beginPath();
      ctx.ellipse(0, -60, 11, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-18, -44);
      ctx.quadraticCurveTo(-22, -30, -20, 10);
      ctx.lineTo(20, 10);
      ctx.quadraticCurveTo(22, -30, 18, -44);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Scan line sweep
      ctx.globalAlpha = fadeIn * 0.08;
      ctx.fillStyle = pal.scan;
      const scanPos = ((t * 80) % 200) - 100;
      ctx.fillRect(-80, scanPos, 160, 3);

      ctx.globalAlpha = 1;
      break;
    }

    case "station": {
      // Chronos Station exterior silhouette
      ctx.globalAlpha = Math.min(1, t / 1.5);

      // Sprint H 9.2: Chronos Station glow — subtle pulsing aura
      const glowPulse = 0.5 + 0.5 * Math.sin(t * 1.8);
      ctx.save();
      const grad = ctx.createRadialGradient(0, -20, 20, 0, -20, 120);
      grad.addColorStop(0, `rgba(0, 220, 255, ${0.22 + 0.1 * glowPulse})`);
      grad.addColorStop(0.5, `rgba(0, 150, 220, ${0.08 + 0.04 * glowPulse})`);
      grad.addColorStop(1, "rgba(0, 100, 180, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(-140, -120, 280, 200);
      ctx.restore();

      ctx.fillStyle = "#0d1828";

      // Main structure
      ctx.fillRect(-60, -20, 120, 50);
      // Tower
      ctx.fillRect(-10, -50, 20, 35);
      // Antenna
      ctx.fillRect(-2, -65, 4, 18);
      // Windows (glowing)
      ctx.fillStyle = "rgba(0,200,255,0.4)";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(-45 + i * 20, -10, 8, 6);
      }
      // Beacon
      ctx.fillStyle = "#00ffcc";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 8 + 4 * glowPulse;
      ctx.beginPath();
      ctx.arc(0, -68, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.globalAlpha = 1;
      break;
    }
  }

  ctx.restore();
}

export function drawParadoxAbomination(ctx, t, phase = 1) {
  const fadeIn = Math.min(1, t / 1.1);
  const pulse = (Math.sin(t * 4.2) + 1) * 0.5;
  const breath = 1 + Math.sin(t * 1.4) * 0.025;
  const scale = phase === 3 ? 2.32 : phase === 2 ? 2.1 : 1.92;
  const flesh = phase === 3 ? "#1a0630" : phase === 2 ? "#2b0818" : "#241020";
  const fleshHi = phase === 3 ? "#32125d" : phase === 2 ? "#64142a" : "#3c1838";
  const glow = phase === 3 ? "140,80,255" : phase === 2 ? "255,48,120" : "0,220,255";
  const horn = phase === 3 ? "#d7ccff" : phase === 2 ? "#ffc0a0" : "#9ff8ff";

  ctx.save();
  ctx.scale(scale * breath, scale * breath);
  ctx.globalAlpha = fadeIn;

  const aura = ctx.createRadialGradient(0, -10, 10, 0, -10, 130);
  aura.addColorStop(0, `rgba(${glow},0.28)`);
  aura.addColorStop(0.45, `rgba(${glow},0.11)`);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.fillRect(-150, -150, 300, 300);

  for (let i = 0; i < 5 + phase; i++) {
    const a = t * (0.7 + i * 0.08) + i * 1.35;
    const rx = Math.cos(a) * (55 + i * 7);
    const ry = -18 + Math.sin(a) * (28 + i * 2);
    ctx.strokeStyle = `rgba(${glow},${0.09 + pulse * 0.07})`;
    ctx.lineWidth = 2 + phase * 0.4;
    ctx.beginPath();
    ctx.moveTo(rx * 0.45, ry * 0.4);
    ctx.quadraticCurveTo(rx * 0.75, ry - 22, rx, ry);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.moveTo(-48, -42);
  ctx.quadraticCurveTo(-82, -10, -54, 50);
  ctx.lineTo(54, 50);
  ctx.quadraticCurveTo(82, -10, 48, -42);
  ctx.closePath();
  ctx.fill();

  for (let i = -3; i <= 3; i++) {
    const spineH = 18 + (3 - Math.abs(i)) * 8 + phase * 4;
    ctx.fillStyle = `rgba(${glow},${0.13 + pulse * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(i * 9 - 3, -31);
    ctx.lineTo(i * 9, -31 - spineH);
    ctx.lineTo(i * 9 + 3, -31);
    ctx.closePath();
    ctx.fill();
  }

  const bodyGrad = ctx.createLinearGradient(0, -55, 0, 58);
  bodyGrad.addColorStop(0, fleshHi);
  bodyGrad.addColorStop(0.42, flesh);
  bodyGrad.addColorStop(1, "#09030a");

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-30, -38);
  ctx.quadraticCurveTo(-50, -22, -45, 0);
  ctx.quadraticCurveTo(-40, 22, -20, 54);
  ctx.lineTo(20, 54);
  ctx.quadraticCurveTo(40, 22, 45, 0);
  ctx.quadraticCurveTo(50, -22, 30, -38);
  ctx.closePath();
  ctx.fill();

  for (const side of [-1, 1]) {
    const pec = ctx.createRadialGradient(side * 14, -24, 2, side * 14, -24, 17);
    pec.addColorStop(0, fleshHi);
    pec.addColorStop(1, flesh);
    ctx.fillStyle = pec;
    ctx.beginPath();
    ctx.ellipse(side * 14, -24, 18, 10, side * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let row = 0; row < 4; row++) {
    const y = -7 + row * 9;
    for (const side of [-1, 1]) {
      ctx.fillStyle = row % 2 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.16)";
      ctx.beginPath();
      ctx.ellipse(side * 7, y, 6, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const core = ctx.createRadialGradient(0, -22, 0, 0, -22, 16 + phase * 2);
  core.addColorStop(0, `rgba(255,255,255,${0.72 + pulse * 0.24})`);
  core.addColorStop(0.22, `rgba(${glow},0.8)`);
  core.addColorStop(1, `rgba(${glow},0)`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, -22, 16 + phase * 2 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${glow},${0.45 + pulse * 0.3})`;
  ctx.lineWidth = 1.4;
  for (let r = 0; r < 3; r++) {
    ctx.beginPath();
    ctx.ellipse(0, -22, 13 + r * 5, 4 + r * 1.5, t * (r % 2 ? -1 : 1), 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const side of [-1, 1]) {
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(side * 37, -31);
    ctx.quadraticCurveTo(side * 70, -18, side * 64, 18);
    ctx.quadraticCurveTo(side * 61, 42, side * 45, 50);
    ctx.quadraticCurveTo(side * 34, 36, side * 40, 12);
    ctx.quadraticCurveTo(side * 42, -10, side * 28, -28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = fleshHi;
    ctx.beginPath();
    ctx.ellipse(side * 52, -6, 13, 24, side * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0a0308";
    ctx.beginPath();
    ctx.ellipse(side * 48, 52, 15, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let c = 0; c < 4; c++) {
      const cx = side * (39 + c * 5);
      ctx.fillStyle = horn;
      ctx.beginPath();
      ctx.moveTo(cx, 55);
      ctx.lineTo(cx + side * 8, 62 + Math.sin(t * 4 + c) * 2);
      ctx.lineTo(cx + side, 49);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (const side of [-1, 1]) {
    ctx.fillStyle = flesh;
    ctx.beginPath();
    ctx.moveTo(side * 8, 43);
    ctx.lineTo(side * 26, 43);
    ctx.lineTo(side * 24, 75);
    ctx.lineTo(side * 6, 75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#070307";
    ctx.fillRect(side < 0 ? -28 : 7, 72, 22, 6);
  }

  ctx.fillStyle = fleshHi;
  ctx.beginPath();
  ctx.moveTo(-17, -53);
  ctx.quadraticCurveTo(-19, -36, -9, -26);
  ctx.lineTo(9, -26);
  ctx.quadraticCurveTo(19, -36, 17, -53);
  ctx.quadraticCurveTo(8, -66, 0, -64);
  ctx.quadraticCurveTo(-8, -66, -17, -53);
  ctx.closePath();
  ctx.fill();

  for (const side of [-1, 1]) {
    ctx.fillStyle = horn;
    ctx.beginPath();
    ctx.moveTo(side * 10, -60);
    ctx.quadraticCurveTo(side * 32, -76, side * 38, -48);
    ctx.quadraticCurveTo(side * 24, -58, side * 13, -49);
    ctx.closePath();
    ctx.fill();
    if (phase >= 2) {
      ctx.beginPath();
      ctx.moveTo(side * 4, -63);
      ctx.quadraticCurveTo(side * 15, -88, side * 24, -69);
      ctx.lineTo(side * 11, -56);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (const y of [-49, -42]) {
    for (const side of [-1, 1]) {
      const eyeX = side * (y === -49 ? 6 : 10);
      const eye = ctx.createRadialGradient(eyeX, y, 0, eyeX, y, 4);
      eye.addColorStop(0, "rgba(255,255,255,0.92)");
      eye.addColorStop(0.35, `rgba(${glow},0.75)`);
      eye.addColorStop(1, `rgba(${glow},0)`);
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.ellipse(eyeX, y, 4.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -34);
  ctx.quadraticCurveTo(0, -29 + pulse * 2, 8, -34);
  ctx.stroke();

  const veins = [
    [[-20, -32], [-12, -20], [-17, -5], [-8, 10]],
    [[18, -31], [11, -18], [16, -1], [7, 18]],
    [[-4, -15], [2, -4], [-2, 9], [5, 24]],
    [[-35, -4], [-48, 8], [-44, 31]],
    [[35, -4], [48, 8], [44, 31]],
  ];
  ctx.strokeStyle = `rgba(${glow},${0.34 + pulse * 0.2})`;
  ctx.lineWidth = 1.4;
  for (const vein of veins) {
    ctx.beginPath();
    ctx.moveTo(vein[0][0], vein[0][1]);
    for (let i = 1; i < vein.length; i++) ctx.lineTo(vein[i][0], vein[i][1]);
    ctx.stroke();
  }

  if (phase === 3) {
    for (let i = 0; i < 10; i++) {
      const a = t * 1.3 + i * 0.63;
      const r = 60 + Math.sin(t * 2 + i) * 12;
      ctx.fillStyle = `rgba(${glow},${0.16 + Math.sin(t * 5 + i) * 0.08})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, -10 + Math.sin(a) * r * 0.55, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
