/**
 * Wall painters for holding (src/data/levels/rooms/holding.js places them).
 * Keyed by wall id.
 *
 * Institutional block painted pale green over a dark dado, the yellow
 * escort line at hip height. The cells' fronts: bars with the cell behind
 * them (bunk, steel toilet, the back wall), one with someone on the bunk,
 * one glass-fronted for the watch cell; the dividers between. Processing's
 * wall: the height chart, the booking station (camera feed, fingerprint
 * pad), the detainee's rights; the property counter's window; the sign.
 */
import { HOLDING_WALLS as W } from "../../../data/levels/rooms/holding.js";
import { letter } from "../locker-art.js";
import { T, lin, plate, rivet, led, sink, raise, hazard } from "../paint.js";
import { onScreen, text, screen, bust, lit } from "./east-kit.js";

const PAINT = ["#b8c8b4", "#a8b8a4", "#90a08c"];
const DADO = ["#4a5a52", "#3a4840", "#24302a"];
const STEEL = ["#9aa2ac", "#6e767f", "#3e444c"];
const DARK = ["#2a2e34", "#1c1f24", "#0e1013"];
const BAR = ["#d0d6dc", "#8c949c", "#40464e"];

const RAIL = 300;
const KICK = 462;

function blockWall(ctx, p, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, RAIL, [[0, PAINT[2]], [0.5, PAINT[1]], [1, PAINT[0]]]);
  ctx.fillRect(0, 0, T, RAIL);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for (let y = 30; y < KICK; y += 54) ctx.fillRect(0, y, T, 2);
  for (let row = 0, y = 30; y < KICK; row++, y += 54) for (let x = row % 2 ? 64 : 0; x < T; x += 128) ctx.fillRect(x, y, 2, 54);
  ctx.fillStyle = lin(ctx, 0, RAIL, 0, KICK, [[0, DADO[0]], [1, DADO[2]]]);
  ctx.fillRect(0, RAIL, T, KICK - RAIL);
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(0, RAIL - 14, T, 10);
  raise(0, RAIL - 14, T, 10, 4);
  plate(ctx, 0, 0, T, 14, p, { tones: DARK, bevel: 2, ink: 2, spec: false });
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.06})`;
    ctx.fillRect(r() * T, 20 + r() * 400, 2 + r() * 30, 1 + r() * 3);
  }
}

function paintWall(ctx, p, r) {
  blockWall(ctx, p, r);
  // A caged lamp over the rail.
  plate(ctx, T / 2 - 34, 120, 68, 40, p, { tones: STEEL, bevel: 3, ink: 2 });
  ctx.fillStyle = "#fff6d8";
  ctx.fillRect(T / 2 - 24, 128, 48, 24);
  lit(T / 2 - 24, 128, 48, 24, 0.8, 8);
  ctx.strokeStyle = "#2a2e34";
  ctx.lineWidth = 3;
  for (let x = T / 2 - 20; x <= T / 2 + 20; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 124);
    ctx.lineTo(x, 156);
    ctx.stroke();
  }
}

/** The inside of a cell, seen through its front: back wall, bunk, the pan. */
function cellInside(ctx, p, r, occupied) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, T, [[0, "#3a443e"], [1, "#1a201c"]]);
  ctx.fillRect(0, 0, T, T);
  // Back wall's block, darker for being a cell's depth away.
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let y = 40; y < 440; y += 48) ctx.fillRect(40, y, T - 80, 2);
  // The bunk along one side, the steel toilet the other.
  plate(ctx, 30, 320, 260, 40, p, { tones: STEEL, bevel: 3, ink: 2 });
  plate(ctx, 40, 300, 240, 24, p, { tones: ["#4a5a7a", "#3a4a6a", "#24304a"], bevel: 2, ink: 1.5, spec: false });
  plate(ctx, T - 130, 330, 80, 90, p, { tones: BAR, bevel: 3, ink: 2 });
  if (occupied) {
    // Someone on the bunk, knees up, head down.
    bust(ctx, 150, 300, 48, "#0c0e12");
  }
  ctx.fillStyle = "rgba(255,255,220,0.08)";
  ctx.fillRect(40, 30, T - 80, 60);
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
}

/** Bars over the cell: round steel, a cross-tie, the lock box. */
function bars(ctx, p, r) {
  plate(ctx, 0, 0, T, 34, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 0, 220, T, 22, p, { tones: STEEL, bevel: 3, ink: 2 });
  for (let x = 18; x < T; x += 44) {
    ctx.fillStyle = lin(ctx, x - 8, 0, x + 8, 0, [[0, BAR[2]], [0.4, BAR[0]], [1, BAR[2]]]);
    ctx.fillRect(x - 8, 34, 16, KICK - 34);
    raise(x - 8, 34, 16, KICK - 34, 20);
  }
  plate(ctx, T / 2 - 40, 200, 80, 64, p, { tones: DARK, bevel: 3, ink: 2 });
  led(ctx, T / 2, 232, 5, "#ff3a2a");
}

function paintBars(ctx, p, r) {
  cellInside(ctx, p, r, false);
  bars(ctx, p, r);
}

function paintBarsOccupied(ctx, p, r) {
  cellInside(ctx, p, r, true);
  bars(ctx, p, r);
}

/** The watch cell: a glass front, the camera dome, its number. */
function paintGlassCell(ctx, p, r) {
  cellInside(ctx, p, r, false);
  ctx.fillStyle = "rgba(170,210,230,0.18)";
  ctx.fillRect(20, 40, T - 40, KICK - 40);
  ctx.fillStyle = "rgba(240,250,255,0.18)";
  for (const [a, b] of [[60, 130], [300, 340]]) {
    ctx.beginPath();
    ctx.moveTo(a, 40);
    ctx.lineTo(b, 40);
    ctx.lineTo(b - 90, KICK);
    ctx.lineTo(a - 90, KICK);
    ctx.closePath();
    ctx.fill();
  }
  for (const [x, y, w, h] of [[0, 0, T, 40], [0, 0, 20, KICK], [T - 20, 0, 20, KICK]]) plate(ctx, x, y, w, h, p, { tones: STEEL, bevel: 3, ink: 2 });
  plate(ctx, T / 2 - 70, 60, 140, 30, p, { tones: ["#f0cf5a", "#e0b83a", "#a8841e"], bevel: 2, ink: 1 });
  letter(ctx, "WATCH CELL 3", T / 2, 75, 14, "#1a1c20", 900);
}

/** Between cells: the block, a cell number, the intercom. */
function paintDivider(ctx, p, r) {
  blockWall(ctx, p, r);
  plate(ctx, T / 2 - 50, 120, 100, 60, p, { tones: DARK, bevel: 3, ink: 2 });
  letter(ctx, "CELLS", T / 2, 150, 18, "#e8c23a", 900);
  plate(ctx, T / 2 - 30, 220, 60, 80, p, { tones: STEEL, bevel: 3, ink: 2 });
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = "#1a1c20";
    ctx.fillRect(T / 2 - 18, 232 + k * 10, 36, 4);
  }
  led(ctx, T / 2, 284, 4, "#3aff6a");
}

/** The height chart behind where a detainee stands for the camera. */
function paintHeightChart(ctx, p, r) {
  blockWall(ctx, p, r);
  plate(ctx, 30, 20, T - 60, KICK - 30, p, { tones: ["#e8ece8", "#dce0dc", "#bcc0bc"], bevel: 3, ink: 2, spec: false });
  onScreen(ctx, () => {
    // Rules every 10 cm, the feet and inches down the side.
    for (let k = 0; k <= 22; k++) {
      const y = KICK - 20 - k * 19;
      ctx.fillStyle = k % 5 ? "rgba(20,24,30,0.45)" : "#14181e";
      ctx.fillRect(40, y, T - 80, k % 5 ? 2 : 4);
      if (k % 5 === 0) {
        text(ctx, `${(k / 10 + 1.0).toFixed(1)}m`, 70, y - 10, 13, "#14181e", 900, "left");
        text(ctx, `${(k / 10 + 1.0).toFixed(1)}m`, T - 70, y - 10, 13, "#14181e", 900, "right");
      }
    }
    text(ctx, "CHRONOS PD", T / 2, 60, 18, "#14181e", 900);
  });
}

/** The booking station: the camera's feed, the fingerprint pad, the booking number. */
function paintBooking(ctx, p, r) {
  blockWall(ctx, p, r);
  screen(ctx, p, 60, 70, T - 120, 170, (x, y, w, h) => {
    ctx.fillStyle = "#1a242a";
    ctx.fillRect(x, y, w, h);
    // The last booking photo: grey chart, a silhouette.
    ctx.fillStyle = "#8a9498";
    ctx.fillRect(x + w / 2 - 60, y + 14, 120, h - 28);
    bust(ctx, x + w / 2, y + h - 30, 40, "#2a3034");
    ctx.fillStyle = "#46e0ff";
    ctx.fillRect(x + 10, y + 10, 50, 6);
  });
  onScreen(ctx, () => text(ctx, "BOOKING #0647-11", T / 2, 262, 14, "#14181e", 900));
  plate(ctx, 120, 290, T - 240, 120, p, { tones: DARK, bevel: 4, ink: 2 });
  ctx.fillStyle = "#3aff6a";
  ctx.globalAlpha = 0.6;
  ctx.fillRect(T / 2 - 50, 314, 100, 70);
  ctx.globalAlpha = 1;
  lit(T / 2 - 50, 314, 100, 70, 0.6, 8);
  letter(ctx, "PLACE FINGER", T / 2, 398, 11, "#e8e8e8", 800);
}

/** The property counter's window: a slot under thick glass, the cage behind. */
function paintProperty(ctx, p, r) {
  blockWall(ctx, p, r);
  plate(ctx, 50, 70, T - 100, 230, p, { tones: STEEL, bevel: 4, ink: 2 });
  ctx.fillStyle = lin(ctx, 0, 84, 0, 280, [[0, "#1c2228"], [1, "#2a3036"]]);
  ctx.fillRect(66, 84, T - 132, 196);
  sink(66, 84, T - 132, 196, 20);
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = "#3a4048";
    ctx.fillRect(66, 140 + k * 50, T - 132, 5);
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = `rgba(${150 + r() * 40},${110 + r() * 20},70,0.7)`;
      ctx.fillRect(80 + b * 70, 104 + k * 50, 50, 36);
    }
  }
  ctx.fillStyle = "rgba(220,240,255,0.12)";
  ctx.fillRect(66, 84, T - 132, 40);
  plate(ctx, 50, 300, T - 100, 30, p, { tones: STEEL, bevel: 3, ink: 2 });
  plate(ctx, T / 2 - 90, 344, 180, 34, p, { tones: ["#f0cf5a", "#e0b83a", "#a8841e"], bevel: 2, ink: 1 });
  letter(ctx, "PROPERTY · RING FOR SERVICE", T / 2, 361, 12, "#1a1c20", 900);
}

/** HOLDING over the way in: escort only. */
function paintSign(ctx, p, r) {
  blockWall(ctx, p, r);
  plate(ctx, 40, 100, T - 80, 130, p, { tones: DARK, bevel: 5, ink: 3 });
  hazard(ctx, 52, 112, T - 104, 14, "#e8c23a");
  letter(ctx, "HOLDING", T / 2, 160, 40, "#e8c23a", 900);
  letter(ctx, "ALL DETAINEES ESCORTED", T / 2, 204, 13, "#e8e8e8", 800);
}

/** The detainee's rights, framed by processing. */
function paintRights(ctx, p, r) {
  blockWall(ctx, p, r);
  plate(ctx, 90, 70, T - 180, 300, p, { tones: ["#1e2228", "#16191e", "#0c0e11"], bevel: 4, ink: 2 });
  plate(ctx, 104, 84, T - 208, 272, p, { tones: ["#f4f2ea", "#e8e6dc", "#d0cec4"], bevel: 2, ink: 1.5, spec: false });
  onScreen(ctx, () => {
    text(ctx, "YOUR RIGHTS", T / 2, 108, 20, "#14181e", 900);
    const rows = ["YOU MAY REMAIN SILENT", "YOU MAY SEE A LAWYER", "YOU MAY KNOW THE TIME", "OF YOUR ARREST", "ASK THE DESK OFFICER"];
    rows.forEach((s, i) => text(ctx, s, T / 2, 150 + i * 36, 13, "#14181e", 800, "center", T - 230));
  });
  for (const [x, y] of [[100, 80], [T - 100, 80]]) rivet(ctx, x, y, 4, p);
}

/**
 * Processing's counter, as a waist-high low wall (the bottom two fifths of
 * the face shows): a laminate top, the counter front with its lettering,
 * the kick.
 */
function paintCounter(ctx, p, r) {
  ctx.fillStyle = DARK[1];
  ctx.fillRect(0, 0, T, T);
  const top = 308;
  plate(ctx, 0, top, T, 20, p, { tones: ["#dcdcd4", "#c4c4bc", "#8a8a84"], bevel: 3, ink: 2 });
  plate(ctx, 0, top + 20, T, KICK - top - 20 + 20, p, { tones: DADO, bevel: 3, ink: 2, spec: false });
  plate(ctx, 120, top + 50, T - 240, 40, p, { tones: ["#e8ece8", "#d4d8d4", "#a8aca8"], bevel: 2, ink: 1.5 });
  letter(ctx, "PROCESSING", T / 2, top + 70, 20, "#24302a", 900);
  plate(ctx, 0, KICK + 20, T, T - KICK - 20, p, { tones: DARK, bevel: 2, ink: 1.5, spec: false });
}

export const PAINTERS = {
  [W.COUNTER]: paintCounter,
  [W.WALL]: paintWall,
  [W.BARS]: paintBars,
  [W.BARS_OCCUPIED]: paintBarsOccupied,
  [W.GLASS_CELL]: paintGlassCell,
  [W.HEIGHT_CHART]: paintHeightChart,
  [W.BOOKING]: paintBooking,
  [W.PROPERTY]: paintProperty,
  [W.SIGN]: paintSign,
  [W.RIGHTS]: paintRights,
  [W.DIVIDER]: paintDivider,
};
