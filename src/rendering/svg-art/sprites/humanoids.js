/**
 * Biped enemy sprites (troopers, constructs, casters) in sprite units — see
 * kit.js. One posable front-facing rig (`biped`) is shared by every type; each
 * type supplies its gear, a pose table (idle, move A/B, windup, attack, hurt)
 * and optional cosmetic variants.
 *
 * A type's build(variant) returns:
 *   poses: { name: { body, glow, at: { anchorName: [x, y] } } }
 *   fx:    secondary-motion layers (capes, antennas, spinning clock hands…),
 *          each { box, markup, anchor, anim, back?, glow? } in local units
 *          around its anchor, so one bitmap follows every pose.
 */

import {
  INK, f, P, polar, lerp, heading, capsule, poly, rot, sh, ln, circ, ell, limb, glow, bar, flash,
  ao, spec, cable, plate, glyphRing,
} from "./kit.js";

export const SOLE = 86;

const HUMAN = { hipY: 8, hipW: 8, stance: 3, thigh: 36, shin: 34, foot: 8, shY: -38, shW: 20, ua: 25, fa: 23, headY: -58 };

/** Joint positions for a front-facing biped. */
function biped(d, p) {
  const crouch = p.crouch || 0;
  const hipY = d.hipY + crouch;
  const legs = {};
  for (const s of [-1, 1]) {
    const lp = (s < 0 ? p.legL : p.legR) || {};
    const H = [s * d.hipW, hipY];
    const A = [s * (d.hipW + d.stance + (lp.spread || 0)), SOLE - d.foot - (lp.lift || 0)];
    const L = d.thigh + d.shin;
    const D = Math.hypot(A[0] - H[0], A[1] - H[1]);
    const bend = Math.sqrt(Math.max(0, L * L - D * D)) / 2;
    const M = lerp(H, A, d.thigh / L);
    legs[s] = { H, K: [M[0] + s * bend * 0.4, M[1] - bend * 0.1], A, lift: lp.lift || 0 };
  }
  const shY = d.shY + crouch;
  const arms = {};
  for (const s of [-1, 1]) {
    const ap = (s < 0 ? p.armL : p.armR) || { sh: 10, el: 6 };
    const S = [s * d.shW, shY + (ap.dy || 0)];
    const E = polar(S, s * ap.sh, d.ua * (ap.ku ?? 1));
    const W = polar(E, s * (ap.sh + ap.el), d.fa * (ap.kf ?? 1));
    arms[s] = { S, E, W };
  }
  const tilt = p.tilt || 0;
  return {
    d, p, legs, arms, hipY, shY,
    head: [p.headX || 0, d.headY + crouch + (p.headDy || 0)],
    up: `rotate(${f(tilt)} 0 ${f(hipY)})`,
    /** A point in upper-body space, rotated with the torso lean. */
    upPt: (pt) => rot([pt], tilt, [0, hipY])[0],
  };
}

/* ── Shared gear ─────────────────────────────────────────────────────────── */

function legsOf(R, o = {}) {
  const {
    thighW = 16, kneeW = 13, ankleW = 10, under = "url(#cloth)", pad = "url(#armor)", boot = "url(#gun)",
    bootW = 15, plate: plateMat = pad, trim = "",
  } = o;
  let m = ao(0, R.hipY + 6, 12, 5, 0.5);
  for (const s of [-1, 1]) {
    const { H, K, A } = R.legs[s];
    m += limb(H, K, thighW, kneeW, under) + limb(K, A, kneeW, ankleW, under);
    if (plateMat) {
      const t0 = lerp(H, K, 0.12);
      const t1 = lerp(H, K, 0.78);
      m += sh(capsule([t0[0] + s * 2.2, t0[1]], [t1[0] + s * 1.6, t1[1]], thighW * 0.72, thighW * 0.56), plateMat, 1);
      m += spec(`M${P(t0[0] + s * 2.2 - 2.5, t0[1] + 3)}L${P(t1[0] + s * 1.6 - 2, t1[1] - 3)}`, 0.35, 0.9);
      const s0 = lerp(K, A, 0.18);
      const s1 = lerp(K, A, 0.8);
      m += sh(capsule(s0, s1, kneeW * 0.9, ankleW * 0.85), plateMat, 1);
      m += ln(`M${P(s0[0] - 3, s0[1] + 8)}L${P(s0[0] + 3, s0[1] + 8)}`, INK, 0.7, 0.5);
      if (trim) m += ln(`M${P(s0[0] - 3.5, s0[1] + 3)}L${P(s1[0] - 2.5, s1[1] - 4)}`, trim, 1.6, 0.9);
    }
    // Boot: toe cap flares toward the viewer.
    const sole = A[1] + R.d.foot;
    m += sh(poly([[A[0] - bootW / 2, A[1] - 7], [A[0] + bootW / 2, A[1] - 7], [A[0] + bootW / 2 + s * 2, sole - 1], [A[0] + bootW / 2 + s * 1.5, sole], [A[0] - bootW / 2 + s * 1.5, sole], [A[0] - bootW / 2 + s * 2, sole - 1]]), boot);
    m += sh(`M${P(A[0] - bootW / 2 + s * 2 + 1, sole - 5)}Q${P(A[0] + s * 2, sole - 9)} ${P(A[0] + bootW / 2 + s * 2 - 1, sole - 5)}V${f(sole - 1.5)}H${f(A[0] - bootW / 2 + s * 2 + 1)}Z`, "url(#steel)", 0.8);
    m += ln(`M${P(A[0] - bootW / 2 + s * 2, sole - 1.2)}H${f(A[0] + bootW / 2 + s * 2)}`, "#000", 1.4, 0.7);
    if (pad) {
      m += ao(K[0], K[1] + 7, 6, 2.5, 0.5);
      m += plate([[K[0] - 7, K[1] - 6], [K[0] + 7, K[1] - 6], [K[0] + 6.5, K[1] + 4], [K[0], K[1] + 8], [K[0] - 6.5, K[1] + 4]], pad, 1.2, 0.6);
    }
  }
  return m;
}

function torsoOf(R, o = {}) {
  const { w = 24, waist = 16, mat = "url(#armor)", dark = "url(#armorDk)", under = "url(#cloth)", belt = "url(#gun)", neck = 7, plates = true } = o;
  const { shY, hipY } = R;
  let m =
    sh(`M${P(-neck, shY - 11)}H${f(neck)}V${f(shY)}H${f(-neck)}Z`, under) +
    ao(0, shY - 2, neck + 2, 3, 0.5) +
    sh(`M${P(-w, shY - 3)}Q${P(0, shY - 11)} ${P(w, shY - 3)}L${P(waist + 2, hipY - 12)}L${P(waist, hipY + 2)}H${f(-waist)}L${P(-waist - 2, hipY - 12)}Z`, under);
  if (plates) {
    // Split pectoral plates over a segmented abdomen.
    for (const s of [-1, 1]) {
      const pts = [[s * 2, shY - 6], [s * (w - 1), shY - 2], [s * (w - 4), shY + 16], [s * 2, shY + 20]];
      m += plate(s < 0 ? pts : [pts[1], pts[0], pts[3], pts[2]], mat, 1.2, s < 0 ? 0.55 : 0.2);
    }
    m += ao(0, shY + 22, w - 6, 3, 0.45);
    for (let i = 0; i < 3; i++) {
      const y = shY + 23 + i * 7;
      const ww = waist - 1 - i;
      m += plate([[-ww, y], [ww, y], [ww - 1, y + 5.5], [-ww + 1, y + 5.5]], i % 2 ? dark : mat, 1, i ? 0 : 0.3);
    }
  }
  m += sh(`M${P(-waist - 2, hipY - 7)}H${f(waist + 2)}V${f(hipY + 1)}H${f(-waist - 2)}Z`, belt, 1.1);
  m += sh(`M${P(-3.5, hipY - 7.5)}h7v9h-7Z`, "url(#brass)", 0.8);
  return m;
}

function armOf(R, s, o = {}) {
  const { upW = 12, foreW = 11, mat = "url(#cloth)", guard = "url(#armor)", hand = "url(#gun)", pad = "url(#armor)", padR = 11, trim = "" } = o;
  const { S, E, W } = R.arms[s];
  let m = limb(S, E, upW, foreW, mat);
  m += circ(E[0], E[1], foreW * 0.55, guard, 1);
  const g1 = lerp(E, W, 0.12);
  const g2 = lerp(E, W, 0.86);
  m += sh(capsule(g1, g2, foreW + 2, foreW + 0.5), guard, 1.2);
  m += ln(`M${P(...lerp(g1, g2, 0.55))}l${f(s * 2)} 0`, INK, 0.7, 0.5);
  m += circ(W[0], W[1], foreW * 0.58, hand);
  if (pad) {
    const d = `M${P(S[0] - padR, S[1] + 4)}Q${P(S[0] - padR, S[1] - padR)} ${P(S[0], S[1] - padR)}Q${P(S[0] + padR, S[1] - padR)} ${P(S[0] + padR, S[1] + 4)}Q${P(S[0], S[1] + 8)} ${P(S[0] - padR, S[1] + 4)}Z`;
    m += ao(S[0] - s * 3, S[1] + 6, padR * 0.6, 3, 0.4) + sh(d, pad, 1.3);
    m += spec(`M${P(S[0] - padR + 2.5, S[1] + 1)}Q${P(S[0] - padR + 2, S[1] - padR + 2.5)} ${P(S[0] - 1, S[1] - padR + 2)}`, 0.55, 1.2);
    if (trim) m += ln(`M${P(S[0] - padR + 1.5, S[1] + 3.2)}Q${P(S[0], S[1] + 6.6)} ${P(S[0] + padR - 1.5, S[1] + 3.2)}`, trim, 3.2) + ln(`M${P(S[0] - padR * 0.4, S[1] + 1)}l${f(padR * 0.25)} ${f(padR * 0.35)}M${P(S[0] + padR * 0.2, S[1] + 1.5)}l${f(padR * 0.25)} ${f(padR * 0.35)}`, "#15110a", 1.4);
  }
  return m;
}

/* ── Weapons ────────────────────────────────────────────────────────────── */

const GUN_SHAPES = {
  rifle: (len) => [[-10, -3], [len * 0.55, -3], [len * 0.55, -1.8], [len, -1.8], [len, 1.8], [len * 0.55, 1.8], [len * 0.5, 4], [len * 0.22, 4], [len * 0.14, 11], [len * 0.04, 11], [0, 4], [-17, 6.5], [-17, -3]],
  shotgun: (len) => [[-8, -3.5], [len, -3.5], [len, 1.5], [len * 0.7, 1.5], [len * 0.7, 4.5], [len * 0.38, 4.5], [len * 0.38, 1.5], [0, 3.5], [-15, 7], [-15, -2]],
  smg: (len) => [[-6, -3.5], [len * 0.8, -3.5], [len * 0.8, -1.5], [len, -1.5], [len, 1.5], [len * 0.55, 3], [len * 0.2, 3], [len * 0.2, 9], [len * 0.02, 9], [0, 3], [-6, 3]],
};

/** Side-held weapon along heading `deg` (polar convention) from grip point g. */
function gunSide(g, deg, kind = "rifle", len = 46) {
  const a = 90 - deg;
  const T = (pts) => poly(rot(pts, a, [0, 0], g));
  let m = sh(T(GUN_SHAPES[kind](len)), "url(#gun)", 1.2);
  if (kind === "rifle") m += sh(T([[len * 0.15, -3], [len * 0.42, -3], [len * 0.42, -7.5], [len * 0.15, -7.5]]), "url(#armorDk)", 1);
  if (kind === "shotgun") m += sh(T([[len * 0.4, 1.5], [len * 0.68, 1.5], [len * 0.68, 4.5], [len * 0.4, 4.5]]), "url(#brass)", 0.8);
  if (kind === "smg") m += sh(`M${P(...rot([[len * 0.35, 5]], a, [0, 0], g)[0])}m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0`, "url(#armorDk)", 1);
  const hi = rot([[-8, -2], [len * 0.5, -2]], a, [0, 0], g);
  return m + spec(`M${P(...hi[0])}L${P(...hi[1])}`, 0.35, 0.8);
}

/** Weapon aimed at the viewer: stock at the shoulder, bore facing out. */
function gunAim(x, y, r, kind = "rifle", mat = "url(#gun)") {
  const wide = kind === "shotgun" ? 1.3 : 1;
  let m = sh(poly([[x + r * 2.6, y - r * 0.6], [x + r * 0.4, y - r * 1.2], [x - r * 1, y - r * 0.7], [x - r * 1, y + r], [x + r * 0.6, y + r * 1.5], [x + r * 2.7, y + r * 0.9]]), mat, 1.2);
  if (kind === "smg") m += circ(x + r * 1.3, y + r * 1.6, r * 0.9, "url(#armorDk)", 1);
  if (kind === "shotgun") m += circ(x - r * 0.6, y, r * wide, mat, 1.2) + circ(x - r * 0.6, y, r * 0.55, "#030407", 0);
  m += circ(x + (kind === "shotgun" ? r * 0.6 : 0), y, r * wide, mat, 1.3) + circ(x + (kind === "shotgun" ? r * 0.6 : 0), y, r * 0.52 * wide, "#030407", 0);
  if (kind === "rifle") m += sh(`M${P(x + r * 0.2, y - r * 2.3)}h${f(r * 1.6)}v${f(r * 1.1)}h${f(-r * 1.6)}Z`, "url(#armorDk)", 0.9);
  return m;
}

/** Windup glow for an aimed weapon: charge ring plus a laser-sight dot. */
function aimGlow(x, y, t, color, name) {
  if (name === "attack") return flash(x, y, 19, color) + circ(x, y, 9, "#ffffff", 0, ` opacity=".8"`);
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(7 + t)}" fill="none" stroke="${color}" stroke-width="1.8"/>` + circ(x, y, 2.6, "#ffffff", 0) + circ(x, y, 4.2, color, 0, ` opacity=".7"`);
}

/* ── Helmets ────────────────────────────────────────────────────────────── */

function helmet(R, kind, o = {}) {
  const { mat = "url(#armor)", visor = "#ff8a3a", dark = "url(#armorDk)" } = o;
  const [x, y] = R.head;
  let body = ao(x, y + 12, 9, 3, 0.55);
  let g = "";
  switch (kind) {
    case "dome": {
      const r = 13;
      body += sh(`M${P(x - r, y + 4)}Q${P(x - r - 1, y - r - 2)} ${P(x, y - r - 3)}Q${P(x + r + 1, y - r - 2)} ${P(x + r, y + 4)}L${P(x + r - 3, y + r - 1)}H${f(x - r + 3)}Z`, mat, 1.4);
      body += sh(`M${P(x - r + 3, y + 4)}H${f(x + r - 3)}L${P(x + r - 5, y + r - 1)}H${f(x - r + 5)}Z`, "url(#gun)", 1);
      for (const dx of [-4, 0, 4]) body += ln(`M${P(x + dx, y + 6)}v5`, INK, 0.6, 0.6);
      body += sh(`M${P(x - 10, y - 3)}H${f(x + 10)}L${P(x + 9, y + 2.5)}H${f(x - 9)}Z`, "#0a0506", 1);
      body += spec(`M${P(x - r + 3, y - 2)}Q${P(x - r + 2, y - r + 1)} ${P(x - 2, y - r - 1)}`, 0.6, 1.3);
      g += bar(x, y - 0.3, 17, 3.2, visor) + bar(x - 3, y - 0.8, 5, 1.2, "#ffffff");
      break;
    }
    case "crest": {
      const r = 13;
      body += sh(`M${P(x - 2.5, y - r - 11)}L${P(x + 2.5, y - r - 11)}L${P(x + 3.5, y - 2)}H${f(x - 3.5)}Z`, dark, 1.2);
      body += sh(`M${P(x - r, y + 5)}Q${P(x - r - 1, y - r)} ${P(x, y - r - 2)}Q${P(x + r + 1, y - r)} ${P(x + r, y + 5)}L${P(x + 7, y + r)}H${f(x - 7)}Z`, mat, 1.4);
      body += sh(`M${P(x - 10, y - 4)}H${f(x + 10)}V${f(y)}H${f(x + 2)}V${f(y + 9)}H${f(x - 2)}V${f(y)}H${f(x - 10)}Z`, "#05070b", 0.9);
      body += spec(`M${P(x - r + 3, y - 1)}Q${P(x - r + 2, y - r + 2)} ${P(x - 3, y - r)}`, 0.6, 1.3);
      g += bar(x, y - 2, 18, 2.6, visor) + bar(x, y + 4, 2.4, 8, visor);
      break;
    }
    case "gasmask": {
      body += sh(`M${P(x - 14, y + 10)}Q${P(x - 16, y - 12)} ${P(x, y - 16)}Q${P(x + 16, y - 12)} ${P(x + 14, y + 10)}Q${P(x, y + 16)} ${P(x - 14, y + 10)}Z`, "url(#cloth)", 1.4);
      body += sh(`M${P(x - 10, y - 6)}Q${P(x, y - 11)} ${P(x + 10, y - 6)}L${P(x + 8, y + 8)}Q${P(x, y + 12)} ${P(x - 8, y + 8)}Z`, mat, 1.2);
      body += circ(x - 5, y - 1, 4.2, "url(#gun)", 1.1) + circ(x + 5, y - 1, 4.2, "url(#gun)", 1.1);
      body += sh(`M${P(x - 4, y + 5)}h8l-1 7h-6Z`, "url(#gun)", 1);
      for (const s of [-1, 1]) body += circ(x + s * 8, y + 9, 3.4, "url(#armorDk)", 1) + ln(`M${P(x + s * 8 - 2, y + 9)}h4`, INK, 0.6, 0.6);
      g += circ(x - 5, y - 1, 2.6, visor, 0) + circ(x + 5, y - 1, 2.6, visor, 0) + circ(x - 6, y - 2, 0.9, "#ffffff", 0);
      break;
    }
    case "riot": {
      const r = 13;
      body += sh(`M${P(x - r, y + 5)}Q${P(x - r - 1, y - r - 1)} ${P(x, y - r - 2)}Q${P(x + r + 1, y - r - 1)} ${P(x + r, y + 5)}L${P(x + r - 2, y + r)}H${f(x - r + 2)}Z`, mat, 1.4);
      body += sh(`M${P(x - 11, y - 6)}H${f(x + 11)}L${P(x + 10, y + 9)}Q${P(x, y + 12)} ${P(x - 10, y + 9)}Z`, "url(#glass)", 1, ` fill-opacity=".8"`);
      body += `<path d="M${P(x - 8, y - 4)}L${P(x - 3, y - 4)}L${P(x - 7, y + 7)}Z" fill="#fff" opacity=".35"/>`;
      body += spec(`M${P(x - r + 3, y - 2)}Q${P(x - r + 2, y - r + 1)} ${P(x - 2, y - r)}`, 0.6, 1.3);
      g += bar(x, y - 1, 16, 2.6, visor);
      break;
    }
    case "cap": {
      body += sh(`M${P(x - 11, y + 8)}Q${P(x - 12, y - 8)} ${P(x, y - 9)}Q${P(x + 12, y - 8)} ${P(x + 11, y + 8)}Q${P(x, y + 13)} ${P(x - 11, y + 8)}Z`, "url(#skinD)", 1.3);
      body += sh(`M${P(x - 13, y - 5)}Q${P(x, y - 20)} ${P(x + 13, y - 5)}L${P(x + 16, y - 2)}H${f(x - 16)}Z`, mat, 1.3);
      body += sh(`M${P(x - 2.5, y - 14)}h5v5h-5Z`, "url(#brass)", 0.7);
      body += sh(`M${P(x - 11, y - 2)}H${f(x + 11)}V${f(y + 3)}H${f(x - 11)}Z`, "#070a0f", 0.9);
      body += ln(`M${P(x - 5, y + 8)}Q${P(x, y + 9.5)} ${P(x + 5, y + 8)}`, INK, 0.9, 0.7);
      g += bar(x - 5, y + 0.5, 7, 2.2, visor) + bar(x + 5, y + 0.5, 7, 2.2, visor);
      break;
    }
    default:
      break;
  }
  return { body, glow: g };
}

/* ── Pose helpers ────────────────────────────────────────────────────────── */

