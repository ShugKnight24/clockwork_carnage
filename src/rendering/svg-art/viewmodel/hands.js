/**
 * Gloved viewmodel hands and arms, drawn from the articulated hands of
 * ./hand-rig.js through the weapon scene's projection.
 *
 * Every phalanx is its own tapered capsule — its back padded out, its grip
 * side flattened — with cylindrical key-light shading, joint creases and the
 * glove's dress (./gloves.js: pads, plates, stitching, bindings, bare or
 * padded fingertips). The palm is one padded mass whose outline bumps over
 * the knuckles, with the glove's back-of-hand panel, tendons and wrist fold.
 * Parts are painter-sorted by depth wherever they overlap on screen, and any
 * part behind a weapon part (the grip, frame, receiver, trigger) is clipped
 * to that part's silhouette with a soft contact shade at its edge.
 *
 * Arms are 3D too: a forearm of flattened oval rings swelling at the muscle,
 * dressed in the suit's sleeve (./sleeves.js) with folds, trims and plates
 * wrapped round it in perspective, and the glove's cuff ringed round the
 * wrist with its fastening. Modern keeps an ink outline and lights emissive
 * trim in the hand bloom layer; Realistic (`sc.real`) has soft edges and no
 * emissive. The low tier (`sc.detailPx` < 3) drops the fine lines.
 *
 * Poses (bottom of the file): both hands on a sidearm, the firing hand on a
 * long gun's pistol grip, and the long-gun support hand under the handguard.
 */

import { INK, f, mix } from "./geom.js";
import { STANDARD_GLOVE } from "./gloves.js";
import { fpSleeve, STANDARD_FRAME } from "./sleeves.js";
import {
  sub as sub3, madd as madd3, mul as mul3, dot as dot3, cross as cross3, len as len3, norm as norm3, mix3,
  hides, gripHand, cupHand, handguardHand, gripOccluder, gripZ, turnHand, settleHand, twoBone,
} from "./hand-rig.js";
import { lerpPoint as lerp } from "../../../utils/math.js";

const pt = ([x, y]) => `${f(x)},${f(y)}`;
// How far past the screen edge sleeves run (viewmodel units from centre): covers
// the rig's bob, kick and sway.
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

/** Hand drawing kit bound to a scene (see geom.createScene). */
/** Arm proportions for a big gloved hand (mm): wrist to elbow, elbow to shoulder. */
const FOREARM = 255;
const UPPER_ARM = 300;
/** The right shoulder relative to the eye (mm: right, up, ahead); the left mirrors it. */
const SHOULDER = [170, -250, -40];

