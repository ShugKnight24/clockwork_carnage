/**
 * Gloved viewmodel hands: a tactical glove over a human hand.
 *
 * Joints are placed in the weapon's 3D space (millimetres) so the hands share
 * its perspective, then drawn as illustrated 2D shapes: bowed, tapered finger
 * segments (proximal > middle > distal) with joint creases and dark gaps
 * between neighbours, a padded back of hand with a molded knuckle guard on the
 * knuckle arc, and foreshortened sleeve wedges that widen toward the screen
 * edge with a cuff and an emissive accent trim.
 *
 * Poses: firing hand on a pistol grip (back of the glove toward the camera,
 * index along the frame), sidearm support hand cupping under the firing
 * fingers, and a long-gun support hand palm-up under the handguard.
 */

import { INK, f, mix, lerp3 } from "./geom.js";

const pt = ([x, y]) => `${f(x)},${f(y)}`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// How far past the screen edge sleeves run (viewmodel units from centre): covers
// bob/kick plus the rig following the free-aim reticle to its limits.
const EDGE_Y = 168;
const EDGE_X = 236;

export const HAND_DEFS = `
<linearGradient id="vmGlove" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#5a6574"/><stop offset=".32" stop-color="#343d49"/>
  <stop offset=".72" stop-color="#1b212a"/><stop offset="1" stop-color="#0b0e13"/></linearGradient>
<linearGradient id="vmGloveDk" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#3a434f"/><stop offset=".5" stop-color="#1d232c"/>
  <stop offset="1" stop-color="#080a0e"/></linearGradient>
<linearGradient id="vmPlate" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#9fb4c7"/><stop offset=".3" stop-color="#5d7489"/>
  <stop offset=".65" stop-color="#2f3f50"/><stop offset="1" stop-color="#121a23"/></linearGradient>
<linearGradient id="vmSleeve" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#4a6482"/><stop offset=".35" stop-color="#27394d"/>
  <stop offset=".75" stop-color="#121c29"/><stop offset="1" stop-color="#070b11"/></linearGradient>
<linearGradient id="vmCuff" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#434c59"/><stop offset=".5" stop-color="#20262f"/>
  <stop offset="1" stop-color="#0b0e13"/></linearGradient>
<radialGradient id="vmAO"><stop offset="0" stop-color="#000" stop-opacity=".55"/>
  <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;

/** Convex hull (monotone chain) of 2D points. */
function hull2(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop();
    up.push(p[i]);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Closed Catmull-Rom spline through 2D points. */
function blobPath(p) {
  let d = `M${pt(p[0])}`;
  for (let i = 0; i < p.length; i++) {
    const p0 = p[(i - 1 + p.length) % p.length];
    const p1 = p[i];
    const p2 = p[(i + 1) % p.length];
    const p3 = p[(i + 2) % p.length];
    d += `C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ` +
      `${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return d + "Z";
}

/** Open Catmull-Rom continuation through points (after an M/L at points[0]). */
function spline(p) {
  let d = "";
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    d += `C${pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ` +
      `${pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${pt(p2)}`;
  }
  return d;
}

