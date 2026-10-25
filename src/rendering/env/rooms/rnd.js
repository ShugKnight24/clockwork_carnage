/**
 * Wall painters for R&D's suit lab (src/data/levels/rooms/rnd.js places
 * them). Keyed by wall id.
 *
 * White lab panelling on a grey dado, a cable tray under the ceiling. The
 * C-series heavy frames on their rack (the squads' plate), the D-series
 * cradle standing empty, Orr's whiteboard (the anchor maths, and 06:47
 * circled), the rig's consoles, Lift A's doors and locked call panel, the
 * tool wall, the bay's breaker (dead, then thrown) and a ceiling vent.
 */
import { RND_WALLS as W } from "../../../data/levels/rooms/rnd.js";
import { letter } from "../locker-art.js";
import { T, lin, plate, rivet, lightStrip, led, vents, sink, raise, hazard, ink } from "../paint.js";
import { onScreen, text, screen, heavyFrame, lit } from "./east-kit.js";

const PANEL = ["#e4e8ec", "#d2d8de", "#aeb6be"];
const DADO = ["#7a828c", "#626a74", "#3e444c"];
const STEEL = ["#9aa2ac", "#6e767f", "#3e444c"];
const DARK = ["#2a2e34", "#1c1f24", "#0e1013"];
const CYAN = "#46e0ff";
const AMBER = "#ffb038";

const TOP = 56;
const DADO_Y = 330;
const KICK = 462;

/** The lab's wall: cable tray, white panels with their seams, the grey dado. */
function labWall(ctx, p, r) {
  plate(ctx, 0, 0, T, TOP, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
  for (let i = 0; i < 3; i++) {
    ink(ctx, 0, 14 + i * 12, T, 3, 14);
    raise(0, 17 + i * 12, T, 4, 8);
  }
  for (const x of [0, T / 2]) plate(ctx, x + 2, TOP, T / 2 - 4, DADO_Y - TOP, p, { tones: PANEL, bevel: 3, ink: 1.5 });
  plate(ctx, 0, DADO_Y, T, KICK - DADO_Y, p, { tones: DADO, bevel: 3, ink: 2, spec: false });
  lightStrip(ctx, 0, DADO_Y - 6, T, 4, CYAN, { blur: 10, alpha: 0.55, housing: false });
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, TOP + 10 + r() * 240, 2 + r() * 24, 1 + r() * 2);
  }
}

function paintWall(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, T / 2 - 60, 120, 120, 26, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  letter(ctx, "R&D · SUIT LAB", T / 2, 133, 12, "#1a1c20");
  led(ctx, T / 2 + 80, 133, 4, "#3aff6a");
}

/** A C-series heavy frame on its gantry: the plate the squads wear. */
function paintSuitRack(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 30, TOP + 8, T - 60, 400, p, { tones: ["#20262e", "#181d24", "#0e1116"], bevel: 4, ink: 2, recess: true });
  plate(ctx, T / 2 - 12, TOP + 8, 24, 70, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  heavyFrame(ctx, T / 2, 380, 92, ["#6a7484", "#4b5568", "#262c38"], r() < 0.5 ? "#ffb030" : "#7a5a20");
  plate(ctx, T / 2 - 90, 420, 180, 28, p, { tones: ["#e8e4d8", "#d0ccc0", "#9a968a"], bevel: 2, ink: 1 });
  letter(ctx, "C-SERIES · ISSUED TCD HEAVY", T / 2, 434, 11, "#1a1c20", 800);
  for (const [x, y] of [[44, 80], [T - 44, 80]]) rivet(ctx, x, y, 5, p);
}

