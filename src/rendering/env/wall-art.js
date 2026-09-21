/**
 * Modern wall textures: one 512×512 face per wall type per act, painted with
 * Canvas2D vectors at level load and mip-chained for the raycaster.
 *
 * Every face shares a shell (soot cornice, pilaster half at each tile edge so
 * neighbouring cells join into one pillar, riveted kickplate with deck-contact
 * AO), then a type-specific body. Wall type ids come from src/data/walls.js:
 * 1 hull panel · 2 tech bank · 3 bulkhead · 4 energy cell · 5 airlock door ·
 * 6 secret (hull panel with a tell) · 7 paradox bone-metal · 8 reinforced glass ·
 * 9 temporal rift.
 */

import { INK, getEnvPalette } from "./palettes.js";
import {
  T, makeCanvas, rng, lin, rad, bevel, plate, rivet, lightStrip, led, hazard, vents, grit, grime, buildMips,
  material, beginMaterial, useMaterial, bakeMaterial, ink, sink, raise, relief, emit, grey, fissure,
} from "./paint.js";

const CORNICE = 34;
const KICK = 446;
const PIL = 22; // half pilaster width at each tile edge

/** Pilaster centred on x (drawn at 0 and T so the tile wraps seamlessly). */
function pilaster(ctx, cx, p, strip) {
  if (material()) {
    // Realistic: flat steel, the rounded column profile lives in the relief.
    ctx.fillStyle = lin(ctx, 0, 0, 0, T, [[0, p.s2], [1, p.s1]]);
    ctx.fillRect(cx - PIL, 0, PIL * 2, T);
    relief((g) => {
      g.fillStyle = lin(g, cx - PIL, 0, cx + PIL, 0, [[0, grey(0)], [0.2, grey(16)], [0.5, grey(24)], [0.8, grey(16)], [1, grey(0)]]);
      g.fillRect(cx - PIL, 0, PIL * 2, T);
    });
  } else {
    ctx.fillStyle = lin(ctx, cx - PIL, 0, cx + PIL, 0, [[0, p.s1], [0.3, p.s3], [0.42, p.s4], [0.55, p.s2], [1, p.s0]]);
    ctx.fillRect(cx - PIL, 0, PIL * 2, T);
  }
  ink(ctx, cx - PIL - 1, 0, 3, T, 26);
  ink(ctx, cx + PIL - 2, 0, 3, T, 26);
  if (strip) {
    // Recessed vertical light strip down the pillar's face.
    lightStrip(ctx, cx - 3, 70, 6, 300, strip, { blur: 16 });
  } else {
    ink(ctx, cx - 1, CORNICE, 2, KICK - CORNICE, 16);
  }
}

function shell(ctx, p, r, o = {}) {
  ctx.fillStyle = p.s1;
  ctx.fillRect(0, 0, T, T);
  // Cornice under the ceiling
  plate(ctx, 0, 0, T, CORNICE, p, { tones: [p.s2, p.s1, p.s0], bevel: 4, ink: 0, spec: false });
  ink(ctx, 0, CORNICE - 3, T, 4, 30);
  // Kickplate with vent slots
  plate(ctx, 0, KICK, T, T - KICK, p, { tones: [p.s2, p.s1, p.s0], bevel: 5, ink: 0 });
  ink(ctx, 0, KICK - 1, T, 4, 30);
  if (o.kickVents !== false) vents(ctx, 150, KICK + 16, 212, 34, 3, p);
  for (const x of [60, 452]) rivet(ctx, x, KICK + 32, 4.5, p);
  for (const cx of [0, T]) pilaster(ctx, cx, p, o.strip);
}

