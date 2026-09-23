import { isModernArt } from "../src/rendering/art-style.js";
import { drawViewmodel } from "../src/rendering/svg-art/viewmodels.js";
import { getAimBlend } from "../src/systems/aim.js";
import { GameState } from "../src/types.js";

/**
 * WeaponRenderer — draws all 8 procedural weapon models onto a Canvas context.
 *
 * Extracted from Game.drawWeapon() to keep game.js focused on game logic.
 * This module has zero game-state side effects: it is a pure drawing function.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w            - canvas width
 * @param {number} h            - canvas height
 * @param {object} opts
 * @param {object} opts.wep           - weapon definition (from player.getWeaponDef())
 * @param {string} opts.energyColor   - hex color for energy accents (from character)
 * @param {boolean} opts.isAiming
 * @param {boolean} opts.isSprinting
 * @param {boolean} opts.isDashing
 * @param {number} opts.weaponBob     - player.weaponBob angle
 * @param {number} opts.weaponKick    - player.weaponKick scalar
 * @param {number} opts.weaponAnimFrame - 0..3 fire animation frame
 * @param {number} opts.time          - game time (ms), used for animated glows
 * @param {number} opts.lastFireTime   - timestamp of last weapon fire (ms), for barrel shimmer
 * @param {boolean} opts.isTouchDevice
 * @param {Function} opts.drawGlow    - renderer.drawGlow(ctx, x, y, r, color, alpha)
 * @param {number} [opts.aimOffsetX]   - free-aim reticle offset (fraction of width); the modern rig follows it
 * @param {number} [opts.aimOffsetY]   - free-aim reticle offset (fraction of view height)
 * @param {string} [opts.state]        - game state; the viewmodel only shows during live first-person play
 * @param {string} [opts.pausedFromState]
 * @param {boolean} [opts.alive]
 */
export function drawWeapon(ctx, w, h, opts) {
  if (!opts.wep) return;
  const alpha = viewmodelFade(opts);
  if (alpha <= 0) return;
  // In-game callers pass `state` and get the eased aim blend; tools and tests use isAiming directly.
  const blend = opts.state === undefined ? (opts.isAiming ? 1 : 0) : getAimBlend();
  if (isModernArt() && drawViewmodel(ctx, w, h, opts, alpha, blend)) return;
  if (alpha >= 1) {
    drawProceduralWeapon(ctx, w, h, opts);
    return;
  }
  // Fading out/in: the procedural model resets globalAlpha as it draws, so
  // render it offscreen and blit that at the fade alpha.
  const off = fadeLayer(ctx.canvas.width, ctx.canvas.height);
  const octx = off.getContext("2d");
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, off.width, off.height);
  octx.setTransform(ctx.getTransform());
  drawProceduralWeapon(octx, w, h, opts);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

// States where the first-person view is live, and overlays that freeze it in place.
const OVERLAY_STATES = new Set([GameState.PAUSED, GameState.SETTINGS, GameState.CONTROLS, GameState.HUD_EDITOR]);
const FADE_SECONDS = 0.18;
let fade = 1;
let fadeClock = 0;
let fadeCanvas = null;

/** 0…1 viewmodel visibility: eases out on score / game-over / upgrade screens and on death. */
function viewmodelFade(opts) {
  if (opts.state === undefined) return 1;
  const live =
    opts.alive !== false &&
    (opts.state === GameState.PLAYING || (OVERLAY_STATES.has(opts.state) && opts.pausedFromState === GameState.PLAYING));
  const now = performance.now();
  const dt = fadeClock ? Math.min(0.1, (now - fadeClock) / 1000) : 1;
  fadeClock = now;
  fade = live ? Math.min(1, fade + dt / FADE_SECONDS) : Math.max(0, fade - dt / FADE_SECONDS);
  return fade;
}

function fadeLayer(cw, ch) {
  if (!fadeCanvas) fadeCanvas = document.createElement("canvas");
  if (fadeCanvas.width !== cw || fadeCanvas.height !== ch) {
    fadeCanvas.width = cw;
    fadeCanvas.height = ch;
  }
  return fadeCanvas;
}