/** The D-series cradle: clamps open, cables hanging, the prototype gone. */
function paintSuitCradle(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 30, TOP + 8, T - 60, 400, p, { tones: ["#20262e", "#181d24", "#0e1116"], bevel: 4, ink: 2, recess: true });
  // The clamps, open, where shoulders and hips went.
  for (const [x, y] of [[160, 170], [T - 160, 170], [190, 300], [T - 190, 300]]) {
    plate(ctx, x - 26, y - 12, 52, 24, p, { tones: STEEL, bevel: 2, ink: 1.5 });
    led(ctx, x, y, 4, AMBER);
  }
  ctx.strokeStyle = "#0a0c10";
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(200 + i * 36, TOP + 10);
    ctx.quadraticCurveTo(190 + i * 40, 260, 210 + i * 30 + r() * 20, 330 + r() * 40);
    ctx.stroke();
  }
  // The outline the suit left on the backboard.
  ctx.strokeStyle = "rgba(70,224,255,0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(T / 2 - 70, 120, 140, 260);
  ctx.setLineDash([]);
  plate(ctx, T / 2 - 100, 420, 200, 28, p, { tones: ["#f0cf5a", "#e0b83a", "#a8841e"], bevel: 2, ink: 1 });
  letter(ctx, "D-01 · OUT FOR TRIALS", T / 2, 434, 12, "#1a1c20", 900);
}

/** Orr's whiteboard: the anchor's maths, the Engine's cycle, 06:47 circled. */
function paintWhiteboard(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 24, 80, T - 48, 300, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 34, 90, T - 68, 280, p, { tones: ["#f6f8f8", "#eaeeee", "#cad0d0"], bevel: 2, ink: 1.5, spec: false });
  onScreen(ctx, () => {
    ctx.strokeStyle = "#1a3a8a";
    ctx.lineWidth = 2.5;
    text(ctx, "ANCHOR LOCK", 60, 116, 18, "#1a3a8a", 900, "left");
    text(ctx, "τ(suit) = τ(local) − Δ(Engine)", 60, 146, 15, "#1a3a8a", 700, "left");
    text(ctx, "C: Δ ≈ ½   D: Δ = 1 ?", 60, 172, 15, "#1a3a8a", 700, "left");
    // The Engine's cycle, a sine with its peaks marked.
    ctx.beginPath();
    for (let x = 60; x < T - 60; x += 4) {
      const y = 240 + Math.sin((x - 60) / 26) * 28;
      x === 60 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    text(ctx, "CALIBRATION", 60, 292, 12, "#1a3a8a", 800, "left");
    ctx.strokeStyle = "#c22a1e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(T - 130, 320, 70, 26, -0.08, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, "06:47 ??", T - 130, 320, 22, "#c22a1e", 900);
    text(ctx, "— N.O.", T - 70, 352, 12, "#1a3a8a", 800);
  });
}

