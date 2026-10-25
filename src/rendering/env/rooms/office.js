/**
 * Wall painters for the station's office (src/data/levels/rooms/office.js places
 * them), painted like src/rendering/env/range-art.js. Keyed by wall id.
 *
 * A police station's supervisor's office, not a cell block: painted plaster
 * over a walnut wainscot, his commendations in their frames, the window
 * blinds, the binders, the notice board, the station map with its pins, the
 * coat rack and the clock (stopped at 6:47) by the door. The inner office is
 * glass on a wood dado with his name by the door; inside, the desk wall behind
 * him and the monitor wall he watches. The Captain's quarters are the same
 * wood, sparser: a portrait, a charter, a window.
 *
 * Everything that has to read in Realistic sits on a raised plate(): the bake
 * repaints a flat face with grime. Lettering goes through locker-art's
 * mirrored `letter`; drawings that must not read mirrored (the map, the clock)
 * are drawn through `flip`.
 */

import { OFFICE_WALLS as W } from "../../../data/levels/rooms/office.js";
import { letter } from "../locker-art.js";
import { T, lin, rad, plate, rivet, ink, lightStrip, led, relief, grey, sink, raise, emit, material } from "../paint.js";

const PLASTER = ["#b3ab92", "#a0997f", "#878169"];
const WOOD = ["#80522e", "#623d21", "#3f2614"];
const WOOD_DARK = ["#5e3a20", "#46291a", "#2a170c"];
const FRAME = ["#3a2618", "#2a1a10", "#140c06"];
const GILT = ["#e8c870", "#bf9a44", "#7c5e24"];
const PAPER = ["#f4efe0", "#e8e1cc", "#d2c9ae"];
const STEEL = ["#9aa2ac", "#6e767f", "#3a4048"];
const SCREEN = "#06100c";

const RAIL = 288; // the chair rail, ≈ 1.3 m up
const SKIRT = 470;

/** Draw `fn` mirrored about x = cx, so it reads the right way round on a face. */
function flip(ctx, cx, fn) {
  ctx.save();
  ctx.translate(cx * 2, 0);
  ctx.scale(-1, 1);
  fn();
  ctx.restore();
}

/** Mark a screen or lamp area as emitting (Realistic leaves it unlit, saturated). */
function glow(x, y, w, h, a = 0.85, blur = 6) {
  emit((g) => {
    g.globalAlpha = a;
    g.fillRect(x, y, w, h);
  }, blur);
}

/** Walnut wainscot from the chair rail to the floor: rail, two raised panels, skirting. */
function wainscot(ctx, p, r, tones = WOOD, top = RAIL) {
  plate(ctx, 0, top + 14, T, SKIRT - top - 14, p, { tones: [tones[1], tones[1], tones[2]], bevel: 2, ink: 0, spec: false });
  for (const x of [20, T / 2 + 12]) {
    plate(ctx, x, top + 34, T / 2 - 32, SKIRT - top - 58, p, { tones, bevel: 6, ink: 2 });
    // Grain down the panel.
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(30,14,4,${0.08 + r() * 0.1})`;
      ctx.fillRect(x + 10 + r() * (T / 2 - 52), top + 42, 1 + r() * 2, SKIRT - top - 74);
    }
  }
  plate(ctx, 0, top, T, 16, p, { tones: [tones[0], tones[1], tones[2]], bevel: 3, ink: 2 });
  ctx.fillStyle = "rgba(255,240,210,0.18)";
  ctx.fillRect(0, top + 2, T, 2);
  plate(ctx, 0, SKIRT, T, T - SKIRT, p, { tones: ["#2e1c10", "#21140a", "#100904"], bevel: 3, ink: 2, spec: false });
}

/** Painted plaster down to the rail, a crown moulding under the ceiling. */
function plaster(ctx, p, r, bottom = RAIL) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, bottom, [[0, PLASTER[2]], [0.4, PLASTER[1]], [1, PLASTER[0]]]);
  ctx.fillRect(0, 0, T, bottom);
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(60,50,30,${0.03 + r() * 0.04})`;
    ctx.fillRect(r() * T, 30 + r() * (bottom - 40), 2 + r() * 50, 1 + r() * 2);
  }
  plate(ctx, 0, 0, T, 24, p, { tones: ["#d8d0b8", "#bcb49c", "#8a846e"], bevel: 3, ink: 2, spec: false });
  ink(ctx, 0, 24, T, 2, 14);
}

/** The squad room's wall: plaster over wainscot. */
function officeWall(ctx, p, r) {
  plaster(ctx, p, r);
  wainscot(ctx, p, r);
}

/** A picture frame with a mat; `inner` paints what is in it. */
function frame(ctx, p, x, y, w, h, inner, o = {}) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 4, y + 6, w, h);
  plate(ctx, x, y, w, h, p, { tones: o.tones || FRAME, bevel: 4, ink: 2 });
  const m = o.mat ?? 8;
  plate(ctx, x + m, y + m, w - m * 2, h - m * 2, p, { tones: o.matTones || PAPER, bevel: 2, ink: 1 });
  inner(x + m, y + m, w - m * 2, h - m * 2);
  // Glass glare across the corner.
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(x + m, y + m);
  ctx.lineTo(x + m + w * 0.35, y + m);
  ctx.lineTo(x + m, y + m + h * 0.45);
  ctx.closePath();
  ctx.fill();
}

/** A gold foil seal with its ribbon tails. */
function seal(ctx, x, y, rr) {
  ctx.fillStyle = "#a8262a";
  ctx.beginPath();
  ctx.moveTo(x - rr * 0.6, y);
  ctx.lineTo(x - rr * 0.9, y + rr * 2);
  ctx.lineTo(x - rr * 0.3, y + rr * 1.5);
  ctx.lineTo(x, y);
  ctx.moveTo(x + rr * 0.6, y);
  ctx.lineTo(x + rr * 0.9, y + rr * 2);
  ctx.lineTo(x + rr * 0.3, y + rr * 1.5);
  ctx.lineTo(x, y);
  ctx.fill();
  ctx.fillStyle = rad(ctx, x - rr * 0.3, y - rr * 0.3, 0, rr, [[0, "#fff2b0"], [0.5, "#d8b048"], [1, "#8a6420"]]);
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const k = i % 2 ? rr : rr * 0.86;
    ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  ctx.closePath();
  ctx.fill();
  raise(x - rr * 0.7, y - rr * 0.7, rr * 1.4, rr * 1.4, 10);
}

