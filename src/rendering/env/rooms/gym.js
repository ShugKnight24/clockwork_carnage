/**
 * Wall painters for the station's gym (src/data/levels/rooms/gym.js places
 * them), painted like src/rendering/env/range-art.js. Keyed by wall id.
 *
 * A police gym: painted block walls over a navy dado, black rubber kick
 * plates flecked like the floor, a mirror wall with a stretch bar, the PT
 * board with the course times, a poster, the notice board, cubbies, the towel
 * lockers, a water fountain and the TV. Behind the gym's loose panel, the
 * evidence cage: mesh lockers, shelving of tagged boxes and bags, the log.
 * Up the north passage, the observation deck over the sim hall.
 *
 * Lettering goes through locker-art's mirrored `letter`; anything that must
 * read in Realistic sits on a raised plate (the bake repaints flat albedo).
 * Canvas x runs against the screen, so `S(x)` places a thing x from the
 * left of the face as you look at it.
 */

import { letter } from "../locker-art.js";
import { T, lin, plate, lightStrip, led, vents, relief, grey, emit } from "../paint.js";

const S = (x) => T - x;

const PAINT = ["#9aa4ae", "#8a949e", "#76808a"];
const NAVY = ["#3a5482", "#2c4268", "#1c2c48"];
const CHROME = { tones: ["#e2e8ee", "#aab2ba", "#5c646c"], bevel: 3, ink: 2 };
const STEEL = { tones: ["#8a929c", "#646c76", "#363c44"], bevel: 3, ink: 2 };
const PAPER = { tones: ["#f6f4ec", "#ebe8de", "#cfccc2"], bevel: 2, ink: 1.5, spec: false };

const KICK = 462;
const DADO = 300;

// ── Shared ───────────────────────────────────────────────────────

/** The black rubber kick plate, flecked like the gym's rubber floor. */
function kick(ctx, p, r) {
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: ["#2a2c30", "#1c1e22", "#0e0f11"], bevel: 3, ink: 2, spec: false });
  const flecks = ["rgba(150,156,164,0.55)", "rgba(80,110,170,0.6)", "rgba(220,190,80,0.45)"];
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = flecks[i % 3];
    ctx.fillRect(r() * T, KICK + 6 + r() * (T - KICK - 10), 2, 2);
  }
}