/** The rig's consoles: the suit's telemetry, live, under the rig's lamps. */
function paintConsole(ctx, p, r) {
  labWall(ctx, p, r);
  screen(ctx, p, 50, 96, T - 100, 170, (x, y, w, h) => {
    ctx.strokeStyle = "rgba(70,224,255,0.25)";
    ctx.lineWidth = 1;
    for (let gx = x; gx < x + w; gx += 24) ctx.strokeRect(gx, y, 24, h);
    // Three traces: servo load, plate temperature, the anchor's lock.
    [["#46e0ff", 0.3], ["#5aff9a", 0.55], ["#ffb038", 0.8]].forEach(([c, k], i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = x; px < x + w; px += 6) {
        const py = y + h * k + Math.sin(px / (14 + i * 6) + r() * 0.3) * 14 * (i === 2 ? 0.4 : 1);
        px === x ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  });
  plate(ctx, 60, 300, T - 120, 120, p, { tones: DARK, bevel: 4, ink: 2 });
  for (let i = 0; i < 12; i++) led(ctx, 86 + i * 30, 330, 5, i % 4 === 3 ? AMBER : i % 3 ? CYAN : "#3aff6a");
  for (let i = 0; i < 6; i++) plate(ctx, 82 + i * 58, 356, 44, 40, p, { tones: STEEL, bevel: 3, ink: 2 });
}

/** Lift A: R&D's freight car to the Engine level, locked out for the day. */
function paintLiftA(ctx, p, r) {
  ctx.fillStyle = DARK[1];
  ctx.fillRect(0, 0, T, T);
  plate(ctx, 0, 0, T, 60, p, { tones: DARK, bevel: 3, ink: 2 });
  plate(ctx, T / 2 - 90, 14, 180, 32, p, { tones: ["#120406", "#0c0204", "#060102"], bevel: 2, ink: 1.5, recess: true });
  letter(ctx, "A · ENGINE LEVEL", T / 2, 30, 14, "#ff6a3a", 900);
  lit(T / 2 - 84, 18, 168, 24, 0.6, 4);
  // The doors, a seam down the middle, chevrons of the lockout across them.
  for (const x of [26, T / 2 + 4]) plate(ctx, x, 70, T / 2 - 30, KICK - 70, p, { tones: ["#7a828c", "#5c646e", "#30363e"], bevel: 4, ink: 2 });
  ink(ctx, T / 2 - 3, 70, 6, KICK - 70, 26);
  hazard(ctx, 26, 250, T - 52, 46, "#e8c23a");
  plate(ctx, T / 2 - 110, 256, 220, 34, p, { tones: ["#e8e4d8", "#d0ccc0", "#9a968a"], bevel: 2, ink: 1 });
  letter(ctx, "LOCKED OUT · CALIBRATION", T / 2, 273, 15, "#5a0a0a", 900);
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
}

/** Lift A's call panel: both buttons dark, the key switch turned to LOCK. */
function paintLiftPanel(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, T / 2 - 60, 150, 120, 200, p, { tones: STEEL, bevel: 4, ink: 2 });
  for (const y of [190, 250]) {
    ctx.fillStyle = "#1a1c20";
    ctx.beginPath();
    ctx.arc(T / 2, y, 20, 0, Math.PI * 2);
    ctx.fill();
    sink(T / 2 - 20, y - 20, 40, 40, 14);
  }
  led(ctx, T / 2, 300, 6, "#ff3a2a");
  letter(ctx, "LOCK", T / 2, 326, 12, "#1a1c20", 900);
  plate(ctx, T / 2 - 70, 110, 140, 26, p, { tones: ["#120406", "#0c0204", "#060102"], bevel: 2, ink: 1.5 });
  letter(ctx, "B2 · ENGINE", T / 2, 123, 13, "#ff6a3a", 900);
}

/** The bay's main breaker, dead (`live` false) or thrown and humming. */
function breaker(live) {
  return (ctx, p, r) => {
    labWall(ctx, p, r);
    plate(ctx, 70, 80, T - 140, 360, p, { tones: ["#5a626c", "#424a54", "#22282e"], bevel: 6, ink: 3 });
    hazard(ctx, 70, 80, T - 140, 22, "#e8c23a");
    plate(ctx, 110, 116, T - 220, 34, p, { tones: ["#e8e4d8", "#d0ccc0", "#9a968a"], bevel: 2, ink: 1 });
    letter(ctx, "MAIN BREAKER · R&D / B-LIFT", T / 2, 133, 14, "#1a1c20", 900);
    // The bus bars and the big handle: down and dark, or up with the bus lit.
    for (let i = 0; i < 3; i++) {
      const x = 140 + i * 80;
      plate(ctx, x, 170, 40, 150, p, { tones: DARK, bevel: 3, ink: 2, recess: true });
      if (live) lightStrip(ctx, x + 12, 180, 16, 130, "#5aff9a", { blur: 14, alpha: 0.85 });
    }
    const hy = live ? 190 : 300;
    plate(ctx, T / 2 - 120, hy, 240, 30, p, { tones: ["#c8322a", "#a82820", "#6a1812"], bevel: 4, ink: 2 });
    plate(ctx, T / 2 - 14, hy + 30, 28, live ? 120 : 60, p, { tones: STEEL, bevel: 3, ink: 2 });
    led(ctx, 120, 400, 8, live ? "#3aff6a" : "#ff3a2a");
    led(ctx, T - 120, 400, 8, live ? "#3aff6a" : "#3a1010", live);
    letter(ctx, live ? "LIVE" : "OFF", T / 2, 404, 22, live ? "#3aff6a" : "#ff3a2a", 900);
    if (live) lit(T / 2 - 40, 390, 80, 28, 0.7, 6);
  };
}

/** The tool wall: a pegboard of drivers, a torque wrench, spare servo packs. */
function paintTools(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 30, 80, T - 60, 230, p, { tones: ["#8a7a5a", "#76664a", "#5a4c34"], bevel: 3, ink: 2, spec: false });
  ctx.fillStyle = "rgba(20,14,6,0.6)";
  for (let y = 96; y < 300; y += 18) for (let x = 46; x < T - 46; x += 18) ctx.fillRect(x, y, 3, 3);
  const tools = [[70, 120, 8, 120], [110, 110, 14, 90], [150, 130, 40, 16], [220, 110, 10, 150], [270, 120, 60, 22], [360, 104, 12, 100], [400, 130, 30, 70]];
  for (const [x, y, w, h] of tools) plate(ctx, x, y, w, h, p, { tones: r() < 0.5 ? STEEL : ["#c8322a", "#a82820", "#6a1812"], bevel: 2, ink: 1.5 });
  for (let i = 0; i < 3; i++) plate(ctx, 60 + i * 130, 236, 110, 60, p, { tones: DARK, bevel: 3, ink: 2 });
  for (let i = 0; i < 3; i++) led(ctx, 100 + i * 130, 266, 4, "#3aff6a");
}

