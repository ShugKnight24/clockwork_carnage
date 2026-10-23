/**
 * Wall painters for the station's arena (src/data/levels/rooms/arena.js places
 * them), painted like src/rendering/env/range-art.js. Keyed by wall id.
 *
 * R&D's holo sim hall: gunmetal panels with the projection grid glowing in
 * them, emitter lenses that throw the holograms, the observation deck's
 * window and the gallery glass, R&D's crates racked along the east wall, SIM
 * IN PROGRESS over the way in. The cover pillars are sim columns, the centre
 * one the exhibit projector. At the north end the extraction lift: its shaft
 * frame, the call panel, the doors and the floor indicator over them.
 *
 * Signage sits on raised plates (Realistic's bake repaints a flat face);
 * screens and lenses are emitters. Lettering is locker-art's mirrored
 * `letter`: the raycaster lays every face mirrored, so texel x = 0 is the
 * face's right-hand edge as you look at it.
 */

import { ARENA_WALLS as W } from "../../../data/levels/rooms/arena.js";
import { letter } from "../locker-art.js";
import { T, lin, rad, plate, rivet, ink, lightStrip, led, vents, sink, raise, hazard, emit } from "../paint.js";

const GUN = ["#3e454e", "#2a3037", "#14181c"];
const DARK = ["#1c2228", "#141a1f", "#0a0d10"];
const STEEL = ["#b4bcc6", "#868e98", "#4a5058"];
const LIFT = ["#727a84", "#555c66", "#2c3138"];
const CYAN = "#46f0ff";
const AMBER = "#ffb038";
const RED = "#ff3a2a";
const STENCIL = ["#e8e4d8", "#d0ccc0", "#9a968a"];

const TOP = 30; // soffit
const KICK = 452;

/** Mark a lit area as an emitter for the Realistic bake. */
function glow(x, y, w, h, a = 0.85, blur = 6) {
  emit((g) => {
    g.globalAlpha = a;
    g.fillRect(x, y, w, h);
  }, blur);
}

/** Soffit under the ceiling and the kick plate with its cyan floor line. */
function frameBands(ctx, p) {
  plate(ctx, 0, 0, T, TOP, p, { tones: GUN, bevel: 3, ink: 2, spec: false });
  for (let x = 24; x < T; x += 64) rivet(ctx, x, TOP / 2, 3, p);
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
  lightStrip(ctx, 0, KICK + 6, T, 4, CYAN, { blur: 14, alpha: 0.8, core: "rgba(230,255,255,0.8)" });
  vents(ctx, 150, KICK + 20, 212, 26, 3, p);
}

/**
 * A recessed holo-grid panel: the projection mesh glowing faintly in a dark
 * face, brighter where its lines cross.
 */
function holoGrid(ctx, p, r, x, y, w, h, step = 32) {
  plate(ctx, x, y, w, h, p, { tones: ["#0e1a22", "#0a141a", "#05090c"], bevel: 5, ink: 2, recess: true });
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 6, y + 6, w - 12, h - 12);
  ctx.clip();
  ctx.fillStyle = rad(ctx, x + w / 2, y + h / 2, 0, Math.max(w, h) * 0.7, [[0, "rgba(70,240,255,0.24)"], [1, "rgba(70,240,255,0.04)"]]);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(70,240,255,0.7)";
  for (let gx = x + 6; gx < x + w; gx += step) ctx.fillRect(gx, y, 1.5, h);
  for (let gy = y + 6; gy < y + h; gy += step) ctx.fillRect(x, gy, w, 1.5);
  ctx.fillStyle = "rgba(200,255,255,0.8)";
  for (let gx = x + 6; gx < x + w; gx += step) for (let gy = y + 6; gy < y + h; gy += step) ctx.fillRect(gx - 1, gy - 1, 3.5, 3.5);
  ctx.restore();
  emit((g) => {
    g.save();
    g.beginPath();
    g.rect(x + 6, y + 6, w - 12, h - 12);
    g.clip();
    g.globalAlpha = 0.85;
    for (let gx = x + 6; gx < x + w; gx += step) g.fillRect(gx, y, 1.5, h);
    for (let gy = y + 6; gy < y + h; gy += step) g.fillRect(x, gy, w, 1.5);
    g.restore();
  });
}