const WALK_A = { legL: { lift: 10, spread: -1 }, legR: { lift: 0 }, crouch: 1.5, tilt: -1.5 };
const WALK_B = { legL: { lift: 0 }, legR: { lift: 10, spread: -1 }, crouch: 1.5, tilt: 1.5 };
const HURT = { tilt: 8, crouch: 7, headX: 5, headDy: 3, legL: { lift: 5, spread: -2 }, legR: { spread: 5 } };
const BRACE = { crouch: 5, legL: { spread: -5 }, legR: { spread: 6 } };

const pose = (...parts) => Object.assign({}, ...parts);

/** Draw `fn(R, name)` for every pose in the table. */
function build(d, table, fn) {
  const out = {};
  for (const [name, p] of Object.entries(table)) out[name] = fn(biped(d, p), name);
  return out;
}

const up = (R, m) => `<g transform="${R.up}">${m}</g>`;

/** Antenna whip: a thin mast with a blinking tip, swaying about its base. */
const antennaFx = (anchor, len, tip, back = true) => [
  { box: [-8, -len - 6, 16, len + 8], markup: ln(`M0 0Q2 ${f(-len * 0.5)} 1 ${f(-len)}`, INK, 2.2) + ln(`M0 0Q2 ${f(-len * 0.5)} 1 ${f(-len)}`, "#4a5563", 1) + circ(1, -len - 1, 2, "url(#gun)", 0.8), anchor, anim: { type: "sway", amp: 0.12, speed: 0.0042, pivot: [0, 0] }, back },
  { box: [-8, -len - 8, 16, 14], markup: glow(circ(1, -len - 1, 1.7, tip, 0)), anchor, anim: { type: "blink", speed: 0.004 }, glow: true },
];

/* ── Voss's Henchman ─────────────────────────────────────────────────────── */

const HENCH_VARIANTS = [
  { helm: "dome", gun: "rifle", visor: "#ff8a3a", trim: "" },
  { helm: "gasmask", gun: "shotgun", visor: "#ffb347", trim: "#2a2118" },
  { helm: "crest", gun: "smg", visor: "#ff6a2a", trim: "#f2c230" },
];

function henchman(v = 0) {
  const V = HENCH_VARIANTS[v % HENCH_VARIANTS.length];
  const armsIdle = { armL: { sh: -8, el: -58, kf: 0.9 }, armR: { sh: 6, el: -30 } };
  const aim = { armL: { sh: -30, el: -72, kf: 0.6 }, armR: { sh: -8, el: -122, kf: 0.55 } };
  const table = {
    idle: armsIdle,
    moveA: pose(WALK_A, { armL: { sh: -4, el: -60, kf: 0.9 }, armR: { sh: 2, el: -26 } }),
    moveB: pose(WALK_B, { armL: { sh: -12, el: -56, kf: 0.9 }, armR: { sh: 10, el: -34 } }),
    windup: pose(BRACE, { tilt: -4, headDy: 2 }, aim),
    attack: pose(BRACE, { crouch: 2, tilt: 5, headX: 1, headDy: -1 }, { armL: { sh: -26, el: -66, kf: 0.6, dy: -3 }, armR: { sh: -6, el: -118, kf: 0.55, dy: -3 } }),
    hurt: pose(HURT, { armL: { sh: 34, el: -40, kf: 0.9 }, armR: { sh: 48, el: 10 } }),
  };
  const poses = build(HUMAN, table, (R, name) => {
    const aiming = name === "windup" || name === "attack";
    const { shY, hipY } = R;
    let body = legsOf(R, { pad: "url(#armor)", plate: "url(#armorDk)", trim: V.trim && V.trim !== "#2a2118" ? V.trim : "" });
    // Backpack with a coiled cable to the hip.
    let upper = sh(`M${P(-15, shY - 7)}H15V${f(shY + 22)}H-15Z`, "url(#gun)", 1.4) + sh(`M${P(8, shY - 10)}h8v7h-8Z`, "url(#armorDk)", 1);
    upper += torsoOf(R, { mat: "url(#armor)", dark: "url(#gun)" });
    upper += cable([-15, shY + 16], [-17, hipY - 4], 5);
    // Vest pouches and grenades.
    for (const x of [-13, -4.5, 4]) upper += plate([[x, shY + 24], [x + 8, shY + 24], [x + 8, shY + 32], [x, shY + 32]], "url(#armorDk)", 0.9, 0.3);
    if (V.gun === "shotgun") {
      upper += ln(`M${P(-22, shY - 2)}L${P(16, hipY - 10)}`, "#2a1a08", 4.2) + ln(`M${P(-22, shY - 2)}L${P(16, hipY - 10)}`, "#b8862e", 1.6, 0.9);
      for (let i = 0; i < 5; i++) upper += circ(-16 + i * 6.5, shY + 3 + i * 5, 1.4, "url(#brass)", 0.5);
    }
    upper += circ(12, hipY - 12, 3.2, "url(#armorDk)", 0.9);
    const head = helmet(R, V.helm, { visor: V.visor });
    const padTrim = V.trim === "#f2c230" ? V.trim : "";
    const armO = { trim: padTrim, guard: "url(#armorDk)" };
    let glowUp = head.glow;
    if (aiming) {
      const W = R.arms[1].W;
      const mx = W[0] - 6;
      const my = W[1] - 3;
      upper += armOf(R, 1, armO) + armOf(R, -1, armO) + head.body + gunAim(mx, my, 5.6, V.gun, "url(#armorDk)");
      glowUp += aimGlow(mx, my, 3, V.visor, name);
    } else {
      const WL = R.arms[-1].W;
      const WR = R.arms[1].W;
      upper += armOf(R, -1, armO) + head.body + gunSide(WR, heading(WR, WL) + (name === "hurt" ? 30 : 0), V.gun, V.gun === "smg" ? 36 : 46) + armOf(R, 1, armO);
      glowUp += circ(R.arms[-1].S[0] - 2, shY - 1, 1.2, "#7dff9a", 0);
    }
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)), at: { pack: R.upPt([12, shY - 10]) } };
  });
  return { poses, fx: antennaFx("pack", 26, "#ff6a1a") };
}

/* ── Corrupt SWAT officer ───────────────────────────────────────────────── */

const COP_VARIANTS = [
  { helm: "riot", gun: "smg", visor: "#7fd8ff", band: "#1a1204", lights: false },
  { helm: "gasmask", gun: "rifle", visor: "#ffd24a", band: "#1a1204", lights: true },
  { helm: "cap", gun: "smg", visor: "#ffe07a", band: "#f2c230", lights: false },
];

function corruptCop(v = 0) {
  const V = COP_VARIANTS[v % COP_VARIANTS.length];
  const shieldArm = { sh: -2, el: -80, kf: 0.75 };
  const table = {
    idle: { armL: shieldArm, armR: { sh: 8, el: -40 } },
    moveA: pose(WALK_A, { armL: shieldArm, armR: { sh: 4, el: -36 } }),
    moveB: pose(WALK_B, { armL: shieldArm, armR: { sh: 12, el: -44 } }),
    windup: pose(BRACE, { tilt: -3 }, { armL: { sh: -8, el: -80, kf: 0.75, dy: -6 }, armR: { sh: 20, el: -130, kf: 0.6, dy: -4 } }),
    attack: pose(BRACE, { crouch: 3, tilt: 4 }, { armL: { sh: -8, el: -80, kf: 0.75, dy: -6 }, armR: { sh: 20, el: -130, kf: 0.6, dy: -6 } }),
    hurt: pose(HURT, { armL: { sh: 20, el: -50, kf: 0.8 }, armR: { sh: 44, el: 6 } }),
  };
  const poses = build(HUMAN, table, (R, name) => {
    const aiming = name === "windup" || name === "attack";
    const { shY } = R;
    let body = legsOf(R, { pad: "url(#armorDk)" });
    let upper = torsoOf(R, { mat: "url(#armorDk)", dark: "url(#cloth)", w: 23 });
    upper += plate([[-15, shY + 2], [15, shY + 2], [13, shY + 26], [-13, shY + 26]], "url(#armor)", 1.1, 0.5);
    upper += ln(`M${P(-10, shY + 12)}H10`, V.band === "#f2c230" ? "#f2c230" : "#241703", 2.6, 0.95);
    upper += circ(-8, shY + 6, 2.2, "url(#brass)", 0.7);
    const head = helmet(R, V.helm, { visor: V.visor, mat: "url(#armorDk)" });
    let glowUp = head.glow;
    const WR = R.arms[1].W;
    if (aiming) {
      const mx = WR[0] - 2;
      const my = WR[1] - 3;
      upper += armOf(R, 1, { pad: "url(#armorDk)" }) + head.body + gunAim(mx, my, 4.8, V.gun);
      glowUp += aimGlow(mx, my, 2, "#ffd24a", name);
    } else {
      upper += armOf(R, 1, { pad: "url(#armorDk)" }) + head.body + gunSide(WR, 200, V.gun, 34);
    }
    // Riot shield on the left forearm, in front of everything.
    const WL = R.arms[-1].W;
    const tilt = name === "hurt" ? -14 : name === "windup" ? 4 : 0;
    const o = [WL[0] + 4, WL[1] + 6];
    const T = (pts) => rot(pts, tilt, [0, 0], o);
    const sw = 36;
    upper += armOf(R, -1, { pad: "url(#armorDk)" });
    upper += sh(poly(T([[-sw / 2, -54], [sw / 2, -54], [sw / 2 + 1, 38], [0, 45], [-sw / 2 - 1, 38]])), "url(#glass)", 1.9, ` fill-opacity=".86"`);
    upper += sh(poly(T([[-sw / 2 + 3, -50], [sw / 2 - 3, -50], [sw / 2 - 2, 35], [0, 41], [-sw / 2 + 2, 35]])), "none", 0.7);
    upper += sh(poly(T([[-sw / 2, -32], [sw / 2, -32], [sw / 2, -25], [-sw / 2, -25]])), V.band, 0.6, ` fill-opacity=".92"`);
    if (V.band === "#f2c230") for (let i = 0; i < 4; i++) upper += sh(poly(T([[-sw / 2 + 2 + i * 9, -25], [-sw / 2 + 7 + i * 9, -25], [-sw / 2 + 3 + i * 9, -32], [-sw / 2 - 2 + i * 9, -32]])), "#15110a", 0);
    upper += `<path d="${poly(T([[-sw / 2 + 5, -48], [-sw / 2 + 10, -48], [-sw / 2 + 10, 20], [-sw / 2 + 5, 24]]))}" fill="#fff" opacity=".32"/>`;
    upper += sh(poly(T([[-4, -12], [4, -12], [4, 4], [-4, 4]])), "url(#gun)", 0.8);
    if (V.lights) {
      upper += sh(poly(T([[-12, -58], [12, -58], [12, -53], [-12, -53]])), "url(#gun)", 0.8);
      const [l, r] = [T([[-6, -55.5]])[0], T([[6, -55.5]])[0]];
      glowUp += bar(l[0], l[1], 9, 3, "#ff3344") + bar(r[0], r[1], 9, 3, "#3a7bff");
    }
    glowUp += bar(R.arms[1].S[0], shY - 4, 5, 2.2, "#ff3344");
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)), at: { radio: R.upPt([R.arms[1].S[0] + 4, shY - 8]) } };
  });
  return { poses, fx: antennaFx("radio", 18, "#ff3344", false) };
}

/* ── Chronos PD: the squad and the Supervisor (friendly NPCs) ─────────────── */

/**
 * The face under any headgear: ears, jaw, brows, eyes, nose, mouth. `older`
 * gives the Supervisor his grey brows, lines and moustache.
 */
function officerFace(x, y, older, skin = "url(#skin)") {
  let m = circ(x - 10.5, y + 2, 2.6, skin, 0.9) + circ(x + 10.5, y + 2, 2.6, skin, 0.9);
  m += sh(`M${P(x - 10, y - 4)}Q${P(x - 11, y + 8)} ${P(x - 6, y + 12)}Q${P(x, y + 15)} ${P(x + 6, y + 12)}Q${P(x + 11, y + 8)} ${P(x + 10, y - 4)}Z`, skin, 1.2);
  m += ln(`M${P(x - 7, y - 1)}l4 -0.8M${P(x + 7, y - 1)}l-4 -0.8`, older ? "#9a9488" : "#2a1a10", 1.3, 0.95);
  m += circ(x - 4.5, y + 2, 1.15, "#16100c", 0) + circ(x + 4.5, y + 2, 1.15, "#16100c", 0);
  m += ln(`M${P(x, y + 2.5)}l-1 4.5h2`, "#5a3424", 0.8, 0.6);
  if (older) {
    m += sh(`M${P(x - 5, y + 8.2)}Q${P(x, y + 6.8)} ${P(x + 5, y + 8.2)}Q${P(x + 3, y + 10.2)} ${P(x, y + 9.2)}Q${P(x - 3, y + 10.2)} ${P(x - 5, y + 8.2)}Z`, "#a8a29a", 0.6);
    m += ln(`M${P(x - 8, y + 5)}q1 3 3 4M${P(x + 8, y + 5)}q-1 3 -3 4`, "#7a4a34", 0.6, 0.5);
  } else {
    m += ln(`M${P(x - 3, y + 9)}Q${P(x, y + 10)} ${P(x + 3, y + 9)}`, "#5a3424", 0.8, 0.7);
  }
  return m;
}

/** A peaked police cap over the face: crown, band, badge, brim. */
function capOver(x, y, band, cap = "url(#armorDk)") {
  let m = sh(`M${P(x - 12, y - 5)}Q${P(x - 14, y - 17)} ${P(x, y - 18)}Q${P(x + 14, y - 17)} ${P(x + 12, y - 5)}Z`, cap, 1.3);
  m += sh(`M${P(x - 12, y - 8)}H${f(x + 12)}V${f(y - 4)}H${f(x - 12)}Z`, band, 0.9);
  m += sh(`M${P(x - 2.6, y - 15)}l2.6 -2.4 2.6 2.4 -1 3.4h-3.2Z`, "url(#brass)", 0.7);
  m += sh(`M${P(x - 13, y - 4.5)}Q${P(x, y - 1.5)} ${P(x + 13, y - 4.5)}L${P(x + 11, y - 2.5)}Q${P(x, y + 0.5)} ${P(x - 11, y - 2.5)}Z`, "#06080c", 0.9);
  m += spec(`M${P(x - 10, y - 9)}Q${P(x - 10, y - 15)} ${P(x - 3, y - 16.5)}`, 0.5, 1.1);
  return m;
}

/** A face under a peaked cap: no visor, no glow, eyes you can meet. */
function officerHead(R, { band = "#1b2a48", older = false, cap = "url(#armorDk)" } = {}) {
  const [x, y] = R.head;
  return { body: ao(x, y + 12, 9, 3, 0.55) + officerFace(x, y, older) + capOver(x, y, band, cap), glow: "" };
}

/**
 * The squad's helmet: an older C-series shell with cheek guards, the suit's
 * cyan a generation dimmer. Open-faced, its visor pushed up on the brow; or,
 * kitted for the Engine level, the visor down and a faceplate over the jaw.
 */
function kitHead(R, { down = false, older = false, trim = "#5fd8ff" } = {}) {
  const [x, y] = R.head;
  let body = ao(x, y + 12, 9, 3, 0.55) + officerFace(x, y, older);
  // Shell over the crown and down the cheeks, framing the face.
  body += sh(`M${P(x - 14, y + 9)}L${P(x - 15, y - 4)}Q${P(x - 15, y - 19)} ${P(x, y - 20)}Q${P(x + 15, y - 19)} ${P(x + 15, y - 4)}L${P(x + 14, y + 9)}L${P(x + 10, y + 10)}L${P(x + 10.5, y - 4)}Q${P(x, y - 7)} ${P(x - 10.5, y - 4)}L${P(x - 10, y + 10)}Z`, "url(#armor)", 1.4);
  let glowM;
  if (down) {
    // Visor down over the eyes, the faceplate's vents over the mouth.
    body += sh(`M${P(x - 11.5, y - 5)}Q${P(x, y - 8)} ${P(x + 11.5, y - 5)}L${P(x + 11, y + 4)}Q${P(x, y + 2)} ${P(x - 11, y + 4)}Z`, "url(#glass)", 1.2, ` fill-opacity=".96"`);
    body += sh(`M${P(x - 10.5, y + 4)}Q${P(x, y + 2)} ${P(x + 10.5, y + 4)}L${P(x + 8, y + 12)}Q${P(x, y + 15)} ${P(x - 8, y + 12)}Z`, "url(#armorDk)", 1.2);
    body += ln(`M${P(x - 4, y + 7)}h8M${P(x - 3.5, y + 9.5)}h7M${P(x - 3, y + 12)}h6`, "#05070a", 1, 0.8);
    body += spec(`M${P(x - 9, y - 4)}Q${P(x - 4, y - 6.5)} ${P(x + 2, y - 6)}`, 0.5, 1);
    glowM = bar(x, y - 0.8, 17, 1.8, trim);
  } else {
    // Visor, raised: a dark glass band on the brow.
    body += sh(`M${P(x - 12, y - 14)}Q${P(x, y - 18)} ${P(x + 12, y - 14)}L${P(x + 11, y - 9)}Q${P(x, y - 12)} ${P(x - 11, y - 9)}Z`, "url(#glass)", 1.1, ` fill-opacity=".9"`);
    glowM = bar(x, y - 12.2, 14, 1.4, trim);
  }
  body += circ(x - 14, y - 2, 2.2, "url(#armorDk)", 0.9) + circ(x + 14, y - 2, 2.2, "url(#armorDk)", 0.9);
  body += spec(`M${P(x - 12, y - 6)}Q${P(x - 13, y - 16)} ${P(x - 4, y - 18.5)}`, 0.55, 1.2);
  return { body, glow: glowM };
}

/**
 * The back of a head: hair to the nape, the neck, the ears, and the headgear
 * from behind (a cap's crown and band, or the squad's helmet and its neck guard).
 */
function headBack(R, { gear = "cap", band = "#1b2a48", older = false }) {
  const [x, y] = R.head;
  const hair = older ? "#5c5752" : "#2a1c14";
  let body = ao(x, y + 14, 9, 3, 0.55);
  body += sh(`M${P(x - 5.5, y + 6)}V${f(y + 15)}H${f(x + 5.5)}V${f(y + 6)}Z`, "url(#skin)", 1);
  body += circ(x - 10.5, y + 2, 2.6, "url(#skin)", 0.9) + circ(x + 10.5, y + 2, 2.6, "url(#skin)", 0.9);
  body += sh(`M${P(x - 10, y - 4)}Q${P(x - 11, y + 8)} ${P(x - 5, y + 10)}Q${P(x, y + 11)} ${P(x + 5, y + 10)}Q${P(x + 11, y + 8)} ${P(x + 10, y - 4)}Z`, hair, 1.2);
  body += ln(`M${P(x - 4, y + 2)}q1 4 0 7M${P(x + 4, y + 2)}q-1 4 0 7`, "#000", 0.6, 0.35);
  // Grey at the temples and over the ears, for the Supervisor.
  if (older) body += ln(`M${P(x - 9.5, y - 3)}q-0.5 5 1.5 9M${P(x + 9.5, y - 3)}q0.5 5 -1.5 9`, "#b4aea6", 1.6, 0.8);
  if (gear === "cap") {
    body += sh(`M${P(x - 12, y - 5)}Q${P(x - 14, y - 17)} ${P(x, y - 18)}Q${P(x + 14, y - 17)} ${P(x + 12, y - 5)}Z`, "url(#armorDk)", 1.3);
    body += sh(`M${P(x - 12, y - 8)}H${f(x + 12)}V${f(y - 4)}H${f(x - 12)}Z`, band, 0.9);
  } else {
    body += sh(`M${P(x - 15, y + 6)}L${P(x - 15, y - 4)}Q${P(x - 15, y - 19)} ${P(x, y - 20)}Q${P(x + 15, y - 19)} ${P(x + 15, y - 4)}L${P(x + 15, y + 6)}Q${P(x, y + 10)} ${P(x - 15, y + 6)}Z`, "url(#armor)", 1.4);
    body += ln(`M${P(x - 13, y + 1)}Q${P(x, y + 5)} ${P(x + 13, y + 1)}`, INK, 0.8, 0.55);
    body += sh(`M${P(x - 2, y - 19)}h4v10h-4Z`, "url(#armorDk)", 0.7);
  }
  body += spec(`M${P(x - 11, y - 8)}Q${P(x - 12, y - 16)} ${P(x - 4, y - 17)}`, 0.45, 1.1);
  return { body, glow: "" };
}

