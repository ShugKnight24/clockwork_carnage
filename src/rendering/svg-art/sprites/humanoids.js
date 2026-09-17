/**
 * Biped enemy sprites (troopers, constructs, casters) in sprite units — see
 * kit.js. One posable front-facing rig (`biped`) is shared by every type; each
 * type supplies its gear and a pose table (idle, move A/B, windup, attack,
 * hurt). Poses only move joints, so a type's silhouette stays recognisable
 * across frames.
 */

import {
  INK, f, P, polar, lerp, heading, capsule, poly, rot, sh, ln, circ, limb, glow, bar, flash,
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
  return {
    d, p, legs, arms, hipY, shY,
    head: [p.headX || 0, d.headY + crouch + (p.headDy || 0)],
    up: `rotate(${f(p.tilt || 0)} 0 ${f(hipY)})`,
  };
}

/* ── Shared gear ─────────────────────────────────────────────────────────── */

function legsOf(R, o) {
  const { thighW = 16, kneeW = 13, ankleW = 10, under = "url(#cloth)", pad = "url(#armor)", boot = "url(#gun)", bootW = 15, plate = pad } = o;
  let m = "";
  for (const s of [-1, 1]) {
    const { H, K, A } = R.legs[s];
    m += limb(H, K, thighW, kneeW, under) + limb(K, A, kneeW, ankleW, under);
    // Outer thigh plate and shin guard.
    if (plate) {
      const t0 = lerp(H, K, 0.15);
      const t1 = lerp(H, K, 0.8);
      m += sh(capsule([t0[0] + s * 2, t0[1]], [t1[0] + s * 1.5, t1[1]], thighW * 0.7, thighW * 0.55), plate, 1);
      m += sh(capsule(lerp(K, A, 0.2), lerp(K, A, 0.78), kneeW * 0.85, ankleW * 0.8), plate, 1);
    }
    // Boot: toe flares outward and toward the viewer.
    const sole = A[1] + R.d.foot;
    m += sh(poly([[A[0] - bootW / 2, A[1] - 6], [A[0] + bootW / 2, A[1] - 6], [A[0] + bootW / 2 + s * 2, sole], [A[0] - bootW / 2 + s * 2, sole]]), boot);
    m += ln(`M${P(A[0] - bootW / 2 + s * 2, sole - 2.5)}H${f(A[0] + bootW / 2 + s * 2)}`, "#000", 1.2, 0.6);
    if (pad) m += sh(poly([[K[0] - 7, K[1] - 6], [K[0] + 7, K[1] - 6], [K[0] + 6, K[1] + 5], [K[0], K[1] + 8], [K[0] - 6, K[1] + 5]]), pad);
  }
  return m;
}

function torsoOf(R, o) {
  const { w = 24, waist = 16, mat = "url(#armor)", under = "url(#cloth)", belt = "url(#gun)", neck = 7 } = o;
  const { shY, hipY } = R;
  return (
    sh(`M${P(-neck, shY - 10)}H${f(neck)}V${f(shY)}H${f(-neck)}Z`, under) +
    sh(`M${P(-w, shY - 3)}Q${P(0, shY - 11)} ${P(w, shY - 3)}L${P(waist + 2, hipY - 12)}L${P(waist, hipY + 2)}H${f(-waist)}L${P(-waist - 2, hipY - 12)}Z`, mat) +
    sh(`M${P(-waist - 2, hipY - 7)}H${f(waist + 2)}V${f(hipY + 1)}H${f(-waist - 2)}Z`, belt, 1.1) +
    ln(`M${P(-w + 4, shY + 14)}Q${P(-w * 0.3, shY + 20)} ${P(0, shY + 14)}Q${P(w * 0.3, shY + 20)} ${P(w - 4, shY + 14)}`, INK, 0.9, 0.55) +
    ln(`M0 ${f(shY + 14)}V${f(hipY - 8)}M${P(-waist + 3, shY + 26)}H${f(waist - 3)}M${P(-waist + 2, shY + 34)}H${f(waist - 2)}`, INK, 0.7, 0.4) +
    ln(`M${P(-w + 3, shY - 1)}Q${P(-w * 0.5, shY - 6)} ${P(-4, shY - 5)}`, "#ffffff", 1.1, 0.35)
  );
}

function armOf(R, s, o) {
  const { upW = 12, foreW = 11, mat = "url(#cloth)", guard = "url(#armor)", hand = "url(#gun)", pad = "url(#armor)", padR = 11 } = o;
  const { S, E, W } = R.arms[s];
  let m = limb(S, E, upW, foreW, mat) + limb(E, lerp(E, W, 0.92), foreW + 1.5, foreW, guard) + circ(W[0], W[1], foreW * 0.55, hand);
  if (pad) m += sh(`M${P(S[0] - padR, S[1] + 4)}Q${P(S[0] - padR, S[1] - padR)} ${P(S[0], S[1] - padR)}Q${P(S[0] + padR, S[1] - padR)} ${P(S[0] + padR, S[1] + 4)}Q${P(S[0], S[1] + 8)} ${P(S[0] - padR, S[1] + 4)}Z`, pad);
  return m;
}

/** Rifle along heading `deg` (polar convention) from grip point g. */
function rifle(g, deg, len = 48, o = {}) {
  const { mat = "url(#gun)", accent = "url(#armor)" } = o;
  const body = [[-10, -3], [len * 0.55, -3], [len * 0.55, -1.8], [len, -1.8], [len, 1.8], [len * 0.55, 1.8], [len * 0.5, 4], [len * 0.2, 4], [len * 0.12, 10], [len * 0.02, 10], [0, 4], [-16, 6], [-16, -3]];
  const a = 90 - deg;
  const pts = rot(body, a, [0, 0], g);
  const scope = rot([[len * 0.15, -3], [len * 0.4, -3], [len * 0.4, -7], [len * 0.15, -7]], a, [0, 0], g);
  return sh(poly(pts), mat, 1.2) + sh(poly(scope), accent, 1);
}

/** Rifle aimed at the viewer: stock at the shoulder, bore facing out. */
function rifleAim(x, y, r, o = {}) {
  const { mat = "url(#gun)" } = o;
  return (
    sh(poly([[x + r * 2.4, y - r * 0.5], [x + r * 0.4, y - r * 1.1], [x - r * 0.9, y - r * 0.6], [x - r * 0.9, y + r * 0.9], [x + r * 0.6, y + r * 1.4], [x + r * 2.5, y + r * 0.8]]), mat, 1.2) +
    circ(x, y, r, mat, 1.2) +
    circ(x, y, r * 0.5, "#030407", 0)
  );
}

function helmetDome(R, o) {
  const { mat = "url(#armor)", r = 13, visor = "#ff8a3a", visorW = 18, chin = "url(#gun)" } = o;
  const [x, y] = R.head;
  const body =
    sh(`M${P(x - r, y + 4)}Q${P(x - r - 1, y - r - 2)} ${P(x, y - r - 3)}Q${P(x + r + 1, y - r - 2)} ${P(x + r, y + 4)}L${P(x + r - 3, y + r - 1)}H${f(x - r + 3)}Z`, mat) +
    sh(`M${P(x - r + 3, y + 4)}H${f(x + r - 3)}L${P(x + r - 5, y + r - 1)}H${f(x - r + 5)}Z`, chin, 1) +
    sh(`M${P(x - visorW / 2, y - 3)}H${f(x + visorW / 2)}V${f(y + 2)}H${f(x - visorW / 2)}Z`, "#0a0506", 1);
  return { body, glow: bar(x, y - 0.5, visorW - 2, 3.2, visor) };
}

