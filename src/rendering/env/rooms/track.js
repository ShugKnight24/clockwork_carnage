/**
 * Wall painters for the training hall (src/data/levels/rooms/track.js places
 * them). Keyed by wall id.
 *
 * An indoor track under strip lights: painted block above a band of lane
 * blue, padded panels to shoulder height, a lit kick. Crash mats where the
 * lanes end, the timing board over the lanes' tops, the hall's sign at both
 * ways in, and the rails between the lanes (low walls: the bottom two fifths
 * of the face is all that shows).
 */
import { TRACK_WALLS as W } from "../../../data/levels/rooms/track.js";
import { letter } from "../locker-art.js";
import { T, lin, plate, rivet, ink, lightStrip, led, hazard, raise, sink } from "../paint.js";
import { onScreen, text, lit } from "./east-kit.js";

const BLOCK = ["#c4cad2", "#aeb6c0", "#868e98"];
const PADS = ["#3a64a8", "#2c4f8a", "#1a3260"];
const MATS = ["#e07a2a", "#c2621c", "#7a3a10"];
const DARK = ["#22262c", "#16191e", "#0b0d10"];
const LANE = "#2f8af0";
const TOP = 40;
const BAND = 170;
const PAD_Y = 214;
const KICK = 462;

/** The hall's wall: strip light, block, the lane-blue band, pads, the kick. */
function hallWall(ctx, p, r, { pads = true } = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, BAND, [[0, BLOCK[1]], [1, BLOCK[0]]]);
  ctx.fillRect(0, 0, T, BAND);
  plate(ctx, 0, 0, T, TOP, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
  lightStrip(ctx, 20, TOP - 14, T - 40, 8, "#eef4ff", { blur: 16, alpha: 0.9 });
  // Block coursing.
  ctx.fillStyle = "rgba(40,46,56,0.22)";
  for (let y = TOP + 32; y < BAND; y += 32) ctx.fillRect(0, y, T, 2);
  for (let y = TOP; y < BAND; y += 64) for (let x = (y / 64) % 2 ? 0 : 64; x < T; x += 128) ctx.fillRect(x, y, 2, 32);
  plate(ctx, 0, BAND, T, PAD_Y - BAND, p, { tones: ["#3a8ef4", "#2a74d6", "#1a4c96"], bevel: 2, ink: 1.5, spec: false });
  ctx.fillStyle = "#f2f4f8";
  ctx.fillRect(0, BAND + 16, T, 6);
  if (pads) {
    for (const x of [6, T / 2 + 3]) plate(ctx, x, PAD_Y + 6, T / 2 - 9, KICK - PAD_Y - 12, p, { tones: PADS, bevel: 8, ink: 2 });
    for (const x of [T / 4, (T * 3) / 4]) ink(ctx, x - 1, PAD_Y + 30, 2, KICK - PAD_Y - 60, 18);
  } else {
    plate(ctx, 0, PAD_Y, T, KICK - PAD_Y, p, { tones: BLOCK, bevel: 2, ink: 1.5, spec: false });
  }
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
  lightStrip(ctx, 0, KICK + 6, T, 4, LANE, { blur: 12, alpha: 0.7 });
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, PAD_Y + 20 + r() * 200, 4 + r() * 20, 1 + r() * 2);
  }
}

function paintWall(ctx, p, r) {
  hallWall(ctx, p, r);
}

/** Crash mats stood against the end wall, strapped to its rail. */
function paintPad(ctx, p, r) {
  hallWall(ctx, p, r, { pads: false });
  for (const x of [8, T / 2 + 4]) {
    plate(ctx, x, BAND - 40, T / 2 - 12, KICK - BAND + 36, p, { tones: MATS, bevel: 12, ink: 3 });
    ctx.fillStyle = "#1a1c20";
    for (const y of [BAND + 20, KICK - 60]) ctx.fillRect(x + 6, y, T / 2 - 24, 10);
  }
  letter(ctx, "SAFETY MAT", T / 4, BAND + 90, 16, "#2a1406", 900);
  letter(ctx, "SAFETY MAT", (T * 3) / 4, BAND + 90, 16, "#2a1406", 900);
}

/**
 * The timing board: the lanes' best times this month in amber LEDs, a blank
 * line waiting for the cadet's, and the big clock reading zero.
 */
