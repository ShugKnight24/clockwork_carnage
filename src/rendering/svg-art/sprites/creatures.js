/**
 * Non-biped enemy sprites in sprite units (see kit.js): hovering drones, the
 * glitchling swarm fragment, the phantom wraith and the side-on Chrono Beast.
 * Floaters only author idle / windup / attack / hurt; movement is bob and tilt
 * applied on the canvas.
 */

import { INK, f, P, polar, lerp, heading, poly, rot, sh, ln, circ, ell, limb, glow, flash } from "./kit.js";
import { SOLE } from "./humanoids.js";

const POSES4 = ["idle", "windup", "attack", "hurt"];

/* ── Glitched Drone ─────────────────────────────────────────────────────── */

function drone() {
  const out = {};
  for (const name of POSES4) {
    const cy = -8;
    const r = 30;
    const open = name === "windup" ? 1 : name === "attack" ? 0.6 : 0;
    const hurt = name === "hurt";
    let body = "";
    // Antenna and thruster pods.
    body += ln(`M${P(8, cy - r + 2)}L${P(14, cy - r - 20)}`, INK, 2) + circ(14, cy - r - 21, 2.2, "url(#gun)", 1);
    for (const s of [-1, 1]) {
      const px = s * (r + 9 - open * 3);
      const py = cy + 2 - open * 6;
      const t = s * (open * 25 + (hurt ? 18 : 0));
      body += sh(poly(rot([[-7, -13], [7, -13], [9, 13], [-9, 13]], t, [0, 0], [px, py])), "url(#armorDk)", 1.4);
      body += sh(poly(rot([[-5, 13], [5, 13], [4, 18], [-4, 18]], t, [0, 0], [px, py])), "url(#gun)", 1);
      body += sh(`M${P(s * (r - 4), cy - 3)}H${f(px - s * 6)}V${f(cy + 5)}H${f(s * (r - 4))}Z`, "url(#gun)", 1);
    }
    // Shell, equator band and lens housing.
    body += circ(0, cy, r, "url(#armor)", 1.8);
    body += sh(`M${P(-r, cy - 2)}Q0 ${f(cy + 8)} ${P(r, cy - 2)}V${f(cy + 4)}Q0 ${f(cy + 14)} ${P(-r, cy + 4)}Z`, "url(#armorDk)", 1.1);
    body += ln(`M${P(-r * 0.7, cy - r * 0.7)}Q0 ${f(cy - r * 1.05)} ${P(r * 0.7, cy - r * 0.7)}`, INK, 0.8, 0.5);
    body += circ(0, cy - 3, 15, "url(#gun)", 1.6) + circ(0, cy - 3, 11, "#02060a", 0.8);
    if (hurt) body += ln(`M${P(-18, cy - 20)}L${P(-8, cy - 10)}L${P(-14, cy - 2)}`, "#000", 1.6, 0.9);
    const iris = name === "windup" ? 4 : name === "attack" ? 7 : 6;
    let g = circ(0, cy - 3, 9, "#0aa9ff", 0) + circ(0, cy - 3, iris, "#7ff0ff", 0) + circ(0, cy - 3, iris * 0.45, "#ffffff", 0);
    if (hurt) g = circ(0, cy - 3, 6, "#0a78c0", 0) + circ(0, cy - 3, 2, "#aef6ff", 0);
    g += circ(14, cy - r - 21, 1.4, "#7ff0ff", 0);
    for (const s of [-1, 1]) g += ell(s * (r + 9 - open * 3), cy + 22 - open * 6, 4, 3, "#46d8ff", 0);
    if (name === "windup") g += `<circle cx="0" cy="${cy - 3}" r="19" fill="none" stroke="#5fe6ff" stroke-width="2"/>`;
    if (name === "attack") g += flash(0, cy - 3, 26, "#6fe8ff");
    out[name] = { body, glow: glow(g) };
  }
  return out;
}