/** Stencil signage shapes per act: chevrons / hazard triangle / broken hourglass. */
function sign(ctx, x, y, p, act, alpha = 0.8) {
  ctx.save();
  ctx.translate(x, y);
  plate(ctx, 0, 0, 132, 44, p, { tones: [p.s1, p.s0, p.s0], bevel: 3, ink: 2.5, spec: false, recess: true });
  ctx.globalAlpha = alpha;
  ctx.fillStyle = act === 1 ? p.accent : act === 2 ? p.warn : p.accent;
  if (act === 1) {
    for (let i = 0; i < 3; i++) {
      const cx = 16 + i * 18;
      ctx.beginPath();
      ctx.moveTo(cx, 12);
      ctx.lineTo(cx + 9, 12);
      ctx.lineTo(cx + 19, 22);
      ctx.lineTo(cx + 9, 32);
      ctx.lineTo(cx, 32);
      ctx.lineTo(cx + 10, 22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(78, 18, 40, 5);
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillRect(78, 27, 26, 3);
  } else if (act === 2) {
    ctx.beginPath();
    ctx.moveTo(22, 36);
    ctx.lineTo(38, 8);
    ctx.lineTo(54, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillRect(36, 16, 4, 11);
    ctx.fillRect(36, 29, 4, 4);
    ctx.fillStyle = p.warn;
    ctx.fillRect(66, 14, 52, 6);
    ctx.fillRect(66, 25, 34, 6);
  } else {
    ctx.beginPath();
    ctx.moveTo(18, 8); ctx.lineTo(50, 8); ctx.lineTo(34, 22); ctx.closePath();
    ctx.moveTo(34, 24); ctx.lineTo(52, 37); ctx.lineTo(16, 37); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(26, 30); ctx.lineTo(40, 14);
    ctx.stroke();
    ctx.fillStyle = p.warn;
    ctx.fillRect(66, 14, 50, 5);
    ctx.fillRect(66, 25, 30, 5);
  }
  ctx.restore();
}

function paintHull(ctx, p, r, act, secret) {
  shell(ctx, p, r);
  const x = PIL + 12;
  const w = T - x * 2;
  // Upper plate + inset bay with signage
  plate(ctx, x, 46, w, 188, p);
  plate(ctx, x + 28, 72, w - 56, 136, p, { tones: [p.s2, p.s1, p.s1], bevel: 5, recess: true, ink: 2.5 });
  if (!secret) sign(ctx, x + 46, 94, p, act);
  // Horizontal ribs in the bay
  for (let i = 0; i < 3; i++) {
    const ry = 158 + i * 16;
    ink(ctx, x + 46, ry, w - 92, 3, 20);
    if (material()) {
      raise(x + 46, ry + 3, w - 92, 4, 10);
      continue;
    }
    ctx.fillStyle = p.s3;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x + 46, ry + 3, w - 92, 2);
    ctx.globalAlpha = 1;
  }
  // Seam with a dim accent light line
  ink(ctx, x, 236, w, 12, 36);
  lightStrip(ctx, x + 40, 240, w - 80, 3, p.accent, { housing: false, blur: 10, alpha: 0.55, core: "rgba(255,255,255,0.35)" });
  // Lower plate: two tall panels
  const hw = (w - 12) / 2;
  plate(ctx, x, 250, hw, 186, p, { tones: [p.s3, p.s2, p.s1] });
  plate(ctx, x + hw + 12, 250, hw, 186, p, { tones: [p.s3, p.s2, p.s1] });
  for (const px of [x, x + hw + 12]) {
    for (const [dx, dy] of [[16, 16], [hw - 16, 16], [16, 170], [hw - 16, 170]]) rivet(ctx, px + dx, 250 + dy, 4, p);
    // Small access hatch outline
    if (material()) {
      relief((g) => {
        g.strokeStyle = grey(14);
        g.lineWidth = 2;
        g.strokeRect(px + 40, 290, hw - 80, 64);
      }, "difference");
      continue;
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 40, 290, hw - 80, 64);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(px + 42, 292, hw - 80, 64);
  }
  for (const [dx, dy] of [[18, 18], [w - 18, 18], [18, 170], [w - 18, 170]]) rivet(ctx, x + dx, 46 + dy, 4.5, p);
  if (secret) {
    // The tell: a hairline panel gap that doesn't line up with the plate grid.
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 70, 98, w - 140, 290);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.strokeRect(x + 72, 100, w - 140, 290);
    relief((g) => {
      g.strokeStyle = grey(10);
      g.lineWidth = 1.5;
      g.strokeRect(x + 70, 98, w - 140, 290);
    }, "difference");
  }
  grime(ctx, r, p, act);
}

function paintTech(ctx, p, r, act) {
  shell(ctx, p, r, { strip: p.accent });
  const x = PIL + 12;
  const w = T - x * 2;
  // Server rack bay
  plate(ctx, x, 46, w, 262, p, { tones: [p.s2, p.s1, p.s0], recess: true, bevel: 7 });
  const rows = 6;
  for (let i = 0; i < rows; i++) {
    const ry = 62 + i * 40;
    plate(ctx, x + 18, ry, w - 36, 32, p, { tones: [p.s3, p.s2, p.s1], bevel: 3, ink: 2.5 });
    vents(ctx, x + 30, ry + 7, 150, 20, 3, p);
    for (let k = 0; k < 8; k++) {
      const v = r();
      const c = v < 0.55 ? p.accent : v < 0.75 ? p.warn : v < 0.85 ? p.alert : null;
      led(ctx, x + 214 + k * 22, ry + 16, 3.2, c || "#000", !!c);
    }
  }
  // Lower service panel: twin coolant conduits + data readout
  plate(ctx, x, 320, w, 116, p);
  for (const cx of [x + 44, x + 84]) {
    ink(ctx, cx - 11, 326, 22, 104, 22);
    if (material()) {
      // Coolant pipe: plain steel, round in the relief.
      ctx.fillStyle = p.s3;
      ctx.fillRect(cx - 9, 326, 18, 104);
      relief((g) => {
        g.fillStyle = lin(g, cx - 9, 0, cx + 9, 0, [[0, grey(8)], [0.4, grey(40)], [1, grey(8)]]);
        g.fillRect(cx - 9, 326, 18, 104);
      });
    } else {
      ctx.fillStyle = lin(ctx, cx - 9, 0, cx + 9, 0, [[0, p.s1], [0.35, p.s4], [1, p.s0]]);
      ctx.fillRect(cx - 9, 326, 18, 104);
    }
    lightStrip(ctx, cx - 2, 340, 4, 76, p.accent, { housing: false, blur: 10 });
  }
  const sx = x + 130;
  const sw = w - 160;
  ink(ctx, sx - 4, 336, sw + 8, 84, 18);
  ctx.fillStyle = lin(ctx, 0, 340, 0, 416, [[0, "#06212a"], [1, "#020b10"]]);
  if (act === 2) ctx.fillStyle = lin(ctx, 0, 340, 0, 416, [[0, "#2a1606"], [1, "#0e0702"]]);
  if (act === 3) ctx.fillStyle = lin(ctx, 0, 340, 0, 416, [[0, "#2a0612"], [1, "#0e0206"]]);
  ctx.fillRect(sx, 340, sw, 76);
  emit((g) => {
    g.globalAlpha = 0.85;
    g.fillRect(sx, 340, sw, 76);
  });
  ctx.save();
  ctx.shadowColor = p.accent;
  ctx.shadowBlur = 8;
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = 0.45 + r() * 0.5;
    ctx.fillRect(sx + 10, 348 + i * 9, 20 + r() * (sw - 40), 3);
  }
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(sx, 340); ctx.lineTo(sx + 60, 340); ctx.lineTo(sx + 20, 416); ctx.lineTo(sx, 416);
  ctx.fill();
  grime(ctx, r, p, act);
}

