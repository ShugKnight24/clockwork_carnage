/**
 * Wall painters for dispatch and the bullpen (src/data/levels/rooms/dispatch.js
 * places them). Keyed by wall id.
 *
 * A working office: painted plaster over a wood-effect dado, carpet-tile
 * kick. The city map with its unit pins, the call board's screens, the radio
 * rack, the duty board (both heavy squads down for the Engine level), window
 * blinds, commendations and the room's sign.
 */
import { DISPATCH_WALLS as W } from "../../../data/levels/rooms/dispatch.js";
import { letter } from "../locker-art.js";
import { T, lin, plate, lightStrip, led, raise } from "../paint.js";
import { onScreen, text, screen, lit } from "./east-kit.js";

const PLASTER = ["#c8c2b2", "#b8b2a2", "#a09a8a"];
const DADO = ["#6a5a48", "#564838", "#382e22"];
const STEEL = ["#9aa2ac", "#6e767f", "#3e444c"];
const DARK = ["#2a2e34", "#1c1f24", "#0e1013"];
const NAVY = ["#2e4a7a", "#22385e", "#16243e"];

const RAIL = 300;
const KICK = 462;

function officeWall(ctx, p, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, RAIL, [[0, PLASTER[2]], [0.4, PLASTER[1]], [1, PLASTER[0]]]);
  ctx.fillRect(0, 0, T, RAIL);
  plate(ctx, 0, 0, T, 16, p, { tones: DARK, bevel: 2, ink: 2, spec: false });
  plate(ctx, 0, RAIL, T, 12, p, { tones: ["#d0d4d8", "#9ea2a8", "#5c6066"], bevel: 3, ink: 2 });
  plate(ctx, 0, RAIL + 12, T, KICK - RAIL - 12, p, { tones: DADO, bevel: 3, ink: 2, spec: false });
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: ["#2a2c34", "#1e2028", "#101218"], bevel: 3, ink: 2, spec: false });
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, 30 + r() * 250, 2 + r() * 30, 1 + r() * 2);
  }
}

function paintWall(ctx, p, r) {
  officeWall(ctx, p, r);
  // A sconce, and a framed print of the station from the river.
  plate(ctx, T / 2 - 80, 110, 160, 110, p, { tones: ["#2a1e14", "#1e150e", "#120c08"], bevel: 4, ink: 2 });
  ctx.fillStyle = lin(ctx, 0, 120, 0, 210, [[0, "#3a5a8a"], [0.6, "#7a8aa0"], [1, "#2a3a4a"]]);
  ctx.fillRect(T / 2 - 70, 120, 140, 90);
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(T / 2 - 50, 160, 30, 50);
  ctx.fillRect(T / 2 - 14, 140, 40, 70);
  ctx.fillRect(T / 2 + 32, 170, 26, 40);
}

/** The city map: districts, the river, units pinned where they are. */
function paintCityMap(ctx, p, r) {
  officeWall(ctx, p, r);
  screen(ctx, p, 20, 40, T - 40, 380, (x, y, w, h) => {
    ctx.fillStyle = "#0a1a2a";
    ctx.fillRect(x, y, w, h);
    // Streets.
    ctx.strokeStyle = "rgba(120,180,230,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + r() * h);
      ctx.lineTo(x + w, y + r() * h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + r() * w, y);
      ctx.lineTo(x + r() * w, y + h);
      ctx.stroke();
    }
    // The river.
    ctx.strokeStyle = "rgba(60,140,220,0.7)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(x, y + h * (0.3 + r() * 0.3));
    ctx.bezierCurveTo(x + w * 0.3, y + h * r(), x + w * 0.6, y + h, x + w, y + h * (0.4 + r() * 0.3));
    ctx.stroke();
    // Units: blue on patrol, amber on a call, red the one that hasn't answered.
    for (let i = 0; i < 9; i++) {
      const c = i === 4 ? "#ff3a2a" : i % 3 ? "#46b0ff" : "#ffb038";
      led(ctx, x + 20 + r() * (w - 40), y + 20 + r() * (h - 40), 6, c);
    }
  });
  plate(ctx, 0, 424, T, 30, p, { tones: NAVY, bevel: 2, ink: 1.5 });
  letter(ctx, "CHRONOS CITY · LIVE UNITS", T / 2, 439, 13, "#f2f2ee", 900);
}