export function createHandArt(sc) {
  const { accent, P, k } = sc;
  const real = !!sc.real;
  // The suit's glove (./gloves.js): its tones and dress over the same hand.
  const T = (sc.glove || STANDARD_GLOVE)[real ? "real" : "modern"];
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
  const emit = (m) => {
    // Hand art under a weapon part (a sidearm's thumbs, an aimed long gun's
    // support hand) makes the body layer depend on the glove (viewmodels.js).
    if (layer === "body") sc.handInBody = true;
    sc.emit(m);
  };
  // Emissive glove light goes in the hand bloom layer, Modern only; under a
  // weapon part it would bloom through the part, so it is left off there.
  const glowing = () => !real && layer !== "body";
  function bloom(markup, pts2, pad = 6) {
    const prev = layer;
    sc.target("handGlow");
    for (const p of pts2) sc.grow(sc.layers.handGlow, p, pad);
    sc.emit(markup);
    use(prev);
  }
  const edgeAttr = `stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${T.edgeW}" stroke-linejoin="round"`;

  const line = (pts2, color = INK, w = 0.3, op = 0.55, extra = "") =>
    `<path d="M${pts2.map(pt).join("L")}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  function stroke(pts2, color = INK, w = 0.3, op = 0.55, extra = "") {
    emit(line(pts2, color, w, op, extra));
  }

  const stitch = (w) => ` stroke-dasharray="${f(Math.max(0.5, w * 2.4))} ${f(Math.max(0.35, w * 1.6))}"`;

  /** Screen silhouette of a solid given as 3D points (for occlusion clips). */
  const silhouette = (pts3) => hull2(pts3.map(P));

  /**
   * What a glove wears on the back of the hand, inside its panel `inner`
   * (centre c, line width w, clipped to `clip`): tendon stitching, a riveted gear, a piston, a
   * binding's turns, and an LED trace or a rune that Modern lights in the
   * hand bloom layer. Laid out along the panel's long axis, which runs from
   * the wrist to the knuckles in every pose.
   */
  function backDress(B, inner, c, w, clip) {
    let a = inner[0];
    let b = inner[1];
    let far = 0;
    for (const q of inner) {
      for (const s of inner) {
        const dd = Math.hypot(q[0] - s[0], q[1] - s[1]);
        if (dd > far) [far, a, b] = [dd, q, s];
      }
    }
    const ax = [(b[0] - a[0]) / far, (b[1] - a[1]) / far];
    const nx = [-ax[1], ax[0]];
    // Half the panel's width across the axis.
    const half = Math.max(...inner.map((q) => Math.abs((q[0] - c[0]) * nx[0] + (q[1] - c[1]) * nx[1]))) || far * 0.25;
    const at = (t, s) => [a[0] + ax[0] * far * t + nx[0] * half * s, a[1] + ax[1] * far * t + nx[1] * half * s];
    let m = "";
    if (B.rays) {
      for (const s of [-0.42, 0, 0.42]) {
        m += line([at(B.rays.from ?? 0.24, s), at(0.82, s * 1.1)], B.rays.color, w * 1.3, B.rays.op, B.rays.dash ? stitch(w * 1.3) : "");
      }
    }
    if (B.turns) {
      for (const t of [0.3, 0.5, 0.7]) m += line([at(t - 0.04, -0.85), at(t + 0.04, 0.85)], B.turns, w * 2.2, 0.85);
    }
    if (B.piston) {
      // A rod from the wrist to the knuckles in a cylinder, pinned at both ends.
      const [p0, p1] = [at(0.3, 0.35), at(0.72, 0.35)];
      const t = half * 0.2;
      m += line([p0, lerp(p0, p1, 0.55)], T.edge, t + w * 2, T.edgeOp) + line([p0, lerp(p0, p1, 0.55)], B.piston, t, 1);
      m += line([lerp(p0, p1, 0.5), p1], T.edge, t * 0.5 + w * 2, T.edgeOp) + line([lerp(p0, p1, 0.5), p1], "#c8d2dc", t * 0.5, 1);
      for (const q of [p0, p1]) m += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(t * 0.7)}" fill="${B.piston}" stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${f(w)}"/>`;
    }
    if (B.stud) {
      // A small gear riveted on, its teeth round a hub.
      const [x, y] = at(0.45, 0);
      const R = half * 0.42;
      let d = "";
      for (let i = 0; i < 16; i++) {
        const t = (i * Math.PI) / 8;
        const rr = i % 2 ? R * 0.78 : R;
        d += `${i ? "L" : "M"}${pt([x + Math.cos(t) * rr, y + Math.sin(t) * rr])}`;
      }
      m += `<path d="${d}Z" fill="${B.stud.fill}" stroke="${B.stud.ink}" stroke-width="${f(w)}" stroke-linejoin="round"/>`;
      m += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.32)}" fill="${B.stud.ink}"/>`;
    }
    const lit = (d, ink, wd, pts2) => {
      m += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${f(wd * 1.8)}" stroke-opacity=".9" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (!glowing()) return;
      m += `<path d="${d}" fill="none" stroke="${mix(accent, "#ffffff", 0.35)}" stroke-width="${f(wd * 0.8)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      // Its light stays on the hand too (the hand bloom layer is drawn over everything).
      const id = `hc${clipSeq++}`;
      bloom(`<clipPath id="${id}"><path d="${clip}"/></clipPath><g clip-path="url(#${id})"><path d="${d}" fill="none" stroke="${accent}" stroke-width="${f(wd * 2.6)}" stroke-opacity=".75" stroke-linecap="round" stroke-linejoin="round" filter="url(#vmBloom)"/></g>`, pts2, 6);
    };
    if (B.trace) {
      // The LED trace: a circuit run toward the knuckles, ending in a pad.
      const q = [at(0.2, 0.3), at(0.48, 0.3), at(0.62, -0.25), at(0.84, -0.25)];
      const end = q[q.length - 1];
      lit(`M${q.map(pt).join("L")}M${pt(end)}h.01`, B.trace, w * 2.6, q);
    }
    if (B.rune) {
      // The rune (RUNES[2] in ../wardrobe-themes/chronomancer.js), upright on the hand.
      const [x, y] = at(0.5, 0);
      const s = half * 0.38;
      const g = [[-1.2, 1.4], [0, -1.4], [1.2, 1.4], [-0.6, 0.2], [0.6, 0.2]].map(([u, v]) => [x + u * s, y + v * s]);
      lit(`M${pt(g[0])}L${pt(g[1])}L${pt(g[2])}M${pt(g[3])}L${pt(g[4])}`, B.rune, w * 2.6, g);
    }
    return m;
  }

  /**
   * The stitched padding panel (or a glove's plate) inside the screen outline
   * `p` of the back of the hand, `panel` of the way from its centre, with the
   * glove's back-of-hand dress. Nothing when the hand is too small to read it.
   */
  function backPanel(p, panel, palm = false, min = 90) {
    let m = "";
    const span = Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0]));
    if (panel && span * PX >= min) {
      // Stitched padding panel over the metacarpals.
      const c = p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
      const inner = p.map((q) => lerp(c, q, panel));
      const w = Math.max(0.16, span * 0.004);
      // The glove's dress on the back of the hand; a palm shows none of it.
      const B = palm ? null : T.back;
      if (B?.panel) {
        // A steel plate in place of the padding, lit along its upper edge.
        m += `<path d="${roundPath(inner, 0.3)}" fill="${B.panel.fill}" stroke="${T.edge}" stroke-opacity="${T.edgeOp * 0.8}" stroke-width="${f(w * 1.6)}"/>`;
        let best = 0;
        let top = -Infinity;
        inner.forEach((q, i) => {
          const n = inner[(i + 1) % inner.length];
          const s = ((q[0] + n[0]) / 2 - c[0]) * LS[0] + ((q[1] + n[1]) / 2 - c[1]) * LS[1];
          if (s > top) [top, best] = [s, i];
        });
        const e0 = lerp(c, inner[best], 0.9);
        const e1 = lerp(c, inner[(best + 1) % inner.length], 0.9);
        m += `<path d="M${pt(e0)}L${pt(e1)}" stroke="${B.panel.hi}" stroke-opacity="${T.plateHiOp}" stroke-width="${f(w * 2.4)}" stroke-linecap="round"/>`;
      } else if (T.pad) {
        m += `<path d="${roundPath(inner, 0.45)}" fill="${T.pad}" fill-opacity=".5" stroke="${T.sh}" stroke-opacity=".5" stroke-width="${f(w * 1.4)}"/>`;
      }
      if (!B?.panel && T.seamRing !== false) {
        m += `<path d="${roundPath(p.map((q) => lerp(c, q, panel + 0.07)), 0.45)}" fill="none" stroke="${T.seam}" stroke-opacity="${T.seamOp}" stroke-width="${f(w)}"${stitch(w)}/>`;
      }
      if (B) {
        // Kept inside the panel: a narrow panel's long axis can run past its sides.
        const clip = roundPath(p.map((q) => lerp(c, q, panel + 0.12)), 0.45);
        const id = `hc${clipSeq++}`;
        const dress = backDress(B, inner, c, w, clip);
        if (dress) m += `<clipPath id="${id}"><path d="${clip}"/></clipPath><g clip-path="url(#${id})">${dress}</g>`;
      }
    }
    return m;
  }

  // ── Articulated hands (./hand-rig.js) ─────────────────────────────────────

  const eye = sc.view;
  const KEY = sc.KEY;
  const clipId = () => `hc${clipSeq++}`;
  const clipped = (d, inner) => {
    const id = clipId();
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
  };

  /**
   * One hand part as drawn: a capsule round a 3D bone, projected, with its
   * screen axis (u), its normal (v), and a point `on(t, s)` t along the bone
   * and s radii off its axis.
   */
  function cap2(c) {
    const a = P(c.a);
    const b = P(c.b);
    const ra = c.ra * k(c.a);
    const rb = c.rb * k(c.b);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-3;
    const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    const v = [-u[1], u[0]];
    const on = (t, s = 0) => {
      const r = ra + (rb - ra) * t;
      return [a[0] + (b[0] - a[0]) * t + v[0] * r * s, a[1] + (b[1] - a[1]) * t + v[1] * r * s];
    };
    return { ...c, a2: a, b2: b, ra2: ra, rb2: rb, l, u, v, on };
  }

  /**
   * Tapered capsule outline (the two circles' outer tangents and arcs),
   * shifted by `dx`. `bulge` [+v side, −v side] bows each side out (+) or
   * in (−) by that many radii at its middle: a glove's padded back and its
   * flattened grip side, rather than a uniform tube.
   */
  function capPath(c, dx = [0, 0], bulge = null) {
    const a = [c.a2[0] + dx[0], c.a2[1] + dx[1]];
    const b = [c.b2[0] + dx[0], c.b2[1] + dx[1]];
    const { ra2: ra, rb2: rb, l, u, v } = c;
    if (l <= Math.abs(ra - rb) + 1e-3) {
      const [o, r] = ra >= rb ? [a, ra] : [b, rb];
      return `M${pt([o[0] + r, o[1]])}A${f(r)} ${f(r)} 0 1 0 ${pt([o[0] - r, o[1]])}A${f(r)} ${f(r)} 0 1 0 ${pt([o[0] + r, o[1]])}Z`;
    }
    const ct = (ra - rb) / l;
    const st = Math.sqrt(1 - ct * ct);
    const dir = (s) => [u[0] * ct + v[0] * st * s, u[1] * ct + v[1] * st * s];
    const at = (o, r, s) => [o[0] + dir(s)[0] * r, o[1] + dir(s)[1] * r];
    // Around the far circle through +u, then back round the near one: both arcs turn the same way.
    const side = (p, q, sgn) => {
      if (!bulge) return `L${pt(q)}`;
      const k2 = bulge[sgn > 0 ? 0 : 1] * (ra + rb);
      return `Q${pt([(p[0] + q[0]) / 2 + v[0] * k2 * sgn, (p[1] + q[1]) / 2 + v[1] * k2 * sgn])} ${pt(q)}`;
    };
    return `M${pt(at(a, ra, 1))}${side(at(a, ra, 1), at(b, rb, 1), 1)}A${f(rb)} ${f(rb)} 0 ${ct < 0 ? 1 : 0} 0 ${pt(at(b, rb, -1))}` +
      `${side(at(b, rb, -1), at(a, ra, -1), -1)}A${f(ra)} ${f(ra)} 0 ${ct > 0 ? 1 : 0} 0 ${pt(at(a, ra, 1))}Z`;
  }

  /** Distance from the eye to the near surface of a capsule t along its bone. */
  const depthAt = (c, t) => len3(sub3(mix3(c.a, c.b, t), eye)) - (c.ra + (c.rb - c.ra) * t);

  /**
   * Does capsule A cover capsule B where they overlap on screen? Positive:
   * A is in front; negative: behind; 0: they do not overlap.
   */
  function capVote(A, B) {
    let v = 0;
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const q = B.on(t);
      const rq = B.ra2 + (B.rb2 - B.ra2) * t;
      const w = [q[0] - A.a2[0], q[1] - A.a2[1]];
      const ta = Math.max(0, Math.min(1, (w[0] * A.u[0] + w[1] * A.u[1]) / A.l));
      const p = A.on(ta);
      const ra = A.ra2 + (A.rb2 - A.ra2) * ta;
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) > ra + rq * 0.5) continue;
      const dd = depthAt(B, t) - depthAt(A, ta);
      if (Math.abs(dd) > 0.4) v += Math.sign(dd);
    }
    return v;
  }

  /**
   * Which of the weapon's parts hide this item, and where: for each occluder
   * the item's silhouette is clipped outside of, the pieces of it that lie in
   * front (kept whole). Tested at the near surface of each capsule.
   */
  function occlusion(it, occluders) {
    const out = [];
    for (const occ of occluders) {
      const keep = [];
      let hidden = 0;
      let seen = 0;
      for (const c of it.caps) {
        // Sampled across the capsule's face toward the eye: at points along
        // its axis, its centre line and lines round it on the near surface.
        // Runs of samples the eye really sees are kept in front of the part as
        // smooth strips, so where a hand passes behind a receiver's or grip's
        // edge the edge cuts it cleanly, rather than whole discs of glove
        // showing over the part or a bitten outline along the cut.
        const ts = Array.from({ length: 21 }, (_, i) => i / 20);
        const lines = Array.from({ length: 13 }, () => []);
        for (const t of ts) {
          const p = mix3(c.a, c.b, t);
          const r = c.ra + (c.rb - c.ra) * t;
          const toEye = norm3(sub3(eye, p));
          const e1 = norm3(Math.abs(toEye[1]) < 0.9 ? [toEye[2], 0, -toEye[0]] : [0, -toEye[2], toEye[1]]);
          const e2 = cross3(toEye, e1);
          for (let q = 0; q < 13; q++) {
            const rho = q === 0 ? 0 : r * (q % 2 ? 0.72 : 0.4);
            const ang = (q * Math.PI) / 6;
            const off = q === 0 ? [0, 0, 0] : madd3(mul3(e1, Math.cos(ang) * rho), e2, Math.sin(ang) * rho);
            const at = madd3(madd3(p, toEye, Math.sqrt(Math.max(0, r * r - rho * rho)) * 0.85), off, 1);
            const ok = !hides(occ, eye, at);
            if (ok) seen++;
            else hidden++;
            // Kept (drawn over the part) only where it really lies in front of
            // it, inside its outline: a patch kept just outside would bite
            // notches into the part's edge where the hand passes behind it.
            lines[q].push({ at, r: r * 0.34, ok: ok && inPoly(P(at), occ.sil ??= silhouette(occ.pts)) });
          }
        }
        for (const line of lines) {
          let run = null;
          const flush = () => {
            if (run) keep.push(capPath(cap2({ a: run[0].at, b: run[run.length - 1].at, ra: run[0].r, rb: run[run.length - 1].r })));
            run = null;
          };
          for (const s of line) {
            if (s.ok) (run ??= []).push(s);
            else flush();
          }
          flush();
        }
      }
      if (!hidden) continue;
      if (!occ.sil) occ.sil = silhouette(occ.pts);
      out.push({ sil: occ.sil, keep: seen ? keep : [] });
    }
    return out;
  }

  /** Is screen point q inside polygon poly (even-odd)? */
  function inPoly(q, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > q[1] !== yj > q[1] && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /** Clip markup to the outside of each occluder (bar the pieces kept), with a soft contact shade at its edge. */
  function hide(markup, occ, shape, r) {
    let m = markup;
    for (const { sil, keep } of occ) {
      const silD = `M${sil.map(pt).join("L")}Z`;
      // Where the part passes behind the edge it darkens, rather than ending in a hard cut.
      const mid = `hm${clipSeq++}`;
      m += `<mask id="${mid}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000"><path d="${shape}" fill="#fff"/>` +
        keep.map((d) => `<path d="${d}" fill="#000"/>`).join("") + `</mask>` +
        `<path d="${silD}" mask="url(#${mid})" fill="none" stroke="#000" stroke-opacity="${real ? 0.7 : 0.55}" stroke-width="${f(r * 1.1)}" stroke-linejoin="round" filter="url(#vmSoft)"/>`;
      const id = clipId();
      m = `<clipPath id="${id}"><path d="M-500,-500L500,-500L500,500L-500,500Z${silD}" clip-rule="evenodd"/>` +
        keep.map((d) => `<path d="${d}"/>`).join("") + `</clipPath><g clip-path="url(#${id})">${m}</g>`;
    }
    return m;
  }

  /**
   * Shading of a lit capsule: the side turned from the key light falls into
   * the glove's shade, the side turned to it catches a matte sheen. Returns
   * [screen direction toward the lit side, contrast 0..1, facing light 0..1].
   */
  function litSide(c) {
    const mid = mix3(c.a, c.b, 0.5);
    const ax = norm3(sub3(c.b, c.a));
    const view = norm3(sub3(mid, eye));
    let sn = cross3(ax, view);
    if (len3(sn) < 1e-6) sn = [0, 1, 0];
    sn = norm3(sn);
    const s2 = P(madd3(mid, sn, 5));
    const m2 = P(mid);
    const sgn = Math.sign((s2[0] - m2[0]) * c.v[0] + (s2[1] - m2[1]) * c.v[1]) || 1;
    const L = dot3(sn, KEY);
    const toLit = L >= 0 ? sgn : -sgn;
    const front = norm3(sub3(mul3(ax, dot3(view, ax)), view));
    return [[c.v[0] * toLit, c.v[1] * toLit], Math.min(1, Math.abs(L) * 1.3), dot3(front, KEY)];
  }

  /** Where a 3D direction off a capsule's axis lands across it on screen (−1..1), and whether it faces the eye. */
  function across(c, n3, t = 0.5) {
    const p = mix3(c.a, c.b, t);
    const r = c.ra + (c.rb - c.ra) * t;
    const q = P(madd3(p, n3, r));
    const o = P(p);
    const rr = c.ra2 + (c.rb2 - c.ra2) * t;
    const s = ((q[0] - o[0]) * c.v[0] + (q[1] - o[1]) * c.v[1]) / (rr || 1);
    return { s: Math.max(-1, Math.min(1, s)), facing: dot3(n3, norm3(sub3(eye, p))) };
  }

  /** A strip lying on the bone's surface between angles off the dorsal line, as screen offsets s0..s1. */
  const band = (s, half) => {
    const phi = Math.asin(s);
    return [Math.sin(Math.max(-Math.PI / 2, phi - half)), Math.sin(Math.min(Math.PI / 2, phi + half))];
  };

  /** One phalanx: tapered capsule, its glove dress, cylindrical shade, joint creases and outline. */
  function drawSegment(it) {
    const { dg, i } = it;
    const c = it.caps[0];
    const last = i === dg.j.length - 2;
    const isThumb = dg.id === "thumb";
    const n3 = norm3(mix3(dg.n[i], dg.n[i + 1], 0.5));
    const back = across(c, n3);
    const big = (r) => r * PX;
    // The back of the phalanx swells, its grip side flattens, by how square on each side is.
    const w = Math.abs(back.s);
    const bulge = back.s >= 0 ? [0.06 + 0.06 * w, -0.04 - 0.08 * w] : [-0.04 - 0.08 * w, 0.06 + 0.06 * w];
    const d = capPath(c, [0, 0], bulge);
    let m = `<path d="${d}" fill="${T.base}"/>`;
    const quad = (t0, t1, s0, s1) => [c.on(t0, s0), c.on(t1, s0), c.on(t1, s1), c.on(t0, s1)];
    // The fingertip past `at`: bare skin past a fingerless glove's cut, or a grip pad.
    let hem = null;
    if (T.tip && last) {
      const at = T.tip.at;
      const o = c.on(at);
      const R = (c.ra2 + c.rb2) * 3;
      const poly = [[-1, 0], [1, 0], [1, 2], [-1, 2]].map(([s, t]) => [o[0] + c.v[0] * R * s + c.u[0] * R * t, o[1] + c.v[1] * R * s + c.u[1] * R * t]);
      m += `<path d="M${poly.map(pt).join("L")}Z" fill="${T.tip.skin ?? T.tip.fill}"/>`;
      if (T.tip.hem) hem = at;
    }
    const [toLit, contrast, face] = litSide(c);
    const sgnLit = Math.sign(toLit[0] * c.v[0] + toLit[1] * c.v[1]) || 1;
    // On the back of the finger, when it faces the eye: steel plates, padded knuckles, a seam or gloss line, a binding.
    if (back.facing > 0.05 && big(c.ra2) >= 9) {
      const [s0, s1] = band(back.s, 0.62);
      const plate = (t0, t1, fill) => {
        m += `<path d="${roundPath(quad(t0, t1, s0, s1), 0.3)}" fill="${fill}" stroke="${T.edge}" stroke-opacity="${T.edgeOp * 0.8}" stroke-width="${f(Math.max(0.16, c.ra2 * 0.05))}"/>`;
        if (T.plates && big(c.ra2) >= 12) {
          const s = s0 + (s1 - s0) * 0.3;
          m += `<path d="M${pt(c.on(t0 + 0.08, s))}L${pt(c.on(t1 - 0.08, s))}" stroke="${T.plates.hi}" stroke-opacity="${T.plates.hiOp}" stroke-width="${f(c.ra2 * 0.09)}" stroke-linecap="round"/>`;
        }
      };
      if (T.plates && !isThumb) plate(i ? 0.16 : 0.26, last ? 0.62 : 0.84, T.plates.fill);
      else if (isThumb && i === 0 && T.thumbPlate) plate(0.2, 0.84, T.thumbPlate);
      if (T.pad && !T.plates && i === 0) {
        const padAt = (t0, t1, half) => {
          const [p0, p1] = band(back.s, half);
          m += `<path d="${roundPath(quad(t0, t1, p0, p1), 0.45)}" fill="${T.pad}" stroke="${T.sh}" stroke-opacity=".5" stroke-width="${f(Math.max(0.18, c.ra2 * 0.05))}"/>`;
          if (big(c.ra2) >= 14) {
            const s = p0 + (p1 - p0) * (sgnLit > 0 ? 0.78 : 0.22);
            m += `<path d="M${pt(c.on(t0 + 0.06, s))}L${pt(c.on(t1 - 0.06, s))}" stroke="${T.hi}" stroke-opacity="${f(T.hiOp * 1.4)}" stroke-width="${f(c.ra2 * 0.08)}" stroke-linecap="round"/>`;
          }
        };
        if (isThumb) padAt(0.18, 0.8, 0.55);
        else {
          // Padded knuckles: a pad over the MCP and a smaller one over the PIP.
          padAt(0.04, 0.34, 0.62);
          padAt(0.7, 0.96, 0.5);
        }
      }
      if (T.along) {
        const s = back.s + (T.along.side || 0) * 0.5;
        const t1 = last ? (T.tip ? T.tip.at * 0.7 : 0.75) : 1;
        if (!(T.tip && last && T.tip.at < 0.2)) {
          const w = Math.max(0.16, c.rb2 * 0.06);
          m += line([c.on(i ? 0 : 0.2, s), c.on(t1, s)], T.along.color, w, T.along.op, T.along.dash ? stitch(w) : "");
        }
      }
    }
    if (T.turns && !(last && T.tip) && big(c.ra2) >= 9) {
      for (const t of [0.32, 0.7]) m += `<path d="M${pt(c.on(t, 1))}Q${pt(c.on(t + 0.12, 0))} ${pt(c.on(t, -1))}" fill="none" stroke="${T.turns}" stroke-opacity=".85" stroke-width="${f(Math.max(0.16, c.ra2 * 0.08))}" stroke-linecap="round"/>`;
    }
    // Shade: the cylinder's dark side, then a sheen on the lit side, as strips
    // along the bone (run past its ends; the capsule clips them round).
    const sh = (c.ra2 + c.rb2) / 2;
    const sgn = sgnLit;
    const strip = (s0, s1) => {
      const ts = [-0.7, 0, 0.5, 1, 1.7];
      const at = (t, s) => {
        const r = c.ra2 + (c.rb2 - c.ra2) * Math.max(0, Math.min(1, t));
        return [c.a2[0] + (c.b2[0] - c.a2[0]) * t + c.v[0] * r * s, c.a2[1] + (c.b2[1] - c.a2[1]) * t + c.v[1] * r * s];
      };
      return `M${[...ts.map((t) => at(t, s0 * sgn)), ...ts.reverse().map((t) => at(t, s1 * sgn))].map(pt).join("L")}Z`;
    };
    m += `<path d="${strip(-1.8, -0.45 + contrast * 0.25)}" fill="${T.sh}" fill-opacity="${f(T.shOp * (0.7 + contrast * 0.3))}"/>`;
    if (face < -0.1) m += `<path d="${d}" fill="${T.sh}" fill-opacity="${f(T.shOp * Math.min(0.6, -face * 0.7))}"/>`;
    if (contrast > 0.1 && big(sh) >= 6) m += `<path d="${strip(0.22, 0.66)}" fill="${T.hi}" fill-opacity="${f(T.hiOp * (0.6 + contrast * 0.6))}"/>`;
    // Joint creases across the knuckle at each joint end.
    if (big(c.ra2) >= 9) {
      const ends = [];
      if (i > 0) ends.push([0, c.ra2]);
      if (!last) ends.push([1, c.rb2]);
      for (const [e, r] of ends) {
        const t = e ? 1 - (r * 0.55) / c.l : (r * 0.55) / c.l;
        if (t <= 0.05 || t >= 0.95) continue;
        const bow = e ? -0.3 * r : 0.3 * r;
        const mid = c.on(t);
        m += `<path d="M${pt(c.on(t, 0.72))}Q${pt([mid[0] + c.u[0] * bow, mid[1] + c.u[1] * bow])} ${pt(c.on(t, -0.72))}" fill="none" stroke="${T.crease}" stroke-opacity="${f(T.creaseOp * 0.9)}" stroke-width="${f(Math.max(0.16, r * 0.07))}" stroke-linecap="round"/>`;
      }
    }
    if (last && T.tipSeam !== false && big(c.rb2) >= 12) {
      const b = c.b2;
      const r = c.rb2;
      const a0 = [b[0] - c.u[0] * r * 0.35 + c.v[0] * r * 0.78, b[1] - c.u[1] * r * 0.35 + c.v[1] * r * 0.78];
      const a1 = [b[0] - c.u[0] * r * 0.35 - c.v[0] * r * 0.78, b[1] - c.u[1] * r * 0.35 - c.v[1] * r * 0.78];
      m += `<path d="M${pt(a0)}Q${pt([b[0] + c.u[0] * r * 0.15, b[1] + c.u[1] * r * 0.15])} ${pt(a1)}" fill="none" stroke="${T.seam}" stroke-opacity="${T.seamOp}" stroke-width="${f(r * 0.07)}"${stitch(r * 0.07)}/>`;
    }
    if (hem !== null) {
      const o = c.on(hem);
      const r = c.rb2;
      m += `<path d="M${pt(c.on(hem, 1))}Q${pt([o[0] + c.u[0] * r * 0.35, o[1] + c.u[1] * r * 0.35])} ${pt(c.on(hem, -1))}" fill="none" stroke="${T.tip.hem}" stroke-opacity=".9" stroke-width="${f(Math.max(0.2, r * 0.2))}" stroke-linecap="round"/>`;
    }
    [c.a2, c.b2].forEach((q, k2) => grow(q, (k2 ? c.rb2 : c.ra2) + 1));
    return { markup: clipped(d, m) + `<path d="${d}" fill="none" ${edgeAttr}/>`, shape: d, r: sh };
  }

  /** The palm: its capsules as one padded mass, shaded as one, the back of the hand dressed when it faces the eye. */
  function drawPalm(it) {
    const { palm } = it.h;
    const cs = it.caps;
    const U = cs.map((c) => capPath(c)).join("");
    cs.forEach((c) => {
      grow(c.a2, c.ra2 + 1);
      grow(c.b2, c.rb2 + 1);
    });
    const R = cs.reduce((a, c) => a + c.ra2 + c.rb2, 0) / (cs.length * 2);
    // One outline round the union: the ink under the fills.
    let m = `<g opacity="${T.edgeOp}"><path d="${U}" fill="${T.edge}" stroke="${T.edge}" stroke-width="${f(T.edgeW * 2)}" stroke-linejoin="round"/></g>`;
    let inner = `<path d="${U}" fill="${T.base}"/><path d="${U}" fill="url(#vmGloveSh)"/>`;
    // The back of the hand, foreshortened with the hand.
    const c3 = palm.back.reduce((a, p) => madd3(a, p, 0.25), [0, 0, 0]);
    const facing = dot3(palm.d, norm3(sub3(eye, c3)));
    if (facing > -0.08) {
      // Tendons under the glove from each knuckle toward the wrist, and the
      // fold where the back of the hand meets the wrist.
      if (R * PX >= 10) {
        const w = Math.max(0.16, R * 0.05);
        for (const { p, r, base } of palm.knuckles) {
          const a = P(madd3(p, palm.d, r * 0.8));
          const b = P(madd3(mix3(p, base, 0.75), palm.d, palm.rBase * 0.95));
          inner += `<path d="M${pt(lerp(a, b, 0.18))}L${pt(b)}" stroke="${T.crease}" stroke-opacity="${f(T.creaseOp * 0.55)}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
          inner += `<path d="M${pt(lerp(a, b, 0.2))}L${pt(lerp(a, b, 0.9))}" transform="translate(${f(-LS[0] * w * 1.4)},${f(-LS[1] * w * 1.4)})" stroke="${T.hi}" stroke-opacity="${f(T.hiOp * 0.7)}" stroke-width="${f(w * 0.8)}" stroke-linecap="round"/>`;
        }
        const [, , b2, b3] = palm.back.map(P);
        const mid = lerp(b2, b3, 0.5);
        const c = P(palm.back.reduce((a, q) => madd3(a, q, 0.25), [0, 0, 0]));
        const bow = [mid[0] + (c[0] - mid[0]) * 0.18, mid[1] + (c[1] - mid[1]) * 0.18];
        inner += `<path d="M${pt(lerp(b2, b3, 0.08))}Q${pt(bow)} ${pt(lerp(b2, b3, 0.92))}" fill="none" stroke="${T.crease}" stroke-opacity="${f(T.creaseOp * 0.8)}" stroke-width="${f(w * 1.3)}" stroke-linecap="round"/>`;
      }
      inner += backPanel(palm.back.map(P), 0.72, false, 40);
    }
    // Shade: the mass turned from the key light (upper left on screen) falls into shadow.
    const id = `hm${clipSeq++}`;
    const s = R * 0.7;
    inner += `<mask id="${id}" maskUnits="userSpaceOnUse" x="-500" y="-500" width="1000" height="1000"><path d="${U}" fill="#fff"/>` +
      `<path d="${U}" transform="translate(${f(LS[0] * s)},${f(LS[1] * s)})" fill="#000"/></mask>` +
      `<path d="${U}" mask="url(#${id})" fill="${T.sh}" fill-opacity="${f(T.shOp * 0.8)}"/>`;
    if (facing < -0.2) inner += `<path d="${U}" fill="${T.sh}" fill-opacity="${f(T.shOp * 0.3)}"/>`;
    // Knuckles: a rounded cap over each, lit on its upper shoulder, and the glove's line along the row.
    if (facing > -0.15) {
      const ks = palm.knuckles.map(({ p, r }) => ({ c: P(madd3(p, palm.d, r * 0.5)), r: r * k(p) * 0.62 }));
      if (T.knuckle && ks.length > 1) {
        // A padded guard over the knuckle row.
        const q = ks.map(({ c }) => c);
        const w = ks.reduce((a, { r }) => a + r, 0) / ks.length;
        const dd = `M${pt(q[0])}${spline(q)}`;
        inner += `<path d="${dd}" fill="none" stroke="${T.edge}" stroke-opacity="${T.edgeOp * 0.7}" stroke-width="${f(w * 1.5 + T.edgeW * 2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
          `<path d="${dd}" fill="none" stroke="${T.knuckle}" stroke-width="${f(w * 1.5)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      if (T.knuckleLine && R * PX >= 9 && ks.length > 1) {
        const q = ks.map(({ c }) => c);
        const w = Math.max(0.16, R * 0.08);
        inner += `<path d="M${pt(q[0])}${spline(q)}" fill="none" stroke="${T.knuckleLine}" stroke-opacity=".8" stroke-width="${f(w)}" stroke-linecap="round"${T.knuckleDash ? stitch(w) : ""}/>`;
      }
    }
    m += clipped(U, inner);
    return { markup: m, shape: U, r: R };
  }

  // ── Forearms and cuffs ────────────────────────────────────────────────────

  const SL = (sc.sleeve || fpSleeve(STANDARD_FRAME))[real ? "real" : "modern"];
  const paint = (v) => (v === "accent" ? accent : v);
  const sleeveEdge = real ? `stroke="#050607" stroke-opacity=".55" stroke-width=".3"` : `stroke="${INK}" stroke-width=".6"`;
  // The same edge drawn under a fill, so two tubes joined at the elbow share one outline.
  const sleeveUnder = real ? `stroke="#050607" stroke-opacity=".55" stroke-width=".6"` : `stroke="${INK}" stroke-width="1.2"`;

  /**
   * A limb as a tube of elliptical rings along `u` from `o`: ring s mm along
   * has half-width a across `wa` and half-depth b along `wb` (prof(s) →
   * [a, b]). Rings stop where the limb leaves the screen or reaches the eye.
   * Each ring knows its silhouette points and the arc of it facing the eye,
   * so bands, folds and plates wrap round it in perspective. `closed`: the
   * far end is a rim seen round its near side (a cuff over the sleeve), not
   * a cut where the limb runs off.
   */
  function tube(o, u, wa, wb, prof, s0, s1, step, closed = false) {
    const rings = [];
    if (!(s1 >= s0) || !(step > 0)) s1 = s0;
    for (let s = s0; ; s = Math.min(s1, s + step)) {
      const C = madd3(o, u, s);
      const [a, b] = prof(s);
      const at = (t, grow = 0) => madd3(madd3(C, wa, (a + grow) * Math.cos(t)), wb, (b + grow) * Math.sin(t));
      const c2 = P(C);
      rings.push({ s, C, a, b, at, c2 });
      const off = Math.abs(c2[0]) > EDGE_X + 50 || c2[1] > EDGE_Y + 50 || c2[1] < -EDGE_Y - 50 || k(C) > sc.F / 70;
      if (s >= s1 || (off && rings.length > 2)) break;
    }
    rings.forEach((r, i) => {
      const a2 = rings[Math.max(0, i - 1)].c2;
      const b2 = rings[Math.min(rings.length - 1, i + 1)].c2;
      const l = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1;
      const v = [-(b2[1] - a2[1]) / l, (b2[0] - a2[0]) / l];
      let [tL, tR, hi, lo] = [0, 0, -Infinity, Infinity];
      for (let q = 0; q < 48; q++) {
        const t = (q / 48) * Math.PI * 2;
        const p2 = P(r.at(t));
        const d = (p2[0] - r.c2[0]) * v[0] + (p2[1] - r.c2[1]) * v[1];
        if (d > hi) [hi, tL] = [d, t];
        if (d < lo) [lo, tR] = [d, t];
      }
      // The visible arc runs from one silhouette point to the other through the side facing the eye.
      let span = (((tR - tL) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const mid = r.at(tL + span / 2);
      const n = norm3(madd3(madd3([0, 0, 0], wa, Math.cos(tL + span / 2) / r.a), wb, Math.sin(tL + span / 2) / r.b));
      if (dot3(n, sub3(eye, mid)) < 0) span -= Math.PI * 2;
      r.tL = tL;
      r.span = span;
      r.L = P(r.at(tL));
      r.R = P(r.at(tR));
      // Angle x of the way across the visible arc, and the 3D normal there.
      r.ang = (x) => tL + span * x;
      r.normal = (t) => norm3(madd3(madd3([0, 0, 0], wa, Math.cos(t) / r.a), wb, Math.sin(t) / r.b));
    });
    const left = rings.map((r) => r.L);
    const right = rings.map((r) => r.R);
    /** Screen points across ring i's visible arc from x0 to x1 (grown out by `g` mm). */
    const arc = (r, x0 = 0, x1 = 1, n = 10, g = 0) => {
      const out = [];
      for (let q = 0; q <= n; q++) out.push(P(r.at(r.ang(x0 + ((x1 - x0) * q) / n), g)));
      return out;
    };
    // The open end toward the hand closes round the near half of its ring, so it reads as an opening.
    const mouth = arc(rings[0], 1, 0, 12);
    const rim = closed ? arc(rings[rings.length - 1], 0, 1, 12).slice(1) : [right[right.length - 1]];
    const d = `M${pt(left[0])}${spline(left)}${rim.map((q) => `L${pt(q)}`).join("")}${spline(right.slice().reverse())}${mouth.slice(1).map((q) => `L${pt(q)}`).join("")}Z`;
    [...left, ...right, ...mouth, ...rim].forEach((q) => grow(q));
    /** A ring at any s, interpolated between the sampled ones. */
    const ringAt = (s) => {
      let i = 0;
      while (i < rings.length - 2 && rings[i + 1].s < s) i++;
      const A = rings[i];
      const B = rings[Math.min(rings.length - 1, i + 1)];
      const t = B.s === A.s ? 0 : Math.max(0, Math.min(1, (s - A.s) / (B.s - A.s)));
      const [a, b] = prof(s);
      const C = madd3(o, u, s);
      return { s, C, a, b, at: (th, grow = 0) => madd3(madd3(C, wa, (a + grow) * Math.cos(th)), wb, (b + grow) * Math.sin(th)), ang: (x) => A.ang(x) * (1 - t) + B.ang(x) * t };
    };
    /** A band round the limb between s0 and s1 across x0..x1 of the visible arc. */
    const patch = (s0, s1, x0 = 0, x1 = 1, g = 0.5) => {
      const A = ringAt(s0);
      const B = ringAt(s1);
      return [...arc(A, x0, x1, 10, g), ...arc(B, x0, x1, 10, g).reverse()];
    };
    /** A line along the limb at x across its visible arc. */
    const along = (x, sa, sb, g = 0.5, n = 10) => {
      const out = [];
      for (let q = 0; q <= n; q++) {
        const r = ringAt(sa + ((sb - sa) * q) / n);
        out.push(P(r.at(r.ang(x), g)));
      }
      return out;
    };
    const sEnd = rings[rings.length - 1].s;
    return { rings, d, arc, ringAt, patch, along, sEnd, left, right };
  }

  const polyD = (pts) => `M${pts.map(pt).join("L")}Z`;
  const lineD = (pts) => `M${pts.map(pt).join("L")}`;

  /** Key-light shading over a tube: its dark flank in shade, a sheen down its lit one. */
  function tubeShade(tb, tone) {
    const r0 = tb.rings[Math.min(1, tb.rings.length - 1)];
    const darkLeft = dot3(r0.normal(r0.ang(0)), KEY) < dot3(r0.normal(r0.ang(1)), KEY);
    const band = (x0, x1) => {
      const a = tb.rings.map((r) => P(r.at(r.ang(darkLeft ? x0 : 1 - x0))));
      const b = tb.rings.map((r) => P(r.at(r.ang(darkLeft ? x1 : 1 - x1)))).reverse();
      return `M${pt(a[0])}${spline(a)}L${pt(b[0])}${spline(b)}Z`;
    };
    let m = `<path d="${band(-0.02, 0.3)}" fill="${tone.sh}" fill-opacity="${f(tone.shOp)}"/>`;
    m += `<path d="${band(0.3, 0.42)}" fill="${tone.sh}" fill-opacity="${f(tone.shOp * 0.4)}"/>`;
    m += `<path d="${band(0.7, 0.86)}" fill="${tone.hi}" fill-opacity="${f(tone.hiOp)}"/>`;
    return m;
  }

  /**
   * Emissive line on an arm, Modern only: a soft bloom, then a bright core,
   * kept inside `clip` (the part it is set in). The bloom stays in this layer
   * rather than the hand glow layer, so the other arm painted over it hides it.
   */
  function glowLine(pts, w, clip = null) {
    const d = lineD(pts);
    pts.forEach((q) => grow(q, w * 3));
    const glow = `<path d="${d}" fill="none" stroke="${accent}" stroke-width="${f(w * 3.2)}" stroke-opacity=".55" stroke-linecap="round" filter="url(#vmBloom)"/>`;
    return (clip ? clipped(clip, glow) : glow) +
      `<path d="${d}" fill="none" stroke="${accent}" stroke-width="${f(w * 1.6)}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${mix(accent, "#ffffff", 0.5)}" stroke-width="${f(w * 0.6)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  /**
   * The arm from the wrist toward the elbow: a forearm (flattened oval,
   * swelling at the muscle and narrowing into the wrist) in the suit's
   * sleeve (sleeves.js), then the glove's cuff ringed round the wrist.
   * `d`: the back of the hand's normal, which the top of the forearm follows.
   */
  function forearm(h) {
    const { W } = h.wrist;
    const { E, S } = armOf(h);
    const u = norm3(sub3(E, W));
    let wb = sub3(h.palm.d, mul3(u, dot3(h.palm.d, u)));
    wb = norm3(len3(wb) < 1e-3 ? [0, 1, 0] : wb);
    const wa = norm3(cross3(wb, u));
    const puff = SL.puff || 0;
    const bell = SL.bell || 0;
    // Forearm half-width and half-depth s mm from the wrist: narrow at the wrist, the muscle's swell two thirds up.
    const arm = (s) => {
      const t = Math.max(0, s) / 240;
      const swell = Math.exp(-((t - 0.62) ** 2) / 0.09);
      const a = 25 + 9 * Math.min(1, t * 1.6) + 6 * swell;
      return [a, a * (0.68 + 0.12 * swell)];
    };
    const prof = (s) => {
      const [a, b] = arm(s);
      const k2 = Math.max(0, 1 - s / 90) * bell;
      return [a + puff + k2, b + puff + k2 * 0.8];
    };
    const cuffLen = 24 * (T.cuffLen || 1);
    // The upper arm, from the elbow back toward the shoulder below the view,
    // drawn first: the forearm in front of it bends away at the elbow.
    const fore = len3(sub3(E, W));
    const up = S ? upperArm(E, S, wa, prof(fore)) : null;
    const tb = tube(W, u, wa, wb, prof, cuffLen * 0.6, up ? fore + 4 : fore, 12);
    const step = (PX >= 3 ? 1 : 2);
    // Forearm and upper arm as one sleeve: one outline round both (drawn
    // under their fills, so no seam crosses the elbow), the upper arm's
    // shading under the forearm's.
    let m = up
      ? `<path d="${up.d}" fill="none" ${sleeveUnder} stroke-linejoin="round"/><path d="${tb.d}" fill="none" ${sleeveUnder} stroke-linejoin="round"/>` +
        `<path d="${up.d}" fill="${paint(SL.base)}"/>` + clipped(up.d, up.inner) + `<path d="${tb.d}" fill="${paint(SL.base)}"/>`
      : `<path d="${tb.d}" fill="${paint(SL.base)}" ${sleeveEdge} stroke-linejoin="round"/>`;
    let inner = "";
    if (SL.stitch && PX >= 3) {
      const w = 0.35;
      inner += line(tb.along(0.62, cuffLen + 6, tb.sEnd), SL.stitch, w, 0.75, stitch(w));
    }
    if (SL.ribs) {
      for (let s = cuffLen + 10; s < tb.sEnd; s += 12 * step) {
        const r = tb.ringAt(s);
        inner += line(tb.arc(r, 0.04, 0.96, 12, 0.8), SL.fold, 1.1, 0.55) + line(tb.arc(tb.ringAt(s + 3), 0.1, 0.9, 12, 0.8), "#ffffff", 0.5, 0.5);
      }
    }
    if (SL.lamellar) {
      const L = SL.lamellar;
      for (let s = cuffLen + 8; s < Math.min(tb.sEnd, 200); s += 15) {
        const q = tb.patch(s, s + 13, 0.12, 0.88, 1.5);
        inner += `<path d="${roundPath(q, 0.08)}" fill="${L.fill}" ${sleeveEdge}/>` + line(tb.arc(tb.ringAt(s + 1.5), 0.2, 0.8, 8, 1.6), L.hi, 0.3, 0.35);
        for (const x of [0.3, 0.5, 0.7]) {
          const r = tb.ringAt(s + 13);
          const c = P(r.at(r.ang(x), 1.8));
          inner += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r=".55" fill="${L.lace}"/>`;
        }
      }
    }
    if (SL.wraps) {
      for (let s = cuffLen + 4; s < Math.min(tb.sEnd, 220); s += 14) {
        const pts = [];
        for (let q = 0; q <= 10; q++) {
          const r = tb.ringAt(s + q * 1.6);
          pts.push(P(r.at(r.ang(q / 10), 1)));
        }
        inner += line(pts, SL.fold, 3.2, 0.5) + line(pts, SL.wraps, 2, 0.9);
      }
    }
    if (SL.plate) {
      // The vambrace over the face of the forearm toward the eye.
      const half = SL.plate.wide ? 0.4 : 0.26;
      const s0 = cuffLen + 10;
      const s1 = Math.min(tb.sEnd, 190);
      if (s1 - s0 > 20) {
        const pts = [...tb.along(0.5 - half, s0, s1, 2, 8), ...tb.along(0.5 + half, s0, s1, 2, 8).reverse()];
        inner += `<path d="${roundPath(pts, 0.12)}" fill="${SL.plate.fill}" ${sleeveEdge}/>`;
        inner += line(tb.along(0.5 + half * 0.7, s0 + 6, s1 - 6, 2.2, 8), SL.plate.hi, 0.6, real ? 0.25 : 0.5);
        if (SL.plate.channel) {
          const ch = tb.along(0.5, s0 + 12, s1 - 12, 2.2, 8);
          inner += line(ch, "#05131a", 1.6, 0.85);
          if (!real) inner += glowLine(ch, 0.5, tb.d);
        }
      }
    }
    if (SL.seams && !real) {
      for (const x of [0.32, 0.72]) inner += glowLine(tb.along(x, cuffLen + 10, Math.min(tb.sEnd, 200), 0.8), 0.32, tb.d);
    }
    if (SL.struts) {
      for (const x of [0.06, 0.94]) {
        const pts = tb.along(x, cuffLen + 2, Math.min(tb.sEnd, 220), 7);
        inner += line(pts, INK, 5.2, real ? 0.5 : 1) + line(pts, SL.struts.fill, 4, 1) + line(pts, SL.struts.hi, 1, 0.6);
      }
    }
    if (SL.bands) {
      for (const s of [cuffLen + 10, cuffLen + 60, cuffLen + 120]) {
        if (s + 7 > tb.sEnd) break;
        const fill = SL.bands === "url(#vmBrass)" && real ? "url(#vmBrassR)" : SL.bands;
        inner += `<path d="${polyD(tb.patch(s, s + 7, 0, 1, 1))}" fill="${fill}" ${sleeveEdge}/>`;
      }
    }
    if (SL.bare?.ink && !real) {
      // LED ink: a circuit trace up the forearm, jogging between two runs, ending in a pad.
      const at = (s, x) => {
        const r = tb.ringAt(s);
        return P(r.at(r.ang(x), 0.4));
      };
      const s0 = cuffLen + 14;
      const pts = [at(s0, 0.44), at(s0 + 30, 0.44), at(s0 + 40, 0.58), at(s0 + 80, 0.58), at(s0 + 90, 0.46), at(s0 + 120, 0.46)];
      inner += glowLine(pts, 0.35, tb.d);
      const end = pts[pts.length - 1];
      inner += `<circle cx="${f(end[0])}" cy="${f(end[1])}" r=".9" fill="${mix(accent, "#ffffff", 0.5)}"/>`;
    }
    if (SL.roll) {
      const s0 = 150;
      if (s0 < tb.sEnd) {
        inner += `<path d="${polyD(tb.patch(s0, Math.min(tb.sEnd + 20, s0 + 40), -0.05, 1.05, 5))}" fill="${SL.roll.fill}" ${sleeveEdge}/>`;
        inner += line(tb.arc(tb.ringAt(s0 + 12), 0.05, 0.95, 10, 5), SL.roll.lo, 1, 0.8);
      }
    }
    if (SL.turnback) {
      const s0 = cuffLen * 0.5;
      inner += `<path d="${polyD(tb.patch(s0, s0 + SL.turnback.w, -0.03, 1.03, 3))}" fill="${SL.turnback.fill}" ${sleeveEdge}/>`;
      inner += line(tb.arc(tb.ringAt(s0 + SL.turnback.w - 2), 0.05, 0.95, 10, 3), SL.hi, 0.6, 0.3);
    }
    // Folds follow the arm round: bunched above the cuff, and a few along it.
    const folds = PX >= 3 ? [cuffLen + 14, cuffLen + 30, cuffLen + 70, cuffLen + 130] : [cuffLen + 20, cuffLen + 90];
    folds.forEach((s, i) => {
      if (s > tb.sEnd - 6) return;
      const r = tb.ringAt(s);
      const pts = tb.arc(r, 0.18 + 0.05 * (i % 2), 0.78 - 0.04 * (i % 3), 10, 0.3);
      const lift = Math.sin(i * 1.7) * 1.5;
      const bent = pts.map((q, j) => [q[0], q[1] + Math.sin((j / 10) * Math.PI) * lift]);
      inner += line(bent, paint(SL.fold), i < 2 ? 0.6 : 0.45, SL.foldOp);
    });
    if (SL.trim) {
      const s0 = cuffLen + 1;
      const q = tb.patch(s0, s0 + SL.trim.w, 0, 1, 0.8);
      if (SL.trim.glow && !real) {
        inner += `<path d="${polyD(q)}" fill="${mix(accent, "#0a1420", 0.45)}" stroke="${INK}" stroke-width=".4"/>`;
        inner += glowLine(tb.arc(tb.ringAt(s0 + SL.trim.w / 2), 0.08, 0.92, 10, 1), Math.max(0.4, SL.trim.w * 0.12), tb.d);
      } else inner += `<path d="${polyD(q)}" fill="${paint(SL.trim.fill)}" ${sleeveEdge}/>`;
    }
    inner += tubeShade(tb, SL);
    // The sleeve's mouth: its rim lit, its inside in shadow round the cuff.
    inner += line(tb.arc(tb.rings[0], 0.08, 0.92, 12, -1.2), SL.sh, 1.6, 0.35) + line(tb.arc(tb.rings[0], 0.2, 0.8, 10, -0.3), SL.hi, 0.5, SL.hiOp * 2);
    m += clipped(tb.d, inner) + (up ? "" : `<path d="${tb.d}" fill="none" ${sleeveEdge} stroke-linejoin="round"/>`);
    emit(m);
    // Where the art ends: the morph continues the sleeve past the screen edge (viewmodels.js).
    if (layer !== "body") {
      const last = tb.rings[tb.rings.length - 1];
      const prev = tb.rings[Math.max(0, tb.rings.length - 2)];
      const dl = Math.hypot(last.c2[0] - prev.c2[0], last.c2[1] - prev.c2[1]) || 1;
      sc.sleeveEnds.push({ ea: last.L, eb: last.R, dir: [(last.c2[0] - prev.c2[0]) / dl, (last.c2[1] - prev.c2[1]) / dl], half: [(last.R[0] - last.L[0]) / 2, (last.R[1] - last.L[1]) / 2] });
    }
    gloveCuff(W, u, wa, wb, arm, cuffLen);
  }

  /**
   * Where the arm bends: the shoulder sits fixed to the body below and to
   * the side of the eye (the hand's side), and the elbow is solved between
   * it and the wrist for a forearm and upper arm of a human's proportions,
   * bent out toward the pose's `elbow` hint. A hand with no body (the side
   * view) keeps its straight forearm toward the hint.
   */
  function armOf(h) {
    const { W } = h.wrist;
    if (!sc.fromEye || sc.side) return { E: madd3(W, norm3(sub3(h.elbow, W)), FOREARM), S: null };
    const S = sc.fromEye([h.side * SHOULDER[0], SHOULDER[1], SHOULDER[2]]);
    const E = twoBone(W, S, FOREARM, UPPER_ARM, sub3(h.elbow, W));
    if (!E.every(Number.isFinite)) return { E: madd3(W, norm3(sub3(h.elbow, W)), FOREARM), S: null };
    return { E, S };
  }

  /** The upper arm: a tube of the sleeve from the elbow toward the shoulder, `r0` its half-size at the elbow. */
  function upperArm(E, S, wa, [a0, b0]) {
    const u = norm3(sub3(S, E));
    let wb = cross3(u, wa);
    wb = norm3(len3(wb) < 1e-3 ? [0, 1, 0] : wb);
    const wa2 = norm3(cross3(wb, u));
    const prof = (s) => {
      const t = Math.min(1, Math.max(0, s) / 200);
      return [a0 * (1 + 0.35 * t), b0 * (1 + 0.45 * t)];
    };
    const tb = tube(E, u, wa2, wb, prof, -a0 * 0.7, UPPER_ARM + 40, 14);
    // A fold across the inside of the elbow.
    const r = tb.ringAt(Math.min(tb.sEnd - 6, a0 * 0.4));
    const inner = tubeShade(tb, SL) + line(tb.arc(r, 0.25, 0.75, 10, 0.3), paint(SL.fold), 0.7, SL.foldOp);
    return { d: tb.d, inner };
  }

  /**
   * The glove's cuff: a ring round the wrist from just past the hand to
   * `len` up the arm, its open lip toward the hand drawn as an ellipse, and
   * the glove's fastening wrapped round it — a strap, a ring, a hazard band
   * and hinge drum, crossed laces, knit ribs and a tab, a latch, lines round.
   */
  function gloveCuff(W, u, wa, wb, arm, len) {
    const flare = T.cuffFlare || 1;
    // The glove is one piece: at the hand the cuff hugs the wrist, no wider
    // than the heel of the hand, and it opens out up the arm over the sleeve.
    const prof = (s) => {
      const [a, b] = arm(Math.max(0, s));
      const hug = 0.84 + 0.16 * Math.min(1, Math.max(0, (s + 6) / 14));
      const k2 = hug * (1 + (flare - 1) * Math.max(0, s / len));
      return [(a + 3) * k2, (b + 3) * k2];
    };
    const s0 = -6;
    const tb = tube(W, u, wa, wb, prof, s0, len, len / 3, true);
    const L = (sA, sB) => Math.max(0.2, Math.hypot(...[0, 1].map((i) => P(madd3(W, u, sB))[i] - P(madd3(W, u, sA))[i])));
    // Line weights from the cuff's size on screen, held to what reads at any distance.
    const w = Math.max(0.2, Math.min(0.45, L(0, len) * 0.03));
    const X = (t, x, g = 0.6) => {
      const r = tb.ringAt(s0 + (len - s0) * t);
      return P(r.at(r.ang(x), g));
    };
    const acr = (t, x0 = 0.04, x1 = 0.96, g = 0.6) => {
      const out = [];
      for (let q = 0; q <= 10; q++) out.push(X(t, x0 + ((x1 - x0) * q) / 10, g));
      return out;
    };
    const quad = (t0, t1, x0 = 0, x1 = 1, g = 0.8) => [...acr(t0, x0, x1, g), ...acr(t1, x0, x1, g).reverse()];
    const small = PX < 3;
    let inner = tubeShade(tb, T);
    for (const { at: t, color, op, dash } of T.cuffLines || []) inner += line(acr(t), color, w * 1.2, op, dash ? stitch(w) : "");
    if (T.cuffShade === undefined && T.strap !== null) {
      // The issued glove's padded wrist strap, stitched.
      const q = quad(0.22, 0.6, 0.02, 0.8, 1.4);
      inner += `<path d="${roundPath(q, 0.06)}" fill="${T.pad}" stroke="${T.sh}" stroke-opacity=".55" stroke-width=".3"/>`;
      if (!small) for (const t of [0.3, 0.52]) inner += line(acr(t, 0.06, 0.76, 1.5), T.seam, w, T.seamOp, stitch(w));
    }
    if (T.band) {
      inner += `<path d="${polyD(quad(0.32, 0.68, -0.03, 1.03, 1.6))}" fill="${T.band.fill}" stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${f(w * 0.8)}"/>`;
      if (T.band.hi) inner += line(acr(0.4, 0.02, 0.98, 1.7), T.band.hi, w * 0.9, 0.7);
      if (T.band.lo) inner += line(acr(0.6, 0.02, 0.98, 1.7), T.band.lo, w * 0.9, 0.8);
      if (T.band.rivets && !small) {
        for (const x of [0.2, 0.5, 0.8]) {
          const q = X(0.5, x, 1.8);
          inner += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(w * 1.5)}" fill="${T.band.fill}" stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${f(w * 0.5)}"/>`;
        }
      }
    }
    if (T.hazard) {
      const a = acr(0.7, 0, 1, 1);
      const bw = L(0, len) * 0.22;
      inner += line(a, T.hazard, bw, 0.95) + `<path d="${lineD(a)}" fill="none" stroke="${INK}" stroke-opacity=".7" stroke-width="${f(bw)}" stroke-dasharray="${f(bw * 0.9)} ${f(bw * 0.9)}"/>`;
    }
    if (T.lace) {
      const cords = [[X(0.15, 0.1), X(0.5, 0.88), X(0.85, 0.1)], [X(0.15, 0.88), X(0.5, 0.1), X(0.85, 0.88)]];
      for (const c of cords) inner += line(c, INK, w * 2.4, 0.9);
      for (const c of cords) inner += line(c, T.lace.color, w * 1.2, 1);
      const kq = X(0.5, 0.5);
      inner += `<circle cx="${f(kq[0])}" cy="${f(kq[1])}" r="${f(w * 1.6)}" fill="${T.lace.knot}" stroke="${INK}" stroke-width="${f(w * 0.6)}"/>`;
    }
    if (T.ribs && !small) {
      for (let x = 0.08; x < 0.95; x += 0.08) {
        const pts = [];
        for (let q = 0; q <= 4; q++) pts.push(X(0.08 + q * 0.21, x));
        inner += line(pts, T.ribs, w * 0.8, 0.45);
      }
    }
    if (T.tab) inner += `<path d="${roundPath(quad(0.12, 0.8, 0.82, 1.0, 1.4), 0.1)}" fill="${T.tab}" stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${f(w * 0.6)}"/>`;
    if (T.latch) inner += `<path d="${roundPath(quad(0.25, 0.75, 0.84, 1.0, 1.8), 0.1)}" fill="${T.latch}" stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${f(w * 0.6)}"/>`;
    let m = `<path d="${tb.d}" fill="${T.cuff}" ${edgeAttr}/>` + clipped(tb.d, inner);
    if (T.drum) {
      // The hinge drum on the cuff's outer edge, sized to the cuff.
      const q = X(0.45, 0.9, 1.5);
      const r = Math.min(L(0, len) * 0.16, Math.hypot(X(0.45, 0)[0] - X(0.45, 1)[0], X(0.45, 0)[1] - X(0.45, 1)[1]) * 0.12);
      m += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(r)}" fill="${T.drum}" stroke="${T.edge}" stroke-opacity="${T.edgeOp}" stroke-width="${f(w * 0.8)}"/>` +
        `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(r * 0.4)}" fill="${T.edge}" fill-opacity=".6"/>`;
    }
    // Where it joins the hand, only a seam; the open lip is up the arm, its
    // rim catching the light where the cuff rides over the sleeve.
    const lip = tb.rings[tb.rings.length - 1];
    m += line(tb.arc(lip, -0.02, 1.02, 14, 0.2), T.edge, T.edgeW * 1.6, T.edgeOp) + line(tb.arc(lip, 0.12, 0.88, 12, -0.6), T.hi, w * 0.9, T.hiOp * 1.5);
    emit(m);
  }

  /**
   * Draw articulated hands (hand-rig.js models) into the current layer: the
   * sleeve and glove cuff, the palm and every phalanx, in painter order by
   * depth wherever two of them overlap on screen, each clipped behind the
   * weapon parts in `occluders` that lie between it and the eye.
   */
  function rig(models, { occluders = [] } = {}) {
    const items = [];
    for (const h0 of models) {
      // The elbow belongs to the body: it stays put when the gun rolls.
      const h = sc.steady ? { ...h0, elbow: sc.steady(h0.elbow) } : h0;
      const { W, R } = h.wrist;
      const fore = norm3(sub3(h.elbow, W));
      items.push({ kind: "sleeve", h, caps: [cap2({ a: W, b: madd3(W, fore, 150), ra: R, rb: R * 1.4 })] });
      items.push({ kind: "palm", h, caps: h.palm.caps.map(cap2) });
      for (const dg of h.digits) {
        for (let i = 0; i < dg.j.length - 1; i++) {
          items.push({ kind: "seg", h, dg, i, caps: [cap2({ a: dg.j[i], b: dg.j[i + 1], ra: dg.r[i], rb: dg.r[i + 1] })] });
        }
      }
    }
    const depth = (it) => it.caps.reduce((a, c) => a + depthAt(c, 0.5), 0) / it.caps.length;
    for (const it of items) it.depth = depth(it);
    // Painter order: an item goes after everything it covers on screen.
    const n = items.length;
    const after = items.map(() => []);
    const deg = items.map(() => 0);
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const A = items[a];
        const B = items[b];
        let v;
        if (A.dg && A.dg === B.dg && Math.abs(A.i - B.i) === 1) v = Math.sign(B.depth - A.depth);
        else {
          v = 0;
          for (const ca of A.caps) for (const cb of B.caps) v += capVote(ca, cb) - capVote(cb, ca);
          v = Math.sign(v);
        }
        if (v > 0) {
          after[b].push(a);
          deg[a]++;
        } else if (v < 0) {
          after[a].push(b);
          deg[b]++;
        }
      }
    }
    const done = items.map(() => false);
    const order = [];
    while (order.length < n) {
      let pick = -1;
      for (let a = 0; a < n; a++) if (!done[a] && !deg[a] && (pick < 0 || items[a].depth > items[pick].depth)) pick = a;
      // A cycle (three parts each partly over the next): the farthest goes first.
      if (pick < 0) for (let a = 0; a < n; a++) if (!done[a] && (pick < 0 || items[a].depth > items[pick].depth)) pick = a;
      done[pick] = true;
      order.push(items[pick]);
      for (const b of after[pick]) deg[b]--;
    }
    for (const it of order) {
      if (it.kind === "sleeve") {
        forearm(it.h);
        continue;
      }
      const { markup, shape, r } = it.kind === "palm" ? drawPalm(it) : drawSegment(it);
      const occ = occlusion(it, occluders);
      emit(occ.length ? hide(markup, occ, shape, r) : markup);
    }
  }

  return { use, P, k, stroke, silhouette, rig, detailPx: PX, real };
}