function paintBulkhead(ctx, p, r, act) {
  shell(ctx, p, r, { strip: p.accentDeep });
  const x = PIL + 10;
  const w = T - x * 2;
  const cols = 2;
  const rows = 2;
  const gw = (w - 10) / cols;
  const gh = (KICK - 46 - 10) / rows;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const px = x + cx * (gw + 10);
      const py = 44 + cy * (gh + 10);
      plate(ctx, px, py, gw, gh, p, { tones: [p.s4, p.s3, p.s1], bevel: 8 });
      // Brushed steel streaks
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + 8, py + 8, gw - 16, gh - 16);
      ctx.clip();
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
        ctx.fillRect(px, py + r() * gh, gw, 1 + r() * 1.5);
      }
      // Diagonal reinforcement rib
      if (material()) {
        ctx.strokeStyle = p.s3;
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(px + 20, py + gh - 20);
        ctx.lineTo(px + gw - 20, py + 20);
        ctx.stroke();
        relief((g) => {
          g.strokeStyle = grey(22);
          g.lineWidth = 10;
          g.beginPath();
          g.moveTo(px + 20, py + gh - 20);
          g.lineTo(px + gw - 20, py + 20);
          g.stroke();
        });
        ctx.restore();
      } else {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(px + 20, py + gh - 20);
      ctx.lineTo(px + gw - 20, py + 20);
      ctx.stroke();
      ctx.strokeStyle = p.s3;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 18, py + gh - 24);
      ctx.lineTo(px + gw - 24, py + 18);
      ctx.stroke();
      ctx.restore();
      }
      // Rivet rows along the plate edges
      for (let i = 0; i <= 5; i++) {
        const t = 18 + i * ((gw - 36) / 5);
        rivet(ctx, px + t, py + 16, 3.6, p);
        rivet(ctx, px + t, py + gh - 16, 3.6, p);
      }
      for (let i = 1; i < 4; i++) {
        const t = 16 + i * ((gh - 32) / 4);
        rivet(ctx, px + 16, py + t, 3.6, p);
        rivet(ctx, px + gw - 16, py + t, 3.6, p);
      }
    }
  }
  // Load-rating plate with hazard band
  hazard(ctx, x + gw + 10 + 40, 44 + gh + 10 + gh - 70, gw - 80, 34, p.warn);
  grime(ctx, r, p, act);
}