/** Hand drawing kit bound to a scene (see geom.createScene). */
export function createHandArt(sc) {
  const { accent, P, k } = sc;
  // Nominal device px per unit for this build's detail tier: fine lines are
  // dropped once they would render too small to read (LOD).
  const PX = sc.detailPx || 4;
  if (!sc.sleeveEnds) sc.sleeveEnds = [];
  let layer = "body";
  const use = (name) => {
    layer = name;
    sc.target(name);
  };
  const grow = (p, pad = 0) => sc.grow(sc.layers[layer], p, pad);
  const emit = (m) => sc.emit(m);
  const dist = (p) => Math.hypot(p[0] - sc.eye[0], p[1] - sc.eye[1], p[2] - sc.eye[2]);

  function stroke(pts2, color = INK, w = 0.3, op = 0.55) {
    emit(`<path d="M${pts2.map(pt).join("L")}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  function curve(a, c, b, color = INK, w = 0.3, op = 0.55) {
    emit(`<path d="M${pt(a)}Q${pt(c)} ${pt(b)}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${f(w)}" stroke-linecap="round"/>`);
  }

  /**
   * Finger through 3D joints (base → tip) with widths in mm per joint, drawn as
   * one tapered glove outline: slight knuckle swell at each joint, a rounded
   * tip, fabric creases across the joints and a lit ridge along the top.
   * `gap` (±1) darkens the side facing the neighbouring finger.
   */
  function finger(j3, wmm, o = {}) {
    const { gap = 0, nail = true, swell = 0.1 } = o;
    const j = j3.map(P);
    const r = j3.map((p, i) => (wmm[i] / 2) * k(p));
    const last = j.length - 1;
    const norm = (i) => {
      const a = j[Math.max(0, i - 1)];
      const b = j[Math.min(last, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    };
    const ns = j.map((_, i) => norm(i));
    const sw = (i) => (i > 0 && i < last ? 1 + swell : 1);
    const off = (i, s) => [j[i][0] + ns[i][0] * r[i] * s * sw(i), j[i][1] + ns[i][1] * r[i] * s * sw(i)];
    const left = j.map((_, i) => off(i, 1));
    const right = j.map((_, i) => off(i, -1));
    [...left, ...right].forEach((q) => grow(q));
    const ul = Math.hypot(j[last][0] - j[last - 1][0], j[last][1] - j[last - 1][1]) || 1;
    grow([j[last][0] + ((j[last][0] - j[last - 1][0]) / ul) * r[last], j[last][1] + ((j[last][1] - j[last - 1][1]) / ul) * r[last]]);
    const rt = f(r[last]);
    const d = `M${pt(right[0])}L${pt(left[0])}${spline(left)}A${rt} ${rt} 0 0 0 ${pt(right[last])}${spline(right.slice().reverse())}Z`;
    const avg = ns.reduce((a, q) => [a[0] + q[0], a[1] + q[1]], [0, 0]);
    const lit = avg[0] * -0.6 + avg[1] * -0.8 >= 0 ? 1 : -1;
    let out = `<path d="${d}" fill="url(#vmGlove)" stroke="${INK}" stroke-width=".45" stroke-linejoin="round"/>`;
    const rPx = r[1] * PX;
    if (rPx >= 8) {
      const ridge = j.map((_, i) => off(i, lit * 0.5));
      out += `<path d="M${pt(ridge[0])}${spline(ridge)}" fill="none" stroke="#cfdce8" stroke-opacity=".28" stroke-width="${f(Math.max(0.35, r[1] * 0.26))}" stroke-linecap="round"/>`;
    }
    if (rPx >= 16) {
      const rimLine = j.map((_, i) => off(i, -lit * 0.84));
      out += `<path d="M${pt(rimLine[0])}${spline(rimLine)}" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width=".35" stroke-linecap="round"/>`;
    }
    if (gap && r[0] * PX >= 11) {
      const g = j.slice(0, last).map((_, i) => off(i, gap * 0.8));
      out += `<path d="M${pt(g[0])}${spline(g)}" fill="none" stroke="${INK}" stroke-opacity=".55" stroke-width="${f(Math.max(0.45, r[0] * 0.22))}" stroke-linecap="round"/>`;
    }
    emit(out);
    for (let i = 1; i < last && r[i] * PX >= 17; i++) {
      // Fabric crease across the joint, bowed toward the tip.
      const u = [ns[i][1], -ns[i][0]];
      const c = j[i];
      const rr = r[i];
      curve([c[0] + ns[i][0] * rr * 0.7, c[1] + ns[i][1] * rr * 0.7], [c[0] + u[0] * rr * 0.4, c[1] + u[1] * rr * 0.4], [c[0] - ns[i][0] * rr * 0.7, c[1] - ns[i][1] * rr * 0.7], INK, Math.max(0.3, rr * 0.12), 0.5);
    }
    if (nail && r[last] * PX >= 14) {
      const c = lerp(j[last - 1], j[last], 0.8);
      emit(`<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(r[last] * 0.5)}" ry="${f(r[last] * 0.34)}" fill="#0b0e13" fill-opacity=".4"/>`);
    }
    return { j, r };
  }

  /**
   * Several curled fingers seen edge-on (foreshortened side by side) as one
   * padded glove shape with grooves between them: individually outlined they
   * read as a stack of thin slivers.
   */
  function fingerGroup(fingers) {
    const cols = fingers.map(([j3, wmm]) => {
      const j = j3.map(P);
      const r = j3.map((p, i) => (wmm[i] / 2) * k(p));
      return { j, r };
    });
    const pts = [];
    for (const { j, r } of cols) {
      for (let i = 0; i < j.length; i++) {
        const a = j[Math.max(0, i - 1)];
        const b = j[Math.min(j.length - 1, i + 1)];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
        pts.push([j[i][0] + n[0] * r[i], j[i][1] + n[1] * r[i]], [j[i][0] - n[0] * r[i], j[i][1] - n[1] * r[i]]);
      }
      const e = j.length - 1;
      const l = Math.hypot(j[e][0] - j[e - 1][0], j[e][1] - j[e - 1][1]) || 1;
      pts.push([j[e][0] + ((j[e][0] - j[e - 1][0]) / l) * r[e] * 0.8, j[e][1] + ((j[e][1] - j[e - 1][1]) / l) * r[e] * 0.8]);
    }
    const outline = hull2(pts);
    outline.forEach((q) => grow(q));
    emit(`<path d="${blobPath(outline)}" fill="url(#vmGlove)" stroke="${INK}" stroke-width=".45" stroke-linejoin="round"/>`);
    for (let c = 0; c < cols.length - 1; c++) {
      const a = cols[c];
      const b = cols[c + 1];
      const groove = a.j.slice(0, -1).map((q, i) => lerp(q, b.j[i], 0.5));
      emit(`<path d="M${pt(groove[0])}${spline(groove)}" fill="none" stroke="${INK}" stroke-opacity=".6" stroke-width="${f(Math.max(0.4, a.r[1] * 0.18))}" stroke-linecap="round"/>`);
    }
    // Knuckle sheen along the leading finger.
    const lead = cols[cols.length - 1];
    if (lead.r[1] * PX >= 8) emit(`<path d="M${pt(lead.j[1])}${spline(lead.j.slice(1, -1))}" fill="none" stroke="#cfdce8" stroke-opacity=".25" stroke-width="${f(Math.max(0.35, lead.r[1] * 0.3))}" stroke-linecap="round"/>`);
  }

  /** Padded glove mass (back of hand, palm) through 3D outline points. */
  function mass(pts3, o = {}) {
    const { fill = "url(#vmGlove)", panel = 0, creases = [] } = o;
    const p = pts3.map(P);
    p.forEach((q) => grow(q));
    let m = `<path d="${blobPath(p)}" fill="${fill}" stroke="${INK}" stroke-width=".5" stroke-linejoin="round"/>`;
    const span = Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0]));
    if (panel && span * PX >= 110) {
      const c = p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
      m += `<path d="${blobPath(p.map((q) => lerp(c, q, panel)))}" fill="#7a8696" fill-opacity=".12" stroke="${INK}" stroke-opacity=".38" stroke-width=".28" stroke-dasharray=".9 .6"/>`;
    }
    emit(m);
    for (const [a, c, b] of creases) curve(P(a), P(c), P(b), INK, 0.4, 0.4);
    return p;
  }

  /**
   * Knuckle armour on the back of the hand: a low molded plate over each
   * knuckle on the arc, aligned with its finger, with a lit bevel.
   */
  function guard(mcps3, tips3, wmm) {
    if ((wmm / 2) * k(mcps3[1]) * PX < 18) {
      // Too small for readable plates: just catch the light along the knuckle arc.
      const p = mcps3.map(P);
      emit(`<path d="M${pt(p[0])}${spline(p)}" fill="none" stroke="#b8c8d8" stroke-opacity=".4" stroke-width="${f(Math.max(0.5, (wmm / 2) * k(mcps3[1]) * 0.3))}" stroke-linecap="round"/>`);
      return;
    }
    mcps3.forEach((m3, i) => {
      const c = P(m3);
      const t = P(tips3[i]);
      const l = Math.hypot(t[0] - c[0], t[1] - c[1]) || 1;
      const u = [(t[0] - c[0]) / l, (t[1] - c[1]) / l];
      const n = [-u[1], u[0]];
      const r = (wmm / 2) * k(m3);
      const at = (a, b) => [c[0] + u[0] * r * a + n[0] * r * b, c[1] + u[1] * r * a + n[1] * r * b];
      const plate = [at(-0.62, -0.46), at(0.1, -0.6), at(0.5, -0.34), at(0.5, 0.34), at(0.1, 0.6), at(-0.62, 0.46)];
      plate.forEach((q) => grow(q));
      emit(`<path d="${blobPath(plate)}" fill="url(#vmPlate)" stroke="${INK}" stroke-width=".4" stroke-linejoin="round"/>` +
        `<path d="M${pt(at(-0.4, -0.32))}Q${pt(at(0.12, -0.45))} ${pt(at(0.35, -0.1))}" fill="none" stroke="#f2f8ff" stroke-opacity=".55" stroke-width="${f(Math.max(0.3, r * 0.14))}" stroke-linecap="round"/>`);
    });
  }

  /**
   * Sleeve wedge: from the wrist (two 3D points across it) toward a 3D elbow,
   * clipped at the screen edge and flared there so it reads as a forearm
   * coming at the camera. Glove cuff over the wrist, accent trim above it.
   */
  function sleeve(wa3, wb3, elbow3, o = {}) {
    const { flare = 1.9, trimAt = 0.2 } = o;
    const wa = P(wa3);
    const wb = P(wb3);
    const wc = lerp(wa, wb, 0.5);
    const e = P(elbow3);
    let dir = [e[0] - wc[0], e[1] - wc[1]];
    const dl = Math.hypot(dir[0], dir[1]) || 1;
    dir = [dir[0] / dl, dir[1] / dl];
    // Distance along dir to the first screen edge.
    const ts = [];
    if (dir[1] > 0.01) ts.push((EDGE_Y - wc[1]) / dir[1]);
    if (dir[0] > 0.01) ts.push((EDGE_X - wc[0]) / dir[0]);
    if (dir[0] < -0.01) ts.push((-EDGE_X - wc[0]) / dir[0]);
    const t = Math.max(20, Math.min(...ts)) + 8;
    const ec = [wc[0] + dir[0] * t, wc[1] + dir[1] * t];
    const half = [(wb[0] - wa[0]) / 2, (wb[1] - wa[1]) / 2];
    const ea = [ec[0] - half[0] * flare, ec[1] - half[1] * flare];
    const eb = [ec[0] + half[0] * flare, ec[1] + half[1] * flare];
    const bowA = [lerp(wa, ea, 0.5)[0] - half[0] * 0.12, lerp(wa, ea, 0.5)[1] - half[1] * 0.12];
    const bowB = [lerp(wb, eb, 0.5)[0] + half[0] * 0.12, lerp(wb, eb, 0.5)[1] + half[1] * 0.12];
    [wa, wb, ea, eb, bowA, bowB].forEach((q) => grow(q));
    if (layer !== "body") sc.sleeveEnds.push({ ea, eb, dir, half });
    emit(`<path d="M${pt(wa)}Q${pt(bowA)} ${pt(ea)}L${pt(eb)}Q${pt(bowB)} ${pt(wb)}Z" fill="url(#vmSleeve)" stroke="${INK}" stroke-width=".6" stroke-linejoin="round"/>`);
    const at = (s) => [lerp(wa, ea, s), lerp(wb, eb, s)];
    // Fabric folds bunching near the cuff.
    for (const s of PX >= 3 ? [trimAt + 0.16, trimAt + 0.3, trimAt + 0.48] : [trimAt + 0.3]) {
      const [a, b] = at(s);
      curve(lerp(a, b, 0.12), [lerp(a, b, 0.35)[0] - dir[0] * 3, lerp(a, b, 0.35)[1] - dir[1] * 3], lerp(a, b, 0.62), INK, 0.5, 0.38);
    }
    const [oa, ob] = wb[0] > wa[0] ? [wb, eb] : [wa, ea];
    stroke([lerp(oa, ob, 0.1), lerp(oa, ob, 0.95)], accent, 0.45, 0.5);
    // Accent trim band.
    const [t0a, t0b] = at(trimAt);
    const [t1a, t1b] = at(trimAt + 0.045);
    emit(`<path d="M${pt(t0a)}L${pt(t0b)}L${pt(t1b)}L${pt(t1a)}Z" fill="${mix(accent, "#0a1420", 0.45)}" stroke="${INK}" stroke-width=".4"/>`);
    const s0 = lerp(lerp(t0a, t1a, 0.5), lerp(t0b, t1b, 0.5), 0.08);
    const s1 = lerp(lerp(t0a, t1a, 0.5), lerp(t0b, t1b, 0.5), 0.92);
    const sw = Math.max(0.4, Math.hypot(t1a[0] - t0a[0], t1a[1] - t0a[1]) * 0.28);
    emit(`<path d="M${pt(s0)}L${pt(s1)}" stroke="${mix(accent, "#ffffff", 0.5)}" stroke-width="${f(sw)}" stroke-linecap="round"/>`);
    if (layer !== "body") {
      const prev = layer;
      sc.target("handGlow");
      sc.grow(sc.layers.handGlow, s0, 8);
      sc.grow(sc.layers.handGlow, s1, 8);
      emit(`<path d="M${pt(s0)}L${pt(s1)}" stroke="${accent}" stroke-width="${f(sw * 2.6)}" stroke-opacity=".7" stroke-linecap="round" filter="url(#vmBloom)"/>`);
      use(prev);
    }
    // Glove cuff over the wrist end of the sleeve.
    const [c1a, c1b] = at(trimAt * 0.7);
    const ca = lerp(wa, ea, -0.03);
    const cb = lerp(wb, eb, -0.03);
    emit(`<path d="${blobPath([ca, lerp(ca, cb, 0.5), cb, c1b, lerp(c1a, c1b, 0.5), c1a])}" fill="url(#vmCuff)" stroke="${INK}" stroke-width=".5"/>`);
    const [sa, sb] = at(trimAt * 0.38);
    stroke([lerp(sa, sb, 0.1), lerp(sa, sb, 0.9)], INK, 0.4, 0.55);
  }

  /** Soft contact shadow under a hand where it presses on the weapon. */
  function ao(c3, rmm, sy = 0.6) {
    const c = P(c3);
    const r = rmm * k(c3);
    emit(`<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(r)}" ry="${f(r * sy)}" fill="url(#vmAO)"/>`);
  }

  return { use, P, k, finger, fingerGroup, mass, guard, sleeve, ao, stroke, curve, detailPx: PX };
}

