/**
 * Supporting cast: ARIA (hologram co-pilot), Lyra, the five-person squad and the
 * Voss / Miri / Kai memory portraits. Art units, origin at chest height; see
 * ../index.js for the model format.
 */

const INK = "#04060b";

/** Round to one decimal so the markup stays compact. */
const r1 = (n) => Math.round(n * 10) / 10;

function stops(list) {
  return list
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? "" : ` stop-opacity="${a}"`}/>`)
    .join("");
}

const lin = (id, list, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;

const rad = (id, list, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;

const blur = (id, sd) =>
  `<filter id="${id}" filterUnits="userSpaceOnUse" x="-300" y="-300" width="600" height="600"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

const at = (x, y, s, markup) => `<g transform="translate(${x} ${y}) scale(${s})">${markup}</g>`;

/** Mirror an absolute M/L/C/Q path across x = 0. */
function mir(d) {
  let i = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => (i++ % 2 === 0 ? String(r1(-parseFloat(n))) : n));
}

/** Smooth tapered limb through [x, y, width] points, as a closed path. */
function limb(pts) {
  const n = pts.length;
  const L = [];
  const R = [];
  for (let i = 0; i < n; i++) {
    const [x, y, w] = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    L.push([x + (nx * w) / 2, y + (ny * w) / 2]);
    R.push([x - (nx * w) / 2, y - (ny * w) / 2]);
  }
  const P = (q) => `${r1(q[0])},${r1(q[1])}`;
  const run = (Q) => {
    let d = "";
    for (let i = 1; i < Q.length - 1; i++) {
      d += ` Q${P(Q[i])} ${r1((Q[i][0] + Q[i + 1][0]) / 2)},${r1((Q[i][1] + Q[i + 1][1]) / 2)}`;
    }
    return `${d} L${P(Q[Q.length - 1])}`;
  };
  R.reverse();
  return `M${P(L[0])}${run(L)} L${P(R[0])}${run(R)}Z`;
}

// ── Arm rig ───────────────────────────────────────────────────────────────
// Headings are degrees off straight down (positive swings toward screen right);
// `s` is the arm's side (-1 = screen left). Anatomy targets in art units: upper
// arm ≈ 28, forearm ≈ 23, hand ≈ 13, shoulder joint tucked under the deltoid.

const DEG = Math.PI / 180;
const polar = (p, a, len) => [p[0] + Math.sin(a * DEG) * len, p[1] + Math.cos(a * DEG) * len];
const heading = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]) / DEG;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const P = (q) => `${r1(q[0])},${r1(q[1])}`;
/** Transform placing local +y along heading `a` at point p. */
const frame = (p, a) => `translate(${r1(p[0])} ${r1(p[1])}) rotate(${r1(-a)})`;

/**
 * Tapered capsule outline a→b with a mid bulge. The winding never flips, so several
 * can share one path; `edge(k, inset)` returns the side curve (k = 1 is the side
 * that faces the upper-left key light).
 */
function capsule(a, b, wa, wb, bulge = 0) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const lit = -uy * -0.6 + ux * -0.8 >= 0 ? 1 : -1;
  const m = lerp(a, b, 0.5);
  const side = (k, inset = 0) => {
    const ra = wa / 2 - inset;
    const rb = wb / 2 - inset;
    const c = 2 * ((wa + wb) / 4 + bulge - inset) - (ra + rb) / 2;
    return [
      [a[0] - k * uy * ra, a[1] + k * ux * ra],
      [m[0] - k * uy * c, m[1] + k * ux * c],
      [b[0] - k * uy * rb, b[1] + k * ux * rb],
    ];
  };
  const [l0, lc, l1] = side(1);
  const [q0, qc, q1] = side(-1);
  const ka = wa * 0.55;
  const kb = wb * 0.55;
  const d =
    `M${P(l0)}Q${P(lc)} ${P(l1)}C${P([l1[0] + ux * kb, l1[1] + uy * kb])} ${P([q1[0] + ux * kb, q1[1] + uy * kb])} ${P(q1)}` +
    `Q${P(qc)} ${P(q0)}C${P([q0[0] - ux * ka, q0[1] - uy * ka])} ${P([l0[0] - ux * ka, l0[1] - uy * ka])} ${P(l0)}Z`;
  const edge = (k, inset, t0 = 0.12, t1 = 0.85) => {
    const [e0, ec, e1] = side(k * lit, inset);
    return `M${P(lerp(e0, ec, t0))}Q${P(ec)} ${P(lerp(ec, e1, t1))}`;
  };
  return { d, edge };
}

/**
 * Segments merged into one inked silhouette: a double-width ink stroke under a
 * stroke-less fill hides the seams where they overlap at a joint.
 */
const merged = (d, fill, ink = 1.1) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${r1(ink * 2)}" stroke-linejoin="round"/><path d="${d}" fill="${fill}"/>`;

/** Contact shadow of a limb on whatever is behind it, pushed toward the midline. */
const limbAO = (d, s, id = "ao") =>
  `<path d="${d}" fill="#000" opacity="0.5" filter="url(#${id})" transform="translate(${r1(-s * 1.8)} 1.5)"/>`;

/**
 * Arm joints from a pose entry. Forward kinematics: `rot` swings the upper arm out
 * from the body, `bend` flexes the forearm back toward the midline; `upper` / `fore`
 * set lengths (shorter reads as foreshortened). Explicit `el` / `wr` override.
 */
function armJoints(arm, s) {
  const { sh, rot = 8, bend = 12, upper = 28, fore = 23 } = arm;
  const el = arm.el ?? polar(sh, s * rot, upper);
  const wr = arm.wr ?? polar(el, s * (rot - bend), fore);
  return { sh, el, wr, up: heading(sh, el), fo: heading(el, wr) };
}

/** Armored fist at the wrist, fingers curled, thumb on the body side. */
function fist(wr, fo, s, ink = 1.1) {
  const X = (x) => r1(-s * x);
  const st = `stroke="${INK}" stroke-width="${ink}" stroke-linejoin="round"`;
  return (
    `<g transform="${frame(wr, fo)} scale(1.06) translate(0 -0.8)">` +
    `<path d="M-4,-0.6 C-4.7,2.4 -4.9,5.6 -4.4,8 L4.4,8 C4.9,5.6 4.7,2.4 4,-0.6Z" fill="url(#st2)" ${st}/>` +
    `<path d="M-3,1 C-3.3,3 -3.3,4.8 -3,6.4 L3,6.4 C3.3,4.8 3.3,3 3,1Z" fill="url(#st)"/>` +
    `<path d="M-4.5,7 C-4.8,9.4 -4.2,11.4 -2.7,12.3 C-0.9,13 0.9,13 2.7,12.3 C4.2,11.4 4.8,9.4 4.5,7 C1.5,6.4 -1.5,6.4 -4.5,7Z" fill="url(#st2)" ${st}/>` +
    `<path d="M-2.2,7.5 L-2.3,12.2 M0,7.3 L0,12.8 M2.2,7.5 L2.3,12.2" stroke="${INK}" stroke-width="0.5" opacity="0.8"/>` +
    `<path d="M-3.8,7.6 C-1.4,7 1.4,7 3.8,7.6" fill="none" stroke="#d6e6f4" stroke-width="0.5" opacity="0.6"/>` +
    `<path d="M${X(3.6)},1.8 C${X(6)},3.4 ${X(6.1)},7.4 ${X(4.4)},10.4 C${X(3.6)},11.3 ${X(2.2)},11.1 ${X(2)},10 C${X(2.9)},7.8 ${X(3.1)},5.4 ${X(2.3)},3.4Z" fill="url(#st)" stroke="${INK}" stroke-width="${r1(ink * 0.7)}"/>` +
    `</g>`
  );
}

/**
 * Squad armor arm: merged undersuit sleeve, rerebrace with bicep swell, vambrace
 * tapering to the wrist with a class-colour band, elbow cop over the joint.
 * @returns {{ body: string, el: number[], wr: number[], fo: number }}
 */
function trooperArm(c, s, arm) {
  const sh = [s * (c.S + 0.4), -59.6];
  const { el, wr, up, fo } = armJoints({ ...arm, sh }, s);
  const sleeve = capsule(polar(sh, up, -3), el, 10.8, 8.2, 1).d + capsule(el, wr, 8.2, 6.2, 0.6).d;
  const plate = (a, b, wa, wb, bulge) => {
    const g = capsule(a, b, wa, wb, bulge);
    return (
      `<path d="${g.d}" fill="url(#st)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="${g.edge(1, wa * 0.2)}" fill="none" stroke="#d6e6f4" stroke-width="0.8" opacity="${s < 0 ? 0.7 : 0.4}" stroke-linecap="round"/>` +
      `<path d="${g.edge(-1, 0.5, 0.1, 0.9)}" fill="none" stroke="${c.rim}" stroke-width="0.7" opacity="0.7" stroke-linecap="round"/>`
    );
  };
  const band = lerp(el, wr, 0.3);
  let body = limbAO(sleeve, s) + merged(sleeve, "url(#su)", 1.4);
  body += plate(polar(sh, up, 1.5), lerp(sh, el, 0.8), 11.8, 9, 1.2);
  body += plate(lerp(el, wr, 0.12), lerp(el, wr, 0.9), 9.8, 7, 0.8);
  body += `<path d="M${P(polar(band, fo + 90, 4.6))} L${P(polar(band, fo - 90, 4.6))}" stroke="${c.color}" stroke-width="0.9" opacity="0.9"/>`;
  body +=
    `<g transform="${frame(el, (up + fo) / 2)}">` +
    `<path d="M0,-4.4 C3.3,-4.4 4.8,-2.1 4.8,0.2 C4.8,2.7 2.9,4.4 0,4.4 C-2.9,4.4 -4.8,2.7 -4.8,0.2 C-4.8,-2.1 -3.3,-4.4 0,-4.4Z" fill="url(#st2)" stroke="${INK}" stroke-width="1.1"/>` +
    `<path d="M-3.2,-1.8 C-1.6,-3.4 1.6,-3.6 3,-1.8" fill="none" stroke="#d6e6f4" stroke-width="0.6" opacity="0.7"/></g>`;
  if (arm.hand !== "none") body += fist(wr, fo, s);
  return { body, el, wr, fo };
}

/**
 * Coat-sleeved arm: shoulder cap, bicep and forearm mass merged into one inked
 * silhouette, a crease inside the elbow, and a trimmed cuff.
 */
function sleeveArm(arm, s, { fill, trim, rim }) {
  const { el, wr, up, fo } = armJoints(arm, s);
  const { sh } = arm;
  const inner = -s;
  const fm = lerp(el, wr, 0.4);
  const d =
    capsule(polar(sh, up, 1.6), lerp(sh, el, 0.6), 9.4, 8.6, 0.5).d +
    capsule(lerp(sh, el, 0.45), el, 8.6, 7.2, 0.3).d +
    capsule(el, fm, 7.6, 7.4, 0.4).d +
    capsule(fm, wr, 7.4, 5.8, 0.2).d;
  const g1 = capsule(sh, el, 9.2, 7.2, 0.8);
  const g2 = capsule(el, wr, 7.6, 5.8, 0.5);
  const crease =
    `M${P(polar(polar(el, up, -3.2), up + inner * 90, 2.6))}` +
    `Q${P(polar(el, (up + fo) / 2 + inner * 90, 2))} ${P(polar(polar(el, fo, 3), fo + inner * 90, 2.8))}`;
  let body = limbAO(d, s) + merged(d, fill, 1.1);
  body += `<path d="${g1.edge(1, 2)}" fill="none" stroke="#8a8ab8" stroke-width="0.6" opacity="0.45" stroke-linecap="round"/>`;
  body += `<path d="${g1.edge(-1, 0.5, 0.1, 0.9)}${g2.edge(-1, 0.5, 0.1, 0.9)}" fill="none" stroke="${rim}" stroke-width="0.55" opacity="0.55" stroke-linecap="round"/>`;
  body += `<path d="${crease}" fill="none" stroke="${INK}" stroke-width="0.55" opacity="0.7" stroke-linecap="round"/>`;
  body +=
    `<g transform="${frame(wr, fo)}"><path d="M-3.3,-3.2 L3.3,-3.2 L3.6,0.4 L-3.6,0.4Z" fill="${fill}" stroke="${INK}" stroke-width="0.7"/>` +
    `<path d="M-3.4,-2.5 L3.4,-2.5" stroke="${trim}" stroke-width="0.7" opacity="0.85"/></g>`;
  return { body, el, wr, up, fo };
}

/** Relaxed bare hand from the wrist: back of hand, loosely curled fingers, thumb on the `inner` side. */
function bareHand(wr, fo, inner, skin, lo) {
  const X = (x) => r1(inner * x);
  return (
    `<g transform="${frame(wr, fo)}">` +
    `<path d="M-2.7,-0.8 C-3.2,1.8 -3.4,4.4 -3.1,6.6 L3.1,6.6 C3.4,4.4 3.2,1.8 2.7,-0.8Z" fill="${skin}" stroke="${INK}" stroke-width="0.6"/>` +
    `<path d="M-3.1,6 C-3.3,8.4 -2.8,10.8 -1.7,12 C-0.6,12.6 0.8,12.6 1.8,11.8 C2.8,10.6 3.2,8.4 3.1,6 C1.1,5.6 -1.1,5.6 -3.1,6Z" fill="${skin}" stroke="${INK}" stroke-width="0.6"/>` +
    `<path d="M-1,6.6 L-1.1,11.8 M1,6.6 L1,11.6" stroke="${lo}" stroke-width="0.35" opacity="0.8"/>` +
    `<path d="M${X(-2.2)},1 C${X(-2.6)},3 ${X(-2.6)},5 ${X(-2.2)},6.4" fill="none" stroke="${lo}" stroke-width="0.9" opacity="0.3"/>` +
    `<path d="M${X(2.2)},0.8 C${X(4.4)},2.2 ${X(4.6)},6 ${X(3.4)},8.6 C${X(2.8)},9.4 ${X(1.8)},9.2 ${X(1.7)},8.4 C${X(2.4)},6.4 ${X(2.4)},4 ${X(1.6)},2.2Z" fill="${skin}" stroke="${INK}" stroke-width="0.5"/>` +
    `</g>`
  );
}

// ── Faces ─────────────────────────────────────────────────────────────────
// Local head units: crown y -10, chin y +10, eye line y 0. Front view, key light
// upper-left, rim light on the right cheek.

function headPath(o) {
  const w = o.w ?? (o.male ? 7.3 : 6.9);
  const jx = o.jaw ?? (o.male ? 6.1 : 5);
  const cy = o.male ? 10.2 : 9.8;
  const cw = o.chin ?? (o.male ? 2.8 : 1.9);
  return (
    `M0,-10 C${r1(w * 0.66)},-10 ${w},-6.8 ${w},-2.4 C${w},1.8 ${r1(jx + 0.9)},4.4 ${jx},6.6 ` +
    `C${r1(jx - 1.3)},8.8 ${cw},${cy} 0,${cy} C${-cw},${cy} ${r1(1.3 - jx)},8.8 ${-jx},6.6 ` +
    `C${r1(-jx - 0.9)},4.4 ${-w},1.8 ${-w},-2.4 C${-w},-6.8 ${r1(-w * 0.66)},-10 0,-10Z`
  );
}

function faceDefs(p, o) {
  const [hi, mid, lo] = o.skin;
  return (
    rad(`${p}sk`, [[0, hi], [0.5, mid], [1, lo]], 0.36, 0.32, 0.8) +
    lin(`${p}sh`, [[0, lo, 0], [0.52, lo, 0], [1, lo, 0.85]], 0, 0, 1, 0) +
    lin(`${p}nk`, [[0, lo], [0.5, mid], [1, mid]], 0, 0, 0.4, 1) +
    `<clipPath id="${p}hc"><path d="${headPath(o)}"/></clipPath>`
  );
}

function eye(p, sx, o) {
  const X = (x) => r1(sx * x);
  const lid = o.lid ?? "#1a0f0a";
  const lo = o.skin[2];
  const id = `${p}e${sx < 0 ? "l" : "r"}`;
  const almond = `M${X(1.4)},0 Q${X(3)},-1.3 ${X(4.7)},-0.15 Q${X(3)},0.95 ${X(1.4)},0Z`;
  let s = `<clipPath id="${id}"><path d="${almond}"/></clipPath>`;
  s += `<path d="${almond}" fill="${o.white ?? "#e4dbd2"}"/>`;
  s += `<g clip-path="url(#${id})"><circle cx="${X(3)}" cy="-0.1" r="0.74" fill="${o.iris}"/>`;
  s += `<circle cx="${X(3)}" cy="-0.1" r="0.34" fill="#0a0806"/>`;
  s += `<path d="${almond}" fill="none" stroke="${lo}" stroke-width="0.6" opacity="0.35"/></g>`;
  s += `<circle cx="${r1(sx * 3 - 0.3)}" cy="-0.42" r="0.2" fill="#fff" opacity="0.9"/>`;
  s += `<path d="M${X(1.2)},0.1 Q${X(3)},-1.5 ${X(4.9)},-0.1" fill="none" stroke="${lid}" stroke-width="0.45" stroke-linecap="round"/>`;
  if (o.lashes) {
    s += `<path d="M${X(4.4)},-0.4 L${X(5.4)},-0.95" stroke="${lid}" stroke-width="0.35" stroke-linecap="round"/>`;
  }
  s += `<path d="M${X(1.6)},0.35 Q${X(3)},1.15 ${X(4.5)},0.15" fill="none" stroke="${lo}" stroke-width="0.22" opacity="0.7"/>`;
  s += `<path d="M${X(1.5)},-1 Q${X(3)},-2.15 ${X(4.8)},-0.9" fill="none" stroke="${lo}" stroke-width="0.25" opacity="0.55"/>`;
  return s;
}