/** The call board: the queue of calls, oldest at the top, priorities in colour. */
function paintCallBoard(ctx, p, r) {
  officeWall(ctx, p, r);
  screen(ctx, p, 40, 70, T - 80, 210, (x, y, w, h) => {
    onScreen(ctx, () => {
      const X = T - x - w;
      text(ctx, "CALLS — QUEUE", X + 14, y + 18, 14, "#46e0ff", 900, "left");
      const calls = [
        ["P2", "ALARM — ENGINE LVL", "#ffb038"],
        ["P3", "NOISE — LIFT B SHAFT", "#46e0ff"],
        ["P1", "OFFICER CHECK-IN DUE", "#ff3a2a"],
        ["P3", "LOST PROPERTY — LOBBY", "#46e0ff"],
        ["P3", "CLOCK FAULT — 4TH FL", "#46e0ff"],
      ];
      calls.forEach(([pr, what, c], i) => {
        const ly = y + 48 + i * 32;
        text(ctx, pr, X + 16, ly, 13, c, 900, "left");
        text(ctx, what, X + 60, ly, 13, "#d8e8f0", 700, "left", w - 80);
      });
    });
  });
  plate(ctx, 60, 300, T - 120, 140, p, { tones: DARK, bevel: 4, ink: 2 });
  for (let i = 0; i < 8; i++) led(ctx, 90 + i * 46, 330, 5, i === 2 ? "#ff3a2a" : "#3aff6a");
  lightStrip(ctx, 80, 380, T - 160, 6, "#46e0ff", { blur: 10, alpha: 0.6 });
}

/** The radio rack: receivers stacked, their channel readouts lit. */
function paintRadioRack(ctx, p, r) {
  officeWall(ctx, p, r);
  plate(ctx, 60, 40, T - 120, 400, p, { tones: DARK, bevel: 4, ink: 2 });
  for (let i = 0; i < 6; i++) {
    const y = 56 + i * 62;
    plate(ctx, 74, y, T - 148, 52, p, { tones: STEEL, bevel: 3, ink: 2 });
    ctx.fillStyle = "#06120a";
    ctx.fillRect(96, y + 12, 140, 26);
    lit(96, y + 12, 140, 26, 0.7, 4);
    letter(ctx, `CH ${String(11 + i * 3).padStart(2, "0")}`, 166, y + 25, 14, "#5aff9a", 900);
    for (let k = 0; k < 4; k++) led(ctx, 280 + k * 28, y + 26, 4, k === i % 4 ? "#ffb038" : "#3aff6a");
  }
}

/** The duty board: who is where this morning. Both heavy squads: Engine level. */
function paintDutyBoard(ctx, p, r) {
  officeWall(ctx, p, r);
  plate(ctx, 20, 70, T - 40, 300, p, { tones: STEEL, bevel: 4, ink: 2 });
  plate(ctx, 30, 80, T - 60, 280, p, { tones: ["#f4f6f6", "#e8ecec", "#c8cece"], bevel: 2, ink: 1.5, spec: false });
  onScreen(ctx, () => {
    text(ctx, "DUTY — DAY SHIFT", T / 2, 104, 18, "#1a2a5a", 900);
    const rows = [
      ["HEAVY A", "LT. RASCZAK", "ENGINE LVL"],
      ["HEAVY B", "SGT. KAEL", "ENGINE LVL"],
      ["PATROL 3", "OFC. VARGA", "OFF"],
      ["PATROL 5", "OFC. MENDEZ", "OFF"],
      ["DESK", "D. PIKE", "LOBBY"],
      ["CADET", "11235", "TRIALS"],
    ];
    rows.forEach(([unit, who, where], i) => {
      const y = 140 + i * 34;
      text(ctx, unit, 46, y, 14, "#1a2a5a", 900, "left");
      text(ctx, who, 190, y, 14, "#1a2a5a", 700, "left");
      text(ctx, where, T - 46, y, 14, where === "ENGINE LVL" ? "#c22a1e" : "#1a2a5a", 900, "right");
      ctx.fillStyle = "rgba(26,42,90,0.2)";
      ctx.fillRect(40, y + 15, T - 80, 1);
    });
  });
  raise(20, 70, T - 40, 300, 6);
}

/** Window blinds: the slats, daylight between them. */
function paintBlinds(ctx, p, r) {
  officeWall(ctx, p, r);
  plate(ctx, 50, 60, T - 100, 230, p, { tones: STEEL, bevel: 3, ink: 2 });
  ctx.fillStyle = lin(ctx, 0, 70, 0, 280, [[0, "#d8e8f8"], [1, "#9ab4cc"]]);
  ctx.fillRect(62, 72, T - 124, 206);
  lit(62, 72, T - 124, 206, 0.35, 10);
  for (let y = 76; y < 276; y += 14) {
    ctx.fillStyle = lin(ctx, 0, y, 0, y + 10, [[0, "#e8e4da"], [1, "#a8a49a"]]);
    ctx.fillRect(62, y, T - 124, 10);
  }
  ctx.strokeStyle = "rgba(60,60,60,0.5)";
  for (const x of [120, T - 120]) {
    ctx.beginPath();
    ctx.moveTo(x, 72);
    ctx.lineTo(x, 278);
    ctx.stroke();
  }
}