// ---------------------------------------------------------------------------
// Poses. Grip g = { yTop, yBot, zfT, zbT, zfB, zbB, hw } (front/back z at top/bottom).
// ---------------------------------------------------------------------------

const gz = (g, y, side) => {
  const t = (g.yTop - y) / (g.yTop - g.yBot);
  return side === "front" ? g.zfT + (g.zfB - g.zfT) * t : g.zbT + (g.zbB - g.zbT) * t;
};

/** Back of the right glove, knuckle guard and fingers on a pistol grip; `between` paints after the wrapped fingers. */
function firingGlove(A, g, between, ads = false) {
  const { hw, yTop: yT } = g;
  const fr = (y) => gz(g, y, "front");
  const bk = (y) => gz(g, y, "back");
  const I = [hw + 5, yT - 8, fr(yT - 8) - 12];
  const M = [hw + 12, yT - 25, fr(yT - 25) - 17];
  const R = [hw + 17, yT - 41, fr(yT - 41) - 21];
  const K = [hw + 19, yT - 56, fr(yT - 56) - 25];
  const WU = [hw + 34, yT - 86, bk(yT) - 56];
  const WR = [hw + 2, yT - 74, bk(yT) - 66];
  const web = [2, yT + 3, bk(yT) - 3];

  // At ADS the arm drops straight down so the sleeve stays inside the weapon's silhouette.
  if (ads) A.sleeve(WR, WU, [hw + 50, yT - 340, bk(yT) - 190], { flare: 1.5 });
  else A.sleeve(WR, WU, [hw + 150, yT - 260, bk(yT) - 330], { flare: 2.1 });
  // Middle, ring, little: across the right flank and round the front strap.
  [[K, 16.5], [R, 18.5], [M, 19.5]].forEach(([m, w], i) => {
    const y = m[1];
    A.finger([m, [hw * 0.5, y - 3, fr(y) + 3], [-hw * 0.35, y - 6, fr(y) + 9], [-hw - 1, y - 8, fr(y) + 2]], [w, w * 0.86, w * 0.74, w * 0.66], { gap: i < 2 ? 1 : 0 });
  });
  if (between) between();
  // Index laid along the frame, clear of the trigger.
  A.finger([I, [hw + 3.5, yT - 5, g.zfT + 14], [hw + 2, yT - 4, g.zfT + 36], [hw + 1.5, yT - 4, g.zfT + 53]], [20, 16.5, 14.5, 13], { gap: -1 });
  A.ao([hw + 6, yT - 30, fr(yT - 30) - 12], 34, 0.7);
  A.mass([
    web,
    [I[0] - 2, I[1] + 5, I[2] + 2],
    [M[0] + 3, M[1] + 2, M[2] - 1],
    [R[0] + 3, R[1], R[2] - 1],
    [K[0] + 2, K[1] - 5, K[2] - 1],
    WU,
    WR,
    [-3, yT - 24, bk(yT) - 26],
  ], {
    panel: 0.55,
    creases: [
      // Thumb web, then a tendon fold running back to the wrist.
      [web, [hw * 0.4, yT - 2, bk(yT) + 4], [I[0] - 3, I[1] + 3, I[2] - 2]],
      [[M[0], M[1] - 8, M[2] - 16], [M[0] + 8, M[1] - 20, M[2] - 26], [WU[0] - 10, WU[1] + 18, WU[2] + 12]],
    ],
  });
  A.guard([I, M, R, K], [
    [hw + 3.5, yT - 5, g.zfT + 14],
    [hw * 0.5, yT - 28, fr(yT - 25) + 3],
    [hw * 0.5, yT - 44, fr(yT - 41) + 3],
    [hw * 0.5, yT - 59, fr(yT - 56) + 3],
  ], 19);
}