function paintBoard(ctx, p, r) {
  hallWall(ctx, p, r);
  plate(ctx, 24, 48, T - 48, 300, p, { tones: DARK, bevel: 6, ink: 3 });
  ctx.fillStyle = "#050607";
  ctx.fillRect(40, 64, T - 80, 268);
  onScreen(ctx, () => {
    const amber = "#ffb030";
    text(ctx, "TRAINING HALL · TIMES", T / 2, 90, 18, "#f2f4f8", 900);
    text(ctx, "00:00.0", T / 2, 148, 56, amber, 900);
    const rows = [["1", "VALE", "0:24.1"], ["2", "KAEL", "0:26.8"], ["3", "RASCZAK", "0:28.0"], ["—", "11235", "—:—"]];
    rows.forEach(([n, name, t], i) => {
      const y = 204 + i * 30;
      text(ctx, n, 76, y, 18, amber, 900, "left");
      text(ctx, name, 120, y, 18, i === 3 ? "#46e0ff" : amber, 800, "left");
      text(ctx, t, T - 76, y, 18, amber, 800, "right");
    });
  });
  lit(40, 64, T - 80, 268, 0.6, 6);
  led(ctx, 54, 78, 4, "#ff3a2a");
}

/** The hall's sign: its name, a runner, the arrow in. */
function paintSign(ctx, p, r) {
  hallWall(ctx, p, r);
  plate(ctx, 40, 60, T - 80, 130, p, { tones: ["#1c3a6e", "#142c58", "#0c1c3c"], bevel: 5, ink: 3 });
  letter(ctx, "TRAINING HALL", T / 2, 98, 30, "#f2f2ee", 900);
  letter(ctx, "TRACK · BARS · TUNNEL · PIT", T / 2, 136, 14, "#b8c8e0", 800);
  letter(ctx, "NO SPIKES ON THE MATS", T / 2, 166, 12, "#ffb038", 900);
  for (const [x, y] of [[56, 74], [T - 56, 74], [56, 176], [T - 56, 176]]) rivet(ctx, x, y, 4, p);
}

/**
 * A lane rail, knee-high: a white cap, red and white along its face, its
 * feet bolted down. Only the bottom fifth of the face shows.
 */
function paintRail(ctx, p, r) {
  ctx.fillStyle = DARK[1];
  ctx.fillRect(0, 0, T, T);
  const top = 410;
  plate(ctx, 0, top, T, 14, p, { tones: ["#f4f6f8", "#d8dce2", "#9aa0a8"], bevel: 2, ink: 1.5 });
  hazard(ctx, 0, top + 14, T, 34, "#e8382a", "#f2f2ee", 48);
  plate(ctx, 0, top + 48, T, T - top - 48, p, { tones: DARK, bevel: 2, ink: 1.5, spec: false });
  for (const x of [40, T - 40]) rivet(ctx, x, T - 26, 4, p);
}

/**
 * A lane's header over its north end: the lane's number in a white roundel,
 * what the lane is for, and which way it runs. Lane colours are the board's.
 */
const LANE_INFO = {
  1: ["SPRINT", "27 M STRAIGHT · GO SOUTH", "#2f8af0"],
  2: ["SLIDE", "3 BARS · FINISH NORTH", "#e8c23a"],
  3: ["TUNNEL · PIT", "CROUCH · PHASE-DASH", "#e8382a"],
  4: ["WARM-UP", "JOG · STRETCH · COOL DOWN", "#3ac46a"],
};

function paintLane(ctx, p, r, n) {
  const [name, sub, c] = LANE_INFO[n];
  hallWall(ctx, p, r);
  plate(ctx, 24, 52, T - 48, 150, p, { tones: ["#1c3a6e", "#142c58", "#0c1c3c"], bevel: 5, ink: 3 });
  // The lane's colour down the plate's edge (as you see it, its left).
  plate(ctx, T - 52, 60, 20, 134, p, { tones: [c, c, "#1a1c20"], bevel: 2, ink: 1.5 });
  // Roundel: on its own raised disc, so the number survives the bake.
  plate(ctx, T - 172, 70, 112, 112, p, { tones: ["#f4f6f8", "#e2e6ea", "#b8bec6"], bevel: 4, ink: 2 });
  ctx.fillStyle = c;
  ctx.fillRect(T - 168, 74, 104, 14);
  letter(ctx, String(n), T - 116, 136, 84, "#10141a", 900);
  letter(ctx, `LANE ${n}`, 196, 92, 20, "#b8c8e0", 900);
  letter(ctx, name, 196, 130, 34, "#f2f2ee", 900);
  letter(ctx, sub, 196, 170, 13, "#ffb038", 900);
  for (const [x, y] of [[40, 66], [40, 188]]) rivet(ctx, x, y, 4, p);
  // The lane's colour carried on down the pads to the kick, a stripe a lane wide.
  plate(ctx, T / 2 - 20, PAD_Y, 40, KICK - PAD_Y, p, { tones: [c, c, "#1a1c20"], bevel: 2, ink: 1.5, spec: false });
}

