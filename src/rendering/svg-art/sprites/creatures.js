/**
 * Non-biped enemy sprites in sprite units (see kit.js): hovering drones, the
 * glitchling swarm fragment, the phantom wraith and the side-on Chrono Beast.
 * Floaters only author idle / windup / attack / hurt; movement is bob and tilt
 * applied on the canvas. Same build(variant) → { poses, fx } contract as
 * humanoids.js.
 */

import { INK, f, P, polar, lerp, heading, capsule, poly, rot, sh, ln, circ, ell, limb, glow, flash, ao, spec, plate, glyphRing } from "./kit.js";
import { SOLE } from "./humanoids.js";

const POSES4 = ["idle", "windup", "attack", "hurt"];

/** Blurred rotor disc: blades that read as spinning once scaled on the canvas. */
const rotor = (r, blades = 2, color = "#8fa2b4") => {
  let m = "";
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * 180;
    m += `<g transform="rotate(${a})">${sh(`M${-r} -1.6Q0 -3 ${r} -1.6V1.6Q0 3 ${-r} 1.6Z`, "url(#gun)", 0.8)}</g>`;
  }
  return `<ellipse cx="0" cy="0" rx="${r}" ry="${f(r * 0.22)}" fill="${color}" opacity=".18"/>` + m + circ(0, 0, 2.2, "url(#steel)", 0.8);
};

/* ── Glitched Drone ─────────────────────────────────────────────────────── */

function drone(v = 0) {
  const kind = v % 3; // 0 twin pods, 1 top rotor gunship, 2 finned scout
  const poses = {};
  for (const name of POSES4) {
    const cy = -8;
    const r = 30;
    const open = name === "windup" ? 1 : name === "attack" ? 0.6 : 0;
    const hurt = name === "hurt";
    let body = "";
    const at = {};
    if (kind === 0) {
      body += ln(`M${P(8, cy - r + 2)}L${P(14, cy - r - 20)}`, INK, 2.2) + circ(14, cy - r - 21, 2.2, "url(#gun)", 1);
      for (const s of [-1, 1]) {
        const px = s * (r + 9 - open * 3);
        const py = cy + 2 - open * 6;
        const t = s * (open * 25 + (hurt ? 18 : 0));
        const T = (pts) => poly(rot(pts, t, [0, 0], [px, py]));
        body += sh(`M${P(s * (r - 4), cy - 3)}H${f(px - s * 6)}V${f(cy + 5)}H${f(s * (r - 4))}Z`, "url(#gun)", 1);
        body += plate(rot([[-7, -13], [7, -13], [9, 13], [-9, 13]], t, [0, 0], [px, py]), "url(#armorDk)", 1.4, 0.5);
        body += sh(T([[-5, 13], [5, 13], [4, 18], [-4, 18]]), "url(#gun)", 1);
        body += sh(T([[-4, -8], [4, -8], [4, -5], [-4, -5]]), "url(#armor)", 0.6);
        at[s < 0 ? "podL" : "podR"] = rot([[0, -15]], t, [0, 0], [px, py])[0];
      }
    } else if (kind === 1) {
      body += sh(`M-4 ${f(cy - r + 2)}h8v-12h-8Z`, "url(#gun)", 1.2);
      body += sh(`M${P(-10, cy + r - 6)}h20l-3 14h-14Z`, "url(#armorDk)", 1.3);
      body += sh(`M${P(-3, cy + r + 6)}h6v${f(10 + open * 4)}h-6Z`, "url(#gun)", 1.1);
      for (const s of [-1, 1]) body += plate([[s * (r - 2), cy - 10], [s * (r + 12), cy - 4 - open * 5], [s * (r + 12), cy + 6 - open * 5], [s * (r - 2), cy + 10]], "url(#armorDk)", 1.3, 0.4);
      at.mast = [0, cy - r - 11];
    } else {
      for (const a of [180, 60, -60]) {
        const base = polar([0, cy], a, r - 6);
        const tip = polar([0, cy], a + (hurt ? 12 : 0), r + 18 + open * 6);
        body += plate([polar(base, a + 90, 9), tip, polar(base, a - 90, 9)], "url(#armorDk)", 1.4, 0.4);
      }
      body += ln(`M${P(-6, cy - r + 2)}L${P(-12, cy - r - 14)}M${P(6, cy - r + 2)}L${P(12, cy - r - 14)}`, INK, 2);
      at.core = [0, cy];
    }
    // Shell, equator band and lens housing.
    body += circ(0, cy, r, "url(#armor)", 1.9);
    body += spec(`M${P(-r * 0.78, cy - r * 0.35)}A${r * 0.85} ${r * 0.85} 0 0 1 ${P(-r * 0.2, cy - r * 0.83)}`, 0.75, 2);
    body += sh(`M${P(-r, cy - 2)}Q0 ${f(cy + 8)} ${P(r, cy - 2)}V${f(cy + 4)}Q0 ${f(cy + 14)} ${P(-r, cy + 4)}Z`, "url(#armorDk)", 1.1);
    for (const x of [-20, -7, 7, 20]) body += circ(x, cy + 5 - Math.abs(x) * 0.12, 1.3, "url(#steel)", 0.5);
    body += ln(`M${P(-r * 0.7, cy - r * 0.7)}Q0 ${f(cy - r * 1.05)} ${P(r * 0.7, cy - r * 0.7)}M${P(-r * 0.5, cy + r * 0.85)}Q0 ${f(cy + r * 1.02)} ${P(r * 0.5, cy + r * 0.85)}`, INK, 0.8, 0.5);
    body += ao(0, cy + 12, 14, 3, 0.4);
    body += circ(0, cy - 3, 15.5, "url(#gun)", 1.6) + circ(0, cy - 3, 11, "#02060a", 0.8);
    body += glyphRing(0, cy - 3, 12, 8, "#1c2a36", 0.9, 2);
    if (hurt) body += ln(`M${P(-18, cy - 20)}L${P(-8, cy - 10)}L${P(-14, cy - 2)}L${P(-6, cy + 4)}`, "#000", 1.8, 0.9);
    const iris = name === "windup" ? 4 : name === "attack" ? 7 : 6;
    let g = circ(0, cy - 3, 9.5, "#0aa9ff", 0) + circ(0, cy - 3, iris, "#7ff0ff", 0) + circ(0, cy - 3, iris * 0.45, "#ffffff", 0) + circ(-3, cy - 6, 1.4, "#ffffff", 0);
    if (hurt) g = circ(0, cy - 3, 6, "#0a78c0", 0) + circ(0, cy - 3, 2, "#aef6ff", 0) + flash(-12, cy - 12, 7, "#9fe8ff");
    if (kind === 0) {
      g += circ(14, cy - r - 21, 1.4, "#7ff0ff", 0);
      for (const s of [-1, 1]) g += ell(s * (r + 9 - open * 3), cy + 22 - open * 6, 4, 3, "#46d8ff", 0);
    } else if (kind === 1) {
      g += ell(0, cy + r + 18 + open * 4, 3, 2, "#46d8ff", 0);
    } else {
      g += ln(`M${P(-12, cy - r - 14)}l0 0M${P(12, cy - r - 14)}l0 0`, "#7ff0ff", 3);
    }
    if (name === "windup") g += `<circle cx="0" cy="${cy - 3}" r="19" fill="none" stroke="#5fe6ff" stroke-width="2.2"/>` + glyphRing(0, cy - 3, 22, 12, "#5fe6ff", 1.2);
    if (name === "attack") g += flash(kind === 1 ? 0 : 0, kind === 1 ? cy + r + 18 : cy - 3, 28, "#6fe8ff");
    poses[name] = { body, glow: glow(g), at };
  }
  let fx;
  if (kind === 0) {
    const fan = { box: [-12, -4, 24, 8], markup: rotor(11, 2), anim: { type: "flutter", speed: 0.05 } };
    fx = [{ ...fan, anchor: "podL" }, { ...fan, anchor: "podR", anim: { type: "flutter", speed: 0.047 } }];
  } else if (kind === 1) {
    fx = [{ box: [-40, -6, 80, 12], markup: rotor(38, 3), anchor: "mast", anim: { type: "flutter", speed: 0.04 } }];
  } else {
    let dots = "";
    for (let i = 0; i < 8; i++) dots += circ(Math.cos((i / 8) * Math.PI * 2) * 44, Math.sin((i / 8) * Math.PI * 2) * 44, i % 2 ? 1.6 : 2.6, "#7ff0ff", 0);
    fx = [{ box: [-50, -50, 100, 100], markup: glow(`<circle r="44" fill="none" stroke="#5fe6ff" stroke-width="1" opacity=".5"/>` + dots), anchor: "core", anim: { type: "orbit", speed: 0.0016, squash: 0.25 }, glow: true }];
  }
  return { poses, fx };
}