/** Painted block over a navy dado, the PD gold stripe between them. */
function gymWall(ctx, p, r, { colour = PAINT, dado = NAVY } = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, DADO, [[0, colour[2]], [0.4, colour[1]], [1, colour[0]]]);
  ctx.fillRect(0, 0, T, DADO);
  ctx.fillStyle = lin(ctx, 0, DADO, 0, KICK, [[0, dado[0]], [1, dado[2]]]);
  ctx.fillRect(0, DADO, T, KICK - DADO);
  // Block courses, half-bond.
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  for (let y = 22; y < KICK; y += 56) ctx.fillRect(0, y, T, 2);
  for (let row = 0, y = 22; y < KICK; row++, y += 56) {
    for (let x = row % 2 ? 64 : 0; x < T; x += 128) ctx.fillRect(x, y, 2, 56);
  }
  relief((g) => {
    g.fillStyle = grey(8);
    for (let y = 22; y < KICK; y += 56) g.fillRect(0, y, T, 2);
  }, "difference");
  // Ceiling trim and the stripe.
  ctx.fillStyle = "#232a34";
  ctx.fillRect(0, 0, T, 14);
  plate(ctx, 0, DADO - 8, T, 10, p, { tones: ["#f0cf5a", "#e0b83a", "#a8841e"], bevel: 2, ink: 1.5, spec: false });
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, 20 + r() * (KICK - 30), 3 + r() * 36, 1 + r() * 3);
  }
  // Scuffs where shoes and plates have hit the dado.
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(10,12,16,${0.12 + r() * 0.15})`;
    ctx.fillRect(r() * T, KICK - 30 + r() * 26, 8 + r() * 30, 2);
  }
  kick(ctx, p, r);
}

/** Screen-space text plate: a raised sign with its lettering on it. */
function sign(ctx, p, x, y, w, h, text, size, o = {}) {
  plate(ctx, x, y, w, h, p, { tones: o.tones || ["#20262e", "#161a20", "#0a0c10"], bevel: o.bevel ?? 4, ink: 3 });
  letter(ctx, text, x + w / 2, y + h / 2 + 1, size, o.color || "#f2f2ee", o.weight ?? 900);
}

/** Tape across a poster's or paper's corner. */
function tape(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = "rgba(236,230,200,0.75)";
  ctx.fillRect(-16, -6, 32, 12);
  ctx.restore();
}

// ── Gym ──────────────────────────────────────────────────────────

/** Mirror glass: the gym behind you in it, ceiling lamps, the far wall, the floor, glare. */
function mirrorGlass(ctx, x, y, w, h, r) {
  const hz = y + h * 0.42; // the far wall's top, in the glass
  const fl = y + h * 0.74; // and its foot
  // Reflected ceiling: dark, its lamp rows receding to the far wall.
  ctx.fillStyle = lin(ctx, 0, y, 0, hz, [[0, "#1e2836"], [1, "#2c3a4c"]]);
  ctx.fillRect(x, y, w, hz - y);
  ctx.fillStyle = "rgba(240,248,255,0.85)";
  for (const [ly, lh, lw] of [[y + 12, 9, 150], [y + 46, 6, 96], [y + 70, 4, 60], [y + 86, 3, 40]]) {
    for (const cx of [x + w * 0.25, x + w * 0.75]) ctx.fillRect(cx - lw / 2, ly, lw, lh);
  }
  // The far wall: paint, the gold stripe, the navy dado, a doorway's dark.
  ctx.fillStyle = lin(ctx, 0, hz, 0, fl, [[0, "#8a96a2"], [0.55, "#7a8692"], [0.56, "#c8a83a"], [0.6, "#34486c"], [1, "#24324c"]]);
  ctx.fillRect(x, hz, w, fl - hz);
  ctx.fillStyle = "#151a22";
  ctx.fillRect(x + w * 0.62, hz + 10, 40, fl - hz - 10);
  ctx.fillStyle = "rgba(30,40,60,0.6)";
  ctx.fillRect(x + w * 0.18, hz + 12, 44, 30);
  ctx.fillRect(x + w * 0.36, hz + 16, 30, 24);
  // Reflected floor, the lamps' sheen on it.
  ctx.fillStyle = lin(ctx, 0, fl, 0, y + h, [[0, "#1a2028"], [1, "#2a3440"]]);
  ctx.fillRect(x, fl, w, y + h - fl);
  ctx.fillStyle = "rgba(200,220,240,0.18)";
  for (const cx of [x + w * 0.25, x + w * 0.75]) ctx.fillRect(cx - 40, fl + 18, 80, 6);
  // Glare across the glass.
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (const x0 of [x + 60 + r() * 40, x + w * 0.55 + r() * 40]) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + 40, y);
    ctx.lineTo(x0 - 30, y + h);
    ctx.lineTo(x0 - 70, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y, w, 2);
}

/** The mirror wall: chrome-framed glass from shin to above head height. */
function paintMirror(ctx, p, r, variant) {
  gymWall(ctx, p, r);
  const x = 12;
  const y = 60;
  const w = T - 24;
  const h = KICK - 36 - y;
  plate(ctx, x - 6, y - 6, w + 12, h + 12, p, CHROME);
  plate(ctx, x, y, w, h, p, { tones: ["#9fb2c2", "#7e92a2", "#3a4450"], bevel: 1, ink: 1, spec: false });
  mirrorGlass(ctx, x + 2, y + 2, w - 4, h - 4, r);
  if (variant === 0) {
    // Two panes, butted on a chrome seam, with their clips.
    plate(ctx, T / 2 - 4, y - 6, 8, h + 12, p, CHROME);
    for (const cx of [60, T / 2 - 40, T / 2 + 40, T - 60]) {
      plate(ctx, cx - 10, y - 8, 20, 12, p, CHROME);
      plate(ctx, cx - 10, y + h - 4, 20, 12, p, CHROME);
    }
  } else {
    // The stretch bar across the glass on its brackets, a sticker by the edge.
    for (const bx of [50, T - 66]) plate(ctx, bx, 262, 16, 40, p, STEEL);
    plate(ctx, 20, 268, T - 40, 14, p, CHROME);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(24, 271, T - 48, 2);
    plate(ctx, S(96) - 66, 330, 132, 44, p, { tones: ["#e8c23a", "#d4ac22", "#a88416"], bevel: 3, ink: 2 });
    letter(ctx, "CHECK YOUR FORM", S(96), 346, 12, "#1a1c20");
    letter(ctx, "NOT YOUR PHONE", S(96), 362, 10, "#1a1c20", 700);
  }
}

/** Plain block wall: a conduit and its socket, an inspection tag. */
function paintBlock(ctx, p, r) {
  gymWall(ctx, p, r);
  plate(ctx, S(70), 14, 14, 360, p, STEEL);
  plate(ctx, S(70) - 26, 360, 40, 54, p, { tones: ["#e8e8e2", "#d4d4cc", "#a8a8a0"], bevel: 3, ink: 2 });
  for (const dy of [374, 396]) {
    ctx.fillStyle = "#26282c";
    ctx.fillRect(S(70) - 14, dy, 4, 8);
    ctx.fillRect(S(70) - 2, dy, 4, 8);
  }
}

/** The PT board: this month's course times, the cadet's row still empty. */
function paintPTBoard(ctx, p, r) {
  gymWall(ctx, p, r);
  plate(ctx, 24, 40, T - 48, 330, p, CHROME);
  plate(ctx, 32, 48, T - 64, 314, p, { tones: ["#f8f8f4", "#eeeee8", "#d4d4cc"], bevel: 2, ink: 1.5, spec: false });
  plate(ctx, 32, 48, T - 64, 50, p, { tones: ["#c8322a", "#b02820", "#7a1812"], bevel: 2, ink: 1.5 });
  letter(ctx, "PT · OBSTACLE COURSE", T / 2, 66, 22, "#ffffff");
  letter(ctx, "BEST TIMES · OCTOBER", T / 2, 88, 12, "#ffd8d0", 700);
  const rows = [["1  KAEL", "0:14.2"], ["2  TANAKA", "0:15.8"], ["3  RASCZAK", "0:16.1"], ["4  MBEKI", "0:17.9"], ["5  PRICE", "0:19.6"]];
  rows.forEach(([n, t], i) => {
    const y = 124 + i * 34;
    ctx.fillStyle = "rgba(30,50,110,0.12)";
    ctx.fillRect(48, y + 14, T - 96, 2);
    letter(ctx, n, S(150), y, 19, "#1e3a8a", 800);
    letter(ctx, t, S(T - 110), y, 19, "#1e3a8a", 800);
  });
  // The cadet's line, in another marker.
  letter(ctx, "6  11235", S(150), 300, 19, "#d0461a", 800);
  letter(ctx, "— : —", S(T - 110), 300, 19, "#d0461a", 800);
  letter(ctx, "PASS UNDER 0:20.0", T / 2, 336, 13, "#2a2c30", 800);
  // Marker tray and a marker in it.
  plate(ctx, 60, 362, T - 120, 12, p, STEEL);
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(S(200), 356, 46, 7);
  ctx.fillStyle = "#c8322a";
  ctx.fillRect(S(290), 356, 40, 7);
}

/** The in-house poster: TRAIN LIKE TIME IS SHORT, a clock run down to the wire. */
function paintPoster(ctx, p, r) {
  gymWall(ctx, p, r);
  const x = 96;
  const y = 40;
  const w = T - 192;
  const h = 370;
  plate(ctx, x, y, w, h, p, { tones: ["#1c2a48", "#14203a", "#0a1226"], bevel: 4, ink: 3 });
  // The clock, its hands at a minute to.
  const cx = T / 2;
  const cy = y + 138;
  plate(ctx, cx - 74, cy - 74, 148, 148, p, { tones: ["#f2ece0", "#e2dccc", "#bab4a4"], bevel: 4, ink: 3 });
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * 52, cy - Math.cos(a) * 52);
    ctx.lineTo(cx + Math.sin(a) * 62, cy - Math.cos(a) * 62);
    ctx.stroke();
  }
  ctx.fillStyle = "#c8322a";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 48, -Math.PI / 2 - 0.1, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - 46);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 6, cy - 34);
  ctx.stroke();
  ctx.fillStyle = "#1a1c20";
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
  letter(ctx, "TRAIN LIKE", T / 2, y + 250, 34, "#f4f0e4");
  letter(ctx, "TIME IS SHORT", T / 2, y + 290, 34, "#f0cf5a");
  letter(ctx, "(IT IS.)", T / 2, y + 324, 16, "#c8d2e4", 700);
  letter(ctx, "CHRONOS PD · TEMPORAL CRIMES DIVISION", T / 2, y + 352, 10, "#8a9ab8", 700);
  tape(ctx, x + 6, y + 6, -0.6);
  tape(ctx, x + w - 6, y + 6, 0.6);
}

/** The notice board: cork, the orders of the week pinned to it. */
function paintNotices(ctx, p, r) {
  gymWall(ctx, p, r);
  plate(ctx, 30, 56, T - 60, 330, p, { tones: ["#7a5a38", "#5c4228", "#3a2a18"], bevel: 4, ink: 3 });
  plate(ctx, 42, 68, T - 84, 306, p, { tones: ["#c49a64", "#b08654", "#8a6638"], bevel: 2, ink: 1.5, spec: false, recess: true });
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(80,50,20,0.25)" : "rgba(240,210,160,0.18)";
    ctx.fillRect(44 + r() * (T - 88), 70 + r() * 302, 2, 2);
  }
  const notes = [
    [60, 84, 190, 120, ["ANNUAL PT TEST", "TUESDAY 0600", "NO EXCUSES"], "#c8322a"],
    [268, 92, 180, 92, ["SPOTTER", "REQUIRED ON", "THE BENCH"], "#1e3a8a"],
    [74, 222, 170, 92, ["WIPE DOWN", "WHAT YOU USE"], "#1a1c20"],
    [262, 204, 192, 150, ["INDUCTION", "CADET 11235", "TODAY", "— SUPERVISOR"], "#d0461a"],
  ];
  for (const [sx, y, w, h, lines, c] of notes) {
    const x = S(sx + w);
    plate(ctx, x, y, w, h, p, PAPER);
    lines.forEach((t, i) => letter(ctx, t, x + w / 2, y + 22 + i * 24, i === 0 ? 17 : 14, c, i === 0 ? 900 : 700));
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 7, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  sign(ctx, p, 90, 330, 160, 34, "GYM 0500 – 2300", 14, { tones: ["#2c4268", "#1c2c48", "#0e1828"] });
}

/** Cubbies: a wooden unit, folded towels, kit bags, trainers, a name on each. */
function paintCubbies(ctx, p, r) {
  gymWall(ctx, p, r);
  const x0 = 24;
  const y0 = 120;
  const w = T - 48;
  const h = KICK - y0;
  plate(ctx, x0, y0, w, h, p, { tones: ["#b48a5a", "#9a7446", "#6a4e2c"], bevel: 4, ink: 3 });
  const cols = 3;
  const rows = 3;
  const cw = (w - 16) / cols;
  const ch = (h - 16) / rows;
  const names = ["KAEL", "DUARTE", "TANAKA", "OKAFOR", "PRICE", "MBEKI", "ABARA", "LINDQVIST", "11235"];
  const towels = ["#e8ecf0", "#2c4268", "#c8322a", "#e8c23a"];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + 8 + i * cw;
    const y = y0 + 8 + j * ch;
    plate(ctx, x + 4, y + 4, cw - 8, ch - 30, p, { tones: ["#3a2a18", "#2a1e10", "#160f08"], bevel: 3, ink: 2, recess: true });
    const k = (i + j * cols) % 4;
    const bx = x + 14;
    const by = y + ch - 34;
    if (k === 0 || k === 2) {
      // Folded towels, stacked.
      for (let t = 0; t < 3; t++) {
        plate(ctx, bx + 4 + (t % 2) * 4, by - 18 - t * 18, cw - 44, 18, p, { tones: [towels[(i + j + t) % 4], towels[(i + j + t) % 4], "rgba(0,0,0,0.35)"], bevel: 3, ink: 1.5, spec: false });
      }
    } else if (k === 1) {
      // A kit bag with its strap.
      plate(ctx, bx, by - 52, cw - 36, 52, p, { tones: ["#2a2e36", "#1c1f24", "#0e1013"], bevel: 6, ink: 2 });
      ctx.strokeStyle = "#0a0b0d";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bx + (cw - 36) / 2, by - 50, 22, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = "#e8c23a";
      ctx.fillRect(bx + 10, by - 30, cw - 56, 4);
    } else {
      // Trainers, and a bottle.
      for (const sx of [0, 38]) {
        plate(ctx, bx + sx, by - 22, 36, 22, p, { tones: ["#e8ecf0", "#c8ccd2", "#8a9098"], bevel: 3, ink: 2, spec: false });
        ctx.fillStyle = "#2c4268";
        ctx.fillRect(bx + sx + 6, by - 14, 22, 3);
      }
      plate(ctx, bx + 88, by - 60, 22, 60, p, { tones: ["#3aa0d8", "#2a80b8", "#1a5a88"], bevel: 3, ink: 2 });
    }
    // Name tag on the shelf edge.
    plate(ctx, x + cw / 2 - 40, y + ch - 24, 80, 18, p, PAPER);
    letter(ctx, names[(i + j * cols) % names.length], x + cw / 2, y + ch - 15, 11, "#1a1c20", 800);
  }
}

/** The towel lockers: three short steel doors, the middle one open on clean towels. */
function paintTowels(ctx, p, r) {
  gymWall(ctx, p, r);
  sign(ctx, p, 120, 46, T - 240, 44, "CLEAN TOWELS", 22, { tones: ["#2c4268", "#1c2c48", "#0e1828"] });
  const y = 120;
  const h = KICK - y;
  const dw = (T - 48) / 3;
  plate(ctx, 18, y - 6, T - 36, h + 6, p, { tones: ["#5a6a82", "#44526a", "#26304a"], bevel: 3, ink: 3 });
  for (let i = 0; i < 3; i++) {
    const x = 24 + i * dw;
    if (i === 1) {
      plate(ctx, x + 4, y + 4, dw - 8, h - 10, p, { tones: ["#20262e", "#161a20", "#0a0c10"], bevel: 4, ink: 2, recess: true });
      for (const sy of [y + 120, y + 230]) plate(ctx, x + 8, sy, dw - 16, 8, p, STEEL);
      // Towels, folded and stacked on each shelf.
      for (const [sy, n] of [[y + 120, 4], [y + 230, 3], [y + h - 16, 2]]) {
        for (let t = 0; t < n; t++) {
          plate(ctx, x + 18 + (t % 2) * 3, sy - 20 - t * 20, dw - 36, 20, p, { tones: ["#f2f4f6", "#dfe3e8", "#9aa0a8"], bevel: 4, ink: 1.5, spec: false });
        }
      }
      continue;
    }
    plate(ctx, x + 4, y + 4, dw - 8, h - 10, p, { tones: ["#6a7c96", "#54647e", "#323e56"], bevel: 4, ink: 2 });
    vents(ctx, x + 24, y + 30, dw - 48, 60, 6, p);
    vents(ctx, x + 24, y + h - 90, dw - 48, 60, 6, p);
    plate(ctx, x + dw / 2 - 34, y + 150, 68, 26, p, PAPER);
    letter(ctx, i === 0 ? "TOWELS" : "USED", x + dw / 2, y + 164, 13, "#1a1c20");
    plate(ctx, i === 0 ? x + dw - 26 : x + 14, y + 190, 10, 46, p, CHROME);
  }
}

/** The water fountain and bottle filler, stainless, its filter lamp green. */
function paintFountain(ctx, p, r) {
  gymWall(ctx, p, r);
  sign(ctx, p, 156, 38, 200, 40, "HYDRATE", 22, { tones: ["#2a80b8", "#1a5a88", "#0e3a5a"] });
  // Bottle filler: a recessed alcove, its sensor and counter.
  plate(ctx, 150, 96, 212, 196, p, { tones: ["#c8d0d8", "#a0a8b2", "#5a626c"], bevel: 4, ink: 3 });
  plate(ctx, 174, 130, 164, 140, p, { tones: ["#4a525c", "#363c44", "#1a1e24"], bevel: 4, ink: 2, recess: true });
  plate(ctx, 236, 136, 40, 18, p, STEEL);
  ctx.fillStyle = "rgba(160,210,255,0.55)";
  ctx.fillRect(254, 156, 4, 60);
  plate(ctx, 186, 102, 140, 24, p, { tones: ["#101418", "#0a0d10", "#050608"], bevel: 2, ink: 1.5 });
  emit((g) => g.fillRect(192, 106, 128, 16));
  ctx.fillStyle = "#0c1a10";
  ctx.fillRect(192, 106, 128, 16);
  letter(ctx, "BOTTLES SAVED 4,211", T / 2, 114, 10, "#7cff9a", 700);
  led(ctx, S(190), 280, 5, "#3aff6a");
  // The fountain: a stainless bowl at waist height on its housing.
  plate(ctx, 128, 300, 256, 34, p, { tones: ["#dde3ea", "#b0b8c2", "#68707a"], bevel: 6, ink: 3 });
  plate(ctx, 164, 334, 184, 110, p, { tones: ["#b0b8c2", "#8a929c", "#4a525c"], bevel: 4, ink: 3 });
  vents(ctx, 194, 360, 124, 50, 5, p);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(196, 306, 120, 8);
  plate(ctx, S(150) - 20, 290, 30, 14, p, CHROME);
  plate(ctx, 156, 316, 30, 18, p, CHROME);
}

/** The TV on its bracket: the station feed, a ticker about the missing exhibit. */
function paintTV(ctx, p, r) {
  gymWall(ctx, p, r);
  plate(ctx, T / 2 - 30, 30, 60, 40, p, STEEL);
  const x = 40;
  const y = 64;
  const w = T - 80;
  const h = 250;
  plate(ctx, x, y, w, h, p, { tones: ["#2a2c30", "#1a1c20", "#0a0b0d"], bevel: 5, ink: 3 });
  const sx = x + 14;
  const sy = y + 14;
  const sw = w - 28;
  const sh = h - 40;
  emit((g) => g.fillRect(sx, sy, sw, sh));
  ctx.fillStyle = lin(ctx, 0, sy, 0, sy + sh, [[0, "#1a3a6a"], [1, "#0c1a34"]]);
  ctx.fillRect(sx, sy, sw, sh);
  // Station feed: the sim hall on camera, a LIVE bug, the ticker.
  ctx.fillStyle = "#2a4a7a";
  ctx.fillRect(sx + 20, sy + 40, sw - 40, sh - 110);
  ctx.fillStyle = "#0c1a34";
  for (let i = 0; i < 5; i++) ctx.fillRect(sx + 40 + i * 70, sy + 80 + (i % 2) * 20, 30, sh - 170 - (i % 2) * 20);
  ctx.fillStyle = "#c8322a";
  ctx.fillRect(S(sx + 74), sy + 10, 60, 22);
  letter(ctx, "LIVE", S(sx + 44), sy + 21, 14, "#ffffff");
  letter(ctx, "SIM HALL · CAM 2", S(sx + 190), sy + 21, 14, "#d8e4f8", 800);
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(sx, sy + sh - 54, sw, 24);
  letter(ctx, "STATION NOTICE", S(sx + 70), sy + sh - 42, 12, "#1a1c20");
  ctx.fillStyle = "#0a0c12";
  ctx.fillRect(sx, sy + sh - 30, sw, 30);
  letter(ctx, "EXHIBIT 7-R NOT RETURNED TO PROPERTY · ANY INFO: SGT. OKAFOR", T / 2, sy + sh - 15, 11, "#f2f2ee", 700);
  led(ctx, S(x + 24), y + h - 14, 3, "#3aff6a");
  letter(ctx, "CHRONOS", T / 2, y + h - 13, 9, "#6a7080", 700);
}

// ── Evidence ─────────────────────────────────────────────────────

const CARD = ["#b48a5a", "#9a7446", "#6a4e2c"];

/** An evidence tag: white card, red band, a case number. */
function tag(ctx, p, x, y, w, num) {
  plate(ctx, x, y, w, 26, p, PAPER);
  ctx.fillStyle = "#c8322a";
  ctx.fillRect(x + 2, y + 2, w - 4, 8);
  letter(ctx, num, x + w / 2, y + 18, 10, "#1a1c20", 800);
}

/** A sealed evidence bag, the thing in it, its red tape. */
function bag(ctx, p, x, y, w, h, item) {
  plate(ctx, x, y, w, h, p, { tones: ["#c8d2da", "#a8b4be", "#6a7680"], bevel: 2, ink: 1.5, spec: false });
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + 4, y + 4, w * 0.3, h - 8);
  ctx.fillStyle = "#c8322a";
  ctx.fillRect(x, y + 6, w, 6);
  ctx.fillStyle = "#2a2c30";
  const cx = x + w / 2;
  const cy = y + h / 2 + 6;
  if (item === "watch") {
    ctx.strokeStyle = "#b08a3a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#e8d8a8";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (item === "gear") {
    ctx.fillStyle = "#8a6a3a";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillRect(cx + Math.cos(a) * 12 - 3, cy + Math.sin(a) * 12 - 3, 6, 6);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - 18, cy - 3, 36, 6);
    ctx.fillRect(cx + 10, cy - 3, 8, 14);
  }
}

/** Steel shelving uprights and shelves across the face. */
function shelving(ctx, p, ys) {
  for (const x of [14, T / 2 - 8, T - 30]) plate(ctx, x, 40, 16, KICK - 40, p, STEEL);
  for (const y of ys) plate(ctx, 14, y, T - 28, 12, p, STEEL);
}

/** Dark evidence-room wall behind the shelving. */
function evidenceWall(ctx, p, r) {
  gymWall(ctx, p, r, { colour: ["#5a626c", "#4c545e", "#3c434c"], dado: ["#3c434c", "#30363e", "#22272e"] });
}

/** Shelving of archive boxes and bags, tagged with case numbers. */
function paintShelves(ctx, p, r, variant) {
  evidenceWall(ctx, p, r);
  const ys = [150, 290, 430];
  shelving(ctx, p, ys);
  const cases = variant ? ["TC-0412", "TC-0419", "TC-0388", "TC-0501", "TC-0277", "TC-0433"] : ["TC-0233", "TC-0347", "TC-0465", "TC-0512", "TC-0298", "TC-0390"];
  ys.forEach((sy, row) => {
    for (let i = 0; i < 2; i++) {
      const bx = 34 + i * (T / 2 - 12);
      const bw = T / 2 - 50;
      if ((row + i + variant) % 3 === 2) {
        // Bags laid on the shelf.
        const items = ["watch", "gear", "tool"];
        for (let k = 0; k < 3; k++) bag(ctx, p, bx + k * (bw / 3) + 4, sy - 66, bw / 3 - 10, 62, items[(k + row + variant) % 3]);
        continue;
      }
      if (variant && row === 0 && i === 1) {
        // A long hard case on the top shelf, stencilled.
        plate(ctx, bx, sy - 54, bw, 50, p, { tones: ["#3a4a3a", "#2a382a", "#162016"], bevel: 4, ink: 2 });
        letter(ctx, "CHRONO-DEVICE", bx + bw / 2, sy - 36, 12, "#e8e0c8");
        letter(ctx, "DO NOT WIND", bx + bw / 2, sy - 18, 10, "#e8c23a", 800);
        continue;
      }
      // Two archive boxes, lids on, a tag on each.
      for (let k = 0; k < 2; k++) {
        const x = bx + k * (bw / 2);
        const h = 86 - ((k + row) % 2) * 12;
        plate(ctx, x + 2, sy - h, bw / 2 - 6, h, p, { tones: CARD, bevel: 3, ink: 2 });
        plate(ctx, x, sy - h - 8, bw / 2 - 2, 12, p, { tones: ["#c49a64", "#a88050", "#705430"], bevel: 2, ink: 1.5 });
        ctx.fillStyle = "rgba(40,24,10,0.5)";
        ctx.fillRect(x + bw / 4 - 14, sy - h + 10, 26, 8);
        tag(ctx, p, x + 8, sy - 38, bw / 2 - 22, cases[(row * 2 + i + k) % cases.length]);
      }
    }
  });
}

/** Chain-link mesh over a steel frame, lockers dim behind it. */
function mesh(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(196,204,212,0.55)";
  ctx.lineWidth = 2;
  for (let k = -h; k < w + h; k += 18) {
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.lineTo(x + k + h, y + h);
    ctx.moveTo(x + k, y + h);
    ctx.lineTo(x + k + h, y);
    ctx.stroke();
  }
  ctx.restore();
  relief((g) => {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.strokeStyle = grey(14);
    g.lineWidth = 2;
    for (let k = -h; k < w + h; k += 18) {
      g.beginPath();
      g.moveTo(x + k, y);
      g.lineTo(x + k + h, y + h);
      g.moveTo(x + k, y + h);
      g.lineTo(x + k + h, y);
      g.stroke();
    }
    g.restore();
  });
}

/** What shows through the cage: shelves of boxes, in shadow. */
function behindMesh(ctx, p, r, x, y, w, h) {
  plate(ctx, x, y, w, h, p, { tones: ["#1a1e24", "#14171c", "#0a0c0f"], bevel: 3, ink: 2, recess: true });
  for (const sy of [y + h * 0.33, y + h * 0.66, y + h - 10]) {
    ctx.fillStyle = "#3a4048";
    ctx.fillRect(x, sy, w, 6);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `rgba(${130 + r() * 30},${96 + r() * 20},${60},0.55)`;
      const bw = w / 4 - 12;
      const bh = 40 + r() * 30;
      ctx.fillRect(x + 6 + k * (w / 4), sy - bh, bw, bh);
      ctx.fillStyle = "rgba(240,240,230,0.5)";
      ctx.fillRect(x + 12 + k * (w / 4), sy - 22, bw - 12, 10);
    }
  }
}

/** The cage wall: steel posts, mesh panels, the property sign. */
function paintCage(ctx, p, r) {
  evidenceWall(ctx, p, r);
  behindMesh(ctx, p, r, 20, 30, T - 40, KICK - 40);
  mesh(ctx, 20, 30, T - 40, KICK - 40);
  for (const x of [8, T / 2 - 8, T - 24]) plate(ctx, x, 20, 16, KICK - 20, p, STEEL);
  for (const y of [20, 240, KICK - 16]) plate(ctx, 8, y, T - 16, 14, p, STEEL);
  plate(ctx, 120, 196, T - 240, 72, p, { tones: ["#f0cf5a", "#e0b83a", "#a8841e"], bevel: 4, ink: 3 });
  letter(ctx, "PROPERTY", T / 2, 220, 24, "#1a1c20");
  letter(ctx, "AUTHORISED PERSONNEL ONLY", T / 2, 248, 12, "#1a1c20", 800);
}

/** The cage door: hinged mesh, a hasp and a padlock that has not been opened in years. */
function paintCageDoor(ctx, p, r) {
  evidenceWall(ctx, p, r);
  behindMesh(ctx, p, r, 80, 40, T - 160, KICK - 50);
  mesh(ctx, 80, 40, T - 160, KICK - 50);
  for (const x of [56, T - 80]) plate(ctx, x, 20, 24, KICK - 20, p, STEEL);
  plate(ctx, 56, 20, T - 112, 22, p, STEEL);
  plate(ctx, 80, 250, T - 160, 14, p, STEEL);
  for (const y of [80, 380]) plate(ctx, S(80) - 6, y, 18, 40, p, CHROME);
  // Hasp, padlock, its rust.
  plate(ctx, S(T - 80) - 6, 232, 42, 50, p, STEEL);
  plate(ctx, S(T - 104) - 22, 270, 44, 40, p, { tones: ["#c8a24a", "#a8822a", "#6a5018"], bevel: 4, ink: 2 });
  ctx.strokeStyle = "#8a929c";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(S(T - 104), 270, 14, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = "rgba(120,60,24,0.5)";
  ctx.fillRect(S(T - 104) - 6, 296, 4, 30);
  sign(ctx, p, 120, 100, T - 240, 60, "EVIDENCE CAGE", 22, { tones: ["#c8322a", "#a82820", "#6a1812"] });
  plate(ctx, 150, 168, T - 300, 30, p, PAPER);
  letter(ctx, "KEY: DESK SERGEANT", T / 2, 183, 12, "#1a1c20", 800);
}

/** The log: chain of custody, the clipboard, the last line nobody signed. */
function paintLog(ctx, p, r) {
  evidenceWall(ctx, p, r);
  sign(ctx, p, 60, 40, T - 120, 54, "CHAIN OF CUSTODY", 22, { tones: ["#2c4268", "#1c2c48", "#0e1828"] });
  letter(ctx, "EVERY ITEM · EVERY TIME", T / 2, 108, 12, "#e2e6ec", 800);
  plate(ctx, T / 2 - 120, 126, 240, 300, p, { tones: ["#7a5a38", "#5c4228", "#3a2a18"], bevel: 3, ink: 2 });
  plate(ctx, T / 2 - 108, 146, 216, 270, p, PAPER);
  plate(ctx, T / 2 - 36, 118, 72, 22, p, CHROME);
  letter(ctx, "EVIDENCE LOG · PROPERTY ROOM B", T / 2, 164, 11, "#1a1c20");
  const lines = [
    ["TC-0412", "IN", "OKAFOR"],
    ["TC-0419", "IN", "DUARTE"],
    ["TC-0433", "OUT", "LAB"],
    ["TC-0433", "IN", "LAB"],
    ["7-R RICOCHET", "IN", "OKAFOR"],
    ["7-R RICOCHET", "OUT", "? ? ?"],
  ];
  lines.forEach(([c, d, n], i) => {
    const y = 196 + i * 32;
    ctx.fillStyle = "rgba(30,50,110,0.18)";
    ctx.fillRect(T / 2 - 100, y + 12, 200, 1.5);
    const col = i === lines.length - 1 ? "#c8322a" : "#1e3a8a";
    letter(ctx, c, S(T / 2 - 100 + 50), y, 11, col, 800);
    letter(ctx, d, S(T / 2 + 10), y, 11, col, 800);
    letter(ctx, n, S(T / 2 + 64), y, 11, col, 800);
  });
  // A pen on a string.
  ctx.strokeStyle = "#2a2c30";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(S(T / 2 + 120), 150);
  ctx.quadraticCurveTo(S(T / 2 + 150), 320, S(T / 2 + 140), 380);
  ctx.stroke();
  plate(ctx, S(T / 2 + 140) - 4, 380, 8, 40, p, { tones: ["#1e3a8a", "#16306a", "#0c1a40"], bevel: 1, ink: 1 });
}

// ── Observation deck ─────────────────────────────────────────────

/** Deck wall: dark acoustic panels over a rail, so the glass is the brightest thing. */
function deckWall(ctx, p, r) {
  ctx.fillStyle = "#1a1e26";
  ctx.fillRect(0, 0, T, T);
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 125;
    plate(ctx, x, 24, 119, 400, p, { tones: ["#3a4252", "#2e3442", "#1c212c"], bevel: 6, ink: 3 });
    for (let k = 0; k < 600; k++) {
      ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(x + 6 + r() * 107, 30 + r() * 388, 2, 1);
    }
  }
  for (const bx of [60, T - 76]) plate(ctx, bx, 300, 16, 34, p, STEEL);
  plate(ctx, 20, 300, T - 40, 14, p, CHROME);
  kick(ctx, p, r);
}

/** The deck's sign: OBSERVATION — SIM HALL, and the session lamp. */
function paintDeckSign(ctx, p, r) {
  deckWall(ctx, p, r);
  plate(ctx, 50, 70, T - 100, 150, p, { tones: ["#e8ecf0", "#d4d8de", "#a8aeb6"], bevel: 5, ink: 3 });
  plate(ctx, 50, 70, T - 100, 40, p, { tones: ["#2c4268", "#1c2c48", "#0e1828"], bevel: 3, ink: 2 });
  letter(ctx, "TRAINING · LEVEL 2", T / 2, 91, 14, "#e2e6ec", 800);
  letter(ctx, "OBSERVATION", T / 2, 140, 40, "#1a1c20");
  plate(ctx, 110, 166, T - 220, 42, p, { tones: ["#c8322a", "#a82820", "#6a1812"], bevel: 3, ink: 2 });
  letter(ctx, "SIM HALL  ▶", T / 2, 188, 26, "#ffffff");
  // Session lamp: SESSION IN PROGRESS, lit.
  plate(ctx, T / 2 - 120, 240, 240, 40, p, { tones: ["#2a0c0a", "#1a0706", "#0a0303"], bevel: 4, ink: 3 });
  lightStrip(ctx, T / 2 - 108, 248, 216, 24, "#ff3a2a", { blur: 18 });
  letter(ctx, "SESSION IN PROGRESS", T / 2, 261, 14, "#2a0806");
  plate(ctx, T / 2 - 90, 350, 180, 60, p, PAPER);
  letter(ctx, "QUIET PLEASE", T / 2, 370, 16, "#1a1c20");
  letter(ctx, "TRAINEES ON THE FLOOR", T / 2, 392, 10, "#5a5c60", 800);
}

export const PAINTERS = {
  60: (ctx, p, r) => paintMirror(ctx, p, r, 0),
  61: (ctx, p, r) => paintMirror(ctx, p, r, 1),
  62: paintBlock,
  63: paintPTBoard,
  64: paintPoster,
  65: paintNotices,
  66: paintCubbies,
  67: paintTowels,
  68: paintFountain,
  69: paintTV,
  70: paintCage,
  71: paintCageDoor,
  72: (ctx, p, r) => paintShelves(ctx, p, r, 0),
  73: (ctx, p, r) => paintShelves(ctx, p, r, 1),
  74: paintLog,
  75: deckWall,
  76: paintDeckSign,
};