/** The lab's sign by the door. */
function paintSign(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 50, 110, T - 100, 120, p, { tones: ["#1c3a6e", "#142c58", "#0c1c3c"], bevel: 5, ink: 3 });
  letter(ctx, "RESEARCH & DEVELOPMENT", T / 2, 146, 20, "#f2f2ee", 900);
  letter(ctx, "SUIT PROGRAMME · DR. N. ORR", T / 2, 178, 13, "#b8c8e0", 800);
  letter(ctx, "ANCHOR TRIALS IN PROGRESS", T / 2, 206, 12, AMBER, 900);
}

/** The ceiling vent the blackout's first drone drops out of. */
function paintVent(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 90, 70, T - 180, 150, p, { tones: STEEL, bevel: 4, ink: 2 });
  ctx.fillStyle = "#05070a";
  ctx.fillRect(106, 86, T - 212, 118);
  sink(106, 86, T - 212, 118, 30);
  vents(ctx, 106, 90, T - 212, 110, 9, p);
  for (const [x, y] of [[100, 80], [T - 100, 80], [100, 210], [T - 100, 210]]) rivet(ctx, x, y, 4, p);
}

/**
 * A workbench, as a waist-high low wall: only the bottom two fifths of the
 * face shows, so the bench top's edge, drawers and a tool chest are there.
 */
function paintBench(ctx, p, r) {
  ctx.fillStyle = DARK[1];
  ctx.fillRect(0, 0, T, T);
  const top = 308;
  plate(ctx, 0, top, T, 20, p, { tones: ["#c8ccd0", "#a8aeb4", "#6a7076"], bevel: 3, ink: 2 });
  plate(ctx, 0, top + 20, T, T - top - 20, p, { tones: DADO, bevel: 3, ink: 2, spec: false });
  for (let i = 0; i < 2; i++) {
    const x = 18 + i * 250;
    for (let k = 0; k < 3; k++) {
      plate(ctx, x, top + 34 + k * 52, 226, 44, p, { tones: STEEL, bevel: 3, ink: 2 });
      plate(ctx, x + 88, top + 52 + k * 52, 50, 8, p, { tones: DARK, bevel: 1, ink: 1 });
    }
  }
  led(ctx, T / 2, top + 10, 3, CYAN);
}