/* ── Echo Drone ─────────────────────────────────────────────────────────── */

function echoDrone(v = 0) {
  const twin = v % 2 === 1;
  const poses = {};
  for (const name of POSES4) {
    const cy = -2;
    const r = 22;
    const hurt = name === "hurt";
    const charge = name === "windup" ? 1 : 0;
    let body = "";
    for (const a of twin ? [-40, 40, 140, 220] : [-50, 50, 180]) {
      const base = polar([0, cy], a + 180, r - 4);
      const tip = polar([0, cy], a + 180, r + 14 + charge * 5);
      body += plate([polar(base, a + 90, 6), tip, polar(base, a - 90, 6)], "url(#armorDk)", 1.3, 0.4);
    }
    body += circ(0, cy, r, "url(#armor)", 1.8);
    body += spec(`M${P(-r * 0.75, cy - r * 0.3)}A${r * 0.85} ${r * 0.85} 0 0 1 ${P(-r * 0.2, cy - r * 0.82)}`, 0.7, 1.6);
    body += circ(0, cy, 13, "url(#gun)", 1.3) + circ(0, cy, 9, "#021010", 0.6);
    body += ln(`M${P(-r, cy + 3)}Q0 ${f(cy + 10)} ${P(r, cy + 3)}`, INK, 0.9, 0.5);
    if (hurt) body += ln(`M${P(8, cy - 18)}L${P(3, cy - 9)}L${P(10, cy - 4)}`, "#000", 1.6);
    let g = circ(0, cy, 7, "#48ffff", 0) + circ(0, cy, 3, "#ffffff", 0);
    const ghost = (dx) => `<circle cx="${dx}" cy="${cy}" r="${r}" fill="none" stroke="#7fffff" stroke-width="1.2" opacity=".35"/>`;
    g += ghost(-8) + ghost(8);
    if (charge) g += glyphRing(0, cy, 15, 9, "#aaffff", 1.1);
    if (name === "attack") g += flash(0, cy, 24, "#9fffff");
    if (hurt) g = circ(0, cy, 4, "#2fbfbf", 0);
    poses[name] = { body, glow: glow(g), at: { core: [0, cy] } };
  }
  const ring = (rot) => `<g transform="scale(1 .26) rotate(${rot})"><circle r="36" fill="none" stroke="${INK}" stroke-width="5"/><circle r="36" fill="none" stroke="#6fbaba" stroke-width="2.4"/></g>`;
  let nodes = "";
  for (let i = 0; i < 4; i++) nodes += circ(Math.cos((i / 4) * Math.PI * 2) * 36, Math.sin((i / 4) * Math.PI * 2) * 36, 3, "#aaffff", 0);
  const fx = [
    { box: [-40, -12, 80, 24], markup: ring(0), anchor: "core", anim: { type: "sway", amp: 0.3, speed: 0.0021, pivot: [0, 0] }, baseRot: -18 },
    { box: [-44, -44, 88, 88], markup: glow(nodes), anchor: "core", anim: { type: "orbit", speed: 0.004, squash: 0.26, tilt: -0.3 }, glow: true },
  ];
  if (twin) fx.push({ ...fx[0], baseRot: 30, anim: { type: "sway", amp: 0.3, speed: 0.0019, pivot: [0, 0], phase: 1200 } });
  return { poses, fx };
}

/* ── Glitchling ─────────────────────────────────────────────────────────── */

