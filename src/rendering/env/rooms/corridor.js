/**
 * Wall painters for the station's corridor (src/data/levels/rooms/corridor.js places
 * them), painted like src/rendering/env/range-art.js. Keyed by wall id.
 *
 * The public half of the station: the main corridor with its wayfinding
 * stripe, a sign at every branch, notice boards, wanted posters, the fire
 * point and the division's crest; the break room's kitchenette, fridge and
 * roster board; the armory's caged racks, ammo lockers and sign-out sheet;
 * the lobby's crest wall.
 *
 * Lettering goes through locker-art's mirrored `letter` (the raycaster lays a
 * texture across a face mirrored), so a thing painted at canvas left shows at
 * screen right. Everything that carries text or a picture stands on a raised
 * plate(): Realistic's bake repaints a flat face.
 */

import { CORRIDOR_WALLS } from "../../../data/levels/rooms/corridor.js";
import { letter } from "../locker-art.js";
import { T, lin, plate, ink, lightStrip, led, vents, relief, grey, sink, raise, hazard, emit, material } from "../paint.js";


const BAND = 110; // the dark band under the ceiling, like the locker room's wall above
const RAIL = 292; // chair rail
const KICKY = 456; // rubber base
const FONT = "Arial, Helvetica, sans-serif";

export const PAPER = ["#f4f2ea", "#e8e6dc", "#d0cec4"];
export const NAVY = ["#2e4a7a", "#22385e", "#16243e"];
export const STEEL = ["#9aa2ac", "#6e767f", "#3e444c"];
export const BLACK = ["#1e2126", "#15171b", "#0b0c0e"];
export const BRASS = "#d8b25a";

/** Text size that fits `maxW` (canvas px). */
function fit(ctx, text, size, maxW, weight) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  ctx.restore();
  return w > maxW ? Math.floor((size * maxW) / w) : size;
}

/** Mirrored lettering, shrunk to fit `maxW`. */
export function say(ctx, text, x, y, size, color, weight = 900, maxW = 1e9) {
  letter(ctx, text, x, y, fit(ctx, text, size, maxW, weight), color, weight);
}

/** Lettering that gives light (an LED readout): unlit by the bake. */
export function glow(ctx, text, x, y, size, color, weight = 900) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.6;
  letter(ctx, text, x, y, size, color, weight);
  ctx.restore();
  emit((g) => {
    g.translate(x, y);
    g.scale(-1, 1);
    g.font = `${weight} ${size}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 0, 0);
  }, 3);
}

/** A sheet of paper on a board (a thin raised plate), with its pin. */
export function paper(ctx, p, x, y, w, h, pin = "#c23a2a", tones = PAPER) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 3, y + 4, w, h);
  plate(ctx, x, y, w, h, p, { tones: [tones[0], tones[1], tones[2]], bevel: 2, ink: 1.5, spec: false });
  if (pin) {
    ctx.fillStyle = pin;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    raise(x + w / 2 - 3, y + 4, 6, 6, 10);
  }
}

/** Ruled lines of handwriting/typing on a sheet. */
export function lines(ctx, r, x, y, w, n, gap = 9, color = "rgba(30,34,44,0.6)") {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + i * gap, w * (0.55 + r() * 0.45), 2);
  }
}

// ── The station's painted wall ───────────────────────────────────

/**
 * Painted block: the dark band under the ceiling (the locker room's), light
 * paint, the blue-and-gold wayfinding stripe, a chair rail, the navy
 * wainscot and the rubber base. `tone` warms it for the break room.
 */
export function stationWall(ctx, p, r, o = {}) {
  const paint = o.paint || ["#b8b7ae", "#a9a79e", "#94928a"];
  ctx.fillStyle = lin(ctx, 0, 0, 0, BAND, [[0, "#3c4450"], [1, "#56606c"]]);
  ctx.fillRect(0, 0, T, BAND);
  ctx.fillStyle = lin(ctx, 0, BAND, 0, RAIL, [[0, paint[0]], [0.6, paint[1]], [1, paint[2]]]);
  ctx.fillRect(0, BAND, T, RAIL - BAND);
  // Block courses under the paint.
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = BAND + 46, row = 0; y < RAIL; y += 46, row++) {
    ctx.fillRect(0, y, T, 2);
    for (let x = row % 2 ? 64 : 0; x < T; x += 128) ctx.fillRect(x, y - 46, 2, 46);
  }
  relief((g) => {
    g.fillStyle = grey(5);
    for (let y = BAND + 46; y < RAIL; y += 46) g.fillRect(0, y, T, 2);
  }, "difference");
  // Ceiling trim, and the band's trim line.
  plate(ctx, 0, 0, T, 18, p, { tones: BLACK, bevel: 2, ink: 2, spec: false });
  plate(ctx, 0, BAND - 8, T, 8, p, { tones: ["#2a3240", "#1c2430", "#121820"], bevel: 2, ink: 1.5, spec: false });
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, 24 + r() * 70, 2 + r() * 30, 1 + r() * 2);
  }
  if (o.stripe !== false) {
    ctx.fillStyle = "#2f5c9e";
    ctx.fillRect(0, 236, T, 12);
    ctx.fillStyle = "#d6aa3e";
    ctx.fillRect(0, 252, T, 5);
    raise(0, 236, T, 21, 6);
  }
  // Chair rail and wainscot.
  plate(ctx, 0, RAIL, T, 12, p, { tones: ["#d0d4d8", "#9ea2a8", "#5c6066"], bevel: 3, ink: 2 });
  const wains = o.wains || NAVY;
  plate(ctx, 0, RAIL + 12, T, KICKY - RAIL - 12, p, { tones: wains, bevel: 3, ink: 2, spec: false });
  for (const x of [0, T / 2]) ink(ctx, x, RAIL + 12, 3, KICKY - RAIL - 12, 18);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, 380 + r() * 70, 6 + r() * 30, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`;
    ctx.fillRect(r() * T, 400 + r() * 50, 4 + r() * 20, 2);
  }
  base(ctx, p);
}

export function base(ctx, p) {
  plate(ctx, 0, KICKY, T, T - KICKY, p, { tones: ["#24272d", "#17191e", "#0c0d10"], bevel: 3, ink: 2, spec: false });
}