/** Distance board: a white plate with the metres from the north end, and its floor line. */
function paintDistance(ctx, p, r, label) {
  hallWall(ctx, p, r);
  plate(ctx, T / 2 - 104, 56, 208, 104, p, { tones: ["#f4f6f8", "#e2e6ea", "#b8bec6"], bevel: 5, ink: 3 });
  ctx.fillStyle = LANE;
  ctx.fillRect(T / 2 - 98, 62, 196, 12);
  letter(ctx, label, T / 2, 116, 58, "#10141a", 900);
  // The pads part for a white line down to the floor where the distance is.
  plate(ctx, T / 2 - 10, PAD_Y, 20, KICK - PAD_Y, p, { tones: ["#f4f6f8", "#d8dce2", "#9aa0a8"], bevel: 2, ink: 1.5, spec: false });
  ctx.fillStyle = "#f2f4f8";
  ctx.fillRect(T / 2 - 6, KICK, 12, T - KICK);
}

/**
 * The pace clock: a sixty-second face a sprinter reads from the far end, the
 * red sweep hand and its black twin, in a steel case on the block.
 */
function paintClock(ctx, p, r) {
  hallWall(ctx, p, r);
  const cx = T / 2, cy = 200, cr = 120;
  plate(ctx, cx - cr - 22, cy - cr - 22, (cr + 22) * 2, (cr + 22) * 2, p, { tones: DARK, bevel: 6, ink: 3 });
  plate(ctx, cx - cr - 4, cy - cr - 4, (cr + 4) * 2, (cr + 4) * 2, p, { tones: ["#f4f6f8", "#eef0f2", "#c8ccd2"], bevel: 3, ink: 2 });
  ctx.fillStyle = "#f6f7f8";
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fill();
  onScreen(ctx, () => {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const k = i % 5 ? 8 : 20;
      ctx.strokeStyle = i % 15 ? "#1a1a1a" : "#c22a1e";
      ctx.lineWidth = i % 5 ? 2 : 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * (cr - 6), cy - Math.cos(a) * (cr - 6));
      ctx.lineTo(cx + Math.sin(a) * (cr - 6 - k), cy - Math.cos(a) * (cr - 6 - k));
      ctx.stroke();
    }
    for (let s = 5; s <= 60; s += 5) {
      const a = (s / 60) * Math.PI * 2;
      text(ctx, String(s), cx + Math.sin(a) * (cr - 44), cy - Math.cos(a) * (cr - 44), s % 15 ? 18 : 24, s % 15 ? "#1a1a1a" : "#c22a1e", 900);
    }
    text(ctx, "PACE", cx, cy + 46, 13, "#5a5c60", 900);
    const hand = (sec, len, w, col) => {
      const a = (sec / 60) * Math.PI * 2;
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - Math.sin(a) * 22, cy + Math.cos(a) * 22);
      ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
      ctx.stroke();
    };
    hand(38, cr - 18, 4, "#1a1a1a");
    hand(12, cr - 10, 5, "#d8281c");
    ctx.lineCap = "butt";
  });
  ctx.fillStyle = "#d8281c";
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y] of [[cx - cr - 10, cy - cr - 10], [cx + cr + 10, cy - cr - 10], [cx - cr - 10, cy + cr + 10], [cx + cr + 10, cy + cr + 10]]) rivet(ctx, x, y, 4, p);
}

/**
 * The first-aid point: the defibrillator in its green case, an extinguisher on
 * its bracket, the drinking fountain at waist height with its splash plate.
 */
