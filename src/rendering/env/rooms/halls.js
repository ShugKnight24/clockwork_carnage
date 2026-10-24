/**
 * Wall painters for the east wing's halls (src/data/levels/rooms/halls.js
 * places them), on the corridor's painted station wall. Keyed by wall id.
 *
 * The clock (and the same clock stopped at 06:47), a sign at each of the
 * wing's doors, the certification board for the morning's trials, the
 * floor directory, the memorial photo of the heavy squads in their C-series
 * plate, a vent grille, and the PT poster about pacing a run.
 */
import { HALL_WALLS as W } from "../../../data/levels/rooms/halls.js";
import { T, lin, plate, rivet, lightStrip, led, sink, hazard, vents } from "../paint.js";
import { stationWall, say, paintSign, NAVY, STEEL, BLACK, BRASS } from "./corridor.js";
import { onScreen, text, clockFace, heavyFrame } from "./east-kit.js";

/** The station clock over the rail: `h:m` on its face, the PD plate under it. */
function paintClockAt(h, m) {
  return (ctx, p, r) => {
    stationWall(ctx, p, r);
    clockFace(ctx, T / 2, 150, 70, h, m);
    plate(ctx, T / 2 - 90, 244, 180, 30, p, { tones: NAVY, bevel: 3, ink: 2 });
    say(ctx, "STATION TIME", T / 2, 259, 13, "#f2f2ee", 900);
  };
}

/** The certification board: the morning's four trials, chalked up by R&D. */
function paintCertBoard(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 30, 104, T - 60, 300, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 42, 116, T - 84, 276, p, { tones: ["#f2f4f2", "#e6e8e6", "#c8ccca"], bevel: 2, ink: 1.5, spec: false });
  onScreen(ctx, () => {
    text(ctx, "CERTIFICATION — D-SERIES", T / 2, 136, 20, "#1a2a5a", 900, "center", T - 110);
    text(ctx, "BADGE 11235 · DUE 1200 FOR THE BUREAU", T / 2, 160, 12, "#5a2a1a", 800, "center", T - 110);
    const rows = [
      ["WEAPONS", "THE RANGE"],
      ["MOBILITY", "LOBBY START GATE"],
      ["COMBAT", "SIM HALL"],
      ["TELEMETRY", "R&D BAY"],
    ];
    rows.forEach(([trial, where], i) => {
      const y = 198 + i * 44;
      ctx.strokeStyle = "#1a2a5a";
      ctx.lineWidth = 3;
      ctx.strokeRect(70, y - 13, 26, 26);
      text(ctx, trial, 112, y, 20, "#1a2a5a", 900, "left");
      text(ctx, where, T - 66, y, 13, "#3a4a6a", 800, "right");
    });
    text(ctx, "ANY ORDER — DR. ORR", T / 2, 376, 13, "#a8281e", 900);
  });
  // The marker in its tray.
  plate(ctx, 120, 392, T - 240, 12, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  plate(ctx, 160, 384, 60, 10, p, { tones: ["#2a4aa8", "#1a3488", "#0e1e58"], bevel: 2, ink: 1 });
}

/** The floor directory: this floor's plan, the wing's rooms on it, YOU ARE HERE. */
function paintDirectory(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 34, 100, T - 68, 300, p, { tones: BLACK, bevel: 5, ink: 3 });
  say(ctx, "FLOOR DIRECTORY", T / 2, 120, 18, BRASS, 900);
  plate(ctx, 50, 138, T - 100, 246, p, { tones: ["#e8ecf0", "#d8dce2", "#b8bec6"], bevel: 2, ink: 1.5, spec: false });
  onScreen(ctx, () => {
    // The plan, roughly to scale: the old station west, the wing east.
    const box = (x, y, w, h, label, fill = "#c4ccd6") => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#2a3446";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      text(ctx, label, x + w / 2, y + h / 2, 9, "#1a2232", 900, "center", w - 4);
    };
    const X = 62, Y = 150, S = 4.5;
    const at = (c, rr, w, h, label, fill) => box(X + c * S, Y + rr * S, w * S, h * S, label, fill);
    at(8, 1, 44, 10, "SIM HALL", "#b8e4ee");
    at(3, 14, 22, 12, "GYM");
    at(35, 14, 22, 12, "OFFICE");
    at(3, 36, 22, 11, "LOCKERS");
    at(35, 36, 22, 11, "RANGE", "#f0d8b0");
    at(22, 48, 16, 6, "LOBBY");
    at(62, 1, 18, 13, "R&D", "#d4e8d0");
    at(62, 15, 22, 16, "DISPATCH");
    at(62, 32, 23, 19, "ATRIUM", "#dce4f4");
    at(62, 52, 23, 8, "HOLDING", "#e0d4d0");
    at(42, 51, 14, 6, "INTERVIEW");
    // The corridors.
    ctx.fillStyle = "#8a96a8";
    ctx.fillRect(X + 27 * S, Y + 12 * S, 6 * S, 36 * S);
    ctx.fillRect(X + 58 * S, Y + 7 * S, 2 * S, 50 * S);
    ctx.fillRect(X + 40 * S, Y + 48 * S, 18 * S, 2 * S);
  });
  // YOU ARE HERE: a red dot by the mouth of the south hall or the office door.
  led(ctx, T - 62 - 58 * 4.5 - 6, 150 + (r() < 0.5 ? 22 : 48) * 4.5, 5, "#ff3a2a");
}

