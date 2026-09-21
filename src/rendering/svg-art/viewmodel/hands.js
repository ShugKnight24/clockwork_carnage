/**
 * Gloved viewmodel hands: a fitted tactical glove over a human hand.
 *
 * Joints live in the weapon's 3D space (millimetres) so the hands share its
 * perspective. Fingers are walked around the actual cross-section of the grip
 * or handguard they hold, with human proportions (each finger about as long
 * as the palm, phalanges ~ 5 : 3 : 2), so they wrap it instead of ending in
 * stubs at its corner. A finger segment lying on a face the camera cannot see
 * is clipped against the weapon part's silhouette: it disappears behind the
 * grip where the grip covers it and shows where it pokes out past the edge.
 *
 * Each finger is one tapered outline with a cylindrical shade (shadow side,
 * matte sheen), a padded strip over the proximal phalanx, joint creases and a
 * fingertip seam. The back of the hand carries a stitched padding panel and
 * its edge over the knuckle arc bulges into a row of knuckles. Segments
 * clipped behind a part darken into a soft occlusion shadow at its edge
 * rather than ending in a hard cut. Modern keeps its ink
 * outline; Realistic (`sc.real`) swaps it for a soft occlusion edge, a
 * neutral charcoal material and no emissive trim bloom.
 *
 * Poses: firing hand on a pistol grip (thumb over the back strap on long
 * guns), sidearm cup grip with the support fingers wrapping over the firing
 * fingers and both thumbs forward along the frame, and the long-gun support
 * hand under the handguard with the fingers curling up its far flank.
 */

import { INK, f, mix } from "./geom.js";

const pt = ([x, y]) => `${f(x)},${f(y)}`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// How far past the screen edge sleeves run (viewmodel units from centre): covers
// bob/kick plus the rig following the free-aim reticle to its limits.
const EDGE_Y = 168;
const EDGE_X = 236;
// Clip ids stay unique across builds so layers from several weapons can share a document (tooling).
let clipSeq = 0;
// Screen-space key light direction (upper left), matching geom's KEY.
const LS = [-0.55, -0.83];