/** Firing hand alone on a long gun's pistol grip. */
export function firingHand(A, g, ads = false) {
  A.use("handR");
  firingGlove(A, g, null, ads);
}

/**
 * Both hands on a sidearm, cup grip: the support palm sits under the grip and
 * its fingers wrap the front over the firing fingers — tucked beneath the
 * firing glove's knuckles — while its thumb lies forward along the left of the
 * frame (painted under the slide by `supportThumb`).
 */
export function sidearmGrip(A, g, ads = false) {
  A.use("handR");
  const { hw, yTop: yT, yBot: yB } = g;
  const fr = (y) => gz(g, Math.max(yB, y), "front");
  const WA = [-hw - 14, yB + 4, g.zbB - 36];
  const WB = [hw - 2, yB - 14, g.zbB - 44];
  if (ads) A.sleeve(WA, WB, [-hw - 30, yB - 340, g.zbB - 180], { flare: 1.5 });
  else A.sleeve(WA, WB, [-hw - 110, yB - 240, g.zbB - 320], { flare: 2 });
  A.mass([
    [-hw - 6, yT - 34, g.zbT - 4],
    [-hw - 3, yB + 8, fr(yB + 8) - 6],
    [2, yB - 6, (g.zbB + g.zfB) / 2 + 8],
    [hw + 8, yB - 8, g.zfB - 6],
    WB,
    WA,
    [-hw - 13, yT - 48, g.zbT - 22],
  ], { panel: 0.5 });
  firingGlove(A, g, () => {
    [[yT - 70, 15.5], [yT - 54, 17], [yT - 38, 17.5]].forEach(([y, w], i) => {
      const zf = fr(y);
      A.finger([[-hw * 0.2, y - 2, zf + 8], [hw + 6, y - 4, zf + 3], [hw + 11, y - 6, zf - 7], [hw + 10, y - 7, zf - 15]], [w, w * 0.86, w * 0.75, w * 0.66], { gap: i < 2 ? 1 : 0 });
    });
  }, ads);
}

