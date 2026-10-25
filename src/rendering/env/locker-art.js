/**
 * The Chronos PD station's own walls, painted like the rest of wall-art.js
 * (512×512, Canvas2D, a material in Realistic): the locker room's banks of
 * full-height lockers, two to a wall cell, each with its officer's name; the
 * gym's padded walls; the range's baffles.
 *
 * Some lockers stand open on what their officers keep in them: a uniform on
 * its hanger, a photo taped inside the door, a kid's drawing, a mug, a medal.
 * The cadet's has a lit twin (the prologue swaps the cell while it wants you
 * there) and an open one, once you have taken the suit out.
 *
 * The raycaster lays a wall texture across a face mirrored (texX runs against
 * the screen on every face), so lettering is painted mirrored to read right.
 */

import { INK } from "./palettes.js";
import { STATION_WALLS } from "../../data/walls.js";
import { T, lin, rad, plate, rivet, ink, lightStrip, led, vents, material, relief, grey, sink } from "./paint.js";


const TOP = 132; // the top of a locker bank (≈ 2.1 m of a 3 m wall)
const BASE = 478; // the plinth it stands on
const GAP = 6;

const NAVY = ["#3b5684", "#2a4068", "#1a2a48", "#0f1a30"];
const WALL = ["#5d6876", "#4a5462", "#353d48"];

/** Lettering, mirrored so the raycaster lays it the right way round. */
export function letter(ctx, text, x, y, size, color, weight = 900) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Painted wall above the lockers: two-tone, a trim line, a little grime. */
function wallAbove(ctx, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, TOP, [[0, WALL[2]], [0.5, WALL[1]], [1, WALL[0]]]);
  ctx.fillRect(0, 0, T, TOP);
  ctx.fillStyle = "#1c2430";
  ctx.fillRect(0, 26, T, 6);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 32, T, 2);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.fillRect(r() * T, 40 + r() * 80, 2 + r() * 30, 1 + r() * 2);
  }
  relief((g) => {
    g.fillStyle = grey(10);
    g.fillRect(0, 26, T, 6);
  }, "difference");
}

/** The bank's top cap and its plinth, across the whole cell. */
function bankFrame(ctx, p) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, TOP - 6, T, 8);
  plate(ctx, 0, TOP, T, 14, p, { tones: [NAVY[0], NAVY[1], NAVY[3]], bevel: 3, ink: 2, spec: true });
  plate(ctx, 0, BASE, T, T - BASE, p, { tones: ["#20242c", "#15181e", "#0b0d11"], bevel: 3, ink: 2, spec: false });
  ink(ctx, 0, BASE - 2, T, 3, 24);
}