/** The sim hall's wall: soffit, a duct band, the grid panel, the kick. */
function simWall(ctx, p, r) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  // Duct band with a cable tray.
  plate(ctx, 0, TOP, T, 70, p, { tones: GUN, bevel: 4, ink: 2 });
  for (let i = 0; i < 3; i++) {
    ink(ctx, 0, TOP + 18 + i * 16, T, 3, 20);
    raise(0, TOP + 21 + i * 16, T, 4, 10);
  }
  // Panel frame: posts at the edges so neighbouring cells join.
  plate(ctx, 0, TOP + 70, T, KICK - TOP - 70, p, { tones: GUN, bevel: 2, ink: 0, spec: false });
  for (const x of [0, T - 14]) plate(ctx, x, TOP + 70, 14, KICK - TOP - 70, p, { tones: STEEL, bevel: 3, ink: 2 });
}

// ── Long walls ─────────────────────────────────────────────────────

function paintGrid(ctx, p, r) {
  simWall(ctx, p, r);
  holoGrid(ctx, p, r, 34, 120, T - 68, 310);
  plate(ctx, 44, 106, 120, 22, p, { tones: STENCIL, bevel: 2, ink: 1 });
  letter(ctx, "SIM HALL · B", 104, 117, 11, "#1a1c20");
  for (const [x, y] of [[44, 410], [T - 44, 410], [44, 140], [T - 44, 140]]) rivet(ctx, x, y, 5, p);
  led(ctx, T - 60, 117, 4, CYAN);
  led(ctx, T - 76, 117, 4, "#3aff6a");
}

/** An emitter: the lens that throws the holograms, in its ringed housing. */
function emitterLens(ctx, p, cx, cy, rr, label) {
  plate(ctx, cx - rr - 26, cy - rr - 26, (rr + 26) * 2, (rr + 26) * 2, p, { tones: GUN, bevel: 6, ink: 3 });
  hazard(ctx, cx - rr - 18, cy - rr - 18, (rr + 18) * 2, 10, "#e8c23a");
  hazard(ctx, cx - rr - 18, cy + rr + 8, (rr + 18) * 2, 10, "#e8c23a");
  ctx.fillStyle = "#0a0d10";
  ctx.beginPath();
  ctx.arc(cx, cy, rr + 10, 0, Math.PI * 2);
  ctx.fill();
  sink(cx - rr - 10, cy - rr - 10, (rr + 10) * 2, (rr + 10) * 2, 20);
  ctx.fillStyle = rad(ctx, cx, cy, 0, rr, [[0, "#f0ffff"], [0.25, "#8af8ff"], [0.6, "#1aa8c8"], [1, "#04303c"]]);
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(4,20,28,0.8)";
  ctx.lineWidth = 2;
  for (const k of [0.45, 0.75]) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - rr, cy); ctx.lineTo(cx + rr, cy);
  ctx.moveTo(cx, cy - rr); ctx.lineTo(cx, cy + rr);
  ctx.stroke();
  emit((g) => {
    g.beginPath();
    g.arc(cx, cy, rr, 0, Math.PI * 2);
    g.fill();
  }, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rivet(ctx, cx + Math.cos(a) * (rr + 18), cy + Math.sin(a) * (rr + 18), 3.5, p);
  }
  if (label) {
    plate(ctx, cx - 64, cy + rr + 34, 128, 24, p, { tones: STENCIL, bevel: 2, ink: 1 });
    letter(ctx, label, cx, cy + rr + 46, 12, "#1a1c20");
  }
}

function paintEmitter(ctx, p, r) {
  simWall(ctx, p, r);
  holoGrid(ctx, p, r, 34, 120, T - 68, 310, 48);
  emitterLens(ctx, p, T / 2, 250, 58, "EMITTER 07");
  lightStrip(ctx, 60, 112, 70, 8, CYAN, { blur: 12 });
  lightStrip(ctx, T - 130, 112, 70, 8, CYAN, { blur: 12 });
}

