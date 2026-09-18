/**
 * Modern floor (deck) and ceiling textures: one 512×512 tile per map cell.
 *
 * Floor: 2×2 steel deck plates with inked seams, worn bright edges, tread
 * pattern, bolts and oil stains, plus a baked soft reflection of the ceiling
 * light fixture that hangs over the same spot (floor and ceiling share texel
 * coordinates, so the pool always sits under its lamp).
 * Ceiling: beams along the cell edges, recessed panels with vents and pipes,
 * a glowing strip fixture in the act's lamp colour at the cell centre.
 */

import { INK, getEnvPalette, hexRGB } from "./palettes.js";
import { T, makeCanvas, rng, lin, rad, rgba, bevel, rivet, lightStrip, vents, grit, buildMips } from "./paint.js";

// Fixture geometry, shared so the floor reflection lines up with the lamp.
const FIX_X = 116;
const FIX_W = 280;
const FIX_Y = 238;
const FIX_H = 36;

function deckPlate(ctx, x, y, w, h, p, r, tread) {
  ctx.fillStyle = lin(ctx, x, y, x + w * 0.5, y + h, [[0, p.s2], [0.5, p.s1], [1, p.s0]]);
  ctx.fillRect(x, y, w, h);
  if (tread) {
    // Diamond tread: tiny raised lozenges, lit edge + shadow edge.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 8, y + 8, w - 16, h - 16);
    ctx.clip();
    for (let ty = y + 10, row = 0; ty < y + h; ty += 18, row++) {
      for (let tx = x + 10 + (row % 2) * 9; tx < x + w; tx += 18) {
        const a = (row + ((tx / 18) | 0)) % 2 ? 0.6 : -0.6;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(a);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(-5, 0.5, 10, 2.5);
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(-5, -1, 10, 1.5);
        ctx.restore();
      }
    }
    ctx.restore();
  } else {
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(x + 6, y + r() * h, w - 12, 1);
    }
  }
  bevel(ctx, x, y, w, h, 4, p.s4, p.s0, 0.28, 0.8);
  // Worn edges: bare metal showing through where boots scuff the plate lips.
  for (let i = 0; i < 38; i++) {
    const edge = (r() * 4) | 0;
    const t = r();
    const len = 6 + r() * 30;
    const ex = edge === 0 ? x + t * w : edge === 1 ? x + w - 8 : edge === 2 ? x + t * w : x + 3;
    const ey = edge === 0 ? y + 3 : edge === 1 ? y + t * h : edge === 2 ? y + h - 8 : y + t * h;
    ctx.fillStyle = `rgba(190,210,225,${0.08 + r() * 0.14})`;
    if (edge % 2 === 0) ctx.fillRect(ex, ey + r() * 4, len, 1 + r() * 1.5);
    else ctx.fillRect(ex + r() * 4, ey, 1 + r() * 1.5, len);
  }
  for (const [dx, dy] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) rivet(ctx, x + dx, y + dy, 4, p);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

function paintFloor(act, brutal) {
  const c = makeCanvas(T);
  const ctx = c.getContext("2d");
  const p = getEnvPalette(act);
  const r = rng(act * 31337 + 7);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, T, T);
  const gap = 5;
  const half = T / 2;
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      deckPlate(ctx, px * half + gap, py * half + gap, half - gap * 2, half - gap * 2, p, r, (px + py) % 2 === 0);
    }
  }
  // Cell-edge seam carries a faint guide line in the accent colour.
  ctx.fillStyle = rgba(hexRGB(p.accent), 0.22);
  ctx.fillRect(0, 0, T, 2);
  ctx.fillRect(0, 0, 2, T);
  // Oil stains and grime
  for (let i = 0; i < 6; i++) {
    const x = r() * T;
    const y = r() * T;
    const rr = 20 + r() * 50;
    ctx.fillStyle = rad(ctx, x, y, 0, rr, [[0, "rgba(0,0,0,0.3)"], [0.7, "rgba(0,0,0,0.12)"], [1, "rgba(0,0,0,0)"]]);
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // Baked reflection / light pool of the fixture overhead.
  const lamp = hexRGB(p.lamp);
  const cx = FIX_X + FIX_W / 2;
  const cy = FIX_Y + FIX_H / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(cx, cy);
  ctx.scale(1.9, 1);
  ctx.fillStyle = rad(ctx, 0, 0, 0, 150, [[0, rgba(lamp, brutal ? 0.1 : 0.16)], [0.5, rgba(lamp, 0.06)], [1, rgba(lamp, 0)]]);
  ctx.fillRect(-150, -150, 300, 300);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = "blur(6px)";
  ctx.fillStyle = rgba(lamp, brutal ? 0.1 : 0.16);
  ctx.fillRect(FIX_X + 10, FIX_Y + 6, FIX_W - 20, FIX_H - 12);
  ctx.restore();
  grit(ctx, T, T, 0.14);
  return c;
}

