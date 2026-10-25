/**
 * Wall painters for the campaign floors' rooms (src/data/levels/rooms/
 * precinct.js names the ids, src/data/levels/station-dressing.js places
 * them), painted like the prologue's corridor and on its helpers.
 *
 * The custody side of a police building: barred holding cells and the block
 * behind the bunk, the interview room's one-way glass and padded walls, the
 * booking height chart, the dispatch console, the case board from the
 * morning's briefing and the evidence intake hatch. Then the station's
 * working floors: specimen shelving, a fume hood and a whiteboard for the
 * labs, a server rack, the reactor's gauges and its radiation notice.
 *
 * Lettering goes through the mirrored `say` (the raycaster lays a face
 * mirrored), so `S(x)` places a thing x from the left as you look at it.
 * Anything that must read in Realistic sits on a raised plate(): the bake
 * repaints a flat face.
 */

import { PRECINCT_WALLS as W } from "../../../data/levels/rooms/precinct.js";
import { say, glow, paper, lines, stationWall, base, blockWall, paintSign } from "./corridor.js";
import { T, lin, plate, ink, lightStrip, led, relief, grey, hazard, emit } from "../paint.js";

const S = (x) => T - x;
const KICKY = 456;

const STEEL = { tones: ["#9aa2ac", "#6e767f", "#3e444c"], bevel: 3, ink: 2 };
const BAR = { tones: ["#b4bcc6", "#7e8690", "#3a4048"], bevel: 2, ink: 1.5 };
const DARK = { tones: ["#1e2228", "#15181d", "#0a0c0f"], bevel: 3, ink: 2, spec: false };
const PAPER = ["#f4f2ea", "#e8e6dc", "#d0cec4"];
const WHITE = { tones: ["#f2f4f4", "#e2e6e8", "#c4cacc"], bevel: 3, ink: 2, spec: false };
const NAVY = { tones: ["#2e4a7a", "#22385e", "#16243e"], bevel: 3, ink: 2 };
const AMBER = "#ffb040";

/** Mark a lit area (a screen, a lamp) as emitting, so Realistic leaves it bright. */
function lit(x, y, w, h, blur = 6) {
  emit((g) => g.fillRect(x, y, w, h), blur);
}

// ── Holding ──────────────────────────────────────────────────────

/** What shows between the bars: the cell's block, its bunk and its steel pan. */
function cellInside(ctx, p, r) {
  plate(ctx, 0, 28, T, KICKY - 28, p, { tones: ["#7a7e72", "#686c62", "#484c44"], bevel: 0, ink: 0, spec: false });
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let y = 60; y < KICKY; y += 52) ctx.fillRect(0, y, T, 2);
  // The bunk, bolted along the back wall, a grey blanket on it.
  plate(ctx, S(400), 300, 300, 24, p, { tones: ["#6a7078", "#50565e", "#2c3036"], bevel: 2, ink: 1.5 });
  plate(ctx, S(380), 286, 220, 16, p, { tones: ["#5a6470", "#46505c", "#2a3038"], bevel: 2, ink: 1, spec: false });
  // Steel toilet-and-basin by the door side.
  plate(ctx, S(80) - 56, 330, 56, 90, p, { tones: ["#b8c0c8", "#8a929a", "#4a5058"], bevel: 3, ink: 1.5 });
  plate(ctx, S(80) - 52, 300, 48, 24, p, { tones: ["#b8c0c8", "#8a929a", "#4a5058"], bevel: 2, ink: 1.5 });
  // Tally marks scratched by the bunk: somebody was in here a while.
  ctx.strokeStyle = "rgba(200,196,180,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const x = S(140) - i * 9 - ((i / 5) | 0) * 8;
    ctx.beginPath();
    ctx.moveTo(x, 210);
    ctx.lineTo(x + (i % 5 === 4 ? 40 : 0), 240);
    ctx.stroke();
  }
}

/** The bars themselves, with their cross rails top, middle and foot. */
function bars(ctx, p, x0, x1) {
  for (let x = x0; x < x1; x += 34) plate(ctx, x, 28, 12, KICKY - 28, p, BAR);
  for (const y of [28, 236, KICKY - 18]) plate(ctx, x0 - 10, y, x1 - x0 + 14, 16, p, STEEL);
}

/** A run of holding-cell bars. */
function paintCellBars(ctx, p, r) {
  cellInside(ctx, p, r);
  plate(ctx, 0, 0, T, 28, p, DARK);
  bars(ctx, p, 18, T - 6);
  base(ctx, p);
}

