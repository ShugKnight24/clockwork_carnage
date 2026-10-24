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
import { T, plate, rivet, lightStrip, led, vents, sink, raise, hazard, ink } from "../paint.js";
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

export const PAINTERS = {
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