function paintCeiling(act, brutal) {
  const c = makeCanvas(T);
  const ctx = c.getContext("2d");
  const p = getEnvPalette(act);
  const r = rng(act * 7331 + 3);
  ctx.fillStyle = p.s0;
  ctx.fillRect(0, 0, T, T);
  // Recessed panels between beams
  const B = 26;
  const half = T / 2;
  const spans = [[B, half - 10], [half + 10, T - B]];
  for (let py = 0; py < 2; py++) {
    for (let px = 0; px < 2; px++) {
      const x = spans[px][0];
      const y = spans[py][0] + (py ? -6 : 0);
      const w = spans[px][1] - x;
      const h = spans[py][1] - spans[py][0] - 6;
      ctx.fillStyle = lin(ctx, x, y, x + w, y + h, [[0, p.s0], [0.6, p.s1], [1, p.s0]]);
      ctx.fillRect(x, y, w, h);
      bevel(ctx, x, y, w, h, 5, p.s0, p.s3, 0.8, 0.35);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);
      if ((px + py) % 2 === 1) vents(ctx, x + 30, y + 40, w - 60, 70, 5, p);
    }
  }
  // Beams along the cell edges (wrap both axes)
  const beam = (x, y, w, h, vertical) => {
    ctx.fillStyle = vertical
      ? lin(ctx, x, 0, x + w, 0, [[0, p.s1], [0.35, p.s3], [1, p.s0]])
      : lin(ctx, 0, y, 0, y + h, [[0, p.s1], [0.35, p.s3], [1, p.s0]]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
  };
  for (const o of [0, T]) {
    beam(o - B, 0, B * 2, T, true);
    beam(0, o - B, T, B * 2, false);
  }
  beam(half - 10, 0, 20, T, true);
  for (const o of [0, T]) for (const q of [0, T]) {
    ctx.fillStyle = p.s2;
    ctx.fillRect(o - B, q - B, B * 2, B * 2);
    rivet(ctx, o, q, 6, p);
  }
  // Conduit pipes
  for (const py of [132, 380]) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, py - 9, T, 18);
    ctx.fillStyle = lin(ctx, 0, py - 7, 0, py + 7, [[0, p.s1], [0.35, p.s4], [1, p.s0]]);
    ctx.fillRect(0, py - 7, T, 14);
    for (let k = 40; k < T; k += 120) {
      ctx.fillStyle = INK;
      ctx.fillRect(k, py - 11, 8, 22);
    }
  }
  // Light fixture housing + diffuser
  const lamp = hexRGB(p.lamp);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(FIX_X + FIX_W / 2, FIX_Y + FIX_H / 2);
  ctx.scale(2.2, 1);
  ctx.fillStyle = rad(ctx, 0, 0, 0, 110, [[0, rgba(lamp, brutal ? 0.12 : 0.22)], [1, rgba(lamp, 0)]]);
  ctx.fillRect(-110, -110, 220, 220);
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.fillRect(FIX_X - 12, FIX_Y - 12, FIX_W + 24, FIX_H + 24);
  ctx.fillStyle = lin(ctx, 0, FIX_Y - 9, 0, FIX_Y + FIX_H + 9, [[0, p.s4], [0.5, p.s2], [1, p.s0]]);
  ctx.fillRect(FIX_X - 9, FIX_Y - 9, FIX_W + 18, FIX_H + 18);
  lightStrip(ctx, FIX_X, FIX_Y, FIX_W, FIX_H, p.lamp, { blur: 26, alpha: brutal ? 0.7 : 1, core: "rgba(255,255,255,0.9)" });
  // Diffuser grid lines
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let k = FIX_X + 35; k < FIX_X + FIX_W; k += 35) ctx.fillRect(k, FIX_Y, 2, FIX_H);
  grit(ctx, T, T, 0.12);
  // Small status LEDs on the beams
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = r() < 0.5 ? p.accent : p.warn;
    ctx.fillRect(40 + r() * 430, half - 3, 3, 3);
  }
  return c;
}

/**
 * Floor + ceiling for an act. Returns the 512px canvases (GL uploads level 0
 * and lets the GPU mipmap) and RGBA pixel mip chains for the Canvas2D path.
 */
export function buildDeckSet(act, brutal = false) {
  const floor = paintFloor(act, brutal);
  const ceil = paintCeiling(act, brutal);
  const pixels = (canvas) => buildMips(canvas, 8).map((m) => m.getContext("2d").getImageData(0, 0, m.width, m.height).data);
  return { floor, ceil, floorMips: pixels(floor), ceilMips: pixels(ceil) };
}