/** The cell door: the same bars in a heavier frame, its lock box, its number. */
function paintCellDoor(ctx, p, r) {
  cellInside(ctx, p, r);
  plate(ctx, 0, 0, T, 28, p, DARK);
  bars(ctx, p, 84, T - 80);
  for (const x of [48, T - 84]) plate(ctx, x, 28, 36, KICKY - 28, p, STEEL);
  // Lock box at hand height on the latch side, its key slot and lamp.
  plate(ctx, S(60) - 50, 220, 64, 96, p, STEEL);
  ink(ctx, S(60) - 22, 258, 8, 26, 30);
  led(ctx, S(60) - 18, 236, 5, "#ff3a2a");
  // Number plate over the door.
  plate(ctx, T / 2 - 70, 44, 140, 44, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 3, ink: 2 });
  say(ctx, `HOLDING ${1 + ((r() * 6) | 0)}`, T / 2, 66, 22, "#141414", 900, 128);
  base(ctx, p);
}

/** The cell's own back wall: painted block, a bunk bolted to it, the rules. */
function paintCellBack(ctx, p, r) {
  blockWall(ctx, r);
  plate(ctx, 0, 250, T, KICKY - 250, p, { tones: ["#5a6a5e", "#4c5a50", "#323e36"], bevel: 0, ink: 0, spec: false });
  plate(ctx, 0, 246, T, 8, p, { tones: ["#d6aa3e", "#b88e2a", "#7a5c18"], bevel: 1, ink: 1 });
  plate(ctx, 40, 320, T - 80, 26, p, { tones: ["#7a8088", "#5a6068", "#30343a"], bevel: 3, ink: 2 });
  for (const x of [64, T - 80]) plate(ctx, x, 260, 14, 62, p, STEEL);
  plate(ctx, 60, 304, T - 120, 18, p, { tones: ["#5a6470", "#46505c", "#2a3038"], bevel: 2, ink: 1, spec: false });
  plate(ctx, T / 2 - 100, 96, 200, 120, p, { tones: PAPER, bevel: 2, ink: 1.5, spec: false });
  say(ctx, "DETAINEE RULES", T / 2, 116, 15, "#1c1e22", 900, 180);
  lines(ctx, r, T / 2 - 84, 136, 168, 7, 10);
  base(ctx, p);
}

// ── Interview ────────────────────────────────────────────────────