/* ── Echo Drone ─────────────────────────────────────────────────────────── */

function echoDrone() {
  const out = {};
  for (const name of POSES4) {
    const cy = -2;
    const r = 22;
    const hurt = name === "hurt";
    const charge = name === "windup" ? 1 : 0;
    let body = "";
    // Three swept fins.
    for (const a of [-50, 50, 180]) {
      const base = polar([0, cy], a + 180, r - 4);
      const tip = polar([0, cy], a + 180, r + 14 + charge * 4);
      body += sh(poly([polar(base, a + 90, 6), tip, polar(base, a - 90, 6)]), "url(#armorDk)", 1.3);
    }
    body += circ(0, cy, r, "url(#armor)", 1.7);
    body += circ(0, cy, 13, "url(#gun)", 1.3) + circ(0, cy, 9, "#021010", 0.6);
    if (hurt) body += ln(`M${P(8, cy - 18)}L${P(3, cy - 9)}L${P(10, cy - 4)}`, "#000", 1.4);
    // Echo ring: a tilted orbit that reads as the type's signature.
    const ring = `<ellipse cx="0" cy="${cy}" rx="${34 + charge * 4}" ry="9" transform="rotate(-18 0 ${cy})" fill="none"`;
    body = `${ring} stroke="${INK}" stroke-width="4.2"/>${ring} stroke="#6fbaba" stroke-width="1.8"/>` + body;
    let g = circ(0, cy, 7, "#48ffff", 0) + circ(0, cy, 3, "#ffffff", 0);
    g += `${ring} stroke="#aaffff" stroke-width="${charge ? 2 : 1}" stroke-dasharray="${charge ? "none" : "7 5"}"/>`;
    // Ghost echoes offset to either side.
    const ghost = (dx) => `<circle cx="${dx}" cy="${cy}" r="${r}" fill="none" stroke="#7fffff" stroke-width="1.2" opacity=".35"/>`;
    g += ghost(-8) + ghost(8);
    if (name === "attack") g += flash(0, cy, 22, "#9fffff");
    if (hurt) g = circ(0, cy, 4, "#2fbfbf", 0);
    out[name] = { body, glow: glow(g) };
  }
  return out;
}

/* ── Glitchling ─────────────────────────────────────────────────────────── */

function glitchling() {
  const out = {};
  for (const name of POSES4) {
    const spread = name === "windup" ? 1.35 : name === "attack" ? 0.8 : 1;
    const hurt = name === "hurt";
    let body = "";
    // Spindly legs dangling from the crystal.
    for (const [a, b] of [[-14, -30], [-6, -18], [6, 18], [14, 30]]) {
      const k = [b * 0.9 * spread, 12];
      const tip = [b * 1.25 * spread, name === "attack" ? 26 : 30];
      body += ln(`M${P(a, 4)}L${P(...k)}L${P(...tip)}`, INK, 3.4) + ln(`M${P(a, 4)}L${P(...k)}L${P(...tip)}`, "#1a6b30", 1.6);
    }
    // Faceted prism body.
    const top = name === "attack" ? -34 : -28;
    body += sh(poly([[0, top], [22, 10], [-22, 10]]), "url(#armor)", 1.8);
    body += sh(poly([[0, top], [22, 10], [4, 4]]), "url(#armorDk)", 1);
    body += sh(poly([[-22, 10], [4, 4], [22, 10], [0, 16]]), "url(#armorDk)", 1.2);
    // Loose pixel shards.
    const shards = [[-30, -18, 7], [28, -22, 6], [-34, 8, 5], [33, 4, 6], [-10, -40, 4], [16, -38, 5]];
    for (const [x, y, s] of shards) body += sh(`M${P(x * spread, y * spread)}h${s}v${s}h${-s}Z`, "url(#armor)", 1);
    const eye = name === "windup" ? 5 : 3.6;
    let g = circ(0, -2, eye + 2, "#20ff66", 0) + circ(0, -2, eye * 0.5, "#eaffea", 0);
    for (const [x, y, s] of shards) g += `<rect x="${f(x * spread + 1)}" y="${f(y * spread + 1)}" width="${s - 2}" height="${s - 2}" fill="#6dff9a"/>`;
    g += ln(`M-18 ${f(top + 30)}H18M-12 ${f(top + 20)}H12`, "#6dff9a", 0.8, 0.8);
    if (name === "attack") g += flash(0, -2, 20, "#50ff80");
    if (hurt) g = circ(0, -2, 3, "#1fae4a", 0) + `<rect x="-26" y="-6" width="52" height="2" fill="#6dff9a"/>`;
    out[name] = { body, glow: glow(g) };
  }
  return out;
}