function glitchling(v = 0) {
  const kind = v % 3; // 0 prism, 1 cube, 2 star
  const poses = {};
  for (const name of POSES4) {
    const spread = name === "windup" ? 1.35 : name === "attack" ? 0.8 : 1;
    const hurt = name === "hurt";
    let body = "";
    for (const [a, b] of [[-14, -30], [-6, -18], [6, 18], [14, 30]]) {
      const k = [b * 0.9 * spread, 12];
      const tip = [b * 1.25 * spread, name === "attack" ? 26 : 30];
      body += ln(`M${P(a, 4)}L${P(...k)}L${P(...tip)}`, INK, 3.6) + ln(`M${P(a, 4)}L${P(...k)}L${P(...tip)}`, "#1f7a38", 1.7) + circ(tip[0], tip[1], 1.4, "#0a2a12", 0);
    }
    const top = name === "attack" ? -34 : name === "windup" ? -30 : -28;
    if (kind === 0) {
      body += plate([[0, top], [22, 10], [-22, 10]], "url(#armor)", 1.9, 0);
      body += sh(poly([[0, top], [22, 10], [4, 4]]), "url(#armorDk)", 1);
      body += sh(poly([[-22, 10], [4, 4], [22, 10], [0, 16]]), "url(#armorDk)", 1.2);
      body += spec(`M${P(-2, top + 6)}L${P(-17, 7)}`, 0.7, 1.4);
    } else if (kind === 1) {
      body += sh(poly([[0, top], [20, -9], [0, 10], [-20, -9]]), "url(#armor)", 1.9);
      body += sh(poly([[-20, -9], [0, 10], [0, 18], [-20, 0]]), "url(#armorDk)", 1.2);
      body += sh(poly([[20, -9], [0, 10], [0, 18], [20, 0]]), "url(#armorDk)", 1.2);
      body += spec(`M${P(-3, top + 4)}L${P(-16, -9)}`, 0.7, 1.4);
    } else {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? 9 : name === "windup" ? 26 : 22;
        pts.push([Math.cos(a) * rr, -4 + Math.sin(a) * rr]);
      }
      body += sh(poly(pts), "url(#armor)", 1.9) + sh(poly(pts.map(([x, y]) => [x * 0.45, -4 + (y + 4) * 0.45])), "url(#armorDk)", 1);
    }
    const eye = name === "windup" ? 5.4 : 3.8;
    body += circ(0, -2, eye + 2.6, "#021a08", 0.9);
    let g = circ(0, -2, eye + 2, "#20ff66", 0) + circ(0, -2, eye * 0.5, "#eaffea", 0);
    g += ln(`M-18 ${f(top + 30)}H18M-12 ${f(top + 20)}H12`, "#6dff9a", 0.8, 0.8);
    if (name === "attack") g += flash(0, -2, 22, "#50ff80");
    if (hurt) g = circ(0, -2, 3, "#1fae4a", 0) + `<rect x="-26" y="-6" width="52" height="2" fill="#6dff9a"/><rect x="-18" y="4" width="30" height="1.5" fill="#6dff9a"/>`;
    poses[name] = { body, glow: glow(g), at: { core: [0, -4] } };
  }
  let shards = "";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const s = 4 + (i % 3);
    shards += `<rect x="${f(Math.cos(a) * 34 - s / 2)}" y="${f(Math.sin(a) * 34 - s / 2)}" width="${s}" height="${s}" fill="#6dff9a"/>`;
  }
  return { poses, fx: [{ box: [-42, -42, 84, 84], markup: glow(shards), anchor: "core", anim: { type: "orbit", speed: 0.003, squash: 0.55 }, glow: true }] };
}

/* ── Time Phantom ───────────────────────────────────────────────────────── */

function phantom(v = 0) {
  const face = v % 3; // 0 shadowed hood, 1 cracked porcelain mask, 2 clock-face mask
  const poses = {};
  for (const name of POSES4) {
    const hurt = name === "hurt";
    const armsUp = name === "windup";
    const thrust = name === "attack";
    let body = "";
    const hem = [];
    for (let i = 0; i <= 8; i++) {
      const x = -34 + i * 8.5;
      hem.push(`L${P(x, i % 2 ? 56 : 66 - Math.abs(4 - i) * 2)}`);
    }
    body += sh(`M-18 -34Q-42 -6 -34 56${hem.join("")}Q42 -6 18 -34Z`, "url(#armor)", 1.7, ` fill-opacity=".94"`);
    body += sh(`M-8 -30Q-16 10 -12 60L0 66L12 60Q16 10 8 -30Z`, "url(#armorDk)", 1, ` fill-opacity=".88"`);
    body += ln(`M-24 0Q-27 28 -22 52M24 0Q27 28 22 52M-4 -24Q-6 20 -4 58`, INK, 0.9, 0.5);
    body += spec(`M-20 -26Q-34 -4 -30 30`, 0.35, 1.4);
    for (const s of [-1, 1]) {
      const S = [s * 20, -26];
      const E = armsUp ? [s * 38, -46] : thrust ? [s * 28, -22] : [s * 32, -6];
      const W = armsUp ? [s * 24, -68] : thrust ? [s * 12, -28] : hurt ? [s * 44, -18] : [s * 30, 16];
      body += limb(S, E, 12, 10, "url(#armor)") + limb(E, W, 10, 5.5, "url(#armorDk)");
      for (const k of [-24, 0, 24]) body += ln(`M${P(...W)}L${P(...polar(W, heading(E, W) + k, 8))}`, INK, 2.6) + ln(`M${P(...W)}L${P(...polar(W, heading(E, W) + k, 8))}`, "#c9a0e6", 1);
    }
    const hx = hurt ? 4 : 0;
    body += sh(`M${P(hx - 21, -30)}Q${P(hx - 23, -63)} ${P(hx, -70)}Q${P(hx + 23, -63)} ${P(hx + 21, -30)}Q${P(hx, -22)} ${P(hx - 21, -30)}Z`, "url(#armor)", 1.9);
    body += spec(`M${P(hx - 17, -36)}Q${P(hx - 19, -58)} ${P(hx - 4, -65)}`, 0.5, 1.3);
    body += sh(`M${P(hx - 12, -34)}Q${P(hx - 13, -56)} ${P(hx, -58)}Q${P(hx + 13, -56)} ${P(hx + 12, -34)}Z`, "#08010e", 0.8);
    let g = "";
    if (face === 1) {
      body += sh(`M${P(hx - 9, -52)}Q${P(hx, -58)} ${P(hx + 9, -52)}L${P(hx + 7, -38)}Q${P(hx, -34)} ${P(hx - 7, -38)}Z`, "url(#mask)", 1);
      body += ln(`M${P(hx + 3, -56)}L${P(hx + 1, -48)}L${P(hx + 4, -42)}`, INK, 0.8);
      body += ell(hx - 4, -47, 2.6, 1.6, "#12031c", 0) + ell(hx + 4, -47, 2.6, 1.6, "#12031c", 0);
      g += ell(hx - 4, -47, 1.5, 1, "#ffb8ff", 0) + ell(hx + 4, -47, 1.5, 1, "#ffb8ff", 0);
    } else if (face === 2) {
      body += circ(hx, -46, 9, "url(#mask)", 1.1) + glyphRing(hx, -46, 6, 12, "#3a2450", 0.7, 1.6);
      body += ln(`M${P(hx, -46)}V${f(-52)}M${P(hx, -46)}l4 2`, "#2a1040", 1);
      g += `<circle cx="${hx}" cy="-46" r="9.5" fill="none" stroke="#e8a8ff" stroke-width="1"/>` + circ(hx, -46, 1.2, "#ffffff", 0);
    } else {
      g += ell(hx - 5, -45, 3, 2.4, "#ffb8ff", 0) + ell(hx + 5, -45, 3, 2.4, "#ffb8ff", 0);
    }
    g += ell(0, 36, 18, 30, "#9a38ff", 0, ` opacity=".22"`);
    if (armsUp) g += circ(0, -80, 10, "#d070ff", 0) + circ(0, -80, 4.5, "#ffffff", 0) + glyphRing(0, -80, 13, 9, "#e7a0ff", 1.1);
    if (thrust) g += flash(0, -27, 24, "#e08cff");
    if (hurt) g = ell(hx - 5, -45, 2, 1.6, "#b070c0", 0) + ell(hx + 5, -45, 2, 1.6, "#b070c0", 0);
    poses[name] = { body, glow: glow(g), at: { hem: [0, 50] } };
  }
  let tend = "";
  for (let i = 0; i < 5; i++) {
    const x = -26 + i * 13;
    tend += sh(`M${P(x - 4, 0)}Q${P(x - 6, 18)} ${P(x + (i % 2 ? 3 : -3), 36 + (i % 3) * 5)}Q${P(x + 1, 18)} ${P(x + 4, 0)}Z`, "url(#armorDk)", 1, ` fill-opacity=".8"`);
  }
  return { poses, fx: [{ box: [-36, -2, 72, 50], markup: tend, anchor: "hem", anim: { type: "sway", amp: 0.09, speed: 0.0026, pivot: [0, 0] }, back: true }] };
}