function paintEnergy(ctx, p, r, act) {
  shell(ctx, p, r, { kickVents: false });
  const x = PIL + 8;
  const w = T - x * 2;
  plate(ctx, x, 40, w, KICK - 44, p, { tones: [p.s3, p.s1, p.s0], bevel: 10 });
  const gx = x + 40;
  const gy = 84;
  const gw = w - 80;
  const gh = 318;
  ink(ctx, gx - 8, gy - 8, gw + 16, gh + 16, 30);
  emit((g) => g.fillRect(gx, gy, gw, gh), 6);
  // Plasma column
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip();
  ctx.fillStyle = lin(ctx, gx, 0, gx + gw, 0, [[0, "#07030f"], [0.5, "#1a0a33"], [1, "#07030f"]]);
  ctx.fillRect(gx, gy, gw, gh);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rad(ctx, gx + gw / 2, gy + gh / 2, 0, gh * 0.62, [[0, p.energyHot], [0.18, p.energy], [0.6, "rgba(60,20,120,0.35)"], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(gx, gy, gw, gh);
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    let px = gx + gw / 2 + (r() - 0.5) * 30;
    ctx.moveTo(px, gy);
    for (let y = gy; y <= gy + gh; y += 24) {
      px += (r() - 0.5) * 70;
      px = Math.max(gx + 20, Math.min(gx + gw - 20, px));
      ctx.lineTo(px, y);
    }
    ctx.shadowColor = p.energy;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = i < 2 ? "rgba(255,255,255,0.55)" : `rgba(200,150,255,${0.18 + r() * 0.2})`;
    ctx.lineWidth = i < 2 ? 2 : 3 + r() * 3;
    ctx.stroke();
  }
  ctx.restore();
  // Glass grid bars
  if (material()) {
    // Steel glazing bars standing proud of the recessed glass.
    ctx.fillStyle = p.s2;
    for (const [bx, by, bw, bh] of [[gx + gw / 3 - 5, gy, 10, gh], [gx + (gw * 2) / 3 - 5, gy, 10, gh], [gx, gy + gh / 2 - 5, gw, 10]]) {
      ctx.fillRect(bx, by, bw, bh);
      raise(bx, by, bw, bh, 38);
      emit((g) => {
        g.globalCompositeOperation = "destination-out";
        g.fillRect(bx, by, bw, bh);
      });
    }
  }
  for (const bx of material() ? [] : [gx + gw / 3, gx + (gw * 2) / 3]) {
    ctx.fillStyle = INK;
    ctx.fillRect(bx - 6, gy, 12, gh);
    ctx.fillStyle = lin(ctx, bx - 4, 0, bx + 4, 0, [[0, p.s2], [0.4, p.s4], [1, p.s0]]);
    ctx.fillRect(bx - 4, gy, 8, gh);
  }
  if (!material()) {
    ctx.fillStyle = INK;
    ctx.fillRect(gx, gy + gh / 2 - 6, gw, 12);
    ctx.fillStyle = lin(ctx, 0, gy + gh / 2 - 4, 0, gy + gh / 2 + 4, [[0, p.s4], [1, p.s1]]);
    ctx.fillRect(gx, gy + gh / 2 - 4, gw, 8);
  }
  // Glass glint
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(gx + 20, gy); ctx.lineTo(gx + 70, gy); ctx.lineTo(gx + 10, gy + 160); ctx.lineTo(gx, gy + 160); ctx.lineTo(gx, gy + 50);
  ctx.fill();
  // Emitter caps
  for (const cy of [gy - 26, gy + gh + 10]) {
    plate(ctx, gx + 30, cy, gw - 60, 18, p, { tones: [p.s4, p.s2, p.s0], bevel: 3, ink: 2.5, spec: false });
    lightStrip(ctx, gx + 60, cy + 7, gw - 120, 4, p.energy, { housing: false, blur: 12 });
  }
  for (const [dx, dy] of [[16, 16], [w - 16, 16], [16, KICK - 64], [w - 16, KICK - 64]]) rivet(ctx, x + dx, 40 + dy, 5, p);
  grime(ctx, r, p, act);
}

function paintDoor(ctx, p, r, act) {
  ctx.fillStyle = p.s0;
  ctx.fillRect(0, 0, T, T);
  // Header with a warning light bar
  plate(ctx, 0, 0, T, 64, p, { tones: [p.s3, p.s2, p.s0], bevel: 6 });
  lightStrip(ctx, 150, 26, 212, 10, p.warn, { blur: 18 });
  // Jambs with inward-facing accent glow strips
  for (const jx of [0, T - 70]) plate(ctx, jx, 58, 70, T - 58, p, { tones: [p.s3, p.s2, p.s0], bevel: 6 });
  lightStrip(ctx, 60, 80, 6, 356, p.accent, { blur: 22 });
  lightStrip(ctx, T - 66, 80, 6, 356, p.accent, { blur: 22 });
  // Door leaves
  const ly = 70;
  const lh = 390;
  const lw = (T - 152) / 2;
  const bronze = act === 1 ? ["#6a5a44", "#4a3c2c", "#2a2118"] : act === 2 ? ["#7a5630", "#553a1e", "#2e1e0e"] : ["#5a3a4a", "#3c2432", "#20121a"];
  for (let i = 0; i < 2; i++) {
    const lx = 76 + i * lw;
    plate(ctx, lx, ly, lw, lh, p, { tones: bronze, bevel: 8 });
    // Horizontal pressure grooves
    for (let g = 0; g < 4; g++) {
      const gy = ly + 40 + g * 36;
      ink(ctx, lx + 20, gy, lw - 40, 4, 18);
      if (material()) continue;
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(lx + 20, gy + 4, lw - 40, 2);
    }
    for (const [dx, dy] of [[18, 18], [lw - 18, 18], [18, lh - 18], [lw - 18, lh - 18]]) rivet(ctx, lx + dx, ly + dy, 5, p);
  }
  hazard(ctx, 76 + 10, ly + 270, T - 152 - 20, 46, p.warn, "#0a0806", 30);
  // Centre seam
  ink(ctx, T / 2 - 3, ly, 6, lh, 40);
  lightStrip(ctx, T / 2 - 1, ly + 10, 2, lh - 20, p.accent, { housing: false, blur: 8, alpha: 0.5, core: "rgba(255,255,255,0.3)" });
  // Lock ring + status lamp
  const m = material();
  ctx.fillStyle = m ? m.crevice : INK;
  ctx.beginPath();
  ctx.arc(T / 2, ly + 196, 34, 0, Math.PI * 2);
  ctx.fill();
  relief((g) => {
    g.fillStyle = grey(18);
    g.beginPath();
    g.arc(T / 2, ly + 196, 34, 0, Math.PI * 2);
    g.fill();
  }, "difference");
  relief((g) => {
    g.fillStyle = rad(g, T / 2, ly + 196, 0, 30, [[0, grey(40)], [0.7, grey(34)], [1, grey(14)]]);
    g.beginPath();
    g.arc(T / 2, ly + 196, 30, 0, Math.PI * 2);
    g.fill();
  });
  ctx.fillStyle = m ? p.s2 : rad(ctx, T / 2 - 10, ly + 186, 2, 40, [[0, p.s4], [0.5, p.s2], [1, p.s0]]);
  ctx.beginPath();
  ctx.arc(T / 2, ly + 196, 30, 0, Math.PI * 2);
  ctx.fill();
  led(ctx, T / 2, ly + 196, 11, p.alert);
  // Threshold
  plate(ctx, 0, KICK + 14, T, T - KICK - 14, p, { tones: [p.s2, p.s1, p.s0], bevel: 4 });
  hazard(ctx, 90, KICK + 26, T - 180, 22, p.warn, "#0a0806", 22);
  grime(ctx, r, p, act);
}

function paintParadox(ctx, p, r, act) {
  ctx.fillStyle = "#07040b";
  ctx.fillRect(0, 0, T, T);
  const ribs = 5;
  const rw = T / ribs;
  // Crimson veins first so ribs overlap them.
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i <= ribs; i++) {
    const vx = i * rw;
    const pts = [];
    for (let y = 0; y <= T; y += 32) pts.push(vx + (r() - 0.5) * 14, y);
    const trace = (g) => {
      g.beginPath();
      g.moveTo(vx, 0);
      for (let k = 0; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
    };
    if (material()) {
      // Realistic: a glowing fissure in the gap between two ribs.
      fissure(ctx, trace, 5);
      continue;
    }
    trace(ctx);
    ctx.shadowColor = "#ff2a4a";
    ctx.shadowBlur = 20;
    ctx.strokeStyle = "#ff2a4a";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,210,220,0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < ribs; i++) {
    const x = i * rw + 7;
    const w = rw - 14;
    const m = material();
    if (!m) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.roundRect(x - 3, 20, w + 6, T - 40, 22);
      ctx.fill();
    } else {
      relief((g) => {
        // Round across the rib (a cylinder)...
        g.fillStyle = lin(g, x, 0, x + w, 0, [[0, grey(0)], [0.08, grey(8)], [0.2, grey(26)], [0.35, grey(44)], [0.5, grey(50)], [0.65, grey(44)], [0.8, grey(26)], [0.92, grey(8)], [1, grey(0)]]);
        g.beginPath();
        g.roundRect(x, 24, w, T - 48, 18);
        g.fill();
        // ...with the bone joints pinched in: each segment's ends round down
        // into its joint, so the key light from above catches the shoulder
        // under every joint and the rim above it falls into shade.
        g.save();
        g.clip();
        const seg = (T - 48) / 6;
        g.globalCompositeOperation = "difference";
        for (let s = 1; s < 6; s++) {
          const sy = 24 + s * seg;
          g.fillStyle = lin(g, 0, sy - 16, 0, sy + 16, [[0, grey(0)], [0.3, grey(4)], [0.5, grey(12)], [0.7, grey(4)], [1, grey(0)]]);
          g.fillRect(x, sy - 16, w, 32);
        }
        g.restore();
      });
      emit((g) => {
        g.globalCompositeOperation = "destination-out";
        g.beginPath();
        g.roundRect(x, 24, w, T - 48, 18);
        g.fill();
      });
    }
    // Realistic albedo carries the cylinder's falloff toward its flanks too:
    // the key from above cannot shade a vertical rib across its width.
    ctx.fillStyle = m ? lin(ctx, x, 0, x + w, 0, [[0, "#07040a"], [0.14, "#22152a"], [0.3, "#5a4262"], [0.38, "#6e5478"], [0.48, "#46304e"], [0.7, "#261830"], [0.86, "#1a1020"], [0.94, "#2a1c32"], [1, "#0a060c"]]) : lin(ctx, x, 0, x + w, 0, [[0, "#1a0f22"], [0.28, "#4a3050"], [0.4, "#8a6a94"], [0.55, "#2c1a34"], [1, "#0a0610"]]);
    ctx.beginPath();
    ctx.roundRect(x, 24, w, T - 48, 18);
    ctx.fill();
    // Bone-like segment joints with AO
    for (let s = 1; s < 6; s++) {
      const sy = 24 + s * ((T - 48) / 6);
      if (m) {
        // The joint is shaped in the relief above; a shallow seam is enough
        // (a deep slot made every segment a stained tile).
        sink(x, sy - 2, w, 4, 6);
        ink(ctx, x, sy - 1, w, 2, 12);
        continue;
      }
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, sy - 5, w, 10);
      ctx.fillStyle = INK;
      ctx.fillRect(x, sy - 1.5, w, 3);
      ctx.fillStyle = "rgba(200,170,220,0.22)";
      ctx.fillRect(x + 4, sy + 3, w - 8, 2);
    }
    // Violet rim on the right edge
    if (m) continue;
    ctx.fillStyle = "rgba(155,92,255,0.45)";
    ctx.fillRect(x + w - 4, 34, 2, T - 68);
  }
  grime(ctx, r, p, 3);
}