function brow(sx, o) {
  const X = (x) => r1(sx * x);
  const k = o.brows ?? "soft";
  const d =
    k === "stern"
      ? [[1, -1.3], [3, -3.1], [5.5, -2.9], [3, -2.1], [1, -0.6]]
      : k === "raised"
        ? [[1.1, -2.6], [3, -4.2], [5.3, -3], [3, -3.3], [1.1, -2]]
        : [[1.1, -2.1], [3, -3.35], [5.3, -2.3], [3, -2.75], [1.1, -1.6]];
  return `<path d="M${X(d[0][0])},${d[0][1]} Q${X(d[1][0])},${d[1][1]} ${X(d[2][0])},${d[2][1]} Q${X(d[3][0])},${d[3][1]} ${X(d[4][0])},${d[4][1]}Z" fill="${o.browC}"/>`;
}

function mouth(o) {
  const [li, ld] = o.lip;
  const [hi, , lo] = o.skin;
  const line = o.lipLine ?? "#3a1a14";
  switch (o.mouth) {
    case "smile":
      return (
        `<path d="M-2.7,6.2 Q-1.2,6 -0.4,6.2 Q0,6.35 0.4,6.2 Q1.2,6 2.7,6.2 Q0,7.4 -2.7,6.2Z" fill="${ld}"/>` +
        `<path d="M-2.3,6.6 Q0,7.5 2.3,6.6 Q1.4,8.2 0,8.3 Q-1.4,8.2 -2.3,6.6Z" fill="${li}"/>` +
        `<path d="M-2.8,6.1 Q0,7.6 2.8,6.1" fill="none" stroke="${line}" stroke-width="0.32" stroke-linecap="round"/>` +
        `<path d="M-3.4,5.2 Q-3.8,6.2 -3.1,7.1 M3.4,5.2 Q3.8,6.2 3.1,7.1" fill="none" stroke="${lo}" stroke-width="0.25" opacity="0.6"/>` +
        `<ellipse cx="-0.5" cy="7.6" rx="0.8" ry="0.28" fill="${hi}" opacity="0.4"/>`
      );
    case "stern":
      return (
        `<path d="M-2.5,7 Q0,6.4 2.5,7 Q0,7.1 -2.5,7Z" fill="${ld}"/>` +
        `<path d="M-2.1,7.1 Q0,7.3 2.1,7.1 Q0,8.1 -2.1,7.1Z" fill="${li}"/>` +
        `<path d="M-2.6,7.15 Q0,6.8 2.6,7.15" fill="none" stroke="${line}" stroke-width="0.38" stroke-linecap="round"/>` +
        `<path d="M-2.6,7.15 L-2.9,7.6 M2.6,7.15 L2.9,7.6" stroke="${lo}" stroke-width="0.22" opacity="0.6"/>`
      );
    case "grin":
      return (
        `<path d="M-2.5,6.6 Q0,6.5 3,5.8 Q1.7,8.4 -0.2,8.4 Q-1.9,8.2 -2.5,6.6Z" fill="#3a1a14"/>` +
        `<path d="M-2.1,6.7 Q0,6.6 2.6,6 Q2.1,6.9 0,7.3 Q-1.5,7.3 -2.1,6.7Z" fill="#ebe3d4"/>` +
        `<path d="M-2.5,6.6 Q0,6.5 3,5.8 Q1.7,8.4 -0.2,8.4 Q-1.9,8.2 -2.5,6.6Z" fill="none" stroke="${ld}" stroke-width="0.45"/>` +
        `<path d="M3.5,4.7 Q4.1,6 3.4,7.2 M-3.1,5.6 Q-3.4,6.5 -2.9,7.2" fill="none" stroke="${lo}" stroke-width="0.28" opacity="0.65"/>` +
        `<ellipse cx="0.2" cy="8.9" rx="1.4" ry="0.35" fill="${lo}" opacity="0.35"/>`
      );
    default: {
      const k = o.mouth === "smirk" ? 0.4 : 0;
      return (
        `<path d="M-2.4,6.8 Q-1.2,6.1 -0.4,6.3 Q0,6.45 0.4,6.3 Q1.2,6.1 2.4,${r1(6.8 - k)} Q0,7 -2.4,6.8Z" fill="${ld}"/>` +
        `<path d="M-2.2,6.9 Q0,7.1 2.2,${r1(6.9 - k)} Q1.4,8.2 0,8.3 Q-1.4,8.2 -2.2,6.9Z" fill="${li}"/>` +
        `<path d="M-2.5,6.85 Q0,7.15 2.5,${r1(6.85 - k)}" fill="none" stroke="${line}" stroke-width="0.3" stroke-linecap="round"/>` +
        (k ? `<path d="M2.9,5.9 Q3.3,6.5 2.9,7" fill="none" stroke="${lo}" stroke-width="0.22" opacity="0.6"/>` : "") +
        `<ellipse cx="-0.5" cy="7.55" rx="0.8" ry="0.3" fill="${hi}" opacity="0.4"/>` +
        `<ellipse cx="0" cy="8.95" rx="1.3" ry="0.35" fill="${lo}" opacity="0.3"/>`
      );
    }
  }
}

/**
 * A believable adult head + neck at (o.x, o.y) scaled by o.s. `back` is drawn
 * behind the head, `front` over it (hair), `over` last (goggles, scars).
 */
function face(p, o) {
  const [hi, mid, lo] = o.skin;
  const ink = o.ink ?? INK;
  const w = o.w ?? (o.male ? 7.3 : 6.9);
  const jx = o.jaw ?? (o.male ? 6.1 : 5);
  const nw = o.neck ?? 3.5;
  let s = `<g transform="translate(${o.x} ${o.y}) scale(${o.s})">`;
  s += o.back ?? "";
  s += `<path d="M${-nw},4 L${r1(-nw - 0.6)},${o.neckLen ?? 18} L${r1(nw + 0.6)},${o.neckLen ?? 18} L${nw},4Z" fill="url(#${p}nk)" stroke="${ink}" stroke-width="0.4"/>`;
  s += `<path d="M${-nw},7 C-2,10.8 2,10.8 ${nw},7 L${nw},12 C2,13.4 -2,13.4 ${-nw},12Z" fill="${lo}" opacity="0.6"/>`;
  s += `<path d="M${r1(nw * 0.3)},9 L${r1(nw * 0.6)},17" stroke="${lo}" stroke-width="0.5" opacity="0.35"/>`;
  for (const sx of [-1, 1]) {
    const X = (x) => r1(sx * x);
    s += `<path d="M${X(w - 0.3)},-1.8 C${X(w + 1.4)},-2.8 ${X(w + 1.7)},1.6 ${X(w + 0.6)},3.6 C${X(w)},4.2 ${X(w - 0.4)},3.4 ${X(w - 0.4)},2.8Z" fill="${sx < 0 ? mid : lo}" stroke="${ink}" stroke-width="0.35"/>`;
    s += `<path d="M${X(w + 0.2)},-0.8 C${X(w + 1)},-0.8 ${X(w + 1)},1.6 ${X(w + 0.3)},2.4" fill="none" stroke="${lo}" stroke-width="0.3" opacity="0.7"/>`;
  }
  s += `<path d="${headPath(o)}" fill="url(#${p}sk)" stroke="${ink}" stroke-width="${o.inkW ?? 0.5}" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${p}hc)">`;
  s += `<rect x="-9" y="-11" width="18" height="23" fill="url(#${p}sh)"/>`;
  s += `<ellipse cx="-3" cy="-0.9" rx="2.7" ry="1.6" fill="${lo}" opacity="0.26"/>`;
  s += `<ellipse cx="3" cy="-0.9" rx="2.7" ry="1.6" fill="${lo}" opacity="0.38"/>`;
  s += `<ellipse cx="-4.3" cy="2.5" rx="2.1" ry="1.1" fill="${hi}" opacity="0.35"/>`;
  s += `<ellipse cx="-2" cy="-6.4" rx="3.2" ry="1.7" fill="${hi}" opacity="0.3"/>`;
  s += `<path d="M${r1(jx - 1.8)},2.6 C${r1(jx - 0.2)},3.2 ${r1(jx + 0.6)},4.8 ${r1(jx + 0.2)},6.6 C${r1(jx - 0.9)},5.2 ${r1(jx - 1.4)},4 ${r1(jx - 1.8)},2.6Z" fill="${lo}" opacity="0.35"/>`;
  s += `<ellipse cx="0" cy="9.6" rx="${r1(jx * 0.7)}" ry="1.2" fill="${lo}" opacity="0.3"/>`;
  s += `</g>`;
  s += eye(p, -1, o) + eye(p, 1, o) + brow(-1, o) + brow(1, o);
  // Nose: shadow plane on the right, lit tip, nostrils.
  s += `<path d="M0.6,-0.6 C1,1.6 1.6,3 2,4.2 C1.4,4.7 0.8,4.8 0.3,4.6Z" fill="${lo}" opacity="0.38"/>`;
  s += `<path d="M-0.4,-0.6 C-0.55,1 -0.6,2.2 -0.5,2.9" fill="none" stroke="${hi}" stroke-width="0.35" opacity="0.4"/>`;
  s += `<ellipse cx="-0.25" cy="3.55" rx="0.65" ry="0.55" fill="${hi}" opacity="0.5"/>`;
  s += `<ellipse cx="0" cy="4.95" rx="1.5" ry="0.45" fill="${lo}" opacity="0.45"/>`;
  s += `<path d="M-1.9,4.4 Q-1.3,5.3 -0.45,5 M1.9,4.4 Q1.3,5.3 0.45,5" fill="none" stroke="${lo}" stroke-width="0.35" opacity="0.8"/>`;
  s += `<path d="M-1.5,3.4 Q-2.2,4.2 -1.8,4.9 M1.5,3.4 Q2.2,4.2 1.8,4.9" fill="none" stroke="${lo}" stroke-width="0.25" opacity="0.55"/>`;
  s += `<ellipse cx="0" cy="5.8" rx="0.5" ry="0.45" fill="${lo}" opacity="0.2"/>`;
  if (o.male) {
    s += `<path d="M-2.1,3.9 Q-3.3,5.4 -3.1,7.1 M2.1,3.9 Q3.3,5.4 3.1,7.1" fill="none" stroke="${lo}" stroke-width="0.25" opacity="0.4"/>`;
  }
  s += mouth(o);
  if (o.rim) {
    s += `<path d="M${r1(w - 1.8)},-8.2 C${r1(w + 0.1)},-5.6 ${r1(w + 0.2)},-1 ${r1(w - 0.2)},2.4 C${r1(jx + 0.6)},4.8 ${jx},6.6 ${r1(jx - 1.2)},8" fill="none" stroke="${o.rim}" stroke-width="0.45" stroke-linecap="round" opacity="0.85"/>`;
  }
  s += o.front ?? "";
  s += o.over ?? "";
  s += `</g>`;
  return s;
}

// ── Lyra ──────────────────────────────────────────────────────────────────

const LYRA_FACE = {
  skin: ["#f2cba8", "#d9a680", "#8a5e44"],
  iris: "#c8761e",
  browC: "#2a1a0a",
  lip: ["#c8675a", "#98483e"],
  lashes: true,
  mouth: "smirk",
  rim: "#ffc070",
};

const LYRA_HAIR_BACK =
  `<path d="M-7.8,-4 C-9.6,-11.4 9.6,-11.4 7.8,-4 C9.4,6 10.6,18 11.8,30 C9.4,33.4 6,33.4 4.4,31 C5,22 5.6,14 4.8,9 L-4.8,9 C-5.6,14 -5,22 -4.4,31 C-6,33.4 -9.4,33.4 -11.8,30 C-10.6,18 -9.4,6 -7.8,-4Z" fill="url(#lyhr)" stroke="${INK}" stroke-width="0.55"/>` +
  `<path d="M-8.6,4 C-9.2,14 -9.8,22 -10,29 M8.8,5 C9.6,14 10.2,22 10.6,29 M6.4,12 C7,20 7.4,26 6.6,31" fill="none" stroke="#050302" stroke-width="0.4" opacity="0.7"/>` +
  `<path d="M-9.6,6 C-10.2,15 -10.6,22 -10.8,28" fill="none" stroke="#ffaa44" stroke-width="0.5" opacity="0.45"/>`;

const LYRA_HAIR_FRONT =
  `<path d="M-7.4,2 C-8,-8.6 -3.4,-11.6 1.4,-11.2 C6.2,-10.8 8.4,-7.2 7.7,-0.6 C7,-4.4 5.2,-7 2.6,-7.8 C0,-6 -3.6,-5.6 -5.6,-4.2 C-6.6,-3 -7,-0.8 -7.4,2Z" fill="url(#lyhr)" stroke="${INK}" stroke-width="0.5"/>` +
  `<path d="M-5.2,-6.6 C-3,-9.4 0.6,-10.6 4,-9.8 M-6.4,-3.6 C-5,-6.8 -2,-8 1.6,-8.2" fill="none" stroke="#8a6440" stroke-width="0.35" opacity="0.7"/>` +
  `<path d="M-1,-9.4 C1.4,-10.3 4,-10 5.6,-8.8" fill="none" stroke="#ffc070" stroke-width="0.3" opacity="0.55"/>`;

const LYRA_STRANDS =
  `<path d="M-7.2,-1 C-8.4,6 -8.6,14 -7.6,24 C-6.8,24.6 -6,24 -5.6,23 C-6.2,14 -6,6 -5.8,0Z" fill="url(#lyhr)" stroke="${INK}" stroke-width="0.45"/>` +
  `<path d="M7.4,-0.4 C8.2,6 8.2,12 7.4,19 C6.8,19.4 6.2,19 6,18.4 C6.4,12 6.2,6 5.8,0.4Z" fill="url(#lyhr)" stroke="${INK}" stroke-width="0.45"/>`;

function lyraDefs() {
  return (
    faceDefs("lf", LYRA_FACE) +
    lin("lyhr", [[0, "#4e3822"], [0.45, "#22160a"], [1, "#0b0703"]], 0, 0, 1, 1) +
    lin("lyct", [[0, "#3c3c5a"], [0.42, "#1f1f34"], [1, "#0a0a13"]], 0, 0, 1, 0.3) +
    lin("lypt", [[0, "#2c2c3c"], [0.5, "#16161f"], [1, "#07070b"]], 0, 0, 1, 0) +
    lin("lybt", [[0, "#34343e"], [0.5, "#15151c"], [1, "#050508"]], 0, 0, 1, 0)
  );
}