/** Concrete block (the armory's): two-tone, courses, scuffs. */
export function blockWall(ctx, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, KICKY, [[0, "#4a4e54"], [0.5, "#5e6268"], [1, "#6c7076"]]);
  ctx.fillRect(0, 0, T, KICKY);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 40; y < KICKY; y += 64) ctx.fillRect(0, y, T, 2);
  for (let row = 0, y = 0; y < KICKY; row++, y += 64) {
    for (let x = row % 2 ? 64 : 0; x < T; x += 128) ctx.fillRect(x, y, 2, 64);
  }
  relief((g) => {
    g.fillStyle = grey(8);
    for (let y = 40; y < KICKY; y += 64) g.fillRect(0, y, T, 2);
  }, "difference");
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`;
    ctx.fillRect(r() * T, r() * KICKY, 3 + r() * 40, 1 + r() * 3);
  }
}

// ── Corridor ─────────────────────────────────────────────────────

export function paintWall(ctx, p, r) {
  stationWall(ctx, p, r);
  // A wall sconce's bracket over the rail: the corridor's lamps hang off them.
  plate(ctx, T / 2 - 40, 150, 80, 22, p, { tones: STEEL, bevel: 3, ink: 2 });
  lightStrip(ctx, T / 2 - 30, 156, 60, 8, "#fff2d8", { blur: 18, alpha: 0.9 });
}

/** Framed photos over brass plaques: the academy class, the founding squad, Okafor's twenty years. */
function paintPhotos(ctx, p, r) {
  stationWall(ctx, p, r);
  const shots = [
    ["ACADEMY CLASS OF '19", 9],
    ["TCD FOUNDING SQUAD", 5],
    ["SGT. OKAFOR — 20 YRS", 1],
  ];
  shots.forEach(([cap, n], i) => {
    const x = 50 + i * 144;
    plate(ctx, x, 120, 124, 104, p, { tones: ["#2a1e14", "#1e150e", "#120c08"], bevel: 4, ink: 2 });
    // The photo: a sepia room, a row of officers.
    ctx.fillStyle = lin(ctx, 0, 132, 0, 212, [[0, "#c8b898"], [1, "#8c7a5c"]]);
    ctx.fillRect(x + 10, 130, 104, 82);
    for (let k = 0; k < n; k++) {
      const cx = x + 18 + ((k + 0.5) * 88) / n;
      const s = n > 5 ? 6 : n > 1 ? 8 : 14;
      ctx.fillStyle = "#3a2e22";
      ctx.beginPath();
      ctx.arc(cx, 176 - s * 1.4, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - s, 176 - s * 0.6, s * 2, 212 - 176 + s * 0.6);
    }
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x + 10, 130, 104, 10);
    plate(ctx, x + 12, 234, 100, 22, p, { tones: ["#e8cc7a", "#c8a24e", "#8a6a28"], bevel: 2, ink: 1.5 });
    say(ctx, cap, x + 62, 245, 10, "#2a1a08", 800, 92);
  });
}

/** The cork notice board: shifts, a briefing, the softball game, a note for the cadet. */
function paintNotice(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 48, 114, T - 96, 172, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 58, 124, T - 116, 152, p, { tones: ["#b48a58", "#9a7446", "#6e5030"], bevel: 2, ink: 1.5, spec: false });
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(60,36,16,0.35)" : "rgba(220,180,120,0.25)";
    ctx.fillRect(60 + r() * (T - 120), 126 + r() * 148, 2, 2);
  }
  // Header card.
  plate(ctx, 186, 130, 140, 24, p, { tones: NAVY, bevel: 2, ink: 1.5 });
  say(ctx, "NOTICES", 256, 142, 15, "#f2f2ee", 900);
  // Sheets, laid out for the mirror: canvas right shows at screen left.
  paper(ctx, p, T - 176, 160, 100, 104);
  say(ctx, "SHIFT CHANGE", T - 126, 178, 12, "#1c1e22", 900, 90);
  say(ctx, "A 0600 · B 1400", T - 126, 196, 10, "#1c1e22", 700, 90);
  say(ctx, "C 2200", T - 126, 210, 10, "#1c1e22", 700, 90);
  lines(ctx, r, T - 168, 226, 84, 4);
  paper(ctx, p, 196, 162, 120, 66, "#2a6ac2", ["#f6e68c", "#e8d878", "#c8b860"]);
  say(ctx, "BADGE 11235:", 256, 182, 12, "#1a2440", 900, 108);
  say(ctx, "SEE SUPERVISOR", 256, 198, 11, "#1a2440", 800, 108);
  say(ctx, "SIMON — 0700", 256, 213, 11, "#1a2440", 800, 108);
  paper(ctx, p, 200, 234, 112, 36, "#3aa04a", ["#e2ecf6", "#d0dcea", "#b0bccc"]);
  say(ctx, "SOFTBALL vs FIRE DEPT", 256, 248, 9, "#1c2a44", 900, 100);
  say(ctx, "SAT 1300", 256, 261, 9, "#1c2a44", 700, 100);
  paper(ctx, p, 72, 160, 108, 108, "#e8c23a");
  plate(ctx, 76, 170, 100, 18, p, { tones: ["#c22a1e", "#a01e14", "#701410"], bevel: 1, ink: 1 });
  say(ctx, "BRIEFING", 126, 179, 11, "#fff", 900, 92);
  say(ctx, "TEMPORAL ANOMALY", 126, 200, 9, "#1c1e22", 900, 96);
  say(ctx, "ENGINE LEVEL — 0900", 126, 213, 9, "#1c1e22", 700, 96);
  lines(ctx, r, 84, 228, 84, 4, 8);
}

/** Wanted posters under the division's header. */
function paintWanted(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 40, 112, T - 80, 176, p, { tones: BLACK, bevel: 4, ink: 2 });
  say(ctx, "TEMPORAL CRIMES — MOST WANTED", T / 2, 126, 13, BRASS, 900, T - 110);
  const posters = [
    ["V. KESSLER", "CHRONO-SMUGGLING", "#7a6a5a"],
    ["UNKNOWN", "'THE WATCHMAKER'", "#4a4a52"],
    ["T. MORALES", "PARADOX FRAUD", "#6a5a4e"],
  ];
  posters.forEach(([name, crime, skin], i) => {
    const x = 58 + i * 136;
    plate(ctx, x, 138, 124, 144, p, { tones: ["#eee6cc", "#e0d6b8", "#c4b896"], bevel: 2, ink: 1.5, spec: false });
    ctx.fillStyle = "#b42a1e";
    ctx.fillRect(x + 6, 142, 112, 22);
    say(ctx, "WANTED", x + 62, 153, 16, "#fff4e4", 900, 104);
    // Mugshot on a height chart.
    ctx.fillStyle = "#c8ccd0";
    ctx.fillRect(x + 22, 168, 80, 66);
    ctx.fillStyle = "rgba(30,34,40,0.35)";
    for (let k = 0; k < 6; k++) ctx.fillRect(x + 22, 172 + k * 11, 80, 1);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x + 62, 192, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#24262a";
    ctx.beginPath();
    ctx.moveTo(x + 32, 234);
    ctx.quadraticCurveTo(x + 34, 208, x + 62, 206);
    ctx.quadraticCurveTo(x + 90, 208, x + 92, 234);
    ctx.fill();
    if (name === "UNKNOWN") {
      ctx.fillStyle = "#24262a";
      ctx.beginPath();
      ctx.arc(x + 62, 192, 15, 0, Math.PI * 2);
      ctx.fill();
      say(ctx, "?", x + 62, 193, 20, "#c8ccd0", 900);
    }
    say(ctx, name, x + 62, 246, 12, "#1c1e22", 900, 112);
    say(ctx, crime, x + 62, 261, 9, "#5a1a12", 800, 112);
    say(ctx, "REWARD", x + 62, 274, 8, "#1c1e22", 700, 112);
  });
}

/** The fire point: the extinguisher in its cabinet, the pull station, the evacuation plan. */
function paintFire(ctx, p, r) {
  stationWall(ctx, p, r);
  const RED = ["#d43a2a", "#b42a1e", "#7a1a12"];
  plate(ctx, 166, 116, 180, 30, p, { tones: RED, bevel: 3, ink: 2 });
  say(ctx, "FIRE EXTINGUISHER", 256, 131, 14, "#fff", 900, 168);
  // Cabinet, recessed, with the glass front.
  plate(ctx, 176, 154, 160, 250, p, { tones: RED, bevel: 5, ink: 3 });
  plate(ctx, 190, 168, 132, 222, p, { tones: ["#3a1a16", "#2a1210", "#160806"], bevel: 4, ink: 2, recess: true });
  // The extinguisher: red cylinder, black head and hose.
  ctx.fillStyle = lin(ctx, 230, 0, 282, 0, [[0, "#8a1a10"], [0.35, "#e04a34"], [0.6, "#c22a1e"], [1, "#6a140c"]]);
  ctx.fillRect(230, 220, 52, 156);
  ctx.beginPath();
  ctx.ellipse(256, 220, 26, 10, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(244, 192, 24, 22);
  ctx.fillRect(250, 184, 30, 8);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(244, 204);
  ctx.quadraticCurveTo(210, 220, 216, 300);
  ctx.stroke();
  ctx.fillStyle = "#f2f0ea";
  ctx.fillRect(238, 266, 36, 40);
  say(ctx, "ABC", 256, 286, 11, "#1c1e22", 900);
  raise(230, 212, 52, 164, 18);
  // Glass: two reflections, the BREAK GLASS strip.
  ctx.fillStyle = "rgba(220,240,255,0.16)";
  ctx.beginPath();
  ctx.moveTo(206, 172);
  ctx.lineTo(246, 172);
  ctx.lineTo(196, 300);
  ctx.lineTo(194, 230);
  ctx.closePath();
  ctx.fill();
  plate(ctx, 196, 360, 120, 22, p, { tones: PAPER, bevel: 1, ink: 1 });
  say(ctx, "BREAK GLASS", 256, 371, 11, "#b42a1e", 900);
  // Pull station (shows screen-left of the cabinet).
  plate(ctx, 382, 186, 64, 84, p, { tones: RED, bevel: 4, ink: 2 });
  say(ctx, "FIRE", 414, 204, 14, "#fff", 900);
  plate(ctx, 396, 220, 36, 20, p, { tones: PAPER, bevel: 2, ink: 1.5 });
  say(ctx, "PULL", 414, 230, 10, "#b42a1e", 900);
  say(ctx, "DOWN", 414, 254, 9, "#fff", 800);
  // Evacuation plan.
  plate(ctx, 44, 168, 108, 112, p, { tones: PAPER, bevel: 2, ink: 1.5 });
  ctx.fillStyle = "#2a8a3a";
  ctx.fillRect(48, 172, 100, 14);
  say(ctx, "EVACUATION", 98, 179, 9, "#fff", 900, 94);
  ctx.strokeStyle = "rgba(30,34,44,0.75)";
  ctx.lineWidth = 2;
  ctx.strokeRect(58, 194, 80, 72);
  ctx.beginPath();
  ctx.moveTo(92, 194);
  ctx.lineTo(92, 266);
  ctx.moveTo(104, 194);
  ctx.lineTo(104, 266);
  ctx.moveTo(58, 220);
  ctx.lineTo(92, 220);
  ctx.moveTo(104, 240);
  ctx.lineTo(138, 240);
  ctx.stroke();
  ctx.strokeStyle = "#2a8a3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(98, 214);
  ctx.lineTo(98, 262);
  ctx.stroke();
  ctx.fillStyle = "#c22a1e";
  ctx.beginPath();
  ctx.arc(98, 214, 5, 0, Math.PI * 2);
  ctx.fill();
  say(ctx, "YOU ARE HERE", 98, 274, 7, "#c22a1e", 900, 96);
}

/**
 * A branch sign: navy plate, white lettering, the arrow in its disc. `dir`
 * is where the arrow points on screen ("left"/"right"); canvas x runs
 * against the screen, so the disc is painted on the opposite side.
 */
export function paintSign(label, dir, sub, warn = false) {
  return (ctx, p, r) => {
    stationWall(ctx, p, r);
    // Two hanging rods.
    for (const x of [90, T - 90]) {
      ctx.fillStyle = "#2a2e34";
      ctx.fillRect(x - 2, 18, 4, 100);
      raise(x - 2, 18, 4, 100, 8);
    }
    plate(ctx, 34, 112, T - 68, 104, p, { tones: NAVY, bevel: 5, ink: 3 });
    ctx.fillStyle = "#d6aa3e";
    ctx.fillRect(44, 198, T - 88, 5);
    const d = dir === "left" ? 1 : -1; // canvas direction of the arrow
    const ax = dir === "left" ? T - 92 : 92;
    ctx.fillStyle = "#f2f2ee";
    ctx.beginPath();
    ctx.arc(ax, 156, 34, 0, Math.PI * 2);
    ctx.fill();
    relief((g) => {
      g.fillStyle = grey(8);
      g.beginPath();
      g.arc(ax, 156, 34, 0, Math.PI * 2);
      g.fill();
    });
    ctx.fillStyle = NAVY[1];
    ctx.fillRect(d > 0 ? ax - 18 : ax - 6, 150, 24, 12);
    ctx.beginPath();
    ctx.moveTo(ax + d * 24, 156);
    ctx.lineTo(ax + d * 2, 136);
    ctx.lineTo(ax + d * 2, 176);
    ctx.closePath();
    ctx.fill();
    const tx = T / 2 - d * 44;
    say(ctx, label, tx, 150, 40, "#f2f2ee", 900, 300);
    say(ctx, sub, tx, 186, 13, "#b8c8e0", 800, 300);
    if (warn) {
      // AUTHORIZED PERSONNEL ONLY, yellow and black under the sign.
      plate(ctx, 96, 224, T - 192, 40, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 3, ink: 2 });
      hazard(ctx, 100, 228, 22, 32, "#1a1a1a", "#f0c83a", 14);
      hazard(ctx, T - 122, 228, 22, 32, "#1a1a1a", "#f0c83a", 14);
      say(ctx, "AUTHORIZED PERSONNEL ONLY", T / 2, 244, 14, "#141414", 900, T - 260);
    }
  };
}

/** The Chronos PD shield: gold rim, navy field, a clock face, a star over it. */
function shieldPath(c, cx, cy, s) {
  c.beginPath();
  c.moveTo(cx - s, cy - s * 0.9);
  c.quadraticCurveTo(cx, cy - s * 1.2, cx + s, cy - s * 0.9);
  c.lineTo(cx + s * 0.95, cy + s * 0.15);
  c.quadraticCurveTo(cx + s * 0.8, cy + s * 0.85, cx, cy + s * 1.2);
  c.quadraticCurveTo(cx - s * 0.8, cy + s * 0.85, cx - s * 0.95, cy + s * 0.15);
  c.closePath();
}

function crest(ctx, cx, cy, s) {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  shieldPath(ctx, cx + 4, cy + 6, s);
  ctx.fill();
  ctx.fillStyle = lin(ctx, cx - s, cy - s, cx + s, cy + s, [[0, "#f2d68a"], [0.5, "#c8a24e"], [1, "#7a5a20"]]);
  shieldPath(ctx, cx, cy, s);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, cy - s, 0, cy + s, [[0, "#2e4a7a"], [1, "#16243e"]]);
  shieldPath(ctx, cx, cy + s * 0.02, s * 0.84);
  ctx.fill();
  relief((g) => {
    g.fillStyle = grey(18);
    shieldPath(g, cx, cy, s);
    g.fill();
    g.globalCompositeOperation = "difference";
    g.fillStyle = grey(8);
    shieldPath(g, cx, cy + s * 0.02, s * 0.84);
    g.fill();
  });
  // Clock face.
  const r0 = s * 0.46;
  const fy = cy + s * 0.08;
  ctx.fillStyle = "#f4f0e4";
  ctx.beginPath();
  ctx.arc(cx, fy, r0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c8a24e";
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.stroke();
  ctx.fillStyle = "#1c2430";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const k = i % 3 ? 0.08 : 0.16;
    ctx.save();
    ctx.translate(cx + Math.sin(a) * r0 * 0.82, fy - Math.cos(a) * r0 * 0.82);
    ctx.rotate(a);
    ctx.fillRect(-s * 0.012, -r0 * k * 0.5, s * 0.024, r0 * k);
    ctx.restore();
  }
  ctx.strokeStyle = "#1c2430";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(cx, fy);
  ctx.lineTo(cx - r0 * 0.38, fy - r0 * 0.42);
  ctx.moveTo(cx, fy);
  ctx.lineTo(cx + r0 * 0.1, fy - r0 * 0.72);
  ctx.stroke();
  ctx.lineCap = "butt";
  // Star over the face.
  ctx.fillStyle = "#f2d68a";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? s * 0.07 : s * 0.17;
    ctx.lineTo(cx + Math.cos(a) * rr, cy - s * 0.62 + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** The division's display: the crest, its name, and the paradox counter at 0. */
function paintCrest(ctx, p, r) {
  stationWall(ctx, p, r, { stripe: false });
  plate(ctx, 36, 40, T - 72, 400, p, { tones: ["#2a3446", "#1e2636", "#121824"], bevel: 6, ink: 3 });
  crest(ctx, T / 2, 140, 74);
  say(ctx, "CHRONOS POLICE DEPARTMENT", T / 2, 246, 22, BRASS, 900, T - 110);
  say(ctx, "TEMPORAL CRIMES DIVISION", T / 2, 272, 15, "#b8c8e0", 800, T - 140);
  // DAYS WITHOUT A PARADOX: 0 (it was 41 yesterday).
  plate(ctx, 96, 298, T - 192, 124, p, { tones: BLACK, bevel: 4, ink: 2 });
  say(ctx, "DAYS WITHOUT A PARADOX", T / 2, 316, 14, "#f2f2ee", 900, T - 220);
  ctx.fillStyle = "#120404";
  ctx.fillRect(T / 2 - 44, 330, 88, 72);
  sink(T / 2 - 44, 330, 88, 72, 14);
  glow(ctx, "0", T / 2, 368, 64, "#ff3a2a");
  say(ctx, "RECORD: 41", T / 2 + 130, 384, 11, "#8a9098", 800);
  say(ctx, "RECORD: 41", T / 2 - 130, 384, 11, "#8a9098", 800);
}

// ── Break room ───────────────────────────────────────────────────

const BREAK_PAINT = { paint: ["#cfc6a6", "#c2b898", "#aaa082"], wains: ["#6a5a44", "#584a36", "#3a3024"] };
const WOOD = ["#7a5432", "#5e3e22", "#3a2412"];

/** Upper cabinets, tiled backsplash, the counter, lower cabinets. */
function kitchen(ctx, p, r) {
  stationWall(ctx, p, r, { ...BREAK_PAINT, stripe: false });
  // Upper cabinets.
  plate(ctx, 6, 24, T - 12, 140, p, { tones: WOOD, bevel: 4, ink: 2 });
  for (const x of [10, T / 2 + 2]) {
    plate(ctx, x, 30, T / 2 - 12, 128, p, { tones: WOOD, bevel: 3, ink: 1.5 });
  }
  for (const x of [T / 2 - 20, T / 2 + 14]) plate(ctx, x, 120, 6, 30, p, { tones: STEEL, bevel: 1, ink: 1 });
  // Backsplash: white tile.
  plate(ctx, 0, 168, T, 130, p, { tones: ["#eeeeea", "#e2e2dc", "#cacac2"], bevel: 2, ink: 1, spec: false });
  ctx.fillStyle = "rgba(90,96,100,0.35)";
  for (let y = 168; y < 298; y += 32) ctx.fillRect(0, y, T, 2);
  for (let x = 0; x < T; x += 32) ctx.fillRect(x, 168, 2, 130);
  relief((g) => {
    g.fillStyle = grey(6);
    for (let y = 168; y < 298; y += 32) g.fillRect(0, y, T, 2);
    for (let x = 0; x < T; x += 32) g.fillRect(x, 168, 2, 130);
  }, "difference");
  // Counter top and the cabinets under it.
  plate(ctx, 0, 296, T, 20, p, { tones: ["#8a9098", "#6a7078", "#3a3e44"], bevel: 4, ink: 2 });
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(0, 300, T, 2);
  for (const x of [6, T / 2 + 2]) {
    plate(ctx, x, 322, T / 2 - 8, 130, p, { tones: WOOD, bevel: 3, ink: 1.5 });
    plate(ctx, x + T / 4 - 30, 334, 60, 6, p, { tones: STEEL, bevel: 1, ink: 1 });
  }
  base(ctx, p);
}

function mug(ctx, x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 22, 26);
  ctx.strokeStyle = c;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 24, y + 12, 7, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 3, y + 2, 3, 22);
  raise(x, y, 22, 26, 12);
}

/** The coffee machine, its carafe, the mugs and the coffee-fund note. */
function paintCoffee(ctx, p, r) {
  kitchen(ctx, p, r);
  // Machine (screen-right of the mugs).
  plate(ctx, 74, 176, 132, 122, p, { tones: BLACK, bevel: 4, ink: 2 });
  plate(ctx, 84, 186, 112, 26, p, { tones: ["#3a3e44", "#2a2d32", "#16181b"], bevel: 2, ink: 1.5 });
  glow(ctx, "BREW", 120, 199, 10, "#ff5a3a");
  led(ctx, 176, 199, 4, "#ff3a2a");
  // Carafe on its warmer, half full.
  ctx.fillStyle = "rgba(190,220,240,0.3)";
  ctx.fillRect(104, 226, 72, 62);
  ctx.fillStyle = "#3a1e0e";
  ctx.fillRect(106, 254, 68, 32);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(110, 228, 6, 56);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(96, 222, 88, 6);
  raise(104, 226, 72, 62, 10);
  // Mugs.
  [["#c22a1e", 240], ["#f2f0ea", 282], ["#2a4068", 324], ["#e8c23a", 370]].forEach(([c, x]) => mug(ctx, x, 268, c));
  // Coffee-fund note taped to the tile.
  paper(ctx, p, 300, 186, 140, 70, null, ["#f6e68c", "#e8d878", "#c8b860"]);
  ctx.fillStyle = "rgba(220,220,200,0.7)";
  ctx.fillRect(350, 180, 40, 10);
  say(ctx, "COFFEE FUND $2/WK", 370, 206, 11, "#1a2440", 900, 128);
  say(ctx, "PAY PRICE.", 370, 223, 11, "#1a2440", 800, 128);
  say(ctx, "(NOT YOU, PRICE)", 370, 240, 9, "#1a2440", 700, 128);
}

/** The sink, the dish rack and the microwave whose clock lost the hour. */
function paintSink(ctx, p, r) {
  kitchen(ctx, p, r);
  // Microwave.
  plate(ctx, 270, 196, 200, 102, p, { tones: ["#c8ccd2", "#a0a6ae", "#60666e"], bevel: 4, ink: 2 });
  plate(ctx, 284, 208, 124, 78, p, { tones: BLACK, bevel: 3, ink: 2, recess: true });
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(290, 212, 40, 70);
  ctx.fillStyle = "#0a1a0c";
  ctx.fillRect(418, 210, 42, 20);
  glow(ctx, "13:61", 439, 220, 11, "#7cff9a", 800);
  for (let k = 0; k < 3; k++) plate(ctx, 422, 238 + k * 16, 34, 10, p, { tones: STEEL, bevel: 1, ink: 1 });
  // Faucet over the basin.
  ctx.strokeStyle = "#c8ccd2";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(150, 296);
  ctx.lineTo(150, 236);
  ctx.quadraticCurveTo(150, 218, 128, 218);
  ctx.lineTo(116, 218);
  ctx.lineTo(116, 236);
  ctx.stroke();
  raise(146, 218, 8, 78, 16);
  ctx.fillStyle = "#3a3e44";
  ctx.fillRect(70, 296, 150, 8);
  sink(70, 296, 150, 8, 30);
  // Dish rack with mugs drying.
  ctx.strokeStyle = "#9aa2ac";
  ctx.lineWidth = 2;
  for (let x = 20; x < 64; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 260);
    ctx.lineTo(x, 296);
    ctx.stroke();
  }
  mug(ctx, 22, 264, "#2a6ac2");
  // House rule.
  paper(ctx, p, 60, 176, 130, 34, null);
  ctx.fillStyle = "rgba(220,220,200,0.7)";
  ctx.fillRect(110, 172, 30, 8);
  say(ctx, "WASH YOUR OWN MUG", 125, 188, 11, "#c22a1e", 900, 120);
  say(ctx, "— MGMT", 125, 202, 9, "#1c1e22", 700, 120);
}

/** The fridge: magnets, a takeout menu, a kid's drawing, the lunch feud. */
function paintFridge(ctx, p, r) {
  stationWall(ctx, p, r, { ...BREAK_PAINT, stripe: false });
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(100, 40, 324, 420);
  const WHITE = ["#eef0f2", "#dadde2", "#a8acb2"];
  plate(ctx, 92, 30, 328, 128, p, { tones: WHITE, bevel: 6, ink: 3 });
  plate(ctx, 92, 162, 328, 294, p, { tones: WHITE, bevel: 6, ink: 3 });
  for (const [y, h] of [[48, 92], [184, 160]]) plate(ctx, 112, y, 12, h, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  // Magnets and notes.
  paper(ctx, p, 252, 56, 120, 54, null, ["#f6e68c", "#e8d878", "#c8b860"]);
  say(ctx, "LABEL YOUR FOOD.", 312, 74, 12, "#1a2440", 900, 110);
  say(ctx, "— LT. RASCZAK", 312, 94, 10, "#1a2440", 700, 110);
  plate(ctx, 150, 188, 120, 150, p, { tones: ["#f4f0e6", "#e8e2d2", "#c8c0aa"], bevel: 2, ink: 1.5, spec: false });
  ctx.fillStyle = "#c22a1e";
  ctx.fillRect(154, 192, 112, 26);
  say(ctx, "LUCKY CLOCK", 210, 205, 13, "#fff", 900, 104);
  say(ctx, "DINER — OPEN 24/7", 210, 228, 9, "#1c1e22", 800, 104);
  lines(ctx, r, 162, 244, 90, 9, 9);
  // A kid's drawing: the station, a stick officer, a sun.
  plate(ctx, 286, 196, 112, 96, p, { tones: PAPER, bevel: 2, ink: 1.5, spec: false });
  ctx.fillStyle = "#f2c83a";
  ctx.beginPath();
  ctx.arc(306, 214, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a6ac2";
  ctx.lineWidth = 3;
  ctx.strokeRect(330, 236, 52, 44);
  ctx.strokeStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(312, 244, 6, 0, Math.PI * 2);
  ctx.moveTo(312, 250);
  ctx.lineTo(312, 270);
  ctx.lineTo(304, 282);
  ctx.moveTo(312, 270);
  ctx.lineTo(320, 282);
  ctx.moveTo(302, 258);
  ctx.lineTo(322, 258);
  ctx.stroke();
  say(ctx, "MY DAD", 356, 222, 10, "#c22a1e", 900);
  // The feud.
  paper(ctx, p, 286, 312, 112, 46, null, ["#f8d0d8", "#ecc0c8", "#c8a0a8"]);
  say(ctx, "PRICE — THAT WAS", 342, 328, 9, "#1a2440", 900, 104);
  say(ctx, "MY LUNCH. —DUARTE", 342, 344, 9, "#1a2440", 800, 104);
  for (const [x, y, c] of [[312, 54, "#c22a1e"], [210, 186, "#2a6ac2"], [342, 194, "#3aa04a"], [342, 310, "#e8c23a"]]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    raise(x - 5, y - 5, 10, 10, 10);
  }
}

/** The B-shift roster on the whiteboard, a coffee ring across Friday. */
function paintRoster(ctx, p, r) {
  stationWall(ctx, p, r, { ...BREAK_PAINT, stripe: false });
  plate(ctx, 30, 70, T - 60, 280, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 40, 80, T - 80, 254, p, { tones: ["#f8f8f6", "#eeeeea", "#d4d4ce"], bevel: 2, ink: 1.5, spec: false });
  say(ctx, "B-SHIFT ROSTER — WEEK 42", T / 2, 100, 18, "#1c3a7a", 900, T - 120);
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const crew = [
    ["LT. RASCZAK", "xxxxx"],
    ["KAEL", "xx-xx"],
    ["OKAFOR", "xxx-x"],
    ["DUARTE", "-xxxx"],
    ["MBEKI", "xxxx-"],
    ["TANAKA", "x-xxx"],
    ["PRICE", "xx-x?"],
    ["CADET 11235", "....x"],
  ];
  // Columns laid out mirrored: names show at screen left.
  const nameX = T - 120;
  const colX = (i) => T - 214 - i * 46;
  days.forEach((d, i) => say(ctx, d, colX(i), 126, 11, "#3a3e44", 900));
  ctx.fillStyle = "rgba(30,58,122,0.5)";
  ctx.fillRect(52, 136, T - 104, 2);
  crew.forEach(([name, marks], k) => {
    const y = 152 + k * 22;
    say(ctx, name, nameX, y, 12, k === 7 ? "#c22a1e" : "#1c1e22", 800, 140);
    for (let i = 0; i < 5; i++) {
      const m = marks[i];
      if (m === "x") {
        ctx.strokeStyle = "#1c3a7a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(colX(i) - 7, y - 6);
        ctx.lineTo(colX(i) + 7, y + 6);
        ctx.moveTo(colX(i) + 7, y - 6);
        ctx.lineTo(colX(i) - 7, y + 6);
        ctx.stroke();
      } else if (m === "?") say(ctx, "?", colX(i), y, 14, "#c22a1e", 900);
      else if (m === "-") {
        ctx.fillStyle = "#8a9098";
        ctx.fillRect(colX(i) - 8, y - 1, 16, 3);
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(52, y + 10, T - 104, 1);
  });
  say(ctx, "DAY 1 — WELCOME!", 140, 310, 11, "#2a8a3a", 900, 160);
  // Coffee rings over FRI and the corner, and a drip.
  for (const [cx, cy, rr, a0] of [[colX(4) + 6, 176, 26, 0.4], [colX(4) - 28, 232, 22, 2.2]]) {
    ctx.strokeStyle = "rgba(120,74,30,0.55)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0, a0 + Math.PI * 1.6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,74,30,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rr - 4, a0 + 0.5, a0 + Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(120,74,30,0.35)";
  ctx.fillRect(colX(4) + 20, 200, 4, 40);
  // Marker tray and a magnet holding the menu.
  plate(ctx, 120, 334, T - 240, 12, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  for (const [x, c] of [[180, "#1c3a7a"], [220, "#c22a1e"], [260, "#2a8a3a"]]) {
    ctx.fillStyle = c;
    ctx.fillRect(x, 328, 30, 7);
  }
}

// ── Armory ───────────────────────────────────────────────────────

/** Steel cage mesh across [x0, x1) × [y0, y1), its frame and a padlocked hasp. */
function cage(ctx, p, x0, y0, x1, y1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  ctx.strokeStyle = "rgba(190,198,208,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = -(y1 - y0); k < x1 - x0; k += 22) {
    ctx.moveTo(x0 + k, y0);
    ctx.lineTo(x0 + k + (y1 - y0), y1);
    ctx.moveTo(x0 + k + (y1 - y0), y0);
    ctx.lineTo(x0 + k, y1);
  }
  ctx.stroke();
  ctx.restore();
  const frame = { tones: ["#7a8494", "#525c6a", "#2a3038"], bevel: 3, ink: 2 };
  plate(ctx, x0 - 8, y0 - 8, x1 - x0 + 16, 12, p, frame);
  plate(ctx, x0 - 8, y1 - 4, x1 - x0 + 16, 12, p, frame);
  for (const x of [x0 - 8, (x0 + x1) / 2 - 6, x1 - 4]) plate(ctx, x, y0 - 8, 12, y1 - y0 + 16, p, frame);
  // Hasp and padlock on the middle stile.
  const cx = (x0 + x1) / 2;
  plate(ctx, cx - 14, 236, 28, 18, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  ctx.strokeStyle = "#b8c0c8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, 262, 10, Math.PI, 0);
  ctx.stroke();
  plate(ctx, cx - 14, 262, 28, 26, p, { tones: ["#e8c86a", "#c8a24e", "#7a5a20"], bevel: 3, ink: 1.5 });
}

function rifle(ctx, x, top, bottom) {
  // Flat, dark silhouettes: raised thin parts read as worn bare metal in the bake.
  ctx.fillStyle = "#101214";
  ctx.fillRect(x - 4, top, 8, 90); // barrel
  ctx.fillRect(x - 9, top + 60, 18, 70); // handguard
  ctx.fillRect(x - 11, top + 130, 22, 90); // receiver
  ctx.fillRect(x + 10, top + 160, 22, 14); // magazine well
  ctx.fillRect(x + 12, top + 174, 16, 46); // magazine
  ctx.fillRect(x - 4, top + 26, 8, 14);
  ctx.fillStyle = "#2a2018";
  ctx.beginPath(); // stock
  ctx.moveTo(x - 10, top + 220);
  ctx.lineTo(x + 10, top + 220);
  ctx.lineTo(x + 16, bottom);
  ctx.lineTo(x - 16, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x - 9, top + 132, 2, 86);
}

/** Rifles stood in their rack behind a padlocked cage. */
function paintCage(ctx, p, r) {
  blockWall(ctx, r);
  plate(ctx, 22, 48, T - 44, 400, p, { tones: ["#3a4440", "#2c3430", "#1a201c"], bevel: 3, ink: 2, spec: false });
  // Pegboard holes.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  for (let y = 62; y < 440; y += 20) for (let x = 36; x < T - 36; x += 20) ctx.fillRect(x, y, 3, 3);
  // The rack: a top clamp bar and a foot rail, two rifles either side of the hasp.
  plate(ctx, 30, 96, T - 60, 14, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  plate(ctx, 30, 400, T - 60, 30, p, { tones: ["#4a3a2a", "#3a2c1e", "#22180e"], bevel: 3, ink: 2 });
  for (const x of [80, 168, 344, 432]) rifle(ctx, x, 70, 420);
  // Rack label (bottom, readable through the mesh).
  plate(ctx, T / 2 - 90, 404, 180, 22, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 2, ink: 1.5 });
  say(ctx, "CR-7 CARBINES · SIGN OUT", T / 2, 415, 11, "#141414", 900, 170);
  cage(ctx, p, 30, 40, T - 30, 446);
  base(ctx, p);
}

/** Two ammo lockers under the NO OPEN FLAME sign, keypads lit. */
function paintAmmo(ctx, p, r) {
  blockWall(ctx, r);
  plate(ctx, 120, 34, T - 240, 34, p, { tones: ["#d43a2a", "#b42a1e", "#7a1a12"], bevel: 3, ink: 2 });
  say(ctx, "AMMUNITION — NO OPEN FLAME", T / 2, 51, 13, "#fff", 900, T - 260);
  const OLIVE = ["#6a7258", "#525a44", "#30362a"];
  const labels = [["9 MM", "CHRONO CELLS"], ["5.56", "12 GA SHELLS"]];
  [24, T / 2 + 6].forEach((x, i) => {
    const w = T / 2 - 30;
    plate(ctx, x, 80, w, 372, p, { tones: OLIVE, bevel: 5, ink: 3 });
    ink(ctx, x + w / 2 - 1, 84, 3, 364, 22);
    vents(ctx, x + 30, 96, w - 60, 40, 5, p);
    labels[i].forEach((t, k) => {
      plate(ctx, x + 22, 160 + k * 120, w - 44, 30, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 2, ink: 1.5 });
      say(ctx, t, x + w / 2, 175 + k * 120, 15, "#141414", 900, w - 56);
    });
    // Keypad and status LED.
    plate(ctx, x + w / 2 - 34, 228, 68, 44, p, { tones: BLACK, bevel: 3, ink: 2 });
    for (let k = 0; k < 6; k++) plate(ctx, x + w / 2 - 26 + (k % 3) * 18, 236 + ((k / 3) | 0) * 16, 12, 10, p, { tones: STEEL, bevel: 1, ink: 1 });
    led(ctx, x + w / 2, 290, 4, i ? "#ff3a2a" : "#3aff6a");
    for (const yy of [120, 400]) {
      plate(ctx, x + w / 2 - 50, yy, 30, 10, p, { tones: STEEL, bevel: 1, ink: 1 });
      plate(ctx, x + w / 2 + 20, yy, 30, 10, p, { tones: STEEL, bevel: 1, ink: 1 });
    }
    vents(ctx, x + 30, 360, w - 60, 30, 4, p);
  });
  hazard(ctx, 0, KICKY, T, T - KICKY, "#e8c23a");
}

/** AUTHORIZED PERSONNEL ONLY over the weapon sign-out sheet; the cadet still pending. */
function paintSignout(ctx, p, r) {
  blockWall(ctx, r);
  plate(ctx, 40, 36, T - 80, 92, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 4, ink: 3 });
  hazard(ctx, 48, 44, T - 96, 14, "#1a1a1a", "#f0c83a", 18);
  hazard(ctx, 48, 106, T - 96, 14, "#1a1a1a", "#f0c83a", 18);
  say(ctx, "AUTHORIZED", T / 2, 72, 24, "#141414", 900, T - 120);
  say(ctx, "PERSONNEL ONLY", T / 2, 94, 18, "#141414", 900, T - 120);
  // Clipboard and sheet.
  plate(ctx, 110, 150, 292, 270, p, { tones: ["#7a5a38", "#5c4228", "#3a2a18"], bevel: 4, ink: 2 });
  plate(ctx, 124, 172, 264, 238, p, { tones: PAPER, bevel: 2, ink: 1.5, spec: false });
  plate(ctx, 216, 140, 80, 24, p, { tones: STEEL, bevel: 3, ink: 2 });
  say(ctx, "WEAPON SIGN-OUT", 256, 192, 16, "#1c1e22", 900, 240);
  const rows = [
    ["KAEL", "CR-7", "0540"],
    ["TANAKA", "PISTOL", "0545"],
    ["RASCZAK", "SHOTGUN", "0550"],
    ["OKAFOR", "CR-7", "0551"],
    ["11235", "PENDING", "—"],
  ];
  // Columns mirrored: the name column shows at screen left.
  const cols = [340, 250, 168];
  ["NAME", "WEAPON", "OUT"].forEach((h, i) => say(ctx, h, cols[i], 216, 10, "#5a5c60", 900));
  ctx.fillStyle = "rgba(30,40,90,0.5)";
  ctx.fillRect(134, 226, 244, 2);
  rows.forEach((row, k) => {
    const y = 246 + k * 28;
    const red = k === 4;
    row.forEach((t, i) => say(ctx, t, cols[i], y, 12, red ? "#c22a1e" : "#1e2a6a", 800, 84));
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(134, y + 12, 244, 1);
  });
  say(ctx, "ARMORER: SGT. MBEKI", 256, 396, 10, "#5a5c60", 800);
  // The pen on its string.
  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(112, 170);
  ctx.quadraticCurveTo(80, 260, 92, 330);
  ctx.stroke();
  ctx.fillStyle = "#1e2a6a";
  ctx.fillRect(88, 330, 8, 50);
  base(ctx, p);
}

// ── Lobby ────────────────────────────────────────────────────────

/** The lobby's crest wall: dark panelling, the shield in brass, the motto, two uplights. */
function paintLobbyCrest(ctx, p, r) {
  ctx.fillStyle = "#1a1e26";
  ctx.fillRect(0, 0, T, T);
  plate(ctx, 0, 0, T, 18, p, { tones: BLACK, bevel: 2, ink: 2, spec: false });
  // Walnut panels.
  for (const x of [0, T / 2]) {
    plate(ctx, x + 4, 24, T / 2 - 8, KICKY - 30, p, { tones: ["#3e2616", "#301c0e", "#1c1006"], bevel: 4, ink: 2, spec: false });
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(20,10,4,${0.12 + r() * 0.14})`;
      ctx.fillRect(x + 10 + r() * (T / 2 - 20), 30, 1.5, KICKY - 42);
    }
  }
  crest(ctx, T / 2, 160, 96);
  plate(ctx, 60, 296, T - 120, 70, p, { tones: BLACK, bevel: 3, ink: 2 });
  say(ctx, "CHRONOS PD", T / 2, 324, 40, BRASS, 900, T - 140);
  say(ctx, "TEMPORAL CRIMES DIVISION", T / 2, 354, 14, "#e8d8b0", 800, T - 150);
  plate(ctx, 110, 380, T - 220, 26, p, { tones: ["#e8cc7a", "#c8a24e", "#8a6a28"], bevel: 2, ink: 1.5 });
  say(ctx, "SERVE · PROTECT · KEEP THE HOUR", T / 2, 393, 11, "#2a1a08", 900, T - 236);
  // Uplights washing the panels.
  for (const x of [70, T - 70]) {
    plate(ctx, x - 22, 428, 44, 20, p, { tones: STEEL, bevel: 2, ink: 1.5 });
    lightStrip(ctx, x - 14, 428, 28, 5, "#ffd89a", { blur: 20 });
    if (!material()) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = lin(ctx, 0, 428, 0, 260, [[0, "rgba(255,200,120,0.22)"], [1, "rgba(255,200,120,0)"]]);
      ctx.beginPath();
      ctx.moveTo(x - 14, 428);
      ctx.lineTo(x + 14, 428);
      ctx.lineTo(x + 50, 260);
      ctx.lineTo(x - 50, 260);
      ctx.fill();
      ctx.restore();
    }
  }
  base(ctx, p);
}