/* ── Chrono Beast (side-on, facing right) ───────────────────────────────── */

function beast(v = 0) {
  const geared = v % 2 === 1;
  const table = {
    idle: { lean: 0, head: 0, jaw: 4, legs: [[0, 0], [0, 0], [0, 0], [0, 0]] },
    moveA: { lean: -2, head: -2, jaw: 6, bob: -3, legs: [[34, 20], [-28, 10], [-24, 6], [30, 16]] },
    moveB: { lean: 2, head: 2, jaw: 6, bob: 0, legs: [[-26, 8], [30, 18], [28, 18], [-26, 8]] },
    windup: { lean: -10, head: 10, jaw: 20, crouch: 14, legs: [[-22, 20], [-14, 16], [26, 22], [18, 18]] },
    attack: { lean: 10, head: -14, jaw: 26, bob: -10, legs: [[58, 12], [46, 10], [-42, 4], [-32, 2]] },
    hurt: { lean: -12, head: -24, jaw: 10, legs: [[10, 6], [-8, 4], [-6, 4], [12, 6]] },
  };
  const poses = {};
  for (const [name, b] of Object.entries(table)) {
    const bob = (b.bob || 0) + (b.crouch || 0);
    const hipB = [-40, 8 + bob];
    const hipF = [30, 4 + bob];
    const pivot = [-5, -6 + bob];
    const rotBody = `rotate(${b.lean} ${pivot[0]} ${f(pivot[1])})`;
    const leg = (hip, [swing, lift], far, thick) => {
      const foot = [hip[0] + Math.sin((swing * Math.PI) / 180) * 36, SOLE - 4 - lift];
      const knee = [lerp(hip, foot, 0.5)[0] + (hip === hipF ? -8 : 8), lerp(hip, foot, 0.5)[1] - 2];
      const mat = far ? "url(#hideDk)" : "url(#armorDk)";
      return limb(hip, knee, thick, thick * 0.8, mat) + limb(knee, foot, thick * 0.75, thick * 0.6, mat) +
        (far ? "" : sh(capsule(lerp(hip, knee, 0.2), lerp(hip, knee, 0.85), thick * 0.7, thick * 0.5), "url(#armor)", 1)) +
        sh(`M${P(foot[0] - 8, foot[1] - 4)}h15l4 6h-21Z`, "url(#gun)", 1.1) +
        ln(`M${P(foot[0] + 7, foot[1] + 2)}l5 2M${P(foot[0] + 3, foot[1] + 2)}l4 3M${P(foot[0] - 1, foot[1] + 2)}l3 3`, "#e8d8c0", 1.3);
    };
    let body = leg(hipB, b.legs[1], true, 24) + leg(hipF, b.legs[3], true, 22);
    let torso = "";
    torso += sh(`M-64 ${f(-2 + bob)}Q-70 ${f(-34 + bob)} -34 ${f(-40 + bob)}Q10 ${f(-58 + bob)} 44 ${f(-40 + bob)}Q62 ${f(-28 + bob)} 52 ${f(4 + bob)}Q10 ${f(24 + bob)} -40 ${f(18 + bob)}Q-60 ${f(14 + bob)} -64 ${f(-2 + bob)}Z`, "url(#armor)", 1.9);
    torso += sh(`M-58 ${f(6 + bob)}Q-10 ${f(28 + bob)} 50 ${f(2 + bob)}Q10 ${f(22 + bob)} -40 ${f(18 + bob)}Z`, "url(#hideDk)", 0);
    torso += ln(`M-40 ${f(10 + bob)}Q0 ${f(18 + bob)} 40 ${f(0 + bob)}`, INK, 1, 0.5);
    for (const x of [-30, -12, 6, 24]) torso += ln(`M${x} ${f(-40 + bob + Math.abs(x) * 0.1)}q6 14 2 26`, INK, 1.1, 0.55);
    torso += spec(`M-58 ${f(-22 + bob)}Q-40 ${f(-40 + bob)} -10 ${f(-46 + bob)}`, 0.45, 1.8);
    if (geared) {
      for (const [x, y, r] of [[-38, -36, 11], [-8, -46, 13], [22, -42, 12]]) torso += gearPlate(x, y + bob, r);
      torso += glyphRing(12, -18 + bob, 9, 10, "#3a1004", 1.2);
    } else {
      for (const [x, y, s] of [[-44, -36, 12], [-20, -46, 14], [6, -50, 15], [30, -44, 13]]) {
        torso += plate([[x - s, y + bob + 8], [x - 2, y + bob - s], [x + 4, y + bob - s * 0.6], [x + s, y + bob + 6]], "url(#steel)", 1.3, 0.6);
      }
    }
    // Shoulder plate over the near foreleg.
    torso += plate([[18, -26 + bob], [44, -30 + bob], [50, -8 + bob], [26, 0 + bob]], "url(#steel)", 1.3, 0.55);
    torso += circ(34, -16 + bob, 2, "url(#brass)", 0.6);
    const hp = [58, -14 + bob];
    const rotHead = `rotate(${b.head} ${hp[0] - 10} ${hp[1]})`;
    let head = sh(`M${P(hp[0] - 16, hp[1] - 18)}Q${P(hp[0] + 10, hp[1] - 26)} ${P(hp[0] + 34, hp[1] - 6)}L${P(hp[0] + 36, hp[1] + 2)}L${P(hp[0] - 4, hp[1] + 8)}Q${P(hp[0] - 20, hp[1] + 4)} ${P(hp[0] - 16, hp[1] - 18)}Z`, "url(#armor)", 1.8);
    head += spec(`M${P(hp[0] - 12, hp[1] - 17)}Q${P(hp[0] + 8, hp[1] - 24)} ${P(hp[0] + 26, hp[1] - 10)}`, 0.5, 1.4);
    head += sh(`M${P(hp[0] - 2, hp[1] + 4)}L${P(hp[0] + 32, hp[1] + 2 + b.jaw * 0.3)}L${P(hp[0] + 28, hp[1] + 8 + b.jaw)}Q${P(hp[0] + 6, hp[1] + 12 + b.jaw * 0.6)} ${P(hp[0] - 6, hp[1] + 10)}Z`, "url(#armorDk)", 1.5);
    if (b.jaw > 8) head += sh(`M${P(hp[0] + 2, hp[1] + 4)}L${P(hp[0] + 30, hp[1] + 2 + b.jaw * 0.3)}L${P(hp[0] + 26, hp[1] + 5 + b.jaw * 0.7)}Q${P(hp[0] + 8, hp[1] + 8 + b.jaw * 0.4)} ${P(hp[0] + 2, hp[1] + 7)}Z`, "#2a0404", 0);
    let teeth = "";
    for (let i = 0; i < 5; i++) {
      const tx = hp[0] + 8 + i * 5.5;
      teeth += `M${P(tx, hp[1] + 2)}l2 ${f(3 + b.jaw * 0.15)}l2 ${f(-3 - b.jaw * 0.15)}`;
    }
    head += sh(teeth, "#efe6d0", 0.6);
    head += sh(`M${P(hp[0] + 3, hp[1] - 17)}l6 -4l2 5Z`, "#1a0602", 0);
    if (geared) head += sh(`M${P(hp[0] + 18, hp[1] - 14)}Q${P(hp[0] + 26, hp[1] - 30)} ${P(hp[0] + 22, hp[1] - 42)}Q${P(hp[0] + 18, hp[1] - 28)} ${P(hp[0] + 10, hp[1] - 18)}Z`, "url(#steel)", 1.2);
    else head += sh(`M${P(hp[0] - 10, hp[1] - 20)}L${P(hp[0] - 24, hp[1] - 36)}L${P(hp[0] - 2, hp[1] - 22)}Z`, "url(#steel)", 1.2);
    const near = leg(hipB, b.legs[0], false, 27) + leg(hipF, b.legs[2], false, 25);
    body += `<g transform="${rotBody}">${torso}<g transform="${rotHead}">${head}</g></g>` + near;
    const eye = (r) => circ(hp[0] + 12, hp[1] - 10, r, "#ffb020", 0) + circ(hp[0] + 12, hp[1] - 10, r * 0.4, "#fff4d0", 0);
    let gHead = name === "hurt" ? circ(hp[0] + 12, hp[1] - 10, 1.6, "#a05010", 0) : eye(name === "windup" ? 3.8 : 2.8);
    if (name === "windup" || name === "attack") gHead += ell(hp[0] + 20, hp[1] + 6 + b.jaw * 0.5, 10, 3 + b.jaw * 0.25, "#ff5a10", 0, ` opacity=".75"`);
    let gBody = name === "hurt" ? "" : ln(`M-20 ${f(-34 + bob)}q6 14 2 26M6 ${f(-38 + bob)}q6 14 2 26`, "#ff6a1a", 1.3, 0.85);
    if (geared && name !== "hurt") gBody += glyphRing(12, -18 + bob, 9, 10, "#ff8a3a", 1) + circ(12, -18 + bob, 2.4, "#ffd08a", 0);
    if (name === "windup") gBody += ln(`M-60 ${f(-8 + bob)}Q-10 ${f(-66 + bob)} 44 ${f(-42 + bob)}`, "#ff6a1a", 1.8, 0.7);
    const tailBase = rot([[-60, -2 + bob]], b.lean, pivot)[0];
    poses[name] = { body, glow: `<g transform="${rotBody}">${glow(gBody)}<g transform="${rotHead}">${glow(gHead)}</g></g>`, at: { tail: tailBase } };
  }
  const tail = sh("M4 -6Q-24 -20 -32 -46Q-22 -18 2 8Z", "url(#armorDk)", 1.5) + sh("M-24 -30l-8 -4l2 8Z", "url(#steel)", 1);
  return { poses, fx: [{ box: [-40, -52, 48, 64], markup: tail, anchor: "tail", anim: { type: "sway", amp: 0.16, speed: 0.0034, pivot: [0, 0] }, back: true }] };
}