/** A sample fridge: glass door, racks of vials and sealed trays, the temperature lit. */
function paintFridge(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 60, TOP + 10, T - 120, KICK - TOP - 14, p, { tones: ["#e8ecf0", "#cfd6dc", "#9aa2aa"], bevel: 5, ink: 2 });
  plate(ctx, 80, TOP + 40, T - 160, 330, p, { tones: ["#2a3c48", "#1e2e38", "#0e161c"], bevel: 3, ink: 2, recess: true });
  for (let i = 0; i < 5; i++) {
    const y = TOP + 70 + i * 62;
    ctx.fillStyle = "#9aa8b4";
    ctx.fillRect(84, y + 40, T - 168, 4);
    for (let k = 0; k < 10; k++) {
      const x = 96 + k * 32;
      ctx.fillStyle = ["#e04a5a", "#46e0ff", "#f2d64a", "#5aff9a"][(k + i) % 4];
      ctx.fillRect(x, y + 10 + r() * 6, 10, 30);
      ctx.fillStyle = "#f2f4f6";
      ctx.fillRect(x, y + 6, 10, 6);
    }
  }
  ctx.fillStyle = "rgba(200,240,255,0.12)";
  ctx.fillRect(80, TOP + 40, T - 160, 330);
  lit(80, TOP + 40, T - 160, 330, 0.35, 8);
  plate(ctx, T / 2 - 60, TOP + 384, 120, 26, p, { tones: DARK, bevel: 2, ink: 1.5 });
  letter(ctx, "+4°C · SAMPLES", T / 2, TOP + 397, 12, "#5aff9a", 900);
  lit(T / 2 - 56, TOP + 386, 112, 22, 0.6, 4);
}

/**
 * The window onto the cleanroom next door: white light, a tech in a bunny
 * suit at a bench, the airlock's sign beside it.
 */
function paintCleanroom(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 30, TOP + 30, T - 60, 280, p, { tones: STEEL, bevel: 5, ink: 2 });
  ctx.fillStyle = lin(ctx, 0, TOP + 44, 0, TOP + 296, [[0, "#f4f8fc"], [1, "#cfdae4"]]);
  ctx.fillRect(44, TOP + 44, T - 88, 252);
  // The room beyond: its benches, a hood, a suited tech.
  ctx.fillStyle = "#b8c4ce";
  ctx.fillRect(44, TOP + 220, T - 88, 76);
  ctx.fillStyle = "#9aa6b2";
  ctx.fillRect(80, TOP + 120, 120, 100);
  ctx.fillStyle = "#e8eef4";
  ctx.beginPath();
  ctx.arc(330, TOP + 150, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(304, TOP + 172, 52, 90);
  ctx.fillStyle = "#46a0d8";
  ctx.fillRect(316, TOP + 142, 28, 12);
  lit(44, TOP + 44, T - 88, 252, 0.55, 10);
  // The glass: reflections across it.
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  for (const x0 of [90, 280]) {
    ctx.beginPath();
    ctx.moveTo(x0, TOP + 44);
    ctx.lineTo(x0 + 40, TOP + 44);
    ctx.lineTo(x0 - 30, TOP + 296);
    ctx.lineTo(x0 - 70, TOP + 296);
    ctx.closePath();
    ctx.fill();
  }
  plate(ctx, T / 2 - 90, TOP + 330, 180, 30, p, { tones: ["#e8e4d8", "#d0ccc0", "#9a968a"], bevel: 2, ink: 1 });
  letter(ctx, "CLEANROOM 2 · SUITS ONLY", T / 2, TOP + 345, 12, "#1a1c20", 900);
}

/**
 * The cadet on two screens: heart and breath on one, the neural traces and
 * the match the suit was cut to on the other, under their badge number.
 */