/** A framed certificate: heading, a name, ruled lines, the seal. */
function certificate(ctx, p, x, y, w, h, head, name) {
  frame(ctx, p, x, y, w, h, (ix, iy, iw, ih) => {
    ctx.strokeStyle = "#b89a5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(ix + 6, iy + 6, iw - 12, ih - 12);
    letter(ctx, "CHRONOS PD", ix + iw / 2, iy + 20, 10, "#6a5a3a", 700);
    letter(ctx, head, ix + iw / 2, iy + 40, head.length > 12 ? 12 : 15, "#2a2016");
    letter(ctx, name, ix + iw / 2, iy + 62, 11, "#1a2a5a", 700);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(60,50,30,0.35)";
      ctx.fillRect(ix + 16, iy + 78 + i * 8, iw - 32, 2);
    }
    seal(ctx, ix + iw - 22, iy + ih - 24, 11);
  });
}

// ── The squad room's walls ─────────────────────────────────────────

/** Two commendations and a small photo between them. */
function paintCommendations(ctx, p, r) {
  officeWall(ctx, p, r);
  certificate(ctx, p, 40, 84, 196, 150, "COMMENDATION", "SUPERVISOR SIMON");
  certificate(ctx, p, 276, 84, 196, 150, "MERIT FOR VALOUR", "LT. RASCZAK");
  // A brass plaque under them.
  plate(ctx, T / 2 - 90, 250, 180, 26, p, { tones: GILT, bevel: 3, ink: 2 });
  letter(ctx, "TEMPORAL CRIMES DIVISION", T / 2, 263, 11, "#3a2a0a");
}

/** A window onto the city at night, the venetian blind two-thirds down. */
function paintBlind(ctx, p, r, wood = WOOD) {
  plaster(ctx, p, r);
  wainscot(ctx, p, r, wood);
  const x = 52, y = 46, w = T - 104, h = 220;
  plate(ctx, x - 14, y - 14, w + 28, h + 28, p, { tones: ["#e8e4da", "#cfcabc", "#9a9586"], bevel: 4, ink: 2 });
  // The city: a night sky, towers, lit windows.
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#0a1426"], [0.7, "#1a2a4a"], [1, "#3a3048"]]);
  ctx.fillRect(x, y, w, h);
  sink(x, y, w, h, 24);
  for (let i = 0; i < 9; i++) {
    const bx = x + i * (w / 9) + r() * 10;
    const bh = 60 + r() * 120;
    ctx.fillStyle = "#070b14";
    ctx.fillRect(bx, y + h - bh, w / 9 - 4, bh);
    for (let k = 0; k < 10; k++) {
      if (r() < 0.45) continue;
      ctx.fillStyle = r() < 0.7 ? "#ffd88a" : "#9ad0ff";
      ctx.fillRect(bx + 4 + r() * (w / 9 - 14), y + h - bh + 6 + r() * (bh - 12), 4, 5);
    }
  }
  glow(x, y, w, h, 0.45, 4);
  // The blind: slats down to two-thirds, tilted open a crack.
  const down = y + h * 0.66;
  for (let sy = y; sy < down; sy += 12) {
    ctx.fillStyle = lin(ctx, 0, sy, 0, sy + 9, [[0, "#f0ece0"], [1, "#b8b2a0"]]);
    ctx.fillRect(x, sy, w, 9);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x, sy + 9, w, 1);
    raise(x, sy, w, 9, 10);
  }
  // Clear the emission under the slats: they are lit by the room, not the city.
  if (material()) {
    const e = material().e;
    e.save();
    e.globalCompositeOperation = "destination-out";
    for (let sy = y; sy < down; sy += 12) e.fillRect(x, sy, w, 9);
    e.restore();
  }
  plate(ctx, x, down, w, 12, p, { tones: ["#d8d2c0", "#bab4a2", "#8a8474"], bevel: 2, ink: 1 });
  // Cord and wand.
  ctx.fillStyle = "#d8d2c0";
  ctx.fillRect(x + w - 30, y, 3, h * 0.8);
  ctx.fillRect(x + 30, y, 5, h * 0.55);
  // Sill.
  plate(ctx, x - 24, y + h + 10, w + 48, 16, p, { tones: ["#efebe0", "#d4cfc0", "#9a9586"], bevel: 3, ink: 2 });
}

/** A shelf of case binders, labelled, one fallen over. */
function paintBinders(ctx, p, r) {
  officeWall(ctx, p, r);
  const shelf = { tones: WOOD, bevel: 3, ink: 2 };
  const COLORS = ["#1f3a6a", "#7a1e1e", "#1e5a3a", "#2a2a2e", "#8a6a1a", "#1f3a6a"];
  for (const [sy, top] of [[150, 46], [272, 168]]) {
    let x = 30;
    while (x < T - 60) {
      const bw = 26 + Math.floor(r() * 12);
      const bh = sy - top - 6 - Math.floor(r() * 18);
      const c = COLORS[Math.floor(r() * COLORS.length)];
      plate(ctx, x, sy - bh, bw, bh, p, { tones: [c, c, "#0c0c10"], bevel: 2, ink: 1 });
      plate(ctx, x + 4, sy - bh + 16, bw - 8, 30, p, { tones: PAPER, bevel: 1, ink: 0 });
      letter(ctx, String(600 + Math.floor(r() * 99)), x + bw / 2, sy - bh + 31, 9, "#1a1a1a", 800);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(x + bw / 2, sy - 22, 5, 0, Math.PI * 2);
      ctx.fill();
      x += bw + 2;
      if (r() < 0.12) x += 30;
    }
    plate(ctx, 20, sy, T - 40, 14, p, shelf);
  }
  // The one labelled for the case nobody will close.
  plate(ctx, T - 150, 104, 110, 40, p, { tones: ["#7a1e1e", "#5a1414", "#2a0808"], bevel: 2, ink: 1 });
  plate(ctx, T - 140, 112, 90, 24, p, { tones: PAPER, bevel: 1, ink: 0 });
  letter(ctx, "CASE 0647", T - 95, 124, 11, "#5a0a0a");
  // Brackets.
  for (const x of [40, T - 50]) for (const y of [164, 286]) plate(ctx, x, y, 10, 22, p, { tones: STEEL, bevel: 2, ink: 1 });
}