/** Support thumb forward along the left of a sidearm frame; paint before the slide. */
export function supportThumb(A, g) {
  A.use("body");
  const { hw, yTop: yT } = g;
  A.finger([[-hw - 9, yT - 18, g.zbT - 12], [-hw - 11, yT - 7, g.zbT + 14], [-hw - 10, yT - 4, g.zfT + 12], [-hw - 8, yT - 4, g.zfT + 32]], [22, 18.5, 16, 14]);
}

/** Long-gun support thumb along the near flank; paint before the handguard so it tucks behind. */
export function clampThumb(A, hg) {
  A.use("body");
  const { y0, y1, hw, zc } = hg;
  const mid = (y0 + y1) / 2;
  A.finger([[-hw - 12, y0 - 10, zc - 40], [-hw - 10, y0 + 1, zc - 18], [-hw - 6, y0 + (mid - y0) * 0.9, zc + 4], [-hw - 2, mid + 4, zc + 22]], [23, 19.5, 17, 15]);
}

/**
 * Long-gun support hand, palm up under the handguard midway along the barrel:
 * thumb hooks over the near top edge, fingers curl up and over the far flank,
 * forearm comes in short and wide from the lower-left.
 * hg = { y0 (underside), y1 (top), hw, zc }. At ADS it paints into the body layer first so
 * the receiver in front of the eye hides it.
 */