/** A back, from the collar to the belt: one seam, the shoulder blades' shading. */
function torsoBack(R, { w = 22, waist = 16, mat = "url(#armor)", belt = "url(#gun)" } = {}) {
  const { shY, hipY } = R;
  let m = sh(`M${P(-7, shY - 11)}H7V${f(shY)}H-7Z`, "url(#skin)");
  m += sh(`M${P(-w, shY - 3)}Q${P(0, shY - 11)} ${P(w, shY - 3)}L${P(waist + 2, hipY - 12)}L${P(waist, hipY + 2)}H${f(-waist)}L${P(-waist - 2, hipY - 12)}Z`, mat, 1.3);
  m += ln(`M0 ${f(shY - 6)}V${f(hipY - 6)}`, INK, 0.8, 0.5);
  m += ao(-9, shY + 12, 7, 3, 0.3) + ao(9, shY + 12, 7, 3, 0.3);
  m += sh(`M${P(-waist - 2, hipY - 7)}H${f(waist + 2)}V${f(hipY + 1)}H${f(-waist - 2)}Z`, belt, 1.1);
  return m;
}

/** Stencilled lettering across a back panel. */
const backLettering = (y, text, color = "#e8edf5", size = 6, { spacing = 0.6, opacity = 0.92 } = {}) =>
  `<text x="0" y="${f(y)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="${size}" letter-spacing="${spacing}" fill="${color}" opacity="${opacity}">${text}</text>`;

/**
 * The squad's back placard, under the power pack: a black patch with the
 * unit's name small over a big PD, in worn silver, the way tactical teams
 * mark their backs. It reads as police from across a room without the
 * glare of white paint on dark plate.
 */
function backPlacard(y) {
  let m = sh(`M${P(-13, y)}h26v13h-26Z`, "#0b0f16", 0.8);
  m += ln(`M${P(-12, y + 12)}h24`, "#5fd8ff", 0.5, 0.45);
  m += backLettering(y + 4.2, "CHRONOS", "#9aa6b8", 3.2, { spacing: 1.1, opacity: 0.8 });
  m += backLettering(y + 10.6, "PD", "#c3ccd8", 7.2, { opacity: 0.9 });
  return m;
}

/** The salute: right hand at the cap brim, elbow out. */
const SALUTE = { armR: { sh: 120, el: 130, kf: 0.9 } };
/** Pointing the way: right arm out ahead. */
const POINT = { armR: { sh: 104, el: -8 } };

/** An arm halfway between two: a gesture's arm on its way up. */
function armBetween(a = { sh: 10, el: 6 }, b = { sh: 10, el: 6 }, t = 0.5) {
  const mix = (k, d) => (a[k] ?? d) + ((b[k] ?? d) - (a[k] ?? d)) * t;
  return { sh: mix("sh", 0), el: mix("el", 0), kf: mix("kf", 1), ku: mix("ku", 1) };
}

/**
 * The people's walk: four frames a step cycle. Step A, the left foot planted
 * ahead (nearer the camera, so a touch lower) and the right heel coming up
 * behind, the body at its lowest; move B, the right leg swinging through, the
 * body up over the left; then the same on the other foot. The arms swing
 * against the legs: the one ahead bends at the elbow and comes in front of
 * the body, the one behind hangs straight and a little out. `armL`/`armR`
 * pin an arm that carries something (a slung rifle).
 */
function npcWalk({ fwd = { sh: 3, el: 30, kf: 0.82 }, back = { sh: 16, el: 4 }, mid = { sh: 9, el: 14 }, armL = null, armR = null } = {}) {
  const frame = (legs, l, r, crouch, tilt) => ({ ...legs, armL: armL ?? l, armR: armR ?? r, crouch, tilt });
  return {
    stepA: frame({ legL: { lift: -2.5, spread: -0.5 }, legR: { lift: 4, spread: 1.5 } }, back, fwd, 2.5, -0.6),
    moveB: frame({ legL: { lift: 0 }, legR: { lift: 9, spread: -2 } }, mid, mid, 0, 1.4),
    stepB: frame({ legL: { lift: 4, spread: 1.5 }, legR: { lift: -2.5, spread: -0.5 } }, fwd, back, 2.5, 0.6),
    moveA: frame({ legL: { lift: 9, spread: -2 }, legR: { lift: 0 } }, mid, mid, 0, -1.4),
  };
}

/**
 * Every NPC pose, front and back: the back ones mirror the walk cycle, and a
 * gesture's In frame is its arm halfway up, so the sprite eases into it.
 * `more` adds a kind's own poses (the civilians' cower, frozen, slumped).
 */
function npcTable(idle, walk, salute, point, more = {}) {
  return {
    idle, ...walk, salute, point,
    saluteIn: pose(salute, { armR: armBetween(idle.armR, salute.armR, 0.45) }),
    pointIn: pose(point, { armR: armBetween(idle.armR, point.armR, 0.45) }),
    backIdle: idle, backA: walk.moveA, backB: walk.moveB, backStepA: walk.stepA, backStepB: walk.stepB,
    ...more,
  };
}

/**
 * The squad on duty, before the call: PD navy shirt and trousers, the peaked
 * cap, a sidearm on the belt. `officerKit` is the same people kitted up.
 */
function officer() {
  const table = npcTable(
    { armL: { sh: 8, el: 10 }, armR: { sh: 8, el: 10 } },
    npcWalk(),
    pose({ armL: { sh: 4, el: 2 } }, SALUTE),
    pose({ armL: { sh: 8, el: 6 } }, POINT),
    // The pulse catches officers too: the civilians' mid-stride stop.
    { frozen: CIV_POSES.frozen },
  );
  const sleeve = { mat: "url(#armor)", guard: "url(#armor)", hand: "url(#skin)", pad: "", upW: 11, foreW: 9.5 };
  const poses = build(HUMAN, table, (R, name) => {
    const { shY, hipY } = R;
    let body = legsOf(R, { under: "url(#armorDk)", pad: "", plate: "", thighW: 14, kneeW: 11.5, ankleW: 9.5, bootW: 13 });
    let upper = "";
    if (name.startsWith("back")) {
      upper += armOf(R, -1, sleeve) + armOf(R, 1, sleeve);
      upper += torsoBack(R, { w: 21, waist: 15, mat: "url(#armor)" });
      upper += backLettering(shY + 14, "CHRONOS PD", "#6f86ab", 3.6, { opacity: 0.7 });
      upper += headBack(R, { gear: "cap" }).body;
    } else {
      upper += torsoOf(R, { mat: "url(#armor)", under: "url(#armor)", w: 21, waist: 15, plates: false });
      // Collar, placket and pockets; the badge over the heart, the name bar.
      upper += ln(`M${P(-7, shY - 4)}L0 ${f(shY + 3)}L7 ${f(shY - 4)}`, "#0c1424", 1.2, 0.8);
      upper += ln(`M0 ${f(shY + 3)}V${f(hipY - 8)}`, "#0c1424", 0.8, 0.6);
      for (const s of [-1, 1]) upper += sh(`M${P(s * 5, shY + 5)}h${f(s * 10)}v9h${f(-s * 10)}Z`, "url(#armorDk)", 0.6);
      upper += sh(`M${P(-12, shY + 1)}l3 -3 3 3 -1 4h-4Z`, "url(#brass)", 0.7);
      upper += sh(`M${P(5, shY + 1.5)}h9v2.4h-9Z`, "#d8dee8", 0.5);
      // The sidearm, holstered on the right hip.
      upper += sh(`M${P(15, hipY - 8)}h6v13h-6Z`, "#0b0d12", 0.8);
      const head = officerHead(R);
      upper += armOf(R, -1, sleeve) + head.body + armOf(R, 1, sleeve);
    }
    body += up(R, upper);
    return { body, glow: "", at: {} };
  });
  return { poses, fx: [] };
}

/**
 * The squad in heavy armour: plate over the PD navy, broad pauldrons, a
 * gorget, the visor down, a rifle slung across the chest. The armour of a
 * few C-series generations ago; what the cadet puts on is the one after all
 * of it.
 */
function officerKit() {
  return heavyKit();
}

/**
 * Lt. Rasczak kitted up: the squads' C-series, blacked out and made his own.
 * A command whip off the radio pack, a tech module strapped to the left
 * forearm, pouches of tools on the belt, his lieutenant's bar and a tally
 * on the pauldrons, the helmet's crown striped and scarred. The visor
 * burns red, and he carries the shotgun he signs out every morning.
 */
function rasczakKit() {
  const red = "#ff4a2e";
  const bar1 = (s, shY) => sh(`M${P(s * 22 - 4.5, shY - 5)}h9v3.4h-9Z`, "#dfe4ea", 0.6);
  // Five kills to a gate, notched in the paint.
  const tally = (shY) => ln(`M${P(-27, shY - 3)}v5M${P(-24.8, shY - 3)}v5M${P(-22.6, shY - 3)}v5M${P(-20.4, shY - 3)}v5M${P(-28.4, shY + 1.4)}l9.6 -4`, "#e8e2d6", 0.9, 0.85);
  // The command whip: from the radio pack on the right shoulder to above his head.
  const whip = (x, shY) => ln(`M${P(x, shY - 6)}L${P(x * 1.3, -100)}`, "#16191e", 1.8) + ln(`M${P(x - 0.4, shY - 6)}L${P(x * 1.3 - 0.4, -100)}`, "#7a828c", 0.5, 0.6) + sh(`M${P(x - 3, shY - 9)}h6v5h-6Z`, "url(#gun)", 0.8);
  const stripe = (R) => {
    const [x, y] = R.head;
    return sh(`M${P(x - 1.8, y - 20)}h3.6l-0.4 11h-2.8Z`, "#d8dde4", 0.5);
  };
  return heavyKit({
    trim: red,
    gun: "shotgun",
    gunLen: 46,
    padTrim: "#8a1c14",
    deco: {
      frontBehind: (R) => whip(14, R.shY),
      chest: (R) => {
        const { shY, hipY } = R;
        // A valour ribbon under the name bar, and the pouches on the belt.
        let m = sh(`M${P(4, shY + 8.6)}h10v2.4h-10Z`, "#c23a3a", 0.4) + sh(`M${P(8, shY + 8.6)}h2v2.4h-2Z`, "#f0f0ec", 0);
        for (const [px, w] of [[-18, 6], [-11.5, 5.5], [10, 7]]) m += sh(`M${P(px, hipY - 13)}h${f(w)}v8h${f(-w)}Z`, "url(#armorDk)", 0.8) + ln(`M${P(px, hipY - 10.5)}h${f(w)}`, INK, 0.6, 0.6);
        return m;
      },
      frontOver: (R) => {
        const { shY } = R;
        const [x, y] = R.head;
        const { E, W } = R.arms[-1];
        // The tech module over the left forearm: a dark case, a cable to the elbow.
        const m0 = lerp(E, W, 0.55);
        let m = sh(`M${P(m0[0] - 6.5, m0[1] - 5)}h13v10h-13Z`, "url(#gun)", 1.1) + sh(`M${P(m0[0] - 4.5, m0[1] - 3)}h9v4.5h-9Z`, "#0a0e12", 0.5);
        m += ln(`M${P(m0[0] + 6, m0[1] + 2)}Q${P(E[0] + 7, E[1] + 2)} ${P(E[0] + 3, E[1] - 4)}`, "#20242a", 1.4);
        // Scratches across the shell, the stripe up the crown.
        m += stripe(R) + ln(`M${P(x + 4, y - 17)}l7 6M${P(x + 5.5, y - 18.5)}l7 6M${P(x + 7, y - 19.5)}l6 5`, "#c4cad2", 0.7, 0.75);
        m += bar1(1, shY) + tally(shY);
        return m;
      },
      frontGlow: (R) => {
        const m0 = lerp(R.arms[-1].E, R.arms[-1].W, 0.55);
        return bar(m0[0], m0[1] - 0.8, 8, 2.2, "#ffb347") + circ(14 * 1.3, -100, 1.7, red, 0);
      },
      backOver: (R) => whip(-14, R.shY) + sh(`M${P(-17, R.shY - 4)}h10v14h-10Z`, "url(#gun)", 0.9),
      backTop: (R) => stripe(R) + bar1(-1, R.shY),
      backGlow: () => circ(-14 * 1.3, -100, 1.7, red, 0),
    },
  });
}

/**
 * Sgt. Kael kitted up: the squad's wall. A wider frame in the heaviest plate
 * there is: doubled pauldrons, a slab over the chest, thick thigh and shin
 * plate, a brow guard on the helmet, and on his left arm the breacher shield
 * with his blue chevron, a viewport slit near its top. A short carbine in the
 * other hand; the shield is the weapon.
 */
function kaelKit() {
  const blue = "#4488ff";
  const shield = (R, back) => {
    const W = R.arms[-1].W;
    const cx = W[0] - 3;
    const top = R.shY - 10;
    const bot = R.hipY + 34;
    const pts = [[cx - 15, top + 4], [cx - 11, top], [cx + 11, top], [cx + 15, top + 4], [cx + 15, bot - 6], [cx + 9, bot], [cx - 9, bot], [cx - 15, bot - 6]];
    let m = ao(cx, bot + 2, 14, 3, 0.4) + sh(poly(pts), back ? "url(#armorDk)" : "url(#steel)", 1.6);
    if (back) {
      // The back face: two straps and the arm brace.
      m += sh(`M${P(cx - 12, top + 20)}h24v4h-24Z`, "url(#gun)", 0.8) + sh(`M${P(cx - 12, top + 40)}h24v4h-24Z`, "url(#gun)", 0.8);
      return m;
    }
    m += sh(poly([[cx - 12, top + 5], [cx - 9, top + 2.5], [cx + 9, top + 2.5], [cx + 12, top + 5], [cx + 12, bot - 7.5], [cx + 7.5, bot - 3], [cx - 7.5, bot - 3], [cx - 12, bot - 7.5]]), "url(#armor)", 0.8);
    // Viewport slit, rivets, the PD stencil.
    m += sh(`M${P(cx - 8, top + 8)}h16v3.6h-16Z`, "url(#glass)", 0.8);
    for (const [rx, ry] of [[-12.5, 8], [12.5, 8], [-12.5, 40], [12.5, 40], [-12.5, 72], [12.5, 72]]) m += circ(cx + rx, top + ry, 1, "url(#steel)", 0.5);
    m += backLettering(bot - 9, "PD", "#c3ccd8", 6.4, { opacity: 0.75 });
    m += spec(`M${P(cx - 13, top + 6)}L${P(cx - 13, bot - 9)}`, 0.5, 1.2);
    return m;
  };
  const chevron = (R) => {
    const cx = R.arms[-1].W[0] - 3;
    const top = R.shY - 10;
    return ln(`M${P(cx, top + 16)}V${f(top + 58)}M${P(cx - 7, top + 26)}L${P(cx, top + 19)}L${P(cx + 7, top + 26)}`, blue, 2);
  };
  return heavyKit({
    trim: blue,
    rig: { ...HUMAN, shW: 24, hipW: 10, stance: 5 },
    bulk: 1.24,
    gun: "smg",
    gunLen: 36,
    deco: {
      chest: (R) => {
        const { shY } = R;
        // The slab over the chest, riveted, and a second lame under each pauldron.
        let m = plate([[-21, shY - 1], [21, shY - 1], [20, shY + 25], [0, shY + 29], [-20, shY + 25]], "url(#armor)", 1.5, 0.5);
        m += plate([[-15, shY + 4], [15, shY + 4], [14, shY + 20], [0, shY + 23], [-14, shY + 20]], "url(#armorDk)", 1, 0.25);
        for (const [rx, ry] of [[-18, shY + 2], [18, shY + 2], [-17, shY + 22], [17, shY + 22]]) m += circ(rx, ry, 1.1, "url(#steel)", 0.5);
        for (const s of [-1, 1]) {
          const [sx, sy] = R.arms[s].S;
          m += sh(`M${P(sx - 17, sy + 5)}H${f(sx + 17)}L${P(sx + 15, sy + 15)}Q${P(sx, sy + 18)} ${P(sx - 15, sy + 15)}Z`, "url(#armorDk)", 1.3);
        }
        return m;
      },
      frontOver: (R) => {
        const [x, y] = R.head;
        // Brow guard over the visor, then the shield on the left arm.
        return sh(`M${P(x - 16, y - 5)}Q${P(x, y - 9)} ${P(x + 16, y - 5)}L${P(x + 14, y - 10)}Q${P(x, y - 14)} ${P(x - 14, y - 10)}Z`, "url(#armorDk)", 1.2) + shield(R, false);
      },
      frontGlow: (R) => chevron(R),
      backBehind: (R) => shield(R, true),
    },
  });
}

/**
 * The Supervisor in his own heavy plate, after 06:47 (js/tutorial-system.js):
 * the C-series in its dress finish, the plate he usually wears on parade.
 * Polished navy, every edge in gold: gold-rimmed pauldrons with three bars
 * and a star, a brass gorget, a gold ridge down the helmet, the sash and the
 * ribbons, an aiguillette from the right shoulder, a short crimson cape. Still
 * plate, and still a rifle: the visor up, so it is still his face.
 */
function supervisorKit() {
  const gold = "#e0b84a";
  const boards = (shY) => [-1, 1].map((s) => {
    let m = "";
    for (let k = 0; k < 3; k++) m += sh(`M${P(s * 22 - 4.5, shY - 7 + k * 3.2)}h9v2.4h-9Z`, "url(#brass)", 0.5);
    return m + sh(`M${P(s * 22, shY + 3)}l1.2 2.6 2.8 0.3 -2.1 1.9 0.6 2.8 -2.5 -1.4 -2.5 1.4 0.6 -2.8 -2.1 -1.9 2.8 -0.3Z`, "url(#brass)", 0.5);
  }).join("");
  const ridge = (R) => {
    const [x, y] = R.head;
    return sh(`M${P(x - 2.4, y - 21)}h4.8l-0.8 10h-3.2Z`, "url(#brass)", 0.7);
  };
  const cape = (R, back) => {
    const { shY, hipY } = R;
    const hem = hipY + (back ? 30 : 28);
    let m = sh(`M${P(-22, shY - 4)}Q${P(0, shY - (back ? 10 : 6))} ${P(22, shY - 4)}L${P(31, hem)}Q${P(0, hem + 5)} ${P(-31, hem)}Z`, "url(#capeS)", 1.3);
    m += ln(`M${P(-30.4, hem - 1.2)}Q${P(0, hem + 3.6)} ${P(30.4, hem - 1.2)}`, gold, 1.8, 0.95);
    if (back) {
      m += ln(`M${P(-10, shY + 4)}Q${P(-14, hipY)} ${P(-17, hem - 2)}M${P(10, shY + 4)}Q${P(14, hipY)} ${P(17, hem - 2)}`, INK, 0.9, 0.5);
      // The Bureau's clock in gold between the shoulder blades.
      m += circ(0, shY + 16, 6, "none", 0, ` stroke="${gold}" stroke-width="1.4"`) + ln(`M0 ${f(shY + 16)}v-4M0 ${f(shY + 16)}l3 1.5`, gold, 1.1);
    }
    return m;
  };
  return heavyKit({
    trim: gold,
    padTrim: gold,
    visorDown: false,
    older: true,
    gorget: "url(#brass)",
    deco: {
      under: (R) => cape(R, false),
      chest: (R) => {
        const { shY, hipY } = R;
        // The sash, shoulder to hip, gold-edged; the ribbon rack beside it.
        let m = sh(`M${P(-19, shY - 1)}L${P(-12, shY - 3)}L${P(18, hipY - 6)}L${P(12, hipY - 3)}Z`, "#8a1a22", 0.8);
        m += ln(`M${P(-18.5, shY - 1)}L${P(12.5, hipY - 3)}M${P(-12.5, shY - 3)}L${P(17.5, hipY - 6)}`, gold, 0.8, 0.9);
        const rib = ["#c23a3a", "#2a6ac2", "#e0b84a", "#2a8a5a", "#f0f0ec", "#7a2a9a"];
        rib.forEach((c, i) => {
          m += sh(`M${P(4 + (i % 3) * 3.6, shY + 3 + Math.floor(i / 3) * 2.6)}h3.4v2.4h-3.4Z`, c, 0.3);
        });
        return m;
      },
      frontOver: (R) => {
        const { shY } = R;
        // The aiguillette, looped from the right pauldron to the chest.
        let m = ln(`M${P(22, shY - 1)}Q${P(16, shY + 14)} ${P(6, shY + 9)}M${P(22, shY + 1)}Q${P(18, shY + 18)} ${P(7, shY + 12)}`, "#f0d27a", 1.3, 0.95);
        m += ridge(R) + boards(shY);
        return m;
      },
      backOver: (R) => cape(R, true),
      backTop: (R) => ridge(R) + boards(R.shY),
    },
  });
}