function paintBiomon(ctx, p, r) {
  labWall(ctx, p, r);
  screen(ctx, p, 40, 84, T - 80, 210, (x, y, w, h) => {
    onScreen(ctx, () => {
      const L = T - x - w;
      text(ctx, "SUBJECT 11235 · CALIBRATION", L + 16, y + 18, 14, "#46e0ff", 900, "left");
      text(ctx, "MATCH 98.7%", L + w - 16, y + 18, 16, "#5aff9a", 900, "right");
      // Heart: an ECG strip; the brain: three slow bands and a fast one.
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#5aff9a";
      ctx.beginPath();
      for (let px = 0; px < w - 32; px += 4) {
        const k = px % 72;
        const py = y + 66 - (k > 30 && k < 36 ? 30 : k > 36 && k < 40 ? -12 : Math.sin(px / 9) * 2);
        px === 0 ? ctx.moveTo(L + 16 + px, py) : ctx.lineTo(L + 16 + px, py);
      }
      ctx.stroke();
      text(ctx, "HR 92", L + w - 16, y + 50, 13, "#5aff9a", 800, "right");
      ["#46e0ff", "#9a8aff", "#ffb038", "#ff6a8a"].forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.beginPath();
        for (let px = 0; px < w - 32; px += 4) {
          const py = y + 106 + i * 24 + Math.sin(px / (18 - i * 4) + i + r() * 0.2) * (8 - i);
          px === 0 ? ctx.moveTo(L + 16 + px, py) : ctx.lineTo(L + 16 + px, py);
        }
        ctx.stroke();
      });
      text(ctx, "α  θ  β  γ", L + 16, y + h - 12, 12, "#9fb4c8", 800, "left");
    });
  });
  plate(ctx, 60, 320, T - 120, 100, p, { tones: DARK, bevel: 4, ink: 2 });
  for (let i = 0; i < 10; i++) led(ctx, 88 + i * 34, 350, 5, i % 3 ? CYAN : "#3aff6a");
}

/** A server rack: the rig's compute, its drive lights, a patch panel. */
function paintRack(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 70, TOP + 8, T - 140, KICK - TOP - 10, p, { tones: DARK, bevel: 4, ink: 2 });
  for (let i = 0; i < 9; i++) {
    const y = TOP + 26 + i * 42;
    plate(ctx, 86, y, T - 172, 34, p, { tones: ["#3a4048", "#2a3036", "#16191e"], bevel: 2, ink: 1.5 });
    for (let k = 0; k < 8; k++) led(ctx, 110 + k * 16, y + 17, 2.5, r() < 0.7 ? "#3aff6a" : r() < 0.5 ? AMBER : CYAN);
    ink(ctx, T - 180, y + 10, 70, 14, 20);
  }
}

/**
 * The lab's safety board: the hazard diamonds for what is in here (laser,
 * cryogen, high voltage), the PPE pictograms, the permit sheet on its clip.
 */