export const HAND_DEFS = `
<linearGradient id="vmGloveSh" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffffff" stop-opacity=".1"/><stop offset=".42" stop-color="#ffffff" stop-opacity="0"/>
  <stop offset="1" stop-color="#000000" stop-opacity=".5"/></linearGradient>
<linearGradient id="vmSleeve" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#4a6482"/><stop offset=".35" stop-color="#27394d"/>
  <stop offset=".75" stop-color="#121c29"/><stop offset="1" stop-color="#070b11"/></linearGradient>
<linearGradient id="vmSleeveR" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#4b5049"/><stop offset=".35" stop-color="#2e322d"/>
  <stop offset=".75" stop-color="#181a17"/><stop offset="1" stop-color="#090a09"/></linearGradient>
<linearGradient id="vmCuff" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#434c59"/><stop offset=".5" stop-color="#20262f"/>
  <stop offset="1" stop-color="#0b0e13"/></linearGradient>
<linearGradient id="vmCuffR" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#3e4145"/><stop offset=".5" stop-color="#1f2124"/>
  <stop offset="1" stop-color="#0a0b0c"/></linearGradient>
<filter id="vmSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter>
<radialGradient id="vmAO"><stop offset="0" stop-color="#000" stop-opacity=".55"/>
  <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;

// Material tones per art style.
const TONES = {
  modern: {
    base: "#333b46", hi: "#c3d0dc", hiOp: 0.16, sh: "#05070a", shOp: 0.5,
    edge: INK, edgeOp: 1, edgeW: 0.36, crease: INK, creaseOp: 0.42,
    pad: "#3f4854", seam: "#a9b7c5", seamOp: 0.34, plateHi: "#eef6ff", plateHiOp: 0.42,
    sleeve: "url(#vmSleeve)", cuff: "url(#vmCuff)",
  },
  real: {
    base: "#2c2f33", hi: "#b8bec4", hiOp: 0.09, sh: "#020304", shOp: 0.55,
    edge: "#050607", edgeOp: 0.55, edgeW: 0.24, crease: "#000000", creaseOp: 0.34,
    pad: "#35393e", seam: "#8b9299", seamOp: 0.24, plateHi: "#d9dde1", plateHiOp: 0.2,
    sleeve: "url(#vmSleeveR)", cuff: "url(#vmCuffR)",
  },
};

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

/**
 * Closed polygon with rounded corners: each corner is cut `t` of the way along
 * its edges and bridged with a quadratic. Unlike a closed Catmull-Rom it never
 * bulges past its control points, so padded shapes keep a firm silhouette.
 */
function roundPath(p, t = 0.35) {
  const n = p.length;
  const a = (i) => lerp(p[i], p[(i - 1 + n) % n], t);
  const b = (i) => lerp(p[i], p[(i + 1) % n], t);
  let d = `M${pt(lerp(p[0], p[1], 0.5))}`;
  for (let i = 1; i <= n; i++) {
    const k = i % n;
    d += `L${pt(a(k))}Q${pt(p[k])} ${pt(b(k))}`;
  }
  return d + "Z";
}

/** Capsule polygon around a 2D segment with end radii ra, rb. */
function capsule(a, b, ra, rb, n = 6) {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  const ang = Math.atan2(u[1], u[0]);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = ang - Math.PI / 2 + (Math.PI * i) / n;
    out.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]);
  }
  for (let i = 0; i <= n; i++) {
    const t = ang + Math.PI / 2 + (Math.PI * i) / n;
    out.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]);
  }
  return out;
}

/**
 * Offset contour of a rounded-rect section in an (a, b) plane, walked CCW:
 * bottom (+a), right (+b), top (−a), left (−b). Each sample carries its
 * outward normal so fingers know which face they lie on.
 */
function ring(a0, a1, b0, b1, c, d) {
  const R = c + d;
  const out = [];
  const straight = (p0, p1, n) => {
    for (let i = 0; i < 6; i++) out.push({ p: lerp(p0, p1, i / 6), n });
  };
  const corner = (cx, cy, t0) => {
    for (let i = 0; i < 6; i++) {
      const t = ((t0 + (90 * i) / 6) * Math.PI) / 180;
      out.push({ p: [cx + Math.cos(t) * R, cy + Math.sin(t) * R], n: [Math.cos(t), Math.sin(t)] });
    }
  };
  straight([a0 + c, b0 - d], [a1 - c, b0 - d], [0, -1]);
  corner(a1 - c, b0 + c, -90);
  straight([a1 + d, b0 + c], [a1 + d, b1 - c], [1, 0]);
  corner(a1 - c, b1 - c, 0);
  straight([a1 - c, b1 + d], [a0 + c, b1 + d], [0, 1]);
  corner(a0 + c, b1 - c, 90);
  straight([a0 - d, b1 - c], [a0 - d, b0 + c], [-1, 0]);
  corner(a0 + c, b0 + c, 180);
  return out;
}

/** Walk `lengths` (mm) along a ring from the sample nearest `start`, in direction `dir` (±1). */
function walk(rg, start, lengths, dir = 1) {
  const n = rg.length;
  let i = 0;
  let best = Infinity;
  rg.forEach((s, k) => {
    const dd = Math.hypot(s.p[0] - start[0], s.p[1] - start[1]);
    if (dd < best) {
      best = dd;
      i = k;
    }
  });
  let cur = rg[i].p;
  const out = [{ p: cur, n: rg[i].n }];
  for (const L of lengths) {
    let rem = L;
    while (rem > 1e-6) {
      const j = (i + dir + n) % n;
      const nx = rg[j].p;
      const seg = Math.hypot(nx[0] - cur[0], nx[1] - cur[1]);
      if (seg >= rem) {
        cur = lerp(cur, nx, rem / seg);
        rem = 0;
      } else {
        rem -= seg;
        cur = nx;
        i = j;
      }
    }
    out.push({ p: cur, n: rg[i].n });
  }
  return out;
}

/** Hand drawing kit bound to a scene (see geom.createScene). */
export function createHandArt(sc) {
  const { accent, P, k } = sc;
  const real = !!sc.real;
  const T = real ? TONES.real : TONES.modern;
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
  const edgeAttr = `stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${T.edgeW}" stroke-linejoin="round"`;

  function stroke(pts2, color = INK, w = 0.3, op = 0.55, extra = "") {
    emit(`<path d="M${pts2.map(pt).join("L")}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`);
  }
  function curve(a, c, b, color = INK, w = 0.3, op = 0.55, extra = "") {
    emit(`<path d="M${pt(a)}Q${pt(c)} ${pt(b)}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${f(w)}" stroke-linecap="round"${extra}/>`);
  }
  const stitch = (w) => ` stroke-dasharray="${f(Math.max(0.5, w * 2.4))} ${f(Math.max(0.35, w * 1.6))}"`;

  /** Screen silhouette of a solid given as 3D points (for occlusion clips). */
  const silhouette = (pts3) => hull2(pts3.map(P));

  /**
   * Wrap markup in clips so it only shows outside every occluder silhouette,
   * except inside the `keep` polygons (parts lying in front of the occluder).
   */
  function occlude(markup, occluders, keep) {
    let out = markup;
    for (const sil of occluders) {
      const id = `hc${clipSeq++}`;
      const hole = `M-500,-500L500,-500L500,500L-500,500ZM${sil.map(pt).join("L")}Z`;
      const keepMarkup = keep.map((poly) => `<path d="M${poly.map(pt).join("L")}Z"/>`).join("");
      out = `<clipPath id="${id}"><path d="${hole}" clip-rule="evenodd"/>${keepMarkup}</clipPath><g clip-path="url(#${id})">${out}</g>`;
    }
    return out;
  }

  /**
   * One gloved finger through 3D joints (base knuckle → tip), widths in mm
   * per joint. `near[i]` says segment i lies in front of the occluders.
   */
  function finger(j3, wmm, o = {}) {
    const { occluders = [], near = null, pad = true, onlyNear = false } = o;
    const j = j3.map(P);
    const r = j3.map((p, i) => (wmm[i] / 2) * k(p));
    const last = j.length - 1;
    const ns = j.map((_, i) => {
      const a = j[Math.max(0, i - 1)];
      const b = j[Math.min(last, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    });
    const off = (i, s) => [j[i][0] + ns[i][0] * r[i] * s, j[i][1] + ns[i][1] * r[i] * s];
    const ul = Math.hypot(j[last][0] - j[last - 1][0], j[last][1] - j[last - 1][1]) || 1;
    const u = [(j[last][0] - j[last - 1][0]) / ul, (j[last][1] - j[last - 1][1]) / ul];
    const tipAt = (s, reach) => [j[last][0] + u[0] * r[last] * reach + ns[last][0] * r[last] * s, j[last][1] + u[1] * r[last] * reach + ns[last][1] * r[last] * s];
    const left = j.map((_, i) => off(i, 1));
    const right = j.map((_, i) => off(i, -1));
    [...left, ...right, tipAt(0, 1)].forEach((q) => grow(q));
    // Glove fingertips are slightly squared: a cubic cap rather than a semicircle.
    const cap = `C${pt(tipAt(1, 1.05))} ${pt(tipAt(-1, 1.05))} ${pt(right[last])}`;
    const d = `M${pt(right[0])}L${pt(left[0])}${spline(left)}${cap}${spline(right.slice().reverse())}Z`;
    const avg = ns.reduce((a, q) => [a[0] + q[0], a[1] + q[1]], [0, 0]);
    const lit = avg[0] * LS[0] + avg[1] * LS[1] >= 0 ? 1 : -1;
    const ribbon = (s0, s1) => {
      const a = j.map((_, i) => off(i, s0 * (i === last ? 0.9 : 1)));
      const b = j.map((_, i) => off(i, s1 * (i === last ? 0.9 : 1)));
      a.push(tipAt(s0 * 0.55, 0.62));
      b.push(tipAt(s1 * 0.55, 0.62));
      b.reverse();
      return `M${pt(a[0])}${spline(a)}L${pt(b[0])}${spline(b)}Z`;
    };
    const rPx = r[1] * PX;
    let m = `<path d="${d}" fill="${T.base}"/>`;
    // Cylindrical shade: core shadow on the far side, a matte sheen on the lit side.
    m += `<path d="${ribbon(-lit * 0.3, -lit * 1)}" fill="${T.sh}" fill-opacity="${T.shOp}"/>`;
    m += `<path d="${ribbon(lit * 0.18, lit * 0.62)}" fill="${T.hi}" fill-opacity="${T.hiOp}"/>`;
    // Padded strip over the proximal phalanx (dorsal side faces the camera).
    if (pad && r[0] * PX >= 9) {
      const a0 = lerp(j[0], j[1], 0.22);
      const a1 = lerp(j[0], j[1], 0.74);
      const n0 = ns[0];
      const w0 = r[0] * 0.6;
      const w1 = r[1] * 0.6;
      const strip = [
        [a0[0] + n0[0] * w0, a0[1] + n0[1] * w0], [a1[0] + n0[0] * w1, a1[1] + n0[1] * w1],
        [a1[0] - n0[0] * w1, a1[1] - n0[1] * w1], [a0[0] - n0[0] * w0, a0[1] - n0[1] * w0],
      ];
      m += `<path d="${roundPath(strip, 0.42)}" fill="${T.pad}" stroke="${T.sh}" stroke-opacity=".45" stroke-width="${f(Math.max(0.18, r[0] * 0.05))}"/>`;
      if (r[0] * PX >= 16) {
        const e0 = lerp(strip[0], strip[3], lit > 0 ? 0.12 : 0.88);
        const e1 = lerp(strip[1], strip[2], lit > 0 ? 0.12 : 0.88);
        m += `<path d="M${pt(e0)}L${pt(e1)}" stroke="${T.hi}" stroke-opacity="${T.hiOp * 1.6}" stroke-width="${f(r[0] * 0.08)}" stroke-linecap="round"/>`;
      }
    }
    // Joint creases, bowed toward the tip, and a fingertip seam.
    for (let i = 1; i < last && r[i] * PX >= 9; i++) {
      const c = j[i];
      const t = [ns[i][1], -ns[i][0]];
      const rr = r[i];
      for (const s of [-0.22, 0.2]) {
        const cc = [c[0] - t[0] * rr * s, c[1] - t[1] * rr * s];
        m += `<path d="M${pt([cc[0] + ns[i][0] * rr * 0.62, cc[1] + ns[i][1] * rr * 0.62])}Q${pt([cc[0] - t[0] * rr * 0.28, cc[1] - t[1] * rr * 0.28])} ${pt([cc[0] - ns[i][0] * rr * 0.62, cc[1] - ns[i][1] * rr * 0.62])}" fill="none" stroke="${T.crease}" stroke-opacity="${T.creaseOp * (s < 0 ? 1 : 0.6)}" stroke-width="${f(Math.max(0.16, rr * 0.07))}" stroke-linecap="round"/>`;
      }
    }
    if (r[last] * PX >= 12) {
      const a = tipAt(0.78, -0.35);
      const b = tipAt(-0.78, -0.35);
      const c = tipAt(0, 0.15);
      m += `<path d="M${pt(a)}Q${pt(c)} ${pt(b)}" fill="none" stroke="${T.seam}" stroke-opacity="${T.seamOp}" stroke-width="${f(r[last] * 0.07)}"${stitch(r[last] * 0.07)}/>`;
    }
    m += `<path d="${d}" fill="none" ${edgeAttr}/>`;
    if (near && (onlyNear || (occluders.length && near.some((v) => !v)))) {
      const keep = [];
      for (let i = 0; i < last; i++) if (near[i]) keep.push(capsule(j[i], j[i + 1], r[i] * 1.12, r[i + 1] * 1.12));
      if (onlyNear) {
        // Repaint just the segments in front (over a hand drawn since).
        const id = `hc${clipSeq++}`;
        m = `<clipPath id="${id}">${keep.map((poly) => `<path d="M${poly.map(pt).join("L")}Z"/>`).join("")}</clipPath><g clip-path="url(#${id})">${m}</g>`;
      } else {
        // Soft occlusion: the finger darkens as it rounds the part and
        // passes behind its edge, instead of ending in a hard cut.
        const id = `hm${clipSeq++}`;
        const keepMarkup = keep.map((poly) => `<path d="M${poly.map(pt).join("L")}Z" fill="#000"/>`).join("");
        let sh = `<mask id="${id}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000"><path d="${d}" fill="#fff"/>${keepMarkup}</mask><g mask="url(#${id})">`;
        for (const sil of occluders) {
          sh += `<path d="M${sil.map(pt).join("L")}Z" fill="none" stroke="#000" stroke-opacity="${real ? 0.78 : 0.62}" stroke-width="${f(r[1] * 1.5)}" stroke-linejoin="round" filter="url(#vmSoft)"/>`;
        }
        m = occlude(m + sh + "</g>", occluders, keep);
      }
    }
    emit(m);
    return { j, r };
  }

  /** Padded glove mass (back of hand, palm heel) through 3D outline points. */
  function mass(pts3, o = {}) {
    const { panel = 0, creases = [], round = 0.4 } = o;
    const p = pts3.map(P);
    p.forEach((q) => grow(q));
    const d = roundPath(p, round);
    let m = `<path d="${d}" fill="${T.base}"/><path d="${d}" fill="url(#vmGloveSh)"/>`;
    const span = Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0]));
    if (panel && span * PX >= 90) {
      // Stitched padding panel over the metacarpals.
      const c = p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
      const inner = p.map((q) => lerp(c, q, panel));
      const w = Math.max(0.16, span * 0.004);
      m += `<path d="${roundPath(inner, 0.45)}" fill="${T.pad}" fill-opacity=".5" stroke="${T.sh}" stroke-opacity=".5" stroke-width="${f(w * 1.4)}"/>`;
      m += `<path d="${roundPath(p.map((q) => lerp(c, q, panel + 0.07)), 0.45)}" fill="none" stroke="${T.seam}" stroke-opacity="${T.seamOp}" stroke-width="${f(w)}"${stitch(w)}/>`;
    }
    m += `<path d="${d}" fill="none" ${edgeAttr}/>`;
    emit(m);
    for (const [a, c, b] of creases) curve(P(a), P(c), P(b), T.crease, 0.32, T.creaseOp * 0.9);
    return p;
  }

  /**
   * Knuckles seen end-on (sight-line views): the edge of the hand between
   * the outer knuckles becomes a row of low rounded bumps bulging away from
   * `from` (a screen point inside the hand), with soft valleys between them,
   * so the outline reads as knuckles instead of a flat slab.
   */
  function knuckleBumps(mcps3, wmm, from) {
    const ks = mcps3.map((m3, i) => ({ c: P(m3), r: (wmm[i] / 2) * k(m3) }));
    const n = ks.length;
    // Outward = perpendicular to the knuckle row, away from the hand.
    const row = [ks[n - 1].c[0] - ks[0].c[0], ks[n - 1].c[1] - ks[0].c[1]];
    const rl = Math.hypot(row[0], row[1]) || 1;
    let on = [-row[1] / rl, row[0] / rl];
    const mid = lerp(ks[0].c, ks[n - 1].c, 0.5);
    if ((mid[0] - from[0]) * on[0] + (mid[1] - from[1]) * on[1] < 0) on = [-on[0], -on[1]];
    const out = (q, s) => [q[0] + on[0] * s, q[1] + on[1] * s];
    // Valley points between knuckles; the ends run past the outer knuckles.
    const v = [];
    for (let i = 0; i <= n; i++) {
      const a = ks[Math.max(0, i - 1)];
      const b = ks[Math.min(n - 1, i)];
      let p = lerp(a.c, b.c, 0.5);
      if (i === 0) p = lerp(b.c, ks[1].c, -0.55);
      if (i === n) p = lerp(a.c, ks[n - 2].c, -0.55);
      v.push(out(p, i === 0 || i === n ? -Math.min(a.r, b.r) * 0.6 : 0));
    }
    let edge = `M${pt(v[0])}`;
    for (let i = 0; i < n; i++) {
      // Two control points make a round-shouldered bump rather than a point.
      const a = lerp(v[i], v[i + 1], 0.12);
      const b = lerp(v[i], v[i + 1], 0.88);
      edge += `C${pt(out(a, ks[i].r * 0.95))} ${pt(out(b, ks[i].r * 0.95))} ${pt(v[i + 1])}`;
    }
    const rin = ks.reduce((a, q) => a + q.r, 0) / n;
    const inner = [out(v[n], -rin), out(v[0], -rin)];
    const d = `${edge}L${pt(inner[0])}L${pt(inner[1])}Z`;
    [...v, ...inner].forEach((q) => grow(q));
    ks.forEach(({ c, r }) => grow(out(c, r)));
    // Feathered toward the hand so the bumps melt into the glove's back.
    const id = `hk${clipSeq++}`;
    const g0 = out(mid, 0);
    const g1 = out(mid, -rin);
    let m = `<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="${f(g0[0])}" y1="${f(g0[1])}" x2="${f(g1[0])}" y2="${f(g1[1])}">` +
      `<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000"><path d="${d}" fill="url(#${id}g)"/></mask>` +
      `<g mask="url(#${id})"><path d="${d}" fill="${T.base}"/><path d="${d}" fill="${T.sh}" fill-opacity="${real ? 0.22 : 0.16}"/>`;
    for (let i = 1; i < n; i++) {
      // Valley crease running into the hand between two knuckles.
      const r = Math.min(ks[i - 1].r, ks[i].r);
      m += `<path d="M${pt(out(v[i], -r * 0.12))}L${pt(out(v[i], -r * 0.7))}" stroke="${T.sh}" stroke-opacity="${real ? 0.5 : 0.4}" stroke-width="${f(r * 0.22)}" stroke-linecap="round"/>`;
    }
    for (let i = 0; i < n; i++) {
      // Each knuckle catches the key light on its upper shoulder.
      const { r } = ks[i];
      const a = out(lerp(v[i], v[i + 1], 0.3), r * 0.62);
      const b = out(lerp(v[i], v[i + 1], 0.7), r * 0.62);
      m += `<path d="M${pt(a)}L${pt(b)}" stroke="${T.plateHi}" stroke-opacity="${T.plateHiOp * 0.55}" stroke-width="${f(r * 0.2)}" stroke-linecap="round"/>`;
    }
    m += `</g><path d="${edge}" fill="none" ${edgeAttr}/>`;
    emit(m);
  }

  /**
   * Sleeve wedge: from the wrist (two 3D points across it) toward a 3D elbow,
   * clipped at the screen edge and flared there so it reads as a forearm
   * coming at the camera. Glove cuff with a wrist strap over the wrist; Modern
   * adds an emissive accent trim above it.
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
    emit(`<path d="M${pt(wa)}Q${pt(bowA)} ${pt(ea)}L${pt(eb)}Q${pt(bowB)} ${pt(wb)}Z" fill="${T.sleeve}" stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${real ? 0.3 : 0.6}" stroke-linejoin="round"/>`);
    const at = (s) => [lerp(wa, ea, s), lerp(wb, eb, s)];
    // Fabric folds bunching near the cuff.
    for (const s of PX >= 3 ? [trimAt + 0.16, trimAt + 0.3, trimAt + 0.48] : [trimAt + 0.3]) {
      const [a, b] = at(s);
      curve(lerp(a, b, 0.12), [lerp(a, b, 0.35)[0] - dir[0] * 3, lerp(a, b, 0.35)[1] - dir[1] * 3], lerp(a, b, 0.62), T.crease, 0.5, real ? 0.3 : 0.38);
    }
    const [t0a, t0b] = at(trimAt);
    const [t1a, t1b] = at(trimAt + 0.045);
    const s0 = lerp(lerp(t0a, t1a, 0.5), lerp(t0b, t1b, 0.5), 0.08);
    const s1 = lerp(lerp(t0a, t1a, 0.5), lerp(t0b, t1b, 0.5), 0.92);
    const sw = Math.max(0.4, Math.hypot(t1a[0] - t0a[0], t1a[1] - t0a[1]) * 0.28);
    if (real) {
      // A plain sewn band where Modern has its emissive trim.
      emit(`<path d="M${pt(t0a)}L${pt(t0b)}L${pt(t1b)}L${pt(t1a)}Z" fill="#1c1e1b" stroke="#000" stroke-opacity=".4" stroke-width=".25"/>`);
    } else {
      const [oa, ob] = wb[0] > wa[0] ? [wb, eb] : [wa, ea];
      stroke([lerp(oa, ob, 0.1), lerp(oa, ob, 0.95)], accent, 0.45, 0.5);
      emit(`<path d="M${pt(t0a)}L${pt(t0b)}L${pt(t1b)}L${pt(t1a)}Z" fill="${mix(accent, "#0a1420", 0.45)}" stroke="${INK}" stroke-width=".4"/>`);
      emit(`<path d="M${pt(s0)}L${pt(s1)}" stroke="${mix(accent, "#ffffff", 0.5)}" stroke-width="${f(sw)}" stroke-linecap="round"/>`);
      if (layer !== "body") {
        const prev = layer;
        sc.target("handGlow");
        sc.grow(sc.layers.handGlow, s0, 8);
        sc.grow(sc.layers.handGlow, s1, 8);
        emit(`<path d="M${pt(s0)}L${pt(s1)}" stroke="${accent}" stroke-width="${f(sw * 2.6)}" stroke-opacity=".7" stroke-linecap="round" filter="url(#vmBloom)"/>`);
        use(prev);
      }
    }
    // Glove cuff over the wrist end of the sleeve, closed by a wrist strap.
    const [c1a, c1b] = at(trimAt * 0.7);
    const ca = lerp(wa, ea, -0.03);
    const cb = lerp(wb, eb, -0.03);
    emit(`<path d="${roundPath([ca, cb, c1b, c1a], 0.18)}" fill="${T.cuff}" ${edgeAttr}/>`);
    const [sa, sb] = at(trimAt * 0.22);
    const [sa2, sb2] = at(trimAt * 0.52);
    const strap = [lerp(sa, sb, 0.02), lerp(sa, sb, 0.78), lerp(sa2, sb2, 0.8), lerp(sa2, sb2, 0.02)];
    emit(`<path d="${roundPath(strap, 0.3)}" fill="${T.pad}" stroke="${T.sh}" stroke-opacity=".55" stroke-width=".3"/>`);
    if (PX >= 3) {
      const w = Math.max(0.2, Math.hypot(sa2[0] - sa[0], sa2[1] - sa[1]) * 0.05);
      stroke([lerp(strap[0], strap[3], 0.2), lerp(strap[1], strap[2], 0.2)], T.seam, w, T.seamOp, stitch(w));
      stroke([lerp(strap[0], strap[3], 0.8), lerp(strap[1], strap[2], 0.8)], T.seam, w, T.seamOp, stitch(w));
    }
  }

  /** Soft contact shadow under a hand where it presses on the weapon. */
  function ao(c3, rmm, sy = 0.6) {
    const c = P(c3);
    const r = rmm * k(c3);
    emit(`<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(r)}" ry="${f(r * sy)}" fill="url(#vmAO)"/>`);
  }

  return { use, P, k, finger, mass, knuckleBumps, sleeve, ao, stroke, curve, silhouette, detailPx: PX, real };
}