/** The cork notice board: rosters, a wanted poster, a missing-time notice. */
function paintNotices(ctx, p, r) {
  officeWall(ctx, p, r);
  plate(ctx, 44, 48, T - 88, 228, p, { tones: WOOD_DARK, bevel: 4, ink: 2 });
  plate(ctx, 56, 60, T - 112, 204, p, { tones: ["#b88a58", "#a07646", "#7a5630"], bevel: 2, ink: 1 });
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(60,30,10,0.25)" : "rgba(255,220,170,0.12)";
    ctx.fillRect(56 + r() * (T - 112), 60 + r() * 204, 2, 2);
  }
  const pin = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(x - 2, y - 3, 2, 2);
    raise(x - 4, y - 4, 8, 8, 14);
  };
  const note = (x, y, w, h, head, c, lines = 4, tones = PAPER) => {
    plate(ctx, x, y, w, h, p, { tones, bevel: 2, ink: 1 });
    if (c) {
      ctx.fillStyle = c;
      ctx.fillRect(x + 4, y + 4, w - 8, 20);
    }
    letter(ctx, head, x + w / 2, y + 15, head.length > 10 ? 9 : 12, c ? "#fff" : "#1a1a1a");
    for (let i = 0; i < lines; i++) {
      ctx.fillStyle = "rgba(30,30,40,0.45)";
      ctx.fillRect(x + 8, y + 34 + i * 11, (w - 16) * (0.5 + r() * 0.5), 2);
    }
    pin(x + w / 2, y + 2, ["#c22a1e", "#2a6ac2", "#e8c23a"][Math.floor(r() * 3)]);
  };
  note(72, 76, 120, 150, "WANTED", "#8a1a1a", 2);
  // The wanted man: a mugshot box with a silhouette.
  ctx.fillStyle = "#4a4a4e";
  ctx.fillRect(92, 104, 80, 74);
  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath();
  ctx.arc(132, 130, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(108, 148, 48, 30);
  letter(ctx, "DR. E. VOSS", 132, 196, 11, "#1a1a1a");
  note(206, 72, 130, 104, "SHIFT ROSTER", "#1f3a6a", 5);
  note(346, 80, 96, 90, "06:47 ?", null, 3, ["#f6e68c", "#efdc7a", "#c8b45a"]);
  note(214, 188, 108, 70, "BLOOD DRIVE", "#a8262a", 2);
  note(334, 182, 110, 78, "LOST TIME?", null, 3);
  letter(ctx, "REPORT IT", 389, 248, 9, "#5a0a0a", 800);
}

/**
 * The station map: the floor plan in blue on white, pins where things
 * happened, a red YOU ARE HERE on the Supervisor's office. Drawn through
 * `flip` so it reads the right way round; the labels mirror themselves.
 */
function paintStationMap(ctx, p, r) {
  officeWall(ctx, p, r);
  const x0 = 36, y0 = 40, w = T - 72, h = 238;
  plate(ctx, x0, y0, w, h, p, { tones: FRAME, bevel: 4, ink: 2 });
  plate(ctx, x0 + 8, y0 + 8, w - 16, h - 16, p, { tones: ["#f2f4f6", "#e4e8ec", "#c8ced6"], bevel: 2, ink: 1 });
  // Title band.
  ctx.fillStyle = "#1f3a6a";
  ctx.fillRect(x0 + 12, y0 + 12, w - 24, 22);
  letter(ctx, "CHRONOS STATION · LEVEL 1", T / 2, y0 + 23, 12, "#ffffff");
  // The plan: cells (col, row) to texels, mirrored so the plan reads true.
  const mx0 = x0 + 22, mw = w - 44, my0 = y0 + 42, mh = h - 62;
  const sx = mw / 60, sy = mh / 56;
  const X = (c) => mx0 + mw - c * sx; // mirrored
  const Y = (row) => my0 + (row - 2) * sy;
  const rooms = [
    [8, 2, 51, 11, "SIM HALL"], [27, 12, 32, 48, ""], [3, 15, 24, 26, "GYM"], [35, 15, 56, 26, "T.C.D."],
    [3, 37, 24, 47, "LOCKERS"], [35, 37, 56, 47, "RANGE"], [22, 49, 37, 57, "LOBBY"],
    [18, 29, 26, 35, "BREAK"], [33, 29, 41, 35, "ARMORY"], [3, 3, 7, 6, ""], [52, 3, 57, 14, ""],
  ];
  for (const [c0, r0, c1, r1, name] of rooms) {
    const ax = X(c1 + 1), ay = Y(r0), aw = (c1 - c0 + 1) * sx, ah = (r1 - r0 + 1) * sy;
    ctx.fillStyle = "rgba(42,106,194,0.16)";
    ctx.fillRect(ax, ay, aw, ah);
    ctx.strokeStyle = "#2a5aa2";
    ctx.lineWidth = 2;
    ctx.strokeRect(ax, ay, aw, ah);
    if (name) letter(ctx, name, ax + aw / 2, ay + ah / 2, name.length > 6 ? 9 : 10, "#1a3a7a", 800);
  }
  // Pins: red for incidents, yellow for the 6:47 sightings, a string between.
  const pins = [[14, 41, "#e8c23a"], [45, 42, "#e8c23a"], [30, 7, "#e8c23a"], [10, 20, "#e8c23a"], [30, 30, "#c22a1e"], [50, 40, "#c22a1e"]];
  ctx.strokeStyle = "rgba(194,42,30,0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  pins.slice(0, 4).forEach(([c, rr], i) => (i ? ctx.lineTo(X(c), Y(rr)) : ctx.moveTo(X(c), Y(rr))));
  ctx.stroke();
  for (const [c, rr, col] of pins) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(X(c) + 2, Y(rr) + 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(X(c), Y(rr), 5, 0, Math.PI * 2);
    ctx.fill();
    raise(X(c) - 4, Y(rr) - 4, 8, 8, 14);
  }
  // YOU ARE HERE on the office.
  const hx = X(46), hy = Y(20);
  ctx.fillStyle = "#c22a1e";
  ctx.beginPath();
  ctx.arc(hx, hy, 7, 0, Math.PI * 2);
  ctx.fill();
  plate(ctx, hx - 44, hy + 10, 88, 16, p, { tones: ["#c22a1e", "#a8201a", "#6a1010"], bevel: 2, ink: 1 });
  letter(ctx, "YOU ARE HERE", hx, hy + 18, 9, "#ffffff");
  // A sticky note: the floor nobody may visit.
  ctx.save();
  ctx.translate(x0 + 70, y0 + h - 52);
  ctx.rotate(-0.07);
  plate(ctx, -40, -22, 80, 44, p, { tones: ["#f6e68c", "#efdc7a", "#c8b45a"], bevel: 1, ink: 1 });
  letter(ctx, "ENGINE B2", 0, -6, 10, "#5a0a0a");
  letter(ctx, "NO ACCESS", 0, 10, 9, "#5a0a0a", 700);
  ctx.restore();
}