function paintNotice(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 36, 74, T - 72, 236, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 46, 84, T - 92, 216, p, { tones: ["#f6f8f8", "#eaeeee", "#cad0d0"], bevel: 2, ink: 1.5, spec: false });
  plate(ctx, 46, 84, T - 92, 36, p, { tones: ["#e8c23a", "#c8a020", "#7a6010"], bevel: 2, ink: 1.5 });
  letter(ctx, "CAUTION · LAB HAZARDS", T / 2, 102, 18, "#1a1a1a", 900);
  // Three warning triangles, each on its own plate so the bake keeps them.
  const tri = (x, label, glyph) => {
    plate(ctx, x - 52, 132, 104, 112, p, { tones: ["#f6f8f8", "#eaeeee", "#cad0d0"], bevel: 3, ink: 1.5 });
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(x, 142); ctx.lineTo(x + 44, 214); ctx.lineTo(x - 44, 214);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8c23a";
    ctx.beginPath();
    ctx.moveTo(x, 154); ctx.lineTo(x + 34, 208); ctx.lineTo(x - 34, 208);
    ctx.closePath();
    ctx.fill();
    letter(ctx, glyph, x, 190, 26, "#1a1a1a", 900);
    letter(ctx, label, x, 230, 11, "#1a1c20", 900);
  };
  tri(T - 112, "LASER", "✶");
  tri(T / 2, "CRYOGEN", "❄");
  tri(112, "HIGH VOLTAGE", "⚡");
  // PPE row: the blue mandatory roundels.
  [["EYES", T - 150], ["GLOVES", T / 2], ["COAT", 150]].forEach(([t, x]) => {
    ctx.fillStyle = "#1f5fbf";
    ctx.beginPath();
    ctx.arc(x, 270, 18, 0, Math.PI * 2);
    ctx.fill();
    letter(ctx, t, x, 270, 9, "#ffffff", 900);
  });
  // Permit sheet, clipped below the board.
  plate(ctx, T / 2 - 60, 318, 120, 4, p, { tones: STEEL, bevel: 1, ink: 1 });
  ctx.fillStyle = "#f4f2ea";
  ctx.fillRect(T / 2 - 44, 322, 88, 6);
  led(ctx, 60, 88, 4, "#ff3a2a");
}

/**
 * The D-series on a blueprint: front and side elevations in white line on
 * blue, the anchor module called out in amber, Orr's revision block.
 */
function paintSchematic(ctx, p, r) {
  labWall(ctx, p, r);
  plate(ctx, 22, 70, T - 44, 300, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 32, 80, T - 64, 280, p, { tones: ["#1f4a8a", "#1a3f78", "#11305e"], bevel: 2, ink: 1.5, spec: false });
  onScreen(ctx, () => {
    // Grid.
    ctx.strokeStyle = "rgba(200,225,255,0.14)";
    ctx.lineWidth = 1;
    for (let x = 40; x < T - 32; x += 20) { ctx.beginPath(); ctx.moveTo(x, 84); ctx.lineTo(x, 356); ctx.stroke(); }
    for (let y = 92; y < 356; y += 20) { ctx.beginPath(); ctx.moveTo(36, y); ctx.lineTo(T - 36, y); ctx.stroke(); }
    ctx.strokeStyle = "rgba(235,245,255,0.9)";
    ctx.lineWidth = 2;
    // Front elevation.
    const fig = (x, s, side) => {
      ctx.strokeRect(x - s * 0.3, 112, s * 0.6, s * 0.5);
      ctx.strokeRect(x - (side ? s * 0.35 : s * 0.6), 170, side ? s * 0.7 : s * 1.2, s * 1.0);
      if (!side) {
        ctx.strokeRect(x - s * 0.95, 172, s * 0.3, s * 0.9);
        ctx.strokeRect(x + s * 0.65, 172, s * 0.3, s * 0.9);
      } else {
        ctx.strokeRect(x - s * 0.18, 176, s * 0.36, s * 0.8);
        ctx.strokeRect(x + s * 0.35, 182, s * 0.18, s * 0.5);
      }
      ctx.strokeRect(x - s * 0.5, 170 + s * 1.04, s * 0.42, s * 1.0);
      if (!side) ctx.strokeRect(x + s * 0.08, 170 + s * 1.04, s * 0.42, s * 1.0);
    };
    fig(150, 70, false);
    fig(330, 70, true);
    // Dimension line.
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 112); ctx.lineTo(60, 315); ctx.stroke();
    text(ctx, "2.14 M", 74, 214, 11, "rgba(235,245,255,0.9)", 800, "left");
    // The anchor module, called out.
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(150, 205, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(166, 196); ctx.lineTo(236, 130); ctx.lineTo(300, 130); ctx.stroke();
    text(ctx, "ANCHOR MODULE", 304, 122, 12, AMBER, 900, "left");
    text(ctx, "Δτ ISOLATION · REV C", 304, 140, 10, AMBER, 800, "left");
    // Title block.
    ctx.strokeStyle = "rgba(235,245,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(T - 196, 318, 160, 36);
    text(ctx, "D-SERIES · GA", T - 116, 330, 12, "#ffffff", 900);
    text(ctx, "DWG 06-47 · N. ORR", T - 116, 346, 9, "rgba(235,245,255,0.85)", 800);
  });
  for (const [x, y] of [[38, 86], [T - 38, 86], [38, 354], [T - 38, 354]]) rivet(ctx, x, y, 4, p);
}