// ---------------------------------------------------------------------------
// Poses. Grip g = { yTop, yBot, zfT, zbT, zfB, zbB, hw } (front/back z at top/bottom).
// ---------------------------------------------------------------------------

const gz = (g, y, side) => {
  const t = (g.yTop - y) / (g.yTop - g.yBot);
  return side === "front" ? g.zfT + (g.zfB - g.zfT) * t : g.zbT + (g.zbB - g.zbT) * t;
};

const centre = (poly) => poly.reduce((a, q) => [a[0] + q[0] / poly.length, a[1] + q[1] / poly.length], [0, 0]);

/** Push a convex screen polygon out from its centroid by `by` units. */
function dilate(poly, by) {
  const c = poly.reduce((a, q) => [a[0] + q[0] / poly.length, a[1] + q[1] / poly.length], [0, 0]);
  return poly.map(([x, y]) => {
    const l = Math.hypot(x - c[0], y - c[1]) || 1;
    return [x + ((x - c[0]) / l) * by, y + ((y - c[1]) / l) * by];
  });
}

/** Screen silhouette of the pistol grip post. */
function gripSilhouette(A, g) {
  const pts = [];
  for (const [y, zb, zf, w] of [[g.yTop, g.zbT, g.zfT, g.hw], [g.yBot, g.zbB, g.zfB, g.hw + 1]]) {
    for (const x of [-w, w]) for (const z of [zb, zf]) pts.push([x, y, z]);
  }
  return A.silhouette(pts);
}