/* ── Time Phantom ───────────────────────────────────────────────────────── */

function phantom() {
  const out = {};
  for (const name of POSES4) {
    const hurt = name === "hurt";
    const armsUp = name === "windup";
    const thrust = name === "attack";
    let body = "";
    // Tattered cloak dissolving into tendrils.
    const hem = [];
    for (let i = 0; i <= 8; i++) {
      const x = -34 + i * 8.5;
      hem.push(`L${P(x, i % 2 ? 62 : 80 - Math.abs(4 - i) * 3)}`);
    }
    body += sh(`M-18 -34Q-40 -6 -34 62${hem.join("")}Q40 -6 18 -34Z`, "url(#armor)", 1.6, ` fill-opacity=".92"`);
    body += sh(`M-8 -30Q-16 10 -12 66L0 74L12 66Q16 10 8 -30Z`, "url(#armorDk)", 1, ` fill-opacity=".85"`);
    body += ln(`M-24 0Q-26 30 -22 58M24 0Q26 30 22 58`, INK, 0.9, 0.5);
    // Spectral arms.
    for (const s of [-1, 1]) {
      const S = [s * 20, -26];
      const E = armsUp ? [s * 36, -44] : thrust ? [s * 26, -20] : [s * 32, -6];
      const W = armsUp ? [s * 26, -64] : thrust ? [s * 12, -26] : hurt ? [s * 44, -18] : [s * 30, 16];
      body += limb(S, E, 11, 9, "url(#armor)") + limb(E, W, 9, 5, "url(#armorDk)");
      for (const k of [-22, 0, 22]) body += ln(`M${P(...W)}L${P(...polar(W, heading(E, W) + k, 7))}`, INK, 2.4) + ln(`M${P(...W)}L${P(...polar(W, heading(E, W) + k, 7))}`, "#c9a0e6", 1);
    }
    // Hood.
    const hx = hurt ? 4 : 0;
    body += sh(`M${P(hx - 20, -30)}Q${P(hx - 22, -62)} ${P(hx, -68)}Q${P(hx + 22, -62)} ${P(hx + 20, -30)}Q${P(hx, -22)} ${P(hx - 20, -30)}Z`, "url(#armor)", 1.8);
    body += sh(`M${P(hx - 12, -34)}Q${P(hx - 13, -56)} ${P(hx, -58)}Q${P(hx + 13, -56)} ${P(hx + 12, -34)}Z`, "#08010e", 0.8);
    let g = ell(hx - 5, -45, 3, 2.4, "#ffb8ff", 0) + ell(hx + 5, -45, 3, 2.4, "#ffb8ff", 0);
    g += ell(0, 40, 20, 34, "#9a38ff", 0, ` opacity=".25"`);
    if (armsUp) g += circ(0, -78, 9, "#d070ff", 0) + circ(0, -78, 4, "#ffffff", 0);
    if (thrust) g += flash(0, -26, 22, "#e08cff");
    if (hurt) g = ell(hx - 5, -45, 2, 1.6, "#b070c0", 0) + ell(hx + 5, -45, 2, 1.6, "#b070c0", 0);
    out[name] = { body, glow: glow(g) };
  }
  return out;
}