/* ── The Hound (suit C-0016) ───────────────────────────────────────────────
 * The prototype before yours, empty, running on all fours: the suit's arms
 * are its forelegs, the helmet hangs low like a hound on a scent, a ridge of
 * heat-sink quills runs down its back, and the visor is open on nothing but
 * an ember that turns like a clock hand. Side-on like the beast, facing +x.
 * `bristle` is the quill volley's tell: the ridge stands up and runs hot.
 */
const HOUND_POSES = {
  idle: { lean: 0, head: 6, quill: 0, fore: [0, 0], hind: [0, 0] },
  moveA: { lean: -3, head: 2, bob: -4, quill: -6, fore: [30, 14], hind: [-24, 8] },
  moveB: { lean: 3, head: 8, bob: 0, quill: -6, fore: [-22, 6], hind: [26, 16] },
  // The lunge's tell: coiled low, nose down, the ridge laid flat.
  windup: { lean: 7, head: 16, crouch: 16, quill: -18, fore: [-16, 2], hind: [20, 4] },
  attack: { lean: -8, head: -8, bob: -12, quill: -24, fore: [58, 30], hind: [-44, 4], reach: 1 },
  hurt: { lean: -12, head: -20, quill: 12, fore: [8, 4], hind: [-6, 2] },
  bristle: { lean: -4, head: 20, crouch: 6, quill: 44, fore: [20, 0], hind: [-14, 0], hot: 1 },
};

