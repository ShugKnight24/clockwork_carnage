/**
 * The Forge's first-person hand: a gloved fist holding what the hotbar has
 * selected — a pickaxe, a block, a bucket — drawn on the HUD canvas.
 *
 * `ForgeHand` keeps the motion (mining swings, a punch when placing, walking
 * bob, the drop-and-raise of switching items) and the chips that fly off a
 * block being worked; `drawForgeHand` draws it. Both are screen space and
 * scale with the canvas height, so they cost a few dozen path calls a frame.
 */
import { BLOCKS } from "../world/blocks.js";
import { itemById, blockForItem } from "../rpg/items.js";

/** Seconds per mining swing: about the chip-sound cadence of a held break. */
const SWING_S = 0.3;
const PUNCH_S = 0.2;
const SWITCH_S = 0.24;
const GRAVITY = 1500;

const PICK_HEADS = {
  pick_stone: ["#a3a6ab", "#6e7176", "#45484d"],
  pick_metal: ["#e6edf3", "#9fb0c0", "#5b6a79"],
};

export class ForgeHand {
  constructor() {
    this.swingT = -1; // seconds into the current swing; -1 = not swinging
    this.punchT = -1;
    this.switchT = SWITCH_S; // settled
    this.bobPh = 0;
    this.bobAmt = 0;
    this.clock = 0;
    this.held = undefined;
    this.chips = [];
    // The canvas size the hand was last drawn at (chips start at its centre).
    this.w = 1280;
    this.h = 720;
  }

  /** Start a swing (a click, or a held break keeps them coming). */
  swing() {
    if (this.swingT < 0 || this.swingT > SWING_S * 0.6) this.swingT = 0;
  }

  punch() {
    this.punchT = 0;
  }

  /**
   * Chips off the block under the crosshair, in screen space.
   * @param {string} color block colour
   * @param {number} n how many
   */
  chip(color, n) {
    const w = this.w;
    const h = this.h;
    const s = h / 720;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const v = (220 + Math.random() * 260) * s;
      this.chips.push({
        x: w / 2 + (Math.random() - 0.5) * 16 * s,
        y: h / 2 + (Math.random() - 0.5) * 16 * s,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        size: (4 + Math.random() * 6) * s,
        life: 0.45 + Math.random() * 0.35,
        t: 0,
        color: shade(color, (Math.random() - 0.5) * 0.5),
        spin: Math.random() * Math.PI,
      });
    }
    if (this.chips.length > 120) this.chips.splice(0, this.chips.length - 120);
  }

  /**
   * @param {number} dt seconds
   * @param {{ mining: boolean, moving: boolean, held: string|null }} state
   */
  update(dt, { mining, moving, held }) {
    const h = this.h;
    this.clock += dt;
    if (held !== this.held) {
      // The first item the hand ever sees is simply there; later ones swap in.
      this.switchT = this.held === undefined ? SWITCH_S : 0;
      this.held = held;
    }
    if (this.switchT < SWITCH_S) this.switchT += dt;
    if (mining) this.swing();
    if (this.swingT >= 0) {
      this.swingT += dt;
      if (this.swingT >= SWING_S) this.swingT = mining ? this.swingT - SWING_S : -1;
    }
    if (this.punchT >= 0) {
      this.punchT += dt;
      if (this.punchT >= PUNCH_S) this.punchT = -1;
    }
    this.bobAmt += ((moving ? 1 : 0) - this.bobAmt) * Math.min(1, dt * 8);
    if (moving) this.bobPh += dt * 9;
    const g = GRAVITY * (h / 720);
    for (const c of this.chips) {
      c.t += dt;
      c.vy += g * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.spin += dt * 8;
    }
    this.chips = this.chips.filter((c) => c.t < c.life);
  }
}

/** What the hand should be holding, as a stable key. */
export function heldKey(forge) {
  if (forge.riding) return "none";
  if (forge.survival) return forge.heldItem ?? "hand";
  return forge.toolMode === "block" ? `block:${forge.tile}` : "hand";
}