/** R&D's racked crates: stencilled, barcoded, one marked TEMPORAL. */
function paintCrates(ctx, p, r) {
  simWall(ctx, p, r);
  plate(ctx, 24, 110, T - 48, KICK - 110, p, { tones: ["#14181c", "#101316", "#08090b"], bevel: 3, ink: 2, recess: true });
  const post = { tones: ["#d8a830", "#b08420", "#6a4e10"], bevel: 3, ink: 2 };
  for (const x of [24, T - 42]) plate(ctx, x, 104, 18, KICK - 104, p, post);
  for (const y of [270, 436]) plate(ctx, 24, y, T - 48, 14, p, post);
  const crate = (x, y, w, h, tones, text, sub, hz) => {
    plate(ctx, x, y, w, h, p, { tones, bevel: 4, ink: 2 });
    // Battens.
    for (const bx of [x + 6, x + w - 18]) plate(ctx, bx, y + 4, 12, h - 8, p, { tones, bevel: 2, ink: 1 });
    plate(ctx, x + 26, y + h / 2 - 22, w - 52, 44, p, { tones: STENCIL, bevel: 2, ink: 1 });
    letter(ctx, text, x + w / 2, y + h / 2 - 8, 12, "#1a1c20");
    letter(ctx, sub, x + w / 2, y + h / 2 + 10, 9, "#5a1a10", 800);
    if (hz) hazard(ctx, x + 26, y + 10, w - 52, 10, "#e8c23a");
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = "#1a1c20";
      ctx.fillRect(x + w / 2 - 30 + i * 5, y + h - 22, i % 3 ? 2 : 3, 12);
    }
  };
  crate(50, 140, 196, 130, ["#6a7048", "#525838", "#2c3020"], "CHRONOS R&D", "PROTOTYPE · NO OPEN", false);
  crate(264, 170, 196, 100, ["#5a6470", "#444c56", "#22272c"], "HOLO EMITTER", "SPARES · LOT 07", false);
  crate(50, 300, 150, 136, ["#5a6470", "#444c56", "#22272c"], "SIM CORE", "HANDLE WITH CARE", false);
  crate(212, 320, 250, 116, ["#7a3a24", "#5a2a1a", "#2a140c"], "TEMPORAL", "FRAGILE · KEEP UPRIGHT", true);
}

/** SIM IN PROGRESS: the red lightbox, lit, over a grid panel. */
function paintSimSign(ctx, p, r) {
  simWall(ctx, p, r);
  holoGrid(ctx, p, r, 34, 230, T - 68, 200);
  plate(ctx, 40, 110, T - 80, 106, p, { tones: ["#2a0c0a", "#1a0706", "#0a0303"], bevel: 5, ink: 3 });
  lightStrip(ctx, 58, 124, T - 116, 52, RED, { blur: 26, core: "rgba(255,200,190,0.35)" });
  letter(ctx, "SIM IN PROGRESS", T / 2, 151, 30, "#2a0604");
  plate(ctx, 90, 184, T - 180, 24, p, { tones: STENCIL, bevel: 2, ink: 1 });
  letter(ctx, "HOLOGRAMS LIVE · STAY ON THE FLOOR", T / 2, 196, 11, "#5a0a0a", 800);
}

/** Dark glass, what is behind it (`behind` paints it), the frame and sill. */
function glassWindow(ctx, p, r, y, h, behind) {
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#0c141a"], [1, "#16222a"]]);
  ctx.fillRect(0, y, T, h);
  sink(0, y, T, h, 26);
  behind(y, h);
  ctx.fillStyle = "rgba(190,230,255,0.08)";
  for (const [a, b] of [[40, 120], [280, 320]]) {
    ctx.beginPath();
    ctx.moveTo(a, y);
    ctx.lineTo(b, y);
    ctx.lineTo(b - 90, y + h);
    ctx.lineTo(a - 90, y + h);
    ctx.closePath();
    ctx.fill();
  }
  const fr = { tones: STEEL, bevel: 3, ink: 2 };
  plate(ctx, 0, y - 12, T, 14, p, fr);
  plate(ctx, 0, y + h - 2, T, 18, p, fr);
  plate(ctx, 0, y - 12, 12, h + 28, p, fr);
  plate(ctx, T - 12, y - 12, 12, h + 28, p, fr);
}