/** One closed locker door in [x, x + w): louvres, name card, number, handle, lock. */
function closedDoor(ctx, p, r, x, w, name, num, { lit = false, sticker = null, deco = null } = {}) {
  const y = TOP + 14;
  const h = BASE - y;
  plate(ctx, x, y, w, h, p, { tones: [NAVY[0], NAVY[1], NAVY[2]], bevel: 5, ink: 3 });
  // Louvres, top and bottom.
  for (const [ly, n] of [[y + 18, 6], [y + h - 64, 5]]) {
    for (let i = 0; i < n; i++) {
      const yy = ly + i * 9;
      ink(ctx, x + w * 0.22, yy, w * 0.56, 3, 26);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(x + w * 0.22, yy + 3, w * 0.56, 1);
    }
  }
  // Name card in its brass holder, and the locker number. A spare has an
  // empty holder, a strip of old tape where a card was.
  const cy = y + 92;
  ctx.fillStyle = "#8a6a2a";
  ctx.fillRect(x + w * 0.16 - 3, cy - 13, w * 0.68 + 6, 26);
  if (name) {
    ctx.fillStyle = "#efe9da";
    ctx.fillRect(x + w * 0.16, cy - 10, w * 0.68, 20);
    letter(ctx, name, x + w / 2, cy + 1, name.length > 8 ? 14 : 16, "#141820");
  } else {
    ctx.fillStyle = "#1a1e26";
    ctx.fillRect(x + w * 0.16, cy - 10, w * 0.68, 20);
    ctx.fillStyle = "rgba(220,210,170,0.35)";
    ctx.fillRect(x + w * 0.16 + w * 0.68 * r(), cy - 8 + r() * 10, 10 + r() * 14, 5);
  }
  if (num != null) letter(ctx, String(num), x + w / 2, cy + 26, 12, "#9fb2cc", 700);
  // Recessed pull handle and the combination dial, on the latch side.
  const hx = x + w - 30;
  ink(ctx, hx, y + 150, 12, 70, 34);
  ctx.fillStyle = "#6c7c92";
  ctx.fillRect(hx + 2, y + 152, 8, 66);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(hx + 2, y + 152, 2, 66);
  rivet(ctx, hx + 6, y + 238, 7, { ...p, s0: "#0b0d11", s3: "#9aa8ba", s4: "#e2e8f0" });
  // Scuffs low on the door, where boots and bags hit it.
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`;
    ctx.fillRect(x + 8 + r() * (w - 30), y + h - 90 + r() * 70, 6 + r() * 18, 1);
  }
  if (deco) doorDeco(ctx, deco, x + w * 0.45, y + 200);
  if (sticker === "rnd") {
    // The R&D delivery tag on the cadet's locker.
    ctx.save();
    ctx.translate(x + w * 0.42, y + 190);
    ctx.rotate(-0.08);
    ctx.fillStyle = "#f2d64a";
    ctx.fillRect(-34, -16, 68, 32);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-34, -16, 68, 7);
    letter(ctx, "R&D", 0, 4, 13, "#1a1a1a");
    ctx.restore();
  }
  if (lit) {
    // It wants you: the seam glows, the status light is on, light spills out.
    lightStrip(ctx, x + 6, y + 6, 4, h - 12, "#ffb24a", { blur: 22, housing: false, alpha: 0.95 });
    lightStrip(ctx, x + w - 10, y + 6, 4, h - 12, "#ffb24a", { blur: 22, housing: false, alpha: 0.95 });
    led(ctx, x + w / 2, y + 128, 5, "#ffb24a", true);
    ctx.save();
    ctx.globalCompositeOperation = material() ? "source-over" : "lighter";
    ctx.fillStyle = rad(ctx, x + w / 2, y + h - 10, 0, w * 0.9, [[0, "rgba(255,170,70,0.35)"], [1, "rgba(255,170,70,0)"]]);
    ctx.fillRect(x, y + h - 140, w, 140);
    ctx.restore();
  }
}

/** Something stuck to a shut door: a sticky note, a sticker, a photo, a magnet. */
function doorDeco(ctx, deco, x, y) {
  ctx.save();
  ctx.translate(x, y);
  if (deco.note) {
    ctx.rotate(0.06);
    ctx.fillStyle = "#f6e68c";
    ctx.fillRect(-26, -24, 52, 48);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(-26, 18, 52, 6);
    letter(ctx, deco.note, 0, -6, 10, "#1a2440", 700);
    ctx.strokeStyle = "#1a2440";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, 8);
    ctx.lineTo(14, 6);
    ctx.stroke();
  } else if (deco.sticker) {
    ctx.fillStyle = deco.sticker;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f0e6";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#f4f0e6";
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(0, -10);
    ctx.lineTo(8, 8);
    ctx.fill();
  } else if (deco.photo) {
    ctx.rotate(-0.1);
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(-22, -26, 44, 50);
    ctx.fillStyle = deco.photo;
    ctx.fillRect(-18, -22, 36, 34);
    ctx.fillStyle = "#e0b896";
    ctx.beginPath();
    ctx.arc(0, -6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(-8, -30, 16, 6);
  }
  ctx.restore();
}

/** What an officer keeps: each item is drawn into the open locker's cavity. */
const ITEMS = {
  /** A uniform shirt on its hanger, on the rail. */
  shirt(ctx, x, y, w, r, c = "#2a4068") {
    const cx = x + w / 2;
    ctx.strokeStyle = "#b8c0cc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, y + 6);
    ctx.lineTo(cx, y + 14);
    ctx.moveTo(cx - 34, y + 30);
    ctx.lineTo(cx, y + 14);
    ctx.lineTo(cx + 34, y + 30);
    ctx.stroke();
    ctx.fillStyle = lin(ctx, cx - 40, 0, cx + 40, 0, [[0, c], [0.5, shade(c, 18)], [1, shade(c, -30)]]);
    ctx.beginPath();
    ctx.moveTo(cx - 36, y + 30);
    ctx.lineTo(cx - 54, y + 70);
    ctx.lineTo(cx - 40, y + 78);
    ctx.lineTo(cx - 32, y + 64);
    ctx.lineTo(cx - 32, y + 170);
    ctx.lineTo(cx + 32, y + 170);
    ctx.lineTo(cx + 32, y + 64);
    ctx.lineTo(cx + 40, y + 78);
    ctx.lineTo(cx + 54, y + 70);
    ctx.lineTo(cx + 36, y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "#c9d4e6";
    ctx.beginPath();
    ctx.moveTo(cx - 12, y + 30);
    ctx.lineTo(cx, y + 46);
    ctx.lineTo(cx + 12, y + 30);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#d8b24a";
      ctx.beginPath();
      ctx.arc(cx, y + 56 + i * 22, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#d8b24a";
    ctx.fillRect(cx - 26, y + 58, 10, 12); // badge
  },
  /** A leather jacket, older, on its hook. */
  jacket(ctx, x, y, w, r) {
    ITEMS.shirt(ctx, x, y, w, r, "#4a3426");
  },
  /** A cap on the shelf. */
  cap(ctx, x, y, w) {
    const cx = x + w * 0.32;
    ctx.fillStyle = "#1c2c4c";
    ctx.beginPath();
    ctx.ellipse(cx, y, 26, 14, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#06080c";
    ctx.fillRect(cx - 30, y - 2, 60, 6);
    ctx.fillStyle = "#d8b24a";
    ctx.fillRect(cx - 4, y - 12, 8, 7);
  },
  /** A helmet of the squad's kit on the shelf. */
  helmet(ctx, x, y, w) {
    const cx = x + w * 0.62;
    ctx.fillStyle = lin(ctx, cx - 26, y - 34, cx + 26, y, [[0, "#5874a0"], [1, "#1a2a48"]]);
    ctx.beginPath();
    ctx.ellipse(cx, y - 2, 26, 30, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0a2a36";
    ctx.fillRect(cx - 20, y - 20, 40, 8);
  },
  /** Photographs, taped up: people the officer goes home to. */
  photos(ctx, x, y, w, r) {
    const shots = [["#7aa0c8", "#e0b896"], ["#a8c890", "#f0c8a0"], ["#e0b070", "#8a5a3a"]];
    shots.forEach(([sky, skin], i) => {
      ctx.save();
      ctx.translate(x + 26 + i * (w - 52) / 2, y + 18 + (i % 2) * 14);
      ctx.rotate((r() - 0.5) * 0.3);
      ctx.fillStyle = "#f4f0e6";
      ctx.fillRect(-20, -24, 40, 46);
      ctx.fillStyle = sky;
      ctx.fillRect(-16, -20, 32, 30);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-6, -4, 5, 0, Math.PI * 2);
      ctx.arc(7, -2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(-16, 4, 32, 6);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(-8, -27, 16, 6); // tape
      ctx.restore();
    });
  },
  /** A child's crayon drawing: a house, a sun, three stick figures. */
  drawing(ctx, x, y, w) {
    ctx.save();
    ctx.translate(x + w / 2, y + 30);
    ctx.rotate(0.05);
    ctx.fillStyle = "#fbfaf4";
    ctx.fillRect(-36, -28, 72, 56);
    ctx.strokeStyle = "#e0402a";
    ctx.lineWidth = 2.4;
    ctx.strokeRect(-24, -2, 22, 18);
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.lineTo(-13, -14);
    ctx.lineTo(0, -2);
    ctx.stroke();
    ctx.fillStyle = "#f2c230";
    ctx.beginPath();
    ctx.arc(24, -16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a5ac0";
    for (const sx of [8, 16, 24]) {
      ctx.beginPath();
      ctx.arc(sx, 4, 3, 0, Math.PI * 2);
      ctx.moveTo(sx, 7);
      ctx.lineTo(sx, 18);
      ctx.stroke();
    }
    ctx.restore();
  },
  /** A mug, a thermos, the things a shift runs on. */
  mug(ctx, x, y, w) {
    const mx = x + w * 0.72;
    ctx.fillStyle = "#e8e2d4";
    ctx.fillRect(mx - 12, y - 26, 24, 26);
    ctx.strokeStyle = "#e8e2d4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(mx + 14, y - 13, 7, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = "#2a4068";
    ctx.fillRect(mx - 12, y - 18, 24, 6);
  },
  /** A commendation medal on its ribbon, hung on the hook. */
  medal(ctx, x, y, w) {
    const mx = x + w * 0.8;
    ctx.fillStyle = "#c23a3a";
    ctx.fillRect(mx - 6, y, 5, 26);
    ctx.fillStyle = "#2a6ac2";
    ctx.fillRect(mx - 1, y, 5, 26);
    ctx.fillStyle = rad(ctx, mx - 3, y + 34, 0, 11, [[0, "#ffe9a0"], [1, "#a8822a"]]);
    ctx.beginPath();
    ctx.arc(mx - 1, y + 36, 10, 0, Math.PI * 2);
    ctx.fill();
  },
  /** Boots and a gym bag on the locker floor. */
  boots(ctx, x, y, w) {
    for (const bx of [x + 22, x + 54]) {
      ctx.fillStyle = "#121318";
      ctx.fillRect(bx, y - 50, 22, 46);
      ctx.fillRect(bx, y - 12, 32, 12);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(bx + 3, y - 48, 3, 36);
    }
    ctx.fillStyle = "#2c3a2c";
    ctx.beginPath();
    ctx.ellipse(x + w - 46, y - 24, 38, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  /** A lucky charm on a string: a little cat, waving. */
  charm(ctx, x, y, w) {
    const cx = x + w * 0.25;
    ctx.strokeStyle = "#d0c8b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + 24);
    ctx.stroke();
    ctx.fillStyle = "#f4f0e6";
    ctx.beginPath();
    ctx.arc(cx, y + 34, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0402a";
    ctx.fillRect(cx - 7, y + 40, 14, 4);
  },
  /** The cadet's own: the patrol cap from the old beat, the transfer order. */
  patrol(ctx, x, y, w) {
    ITEMS.cap(ctx, x, y, w);
    ctx.save();
    ctx.translate(x + w * 0.62, y + 70);
    ctx.rotate(-0.04);
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(-32, -40, 64, 80);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = "rgba(20,24,32,0.5)";
      ctx.fillRect(-26, -24 + i * 9, i === 0 ? 40 : 52 - (i % 3) * 8, 2);
    }
    letter(ctx, "TRANSFER", 0, -32, 9, "#a01010");
    ctx.fillStyle = "rgba(160,16,16,0.7)";
    ctx.beginPath();
    ctx.arc(14, 26, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

/** A colour lifted (+) or dropped (−) by `d` on each channel. */
function shade(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + d)).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

/**
 * One open locker in [x, x + w): the cavity with its shelf, rail and hook, the
 * officer's things, and the door swung out on the hinge side, its inside face
 * toward you with whatever is taped there.
 */
function openDoor(ctx, p, r, x, w, name, num, keep) {
  const y = TOP + 14;
  const h = BASE - y;
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#151b26"], [1, "#07090d"]]);
  ctx.fillRect(x, y, w, h);
  sink(x, y, w, h, 60);
  // Side walls in perspective, and the light from the room falling in.
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x, y, 10, h);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + w - 12, y, 12, h);
  // Shelf, rail, hook.
  const shelfY = y + 70;
  ctx.fillStyle = "#3a4658";
  ctx.fillRect(x + 6, shelfY, w - 12, 8);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x + 6, shelfY + 8, w - 12, 10);
  ctx.fillStyle = "#9aa8ba";
  ctx.fillRect(x + 10, shelfY + 26, w - 20, 4);
  const draw = (k, ax, ay, aw) => ITEMS[k]?.(ctx, ax, ay, aw, r);
  for (const k of keep) {
    if (k === "cap" || k === "helmet" || k === "mug" || k === "patrol") draw(k, x, shelfY, w);
    else if (k === "shirt" || k === "jacket") draw(k, x, shelfY + 26, w);
    else if (k === "photos" || k === "drawing") draw(k, x, y + 6, w);
    else if (k === "medal" || k === "charm") draw(k, x, shelfY + 30, w);
    else if (k === "boots") draw(k, x, y + h - 4, w);
  }
  // Frame lip round the opening, then the door: its inside, at an angle,
  // narrowed to a strip on the hinge side, the name card on its outside edge.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  const dw = 34;
  ctx.fillStyle = lin(ctx, x, 0, x + dw, 0, [[0, NAVY[3]], [1, NAVY[1]]]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dw, y + 18);
  ctx.lineTo(x + dw, y + h - 18);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "#efe9da";
  ctx.fillRect(x + 6, y + 84, dw - 12, 12);
  letter(ctx, String(num), x + dw / 2, y + 116, 10, "#9fb2cc", 700);
  // The name card shows on the door's edge; the officer's name is on the shelf tag too.
  ctx.fillStyle = "#efe9da";
  ctx.fillRect(x + w * 0.3, shelfY - 18, w * 0.4, 14);
  letter(ctx, name, x + w / 2, shelfY - 11, 11, "#141820");
}

/** A wall cell of two lockers. `left` and `right`: { name, num, open?: items[], lit?, sticker? }. */
function lockerPair(left, right, unit = null) {
  return (ctx, p, r) => {
    wallAbove(ctx, r);
    if (unit) letter(ctx, unit, T / 2, 82, 30, "rgba(232,237,245,0.7)");
    bankFrame(ctx, p);
    const half = (T - GAP * 3) / 2;
    for (const [L, x] of [[left, GAP], [right, GAP * 2 + half]]) {
      if (L.open) openDoor(ctx, p, r, x, half, L.name, L.num, L.open);
      else closedDoor(ctx, p, r, x, half, L.name, L.num, L);
    }
    // Brass name rail and the bank's number, up on the cap.
    vents(ctx, 200, TOP + 2, 112, 10, 3, p);
  };
}

const PAD = ["#4a6ea8", "#33528a", "#1f3560"];
const STEEL = { s0: "#0b0f18", s1: "#1a2232", s2: "#2a3448", s3: "#5a6a82", s4: "#c0ccdc" };

/** The gym's wall, upper part: light paint, a high window band of mirror. */
function gymUpper(ctx, r, board) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 230, [[0, "#6a7686"], [1, "#56616f"]]);
  ctx.fillRect(0, 0, T, 230);
  ctx.fillStyle = "#1c2430";
  ctx.fillRect(0, 22, T, 5);
  if (board) return;
  // Mirror: the room's lights caught in it, a streak of reflection.
  ctx.fillStyle = lin(ctx, 0, 52, 0, 214, [[0, "#c8dcea"], [0.35, "#8aa6bc"], [1, "#4a6478"]]);
  ctx.fillRect(10, 52, T - 20, 162);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (const x0 of [70, 300]) {
    ctx.beginPath();
    ctx.moveTo(x0, 52);
    ctx.lineTo(x0 + 46, 52);
    ctx.lineTo(x0 - 4, 214);
    ctx.lineTo(x0 - 50, 214);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(240,250,255,0.6)";
  ctx.fillRect(40, 70, 120, 6);
  ctx.fillRect(300, 70, 120, 6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 52, T - 20, 162);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
    ctx.fillRect(r() * T, 30 + r() * 20, 2 + r() * 20, 1);
  }
}

/** The gym's wall, lower part: quilted crash pads to shoulder height, a yellow rail. */
function gymPads(ctx, p) {
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(0, 222, T, 10);
  ctx.fillStyle = "#1a1a1a";
  for (let x = -20; x < T; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 232);
    ctx.lineTo(x + 20, 222);
    ctx.lineTo(x + 30, 222);
    ctx.lineTo(x + 10, 232);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const x = 6 + i * 125;
    plate(ctx, x, 238, 119, 232, p, { tones: PAD, bevel: 12, ink: 3 });
    // Quilting: the stitched diamond and its buttons.
    ctx.strokeStyle = "rgba(232,240,255,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x + 60, 254);
    ctx.lineTo(x + 104, 354);
    ctx.lineTo(x + 60, 454);
    ctx.lineTo(x + 16, 354);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    for (const yy of [304, 354, 404]) rivet(ctx, x + 60, yy, 4, { ...p, ...STEEL });
  }
  plate(ctx, 0, BASE, T, T - BASE, p, { tones: ["#20242c", "#15181e", "#0b0d11"], bevel: 3, ink: 2, spec: false });
}

function paintGym(ctx, p, r) {
  gymUpper(ctx, r, false);
  gymPads(ctx, p);
}

/** The PT board: the course's best times this month, the squad's names on it. */
function paintGymBoard(ctx, p, r) {
  gymUpper(ctx, r, true);
  plate(ctx, 30, 36, T - 60, 182, p, { tones: ["#1e2a20", "#16201a", "#0c120e"], bevel: 6, ink: 4 });
  letter(ctx, "PT · COURSE · BEST TIMES", T / 2, 60, 18, "#e8edf5");
  const rows = [["KAEL", "0:19.4"], ["RASCZAK", "0:21.0"], ["TANAKA", "0:22.7"], ["DUARTE", "0:24.1"], ["11235", "—"]];
  rows.forEach(([n, t], i) => {
    const y = 92 + i * 24;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(50, y - 10, T - 100, 20);
    letter(ctx, n, T - 150, y, 15, i === rows.length - 1 ? "#ffb24a" : "#cfe8d4", 700);
    letter(ctx, t, 140, y, 15, "#cfe8d4", 700);
  });
  gymPads(ctx, p);
}

/** A weight rack, the whole face: dumbbells in pairs on three shelves, plates on pegs. */
function paintGymRack(ctx, p, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, T, [[0, "#3a4250"], [1, "#22282f"]]);
  ctx.fillRect(0, 0, T, T);
  for (const x of [24, T - 48]) plate(ctx, x, 120, 24, 360, p, { tones: ["#5a6474", "#3a424e", "#1e242c"], bevel: 4, ink: 3 });
  const colors = ["#1a1a1e", "#2a2a30", "#3a1414", "#14243a"];
  [190, 290, 390].forEach((y, row) => {
    plate(ctx, 40, y, T - 80, 14, p, { tones: ["#7a8494", "#525c6a", "#2a3038"], bevel: 3, ink: 2 });
    for (let i = 0; i < 6; i++) {
      const cx = 78 + i * 60;
      const big = 10 + row * 4 + (i % 3) * 2;
      ctx.fillStyle = "#9aa4b2";
      ctx.fillRect(cx - 18, y - big / 2 - 4, 36, 6);
      for (const s of [-1, 1]) {
        ctx.fillStyle = colors[(i + row) % colors.length];
        ctx.beginPath();
        ctx.arc(cx + s * 16, y - big / 2 - 2, big, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(cx + s * 16 - big * 0.3, y - big / 2 - 2 - big * 0.3, big * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  // Plates on the pegs up top.
  for (const [x, rr] of [[150, 46], [256, 54], [362, 40]]) {
    ctx.fillStyle = "#16181c";
    ctx.beginPath();
    ctx.arc(x, 80, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a5260";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#6a7282";
    ctx.beginPath();
    ctx.arc(x, 80, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  plate(ctx, 0, BASE, T, T - BASE, p, { tones: ["#20242c", "#15181e", "#0b0d11"], bevel: 3, ink: 2, spec: false });
}

/** A padded column: crash padding wrapped round it, hazard bands, a lane number. */
function paintGymPad(ctx, p, r) {
  plate(ctx, 0, 0, T, T, p, { tones: PAD, bevel: 14, ink: 4 });
  for (const y of [60, 420]) hazardBand(ctx, y);
  ctx.fillStyle = "rgba(232,240,255,0.85)";
  ctx.beginPath();
  ctx.arc(T / 2, 240, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  letter(ctx, "PD", T / 2, 242, 64, "#1f3560");
  ctx.strokeStyle = "rgba(232,240,255,0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  for (const y of [130, 350]) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(T - 30, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function hazardBand(ctx, y) {
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(0, y, T, 30);
  ctx.fillStyle = "#1a1a1a";
  for (let x = -30; x < T; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, y + 30);
    ctx.lineTo(x + 24, y);
    ctx.lineTo(x + 40, y);
    ctx.lineTo(x + 16, y + 30);
    ctx.fill();
  }
}

/** Range wall: acoustic baffles floor to ceiling, a yellow kick line. */
function paintRange(ctx, p, r, sign = false) {
  ctx.fillStyle = "#1c2026";
  ctx.fillRect(0, 0, T, T);
  for (let i = 0; i < 8; i++) {
    const x = 6 + i * 63;
    ctx.fillStyle = lin(ctx, x, 0, x + 57, 0, [[0, "#3a414c"], [0.5, "#4a525e"], [1, "#2a3038"]]);
    ctx.fillRect(x, 20, 57, 430);
    for (let k = 0; k < 20; k++) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x, 30 + k * 21, 57, 4);
    }
    ink(ctx, x + 57, 20, 6, 430, 30);
  }
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(0, 456, T, 10);
  if (sign) {
    plate(ctx, 136, 120, 240, 120, p, { tones: ["#e04a3a", "#c23a2a", "#8a2418"], bevel: 6, ink: 4 });
    letter(ctx, "EYES & EARS", T / 2, 160, 26, "#fff");
    letter(ctx, "AT ALL TIMES", T / 2, 200, 18, "#ffe0d8", 700);
  }
  plate(ctx, 0, 466, T, T - 466, p, { tones: ["#20242c", "#15181e", "#0b0d11"], bevel: 3, ink: 2, spec: false });
}

export { STATION_WALLS };

/** Painters for wall-art.js's PAINTERS, by id. */
export const STATION_PAINTERS = {
  [STATION_WALLS.LOCKERS_A]: lockerPair(
    { name: "RASCZAK", num: 401, deco: { note: "BRIEF 0600" } },
    { name: "KAEL", num: 402, open: ["helmet", "photos", "shirt", "medal", "boots"] },
    "UNIT 4",
  ),
  [STATION_WALLS.LOCKERS_B]: lockerPair({ name: "OKAFOR", num: 403, deco: { sticker: "#c23a3a" } }, { name: "LINDQVIST", num: 404 }),
  [STATION_WALLS.LOCKERS_C]: lockerPair(
    { name: "DUARTE", num: 405, open: ["mug", "drawing", "shirt", "boots"] },
    { name: "MBEKI", num: 406, deco: { photo: "#7aa0c8" } },
    "UNIT 7",
  ),
  [STATION_WALLS.LOCKERS_D]: lockerPair(
    { name: "PRICE", num: 407, deco: { note: "OWE U 1" } },
    { name: "TANAKA", num: 408, open: ["cap", "photos", "jacket", "charm", "boots"] },
  ),
  [STATION_WALLS.LOCKERS_E]: lockerPair(
    { name: "BRANDT", num: 414, deco: { photo: "#c89a7a" } },
    { name: "REYES", num: 415 },
    "UNIT 4",
  ),
  [STATION_WALLS.LOCKERS_F]: lockerPair(
    { name: "NAKAMURA", num: 416, open: ["cap", "drawing", "shirt", "boots"] },
    { name: "IBARRA", num: 417, deco: { note: "GYM 1800" } },
  ),
  [STATION_WALLS.LOCKERS_G]: lockerPair(
    { name: "FISCHER", num: 418, deco: { sticker: "#3aa060" } },
    { name: "OYELARAN", num: 419, deco: { photo: "#9a7ac8" } },
    "UNIT 7",
  ),
  [STATION_WALLS.LOCKERS_H]: lockerPair(
    { name: "HOLM", num: 420 },
    { name: "SANTOS", num: 421, open: ["helmet", "photos", "jacket", "boots"] },
  ),
  [STATION_WALLS.LOCKERS_SPARE_1]: lockerPair({ name: null, num: null }, { name: null, num: null, deco: { sticker: "#c2a03a" } }),
  [STATION_WALLS.LOCKERS_SPARE_2]: lockerPair({ name: null, num: null, deco: { note: "SPARE" } }, { name: null, num: null }),
  [STATION_WALLS.LOCKERS_SPARE_3]: lockerPair({ name: null, num: null }, { name: null, num: null }),
  [STATION_WALLS.LOCKERS_MINE]: lockerPair({ name: "11235", num: 412, sticker: "rnd" }, { name: "ABARA", num: 413, deco: { sticker: "#2a6ac2" } }),
  [STATION_WALLS.LOCKERS_MINE_LIT]: lockerPair({ name: "11235", num: 412, sticker: "rnd", lit: true }, { name: "ABARA", num: 413, deco: { sticker: "#2a6ac2" } }),
  [STATION_WALLS.LOCKERS_MINE_OPEN]: lockerPair(
    { name: "11235", num: 412, open: ["patrol", "photos", "shirt", "boots"] },
    { name: "ABARA", num: 413, deco: { sticker: "#2a6ac2" } },
  ),
  // The Supervisor's, by the door: shut all morning; after 06:47 his heavy
  // plate comes out of it and his coat goes in (js/tutorial-system.js).
  [STATION_WALLS.LOCKERS_SUP]: lockerPair({ name: "SIMON", num: 400, deco: { note: "SUPV" } }, { name: "HALE", num: 409 }),
  [STATION_WALLS.LOCKERS_SUP_OPEN]: lockerPair(
    { name: "SIMON", num: 400, open: ["cap", "photos", "shirt", "medal"] },
    { name: "HALE", num: 409 },
  ),
  [STATION_WALLS.GYM]: paintGym,
  [STATION_WALLS.GYM_BOARD]: paintGymBoard,
  [STATION_WALLS.GYM_RACK]: paintGymRack,
  [STATION_WALLS.GYM_PAD]: paintGymPad,
  [STATION_WALLS.RANGE]: (ctx, p, r) => paintRange(ctx, p, r, false),
  [STATION_WALLS.RANGE_SIGN]: (ctx, p, r) => paintRange(ctx, p, r, true),
};