/** The room's sign: DISPATCH over the way in. */
function paintSign(ctx, p, r) {
  officeWall(ctx, p, r);
  plate(ctx, 50, 110, T - 100, 110, p, { tones: NAVY, bevel: 5, ink: 3 });
  letter(ctx, "DISPATCH", T / 2, 150, 40, "#f2f2ee", 900);
  letter(ctx, "QUIET PLEASE · CALLS LIVE", T / 2, 194, 13, "#b8c8e0", 800);
}

/** Commendations: three frames, a ribbon in each. */
function paintAwards(ctx, p, r) {
  officeWall(ctx, p, r);
  for (let i = 0; i < 3; i++) {
    const x = 50 + i * 144;
    plate(ctx, x, 110, 124, 150, p, { tones: ["#2a1e14", "#1e150e", "#120c08"], bevel: 4, ink: 2 });
    ctx.fillStyle = "#f2eee0";
    ctx.fillRect(x + 12, 122, 100, 126);
    ctx.fillStyle = ["#2e4a9a", "#a82a2a", "#2a8a4a"][i];
    ctx.fillRect(x + 54, 140, 16, 50);
    ctx.fillStyle = "#d8b25a";
    ctx.beginPath();
    ctx.arc(x + 62, 200, 16, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = "rgba(30,34,44,0.5)";
      ctx.fillRect(x + 26, 226 + k * 7, 72, 2);
    }
  }
}

/**
 * A desk island, as a waist-high low wall (the bottom two fifths of the
 * face shows): the desktop's edge, a monitor's back over it, the modesty
 * panel and a pedestal of drawers.
 */
function paintDesk(ctx, p, r) {
  ctx.fillStyle = DARK[1];
  ctx.fillRect(0, 0, T, T);
  const top = 308;
  // A monitor's back and a stack of files on the desk.
  plate(ctx, 120 + r() * 60, top - 2, 150, 16, p, { tones: DARK, bevel: 2, ink: 1.5 });
  plate(ctx, 0, top + 12, T, 18, p, { tones: ["#a07a52", "#86623e", "#5a3e24"], bevel: 3, ink: 2 });
  plate(ctx, 0, top + 30, T, T - top - 30, p, { tones: ["#6e7076", "#5a5c62", "#3a3c42"], bevel: 3, ink: 2, spec: false });
  for (const x of [20, T - 140]) {
    plate(ctx, x, top + 40, 120, T - top - 52, p, { tones: STEEL, bevel: 3, ink: 2 });
    for (let k = 0; k < 3; k++) plate(ctx, x + 40, top + 56 + k * 46, 40, 6, p, { tones: DARK, bevel: 1, ink: 1 });
  }
}

/** Dispatch's console arc: the desk edge, a row of lit screens, the keyboards. */
function paintConsole(ctx, p, r) {
  ctx.fillStyle = DARK[1];
  ctx.fillRect(0, 0, T, T);
  const top = 300;
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 166;
    plate(ctx, x, top, 140, 34, p, { tones: DARK, bevel: 2, ink: 1.5 });
    ctx.fillStyle = i === 1 ? "#ffb038" : "#46b0ff";
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x + 8, top + 6, 124, 22);
    ctx.globalAlpha = 1;
    lit(x + 8, top + 6, 124, 22, 0.7, 4);
  }
  plate(ctx, 0, top + 36, T, 16, p, { tones: STEEL, bevel: 3, ink: 2 });
  plate(ctx, 0, top + 52, T, T - top - 52, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
  for (let i = 0; i < 10; i++) led(ctx, 40 + i * 48, top + 80, 4, i % 4 ? "#3aff6a" : "#ffb038");
  lightStrip(ctx, 0, T - 20, T, 4, "#46b0ff", { blur: 10, alpha: 0.5, housing: false });
}

export const PAINTERS = {
  [W.DESK]: paintDesk,
  [W.CONSOLE]: paintConsole,
  [W.WALL]: paintWall,
  [W.CITY_MAP]: paintCityMap,
  [W.CALL_BOARD]: paintCallBoard,
  [W.RADIO_RACK]: paintRadioRack,
  [W.DUTY_BOARD]: paintDutyBoard,
  [W.BLINDS]: paintBlinds,
  [W.SIGN]: paintSign,
  [W.AWARDS]: paintAwards,
};