/** Lyra in the standard standing frame (head top -92, feet +58). */
function lyraFigure({ pose, visor }) {
  const ink = `stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"`;
  let body = "";
  // Coat back skirt, legs, boots.
  body += `<path d="M-12,-28 C-15,-10 -18,6 -19.6,20 C-12,23 12,23 19.6,20 C18,6 15,-10 12,-28Z" fill="#0e0e19" ${ink}/>`;
  const leg = "M-11.4,-22 C-12,-4 -11,10 -9.6,22 C-10.6,30 -9.8,40 -8.2,50 L-2.4,50 C-1.8,42 -1.4,32 -1.8,22 C-1,10 -0.6,-4 -0.4,-20Z";
  body += `<path d="${leg}" fill="url(#lypt)" ${ink}/><path d="${mir(leg)}" fill="url(#lypt)" ${ink}/>`;
  body += `<path d="M-8.2,20 C-6.6,22.6 -4,22.6 -2.6,21 M8.2,20 C6.6,22.6 4,22.6 2.6,21" fill="none" stroke="#3a3a50" stroke-width="0.5" opacity="0.8"/>`;
  const boot = "M-10.4,27 C-11,35 -9.8,44 -8.8,51 L-9.2,55 C-9.6,57 -11,57.8 -12.2,58.6 L-1.4,58.6 L-2,51 C-1.6,44 -1.4,35 -1.6,27Z";
  body += `<path d="${boot}" fill="url(#lybt)" ${ink}/><path d="${mir(boot)}" fill="url(#lybt)" ${ink}/>`;
  body += `<path d="M-10.4,28.2 L-1.6,28.2 M10.4,28.2 L1.6,28.2" stroke="#ffaa44" stroke-width="1" opacity="0.9"/>`;
  body += `<path d="M-8.6,31 C-8.8,40 -8,48 -7.4,55 M3.4,31 C3.2,40 3.2,48 3.4,55" stroke="#50505c" stroke-width="0.4" opacity="0.7"/>`;
  // Coat front panels.
  const panel = "M0,-58 L-6,-67.4 C-11,-67 -15,-66 -16.6,-62.6 C-17.6,-57 -16.6,-48 -14.6,-40 C-13,-34 -11.6,-30 -11.6,-27 C-13.6,-14 -16,2 -17.8,19 C-12.2,21.4 -7.2,21.8 -5,21.2 L0,-27Z";
  body += `<path d="${panel}" fill="url(#lyct)" ${ink}/><path d="${mir(panel)}" fill="url(#lyct)" ${ink}/>`;
  body += `<path d="M-5,-67.4 L0,-58 L5,-67.4 C2,-68.8 -2,-68.8 -5,-67.4Z" fill="#241a18" stroke="${INK}" stroke-width="0.6"/>`;
  body += `<path d="M-9.4,-62 C-8.6,-50 -8.4,-40 -7.4,-30 M9.4,-62 C8.6,-50 8.4,-40 7.4,-30 M-9,-20 C-10.6,-6 -11.4,6 -12,20 M9,-20 C10.6,-6 11.4,6 12,20" fill="none" stroke="${INK}" stroke-width="0.4" opacity="0.6"/>`;
  body += `<path d="M-15.6,-60 C-16,-54 -15.4,-48 -14,-42" fill="none" stroke="#6a6a90" stroke-width="0.5" opacity="0.6"/>`;
  body += `<path d="M16,-58 C16.6,-50 15.4,-42 13.4,-34 M12.4,-24 C14.6,-10 16.6,4 18,18" fill="none" stroke="#ffae3a" stroke-width="0.6" opacity="0.55"/>`;
  // Amber trim, belt and badge.
  body += `<path d="M-6,-67.4 L0,-58 L6,-67.4" fill="none" stroke="#ffaa44" stroke-width="0.9" stroke-linejoin="round"/>`;
  body += `<path d="M0,-27 L-5,21.2 M0,-27 L5,21.2" fill="none" stroke="#ffaa44" stroke-width="0.5" opacity="0.5"/>`;
  body += `<path d="M-12.2,-30.4 C-4,-28.8 4,-28.8 12.2,-30.4 L12,-26.4 C4,-25 -4,-25 -12,-26.4Z" fill="#2a2020" stroke="${INK}" stroke-width="0.6"/>`;
  body += `<rect x="-5.2" y="-29.4" width="3" height="2.2" rx="0.4" fill="#ffaa44"/><rect x="2.2" y="-29.4" width="3" height="2.2" rx="0.4" fill="#ffaa44"/>`;
  body += `<circle cx="7" cy="-54" r="2" fill="#2a1a08" stroke="#ffaa44" stroke-width="0.6"/><circle cx="7" cy="-54" r="0.9" fill="#ffd08a"/>`;
  // Arms: the left hangs relaxed; the right holds the time dial up on its palm or
  // carries a data slate at the hip.
  const coat = { fill: "url(#lyct)", trim: "#ffaa44", rim: "#ffae3a" };
  const skin = "url(#lfsk)";
  const skinLo = LYRA_FACE.skin[2];
  const hang = sleeveArm({ sh: [-15.4, -60.4], rot: 7, bend: 12, upper: 27.5, fore: 22.5 }, -1, coat);
  body += hang.body + bareHand(hang.wr, hang.fo, 1, skin, skinLo);
  let slateGlow = "";
  if (pose === "dial") {
    const up = sleeveArm({ sh: [15.4, -60.4], el: [29.4, -37.4], wr: [32.8, -58.6] }, 1, coat);
    const [x, y] = up.wr;
    const Q = (dx, dy) => `${r1(x + dx)},${r1(y + dy)}`;
    body += up.body;
    // palm up, fingers reaching outward, thumb raised on the near edge
    body += `<path d="M${Q(-3, -0.4)} C${Q(-0.6, -3.8)} ${Q(4.6, -5.8)} ${Q(9.6, -5.6)} C${Q(12, -5.4)} ${Q(12.8, -4.2)} ${Q(12.2, -3.2)} C${Q(10, -2.2)} ${Q(7, -1.4)} ${Q(4.6, -0.2)} C${Q(2.6, 1)} ${Q(0.2, 2)} ${Q(-1.8, 1.6)}Z" fill="${skin}" stroke="${INK}" stroke-width="0.6"/>`;
    body += `<path d="M${Q(6.4, -4.6)} C${Q(8.4, -4.4)} ${Q(10.4, -4)} ${Q(11.6, -3.6)} M${Q(5.6, -3)} C${Q(7.6, -3)} ${Q(9.6, -2.8)} ${Q(10.8, -2.6)}" fill="none" stroke="${skinLo}" stroke-width="0.35" opacity="0.8"/>`;
    body += `<path d="M${Q(0.6, -3.6)} C${Q(0.4, -6.6)} ${Q(2, -8.4)} ${Q(3.8, -8)} C${Q(4.6, -7.2)} ${Q(4, -5.8)} ${Q(3.6, -4.8)}Z" fill="${skin}" stroke="${INK}" stroke-width="0.5"/>`;
    body += `<path d="M${Q(-1.6, 0.8)} C${Q(1, -0.6)} ${Q(3.4, -1.2)} ${Q(5.4, -1)}" fill="none" stroke="${skinLo}" stroke-width="0.8" opacity="0.35"/>`;
  } else {
    const carry = sleeveArm({ sh: [15.4, -60.4], el: [21.2, -33.2], wr: [13.8, -23.6] }, 1, coat);
    body += carry.body;
    // data slate held against the hip, thumb across its face
    const slate = `translate(${r1(carry.wr[0] - 2.6)} ${r1(carry.wr[1] + 6.4)}) rotate(-18)`;
    body += `<g transform="${slate}"><rect x="-5.4" y="-7" width="10.8" height="14" rx="1.2" fill="#15131c" stroke="${INK}" stroke-width="0.8"/>`;
    body += `<rect x="-4.2" y="-5.6" width="8.4" height="10.8" rx="0.6" fill="#3a2408"/>`;
    body += `<path d="M-3.2,-3.6 L2.6,-3.6 M-3.2,-1.6 L1.2,-1.6 M-3.2,0.4 L3,0.4" stroke="#ffc878" stroke-width="0.6" opacity="0.8"/></g>`;
    slateGlow = `<g transform="${slate}"><rect x="-4.2" y="-5.6" width="8.4" height="10.8" rx="0.6" fill="#ffaa44" opacity="0.35" filter="url(#lyg)"/></g>`;
    const [x, y] = carry.wr;
    const Q = (dx, dy) => `${r1(x + dx)},${r1(y + dy)}`;
    body += `<path d="M${Q(-2.8, -1)} C${Q(-4.6, 1.4)} ${Q(-4.4, 4.4)} ${Q(-2.6, 6)} C${Q(-1, 7)} ${Q(1.6, 6.4)} ${Q(2.8, 4.6)} C${Q(3.4, 2.6)} ${Q(3, 0.4)} ${Q(2.4, -1.2)}Z" fill="${skin}" stroke="${INK}" stroke-width="0.6"/>`;
    body += `<path d="M${Q(-3, 3.2)} C${Q(-4.6, 5.2)} ${Q(-5, 7.6)} ${Q(-4, 9.2)} C${Q(-3.4, 9.8)} ${Q(-2.6, 9.6)} ${Q(-2.4, 8.8)} C${Q(-2.8, 7.4)} ${Q(-2.2, 5.6)} ${Q(-1.2, 4.4)}Z" fill="${skin}" stroke="${INK}" stroke-width="0.5"/>`;
  }
  // Head, then the strands that fall over the coat.
  const over = visor
    ? `<path d="M-7.6,-2 C-3,-3.2 3,-3.2 7.6,-2 L7.3,1.2 C3,0.4 -3,0.4 -7.3,1.2Z" fill="#140a02" stroke="${INK}" stroke-width="0.4"/><path d="M-6.6,-1 C-3,-1.8 3,-1.8 6.6,-1 L6.5,0 C3,-0.6 -3,-0.6 -6.5,0Z" fill="#ffaa44"/>`
    : "";
  body += face("lf", { ...LYRA_FACE, x: 0, y: -82, s: 1, front: LYRA_HAIR_FRONT, over });
  body += at(0, -82, 1, LYRA_STRANDS);

  let glow = slateGlow + `<circle cx="7" cy="-54" r="2.6" fill="#ffaa44" filter="url(#lyg)"/>`;
  glow += `<rect x="-5.2" y="-29.4" width="10.4" height="2.2" fill="#ffaa44" opacity="0.7" filter="url(#lyg)"/>`;
  if (visor) glow += `<path d="M-6.6,-83 C-3,-83.8 3,-83.8 6.6,-83 L6.5,-82 C3,-82.6 -3,-82.6 -6.5,-82Z" fill="#ffc070" filter="url(#lyg)"/>`;
  return { hairBack: at(0, -82, 1, LYRA_HAIR_BACK), body, glow };
}

function lyraModel() {
  const fig = lyraFigure({ pose: "dial", visor: false });
  const panelA =
    `<g transform="translate(-58 -60) rotate(-8)">` +
    `<rect x="-13" y="-20" width="26" height="40" rx="1" fill="#ffaa44" fill-opacity="0.1" stroke="#ffb454" stroke-width="0.6" stroke-opacity="0.7"/>` +
    `<path d="M-13,-14 L13,-14" stroke="#ffb454" stroke-width="0.4" opacity="0.6"/>` +
    `<rect x="-10" y="-18" width="8" height="2.2" fill="#ffc878" opacity="0.8"/>` +
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="-10" y="${-10 + i * 4.4}" width="${[14, 9, 17, 11, 6, 13][i]}" height="1.3" fill="#ffc878" opacity="0.55"/>`).join("") +
    `<circle cx="7" cy="12" r="4" fill="none" stroke="#ffc878" stroke-width="0.6" opacity="0.7" stroke-dasharray="18 7"/>` +
    `</g>`;
  const panelB =
    `<g transform="translate(55 -42) rotate(8)">` +
    `<rect x="-11" y="-17" width="22" height="34" rx="1" fill="#ffaa44" fill-opacity="0.1" stroke="#ffb454" stroke-width="0.6" stroke-opacity="0.7"/>` +
    `<path d="M-8,10 L-8,-12 M-8,10 L9,10" stroke="#ffb454" stroke-width="0.4" opacity="0.6"/>` +
    `<path d="M-8,6 C-5,4 -4,-1 -1,0 C2,1 3,-7 5,-6 C6.6,-5.4 7.4,-9 9,-10" fill="none" stroke="#ffd08a" stroke-width="0.8"/>` +
    `<path d="M-8,8 C-4,7 -2,4 1,5 C4,6 6,1 9,2" fill="none" stroke="#ff8a3a" stroke-width="0.5" stroke-dasharray="1.4 1" opacity="0.8"/>` +
    `<circle cx="1" cy="0" r="1" fill="#fff0c8"/>` +
    `</g>`;
  const holo =
    `<g transform="translate(4 -3)">` +
    `<ellipse cx="35" cy="-72.4" rx="6" ry="1.5" fill="#ffaa44" opacity="0.7" filter="url(#lyg)"/>` +
    `<path d="M29.6,-73 L32,-88 L38,-88 L40.4,-73Z" fill="url(#lybeam)"/>` +
    `<path d="M29,-76 Q35,-79 41,-76 M30.4,-80 Q35,-82.6 39.6,-80" fill="none" stroke="#ffd08a" stroke-width="0.5" opacity="0.8"/>` +
    `</g>`;
  const dial =
    `<g transform="translate(4 -3)">` +
    `<circle cx="35" cy="-88" r="6.4" fill="#ffaa44" fill-opacity="0.08" stroke="#ffc070" stroke-width="0.5" stroke-dasharray="3 1.2"/>` +
    `<circle cx="35" cy="-88" r="4" fill="none" stroke="#ffd08a" stroke-width="0.35" stroke-dasharray="0.4 1.6"/>` +
    `<path d="M35,-88 L35,-92.6 M35,-88 L38,-87" stroke="#fff0c8" stroke-width="0.6" stroke-linecap="round"/>` +
    `</g>`;
  return {
    box: [-76, -100, 150, 164],
    defs:
      lyraDefs() +
      blur("lyg", 1.4) +
      blur("ao", 1.5) +
      rad("lyamb", [[0, "#ffae3a", 0.2], [1, "#ffae3a", 0]]) +
      lin("lybeam", [[0, "#ffd08a", 0], [1, "#ffaa44", 0.35]]) +
      rad("lysh", [[0, "#000", 0.6], [1, "#000", 0]]),
    anim: { type: "breathe", amp: 0.005, speed: 1.4, pivot: [0, 58] },
    layers: [
      { markup: `<ellipse cx="0" cy="-30" rx="72" ry="78" fill="url(#lyamb)"/><ellipse cx="0" cy="58.5" rx="24" ry="3.6" fill="url(#lysh)"/>`, anim: { type: "pulse", min: 0.7, max: 1, speed: 1.1 } },
      { markup: panelA + panelB, anim: { type: "flicker", min: 0.55, max: 0.95, speed: 0.9 }, blend: "lighter" },
      { markup: fig.hairBack, anim: { type: "sway", amp: 0.012, speed: 1.3, pivot: [0, -84] } },
      { markup: fig.body },
      { markup: fig.glow + holo, anim: { type: "pulse", min: 0.55, max: 1, speed: 2.6 }, blend: "lighter" },
      { markup: dial, anim: { type: "spin", speed: 0.7, pivot: [39, -91] }, blend: "lighter" },
    ],
  };
}

// ── Squad ─────────────────────────────────────────────────────────────────

/** An armoured squad member in the standard frame; returns back/body/glow markup. */
function trooper(c) {
  const S = c.S;
  const st = c.stance ?? 0;
  const col = c.color;
  const P = c.pad ?? 0;
  const lw = c.legW ?? 0;
  const ink = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"`;
  const fine = `stroke="${INK}" stroke-width="0.7" stroke-linejoin="round"`;
  let back = c.back ?? "";
  let body = "";
  let glow = "";

  for (const sx of [-1, 1]) {
    const X = (x) => r1(sx * x);
    const tx = 6.6;
    const kx = 7.4 + st * 0.6;
    const ax = 7.2 + st;
    body += `<path d="${limb([[X(tx), -28, 11 + lw], [X(7.2 + st * 0.3), -4, 10 + lw], [X(kx), 20, 8.4 + lw], [X(7.4 + st * 0.8), 36, 7.6 + lw], [X(ax), 50, 6.6 + lw]])}" fill="url(#su)" ${ink}/>`;
    body += `<path d="M${X(tx - 4.6)},-23 L${X(tx + 4.8 + lw / 2)},-23 L${X(tx + 4.2 + lw / 2)},4 L${X(tx - 3.6)},6Z" fill="url(#st2)" ${fine}/>`;
    body += `<path d="M${X(kx - 4)},22 L${X(kx + 4.2 + lw / 2)},22 L${X(ax + 3.6 + lw / 2)},47 L${X(ax - 3.2)},47Z" fill="url(#st)" ${fine}/>`;
    body += `<path d="M${X(kx - 4.6 - lw / 2)},15.4 L${X(kx + 4.6 + lw / 2)},15.4 L${X(kx + 3.8 + lw / 2)},23.4 L${X(kx)},26 L${X(kx - 3.8 - lw / 2)},23.4Z" fill="url(#st)" ${fine}/>`;
    body += `<path d="M${X(ax - 3.9 - lw / 2)},45.5 L${X(ax + 3.9 + lw / 2)},45.5 L${X(ax + 4.4 + lw / 2)},54 L${X(ax + 5.6 + lw / 2)},58.6 L${X(ax - 4.8 - lw / 2)},58.6 L${X(ax - 4.4 - lw / 2)},53Z" fill="url(#bt)" ${ink}/>`;
    body += `<path d="M${X(kx - 3.4)},16.8 L${X(kx + 3.2)},16.8" fill="none" stroke="#c4d6e6" stroke-width="0.6" opacity="0.6"/>`;
  }
  // Pelvis, tassets, belt.
  body += `<path d="M-13,-35 L13,-35 L13.6,-24 C6,-20.6 -6,-20.6 -13.6,-24Z" fill="url(#su)" ${ink}/>`;
  for (const sx of [-1, 1]) {
    const X = (x) => r1(sx * x);
    body += `<path d="M${X(14.4)},-28.6 L${X(5.6)},-28.6 L${X(6.6)},-17 L${X(15)},-19Z" fill="url(#st2)" ${fine}/>`;
  }
  body += `<path d="M-14,-32.4 L14,-32.4 L14,-27.6 L-14,-27.6Z" fill="#161e28" ${fine}/>`;
  body += `<rect x="-2.6" y="-31.8" width="5.2" height="3.6" rx="0.6" fill="#0a0f16" stroke="${col}" stroke-width="0.6"/>`;
  body += c.belt ?? "";

  // Chest plate.
  const chest =
    `M${-(S - 3)},-65 C-7,-68.6 7,-68.6 ${S - 3},-65 L${r1(S - 1.4)},-52 C${r1(S - 2.4)},-44 ${r1(S * 0.64)},-38 ${r1(S * 0.62)},-32 ` +
    `L${r1(-S * 0.62)},-32 C${r1(-S * 0.64)},-38 ${r1(-(S - 2.4))},-44 ${r1(-(S - 1.4))},-52Z`;
  body += `<path d="${chest}" fill="url(#st)" ${ink}/>`;
  body += `<path d="M0,-67 L0,-46 M${-(S - 5)},-54 C-8,-49.6 -3,-49.6 0,-51.6 C3,-49.6 8,-49.6 ${S - 5},-54 M-7,-44.6 L7,-44.6 M-6.4,-38.6 L6.4,-38.6" fill="none" stroke="${INK}" stroke-width="0.6" opacity="0.55"/>`;
  body += `<path d="M${-(S - 5)},-63 C-9,-65.6 -4.6,-66 -1.6,-65.8" fill="none" stroke="#d6e6f4" stroke-width="0.9" opacity="0.7" stroke-linecap="round"/>`;
  body += `<path d="M${r1(S - 1.6)},-53 C${r1(S - 2.4)},-45 ${r1(S * 0.66)},-38.6 ${r1(S * 0.64)},-33" fill="none" stroke="${c.rim}" stroke-width="0.8" opacity="0.7"/>`;
  body += `<path d="M-2.4,-58.6 L2.4,-58.6 L0,-54.4Z" fill="${col}" stroke="${INK}" stroke-width="0.4"/>`;
  body += c.chest ?? "";
  // Arms over the chest edge, props in hand, then pauldrons capping the shoulders.
  const arms = {};
  for (const sx of [-1, 1]) arms[sx] = trooperArm(c, sx, c.arms?.[sx] ?? { rot: 9, bend: 14 });
  const prop = c.prop ? c.prop(arms) : {};
  body += prop.under ?? "";
  body += arms[-1].body + arms[1].body;
  body += prop.over ?? "";
  glow += prop.glow ?? "";
  // Pauldrons.
  for (const sx of c.pads ?? [-1, 1]) {
    const X = (x) => r1(sx * x);
    body += `<path d="M${X(S - 7)},-68.4 C${X(S + 1 + P)},-70 ${X(S + 5.6 + P)},${-65 - P / 2} ${X(S + 5.6 + P)},-57 C${X(S + 5 + P)},${-53.4 + P / 3} ${X(S + 2)},${-52 + P / 2} ${X(S - 2)},-54 C${X(S - 3)},-58.6 ${X(S - 5)},-63 ${X(S - 7)},-68.4Z" fill="url(#st)" ${ink}/>`;
    body += `<path d="M${X(S + 5.3 + P)},-57 C${X(S + 4.8 + P)},${-53.6 + P / 3} ${X(S + 2)},${-52.4 + P / 2} ${X(S - 2)},-54.4" fill="none" stroke="${col}" stroke-width="1" opacity="0.95"/>`;
    body += `<path d="M${X(S - 4.6)},-66.4 C${X(S + 0.4)},-67.6 ${X(S + 3.4)},-65 ${X(S + 4)},-61" fill="none" stroke="#d6e6f4" stroke-width="0.7" opacity="${sx < 0 ? 0.75 : 0.35}"/>`;
  }
  // Neck and helmet.
  body += `<rect x="-3.8" y="-72" width="7.6" height="7" fill="url(#su)" ${fine}/>`;
  const hs = c.helm ?? 1;
  let helm = "";
  helm += `<path d="M-8.6,-80 C-9,-90 -5,-94.2 0,-94.2 C5,-94.2 9,-90 8.6,-80 C8.6,-74.4 6.5,-70.4 3.6,-68.8 L-3.6,-68.8 C-6.5,-70.4 -8.6,-74.4 -8.6,-80Z" fill="url(#hm)" ${ink}/>`;
  helm += `<path d="M-7.9,-85 C-3,-86.6 3,-86.6 7.9,-85 L7.3,-79.4 C3,-77.8 -3,-77.8 -7.3,-79.4Z" fill="#03070c" ${fine}/>`;
  helm += `<path d="M-6.8,-83.6 C-3,-84.8 3,-84.8 6.8,-83.6 L6.5,-81.4 C3,-80.4 -3,-80.4 -6.5,-81.4Z" fill="${col}"/>`;
  helm += `<path d="M-5,-74.4 L0,-71.8 L5,-74.4 M-3.6,-77 L-3.6,-73.6 M3.6,-77 L3.6,-73.6" fill="none" stroke="${INK}" stroke-width="0.5" opacity="0.7"/>`;
  helm += `<path d="M-6,-89.6 C-3.4,-92.4 1.4,-93 4,-92.2" fill="none" stroke="#e2eef8" stroke-width="0.8" opacity="0.75" stroke-linecap="round"/>`;
  helm += `<path d="M8,-86 C8.9,-82 8.6,-77 6.4,-72.4" fill="none" stroke="${c.rim}" stroke-width="0.8" opacity="0.7"/>`;
  helm += c.helmet ?? "";
  body += `<g transform="translate(0 -81) scale(${hs}) translate(0 81)">${helm}</g>`;
  body += c.front ?? "";
  body += prop.front ?? "";

  glow += `<g transform="translate(0 -81) scale(${hs}) translate(0 81)"><path d="M-6.8,-83.6 C-3,-84.8 3,-84.8 6.8,-83.6 L6.5,-81.4 C3,-80.4 -3,-80.4 -6.5,-81.4Z" fill="${col}" filter="url(#gl)"/>` +
    `<path d="M-5.4,-83 C-2,-83.8 2,-83.8 5.4,-83" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.8"/></g>`;
  glow += `<path d="M-2.4,-58.6 L2.4,-58.6 L0,-54.4Z" fill="${col}" filter="url(#gl)"/>`;
  glow += `<rect x="-1.6" y="-31" width="3.2" height="2" fill="${col}" filter="url(#gl)"/>`;
  glow += c.glow ?? "";
  return { back, body, glow };
}