/** Coat rack by the door: a trench coat, a patrol jacket, a cap, an umbrella. */
function paintCoatRack(ctx, p, r) {
  officeWall(ctx, p, r);
  plate(ctx, 60, 120, T - 120, 22, p, { tones: WOOD, bevel: 3, ink: 2 });
  const pegs = [110, 200, 310, 400];
  for (const x of pegs) rivet(ctx, x, 150, 7, { ...p, s3: "#c8a040", s4: "#fff0b0", s0: "#3a2a0a" });
  // Trench coat on the first peg.
  const coat = (x, c1, c2, len) => {
    ctx.fillStyle = lin(ctx, x - 50, 0, x + 50, 0, [[0, c2], [0.5, c1], [1, c2]]);
    ctx.beginPath();
    ctx.moveTo(x - 8, 154);
    ctx.quadraticCurveTo(x - 46, 170, x - 52, 210);
    ctx.lineTo(x - 58, 154 + len);
    ctx.lineTo(x + 58, 154 + len);
    ctx.lineTo(x + 52, 210);
    ctx.quadraticCurveTo(x + 46, 170, x + 8, 154);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x - 2, 170, 4, len - 20);
    raise(x - 50, 170, 100, len - 20, 12);
  };
  coat(110, "#a08458", "#6e5a38", 230);
  ctx.fillStyle = "#3a2a18";
  ctx.fillRect(56, 260, 108, 10); // belt
  coat(310, "#24345a", "#141e36", 200);
  // CHRONOS PD on the patrol jacket's back, reflective tape.
  plate(ctx, 268, 230, 84, 22, p, { tones: ["#e8e8d8", "#c8c8b8", "#8a8a7a"], bevel: 1, ink: 0 });
  letter(ctx, "CHRONOS PD", 310, 241, 11, "#141e36");
  // Cap on the second peg; umbrella hung off the fourth.
  ctx.fillStyle = "#1a2440";
  ctx.beginPath();
  ctx.ellipse(200, 150, 40, 14, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(160, 148, 80, 8);
  plate(ctx, 190, 128, 20, 14, p, { tones: GILT, bevel: 1, ink: 1 });
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(392, 160, 10, Math.PI, 0);
  ctx.lineTo(402, 400);
  ctx.stroke();
  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath();
  ctx.moveTo(402, 180);
  ctx.lineTo(380, 380);
  ctx.lineTo(424, 380);
  ctx.closePath();
  ctx.fill();
}

/** The wall clock, stopped at 6:47, over the division's crest. */
function paintClock(ctx, p, r) {
  officeWall(ctx, p, r);
  const cx = T / 2, cy = 112, cr = 64;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.arc(cx + 4, cy + 6, cr + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1c20";
  ctx.beginPath();
  ctx.arc(cx, cy, cr + 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4f2ea";
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fill();
  relief((g) => {
    g.fillStyle = grey(26);
    g.beginPath();
    g.arc(cx, cy, cr + 6, 0, Math.PI * 2);
    g.fill();
  });
  flip(ctx, cx, () => {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const k = i % 5 ? 4 : 10;
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = i % 5 ? 1.5 : 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.sin(a) * (cr - 4), cy - Math.cos(a) * (cr - 4));
      ctx.lineTo(cx + Math.sin(a) * (cr - 4 - k), cy - Math.cos(a) * (cr - 4 - k));
      ctx.stroke();
    }
    const hand = (a, len, wdt, c) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = wdt;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - Math.sin(a) * 8, cy + Math.cos(a) * 8);
      ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
      ctx.stroke();
    };
    hand(((6 + 47 / 60) / 12) * Math.PI * 2, cr * 0.5, 6, "#1a1a1a");
    hand((47 / 60) * Math.PI * 2, cr * 0.78, 4, "#1a1a1a");
    hand((12 / 60) * Math.PI * 2, cr * 0.82, 1.5, "#c22a1e");
  });
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  // The crest: a shield on a walnut plaque.
  plate(ctx, cx - 92, 196, 184, 84, p, { tones: WOOD, bevel: 4, ink: 2 });
  plate(ctx, cx - 80, 204, 160, 30, p, { tones: GILT, bevel: 2, ink: 1 });
  letter(ctx, "CHRONOS PD", cx, 220, 17, "#2a1a04");
  letter(ctx, "TEMPORAL CRIMES", cx, 248, 12, "#f4e2b0");
  letter(ctx, "DIVISION", cx, 266, 11, "#f4e2b0", 700);
}

// ── The inner office: glass on a wood dado ─────────────────────────

/**
 * Glass partition: an aluminium frame, the glass dark with the room behind
 * it, the blind half down, a wood dado below. Seen from both sides.
 */
