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
import { T, lin, plate, rivet, ink, lightStrip, led, hazard } from "../paint.js";
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

export const PAINTERS = {
  [W.WALL]: paintWall,
  [W.PAD]: paintPad,
  [W.BOARD]: paintBoard,
  [W.SIGN]: paintSign,
  [W.RAIL]: paintRail,
};