function paintGlass(ctx, p, r, act) {
  shell(ctx, p, r, { kickVents: true });
  const x = PIL + 10;
  const w = T - x * 2;
  plate(ctx, x, 40, w, KICK - 44, p, { tones: [p.s3, p.s2, p.s0], bevel: 8 });
  const gx = x + 30;
  const gy = 72;
  const gw = w - 60;
  const gh = 340;
  ink(ctx, gx - 7, gy - 7, gw + 14, gh + 14, 34);
  // The view outside is lit by its own sky, not by the room.
  emit((g) => {
    g.globalAlpha = 0.7;
    g.fillRect(gx, gy, gw, gh);
  });
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip();
  const sky = act === 2 ? ["#2a1a0e", "#4a3018", "#140c06"] : act === 3 ? ["#1e0a1e", "#3a1234", "#0c040c"] : ["#0a2436", "#1d4d66", "#06131d"];
  ctx.fillStyle = lin(ctx, 0, gy, 0, gy + gh, [[0, sky[2]], [0.55, sky[1]], [1, sky[0]]]);
  ctx.fillRect(gx, gy, gw, gh);
  // Distant structures and running lights behind the glass
  for (let i = 0; i < 9; i++) {
    const bw = 20 + r() * 50;
    const bh = 60 + r() * 180;
    const bx = gx + r() * gw;
    ctx.fillStyle = `rgba(3,8,14,${0.5 + r() * 0.4})`;
    ctx.fillRect(bx, gy + gh - bh, bw, bh);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = r() < 0.5 ? p.accent : p.lamp;
      ctx.globalAlpha = 0.25 + r() * 0.5;
      ctx.fillRect(bx + r() * bw, gy + gh - r() * bh, 2, 2);
      ctx.globalAlpha = 1;
    }
  }
  // Streaked reflections + frost at the sill
  ctx.fillStyle = "rgba(200,235,255,0.12)";
  for (const [ox, ww] of [[40, 70], [150, 22], [260, 44]]) {
    ctx.beginPath();
    ctx.moveTo(gx + ox, gy);
    ctx.lineTo(gx + ox + ww, gy);
    ctx.lineTo(gx + ox + ww - 140, gy + gh);
    ctx.lineTo(gx + ox - 140, gy + gh);
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, 0, gy + gh - 90, 0, gy + gh, [[0, "rgba(200,230,245,0)"], [1, "rgba(200,230,245,0.2)"]]);
  ctx.fillRect(gx, gy + gh - 90, gw, 90);
  ctx.restore();
  // Mullions
  if (material()) {
    ctx.fillStyle = p.s2;
    for (const [mx, my, mw, mh] of [[gx + gw / 2 - 5, gy, 10, gh], [gx, gy + 118 - 5, gw, 10]]) {
      ctx.fillRect(mx, my, mw, mh);
      raise(mx, my, mw, mh, 42);
      emit((g) => {
        g.globalCompositeOperation = "destination-out";
        g.fillRect(mx, my, mw, mh);
      });
    }
    grime(ctx, r, p, act);
    return;
  }
  ctx.fillStyle = INK;
  ctx.fillRect(gx + gw / 2 - 7, gy, 14, gh);
  ctx.fillRect(gx, gy + 118 - 7, gw, 14);
  ctx.fillStyle = lin(ctx, gx + gw / 2 - 4, 0, gx + gw / 2 + 4, 0, [[0, p.s2], [0.4, p.s4], [1, p.s0]]);
  ctx.fillRect(gx + gw / 2 - 4, gy, 8, gh);
  ctx.fillStyle = lin(ctx, 0, gy + 114, 0, gy + 122, [[0, p.s4], [1, p.s1]]);
  ctx.fillRect(gx, gy + 114, gw, 8);
  bevel(ctx, gx, gy, gw, gh, 5, p.s0, p.s4, 0.6, 0.25);
  grime(ctx, r, p, act);
}