/**
 * Draw the hand and its item, and the mining chips.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawForgeHand(ctx, w, h, hand, held, accent = "#00ffcc") {
  hand.w = w;
  hand.h = h;
  drawChips(ctx, hand.chips, h);
  if (held === "none") return;
  const s = h / 720;

  // ── Motion ────────────────────────────────────────────────────────────
  let rot = 0;
  let dx = 0;
  let dy = 0;
  let depth = 0;
  if (hand.swingT >= 0) {
    // Wind up (head back over the shoulder), strike in at the crosshair, recover.
    const p = hand.swingT / SWING_S;
    const [r, x, y, z] = swingPose(p);
    rot += r;
    dx += x * s;
    dy += y * s;
    depth += z;
  }
  if (hand.punchT >= 0) {
    const p = hand.punchT / PUNCH_S;
    const k = Math.sin(Math.PI * Math.min(1, p * 1.15));
    dx -= k * 60 * s;
    dy -= k * 46 * s;
    rot -= k * 0.12;
    depth += k * 0.1;
  }
  const sw = hand.switchT / SWITCH_S;
  dy += (1 - easeOut(Math.min(1, sw))) * 220 * s;
  dx += Math.sin(hand.bobPh) * 9 * s * hand.bobAmt;
  dy += Math.abs(Math.cos(hand.bobPh)) * 8 * s * hand.bobAmt + Math.sin(hand.clock * 1.7) * 2.5 * s;

  ctx.save();
  ctx.translate(w * 0.5 + Math.min(w * 0.24, 330 * s) + dx, h - 70 * s + dy);
  ctx.rotate(-0.32 + rot);
  ctx.scale(s * (1 - depth), s * (1 - depth));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const item = itemById(held);
  if (held && held.startsWith("block:")) drawCube(ctx, BLOCKS[Number(held.slice(6))]?.color ?? "#888");
  else if (PICK_HEADS[held]) drawPick(ctx, PICK_HEADS[held]);
  else if (held === "bucket" || held === "bucket_water") drawBucket(ctx, held === "bucket_water");
  else if (item) {
    const b = blockForItem(held);
    drawCube(ctx, b != null ? BLOCKS[b]?.color ?? "#888" : item.color ?? "#888");
  }
  drawGlove(ctx, accent, !item && !(held && held.startsWith("block:")));
  ctx.restore();
}

// ── Pieces (local space: the fist sits at the origin, the arm runs down) ──

const INK = "#0a0d12";

function drawGlove(ctx, accent, open) {
  // Forearm and cuff, running off the bottom of the screen.
  ctx.fillStyle = grad(ctx, -60, 0, 60, 0, ["#1d232b", "#3a4552", "#222a33"]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-52, 40);
  ctx.lineTo(52, 40);
  ctx.lineTo(70, 260);
  ctx.lineTo(-70, 260);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-56, 78, 114, 7);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#151a20";
  ctx.fillRect(-55, 40, 110, 18);

  // Fist.
  ctx.fillStyle = grad(ctx, -50, -40, 50, 40, ["#46525f", "#2c343e", "#1b2027"]);
  ctx.beginPath();
  ctx.roundRect(-50, -38, 100, 84, 22);
  ctx.fill();
  ctx.stroke();
  // Knuckle plates (or splayed fingers on an empty hand).
  for (let i = 0; i < 4; i++) {
    const x = -42 + i * 22;
    ctx.fillStyle = i % 2 ? "#566373" : "#4d5968";
    ctx.beginPath();
    if (open) ctx.roundRect(x, -64 + Math.abs(i - 1.5) * 6, 18, 40, 8);
    else ctx.roundRect(x, -44, 19, 22, 6);
    ctx.fill();
    ctx.stroke();
  }
  // Thumb across the front.
  ctx.fillStyle = "#3d4855";
  ctx.beginPath();
  ctx.roundRect(-46, -8, 60, 24, 11);
  ctx.fill();
  ctx.stroke();
  // Glint.
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-38, -30);
  ctx.lineTo(30, -30);
  ctx.stroke();
}

function drawPick(ctx, [hi, mid, lo]) {
  // Handle up through the fist, leaning toward the crosshair.
  ctx.save();
  ctx.rotate(-0.18);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.fillStyle = grad(ctx, -9, 0, 9, 0, ["#5a3b1f", "#8b5e34", "#4a2f18"]);
  ctx.beginPath();
  ctx.roundRect(-9, -250, 18, 300, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  for (let y = -230; y < 30; y += 34) {
    ctx.beginPath();
    ctx.moveTo(-3, y);
    ctx.lineTo(2, y + 18);
    ctx.stroke();
  }
  // Head: a curved bar across the top of the handle.
  ctx.translate(0, -238);
  ctx.fillStyle = grad(ctx, 0, -30, 0, 26, [hi, mid, lo]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-118, 26);
  ctx.quadraticCurveTo(-70, -34, 0, -30);
  ctx.quadraticCurveTo(70, -34, 118, 26);
  ctx.quadraticCurveTo(66, -6, 0, 4);
  ctx.quadraticCurveTo(-66, -6, -118, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-84, -4);
  ctx.quadraticCurveTo(-40, -26, 0, -24);
  ctx.stroke();
  // Lashing where head meets handle.
  ctx.fillStyle = "#3b2a1b";
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.roundRect(-15, -14, 30, 34, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCube(ctx, color) {
  // A block held up in the fist, three faces lit from the top left.
  const S = 66;
  ctx.save();
  ctx.translate(-4, -96);
  ctx.rotate(0.28);
  const top = [[0, -S * 0.55], [S, -S * 0.05], [0, S * 0.45], [-S, -S * 0.05]];
  const left = [[-S, -S * 0.05], [0, S * 0.45], [0, S * 1.45], [-S, S * 0.95]];
  const right = [[0, S * 0.45], [S, -S * 0.05], [S, S * 0.95], [0, S * 1.45]];
  face(ctx, top, shade(color, 0.28));
  face(ctx, left, color);
  face(ctx, right, shade(color, -0.32));
  // A little texture so it reads as a block, not a flat diamond.
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  for (let i = 0; i < 7; i++) {
    const u = ((i * 37) % 9) / 9;
    const v = ((i * 53) % 7) / 7;
    ctx.fillRect(-S + u * S * 0.9 + 6, S * 0.05 + v * S * 0.9 + u * S * 0.5, 9, 9);
    ctx.fillRect(u * S * 0.9 + 4, S * 0.5 + v * S * 0.8 - u * S * 0.5, 9, 9);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBucket(ctx, full) {
  ctx.save();
  ctx.translate(-6, -110);
  ctx.rotate(0.18);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.fillStyle = grad(ctx, -60, 0, 60, 0, ["#6f7882", "#b9c2cb", "#59626b"]);
  ctx.beginPath();
  ctx.moveTo(-62, -40);
  ctx.lineTo(62, -40);
  ctx.lineTo(46, 70);
  ctx.lineTo(-46, 70);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = full ? "#2f8fbf" : "#2a3038";
  ctx.beginPath();
  ctx.ellipse(0, -40, 62, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (full) {
    ctx.fillStyle = "rgba(190,240,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(-16, -43, 20, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -36, 60, Math.PI * 1.05, Math.PI * 1.95, false);
  ctx.stroke();
  ctx.restore();
}

function drawChips(ctx, chips, h) {
  if (!chips.length) return;
  ctx.save();
  for (const c of chips) {
    ctx.globalAlpha = Math.max(0, 1 - c.t / c.life);
    ctx.fillStyle = c.color;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.spin);
    ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
    ctx.restore();
  }
  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────────────────

function face(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

/** Lighten (k > 0) or darken (k < 0) a #rrggbb colour. */
export function shade(hex, k) {
  const n = parseInt(String(hex).slice(1, 7), 16) || 0;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)),
  );
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

/**
 * Swing keyframes: [rotation, x, y, depth] at phase 0..1 (rest, wound up,
 * struck, rest). Depth shrinks the hand as it drives into the screen.
 */
const SWING_KEYS = [
  [0, [0, 0, 0, 0]],
  [0.28, [0.4, 36, 28, -0.04]],
  [0.48, [-0.22, -150, -46, 0.12]],
  [1, [0, 0, 0, 0]],
];
function swingPose(p) {
  for (let i = 1; i < SWING_KEYS.length; i++) {
    const [t1, b] = SWING_KEYS[i];
    const [t0, a] = SWING_KEYS[i - 1];
    if (p <= t1) {
      const k = (p - t0) / (t1 - t0);
      // The strike snaps in; wind-up and recovery ease.
      const e = i === 2 ? k * k * k : easeInOut(k);
      return a.map((v, j) => v + (b[j] - v) * e);
    }
  }
  return [0, 0, 0, 0];
}

const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