/**
 * C-series heavy plate on the NPC rig, in a squad's trim, a lieutenant's,
 * a sergeant's or the Supervisor's. `rig` and `bulk` size the frame and its
 * plate; `deco` hooks add a character's own kit at each layer: `under` behind
 * the legs, `frontBehind` behind the torso, `chest` over the breastplate and
 * under the arms, `frontOver` over everything; `backBehind`, `backOver`
 * (before the head) and `backTop` from behind; and their emissive layers.
 */
function heavyKit({ trim = "#5fd8ff", visorDown = true, older = false, rig = HUMAN, bulk = 1, gun = "rifle", gunLen = 44, padTrim = "", gorget = "url(#armorDk)", deco = {} } = {}) {
  const slung = { sh: 14, el: -64, kf: 0.85 };
  const table = npcTable(
    { armL: { sh: 10, el: 6 }, armR: slung },
    npcWalk({ fwd: { sh: 5, el: 28, kf: 0.84 }, back: { sh: 20, el: 4 }, mid: { sh: 12, el: 12 }, armR: slung }),
    pose({ armL: { sh: 4, el: 2 } }, SALUTE),
    pose({ armL: { sh: 8, el: 6 } }, POINT),
    { frozen: { ...CIV_POSES.frozen, armR: slung } },
  );
  const b = bulk;
  const call = (k, R, name) => (deco[k] ? deco[k](R, name) : "");
  const poses = build(rig, table, (R, name) => {
    const { shY, hipY } = R;
    const back = name.startsWith("back");
    const under = back ? "" : call("under", R, name);
    let body = under ? up(R, under) : "";
    body += legsOf(R, { under: "url(#cloth)", pad: "url(#armorDk)", plate: "url(#armor)", thighW: 17 * b, kneeW: 14 * b, ankleW: 10 * b, bootW: 16 * b, trim });
    const pad = { mat: "url(#armorDk)", guard: "url(#armor)", hand: "url(#gun)", pad: "url(#armor)", padR: 15 * b, upW: 13 * b, foreW: 12.5 * b, trim: padTrim };
    let upper = "";
    let glowUp = "";
    if (back) {
      upper += call("backBehind", R, name);
      upper += armOf(R, -1, pad) + armOf(R, 1, pad);
      upper += torsoBack(R, { w: 26 * b, waist: 18 * b, mat: "url(#armor)" });
      // The rifle's stock and sling across the back, under the pack and placard.
      upper += ln(`M${P(-20 * b, shY - 2)}L${P(17 * b, hipY - 4)}`, "#141a24", 2.6, 0.9);
      // Power pack between the shoulder blades, and the unit's lettering.
      upper += plate([[-13 * b, shY - 2], [13 * b, shY - 2], [12 * b, shY + 19], [-12 * b, shY + 19]], "url(#armorDk)", 1.3, 0.4);
      for (const s of [-1, 1]) upper += sh(`M${P(s * 8 - 1.5, shY + 2)}h3v13h-3Z`, "url(#gun)", 0.6);
      upper += backPlacard(shY + 21);
      upper += call("backOver", R, name);
      glowUp += bar(-8, shY + 8.5, 2.4, 11, trim) + bar(8, shY + 8.5, 2.4, 11, trim);
      glowUp += call("backGlow", R, name);
      upper += headBack(R, { gear: "helmet", older }).body;
      upper += call("backTop", R, name);
    } else {
      upper += call("frontBehind", R, name);
      upper += torsoOf(R, { mat: "url(#armor)", dark: "url(#armorDk)", under: "url(#armorDk)", w: 26 * b, waist: 18 * b });
      // Gorget over the collar, and the breastplate's ballistic insert.
      upper += plate([[-11 * b, shY - 9], [11 * b, shY - 9], [13 * b, shY - 2], [0, shY + 1], [-13 * b, shY - 2]], gorget, 1.2, 0.45);
      upper += plate([[-17 * b, shY + 1], [17 * b, shY + 1], [15 * b, shY + 21], [0, shY + 24], [-15 * b, shY + 21]], "url(#armor)", 1.3, 0.5);
      // Chest rig: the PD shield, a name bar, the C-series power cells.
      upper += sh(`M${P(-12, shY + 5)}l3.5 -3.5 3.5 3.5 -1.2 4.6h-4.6Z`, "url(#brass)", 0.7);
      upper += sh(`M${P(4, shY + 5)}h10v2.6h-10Z`, "#d8dee8", 0.5);
      for (let i = 0; i < 3; i++) upper += sh(`M${P(-10 + i * 7, shY + 26)}h5.5v8h-5.5Z`, "url(#armorDk)", 0.7);
      upper += call("chest", R, name);
      glowUp += bar(0, shY + 16, 16, 1.6, trim);
      glowUp += bar(-16 * b, shY + 11, 4, 1.4, trim) + bar(16 * b, shY + 11, 4, 1.4, trim);
      const head = kitHead(R, { down: visorDown, older, trim });
      glowUp += head.glow;
      upper += armOf(R, -1, pad);
      if (name.startsWith("salute")) {
        upper += head.body + armOf(R, 1, pad) + gunSide([R.arms[-1].W[0] + 4, R.arms[-1].W[1]], 160, gun, gunLen - 2);
      } else {
        // Weapon slung across the chest, the right hand on its grip.
        upper += head.body + gunSide(R.arms[1].W, 210, gun, gunLen) + armOf(R, 1, pad);
      }
      upper += call("frontOver", R, name);
      glowUp += call("frontGlow", R, name);
    }
    body += up(R, upper);
    return { body, glow: glowUp ? up(R, glow(glowUp)) : "", at: {} };
  });
  return { poses, fx: [] };
}

/** The Supervisor: older, a long coat with gold boards, a gold-banded cap. */
function supervisor() {
  const table = npcTable(
    { armL: { sh: 6, el: 18 }, armR: { sh: 6, el: 18 } },
    // An older man's walk: a shorter arm swing.
    npcWalk({ fwd: { sh: 4, el: 26, kf: 0.86 }, back: { sh: 12, el: 8 }, mid: { sh: 7, el: 16 } }),
    pose({ armL: { sh: 4, el: 4 } }, SALUTE),
    pose({ armL: { sh: 6, el: 18 } }, POINT),
    { frozen: CIV_POSES.frozen },
  );
  const poses = build(HUMAN, table, (R, name) => {
    const { shY, hipY } = R;
    let body = legsOf(R, { under: "url(#armorDk)", pad: "", boot: "url(#gun)", plate: "" });
    const back = name.startsWith("back");
    const kneeY = R.legs[1].K[1];
    const arm = (s) => armOf(R, s, { mat: "url(#armor)", guard: "url(#armor)", hand: "url(#skin)", pad: "url(#armorDk)", padR: 8, trim: "#e0b84a" });
    let upper = "";
    if (back) {
      upper += arm(-1) + arm(1);
      // The coat from behind: a centre seam, a vent, the belt across.
      upper += sh(`M${P(-23, shY - 2)}Q${P(0, shY - 10)} ${P(23, shY - 2)}L${P(21, kneeY + 4)}H${f(-21)}Z`, "url(#armor)", 1.3);
      upper += ln(`M0 ${f(shY - 4)}V${f(hipY - 6)}`, INK, 0.8, 0.5);
      upper += ln(`M0 ${f(hipY - 2)}V${f(kneeY + 4)}`, INK, 1.1, 0.7);
      upper += sh(`M${P(-22, hipY - 6)}H22V${f(hipY - 2)}H-22Z`, "url(#gun)", 0.9);
      upper += sh(`M${P(-7, shY - 9)}H7V${f(shY - 3)}H-7Z`, "url(#armorDk)", 0.8);
      upper += headBack(R, { gear: "cap", band: "#c9a03a", older: true }).body;
    } else {
      // Long coat to the knee, over the legs.
      upper += sh(`M${P(-23, shY - 2)}Q${P(0, shY - 10)} ${P(23, shY - 2)}L${P(21, kneeY + 4)}H${f(-21)}Z`, "url(#armor)", 1.3);
      upper += ln(`M0 ${f(shY - 2)}V${f(kneeY + 4)}`, INK, 0.9, 0.6);
      // Lapels, shirt, tie.
      upper += sh(`M${P(-7, shY - 9)}L${P(0, shY + 16)}L${P(7, shY - 9)}Z`, "#d9dee6", 0.6);
      upper += sh(`M${P(-2, shY - 6)}h4l1.5 18 -3.5 4 -3.5 -4Z`, "#5a1a1a", 0.6);
      upper += sh(`M${P(-14, shY - 6)}L${P(-4, shY + 20)}L${P(-9, shY + 20)}Z`, "url(#armorDk)", 0.8);
      upper += sh(`M${P(14, shY - 6)}L${P(4, shY + 20)}L${P(9, shY + 20)}Z`, "url(#armorDk)", 0.8);
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) upper += circ(s * 8, shY + 26 + i * 9, 1.1, "url(#brass)", 0.4);
      upper += sh(`M${P(-22, hipY - 6)}H22V${f(hipY - 2)}H-22Z`, "url(#gun)", 0.9);
      // Ribbons.
      upper += sh(`M${P(-15, shY + 6)}h8v2.2h-8Z`, "#c23a3a", 0.4) + sh(`M${P(-15, shY + 8.6)}h8v2.2h-8Z`, "#2a6ac2", 0.4);
      const head = officerHead(R, { band: "#c9a03a", older: true });
      upper += arm(-1) + arm(1);
      upper = name.startsWith("salute") ? head.body + upper : upper + head.body;
    }
    body += up(R, upper);
    return { body, glow: "", at: {} };
  });
  return { poses, fx: [] };
}

/* ── The station's civilians ────────────────────────────────────────────── */

const grad = (id, a, b, c) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;

/**
 * The civilians' own poses, for the office floor's horror beats. Cower: down
 * on the haunches, forearms over the head. Frozen: caught by the time freeze
 * mid-stride, half turned, a hand reaching for something. Slumped: sat on
 * the floor against a wall, legs out, head fallen to one shoulder.
 */
const CIV_POSES = {
  cower: { crouch: 20, tilt: 5, headX: -2, headDy: 7, legL: { lift: 3, spread: -5 }, legR: { lift: 1, spread: 6 }, armL: { sh: 112, el: 140, kf: 0.85 }, armR: { sh: 106, el: 146, kf: 0.85 } },
  frozen: { tilt: 6, headX: 3, headDy: 1, legL: { lift: 12, spread: -3 }, legR: { lift: -1.5, spread: 2 }, armL: { sh: 26, el: 34, kf: 0.85 }, armR: { sh: 74, el: -14 } },
  slumped: { crouch: 50, tilt: 7, headX: 5, headDy: 6, legL: { lift: -5, spread: -11 }, legR: { lift: -3, spread: 13 }, armL: { sh: 28, el: -8 }, armR: { sh: 22, el: 4 } },
};

/**
 * Who they are, per kind and look: what they wear, their hair, their skin,
 * the colour of the lanyard. No caps, no plate, no navy: lighter, warmer
 * clothes and an ID card on the chest, so they never read as the squad.
 */
const CIV_LOOKS = {
  staff: [
    // A lab tech in a white coat over teal scrubs, goggles pushed up.
    { garment: "labcoat", skin: "url(#skin)", hair: "#2a1d16", style: "short", goggles: true, strap: "#2f7fd0", legs: "url(#slacks)", shirt: "url(#scrubs)", coat: "url(#coat)" },
    // An engineer in slate coveralls with hi-vis bands and a tool belt.
    { garment: "coveralls", skin: "url(#skin2)", hair: "#151010", style: "bun", strap: "#d0802f", legs: "url(#cov)", shirt: "url(#cov)", coat: "url(#cov)" },
  ],
  clerk: [
    // Shirt and an open cardigan, hair to the shoulders.
    { garment: "cardigan", skin: "url(#skin)", hair: "#6a4428", style: "long", strap: "#c23a5a", legs: "url(#slacks)", shirt: "url(#shirt)", coat: "url(#cardi)" },
    // Shirt and a camel blazer, close curls, glasses.
    { garment: "blazer", skin: "url(#skin2)", hair: "#17120f", style: "curly", glasses: true, strap: "#3aa07a", legs: "url(#slacks)", shirt: "url(#shirtW)", coat: "url(#blazer)" },
  ],
};

/** The ID card on its lanyard; from behind, only the strap round the neck. */
function lanyard(R, strap, back = false) {
  const { shY } = R;
  if (back) return ln(`M${P(-6.5, shY - 9)}Q0 ${f(shY - 4.5)} 6.5 ${f(shY - 9)}`, strap, 1.7, 0.95);
  let m = ln(`M${P(-6, shY - 9)}L${P(-1.6, shY + 13)}M${P(6, shY - 9)}L${P(1.6, shY + 13)}`, strap, 1.5, 0.95);
  m += sh(`M${P(-4.4, shY + 13)}h8.8v11.5h-8.8Z`, "#eef1f4", 0.6);
  m += sh(`M${P(-4.4, shY + 13)}h8.8v2.8h-8.8Z`, strap, 0);
  m += sh(`M${P(-3, shY + 17)}h3.2v4h-3.2Z`, "#8a96a6", 0);
  m += ln(`M${P(1.2, shY + 17.8)}h2M${P(1.2, shY + 20)}h2`, "#5a6370", 0.6, 0.8);
  return m;
}

/** A bare head: hair (short, a bun, to the shoulders, close curls), glasses or goggles. */
function civHead(R, look, back) {
  const [x, y] = R.head;
  const { skin, hair, style } = look;
  let m = ao(x, y + 12, 9, 3, 0.55);
  if (style === "long") m += sh(`M${P(x - 12, y - 4)}Q${P(x - 14.5, y + 12)} ${P(x - 11.5, y + 20)}H${f(x + 11.5)}Q${P(x + 14.5, y + 12)} ${P(x + 12, y - 4)}Z`, hair, 1.2);
  if (style === "bun") m += circ(x + (back ? 0 : 5), y - 16.5, 6, hair, 1.2);
  if (back) {
    m += sh(`M${P(x - 5.5, y + 6)}V${f(y + 15)}H${f(x + 5.5)}V${f(y + 6)}Z`, skin, 1);
    m += circ(x - 10.5, y + 2, 2.6, skin, 0.9) + circ(x + 10.5, y + 2, 2.6, skin, 0.9);
    const nape = style === "long" ? y + 19 : y + 9;
    m += sh(`M${P(x - 11, y - 4)}Q${P(x - 12, nape - 2)} ${P(x - 5, nape)}Q${P(x, nape + 1)} ${P(x + 5, nape)}Q${P(x + 12, nape - 2)} ${P(x + 11, y - 4)}Q${P(x + 12, y - 16)} ${P(x, y - 16.5)}Q${P(x - 12, y - 16)} ${P(x - 11, y - 4)}Z`, hair, 1.2);
    if (style === "curly") for (let i = 0; i < 6; i++) m += circ(x - 9 + i * 3.6, y - 12 + Math.abs(i - 2.5) * 1.3, 3.2, hair, 0.6);
    if (style === "bun") m += ln(`M${P(x - 4, y - 11)}Q${P(x, y - 9)} ${P(x + 4, y - 11)}`, "#000", 0.7, 0.4);
    if (look.goggles) m += sh(`M${P(x - 11.5, y - 9)}Q${P(x, y - 6)} ${P(x + 11.5, y - 9)}V${f(y - 6.5)}Q${P(x, y - 3.5)} ${P(x - 11.5, y - 6.5)}Z`, "#1d2a33", 0.7);
    m += ln(`M${P(x - 4, y + 1)}q1 4 0 7M${P(x + 4, y + 1)}q-1 4 0 7`, "#000", 0.6, 0.3);
    return m;
  }
  m += officerFace(x, y, false, skin);
  if (style === "short") {
    m += sh(`M${P(x - 11, y + 1)}Q${P(x - 13, y - 15)} ${P(x, y - 15.5)}Q${P(x + 13, y - 15)} ${P(x + 11, y + 1)}L${P(x + 10, y - 4)}Q${P(x + 3, y - 9)} ${P(x - 6, y - 6)}L${P(x - 10, y - 3)}Z`, hair, 1.2);
  } else if (style === "long") {
    m += sh(`M${P(x - 11, y + 5)}Q${P(x - 13, y - 15)} ${P(x, y - 15)}Q${P(x + 13, y - 15)} ${P(x + 11, y + 5)}L${P(x + 9.5, y - 3)}Q${P(x + 5, y - 8)} ${P(x + 0.5, y - 9)}Q${P(x - 5, y - 8)} ${P(x - 9.5, y - 3)}Z`, hair, 1.2);
  } else if (style === "bun") {
    m += sh(`M${P(x - 10.5, y - 2)}Q${P(x - 12, y - 15)} ${P(x, y - 15)}Q${P(x + 12, y - 15)} ${P(x + 10.5, y - 2)}Q${P(x, y - 9)} ${P(x - 10.5, y - 2)}Z`, hair, 1.2);
    m += ln(`M${P(x - 6, y - 7)}Q${P(x - 2, y - 13)} ${P(x + 4, y - 13)}`, "#ffffff", 0.6, 0.15);
  } else {
    m += sh(`M${P(x - 10.5, y - 2)}Q${P(x - 12, y - 14)} ${P(x, y - 14.5)}Q${P(x + 12, y - 14)} ${P(x + 10.5, y - 2)}Q${P(x, y - 6)} ${P(x - 10.5, y - 2)}Z`, hair, 1);
    for (let i = 0; i < 6; i++) m += circ(x - 9 + i * 3.6, y - 11 + Math.abs(i - 2.5) * 1.4, 3.3, hair, 0.6);
  }
  if (look.glasses) {
    m += `<g fill="none" stroke="#1a1a1e" stroke-width="0.9">${`<rect x="${f(x - 8.6)}" y="${f(y - 0.6)}" width="7.2" height="5.2" rx="1.6"/><rect x="${f(x + 1.4)}" y="${f(y - 0.6)}" width="7.2" height="5.2" rx="1.6"/>`}</g>`;
    m += ln(`M${P(x - 1.4, y + 1)}h2.8`, "#1a1a1e", 0.8);
  }
  if (look.goggles) {
    m += sh(`M${P(x - 11.5, y - 10.5)}H${f(x + 11.5)}V${f(y - 8)}H${f(x - 11.5)}Z`, "#1d2a33", 0.7);
    for (const s of [-1, 1]) m += ell(x + s * 5, y - 10, 4.6, 3.2, "url(#lens)", 0.9);
    m += spec(`M${P(x - 8, y - 11.5)}l2 -0.8M${P(x + 2, y - 11.5)}l2 -0.8`, 0.7, 0.8);
  }
  return m;
}

