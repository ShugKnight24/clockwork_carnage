// Weather / atmosphere system — per-act particle effects rendered on the 2D
// canvas overlay.  Purely cosmetic; zero gameplay impact.
//
// Act 1: Floating digital data motes (cyan/teal, drifting, flickering)
// Act 2: Amber ember particles (warm orange, floating upward)
// Act 3: Temporal crack lightning + red warning-light edge pulse
//
// All particle arrays are pre-allocated and reused (no GC pressure).

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACT1_COUNT = 20;
const ACT2_COUNT = 15;

// Act 3 — lightning timing (ms)
const LIGHTNING_MIN_INTERVAL = 3000;
const LIGHTNING_MAX_INTERVAL = 8000;
const LIGHTNING_DURATION = 50; // ms

// Act 3 — red warning pulse period
const WARNING_PULSE_PERIOD = 2000; // ms

// ---------------------------------------------------------------------------
// Particle pools  (allocated once)
// ---------------------------------------------------------------------------

/** @typedef {{ x:number, y:number, vx:number, vy:number, size:number, alpha:number, flicker:number, flickerSpeed:number }} Mote */
/** @typedef {{ x:number, y:number, vy:number, size:number, alpha:number, drift:number }} Ember */

/** @type {Mote[]} */
let dataMotes = [];
/** @type {Ember[]} */
let embers = [];

// Act 3 state
let nextLightningAt = 0;   // game.time when next flash fires
let lightningEndAt = 0;     // game.time when current flash ends
let lightningX = 0;
let lightningY = 0;

let _inited = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

function _initMote(m, w, h) {
  m.x = Math.random() * w;
  m.y = Math.random() * h;
  m.vx = rand(-8, 8);          // px/s — slow horizontal drift
  m.vy = rand(-12, 4);         // slight upward bias
  m.size = rand(1, 2.5);
  m.alpha = rand(0.15, 0.45);
  m.flicker = Math.random() * Math.PI * 2;
  m.flickerSpeed = rand(2, 6); // radians/s
}

