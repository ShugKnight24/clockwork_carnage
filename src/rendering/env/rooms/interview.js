/**
 * Wall painters for the interview suite (src/data/levels/rooms/interview.js
 * places them). Keyed by wall id.
 *
 * Grey acoustic panels in a steel grid, a padded kick. The one-way glass:
 * dark, with the room's lamp caught in it, so from the table it is a
 * mirror and from observation a window (it is one cell, seen from both).
 * The recorder rack, the RECORDED notice, the room plate over the door.
 */
import { INTERVIEW_WALLS as W } from "../../../data/levels/rooms/interview.js";
import { letter } from "../locker-art.js";
import { T, lin, plate, led, lightStrip, sink } from "../paint.js";
import { bust, lit, clockFace } from "./east-kit.js";

const PANEL = ["#6a6e76", "#5a5e66", "#42464e"];
const STEEL = ["#9aa2ac", "#6e767f", "#3e444c"];
const DARK = ["#2a2e34", "#1c1f24", "#0e1013"];

const KICK = 452;

/** Acoustic panels, two by three, in their steel grid. */
function acoustic(ctx, p, r) {
  ctx.fillStyle = DARK[1];
  ctx.fillRect(0, 0, T, T);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = 6 + col * (T / 2);
      const y = 12 + row * 146;
      plate(ctx, x, y, T / 2 - 12, 138, p, { tones: PANEL, bevel: 4, ink: 2, spec: false });
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.12})`;
        ctx.fillRect(x + 6 + r() * (T / 2 - 24), y + 6 + r() * 126, 2, 2);
      }
    }
  }
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: ["#3a3e46", "#2a2e34", "#16181c"], bevel: 4, ink: 2, spec: false });
}

function paintWall(ctx, p, r) {
  acoustic(ctx, p, r);
}

/**
 * The one-way glass: near-black, the hard lamp over the table caught in it,
 * a figure's outline faint on the far side, a steel frame.
 */
function paintOneWay(ctx, p, r) {
  acoustic(ctx, p, r);
  const x = 20, y = 70, w = T - 40, h = 300;
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#0a0e12"], [1, "#141a20"]]);
  ctx.fillRect(x, y, w, h);
  sink(x, y, w, h, 26);
  // What the mirror shows: the table lamp's bloom, the table's edge.
  ctx.fillStyle = "rgba(255,236,200,0.18)";
  ctx.beginPath();
  ctx.ellipse(T / 2 + (r() - 0.5) * 80, y + 40, 60, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(140,150,160,0.12)";
  ctx.fillRect(x + 40, y + h - 70, w - 80, 10);
  // And faintly, someone standing on the other side.
  ctx.globalAlpha = 0.18;
  bust(ctx, T / 2 + (r() - 0.5) * 120, y + h - 30, 56, "#4a5462");
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(220,235,255,0.07)";
  for (const [a, b] of [[60, 140], [320, 360]]) {
    ctx.beginPath();
    ctx.moveTo(a, y);
    ctx.lineTo(b, y);
    ctx.lineTo(b - 100, y + h);
    ctx.lineTo(a - 100, y + h);
    ctx.closePath();
    ctx.fill();
  }
  for (const [fx, fy, fw, fh] of [[x - 10, y - 12, w + 20, 14], [x - 10, y + h - 2, w + 20, 16], [x - 10, y - 12, 12, h + 26], [x + w - 2, y - 12, 12, h + 26]]) {
    plate(ctx, fx, fy, fw, fh, p, { tones: STEEL, bevel: 3, ink: 2 });
  }
}

/** The recorder rack in observation: two decks, levels, the red REC light. */
function paintRecorder(ctx, p, r) {
  acoustic(ctx, p, r);
  plate(ctx, 60, 120, T - 120, 260, p, { tones: DARK, bevel: 4, ink: 2 });
  for (let k = 0; k < 2; k++) {
    const y = 140 + k * 110;
    plate(ctx, 76, y, T - 152, 90, p, { tones: STEEL, bevel: 3, ink: 2 });
    ctx.fillStyle = "#06120a";
    ctx.fillRect(96, y + 16, 180, 30);
    lit(96, y + 16, 180, 30, 0.7, 4);
    for (let b = 0; b < 12; b++) {
      ctx.fillStyle = b < 8 ? "#3aff6a" : b < 10 ? "#ffb038" : "#ff3a2a";
      ctx.fillRect(100 + b * 14, y + 22 + (r() < 0.5 ? 0 : 4), 10, 14);
    }
    led(ctx, T - 110, y + 30, 7, "#ff3a2a");
    letter(ctx, "REC", T - 110, y + 60, 12, "#ff3a2a", 900);
  }
}

/** THIS INTERVIEW IS RECORDED, at eye height. */
function paintNotice(ctx, p, r) {
  acoustic(ctx, p, r);
  plate(ctx, 80, 150, T - 160, 120, p, { tones: ["#f0cf5a", "#e0b83a", "#a8841e"], bevel: 4, ink: 3 });
  letter(ctx, "THIS INTERVIEW", T / 2, 190, 22, "#1a1c20", 900);
  letter(ctx, "IS RECORDED", T / 2, 224, 22, "#1a1c20", 900);
  lightStrip(ctx, T / 2 - 30, 290, 60, 10, "#ff3a2a", { blur: 14 });
}

/** The room's plate inside the door: its number, the tape's light. */
function paintDoorPlate(ctx, p, r) {
  acoustic(ctx, p, r);
  plate(ctx, 120, 100, T - 240, 80, p, { tones: ["#2e4a7a", "#22385e", "#16243e"], bevel: 4, ink: 2 });
  letter(ctx, "INTERVIEW", T / 2, 140, 22, "#f2f2ee", 900);
  led(ctx, T / 2, 210, 8, "#ff3a2a");
}

/**
 * Across from the glass: the wall clock the suspect watches (twenty to
 * seven), the dome camera over it with its tally lit, and the rights card
 * screwed to the panel beside the table.
 */
function paintClockCam(ctx, p, r) {
  acoustic(ctx, p, r);
  // Dome camera on its bracket, high in the corner (on screen, the right).
  plate(ctx, 40, 24, 110, 20, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  ctx.fillStyle = lin(ctx, 0, 44, 0, 100, [[0, "#3a3e44"], [1, "#0e1013"]]);
  ctx.beginPath();
  ctx.arc(95, 44, 46, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(80, 60, 14, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  led(ctx, 130, 54, 4, "#ff3a2a");
  // The clock: on a panel of its own, so its face reads in Realistic.
  plate(ctx, T / 2 - 90, 70, 180, 180, p, { tones: DARK, bevel: 3, ink: 2 });
  clockFace(ctx, T / 2, 160, 70, 6, 40);
  // The rights card.
  plate(ctx, T / 2 - 110, 290, 220, 130, p, { tones: ["#f4f2ea", "#e2e0d8", "#b8b6ae"], bevel: 3, ink: 2 });
  letter(ctx, "YOUR RIGHTS", T / 2, 312, 16, "#1a1c20", 900);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = "rgba(30,34,40,0.6)";
    ctx.fillRect(T / 2 - 90, 334 + i * 13, 180 - ((i * 37) % 60), 3);
  }
  for (const x of [T / 2 - 100, T / 2 + 100]) {
    ctx.fillStyle = "#5a5e66";
    ctx.beginPath();
    ctx.arc(x, 300, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const PAINTERS = {
  [W.CLOCK_CAM]: paintClockCam,
  [W.WALL]: paintWall,
  [W.ONE_WAY]: paintOneWay,
  [W.RECORDER]: paintRecorder,
  [W.NOTICE]: paintNotice,
  [W.DOOR_PLATE]: paintDoorPlate,
};