/** One of the office floor's people: `kind` is "staff" or "clerk". */
function civilian(kind) {
  return (v = 0) => {
    const look = CIV_LOOKS[kind][v % CIV_LOOKS[kind].length];
    const idle = { armL: { sh: 6, el: 14 }, armR: { sh: 6, el: 16 } };
    const table = npcTable(
      idle,
      npcWalk({ fwd: { sh: 3, el: 28, kf: 0.84 }, back: { sh: 14, el: 6 }, mid: { sh: 7, el: 15 } }),
      // A civilian's "salute" is a raised hand: hello, or over here.
      pose({ armL: { sh: 6, el: 14 } }, { armR: { sh: 150, el: 24, kf: 0.92 } }),
      pose({ armL: { sh: 6, el: 14 } }, POINT),
      CIV_POSES,
    );
    const poses = build(HUMAN, table, (R, name) => {
      const { shY, hipY } = R;
      const back = name.startsWith("back");
      const cov = look.garment === "coveralls";
      let body = legsOf(R, { under: look.legs, pad: "", plate: "", thighW: 13.5, kneeW: 11, ankleW: 9, bootW: 12, boot: "url(#shoe)", trim: cov ? "#d8d27a" : "" });
      const kneeY = Math.max(R.legs[1].K[1], R.legs[-1].K[1], hipY + 10);
      const sleeve = { mat: look.coat, guard: look.coat, hand: look.skin, pad: "", upW: 11.5, foreW: 10 };
      let upper = "";
      // How far down the outer layer comes: a lab coat to the knee, a cardigan
      // or blazer over the hips.
      const hem = look.garment === "labcoat" ? kneeY + 6 : hipY + (look.garment === "blazer" ? 8 : 5);
      if (back) {
        upper += armOf(R, -1, sleeve) + armOf(R, 1, sleeve);
        upper += torsoBack(R, { w: 20, waist: 15, mat: look.coat, belt: cov ? "url(#gun)" : look.coat });
        if (!cov) {
          upper += sh(`M${P(-21, shY - 2)}Q${P(0, shY - 9)} ${P(21, shY - 2)}L${P(19.5, hem)}H${f(-19.5)}Z`, look.coat, 1.3);
          upper += ln(`M0 ${f(shY - 4)}V${f(hem)}`, INK, 0.8, 0.5);
          if (look.garment === "labcoat") upper += ln(`M0 ${f(hipY)}V${f(hem)}`, INK, 1.1, 0.6);
        } else {
          upper += sh(`M${P(-18, shY + 10)}h36v3.2h-36Z`, "#d8d27a", 0.6);
          upper += backLettering(shY + 21, "ENGINEERING", "#c8d2d6", 3.4, { opacity: 0.75, spacing: 0.4 });
        }
        upper += lanyard(R, look.strap, true);
        upper += civHead(R, look, true);
      } else {
        upper += torsoOf(R, { mat: look.shirt, under: look.shirt, w: 19, waist: 15, plates: false, belt: cov ? "url(#gun)" : "url(#slacks)" });
        if (cov) {
          // Coveralls: a zip, a chest pocket, hi-vis bands, a tool belt.
          upper += ln(`M0 ${f(shY - 6)}V${f(hipY - 7)}`, "#1a2628", 1, 0.8);
          upper += sh(`M${P(5, shY + 3)}h9v8h-9Z`, "url(#covDk)", 0.6);
          upper += sh(`M${P(-19, shY + 12)}h38v3.4h-38Z`, "#d8d27a", 0.6);
          for (const s of [-1, 1]) upper += sh(`M${P(s * 12 - 3.5, hipY - 8)}h7v10h-7Z`, "#3a2a1a", 0.7);
          upper += ln(`M${P(-14, shY + 4)}l4 -2`, "#d8d27a", 1, 0.8);
        } else {
          // The open outer layer in two halves, the shirt showing between.
          const gap = look.garment === "blazer" ? 4 : 5;
          for (const s of [-1, 1]) {
            upper += sh(`M${P(s * 21, shY - 2)}Q${P(s * 12, shY - 9)} ${P(s * 6.5, shY - 9)}L${P(s * gap, hem)}H${f(s * 19.5)}Z`, look.coat, 1.3);
            // Lapel line.
            upper += ln(`M${P(s * 6.5, shY - 8)}L${P(s * (gap + 3), shY + 14)}`, INK, 0.9, 0.55);
            // Hip pockets.
            upper += ln(`M${P(s * (gap + 4), hipY - 2)}h${f(s * 9)}`, INK, 0.8, 0.5);
          }
          if (look.garment === "labcoat") {
            upper += ln(`M${P(-15, shY + 6)}v-4M${P(-13, shY + 6)}v-5`, "#2f6fd0", 1.2);
            upper += ln(`M${P(-17, shY + 6)}h7`, INK, 0.7, 0.5);
          } else if (look.garment === "cardigan") {
            for (let i = 0; i < 4; i++) upper += circ(-gap - 1.6, shY + 4 + i * 8, 0.9, "#f0e6d8", 0.3);
            upper += sh(`M${P(-6, shY - 8)}L0 ${f(shY - 3)}L6 ${f(shY - 8)}L4 ${f(shY - 10)}H-4Z`, "url(#shirt)", 0.6);
          } else {
            upper += sh(`M${P(-15, shY + 4)}l2.5 -3 2.5 3Z`, "#d8a33a", 0.4);
            upper += sh(`M${P(-6, shY - 8)}L0 ${f(shY - 2)}L6 ${f(shY - 8)}L4 ${f(shY - 10)}H-4Z`, "url(#shirtW)", 0.6);
          }
        }
        upper += lanyard(R, look.strap);
        const head = civHead(R, look, false);
        // Cowering, the forearms come in front of the face.
        upper += name === "cower" ? head + armOf(R, -1, sleeve) + armOf(R, 1, sleeve) : armOf(R, -1, sleeve) + head + armOf(R, 1, sleeve);
      }
      body += up(R, upper);
      return { body, glow: "", at: {} };
    });
    return { poses, fx: [] };
  };
}

const CIV_DEFS = {
  staff:
    grad("skin", "#e8bf9a", "#b98462", "#5e3a26") + grad("skin2", "#9a6a4a", "#6a4430", "#2a1810") +
    grad("coat", "#f4f6f8", "#d2d8de", "#7e8892") + grad("scrubs", "#4fa8a0", "#2f7a74", "#123a38") +
    grad("cov", "#6f8a8e", "#4a6266", "#1c2628") + grad("covDk", "#4a6266", "#33474a", "#141c1e") +
    grad("slacks", "#5c626c", "#3e434b", "#181b20") + grad("shoe", "#4a3a2e", "#2a2018", "#0c0806") +
    grad("lens", "#bfe6ff", "#5a8aa8", "#1c2e3a"),
  clerk:
    grad("skin", "#f0cdb0", "#c99a78", "#6a4630") + grad("skin2", "#7a5038", "#553424", "#20120a") +
    grad("shirt", "#d6e6f6", "#a8c0d8", "#566a80") + grad("shirtW", "#f6f6f2", "#d8d8d2", "#7a7a76") +
    grad("cardi", "#a85a62", "#7c3e46", "#3a1a1e") + grad("blazer", "#b08a5e", "#86663e", "#3e2c16") +
    grad("slacks", "#4e4a52", "#36333a", "#141216") + grad("shoe", "#3a2a22", "#20160f", "#0a0604"),
};

/* ── Turned views (shield bearers) ──────────────────────────────────────── */

// A shield bearer is drawn from five sides (src/rendering/facing-view.js), so
// you can see where its shield points: `idle@side`, `moveA@back`… The bash's
// windup and strike only happen with you in front of it and stay front-on.
export const TURNED_POSES = ["idle", "moveA", "moveB", "hurt"];
export const TURNED_VIEWS = ["threeNear", "threeFar", "side", "back"];

/** Add every turned view of the turned poses to a pose table (same joints). */
function withTurnedViews(table) {
  for (const p of TURNED_POSES) {
    if (!table[p]) continue;
    for (const v of TURNED_VIEWS) table[`${p}@${v}`] = table[p];
  }
  return table;
}

/** Split a table key into its pose and view ("idle@side" → ["idle", "side"]). */
const viewOf = (name) => {
  const i = name.indexOf("@");
  return i < 0 ? [name, "front"] : [name.slice(0, i), name.slice(i + 1)];
};

/** Squeeze markup horizontally about x = cx, then shift it by dx (a body or shield turning). */
const turnX = (m, k, dx = 0, cx = 0) => (m ? `<g transform="translate(${f(cx + dx)} 0) scale(${f(k)} 1) translate(${f(-cx)} 0)">${m}</g>` : "");
const mirrorX = (m) => `<g transform="scale(-1 1)">${m}</g>`;

/**
 * The power core on a shield bearer's back: the rear-only `core` hit zone
 * (data/enemies.js SHIELDED_FRONT_ZONES), drawn hot so its back reads as the
 * place to shoot. Returns { body, glow }.
 */
function backCore(x, y, r) {
  let body = circ(x, y, r + 3, "url(#armorDk)", 1.6) + circ(x, y, r, "#2a1206", 1.1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    body += ln(`M${P(x + Math.cos(a) * (r + 0.5), y + Math.sin(a) * (r + 0.5))}L${P(x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3))}`, INK, 1.4, 0.8);
  }
  body += ln(`M${P(x - r - 8, y - 2)}h4M${P(x - r - 8, y + 2)}h4M${P(x + r + 4, y - 2)}h4M${P(x + r + 4, y + 2)}h4`, "#1a0d06", 1.6, 0.9);
  const g =
    circ(x, y, r * 0.86, "#ff7a1e", 0) + circ(x, y, r * 0.55, "#ffc45a", 0) + circ(x, y, r * 0.26, "#fff4d6", 0) +
    glyphRing(x, y, r + 0.5, 6, "#ffae4a", 1) +
    ln(`M${P(x - r - 8, y - 2)}h4M${P(x - r - 8, y + 2)}h4M${P(x + r + 4, y - 2)}h4M${P(x + r + 4, y + 2)}h4`, "#ff9a3a", 1, 0.9);
  return { body, glow: g };
}

/** The core's rim seen from the side, at the back edge of a profile. */
function coreSliver(x, y, r) {
  return {
    body: ell(x, y, r * 0.42, r + 3, "url(#armorDk)", 1.4),
    glow: ell(x + 0.6, y, r * 0.24, r * 0.8, "#ff8a2a", 0) + ell(x + 0.8, y, r * 0.12, r * 0.45, "#ffe0a0", 0),
  };
}

/**
 * Compose one view of a shield bearer from its parts (all in upper-body space
 * except `legs`, which sit under the torso lean):
 *   legs, torso, weapon (weapon arm and what it holds), head, offArm (the
 *   shield arm), shield (face-on, centred on x = shieldX), edge (the shield
 *   edge-on, centred on x = 0), backBody / backHead (its back), core
 *   ([x, y, r] of the power core on its back);
 *   glows: eyes (eyesSide in profile), chest, weaponGlow, rune (on the shield
 *   face), edgeGlow (on the edge-on shield).
 * `side` is the side of the front view the shield is on (-1 left, +1 right);
 * `shieldUnder` draws it behind the body from the front.
 * `sideFx` / `backFx` say what its secondary-motion layers do in those views
 * ("over": its back layers, a cape, hang in front of it; "none": hidden).
 * `R` is the pose's rig. Returns { body, glow, fx? } for the view.
 */
function turnedView(R, view, p) {
  const { legs, torso, weapon, head, offArm, shield, shieldX, edge, eyes, rune, core } = p;
  const chest = p.chest || "";
  const wg = p.weaponGlow || "";
  const s = p.side ?? -1;
  const headAt = (m, dx) => `<g transform="translate(${f(dx)} 0)">${m}</g>`;
  switch (view) {
    case "threeFar": {
      // Turned toward its shield side, the shield arm away: the shield,
      // foreshortened, out at that edge and partly behind it.
      const k = 0.82;
      const bodyUp = turnX(torso + weapon + headAt(head, s * 4) + offArm, k, -s * 3);
      const sh0 = turnX(shield, 0.66, s * 12, shieldX);
      return {
        body: turnX(legs, k, -s * 3) + up(R, sh0 + bodyUp),
        glow: up(R, glow(turnX(headAt(eyes, s * 4) + chest + wg, k, -s * 3) + turnX(rune, 0.66, s * 12, shieldX))),
      };
    }
    case "threeNear": {
      // Turned away from its shield side, the shield arm toward you: the
      // shield slides across in front of its chest.
      const k = 0.82;
      const bodyUp = turnX(torso + weapon + headAt(head, -s * 4) + offArm, k, s * 3);
      const sh0 = turnX(shield, 0.72, -s * 28, shieldX);
      return {
        body: turnX(legs, k, s * 3) + up(R, bodyUp + sh0),
        glow: up(R, glow(turnX(headAt(eyes, -s * 4) + wg, k, s * 3) + turnX(rune, 0.72, -s * 28, shieldX))),
      };
    }
    case "side": {
      // A profile facing its shield side: narrow, the visor at the front
      // edge, the shield edge-on out in front, the core's rim at its back.
      const k = 0.58;
      const back = coreSliver(-s * 19, core[1], core[2]);
      // Its arms come in over its middle, the shield arm reaching forward.
      const bodyUp = turnX(torso + headAt(head, s * 6), k) + back.body + turnX(offArm, k) + turnX(weapon, k, s * 14);
      const slab = headAt(edge, s * 26);
      return {
        body: turnX(legs, k) + up(R, bodyUp + slab),
        glow: up(R, glow(turnX(headAt(p.eyesSide ?? eyes, s * 6), k) + turnX(wg, k, s * 14) + back.glow + headAt(p.edgeGlow || "", s * 26))),
        fx: p.sideFx,
      };
    }
    case "back": {
      // Its back: arms swapped over, the shield behind it with an edge past
      // its shoulder, and the core in the middle of its back.
      const c = backCore(core[0], core[1], core[2]);
      const sh0 = turnX(shield, 0.5, -s * 44 - shieldX, shieldX);
      const arms = mirrorX(weapon + offArm);
      return {
        body: legs + up(R, sh0 + arms + p.backBody + c.body + p.backHead),
        glow: up(R, glow(c.glow, true)),
        fx: p.backFx,
      };
    }
    default: {
      const rest = torso + weapon + head + offArm;
      return { body: legs + up(R, p.shieldUnder ? shield + rest : rest + shield), glow: up(R, glow(eyes + chest + wg + rune)) };
    }
  }
}

/* ── Chrono Sentinel ────────────────────────────────────────────────────── */

const SENTINEL = { hipY: 10, hipW: 13, stance: 4, thigh: 34, shin: 30, foot: 10, shY: -46, shW: 32, ua: 28, fa: 26, headY: -70 };

function sentinel(v = 0) {
  const halberd = v % 2 === 1;
  const shieldArm = { sh: -4, el: -70, kf: 0.8 };
  const table = withTurnedViews({
    idle: { armL: shieldArm, armR: { sh: 18, el: -4 } },
    moveA: pose(WALK_A, { armL: shieldArm, armR: { sh: 14, el: -2 }, crouch: 2 }),
    moveB: pose(WALK_B, { armL: shieldArm, armR: { sh: 22, el: -6 }, crouch: 2 }),
    windup: pose({ crouch: 9, tilt: -7, headX: -2, legL: { spread: -6 }, legR: { spread: 7 } }, { armL: { sh: -12, el: -56, kf: 0.8 }, armR: { sh: 128, el: 30, kf: 0.9 } }),
    attack: pose({ crouch: 10, tilt: 7, headDy: 3, legL: { spread: -5 }, legR: { spread: 8, lift: 2 } }, { armL: { sh: 10, el: -36, kf: 0.8 }, armR: { sh: 36, el: -100, kf: 0.9 } }),
    hurt: pose(HURT, { tilt: 6, armL: { sh: 16, el: -50, kf: 0.8 }, armR: { sh: 36, el: 4 } }),
  });
  const poses = build(SENTINEL, table, (R, key) => {
    const [name, view] = viewOf(key);
    const legs = legsOf(R, { thighW: 18, kneeW: 16, ankleW: 14, bootW: 20, under: "url(#armorDk)", pad: "url(#armor)", boot: "url(#armorDk)" });
    const { shY, hipY } = R;
    let torso = plate([[-34, shY - 6], [34, shY - 6], [28, hipY - 6], [-28, hipY - 6]], "url(#armor)", 1.6, 0.6);
    const belt = plate([[-18, hipY - 12], [18, hipY - 12], [16, hipY + 4], [-16, hipY + 4]], "url(#armorDk)", 1.2, 0.3);
    torso += belt;
    torso += plate([[-22, shY + 4], [22, shY + 4], [18, shY + 30], [-18, shY + 30]], "url(#steel)", 1.1, 0.5);
    torso += ln(`M0 ${f(shY + 4)}V${f(shY + 30)}M-20 ${f(shY + 17)}H20`, INK, 1, 0.6);
    for (const [x, y] of [[-28, shY - 2], [28, shY - 2], [-24, hipY - 10], [24, hipY - 10]]) torso += circ(x, y, 1.5, "url(#brass)", 0.5);
    torso += glyphRing(0, shY + 17, 7, 8, "#1b2a3f", 1);
    // Weapon arm (right): great axe or halberd.
    const WR = R.arms[1].W;
    const axeDeg = name === "windup" ? 196 : name === "attack" ? 252 : name === "hurt" ? 150 : 166;
    const shaftEnd = polar(WR, axeDeg, halberd ? 66 : 58);
    const shaftBot = polar(WR, axeDeg + 180, 30);
    const hd = heading(shaftBot, shaftEnd);
    const L = (bx, by) => polar(polar(shaftEnd, hd + 180, by), hd + 90, bx);
    let weapon = sh(capsule(shaftBot, shaftEnd, 3.8, 3.2), "url(#gun)", 1.1);
    for (const t of [0.35, 0.6]) weapon += ln(`M${P(...lerp(shaftBot, shaftEnd, t))}l1 1`, "url(#brass)", 3);
    if (halberd) {
      const blade = [L(-2, 8), L(0, 6), L(22, 4), L(30, 20), L(20, 30), L(0, 24)];
      weapon += sh(poly(blade), "url(#steel)", 1.3) + sh(poly([L(-2, 8), L(-12, 14), L(-2, 20)]), "url(#steel)", 1.1);
      weapon += sh(poly([L(-2.5, 6), L(0, -16), L(2.5, 6)]), "url(#steel)", 1.1);
      weapon += spec(`M${P(...L(24, 8))}L${P(...L(29, 19))}`, 0.8, 1.4);
    } else {
      const blade = [L(-6, 4), L(0, 0), L(26, -12), L(40, 6), L(34, 34), L(12, 24), L(0, 20), L(-6, 18)];
      weapon += sh(poly(blade), "url(#steel)", 1.3) + spec(`M${P(...L(40, 6))}L${P(...L(34, 34))}`, 0.9, 1.6);
      weapon += ln(`M${P(...L(8, 6))}L${P(...L(22, 14))}`, INK, 0.8, 0.5);
    }
    weapon += circ(shaftEnd[0], shaftEnd[1], 3.2, "url(#brass)", 1);
    const armPlate = { upW: 17, foreW: 16, mat: "url(#armorDk)", guard: "url(#armor)", padR: 16 };
    weapon += armOf(R, 1, armPlate);
    const [hx, hy] = R.head;
    const helm = `M${P(hx - 17, hy - 14)}Q${P(hx, hy - 20)} ${P(hx + 17, hy - 14)}V${f(hy + 10)}L${P(hx + 11, hy + 17)}H${f(hx - 11)}L${P(hx - 17, hy + 10)}Z`;
    let horns = "";
    if (halberd) for (const s of [-1, 1]) horns += sh(`M${P(hx + s * 14, hy - 12)}Q${P(hx + s * 26, hy - 20)} ${P(hx + s * 24, hy - 34)}Q${P(hx + s * 20, hy - 22)} ${P(hx + s * 10, hy - 16)}Z`, "url(#steel)", 1.1);
    let head = sh(helm, "url(#armor)", 1.6) + spec(`M${P(hx - 14, hy - 12)}Q${P(hx - 6, hy - 16)} ${P(hx + 2, hy - 16)}`, 0.7, 1.4) + horns;
    let eyes;
    if (halberd) {
      head += sh(`M${P(hx - 11, hy - 4)}H${f(hx + 11)}V${f(hy)}H${f(hx + 2)}V${f(hy + 11)}H${f(hx - 2)}V${f(hy)}H${f(hx - 11)}Z`, "#05070b", 0.8);
      eyes = bar(hx, hy - 2, 20, 3, "#bfe6ff") + bar(hx, hy + 4, 3, 12, "#bfe6ff");
    } else {
      head += sh(`M${P(hx - 9, hy - 3)}H${f(hx + 9)}V${f(hy + 1)}H${f(hx - 9)}Z`, "#05070b", 0.8) + sh(`M${P(hx - 2, hy - 9)}H${f(hx + 2)}V${f(hy + 8)}H${f(hx - 2)}Z`, "#05070b", 0.8);
      eyes = bar(hx, hy - 1, 17, 3, "#bfe6ff") + bar(hx, hy, 3, 15, "#bfe6ff");
    }
    for (let i = 0; i < 4; i++) head += circ(hx - 12 + i * 8, hy + 12, 1.2, "#0b1119", 0);
    const offArm = armOf(R, -1, armPlate);
    // Tower shield with a rune cross.
    const WL = R.arms[-1].W;
    const t = name === "hurt" ? -10 : name === "windup" ? 6 : 0;
    const o = [WL[0] - 6, WL[1] + 2];
    const T = (pts) => rot(pts, t, [0, 0], o);
    let shield = sh(poly(T([[-19, -58], [19, -58], [21, 52], [0, 62], [-21, 52]])), "url(#steel)", 1.9);
    shield += sh(poly(T([[-13, -50], [13, -50], [14, 46], [0, 54], [-14, 46]])), "url(#armorDk)", 0.9);
    shield += spec(`M${P(...T([[-17, -54]])[0])}L${P(...T([[-19, 48]])[0])}`, 0.6, 1.5);
    const cross = T([[-2, -40], [2, -40], [2, -8], [11, -8], [11, -4], [2, -4], [2, 36], [-2, 36], [-2, -4], [-11, -4], [-11, -8], [-2, -8]]);
    shield += sh(poly(cross), "url(#steel)", 0.7);
    // Edge-on: the tower shield's thickness, banded, with its rim lit.
    const [, eTop] = T([[0, -58]])[0];
    const [, eBot] = T([[0, 62]])[0];
    const edge =
      sh(`M-6 ${f(eTop + 3)}Q0 ${f(eTop - 3)} 6 ${f(eTop + 3)}Q8 ${f((eTop + eBot) / 2)} 6 ${f(eBot - 6)}Q0 ${f(eBot + 3)} -6 ${f(eBot - 6)}Q-3 ${f((eTop + eBot) / 2)} -6 ${f(eTop + 3)}Z`, "url(#steel)", 1.9) +
      ln(`M-2 ${f(eTop + 4)}Q0 ${f((eTop + eBot) / 2)} -2 ${f(eBot - 6)}`, "url(#brass)", 1.6, 0.9) +
      ln(`M-5 ${f(eTop + 30)}h11M-5 ${f(eTop + 70)}h11`, INK, 1, 0.6) + spec(`M4 ${f(eTop + 5)}Q6 ${f((eTop + eBot) / 2)} 4 ${f(eBot - 8)}`, 0.5, 1);
    const runeC = T([[0, -6]])[0];
    const charging = name === "windup" || name === "attack";
    const chest = circ(0, shY + 17, charging ? 5.5 : 3.5, "#9fd8ff", 0) + glyphRing(0, shY + 17, 7, 8, "#6fb4ff", 0.9);
    const rune = glyphRing(runeC[0], runeC[1], 9, 6, "#8cc8ff", 1.1) + circ(runeC[0], runeC[1], 2.4, "#cfeaff", 0);
    // Its back: the back plate, a spine, the helm's back with no visor.
    const backBody =
      plate([[-34, shY - 6], [34, shY - 6], [28, hipY - 6], [-28, hipY - 6]], "url(#armorDk)", 1.6, 0.5) + belt +
      plate([[-30, shY - 2], [-4, shY - 2], [-6, shY + 12], [-26, shY + 10]], "url(#armor)", 1.1, 0.5) +
      plate([[4, shY - 2], [30, shY - 2], [26, shY + 10], [6, shY + 12]], "url(#armor)", 1.1, 0.2) +
      ln(`M0 ${f(shY + 30)}V${f(hipY - 12)}`, INK, 1.4, 0.7) +
      [0, 1, 2].map((i) => plate([[-5, shY + 32 + i * 6], [5, shY + 32 + i * 6], [4, shY + 36 + i * 6], [-4, shY + 36 + i * 6]], "url(#steel)", 0.8, 0.2)).join("");
    const backHead =
      sh(helm, "url(#armorDk)", 1.6) + horns + spec(`M${P(hx - 14, hy - 12)}Q${P(hx - 6, hy - 16)} ${P(hx + 2, hy - 16)}`, 0.5, 1.2) +
      ln(`M${P(hx, hy - 18)}V${f(hy + 14)}M${P(hx - 15, hy + 4)}H${f(hx + 15)}`, INK, 1.2, 0.7) +
      [-10, -4, 4, 10].map((dx) => circ(hx + dx, hy + 4, 1.3, "url(#brass)", 0.4)).join("");
    const eyesSide = bar(hx - 11, hy - 1, 7, 3, "#bfe6ff");
    const v2 = turnedView(R, view, {
      legs, torso, weapon, head, offArm, shield, shieldX: o[0], edge, eyes, eyesSide, chest, rune,
      core: [0, shY + 17, 10], backBody, backHead,
    });
    return { body: v2.body, glow: v2.glow, at: { hip: R.upPt([0, hipY - 2]) } };
  });
  // Tabard hanging between the legs.
  const tabard = sh(`M-9 0H9L10 34Q5 38 0 35Q-5 38 -10 34Z`, "url(#tabard)", 1.3) + ln(`M-5 4V30M5 4V30`, INK, 0.7, 0.4) + glyphRing(0, 14, 3.5, 6, "#8fb0d8", 0.8, 2);
  return { poses, fx: [{ box: [-16, -4, 32, 46], markup: tabard, anchor: "hip", anim: { type: "sway", amp: 0.07, speed: 0.0021, pivot: [0, 0] }, back: true }] };
}