/** Where the quills root along the back (before the body's lean). */
const QUILL_ROOTS = [[-48, -24], [-34, -34], [-19, -41], [-4, -45], [11, -44], [25, -38]];

function hound() {
  const poses = {};
  for (const [name, b] of Object.entries(HOUND_POSES)) {
    const bob = (b.bob || 0) + (b.crouch || 0);
    const hip = [-44, -2 + bob];
    const shoulder = [36, -14 + bob];
    const pivot = [-4, -10 + bob];
    const rotBody = `rotate(${b.lean} ${pivot[0]} ${f(pivot[1])})`;

    // A suit leg, digitigrade in a crouch: thigh, shin, boot.
    const hindLeg = (h, [swing, lift], far) => {
      const foot = [h[0] + Math.sin((swing * Math.PI) / 180) * 34, SOLE - 3 - lift];
      const knee = [h[0] + 16, (h[1] + foot[1]) / 2 - 6];
      const ankle = [foot[0] - 12, foot[1] - 16];
      const mat = far ? "url(#hideDk)" : "url(#armorDk)";
      let m = limb(h, knee, 21, 17, mat) + limb(knee, ankle, 15, 11, mat) + limb(ankle, [foot[0] - 2, foot[1] - 4], 11, 9, mat);
      if (!far) {
        m += plate([[h[0] - 10, h[1] - 6], [knee[0] + 2, knee[1] - 12], [knee[0] + 6, knee[1] + 2], [h[0] - 6, h[1] + 12]], "url(#armor)", 1.2, 0.5);
        m += plate([[knee[0] - 4, knee[1] - 2], [knee[0] + 7, knee[1] + 2], [ankle[0] + 5, ankle[1] + 4], [ankle[0] - 3, ankle[1]]], "url(#armor)", 1.1, 0.4);
      }
      m += sh(`M${P(foot[0] - 13, foot[1] - 7)}h20q6 0 7 7h-27Z`, "url(#gun)", 1.1);
      return m;
    };
    // A suit arm used as a foreleg: elbow bent back like a dog's, a gauntlet
    // splayed into three long talons.
    const foreLeg = (s, [swing, lift], far) => {
      const reach = b.reach || 0;
      const hand = [s[0] + 8 + Math.sin((swing * Math.PI) / 180) * 38, SOLE - 4 - lift - reach * 22];
      const elbow = [(s[0] + hand[0]) / 2 - 12 + reach * 10, (s[1] + hand[1]) / 2 + 2 - reach * 8];
      const mat = far ? "url(#hideDk)" : "url(#armorDk)";
      let m = limb(s, elbow, 22, 17, mat) + limb(elbow, hand, 17, 14, mat);
      if (!far) {
        m += plate([[s[0] - 8, s[1] - 4], [elbow[0] + 6, elbow[1] - 8], [elbow[0] + 4, elbow[1] + 6], [s[0] - 10, s[1] + 10]], "url(#armor)", 1.2, 0.45);
        m += plate([[elbow[0] + 2, elbow[1] - 5], [hand[0] + 4, hand[1] - 8], [hand[0] - 3, hand[1] - 1], [elbow[0] - 4, elbow[1] + 5]], "url(#armor)", 1.1, 0.4);
      }
      const talon = (dx, dy, len) => {
        const a = [hand[0] + dx * 0.3, hand[1] - 3 + dy * 0.3];
        const t = [hand[0] + dx + len, hand[1] + dy + (reach ? -6 : 3)];
        return `M${P(a[0], a[1] - 2.2)}Q${P((a[0] + t[0]) / 2, a[1] - 5)} ${P(t[0], t[1])}Q${P((a[0] + t[0]) / 2, a[1] + 2)} ${P(a[0], a[1] + 2.2)}Z`;
      };
      m += sh(`M${P(hand[0] - 10, hand[1] - 11)}h17l5 9l-5 5h-17Z`, "url(#gun)", 1.1);
      m += sh(talon(4, -2, 16) + talon(6, 2, 20) + talon(2, 5, 14), far ? "url(#gun)" : "url(#talon)", 1);
      return m;
    };

    let body = hindLeg(hip, [-b.hind[0] * 0.7, b.hind[1] * 0.6], true) + foreLeg(shoulder, [-b.fore[0] * 0.7, b.fore[1] * 0.6], true);

    // ── The suit's back and chest, hunched ──
    let torso = "";
    torso += sh(
      `M-64 ${f(4 + bob)}Q-66 ${f(-26 + bob)} -40 ${f(-34 + bob)}Q-4 ${f(-56 + bob)} 34 ${f(-40 + bob)}` +
        `Q54 ${f(-32 + bob)} 54 ${f(-12 + bob)}L50 ${f(10 + bob)}Q10 ${f(20 + bob)} -40 ${f(16 + bob)}Q-60 ${f(14 + bob)} -64 ${f(4 + bob)}Z`,
      "url(#armor)",
      1.9,
    );
    // The undersuit: dark, ribbed, torn open over nothing.
    torso += sh(`M-58 ${f(8 + bob)}Q-8 ${f(26 + bob)} 50 ${f(4 + bob)}Q10 ${f(20 + bob)} -40 ${f(16 + bob)}Z`, "url(#hideDk)", 0);
    for (const x of [-34, -22, -10, 2, 14, 26]) torso += ln(`M${x} ${f(8 + bob + Math.abs(x) * 0.05)}l2 ${f(8 - Math.abs(x) * 0.08)}`, INK, 1, 0.55);
    torso += sh(`M-14 ${f(2 + bob)}Q0 ${f(-8 + bob)} 16 ${f(0 + bob)}Q14 ${f(12 + bob)} 0 ${f(13 + bob)}Q-14 ${f(12 + bob)} -14 ${f(2 + bob)}Z`, "url(#void)", 1.3);
    torso += ln(`M-10 ${f(4 + bob)}l6 3M10 ${f(2 + bob)}l-4 5M-2 ${f(0 + bob)}l1 6`, "#6a5646", 0.9, 0.8);
    // Back plates, a segmented spine the quills root in.
    const backPlate = (x0, x1, y0, y1) =>
      plate([[x0, y0 + bob + 8], [x0 + 3, y0 + bob - 2], [x1 - 2, y1 + bob - 3], [x1, y1 + bob + 7]], "url(#armorDk)", 1.3, 0.55);
    torso += backPlate(-58, -36, -26, -34) + backPlate(-38, -12, -34, -44) + backPlate(-14, 10, -44, -46) + backPlate(8, 32, -46, -38);
    torso += spec(`M-60 ${f(-12 + bob)}Q-44 ${f(-32 + bob)} -14 ${f(-46 + bob)}`, 0.5, 1.8);
    // Pauldron over the near shoulder, with its stencil: C-0016.
    torso += plate([[18, -30 + bob], [48, -34 + bob], [56, -10 + bob], [26, -2 + bob]], "url(#armor)", 1.4, 0.6);
    torso += ln(`M28 ${f(-20 + bob)}h4M34 ${f(-22 + bob)}v4M38 ${f(-21 + bob)}h3v3h-3M44 ${f(-22 + bob)}v4M47 ${f(-22 + bob)}h3v4h-3z`, "#2a1c12", 1.1, 0.85);
    torso += plate([[-62, -8 + bob], [-44, -16 + bob], [-38, 4 + bob], [-58, 10 + bob]], "url(#armor)", 1.2, 0.45);
    torso += circ(40, -6 + bob, 2, "url(#brass)", 0.6) + circ(-50, 0 + bob, 1.8, "url(#brass)", 0.6);
    // Scorch where the heat vents: a C-series suit running with nobody to cool.
    torso += `<path d="M-30 ${f(-30 + bob)}q8 6 18 2q-6 8 -18 6Z" fill="#1a0e06" opacity=".45"/>`;

    // ── Quills: heat-sink fins along the ridge ──
    let quills = "";
    let quillGlow = "";
    QUILL_ROOTS.forEach(([qx, qy], i) => {
      const root = [qx, qy + bob];
      const len = 22 + (i === 2 || i === 3 ? 8 : i === 0 ? -4 : 3);
      const deg = 222 - b.quill * 0.95 + (i - 2.5) * 3;
      const tip = polar(root, deg, len);
      const side = polar(root, deg + 90, 3.4);
      const side2 = polar(root, deg - 90, 3.4);
      quills += sh(poly([side, lerp(side, tip, 0.7), tip, lerp(side2, tip, 0.7), side2]), "url(#quill)", 1.1);
      if (name !== "hurt") {
        const r = b.hot ? 3.4 : 1.6;
        quillGlow += circ(tip[0], tip[1], r, b.hot ? "#fff0c8" : "#ffb45a", 0);
        if (b.hot) quillGlow += ln(`M${P(lerp(root, tip, 0.4)[0], lerp(root, tip, 0.4)[1])}L${P(tip[0], tip[1])}`, "#ff9a3a", 2, 0.9);
      }
    });

    // ── The helmet: open on nothing ──
    const hp = [66, -14 + bob];
    // A human helmet on a hound's neck: drawn a size up so it reads as a suit's.
    const rotHead = `rotate(${b.head} ${hp[0] - 14} ${hp[1]}) translate(${hp[0] - 14} ${f(hp[1])}) scale(1.22) translate(${14 - hp[0]} ${f(-hp[1])})`;
    let head = sh(
      `M${P(hp[0] - 16, hp[1] - 14)}Q${P(hp[0] + 2, hp[1] - 28)} ${P(hp[0] + 20, hp[1] - 12)}Q${P(hp[0] + 26, hp[1] - 2)} ${P(hp[0] + 22, hp[1] + 10)}` +
        `Q${P(hp[0] + 8, hp[1] + 18)} ${P(hp[0] - 10, hp[1] + 14)}Q${P(hp[0] - 22, hp[1] + 4)} ${P(hp[0] - 16, hp[1] - 14)}Z`,
      "url(#armor)",
      1.8,
    );
    head += spec(`M${P(hp[0] - 12, hp[1] - 15)}Q${P(hp[0] + 2, hp[1] - 25)} ${P(hp[0] + 16, hp[1] - 13)}`, 0.55, 1.4);
    // Visor frame, and the dark where a face should be, cracked.
    head += sh(`M${P(hp[0] + 4, hp[1] - 10)}L${P(hp[0] + 22, hp[1] - 6)}L${P(hp[0] + 22, hp[1] + 6)}L${P(hp[0] + 6, hp[1] + 6)}Z`, "url(#void)", 1.5);
    head += ln(`M${P(hp[0] + 10, hp[1] - 9)}l3 6l-2 4l3 5`, "#8a7058", 0.9, 0.9);
    head += sh(`M${P(hp[0] - 6, hp[1] + 8)}q10 6 24 0l-2 6q-10 4 -20 0Z`, "url(#armorDk)", 1.2);
    head += sh(`M${P(hp[0] - 14, hp[1] - 4)}h8v10h-8Z`, "url(#gun)", 1);
    // A torn cable where a neck seal used to be.
    head += ln(`M${P(hp[0] - 18, hp[1] + 6)}q-6 8 -2 16`, INK, 2.6) + ln(`M${P(hp[0] - 18, hp[1] + 6)}q-6 8 -2 16`, "#3c3a3a", 1.4);

    const near = hindLeg(hip, b.hind, false) + foreLeg(shoulder, b.fore, false);
    body += `<g transform="${rotBody}">${torso}${quills}<g transform="${rotHead}">${head}</g></g>` + near;

    // ── Glow: the ember in the helmet, the vents, the quill tips ──
    const eye = [hp[0] + 14, hp[1] - 1];
    const hotEye = name === "windup" || name === "attack" || b.hot;
    let gHead = "";
    if (name !== "hurt") {
      gHead += circ(eye[0], eye[1], hotEye ? 4.4 : 3, "#ffb020", 0) + circ(eye[0], eye[1], hotEye ? 2 : 1.2, "#fff4d0", 0);
      // A clock hand, turning in the empty helmet.
      gHead += ln(`M${P(eye[0], eye[1])}l${f(hotEye ? 5 : 3.5)} ${f(hotEye ? -4 : -3)}`, "#ffd890", 1.2);
      gHead += `<circle cx="${f(eye[0])}" cy="${f(eye[1])}" r="${hotEye ? 7.5 : 6}" fill="none" stroke="#ff9a3a" stroke-width="1" opacity=".75"/>`;
    } else gHead += circ(eye[0], eye[1], 1.6, "#a05010", 0);
    let gBody = name === "hurt" ? "" : ln(`M-6 ${f(4 + bob)}q6 -2 12 2`, "#ff7a2a", 1.6, 0.8) + circ(2, 6 + bob, 1.6, "#ffc070", 0);
    gBody += quillGlow;
    if (name === "windup") gBody += ln(`M-58 ${f(-10 + bob)}Q-8 ${f(-58 + bob)} 44 ${f(-40 + bob)}`, "#ff6a1a", 1.8, 0.75);
    if (name === "attack") gBody += ln(`M-60 ${f(-4 + bob)}Q-10 ${f(-52 + bob)} 50 ${f(-34 + bob)}`, "#ffd08a", 2.2, 0.6);
    const cable = rot([[-62, 6 + bob]], b.lean, pivot)[0];
    poses[name] = {
      body,
      glow: `<g transform="${rotBody}">${glow(gBody)}<g transform="${rotHead}">${glow(gHead)}</g></g>`,
      at: { cable },
    };
  }
  // A coolant hose torn out of the back, dragging.
  const hose = ln("M0 0Q-10 16 -4 30Q0 40 -8 48", INK, 5) + ln("M0 0Q-10 16 -4 30Q0 40 -8 48", "#4a3e36", 3) + sh("M-12 46h8l2 6h-12Z", "url(#gun)", 1);
  return { poses, fx: [{ box: [-24, -6, 34, 62], markup: hose, anchor: "cable", anim: { type: "sway", amp: 0.14, speed: 0.0031, pivot: [0, 0] }, back: true }] };
}