/**
 * Which walked segments lie on a face drawn in front of the part. The camera
 * sits left of the gun, but the Modern composition cants it to show the right
 * flank and the back of the firing glove, so visibility is decided by that
 * stylised view rather than a strict face test: `test(nx, ny)` gets the mean
 * outward normal of each segment in the ring's plane.
 */
function nearSegments(pts, test) {
  const near = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const nx = pts[i].n[0] + pts[i + 1].n[0];
    const ny = pts[i].n[1] + pts[i + 1].n[1];
    const l = Math.hypot(nx, ny) || 1;
    near.push(test(nx / l, ny / l));
  }
  return near;
}
const RIGHT_FLANK = (nx) => nx > 0.35;

/**
 * A finger wrapped round the grip section at height y. It starts on the
 * `side` flank (+1 right, −1 left) `back` mm behind the front strap and walks
 * `L` (proximal, middle, distal mm) toward the front and round, `d` mm off the
 * surface, dropping `drop` mm per joint as fingers curl slightly downward.
 */
function gripFinger(g, { y, back, L, d, side = 1, drop = 1.6, lift = 2.2 }) {
  const zf = gz(g, y, "front");
  const zb = gz(g, y, "back");
  const rg = ring(-g.hw, g.hw, zb, zf, 5, d);
  const pts = walk(rg, [side * (g.hw + d), zf - back], L, side);
  const j3 = pts.map(({ p, n }, i) => [p[0] + (i === 0 ? n[0] * lift : 0), y - drop * i, p[1] + (i === 0 ? n[1] * lift : 0)]);
  return { j3, near: nearSegments(pts, RIGHT_FLANK) };
}