function squadMembers() {
  const kael = trooper({
    S: 22,
    pad: 3,
    legW: 2,
    stance: 1.5,
    helm: 1.08,
    color: "#4488ff",
    rim: "#6aa8ff",
    back: `<path d="M-16,-66 C-22,-44 -24,-16 -25,10 C-16,13 16,13 25,10 C24,-16 22,-44 16,-66Z" fill="url(#nv)" stroke="${INK}" stroke-width="1.5"/>`,
    helmet: `<path d="M0,-94.2 L0,-86.4" stroke="#8aa4bc" stroke-width="1.4"/><path d="M-8.4,-78 L-10.2,-76 L-9.8,-72 L-7.2,-72.4Z M8.4,-78 L10.2,-76 L9.8,-72 L7.2,-72.4Z" fill="url(#st2)" stroke="${INK}" stroke-width="0.6"/>`,
    // shield arm bent behind the shield, gauntlet hooked over its inner rim
    arms: { [-1]: { el: [-27.6, -35], wr: [-23, -25.4], hand: "none" }, [1]: { rot: 10, bend: 17 } },
    prop: () => ({
      front:
        `<g transform="translate(0 12)">` +
        `<path d="M-42,-60 C-36,-63.4 -26,-63.6 -18,-60.4 L-17.4,-12 C-19,-3 -26,3 -30,5 C-34,3 -41,-3 -42.6,-12Z" fill="url(#st)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<path d="M-39.4,-57.6 C-34,-60.4 -26,-60.6 -20.6,-58 L-20.2,-13.4 C-21.6,-6 -26.6,-1.4 -30,0.6 C-33.4,-1.4 -38.4,-6 -39.8,-13.4Z" fill="none" stroke="#0b1520" stroke-width="0.8"/>` +
        `<path d="M-30,-55 L-30,-4 M-36,-40 L-30,-34 L-24,-40" fill="none" stroke="#4488ff" stroke-width="1.4" stroke-linejoin="round"/>` +
        `<path d="M-40,-58 C-35,-61 -28,-61.4 -22,-59.6" fill="none" stroke="#e2eef8" stroke-width="0.9" opacity="0.7"/>` +
        `</g>` +
        fist([-23.4, -26.4], 66, -1),
      glow: `<path d="M-30,-43 L-30,8 M-36,-28 L-30,-22 L-24,-28" fill="none" stroke="#4488ff" stroke-width="2.4" filter="url(#gl)"/>`,
    }),
  });
  const nova = trooper({
    S: 16.5,
    stance: 3,
    color: "#ff4488",
    rim: "#ff6aa0",
    pads: [-1],
    back: `<path d="M-3,-70 C6,-72.4 16,-67 26,-61 C32,-57.6 38,-53 43,-51 C37,-49.4 30,-50 24.4,-52 C28,-47 30,-42.4 31,-37.6 C24,-42 15,-50 5,-62Z" fill="url(#pk)" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`,
    helmet:
      `<path d="M-1.4,-94 C2,-97.4 9,-98 16,-93.6 C9.6,-93.4 5,-92 1.6,-89Z" fill="url(#st)" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>` +
      `<path d="M2,-94.6 C6,-96 11,-95.8 15,-93.8" fill="none" stroke="#ff4488" stroke-width="0.7"/>`,
    chest: `<path d="M-6.8,-71 C-3,-68 3,-68 6.8,-71 L7.2,-65.6 C3,-63.4 -3,-63.4 -7.2,-65.6Z" fill="url(#pk)" stroke="${INK}" stroke-width="0.8"/>`,
    // twin blades at rest, points angled down and away from the legs
    arms: { [-1]: { rot: 13, bend: 6 }, [1]: { rot: 12, bend: 6 } },
    prop: (A) => {
      let under = "";
      let glow = "";
      for (const sx of [-1, 1]) {
        const { wr, fo } = A[sx];
        const dir = fo + sx * 9;
        const base = polar(wr, fo, 11.4);
        const tip = polar(base, dir, 23);
        const blade = `M${P(polar(base, dir + 90, 1.5))} L${P(tip)} L${P(polar(base, dir - 90, 1.5))}Z`;
        under += `<path d="${capsule(polar(wr, fo, 4), base, 2.2, 2.2).d}" fill="#2a3440" stroke="${INK}" stroke-width="0.7"/>`;
        under += `<path d="M${P(polar(base, dir + 90, 3))} L${P(polar(base, dir - 90, 3))}" stroke="#2a3440" stroke-width="1.8" stroke-linecap="round"/>`;
        under += `<path d="${blade}" fill="#ffd2e4" stroke="#ff4488" stroke-width="0.6"/>`;
        glow += `<path d="${blade}" fill="#ff4488" stroke="#ff4488" stroke-width="1.6" filter="url(#gl)"/>`;
      }
      return { under, glow };
    },
  });
  const rook = trooper({
    S: 19,
    stance: 1,
    color: "#44ff88",
    rim: "#6affa4",
    back:
      `<path d="M-15.6,-73 L15.6,-73 C17.4,-73 18.6,-71.6 18.6,-69.6 L19.6,-34 L-19.6,-34 L-18.6,-69.6 C-18.6,-71.6 -17.4,-73 -15.6,-73Z" fill="url(#pkb)" stroke="${INK}" stroke-width="1.5"/>` +
      `<path d="M-14,-70.4 L14,-70.4" stroke="#44ff88" stroke-width="0.9" opacity="0.8"/>` +
      `<path d="M-12,-72 L-15.6,-104" stroke="#8898a8" stroke-width="1" stroke-linecap="round"/>` +
      `<path d="${limb([[12, -72, 4.4], [19, -86, 3.6]])}" fill="url(#st)" stroke="${INK}" stroke-width="1"/>` +
      `<path d="${limb([[19, -86, 3.2], [29.6, -79.6, 2.8]])}" fill="url(#st)" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="19" cy="-86" r="2.4" fill="#2a3440" stroke="${INK}" stroke-width="0.8"/>` +
      `<path d="M29.6,-79.6 L33.6,-84 M29.6,-79.6 L34.6,-76.6" stroke="#9fb2c4" stroke-width="1.5" stroke-linecap="round"/>`,
    belt:
      `<rect x="-12.6" y="-31" width="5" height="6.4" rx="0.8" fill="#243040" stroke="${INK}" stroke-width="0.6"/>` +
      `<rect x="7.6" y="-31" width="5" height="6.4" rx="0.8" fill="#243040" stroke="${INK}" stroke-width="0.6"/>`,
    helmet: `<rect x="8" y="-86" width="3" height="7" rx="0.8" fill="url(#st2)" stroke="${INK}" stroke-width="0.6"/><circle cx="9.5" cy="-84" r="0.8" fill="#44ff88"/>`,
    front: `<path d="M-2,-49 L2,-49 L2,-43 L-2,-43Z" fill="#0a0f16" stroke="#44ff88" stroke-width="0.5"/>`,
    glow: `<circle cx="-15.6" cy="-104" r="1.8" fill="#44ff88" filter="url(#gl)"/><circle cx="-15.6" cy="-104" r="0.8" fill="#eaffea"/><path d="M-14,-70.4 L14,-70.4" stroke="#44ff88" stroke-width="1.6" filter="url(#gl)"/>`,
    // wrench hanging from one hand, the other fist planted on the hip
    arms: { [-1]: { rot: 7, bend: 12 }, [1]: { rot: 50, bend: 115, upper: 26, fore: 16 } },
    prop: (A) => {
      const { wr, fo } = A[-1];
      const a = polar(wr, fo, 5);
      const b = polar(wr, fo - 4, 27);
      const jaw = `<g transform="${frame(b, fo - 4)}"><path d="M-3.4,-1.6 C-4.6,1.6 -4.4,4.6 -2.6,6.4 L-1.2,4.2 L-1.4,1.6 L1.4,1.6 L1.2,4.2 L2.6,6.4 C4.4,4.6 4.6,1.6 3.4,-1.6Z" fill="url(#st)" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/></g>`;
      return {
        under:
          `<path d="${capsule(a, b, 2.6, 2.8).d}" fill="url(#st2)" stroke="${INK}" stroke-width="0.8"/>` +
          `<path d="M${P(polar(a, fo + 90, 0.5))} L${P(polar(b, fo + 86, 0.6))}" stroke="#c4d6e6" stroke-width="0.4" opacity="0.7"/>` +
          jaw,
      };
    },
  });
  const you = trooper({
    S: 18.5,
    stance: 1.2,
    color: "#00ffcc",
    rim: "#22e6ff",
    back:
      `<path d="M-15,-67 C-21,-40 -25,0 -27.6,50 C-19,53.6 -9,51.4 0,53.4 C9,51.4 19,53.6 27.6,50 C25,0 21,-40 15,-67Z" fill="url(#cp)" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<path d="M-9,-50 C-12,-20 -14,10 -15,50 M9,-50 C12,-20 14,10 16,49 M0,-40 C0,-10 0,20 0,52" fill="none" stroke="#2a0606" stroke-width="1" opacity="0.7"/>` +
      `<path d="M-20,-30 C-22,0 -24,24 -25.4,48" fill="none" stroke="#b83030" stroke-width="0.8" opacity="0.55"/>`,
    chest: `<path d="M-15.4,-66.6 C-11,-70.4 11,-70.4 15.4,-66.6" fill="none" stroke="#7a1818" stroke-width="2.4"/>`,
    arms: { [-1]: { rot: 10, bend: 15 }, [1]: { rot: 8, bend: 19 } },
  });
  const lyra = lyraFigure({ pose: "slate", visor: true });
  return { kael, nova, rook, you, lyra };
}

function partyModel() {
  const m = squadMembers();
  const place = (x, y, s, markup) => at(x, y, s, markup);
  const K = [-84, 2.2, 0.64];
  const L = [-44, 4.2, 0.6];
  const Y = [0, 3.4, 0.7];
  const N = [44, 3.8, 0.62];
  const R = [84, 2.8, 0.62];
  const ring = (x, y, col) =>
    `<ellipse cx="${x}" cy="${y}" rx="15" ry="2.6" fill="none" stroke="${col}" stroke-width="0.9" opacity="0.8"/>` +
    `<ellipse cx="${x}" cy="${y}" rx="13" ry="2" fill="${col}" opacity="0.28" filter="url(#fl)"/>`;
  const feet = (T) => r1(T[1] + 58.6 * T[2]);
  const floor =
    `<ellipse cx="0" cy="-10" rx="118" ry="62" fill="url(#amb)"/>` +
    `<ellipse cx="0" cy="44" rx="112" ry="9" fill="url(#gsh)"/>` +
    ring(K[0], feet(K), "#4488ff") + ring(L[0], feet(L), "#ffaa44") + ring(Y[0], feet(Y), "#00ffcc") +
    ring(N[0], feet(N), "#ff4488") + ring(R[0], feet(R), "#44ff88");
  return {
    box: [-116, -72, 232, 126],
    defs:
      lyraDefs() +
      lin("st", [[0, "#8aa4bc"], [0.3, "#4a6078"], [0.7, "#2a3a4c"], [1, "#141c26"]], 0, 0, 1, 0.4) +
      lin("st2", [[0, "#5a7088"], [0.5, "#2e3e50"], [1, "#121a24"]], 0, 0, 1, 0.3) +
      lin("hm", [[0, "#9ab4ca"], [0.35, "#50667e"], [1, "#16202c"]], 0, 0, 1, 0.6) +
      lin("su", [[0, "#2a3644"], [0.5, "#161e28"], [1, "#080c12"]], 0, 0, 1, 0) +
      lin("bt", [[0, "#2e3846"], [1, "#07090d"]], 0, 0, 1, 0) +
      lin("cp", [[0, "#a02626"], [0.45, "#6b1515"], [1, "#2e0707"]], 0, 0, 1, 0) +
      lin("nv", [[0, "#2c4058"], [1, "#0a121c"]], 0, 0, 1, 0) +
      lin("pk", [[0, "#ff5a96"], [0.5, "#b82a60"], [1, "#4a0c24"]], 0, 0, 1, 0.3) +
      lin("pkb", [[0, "#3a4858"], [1, "#10161e"]], 0, 0, 1, 0) +
      rad("amb", [[0, "#22c8ff", 0.13], [1, "#22c8ff", 0]]) +
      rad("gsh", [[0, "#000", 0.7], [1, "#000", 0]]) +
      blur("gl", 1.6) +
      blur("fl", 1.2) +
      blur("lyg", 1.4) +
      blur("ao", 1.5),
    anim: { type: "breathe", amp: 0.004, speed: 1.5, pivot: [0, 44] },
    layers: [
      { markup: floor, anim: { type: "pulse", min: 0.65, max: 1, speed: 1.8 } },
      { markup: place(...K, m.kael.back + m.kael.body) + place(...R, m.rook.back + m.rook.body) },
      { markup: place(...L, m.lyra.hairBack + m.lyra.body) + place(...N, m.nova.back + m.nova.body) },
      { markup: place(...Y, m.you.back), anim: { type: "sway", amp: 0.018, speed: 1.7, pivot: [0, -43] } },
      { markup: place(...Y, m.you.body) },
      {
        markup: place(...K, m.kael.glow) + place(...R, m.rook.glow) + place(...L, m.lyra.glow) + place(...N, m.nova.glow) + place(...Y, m.you.glow),
        anim: { type: "pulse", min: 0.6, max: 1, speed: 2.4 },
        blend: "lighter",
      },
    ],
  };
}

// ── Portrait busts ────────────────────────────────────────────────────────