/* ── Pose helpers ────────────────────────────────────────────────────────── */

const WALK_A = { legL: { lift: 10, spread: -1 }, legR: { lift: 0 }, crouch: 1.5, tilt: -1.5 };
const WALK_B = { legL: { lift: 0 }, legR: { lift: 10, spread: -1 }, crouch: 1.5, tilt: 1.5 };
const HURT = { tilt: 7, crouch: 6, headX: 4, headDy: 3, legL: { lift: 5, spread: -2 }, legR: { spread: 5 } };

const pose = (...parts) => Object.assign({}, ...parts);

/** Draw `fn(R)` for every pose in the table, returning { name: { body, glow } }. */
function build(d, table, fn) {
  const out = {};
  for (const [name, p] of Object.entries(table)) out[name] = fn(biped(d, p), name);
  return out;
}

const up = (R, m) => `<g transform="${R.up}">${m}</g>`;

/* ── Voss's Henchman ─────────────────────────────────────────────────────── */

function henchman() {
  const armsIdle = { armL: { sh: -8, el: -58, kf: 0.9 }, armR: { sh: 6, el: -30 } };
  const aim = { armL: { sh: -28, el: -70, kf: 0.6 }, armR: { sh: -8, el: -120, kf: 0.55 } };
  const table = {
    idle: armsIdle,
    moveA: pose(WALK_A, { armL: { sh: -4, el: -60, kf: 0.9 }, armR: { sh: 2, el: -26 } }),
    moveB: pose(WALK_B, { armL: { sh: -12, el: -56, kf: 0.9 }, armR: { sh: 10, el: -34 } }),
    windup: pose({ crouch: 3, tilt: -2, legL: { spread: -2 }, legR: { spread: 3 } }, aim),
    attack: pose({ crouch: 2, tilt: 3, headDy: 1, legL: { spread: -2 }, legR: { spread: 3 } }, aim),
    hurt: pose(HURT, { armL: { sh: 34, el: -40, kf: 0.9 }, armR: { sh: 48, el: 10 } }),
  };
  return build(HUMAN, table, (R, name) => {
    const aiming = name === "windup" || name === "attack";
    const g = { mat: "url(#armorDk)" };
    let body = legsOf(R, { pad: "url(#armor)" });
    // Backpack with antenna behind the shoulders.
    body += up(R, sh(`M${P(-15, R.shY - 6)}H15V${f(R.shY + 22)}H-15Z`, "url(#gun)") + ln(`M${P(12, R.shY - 4)}L${P(17, R.shY - 30)}`, INK, 1.6) + circ(17, R.shY - 31, 1.8, "#ff6a1a", 0.8));
    let upper = torsoOf(R, { mat: "url(#armor)" });
    // Vest pouches.
    for (const x of [-12, -3.5, 5]) upper += sh(`M${P(x, R.shY + 16)}h7.5v8h-7.5Z`, "url(#armorDk)", 0.9);
    const head = helmetDome(R, { visor: "#ff8a3a" });
    let glowUp = head.glow;
    if (aiming) {
      const W = R.arms[1].W;
      upper += armOf(R, 1, { pad: "url(#armor)" }) + armOf(R, -1, { pad: "url(#armor)" });
      upper += head.body + rifleAim(W[0] - 6, W[1] - 2, 5.5, g);
      glowUp += name === "attack" ? flash(W[0] - 6, W[1] - 2, 17, "#ffb347") : circ(W[0] - 6, W[1] - 2, 2.2, "#ff9a3a", 0);
    } else {
      const WL = R.arms[-1].W;
      const WR = R.arms[1].W;
      upper += armOf(R, -1, {}) + head.body + rifle(WR, heading(WR, WL) + (name === "hurt" ? 30 : 0), 46, g) + armOf(R, 1, {});
      glowUp += circ(R.arms[-1].S[0] - 2, R.shY - 1, 1.2, "#7dff9a", 0);
    }
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Corrupt SWAT officer ───────────────────────────────────────────────── */

function corruptCop() {
  const shieldArm = { sh: -2, el: -80, kf: 0.75 };
  const table = {
    idle: { armL: shieldArm, armR: { sh: 8, el: -40 } },
    moveA: pose(WALK_A, { armL: shieldArm, armR: { sh: 4, el: -36 } }),
    moveB: pose(WALK_B, { armL: shieldArm, armR: { sh: 12, el: -44 } }),
    windup: pose({ crouch: 4, legL: { spread: -3 }, legR: { spread: 3 } }, { armL: { sh: -8, el: -80, kf: 0.75, dy: -4 }, armR: { sh: -4, el: -110, kf: 0.6 } }),
    attack: pose({ crouch: 3, tilt: 2.5, legL: { spread: -3 }, legR: { spread: 3 } }, { armL: { sh: -8, el: -80, kf: 0.75, dy: -4 }, armR: { sh: -4, el: -110, kf: 0.6 } }),
    hurt: pose(HURT, { armL: { sh: 20, el: -50, kf: 0.8 }, armR: { sh: 44, el: 6 } }),
  };
  return build(HUMAN, table, (R, name) => {
    const aiming = name === "windup" || name === "attack";
    let body = legsOf(R, { pad: "url(#armorDk)" });
    let upper = torsoOf(R, { mat: "url(#armorDk)", w: 23 });
    upper += sh(`M${P(-15, R.shY + 3)}H15L13 ${f(R.shY + 26)}H-13Z`, "url(#armor)", 1.1);
    upper += ln(`M${P(-9, R.shY + 11)}H9`, "#241703", 2.4, 0.9);
    const head = helmetDome(R, { visor: "#7fd8ff", mat: "url(#armorDk)", visorW: 19 });
    // Helmet face shield plate.
    const [hx, hy] = R.head;
    const shieldPlate = sh(`M${P(hx - 10, hy - 6)}H${f(hx + 10)}L${P(hx + 8, hy + 8)}H${f(hx - 8)}Z`, "url(#glass)", 0.9, ` fill-opacity=".55"`);
    let glowUp = head.glow;
    const WR = R.arms[1].W;
    if (aiming) {
      upper += armOf(R, 1, { pad: "url(#armorDk)" }) + head.body + shieldPlate + rifleAim(WR[0] - 4, WR[1] - 3, 4.8);
      glowUp += name === "attack" ? flash(WR[0] - 4, WR[1] - 3, 15, "#ffd24a") : circ(WR[0] - 4, WR[1] - 3, 2, "#ffd24a", 0);
    } else {
      upper += armOf(R, 1, { pad: "url(#armorDk)" }) + head.body + shieldPlate + rifle(WR, 200, 34);
    }
    // Riot shield on the left forearm, in front of everything.
    const WL = R.arms[-1].W;
    const tilt = name === "hurt" ? -14 : 0;
    const sw = 36;
    const shp = rot([[-sw / 2, -52], [sw / 2, -52], [sw / 2 + 1, 38], [0, 44], [-sw / 2 - 1, 38]], tilt, [0, 0], [WL[0] + 4, WL[1] + 6]);
    upper += armOf(R, -1, { pad: "url(#armorDk)" });
    upper += sh(poly(shp), "url(#glass)", 1.8, ` fill-opacity=".82"`);
    const band = rot([[-sw / 2, -30], [sw / 2, -30], [sw / 2, -24], [-sw / 2, -24]], tilt, [0, 0], [WL[0] + 4, WL[1] + 6]);
    upper += sh(poly(band), "#1a1204", 0.6, ` fill-opacity=".85"`);
    const gl = rot([[-sw / 2 + 5, -46], [-sw / 2 + 9, -46], [-sw / 2 + 9, 20], [-sw / 2 + 5, 24]], tilt, [0, 0], [WL[0] + 4, WL[1] + 6]);
    upper += `<path d="${poly(gl)}" fill="#fff" opacity=".35"/>`;
    // Shoulder light-bar.
    glowUp += bar(R.arms[1].S[0], R.shY - 4, 5, 2.2, "#ff3344");
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Chrono Sentinel ────────────────────────────────────────────────────── */

const SENTINEL = { hipY: 10, hipW: 13, stance: 4, thigh: 34, shin: 30, foot: 10, shY: -46, shW: 32, ua: 28, fa: 26, headY: -70 };

function sentinel() {
  const shieldArm = { sh: -4, el: -70, kf: 0.8 };
  const table = {
    idle: { armL: shieldArm, armR: { sh: 18, el: -4 } },
    moveA: pose(WALK_A, { armL: shieldArm, armR: { sh: 14, el: -2 }, crouch: 2 }),
    moveB: pose(WALK_B, { armL: shieldArm, armR: { sh: 22, el: -6 }, crouch: 2 }),
    windup: pose({ crouch: 6, tilt: -4, legL: { spread: -4 }, legR: { spread: 5 } }, { armL: { sh: -10, el: -60, kf: 0.8 }, armR: { sh: 120, el: 20, kf: 0.9 } }),
    attack: pose({ crouch: 7, tilt: 5, headDy: 2, legL: { spread: -4 }, legR: { spread: 6 } }, { armL: { sh: 6, el: -40, kf: 0.8 }, armR: { sh: 40, el: -95, kf: 0.9 } }),
    hurt: pose(HURT, { tilt: 6, armL: { sh: 16, el: -50, kf: 0.8 }, armR: { sh: 36, el: 4 } }),
  };
  return build(SENTINEL, table, (R, name) => {
    let body = legsOf(R, { thighW: 18, kneeW: 16, ankleW: 14, bootW: 20, under: "url(#armorDk)", pad: "url(#armor)", boot: "url(#armorDk)" });
    let upper = "";
    // Blocky reactor-plate torso.
    const { shY, hipY } = R;
    upper += sh(`M${P(-34, shY - 6)}H34L28 ${f(hipY - 6)}H-28Z`, "url(#armor)", 1.5);
    upper += sh(`M${P(-18, hipY - 12)}H18L16 ${f(hipY + 4)}H-16Z`, "url(#armorDk)", 1.2);
    upper += sh(`M${P(-22, shY + 4)}H22L18 ${f(shY + 30)}H-18Z`, "url(#steel)", 1.1);
    upper += ln(`M0 ${f(shY + 4)}V${f(shY + 30)}M-20 ${f(shY + 17)}H20`, INK, 1, 0.6);
    // Axe arm (right), then the head, then the tower shield arm on top.
    const WR = R.arms[1].W;
    const axeDeg = name === "windup" ? 200 : name === "attack" ? 250 : name === "hurt" ? 150 : 166;
    const shaftEnd = polar(WR, axeDeg, 58);
    const shaftBot = polar(WR, axeDeg + 180, 30);
    const axe = sh(capsule(shaftBot, shaftEnd, 3.6, 3.2), "url(#gun)", 1.1);
    const hd = heading(shaftBot, shaftEnd);
    const bladePts = [[-6, 4], [0, 0], [26, -12], [40, 6], [34, 34], [12, 24], [0, 20], [-6, 18]].map(([bx, by]) => polar(polar(shaftEnd, hd + 180, by), hd + 90, bx));
    const blade = sh(poly(bladePts), "url(#steel)", 1.3) + ln(`M${P(...bladePts[3])}L${P(...bladePts[4])}`, "#e8f4ff", 1.6, 0.9) + circ(shaftEnd[0], shaftEnd[1], 3, "url(#steel)", 1);
    upper += axe + blade + armOf(R, 1, { upW: 17, foreW: 16, mat: "url(#armorDk)", guard: "url(#armor)", padR: 16 });
    const [hx, hy] = R.head;
    upper += sh(`M${P(hx - 17, hy - 14)}Q${P(hx, hy - 20)} ${P(hx + 17, hy - 14)}V${f(hy + 10)}L${P(hx + 11, hy + 17)}H${f(hx - 11)}L${P(hx - 17, hy + 10)}Z`, "url(#armor)", 1.6);
    upper += sh(`M${P(hx - 9, hy - 3)}H${f(hx + 9)}V${f(hy + 1)}H${f(hx - 9)}Z`, "#05070b", 0.8) + sh(`M${P(hx - 2, hy - 9)}H${f(hx + 2)}V${f(hy + 8)}H${f(hx - 2)}Z`, "#05070b", 0.8);
    upper += armOf(R, -1, { upW: 17, foreW: 16, mat: "url(#armorDk)", guard: "url(#armor)", padR: 16 });
    const WL = R.arms[-1].W;
    const t = name === "hurt" ? -10 : 0;
    const shield = rot([[-19, -58], [19, -58], [21, 52], [0, 62], [-21, 52]], t, [0, 0], [WL[0] - 6, WL[1] + 2]);
    upper += sh(poly(shield), "url(#steel)", 1.8);
    const inner = rot([[-13, -50], [13, -50], [14, 46], [0, 54], [-14, 46]], t, [0, 0], [WL[0] - 6, WL[1] + 2]);
    upper += sh(poly(inner), "url(#armorDk)", 0.9);
    const cross = rot([[-2, -40], [2, -40], [2, -8], [11, -8], [11, -4], [2, -4], [2, 36], [-2, 36], [-2, -4], [-11, -4], [-11, -8], [-2, -8]], t, [0, 0], [WL[0] - 6, WL[1] + 2]);
    upper += sh(poly(cross), "url(#steel)", 0.7);
    const eyes = bar(hx, hy - 1, 17, 3, "#bfe6ff") + bar(hx, hy, 3, 15, "#bfe6ff");
    const core = circ(0, shY + 17, name === "windup" ? 5 : 3.5, "#9fd8ff", 0);
    body += up(R, upper);
    return { body, glow: up(R, glow(eyes + core)) };
  });
}

/* ── Shield Commander (sub-boss) ────────────────────────────────────────── */

const COMMANDER = { ...HUMAN, shW: 23, hipW: 9, headY: -60 };

function shieldCommander() {
  const table = {
    idle: { armL: { sh: -10, el: -70, kf: 0.8 }, armR: { sh: 12, el: -10 } },
    moveA: pose(WALK_A, { armL: { sh: -10, el: -70, kf: 0.8 }, armR: { sh: 8, el: -6 } }),
    moveB: pose(WALK_B, { armL: { sh: -10, el: -70, kf: 0.8 }, armR: { sh: 16, el: -14 } }),
    windup: pose({ crouch: 3, legL: { spread: -2 }, legR: { spread: 3 } }, { armL: { sh: -14, el: -76, kf: 0.8, dy: -3 }, armR: { sh: 70, el: 20, ku: 0.9, kf: 0.8 } }),
    attack: pose({ crouch: 2, tilt: -3, legL: { spread: -2 }, legR: { spread: 3 } }, { armL: { sh: -14, el: -76, kf: 0.8, dy: -3 }, armR: { sh: 80, el: 10, ku: 0.9, kf: 0.8 } }),
    hurt: pose(HURT, { armL: { sh: 20, el: -60, kf: 0.8 }, armR: { sh: 44, el: 8 } }),
  };
  return build(COMMANDER, table, (R, name) => {
    let body = "";
    // Cape behind the legs.
    const { shY, hipY } = R;
    body += up(R, sh(`M${P(-24, shY - 2)}H24L${P(34, SOLE - 10)}Q0 ${f(SOLE - 2)} -34 ${f(SOLE - 10)}Z`, "url(#capeM)", 1.3));
    body += legsOf(R, { pad: "url(#armor)" });
    let upper = torsoOf(R, { w: 27, waist: 17, mat: "url(#armor)" });
    upper += sh(`M${P(-10, shY + 2)}H10L7 ${f(shY + 24)}H-7Z`, "url(#armorDk)", 1);
    for (const y of [shY + 8, shY + 13, shY + 18]) upper += ln(`M-4 ${f(y)}Q0 ${f(y - 2)} 4 ${f(y)}`, "#bfe0ff", 0.9, 0.7);
    const bigPad = { pad: "url(#armor)", padR: 15, upW: 13, foreW: 12, mat: "url(#cloth)", guard: "url(#armorDk)" };
    upper += armOf(R, 1, bigPad);
    const WR = R.arms[1].W;
    // Wrist cannon.
    const cd = heading(R.arms[1].E, WR);
    upper += sh(capsule(R.arms[1].E, polar(WR, cd, 8), 8, 7), "url(#gun)", 1.2);
    const [hx, hy] = R.head;
    upper += sh(`M${P(hx - 12, hy + 5)}Q${P(hx - 13, hy - 14)} ${P(hx, hy - 15)}Q${P(hx + 13, hy - 14)} ${P(hx + 12, hy + 5)}L${P(hx + 8, hy + 12)}H${f(hx - 8)}Z`, "url(#armor)", 1.4);
    upper += sh(`M${P(hx - 2.5, hy - 22)}H${f(hx + 2.5)}L${P(hx + 2, hy - 6)}H${f(hx - 2)}Z`, "url(#armorDk)", 1);
    upper += sh(`M${P(hx - 9, hy - 3)}H${f(hx + 9)}V${f(hy + 2)}H${f(hx - 9)}Z`, "#04070c", 0.8);
    upper += armOf(R, -1, bigPad);
    let glowUp = bar(hx, hy - 0.5, 16, 3, "#8cc8ff");
    const muzzle = polar(WR, cd, 8);
    glowUp += name === "attack" ? flash(muzzle[0], muzzle[1], 14, "#8cd0ff") : circ(muzzle[0], muzzle[1], name === "windup" ? 3.5 : 1.6, "#9fd8ff", 0);
    // Energy buckler projected off the left forearm.
    const WL = R.arms[-1].W;
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      hexPts.push([WL[0] - 4 + Math.cos(a) * 20, WL[1] - 4 + Math.sin(a) * 24]);
    }
    const hex = poly(hexPts);
    upper += `<path d="${hex}" fill="#3a8cff" fill-opacity=".2" stroke="#6fb4ff" stroke-width="1.4"/>`;
    glowUp += `<path d="${hex}" fill="none" stroke="#8cc8ff" stroke-width="${name === "hurt" ? 1 : 2.2}"/>`;
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Time Warden ────────────────────────────────────────────────────────── */

const WARDEN = { hipY: 12, hipW: 12, stance: 3, thigh: 32, shin: 30, foot: 10, shY: -40, shW: 30, ua: 25, fa: 24, headY: -62 };

function clockDial(x, y, r, h, m, dial = "url(#dial)") {
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ticks += `M${P(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72)}L${P(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9)}`;
  }
  const hand = (t, len) => {
    const a = (t / 12) * Math.PI * 2 - Math.PI / 2;
    return `M${P(x, y)}L${P(x + Math.cos(a) * len, y + Math.sin(a) * len)}`;
  };
  return circ(x, y, r, "url(#brass)", 1.3) + circ(x, y, r * 0.84, dial, 0.8) + ln(ticks, "#dff2ff", 0.9, 0.8) + ln(hand(h, r * 0.45) + hand(m, r * 0.7), "#ffffff", 1.3);
}

function timeWarden() {
  const table = {
    idle: { armL: { sh: 20, el: -4 }, armR: { sh: 20, el: -4 } },
    moveA: pose(WALK_A, { armL: { sh: 16, el: -2 }, armR: { sh: 24, el: -6 }, crouch: 2 }),
    moveB: pose(WALK_B, { armL: { sh: 24, el: -6 }, armR: { sh: 16, el: -2 }, crouch: 2 }),
    windup: pose({ crouch: 4, tilt: -2, legL: { spread: -3 }, legR: { spread: 3 } }, { armL: { sh: 60, el: 30 }, armR: { sh: 60, el: 30 } }),
    attack: pose({ crouch: 2, tilt: 2 }, { armL: { sh: 34, el: -60, kf: 0.8 }, armR: { sh: 34, el: -60, kf: 0.8 } }),
    hurt: pose(HURT, { armL: { sh: 36, el: -40 }, armR: { sh: 44, el: 6 } }),
  };
  return build(WARDEN, table, (R, name) => {
    const { shY, hipY } = R;
    let body = legsOf(R, { thighW: 16, kneeW: 15, ankleW: 13, bootW: 18, under: "url(#armorDk)", pad: "url(#armor)", boot: "url(#armorDk)" });
    // Arc shield ring standing off the right side.
    const arc = `M${P(40, shY - 30)}Q${P(78, hipY - 20)} ${P(40, hipY + 34)}`;
    body += up(R, ln(arc, "#1a3a7a", 6, 0.9) + ln(arc, "#4d8cff", 2.5, 0.8));
    let upper = sh(`M${P(-32, shY - 6)}Q0 ${f(shY - 14)} 32 ${f(shY - 6)}L${P(26, hipY - 8)}Q0 ${f(hipY + 2)} -26 ${f(hipY - 8)}Z`, "url(#armor)", 1.6);
    upper += sh(`M${P(-20, hipY - 14)}H20L17 ${f(hipY + 4)}H-17Z`, "url(#armorDk)", 1.2);
    const hands = name === "windup" ? [11, 1] : name === "attack" ? [3, 3] : [10, 2];
    upper += clockDial(0, shY + 17, 14, hands[0], hands[1]);
    const armO = { upW: 13, foreW: 13, mat: "url(#armorDk)", guard: "url(#armor)", pad: "url(#armor)", padR: 12 };
    upper += armOf(R, -1, armO) + armOf(R, 1, armO);
    for (const s of [-1, 1]) {
      const { S } = R.arms[s];
      upper += sh(`M${P(S[0] - 11, S[1] - 12)}H${f(S[0] + 11)}V${f(S[1] + 2)}H${f(S[0] - 11)}Z`, "url(#armor)", 1.4);
    }
    const [hx, hy] = R.head;
    upper += sh(`M${P(hx - 13, hy + 8)}V${f(hy - 4)}Q${P(hx, hy - 20)} ${P(hx + 13, hy - 4)}V${f(hy + 8)}Z`, "url(#armor)", 1.5);
    upper += sh(`M${P(hx - 1.5, hy - 17)}H${f(hx + 1.5)}V${f(hy - 6)}H${f(hx - 1.5)}Z`, "url(#armorDk)", 0.7);
    upper += sh(`M${P(hx - 10, hy - 3)}H${f(hx + 10)}V${f(hy + 2)}H${f(hx - 10)}Z`, "#04070c", 0.8);
    const coreR = name === "windup" ? 16 : name === "attack" ? 20 : 12;
    let glowUp = bar(hx, hy - 0.5, 17, 3, "#9ecbff") + `<circle cx="0" cy="${f(shY + 17)}" r="${coreR}" fill="none" stroke="#6fb0ff" stroke-width="${name === "attack" ? 4 : 2}"/>`;
    if (name === "attack") glowUp += flash(0, shY + 17, 22, "#8cc8ff");
    glowUp += ln(arc, "#8cc0ff", 1.6);
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Temporal Engineer ──────────────────────────────────────────────────── */

const ENGINEER = { ...HUMAN, hipY: 10, shY: -34, headY: -54, shW: 19 };

function temporalEngineer() {
  const table = {
    idle: { tilt: 2, armL: { sh: 14, el: -30 }, armR: { sh: 10, el: -50, kf: 0.85 } },
    moveA: pose(WALK_A, { armL: { sh: 10, el: -26 }, armR: { sh: 14, el: -54, kf: 0.85 } }),
    moveB: pose(WALK_B, { armL: { sh: 18, el: -34 }, armR: { sh: 6, el: -46, kf: 0.85 } }),
    windup: pose({ crouch: 3, tilt: -2 }, { armL: { sh: 50, el: 40 }, armR: { sh: -6, el: -110, kf: 0.6 } }),
    attack: pose({ crouch: 2, tilt: 3 }, { armL: { sh: 40, el: 30 }, armR: { sh: -6, el: -110, kf: 0.6 } }),
    hurt: pose(HURT, { armL: { sh: 36, el: -40 }, armR: { sh: 44, el: 6 } }),
  };
  return build(ENGINEER, table, (R, name) => {
    const { shY, hipY } = R;
    let body = "";
    // Backpack generator with coil and antenna.
    body += up(R, sh(`M${P(-20, shY - 10)}H18V${f(shY + 26)}H-20Z`, "url(#brass)", 1.4) +
      sh(`M${P(-26, shY - 4)}H-18V${f(shY + 20)}H-26Z`, "url(#gun)", 1.2) +
      ln(`M${P(14, shY - 10)}L${P(22, shY - 40)}`, INK, 1.8) + ln(`M${P(17, shY - 26)}H26M${P(19, shY - 33)}H25`, INK, 1.2));
    body += legsOf(R, { pad: "url(#brass)", under: "url(#armorDk)" });
    let upper = torsoOf(R, { mat: "url(#armorDk)", w: 21 });
    upper += sh(`M${P(-13, shY + 4)}H13L11 ${f(hipY + 8)}H-11Z`, "url(#apron)", 1.1);
    upper += ln(`M${P(-13, shY + 2)}L${P(13, hipY - 8)}`, "#3a2408", 2.4) + circ(4, shY + 18, 2, "url(#brass)", 0.7);
    upper += armOf(R, -1, { pad: "url(#brass)", guard: "url(#brass)", padR: 8 });
    // Wrench claw on the left hand.
    const WL = R.arms[-1].W;
    const wd = heading(R.arms[-1].E, WL);
    const wt = polar(WL, wd, 14);
    upper += sh(capsule(WL, wt, 4, 4), "url(#steel)", 1.1) + sh(`M${P(wt[0] - 6, wt[1] - 2)}l12 0l-2 8h-3v-4h-2v4h-3Z`, "url(#steel)", 1);
    const [hx, hy] = R.head;
    upper += sh(`M${P(hx - 11, hy + 8)}Q${P(hx - 12, hy - 13)} ${P(hx, hy - 13)}Q${P(hx + 12, hy - 13)} ${P(hx + 11, hy + 8)}Q${P(hx, hy + 13)} ${P(hx - 11, hy + 8)}Z`, "url(#skin)", 1.3);
    upper += sh(`M${P(hx - 12, hy - 6)}Q${P(hx, hy - 18)} ${P(hx + 12, hy - 6)}L${P(hx + 11, hy - 10)}Q${P(hx, hy - 20)} ${P(hx - 11, hy - 10)}Z`, "url(#armorDk)", 1);
    upper += ln(`M${P(hx - 12, hy - 2)}H${f(hx + 12)}`, "#2a1a06", 2.2);
    upper += circ(hx - 5, hy - 2, 4.4, "url(#brass)", 1.1) + circ(hx + 5, hy - 2, 4.4, "url(#brass)", 1.1);
    upper += ln(`M${P(hx - 6, hy + 7)}Q${P(hx, hy + 9)} ${P(hx + 6, hy + 7)}`, INK, 0.9, 0.7);
    upper += armOf(R, 1, { pad: "url(#brass)", guard: "url(#brass)", padR: 8 });
    const WR = R.arms[1].W;
    let glowUp = circ(hx - 5, hy - 2, 2.6, "#ffe38a", 0) + circ(hx + 5, hy - 2, 2.6, "#ffe38a", 0);
    if (name === "windup" || name === "attack") {
      upper += rifleAim(WR[0] - 3, WR[1] - 2, 4.6, { mat: "url(#brass)" });
      glowUp += name === "attack" ? flash(WR[0] - 3, WR[1] - 2, 16, "#ffd36b") : circ(WR[0] - 3, WR[1] - 2, 3, "#ffe38a", 0);
    } else {
      const tip = polar(WR, heading(R.arms[1].E, WR), 12);
      upper += sh(capsule(WR, tip, 6, 4), "url(#brass)", 1.1);
      glowUp += circ(tip[0], tip[1], 2, "#ffe38a", 0);
    }
    glowUp += circ(22, shY - 40, 1.8, "#ffd36b", 0) + ln(`M${P(-22, shY)}V${f(shY + 16)}`, "#ffd36b", 1.6, 0.8);
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Temporal Summoner (sub-boss) ───────────────────────────────────────── */

const SUMMONER = { ...HUMAN, headY: -60, shW: 18 };

function temporalSummoner() {
  const table = {
    idle: { armL: { sh: 26, el: -10 }, armR: { sh: 8, el: -40, kf: 0.9 } },
    moveA: { tilt: -2, sway: -4, armL: { sh: 22, el: -8 }, armR: { sh: 8, el: -40, kf: 0.9 } },
    moveB: { tilt: 2, sway: 4, armL: { sh: 30, el: -12 }, armR: { sh: 8, el: -40, kf: 0.9 } },
    windup: { crouch: -3, armL: { sh: 120, el: 20 }, armR: { sh: 70, el: 30 } },
    attack: { crouch: 1, tilt: 3, armL: { sh: 70, el: -30, kf: 0.8 }, armR: { sh: 20, el: -60, kf: 0.8 } },
    hurt: { tilt: 8, crouch: 3, headX: 3, armL: { sh: 40, el: 20 }, armR: { sh: 30, el: 20 } },
  };
  return build(SUMMONER, table, (R, name) => {
    const { shY } = R;
    const sw = R.p.sway || 0;
    let body = "";
    // Robe: flared hem to the floor, sweeping with the stride.
    const hem = SOLE - 2;
    body += up(R,
      sh(`M${P(-19, shY - 4)}Q0 ${f(shY - 10)} 19 ${f(shY - 4)}L${P(34 + sw, hem - 6)}Q${P(18 + sw, hem + 3)} ${P(sw, hem)}Q${P(-18 + sw, hem + 3)} ${P(-34 + sw, hem - 6)}Z`, "url(#armor)", 1.5) +
      sh(`M${P(-7, shY)}H7L${P(12 + sw, hem - 1)}H${f(-12 + sw)}Z`, "url(#armorDk)", 1) +
      ln(`M${P(-14, shY + 20)}Q${P(-22 + sw, hem - 30)} ${P(-26 + sw, hem - 6)}M${P(14, shY + 20)}Q${P(22 + sw, hem - 30)} ${P(26 + sw, hem - 6)}`, INK, 0.9, 0.55) +
      sh(`M${P(-9, shY + 26)}H9V${f(shY + 31)}H-9Z`, "url(#brass)", 0.9));
    let upper = "";
    const sleeve = { mat: "url(#armor)", guard: "url(#armorDk)", hand: "url(#skinV)", pad: "", upW: 11, foreW: 12 };
    // Staff in the right hand.
    const WR = R.arms[1].W;
    const top = [WR[0] + 4, WR[1] - 54];
    upper += sh(capsule([WR[0] + 2, WR[1] + 50], top, 3, 3.4), "url(#gun)", 1.1);
    upper += sh(`M${P(top[0] - 7, top[1] + 4)}Q${P(top[0], top[1] - 14)} ${P(top[0] + 7, top[1] + 4)}`, "none", 1.8);
    upper += circ(top[0], top[1] - 2, 4.8, "url(#brass)", 1);
    upper += armOf(R, 1, sleeve) + armOf(R, -1, sleeve);
    const [hx, hy] = R.head;
    // Hood with a shadowed face and two eyes.
    upper += sh(`M${P(hx - 14, hy + 12)}Q${P(hx - 16, hy - 12)} ${P(hx, hy - 17)}Q${P(hx + 16, hy - 12)} ${P(hx + 14, hy + 12)}Q${P(hx, hy + 6)} ${P(hx - 14, hy + 12)}Z`, "url(#armor)", 1.5);
    upper += sh(`M${P(hx - 8, hy + 7)}Q${P(hx - 9, hy - 7)} ${P(hx, hy - 9)}Q${P(hx + 9, hy - 7)} ${P(hx + 8, hy + 7)}Z`, "#07020c", 0.8);
    const boost = name === "windup" || name === "attack";
    const WL = R.arms[-1].W;
    let glowUp = circ(hx - 3.5, hy, 1.7, "#f0b8ff", 0) + circ(hx + 3.5, hy, 1.7, "#f0b8ff", 0);
    glowUp += circ(top[0], top[1] - 2, boost ? 5 : 3, "#e9a8ff", 0);
    glowUp += circ(WL[0], WL[1] - 8, boost ? 7 : 4, "#d77bff", 0) + circ(WL[0], WL[1] - 8, boost ? 3 : 1.8, "#ffffff", 0);
    if (name === "attack") glowUp += flash(WL[0], WL[1] - 8, 20, "#e59bff");
    body += up(R, upper);
    // Rune circle on the floor.
    const rune = `<ellipse cx="0" cy="${SOLE - 1}" rx="${boost ? 40 : 34}" ry="7" fill="none" stroke="#c45cff" stroke-width="1.6"/>` +
      `<ellipse cx="0" cy="${SOLE - 1}" rx="${boost ? 30 : 25}" ry="5" fill="none" stroke="#e7a0ff" stroke-width=".9" stroke-dasharray="4 3"/>`;
    return { body, glow: glow(rune) + up(R, glow(glowUp)) };
  });
}

/* ── Phase Stalker ──────────────────────────────────────────────────────── */

const STALKER = { hipY: 6, hipW: 6, stance: 4, thigh: 38, shin: 36, foot: 7, shY: -36, shW: 15, ua: 24, fa: 22, headY: -55 };

function phaseStalker() {
  const table = {
    idle: { crouch: 3, armL: { sh: 16, el: -8 }, armR: { sh: 16, el: -8 } },
    moveA: pose(WALK_A, { crouch: 5, armL: { sh: 10, el: -4 }, armR: { sh: 24, el: -14 } }),
    moveB: pose(WALK_B, { crouch: 5, armL: { sh: 24, el: -14 }, armR: { sh: 10, el: -4 } }),
    windup: { crouch: 10, tilt: -3, legL: { spread: -6 }, legR: { spread: 6 }, armL: { sh: 150, el: -40 }, armR: { sh: 150, el: -40 } },
    attack: { crouch: 8, tilt: 4, legL: { spread: -8 }, legR: { spread: 8 }, armL: { sh: 70, el: 20 }, armR: { sh: 70, el: 20 } },
    hurt: pose(HURT, { armL: { sh: 34, el: 20 }, armR: { sh: 44, el: 12 } }),
  };
  return build(STALKER, table, (R, name) => {
    const { shY, hipY } = R;
    let body = legsOf(R, { thighW: 9, kneeW: 8, ankleW: 6, bootW: 9, under: "url(#armorDk)", pad: "url(#armor)" });
    let upper = sh(`M${P(-16, shY - 2)}Q0 ${f(shY - 8)} 16 ${f(shY - 2)}L${P(9, hipY - 8)}L${P(8, hipY + 2)}H-8L${P(-9, hipY - 8)}Z`, "url(#armorDk)", 1.3);
    for (let i = 0; i < 4; i++) upper += ln(`M${P(-9 + i, shY + 8 + i * 8)}Q0 ${f(shY + 11 + i * 8)} ${P(9 - i, shY + 8 + i * 8)}`, "#4fe0bf", 0.9, 0.6);
    const armO = { upW: 7, foreW: 7, mat: "url(#armorDk)", guard: "url(#armor)", pad: "url(#armor)", padR: 6 };
    let glowUp = "";
    for (const s of [-1, 1]) {
      const { E, W } = R.arms[s];
      const bd = heading(E, W);
      const tip = polar(W, bd + s * 8, 30);
      const blade = poly([polar(W, bd + 90, 2.8), tip, polar(W, bd - 90, 2.8), polar(E, bd, 6)]);
      upper += armOf(R, s, armO) + sh(blade, "url(#steel)", 1.1);
      glowUp += ln(`M${P(...polar(W, bd, 2))}L${P(...lerp(W, tip, 0.9))}`, "#9fffe6", name === "windup" || name === "attack" ? 1.8 : 0.9);
    }
    const [hx, hy] = R.head;
    upper += sh(`M${P(hx - 9, hy + 9)}Q${P(hx - 11, hy - 8)} ${P(hx, hy - 14)}Q${P(hx + 11, hy - 8)} ${P(hx + 9, hy + 9)}L${P(hx, hy + 13)}Z`, "url(#armor)", 1.3);
    upper += sh(`M${P(hx - 6, hy - 1)}H${f(hx + 6)}L${P(hx + 4, hy + 3)}H${f(hx - 4)}Z`, "#010806", 0.6);
    glowUp += bar(hx, hy + 1, 9, 2.4, "#9fffe6");
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Rift Leaper ────────────────────────────────────────────────────────── */

const LEAPER = { hipY: 22, hipW: 10, stance: 8, thigh: 30, shin: 30, foot: 8, shY: -18, shW: 22, ua: 30, fa: 30, headY: -34 };

function riftLeaper() {
  const table = {
    idle: { crouch: 4, headDy: 4, armL: { sh: 22, el: -14 }, armR: { sh: 22, el: -14 } },
    moveA: { crouch: 6, tilt: -4, headDy: 4, legL: { lift: 10 }, armL: { sh: 8, el: -4 }, armR: { sh: 34, el: -18 } },
    moveB: { crouch: 6, tilt: 4, headDy: 4, legR: { lift: 10 }, armL: { sh: 34, el: -18 }, armR: { sh: 8, el: -4 } },
    windup: { crouch: 14, headDy: 6, legL: { spread: -8 }, legR: { spread: 8 }, armL: { sh: 120, el: 40 }, armR: { sh: 120, el: 40 } },
    attack: { crouch: -4, headDy: -2, legL: { lift: 8, spread: -2 }, legR: { lift: 8, spread: 2 }, armL: { sh: 95, el: 25, kf: 0.9 }, armR: { sh: 95, el: 25, kf: 0.9 } },
    hurt: { crouch: 6, tilt: 10, headX: 4, legL: { lift: 4 }, armL: { sh: 50, el: 30 }, armR: { sh: 40, el: 20 } },
  };
  return build(LEAPER, table, (R, name) => {
    const { shY, hipY } = R;
    let body = legsOf(R, { thighW: 17, kneeW: 12, ankleW: 9, bootW: 13, under: "url(#armorDk)", pad: "", plate: "url(#hide)", boot: "url(#claw)" });
    let upper = sh(`M${P(-26, shY - 2)}Q${P(0, shY - 16)} ${P(26, shY - 2)}Q${P(22, hipY - 14)} ${P(10, hipY)}H-10Q${P(-22, hipY - 14)} ${P(-26, shY - 2)}Z`, "url(#armorDk)", 1.5);
    upper += sh(`M${P(-18, shY - 6)}Q${P(0, shY - 14)} ${P(18, shY - 6)}L${P(12, shY + 10)}Q0 ${f(shY + 15)} -12 ${f(shY + 10)}Z`, "url(#hide)", 1);
    upper += ln(`M${P(-12, shY + 2)}Q0 ${f(shY + 8)} 12 ${f(shY + 2)}M${P(-9, shY + 12)}Q0 ${f(shY + 17)} 9 ${f(shY + 12)}`, INK, 0.9, 0.5);
    const cracks = `M${P(-14, shY - 4)}L${P(-8, shY + 6)}L${P(-12, shY + 14)}L${P(-5, shY + 22)}M${P(15, shY)}L${P(10, shY + 10)}L${P(14, shY + 18)}`;
    upper += ln(cracks, "#2a0626", 3, 0.9);
    upper += circ(0, shY + 10, 6, "#2a0626", 1.2);
    const charged = name === "windup" || name === "attack";
    let glowUp = ln(cracks, "#ff8cff", 1.8) + circ(0, shY + 10, charged ? 6 : 4.2, "#ff6cff", 0) + circ(0, shY + 10, 2, "#ffffff", 0);
    for (const s of [-1, 1]) {
      const { E, W } = R.arms[s];
      upper += limb(R.arms[s].S, E, 14, 11, "url(#armorDk)") + limb(E, W, 11, 8, "url(#hide)");
      const hd = heading(E, W);
      for (const k of [-24, 0, 24]) {
        const base = polar(W, hd + k, 3);
        const tip = polar(base, hd + k * 0.6 + s * 10, 12);
        upper += sh(poly([polar(base, hd + k + 90, 1.8), tip, polar(base, hd + k - 90, 1.8)]), "url(#claw)", 0.9);
      }
    }
    const [hx, hy] = R.head;
    upper += sh(`M${P(hx - 11, hy + 4)}Q${P(hx - 12, hy - 10)} ${P(hx, hy - 12)}Q${P(hx + 12, hy - 10)} ${P(hx + 11, hy + 4)}L${P(hx + 5, hy + 12)}H${f(hx - 5)}Z`, "url(#armorDk)", 1.3);
    upper += sh(`M${P(hx - 7, hy - 9)}L${P(hx - 12, hy - 20)}L${P(hx - 3, hy - 11)}ZM${P(hx + 7, hy - 9)}L${P(hx + 12, hy - 20)}L${P(hx + 3, hy - 11)}Z`, "url(#claw)", 1);
    if (name === "windup" || name === "attack") upper += sh(`M${P(hx - 5, hy + 6)}H${f(hx + 5)}L${P(hx + 3, hy + 11)}H${f(hx - 3)}Z`, "#1a0010", 0.7);
    glowUp += bar(hx - 4.5, hy - 1, 5, 2.4, "#ff9cff") + bar(hx + 4.5, hy - 1, 5, 2.4, "#ff9cff");
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Chrono-Bomber ──────────────────────────────────────────────────────── */

const BOMBER = { hipY: 30, hipW: 16, stance: 4, thigh: 24, shin: 26, foot: 8, shY: -24, shW: 34, ua: 18, fa: 18, headY: -58 };

function chronoBomber() {
  const table = {
    idle: { armL: { sh: 30, el: 10 }, armR: { sh: 30, el: 10 } },
    moveA: { legL: { lift: 8 }, crouch: 1.5, tilt: -3, armL: { sh: 26, el: 10 }, armR: { sh: 36, el: 10 } },
    moveB: { legR: { lift: 8 }, crouch: 1.5, tilt: 3, armL: { sh: 36, el: 10 }, armR: { sh: 26, el: 10 } },
    windup: { crouch: 4, armL: { sh: 150, el: 10 }, armR: { sh: 150, el: 10 } },
    attack: { crouch: -2, tilt: 2, armL: { sh: 110, el: -30 }, armR: { sh: 110, el: -30 } },
    hurt: { crouch: 3, tilt: 9, armL: { sh: 60, el: 30 }, armR: { sh: 50, el: 20 } },
  };
  return build(BOMBER, table, (R, name) => {
    const { shY } = R;
    let body = legsOf(R, { thighW: 12, kneeW: 12, ankleW: 10, bootW: 17, under: "url(#gun)", pad: "url(#armor)", boot: "url(#armorDk)" });
    const cy = shY + 10;
    let upper = "";
    for (const s of [-1, 1]) {
      const { S, E, W } = R.arms[s];
      upper += limb(S, E, 8, 8, "url(#gun)") + limb(E, W, 8, 7, "url(#armorDk)");
      upper += sh(`M${P(W[0] - 4, W[1])}l-3 7m7-7l3 7`, "none", 1.6);
    }
    upper += circ(0, cy, 34, "url(#armor)", 1.8);
    upper += `<path d="M-34 ${cy}Q0 ${cy + 12} 34 ${cy}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
    upper += sh(`M-36 ${f(cy - 3)}Q0 ${f(cy + 9)} 36 ${f(cy - 3)}V${f(cy + 3)}Q0 ${f(cy + 15)} -36 ${f(cy + 3)}Z`, "url(#armorDk)", 1.2);
    for (const x of [-24, -8, 8, 24]) upper += circ(x, cy + 6 - Math.abs(x) * 0.12, 1.6, "url(#brass)", 0.6);
    upper += clockDial(0, cy - 10, 13, name === "windup" ? 11.8 : 9, name === "windup" ? 11.8 : 4, "url(#dialA)");
    // Sensor head on top.
    const [hx, hy] = [R.head[0], cy - 38];
    upper += sh(`M${P(hx - 10, hy + 8)}Q${P(hx - 10, hy - 6)} ${P(hx, hy - 7)}Q${P(hx + 10, hy - 6)} ${P(hx + 10, hy + 8)}Z`, "url(#armorDk)", 1.3);
    upper += sh(`M${P(hx - 7, hy)}H${f(hx + 7)}V${f(hy + 4)}H${f(hx - 7)}Z`, "#110800", 0.7);
    let glowUp = bar(hx, hy + 2, 12, 2.6, "#ffc04a") + `<circle cx="0" cy="${f(cy - 10)}" r="${name === "windup" ? 15 : 12}" fill="none" stroke="#ffb030" stroke-width="${name === "windup" ? 3 : 1.6}"/>`;
    if (name === "windup" || name === "attack") {
      const bx = 0;
      const by = name === "windup" ? cy - 66 : cy - 56;
      upper += circ(bx, by, 9, "url(#gun)", 1.4) + ln(`M${P(bx + 5, by - 7)}q4 -4 2 -8`, "#b58b4a", 1.4);
      glowUp += circ(bx + 6.5, by - 14.5, 2.4, "#ffe08a", 0) + circ(bx, by, 3.2, "#ff9020", 0);
      if (name === "attack") glowUp += flash(bx + 6, by - 13, 14, "#ffc04a");
    }
    body += up(R, upper);
    return { body, glow: up(R, glow(glowUp)) };
  });
}

/* ── Registry ───────────────────────────────────────────────────────────── */

const HUMANOID_BOX = [-70, -86, 140, 180];

/** Extra per-type <defs> beyond the palette materials. */
const EXTRA_DEFS = {
  shieldCommander: `<linearGradient id="capeM" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#2a3f78"/><stop offset=".5" stop-color="#141f44"/><stop offset="1" stop-color="#070a18"/></linearGradient>`,
  timeWarden: `<radialGradient id="dial" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#1c3f8a"/><stop offset="1" stop-color="#060d24"/></radialGradient>`,
  chronoBomber: `<radialGradient id="dialA" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#5a3406"/><stop offset="1" stop-color="#1a0c02"/></radialGradient>`,
  temporalEngineer: `<linearGradient id="apron" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#6e4a22"/><stop offset=".5" stop-color="#4a2e12"/><stop offset="1" stop-color="#1e1206"/></linearGradient>` +
    `<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#d9a37c"/><stop offset=".5" stop-color="#a06a48"/><stop offset="1" stop-color="#4a2a1a"/></linearGradient>`,
  beast: `<linearGradient id="hideDk" x1="0" y1="0" x2="1" y2=".45"><stop offset="0" stop-color="#5a1e08"/><stop offset=".4" stop-color="#2c0c04"/><stop offset="1" stop-color="#0a0302"/></linearGradient>`,
  temporalSummoner: `<linearGradient id="skinV" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#cdb6e0"/><stop offset="1" stop-color="#4a3860"/></linearGradient>`,
  riftLeaper: `<linearGradient id="hide" x1="0" y1="0" x2="1" y2=".45"><stop offset="0" stop-color="#8a4a86"/><stop offset=".3" stop-color="#4e2250"/><stop offset="1" stop-color="#12051a"/></linearGradient>` +
    `<linearGradient id="claw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1030"/><stop offset=".6" stop-color="#c77ab8"/><stop offset="1" stop-color="#ffe6fa"/></linearGradient>`,
};

export const HUMANOIDS = {
  henchman: { build: henchman, box: HUMANOID_BOX, rim: "#ff9a4a", size: 1.1 },
  corruptCop: { build: corruptCop, box: [-72, -86, 142, 180], rim: "#ffd35a", size: 1.08 },
  sentinel: { build: sentinel, box: [-96, -128, 190, 222], rim: "#bfe0ff" },
  shieldCommander: { build: shieldCommander, box: [-74, -90, 148, 184], rim: "#7fb8ff", aura: "#3f7fe0", size: 1.08 },
  timeWarden: { build: timeWarden, box: [-80, -92, 170, 186], rim: "#7fb0ff", size: 1.05 },
  temporalEngineer: { build: temporalEngineer, box: HUMANOID_BOX, rim: "#ffe08a", size: 1.1 },
  temporalSummoner: { build: temporalSummoner, box: [-66, -120, 132, 214], rim: "#e39bff", aura: "#a23cf0", size: 1.05 },
  phaseStalker: { build: phaseStalker, box: [-80, -140, 160, 234], rim: "#8fffe6" },
  riftLeaper: { build: riftLeaper, box: [-72, -104, 144, 198], rim: "#ff9cff", size: 1.1 },
  chronoBomber: { build: chronoBomber, box: [-66, -120, 132, 214], rim: "#ffc86a", size: 1.05 },
};
export { EXTRA_DEFS as HUMANOID_DEFS };