/** Back of the right glove, knuckles and fingers on a pistol grip; `between` paints after the wrapped fingers. */
function firingGlove(A, g, between, ads = false, thumb = true) {
  const { hw, yTop: yT } = g;
  const fr = (y) => gz(g, y, "front");
  const bk = (y) => gz(g, y, "back");
  const sil = gripSilhouette(A, g);
  // Hip cheat: the eye sees the back of the hand nearly edge-on, which drew it
  // as a long sliver down the grip. The wrist is swung out to the right so the
  // back of the hand opens toward the eye as a compact, hand-shaped wedge.
  const WU = ads ? [hw + 34, yT - 86, bk(yT) - 56] : [hw + 50, yT - 42, bk(yT) - 42];
  const WR = ads ? [hw + 2, yT - 74, bk(yT) - 66] : [hw + 30, yT - 76, bk(yT) - 50];

  // At ADS the arm drops straight down so the sleeve stays inside the weapon's silhouette.
  if (ads) A.sleeve(WR, WU, [hw + 50, yT - 340, bk(yT) - 190], { flare: 1.5 });
  else A.sleeve(WR, WU, [hw + 150, yT - 260, bk(yT) - 330], { flare: 2.1 });

  // Middle, ring, little: along the right flank, round the front strap, tips on the left.
  const rows = [
    { y: yT - 21, back: 31, L: [41, 25, 14], w: [17, 15.8, 14.4, 12.6] },
    { y: yT - 37.5, back: 30, L: [39, 24, 13], w: [16.2, 15, 13.8, 12.1] },
    { y: yT - 53, back: 27, L: [32, 20, 12], w: [14.4, 13.3, 12.2, 10.9] },
  ].map((row) => ({ ...row, ...gripFinger(g, { ...row, d: row.w[1] / 2 + 1 }) }));
  for (let i = rows.length - 1; i >= 0; i--) {
    const { j3, w, near } = rows[i];
    // On the sight line the grip is seen from behind: everything past its
    // silhouette is round the far side, so only what pokes out past its edge shows.
    A.finger(j3, w, { occluders: [sil], near: ads ? near.map(() => false) : near });
  }
  if (between) between(sil);
  // Thumb over the back strap and round the left side (long guns; sidearms
  // run it forward along the frame instead, see supportThumb).
  if (thumb) {
    const y = yT - 9;
    const zb = bk(y);
    const rg = ring(-hw, hw, zb, fr(y), 5, 9.5);
    const pts = walk(rg, [hw * 0.55, zb - 9.5], [29, 21], -1);
    const j3 = pts.map(({ p }, i) => [p[0], y + i * 1.5, p[1]]);
    // Shown where it crosses the back strap, hidden once it rounds to the left flank.
    A.finger(j3, [19.5, 17.5, 15.5], { occluders: [sil], near: nearSegments(pts, (nx, nz) => nz < -0.35), pad: false });
  }
  // Index laid straight along the frame, clear of the trigger.
  const I = [hw + 7.5, yT - 5, fr(yT - 5) - 28];
  const idx = [I, [hw + 4, yT - 3, g.zfT + 12], [hw + 3, yT - 3, g.zfT + 36], [hw + 2.5, yT - 3.5, g.zfT + 50]];
  A.finger(idx, [16.6, 15.2, 13.8, 12.2]);
  A.ao([hw + 6, yT - 30, fr(yT - 30) - 14], 30, 0.7);
  const [M, R, K] = rows.map((row) => row.j3[0]);
  const web = [hw * 0.25, yT + 1, bk(yT) - 5];
  // Sidearm at ADS: the web spans the back strap to the thumb root on the left,
  // so the back of the hand is a broad wedge rather than a pointed sliver.
  const webL = ads && !thumb ? [[-hw + 2, yT - 4, bk(yT) - 12], [-hw * 0.2, yT + 2, bk(yT) - 8]] : [];
  const fp = A.mass(ads ? [
    ...webL,
    web,
    [I[0] - 1, I[1] + 7, I[2] - 2],
    [M[0] + 4, M[1] + 3, M[2]],
    [R[0] + 4.5, R[1], R[2] - 1],
    [K[0] + 3.5, K[1] - 5, K[2] - 3],
    [K[0] + 10, K[1] - 22, K[2] - 26],
    WU,
    WR,
    [-2, yT - 26, bk(yT) - 22],
  ] : [
    web,
    [I[0] - 2, I[1] + 6, I[2] - 3],
    [M[0], M[1] + 3, M[2] - 1],
    [R[0], R[1], R[2] - 1],
    [K[0], K[1] - 4, K[2] - 2],
    [K[0] + 12, K[1] - 16, K[2] - 18],
    WR,
    WU,
    [hw + 24, yT - 5, bk(yT) - 20],
  ], {
    panel: 0.5,
    creases: [
      // Thumb web, then a tendon fold running back to the wrist.
      [web, [hw * 0.45, yT - 3, bk(yT) + 3], [I[0] - 4, I[1] + 2, I[2] - 6]],
    ],
  });
  A.knuckleBumps([K, R, M, I], [14.4, 16.2, 17, 16.6], centre(fp));
}