/* ── Chrono Beast (side-on, facing right) ───────────────────────────────── */

function beast() {
  const table = {
    idle: { lean: 0, head: 0, jaw: 4, legs: [[0, 0], [0, 0], [0, 0], [0, 0]] },
    moveA: { lean: -2, head: -2, jaw: 6, bob: -3, legs: [[34, 20], [-28, 10], [-24, 6], [30, 16]] },
    moveB: { lean: 2, head: 2, jaw: 6, bob: 0, legs: [[-26, 8], [30, 18], [28, 18], [-26, 8]] },
    windup: { lean: -8, head: 8, jaw: 16, crouch: 12, legs: [[-18, 20], [-10, 16], [24, 20], [16, 16]] },
    attack: { lean: 10, head: -12, jaw: 22, bob: -8, legs: [[56, 10], [44, 8], [-40, 4], [-30, 2]] },
    hurt: { lean: -10, head: -22, jaw: 10, legs: [[10, 6], [-8, 4], [-6, 4], [12, 6]] },
  };
  const out = {};
  for (const [name, b] of Object.entries(table)) {
    const bob = (b.bob || 0) + (b.crouch || 0);
    const hipB = [-40, 8 + bob];
    const hipF = [30, 4 + bob];
    const rotBody = `rotate(${b.lean} -5 ${f(-6 + bob)})`;
    const leg = (hip, [swing, lift], far, thick) => {
      const foot = [hip[0] + Math.sin((swing * Math.PI) / 180) * 36, SOLE - 4 - lift];
      const knee = [lerp(hip, foot, 0.5)[0] + (hip === hipF ? -8 : 8), lerp(hip, foot, 0.5)[1] - 2];
      const mat = far ? "url(#hideDk)" : "url(#armorDk)";
      return limb(hip, knee, thick, thick * 0.8, mat) + limb(knee, foot, thick * 0.75, thick * 0.6, mat) +
        sh(`M${P(foot[0] - 7, foot[1] - 4)}h14l3 6h-19Z`, "url(#gun)", 1.1) +
        ln(`M${P(foot[0] + 7, foot[1] + 2)}l4 2M${P(foot[0] + 4, foot[1] + 2)}l3 3`, "#e8d8c0", 1.2);
    };
    let body = "";
    // Far legs first, darker.
    body += leg(hipB, b.legs[1], true, 24) + leg(hipF, b.legs[3], true, 22);
    let torso = "";
    torso += sh(`M-64 ${f(-2 + bob)}Q-70 ${f(-34 + bob)} -34 ${f(-40 + bob)}Q10 ${f(-58 + bob)} 44 ${f(-40 + bob)}Q62 ${f(-28 + bob)} 52 ${f(4 + bob)}Q10 ${f(24 + bob)} -40 ${f(18 + bob)}Q-60 ${f(14 + bob)} -64 ${f(-2 + bob)}Z`, "url(#armor)", 1.9);
    torso += ln(`M-40 ${f(10 + bob)}Q0 ${f(18 + bob)} 40 ${f(0 + bob)}`, INK, 1, 0.5);
    for (const x of [-30, -12, 6, 24]) torso += ln(`M${x} ${f(-40 + bob + Math.abs(x) * 0.1)}q6 14 2 26`, INK, 1, 0.55);
    // Armoured back plates with gear-tooth spikes.
    for (const [x, y, s] of [[-44, -36, 12], [-20, -46, 14], [6, -50, 15], [30, -44, 13]]) {
      torso += sh(poly([[x - s, y + bob + 8], [x - 2, y + bob - s], [x + 4, y + bob - s * 0.6], [x + s, y + bob + 6]]), "url(#steel)", 1.3);
    }
    // Tail.
    torso += sh(`M-62 ${f(-6 + bob)}Q-90 ${f(-20 + bob)} -96 ${f(-44 + bob)}Q-84 ${f(-18 + bob)} -60 ${f(6 + bob)}Z`, "url(#armorDk)", 1.4);
    // Head and jaw.
    const hp = [58, -14 + bob];
    const rotHead = `rotate(${b.head} ${hp[0] - 10} ${hp[1]})`;
    let head = sh(`M${P(hp[0] - 16, hp[1] - 18)}Q${P(hp[0] + 10, hp[1] - 26)} ${P(hp[0] + 34, hp[1] - 6)}L${P(hp[0] + 36, hp[1] + 2)}L${P(hp[0] - 4, hp[1] + 8)}Q${P(hp[0] - 20, hp[1] + 4)} ${P(hp[0] - 16, hp[1] - 18)}Z`, "url(#armor)", 1.7);
    head += sh(`M${P(hp[0] - 2, hp[1] + 4)}L${P(hp[0] + 32, hp[1] + 2 + b.jaw * 0.3)}L${P(hp[0] + 28, hp[1] + 8 + b.jaw)}Q${P(hp[0] + 6, hp[1] + 12 + b.jaw * 0.6)} ${P(hp[0] - 6, hp[1] + 10)}Z`, "url(#armorDk)", 1.5);
    let teeth = "";
    for (let i = 0; i < 5; i++) {
      const tx = hp[0] + 8 + i * 5.5;
      teeth += `M${P(tx, hp[1] + 2)}l2 ${f(3 + b.jaw * 0.15)}l2 ${f(-3 - b.jaw * 0.15)}`;
    }
    head += sh(teeth, "#efe6d0", 0.6);
    head += sh(`M${P(hp[0] - 10, hp[1] - 20)}L${P(hp[0] - 24, hp[1] - 36)}L${P(hp[0] - 2, hp[1] - 22)}Z`, "url(#steel)", 1.2);
    // Near legs over the body.
    const near = leg(hipB, b.legs[0], false, 27) + leg(hipF, b.legs[2], false, 25);
    body += `<g transform="${rotBody}">${torso}<g transform="${rotHead}">${head}</g></g>` + near;
    const eye = (r) => circ(hp[0] + 12, hp[1] - 10, r, "#ffb020", 0) + circ(hp[0] + 12, hp[1] - 10, r * 0.4, "#fff4d0", 0);
    let gHead = name === "hurt" ? circ(hp[0] + 12, hp[1] - 10, 1.6, "#a05010", 0) : eye(name === "windup" ? 3.6 : 2.6);
    if (name === "windup" || name === "attack") gHead += ell(hp[0] + 20, hp[1] + 6 + b.jaw * 0.5, 9, 3 + b.jaw * 0.25, "#ff5a10", 0, ` opacity=".7"`);
    const gBody = name === "hurt" ? "" : ln(`M-20 ${f(-34 + bob)}q6 14 2 26M6 ${f(-38 + bob)}q6 14 2 26`, "#ff6a1a", 1.2, 0.8);
    out[name] = { body, glow: `<g transform="${rotBody}">${glow(gBody)}<g transform="${rotHead}">${glow(gHead)}</g></g>` };
  }
  return out;
}

export const CREATURES = {
  drone: { build: drone, box: [-60, -76, 120, 120], rim: "#6fe8ff", floater: true, size: 1.1 },
  echoDrone: { build: echoDrone, box: [-50, -46, 100, 90], rim: "#b8ffff", floater: true, size: 1.1 },
  glitchling: { build: glitchling, box: [-50, -54, 100, 94], rim: "#7dff9a", floater: true, jitter: true },
  phantom: { build: phantom, box: [-56, -96, 112, 186], rim: "#e59bff", floater: true, size: 1.1 },
  beast: { build: beast, box: [-110, -80, 222, 176], rim: "#ff8a3a" },
};