function paintRift(ctx, p, r, act) {
  shell(ctx, p, r, { kickVents: false });
  const x = PIL + 8;
  const w = T - x * 2;
  plate(ctx, x, 40, w, KICK - 44, p, { tones: [p.s2, p.s1, p.s0], bevel: 8 });
  const cx = T / 2;
  const cy = 240;
  ink(ctx, x + 26, 66, w - 52, 356, 34);
  emit((g) => {
    g.globalAlpha = 0.9;
    g.fillRect(x + 32, 72, w - 64, 344);
  }, 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 32, 72, w - 64, 344);
  ctx.clip();
  ctx.fillStyle = "#010306";
  ctx.fillRect(0, 0, T, T);
  ctx.globalCompositeOperation = "lighter";
  // Warped spacetime rings
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = `rgba(0,255,204,${0.05 + i * 0.012})`;
    ctx.lineWidth = 2 + i * 0.4;
    ctx.beginPath();
    ctx.ellipse(cx + (r() - 0.5) * 12, cy, 26 + i * 22, 60 + i * 26, (r() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // The tear
  const pts = [];
  for (let y = 80; y <= 410; y += 22) pts.push([cx + (r() - 0.5) * 70 * Math.sin(((y - 80) / 330) * Math.PI), y]);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts) ctx.lineTo(px + 10 + r() * 16 * Math.sin(((py - 80) / 330) * Math.PI), py);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0] - 10 - r() * 16 * Math.sin(((pts[i][1] - 80) / 330) * Math.PI), pts[i][1]);
  ctx.closePath();
  ctx.shadowColor = p.rift;
  ctx.shadowBlur = 40;
  ctx.fillStyle = p.rift;
  ctx.fill();
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(230,255,250,0.85)";
  ctx.save();
  ctx.translate(cx, 0);
  ctx.scale(0.4, 1);
  ctx.translate(-cx, 0);
  ctx.fill();
  ctx.restore();
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = r() < 0.5 ? p.rift : "#ffffff";
    ctx.globalAlpha = 0.3 + r() * 0.6;
    ctx.fillRect(cx + (r() - 0.5) * 260, 80 + r() * 330, 2, 2);
  }
  ctx.restore();
  for (const [dx, dy] of [[16, 16], [w - 16, 16], [16, KICK - 64], [w - 16, KICK - 64]]) rivet(ctx, x + dx, 40 + dy, 5, p);
  grime(ctx, r, p, act);
}