/* ── Shield Commander (sub-boss) ────────────────────────────────────────── */

const COMMANDER = { ...HUMAN, shW: 23, hipW: 9, headY: -60 };

function shieldCommander() {
  const table = withTurnedViews({
    idle: { armL: { sh: -10, el: -70, kf: 0.8 }, armR: { sh: 12, el: -10 } },
    moveA: pose(WALK_A, { armL: { sh: -10, el: -70, kf: 0.8 }, armR: { sh: 8, el: -6 } }),
    moveB: pose(WALK_B, { armL: { sh: -10, el: -70, kf: 0.8 }, armR: { sh: 16, el: -14 } }),
    windup: pose(BRACE, { tilt: -3 }, { armL: { sh: -14, el: -76, kf: 0.8, dy: -3 }, armR: { sh: 150, el: -30, ku: 0.9, kf: 0.8 } }),
    attack: pose(BRACE, { crouch: 2, tilt: 3 }, { armL: { sh: -14, el: -76, kf: 0.8, dy: -3 }, armR: { sh: 80, el: 10, ku: 0.9, kf: 0.8 } }),
    hurt: pose(HURT, { armL: { sh: 20, el: -60, kf: 0.8 }, armR: { sh: 44, el: 8 } }),
  });
  const poses = build(COMMANDER, table, (R, key) => {
    const [name, view] = viewOf(key);
    const { shY, hipY } = R;
    const legs = legsOf(R, { pad: "url(#armor)", trim: "#e8c46a" });
    let torso = torsoOf(R, { w: 27, waist: 17, mat: "url(#armor)" });
    torso += plate([[-10, shY + 2], [10, shY + 2], [7, shY + 24], [-7, shY + 24]], "url(#armorDk)", 1, 0.3);
    for (const y of [shY + 8, shY + 13, shY + 18]) torso += ln(`M-4 ${f(y)}Q0 ${f(y - 2)} 4 ${f(y)}`, "#e8c46a", 1, 0.9);
    torso += ln(`M${P(-24, shY + 1)}Q0 ${f(shY + 10)} 24 ${f(shY + 1)}`, "#e8c46a", 1.4, 0.8);
    const bigPad = { pad: "url(#armor)", padR: 15, upW: 13, foreW: 12, mat: "url(#cloth)", guard: "url(#armorDk)", trim: "#e8c46a" };
    let weapon = armOf(R, 1, bigPad);
    const WR = R.arms[1].W;
    const cd = heading(R.arms[1].E, WR);
    weapon += sh(capsule(R.arms[1].E, polar(WR, cd, 9), 9, 8), "url(#gun)", 1.2) + circ(...polar(WR, cd, 9), 3, "url(#armorDk)", 1);
    const [hx, hy] = R.head;
    const helm = `M${P(hx - 12, hy + 5)}Q${P(hx - 13, hy - 14)} ${P(hx, hy - 15)}Q${P(hx + 13, hy - 14)} ${P(hx + 12, hy + 5)}L${P(hx + 8, hy + 12)}H${f(hx - 8)}Z`;
    const plume = sh(`M${P(hx - 2.5, hy - 24)}H${f(hx + 2.5)}L${P(hx + 2, hy - 6)}H${f(hx - 2)}Z`, "url(#plume)", 1);
    let head = ao(hx, hy + 12, 9, 3, 0.55);
    head += sh(helm, "url(#armor)", 1.4) + plume;
    head += sh(`M${P(hx - 9, hy - 3)}H${f(hx + 9)}V${f(hy + 2)}H${f(hx - 9)}Z`, "#04070c", 0.8);
    head += spec(`M${P(hx - 10, hy - 2)}Q${P(hx - 10, hy - 12)} ${P(hx - 2, hy - 13)}`, 0.6, 1.3);
    const offArm = armOf(R, -1, bigPad);
    const eyes = bar(hx, hy - 0.5, 16, 3, "#8cc8ff");
    const muzzle = polar(WR, cd, 9);
    let weaponGlow = name === "attack" ? flash(muzzle[0], muzzle[1], 16, "#8cd0ff") : circ(muzzle[0], muzzle[1], name === "windup" ? 4.5 : 1.8, "#9fd8ff", 0);
    if (name === "windup") weaponGlow += `<circle cx="${f(muzzle[0])}" cy="${f(muzzle[1])}" r="9" fill="none" stroke="#8cd0ff" stroke-width="1.6"/>`;
    const WL = R.arms[-1].W;
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      hexPts.push([WL[0] - 4 + Math.cos(a) * 21, WL[1] - 4 + Math.sin(a) * 25]);
    }
    const hex = poly(hexPts);
    const shield = `<path d="${hex}" fill="#3a8cff" fill-opacity=".22" stroke="#6fb4ff" stroke-width="1.4"/>`;
    const rune = `<path d="${hex}" fill="none" stroke="#8cc8ff" stroke-width="${name === "hurt" ? 1 : 2.2}"/>` + glyphRing(WL[0] - 4, WL[1] - 4, 8, 6, "#8cc8ff", 1);
    // The energy shield edge-on: a thin lens of light.
    const ey = WL[1] - 4;
    const lens = `M0 ${f(ey - 25)}Q4 ${f(ey)} 0 ${f(ey + 25)}Q-4 ${f(ey)} 0 ${f(ey - 25)}Z`;
    const edge = `<path d="${lens}" fill="#3a8cff" fill-opacity=".3" stroke="#6fb4ff" stroke-width="1.4"/>`;
    const edgeGlow = `<path d="${lens}" fill="none" stroke="#8cc8ff" stroke-width="2.2"/>`;
    const backBody =
      torsoOf(R, { w: 27, waist: 17, mat: "url(#armorDk)", plates: false }) +
      plate([[-22, shY - 2], [22, shY - 2], [16, shY + 26], [-16, shY + 26]], "url(#armorDk)", 1.2, 0.4) +
      ln(`M${P(-24, shY + 1)}Q0 ${f(shY + 8)} 24 ${f(shY + 1)}`, "#e8c46a", 1.4, 0.8);
    const backHead = ao(hx, hy + 12, 9, 3, 0.55) + sh(helm, "url(#armorDk)", 1.4) + plume +
      ln(`M${P(hx - 10, hy + 4)}Q${P(hx, hy + 7)} ${P(hx + 10, hy + 4)}`, "#e8c46a", 1.2, 0.8);
    const out = turnedView(R, view, {
      legs, torso, weapon, head, offArm, shield, shieldX: WL[0] - 4, edge, edgeGlow, eyes, eyesSide: bar(hx - 7, hy - 0.5, 6, 3, "#8cc8ff"),
      weaponGlow, rune, core: [0, shY + 14, 8], backBody, backHead, backFx: "over",
    });
    return { body: out.body, glow: out.glow, fx: out.fx, at: { neck: R.upPt([0, shY - 4]) } };
  });
  const cape = sh(`M-24 0Q0 -6 24 0L36 ${SOLE + 34}Q18 ${SOLE + 42} 0 ${SOLE + 38}Q-18 ${SOLE + 42} -36 ${SOLE + 34}Z`, "url(#capeM)", 1.4) +
    ln(`M-12 8Q-18 60 -22 ${SOLE + 30}M12 8Q18 60 22 ${SOLE + 30}M0 6V${SOLE + 32}`, INK, 1, 0.5) +
    ln(`M-36 ${SOLE + 33}Q-18 ${SOLE + 40} 0 ${SOLE + 36}Q18 ${SOLE + 40} 36 ${SOLE + 33}`, "#e8c46a", 1.4, 0.8);
  return { poses, fx: [{ box: [-44, -8, 88, SOLE + 58], markup: cape, anchor: "neck", anim: { type: "sway", amp: 0.035, speed: 0.0016, pivot: [0, 0] }, back: true }] };
}

/* ── Time Warden ────────────────────────────────────────────────────────── */

const WARDEN = { hipY: 12, hipW: 12, stance: 3, thigh: 32, shin: 30, foot: 10, shY: -40, shW: 30, ua: 25, fa: 24, headY: -62 };

export function clockFace(x, y, r, dial = "url(#dial)") {
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const k = i % 3 ? 0.78 : 0.68;
    ticks += `M${P(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k)}L${P(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9)}`;
  }
  return circ(x, y, r, "url(#brass)", 1.3) + spec(`M${P(x - r * 0.8, y - r * 0.2)}A${f(r * 0.85)} ${f(r * 0.85)} 0 0 1 ${P(x - r * 0.1, y - r * 0.85)}`, 0.7, 1.2) + circ(x, y, r * 0.84, dial, 0.8) + ln(ticks, "#dff2ff", 0.9, 0.85);
}

/** Two clock hands around the origin, for a spinning fx layer. */
const clockHands = (r, color = "#ffffff") =>
  ln(`M0 0L${f(r * 0.3)} ${f(-r * 0.3)}M0 0L0 ${f(-r * 0.72)}`, INK, 2.6) + ln(`M0 0L${f(r * 0.3)} ${f(-r * 0.3)}M0 0L0 ${f(-r * 0.72)}`, color, 1.3) + circ(0, 0, 1.4, "url(#brass)", 0.6);

function timeWarden() {
  const table = withTurnedViews({
    idle: { armL: { sh: 20, el: -4 }, armR: { sh: 20, el: -4 } },
    moveA: pose(WALK_A, { armL: { sh: 16, el: -2 }, armR: { sh: 24, el: -6 }, crouch: 2 }),
    moveB: pose(WALK_B, { armL: { sh: 24, el: -6 }, armR: { sh: 16, el: -2 }, crouch: 2 }),
    windup: pose(BRACE, { tilt: -3 }, { armL: { sh: 80, el: 40 }, armR: { sh: 80, el: 40 } }),
    attack: pose({ crouch: 3, tilt: 3, legL: { spread: -3 }, legR: { spread: 3 } }, { armL: { sh: 34, el: -64, kf: 0.8 }, armR: { sh: 34, el: -64, kf: 0.8 } }),
    hurt: pose(HURT, { armL: { sh: 36, el: -40 }, armR: { sh: 44, el: 6 } }),
  });
  const poses = build(WARDEN, table, (R, key) => {
    const [name, view] = viewOf(key);
    const { shY, hipY } = R;
    const legs = legsOf(R, { thighW: 16, kneeW: 15, ankleW: 13, bootW: 18, under: "url(#armorDk)", pad: "url(#armor)", boot: "url(#armorDk)" });
    // Its shield: an arc of light on its left (screen right).
    const arc = `M${P(40, shY - 30)}Q${P(78, hipY - 20)} ${P(40, hipY + 34)}`;
    const shield = ln(arc, "#1a3a7a", 6, 0.9) + ln(arc, "#4d8cff", 2.5, 0.8);
    const shell = `M${P(-32, shY - 6)}Q0 ${f(shY - 14)} 32 ${f(shY - 6)}L${P(26, hipY - 8)}Q0 ${f(hipY + 2)} -26 ${f(hipY - 8)}Z`;
    const waist = plate([[-20, hipY - 14], [20, hipY - 14], [17, hipY + 4], [-17, hipY + 4]], "url(#armorDk)", 1.2, 0.3);
    let torso = sh(shell, "url(#armor)", 1.6);
    torso += spec(`M${P(-28, shY - 3)}Q${P(-14, shY - 10)} ${P(-2, shY - 10)}`, 0.6, 1.4);
    torso += ao(0, shY + 33, 18, 4, 0.5);
    torso += waist;
    for (const s of [-1, 1]) torso += cable([s * 12, shY + 30], [s * 20, hipY - 12], 3, "#2a3550", 1.6);
    torso += clockFace(0, shY + 17, 14);
    const armO = { upW: 13, foreW: 13, mat: "url(#armorDk)", guard: "url(#armor)", pad: "url(#armor)", padR: 12 };
    const pauldron = (s) => {
      const { S } = R.arms[s];
      return plate([[S[0] - 11, S[1] - 12], [S[0] + 11, S[1] - 12], [S[0] + 11, S[1] + 2], [S[0] - 11, S[1] + 2]], "url(#armor)", 1.4, 0.6) + circ(S[0], S[1] - 5, 2.4, "url(#brass)", 0.7);
    };
    // Both arms, then both pauldrons over them.
    const arms = armOf(R, -1, armO) + armOf(R, 1, armO);
    const pads = pauldron(-1) + pauldron(1);
    const [hx, hy] = R.head;
    const helm = `M${P(hx - 13, hy + 8)}V${f(hy - 4)}Q${P(hx, hy - 20)} ${P(hx + 13, hy - 4)}V${f(hy + 8)}Z`;
    let head = ao(hx, hy + 11, 10, 3, 0.55);
    head += sh(helm, "url(#armor)", 1.5);
    head += sh(`M${P(hx - 1.5, hy - 17)}H${f(hx + 1.5)}V${f(hy - 6)}H${f(hx - 1.5)}Z`, "url(#armorDk)", 0.7);
    head += sh(`M${P(hx - 10, hy - 3)}H${f(hx + 10)}V${f(hy + 2)}H${f(hx - 10)}Z`, "#04070c", 0.8);
    head += spec(`M${P(hx - 11, hy - 3)}Q${P(hx - 10, hy - 13)} ${P(hx - 3, hy - 15)}`, 0.6, 1.2);
    const coreR = name === "windup" ? 17 : name === "attack" ? 21 : 12;
    let chest = `<circle cx="0" cy="${f(shY + 17)}" r="${coreR}" fill="none" stroke="#6fb0ff" stroke-width="${name === "attack" ? 4 : 2}"/>`;
    if (name === "windup") chest += glyphRing(0, shY + 17, 22, 12, "#9ecbff", 1.2);
    if (name === "attack") chest += flash(0, shY + 17, 26, "#8cc8ff");
    const eyes = bar(hx, hy - 0.5, 17, 3, "#9ecbff");
    const rune = ln(arc, "#8cc0ff", 1.6);
    // The arc edge-on: a line of light down its front.
    const line = `M0 ${f(shY - 26)}Q3 ${f((shY + hipY) / 2)} 0 ${f(hipY + 30)}`;
    const edge = ln(line, "#1a3a7a", 6, 0.9) + ln(line, "#4d8cff", 2.5, 0.8);
    const edgeGlow = ln(line, "#8cc0ff", 1.6);
    const backBody = sh(shell, "url(#armorDk)", 1.6) + waist +
      plate([[-20, shY - 4], [20, shY - 4], [16, shY + 28], [-16, shY + 28]], "url(#armor)", 1.2, 0.4) +
      ln(`M0 ${f(shY + 28)}V${f(hipY - 14)}`, INK, 1.3, 0.7);
    const backHead = ao(hx, hy + 11, 10, 3, 0.55) + sh(helm, "url(#armorDk)", 1.5) +
      sh(`M${P(hx - 1.5, hy - 17)}H${f(hx + 1.5)}V${f(hy + 6)}H${f(hx - 1.5)}Z`, "url(#armor)", 0.7);
    const out = turnedView(R, view, {
      legs, torso, weapon: arms + (view === "back" ? "" : pads), head, offArm: "", shield, shieldX: 52, shieldUnder: true, side: 1, edge, edgeGlow,
      eyes, eyesSide: bar(hx + 8, hy - 0.5, 6, 3, "#9ecbff"), chest, rune, core: [0, shY + 14, 10],
      backBody: backBody + pads, backHead, sideFx: "none", backFx: "none",
    });
    return { body: out.body, glow: out.glow, fx: out.fx, at: { dial: R.upPt([0, shY + 17]) } };
  });
  return {
    poses,
    fx: [
      { box: [-14, -14, 28, 28], markup: clockHands(14), anchor: "dial", anim: { type: "spin", speed: 0.0021 } },
    ],
  };
}