/**
 * Gas cylinders chained to the wall in their rack, the regulators and the
 * lines up into the cable tray: nitrogen for the cryo, argon for the welder.
 */
function paintGas(ctx, p, r) {
  labWall(ctx, p, r);
  const cyl = [[110, "#2a6a3a", "N2"], [T / 2, "#3a3e44", "AR"], [T - 110, "#2a6a3a", "N2"]];
  for (const [x, c, label] of cyl) {
    // The line up to the tray.
    ctx.fillStyle = "#9aa2ac";
    ctx.fillRect(x - 3, 24, 6, 78);
    ctx.fillStyle = lin(ctx, x - 44, 0, x + 44, 0, [[0, "#0e1013"], [0.3, c], [0.55, "#f4f6f8"], [0.62, c], [1, "#0e1013"]]);
    ctx.beginPath();
    ctx.roundRect(x - 44, 132, 88, 330, [40, 40, 6, 6]);
    ctx.fill();
    raise(x - 44, 132, 88, 330, 30);
    // Neck, valve and regulator gauge.
    ctx.fillStyle = "#c8ced6";
    ctx.fillRect(x - 12, 104, 24, 30);
    plate(ctx, x - 26, 92, 52, 18, p, { tones: STEEL, bevel: 2, ink: 1.5 });
    ctx.fillStyle = "#1a1c20";
    ctx.beginPath(); ctx.arc(x + 30, 112, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f4f6f8";
    ctx.beginPath(); ctx.arc(x + 30, 112, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c22a1e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 30, 112); ctx.lineTo(x + 36, 104); ctx.stroke();
    // Collar label on a plate, so it survives the bake.
    plate(ctx, x - 36, 196, 72, 40, p, { tones: ["#f4f2ea", "#e2e0d8", "#b8b6ae"], bevel: 2, ink: 1.5 });
    letter(ctx, label, x, 216, 20, "#1a1c20", 900);
  }
  // The restraint chain and the rack's rail.
  plate(ctx, 30, 270, T - 60, 16, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  ctx.strokeStyle = "#e8c23a";
  ctx.lineWidth = 4;
  for (let x = 36; x < T - 36; x += 14) {
    ctx.beginPath(); ctx.ellipse(x, 300, 7, 4, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

export const PAINTERS = {
  [W.NOTICE]: paintNotice,
  [W.SCHEMATIC]: paintSchematic,
  [W.GAS]: paintGas,
  [W.FRIDGE]: paintFridge,
  [W.CLEANROOM]: paintCleanroom,
  [W.BIOMON]: paintBiomon,
  [W.RACK]: paintRack,
  [W.BENCH]: paintBench,
  [W.WALL]: paintWall,
  [W.CONSOLE]: paintConsole,
  [W.SUIT_RACK]: paintSuitRack,
  [W.SUIT_CRADLE]: paintSuitCradle,
  [W.WHITEBOARD]: paintWhiteboard,
  [W.LIFT_A]: paintLiftA,
  [W.LIFT_A_PANEL]: paintLiftPanel,
  [W.BREAKER]: breaker(false),
  [W.BREAKER_LIVE]: breaker(true),
  [W.TOOLS]: paintTools,
  [W.SIGN]: paintSign,
  [W.VENT]: paintVent,
};