/** Fade mask for the bottom of a bust. */
const bustFade = (id, y0, y1) =>
  `<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
  `<mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><rect x="-200" y="-200" width="400" height="400" fill="url(#${id}g)"/></mask>`;

const VOSS_FACE = {
  male: true,
  w: 7.2,
  jaw: 6.3,
  chin: 3,
  skin: ["#dcb896", "#b58c6c", "#6a4a36"],
  iris: "#5a96cc",
  browC: "#5a6674",
  brows: "stern",
  lip: ["#a47460", "#7e5444"],
  mouth: "stern",
  rim: "#5ad8ff",
  neck: 3.8,
};

function vossModel() {
  const hair =
    `<path d="M-7.5,-1 C-8.2,-7.6 -5.8,-11.6 -0.4,-11.9 C5.2,-12.1 8.4,-8.8 7.7,-1.4 C7.3,-3.8 6.7,-5.8 5.3,-6.8 C3,-8.1 -1.6,-8.5 -4.6,-7.5 C-6.4,-6.7 -7.1,-4.4 -7.5,-1Z" fill="url(#vhr)" stroke="${INK}" stroke-width="0.45"/>` +
    `<path d="M-5.4,-7.4 C-3.4,-10.2 1,-11.2 5.2,-9.6 M-3.2,-8.2 C-0.2,-10.4 3.6,-10.6 6.6,-8 M-6.6,-4.6 C-6.4,-8.6 -3.2,-10.8 1,-11.3 M1,-8.4 C3.6,-9.4 5.8,-8.6 7,-6.4" fill="none" stroke="#dfe6ee" stroke-width="0.3" opacity="0.65"/>` +
    `<path d="M-4.2,-9.8 C-1,-11.2 3,-11.2 6,-9.2 M-7,-2.6 C-6.8,-5.4 -6,-7 -4.8,-7.8" fill="none" stroke="#3e4854" stroke-width="0.3" opacity="0.8"/>`;
  const extras =
    `<path d="M-5.6,-1.8 L-2.7,4.4" stroke="#6a4636" stroke-width="0.55" stroke-linecap="round" opacity="0.8"/>` +
    `<path d="M-5.8,-1.6 L-2.9,4.6" stroke="#ecc6ae" stroke-width="0.25" stroke-linecap="round"/>` +
    `<path d="M-3.6,-5.6 Q0,-6.1 3.6,-5.6 M-2.6,-4.6 Q0,-5 2.6,-4.6 M5.2,-0.2 L6.2,-0.6 M5.2,0.5 L6.1,0.6 M-1.2,-2.4 L-0.9,-1.2" fill="none" stroke="#6a4a36" stroke-width="0.22" opacity="0.5"/>` +
    `<path d="M-6.2,2.4 Q-5.2,4.6 -5.6,6.8" fill="none" stroke="#6a4a36" stroke-width="0.3" opacity="0.35"/>`;
  const head = face("vf", { ...VOSS_FACE, x: 0, y: -60, s: 2.1, front: hair, over: extras });

  const arm = "M-33,-28.4 C-45,-26.4 -51.4,-14 -51.8,2 C-52,18 -51,34 -50.2,48 L-37,48 L-36.6,10Z";
  const torso = "M-9,-37.4 C-18,-35.4 -30,-31 -38,-25 C-42,-20 -42,-8 -40,6 L-37,48 L37,48 L40,6 C42,-8 42,-20 38,-25 C30,-31 18,-35.4 9,-37.4 C5,-33 -5,-33 -9,-37.4Z";
  const pad = "M-21,-33.6 L-40,-27.6 L-47.6,-15 L-45.6,-5.4 L-37,-8.4 L-33,-20 L-19.6,-27.4Z";
  const collar = "M-8.6,-41.4 C-12.8,-39.4 -16.6,-36 -19,-31.8 L-16.8,-23 L-5.6,-28.4 C-6.6,-32.4 -7.6,-37 -8.6,-41.4Z";
  let body = "";
  body += `<path d="${arm}" fill="url(#vja)" stroke="${INK}" stroke-width="1.1"/><path d="${mir(arm)}" fill="url(#vja)" stroke="${INK}" stroke-width="1.1"/>`;
  body += `<path d="${torso}" fill="url(#vjk)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  body += `<path d="M-38.4,-22 C-41,-8 -40,10 -38,30 M38.4,-22 C41,-8 40,10 38,30" fill="none" stroke="#000" stroke-width="2" opacity="0.35"/>`;
  body += `<path d="M-4,-33 L7,-14 L7,48" fill="none" stroke="#05070c" stroke-width="0.8"/><path d="M-3,-33.6 L8,-14.6 L8,48" fill="none" stroke="#3e4a64" stroke-width="0.4" opacity="0.8"/>`;
  body += [-26, -20, -14].map((y) => `<circle cx="10.6" cy="${y + 18}" r="0.9" fill="#0a0e16" stroke="#56647e" stroke-width="0.35"/>`).join("");
  body += `<path d="M-31,-12 L-13,-13.4 L-13,-7.6 L-31,-6.4Z" fill="#141a28" stroke="${INK}" stroke-width="0.5"/><path d="M-30,-11.4 L-14,-12.6" stroke="#46526c" stroke-width="0.35"/>`;
  body += `<path d="M-32,20 L-14,19 M14,19 L32,20" stroke="#05070c" stroke-width="0.6" opacity="0.7"/>`;
  body += [-17, -12.6, -8.2].map((y) => `<path d="M17.4,${y} L23.6,${y + 3.4} L29.8,${y}" fill="none" stroke="#00aadd" stroke-width="1.3" stroke-linejoin="round"/>`).join("");
  body += `<path d="${pad}" fill="url(#vst)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/><path d="${mir(pad)}" fill="url(#vst)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  body += `<path d="M-22,-32.4 L-39.4,-26.8 L-46.4,-15.4" fill="none" stroke="#b8cee2" stroke-width="0.6" opacity="0.8"/>`;
  body += `<path d="M-38,-12 L-34.4,-21 L-22,-27.6 M38,-12 L34.4,-21 L22,-27.6" fill="none" stroke="#0a0e16" stroke-width="0.5" opacity="0.8"/>`;
  body += `<path d="M22,-32.4 L40,-27.6 L47.6,-15 L45.6,-5.4" fill="none" stroke="#22e6ff" stroke-width="0.8" opacity="0.75"/>`;
  body += `<path d="M40.6,-2 C41.4,10 40,24 38.6,40" fill="none" stroke="#22e6ff" stroke-width="0.9" opacity="0.5"/>`;
  body += `<path d="M-50.2,0 C-50.6,14 -50.2,28 -49.8,44" fill="none" stroke="#5a6a88" stroke-width="0.6" opacity="0.6"/>`;
  let col = "";
  col += `<path d="M-6,-40 C-3,-36.6 3,-36.6 6,-40 L7,-33 C3,-31 -3,-31 -7,-33Z" fill="#070a10" opacity="0.7"/>`;
  col += `<path d="${collar}" fill="url(#vcl)" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/><path d="${mir(collar)}" fill="url(#vcl)" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round"/>`;
  col += `<path d="M-8.6,-41.4 C-12.8,-39.4 -16.6,-36 -19,-31.8 M8.6,-41.4 C12.8,-39.4 16.6,-36 19,-31.8" fill="none" stroke="#00b4ff" stroke-width="0.7" opacity="0.85"/>`;

  const grid =
    `<ellipse cx="0" cy="-50" rx="86" ry="72" fill="url(#vbg)"/>` +
    `<g stroke="#2ab8ff" stroke-width="0.4" opacity="0.28">` +
    [-84, -72, -60, -48, -36, -24, -12].map((y) => `<path d="M-82,${y} L82,${y}"/>`).join("") +
    [-80, -64, -48, -32, -16, 0, 16, 32, 48, 64, 80].map((x) => `<path d="M${x},-90 L${r1(x * 0.8)},0"/>`).join("") +
    `</g>` +
    `<g fill="none" stroke="#5ad0ff" stroke-width="0.6" opacity="0.6"><circle cx="-56" cy="-66" r="9"/><circle cx="-56" cy="-66" r="4.4" stroke-dasharray="2 1.4"/><path d="M-68,-66 L-60,-66 M-52,-66 L-44,-66 M-56,-78 L-56,-70 M-56,-62 L-56,-54"/>` +
    `<path d="M50,-80 L74,-80 L74,-62 M-40,-66 L-20,-74 L10,-84 L50,-72" stroke-dasharray="3 2"/></g>`;
  const echoShape = at(0, -60, 2.1, `<path d="${headPath(VOSS_FACE)}"/><path d="M-7.5,-1 C-8.2,-7.6 -5.8,-11.6 -0.4,-11.9 C5.2,-12.1 8.4,-8.8 7.7,-1.4"/><path d="M-4.4,4 L-5,18 M4.4,4 L5,18"/>`);
  const echo =
    `<g transform="translate(10 -3)" fill="#9b5cff" fill-opacity="0.14" stroke="#b48aff" stroke-width="0.7" mask="url(#vgm)">${echoShape}</g>` +
    `<g transform="translate(-9 2)" fill="#ff2a4a" fill-opacity="0.06" stroke="#ff2a4a" stroke-width="0.5" opacity="0.7" mask="url(#vgm)">${echoShape}</g>`;
  const lights =
    `<circle cx="-56" cy="-66" r="2.2" fill="#ff5040" filter="url(#vgl)"/><circle cx="-56" cy="-66" r="1" fill="#ffd0c0"/>` +
    `<g mask="url(#vm)">` +
    [-17, -12.6, -8.2].map((y) => `<path d="M17.4,${y} L23.6,${y + 3.4} L29.8,${y}" fill="none" stroke="#00ccff" stroke-width="1.8" filter="url(#vgl)"/>`).join("") +
    `</g><path d="M-8.6,-41.4 C-12.8,-39.4 -16.6,-36 -19,-31.8 M8.6,-41.4 C12.8,-39.4 16.6,-36 19,-31.8" fill="none" stroke="#00b4ff" stroke-width="1.4" filter="url(#vgl)"/>`;

  return {
    box: [-92, -98, 184, 146],
    defs:
      faceDefs("vf", VOSS_FACE) +
      lin("vhr", [[0, "#d4dce4"], [0.45, "#8e9cac"], [1, "#46505e"]], 0, 0, 1, 1) +
      lin("vjk", [[0, "#36425c"], [0.42, "#1c2334"], [1, "#090c14"]], 0, 0, 1, 0.3) +
      lin("vja", [[0, "#26304a"], [1, "#080a12"]], 0, 0, 1, 0) +
      lin("vst", [[0, "#7890a8"], [0.35, "#3a4d61"], [1, "#161f2a"]], 0, 0, 1, 0.8) +
      lin("vcl", [[0, "#34405a"], [1, "#101520"]], 0, 0, 1, 0.4) +
      rad("vbg", [[0, "#1a8cff", 0.2], [0.6, "#0a4aa0", 0.08], [1, "#0a4aa0", 0]]) +
      blur("vgl", 1.3) +
      bustFade("vm", 14, 46) +
      `<mask id="vgm" maskUnits="userSpaceOnUse" x="-120" y="-120" width="240" height="200">` +
      Array.from({ length: 26 }, (_, i) => `<rect x="-120" y="${-96 + i * 2.6}" width="240" height="${[1.8, 1.2, 2, 0.8][i % 4]}" fill="#fff"/>`).join("") +
      `</mask>`,
    anim: { type: "breathe", amp: 0.005, speed: 1.2, pivot: [0, 46] },
    layers: [
      { markup: grid, anim: { type: "flicker", min: 0.7, max: 1, speed: 0.6 } },
      { markup: echo, anim: { type: "drift", amp: 2.2, speed: 0.8 }, blend: "lighter", opacity: 0.55 },
      { markup: `<g mask="url(#vm)">${body}</g>${head}${col}` },
      { markup: lights, anim: { type: "pulse", min: 0.35, max: 1, speed: 3.2 }, blend: "lighter" },
    ],
  };
}

const MIRI_FACE = {
  skin: ["#eebd98", "#c8956c", "#7a4e34"],
  iris: "#5a8a50",
  browC: "#3a2616",
  lip: ["#c07060", "#924c3e"],
  lashes: true,
  mouth: "smile",
  rim: "#7affc8",
  neck: 3.3,
};