function glassBase(ctx, p, r) {
  wainscot(ctx, p, r);
  const gy = 30, gh = RAIL - gy;
  ctx.fillStyle = lin(ctx, 0, gy, 0, RAIL, [[0, "#2a363c"], [1, "#1a2428"]]);
  ctx.fillRect(0, gy, T, gh);
  // The lamp on the other side, warm through the glass.
  ctx.fillStyle = rad(ctx, T * 0.5, RAIL - 40, 0, 260, [[0, "rgba(255,190,110,0.30)"], [1, "rgba(255,190,110,0)"]]);
  ctx.fillRect(0, gy, T, gh);
  // Reflections.
  ctx.fillStyle = "rgba(200,230,255,0.10)";
  for (const [a, b] of [[60, 150], [300, 340]]) {
    ctx.beginPath();
    ctx.moveTo(a, gy);
    ctx.lineTo(b, gy);
    ctx.lineTo(b - 120, RAIL);
    ctx.lineTo(a - 120, RAIL);
    ctx.closePath();
    ctx.fill();
  }
  sink(0, gy, T, gh, 14);
  glow(0, gy, T, gh, 0.3, 0);
  // Blind down to half: slats.
  const down = gy + gh * 0.42;
  if (material()) {
    const e = material().e;
    e.save();
    e.globalCompositeOperation = "destination-out";
    e.fillRect(0, gy, T, down - gy + 8);
    e.restore();
  }
  for (let sy = gy; sy < down; sy += 11) {
    ctx.fillStyle = lin(ctx, 0, sy, 0, sy + 8, [[0, "#e4dfd0"], [1, "#a8a292"]]);
    ctx.fillRect(0, sy, T, 8);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, sy + 8, T, 1);
    raise(0, sy, T, 8, 10);
  }
  plate(ctx, 0, down, T, 9, p, { tones: ["#d8d2c0", "#bab4a2", "#8a8474"], bevel: 2, ink: 1 });
  // Frame: head track, mullions at the edges (half each, so cells join), sill.
  const al = { tones: STEEL, bevel: 3, ink: 2 };
  plate(ctx, 0, 0, T, gy, p, al);
  plate(ctx, 0, 0, 12, RAIL, p, al);
  plate(ctx, T - 12, 0, 12, RAIL, p, al);
  plate(ctx, 0, RAIL - 10, T, 12, p, al);
}

function paintGlass(ctx, p, r) {
  glassBase(ctx, p, r);
}

/** Gold leaf on a frosted band: OFFICE OF THE SUPERVISOR. */
function paintGlassLettered(ctx, p, r) {
  glassBase(ctx, p, r);
  plate(ctx, 30, 170, T - 60, 74, p, { tones: ["#3e484c", "#30383c", "#1c2226"], bevel: 2, ink: 1 });
  letter(ctx, "OFFICE OF THE", T / 2, 190, 14, "#d8b860", 800);
  letter(ctx, "SUPERVISOR", T / 2, 220, 30, "#5a4010");
  letter(ctx, "SUPERVISOR", T / 2, 218, 30, "#f0c858");
}

/** His name by the door, on a walnut plaque with a brass plate. */
function paintNameplate(ctx, p, r) {
  glassBase(ctx, p, r);
  plate(ctx, 60, 168, T - 120, 96, p, { tones: WOOD, bevel: 5, ink: 2 });
  plate(ctx, 76, 180, T - 152, 46, p, { tones: GILT, bevel: 3, ink: 2 });
  letter(ctx, "SUPERVISOR SIMON", T / 2, 204, 24, "#2a1a04");
  letter(ctx, "TEMPORAL CRIMES DIVISION", T / 2, 244, 13, "#f4e2b0");
  for (const x of [72, T - 72]) rivet(ctx, x, 216, 4, { ...p, s3: "#c8a040", s4: "#fff0b0", s0: "#3a2a0a" });
}

// ── Inside: the monitor wall, the desk wall, the bookcase ──────────

/** One screen: a dark bezel, `inner` paints the picture, which glows. */
function screen(ctx, p, x, y, w, h, inner) {
  plate(ctx, x - 8, y - 8, w + 16, h + 16, p, { tones: ["#2a2c30", "#1a1c20", "#0a0b0d"], bevel: 3, ink: 2 });
  ctx.fillStyle = SCREEN;
  ctx.fillRect(x, y, w, h);
  inner(x, y, w, h);
  // Scanlines.
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let sy = y; sy < y + h; sy += 3) ctx.fillRect(x, sy, w, 1);
  glow(x, y, w, h, 0.9, 8);
  led(ctx, x + w - 6, y + h + 4, 2, "#3aff6a");
}