/** A console with lit screens, a chair back, someone watching. */
function controlRoom(ctx, r, y, h, figure) {
  const base = y + h;
  ctx.fillStyle = "#06090c";
  ctx.fillRect(20, base - 60, T - 40, 60);
  for (let i = 0; i < 4; i++) {
    const sx = 50 + i * 110;
    const c = i === 2 ? "#ff8a4a" : "#46d8ff";
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(sx, base - 110, 80, 44);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let k = 0; k < 4; k++) ctx.fillRect(sx + 6, base - 102 + k * 9, 30 + r() * 40, 3);
    emit((g) => {
      g.globalAlpha = 0.7;
      g.fillRect(sx, base - 110, 80, 44);
    }, 6);
  }
  if (figure) {
    ctx.fillStyle = "#020304";
    ctx.beginPath();
    ctx.arc(figure, base - 96, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(figure - 34, base);
    ctx.quadraticCurveTo(figure - 32, base - 78, figure, base - 78);
    ctx.quadraticCurveTo(figure + 32, base - 78, figure + 34, base);
    ctx.fill();
  }
}

/** The observation deck's window (it is just beyond the west wall). */
function paintObsWindow(ctx, p, r) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  glassWindow(ctx, p, r, 60, 240, (y, h) => controlRoom(ctx, r, y, h, r() < 0.5 ? 160 + r() * 200 : 0));
  plate(ctx, 0, 316, T, KICK - 316, p, { tones: GUN, bevel: 4, ink: 2 });
  vents(ctx, 60, 340, T - 120, 70, 6, p);
  plate(ctx, T / 2 - 80, 418, 160, 22, p, { tones: STENCIL, bevel: 2, ink: 1 });
  letter(ctx, "OBSERVATION DECK", T / 2, 429, 11, "#1a1c20");
}

/** The gallery over the south wall: glass onto the control room, a grid below. */
function paintGallery(ctx, p, r) {
  simWall(ctx, p, r);
  glassWindow(ctx, p, r, 44, 130, (y, h) => controlRoom(ctx, r, y, h, 0));
  holoGrid(ctx, p, r, 34, 200, T - 68, 230);
  plate(ctx, T / 2 - 70, 186, 140, 22, p, { tones: STENCIL, bevel: 2, ink: 1 });
  letter(ctx, "R&D GALLERY", T / 2, 197, 11, "#1a1c20");
}

// ── Pillars ────────────────────────────────────────────────────────

/** A sim column: steel corner guards, a hazard skirt, its number. */
function column(ctx, p, r, n, kind) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  plate(ctx, 0, TOP, T, KICK - TOP, p, { tones: GUN, bevel: 3, ink: 2 });
  // Corner guards.
  for (const x of [0, T - 40]) {
    plate(ctx, x, TOP, 40, KICK - TOP, p, { tones: STEEL, bevel: 4, ink: 2 });
    for (let y = TOP + 30; y < KICK; y += 70) rivet(ctx, x + 20, y, 4, p);
  }
  hazard(ctx, 40, 372, T - 80, 56, "#e8c23a");
  if (kind === 0) {
    // A vertical holo strip and the node that feeds it.
    lightStrip(ctx, T / 2 - 8, 120, 16, 236, CYAN, { blur: 22 });
    emitterLens(ctx, p, T / 2, 82, 22, null);
  } else if (kind === 1) {
    holoGrid(ctx, p, r, 60, 60, T - 120, 296, 28);
  } else {
    // Status console.
    plate(ctx, 70, 70, T - 140, 160, p, { tones: DARK, bevel: 5, ink: 3 });
    ctx.fillStyle = "#04141a";
    ctx.fillRect(88, 88, T - 176, 100);
    letter(ctx, "COVER NODE", T / 2, 110, 16, CYAN, 800);
    letter(ctx, "INTEGRITY 100%", T / 2, 140, 14, "#9affc8", 700);
    ctx.fillStyle = "#1a8aa0";
    ctx.fillRect(100, 160, T - 200, 12);
    glow(88, 88, T - 176, 100, 0.85, 6);
    for (let i = 0; i < 4; i++) led(ctx, 110 + i * 26, 210, 4, i < 3 ? "#3aff6a" : AMBER);
    lightStrip(ctx, T / 2 - 6, 250, 12, 100, CYAN, { blur: 16 });
  }
  plate(ctx, T / 2 - 46, 296, 92, 56, p, { tones: STENCIL, bevel: 3, ink: 2 });
  letter(ctx, `C${n}`, T / 2, 325, 34, "#1a1c20");
}