function paintAid(ctx, p, r) {
  hallWall(ctx, p, r, { pads: false });
  // AED case, on the texture's right (on screen, the left).
  const ax = T - 214;
  plate(ctx, ax, 60, 180, 196, p, { tones: ["#2fb860", "#1f9048", "#0e5426"], bevel: 6, ink: 3 });
  plate(ctx, ax + 16, 76, 148, 46, p, { tones: ["#f4f6f8", "#e2e6ea", "#b8bec6"], bevel: 3, ink: 2 });
  letter(ctx, "AED", ax + 90, 99, 30, "#1f9048", 900);
  plate(ctx, ax + 30, 134, 120, 96, p, { tones: ["#e8f4ec", "#d0e4d8", "#a0b8a8"], bevel: 3, ink: 2, recess: true });
  // Heart and bolt, through the window.
  ctx.fillStyle = "#d8281c";
  ctx.beginPath();
  const hx = ax + 90, hy = 176;
  ctx.moveTo(hx, hy + 30);
  ctx.bezierCurveTo(hx - 44, hy, hx - 30, hy - 30, hx, hy - 12);
  ctx.bezierCurveTo(hx + 30, hy - 30, hx + 44, hy, hx, hy + 30);
  ctx.fill();
  ctx.fillStyle = "#f6f7f8";
  ctx.beginPath();
  ctx.moveTo(hx + 4, hy - 16); ctx.lineTo(hx - 12, hy + 4); ctx.lineTo(hx, hy + 4);
  ctx.lineTo(hx - 6, hy + 22); ctx.lineTo(hx + 12, hy - 2); ctx.lineTo(hx, hy - 2);
  ctx.closePath();
  ctx.fill();
  led(ctx, ax + 160, 244, 4, "#3aff6a");
  plate(ctx, ax + 30, 266, 120, 30, p, { tones: ["#f4f6f8", "#e2e6ea", "#b8bec6"], bevel: 2, ink: 2 });
  letter(ctx, "FIRST AID", ax + 90, 281, 15, "#1f9048", 900);
  // Extinguisher, on the texture's left.
  const ex = 92;
  plate(ctx, ex - 40, 70, 80, 34, p, { tones: ["#c22a1e", "#a8201a", "#5a0c08"], bevel: 2, ink: 2 });
  letter(ctx, "FIRE", ex, 87, 16, "#ffffff", 900);
  ctx.fillStyle = "#2a2c30";
  ctx.fillRect(ex - 36, 150, 72, 10);
  ctx.fillStyle = lin(ctx, ex - 26, 0, ex + 26, 0, [[0, "#7a1410"], [0.35, "#e8382a"], [0.6, "#c22a1e"], [1, "#5a0c08"]]);
  ctx.beginPath();
  ctx.roundRect(ex - 26, 128, 52, 190, 18);
  ctx.fill();
  raise(ex - 26, 128, 52, 190, 26);
  ctx.fillStyle = "#1a1c20";
  ctx.fillRect(ex - 10, 108, 20, 22);
  ctx.fillRect(ex + 8, 112, 34, 6);
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ex - 10, 118);
  ctx.quadraticCurveTo(ex - 48, 150, ex - 34, 230);
  ctx.stroke();
  plate(ctx, ex - 20, 200, 40, 50, p, { tones: ["#f4f6f8", "#e2e6ea", "#b8bec6"], bevel: 2, ink: 1.5 });
  // Drinking fountain, under the middle: steel bowl, push button, splash plate.
  const fx = T / 2 - 14;
  plate(ctx, fx - 70, 300, 140, 150, p, { tones: ["#c8ced6", "#a8b0ba", "#6e7680"], bevel: 4, ink: 2 });
  plate(ctx, fx - 86, 300, 172, 34, p, { tones: ["#e2e6ea", "#b8bec6", "#7a828c"], bevel: 4, ink: 2 });
  ctx.fillStyle = "#3a4048";
  ctx.beginPath();
  ctx.ellipse(fx, 314, 60, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  sink(fx - 60, 306, 120, 16, 20);
  plate(ctx, fx + 58, 340, 22, 22, p, { tones: ["#3a8ef4", "#2a74d6", "#1a4c96"], bevel: 2, ink: 1.5 });
  for (let y = 360; y < 440; y += 12) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(fx - 60, y, 120, 2);
  }
}

export const PAINTERS = {
  [W.DIST_10]: (ctx, p, r) => paintDistance(ctx, p, r, "10 M"),
  [W.DIST_20]: (ctx, p, r) => paintDistance(ctx, p, r, "20 M"),
  [W.CLOCK]: paintClock,
  [W.AID]: paintAid,
  [W.LANE_1]: (ctx, p, r) => paintLane(ctx, p, r, 1),
  [W.LANE_2]: (ctx, p, r) => paintLane(ctx, p, r, 2),
  [W.LANE_3]: (ctx, p, r) => paintLane(ctx, p, r, 3),
  [W.LANE_4]: (ctx, p, r) => paintLane(ctx, p, r, 4),
  [W.WALL]: paintWall,
  [W.PAD]: paintPad,
  [W.BOARD]: paintBoard,
  [W.SIGN]: paintSign,
  [W.RAIL]: paintRail,
};