function miriModel() {
  const back =
    `<circle cx="4.6" cy="-10.8" r="4.4" fill="url(#mhr)" stroke="${INK}" stroke-width="0.45"/>` +
    `<path d="M1.4,-12.4 C3.4,-15 6.8,-14.8 8.4,-12.4 M1.6,-9.6 C3.6,-7.4 7,-7.8 8.6,-10" fill="none" stroke="#0e0804" stroke-width="0.35" opacity="0.8"/>` +
    `<path d="M2.4,-13.6 C4,-14.8 6,-14.8 7.4,-13.6" fill="none" stroke="#a06a40" stroke-width="0.3" opacity="0.8"/>` +
    `<path d="M-7.6,-2 C-8.4,-9 -4.6,-11.8 0,-11.8 C4.6,-11.8 8.4,-9 7.6,-2 C7.8,1 7.4,3 7,4 L-7,4 C-7.4,3 -7.8,1 -7.6,-2Z" fill="#1a0f07"/>`;
  const front =
    `<path d="M-7.3,0.6 C-7.9,-7.2 -5,-10.9 0,-11 C5,-10.9 7.9,-7.2 7.3,0.6 C6.9,-3.2 6,-5.6 4.4,-6.8 C3,-7.6 1.2,-7.8 0.2,-7.2 C-1,-7.8 -3,-7.6 -4.4,-6.8 C-6,-5.6 -6.9,-3.2 -7.3,0.6Z" fill="url(#mhr)" stroke="${INK}" stroke-width="0.45"/>` +
    `<path d="M-5,-8.4 C-3.2,-10 -1.2,-10.4 0,-9.4 M0.4,-9.4 C2,-10.4 4.4,-10 5.8,-8 M-6.4,-4.4 C-5.8,-7.4 -3.6,-9 -1.2,-9" fill="none" stroke="#9a6438" stroke-width="0.35" opacity="0.8"/>` +
    `<path d="M-6.6,-5.2 C-7.6,-2 -7.4,2 -6.3,5.4 M6.2,-5.8 C7.2,-2 7.5,2 6.7,6.2" fill="none" stroke="#2a1a10" stroke-width="0.6" stroke-linecap="round"/>` +
    `<path d="M1.6,-12.4 C3,-10.6 6.4,-10.8 8.2,-12.8" fill="none" stroke="#4ac0a0" stroke-width="0.8" stroke-linecap="round"/>`;
  const head = face("mf", { ...MIRI_FACE, x: 0, y: -58, s: 1.95, back, front });

  const arm = "M-29.4,-27.4 C-39.6,-25.4 -45.2,-14 -45.6,1 C-45.8,18 -45,34 -44.4,48 L-33,48 L-32.6,10Z";
  const torso = "M-8,-36.4 C-16,-34.4 -26,-30.4 -32.4,-24.4 C-36.4,-19 -36.6,-8 -34.8,6 L-32,48 L32,48 L34.8,6 C36.6,-8 36.4,-19 32.4,-24.4 C26,-30.4 16,-34.4 8,-36.4 C4,-32 -4,-32 -8,-36.4Z";
  let body = "";
  body += `<path d="${arm}" fill="url(#mta)" stroke="${INK}" stroke-width="1.1"/><path d="${mir(arm)}" fill="url(#mta)" stroke="${INK}" stroke-width="1.1"/>`;
  body += `<path d="${torso}" fill="url(#mtl)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  body += `<path d="M-33,-20 C-35.4,-6 -34.6,12 -32.6,30 M33,-20 C35.4,-6 34.6,12 32.6,30" fill="none" stroke="#000" stroke-width="1.8" opacity="0.35"/>`;
  body += `<path d="M-12.4,-32 C-6,-30.4 6,-30.4 12.4,-32 L13.6,48 L-13.6,48Z" fill="url(#mwp)" stroke="${INK}" stroke-width="0.8"/>`;
  body += `<path d="M-11.2,-30 L-12.2,48 M11.2,-30 L12.2,48" stroke="#4ac0a0" stroke-width="0.4" stroke-dasharray="1.2 0.8" opacity="0.8"/>`;
  body += `<path d="M-1.8,-20 L1.8,-20 L1.8,-15.4 L6.4,-15.4 L6.4,-11.8 L1.8,-11.8 L1.8,-7.2 L-1.8,-7.2 L-1.8,-11.8 L-6.4,-11.8 L-6.4,-15.4 L-1.8,-15.4Z" fill="url(#mrc)" stroke="#5a1414" stroke-width="0.4"/>`;
  body += `<path d="M-6,4 L6,4 M-6,10 L6,10" stroke="#9aa49c" stroke-width="0.4" opacity="0.8"/>`;
  for (const sx of [-1, 1]) {
    body += `<g transform="translate(${sx * 26} -23.6) rotate(${sx * 26})"><rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx="1.2" fill="#122626" stroke="#4ac0a0" stroke-width="0.6"/><path d="M-0.8,-2.8 L0.8,-2.8 L0.8,-0.8 L2.8,-0.8 L2.8,0.8 L0.8,0.8 L0.8,2.8 L-0.8,2.8 L-0.8,0.8 L-2.8,0.8 L-2.8,-0.8 L-0.8,-0.8Z" fill="#4ac0a0"/></g>`;
  }
  body += `<path d="M33,-24 C36.6,-19 36.8,-8 35,6 L33,40" fill="none" stroke="#7affc8" stroke-width="0.8" opacity="0.5"/>`;
  body += `<path d="M-30.6,-25.4 C-24,-30.4 -15,-34 -8,-36" fill="none" stroke="#6aa6a0" stroke-width="0.5" opacity="0.7"/>`;
  // Raised forearm and hand holding the med-scanner.
  const grip = "translate(-24 10) rotate(30)";
  let hand = "";
  hand += `<path d="${limb([[-39.6, 56, 11.6], [-34.6, 40, 10.6], [-30.4, 29, 9.6], [-26.8, 21.4, 8.6]])}" fill="url(#mta)" stroke="${INK}" stroke-width="1.1"/>`;
  hand += `<path d="M-38.6,50 C-37,42 -35,36 -32.4,30" fill="none" stroke="#7affc8" stroke-width="0.6" opacity="0.4"/>`;
  hand += `<path d="${limb([[-30, 25.4, 9.8], [-27.2, 20.8, 9.2]])}" fill="#d8d8d0" stroke="${INK}" stroke-width="0.7"/>`;
  hand += `<g transform="${grip}">`;
  hand += `<path d="M-1.2,1.6 C-1.6,6 0.4,9.4 4.6,9.8 C8.4,10 10.6,7.4 10.4,2.4Z" fill="url(#mfsk)" stroke="${INK}" stroke-width="0.7"/>`;
  hand += `<rect x="-12" y="-4.2" width="24" height="8.4" rx="2" fill="url(#msc)" stroke="${INK}" stroke-width="0.8"/>`;
  hand += `<rect x="-12.8" y="-2.8" width="2.6" height="5.6" rx="0.8" fill="#7affc8" stroke="${INK}" stroke-width="0.4"/>`;
  hand += `<rect x="-8" y="-2.8" width="7" height="2.4" rx="0.5" fill="#0a1a18" stroke="#4ac0a0" stroke-width="0.35"/>`;
  hand += `<path d="M-11,-3.2 L10.6,-3.2" stroke="#8aa0a4" stroke-width="0.4" opacity="0.7"/>`;
  hand += [0.2, 2.7, 5.2, 7.7].map((x, i) => `<rect x="${x}" y="${-1.6 + [0.4, 0, 0.2, 0.8][i]}" width="2.5" height="${[6.4, 7, 6.8, 6][i]}" rx="1.2" fill="url(#mfsk)" stroke="${INK}" stroke-width="0.45"/>`).join("");
  hand += `<path d="M0.8,-0.6 C1.4,-1.2 2,-1.2 2.4,-0.6 M3.3,-1 C3.9,-1.6 4.5,-1.6 4.9,-1 M5.8,-0.8 C6.4,-1.4 7,-1.4 7.4,-0.8" fill="none" stroke="#f4cda8" stroke-width="0.35" opacity="0.8"/>`;
  hand += `</g>`;

  const panel =
    `<g transform="translate(-68 -62) rotate(-6)">` +
    `<rect x="-17" y="-22" width="34" height="44" rx="1.4" fill="#64ffb4" fill-opacity="0.08" stroke="#7affc8" stroke-width="0.6" stroke-opacity="0.7"/>` +
    `<path d="M-14,-16 L-10,-16 M-12,-18 L-12,-14" stroke="#7affc8" stroke-width="0.9"/>` +
    `<rect x="-6" y="-17" width="18" height="2" fill="#7affc8" opacity="0.5"/>` +
    `<path d="M-14,-4 L-7,-4 L-5,-11 L-2.4,3 L0.4,-7 L2.4,-4 L14,-4" fill="none" stroke="#9affd2" stroke-width="0.8" stroke-linejoin="round"/>` +
    [0, 1, 2, 3].map((i) => `<rect x="-14" y="${6 + i * 3.6}" width="${[16, 22, 11, 19][i]}" height="1.4" fill="#7affc8" opacity="0.55"/>`).join("") +
    `</g>`;
  const beam = `<path d="M-35,3.6 L-80,-30 L-70,-6 Z" fill="url(#mbm)"/>`;
  const lights =
    `<g transform="${grip}"><rect x="-13.4" y="-3.4" width="3.8" height="6.8" rx="1" fill="#7affc8" filter="url(#mgl)"/></g>` +
    `<path d="M-1.8,-20 L1.8,-20 L1.8,-15.4 L6.4,-15.4 L6.4,-11.8 L1.8,-11.8 L1.8,-7.2 L-1.8,-7.2 L-1.8,-11.8 L-6.4,-11.8 L-6.4,-15.4 L-1.8,-15.4Z" fill="#ff5050" opacity="0.4" filter="url(#mgl)"/>`;

  return {
    box: [-94, -96, 180, 144],
    defs:
      faceDefs("mf", MIRI_FACE) +
      lin("mhr", [[0, "#6e4628"], [0.4, "#3a2414"], [1, "#120a05"]], 0, 0, 1, 1) +
      lin("mtl", [[0, "#34645f"], [0.45, "#1a3a3a"], [1, "#081818"]], 0, 0, 1, 0.3) +
      lin("mta", [[0, "#24504c"], [1, "#061414"]], 0, 0, 1, 0) +
      lin("mwp", [[0, "#f4f2ea"], [0.55, "#cfd0c6"], [1, "#7c847e"]], 0, 0, 1, 0) +
      lin("mrc", [[0, "#ee4a4a"], [1, "#a82424"]], 0, 0, 1, 1) +
      lin("msc", [[0, "#50646a"], [0.5, "#2a3a3a"], [1, "#101818"]], 0, 0, 0, 1) +
      lin("mbm", [[0, "#7affc8", 0.35], [1, "#7affc8", 0]], 1, 1, 0, 0) +
      rad("mbg", [[0, "#3affc0", 0.17], [0.6, "#1a9a80", 0.06], [1, "#1a9a80", 0]]) +
      blur("mgl", 1.3) +
      bustFade("mm", 16, 46),
    anim: { type: "breathe", amp: 0.005, speed: 1.3, pivot: [0, 46] },
    layers: [
      { markup: `<ellipse cx="0" cy="-46" rx="88" ry="74" fill="url(#mbg)"/>`, anim: { type: "pulse", min: 0.65, max: 1, speed: 1.2 } },
      { markup: panel + beam, anim: { type: "flicker", min: 0.55, max: 0.95, speed: 0.9 }, blend: "lighter" },
      { markup: `<g mask="url(#mm)">${body}</g>${head}<g mask="url(#mm)">${hand}</g>` },
      { markup: lights, anim: { type: "pulse", min: 0.4, max: 1, speed: 2.8 }, blend: "lighter" },
    ],
  };
}

const KAI_FACE = {
  male: true,
  w: 7.6,
  jaw: 6.8,
  chin: 3.4,
  skin: ["#f0c496", "#cf9c6c", "#7e5232"],
  iris: "#8a5a30",
  browC: "#241608",
  brows: "raised",
  lip: ["#b07a62", "#86584a"],
  mouth: "grin",
  rim: "#ffc070",
  neck: 4.6,
};

function kaiModel() {
  const hair =
    `<path d="M-7.9,-0.6 C-8.7,-5.6 -8.2,-9.4 -6.6,-11 L-7.8,-14.6 L-4.6,-12.6 L-4,-16.2 L-1.6,-12.9 L0.4,-17 L2,-13.1 L4.6,-16 L4.9,-12.3 L7.8,-13.8 L6.9,-10.3 C8.4,-8.4 8.8,-5 8,-0.6 C7.4,-3.2 6.6,-4.8 5.2,-5.4 L-5.2,-5.4 C-6.6,-4.8 -7.4,-3.2 -7.9,-0.6Z" fill="url(#khr)" stroke="${INK}" stroke-width="0.45" stroke-linejoin="round"/>` +
    `<path d="M-5.2,-11.4 L-3.8,-14.4 M-1,-11.8 L0.2,-15.2 M3,-11.6 L4.2,-14.2 M-6.8,-7.6 C-6.4,-9.4 -5,-10.6 -3.6,-11" fill="none" stroke="#6a5234" stroke-width="0.35" opacity="0.8"/>`;
  let stubble = `<g clip-path="url(#kfhc)"><path d="M-7.6,2.6 C-6.6,8 -3.4,10.8 0,10.9 C3.4,10.8 6.6,8 7.6,2.6 C6.2,5.4 4.6,5.8 3.4,5.6 C2,5.2 1,5.3 0,5.5 C-1,5.3 -2,5.2 -3.4,5.6 C-4.6,5.8 -6.2,5.4 -7.6,2.6Z" fill="#3a2614" opacity="0.28"/>`;
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * 13;
    const y = 5 + rnd() * 5.4;
    if (Math.abs(x) < 2.6 && y < 8.6 && y > 5.8) continue;
    stubble += `<circle cx="${r1(x)}" cy="${r1(y)}" r="0.13" fill="#2a1a0c" opacity="0.55"/>`;
  }
  stubble += `</g>`;
  const goggles =
    `<path d="M-8.1,-8 C-3,-9.8 3,-9.8 8.1,-8 L8.1,-5.2 C3,-7 -3,-7 -8.1,-5.2Z" fill="#3a2a1a" stroke="${INK}" stroke-width="0.4"/>` +
    [-1, 1].map((sx) =>
      `<circle cx="${sx * 3.3}" cy="-7.6" r="2.9" fill="#231710" stroke="${INK}" stroke-width="0.45"/>` +
      `<circle cx="${sx * 3.3}" cy="-7.6" r="2.35" fill="none" stroke="#8a7658" stroke-width="0.45"/>` +
      `<circle cx="${sx * 3.3}" cy="-7.6" r="1.9" fill="url(#klens)"/>` +
      `<path d="M${r1(sx * 3.3 - 1.2)},-8.4 A1.4,1.4 0 0 1 ${r1(sx * 3.3)},-9.2" fill="none" stroke="#fff" stroke-width="0.35" opacity="0.8"/>`,
    ).join("") +
    `<path d="M-0.5,-7.8 L0.5,-7.8" stroke="#5a4a38" stroke-width="0.9"/>`;
  const soot =
    `<path d="M3.6,1.6 C4.8,2.6 5.4,3.6 5.2,5" fill="none" stroke="#3c3226" stroke-width="0.7" stroke-linecap="round" opacity="0.4"/>` +
    `<ellipse cx="-4.2" cy="-4.4" rx="1.6" ry="0.5" fill="#3c3226" opacity="0.3"/>`;
  const head = face("kf", { ...KAI_FACE, x: 2, y: -57, s: 2.1, front: hair, over: stubble + soot + goggles });

  const arm = "M-36,-25.4 C-50,-23 -56.6,-10 -57,6 C-57.2,22 -56.2,36 -55.4,48 L-40,48 L-40,10Z";
  const torso = "M-10,-34.6 C-20,-33.4 -34,-29 -42,-23 C-46,-18 -46,-6 -44,8 L-41,48 L41,48 L44,8 C46,-6 46,-18 42,-23 C34,-29 20,-33.4 10,-34.6 C5,-28 -5,-28 -10,-34.6Z";
  const lapel = "M-10,-35.4 C-14.6,-33.6 -19,-31.4 -21.4,-29.4 L-9,-10.4 L-1.4,-13.4Z";
  const pad = "M-23,-32.4 C-34,-32.6 -44,-28.4 -49.4,-20.4 C-52.6,-14.6 -52.6,-8.6 -50.6,-4.2 L-40.4,-6.4 C-40.2,-14.4 -36,-22.4 -23.6,-26.6Z";
  let body = "";
  body += `<path d="${arm}" fill="url(#koa)" stroke="${INK}" stroke-width="1.1"/><path d="${mir(arm)}" fill="url(#koa)" stroke="${INK}" stroke-width="1.1"/>`;
  body += `<path d="${torso}" fill="url(#kor)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  body += `<path d="M-42,-18 C-45,-4 -44,14 -41.6,34 M42,-18 C45,-4 44,14 41.6,34" fill="none" stroke="#000" stroke-width="2" opacity="0.35"/>`;
  body += `<path d="M-9.4,-33.6 L0,-12 L9.4,-33.6 C5,-29.6 -5,-29.6 -9.4,-33.6Z" fill="url(#ksh)" stroke="${INK}" stroke-width="0.6"/>`;
  body += `<path d="${lapel}" fill="url(#klp)" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/><path d="${mir(lapel)}" fill="url(#klp)" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/>`;
  body += `<path d="M-10.4,-34.8 L-20.4,-29.6" stroke="#c07a3a" stroke-width="0.45" opacity="0.8"/>`;
  body += `<path d="M0,-12 L0,48" stroke="#2e1606" stroke-width="0.9"/><path d="M0.9,-12 L0.9,48" stroke="#c07a3a" stroke-width="0.35" opacity="0.6"/>`;
  for (const sx of [-1, 1]) {
    const X = (x) => r1(sx * x);
    body += `<path d="M${X(31)},-15 L${X(14)},-15 L${X(14)},2 L${X(31)},2Z" fill="#7a4218" stroke="${INK}" stroke-width="0.6"/>`;
    body += `<path d="M${X(31.4)},-15.6 L${X(13.6)},-15.6 L${X(14)},-9.6 L${X(31)},-9.6Z" fill="#8e5022" stroke="${INK}" stroke-width="0.6"/>`;
    body += `<path d="M${X(30)},-14.4 L${X(15)},-14.4" stroke="#d08a4a" stroke-width="0.35" opacity="0.7"/>`;
  }
  body += `<rect x="18.2" y="-22" width="1.8" height="8" rx="0.5" fill="#9a9a9a" stroke="${INK}" stroke-width="0.4"/><rect x="18.2" y="-22" width="1.8" height="1.8" fill="#ffaa44"/>`;
  body += `<path d="M24,-15.6 L24.6,-23 M22.6,-25 C22.4,-23 23.4,-22.4 24.6,-22.8 C25.8,-22.6 26.8,-23.4 26.4,-25.2 L25.4,-24 L24.4,-24.6Z" fill="#9aa2aa" stroke="#555" stroke-width="1.3" stroke-linecap="round"/>`;
  body += `<rect x="-30" y="-23.6" width="14" height="5.4" rx="0.6" fill="#dcdad2" stroke="${INK}" stroke-width="0.5"/><path d="M-28,-21.6 L-19.6,-21.6 M-28,-20 L-22,-20" stroke="#333" stroke-width="0.7"/>`;
  body += `<path d="${pad}" fill="url(#kpd)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/><path d="${mir(pad)}" fill="url(#kpd)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
  body += `<path d="M-25,-30.6 C-34,-30.6 -42,-27 -46.6,-20.4 M25,-30.6 C34,-30.6 42,-27 46.6,-20.4" fill="none" stroke="#3a1c08" stroke-width="0.4" stroke-dasharray="1 0.8"/>`;
  body += `<path d="M-24,-31.6 C-34,-31.6 -43,-27.6 -48,-20.4" fill="none" stroke="#e8a46a" stroke-width="0.6" opacity="0.7"/>`;
  body += `<path d="M24,-31.6 C34,-31.6 43,-27.6 48.4,-20.4 C51.6,-14.6 51.6,-8.6 49.8,-4.4 M44.6,-2 C45.4,10 44,26 42.4,40" fill="none" stroke="#ffae3a" stroke-width="0.8" opacity="0.6"/>`;
  const gear = (cx, cy, r, sw) =>
    `<g transform="translate(${cx} ${cy})" fill="none" stroke="#ffaa44" stroke-width="${sw}">` +
    `<circle r="${r}"/><circle r="${r1(r * 0.38)}"/>` +
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0,${r1(-r)} L0,${r1(-r * 1.3)}" transform="rotate(${a})"/>`).join("") +
    `</g>`;
  body += gear(39, -17, 3.4, 0.7);

  const schem =
    `<g transform="translate(70 -64) rotate(6)">` +
    `<rect x="-18" y="-24" width="36" height="48" rx="1" fill="#ffaa44" fill-opacity="0.07" stroke="#ffb454" stroke-width="0.6" stroke-opacity="0.7"/>` +
    gear(0, -6, 8.4, 0.7) +
    gear(9.4, 9.6, 4.4, 0.5) +
    `<path d="M-14,16 L-2,16 M-14,14 L-14,18 M-2,14 L-2,18 M-15,-20 L-15,6 M-17,-20 L-13,-20" stroke="#ffc878" stroke-width="0.4" opacity="0.8"/>` +
    `</g>`;
  const lights =
    [-1, 1].map((sx) => `<circle cx="${r1(2 + sx * 3.3 * 2.1)}" cy="${r1(-57 - 7.6 * 2.1)}" r="3.8" fill="#ffaa44" opacity="0.8" filter="url(#kgl)"/>`).join("") +
    `<g opacity="0.8">${gear(39, -17, 3.4, 1.2).replace('fill="none"', 'fill="none" filter="url(#kgl)"')}</g>`;

  return {
    box: [-98, -100, 196, 148],
    defs:
      faceDefs("kf", KAI_FACE) +
      lin("khr", [[0, "#54402a"], [0.45, "#22190c"], [1, "#080603"]], 0, 0, 1, 1) +
      rad("klens", [[0, "#fff2c4"], [0.35, "#ffaa44"], [1, "#7a3e0c"]], 0.38, 0.35, 0.7) +
      lin("kor", [[0, "#c2732e"], [0.45, "#8a4a1a"], [1, "#321804"]], 0, 0, 1, 0.3) +
      lin("koa", [[0, "#9a5620"], [1, "#2a1404"]], 0, 0, 1, 0) +
      lin("klp", [[0, "#8a4e1c"], [1, "#4a2408"]], 0, 0, 1, 0.5) +
      lin("kpd", [[0, "#a86030"], [0.4, "#7a4218"], [1, "#3a1c06"]], 0, 0, 1, 0.8) +
      lin("ksh", [[0, "#4a4a4a"], [1, "#1e1e1e"]], 0, 0, 1, 0.5) +
      rad("kbg", [[0, "#ffae3a", 0.17], [0.6, "#a05a10", 0.06], [1, "#a05a10", 0]]) +
      blur("kgl", 1.4) +
      bustFade("km", 16, 47),
    anim: { type: "breathe", amp: 0.005, speed: 1.3, pivot: [0, 47] },
    layers: [
      { markup: `<ellipse cx="0" cy="-46" rx="92" ry="74" fill="url(#kbg)"/>`, anim: { type: "pulse", min: 0.65, max: 1, speed: 1 } },
      { markup: schem, anim: { type: "flicker", min: 0.55, max: 0.95, speed: 0.8 }, blend: "lighter" },
      { markup: `<g mask="url(#km)">${body}</g>${head}` },
      { markup: lights, anim: { type: "pulse", min: 0.35, max: 0.9, speed: 2.2 }, blend: "lighter" },
    ],
  };
}

// ── ARIA ──────────────────────────────────────────────────────────────────

const ARIA_FACE = {
  skin: ["#dcfcff", "#62cce4", "#0e4a66"],
  ink: "#0a3a52",
  inkW: 0.45,
  lid: "#063048",
  white: "#e4ffff",
  iris: "#40f0ff",
  browC: "#0a4a64",
  lip: ["#6cc4dc", "#3a8eac"],
  lipLine: "#0a3a52",
  lashes: true,
  mouth: "neutral",
  rim: "#b4ffff",
  neck: 3.3,
};