/* ── Temporal Engineer ──────────────────────────────────────────────────── */

const ENGINEER = { ...HUMAN, hipY: 10, shY: -34, headY: -54, shW: 19 };

/** Toothed gear centred on the origin (for spinning fx layers). */
function gearAt(r, teeth, fill = "url(#brass)") {
  let d = "";
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pt = (rr, aa) => P(Math.cos(aa) * rr, Math.sin(aa) * rr);
    d += `${i ? "L" : "M"}${pt(r * 0.78, a - step * 0.3)}L${pt(r, a - step * 0.17)}L${pt(r, a + step * 0.17)}L${pt(r * 0.78, a + step * 0.3)}`;
  }
  return sh(d + "Z", fill, 1.1) + circ(0, 0, r * 0.45, "url(#gun)", 0.9) + circ(0, 0, r * 0.16, fill, 0.6);
}

function temporalEngineer(v = 0) {
  const welder = v % 2 === 1;
  const table = {
    idle: { tilt: 2, armL: { sh: 14, el: -30 }, armR: { sh: 10, el: -50, kf: 0.85 } },
    moveA: pose(WALK_A, { armL: { sh: 10, el: -26 }, armR: { sh: 14, el: -54, kf: 0.85 } }),
    moveB: pose(WALK_B, { armL: { sh: 18, el: -34 }, armR: { sh: 6, el: -46, kf: 0.85 } }),
    windup: pose(BRACE, { tilt: -4 }, { armL: { sh: 70, el: 60 }, armR: { sh: -6, el: -115, kf: 0.6, dy: -3 } }),
    attack: pose(BRACE, { crouch: 3, tilt: 4 }, { armL: { sh: 40, el: 30 }, armR: { sh: -6, el: -115, kf: 0.6, dy: -3 } }),
    hurt: pose(HURT, { armL: { sh: 36, el: -40 }, armR: { sh: 44, el: 6 } }),
  };
  const poses = build(ENGINEER, table, (R, name) => {
    const { shY, hipY } = R;
    let body = "";
    body += up(R, plate([[-20, shY - 10], [18, shY - 10], [18, shY + 26], [-20, shY + 26]], "url(#brass)", 1.4, 0.6) +
      sh(`M${P(-27, shY - 4)}H-18V${f(shY + 20)}H-27Z`, "url(#gun)", 1.2) +
      cable([-24, shY + 20], [-14, hipY - 2], 6, "#3a2a14") +
      ln(`M${P(14, shY - 10)}L${P(22, shY - 40)}`, INK, 1.8) + ln(`M${P(17, shY - 26)}H26M${P(19, shY - 33)}H25`, INK, 1.2));
    body += legsOf(R, { pad: "url(#brass)", under: "url(#armorDk)" });
    let upper = torsoOf(R, { mat: "url(#armorDk)", w: 21, plates: false });
    upper += sh(`M${P(-13, shY + 4)}H13L11 ${f(hipY + 10)}H-11Z`, "url(#apron)", 1.1);
    upper += ln(`M${P(-9, shY + 12)}V${f(hipY + 6)}M${P(9, shY + 12)}V${f(hipY + 6)}`, INK, 0.7, 0.4);
    upper += ln(`M${P(-13, shY + 2)}L${P(13, hipY - 8)}`, "#3a2408", 2.6) + circ(4, shY + 18, 2, "url(#brass)", 0.7);
    for (const [x, y] of [[-7, hipY - 2], [3, hipY - 1]]) upper += sh(`M${P(x, y)}h5v7h-5Z`, "url(#steel)", 0.8);
    upper += armOf(R, -1, { pad: "url(#brass)", guard: "url(#brass)", padR: 8 });
    const WL = R.arms[-1].W;
    const wd = heading(R.arms[-1].E, WL);
    const wt = polar(WL, wd, 15);
    upper += sh(capsule(WL, wt, 4.5, 4.5), "url(#steel)", 1.1) + sh(`M${P(wt[0] - 6.5, wt[1] - 2)}l13 0l-2 9h-3v-4h-3v4h-3Z`, "url(#steel)", 1);
    const [hx, hy] = R.head;
    let glowUp = "";
    upper += ao(hx, hy + 12, 9, 3, 0.55);
    if (welder) {
      upper += sh(`M${P(hx - 12, hy + 10)}Q${P(hx - 13, hy - 13)} ${P(hx, hy - 14)}Q${P(hx + 13, hy - 13)} ${P(hx + 12, hy + 10)}Q${P(hx, hy + 15)} ${P(hx - 12, hy + 10)}Z`, "url(#armorDk)", 1.4);
      upper += plate([[hx - 11, hy - 8], [hx + 11, hy - 8], [hx + 9, hy + 9], [hx - 9, hy + 9]], "url(#brass)", 1.2, 0.6);
      upper += sh(`M${P(hx - 8, hy - 2)}H${f(hx + 8)}V${f(hy + 2)}H${f(hx - 8)}Z`, "#140c02", 0.8);
      for (let i = 0; i < 3; i++) upper += circ(hx - 6 + i * 6, hy + 6, 1.1, "#140c02", 0);
      glowUp += bar(hx, hy, 14, 2.4, "#ffe38a");
    } else {
      upper += sh(`M${P(hx - 11, hy + 8)}Q${P(hx - 12, hy - 13)} ${P(hx, hy - 13)}Q${P(hx + 12, hy - 13)} ${P(hx + 11, hy + 8)}Q${P(hx, hy + 13)} ${P(hx - 11, hy + 8)}Z`, "url(#skin)", 1.3);
      upper += sh(`M${P(hx - 12, hy - 6)}Q${P(hx, hy - 18)} ${P(hx + 12, hy - 6)}L${P(hx + 11, hy - 10)}Q${P(hx, hy - 20)} ${P(hx - 11, hy - 10)}Z`, "url(#armorDk)", 1);
      upper += ln(`M${P(hx - 12, hy - 2)}H${f(hx + 12)}`, "#2a1a06", 2.2);
      upper += circ(hx - 5, hy - 2, 4.4, "url(#brass)", 1.1) + circ(hx + 5, hy - 2, 4.4, "url(#brass)", 1.1);
      upper += ln(`M${P(hx - 9, hy + 4)}Q${P(hx - 7, hy + 10)} ${P(hx, hy + 11)}Q${P(hx + 7, hy + 10)} ${P(hx + 9, hy + 4)}`, "#5a3a22", 2, 0.8);
      upper += ln(`M${P(hx - 4, hy + 7)}Q${P(hx, hy + 8.5)} ${P(hx + 4, hy + 7)}`, INK, 0.9, 0.8);
      glowUp += circ(hx - 5, hy - 2, 2.6, "#ffe38a", 0) + circ(hx + 5, hy - 2, 2.6, "#ffe38a", 0) + circ(hx - 6, hy - 3, 0.8, "#ffffff", 0);
    }
    upper += armOf(R, 1, { pad: "url(#brass)", guard: "url(#brass)", padR: 8 });
    const WR = R.arms[1].W;
    if (name === "windup" || name === "attack") {
      const mx = WR[0] - 3;
      const my = WR[1] - 2;
      upper += gunAim(mx, my, 4.8, "rifle", "url(#brass)");
      glowUp += aimGlow(mx, my, 2, "#ffd36b", name);
      if (name === "windup") glowUp += ln(`M${P(mx - 12, my - 10)}l6 4l-4 3l7 5`, "#ffe38a", 1.2);
    } else {
      const tip = polar(WR, heading(R.arms[1].E, WR), 13);
      upper += sh(capsule(WR, tip, 6.5, 4.5), "url(#brass)", 1.1) + circ(...lerp(WR, tip, 0.5), 2.2, "url(#gun)", 0.6);
      glowUp += circ(tip[0], tip[1], 2.2, "#ffe38a", 0);
    }
    glowUp += circ(22, shY - 40, 1.8, "#ffd36b", 0) + ln(`M${P(-22.5, shY)}V${f(shY + 16)}`, "#ffd36b", 1.8, 0.8);
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)), at: { pack: R.upPt([-17, shY - 12]) } };
  });
  return {
    poses,
    fx: [{ box: [-12, -12, 24, 24], markup: gearAt(11, 10), anchor: "pack", anim: { type: "spin", speed: 0.003 }, back: true }],
  };
}

/* ── Temporal Summoner (sub-boss) ───────────────────────────────────────── */

const SUMMONER = { ...HUMAN, headY: -60, shW: 18 };

function temporalSummoner() {
  const table = {
    idle: { armL: { sh: 26, el: -10 }, armR: { sh: 8, el: -40, kf: 0.9 } },
    moveA: { tilt: -2, sway: -4, armL: { sh: 22, el: -8 }, armR: { sh: 8, el: -40, kf: 0.9 } },
    moveB: { tilt: 2, sway: 4, armL: { sh: 30, el: -12 }, armR: { sh: 8, el: -40, kf: 0.9 } },
    windup: { crouch: -4, tilt: -2, armL: { sh: 135, el: 25 }, armR: { sh: 80, el: 30 } },
    attack: { crouch: 2, tilt: 4, armL: { sh: 75, el: -35, kf: 0.8 }, armR: { sh: 20, el: -60, kf: 0.8 } },
    hurt: { tilt: 9, crouch: 4, headX: 4, armL: { sh: 40, el: -30 }, armR: { sh: 30, el: 20 } },
  };
  const poses = build(SUMMONER, table, (R, name) => {
    const { shY } = R;
    const sw = R.p.sway || 0;
    let body = "";
    const hem = SOLE - 2;
    body += up(R,
      sh(`M${P(-19, shY - 4)}Q0 ${f(shY - 10)} 19 ${f(shY - 4)}L${P(34 + sw, hem - 6)}Q${P(26 + sw, hem + 1)} ${P(18 + sw, hem - 3)}Q${P(9 + sw, hem + 4)} ${P(sw, hem)}Q${P(-9 + sw, hem + 4)} ${P(-18 + sw, hem - 3)}Q${P(-26 + sw, hem + 1)} ${P(-34 + sw, hem - 6)}Z`, "url(#armor)", 1.5) +
      sh(`M${P(-7, shY)}H7L${P(12 + sw, hem - 1)}H${f(-12 + sw)}Z`, "url(#armorDk)", 1) +
      glyphRing(sw * 0.5, hem - 26, 5, 6, "#2a0a3a", 1) +
      ln(`M${P(-14, shY + 20)}Q${P(-22 + sw, hem - 30)} ${P(-26 + sw, hem - 6)}M${P(14, shY + 20)}Q${P(22 + sw, hem - 30)} ${P(26 + sw, hem - 6)}`, INK, 0.9, 0.55) +
      ln(`M${P(-33 + sw, hem - 7)}Q${P(-18 + sw, hem + 1)} ${P(sw, hem - 2)}Q${P(18 + sw, hem + 1)} ${P(33 + sw, hem - 7)}`, "#e0b060", 1.3, 0.8) +
      plate([[-10, shY + 26], [10, shY + 26], [10, shY + 32], [-10, shY + 32]], "url(#brass)", 0.9, 0.5) +
      ao(0, shY + 1, 12, 3, 0.5));
    let upper = "";
    const sleeve = { mat: "url(#armor)", guard: "url(#armorDk)", hand: "url(#skinV)", pad: "", upW: 11, foreW: 13 };
    const WR = R.arms[1].W;
    const top = [WR[0] + 4, WR[1] - 56];
    upper += sh(capsule([WR[0] + 2, WR[1] + 50], top, 3, 3.6), "url(#gun)", 1.1);
    upper += sh(`M${P(top[0] - 9, top[1] + 8)}Q${P(top[0] - 10, top[1] - 12)} ${P(top[0], top[1] - 14)}Q${P(top[0] + 10, top[1] - 12)} ${P(top[0] + 9, top[1] + 8)}`, "none", 2.2);
    upper += circ(top[0], top[1] - 3, 5.5, "url(#brass)", 1);
    upper += armOf(R, 1, sleeve) + armOf(R, -1, sleeve);
    const [hx, hy] = R.head;
    upper += sh(`M${P(hx - 15, hy + 13)}Q${P(hx - 17, hy - 12)} ${P(hx, hy - 20)}Q${P(hx + 17, hy - 12)} ${P(hx + 15, hy + 13)}Q${P(hx, hy + 6)} ${P(hx - 15, hy + 13)}Z`, "url(#armor)", 1.5);
    upper += spec(`M${P(hx - 13, hy + 6)}Q${P(hx - 14, hy - 10)} ${P(hx - 3, hy - 17)}`, 0.5, 1.2);
    upper += sh(`M${P(hx - 8, hy + 7)}Q${P(hx - 9, hy - 7)} ${P(hx, hy - 9)}Q${P(hx + 9, hy - 7)} ${P(hx + 8, hy + 7)}Z`, "#07020c", 0.8);
    const boost = name === "windup" || name === "attack";
    const WL = R.arms[-1].W;
    let glowUp = circ(hx - 3.5, hy, 1.8, "#f0b8ff", 0) + circ(hx + 3.5, hy, 1.8, "#f0b8ff", 0);
    glowUp += circ(top[0], top[1] - 3, boost ? 5.5 : 3.2, "#e9a8ff", 0);
    glowUp += circ(WL[0], WL[1] - 9, boost ? 8 : 4.2, "#d77bff", 0) + circ(WL[0], WL[1] - 9, boost ? 3.4 : 1.8, "#ffffff", 0);
    if (name === "windup") glowUp += glyphRing(WL[0], WL[1] - 9, 11, 9, "#e9a8ff", 1.2);
    if (name === "attack") glowUp += flash(WL[0], WL[1] - 9, 24, "#e59bff");
    body += up(R, upper);
    const rune = `<ellipse cx="0" cy="${SOLE - 1}" rx="${boost ? 42 : 34}" ry="7" fill="none" stroke="#c45cff" stroke-width="1.8"/>` +
      `<ellipse cx="0" cy="${SOLE - 1}" rx="${boost ? 31 : 25}" ry="5" fill="none" stroke="#e7a0ff" stroke-width=".9" stroke-dasharray="4 3"/>`;
    return { body, glow: glow(rune) + up(R, glow(glowUp)), at: { waist: R.upPt([0, -8]) } };
  });
  // Orbiting glyph stones, drawn flattened so they read as a ring in depth.
  let stones = "";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const x = Math.cos(a) * 42;
    const y = Math.sin(a) * 42;
    stones += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f((a * 180) / Math.PI)})">${sh("M-3 -4L3 -4L4 4L-4 4Z", "#e2a0ff", 0.8)}${ln("M-1.5 -2L1.5 2M1.5 -2L-1.5 2", "#5a1a7a", 0.8)}</g>`;
  }
  return { poses, fx: [{ box: [-50, -50, 100, 100], markup: glow(stones), anchor: "waist", anim: { type: "orbit", speed: 0.0012, squash: 0.28 }, glow: true }] };
}

/* ── Phase Stalker ──────────────────────────────────────────────────────── */

const STALKER = { hipY: 6, hipW: 6, stance: 4, thigh: 38, shin: 36, foot: 7, shY: -36, shW: 15, ua: 24, fa: 22, headY: -55 };

function phaseStalker(v = 0) {
  const masked = v % 2 === 1;
  const table = {
    idle: { crouch: 3, armL: { sh: 16, el: -8 }, armR: { sh: 16, el: -8 } },
    moveA: pose(WALK_A, { crouch: 5, armL: { sh: 10, el: -4 }, armR: { sh: 24, el: -14 } }),
    moveB: pose(WALK_B, { crouch: 5, armL: { sh: 24, el: -14 }, armR: { sh: 10, el: -4 } }),
    windup: { crouch: 14, tilt: -4, headDy: 3, legL: { spread: -8 }, legR: { spread: 8 }, armL: { sh: 160, el: -50 }, armR: { sh: 160, el: -50 } },
    attack: { crouch: 10, tilt: 5, legL: { spread: -10, lift: 3 }, legR: { spread: 10 }, armL: { sh: 62, el: 34 }, armR: { sh: 62, el: 34 } },
    hurt: pose(HURT, { armL: { sh: 34, el: -40 }, armR: { sh: 44, el: 12 } }),
  };
  const poses = build(STALKER, table, (R, name) => {
    const { shY, hipY } = R;
    let body = legsOf(R, { thighW: 9, kneeW: 8, ankleW: 6, bootW: 9, under: "url(#armorDk)", pad: "url(#armor)" });
    let upper = sh(`M${P(-16, shY - 2)}Q0 ${f(shY - 8)} 16 ${f(shY - 2)}L${P(9, hipY - 8)}L${P(8, hipY + 2)}H-8L${P(-9, hipY - 8)}Z`, "url(#armorDk)", 1.3);
    for (let i = 0; i < 4; i++) upper += ln(`M${P(-9 + i, shY + 8 + i * 8)}Q0 ${f(shY + 11 + i * 8)} ${P(9 - i, shY + 8 + i * 8)}`, "#4fe0bf", 0.9, 0.6);
    upper += ln(`M${P(-15, shY)}L${P(10, hipY - 6)}`, "#0a1a14", 3) + ln(`M${P(-15, shY)}L${P(10, hipY - 6)}`, "#2b6b58", 1.2);
    const armO = { upW: 7, foreW: 7, mat: "url(#armorDk)", guard: "url(#armor)", pad: "url(#armor)", padR: 6 };
    let glowUp = "";
    const charged = name === "windup" || name === "attack";
    for (const s of [-1, 1]) {
      const { E, W } = R.arms[s];
      const bd = heading(E, W);
      const tip = polar(W, bd + s * 8, 32);
      const blade = poly([polar(W, bd + 90, 3), tip, polar(W, bd - 90, 3), polar(E, bd, 6)]);
      upper += armOf(R, s, armO) + sh(blade, "url(#steel)", 1.1) + spec(`M${P(...polar(W, bd + 90, 1.5))}L${P(...lerp(W, tip, 0.8))}`, 0.7, 0.8);
      glowUp += ln(`M${P(...polar(W, bd, 2))}L${P(...lerp(W, tip, 0.92))}`, "#9fffe6", charged ? 2 : 0.9);
      if (name === "attack") glowUp += ln(`M${P(...lerp(W, tip, 1.1))}Q${P(W[0] + s * 30, W[1] + 18)} ${P(W[0] + s * 4, W[1] + 34)}`, "#9fffe6", 2.2, 0.8);
    }
    const [hx, hy] = R.head;
    upper += ao(hx, hy + 11, 7, 3, 0.55);
    if (masked) {
      upper += sh(`M${P(hx - 9, hy + 8)}Q${P(hx - 11, hy - 10)} ${P(hx, hy - 12)}Q${P(hx + 11, hy - 10)} ${P(hx + 9, hy + 8)}L${P(hx, hy + 14)}Z`, "url(#steel)", 1.3);
      for (const s of [-1, 1]) upper += sh(`M${P(hx + s * 7, hy - 8)}Q${P(hx + s * 14, hy - 16)} ${P(hx + s * 12, hy - 26)}Q${P(hx + s * 9, hy - 16)} ${P(hx + s * 3, hy - 11)}Z`, "url(#armorDk)", 1);
      upper += ln(`M${P(hx, hy - 10)}V${f(hy + 12)}`, INK, 0.7, 0.6);
      glowUp += bar(hx - 4, hy - 1, 5, 2.2, "#9fffe6") + bar(hx + 4, hy - 1, 5, 2.2, "#9fffe6");
    } else {
      upper += sh(`M${P(hx - 9, hy + 9)}Q${P(hx - 11, hy - 8)} ${P(hx, hy - 14)}Q${P(hx + 11, hy - 8)} ${P(hx + 9, hy + 9)}L${P(hx, hy + 13)}Z`, "url(#armor)", 1.3);
      upper += sh(`M${P(hx - 6, hy - 1)}H${f(hx + 6)}L${P(hx + 4, hy + 3)}H${f(hx - 4)}Z`, "#010806", 0.6);
      upper += spec(`M${P(hx - 7, hy + 4)}Q${P(hx - 8, hy - 6)} ${P(hx - 2, hy - 11)}`, 0.5, 1);
      glowUp += bar(hx, hy + 1, 9, 2.4, "#9fffe6");
    }
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)), at: { neck: R.upPt([hx + 2, hy + 8]) } };
  });
  const tails = sh("M-2 0Q-10 20 -6 44L-2 40Q-4 22 2 2Z", "url(#scarf)", 1.1) + sh("M2 0Q14 16 14 38L10 35Q8 20 0 4Z", "url(#scarf)", 1.1);
  return { poses, fx: [{ box: [-12, -4, 30, 52], markup: tails, anchor: "neck", anim: { type: "sway", amp: 0.16, speed: 0.0033, pivot: [0, 0] }, back: true }] };
}