/** Firing hand alone on a long gun's pistol grip. */
export function firingHand(A, g, ads = false) {
  A.use("handR");
  firingGlove(A, g, null, ads);
}

/**
 * Both hands on a sidearm, cup grip: the support palm sits under the grip and
 * its fingers wrap the front over the firing fingers — tucked beneath the
 * firing glove's knuckles — while both thumbs lie forward along the left of
 * the frame (painted under the slide by `supportThumb`).
 */
export function sidearmGrip(A, g, ads = false) {
  A.use("handR");
  const { hw, yTop: yT, yBot: yB } = g;
  const fr = (y) => gz(g, Math.max(yB, y), "front");
  const WA = [-hw - 14, yB + 4, g.zbB - 36];
  const WB = [hw - 2, yB - 14, g.zbB - 44];
  if (ads) A.sleeve(WA, WB, [-hw - 30, yB - 340, g.zbB - 180], { flare: 1.5 });
  else A.sleeve(WA, WB, [-hw - 110, yB - 240, g.zbB - 320], { flare: 2 });
  // Support fingers: knuckles at the front-left corner, across the front
  // strap riding over the firing fingers, tips round onto the right side.
  const sil = gripSilhouette(A, g);
  const support = [
    { y: yT - 69, s: 0.86, w: [14, 13, 12, 10.8] },
    { y: yT - 55, s: 0.96, w: [15.8, 14.8, 13.6, 12] },
    { y: yT - 39.5, s: 1, w: [16.4, 15.3, 14, 12.4] },
    { y: yT - 24, s: 0.96, w: [16, 14.8, 13.6, 12.2] },
  ].filter((row) => row.y - 8 >= yB).map(({ y, s, w }) => {
    const z = fr(y);
    if (ads) {
      // Seen from behind the knuckles stand proud of the left flank and the
      // fingers, pressed together, roll forward round the front-left corner
      // and out of sight behind the grip; only the tips reappear on the right.
      const ww = w.map((v) => v * 1.12);
      const j3 = [
        [-hw - 15, y + 2, z - 26 * s],
        [-hw - 6.5, y + 0.5, z + 8],
        [-hw + 6, y - 0.5, z + 24],
        [hw - 1, y - 1.5, z + 24],
      ];
      return { w: ww, j3, near: [false, false, false] };
    }
    const j3 = [
      [-hw - 10, y + 1, z - 10 * s],
      [-hw + 3, y, z + 24],
      [hw - 3, y - 1, z + 25],
      [hw - 3 + 16 * s, y - 2, z + 25 - 13 * s],
    ];
    return { w, j3, near: [false, false, true] };
  });
  for (const { j3, w, near } of support) A.finger(j3, w, { occluders: [sil], near });
  // Back of the support hand over the left of the grip, its knuckle line at
  // the front-left corner covering the finger roots.
  const top = support[support.length - 1].j3[0];
  const low = support[0].j3[0];
  if (ads) {
    // From behind: the heel of the palm over the lower back strap, the back of
    // the hand sloping down-left to the wrist, its outline ending at the knuckles.
    const bk = (y) => gz(g, y, "back");
    const sp = A.mass([
      [-hw + 3, yT - 18, bk(yT - 18) - 6],
      [top[0] + 3, top[1] + 6, top[2] - 5],
      ...support.slice().reverse().map(({ j3 }) => [j3[0][0] + 1.5, j3[0][1], j3[0][2] - 2]),
      [low[0] + 2, low[1] - 7, low[2] - 8],
      [-hw - 2, yB + 1, fr(yB + 6) - 8],
      [4, yB - 7, (g.zbB + g.zfB) / 2 + 8],
      [hw + 8, yB - 9, g.zfB - 8],
      WB,
      WA,
    ], { panel: 0.5 });
    A.knuckleBumps(support.map(({ j3 }) => j3[0]), support.map(({ w }) => w[0]), centre(sp));
  } else A.mass([
    [-hw - 7, yT - 14, g.zbT + 6],
    [top[0] - 3, top[1] + 8, top[2] - 6],
    ...support.slice().reverse().map(({ j3 }) => [j3[0][0] - 4, j3[0][1], j3[0][2] - 3]),
    [low[0] - 2, low[1] - 8, low[2] - 8],
    [-hw - 4, yB + 2, fr(yB + 6) - 6],
    [4, yB - 7, (g.zbB + g.zfB) / 2 + 8],
    [hw + 8, yB - 9, g.zfB - 8],
    WB,
    WA,
    [-hw - 14, yT - 50, g.zbT - 20],
  ], { panel: 0.5 });
  firingGlove(A, g, () => {
    // The fingertips come round the right side over the firing fingers.
    if (!ads) for (const { j3, w, near } of support) A.finger(j3, w, { near, onlyNear: true });
  }, ads, false);
}