/** A CCTV feed: a corridor in perspective, a figure, the camera tag and the time. */
function cctv(ctx, r, x, y, w, h, tag) {
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#22302a"], [1, "#3a4a40"]]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(170,220,190,0.45)";
  ctx.lineWidth = 1.5;
  const vx = x + w * 0.5, vy = y + h * 0.45;
  for (const [ax, ay] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(vx + (ax - vx) * 0.2, vy + (ay - vy) * 0.2);
    ctx.stroke();
  }
  ctx.strokeRect(vx - w * 0.1, vy - h * 0.1, w * 0.2, h * 0.2);
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(200,255,220,${r() * 0.12})`;
    ctx.fillRect(x + r() * w, y + r() * h, 2, 1);
  }
  ctx.fillStyle = "rgba(10,20,14,0.9)";
  ctx.beginPath();
  ctx.arc(vx + w * 0.16, vy + h * 0.08, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(vx + w * 0.16 - 8, vy + h * 0.08 + 6, 16, 30);
  letter(ctx, tag, x + 52, y + 12, 10, "#c8ffd8", 700);
  letter(ctx, "06:47:00", x + w - 40, y + h - 10, 10, "#c8ffd8", 700);
  ctx.fillStyle = "#ff3a2a";
  ctx.beginPath();
  ctx.arc(x + w - 12, y + 12, 4, 0, Math.PI * 2);
  ctx.fill();
}

/** The console ledge under the monitors: a keyboard, a phone, a mug. */
function consoleLedge(ctx, p, r) {
  plate(ctx, 0, 384, T, 22, p, { tones: WOOD, bevel: 3, ink: 2 });
  plate(ctx, 0, 406, T, SKIRT - 406, p, { tones: WOOD_DARK, bevel: 3, ink: 2 });
  plate(ctx, 0, SKIRT, T, T - SKIRT, p, { tones: ["#2e1c10", "#21140a", "#100904"], bevel: 3, ink: 2, spec: false });
  plate(ctx, 150, 372, 200, 14, p, { tones: ["#3a3c40", "#2a2c30", "#141518"], bevel: 2, ink: 1 });
  for (let i = 0; i < 14; i++) ctx.fillRect(158 + i * 13, 376, 9, 4);
}

function wallBehindScreens(ctx, p) {
  plate(ctx, 0, 0, T, 384, p, { tones: ["#34383e", "#272a2f", "#15171a"], bevel: 2, ink: 0, spec: false });
}

/** Monitor wall: four camera feeds. */
function paintMonitors(ctx, p, r) {
  wallBehindScreens(ctx, p);
  const feeds = ["CAM 03 LOCKERS", "CAM 07 RANGE", "CAM 11 SIM HALL", "CAM 14 ENGINE B2"];
  [[30, 40], [270, 40], [30, 206], [270, 206]].forEach(([x, y], i) => {
    screen(ctx, p, x, y, 212, 150, (sx, sy, sw, sh) => {
      if (i === 3) {
        // The Engine level's feed: signal lost.
        ctx.fillStyle = "#1a0a0a";
        ctx.fillRect(sx, sy, sw, sh);
        for (let k = 0; k < 400; k++) {
          const v = 40 + r() * 160;
          ctx.fillStyle = `rgb(${v},${v * 0.6},${v * 0.6})`;
          ctx.fillRect(sx + r() * sw, sy + r() * sh, 2, 2);
        }
        letter(ctx, "NO SIGNAL", sx + sw / 2, sy + sh / 2, 18, "#ff5a4a");
        letter(ctx, feeds[i], sx + 56, sy + 12, 10, "#ffb0a0", 700);
        return;
      }
      cctv(ctx, r, sx, sy, sw, sh, feeds[i]);
    });
  });
  consoleLedge(ctx, p, r);
}

/** Monitor wall: the case board, ARIA's trace, the Engine's output. */
function paintMonitorsCase(ctx, p, r) {
  wallBehindScreens(ctx, p);
  screen(ctx, p, 30, 40, 452, 150, (x, y, w, h) => {
    ctx.fillStyle = "#081420";
    ctx.fillRect(x, y, w, h);
    letter(ctx, "CASE 0647 · UNEXPLAINED KIT IN SEALED ROOMS", x + w / 2, y + 16, 13, "#9ad0ff", 800);
    const rows = ["LOCKER 412  ·  06:47", "ARMORY      ·  06:47", "EVIDENCE    ·  06:47", "SIM HALL    ·  06:47"];
    rows.forEach((t, i) => letter(ctx, t, x + 130, y + 46 + i * 24, 13, i === 3 ? "#ff8a6a" : "#d8ecff", 700));
    // A bar graph of sightings by minute: one tall bar.
    for (let i = 0; i < 12; i++) {
      const bh = i === 8 ? 96 : 6 + r() * 14;
      ctx.fillStyle = i === 8 ? "#ff5a3a" : "#3a7ac2";
      ctx.fillRect(x + 270 + i * 14, y + h - 14 - bh, 10, bh);
    }
  });
  screen(ctx, p, 30, 214, 212, 140, (x, y, w, h) => {
    ctx.strokeStyle = "#3affd8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= w; i += 3) ctx.lineTo(x + i, y + h / 2 + Math.sin(i * 0.12) * Math.sin(i * 0.023) * 40);
    ctx.stroke();
    letter(ctx, "A.R.I.A. LINK", x + w / 2, y + 14, 11, "#3affd8");
  });
  screen(ctx, p, 270, 214, 212, 140, (x, y, w, h) => {
    letter(ctx, "ENGINE OUTPUT", x + w / 2, y + 16, 12, "#ffb0a0");
    ctx.fillStyle = "#3a0a0a";
    ctx.fillRect(x + 16, y + 60, w - 32, 30);
    ctx.fillStyle = "#ff3a2a";
    ctx.fillRect(x + 16, y + 60, w - 32, 30);
    letter(ctx, "140 %", x + w / 2, y + 112, 24, "#ff5a4a");
  });
  consoleLedge(ctx, p, r);
}

/** Wood panelling, full height: the executive side of the office. */
function panelled(ctx, p, r, tones = WOOD) {
  plate(ctx, 0, 0, T, T, p, { tones: [tones[1], tones[1], tones[2]], bevel: 0, ink: 0, spec: false });
  plate(ctx, 0, 0, T, 24, p, { tones: ["#d8d0b8", "#bcb49c", "#8a846e"], bevel: 3, ink: 2, spec: false });
  for (const x of [20, T / 2 + 12]) plate(ctx, x, 40, T / 2 - 32, RAIL - 60, p, { tones, bevel: 6, ink: 2 });
  wainscot(ctx, p, r, tones);
}

/** Behind his desk: the Chronos PD crest, a credenza with photos on it. */
function paintDeskWall(ctx, p, r) {
  panelled(ctx, p, r);
  // The crest: a badge star on a navy roundel.
  const cx = T / 2, cy = 140;
  plate(ctx, cx - 96, cy - 96, 192, 192, p, { tones: FRAME, bevel: 5, ink: 2 });
  ctx.fillStyle = rad(ctx, cx - 20, cy - 20, 0, 90, [[0, "#2a4a8a"], [1, "#0f1e40"]]);
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.fill();
  relief((g) => {
    g.fillStyle = grey(20);
    g.beginPath();
    g.arc(cx, cy, 80, 0, Math.PI * 2);
    g.fill();
  });
  ctx.fillStyle = rad(ctx, cx - 10, cy - 14, 0, 60, [[0, "#fff2b0"], [0.5, "#d8b048"], [1, "#8a6420"]]);
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 ? 26 : 58;
    ctx.lineTo(cx + Math.cos(a) * k, cy + Math.sin(a) * k);
  }
  ctx.closePath();
  ctx.fill();
  raise(cx - 30, cy - 30, 60, 60, 14);
  // The hourglass at the star's heart.
  ctx.fillStyle = "#0f1e40";
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 16); ctx.lineTo(cx + 12, cy - 16); ctx.lineTo(cx, cy);
  ctx.lineTo(cx + 12, cy + 16); ctx.lineTo(cx - 12, cy + 16); ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();
  letter(ctx, "CHRONOS PD", cx, cy + 66, 13, "#f4e2b0");
  // Credenza: the frames on it stand against the wall.
  plate(ctx, 24, 330, T - 48, 20, p, { tones: WOOD_DARK, bevel: 3, ink: 2 });
  frame(ctx, p, 60, 262, 80, 64, (x, y, w, h) => {
    ctx.fillStyle = "#6a8aa8";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#2a2a2e";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 6 + i * 15, y + 22, 10, 26);
  }, { mat: 5 });
  frame(ctx, p, 360, 270, 90, 56, (x, y, w, h) => {
    ctx.fillStyle = "#c8a878";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + w / 2 - 14, y + 26, 28, 20);
  }, { mat: 5, tones: GILT });
}

/** The flag in its stand, and the unit photo: UNIT 4, Lt. Rasczak's squad. */
function paintDeskFlag(ctx, p, r) {
  panelled(ctx, p, r);
  // Pole and flag.
  plate(ctx, 96, 40, 10, 430, p, { tones: GILT, bevel: 2, ink: 1 });
  ctx.fillStyle = "#e0c060";
  ctx.beginPath();
  ctx.arc(101, 38, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 106, 0, 186, 0, [[0, "#1f3a7a"], [0.4, "#2a4a92"], [0.7, "#16285a"], [1, "#22407e"]]);
  ctx.beginPath();
  ctx.moveTo(106, 56);
  ctx.quadraticCurveTo(150, 70, 176, 60);
  ctx.lineTo(186, 300);
  ctx.quadraticCurveTo(150, 290, 106, 310);
  ctx.closePath();
  ctx.fill();
  raise(106, 56, 80, 250, 8);
  ctx.fillStyle = "#e8c870";
  ctx.beginPath();
  ctx.moveTo(134, 150); ctx.lineTo(160, 150); ctx.lineTo(147, 170);
  ctx.lineTo(160, 190); ctx.lineTo(134, 190); ctx.lineTo(147, 170);
  ctx.closePath();
  ctx.fill();
  plate(ctx, 74, 452, 54, 18, p, { tones: GILT, bevel: 2, ink: 1 });
  // Unit photo.
  frame(ctx, p, 224, 80, 250, 180, (x, y, w, h) => {
    ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#8aa0b8"], [1, "#5a6a7a"]]);
    ctx.fillRect(x, y, w, h - 30);
    for (let i = 0; i < 7; i++) {
      const fx = x + 20 + i * ((w - 40) / 6);
      const fy = y + 50 + (i % 2) * 14;
      ctx.fillStyle = "#c8a080";
      ctx.beginPath();
      ctx.arc(fx, fy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1f2e52";
      ctx.fillRect(fx - 13, fy + 9, 26, h - 30 - (fy - y) - 9);
    }
    letter(ctx, "UNIT 4 · LT. RASCZAK", x + w / 2, y + h - 15, 12, "#2a2016");
  });
  plate(ctx, 290, 274, 118, 20, p, { tones: GILT, bevel: 2, ink: 1 });
  letter(ctx, "CLASS OF 11235", 349, 284, 10, "#2a1a04");
}

/** Floor-to-ceiling bookcase: law books, binders, a trophy, a pocket watch. */
function paintBookcase(ctx, p, r) {
  plate(ctx, 0, 0, T, T, p, { tones: WOOD_DARK, bevel: 0, ink: 0, spec: false });
  const sideW = 22;
  plate(ctx, 0, 0, sideW, T, p, { tones: WOOD, bevel: 3, ink: 2 });
  plate(ctx, T - sideW, 0, sideW, T, p, { tones: WOOD, bevel: 3, ink: 2 });
  const shelves = [104, 210, 316, 422];
  const SPINES = ["#5a1a1a", "#1a3a2a", "#2a2a4a", "#6a4a1a", "#3a1a2a", "#1a2a3a", "#7a6a4a"];
  let prev = 24;
  shelves.forEach((sy, si) => {
    let x = sideW + 6;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(sideW, prev, T - sideW * 2, sy - prev);
    sink(sideW, prev, T - sideW * 2, sy - prev, 20);
    while (x < T - sideW - 30) {
      if (si === 1 && x > 300 && x < 400) {
        // A trophy cup and the old brass pocket watch.
        ctx.fillStyle = "#d8b048";
        ctx.beginPath();
        ctx.moveTo(x + 6, sy - 76); ctx.lineTo(x + 46, sy - 76); ctx.lineTo(x + 34, sy - 40); ctx.lineTo(x + 18, sy - 40);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x + 22, sy - 40, 8, 22);
        plate(ctx, x + 10, sy - 18, 32, 18, p, { tones: WOOD_DARK, bevel: 2, ink: 1 });
        raise(x + 6, sy - 76, 40, 58, 14);
        ctx.fillStyle = "#c8a040";
        ctx.beginPath();
        ctx.arc(x + 76, sy - 22, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4f0e0";
        ctx.beginPath();
        ctx.arc(x + 76, sy - 22, 13, 0, Math.PI * 2);
        ctx.fill();
        raise(x + 58, sy - 40, 36, 36, 12);
        x += 100;
        continue;
      }
      const bw = 12 + Math.floor(r() * 14);
      const bh = sy - prev - 14 - Math.floor(r() * 26);
      const c = SPINES[Math.floor(r() * SPINES.length)];
      plate(ctx, x, sy - bh, bw, bh, p, { tones: [c, c, "#0a0806"], bevel: 1, ink: 1 });
      ctx.fillStyle = "#d8b048";
      ctx.fillRect(x + 2, sy - bh + 10, bw - 4, 2);
      ctx.fillRect(x + 2, sy - 18, bw - 4, 2);
      x += bw + 1;
      if (r() < 0.07) x += 18;
    }
    plate(ctx, sideW, sy, T - sideW * 2, 14, p, { tones: WOOD, bevel: 3, ink: 2 });
    prev = sy + 14;
  });
  plate(ctx, 0, 0, T, 24, p, { tones: WOOD, bevel: 3, ink: 2 });
  plate(ctx, 0, 436, T, T - 436, p, { tones: WOOD, bevel: 3, ink: 2 });
  for (const x of [130, T - 130]) {
    plate(ctx, x - 50, 452, 100, 40, p, { tones: WOOD_DARK, bevel: 3, ink: 2 });
    rivet(ctx, x, 472, 4, { ...p, s3: "#c8a040", s4: "#fff0b0", s0: "#3a2a0a" });
  }
}

// ── The Captain's quarters ─────────────────────────────────────────

/** CAPTAIN'S QUARTERS, beside the way through to door8. */
function paintCaptainSign(ctx, p, r) {
  officeWall(ctx, p, r);
  plate(ctx, 96, 150, T - 192, 110, p, { tones: WOOD_DARK, bevel: 5, ink: 2 });
  plate(ctx, 110, 162, T - 220, 44, p, { tones: GILT, bevel: 3, ink: 2 });
  letter(ctx, "CAPTAIN", T / 2, 185, 26, "#2a1a04");
  letter(ctx, "QUARTERS · PRIVATE", T / 2, 224, 13, "#f4e2b0");
  letter(ctx, "KNOCK", T / 2, 244, 11, "#d8c08a", 700);
}

/** Dark panelling with a brass sconce: the Captain's plain wall. */
function paintCaptainPanel(ctx, p, r) {
  panelled(ctx, p, r, WOOD_DARK);
  plate(ctx, T / 2 - 16, 120, 32, 40, p, { tones: GILT, bevel: 3, ink: 2 });
  lightStrip(ctx, T / 2 - 22, 92, 44, 26, "#ffc878", { blur: 28, core: "rgba(255,248,220,0.95)" });
}

/** The founding Captain's portrait, in oils, in a gilt frame. */
function paintCaptainPortrait(ctx, p, r) {
  panelled(ctx, p, r, WOOD_DARK);
  frame(ctx, p, 116, 46, 280, 300, (x, y, w, h) => {
    ctx.fillStyle = rad(ctx, x + w * 0.4, y + h * 0.3, 10, h, [[0, "#5a4a32"], [1, "#1e160c"]]);
    ctx.fillRect(x, y, w, h);
    const cx = x + w / 2;
    // Shoulders in a navy dress uniform, gold on the epaulettes.
    ctx.fillStyle = "#18223e";
    ctx.beginPath();
    ctx.moveTo(cx - 100, y + h);
    ctx.quadraticCurveTo(cx - 96, y + 170, cx, y + 160);
    ctx.quadraticCurveTo(cx + 96, y + 170, cx + 100, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c8a040";
    ctx.fillRect(cx - 84, y + 172, 36, 8);
    ctx.fillRect(cx + 48, y + 172, 36, 8);
    ctx.fillRect(cx - 4, y + 180, 8, 60);
    // Face, the cap.
    ctx.fillStyle = "#b88a6a";
    ctx.beginPath();
    ctx.ellipse(cx, y + 118, 34, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(60,30,20,0.4)";
    ctx.fillRect(cx - 18, y + 108, 12, 4);
    ctx.fillRect(cx + 6, y + 108, 12, 4);
    ctx.fillStyle = "#101828";
    ctx.beginPath();
    ctx.ellipse(cx, y + 80, 46, 16, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 46, y + 78, 92, 10);
    ctx.fillStyle = "#c8a040";
    ctx.fillRect(cx - 8, y + 66, 16, 10);
    ctx.fillStyle = "#e8e2d0";
    ctx.fillRect(cx - 10, y + 162, 20, 14);
  }, { tones: GILT, mat: 12, matTones: ["#2a1e10", "#20160a", "#100a04"] });
  plate(ctx, T / 2 - 90, 362, 180, 28, p, { tones: GILT, bevel: 3, ink: 2 });
  letter(ctx, "FOUNDING CAPTAIN", T / 2, 376, 13, "#2a1a04");
}

/** The Bureau's charter, framed, over a shelf of trophies. */
function paintCaptainTrophies(ctx, p, r) {
  panelled(ctx, p, r, WOOD_DARK);
  certificate(ctx, p, 110, 50, 292, 190, "CHARTER OF THE BUREAU", "TEMPORAL CRIMES DIVISION");
  plate(ctx, 40, 316, T - 80, 14, p, { tones: WOOD, bevel: 3, ink: 2 });
  for (const [x, hgt] of [[90, 60], [170, 44], [340, 70], [420, 50]]) {
    ctx.fillStyle = "#d8b048";
    ctx.beginPath();
    ctx.moveTo(x - 18, 316 - hgt);
    ctx.lineTo(x + 18, 316 - hgt);
    ctx.lineTo(x + 8, 316 - 20);
    ctx.lineTo(x - 8, 316 - 20);
    ctx.closePath();
    ctx.fill();
    plate(ctx, x - 14, 296, 28, 20, p, { tones: WOOD_DARK, bevel: 2, ink: 1 });
    raise(x - 18, 316 - hgt, 36, hgt - 20, 12);
  }
  plate(ctx, 236, 276, 40, 40, p, { tones: ["#9aa2ac", "#6e767f", "#3a4048"], bevel: 3, ink: 2 });
  letter(ctx, "25", 256, 296, 14, "#1a1a1a");
}

export const PAINTERS = {
  [W.COMMENDATIONS]: paintCommendations,
  [W.BLIND]: (ctx, p, r) => paintBlind(ctx, p, r),
  [W.BINDERS]: paintBinders,
  [W.NOTICES]: paintNotices,
  [W.STATION_MAP]: paintStationMap,
  [W.COAT_RACK]: paintCoatRack,
  [W.CLOCK]: paintClock,
  [W.GLASS]: paintGlass,
  [W.NAMEPLATE]: paintNameplate,
  [W.GLASS_LETTERED]: paintGlassLettered,
  [W.MONITORS]: paintMonitors,
  [W.MONITORS_CASE]: paintMonitorsCase,
  [W.DESK_WALL]: paintDeskWall,
  [W.DESK_FLAG]: paintDeskFlag,
  [W.BOOKCASE]: paintBookcase,
  [W.CAPTAIN_SIGN]: paintCaptainSign,
  [W.CAPTAIN_PANEL]: paintCaptainPanel,
  [W.CAPTAIN_PORTRAIT]: paintCaptainPortrait,
  [W.CAPTAIN_TROPHIES]: paintCaptainTrophies,
  [W.CAPTAIN_BLIND]: (ctx, p, r) => paintBlind(ctx, p, r, WOOD_DARK),
};