/* ── Rift Leaper ────────────────────────────────────────────────────────── */

const LEAPER = { hipY: 22, hipW: 10, stance: 8, thigh: 30, shin: 30, foot: 8, shY: -18, shW: 22, ua: 30, fa: 30, headY: -34 };

function riftLeaper(v = 0) {
  const crested = v % 2 === 1;
  const table = {
    idle: { crouch: 4, headDy: 4, armL: { sh: 22, el: -14 }, armR: { sh: 22, el: -14 } },
    moveA: { crouch: 6, tilt: -4, headDy: 4, legL: { lift: 10 }, armL: { sh: 8, el: -4 }, armR: { sh: 34, el: -18 } },
    moveB: { crouch: 6, tilt: 4, headDy: 4, legR: { lift: 10 }, armL: { sh: 34, el: -18 }, armR: { sh: 8, el: -4 } },
    windup: { crouch: 18, headDy: 8, legL: { spread: -10 }, legR: { spread: 10 }, armL: { sh: 130, el: 40 }, armR: { sh: 130, el: 40 } },
    attack: { crouch: -6, headDy: -2, legL: { lift: 12, spread: -4 }, legR: { lift: 12, spread: 4 }, armL: { sh: 62, el: 52, kf: 0.9 }, armR: { sh: 62, el: 52, kf: 0.9 } },
    hurt: { crouch: 8, tilt: 10, headX: 4, legL: { lift: 4 }, armL: { sh: 40, el: -50, kf: 0.8 }, armR: { sh: 30, el: 10 } },
  };
  const poses = build(LEAPER, table, (R, name) => {
    const { shY, hipY } = R;
    let body = legsOf(R, { thighW: 17, kneeW: 12, ankleW: 9, bootW: 13, under: "url(#armorDk)", pad: "", plate: "url(#hide)", boot: "url(#claw)" });
    let upper = sh(`M${P(-26, shY - 2)}Q${P(0, shY - 16)} ${P(26, shY - 2)}Q${P(22, hipY - 14)} ${P(10, hipY)}H-10Q${P(-22, hipY - 14)} ${P(-26, shY - 2)}Z`, "url(#armorDk)", 1.5);
    upper += sh(`M${P(-18, shY - 6)}Q${P(0, shY - 14)} ${P(18, shY - 6)}L${P(12, shY + 10)}Q0 ${f(shY + 15)} -12 ${f(shY + 10)}Z`, "url(#hide)", 1);
    upper += spec(`M${P(-16, shY - 5)}Q${P(-8, shY - 11)} ${P(0, shY - 11)}`, 0.45, 1.2);
    upper += ln(`M${P(-12, shY + 2)}Q0 ${f(shY + 8)} 12 ${f(shY + 2)}M${P(-9, shY + 12)}Q0 ${f(shY + 17)} 9 ${f(shY + 12)}`, INK, 0.9, 0.5);
    for (let i = 0; i < 3; i++) upper += ln(`M${P(-8, shY + 22 + i * 6)}Q0 ${f(shY + 24 + i * 6)} 8 ${f(shY + 22 + i * 6)}`, INK, 0.8, 0.45);
    const cracks = `M${P(-14, shY - 4)}L${P(-8, shY + 6)}L${P(-12, shY + 14)}L${P(-5, shY + 22)}M${P(15, shY)}L${P(10, shY + 10)}L${P(14, shY + 18)}`;
    upper += ln(cracks, "#2a0626", 3, 0.9);
    upper += circ(0, shY + 10, 6, "#2a0626", 1.2);
    const charged = name === "windup" || name === "attack";
    let glowUp = ln(cracks, "#ff8cff", 1.8) + circ(0, shY + 10, charged ? 6.5 : 4.2, "#ff6cff", 0) + circ(0, shY + 10, 2, "#ffffff", 0);
    for (const s of [-1, 1]) {
      const { E, W } = R.arms[s];
      upper += limb(R.arms[s].S, E, 14, 11, "url(#armorDk)") + limb(E, W, 11, 8, "url(#hide)");
      upper += ln(`M${P(...lerp(E, W, 0.3))}L${P(...lerp(E, W, 0.6))}`, "#2a0626", 2.2);
      glowUp += ln(`M${P(...lerp(E, W, 0.3))}L${P(...lerp(E, W, 0.6))}`, "#ff8cff", 1);
      const hd = heading(E, W);
      for (const k of [-24, 0, 24]) {
        const base = polar(W, hd + k, 3);
        const tip = polar(base, hd + k * 0.6 + s * 10, charged ? 15 : 12);
        upper += sh(poly([polar(base, hd + k + 90, 2), tip, polar(base, hd + k - 90, 2)]), "url(#claw)", 0.9);
      }
      if (name === "attack") glowUp += ln(`M${P(...polar(W, hd - 30, 10))}Q${P(...polar(W, hd, 22))} ${P(...polar(W, hd + 30, 10))}`, "#ff9cff", 2, 0.8);
    }
    const [hx, hy] = R.head;
    upper += ao(hx, hy + 10, 9, 3, 0.55);
    upper += sh(`M${P(hx - 11, hy + 4)}Q${P(hx - 12, hy - 10)} ${P(hx, hy - 12)}Q${P(hx + 12, hy - 10)} ${P(hx + 11, hy + 4)}L${P(hx + 5, hy + 12)}H${f(hx - 5)}Z`, "url(#armorDk)", 1.3);
    if (crested) {
      for (let i = -2; i <= 2; i++) upper += sh(`M${P(hx + i * 4 - 2, hy - 10)}L${P(hx + i * 6, hy - 22 + Math.abs(i) * 3)}L${P(hx + i * 4 + 2, hy - 10)}Z`, "url(#claw)", 0.9);
      glowUp += bar(hx - 5, hy - 1, 4, 2.2, "#ff9cff") + bar(hx + 5, hy - 1, 4, 2.2, "#ff9cff") + circ(hx, hy - 6, 1.6, "#ffd0ff", 0);
    } else {
      upper += sh(`M${P(hx - 7, hy - 9)}L${P(hx - 12, hy - 20)}L${P(hx - 3, hy - 11)}ZM${P(hx + 7, hy - 9)}L${P(hx + 12, hy - 20)}L${P(hx + 3, hy - 11)}Z`, "url(#claw)", 1);
      glowUp += bar(hx - 4.5, hy - 1, 5, 2.4, "#ff9cff") + bar(hx + 4.5, hy - 1, 5, 2.4, "#ff9cff");
    }
    if (charged) upper += sh(`M${P(hx - 6, hy + 5)}H${f(hx + 6)}L${P(hx + 3, hy + 12)}H${f(hx - 3)}Z`, "#1a0010", 0.7);
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)), at: { hip: [0, hipY - 2] } };
  });
  const tail = sh("M-4 0Q-26 10 -34 34Q-38 44 -30 52Q-34 40 -26 30Q-16 14 4 6Z", "url(#armorDk)", 1.3) + ln("M-8 4Q-24 16 -30 36", "#2a0626", 2) + glow(ln("M-8 4Q-24 16 -30 36", "#ff8cff", 0.9));
  return { poses, fx: [{ box: [-42, -4, 50, 60], markup: tail, anchor: "hip", anim: { type: "sway", amp: 0.14, speed: 0.0028, pivot: [0, 0] }, back: true }] };
}

/* ── Chrono-Bomber ──────────────────────────────────────────────────────── */

const BOMBER = { hipY: 30, hipW: 16, stance: 4, thigh: 24, shin: 26, foot: 8, shY: -24, shW: 34, ua: 18, fa: 18, headY: -58 };

function chronoBomber(v = 0) {
  const hourglass = v % 2 === 1;
  const table = {
    idle: { armL: { sh: 30, el: 10 }, armR: { sh: 30, el: 10 } },
    moveA: { legL: { lift: 8 }, crouch: 1.5, tilt: -3, armL: { sh: 26, el: 10 }, armR: { sh: 36, el: 10 } },
    moveB: { legR: { lift: 8 }, crouch: 1.5, tilt: 3, armL: { sh: 36, el: 10 }, armR: { sh: 26, el: 10 } },
    windup: { crouch: 6, tilt: -2, legL: { spread: -4 }, legR: { spread: 4 }, armL: { sh: 155, el: 10 }, armR: { sh: 155, el: 10 } },
    attack: { crouch: -2, tilt: 3, armL: { sh: 110, el: -30 }, armR: { sh: 110, el: -30 } },
    hurt: { crouch: 3, tilt: 9, armL: { sh: 60, el: 30 }, armR: { sh: 50, el: 20 } },
  };
  const poses = build(BOMBER, table, (R, name) => {
    const { shY } = R;
    let body = legsOf(R, { thighW: 12, kneeW: 12, ankleW: 10, bootW: 17, under: "url(#gun)", pad: "url(#armor)", boot: "url(#armorDk)" });
    const cy = shY + 10;
    let upper = "";
    for (const s of [-1, 1]) {
      const { S, E, W } = R.arms[s];
      upper += limb(S, E, 8, 8, "url(#gun)") + circ(E[0], E[1], 4.5, "url(#armor)", 1) + limb(E, W, 8, 7, "url(#armorDk)");
      upper += sh(`M${P(W[0] - 4, W[1])}l-3 7m7-7l3 7`, "none", 1.6);
    }
    upper += circ(0, cy, 34, "url(#armor)", 1.8);
    upper += spec(`M-26 ${f(cy - 14)}A30 30 0 0 1 -8 ${f(cy - 31)}`, 0.7, 2);
    upper += sh(`M-36 ${f(cy - 3)}Q0 ${f(cy + 9)} 36 ${f(cy - 3)}V${f(cy + 3)}Q0 ${f(cy + 15)} -36 ${f(cy + 3)}Z`, "url(#armorDk)", 1.2);
    for (const x of [-24, -8, 8, 24]) upper += circ(x, cy + 6 - Math.abs(x) * 0.12, 1.6, "url(#brass)", 0.6);
    for (const s of [-1, 1]) upper += ln(`M${P(s * 30, cy + 10)}Q${P(s * 20, cy + 26)} ${P(s * 6, cy + 30)}`, "#2a1a04", 1.2, 0.6);
    upper += ao(0, cy + 34, 22, 4, 0.5);
    let glowUp = "";
    if (hourglass) {
      upper += sh(`M-12 ${f(cy - 24)}H12L2 ${f(cy - 10)}L12 ${f(cy + 4)}H-12L-2 ${f(cy - 10)}Z`, "url(#glass)", 1.3, ` fill-opacity=".85"`);
      upper += sh(`M-15 ${f(cy - 27)}H15V${f(cy - 23)}H-15ZM-15 ${f(cy + 3)}H15V${f(cy + 7)}H-15Z`, "url(#brass)", 1);
      glowUp += sh(`M-8 ${f(cy - 21)}H8L1 ${f(cy - 12)}H-1Z`, "#ffb030", 0) + sh(`M-9 ${f(cy + 2)}Q0 ${f(cy - 6)} 9 ${f(cy + 2)}Z`, "#ffc04a", 0) + ln(`M0 ${f(cy - 12)}V${f(cy + 1)}`, "#ffe08a", 0.8);
    } else {
      upper += clockFace(0, cy - 10, 13, "url(#dialA)");
      glowUp += `<circle cx="0" cy="${f(cy - 10)}" r="${name === "windup" ? 15 : 12}" fill="none" stroke="#ffb030" stroke-width="${name === "windup" ? 3 : 1.6}"/>`;
    }
    const [hx, hy] = [R.head[0], cy - 38];
    upper += sh(`M${P(hx - 10, hy + 8)}Q${P(hx - 10, hy - 6)} ${P(hx, hy - 7)}Q${P(hx + 10, hy - 6)} ${P(hx + 10, hy + 8)}Z`, "url(#armorDk)", 1.3);
    upper += sh(`M${P(hx - 7, hy)}H${f(hx + 7)}V${f(hy + 4)}H${f(hx - 7)}Z`, "#110800", 0.7);
    upper += ln(`M${P(hx + 6, hy - 5)}Q${P(hx + 12, hy - 12)} ${P(hx + 9, hy - 18)}`, "#b58b4a", 1.6);
    glowUp += bar(hx, hy + 2, 12, 2.6, "#ffc04a");
    if (name === "windup" || name === "attack") {
      const by = name === "windup" ? cy - 70 : cy - 58;
      upper += circ(0, by, 10, "url(#gun)", 1.4) + spec(`M-6 ${f(by - 4)}A7 7 0 0 1 -1 ${f(by - 8)}`, 0.7, 1.2) + ln(`M${P(5, by - 8)}q4 -4 2 -8`, "#b58b4a", 1.4);
      glowUp += circ(6.5, by - 15.5, name === "windup" ? 3.2 : 2.4, "#ffe08a", 0) + circ(0, by, 3.4, "#ff9020", 0);
      if (name === "attack") glowUp += flash(6, by - 14, 16, "#ffc04a");
    }
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)), at: { dial: R.upPt([0, cy - 10]), fuse: R.upPt([hx + 9, hy - 19]) } };
  });
  const fx = [{ box: [-6, -6, 12, 12], markup: glow(circ(0, 0, 2.2, "#ffe08a", 0) + ln("M-4 0H4M0 -4V4", "#ffc04a", 0.8)), anchor: "fuse", anim: { type: "flicker", speed: 0.02 }, glow: true }];
  if (!hourglass) fx.unshift({ box: [-13, -13, 26, 26], markup: clockHands(13), anchor: "dial", anim: { type: "spin", speed: 0.004 } });
  return { poses, fx };
}

/* ── Registry ───────────────────────────────────────────────────────────── */

const HUMANOID_BOX = [-70, -86, 140, 180];

/** Extra per-type <defs> beyond the palette materials. */
const EXTRA_DEFS = {
  shieldCommander: `<linearGradient id="capeM" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#2a3f78"/><stop offset=".5" stop-color="#141f44"/><stop offset="1" stop-color="#070a18"/></linearGradient>` +
    `<linearGradient id="plume" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a0"/><stop offset=".5" stop-color="#c8963a"/><stop offset="1" stop-color="#5a3c10"/></linearGradient>`,
  timeWarden: `<radialGradient id="dial" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#1c3f8a"/><stop offset="1" stop-color="#060d24"/></radialGradient>`,
  chronoBomber: `<radialGradient id="dialA" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#5a3406"/><stop offset="1" stop-color="#1a0c02"/></radialGradient>`,
  temporalEngineer: `<linearGradient id="apron" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#6e4a22"/><stop offset=".5" stop-color="#4a2e12"/><stop offset="1" stop-color="#1e1206"/></linearGradient>` +
    `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#d9a37c"/><stop offset=".5" stop-color="#a06a48"/><stop offset="1" stop-color="#4a2a1a"/></linearGradient>`,
  officerKit: `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#e2b48e"/><stop offset=".5" stop-color="#b07a56"/><stop offset="1" stop-color="#5a3624"/></linearGradient>`,
  rasczakKit: `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#e2b48e"/><stop offset=".5" stop-color="#b07a56"/><stop offset="1" stop-color="#5a3624"/></linearGradient>`,
  kaelKit: `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#e2b48e"/><stop offset=".5" stop-color="#b07a56"/><stop offset="1" stop-color="#5a3624"/></linearGradient>`,
  supervisorKit: `<linearGradient id="capeS" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#a8323a"/><stop offset=".5" stop-color="#6a1620"/><stop offset="1" stop-color="#22060a"/></linearGradient>` +
    `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#e0b896"/><stop offset=".5" stop-color="#aa7c5c"/><stop offset="1" stop-color="#553826"/></linearGradient>`,
  officer: `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#e2b48e"/><stop offset=".5" stop-color="#b07a56"/><stop offset="1" stop-color="#5a3624"/></linearGradient>`,
  supervisor: `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#e0b896"/><stop offset=".5" stop-color="#aa7c5c"/><stop offset="1" stop-color="#553826"/></linearGradient>`,
  staff: CIV_DEFS.staff,
  clerk: CIV_DEFS.clerk,
  corruptCop: `<linearGradient id="skinD" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#c89070"/><stop offset=".5" stop-color="#8a5a40"/><stop offset="1" stop-color="#3a2216"/></linearGradient>`,
  sentinel: `<linearGradient id="tabard" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#3a4f78"/><stop offset=".5" stop-color="#1c2a48"/><stop offset="1" stop-color="#0a1020"/></linearGradient>`,
  phaseStalker: `<linearGradient id="scarf" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#2f8a74"/><stop offset=".5" stop-color="#155244"/><stop offset="1" stop-color="#05201a"/></linearGradient>`,
  beast: `<linearGradient id="hideDk" x1="0" y1="0" x2="1" y2=".45"><stop offset="0" stop-color="#5a1e08"/><stop offset=".4" stop-color="#2c0c04"/><stop offset="1" stop-color="#0a0302"/></linearGradient>`,
  temporalSummoner: `<linearGradient id="skinV" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#cdb6e0"/><stop offset="1" stop-color="#4a3860"/></linearGradient>`,
  riftLeaper: `<linearGradient id="hide" x1="0" y1="0" x2="1" y2=".45"><stop offset="0" stop-color="#8a4a86"/><stop offset=".3" stop-color="#4e2250"/><stop offset="1" stop-color="#12051a"/></linearGradient>` +
    `<linearGradient id="claw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1030"/><stop offset=".6" stop-color="#c77ab8"/><stop offset="1" stop-color="#ffe6fa"/></linearGradient>`,
};

export const HUMANOIDS = {
  henchman: { build: henchman, variants: 3, box: HUMANOID_BOX, rim: "#ff9a4a", size: 1.1 },
  corruptCop: { build: corruptCop, variants: 3, box: [-72, -92, 142, 186], rim: "#ffd35a", size: 1.08, shield: [-18, -30] },
  officer: { build: officer, box: HUMANOID_BOX, rim: "#9fc4ff", size: 1.03 },
  officerKit: { build: officerKit, box: HUMANOID_BOX, rim: "#9fc4ff", size: 1.08 },
  // Taller box: the command whip stands over his head.
  rasczakKit: { build: rasczakKit, box: [-70, -106, 140, 200], rim: "#ffb09a", size: 1.1 },
  kaelKit: { build: kaelKit, box: [-76, -88, 152, 182], rim: "#9fbcff", size: 1.17 },
  supervisor: { build: supervisor, box: HUMANOID_BOX, rim: "#ffd88a", size: 1.08 },
  supervisorKit: { build: supervisorKit, box: HUMANOID_BOX, rim: "#ffd88a", size: 1.1 },
  staff: { build: civilian("staff"), variants: 2, box: HUMANOID_BOX, rim: "#bfe8e0", size: 1.0 },
  clerk: { build: civilian("clerk"), variants: 2, box: HUMANOID_BOX, rim: "#ffd6b8", size: 0.98 },
  sentinel: { build: sentinel, variants: 2, box: [-96, -128, 190, 222], rim: "#bfe0ff", shield: [-40, -30], views: true, core: [0, -29] },
  shieldCommander: { build: shieldCommander, box: [-74, -90, 148, 184], rim: "#7fb8ff", aura: "#3f7fe0", size: 1.08, shield: [-30, -30], views: true, core: [0, -24] },
  timeWarden: { build: timeWarden, box: [-80, -92, 170, 186], rim: "#7fb0ff", size: 1.05, shield: [52, -20], views: true, shieldSide: 1, core: [0, -26] },
  temporalEngineer: { build: temporalEngineer, variants: 2, box: HUMANOID_BOX, rim: "#ffe08a", size: 1.1 },
  temporalSummoner: { build: temporalSummoner, box: [-66, -120, 132, 214], rim: "#e39bff", aura: "#a23cf0", size: 1.05 },
  phaseStalker: { build: phaseStalker, variants: 2, box: [-80, -140, 160, 234], rim: "#8fffe6" },
  riftLeaper: { build: riftLeaper, variants: 2, box: [-72, -104, 144, 198], rim: "#ff9cff", size: 1.1 },
  chronoBomber: { build: chronoBomber, variants: 2, box: [-66, -124, 132, 218], rim: "#ffc86a", size: 1.05 },
};
export { EXTRA_DEFS as HUMANOID_DEFS };