/** Both thumbs forward along the left of a sidearm frame; paint before the slide. */
export function supportThumb(A, g) {
  A.use("body");
  const { hw, yTop: yT } = g;
  const sil = gripSilhouette(A, g);
  // The frame above the grip hides whatever of the thumbs lies behind it.
  const frame = A.silhouette([-hw + 1.5, hw - 1.5].flatMap((x) => [yT - 2, yT + 12].flatMap((y) => [g.zbT, g.zfT + 110].map((z) => [x, y, z]))));
  // The left flank faces away in the canted view: only what pokes past the frame shows.
  const near = [false, false, false];
  A.finger([[-hw - 9, yT - 19, g.zbT - 12], [-hw - 10.5, yT - 8, g.zbT + 14], [-hw - 9.5, yT - 5, g.zfT + 8], [-hw - 8, yT - 5, g.zfT + 30]], [20.5, 17.5, 15.5, 14], { occluders: [sil, frame], near, pad: false });
  A.finger([[-hw + 1, yT - 5, g.zbT - 14], [-hw - 7.5, yT + 1.5, g.zbT + 12], [-hw - 8.5, yT + 3.5, g.zbT + 40], [-hw - 7.5, yT + 3.5, g.zbT + 60]], [20, 17.5, 15.8, 14.4], { occluders: [sil, frame], near, pad: false });
}