/** The exhibit projector: lens array in the top, a status screen, the hazard skirt. */
function paintProjector(ctx, p, r) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  plate(ctx, 0, TOP, T, KICK - TOP, p, { tones: ["#4a525c", "#343a42", "#1a1e22"], bevel: 4, ink: 2 });
  plate(ctx, 30, 44, T - 60, 34, p, { tones: STENCIL, bevel: 3, ink: 2 });
  letter(ctx, "EXHIBIT PROJECTOR", T / 2, 61, 17, "#1a1c20");
  for (const [x, rr] of [[130, 30], [256, 40], [382, 30]]) emitterLens(ctx, p, x, 150, rr, null);
  plate(ctx, 80, 230, T - 160, 110, p, { tones: DARK, bevel: 5, ink: 3 });
  ctx.fillStyle = "#04141a";
  ctx.fillRect(96, 246, T - 192, 78);
  letter(ctx, "R&D EXHIBIT LIBRARY", T / 2, 262, 13, CYAN, 800);
  letter(ctx, "3 SUBJECTS · HOLO LIVE", T / 2, 286, 12, "#9affc8", 700);
  letter(ctx, "UNLISTED: 0", T / 2, 308, 11, AMBER, 700);
  glow(96, 246, T - 192, 78, 0.85, 6);
  hazard(ctx, 0, 372, T, 60, "#e8c23a");
  for (let i = 0; i < 6; i++) led(ctx, 120 + i * 54, 356, 4, i === 5 ? RED : "#3aff6a");
}

// ── The extraction lift ────────────────────────────────────────────

/** The shaft's steel frame: a heavy riveted column in hazard paint. */
function shaftFrame(ctx, p, r, sign) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  plate(ctx, 0, TOP, T, KICK - TOP, p, { tones: GUN, bevel: 3, ink: 2 });
  // I-beam: flanges and the web between, chevrons up the face.
  plate(ctx, 60, TOP, T - 120, KICK - TOP, p, { tones: ["#4a525c", "#343a42", "#1a1e22"], bevel: 6, ink: 3 });
  hazard(ctx, 80, 200, T - 160, 240, "#e8c23a", "#14161a", 40);
  for (let y = TOP + 20; y < KICK; y += 34) {
    rivet(ctx, 76, y, 4, p);
    rivet(ctx, T - 76, y, 4, p);
  }
  plate(ctx, 50, 50, T - 100, 128, p, { tones: DARK, bevel: 5, ink: 3 });
  if (sign === "lift") {
    lightStrip(ctx, 70, 66, T - 140, 44, "#1fd06a", { blur: 18, core: "rgba(220,255,230,0.35)" });
    letter(ctx, "LIFT B", T / 2, 89, 26, "#04200c");
    letter(ctx, "ENGINE LEVEL · B2", T / 2, 144, 15, "#e8e4d8");
  } else {
    // The floors it serves.
    const floors = [["L1", "STATION", "#e8e4d8"], ["B1", "STORES", "#e8e4d8"], ["B2", "ENGINE", RED]];
    floors.forEach(([f, n, c], i) => {
      letter(ctx, f, 130, 76 + i * 34, 18, c);
      letter(ctx, n, 300, 76 + i * 34, 16, c, 800);
    });
  }
}