function ariaModel() {
  const back =
    `<path d="M-7.8,-1 C-9,-9.6 -5,-12 0,-12 C5.4,-12 8.8,-9 8,-2 C8.4,1 8,4 7.4,5.6 L5,5.6 L5,0 L-5,0 L-5.4,9 C-7,11 -8.8,12 -9.6,12.4 C-9.2,8 -8.4,3 -7.8,-1Z" fill="url(#ahr)" stroke="#0a3a52" stroke-width="0.45"/>`;
  const front =
    `<path d="M-7.4,1 C-8.4,-8 -4,-11.2 1,-11 C5.6,-10.8 8.2,-8 7.8,-1 C7,-4 5.8,-5.8 3.4,-6.4 C0.6,-6.6 -3.4,-5.4 -5.6,-3 C-6.6,-1.6 -7.1,-0.2 -7.4,1Z" fill="url(#ahr)" stroke="#0a3a52" stroke-width="0.45"/>` +
    `<path d="M-7.6,-2 C-8.6,3 -8.8,8 -9.4,12.4 C-8,11.8 -6.6,10.6 -5.8,9 C-6.2,5 -6.4,1.5 -6,-3Z" fill="url(#ahr)" stroke="#0a3a52" stroke-width="0.4"/>` +
    `<path d="M-6.4,-5.4 C-7.6,0 -7.8,6 -8.4,11" fill="none" stroke="#6ff6ff" stroke-width="0.55" opacity="0.8"/>` +
    `<path d="M-3.6,-8.8 C-0.4,-10.4 3.4,-10 6,-7.6 M-5.8,-5.4 C-3.4,-8 0.4,-8.8 4.4,-8.2 M-1.6,-6.4 C1.4,-8 4.6,-7.8 6.8,-5.6 M5.6,-8.8 C7.4,-6.4 8,-3.6 7.8,-1" fill="none" stroke="#9ffaff" stroke-width="0.3" opacity="0.7"/>` +
    `<path d="M1.4,-6.6 C-1.2,-5.4 -3.6,-3.6 -5,-1.4 C-3,-2.6 -1,-3.4 1.4,-3.8 C0.6,-4.6 0.8,-5.8 1.4,-6.6Z" fill="url(#ahr)" stroke="#0a3a52" stroke-width="0.35"/>`;
  const headset =
    `<path d="M-7.9,-1.8 C-8.8,-13.2 8.8,-13.2 7.9,-1.8" fill="none" stroke="#1a6e8e" stroke-width="0.9"/>` +
    `<path d="M-7.9,-1.8 C-8.8,-13.2 8.8,-13.2 7.9,-1.8" fill="none" stroke="#8ff8ff" stroke-width="0.25" opacity="0.8"/>` +
    [-1, 1].map((sx) => `<rect x="${r1(sx * 8 - 1.3)}" y="-2" width="2.6" height="5" rx="1" fill="url(#ast)" stroke="#0a3a52" stroke-width="0.35"/>`).join("") +
    `<path d="M-8,2.6 C-7.4,6.8 -5.2,8.2 -2.8,8.4" fill="none" stroke="#2a8eae" stroke-width="0.5"/><circle cx="-2.6" cy="8.4" r="0.6" fill="#8ff8ff"/>`;
  const head = face("af", { ...ARIA_FACE, x: 0, y: -52, s: 1.5, back, front: front + headset });

  const arm = "M-25,-28.6 C-34,-27.6 -39.4,-21 -40.2,-9 C-40.8,2 -40.2,14 -39,26 L-31.4,28 C-32.2,18 -32.4,8 -32,-2Z";
  const torso = "M-7.2,-33.6 C-14,-32.6 -23,-29.6 -29,-23.6 C-33,-18.6 -33,-8 -31,4 L-29,30 L29,30 L31,4 C33,-8 33,-18.6 29,-23.6 C23,-29.6 14,-32.6 7.2,-33.6Z";
  let suit = "";
  suit += `<path d="${arm}" fill="url(#asa)" stroke="#0a3a52" stroke-width="0.8"/><path d="${mir(arm)}" fill="url(#asa)" stroke="#0a3a52" stroke-width="0.8"/>`;
  suit += `<path d="${torso}" fill="url(#asu)" stroke="#0a3a52" stroke-width="0.8"/>`;
  suit += `<path d="M-6.6,-41.8 C-4,-40.2 4,-40.2 6.6,-41.8 L7.6,-32 C4,-30.4 -4,-30.4 -7.6,-32Z" fill="url(#asa)" stroke="#0a3a52" stroke-width="0.6"/>`;
  suit += `<path d="M-7,-31.6 L-2,-12 L2,-12 L7,-31.6 M-12,-31.4 C-20,-28.4 -26,-24 -29,-18 M12,-31.4 C20,-28.4 26,-24 29,-18 M0,-12 L0,20 M-18,-4 L-6,-4 M18,-4 L6,-4" fill="none" stroke="#7ff6ff" stroke-width="0.55" opacity="0.85"/>`;
  suit += `<path d="M-6.4,-40.6 C-4,-39.2 4,-39.2 6.4,-40.6" fill="none" stroke="#b4ffff" stroke-width="0.45"/>`;
  suit += `<circle cx="0" cy="-8" r="1.8" fill="#062536" stroke="#7ff6ff" stroke-width="0.5"/>`;
  suit += `<path d="M29.6,-22 C33.4,-16 33,-6 31,6" fill="none" stroke="#b4ffff" stroke-width="0.7" opacity="0.7"/>`;
  suit += `<path d="M-32.4,-15 C-33.2,-5 -33,8 -32,22 M32.4,-15 C33.2,-5 33,8 32,22" fill="none" stroke="#041a26" stroke-width="1.4" opacity="0.6"/>`;
  suit += `<path d="M-37.6,-19 C-39.2,-12 -39.6,-4 -39.4,4" fill="none" stroke="#9ffaff" stroke-width="0.5" opacity="0.6"/>`;

  const silhouette =
    `<path d="${torso}"/><path d="${arm}"/><path d="${mir(arm)}"/>` +
    at(0, -52, 1.5, `<path d="${headPath(ARIA_FACE)}"/><path d="M-7.8,-1 C-9,-9.6 -5,-12 0,-12 C5.4,-12 8.8,-9 8,-2 C8.4,1 8,4 7.4,5.6 L-9.6,12.4Z"/><rect x="-4" y="4" width="8" height="14"/>`);
  const figure = `<g mask="url(#afm)">${suit}${head}</g>`;
  const shimmer =
    `<g mask="url(#afm)" fill="#7ff6ff" opacity="0.1">${silhouette}</g>` +
    `<clipPath id="aslc"><rect x="-80" y="-58" width="160" height="3.4"/><rect x="-80" y="-20" width="160" height="2"/></clipPath>` +
    `<g clip-path="url(#aslc)" transform="translate(3.4 0)" fill="#9ffaff" opacity="0.55">${silhouette}</g>`;
  const scan =
    `<g mask="url(#asm)" stroke="#bfffff" stroke-width="0.3" opacity="0.32">` +
    Array.from({ length: 76 }, (_, i) => `<path d="M-40,${r1(-72 + i * 1.4)} L40,${r1(-72 + i * 1.4)}"/>`).join("") +
    `</g>`;
  const cone =
    `<path d="M-17,40 L-64,-86 L64,-86 L17,40Z" fill="url(#acn)"/>` +
    `<ellipse cx="0" cy="40" rx="17" ry="2.6" fill="#8ff8ff" opacity="0.8" filter="url(#agl)"/>`;
  const frame =
    `<path d="M-58,-90 L-72,-34 L-58,24 L58,24 L72,-34 L58,-90Z" fill="#22e6ff" fill-opacity="0.025" stroke="#22e6ff" stroke-width="0.7" stroke-opacity="0.35"/>` +
    `<path d="M-50,-90 L-58,-90 L-61.4,-76.4 M50,-90 L58,-90 L61.4,-76.4 M-50,24 L-58,24 L-61.4,10.4 M50,24 L58,24 L61.4,10.4" fill="none" stroke="#8ff8ff" stroke-width="1.1"/>` +
    `<g transform="translate(-64 -12)" fill="#7ff6ff">` +
    [0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${i * 3}" width="${[9, 14, 6, 11, 8][i]}" height="1.2" opacity="0.6"/>`).join("") +
    `</g>` +
    `<path d="M40,12 L44,12 L45.4,6 L47.4,17 L49.4,3 L51.4,15 L53.4,8 L55,12 L62,12" fill="none" stroke="#8ff8ff" stroke-width="0.6" opacity="0.8"/>`;
  const ring =
    `<circle cx="0" cy="-52" r="31" fill="none" stroke="#5ff0ff" stroke-width="0.6" stroke-dasharray="16 5 3 5" opacity="0.5"/>` +
    `<circle cx="0" cy="-52" r="34.6" fill="none" stroke="#5ff0ff" stroke-width="1.6" stroke-dasharray="0.5 3.1" opacity="0.35"/>` +
    `<path d="M-2,-87.4 L2,-87.4 L0,-84.4Z" fill="#8ff8ff" opacity="0.8"/>`;
  const projector =
    `<path d="M-23,41 L23,41 L27.4,47.6 L-27.4,47.6Z" fill="url(#ast)" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M-27.4,47.6 L27.4,47.6 L26,50 L-26,50Z" fill="#0a1018" stroke="${INK}" stroke-width="0.8"/>` +
    `<ellipse cx="0" cy="40.6" rx="18.4" ry="3" fill="#041620" stroke="#22e6ff" stroke-width="0.7"/>` +
    `<path d="M-22,42.4 L22,42.4" stroke="#b8d8ee" stroke-width="0.4" opacity="0.6"/>` +
    `<circle cx="-20" cy="45" r="0.7" fill="#22e6ff"/><circle cx="20" cy="45" r="0.7" fill="#22e6ff"/>`;
  const eyes =
    [-1, 1].map((sx) => `<circle cx="${r1(sx * 4.5)}" cy="-52.2" r="1.3" fill="#8ffcff" filter="url(#agl2)"/>`).join("") +
    `<circle cx="-12" cy="-51.2" r="1.1" fill="#8ffcff" filter="url(#agl2)"/><circle cx="-3.9" cy="-39.4" r="0.9" fill="#b4ffff" filter="url(#agl2)"/>` +
    `<circle cx="0" cy="-8" r="2" fill="#7ff6ff" filter="url(#agl2)"/>`;
  const float = { type: "float", amp: 1.2, speed: 1.1 };

  return {
    box: [-76, -96, 152, 148],
    defs:
      faceDefs("af", ARIA_FACE) +
      lin("ahr", [[0, "#2a8aa8"], [0.5, "#0c4460"], [1, "#04202e"]], 0, 0, 1, 1) +
      lin("asu", [[0, "#2c96b8"], [0.45, "#0f4e6e"], [1, "#052232"]], 0, 0, 1, 0.3) +
      lin("asa", [[0, "#1c7494"], [1, "#041a26"]], 0, 0, 1, 0) +
      lin("ast", [[0, "#6f8aa3"], [0.4, "#3a4d61"], [1, "#141c26"]], 0, 0, 1, 0.5) +
      lin("acn", [[0, "#22e6ff", 0], [0.6, "#22e6ff", 0.07], [1, "#22e6ff", 0.26]]) +
      rad("abg", [[0, "#22e6ff", 0.16], [1, "#22e6ff", 0]]) +
      `<linearGradient id="afg" gradientUnits="userSpaceOnUse" x1="0" y1="-2" x2="0" y2="28"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
      `<mask id="afm" maskUnits="userSpaceOnUse" x="-100" y="-120" width="200" height="200"><rect x="-100" y="-120" width="200" height="200" fill="url(#afg)"/>` +
      `<rect x="-100" y="8" width="200" height="0.8" fill="#000"/><rect x="-100" y="13" width="200" height="1.4" fill="#000"/><rect x="-100" y="18.4" width="200" height="0.8" fill="#000"/><rect x="-100" y="-26" width="200" height="0.5" fill="#000"/></mask>` +
      `<mask id="asm" maskUnits="userSpaceOnUse" x="-100" y="-120" width="200" height="200"><g mask="url(#afm)" fill="#fff"><path d="${torso}"/><path d="${arm}"/><path d="${mir(arm)}"/>` +
      at(0, -52, 1.5, `<path d="${headPath(ARIA_FACE)}"/><path d="M-7.8,-1 C-9,-9.6 -5,-12 0,-12 C5.4,-12 8.8,-9 8,-2 C8.4,1 8,4 7.4,5.6 L-9.6,12.4Z"/><rect x="-4" y="4" width="8" height="14"/>`) +
      `</g></mask>` +
      blur("agl", 2) +
      blur("agl2", 1.2),
    layers: [
      { markup: `<ellipse cx="0" cy="-40" rx="76" ry="82" fill="url(#abg)"/>`, anim: { type: "pulse", min: 0.6, max: 1, speed: 1.3 } },
      { markup: cone, anim: { type: "pulse", min: 0.55, max: 1, speed: 2.1 }, blend: "lighter" },
      { markup: ring, anim: { type: "spin", speed: 0.25, pivot: [0, -52] }, blend: "lighter" },
      { markup: frame, anim: { type: "flicker", min: 0.5, max: 0.9, speed: 0.7 }, blend: "lighter" },
      { markup: `<g mask="url(#afm)" fill="#01080e">${silhouette}</g>`, anim: float, opacity: 0.5 },
      { markup: figure, anim: float, blend: "lighter", opacity: 0.92 },
      { markup: shimmer, anim: { type: "flicker", min: 0, max: 0.8, speed: 1.6 }, blend: "lighter" },
      { markup: scan, anim: { type: "drift", amp: 0.6, speed: 5 }, blend: "lighter", opacity: 0.6 },
      { markup: eyes, anim: float, blend: "lighter" },
      { markup: projector },
    ],
  };
}

// ── Bureau supervisor ─────────────────────────────────────────────────────

const SUPERVISOR_FACE = {
  male: true,
  w: 7.5,
  jaw: 6.7,
  chin: 3.3,
  skin: ["#d6ad88", "#a97c5e", "#5a3a28"],
  iris: "#6e6048",
  browC: "#5a524a",
  brows: "stern",
  lid: "#241810",
  lip: ["#9a6a58", "#704638"],
  lipLine: "#3a2016",
  mouth: "stern",
  rim: "#ffb454",
  neck: 4.4,
};

/** Crease drawn as a dark fold with a lit edge above it. */
const crease = (d, op = 0.6) =>
  `<path d="${d}" fill="none" stroke="#06080e" stroke-width="0.8" stroke-linecap="round" opacity="${op}"/>` +
  `<path d="${d}" transform="translate(-0.8 -0.7)" fill="none" stroke="#7a8aa0" stroke-width="0.35" stroke-linecap="round" opacity="${r1(op * 0.7)}"/>`;

function supervisorModel() {
  const hair =
    `<path d="M-7.7,-0.6 C-8.3,-6.6 -6.8,-10.6 -0.2,-11 C6.6,-11.1 8.4,-6.9 7.8,-0.6 C7.4,-3 7,-4.6 6.4,-5.4 C5.6,-6.6 4.8,-7.3 3.9,-7 C2.6,-6.4 1.2,-6.5 0,-6.8 C-1.2,-6.5 -2.6,-6.4 -3.9,-7 C-4.8,-7.3 -5.6,-6.6 -6.4,-5.4 C-7,-4.6 -7.4,-3 -7.7,-0.6Z" fill="url(#shr)" stroke="${INK}" stroke-width="0.45" stroke-linejoin="round"/>` +
    `<path d="M-6.2,-7.4 L-5.6,-8.2 M-4.6,-8.8 L-4,-9.6 M-2.6,-9.6 L-2,-10.3 M-0.6,-9.8 L0,-10.5 M1.6,-9.6 L2.2,-10.2 M3.6,-9 L4.2,-9.6 M5.4,-7.9 L6,-8.5 M-6.9,-4.6 L-6.6,-5.6 M-3.4,-7.8 L-2.8,-8.6 M1,-7.6 L1.6,-8.3" stroke="#d8d4cc" stroke-width="0.3" stroke-linecap="round" opacity="0.7"/>` +
    `<path d="M2.6,-8.1 L3.2,-8.8 M4.6,-6.9 L5.2,-7.6 M6.6,-5 L7,-5.8 M-1.6,-7.4 L-1,-8.2" stroke="#2a2622" stroke-width="0.3" stroke-linecap="round" opacity="0.7"/>`;
  let seed = 11;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  let stubble = `<g clip-path="url(#sfhc)"><path d="M-7.6,2.2 C-6.6,8 -3.4,10.9 0,11 C3.4,10.9 6.6,8 7.6,2.2 C6.2,5.2 4.6,5.6 3.4,5.4 C2,5 1,5.2 0,5.4 C-1,5.2 -2,5 -3.4,5.4 C-4.6,5.6 -6.2,5.2 -7.6,2.2Z" fill="#4a4038" opacity="0.3"/>`;
  for (let i = 0; i < 80; i++) {
    const x = (rnd() - 0.5) * 14;
    const y = 4.6 + rnd() * 5.8;
    if (Math.abs(x) < 2.8 && y < 8.6 && y > 5.8) continue;
    stubble += `<circle cx="${r1(x)}" cy="${r1(y)}" r="0.13" fill="${i % 3 ? "#2e241c" : "#9a948c"}" opacity="0.6"/>`;
  }
  stubble += `</g>`;
  // Heavy lids, bags, forehead lines and a nicked brow: a long career of night shifts.
  const wear =
    [-1, 1].map((sx) => {
      const X = (x) => r1(sx * x);
      return (
        `<path d="M${X(1.2)},-0.2 Q${X(3)},-1.6 ${X(4.9)},-0.3 L${X(4.8)},-0.1 Q${X(3)},-0.55 ${X(1.3)},0Z" fill="#9a6e52"/>` +
        `<path d="M${X(1.3)},0 Q${X(3)},-0.55 ${X(4.8)},-0.1" fill="none" stroke="#241810" stroke-width="0.4" stroke-linecap="round"/>` +
        `<path d="M${X(1.6)},1.2 Q${X(3.1)},2.4 ${X(4.8)},1" fill="none" stroke="#5a3a28" stroke-width="0.3" opacity="0.65"/>` +
        `<path d="M${X(2.2)},1.9 Q${X(3.3)},2.7 ${X(4.6)},1.8" fill="none" stroke="#5a3a28" stroke-width="0.22" opacity="0.4"/>` +
        `<path d="M${X(5.3)},-0.6 L${X(6.4)},-1.2 M${X(5.3)},0.1 L${X(6.4)},0.3" stroke="#5a3a28" stroke-width="0.2" opacity="0.5"/>`
      );
    }).join("") +
    `<path d="M-4,-5.2 Q0,-5.9 4,-5.2 M-3,-4.2 Q0,-4.7 3,-4.2 M-1,-2.6 L-0.8,-1.2 M1,-2.6 L0.8,-1.2" fill="none" stroke="#5a3a28" stroke-width="0.24" opacity="0.5"/>` +
    `<path d="M3.4,-3.4 L4.8,-1.8" stroke="#e6c0a0" stroke-width="0.3" stroke-linecap="round" opacity="0.45"/>` +
    `<path d="M0.2,-0.4 Q0.9,0.6 0.6,1.6" fill="none" stroke="#5a3a28" stroke-width="0.3" opacity="0.5"/>` +
    `<path d="M-2.6,8.6 Q0,8 2.6,8.6" fill="none" stroke="#5a3a28" stroke-width="0.25" opacity="0.4"/>`;
  const headset =
    `<path d="M-8.4,-0.6 C-9.6,-12.8 9.6,-12.8 8.4,-0.6" fill="none" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<path d="M-8.4,-0.6 C-9.6,-12.8 9.6,-12.8 8.4,-0.6" fill="none" stroke="#2a3444" stroke-width="1" stroke-linecap="round"/>` +
    `<path d="M-7.9,-4.4 C-7.4,-9.4 -4,-11.4 -0.6,-11.5" fill="none" stroke="#8aa0b8" stroke-width="0.3" stroke-linecap="round" opacity="0.8"/>` +
    `<path d="M-8.4,3.4 C-8.8,7.6 -6.8,9.6 -3.8,8.8" fill="none" stroke="${INK}" stroke-width="0.95" stroke-linecap="round"/>` +
    `<path d="M-8.4,3.4 C-8.8,7.6 -6.8,9.6 -3.8,8.8" fill="none" stroke="#3a4656" stroke-width="0.45" stroke-linecap="round"/>` +
    `<ellipse cx="-3.3" cy="8.7" rx="1.2" ry="0.8" fill="#1a222e" stroke="${INK}" stroke-width="0.35"/>` +
    `<ellipse cx="-3.6" cy="8.4" rx="0.5" ry="0.25" fill="#8aa0b8" opacity="0.6"/>` +
    [-1, 1].map((sx) =>
      `<ellipse cx="${r1(sx * 8.5)}" cy="0.9" rx="2" ry="2.9" fill="url(#sst)" stroke="${INK}" stroke-width="0.45"/>` +
      `<ellipse cx="${r1(sx * 8.9)}" cy="0.9" rx="1.2" ry="1.9" fill="#141a24" stroke="#4a5a6e" stroke-width="0.25"/>`,
    ).join("") +
    `<circle cx="-9" cy="-0.4" r="0.36" fill="#ffc060"/>` +
    `<path d="M8.9,-1.6 C9.8,-0.6 9.9,1.6 9.2,3" fill="none" stroke="#ffb454" stroke-width="0.3" opacity="0.8"/>`;
  const head = face("sf", { ...SUPERVISOR_FACE, x: 0, y: -57, s: 2.1, front: hair, over: stubble + wear + headset });

  const arm = "M-35.4,-25.4 C-48,-23 -54.4,-11 -54.8,5 C-55,21 -54,35 -53.2,48 L-39.4,48 L-39,10Z";
  const torso = "M-11,-35.6 C-20,-33.8 -31.4,-29.8 -39.6,-23.6 C-44.2,-18 -44.6,-7 -42.6,7 L-39.6,48 L39.6,48 L42.6,7 C44.6,-7 44.2,-18 39.6,-23.6 C31.4,-29.8 20,-33.8 11,-35.6 C6,-31.4 -6,-31.4 -11,-35.6Z";
  const shirt = "M-12.4,-34 C-8,-32.4 8,-32.4 12.4,-34 L16.4,48 L-16.4,48Z";
  const lapel = "M-12,-35 L-24.6,-28.2 L-20,-18.4 L-23.4,-15.8 L-14.4,10 L-13.4,-10Z";
  const strap = "M-21.6,-32.2 L-38.2,-26 L-40,-21.8 L-23.4,-27.8Z";
  let body = "";
  body += `<path d="${arm}" fill="url(#sja)" stroke="${INK}" stroke-width="1.1"/><path d="${mir(arm)}" fill="url(#sja)" stroke="${INK}" stroke-width="1.1"/>`;
  body += `<path d="${torso}" fill="url(#sjk)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`;
  body += `<path d="M-39.4,-20 C-42.4,-6 -41.4,12 -39.2,32 M39.4,-20 C42.4,-6 41.4,12 39.2,32" fill="none" stroke="#000" stroke-width="2" opacity="0.35"/>`;
  body += `<path d="${shirt}" fill="url(#ssh)" stroke="${INK}" stroke-width="0.8"/>`;
  body += `<path d="M-6,-8 C-4,-4 -5,2 -3,6 M5,-2 C6,4 4,10 6,16" fill="none" stroke="#3e4852" stroke-width="0.5" opacity="0.5"/>`;
  body += `<ellipse cx="7.6" cy="12" rx="2.2" ry="1.6" fill="#6a5a44" opacity="0.35"/>`;
  body += `<path d="M0,-18 L0.4,48" stroke="#3a4450" stroke-width="0.4" opacity="0.6"/>`;
  body += [-6, 8, 22].map((y) => `<circle cx="${r1(y * 0.012 + 1.6)}" cy="${y}" r="0.7" fill="#c8ccd0" stroke="#3a4450" stroke-width="0.25"/>`).join("");
  body += `<path d="${lapel}" fill="url(#slp)" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/><path d="${mir(lapel)}" fill="url(#slp)" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/>`;
  body += `<path d="M-12.6,-34.6 L-24,-28.4" stroke="#8a9ab0" stroke-width="0.45" opacity="0.7"/>`;
  body += `<path d="M-14.4,10 L-15.6,48 M14.4,10 L15.6,48" stroke="${INK}" stroke-width="0.8"/>`;
  body += crease("M-36,-4 C-30.4,0 -27,6 -25.6,13");
  body += crease("M-38.6,15 C-33,17 -29.6,23 -29,31", 0.5);
  body += crease("M-32,-19 C-28.6,-16 -26.4,-12 -26,-8", 0.45);
  body += crease("M31.4,-5 C27.6,1 25.6,7 26.4,15");
  body += crease("M37.4,12 C32.6,15.6 30.6,21 30.8,29", 0.5);
  body += crease("M-51.6,6 C-47.4,9 -43.8,9.6 -41.2,13.4", 0.55);
  body += crease("M-52.4,21 C-48.4,23 -44.6,25 -41.6,29.4", 0.45);
  body += crease("M51.6,4 C47.6,7 44.4,8 42,11.4", 0.5);
  // Name tape, chest badge, pen in the pocket.
  body += `<path d="M20,-16.6 L35.4,-15.8 L35.2,-10.6 L20,-11.4Z" fill="#141a24" stroke="${INK}" stroke-width="0.5"/>`;
  body += `<path d="M22,-14.2 L26.4,-14 M27.6,-14 L33,-13.6 M22,-12.6 L29,-12.3" stroke="#8a96a6" stroke-width="0.7" opacity="0.7"/>`;
  body += `<path d="M20.4,-6 L35,-5.4 L34.6,6 L20.6,5.4Z" fill="#0e131b" opacity="0.5"/><path d="M20.4,-6 L35,-5.4" stroke="#6a7890" stroke-width="0.4" opacity="0.6"/>`;
  body += `<rect x="31" y="-10.2" width="1.6" height="7.4" rx="0.5" fill="#1a1d22" stroke="${INK}" stroke-width="0.35"/><rect x="31" y="-10.2" width="1.6" height="1.6" fill="#c8a040"/>`;
  body += `<g transform="translate(-27 -11)"><path d="M0,-6.4 L5.6,-3.2 L5.6,3.2 L0,6.4 L-5.6,3.2 L-5.6,-3.2Z" fill="url(#sst)" stroke="${INK}" stroke-width="0.6"/>`;
  body += `<circle r="3.2" fill="#161c26" stroke="#c8943c" stroke-width="0.55"/><path d="M0,0 L0,-2.3 M0,0 L1.7,0.8" stroke="#ffb454" stroke-width="0.5" stroke-linecap="round"/><path d="M-4.6,-3.4 L-0.6,-5.6" stroke="#dfe8f2" stroke-width="0.4" opacity="0.7"/></g>`;
  body += `<path d="${strap}" fill="url(#sst)" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/><path d="${mir(strap)}" fill="url(#sst)" stroke="${INK}" stroke-width="0.8" stroke-linejoin="round"/>`;
  for (const sx of [-1, 1]) {
    const X = (x) => r1(sx * x);
    body += [0, 1].map((i) => `<path d="M${X(30 + i * 3)},${r1(-29.4 + i * 1.1)} L${X(32 + i * 3)},${r1(-30.1 + i * 1.1)} L${X(33 + i * 3)},${r1(-27.4 + i * 1.1)} L${X(31 + i * 3)},${r1(-26.7 + i * 1.1)}Z" fill="#c8943c" stroke="${INK}" stroke-width="0.3"/>`).join("");
    body += `<circle cx="${X(24.4)}" cy="-29.8" r="0.9" fill="#3a4656" stroke="${INK}" stroke-width="0.3"/>`;
  }
  body += `<path d="M-22,-33.4 L-38.4,-27.2" stroke="#b8cee2" stroke-width="0.5" opacity="0.6"/>`;
  body += `<path d="M24,-33 C32,-30.6 38,-27 41,-23 C44.6,-17.4 44.8,-7 43,7 M44.2,-3 C45.4,10 44.4,26 43.4,40" fill="none" stroke="#ffae3a" stroke-width="0.8" opacity="0.55"/>`;
  body += `<path d="M-53.2,0 C-53.6,14 -53.2,28 -52.8,44" fill="none" stroke="#6a7890" stroke-width="0.6" opacity="0.55"/>`;

  const collar = "M-10.6,-39.4 C-13.4,-35.4 -15.8,-30.2 -17.2,-24.2 L-8.2,-27.6 L-4.2,-31.6Z";
  let col = "";
  col += `<path d="M-11.6,-36.4 C-8,-32.6 -4,-27 0,-21.4 C4,-27 8,-32.6 11.6,-36.4 L13,-18 L-13,-18Z" fill="url(#ssh)"/>`;
  col += `<path d="M-6.6,-33 C-4,-28.6 -2,-25.6 0,-22.4 C2,-25.6 4,-28.6 6.6,-33" fill="none" stroke="#4a3024" stroke-width="1.6" opacity="0.35"/>`;
  col += `<g mask="url(#sm)"><path d="M-1.6,-19.2 L2,-19.2 L4.2,10 L1.2,14.4 L-1.8,10Z" fill="url(#stie)" stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"/>`;
  col += `<path d="M1.2,-10 L3,6" stroke="#b04a4a" stroke-width="0.35" opacity="0.6"/></g>`;
  col += `<path d="M-2.8,-24.2 L2.8,-24.4 L2.2,-18.6 L-1.8,-18.4Z" fill="url(#stie)" stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"/>`;
  col += `<path d="M-2.2,-23.6 L1.6,-23.8" stroke="#c86060" stroke-width="0.35" opacity="0.7"/>`;
  col += `<path d="${collar}" fill="url(#scl)" stroke="${INK}" stroke-width="0.7" stroke-linejoin="round"/>`;
  col += `<path d="${mir(collar).replace("L8.2,-27.6", "L9,-26.4")}" fill="url(#scl)" stroke="${INK}" stroke-width="0.7" stroke-linejoin="round"/>`;
  col += `<path d="M-10.2,-38.6 C-12.8,-34.6 -15,-29.6 -16.4,-24.8" fill="none" stroke="#e4e8ec" stroke-width="0.35" opacity="0.8"/>`;

  const panel =
    `<g transform="translate(-68 -60) rotate(-5)">` +
    `<rect x="-18" y="-22" width="36" height="44" rx="1.4" fill="#ffaa44" fill-opacity="0.07" stroke="#ffb454" stroke-width="0.6" stroke-opacity="0.7"/>` +
    [0, 1, 2, 3, 4].map((i) => `<rect x="${-14 + i * 3}" y="${r1(-12 - i * 1.8)}" width="2" height="${r1(4 + i * 1.8)}" fill="#ffb454" opacity="${i < 2 ? 0.85 : 0.3}"/>`).join("") +
    `<circle cx="10" cy="-16" r="3.4" fill="none" stroke="#ffc878" stroke-width="0.6"/><path d="M10,-16 L10,-18.6 M10,-16 L12,-15" stroke="#ffc878" stroke-width="0.5"/>` +
    `<path d="M-15,2 L-11,2 L-9.6,-3 L-8,6 L-6.2,-6 L-4.4,9 L-2.6,-4 L-1,4 L0.6,-1.6 L2,3 L3.6,0 L5,1.4 L15,1.4" fill="none" stroke="#ffd08a" stroke-width="0.7" stroke-linejoin="round"/>` +
    [0, 1, 2].map((i) => `<rect x="-15" y="${13 + i * 3.2}" width="${[22, 14, 26][i]}" height="1.3" fill="#ffb454" opacity="0.5"/>`).join("") +
    `</g>`;
  const note =
    `<g transform="translate(70 -66) rotate(7)">` +
    `<path d="M-15,-14 L15,-14 L15,9 L9,15 L-15,15Z" fill="url(#snt)" stroke="${INK}" stroke-width="0.7" stroke-linejoin="round"/>` +
    `<path d="M15,9 L9.6,10 L9,15Z" fill="#b0902c" stroke="${INK}" stroke-width="0.5" stroke-linejoin="round"/>` +
    `<path d="M-15,-14 L15,-14 L15,-9 L-15,-9Z" fill="#c8a830" opacity="0.35"/>` +
    `<path d="M-11,-4 C-9,-6 -7,-2 -5,-4.4 C-3,-6.4 -1,-2 1.4,-4.6 C3,-6 5,-3 6.6,-4.4 M-11,2 C-8,0 -6,4 -3,1.4 C-1,-0.4 1,3 4,1 M-11,8 C-9,6.4 -6.6,9.6 -4,7.4 C-2.4,6 0,9 2.4,7.2" fill="none" stroke="#1a2440" stroke-width="0.8" stroke-linecap="round"/>` +
    `<path d="M5,6.6 C7,5 9.4,5.4 8.6,7.8" fill="none" stroke="#1a2440" stroke-width="0.8" stroke-linecap="round"/>` +
    `<path d="M-14.4,-13.4 L14.4,-13.4" stroke="#fff6c0" stroke-width="0.5" opacity="0.7"/>` +
    `</g>`;
  const lights =
    `<circle cx="-18.9" cy="-57.8" r="1.8" fill="#ffaa44" filter="url(#sgl)"/><circle cx="-18.9" cy="-57.8" r="0.7" fill="#fff0cc"/>` +
    `<circle cx="-27" cy="-11" r="2.6" fill="#ffaa44" opacity="0.45" filter="url(#sgl)"/>` +
    `<g transform="translate(-68 -60) rotate(-5)"><path d="M-15,2 L-11,2 L-9.6,-3 L-8,6 L-6.2,-6 L-4.4,9 L-2.6,-4 L-1,4 L0.6,-1.6 L2,3 L3.6,0 L5,1.4 L15,1.4" fill="none" stroke="#ffaa44" stroke-width="1.6" filter="url(#sgl)"/></g>`;

  return {
    box: [-96, -98, 190, 146],
    defs:
      faceDefs("sf", SUPERVISOR_FACE) +
      lin("shr", [[0, "#a8a49c"], [0.45, "#6e6a64"], [1, "#2e2b28"]], 0, 0, 1, 1) +
      lin("sjk", [[0, "#48546a"], [0.42, "#272f3e"], [1, "#0a0d14"]], 0, 0, 1, 0.3) +
      lin("sja", [[0, "#343e52"], [1, "#0a0c14"]], 0, 0, 1, 0) +
      lin("slp", [[0, "#3a4458"], [1, "#141924"]], 0, 0, 1, 0.5) +
      lin("ssh", [[0, "#b6c0c8"], [0.5, "#8490a0"], [1, "#3e4854"]], 0, 0, 1, 0.2) +
      lin("scl", [[0, "#dfe4ea"], [1, "#8a96a4"]], 0, 0, 1, 1) +
      lin("stie", [[0, "#8a2222"], [0.5, "#5c1212"], [1, "#2a0606"]], 0, 0, 1, 0) +
      lin("sst", [[0, "#7890a8"], [0.35, "#3a4d61"], [1, "#161f2a"]], 0, 0, 1, 0.8) +
      lin("snt", [[0, "#efe08a"], [0.55, "#cdb24a"], [1, "#7a6420"]], 0, 0, 1, 1) +
      rad("sbg", [[0, "#ffa040", 0.16], [0.6, "#a0581a", 0.06], [1, "#a0581a", 0]]) +
      blur("sgl", 1.3) +
      bustFade("sm", 14, 46),
    anim: { type: "breathe", amp: 0.005, speed: 1, pivot: [0, 46] },
    layers: [
      { markup: `<ellipse cx="0" cy="-46" rx="90" ry="74" fill="url(#sbg)"/>`, anim: { type: "pulse", min: 0.65, max: 1, speed: 0.9 } },
      { markup: panel, anim: { type: "flicker", min: 0.5, max: 0.95, speed: 1.1 }, blend: "lighter" },
      { markup: note, anim: { type: "sway", amp: 0.03, speed: 1.1, pivot: [70, -80] }, opacity: 0.85 },
      { markup: `<g mask="url(#sm)">${body}</g>${head}${col}` },
      { markup: lights, anim: { type: "pulse", min: 0.3, max: 1, speed: 2.6 }, blend: "lighter" },
    ],
  };
}

export const MODELS = {
  /** ARIA: translucent cyan hologram bust of the suit AI, rising from a projector. */
  aria: ariaModel(),
  /** Lyra: senior chrono-analyst in a long amber-trimmed coat, projecting a time dial. */
  lyra: lyraModel(),
  /** The squad lineup: KAEL, LYRA, YOU (hero), NOVA, ROOK with class-coloured visors. */
  party: partyModel(),
  /** Voss the tactician: silver-haired officer bust with a timeline echo behind him. */
  portrait_voss: vossModel(),
  /** Miri the medic: warm bust in teal and white, med-scanner raised. */
  portrait_miri: miriModel(),
  /** Kai the engineer: stocky bust in a burnt-orange jumpsuit, goggles on his forehead. */
  portrait_kai: kaiModel(),
  /** The cadet's Bureau supervisor: tired, grey-stubbled bust in a rumpled uniform and radio headset. */
  portrait_supervisor: supervisorModel(),
};