/** The original procedural viewmodel (Legacy art, and Modern while SVG bitmaps decode). */
function drawProceduralWeapon(ctx, w, h, opts) {
  const {
    wep,
    energyColor,
    isAiming,
    isSprinting,
    isDashing,
    weaponBob,
    weaponKick,
    weaponAnimFrame,
    time,
    lastFireTime,
    isTouchDevice,
    drawGlow,
  } = opts;

  if (!wep) return;

  const bobMulX = isAiming ? 2 : isDashing ? 18 : isSprinting ? 14 : 8;
  const bobMulY = isAiming ? 1.5 : isDashing ? 12 : isSprinting ? 10 : 5;
  const bobX = Math.sin(weaponBob) * bobMulX;
  const bobY = Math.abs(Math.cos(weaponBob)) * bobMulY;
  const kickY = weaponKick * 40;
  // Crouching rides the weapon lower and cants it in; it fades out on ADS so
  // the sights still reach the reticle.
  const crouch = (opts.crouchBlend || 0) * (isAiming ? 0 : 1);
  const tiltAngle = (isSprinting ? Math.sin(weaponBob) * 0.06 : 0) + crouch * 0.05;

  const viewportFactor = h / 720;

  // ── Viewmodel pose ───────────────────────────────────────────────────────
  // Hip-fire sits the weapon low and to the right and cants it inward, the way
  // a right-handed shooter actually holds it. ADS interpolates that pose to
  // dead centre and upright so the sights line up with the reticle.
  // `ads` is 0 at the hip, 1 fully aimed.
  const ads = isAiming ? 1 : 0;
  const lerp = (a, b, t) => a + (b - a) * t;

  const restOffsetX = lerp(0.112 * w, 0, ads);   // right-hand offset, centred on ADS
  const restCant = lerp(-0.11, 0, ads);          // inward cant, upright on ADS
  const sc = lerp(4.5, 4.35, ads) * viewportFactor;

  // Sway is cosmetic lag from look/strafe input; it shrinks hard when aiming.
  const swayX = (opts.weaponSwayX || 0) * lerp(1, 0.22, ads) * viewportFactor;
  const swayY = (opts.weaponSwayY || 0) * lerp(1, 0.22, ads) * viewportFactor;

  const cx = w / 2 + restOffsetX + bobX + swayX - crouch * 11 * viewportFactor;

  // If we have a big HUD bar at the bottom, push the weapon up so it isn't hidden
  const hudOffset = opts.hudStyle === 1 ? (160 * viewportFactor) : 0;
  const cy = h - hudOffset - lerp(196, 250, ads) * viewportFactor + bobY + swayY +
    kickY * lerp(1, 0.45, ads) + crouch * 26 * viewportFactor;

  // Contact shadow — the viewmodel is the nearest object in the scene, so it
  // occludes ambient light behind itself. Without this the gun floats.
  {
    const shR = 260 * viewportFactor;
    const occ = ctx.createRadialGradient(cx, cy + 90 * viewportFactor, 0, cx, cy + 90 * viewportFactor, shR);
    occ.addColorStop(0, "rgba(0,0,0,0.38)");
    occ.addColorStop(0.6, "rgba(0,0,0,0.16)");
    occ.addColorStop(1, "transparent");
    ctx.fillStyle = occ;
    ctx.fillRect(cx - shR, cy - shR + 90 * viewportFactor, shR * 2, shR * 2);
  }

  ctx.save();
  ctx.translate(cx, cy);

  // Sway also tips the weapon slightly — a pure slide reads as a floating decal.
  const swayTilt = (opts.weaponSwayX || 0) * -0.0022 * lerp(1, 0.2, ads);
  const poseAngle = restCant + tiltAngle + swayTilt;
  if (poseAngle !== 0) ctx.rotate(poseAngle);

  // Mild vertical foreshortening sells that the weapon is angled away from the
  // eye rather than pasted flat against the screen.
  ctx.scale(sc, sc * lerp(0.94, 0.99, ads));
  // All coordinates now relative to (0, 0) at weapon centre

  // Recoil animation for frames 2 & 3
  if (weaponAnimFrame === 2) {
    ctx.translate(0, -3); // barrel rise
    ctx.rotate(-0.03);
  } else if (weaponAnimFrame === 3) {
    ctx.translate(0, -1); // settling back
    ctx.rotate(-0.01);
  }

  // Muzzle flash (Enhanced 'Sharp' version)
  if (weaponAnimFrame === 1) {
    drawGlow(ctx, 0, -42, 32, energyColor, 0.4);
    drawGlow(ctx, 0, -42, 12, "#ffffff", 0.8);

    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.05;
      const len = 15 + Math.random() * 20;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, -42 + Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * len, -42 + Math.sin(a) * len);
      ctx.stroke();
    }
  }

  // Shell casing ejection (frame 2)
  if (weaponAnimFrame === 2 && wep.id !== 2) {
    ctx.fillStyle = "#ddaa44";
    ctx.globalAlpha = 0.8;
    ctx.fillRect(7, -18, 3, 2);
    ctx.globalAlpha = 1;
  }

  // Smoke wisp (frame 3)
  if (weaponAnimFrame === 3) {
    ctx.fillStyle = "rgba(180,180,180,0.15)";
    ctx.beginPath();
    ctx.arc(1, -42, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Barrel heat shimmer — wavy distortion line above barrel after firing ──
  const timeSinceFire = time - (lastFireTime || 0);
  if (lastFireTime && timeSinceFire >= 0 && timeSinceFire < 500) {
    const shimmerAlpha = 0.18 * (1 - timeSinceFire / 500);
    ctx.save();
    ctx.globalAlpha = shimmerAlpha;
    ctx.strokeStyle = "rgba(255,200,150,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -10; i <= 10; i++) {
      const sx = i;
      const sy = -50 + Math.sin(i * 0.8 + time * 0.03) * 1.8;
      if (i === -10) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  if (wep.id === 0) {
    // Chrono Pistol
    // Barrel
    ctx.fillStyle = "#445566";
    ctx.fillRect(-6, -35, 12, 15);
    ctx.fillStyle = "#556677";
    ctx.fillRect(-4, -32, 8, 10);
    // Barrel bore
    ctx.fillStyle = "#222233";
    ctx.beginPath();
    ctx.arc(0, -35, 3, 0, Math.PI * 2);
    ctx.fill();
    // Barrel tip glow
    ctx.fillStyle = energyColor;
    ctx.fillRect(-3, -35, 6, 3);
    // Barrel highlight
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(-5, -34, 2, 12);
    // Main body/slide
    ctx.fillStyle = "#334455";
    ctx.fillRect(-9, -20, 18, 35);
    ctx.fillStyle = "#3d4f60";
    ctx.fillRect(-7, -18, 14, 30);
    // Slide serrations
    ctx.fillStyle = "#2a3a4a";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-8, -18 + i * 3, 16, 1);
    }
    // Ejection port
    ctx.fillStyle = "#222233";
    ctx.fillRect(5, -16, 3, 6);
    // Chrono energy line
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.6 + Math.sin(time * 0.008) * 0.3;
    ctx.fillRect(-2, -18, 4, 25);
    // Energy dots along line
    for (let i = 0; i < 4; i++) {
      const dotY = -16 + i * 6 + Math.sin(time * 0.01 + i) * 2;
      ctx.beginPath();
      ctx.arc(0, dotY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Trigger guard
    ctx.strokeStyle = "#445566";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 12, 6, 0, Math.PI);
    ctx.stroke();
    // Trigger
    ctx.fillStyle = "#334455";
    ctx.fillRect(-1, 8, 2, 6);
    // Grip
    ctx.fillStyle = "#223344";
    ctx.fillRect(-7, 15, 16, 25);
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-5, 17, 12, 20);
    // Grip texture lines
    ctx.fillStyle = "#1a2a3a";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-5, 19 + i * 5, 12, 1);
    }
    // Grip bottom cap
    ctx.fillStyle = "#445566";
    ctx.fillRect(-6, 38, 14, 3);
    // Rear sight
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-5, -20, 3, 3);
    ctx.fillRect(2, -20, 3, 3);
    // Front sight
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(-1, -36, 2, 2);
    ctx.globalAlpha = 1;
    // Screws/rivets
    ctx.fillStyle = "#667788";
    for (const [rx, ry] of [[-6, -5], [6, -5], [-6, 8], [6, 8]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wep.id === 1) {
    // Temporal Shotgun
    // Barrels
    ctx.fillStyle = "#333333";
    ctx.fillRect(-10, -48, 8, 12);
    ctx.fillRect(2, -48, 8, 12);
    ctx.fillStyle = "#444444";
    ctx.fillRect(-8, -46, 4, 8);
    ctx.fillRect(4, -46, 4, 8);
    // Barrel bores
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-6, -48, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -48, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Barrel tips glow
    ctx.fillStyle = energyColor;
    ctx.fillRect(-8, -48, 3, 2);
    ctx.fillRect(5, -48, 3, 2);
    // Barrel clamp
    ctx.fillStyle = "#555555";
    ctx.fillRect(-10, -40, 20, 2);
    // Metal highlight on barrels
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(-9, -47, 1.5, 10);
    ctx.fillRect(3, -47, 1.5, 10);
    // Main body/receiver
    ctx.fillStyle = "#554433";
    ctx.fillRect(-14, -36, 28, 50);
    ctx.fillStyle = "#665544";
    ctx.fillRect(-11, -33, 22, 44);
    // Receiver detail — loading port
    ctx.fillStyle = "#443322";
    ctx.fillRect(-5, -34, 10, 6);
    // Shell-shaped detail
    ctx.fillStyle = "#887766";
    ctx.beginPath();
    ctx.arc(0, -31, 3, 0, Math.PI * 2);
    ctx.fill();
    // Pump grip
    ctx.fillStyle = "#776655";
    ctx.fillRect(-12, -10, 24, 12);
    ctx.fillStyle = "#887766";
    ctx.fillRect(-10, -8, 20, 8);
    // Pump grip ridges
    ctx.fillStyle = "#665544";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-11, -9 + i * 3, 22, 1);
    }
    // Shell ejection port
    ctx.fillStyle = "#222222";
    ctx.fillRect(8, -30, 5, 8);
    // Visible shell brass
    ctx.fillStyle = "#ccaa44";
    ctx.fillRect(9, -28, 3, 4);
    // Stock
    ctx.fillStyle = "#443322";
    ctx.fillRect(-11, 14, 24, 30);
    ctx.fillStyle = "#554433";
    ctx.fillRect(-9, 16, 20, 26);
    // Stock checkering
    ctx.fillStyle = "#3a2a1a";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-8, 18 + i * 5, 18, 1);
    }
    // Stock butt plate
    ctx.fillStyle = "#332211";
    ctx.fillRect(-10, 42, 22, 3);
    // Temporal coils
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.4 + Math.sin(time * 0.006) * 0.2;
    ctx.fillRect(-12, -25, 2, 20);
    ctx.fillRect(10, -25, 2, 20);
    // Coil energy dots
    for (let i = 0; i < 3; i++) {
      const dotY = -23 + i * 7 + Math.sin(time * 0.008 + i * 1.5) * 2;
      ctx.beginPath();
      ctx.arc(-11, dotY, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(11, dotY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Screws
    ctx.fillStyle = "#998877";
    for (const [rx, ry] of [[-10, -15], [10, -15], [-10, 5], [10, 5]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wep.id === 2) {
    // Plasma Rifle
    // Barrel shroud
    ctx.fillStyle = "#2a2a44";
    ctx.fillRect(-5, -58, 10, 30);
    ctx.fillStyle = "#3a3a55";
    ctx.fillRect(-3, -55, 6, 25);
    // Barrel bore
    ctx.fillStyle = "#1a1a33";
    ctx.beginPath();
    ctx.arc(0, -58, 3, 0, Math.PI * 2);
    ctx.fill();
    // Barrel tip
    ctx.fillStyle = energyColor;
    ctx.fillRect(-4, -60, 8, 3);
    // Cooling vents on barrel
    ctx.fillStyle = "#222244";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-4, -52 + i * 7, 2, 4);
      ctx.fillRect(2, -52 + i * 7, 2, 4);
    }
    // Barrel highlight
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(-4, -57, 1.5, 28);
    // Body/receiver
    ctx.fillStyle = "#2a2a44";
    ctx.fillRect(-10, -28, 20, 48);
    ctx.fillStyle = "#3a3a55";
    ctx.fillRect(-8, -25, 16, 42);
    // Panel lines
    ctx.strokeStyle = "#222244";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(8, -10);
    ctx.moveTo(-8, 5);
    ctx.lineTo(8, 5);
    ctx.stroke();
    // Side panels
    ctx.fillStyle = "#252545";
    ctx.fillRect(-9, -22, 3, 15);
    ctx.fillRect(6, -22, 3, 15);
    // Energy rings (animated)
    ctx.fillStyle = energyColor;
    for (let i = 0; i < 5; i++) {
      const ringA = 0.3 + Math.sin(time * 0.01 + i * 1.2) * 0.3;
      ctx.globalAlpha = ringA;
      ctx.fillRect(-6, -50 + i * 8, 12, 2);
      ctx.beginPath();
      ctx.arc(-7, -49 + i * 8, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(7, -49 + i * 8, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Plasma core chamber
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.15 + Math.sin(time * 0.008) * 0.1;
    ctx.fillRect(-5, -20, 10, 12);
    ctx.globalAlpha = 1;
    // Scope
    ctx.fillStyle = "#222244";
    ctx.fillRect(-3, -55, 6, 8);
    ctx.fillStyle = "#1a1a33";
    ctx.beginPath();
    ctx.arc(0, -59, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, -59, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Scope cross-hair
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(-2, -59);
    ctx.lineTo(2, -59);
    ctx.moveTo(0, -61);
    ctx.lineTo(0, -57);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Magazine/power cell
    ctx.fillStyle = "#1a1a33";
    ctx.fillRect(-4, 8, 10, 14);
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(-2, 10, 6, 10);
    ctx.globalAlpha = 1;
    // Stock
    ctx.fillStyle = "#1a1a33";
    ctx.fillRect(-7, 20, 16, 25);
    ctx.fillStyle = "#252545";
    ctx.fillRect(-5, 22, 12, 20);
    ctx.fillStyle = "#1a1a33";
    ctx.fillRect(-6, 43, 14, 3);
    // Rivets
    ctx.fillStyle = "#5555aa";
    for (const [rx, ry] of [[-8, -8], [8, -8], [-8, 10], [8, 10]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wep.id === 3) {
    // Quantum Cannon
    // Barrel housing
    ctx.fillStyle = "#331111";
    ctx.fillRect(-12, -55, 24, 20);
    ctx.fillStyle = "#441122";
    ctx.fillRect(-10, -52, 20, 15);
    // Barrel bore
    ctx.fillStyle = "#110008";
    ctx.beginPath();
    ctx.arc(0, -55, 5, 0, Math.PI * 2);
    ctx.fill();
    // Barrel rim glow
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 1.5;
    const pulse = 0.4 + Math.sin(time * 0.01) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, -55, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Barrel glow core
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, -48, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = pulse * 0.3;
    ctx.beginPath();
    ctx.arc(0, -48, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Barrel highlight
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(-11, -54, 2, 18);
    // Main body
    ctx.fillStyle = "#441122";
    ctx.fillRect(-18, -35, 36, 55);
    ctx.fillStyle = "#552233";
    ctx.fillRect(-15, -32, 30, 48);
    // Body panel lines
    ctx.strokeStyle = "#331122";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-15, -15);
    ctx.lineTo(15, -15);
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    // Warning stripe
    ctx.fillStyle = "#ff3333";
    ctx.globalAlpha = 0.15;
    ctx.fillRect(-15, -35, 30, 3);
    ctx.globalAlpha = 1;
    // Quantum energy core
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = pulse * 0.8;
    ctx.fillRect(-8, -25, 16, 16);
    ctx.globalAlpha = pulse * 0.4;
    ctx.fillRect(-12, -28, 24, 22);
    ctx.globalAlpha = 1;
    // Core crosshair
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(-4, -17);
    ctx.lineTo(4, -17);
    ctx.moveTo(0, -21);
    ctx.lineTo(0, -13);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Energy conduits on sides
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(-17, -28, 3, 35);
    ctx.fillRect(14, -28, 3, 35);
    ctx.globalAlpha = 1;
    // Conduit energy dots
    for (let i = 0; i < 4; i++) {
      const dotA = 0.3 + Math.sin(time * 0.012 + i * 1.5) * 0.3;
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = dotA;
      ctx.beginPath();
      ctx.arc(-15.5, -22 + i * 8, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(15.5, -22 + i * 8, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Ventilation slits
    ctx.fillStyle = "#220011";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-14, -5 + i * 6, 10, 2);
      ctx.fillRect(4, -5 + i * 6, 10, 2);
    }
    // Heat glow in vents
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = pulse * 0.2;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-13, -4 + i * 6, 8, 1);
      ctx.fillRect(5, -4 + i * 6, 8, 1);
    }
    ctx.globalAlpha = 1;
    // Grip
    ctx.fillStyle = "#330011";
    ctx.fillRect(-12, 20, 26, 28);
    ctx.fillStyle = "#440022";
    ctx.fillRect(-10, 22, 22, 24);
    // Grip texture ridges
    ctx.fillStyle = "#2a000e";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-9, 24 + i * 5, 20, 1.5);
    }
    // Grip cap
    ctx.fillStyle = "#330011";
    ctx.fillRect(-11, 46, 24, 3);
    // Rivets
    ctx.fillStyle = "#aa3355";
    for (const [rx, ry] of [[-16, -30], [16, -30], [-16, 10], [16, 10]]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (wep.id === 4) {
    // Phase Scattergun
    const sPulse = 0.4 + Math.sin(time * 0.009) * 0.3;
    ctx.fillStyle = "#3a1a2a";
    ctx.fillRect(-14, -42, 28, 16);
    ctx.fillStyle = "#4a2a3a";
    ctx.fillRect(-12, -40, 24, 12);
    // Triple barrel bores
    ctx.fillStyle = "#1a0a15";
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath();
      ctx.arc(b * 7, -42, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Barrel tip glow (wide)
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = sPulse;
    ctx.fillRect(-14, -44, 28, 3);
    ctx.globalAlpha = 1;
    // Barrel heat vents (angled)
    ctx.fillStyle = "#2a1020";
    ctx.fillRect(-13, -36, 6, 2);
    ctx.fillRect(7, -36, 6, 2);
    ctx.fillRect(-13, -32, 6, 2);
    ctx.fillRect(7, -32, 6, 2);
    // Vent glow
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = sPulse * 0.3;
    ctx.fillRect(-12, -35, 4, 1);
    ctx.fillRect(8, -35, 4, 1);
    ctx.fillRect(-12, -31, 4, 1);
    ctx.fillRect(8, -31, 4, 1);
    ctx.globalAlpha = 1;
    // Main body
    ctx.fillStyle = "#3a1a2a";
    ctx.fillRect(-16, -26, 32, 44);
    ctx.fillStyle = "#4a2a3a";
    ctx.fillRect(-13, -23, 26, 38);
    // Body panel lines
    ctx.strokeStyle = "#2a0a1a";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-13, -10); ctx.lineTo(13, -10);
    ctx.moveTo(-13, 4); ctx.lineTo(13, 4);
    ctx.stroke();
    // Phase emitter core (centre glow)
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = sPulse * 0.6;
    ctx.beginPath();
    ctx.arc(0, -15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = sPulse * 0.2;
    ctx.beginPath();
    ctx.arc(0, -15, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Side energy conduits
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(-15, -22, 3, 28);
    ctx.fillRect(12, -22, 3, 28);
    ctx.globalAlpha = 1;
    // Conduit energy pulses
    for (let i = 0; i < 3; i++) {
      const dy = Math.sin(time * 0.01 + i * 2) * 2;
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = 0.4 + Math.sin(time * 0.012 + i) * 0.3;
      ctx.beginPath();
      ctx.arc(-13.5, -18 + i * 9 + dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(13.5, -18 + i * 9 + dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pump mechanism
    ctx.fillStyle = "#5a3a4a";
    ctx.fillRect(-12, -2, 24, 10);
    ctx.fillStyle = "#6a4a5a";
    ctx.fillRect(-10, 0, 20, 6);
    // Pump ridges
    ctx.fillStyle = "#4a2a3a";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-11, 0 + i * 3, 22, 1);
    }
    // Stock
    ctx.fillStyle = "#2a1020";
    ctx.fillRect(-10, 18, 22, 26);
    ctx.fillStyle = "#3a1a2a";
    ctx.fillRect(-8, 20, 18, 22);
    // Stock texture
    ctx.fillStyle = "#1a0a15";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-7, 22 + i * 5, 16, 1);
    }
    ctx.fillStyle = "#3a1a2a";
    ctx.fillRect(-9, 42, 20, 3);
    // Warning markings
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(-13, -26, 26, 2);
    ctx.globalAlpha = 1;
    // Rivets
    ctx.fillStyle = "#aa5588";
    for (const [rx, ry] of [[-14, -20], [14, -20], [-14, 8], [14, 8]]) {
      ctx.beginPath(); ctx.arc(rx, ry, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (wep.id === 5) {
    // Temporal Sniper
    const snPulse = 0.4 + Math.sin(time * 0.007) * 0.3;
    // Long barrel
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(-4, -68, 8, 40);
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-3, -65, 6, 35);
    // Barrel bore
    ctx.fillStyle = "#0a1520";
    ctx.beginPath();
    ctx.arc(0, -68, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Barrel tip — focused energy ring
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = snPulse;
    ctx.beginPath();
    ctx.arc(0, -68, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Barrel fluting
    ctx.fillStyle = "#0f1f2f";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-3, -62 + i * 7, 1.5, 4);
      ctx.fillRect(1.5, -62 + i * 7, 1.5, 4);
    }
    // Barrel highlight
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(-3, -67, 1, 38);
    // Scope
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(-6, -58, 12, 14);
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-5, -56, 10, 10);
    // Scope lens
    ctx.fillStyle = "#0a1520";
    ctx.beginPath();
    ctx.arc(0, -51, 4, 0, Math.PI * 2);
    ctx.fill();
    // Scope reticle glow
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.6 + Math.sin(time * 0.01) * 0.3;
    ctx.beginPath();
    ctx.arc(0, -51, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Scope crosshair
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(-3, -51); ctx.lineTo(3, -51);
    ctx.moveTo(0, -54); ctx.lineTo(0, -48);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Scope mount
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-2, -44, 4, 4);
    // Receiver body
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(-8, -28, 16, 40);
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-6, -25, 12, 35);
    // Body panel lines
    ctx.strokeStyle = "#0f1f2f";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-6, -12); ctx.lineTo(6, -12);
    ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
    ctx.stroke();
    // Temporal coil (spine)
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = snPulse * 0.5;
    ctx.fillRect(-1.5, -25, 3, 30);
    // Coil energy pulses (traveling)
    for (let i = 0; i < 4; i++) {
      const dy = ((time * 0.05 + i * 8) % 30) - 25;
      ctx.globalAlpha = snPulse * 0.8;
      ctx.beginPath();
      ctx.arc(0, dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Bolt handle
    ctx.fillStyle = "#4a5a6a";
    ctx.fillRect(6, -20, 6, 3);
    ctx.fillStyle = "#5a6a7a";
    ctx.beginPath();
    ctx.arc(11, -18.5, 2, 0, Math.PI * 2);
    ctx.fill();
    // Magazine
    ctx.fillStyle = "#0f1f2f";
    ctx.fillRect(-3, 5, 8, 12);
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(-1, 7, 4, 8);
    ctx.globalAlpha = 1;
    // Stock
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(-7, 12, 16, 32);
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-5, 14, 12, 28);
    // Cheek rest cutout
    ctx.fillStyle = "#1a2a3a";
    ctx.fillRect(-4, 16, 10, 4);
    // Stock butt plate
    ctx.fillStyle = "#0f1f2f";
    ctx.fillRect(-6, 42, 14, 3);
    // Rivets
    ctx.fillStyle = "#5588cc";
    for (const [rx, ry] of [[-7, -22], [7, -22], [-7, 6], [7, 6]]) {
      ctx.beginPath(); ctx.arc(rx, ry, 1, 0, Math.PI * 2); ctx.fill();
    }
  } else if (wep.id === 6) {
    // Ricochet Pistol
    const rPulse = 0.5 + Math.sin(time * 0.012) * 0.3;
    // Barrel
    ctx.fillStyle = "#3a3520";
    ctx.fillRect(-5, -38, 10, 18);
    ctx.fillStyle = "#4a4530";
    ctx.fillRect(-3, -35, 6, 14);
    // Barrel bore
    ctx.fillStyle = "#1a1810";
    ctx.beginPath();
    ctx.arc(0, -38, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Barrel tip — angular glow
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = rPulse;
    ctx.beginPath();
    ctx.moveTo(-5, -39); ctx.lineTo(5, -39); ctx.lineTo(3, -42); ctx.lineTo(-3, -42);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // Barrel highlight
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(-4, -37, 1.5, 15);
    // Angular ricochet deflector plates
    ctx.fillStyle = "#5a5540";
    ctx.beginPath();
    ctx.moveTo(-7, -30); ctx.lineTo(-5, -36); ctx.lineTo(-5, -25);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(7, -30); ctx.lineTo(5, -36); ctx.lineTo(5, -25);
    ctx.closePath();
    ctx.fill();
    // Main body
    ctx.fillStyle = "#3a3520";
    ctx.fillRect(-8, -20, 16, 32);
    ctx.fillStyle = "#4a4530";
    ctx.fillRect(-6, -18, 12, 28);
    // Ricochet energy channel (diagonal)
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = rPulse * 0.6;
    ctx.beginPath();
    ctx.moveTo(-6, -16); ctx.lineTo(6, -4);
    ctx.moveTo(-6, -4); ctx.lineTo(6, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Energy nodes at channel intersections
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = rPulse;
    ctx.beginPath(); ctx.arc(0, -10, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Panel seam
    ctx.strokeStyle = "#2a2510";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-6, -5); ctx.lineTo(6, -5);
    ctx.stroke();
    // Trigger guard — angular
    ctx.strokeStyle = "#5a5540";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, 8); ctx.lineTo(-4, 14); ctx.lineTo(4, 14); ctx.lineTo(3, 8);
    ctx.stroke();
    // Trigger
    ctx.fillStyle = "#3a3520";
    ctx.fillRect(-1, 8, 2, 5);
    // Grip
    ctx.fillStyle = "#2a2510";
    ctx.fillRect(-6, 12, 14, 24);
    ctx.fillStyle = "#3a3520";
    ctx.fillRect(-4, 14, 10, 20);
    // Grip texture — diamond pattern
    ctx.fillStyle = "#1a1810";
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillRect(-3 + j * 5, 16 + i * 6, 3, 3);
      }
    }
    // Grip cap
    ctx.fillStyle = "#5a5540";
    ctx.fillRect(-5, 34, 12, 2);
    // Rear sight — angular
    ctx.fillStyle = "#3a3520";
    ctx.beginPath();
    ctx.moveTo(-4, -20); ctx.lineTo(-3, -23); ctx.lineTo(-2, -20);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -20); ctx.lineTo(3, -23); ctx.lineTo(4, -20);
    ctx.fill();
    // Rivets — gold
    ctx.fillStyle = "#bbaa55";
    for (const [rx, ry] of [[-6, -8], [6, -8], [-6, 6], [6, 6]]) {
      ctx.beginPath(); ctx.arc(rx, ry, 0.8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (wep.id === 7) {
    // EMP Launcher
    const ePulse = 0.3 + Math.sin(time * 0.008) * 0.4;
    // Wide barrel housing
    ctx.fillStyle = "#1a2a2a";
    ctx.fillRect(-14, -50, 28, 22);
    ctx.fillStyle = "#2a3a3a";
    ctx.fillRect(-12, -48, 24, 18);
    // Barrel bore — large
    ctx.fillStyle = "#0a1515";
    ctx.beginPath();
    ctx.arc(0, -50, 6, 0, Math.PI * 2);
    ctx.fill();
    // EMP charging ring
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = ePulse;
    ctx.beginPath();
    ctx.arc(0, -50, 8, 0, Math.PI * 2);
    ctx.stroke();
    // Inner charge ring
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -50, 4, -Math.PI * ePulse, Math.PI * ePulse);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Barrel glow core
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = ePulse * 0.5;
    ctx.beginPath();
    ctx.arc(0, -44, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Barrel fins (heat dissipation)
    ctx.fillStyle = "#1a2a2a";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-16, -46 + i * 6, 4, 3);
      ctx.fillRect(12, -46 + i * 6, 4, 3);
    }
    // Fin glow
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = ePulse * 0.25;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-15, -45 + i * 6, 2, 1);
      ctx.fillRect(13, -45 + i * 6, 2, 1);
    }
    ctx.globalAlpha = 1;
    // Main body — heavy/armored
    ctx.fillStyle = "#1a2a2a";
    ctx.fillRect(-16, -28, 32, 48);
    ctx.fillStyle = "#2a3a3a";
    ctx.fillRect(-13, -25, 26, 42);
    // Body panel lines
    ctx.strokeStyle = "#0a1a1a";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-13, -12); ctx.lineTo(13, -12);
    ctx.moveTo(-13, 4); ctx.lineTo(13, 4);
    ctx.stroke();
    // EMP capacitor core (large central glow)
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = ePulse * 0.3;
    ctx.fillRect(-10, -22, 20, 18);
    ctx.globalAlpha = ePulse * 0.7;
    ctx.fillRect(-6, -18, 12, 10);
    ctx.globalAlpha = 1;
    // Capacitor discharge arcs (animated)
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = ePulse * 0.8;
    for (let i = 0; i < 4; i++) {
      const ax = -5 + Math.sin(time * 0.02 + i * 1.5) * 5;
      const ay = -17 + Math.cos(time * 0.02 + i * 1.5) * 4;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(ax, ay);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Warning stripes
    ctx.fillStyle = "#ffaa00";
    ctx.globalAlpha = 0.15;
    ctx.fillRect(-13, -28, 26, 3);
    ctx.fillRect(-13, 17, 26, 3);
    ctx.globalAlpha = 1;
    // Side capacitor banks
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(-15, -22, 3, 30);
    ctx.fillRect(12, -22, 3, 30);
    ctx.globalAlpha = 1;
    // Capacitor bank energy dots
    for (let i = 0; i < 4; i++) {
      const cPulse = 0.3 + Math.sin(time * 0.015 + i * 1.2) * 0.4;
      ctx.fillStyle = energyColor;
      ctx.globalAlpha = cPulse;
      ctx.beginPath();
      ctx.arc(-13.5, -16 + i * 7, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(13.5, -16 + i * 7, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Handle/grip — chunky
    ctx.fillStyle = "#0a1a1a";
    ctx.fillRect(-10, 20, 22, 26);
    ctx.fillStyle = "#1a2a2a";
    ctx.fillRect(-8, 22, 18, 22);
    // Grip ridges
    ctx.fillStyle = "#0a1515";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-7, 24 + i * 5, 16, 1.5);
    }
    // Grip cap
    ctx.fillStyle = "#2a3a3a";
    ctx.fillRect(-9, 44, 20, 3);
    // EMP hazard symbol (simple triangle)
    ctx.strokeStyle = energyColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(-4, -12); ctx.lineTo(4, -12);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Rivets — teal
    ctx.fillStyle = "#55aaaa";
    for (const [rx, ry] of [[-14, -24], [14, -24], [-14, 10], [14, 10]]) {
      ctx.beginPath(); ctx.arc(rx, ry, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── Specular highlight strip — thin bright gradient along weapon top edge ──
  {
    // Determine weapon bounds based on type for the highlight strip
    const hx = wep.id === 3 ? -18 : wep.id === 4 ? -16 : wep.id === 7 ? -16 : -10;
    const hw = wep.id === 3 ? 36 : wep.id === 4 ? 32 : wep.id === 7 ? 32 : 20;
    const hy = wep.id === 5 ? -68 : wep.id === 1 ? -48 : wep.id === 3 ? -55 : wep.id === 7 ? -50 : -38;
    const specGrad = ctx.createLinearGradient(hx, hy, hx + hw, hy);
    specGrad.addColorStop(0, "transparent");
    specGrad.addColorStop(0.5, "rgba(255,255,255,0.15)");
    specGrad.addColorStop(1, "transparent");
    ctx.fillStyle = specGrad;
    ctx.fillRect(hx, hy, hw, 2);
  }

  // ── Rim lighting — subtle right-edge cool metallic glow ──
  {
    const rimX = wep.id === 3 ? 14 : wep.id === 4 ? 12 : wep.id === 7 ? 13 : 7;
    const rimTop = wep.id === 5 ? -65 : wep.id === 1 ? -46 : wep.id === 3 ? -52 : wep.id === 7 ? -48 : -35;
    const rimH = wep.id === 5 ? 75 : wep.id === 3 ? 68 : wep.id === 7 ? 65 : 50;
    const rimGrad = ctx.createLinearGradient(rimX, rimTop, rimX + 3, rimTop);
    rimGrad.addColorStop(0, "rgba(200,220,255,0.12)");
    rimGrad.addColorStop(1, "transparent");
    ctx.fillStyle = rimGrad;
    ctx.fillRect(rimX, rimTop, 3, rimH);
  }

  // ── Hands ────────────────────────────────────────────────────────────────
  // Drawn last so they wrap over the weapon. Gloves pick up the character
  // accent so the viewmodel matches the chosen loadout palette.
  drawHands(ctx, wep, energyColor, opts.skinTone || "#c9956a", ads);

  ctx.restore();
}

/**
 * Procedural gloved hands gripping the weapon. Weapons all share the same local
 * space — grip around y≈22, receiver around y≈-5 — so one firing hand reads
 * across the whole arsenal, with a per-weapon support-hand grip:
 * sidearms get a cupping hand under the grip, long guns clamp the pump /
 * handguard, heavy weapons grab the left flank.
 */
const SUPPORT_GRIPS = {
  0: { cup: true },
  6: { cup: true },
  1: { x0: -13, x1: 12, y: -8, rows: 3, gap: 3.8 },
  4: { x0: -13, x1: 12, y: -1, rows: 3, gap: 3.4 },
  2: { x0: -11, x1: 10, y: -24, rows: 3, gap: 3.8 },
  5: { x0: -9, x1: 8, y: -22, rows: 3, gap: 3.8 },
  3: { x0: -25, x1: -11, y: -9, rows: 4, gap: 3.8 },
  7: { x0: -23, x1: -9, y: -7, rows: 4, gap: 3.8 },
};

const HAND_INK = "#04060b";
// Gradients live in the weapon's local space, so one per context serves every frame.
const handPaints = new WeakMap();
function getHandPaints(ctx) {
  let p = handPaints.get(ctx);
  if (p) return p;
  const glove = ctx.createLinearGradient(-24, -30, 30, 60);
  glove.addColorStop(0, "#4a5462");
  glove.addColorStop(0.4, "#2a313c");
  glove.addColorStop(1, "#10141a");
  const sleeve = ctx.createLinearGradient(-40, 30, 40, 70);
  sleeve.addColorStop(0, "#34465c");
  sleeve.addColorStop(0.5, "#1c2a3a");
  sleeve.addColorStop(1, "#0b111a");
  p = { glove, sleeve };
  handPaints.set(ctx, p);
  return p;
}

/** Tapered capsule from (ax, ay) to (bx, by), filled with the current fillStyle and inked. */
function handSeg(ctx, ax, ay, bx, by, wa, wb) {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len;
  const ny = (bx - ax) / len;
  const ang = Math.atan2(by - ay, bx - ax);
  ctx.beginPath();
  ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2);
  ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
  ctx.arc(bx, by, wb / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
  ctx.arc(ax, ay, wa / 2, ang - Math.PI / 2, ang + Math.PI / 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Finger through joints [x, y, ...] with widths per joint; lit edge + knuckle crease. */
function handFinger(ctx, pts, widths) {
  for (let i = 0; i < pts.length / 2 - 1; i++) {
    handSeg(ctx, pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3], widths[i], widths[i + 1]);
  }
  // Soft highlight along the upper edge of the first two segments.
  ctx.save();
  ctx.strokeStyle = "rgba(200,215,230,0.22)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1] - widths[0] * 0.28);
  ctx.lineTo(pts[2], pts[3] - widths[1] * 0.28);
  ctx.lineTo(pts[4], pts[5] - widths[2] * 0.28);
  ctx.stroke();
  ctx.restore();
}

/** Sleeve from the screen edge to the wrist, glove cuff and accent trim. */
function handForearm(ctx, paints, accent, x0, x1, bottom, wx0, wy0, wx1, wy1) {
  ctx.fillStyle = paints.sleeve;
  ctx.beginPath();
  ctx.moveTo(x0, bottom);
  ctx.lineTo(wx0, wy0);
  ctx.lineTo(wx1, wy1);
  ctx.lineTo(x1, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const at = (t) => [wx0 + (x0 - wx0) * t, wy0 + (bottom - wy0) * t, wx1 + (x1 - wx1) * t, wy1 + (bottom - wy1) * t];
  // Accent trim band.
  const [a0, b0, a1, b1] = at(0.24);
  const [c0, d0, c1, d1] = at(0.3);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(a0, b0);
  ctx.lineTo(a1, b1);
  ctx.lineTo(c1, d1);
  ctx.lineTo(c0, d0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Fold line.
  const [e0, f0, e1, f1] = at(0.55);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(e0 + (e1 - e0) * 0.15, f0 + (f1 - f0) * 0.15);
  ctx.lineTo(e0 + (e1 - e0) * 0.6, f0 + (f1 - f0) * 0.6 - 1.2);
  ctx.stroke();
  ctx.restore();
  // Glove cuff over the wrist.
  const [g0, h0, g1, h1] = at(0.14);
  ctx.fillStyle = "#171c24";
  ctx.beginPath();
  ctx.moveTo(wx0 - (x0 - wx0) * 0.04, wy0 - (bottom - wy0) * 0.04);
  ctx.lineTo(wx1 - (x1 - wx1) * 0.04, wy1 - (bottom - wy1) * 0.04);
  ctx.lineTo(g1, h1);
  ctx.lineTo(g0, h0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHands(ctx, wep, accent, skin, ads) {
  const paints = getHandPaints(ctx);
  const grip = SUPPORT_GRIPS[wep.id] || SUPPORT_GRIPS[0];
  const gx = 1;
  const gy = 22;

  ctx.save();
  ctx.strokeStyle = HAND_INK;
  ctx.lineWidth = 0.55;
  ctx.lineJoin = "round";

  // ── Support hand: forearm and palm (fingers come after the firing hand) ──
  if (grip.cup) {
    handForearm(ctx, paints, accent, -34, -16, 64, -15, 32, -5, 38);
    ctx.fillStyle = paints.glove;
    ctx.beginPath();
    ctx.moveTo(-10, 18);
    ctx.quadraticCurveTo(-4, 26, -3, 38);
    ctx.lineTo(-6, 41);
    ctx.quadraticCurveTo(-14, 40, -16, 33);
    ctx.quadraticCurveTo(-15, 24, -10, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Support thumb along the left of the frame.
    handFinger(ctx, [-10, 24, -10.5, 16, -9.5, 9], [4.4, 3.9, 3.4]);
  } else {
    const { x0, y, rows, gap } = grip;
    const yb = y + rows * gap;
    handForearm(ctx, paints, accent, x0 - 26, x0 - 8, 64, x0 - 9, yb + 4, x0 + 1, yb + 8);
    ctx.fillStyle = paints.glove;
    ctx.beginPath();
    ctx.moveTo(x0 - 3.5, y - 3);
    ctx.quadraticCurveTo(x0 + 3, y - 2, x0 + 3.5, yb);
    ctx.quadraticCurveTo(x0 + 2, yb + 7, x0 - 3, yb + 8);
    ctx.quadraticCurveTo(x0 - 9, yb + 5, x0 - 8, yb - 2);
    ctx.quadraticCurveTo(x0 - 7, y, x0 - 3.5, y - 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Thumb up the near edge.
    handFinger(ctx, [x0 - 5, yb, x0 - 4.5, y + 1, x0 - 3, y - 5], [4.4, 3.9, 3.4]);
  }

  // ── Firing hand (enters from lower right) ──
  handForearm(ctx, paints, accent, gx + 10, gx + 30, 64, gx + 5, gy + 18, gx + 16, gy + 12);
  ctx.fillStyle = paints.glove;
  // Back of the hand on the right flank of the grip.
  ctx.beginPath();
  ctx.moveTo(gx + 2, gy - 9);
  ctx.quadraticCurveTo(gx + 10, gy - 10, gx + 12, gy - 2);
  ctx.quadraticCurveTo(gx + 16, gy + 8, gx + 16, gy + 13);
  ctx.lineTo(gx + 5, gy + 19);
  ctx.quadraticCurveTo(gx + 3, gy + 8, gx + 2, gy - 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Fingers wrapping the front strap: index at the trigger, then middle/ring/pinky.
  const rows = [gy - 10, gy - 4.5, gy, gy + 4.4];
  const fw = [3.9, 3.9, 3.7, 3.3];
  for (let i = rows.length - 1; i >= 0; i--) {
    const y = rows[i];
    const reach = i === 0 ? 1.5 : 0;
    handFinger(ctx, [gx + 9.5, y + 0.6, gx + 2.5 + reach, y - 0.2, gx - 3.5 + reach, y + 0.4, gx - 6 + reach, y + 2.2], [fw[i], fw[i] * 0.95, fw[i] * 0.88, fw[i] * 0.78]);
  }
  // Knuckle plates across the back of the fingers.
  ctx.fillStyle = "#5d7185";
  for (let i = 0; i < rows.length; i++) {
    ctx.beginPath();
    ctx.ellipse(gx + 9.3, rows[i] + 0.4, 1.5, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(230,240,250,0.35)";
  for (let i = 0; i < rows.length; i++) ctx.fillRect(gx + 8.6, rows[i] - 0.4, 1.1, 0.5);
  // Thumb over the top of the grip.
  ctx.fillStyle = paints.glove;
  handFinger(ctx, [gx + 7, gy - 8, gx + 1, gy - 12, gx - 5, gy - 13], [4.8, 4.2, 3.6]);

  // ── Support fingers ──
  if (grip.cup) {
    // Wrapped round the front below the firing hand's pinky.
    for (const [y, w] of [[31.5, 3.8], [35.8, 3.6], [39.8, 3.2]]) {
      handFinger(ctx, [-9, y + 1, -2, y - 0.4, 5, y, 8.5, y + 1.8], [w, w * 0.95, w * 0.88, w * 0.78]);
    }
  } else {
    const { x0, x1, y, rows: n, gap } = grip;
    for (let i = n - 1; i >= 0; i--) {
      const fy = y + i * gap;
      const w = 3.7 - i * 0.12;
      handFinger(ctx, [x0 + 1, fy + 0.4, x0 + (x1 - x0) * 0.45, fy - 0.4, x1 - 2, fy, x1 + 0.5, fy + 1.6], [w, w * 0.95, w * 0.88, w * 0.78]);
    }
  }

  ctx.restore();
}