/** The call panel: up and down, lit amber; the evac key switch. */
function paintCallPanel(ctx, p, r) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  plate(ctx, 0, TOP, T, KICK - TOP, p, { tones: LIFT, bevel: 4, ink: 2 });
  for (let y = TOP + 4; y < KICK; y += 6) {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, y, T, 1);
  }
  const cx = T / 2;
  plate(ctx, cx - 80, 150, 160, 230, p, { tones: ["#2a2e34", "#1c1f24", "#0c0e10"], bevel: 6, ink: 3 });
  ctx.fillStyle = "#1a0e04";
  ctx.fillRect(cx - 60, 166, 120, 40);
  letter(ctx, "L1  ▼ B2", cx, 186, 18, AMBER);
  glow(cx - 60, 166, 120, 40, 0.9, 6);
  for (const [y, glyph, on] of [[240, "▲", false], [300, "▼", true]]) {
    ctx.fillStyle = "#0a0b0d";
    ctx.beginPath();
    ctx.arc(cx, y, 24, 0, Math.PI * 2);
    ctx.fill();
    sink(cx - 24, y - 24, 48, 48, 16);
    ctx.fillStyle = on ? "#ffd27a" : "#6a6e74";
    ctx.beginPath();
    ctx.arc(cx, y, 18, 0, Math.PI * 2);
    ctx.fill();
    if (on) {
      emit((g) => {
        g.beginPath();
        g.arc(cx, y, 18, 0, Math.PI * 2);
        g.fill();
      }, 10);
      ctx.save();
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 20;
      ctx.fillStyle = "rgba(255,176,56,0.5)";
      ctx.beginPath();
      ctx.arc(cx, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    letter(ctx, glyph, cx, y + 1, 18, "#1a1a1a");
  }
  // Key switch.
  ctx.fillStyle = "#c8a040";
  ctx.beginPath();
  ctx.arc(cx, 352, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(cx - 1.5, 345, 3, 14);
  plate(ctx, cx - 90, 100, 180, 30, p, { tones: ["#c22a1e", "#a8201a", "#6a1010"], bevel: 3, ink: 2 });
  letter(ctx, "EVAC KEY ONLY", cx, 115, 14, "#ffffff");
}

/**
 * One leaf of the lift doors: brushed steel, a narrow vision slot, hazard
 * tape down the meeting edge, the floor indicator in the header. `seam` is
 * the texel x of the edge it meets the other leaf at (0 or T).
 */
function liftDoor(ctx, p, r, seam, head) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  // Header: the steel lintel and its indicator.
  plate(ctx, 0, TOP, T, 92, p, { tones: GUN, bevel: 4, ink: 2 });
  plate(ctx, T / 2 - 100, TOP + 16, 200, 58, p, { tones: DARK, bevel: 4, ink: 3 });
  ctx.fillStyle = "#1a0e04";
  ctx.fillRect(T / 2 - 86, TOP + 26, 172, 38);
  letter(ctx, head, T / 2, TOP + 46, 26, AMBER);
  glow(T / 2 - 86, TOP + 26, 172, 38, 0.9, 6);
  // The frame round the opening: jamb on the outer edge.
  const outer = seam === 0 ? T - 36 : 0;
  plate(ctx, outer, TOP + 92, 36, KICK - TOP - 92, p, { tones: STEEL, bevel: 4, ink: 2 });
  // The leaf.
  const lx = seam === 0 ? 0 : 36;
  const lw = T - 36;
  const ly = TOP + 100;
  plate(ctx, lx, ly, lw, KICK - ly, p, { tones: LIFT, bevel: 5, ink: 2 });
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    ctx.fillRect(lx + 6 + r() * (lw - 12), ly + 4, 1, KICK - ly - 8);
  }
  // Meeting edge: rubber seal and hazard tape.
  const ex = seam === 0 ? 0 : T - 10;
  ink(ctx, ex, ly, 10, KICK - ly, 30);
  hazard(ctx, seam === 0 ? 12 : T - 40, ly + 10, 28, KICK - ly - 20, "#e8c23a");
  // Vision slot, the shaft dark behind it.
  const vx = seam === 0 ? 70 : T - 130;
  plate(ctx, vx - 6, ly + 60, 72, 150, p, { tones: STEEL, bevel: 3, ink: 2 });
  ctx.fillStyle = "#06080a";
  ctx.fillRect(vx, ly + 66, 60, 138);
  sink(vx, ly + 66, 60, 138, 24);
  ctx.fillStyle = "rgba(255,176,56,0.25)";
  ctx.fillRect(vx, ly + 180, 60, 24);
  // STAND CLEAR on a plate, low on the leaf.
  const tx = seam === 0 ? T * 0.42 : T * 0.58;
  plate(ctx, tx - 90, 340, 180, 36, p, { tones: ["#e8c23a", "#c8a020", "#7a6010"], bevel: 3, ink: 2 });
  letter(ctx, "STAND CLEAR", tx, 358, 18, "#1a1a1a");
}