/** Grey acoustic panels, floor to ceiling, in a steel grid. */
function acoustic(ctx, p, r) {
  plate(ctx, 0, 0, T, KICKY, p, { tones: ["#4a4e56", "#3e424a", "#2c3036"], bevel: 0, ink: 0, spec: false });
  for (let y = 16; y < KICKY - 20; y += 110) {
    for (let x = 12; x < T - 20; x += 124) {
      plate(ctx, x, y, 116, 102, p, { tones: ["#5c606a", "#4c5058", "#30343a"], bevel: 6, ink: 1.5, spec: false });
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`;
        ctx.fillRect(x + 6 + r() * 104, y + 6 + r() * 90, 2, 2);
      }
    }
  }
}

/** The observation mirror: a dark pane in a steel frame, a faint you in it. */
function paintOneWay(ctx, p, r) {
  acoustic(ctx, p, r);
  plate(ctx, 30, 70, T - 60, 290, p, STEEL);
  plate(ctx, 44, 84, T - 88, 262, p, { tones: ["#2a343e", "#1a2028", "#0c1014"], bevel: 4, ink: 2, recess: true, spec: false });
  // Reflection streaks: the room's own lamp, thrown back.
  ctx.save();
  ctx.beginPath();
  ctx.rect(44, 84, T - 88, 262);
  ctx.clip();
  ctx.fillStyle = "rgba(200,220,240,0.10)";
  for (const [x, w] of [[90, 60], [180, 18], [320, 90]]) {
    ctx.beginPath();
    ctx.moveTo(x, 84);
    ctx.lineTo(x + w, 84);
    ctx.lineTo(x + w - 120, 346);
    ctx.lineTo(x - 120, 346);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // The red lamp over it: someone on the other side, recording.
  plate(ctx, T / 2 - 60, 26, 120, 34, p, DARK);
  ctx.fillStyle = "#ff3a2a";
  ctx.fillRect(T / 2 - 50, 32, 100, 22);
  lit(T / 2 - 50, 32, 100, 22, 10);
  say(ctx, "RECORDING", T / 2, 43, 14, "#2a0606", 900, 92);
  plate(ctx, 30, 360, T - 60, 16, p, STEEL);
  base(ctx, p);
}

/** The interview room's padded wall: the camera in its corner, a ring bolted at table height. */
function paintInterview(ctx, p, r) {
  acoustic(ctx, p, r);
  // Camera on its bracket, top left as you face it.
  plate(ctx, S(40) - 16, 24, 16, 34, p, STEEL);
  plate(ctx, S(40) - 76, 46, 70, 34, p, { tones: ["#e2e6ea", "#b8bec4", "#70767c"], bevel: 3, ink: 2 });
  ink(ctx, S(40) - 82, 54, 8, 18, 30);
  led(ctx, S(40) - 66, 56, 3.5, "#ff3a2a");
  // The cuff ring.
  plate(ctx, T / 2 - 40, 300, 80, 24, p, STEEL);
  ctx.strokeStyle = "#a8b0b8";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(T / 2, 334, 16, 0, Math.PI);
  ctx.stroke();
  plate(ctx, T / 2 - 90, 140, 180, 40, p, NAVY);
  say(ctx, "INTERVIEW", T / 2, 160, 20, "#f2f2ee", 900, 160);
  base(ctx, p);
}

// ── Booking, dispatch, briefing, intake ─────────────────────────

/** The booking wall: the height chart behind the mugshot spot, the placard ledge. */
function paintBooking(ctx, p, r) {
  stationWall(ctx, p, r, { stripe: false });
  plate(ctx, 70, 24, T - 140, 420, p, WHITE);
  // A rule every ten centimetres, the number every twenty: 210 cm at the top.
  for (let i = 0; i <= 20; i++) {
    const y = 40 + i * 19.5;
    ctx.fillStyle = "#1c1e22";
    ctx.fillRect(78, y, i % 2 ? 40 : T - 156, i % 2 ? 2 : 3);
    if (i % 2 === 0) say(ctx, String(210 - i * 10), S(104), y + 10, 13, "#1c1e22", 900);
  }
  plate(ctx, T / 2 - 110, 56, 220, 34, p, NAVY);
  say(ctx, "CHRONOS PD · BOOKING", T / 2, 73, 16, "#f2f2ee", 900, 200);
  base(ctx, p);
}

/** Dispatch: the ring board over the console, units lit where they last called in. */
function paintDispatch(ctx, p, r) {
  stationWall(ctx, p, r, { stripe: false });
  plate(ctx, 24, 40, T - 48, 220, p, STEEL);
  plate(ctx, 36, 52, T - 72, 196, p, { tones: ["#06141c", "#041016", "#020a0e"], bevel: 3, ink: 2, recess: true, spec: false });
  lit(36, 52, T - 72, 196, 4);
  // The station's rings, drawn on the board in cyan.
  ctx.save();
  ctx.strokeStyle = "rgba(80,220,255,0.8)";
  ctx.shadowColor = "#50dcff";
  ctx.shadowBlur = 6;
  ctx.lineWidth = 2;
  for (const rr of [30, 56, 82]) {
    ctx.beginPath();
    ctx.ellipse(T / 2, 150, rr * 2, rr, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Unit markers: amber where they stopped answering, one red at the Engine.
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const rr = [30, 56, 82][i % 3];
    led(ctx, T / 2 + Math.cos(a) * rr * 2, 150 + Math.sin(a) * rr, 4, AMBER);
  }
  led(ctx, T / 2, 150, 6, "#ff3a2a");
  glow(ctx, "UNITS NOT RESPONDING", T / 2, 232, 14, AMBER, 900);
  // The console's ledge, its handsets and switch panels.
  plate(ctx, 0, 300, T, 30, p, { tones: ["#3a4048", "#2a2e34", "#16191d"], bevel: 3, ink: 2 });
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 160;
    plate(ctx, x, 340, 120, 90, p, DARK);
    for (let k = 0; k < 6; k++) led(ctx, x + 16 + k * 18, 360, 3, k % 3 ? "#3aff7a" : AMBER, r() < 0.8);
    plate(ctx, x + 14, 380, 92, 36, p, { tones: ["#0a2a1a", "#062012", "#04140c"], bevel: 2, ink: 1.5, recess: true, spec: false });
    lit(x + 14, 380, 92, 36, 3);
  }
  plate(ctx, T / 2 - 80, 266, 160, 28, p, NAVY);
  say(ctx, "DISPATCH", T / 2, 280, 18, "#f2f2ee", 900, 150);
  base(ctx, p);
}

/** The case board from the morning briefing: photos, string, the time circled. */
function paintCaseBoard(ctx, p, r) {
  stationWall(ctx, p, r);
  plate(ctx, 30, 40, T - 60, 250, p, STEEL);
  plate(ctx, 40, 50, T - 80, 230, p, WHITE);
  say(ctx, "BRIEFING · ENGINE LEVEL", T / 2, 70, 18, "#1a2a5a", 900, T - 120);
  // Photos and a sheet pinned up, read left to right as you face it.
  const spots = [[S(110), 120], [S(250), 110], [S(390), 128], [S(170), 214], [S(330), 208]];
  ctx.strokeStyle = "#c22a1e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  spots.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 20) : ctx.moveTo(x, y + 20)));
  ctx.stroke();
  spots.forEach(([x, y], i) => {
    if (i === 2) {
      paper(ctx, p, x - 46, y - 8, 92, 70, "#2a6ac2");
      say(ctx, "UNIT 4", x, y + 10, 12, "#1c1e22", 900, 80);
      say(ctx, "LT. RASCZAK", x, y + 26, 10, "#1c1e22", 800, 84);
      lines(ctx, r, x - 36, y + 40, 72, 2, 8);
      return;
    }
    plate(ctx, x - 40, y - 10, 80, 62, p, { tones: ["#e8e4d8", "#d4d0c4", "#a8a498"], bevel: 2, ink: 1.5, spec: false });
    plate(ctx, x - 34, y - 4, 68, 44, p, { tones: ["#5a6470", "#46505c", "#2a3038"], bevel: 1, ink: 1, spec: false });
    ctx.fillStyle = "rgba(220,210,190,0.35)";
    ctx.beginPath();
    ctx.arc(x, y + 12, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c22a1e";
    ctx.beginPath();
    ctx.arc(x, y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  // The time, written large and ringed twice.
  say(ctx, "06:47", S(250), 262, 26, "#c22a1e", 900);
  ctx.strokeStyle = "#c22a1e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(S(250), 262, 56, 18, -0.05, 0, Math.PI * 2);
  ctx.stroke();
  plate(ctx, 40, 290, T - 80, 10, p, STEEL);
  base(ctx, p);
}

/** Property intake: a hatch through to the cage, its counter, the sign and the bell. */
function paintIntake(ctx, p, r) {
  stationWall(ctx, p, r, { stripe: false });
  plate(ctx, T / 2 - 120, 96, 240, 40, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 3, ink: 2 });
  say(ctx, "PROPERTY & EVIDENCE INTAKE", T / 2, 116, 14, "#141414", 900, 224);
  plate(ctx, T / 2 - 130, 146, 260, 150, p, STEEL);
  plate(ctx, T / 2 - 118, 158, 236, 126, p, { tones: ["#1a1e24", "#14171c", "#0a0c0f"], bevel: 3, ink: 2, recess: true, spec: false });
  // Shelving glimpsed through the hatch.
  for (const y of [200, 250]) {
    plate(ctx, T / 2 - 118, y, 236, 6, p, { tones: ["#3a4048", "#2a2e34", "#16191d"], bevel: 1, ink: 0 });
    for (let k = 0; k < 4; k++) {
      plate(ctx, T / 2 - 110 + k * 58, y - 34 + ((k + y) % 3) * 4, 46, 34 - ((k + y) % 3) * 4, p, { tones: ["#b48a5a", "#9a7446", "#6a4e2c"], bevel: 1, ink: 1, spec: false });
    }
  }
  plate(ctx, T / 2 - 150, 296, 300, 22, p, { tones: ["#d0d6dc", "#9ea6ae", "#5c646c"], bevel: 3, ink: 2 });
  // The bell and the sign-in clipboard on the counter.
  plate(ctx, S(150) - 22, 280, 28, 16, p, { tones: ["#e8c86a", "#c8a24e", "#7a5a20"], bevel: 2, ink: 1.5 });
  paper(ctx, p, S(330) - 30, 250, 60, 46, null);
  lines(ctx, r, S(330) - 22, 262, 44, 3, 9);
  base(ctx, p);
}

// ── Labs ─────────────────────────────────────────────────────────

/** A lab's wall: clean white panels over a steel kick. */
function labWall(ctx, p, r) {
  plate(ctx, 0, 0, T, KICKY, p, { tones: ["#c8ced2", "#b4babe", "#92989c"], bevel: 0, ink: 0, spec: false });
  for (const x of [0, T / 2]) plate(ctx, x + 6, 10, T / 2 - 12, KICKY - 20, p, { tones: ["#d8dee2", "#c4cace", "#9ca2a6"], bevel: 3, ink: 1.5, spec: false });
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, r() * KICKY, 2 + r() * 40, 1 + r() * 2);
  }
  plate(ctx, 0, KICKY, T, T - KICKY, p, { tones: ["#5a6068", "#40464e", "#22262c"], bevel: 3, ink: 2, spec: false });
}

/** The labs' corridor wall: the white panels, a handrail and a badge reader's lamp. */
function paintLabWall(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 0, 300, T, 14, p, STEEL);
  plate(ctx, 0, 40, T, 10, p, { tones: ["#2a7a8a", "#1e5e6a", "#123a42"], bevel: 1, ink: 1 });
  lightStrip(ctx, T / 2 - 60, 60, 120, 6, "#e8f8ff", { blur: 14, alpha: 0.8 });
}

/** Specimen shelving: jars of something that still glows, every one labelled. */
function paintLabShelves(ctx, p, r) {
  labWall(ctx, p, r);
  for (const x of [18, T / 2 - 8, T - 34]) plate(ctx, x, 40, 16, KICKY - 40, p, STEEL);
  const fluids = ["#3affc8", "#7ab8ff", "#b47aff", "#3affc8"];
  [150, 290, 430].forEach((sy, row) => {
    plate(ctx, 18, sy, T - 36, 12, p, STEEL);
    for (let k = 0; k < 6; k++) {
      const x = 44 + k * 76 + (k > 2 ? 10 : 0);
      const h = 70 + ((k + row) % 3) * 12;
      plate(ctx, x, sy - h, 48, h, p, { tones: ["#c8d8e0", "#98aab4", "#5a6a74"], bevel: 3, ink: 1.5 });
      const fc = fluids[(k + row) % fluids.length];
      ctx.fillStyle = fc;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x + 6, sy - h * 0.7, 36, h * 0.7 - 6);
      ctx.globalAlpha = 1;
      lit(x + 6, sy - h * 0.7, 36, h * 0.7 - 6, 8);
      plate(ctx, x - 2, sy - h - 10, 52, 12, p, { tones: ["#3a4048", "#2a2e34", "#16191d"], bevel: 1, ink: 1 });
      plate(ctx, x + 8, sy - h * 0.45, 32, 14, p, { tones: PAPER, bevel: 1, ink: 1, spec: false });
    }
  });
}

/** The fume hood: steel cabinet, its lit glass sash, the airflow gauge. */
function paintFumeHood(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 30, 30, T - 60, 420, p, { tones: ["#d8dee2", "#aab2b8", "#6a7278"], bevel: 4, ink: 2 });
  plate(ctx, 56, 90, T - 112, 200, p, { tones: ["#e8f4f8", "#c8dce4", "#90a8b4"], bevel: 3, ink: 2, recess: true, spec: false });
  lit(56, 90, T - 112, 200, 6);
  // Flasks inside the sash.
  for (const [x, h] of [[120, 80], [200, 110], [300, 60], [380, 96]]) {
    ctx.fillStyle = "rgba(40,60,70,0.5)";
    ctx.fillRect(x - 6, 280 - h, 12, h - 40);
    ctx.beginPath();
    ctx.moveTo(x - 6, 240);
    ctx.lineTo(x - 26, 286);
    ctx.lineTo(x + 26, 286);
    ctx.lineTo(x + 6, 240);
    ctx.fill();
  }
  plate(ctx, 56, 196, T - 112, 8, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 1, ink: 1 });
  plate(ctx, 30, 300, T - 60, 26, p, { tones: ["#3a4048", "#2a2e34", "#16191d"], bevel: 3, ink: 2 });
  say(ctx, "KEEP SASH BELOW LINE", T / 2, 313, 13, "#f0c83a", 900, 300);
  plate(ctx, S(80) - 40, 340, 80, 80, p, DARK);
  ctx.strokeStyle = "#3aff7a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(S(80), 386, 24, Math.PI, Math.PI * 1.7);
  ctx.stroke();
  lit(S(80) - 24, 362, 48, 26, 4);
  plate(ctx, 60, 340, 220, 90, p, { tones: ["#9aa2ac", "#6e767f", "#3e444c"], bevel: 3, ink: 2 });
  base(ctx, p);
}

/** The lab whiteboard: the eleven seconds worked out in somebody's hand. */
function paintLabBoard(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 28, 50, T - 56, 270, p, STEEL);
  plate(ctx, 38, 60, T - 76, 250, p, WHITE);
  say(ctx, "PROJECT PARADOX", T / 2, 84, 22, "#1a2a5a", 900, T - 120);
  const ink2 = ["#1a2a5a", "#2a6a3a", "#c22a1e"];
  const sums = ["Δt = 11.0 s", "ψ(t0) → ψ(t0 + Δt)", "ANCHOR ≥ 0.82", "RING 3 PHASE ±0.004"];
  sums.forEach((s, i) => say(ctx, s, S(150), 130 + i * 34, 15, ink2[i % 3], 700, 220));
  // A ring with its seam, sketched on the right as you look at it.
  ctx.strokeStyle = "#1a2a5a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(S(380), 200, 60, 0.3, Math.PI * 2 - 0.3);
  ctx.stroke();
  ctx.strokeStyle = "#c22a1e";
  ctx.beginPath();
  ctx.moveTo(S(380) + 50, 180);
  ctx.lineTo(S(380) + 70, 220);
  ctx.stroke();
  say(ctx, "WHY 06:47?", S(380), 290, 14, "#c22a1e", 900);
  plate(ctx, 38, 310, T - 76, 12, p, STEEL);
  base(ctx, p);
}

// ── Data centre and plant ───────────────────────────────────────

/** Two rack fronts, their status lamps winking. */
function paintServerRack(ctx, p, r) {
  plate(ctx, 0, 0, T, T, p, { tones: ["#20242a", "#181b20", "#0c0e11"], bevel: 0, ink: 0, spec: false });
  for (const x0 of [16, T / 2 + 8]) {
    plate(ctx, x0, 16, T / 2 - 24, 470, p, { tones: ["#2e333a", "#22262c", "#14171b"], bevel: 4, ink: 2 });
    for (let y = 40; y < 460; y += 26) {
      plate(ctx, x0 + 12, y, T / 2 - 48, 20, p, { tones: ["#3a4048", "#2c3138", "#1a1d22"], bevel: 2, ink: 1, spec: false });
      for (let k = 0; k < 4; k++) {
        if (r() < 0.75) led(ctx, x0 + 26 + k * 12, y + 10, 2.5, r() < 0.8 ? "#3aff7a" : AMBER);
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      for (let k = 0; k < 10; k++) ctx.fillRect(x0 + 90 + k * 10, y + 6, 4, 8);
    }
  }
  plate(ctx, T / 2 - 50, 0, 100, 18, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 1, ink: 1 });
  say(ctx, `RACK ${String(1 + ((r() * 40) | 0)).padStart(2, "0")}`, T / 2, 9, 12, "#141414", 900, 90);
}

/** The reactor's plant wall: pipe runs, valve wheels and three gauges. */
function paintGauges(ctx, p, r) {
  blockWall(ctx, r);
  for (const y of [60, 110]) plate(ctx, 0, y, T, 30, p, { tones: ["#8a6a3a", "#6a4e28", "#3a2a14"], bevel: 6, ink: 2 });
  for (const x of [S(70), S(440)]) plate(ctx, x - 16, 60, 32, 390, p, { tones: ["#7a8494", "#525c6a", "#2a3038"], bevel: 6, ink: 2 });
  for (let i = 0; i < 3; i++) {
    const cx = 150 + i * 106;
    plate(ctx, cx - 44, 170, 88, 88, p, STEEL);
    ctx.fillStyle = "#f2f0e6";
    ctx.beginPath();
    ctx.arc(cx, 214, 34, 0, Math.PI * 2);
    ctx.fill();
    relief((g) => {
      g.fillStyle = grey(10);
      g.beginPath();
      g.arc(cx, 214, 34, 0, Math.PI * 2);
      g.fill();
    });
    // The red arc, and a needle past it on the middle gauge.
    ctx.strokeStyle = "#c22a1e";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, 214, 26, Math.PI * 1.6, Math.PI * 1.95);
    ctx.stroke();
    const a = Math.PI * (i === 1 ? 1.9 : 1.2 + r() * 0.3);
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, 214);
    ctx.lineTo(cx + Math.cos(a) * 28, 214 + Math.sin(a) * 28);
    ctx.stroke();
  }
  // Valve wheels on the down pipes.
  for (const x of [S(70), S(440)]) {
    ctx.strokeStyle = "#c22a1e";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, 330, 30, 0, Math.PI * 2);
    ctx.stroke();
    plate(ctx, x - 6, 300, 12, 60, p, { tones: ["#c22a1e", "#a01e14", "#701410"], bevel: 2, ink: 1.5 });
    plate(ctx, x - 30, 324, 60, 12, p, { tones: ["#c22a1e", "#a01e14", "#701410"], bevel: 2, ink: 1.5 });
  }
  plate(ctx, T / 2 - 110, 290, 220, 34, p, DARK);
  glow(ctx, "COOLANT LOOP B", T / 2, 307, 15, AMBER, 900);
  base(ctx, p);
}

/** The trefoil and the rule, on yellow and black. */
function paintRadiation(ctx, p, r) {
  blockWall(ctx, r);
  plate(ctx, 50, 60, T - 100, 340, p, { tones: ["#f0c83a", "#e0b42a", "#b08a1a"], bevel: 4, ink: 3 });
  hazard(ctx, 62, 72, T - 124, 24, "#1a1a1a", "#f0c83a", 22);
  hazard(ctx, 62, 364, T - 124, 24, "#1a1a1a", "#f0c83a", 22);
  ctx.fillStyle = "#141414";
  const cx = T / 2;
  const cy = 180;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 64, a - 0.5, a + 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#f0c83a";
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#141414";
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  say(ctx, "REACTOR ACCESS", T / 2, 286, 30, "#141414", 900, T - 140);
  say(ctx, "DOSIMETER REQUIRED BEYOND THIS POINT", T / 2, 324, 13, "#141414", 900, T - 140);
  base(ctx, p);
}

export const PAINTERS = {
  [W.CELL_BARS]: paintCellBars,
  [W.CELL_DOOR]: paintCellDoor,
  [W.CELL_BACK]: paintCellBack,
  [W.ONE_WAY]: paintOneWay,
  [W.INTERVIEW]: paintInterview,
  [W.BOOKING]: paintBooking,
  [W.DISPATCH]: paintDispatch,
  [W.CASE_BOARD]: paintCaseBoard,
  [W.INTAKE]: paintIntake,
  [W.LAB_SHELVES]: paintLabShelves,
  [W.FUME_HOOD]: paintFumeHood,
  [W.LAB_BOARD]: paintLabBoard,
  [W.SERVER_RACK]: paintServerRack,
  [W.GAUGES]: paintGauges,
  [W.RADIATION]: paintRadiation,
  [W.SIGN_HOLDING]: paintSign("HOLDING", "left", "CELLS 1-8 · NO ADMITTANCE", true),
  [W.SIGN_INTERVIEW]: paintSign("INTERVIEW", "right", "ROOMS 1-3 · OBSERVATION"),
  [W.SIGN_EVIDENCE]: paintSign("EVIDENCE", "left", "PROPERTY · CHAIN OF CUSTODY", true),
  [W.SIGN_DISPATCH]: paintSign("DISPATCH", "right", "COMMS · WATCH COMMAND"),
  [W.SIGN_BRIEFING]: paintSign("BRIEFING", "left", "SQUAD ROOM · 0600 ROLL CALL"),
  [W.SIGN_RECORDS]: paintSign("RECORDS", "right", "CASE FILES · ARCHIVE"),
  [W.SIGN_RESEARCH]: paintSign("RESEARCH", "left", "LABS · BADGE ACCESS", true),
  [W.SIGN_DATA]: paintSign("DATA CENTRE", "right", "SERVER HALLS · COLD AISLE"),
  [W.SIGN_REACTOR]: paintSign("REACTOR", "left", "PLANT · DOSIMETER REQUIRED", true),
  [W.SIGN_DETENTION]: paintSign("DETENTION", "right", "CELL BLOCKS · WARDEN", true),
  [W.SIGN_BOOKING]: paintSign("BOOKING", "left", "INTAKE · PROCESSING"),
  [W.LAB_WALL]: paintLabWall,
};