/** The heavy squads' photo on the memorial board: both in C-series plate. */
function paintMemorial(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 44, 100, T - 88, 296, p, { tones: ["#2a1e14", "#1e150e", "#120c08"], bevel: 5, ink: 3 });
  // The photo: the hangar, a row of armoured officers.
  ctx.fillStyle = lin(ctx, 0, 120, 0, 300, [[0, "#9aa4b0"], [1, "#4c5462"]]);
  ctx.fillRect(64, 118, T - 128, 186);
  sink(64, 118, T - 128, 186, 8);
  for (let i = 0; i < 6; i++) heavyFrame(ctx, 104 + i * 61, 268, 24, ["#7a8496", "#59627a", "#2c3242"], i === 2 ? "#ffd070" : "#ffb030");
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(64, 118, T - 128, 14);
  plate(ctx, 90, 318, T - 180, 62, p, { tones: ["#e8cc7a", "#c8a24e", "#8a6a28"], bevel: 3, ink: 2 });
  say(ctx, "TCD HEAVY SQUADS A & B", T / 2, 336, 17, "#2a1a08", 900, T - 200);
  say(ctx, "C-SERIES PLATE · FIRST IN, LAST OUT", T / 2, 360, 11, "#3a2410", 800, T - 200);
}

/** A ventilation grille in the wall: louvres, screws, the duct's dark behind. */
function paintVent(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 96, 300, T - 192, 140, p, { tones: STEEL, bevel: 4, ink: 2 });
  ctx.fillStyle = "#06080a";
  ctx.fillRect(112, 314, T - 224, 112);
  sink(112, 314, T - 224, 112, 30);
  vents(ctx, 112, 318, T - 224, 104, 8, p);
  for (const [x, y] of [[106, 310], [T - 106, 310], [106, 430], [T - 106, 430]]) rivet(ctx, x, y, 4, p);
  hazard(ctx, 96, 286, T - 192, 10, "#e8c23a");
}

/** PT's poster: pace a run. The stamina bar, sprint, walk, sprint. */
function paintPTPoster(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 120, 96, T - 240, 300, p, { tones: ["#1c3a6e", "#142c58", "#0c1c3c"], bevel: 4, ink: 2 });
  onScreen(ctx, () => {
    text(ctx, "PACE YOURSELF", T / 2, 128, 26, "#f2d64a", 900, "center", T - 270);
    // The bar draining and refilling down a run.
    const bars = [1, 0.6, 0.25, 0.55, 0.85, 0.4];
    bars.forEach((f, i) => {
      const x = 150 + i * 36;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x, 160, 24, 110);
      ctx.fillStyle = f < 0.3 ? "#ff6a3a" : "#5aff9a";
      ctx.fillRect(x, 160 + 110 * (1 - f), 24, 110 * f);
    });
    text(ctx, "SPRINT THE STRAIGHTS", T / 2, 300, 15, "#f2f2ee", 900, "center", T - 270);
    text(ctx, "EASE OFF BEFORE YOU'RE EMPTY", T / 2, 322, 12, "#b8c8e0", 800, "center", T - 270);
    text(ctx, "THE BAR COMES BACK WHILE YOU WALK", T / 2, 342, 12, "#b8c8e0", 800, "center", T - 270);
    text(ctx, "— PT SGT. VARGA", T / 2, 372, 11, "#f2d64a", 800);
  });
}

/** Interview's door sign: no arrow, the red light that says a tape is running. */
function paintInterviewSign(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 60, 120, T - 120, 100, p, { tones: NAVY, bevel: 5, ink: 3 });
  say(ctx, "INTERVIEW", T / 2, 156, 36, "#f2f2ee", 900, T - 150);
  say(ctx, "RECORDING IN PROGRESS WHEN LIT", T / 2, 196, 12, "#b8c8e0", 800, T - 150);
  plate(ctx, T / 2 - 40, 232, 80, 34, p, { tones: BLACK, bevel: 3, ink: 2 });
  lightStrip(ctx, T / 2 - 30, 242, 60, 14, "#ff3a2a", { blur: 16 });
}

export const PAINTERS = {
  // Right, before the morning goes wrong; stopped, after.
  [W.CLOCK]: paintClockAt(6, 38),
  [W.CLOCK_STOPPED]: paintClockAt(6, 47),
  [W.SIGN_RND]: paintSign("R&D", "left", "SUIT LAB · LIFT A · ENGINE LEVEL", true),
  [W.SIGN_DISPATCH]: paintSign("DISPATCH", "right", "BULLPEN · DETECTIVES"),
  [W.SIGN_ATRIUM]: paintSign("ATRIUM", "right", "PUBLIC GALLERY · UPPER LEVEL"),
  [W.SIGN_HOLDING]: paintSign("HOLDING", "right", "PROCESSING · CELLS · PROPERTY", true),
  [W.SIGN_INTERVIEW]: paintInterviewSign,
  [W.CERT_BOARD]: paintCertBoard,
  [W.DIRECTORY]: paintDirectory,
  [W.MEMORIAL]: paintMemorial,
  [W.VENT]: paintVent,
  [W.PT_POSTER]: paintPTPoster,
};