// ---------------------------------------------------------------------------
// Articulated poses (./hand-rig.js). A weapon adopts them by passing its grip
// geometry and the parts of it the hands can pass behind (hand-rig.js
// boxOccluder); the grip post itself is always one.
// ---------------------------------------------------------------------------

/**
 * Both hands on a sidearm, cup grip: firing fingers round the front strap,
 * the support hand's fingers wrapped over them, both thumbs forward along the
 * left of the frame. The arms come in from below at ADS, from the lower right
 * and left at the hip.
 */
export function pistolHands(A, g, ads = false, occluders = [], trigger = null) {
  A.use("handR");
  const { hw, yTop: yT, yBot: yB } = g;
  const zb = gripZ(g, yT, "back");
  const fire = gripHand(g, {
    thumb: "forward",
    trigger,
    elbow: ads ? [hw + 50, yT - 340, zb - 190] : [hw + 150, yT - 260, zb - 330],
    flare: ads ? 1.5 : 2.1,
  });
  const cup = cupHand(g, {
    elbow: ads ? [-hw - 30, yB - 340, g.zbB - 180] : [-hw - 110, yB - 240, g.zbB - 320],
    flare: ads ? 1.5 : 2,
    low: 8,
  });
  // Both stay as solved on the grip (turning a hand rigidly toward the eye
  // would swing its palm and thumb into the frame), kept clear of the frame
  // and slide behind the grip.
  const solids = occluders.map((o) => o.box).filter(Boolean);
  A.rig([fire, cup].map((h) => settleHand(h, g, solids)), { occluders: [gripOccluder(g), ...occluders] });
}