function _initEmber(e, w, h) {
  e.x = Math.random() * w;
  e.y = h + rand(0, 40);       // start at/below bottom
  e.vy = rand(-25, -10);       // float upward
  e.size = rand(1, 3);
  e.alpha = rand(0.2, 0.55);
  e.drift = rand(-6, 6);       // horizontal sway px/s
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pre-allocate particle pools.  Safe to call multiple times (idempotent).
 */
export function initWeather() {
  if (_inited) return;
  _inited = true;

  dataMotes = new Array(ACT1_COUNT);
  for (let i = 0; i < ACT1_COUNT; i++) {
    dataMotes[i] = { x: 0, y: 0, vx: 0, vy: 0, size: 1, alpha: 0.3, flicker: 0, flickerSpeed: 3 };
  }

  embers = new Array(ACT2_COUNT);
  for (let i = 0; i < ACT2_COUNT; i++) {
    embers[i] = { x: 0, y: 0, vy: -15, size: 2, alpha: 0.3, drift: 0 };
  }
}

/**
 * Render per-act atmospheric effects.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w   canvas width
 * @param {number} h   canvas height
 * @param {object} game
 */
export function renderWeather(ctx, w, h, game) {
  // Auto-init particle pools if not already done
  if (!_inited) initWeather();

  // Quality gate ─ skip on Low effects or very low particle multiplier
  if (game.settings?.effectsQuality === 0) return;
  if ((game.quality?.particleMultiplier ?? 1) < 0.3) return;

  const act = game.campaign?.act || 1;
  const t = game.time || 0;       // ms
  const dt = game.deltaTime || 0; // seconds

  if (act === 1) {
    _renderDataMotes(ctx, w, h, t, dt);
  } else if (act === 2) {
    _renderEmbers(ctx, w, h, t, dt);
  } else if (act === 3) {
    _renderTemporalCracks(ctx, w, h, t);
    _renderWarningPulse(ctx, w, h, t);
  }
}

// ---------------------------------------------------------------------------
// Act 1 — Digital data motes
// ---------------------------------------------------------------------------

let _motesSeeded = false;

function _renderDataMotes(ctx, w, h, t, dt) {
  if (!_motesSeeded) {
    for (let i = 0; i < ACT1_COUNT; i++) _initMote(dataMotes[i], w, h);
    _motesSeeded = true;
  }

  ctx.save();
  for (let i = 0; i < ACT1_COUNT; i++) {
    const m = dataMotes[i];

    // Update position
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.flicker += m.flickerSpeed * dt;

    // Wrap around screen edges
    if (m.x < -4) m.x = w + 2;
    else if (m.x > w + 4) m.x = -2;
    if (m.y < -4) m.y = h + 2;
    else if (m.y > h + 4) m.y = -2;

    // Flicker alpha — occasionally dip to near-zero for a "data glitch" look
    const flickerMul = 0.5 + 0.5 * Math.sin(m.flicker);
    const a = m.alpha * flickerMul;
    if (a < 0.03) continue; // invisible — skip draw

    // Cyan/teal tone with slight hue variation per mote
    const hue = 175 + (i % 5) * 6; // 175-199 range (cyan→teal)
    ctx.globalAlpha = a;
    ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Act 2 — Amber ember particles
// ---------------------------------------------------------------------------

let _embersSeeded = false;

function _renderEmbers(ctx, w, h, t, dt) {
  if (!_embersSeeded) {
    for (let i = 0; i < ACT2_COUNT; i++) _initEmber(embers[i], w, h);
    _embersSeeded = true;
  }

  ctx.save();
  for (let i = 0; i < ACT2_COUNT; i++) {
    const e = embers[i];

    // Update
    e.y += e.vy * dt;
    e.x += e.drift * dt;

    // Reset when it floats off the top
    if (e.y < -10) {
      _initEmber(e, w, h);
    }

    // Subtle pulsing glow
    const pulse = 0.7 + 0.3 * Math.sin(t * 0.003 + i * 1.7);
    const a = e.alpha * pulse;
    if (a < 0.03) continue;

    // Warm amber/orange — slight per-particle hue shift
    const hue = 25 + (i % 4) * 8; // 25-49 range (orange→amber)
    ctx.globalAlpha = a;
    ctx.fillStyle = `hsl(${hue}, 95%, 58%)`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();

    // Faint glow halo
    if (e.size > 1.5) {
      ctx.globalAlpha = a * 0.25;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Act 3 — Temporal crack lightning
// ---------------------------------------------------------------------------

function _renderTemporalCracks(ctx, w, h, t) {
  // Schedule next flash
  if (t >= nextLightningAt) {
    lightningX = rand(w * 0.1, w * 0.9);
    lightningY = rand(h * 0.1, h * 0.9);
    lightningEndAt = t + LIGHTNING_DURATION;
    nextLightningAt = t + rand(LIGHTNING_MIN_INTERVAL, LIGHTNING_MAX_INTERVAL);
  }

  // Render active flash
  if (t < lightningEndAt) {
    const progress = 1 - (lightningEndAt - t) / LIGHTNING_DURATION; // 0→1
    const fade = 1 - progress; // bright at start, gone at end

    ctx.save();
    ctx.globalAlpha = 0.35 * fade;

    // Core bright line
    const len = rand(40, 90);
    const angle = rand(0, Math.PI * 2);
    const x2 = lightningX + Math.cos(angle) * len;
    const y2 = lightningY + Math.sin(angle) * len;

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * fade})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(220, 40, 60, 0.6)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(lightningX, lightningY);
    // Jagged midpoint for crack look
    const mx = (lightningX + x2) / 2 + rand(-12, 12);
    const my = (lightningY + y2) / 2 + rand(-12, 12);
    ctx.lineTo(mx, my);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Small branch
    const bAngle = angle + rand(-0.8, 0.8);
    const bLen = len * 0.4;
    ctx.strokeStyle = `rgba(220, 60, 80, ${0.5 * fade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.cos(bAngle) * bLen, my + Math.sin(bAngle) * bLen);
    ctx.stroke();

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Act 3 — Red warning-light edge pulse
// ---------------------------------------------------------------------------

function _renderWarningPulse(ctx, w, h, t) {
  // Sinusoidal pulse: 0→1→0 over WARNING_PULSE_PERIOD
  const phase = (t % WARNING_PULSE_PERIOD) / WARNING_PULSE_PERIOD;
  const intensity = Math.sin(phase * Math.PI); // peaks at 0.5
  const a = intensity * 0.08; // very subtle max 8% opacity
  if (a < 0.005) return;

  ctx.save();
  ctx.globalAlpha = a;

  // Left edge
  const gL = ctx.createLinearGradient(0, 0, 60, 0);
  gL.addColorStop(0, "rgba(180, 20, 30, 1)");
  gL.addColorStop(1, "rgba(180, 20, 30, 0)");
  ctx.fillStyle = gL;
  ctx.fillRect(0, 0, 60, h);

  // Right edge
  const gR = ctx.createLinearGradient(w, 0, w - 60, 0);
  gR.addColorStop(0, "rgba(180, 20, 30, 1)");
  gR.addColorStop(1, "rgba(180, 20, 30, 0)");
  ctx.fillStyle = gR;
  ctx.fillRect(w - 60, 0, 60, h);

  // Top edge (thinner)
  const gT = ctx.createLinearGradient(0, 0, 0, 35);
  gT.addColorStop(0, "rgba(180, 20, 30, 1)");
  gT.addColorStop(1, "rgba(180, 20, 30, 0)");
  ctx.fillStyle = gT;
  ctx.fillRect(0, 0, w, 35);

  // Bottom edge (thinner)
  const gB = ctx.createLinearGradient(0, h, 0, h - 35);
  gB.addColorStop(0, "rgba(180, 20, 30, 1)");
  gB.addColorStop(1, "rgba(180, 20, 30, 0)");
  ctx.fillStyle = gB;
  ctx.fillRect(0, h - 35, w, 35);

  ctx.restore();
}