const W = CORRIDOR_WALLS;

export const PAINTERS = {
  [W.WALL]: paintWall,
  [W.PHOTOS]: paintPhotos,
  [W.NOTICE]: paintNotice,
  [W.WANTED]: paintWanted,
  [W.FIRE]: paintFire,
  [W.SIGN_FITNESS]: paintSign("FITNESS", "left", "PT · CADET DRILLS"),
  [W.SIGN_SUPERVISOR]: paintSign("SUPERVISOR", "right", "SUPERVISOR SIMON · OPS"),
  [W.SIGN_BREAK]: paintSign("BREAK ROOM", "left", "STAFF · COFFEE"),
  [W.SIGN_ARMORY]: paintSign("ARMORY", "right", "SIGN OUT WITH THE ARMORER", true),
  [W.SIGN_LOCKERS]: paintSign("LOCKERS", "left", "LOCKER ROOM · SHOWERS"),
  [W.SIGN_RANGE]: paintSign("RANGE", "right", "EYES & EARS REQUIRED"),
  [W.CREST]: paintCrest,
  [W.BREAK_COFFEE]: paintCoffee,
  [W.BREAK_FRIDGE]: paintFridge,
  [W.BREAK_ROSTER]: paintRoster,
  [W.ARMORY_CAGE]: paintCage,
  [W.ARMORY_AMMO]: paintAmmo,
  [W.ARMORY_SIGNOUT]: paintSignout,
  [W.LOBBY_CREST]: paintLobbyCrest,
  [W.BREAK_SINK]: paintSink,
};