/** The jamb past the doors: capacity plate, the emergency phone. */
function paintLiftJamb(ctx, p, r) {
  ctx.fillStyle = GUN[1];
  ctx.fillRect(0, 0, T, T);
  frameBands(ctx, p);
  plate(ctx, 0, TOP, T, KICK - TOP, p, { tones: LIFT, bevel: 4, ink: 2 });
  for (let y = TOP + 4; y < KICK; y += 6) {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, y, T, 1);
  }
  plate(ctx, T / 2 - 110, 90, 220, 70, p, { tones: STENCIL, bevel: 3, ink: 2 });
  letter(ctx, "CAPACITY 12 PERSONS", T / 2, 112, 14, "#1a1c20");
  letter(ctx, "1800 KG · INSP. 06/47", T / 2, 138, 12, "#3a3c40", 800);
  // Emergency phone box.
  plate(ctx, T / 2 - 70, 200, 140, 170, p, { tones: ["#c22a1e", "#a8201a", "#5a0c08"], bevel: 6, ink: 3 });
  letter(ctx, "EMERGENCY", T / 2, 222, 15, "#ffffff");
  plate(ctx, T / 2 - 50, 240, 100, 110, p, { tones: ["#2a2c30", "#1a1c20", "#0a0b0d"], bevel: 4, ink: 2 });
  ctx.fillStyle = "#111";
  ctx.fillRect(T / 2 - 14, 252, 28, 86);
  for (let i = 0; i < 9; i++) ctx.fillRect(T / 2 + 24, 256 + i * 9, 10, 5);
  led(ctx, T / 2 - 34, 256, 4, "#3aff6a");
}

export const PAINTERS = {
  [W.GRID]: paintGrid,
  [W.EMITTER]: paintEmitter,
  [W.CRATES]: paintCrates,
  [W.SIM_SIGN]: paintSimSign,
  [W.OBS_WINDOW]: paintObsWindow,
  [W.GALLERY]: paintGallery,
  [W.COLUMN_A]: (ctx, p, r) => column(ctx, p, r, 1, 0),
  [W.COLUMN_B]: (ctx, p, r) => column(ctx, p, r, 2, 1),
  [W.COLUMN_C]: (ctx, p, r) => column(ctx, p, r, 3, 2),
  [W.PROJECTOR]: paintProjector,
  [W.SHAFT_L]: (ctx, p, r) => shaftFrame(ctx, p, r, "lift"),
  [W.CALL_PANEL]: paintCallPanel,
  [W.LIFT_DOOR_L]: (ctx, p, r) => liftDoor(ctx, p, r, 0, "L1"),
  [W.LIFT_DOOR_R]: (ctx, p, r) => liftDoor(ctx, p, r, T, "▼ B2"),
  [W.LIFT_JAMB]: paintLiftJamb,
  [W.SHAFT_R]: (ctx, p, r) => shaftFrame(ctx, p, r, "floors"),
};