/**
 * Long-gun support thumb, body-layer hook kept for the weapon builders. The
 * near flank faces the eye, so the thumb lies in front of it and is painted
 * with the rest of the support hand in `clampHand`; tucking it behind the
 * handguard only left its tip sticking up over the top like a fin.
 */
export function clampThumb() {}

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
  const WA = [-hw - 18, y0 - 20, zc - 78];
  const WB = [hw + 8, y0 - 34, zc - 68];
  if (ads) A.sleeve(WA, WB, [-hw - 20, y0 - 420, zc - 220], { flare: 1.4 });
  else A.sleeve(WA, WB, [-hw - 230, y0 - 200, zc - 420], { flare: 2.3 });
  // Thumb along the near flank, pointing forward; the palm painted next hides its root.
  const h = y1 - y0;
  // Height changes are not foreshortened along the barrel, so it barely rises.
  A.finger([
    [-hw * 0.35, y0 - 13, zc - 38],
    [-hw - 7, y0 + Math.min(6, h * 0.14), zc - 16],
    [-hw - 7.5, y0 + Math.min(11, h * 0.24), zc + 14],
    [-hw - 7, y0 + Math.min(14, h * 0.3), zc + 40],
  ], [21, 18.5, 16.5, 14.6], { pad: false });
  A.mass([
    [hw + 4, y0 - 5, zc + 40],
    [hw + 12, y0 - 7, zc - 22],
    WB,
    WA,
    [-hw - 12, y0 - 6, zc - 30],
    [-hw - 6, y0 - 3, zc + 26],
  ], { panel: 0.45 });
  A.ao([0, y0 - 1, zc + 6], 26, 0.45);
  // Fingers from under the handguard, round its lower far edge and up the far
  // flank, which faces away from the eye: seen along the barrel they vanish
  // behind the handguard (its silhouette is dilated by about a finger radius,
  // or their thickness pokes past the edge as a thin blade). Farthest (index)
  // first so nearer ones overlap if a camera ever shows them.
  const c = Math.min(8, (y1 - y0) * 0.2);
  const sil = dilate(A.silhouette([-hw, hw].flatMap((x) => [y0, y1].flatMap((y) => [zc - 70, zc + 70].map((z) => [x, y, z])))), 11 * A.k([hw, y1, zc]));
  const small = A.k([0, y0, zc]) * 9 * A.detailPx < 18;
  const rows = [
    { z: zc + 36, L: [40, 24, 15], w: [16.2, 15, 13.8, 12.2] },
    { z: zc + 16, L: [43, 26, 16], w: [16.8, 15.6, 14.3, 12.6] },
    { z: zc - 3, L: [40, 25, 15], w: [16, 14.8, 13.6, 12.1] },
    { z: zc - 21, L: [33, 21, 13], w: [14.2, 13.2, 12.2, 10.8] },
  ];
  for (const { z, L, w } of small ? rows.slice(0, 3) : rows) {
    // Pressed into the glove against the handguard.
    const d = w[1] * 0.42;
    const rg = ring(-hw, hw, y0, y1, c, d);
    // Aim the fingertip two thirds up the far flank, then find where the
    // knuckle must sit under the handguard to get there (never past its middle).
    const total = L[0] + L[1] + L[2];
    let start = walk(rg, [hw + d, y0 + (y1 - y0) * 0.66], [total], -1)[1].p;
    if (start[1] < y0 && start[0] < -hw * 0.1) start = [-hw * 0.1, y0 - d];
    const pts = walk(rg, start, L, 1);
    A.finger(pts.map(({ p }, i) => [p[0], p[1], z - i * 1.2]), w, { occluders: [sil], near: [false, false, false] });
  }
}