/** How far (radians) the long-gun support hand rolls up the handguard's near flank at ADS. */
const ADS_CLAMP = 1.3;
/** How far up the handguard's far flank the support fingertips reach at the hip (0 its lower corner, 1 its upper). */
const HIP_TIP = 0.15;

/**
 * Firing hand alone on a long gun's pistol grip: fingers round the front
 * strap, index on the trigger (or along the receiver, `frameHw`: its half
 * width), thumb forward along the grip's left flank. `frameY`: the receiver's underside,
 * where it overhangs the grip (the hand drops clear of it).
 */
export function gripFiringHand(A, g, ads = false, { frameHw = g.hw, frameY = null, occluders = [], trigger = null } = {}) {
  A.use("handR");
  const { hw, yTop: yT } = g;
  const zb = gripZ(g, yT, "back");
  const hand = gripHand(g, {
    thumb: "side",
    frameHw,
    frameY,
    trigger,
    elbow: ads ? [hw + 50, yT - 340, zb - 190] : [hw + 150, yT - 260, zb - 330],
    flare: ads ? 1.5 : 2.1,
  });
  // As solved on the grip at the hip and aimed alike (a rigid turn toward the
  // eye would swing the palm and fingers into the grip), kept clear of the receiver.
  const solids = occluders.map((o) => o.box).filter(Boolean);
  A.rig([settleHand(hand, g, solids)], { occluders: [gripOccluder(g), ...occluders] });
}

/**
 * Long-gun support hand under the handguard hg = { y0, y1, hw, zc }: palm up,
 * fingers up the far flank, thumb along the near one. At ADS it paints into
 * the body layer first so the receiver in front of the eye hides it.
 * `occluders`: the handguard and every other part the hand can pass behind
 * (the receiver, a magazine), so a fingertip round the far side never shows
 * through them.
 */
export function handguardSupport(A, hg, layer = "handL", ads = false, occluders = []) {
  A.use(layer);
  const { y0, hw, zc } = hg;
  const hand = handguardHand(hg, {
    tip: ads ? 0.4 : HIP_TIP,
    elbow: ads ? [-hw - 240, y0 - 300, zc - 330] : [-hw - 330, y0 - 200, zc - 300],
    flare: ads ? 1.6 : 2.3,
  });
  // Aimed, the eye is right behind the handguard, which would hide a hand
  // under it: the hand rolls up the near flank into a clamp, palm on the
  // side, thumb over the top, so it shows beside the barrel.
  const c = [0, (y0 + hg.y1) / 2, zc];
  A.rig([ads ? turnHand(hand, c, ADS_CLAMP, "z") : hand], { occluders });
}