const PAINTERS = {
  1: (c, p, r, a) => paintHull(c, p, r, a, false),
  2: paintTech,
  3: paintBulkhead,
  4: paintEnergy,
  5: paintDoor,
  6: (c, p, r, a) => paintHull(c, p, r, a, true),
  7: paintParadox,
  8: paintGlass,
  9: paintRift,
};

/**
 * Paint one wall face at 512×512. With `mat` (from beginMaterial) the same
 * layout is painted as a material — relief + emissive mask, no ink — ready
 * for bakeMaterial().
 */
export function paintWall(id, act, pal, salt = 0, mat = null) {
  const c = makeCanvas(T);
  const ctx = c.getContext("2d");
  const p = pal || getEnvPalette(act);
  const paint = PAINTERS[id] || PAINTERS[1];
  // The salt varies the grain per level, so two levels in one act do not share
  // the same scratches on top of already sharing a silhouette.
  const seed = id * 7919 + act * 104729 + salt * 15485863;
  if (mat) useMaterial(mat);
  try {
    paint(ctx, p, rng(seed), act);
    grit(ctx, T, T, 0.12);
  } finally {
    useMaterial(null);
  }
  return c;
}

/**
 * All wall faces for a level as { [id]: mipChain[] } (level 0 = 512px).
 * `realistic` bakes each face's lighting and wear into its albedo, so
 * Realistic walls cost nothing extra per frame.
 */
export function buildWallSet(act, pal, salt = 0, realistic = false) {
  const set = {};
  const ids = Object.keys(PAINTERS);
  if (!realistic) {
    for (const id of ids) set[id] = buildMips(paintWall(+id, act, pal, salt));
    return set;
  }
  const p = pal || getEnvPalette(act);
  // Paint every face before reading any back, so the GPU rasterises the
  // earlier faces while later ones are still being recorded.
  const faces = ids.map((id) => {
    const mat = beginMaterial(p);
    return { id, mat, canvas: paintWall(+id, act, p, salt, mat) };
  });
  for (const { id, mat, canvas } of faces) {
    bakeMaterial(canvas, mat, p, act, +id * 7919 + act * 104729 + salt * 15485863);
    set[id] = buildMips(canvas);
  }
  return set;
}