function gearPlate(x, y, r) {
  let d = "";
  const teeth = 9;
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pt = (rr, aa) => P(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
    d += `${i ? "L" : "M"}${pt(r * 0.78, a - step * 0.3)}L${pt(r, a - step * 0.17)}L${pt(r, a + step * 0.17)}L${pt(r * 0.78, a + step * 0.3)}`;
  }
  return sh(d + "Z", "url(#brass)", 1.2) + circ(x, y, r * 0.42, "url(#hideDk)", 0.9) + spec(`M${P(x - r * 0.6, y - r * 0.2)}A${f(r * 0.65)} ${f(r * 0.65)} 0 0 1 ${P(x - r * 0.1, y - r * 0.65)}`, 0.6, 1.1);
}

export const CREATURES = {
  drone: { build: drone, variants: 3, box: [-66, -76, 132, 122], rim: "#6fe8ff", floater: true, size: 1.1 },
  echoDrone: { build: echoDrone, variants: 2, box: [-50, -46, 100, 90], rim: "#b8ffff", floater: true, size: 1.1 },
  glitchling: { build: glitchling, variants: 3, box: [-50, -54, 100, 94], rim: "#7dff9a", floater: true, jitter: true },
  phantom: { build: phantom, variants: 3, box: [-56, -100, 112, 176], rim: "#e59bff", floater: true, size: 1.1 },
  beast: { build: beast, variants: 2, box: [-110, -80, 222, 176], rim: "#ff8a3a" },
  // The Hound (C-0016): an empty C-series suit on all fours, pale with heat.
  hound: { build: hound, variants: 1, box: [-100, -96, 212, 192], rim: "#ffe2a8", aura: "#ffd79a", size: 1.25 },
};

export const CREATURE_DEFS = {
  hound:
    `<linearGradient id="hideDk" x1="0" y1="0" x2="1" y2=".45"><stop offset="0" stop-color="#4a3a2c"/><stop offset=".4" stop-color="#241a12"/><stop offset="1" stop-color="#080604"/></linearGradient>` +
    `<radialGradient id="void" cx=".6" cy=".45" r=".7"><stop offset="0" stop-color="#2a1406"/><stop offset=".45" stop-color="#0a0503"/><stop offset="1" stop-color="#000000"/></radialGradient>` +
    `<linearGradient id="quill" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2a2420"/><stop offset=".55" stop-color="#8a7a66"/><stop offset="1" stop-color="#f4e2c0"/></linearGradient>` +
    `<linearGradient id="talon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3028"/><stop offset=".6" stop-color="#b8a488"/><stop offset="1" stop-color="#fff1d8"/></linearGradient>`,
  phantom: `<linearGradient id="mask" x1="0" y1="0" x2="1" y2=".6"><stop offset="0" stop-color="#fff6ff"/><stop offset=".5" stop-color="#cdb8d8"/><stop offset="1" stop-color="#5a4a66"/></linearGradient>`,
};