export function clampHand(A, hg, layer = "handL", ads = false) {
  A.use(layer);
  const { y0, y1, hw, zc } = hg;
  const mid = (y0 + y1) / 2;
  const WA = [-hw - 18, y0 - 20, zc - 78];
  const WB = [hw + 8, y0 - 34, zc - 68];
  if (ads) A.sleeve(WA, WB, [-hw - 20, y0 - 420, zc - 220], { flare: 1.4 });
  else A.sleeve(WA, WB, [-hw - 230, y0 - 200, zc - 420], { flare: 2.3 });
  A.mass([
    [hw + 6, y0 - 4, zc + 38],
    [hw + 13, y0 - 6, zc - 24],
    WB,
    WA,
    [-hw - 12, y0 - 5, zc - 28],
    [-hw - 5, y0 - 2, zc + 24],
  ], { panel: 0.45 });
  A.ao([hw + 4, y0 + 6, zc + 4], 30, 0.8);
  // Fingers curl round the far lower edge; only the middle and tip segments show.
  // Foreshortened along the barrel they overlap, so they draw as one gloved
  // group with grooves (three at small sizes, little finger tucked).
  const rows = A.k([0, y0, zc]) * 9 * A.detailPx >= 18
    ? [[zc - 21, 16], [zc - 4, 18], [zc + 14, 19], [zc + 32, 18.5]]
    : [[zc - 14, 18.5], [zc + 7, 19.5], [zc + 28, 19]];
  A.fingerGroup(rows.map(([z, w]) => [
    [[hw * 0.2, y0 - 13, z], [hw + 11, y0 - 5, z - 1], [hw + 12, y0 + (mid - y0) * 0.9, z - 2], [hw + 6, mid + 6, z - 3]],
    [w, w * 0.86, w * 0.75, w * 0.66],
  ]));
}
