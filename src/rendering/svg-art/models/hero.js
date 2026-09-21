/**
 * Hero SVG models: the player as the armored temporal agent (standing, armed,
 * fallen) and as the unarmored Bureau field cadet (portrait, front desk).
 *
 * The armor is one posable rig (`armorRig`): limbs are shaded capsules between
 * joints, so hero / hero_armed / hero_fallen only differ by pose and extras.
 * The cadet is one figure drawn front-on and one in three-quarter view.
 * See ../index.js for the model format.
 */

export const INK = "#04060b";
export const RIM = "#22e6ff";

export const f = (n) => Math.round(n * 10) / 10;
export const pt = (x, y) => `${f(x)},${f(y)}`;
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const angle = (a, b) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI - 90;
/** Mirror every "x,y" pair of an absolute path across x = 0. */
export const mirror = (d) => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => `${f(-x)},${y}`);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** Point `len` from p, `deg` degrees off straight down (positive swings toward screen right). */
export const polar = (p, deg, len) => {
  const r = (deg * Math.PI) / 180;
  return [p[0] + Math.sin(r) * len, p[1] + Math.cos(r) * len];
};
/** Heading of a→b in polar's convention. */
export const heading = (a, b) => (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;

// ---------------------------------------------------------------------------
// Shading primitives
// ---------------------------------------------------------------------------

function quadAt({ p0, c, p1 }, t) {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * p0[i] + 2 * u * t * c[i] + t * t * p1[i]);
}

function subQuad(q, t0, t1) {
  const k = [0, 1].map(
    (i) => (1 - t0) * (1 - t1) * q.p0[i] + (t0 * (1 - t1) + t1 * (1 - t0)) * q.c[i] + t0 * t1 * q.p1[i],
  );
  return `M${pt(...quadAt(q, t0))}Q${pt(...k)} ${pt(...quadAt(q, t1))}`;
}

/**
 * Tapered capsule from joint a to joint b with a mid bulge. Returns the outline
 * plus a highlight on the edge facing the upper-left key light and a rim on the
 * opposite edge.
 */
function capsule(a, b, wa, wb, bulge = 0, lit = true) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  let nx = -uy;
  let ny = ux;
  if (lit && nx * -0.6 + ny * -0.8 < 0) {
    nx = -nx;
    ny = -ny;
  }
  const m = lerp(a, b, 0.5);
  const wm = (wa + wb) / 4 + bulge;
  const edge = (s, inset) => {
    const ra = wa / 2 - inset;
    const rb = wb / 2 - inset;
    const c = 2 * (wm - inset) - (ra + rb) / 2;
    return {
      p0: [a[0] + s * nx * ra, a[1] + s * ny * ra],
      c: [m[0] + s * nx * c, m[1] + s * ny * c],
      p1: [b[0] + s * nx * rb, b[1] + s * ny * rb],
    };
  };
  const L = edge(1, 0);
  const R = edge(-1, 0);
  const ka = wa * 0.55;
  const kb = wb * 0.55;
  const d =
    `M${pt(...L.p0)}Q${pt(...L.c)} ${pt(...L.p1)}` +
    `C${pt(L.p1[0] + ux * kb, L.p1[1] + uy * kb)} ${pt(R.p1[0] + ux * kb, R.p1[1] + uy * kb)} ${pt(...R.p1)}` +
    `Q${pt(...R.c)} ${pt(...R.p0)}` +
    `C${pt(R.p0[0] - ux * ka, R.p0[1] - uy * ka)} ${pt(L.p0[0] - ux * ka, L.p0[1] - uy * ka)} ${pt(...L.p0)}Z`;
  return { d, hi: subQuad(edge(1, wa * 0.2), 0.12, 0.78), rim: subQuad(edge(-1, 0.4), 0.08, 0.92) };
}

/** A shaded limb segment: fill + ink, lit-edge highlight, rim light. */
export function part(a, b, wa, wb, o = {}) {
  const { fill = "url(#steel)", bulge = 0, hi = 0.55, rim = 0.8, ink = 1.1, hiColor = "#eaf4ff", rimColor = RIM } = o;
  const g = capsule(a, b, wa, wb, bulge);
  return (
    `<path d="${g.d}" fill="${fill}" stroke="${INK}" stroke-width="${ink}" stroke-linejoin="round"/>` +
    (hi
      ? `<path d="${g.hi}" fill="none" stroke="${hiColor}" stroke-opacity="${hi}" stroke-width="${f(Math.max(0.5, wa * 0.09))}" stroke-linecap="round"/>`
      : "") +
    (rim
      ? `<path d="${g.rim}" fill="none" stroke="${rimColor}" stroke-opacity="${rim}" stroke-width=".6" stroke-linecap="round"/>`
      : "")
  );
}

/** Capsule outline with a fixed winding, so several can be unioned in one path. */
const seg = (a, b, wa, wb, bulge = 0) => capsule(a, b, wa, wb, bulge, false).d;

/**
 * Segments merged into one inked silhouette: a double-width ink stroke under a
 * stroke-less fill hides the seams where segments overlap at a joint.
 */
const merged = (d, fill, ink = 1.1) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(ink * 2)}" stroke-linejoin="round"/><path d="${d}" fill="${fill}"/>`;

export const shape = (d, fill, w = 1.1, extra = "") =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
export const line = (d, color, w, op = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;

// ---------------------------------------------------------------------------
// Armored agent rig
// ---------------------------------------------------------------------------

export const ARMOR_DEFS = `
<linearGradient id="steel" x1="0" y1="0" x2="1" y2=".35">
  <stop offset="0" stop-color="#9ab2c7"/><stop offset=".18" stop-color="#6f8aa3"/>
  <stop offset=".5" stop-color="#3a4d61"/><stop offset=".82" stop-color="#1c2733"/>
  <stop offset="1" stop-color="#111821"/></linearGradient>
<linearGradient id="steelDk" x1="0" y1="0" x2="1" y2=".35">
  <stop offset="0" stop-color="#52697f"/><stop offset=".45" stop-color="#2a3a4d"/>
  <stop offset="1" stop-color="#0c1219"/></linearGradient>
<linearGradient id="suit" x1="0" y1="0" x2="1" y2=".25">
  <stop offset="0" stop-color="#2e4058"/><stop offset=".45" stop-color="#162232"/>
  <stop offset="1" stop-color="#070b12"/></linearGradient>
<linearGradient id="cape" gradientUnits="userSpaceOnUse" x1="-38" y1="-50" x2="34" y2="10">
  <stop offset="0" stop-color="#a02424"/><stop offset=".3" stop-color="#7a1818"/>
  <stop offset=".62" stop-color="#5c1212"/><stop offset="1" stop-color="#2a0606"/></linearGradient>
<linearGradient id="capeIn" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#2a0606"/><stop offset="1" stop-color="#140202"/></linearGradient>
<linearGradient id="visor" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#063844"/><stop offset=".42" stop-color="#11c4e4"/>
  <stop offset=".58" stop-color="#8af6ff"/><stop offset="1" stop-color="#04303d"/></linearGradient>
<linearGradient id="gun" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#6a7888"/><stop offset=".3" stop-color="#36414d"/>
  <stop offset="1" stop-color="#0e1217"/></linearGradient>
<radialGradient id="shade"><stop offset="0" stop-color="#000" stop-opacity=".7"/>
  <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="sheen"><stop offset="0" stop-color="#fff" stop-opacity=".5"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="aura"><stop offset="0" stop-color="#22e6ff" stop-opacity=".13"/>
  <stop offset=".6" stop-color="#22e6ff" stop-opacity=".04"/>
  <stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="scorch"><stop offset="0" stop-color="#050302" stop-opacity=".85"/>
  <stop offset=".5" stop-color="#1a0f08" stop-opacity=".5"/>
  <stop offset="1" stop-color="#1a0f08" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.3"/></filter>
<filter id="bloom" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="ao" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="1.5"/></filter>`;

/** Energy element drawn twice: blurred bloom then a bright core. */
export const energy = (inner, color = "#00e5ff") =>
  `<g filter="url(#glow)" fill="${color}" stroke="${color}">${inner}</g>` +
  `<g fill="#bffcff" stroke="#bffcff" opacity=".9">${inner}</g>`;

/** Visor glass outline of the standard helmet (unrotated rig coordinates). */
export const HELM_GLASS = "M-10.2,-85.1 L-2.4,-83.8 L0,-82.3 L2.4,-83.8 L10.2,-85.1 L10,-79.3 L3.2,-77.7 L0,-76.9 L-3.2,-77.7 L-10,-79.3 Z";

function helmet({ rot = 0, damaged = false }) {
  const tf = `transform="rotate(${rot} 0 -69)"`;
  const shell =
    "M0,-95 C7.6,-95 11.4,-89.8 11.4,-82.5 L11,-77 C10.6,-73.4 8.6,-70.6 5,-69 C3,-68.2 1.5,-68 0,-68 " +
    "C-1.5,-68 -3,-68.2 -5,-69 C-8.6,-70.6 -10.6,-73.4 -11,-77 L-11.4,-82.5 C-11.4,-89.8 -7.6,-95 0,-95 Z";
  const recess = "M-11.3,-86.2 L-2.4,-84.8 L0,-83.2 L2.4,-84.8 L11.3,-86.2 L10.9,-78.4 L3.4,-76.6 L0,-75.6 L-3.4,-76.6 L-10.9,-78.4 Z";
  const glass = HELM_GLASS;
  const body =
    `<g ${tf}>` +
    shape(shell, "url(#steel)") +
    // crest ridge + soft dome sheen
    shape("M-2,-94.8 C-1.2,-95.4 1.2,-95.4 2,-94.8 L1.5,-86.6 L-1.5,-86.6 Z", "url(#steelDk)", 0.5) +
    `<ellipse cx="-5.2" cy="-89.6" rx="4.4" ry="2.8" fill="url(#sheen)"/>` +
    line("M-8.2,-91 C-6.4,-93.4 -3.8,-94.4 -2.3,-94.4", "#f4faff", 0.8, 0.8) +
    line("M-10.9,-86 C-6,-88.4 6,-88.4 10.9,-86", INK, 0.6, 0.7) +
    // cheek seams and jaw guard
    line("M-10.8,-78 C-8.8,-75 -7.6,-72.6 -5.2,-70.6", INK, 0.5, 0.6) +
    line("M10.8,-78 C8.8,-75 7.6,-72.6 5.2,-70.6", INK, 0.5, 0.6) +
    shape("M-6.6,-76.1 L-3.3,-76.8 L0,-75.7 L3.3,-76.8 L6.6,-76.1 L5.3,-71 C3.6,-69.5 1.8,-68.9 0,-68.8 C-1.8,-68.9 -3.6,-69.5 -5.3,-71 Z", "url(#steelDk)", 0.6) +
    line("M-2.2,-74 L2.2,-74 M-2.4,-72.5 L2.4,-72.5 M-2,-71 L2,-71", "#020306", 0.55, 0.9) +
    line("M-2.2,-73.5 L2.2,-73.5 M-2.4,-72 L2.4,-72", "#6f8aa3", 0.3, 0.5) +
    // ear modules
    `<circle cx="-11" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="11" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>` +
    // visor
    shape(recess, "#03060a", 0.5) +
    shape(glass, damaged ? "#062a33" : "url(#visor)", 0.3) +
    (damaged
      ? line("M-7.6,-84.6 L-4.8,-81.6 L-5.6,-79.4 M-4.8,-81.6 L-1.6,-80.8 L0.8,-78.2 M-1.6,-80.8 L-0.6,-83.4", "#c8f6ff", 0.45, 0.85) +
        line("M-4.8,-81.6 L-8.4,-80.2", "#c8f6ff", 0.35, 0.6) +
        line("M4.4,-89.2 L6.2,-86.6 L5.4,-85.6 M6.2,-86.6 L8.6,-86.8", INK, 0.55, 0.9)
      : line("M-9,-84 L-4.6,-83.1", "#ffffff", 0.6, 0.8)) +
    line("M10.6,-90 C11.7,-87 11.7,-83 11.2,-78.6", RIM, 0.8, 0.85) +
    line("M8.6,-72.6 C7.6,-71 6.4,-69.8 5,-69.1", RIM, 0.5, 0.6) +
    `</g>`;
  const glowBand = "M-9.4,-81.8 L-2.6,-80.6 L0,-79.6 L2.6,-80.6 L9.4,-81.8";
  const glow =
    `<g ${tf}>` +
    (damaged
      ? `<path d="${glass}" fill="#00b8d8" filter="url(#glow)" opacity=".5"/>` +
        line("M1.6,-81 L9.2,-82", "#8af6ff", 0.6, 0.8)
      : `<path d="${glass}" fill="#00e5ff" filter="url(#bloom)" opacity=".7"/>` +
        `<path d="${glass}" fill="#00e5ff" filter="url(#glow)"/>` +
        line(glowBand, "#e6ffff", 0.8, 1)) +
    energy(`<circle cx="-11" cy="-80.6" r=".6"/><circle cx="11" cy="-80.6" r=".6"/>`) +
    `</g>`;
  return { body, glow };
}

export function armoredLeg({ hip, kn, an }, s) {
  const thighA = lerp(hip, kn, 0.22);
  const thighB = lerp(hip, kn, 0.84);
  const shinA = lerp(kn, an, 0.14);
  const shinB = lerp(kn, an, 0.8);
  const bootAng = angle(kn, an);
  const stripeA = lerp(kn, an, 0.3);
  const stripeB = lerp(kn, an, 0.68);
  const body =
    part(hip, kn, 14.4, 10.4, { fill: "url(#suit)", bulge: 1.4, hi: 0.25, rim: 0.45 }) +
    part(thighA, thighB, 11.2, 8.2, { bulge: 1.2 }) +
    part(kn, an, 10.2, 6.8, { fill: "url(#suit)", bulge: 1.6, hi: 0.2, rim: 0.45 }) +
    part(shinA, shinB, 9.4, 6.8, { bulge: 1.3 }) +
    line(`M${pt(...stripeA)}L${pt(...stripeB)}`, "#05131a", 1.4) +
    line(`M${pt(...stripeA)}L${pt(...stripeB)}`, "#0a8aa0", 0.6) +
    // knee cop
    `<g transform="translate(${pt(...kn)}) rotate(${f(bootAng)})">` +
    shape("M0,-5 C3.6,-5 5.4,-2.4 5.4,0.2 C5.4,3 3.2,4.8 0,4.8 C-3.2,4.8 -5.4,3 -5.4,0.2 C-5.4,-2.4 -3.6,-5 0,-5 Z", "url(#steel)") +
    line("M-3.8,-1.4 C-2,-3.6 1.8,-3.8 3.6,-1.6", "#eaf4ff", 0.6, 0.6) +
    line("M-4.2,1.6 C-1.6,3 1.6,3 4.2,1.6", INK, 0.45, 0.6) +
    `<circle cx="0" cy="0.6" r="1" fill="#05131a"/>` +
    `</g>` +
    // boot
    `<g transform="translate(${pt(...an)}) rotate(${f(bootAng)})">` +
    shape(
      `M-4.3,-8 L4.3,-8 L4.7,2 C${f(s * 1.2 + 6.2)},3 ${f(s * 1.2 + 6.4)},6.6 ${f(s * 1.2 + 5.6)},8 ` +
        `L${f(s * 1.2 - 5.6)},8 C${f(s * 1.2 - 6.4)},6.6 ${f(s * 1.2 - 6.2)},3 -4.7,2 Z`,
      "url(#steelDk)",
    ) +
    shape(`M${f(s * 1.2 - 5.9)},6.4 L${f(s * 1.2 + 5.9)},6.4 L${f(s * 1.2 + 5.6)},8 L${f(s * 1.2 - 5.6)},8 Z`, "#07090d", 0.5) +
    shape(`M${f(s * 1.2 - 4.2)},2.2 C${f(s * 1.2 - 2)},0.8 ${f(s * 1.2 + 2)},0.8 ${f(s * 1.2 + 4.2)},2.2 L${f(s * 1.2 + 5)},5.6 L${f(s * 1.2 - 5)},5.6 Z`, "url(#steel)", 0.5) +
    line("M-4.4,-3.4 L4.4,-3.4", INK, 0.5, 0.7) +
    line(`M${f(s * 1.2 - 3)},2.6 C${f(s * 1.2 - 1)},1.8 ${f(s * 1.2 + 1)},1.8 ${f(s * 1.2 + 2.4)},2.4`, "#eaf4ff", 0.5, 0.6) +
    line("M4.4,-7 L4.8,1.8", RIM, 0.5, 0.6) +
    `</g>`;
  const glow = energy(`<path d="M${pt(...stripeA)}L${pt(...stripeB)}" fill="none" stroke-width=".6" stroke-linecap="round"/>`);
  return { body, glow };
}

/**
 * Armored fist hanging or swinging at the end of a forearm. Local frame: origin at
 * the wrist, +y toward the knuckles; the thumb sits on the body side (-s).
 */
function gauntlet(wr, el, s) {
  const i = -s;
  const X = (x) => f(i * x);
  return (
    `<g transform="translate(${pt(...wr)}) rotate(${f(angle(el, wr))}) scale(1.12) translate(0 -1)">` +
    shape("M-4,-0.4 C-4.7,2.4 -4.9,5.6 -4.4,8.2 L4.4,8.2 C4.9,5.6 4.7,2.4 4,-0.4 Z", "url(#steelDk)", 1) +
    shape("M-3.2,0.8 C-3.5,2.8 -3.5,4.8 -3.2,6.6 L3.2,6.6 C3.5,4.8 3.5,2.8 3.2,0.8 Z", "url(#steel)", 0.5) +
    line("M-2.4,1.6 C-2.6,3 -2.6,4.4 -2.4,5.6", "#eaf4ff", 0.45, 0.6) +
    // curled finger group with a lit knuckle ridge
    shape("M-4.5,7.2 C-4.8,9.4 -4.2,11.4 -2.7,12.3 C-0.9,13 0.9,13 2.7,12.3 C4.2,11.4 4.8,9.4 4.5,7.2 C1.5,6.6 -1.5,6.6 -4.5,7.2 Z", "url(#steelDk)", 1) +
    line("M-2.2,7.5 L-2.3,12.3 M0,7.3 L0,12.9 M2.2,7.5 L2.3,12.3", INK, 0.45, 0.8) +
    line("M-4,7.8 C-1.4,7.2 1.4,7.2 4,7.8", "#eaf4ff", 0.45, 0.55) +
    // thumb folded across the front of the fingers
    shape(`M${X(3.6)},1.8 C${X(6)},3.4 ${X(6.1)},7.4 ${X(4.4)},10.4 C${X(3.6)},11.3 ${X(2.2)},11.1 ${X(2)},10 C${X(2.9)},7.8 ${X(3.1)},5.4 ${X(2.3)},3.4 Z`, "url(#steel)", 0.8) +
    line(`M${X(4.6)},3.6 C${X(5.2)},5.6 ${X(5)},7.6 ${X(4.2)},9.4`, "#eaf4ff", 0.4, 0.5) +
    `</g>`
  );
}
/** Open gauntlet with splayed fingers (reaching). */
function openHand(wr, el) {
  const fingers = [-24, -8, 8, 22]
    .map((a, i) => {
      const len = [5.6, 6.6, 6.4, 5.2][i];
      const x = -2.4 + i * 1.6;
      const r = (a * Math.PI) / 180;
      return part([x, 5], [x + Math.sin(r) * len, 5 + Math.cos(r) * len], 1.9, 1.5, { fill: "url(#steelDk)", hi: 0.3, rim: 0, ink: 0.6 });
    })
    .join("");
  return (
    `<g transform="translate(${pt(...wr)}) rotate(${f(angle(el, wr))})">` +
    fingers +
    part([4, 2], [7.2, 6.4], 2.2, 1.7, { fill: "url(#steelDk)", hi: 0.3, rim: 0, ink: 0.6 }) +
    shape("M-3.8,-1 C-4,1.6 -4.2,4.4 -3.6,6 C-1.6,7 1.8,7 3.8,6 C4.2,4.4 4,1.6 3.8,-1 Z", "url(#steel)", 0.9) +
    shape("M-3.9,-1.8 L3.9,-1.8 L3.7,0.4 L-3.7,0.4 Z", "#0a0f16", 0.5) +
    `</g>`
  );
}

/**
 * Arm joints from a pose entry. Forward kinematics by default: `rot` swings the upper
 * arm away from the body (degrees off vertical) and `bend` flexes the forearm back
 * toward the midline; `upper` / `fore` set segment lengths (shorter = foreshortened).
 * Explicit `el` / `wr` points override for gripping or sprawled poses.
 */
export function armJoints(arm, s) {
  const { sh, rot = 8, bend = 12, upper = 28, fore = 24 } = arm;
  const el = arm.el || polar(sh, s * rot, upper);
  const wr = arm.wr || polar(el, s * (rot - bend), fore);
  return { sh, el, wr };
}

/** How far the upper arm swings out from the body, in degrees (positive = away). */
export const armSwing = (arm, s) => {
  const { sh, el } = armJoints(arm, s);
  return s * heading(sh, el);
};

/**
 * Armored arm: one merged undersuit sleeve (so no gap opens at any bend), a shaped
 * rerebrace with bicep mass, a vambrace that tapers wrist-ward, and an elbow cop
 * capping the joint. Ambient occlusion falls on whatever the arm overlaps.
 */
export function armoredArm(arm, s, chrono) {
  const { sh, el, wr } = armJoints(arm, s);
  const hand = arm.hand ?? "fist";
  const up = heading(sh, el);
  const top = polar(sh, up, -4);
  const sleeve = seg(top, el, 11.8, 8.6, 1.2) + seg(el, wr, 8.6, 6.2, 0.7);
  const upA = angle(sh, el);
  const foA = angle(el, wr);
  let delta = foA - upA;
  delta -= 360 * Math.round(delta / 360);
  const copA = upA + delta / 2;
  const foreLen = dist(el, wr);
  const devAt = lerp(el, wr, 0.62);
  let body =
    `<path d="${sleeve}" fill="#000" opacity=".55" filter="url(#ao)" transform="translate(${f(-s * 1.8)},1.6)"/>` +
    merged(sleeve, "url(#suit)") +
    // rerebrace: wide under the pauldron, bicep swell, narrowing to the elbow
    part(polar(sh, up, 1), lerp(sh, el, 0.8), 12.4, 9.2, { bulge: 1.3, hi: 0.6 }) +
    line(`M${pt(...polar(lerp(sh, el, 0.44), up + 90, 5.6))}Q${pt(...polar(lerp(sh, el, 0.48), up, 0.9))} ${pt(...polar(lerp(sh, el, 0.44), up - 90, 5.6))}`, INK, 0.5, 0.6) +
    // vambrace
    part(lerp(el, wr, foreLen < 14 ? 0.05 : 0.14), lerp(el, wr, 0.9), 10.2, 7.2, { bulge: 0.9, hi: 0.5 }) +
    line(`M${pt(...lerp(el, wr, 0.3))}L${pt(...lerp(el, wr, 0.82))}`, "#05131a", 1.1, 0.8) +
    // elbow cop capping the joint, with a fan on the outer side
    `<g transform="translate(${pt(...el)}) rotate(${f(copA)})">` +
    shape(`M${f(s * 2.6)},-3.2 C${f(s * 6.6)},-4.4 ${f(s * 8)},0 ${f(s * 6.6)},3.6 L${f(s * 3)},2.8 Z`, "url(#steelDk)", 0.7) +
    shape("M0,-4.6 C3.4,-4.6 5,-2.2 5,0.2 C5,2.8 3,4.6 0,4.6 C-3,4.6 -5,2.8 -5,0.2 C-5,-2.2 -3.4,-4.6 0,-4.6 Z", "url(#steel)", 0.9) +
    line("M-3.4,-1.8 C-1.8,-3.6 1.6,-3.8 3.2,-2", "#eaf4ff", 0.6, 0.65) +
    `<circle cx="0" cy=".4" r="1.1" fill="#0a0f16"/>` +
    `</g>` +
    // wrist cuff
    `<g transform="translate(${pt(...wr)}) rotate(${f(foA)})">` +
    shape("M-4.6,-2.6 L4.6,-2.6 L4.9,.6 L-4.9,.6 Z", "#0a0f16", 0.6) +
    line("M-4.2,-1.9 L4.2,-1.9", "#6f8aa3", 0.35, 0.6) +
    `</g>`;
  let glow = energy(`<path d="M${pt(...lerp(el, wr, 0.3))}L${pt(...lerp(el, wr, 0.82))}" fill="none" stroke-width=".45" stroke-linecap="round"/>`);
  if (chrono) {
    body +=
      `<g transform="translate(${pt(...devAt)}) rotate(${f(foA)})">` +
      `<rect x="-3.2" y="-2.7" width="6.4" height="5.4" rx=".9" fill="#0a0f16" stroke="${INK}" stroke-width=".5"/>` +
      `<rect x="-2.2" y="-1.7" width="4.4" height="3.4" rx=".4" fill="#0b6f80"/></g>`;
    glow += `<g transform="translate(${pt(...devAt)}) rotate(${f(foA)})">${energy(`<rect x="-1.9" y="-1.4" width="3.8" height="2.8" rx=".3"/>`)}</g>`;
  }
  if (hand === "fist") body += gauntlet(wr, el, s);
  if (hand === "open") body += openHand(wr, el);
  return { body, glow };
}

export function pauldron(s, tilt = 0) {
  const dome =
    "M11,-66.8 C17,-70.4 26.2,-68.8 29.2,-61.6 C31,-57 30.6,-52.4 28.8,-49.4 C25,-51 20.4,-51.6 16.4,-50.6 C16.8,-56 14.8,-61.6 11,-63.8 Z";
  const lame1 = "M16.8,-51.8 C21,-52.9 25.6,-52.3 29,-50.4 L28.5,-46.2 C25.3,-47.9 21,-48.3 17.1,-47.5 Z";
  const lame2 = "M17.3,-47.8 C21,-48.6 25,-48.2 28.2,-46.5 L27.3,-42.6 C24.5,-44 21,-44.4 17.7,-43.8 Z";
  const M = s < 0 ? mirror : (d) => d;
  const lit = s < 0;
  return (
    `<g transform="rotate(${f(tilt)} ${f(s * 12)} -65)">` +
    shape(M(lame2), "url(#steelDk)", 0.8) +
    shape(M(lame1), "url(#steel)", 0.8) +
    shape(M(dome), "url(#steel)") +
    line(M("M13.6,-65.4 C18.4,-67.6 24.2,-66.8 27.3,-62"), "#f4faff", lit ? 0.9 : 0.6, lit ? 0.85 : 0.45) +
    line(M("M16.8,-53.2 C21,-54.2 25.4,-53.6 28.6,-51.6"), INK, 0.5, 0.6) +
    (lit
      ? `<ellipse cx="-20.5" cy="-63" rx="5" ry="3" fill="url(#sheen)"/>`
      : line("M29.6,-60.4 C30.8,-56.4 30.4,-52.8 28.9,-50", RIM, 0.8, 0.9) +
        line("M28.9,-49.6 L28.4,-46.6 M28.1,-46 L27.3,-43", RIM, 0.55, 0.7)) +
    `</g>`
  );
}

export function torso() {
  const chest =
    "M-14,-64.6 C-8,-66.2 8,-66.2 14,-64.6 C17,-60 17.6,-54 16.4,-49 C15.2,-44.5 12.5,-41 10,-39.6 " +
    "C6,-38.7 3,-37.7 0,-36.6 C-3,-37.7 -6,-38.7 -10,-39.6 C-12.5,-41 -15.2,-44.5 -16.4,-49 C-17.6,-54 -17,-60 -14,-64.6 Z";
  const suit =
    "M-9,-68 L9,-68 L16,-64 C19,-62 19.5,-57 18.5,-52 C17.5,-46 14.5,-40 12.8,-33 C12.3,-29 13.6,-24 14.6,-20 " +
    "L15,-15 C10,-14 5,-13 0,-12 C-5,-13 -10,-14 -15,-15 L-14.6,-20 C-13.6,-24 -12.3,-29 -12.8,-33 " +
    "C-14.5,-40 -17.5,-46 -18.5,-52 C-19.5,-57 -19,-62 -16,-64 Z";
  let lames = "";
  for (let i = 2; i >= 0; i--) {
    const t = -39.4 + i * 4;
    const w = 10.4 + i * 0.5;
    lames +=
      shape(
        `M${f(-w)},${f(t)} C${f(-w / 2)},${f(t + 0.8)} ${f(w / 2)},${f(t + 0.8)} ${f(w)},${f(t)} ` +
          `L${f(w - 0.3)},${f(t + 3.8)} C${f(w / 2)},${f(t + 4.6)} ${f(-w / 2)},${f(t + 4.6)} ${f(-w + 0.3)},${f(t + 3.8)} Z`,
        "url(#steel)",
        0.7,
      ) +
      line(`M${f(-w + 1.2)},${f(t + 0.9)} C${f(-w / 2)},${f(t + 1.5)} -1,${f(t + 1.6)} -0.6,${f(t + 1.6)}`, "#eaf4ff", 0.45, 0.5) +
      line(`M0,${f(t + 0.8)} L0,${f(t + 4.4)}`, INK, 0.45, 0.6) +
      line(`M${f(w - 0.2)},${f(t + 0.6)} L${f(w - 0.4)},${f(t + 3.4)}`, RIM, 0.5, 0.7);
  }
  const tasset = "M-4.8,-22.4 L-14.6,-23 C-15.8,-19 -16.2,-15 -15.8,-10.8 L-7.4,-9.2 C-6.1,-12.8 -5.3,-18 -4.8,-22.4 Z";
  return (
    shape(suit, "url(#suit)") +
    // ambient occlusion under the chest plate
    `<ellipse cx="0" cy="-36" rx="12" ry="3.5" fill="url(#shade)"/>` +
    lames +
    shape(chest, "url(#steel)") +
    `<ellipse cx="-8" cy="-56" rx="7" ry="5" fill="url(#sheen)" opacity=".55"/>` +
    line("M0,-65.6 L0,-37.2", INK, 0.55, 0.7) +
    line("M-0.6,-65.2 L-0.6,-38", "#b8cadb", 0.35, 0.5) +
    line("M-15.8,-50 C-11,-44.6 -5,-44.8 -0.6,-47.6", INK, 0.55, 0.65) +
    line("M15.8,-50 C11,-44.6 5,-44.8 0.6,-47.6", INK, 0.55, 0.65) +
    line("M-14.6,-49 C-10.6,-45.6 -6,-45.6 -2,-47.2", "#dfe9f4", 0.4, 0.35) +
    line("M-13.4,-60.8 C-10,-62.8 -6,-63.2 -2.4,-62.4", "#ffffff", 0.8, 0.75) +
    line("M16.7,-58.4 C17.3,-54 16.6,-50 15,-46.2", RIM, 0.75, 0.85) +
    // chest core housing
    `<circle cx="0" cy="-54" r="3.4" fill="#070c12" stroke="#6f8aa3" stroke-width=".6"/>` +
    `<circle cx="0" cy="-54" r="3.4" fill="none" stroke="${INK}" stroke-width=".3"/>` +
    `<circle cx="0" cy="-54" r="1.9" fill="#0b7c90"/>` +
    // belt, pouches, buckle
    shape("M-13.8,-27.9 C-6,-26.9 6,-26.9 13.8,-27.9 L14.6,-22.6 C6,-21.4 -6,-21.4 -14.6,-22.6 Z", "#131822") +
    line("M-13.2,-26.9 C-6,-26 6,-26 13.2,-26.9", "#3a4656", 0.4, 0.8) +
    shape("M-12.8,-27.4 L-8,-27 L-8.2,-21.4 L-12.9,-21.9 Z", "url(#steelDk)", 0.6) +
    shape("M12.8,-27.4 L8,-27 L8.2,-21.4 L12.9,-21.9 Z", "url(#steelDk)", 0.6) +
    line("M-12.6,-25.2 L-8.1,-24.9 M12.6,-25.2 L8.1,-24.9", INK, 0.4, 0.8) +
    `<rect x="-3.7" y="-27.7" width="7.4" height="5.4" rx=".9" fill="url(#steel)" stroke="${INK}" stroke-width=".6"/>` +
    `<rect x="-2.1" y="-26.3" width="4.2" height="2.6" rx=".4" fill="#0b6f80"/>` +
    // hip plates
    shape("M-4.6,-22 L4.6,-22 L3.6,-14 L0,-11.6 L-3.6,-14 Z", "url(#steelDk)", 0.8) +
    shape(tasset, "url(#steel)") +
    shape(mirror(tasset), "url(#steel)") +
    line("M-13.8,-21.4 C-11,-21.2 -8,-21 -5.6,-20.8", "#eaf4ff", 0.5, 0.6) +
    line("M-14.4,-17 L-6.2,-16", INK, 0.45, 0.55) +
    line("M14.4,-17 L6.2,-16", INK, 0.45, 0.55) +
    line("M15.4,-20.6 C15.8,-17 15.9,-14 15.6,-11.4", RIM, 0.6, 0.85)
  );
}

export const TORSO_GLOW = energy(
  `<circle cx="0" cy="-54" r="1.7"/><rect x="-1.8" y="-26" width="3.6" height="2.2" rx=".3"/>`,
);

export function gorget() {
  return (
    shape("M-5.4,-71.6 L5.4,-71.6 L5.8,-66 L-5.8,-66 Z", "url(#suit)", 0.8) +
    `<ellipse cx="0" cy="-67.8" rx="7" ry="2.6" fill="url(#shade)"/>` +
    shape("M-9.6,-70.4 C-5,-68.7 5,-68.7 9.6,-70.4 L15.2,-64.6 C8,-62.4 -8,-62.4 -15.2,-64.6 Z", "url(#steel)") +
    line("M-12.4,-67.4 C-6,-65.6 6,-65.6 12.4,-67.4", INK, 0.45, 0.6) +
    line("M-9,-69.6 C-5,-68.2 -1,-68 1.6,-68", "#f4faff", 0.55, 0.7) +
    line("M10.2,-69.6 L14.6,-65", RIM, 0.55, 0.8)
  );
}

/** Split crimson cape hanging behind a standing agent. */
export function standingCape() {
  const side =
    "M-12,-66 C-22,-66.5 -28.4,-60.4 -30.4,-50 C-33,-30 -35.6,-8 -37.4,18 C-38,27 -37.8,33 -36.6,40 " +
    "L-33.2,37.4 L-29.8,41.6 L-25.8,38 L-21.8,40.6 C-20.8,20 -19,-10 -14,-40 Z";
  const center =
    "M-14,-64 L14,-64 C18,-40 21.6,-10 24.6,18 C25.6,28 26.2,35 25.8,42 L21,39.4 L16.2,43 L10.4,40 L4.6,43.4 " +
    "L-1.8,40.4 L-8,43 L-14,39.4 L-19.8,42.6 L-25.8,40 C-25.3,34 -24.8,26 -23.8,18 C-21,-10 -17.8,-40 -14,-64 Z";
  const collar = "M-8.6,-66.4 C-12.6,-70.4 -14.8,-75.6 -13.8,-79.4 C-16.4,-75.2 -18,-69.6 -16.6,-63.8 Z";
  return (
    `<ellipse cx="0" cy="58.6" rx="36" ry="4.6" fill="url(#shade)"/>` +
    shape(center, "url(#cape)") +
    line("M-24.6,39.6 L-19.8,41.8 L-14,38.6 L-8,42.2 L-1.8,39.6 L4.6,42.6 L10.4,39.2 L16.2,42.2 L21,38.6 L25.4,41", "#1a0303", 1.2, 0.7) +
    line("M-6,-40 C-8,-10 -9,15 -8,40 M6,-40 C8,-10 10,15 10.4,38", "#2a0606", 0.8, 0.55) +
    line("M-16,-20 C-17,5 -19,25 -19.8,40 M17,-18 C18.6,5 20,25 21,37", "#2a0606", 0.7, 0.5) +
    line("M-12,-10 C-13,10 -14,25 -14,37", "#c43a3a", 0.5, 0.35) +
    shape(side, "url(#cape)") +
    line("M-34.6,39 L-33.2,37.4 L-29.8,41.2 L-25.8,37.6 L-22.4,39.8", "#1a0303", 1, 0.7) +
    line("M-26,-40 C-29,-10 -31.6,15 -32,36", "#2a0606", 0.8, 0.6) +
    line("M-28.6,-54 C-31.4,-30 -33.8,-5 -35.4,20", "#d04444", 0.6, 0.45) +
    shape(mirror(side), "url(#cape)") +
    line("M26,-40 C29,-10 31.6,15 32,36", "#1a0303", 0.8, 0.6) +
    line("M30.6,-50 C33.2,-30 35.8,-5 37.4,18 C37.9,27 37.8,33 36.8,39", RIM, 0.6, 0.55) +
    shape(collar, "#7a1818", 0.9) +
    shape(mirror(collar), "#4a0e0e", 0.9) +
    line("M-13.6,-78 C-14.6,-73.6 -15.2,-69 -14.8,-65", "#d04444", 0.5, 0.6)
  );
}

/**
 * Armored agent in rig coordinates (standing: head top -95, soles +58).
 * @returns {{ cape: string, body: string, glow: string, helmGlow: string }}
 */
export function armorRig(pose, { cape = standingCape(), mid = "", front = "", damaged = false, chrono = true } = {}) {
  const legs = pose.legs.map((leg, i) => armoredLeg(leg, i === 0 ? -1 : 1));
  const arms = pose.arms.map((arm, i) => armoredArm(arm, i === 0 ? -1 : 1, chrono && i === 0));
  // pauldrons ride up a little as the upper arm swings out
  const tilt = pose.arms.map((arm, i) => {
    const s = i === 0 ? -1 : 1;
    return -s * clamp((armSwing(arm, s) - 8) * 0.35, -4, 12);
  });
  // contact shadow the pauldron casts onto the top of each arm
  const shoulderAO = pose.arms
    .map((arm) => `<ellipse cx="${f(arm.sh[0])}" cy="${f(arm.sh[1] + 9)}" rx="7" ry="3.4" fill="url(#shade)"/>`)
    .join("");
  const helm = helmet({ rot: pose.helmRot || 0, damaged });
  const body =
    legs.map((l) => l.body).join("") +
    torso() +
    mid +
    arms.map((a) => a.body).join("") +
    shoulderAO +
    pauldron(-1, tilt[0]) +
    pauldron(1, tilt[1]) +
    front +
    gorget() +
    helm.body;
  const glow = legs.map((l) => l.glow).join("") + TORSO_GLOW + arms.map((a) => a.glow).join("");
  return { cape, body, glow, helmGlow: helm.glow };
}

// Relaxed heroic stance: arms hang a little clear of the tassets, elbows soft.
export const STAND = {
  arms: [
    { sh: [-20, -59], rot: 10, bend: 15 },
    { sh: [20, -59], rot: 8, bend: 19 },
  ],
  legs: [
    { hip: [-7.5, -19], kn: [-10.6, 19], an: [-13.6, 50] },
    { hip: [7.5, -19], kn: [10.4, 19], an: [13.2, 50] },
  ],
};

// Rifle frame: butt tucked under the right pauldron, muzzle angled down-forward.
export const RIFLE_AT = [-18, -47];
export const RIFLE_ROT = 36;
export const rifleToWorld = ([x, y]) => {
  const r = (RIFLE_ROT * Math.PI) / 180;
  return [RIFLE_AT[0] + x * Math.cos(r) - y * Math.sin(r), RIFLE_AT[1] + x * Math.sin(r) + y * Math.cos(r)];
};

// Low ready: both elbows by the ribs, forearms foreshortened toward the weapon.
export const ARMED = {
  arms: [
    { sh: [-20, -59], el: [-25.4, -35], wr: rifleToWorld([10.2, 9.8]), hand: "none" },
    { sh: [20, -59], el: [27.6, -33], wr: rifleToWorld([46.4, 0]), hand: "none" },
  ],
  legs: [
    { hip: [-7.5, -19], kn: [-12.4, 18.6], an: [-16.6, 50] },
    { hip: [7.5, -19], kn: [10.2, 19], an: [12.4, 50] },
  ],
};

/**
 * Armored fist closed round a grip that runs along +y in rifle space, centred at
 * (gx, gy). `w` is the side the wrist sits on; fingers wrap to the other side and
 * the thumb hooks over the top. `index` lays the trigger finger along the guard.
 */
function gripFist(gx, gy, w, index) {
  const X = (x) => f(gx + w * x);
  const Y = (y) => f(gy + y);
  const P = (x, y) => `${X(x)},${Y(y)}`;
  const fingers = [-3.3, -1.1, 1.1, 3.3]
    .map(
      (y, i) =>
        shape(
          `M${P(1.6, y - 1.15)} L${P(-2.8 + i * 0.3, y - 1.15)} C${P(-4.4 + i * 0.3, y - 1.1)} ${P(-4.4 + i * 0.3, y + 1.1)} ${P(-2.8 + i * 0.3, y + 1.15)} L${P(1.6, y + 1.15)} Z`,
          "url(#steelDk)",
          0.55,
        ) + line(`M${P(-3.2 + i * 0.3, y - 0.6)} C${P(-3.8 + i * 0.3, y - 0.2)} ${P(-3.8 + i * 0.3, y + 0.3)} ${P(-3.4 + i * 0.3, y + 0.6)}`, "#eaf4ff", 0.35, 0.5),
    )
    .join("");
  return (
    // back of the hand on the wrist side
    shape(`M${P(0.6, -5)} C${P(3.4, -5.8)} ${P(6.6, -4.8)} ${P(7, -2.4)} L${P(7, 2.8)} C${P(6.6, 5)} ${P(3.4, 5.8)} ${P(0.6, 4.8)} Z`, "url(#steel)", 0.9) +
    line(`M${P(2.2, -3.8)} C${P(4, -4.2)} ${P(5.6, -3.6)} ${P(6, -2.2)}`, "#eaf4ff", 0.45, 0.6) +
    line(`M${P(1.6, -4.4)} L${P(1.6, 4.4)}`, INK, 0.5, 0.6) +
    fingers +
    // thumb over the top of the grip
    shape(`M${P(4.4, -4.4)} C${P(3, -7.4)} ${P(-1.4, -7.8)} ${P(-3.6, -6.2)} C${P(-3.8, -5.2)} ${P(-3, -4.8)} ${P(-2.2, -5)} C${P(-0.6, -5.6)} ${P(1.4, -5.2)} ${P(2.4, -3.8)} Z`, "url(#steel)", 0.7) +
    (index
      ? shape(`M${P(-1.6, -4.6)} L${P(-7.4, -4.4)} C${P(-8.6, -4.2)} ${P(-8.6, -2.6)} ${P(-7.4, -2.6)} L${P(-1.6, -2.6)} Z`, "url(#steelDk)", 0.6)
      : "")
  );
}

/** Chrono rifle in its own frame (butt at 0,0, muzzle along +x); hands drawn separately. */
export function chronoRifle() {
  const tf = `transform="translate(${pt(...RIFLE_AT)}) rotate(${RIFLE_ROT})"`;
  const body =
    `<g ${tf}>` +
    // stock
    shape("M0,-3.6 L10,-4.6 L14,-4.6 L14,3.6 L9,3.6 L4,6.6 L0,6.6 C-1,4 -1,-1 0,-3.6 Z", "url(#gun)") +
    shape("M4,-1.4 L10,-2 L10,1.4 L6,3.4 L4,3.4 Z", "#05070a", 0.4) +
    // pistol grip + energy cell + foregrip
    shape("M14.6,4.2 L20.6,4.2 L19.2,14 L13.2,13.4 Z", "url(#gun)", 0.9) +
    line("M20.6,4.4 C21.4,8 24.6,8.6 25.8,4.4", INK, 0.7) +
    shape("M26,4 L34.4,4 L33.8,12.4 L26.6,12.4 Z", "#0a0e13", 0.9) +
    `<rect x="27.6" y="5.6" width="5" height="5.2" rx=".6" fill="#0b6f80"/>` +
    shape("M40.4,3.6 L47,3.6 L46.2,12.4 L41.2,12.4 Z", "url(#gun)", 0.9) +
    // receiver
    shape("M12,-5.6 L44,-5.6 L47.4,-3.6 L47.4,4 L12,4.6 Z", "url(#gun)") +
    line("M14,-3.8 L44,-3.8", "#aab8c6", 0.4, 0.6) +
    line("M24,-5.2 L24,4.2 M36,-5.2 L36,4.2", INK, 0.45, 0.7) +
    line("M13.6,0.8 L46.8,0.4", "#05131a", 1.2) +
    // scope
    shape("M19,-10.4 L37,-10.4 C38.4,-10.4 39.2,-9.4 39.2,-8 C39.2,-6.6 38.4,-5.6 37,-5.6 L19,-5.6 Z", "url(#gun)", 0.9) +
    line("M20,-9.4 L36.6,-9.4", "#c6d4e2", 0.4, 0.6) +
    `<circle cx="38.4" cy="-8" r="1.7" fill="#0b6f80" stroke="${INK}" stroke-width=".4"/>` +
    // shroud, vents, emitter rings
    shape("M47,-4 L80.4,-3.2 L80.4,2.8 L47,3.8 Z", "url(#gun)") +
    line("M48,-2.8 L79.6,-2.2", "#c6d4e2", 0.4, 0.55) +
    `<g fill="#05070a"><rect x="52" y="-1.6" width="2.2" height="3.6" rx=".4"/><rect x="56.4" y="-1.6" width="2.2" height="3.6" rx=".4"/><rect x="60.8" y="-1.6" width="2.2" height="3.6" rx=".4"/></g>` +
    `<g fill="#0b6f80" stroke="${INK}" stroke-width=".35"><rect x="67" y="-3.8" width="1.8" height="7.2"/><rect x="72" y="-3.7" width="1.8" height="7"/></g>` +
    // muzzle + emitter prongs
    shape("M80.4,-4.4 L90,-3 L90,2.6 L80.4,4 Z", "url(#steel)", 0.9) +
    shape("M88.4,-3.4 L95.6,-2.4 L95.6,-1.2 L88.4,-1 Z", "url(#steelDk)", 0.6) +
    shape("M88.4,1 L95.6,0.8 L95.6,2 L88.4,3 Z", "url(#steelDk)", 0.6) +
    line("M48,3.4 L80,2.6", RIM, 0.55, 0.7) +
    `</g>`;
  // trigger hand on the pistol grip, support hand wrapped under the foregrip
  const hands = `<g ${tf}>${gripFist(16.8, 9, -1, true)}${gripFist(43.8, 8.4, 1, false)}</g>`;
  const glow =
    `<g ${tf}>` +
    energy(
      `<rect x="28" y="6" width="4.2" height="4.4" rx=".5"/><rect x="67.3" y="-3.4" width="1.2" height="6.4"/>` +
        `<rect x="72.3" y="-3.3" width="1.2" height="6.2"/><circle cx="38.4" cy="-8" r=".9"/>` +
        `<path d="M14,0.8 L46.6,0.4" fill="none" stroke-width=".5"/>`,
    ) +
    `<circle cx="95" cy="-0.2" r="4.6" fill="#00e5ff" filter="url(#bloom)" opacity=".8"/>` +
    `<circle cx="95" cy="-0.2" r="1.5" fill="#e8ffff"/>` +
    `</g>`;
  return { body, hands, glow };
}

function standingModel({ armed }) {
  const rifle = armed ? chronoRifle() : { body: "", hands: "", glow: "" };
  const rig = armorRig(armed ? ARMED : STAND, { mid: rifle.body, front: rifle.hands, chrono: !armed });
  return {
    box: armed ? [-48, -100, 132, 164] : [-48, -100, 96, 164],
    defs: ARMOR_DEFS,
    anim: { type: "breathe", amp: 0.006, speed: 1.6, pivot: [0, 58] },
    layers: [
      { markup: `<ellipse cx="0" cy="-22" rx="46" ry="78" fill="url(#aura)"/>`, anim: { type: "pulse", min: 0.6, max: 1, speed: 1.2 } },
      { markup: rig.cape, anim: { type: "sway", amp: 0.022, speed: 1.7, pivot: [0, -64] } },
      { markup: rig.body },
      {
        markup: rig.glow + rig.helmGlow + rifle.glow,
        anim: { type: "pulse", min: 0.7, max: 1, speed: armed ? 3.4 : 2.4 },
        blend: "lighter",
      },
    ],
  };
}

// Fallen pose, rig coordinates. The figure is laid on its right side with rig +x
// pointing at the floor, so "down" for gravity is +x here: knees drawn up, the right
// arm pinned along the floor under the body, the left arm slumped down in front of
// the chest, helmet rolled onto the floor.
export const FALLEN = {
  arms: [
    { sh: [-20, -59], el: [3, -68], wr: [25, -62], hand: "open" },
    { sh: [20, -59], el: [30, -38], wr: [31, -15] },
  ],
  legs: [
    { hip: [-7.5, -19], kn: [17, 3], an: [21, 33] },
    { hip: [7.5, -19], kn: [30, -3], an: [31, 28] },
  ],
};

export const FALLEN_TF = `transform="translate(-10,20) scale(1,.92) rotate(88)"`;

/** Edge of the cape spread on the floor behind the body (rig coordinates). */
export function fallenCape() {
  const pool =
    "M-12,-66 C-22,-70 -30,-64 -32,-52 C-34,-36 -34,-14 -32,4 C-31,16 -28,26 -24,34 L-20,30 L-17,38 L-12,32 L-8,40 " +
    "C-4,34 0,28 2,20 L10,-40 C6,-56 0,-64 -12,-66 Z";
  return (
    shape(pool, "url(#capeIn)") +
    line("M-24,-56 C-28,-36 -29,-10 -26,14 M-18,-44 C-21,-24 -22,0 -19,22", "#4a0c0c", 0.9, 0.7) +
    line("M-24,34 L-20,30 L-17,38 L-12,32 L-8,40", "#140202", 1.1, 0.8)
  );
}

/** Cape slumped over the hip, hanging down the front of the waist to the floor (rig coordinates). */
export function capeFlap() {
  const d =
    "M-17,-38 C-19,-28 -18,-18 -15,-10 C-8,-6 4,-4 14,-3 C20,-2 25,0 29,-1 L26,-7 L31,-12 L27,-19 L31,-25 L26,-31 L29,-38 " +
    "C20,-42 8,-46 -3,-46 C-10,-46 -15,-43 -17,-38 Z";
  return (
    shape(d, "url(#cape)", 1) +
    shape("M26,-31 L31,-25 L27,-19 L31,-12 L26,-7 L29,-1 C27,-1 25,-2 24,-3 L25,-34 Z", "url(#capeIn)", 0.6) +
    // folds hang toward the floor
    line("M-6,-44 C4,-42 14,-38 26,-36 M-12,-30 C0,-30 12,-26 26,-22 M-12,-16 C0,-14 12,-12 25,-8", "#2a0606", 0.9, 0.7) +
    line("M-14,-36 C-2,-36 10,-33 24,-30 M-13,-22 C-1,-21 11,-18 24,-15", "#d04444", 0.55, 0.45) +
    line("M-17,-38 C-19,-28 -18,-18 -15,-10", "#e05050", 0.6, 0.5)
  );
}

export function fallenDamage() {
  return (
    `<ellipse cx="6" cy="-48" rx="7" ry="5" fill="url(#scorch)"/>` +
    `<ellipse cx="-11" cy="-30" rx="5" ry="3.4" fill="url(#scorch)"/>` +
    line("M2,-62 L5.2,-55.6 L3.6,-51.6 L8,-46 L7,-41.6", "#020306", 1, 0.95) +
    line("M5.2,-55.6 L10.6,-54 M3.6,-51.6 L-1.4,-49", "#020306", 0.7, 0.9) +
    line("M2.6,-61.4 L5.8,-55.8 L4.3,-51.8 L8.6,-46.2", "#9fb4c8", 0.35, 0.6) +
    line("M-10.6,-25.4 L-6.6,-24.4 L-4.6,-25.8", "#020306", 0.6, 0.85)
  );
}

/** Broken plating, bolts and floor cracks around the body (world coordinates). */
export function debris() {
  const shard = (x, y, rot, d, fill = "url(#steel)") =>
    `<g transform="translate(${x},${y}) rotate(${rot})">${shape(d, fill, 0.8)}${line("M-2,-1.2 L2.4,-1.6", "#eaf4ff", 0.4, 0.5)}</g>`;
  return (
    // cracks radiating from the impact under the shoulders
    line("M34,40 L46,44 L52,52 M46,44 L58,42 L70,46 M34,40 L28,50 L30,60 M40,42 L42,34 L50,30", "#020306", 0.9, 0.8) +
    line("M34.6,39.4 L46.4,43.4 L52.4,51.4 M46.4,43.4 L58.2,41.4", "#3a4656", 0.35, 0.6) +
    line("M-40,58 L-30,54 L-22,58 M-30,54 L-28,46", "#020306", 0.7, 0.7) +
    // shed armor fragments
    shard(62, 28, 24, "M-4,-3 L4.6,-2.4 L3,3 L-3.4,2.4 Z") +
    shard(-62, 50, -18, "M-5,-2 L3.6,-3.4 L5,1.6 L-2,3.4 Z", "url(#steelDk)") +
    shard(20, 66, 40, "M-3,-2.4 L3,-2 L2,2.6 L-2.6,2 Z") +
    shard(-80, 20, 70, "M-2.4,-2 L2.8,-1.6 L2,2.2 L-2,2 Z", "url(#steelDk)") +
    // a pauldron lame knocked loose
    `<g transform="translate(78,50) rotate(-14)">` +
    shape("M-8,-2.6 C-3,-4 3,-4 8,-2.6 L7.4,2.6 C3,1.4 -3,1.4 -7.4,2.6 Z", "url(#steel)", 0.9) +
    line("M-6.4,-1.8 C-2,-2.8 2,-2.8 6.2,-1.8", "#f4faff", 0.5, 0.6) +
    `</g>` +
    `<g fill="#1c2733" stroke="${INK}" stroke-width=".4"><circle cx="-50" cy="62" r="1"/><circle cx="56" cy="62" r=".9"/><circle cx="-88" cy="40" r=".8"/><circle cx="88" cy="30" r=".9"/></g>`
  );
}

/** Suit sparks and loose energy motes around the fallen agent (world coordinates). */
export const FALLEN_SPARKS =
  `<g filter="url(#glow)" fill="#00e5ff"><circle cx="-2" cy="12" r="2.2"/><circle cx="60" cy="30" r="1.8"/></g>` +
  line("M-4,8 L0,4 M-1,11 L5,9.6 M-3,14 L-5.6,18", "#bffcff", 0.5, 0.9) +
  line("M60,26 L63,22.4 M62,30 L66,31", "#bffcff", 0.45, 0.8) +
  `<g fill="#8af6ff"><circle cx="-18" cy="-6" r=".7"/><circle cx="24" cy="-10" r=".6"/><circle cx="40" cy="58" r=".7"/>` +
  `<circle cx="-44" cy="52" r=".6"/><circle cx="74" cy="4" r=".6"/></g>`;

function fallenModel() {
  const helm = helmet({ rot: 24, damaged: true });
  const headTf = `transform="translate(8,2)"`;
  const [upperArm, trappedArm] = [armoredArm(FALLEN.arms[0], -1, true), armoredArm(FALLEN.arms[1], 1, false)];
  const [upperLeg, lowerLeg] = [armoredLeg(FALLEN.legs[0], -1), armoredLeg(FALLEN.legs[1], 1)];
  const body =
    trappedArm.body +
    lowerLeg.body +
    upperLeg.body +
    torso() +
    fallenDamage() +
    pauldron(1, -4) +
    gorget() +
    `<g ${headTf}>${helm.body}</g>` +
    capeFlap() +
    upperArm.body +
    pauldron(-1, 14);
  const glow = lowerLeg.glow + upperLeg.glow + TORSO_GLOW + upperArm.glow;
  return {
    box: [-104, -30, 208, 106],
    defs: ARMOR_DEFS,
    layers: [
      { markup: `<ellipse cx="-4" cy="50" rx="96" ry="14" fill="url(#shade)"/>${debris()}` },
      {
        markup: `<g ${FALLEN_TF}>${fallenCape()}${body}</g>`,
        anim: { type: "breathe", amp: 0.01, speed: 1.1, pivot: [0, 40] },
      },
      { markup: `<g ${FALLEN_TF}>${glow}</g>`, anim: { type: "flicker", min: 0.15, max: 0.7, speed: 1.4 }, blend: "lighter" },
      { markup: `<g ${FALLEN_TF}><g ${headTf}>${helm.glow}</g></g>`, anim: { type: "flicker", min: 0.2, max: 0.65, speed: 2.2 }, blend: "lighter" },
      { markup: FALLEN_SPARKS, anim: { type: "flicker", min: 0, max: 1, speed: 3.1 }, blend: "lighter" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Bureau field cadet (unarmored)
// ---------------------------------------------------------------------------

const CADET_DEFS = `
<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".3">
  <stop offset="0" stop-color="#e8b891"/><stop offset=".42" stop-color="#c8956c"/>
  <stop offset=".8" stop-color="#94634a"/><stop offset="1" stop-color="#6a4332"/></linearGradient>
<linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#4a3b33"/><stop offset=".45" stop-color="#231b17"/>
  <stop offset="1" stop-color="#0c0908"/></linearGradient>
<linearGradient id="shirt" x1="0" y1="0" x2="1" y2=".3">
  <stop offset="0" stop-color="#6a7f96"/><stop offset=".35" stop-color="#48596e"/>
  <stop offset=".75" stop-color="#2c3848"/><stop offset="1" stop-color="#18202b"/></linearGradient>
<linearGradient id="pants" x1="0" y1="0" x2="1" y2=".2">
  <stop offset="0" stop-color="#34405a"/><stop offset=".5" stop-color="#1c2334"/>
  <stop offset="1" stop-color="#0b0e16"/></linearGradient>
<linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3a3a40"/><stop offset=".4" stop-color="#1a1a1f"/>
  <stop offset="1" stop-color="#08080a"/></linearGradient>
<linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fff8dc"/><stop offset=".45" stop-color="#c9b77a"/>
  <stop offset="1" stop-color="#6a5a30"/></linearGradient>
<linearGradient id="cup" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#f2ece2"/><stop offset=".5" stop-color="#cfc6b8"/>
  <stop offset="1" stop-color="#857c70"/></linearGradient>
<radialGradient id="shade"><stop offset="0" stop-color="#000" stop-opacity=".7"/>
  <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="sheen"><stop offset="0" stop-color="#fff" stop-opacity=".4"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.3"/></filter>
<filter id="steam" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation=".7"/></filter>`;

const SKIN_SHADOW = "#5a3526";
const cloth = (a, b, wa, wb, fill, bulge = 0.6, rim = 0.4) =>
  part(a, b, wa, wb, { fill, bulge, hi: 0.18, rim, ink: 1, hiColor: "#c9d6e4" });

/** Lit-edge highlight and rim for a segment that is already filled and inked. */
function edges(a, b, wa, wb, bulge, hi, rim) {
  const g = capsule(a, b, wa, wb, bulge);
  return (
    (hi ? `<path d="${g.hi}" fill="none" stroke="#c9d6e4" stroke-opacity="${hi}" stroke-width="${f(Math.max(0.5, wa * 0.08))}" stroke-linecap="round"/>` : "") +
    (rim ? `<path d="${g.rim}" fill="none" stroke="${RIM}" stroke-opacity="${rim}" stroke-width=".6" stroke-linecap="round"/>` : "")
  );
}

/**
 * Shirt-sleeved arm in one inked silhouette: deltoid cap and bicep on the upper arm,
 * forearm mass just below the elbow tapering to a buttoned cuff, a crease inside the
 * elbow and a soft contact shadow on the torso behind it.
 * @returns {{ body: string, sh: number[], el: number[], wr: number[] }}
 */
function clothArm(arm, s, { hi = 0.2, rim = 0.4, shadow = true } = {}) {
  const { sh, el, wr } = armJoints(arm, s);
  const up = heading(sh, el);
  const fo = heading(el, wr);
  const inner = -s;
  const foreMid = lerp(el, wr, 0.42);
  const d =
    seg(polar(sh, up, 2.4), lerp(sh, el, 0.62), 9.6, 9, 0.5) +
    seg(lerp(sh, el, 0.45), el, 9, 7.6, 0.3) +
    seg(el, foreMid, 8, 7.8, 0.4) +
    seg(foreMid, wr, 7.8, 6, 0.2);
  const crease =
    `M${pt(...polar(polar(el, up, -3.4), up + inner * 90, 3))}` +
    `Q${pt(...polar(el, (up + fo) / 2 + inner * 90, 2.2))} ${pt(...polar(polar(el, fo, 3), fo + inner * 90, 3.2))}`;
  const folds =
    `M${pt(...polar(polar(el, up, -6), up - inner * 90, 4.4))}Q${pt(...polar(polar(el, up, -4.6), up - inner * 90, 1.6))} ${pt(...polar(polar(el, up, -3), up + inner * 90, 1))}` +
    `M${pt(...polar(polar(el, fo, 4.6), fo - inner * 90, 3.6))}Q${pt(...polar(polar(el, fo, 4), fo, 0))} ${pt(...polar(polar(el, fo, 6.4), fo + inner * 90, 1.4))}`;
  const body =
    (shadow ? `<path d="${d}" fill="#000" opacity=".45" filter="url(#glow)" transform="translate(${f(inner * 1.6)},1.4)"/>` : "") +
    merged(d, "url(#shirt)", 1) +
    edges(polar(sh, up, 1), el, 10, 7.8, 0.8, hi, rim) +
    edges(el, wr, 8, 6, 0.6, hi * 0.8, rim) +
    line(crease, "#141b25", 0.6, 0.75) +
    line(folds, "#18202b", 0.45, 0.55) +
    // cuff
    `<g transform="translate(${pt(...wr)}) rotate(${f(angle(el, wr))})">` +
    shape("M-3.5,-2.6 L3.5,-2.6 L3.7,.4 L-3.7,.4 Z", "#34414f", 0.6) +
    `<circle cx="${f(inner * 2)}" cy="-1.1" r=".45" fill="#9aa8b8"/>` +
    `</g>`;
  return { body, sh, el, wr };
}

/** Tired adult male face, front view (head top -93.6, chin -71.2). */
function cadetHeadFront() {
  const face =
    "M-7.2,-84 C-7.4,-79 -6.8,-75.5 -5,-73.3 C-3.6,-71.8 -1.8,-71.2 0,-71.2 C1.8,-71.2 3.6,-71.8 5,-73.3 " +
    "C6.8,-75.5 7.4,-79 7.2,-84 C7,-89.5 4,-91.6 0,-91.6 C-4,-91.6 -7,-89.5 -7.2,-84 Z";
  const ear = "M-7,-83.6 C-8.9,-84.4 -9.6,-82 -9.2,-79.8 C-8.9,-78.2 -8,-77.4 -6.8,-77.8 Z";
  const eye = (s) => {
    const x = s * 3.1;
    const M = s > 0 ? mirror : (d) => d;
    return (
      `<ellipse cx="${x}" cy="-81.9" rx="2.9" ry="1.8" fill="${SKIN_SHADOW}" opacity=".3"/>` +
      `<path d="${M("M-4.7,-81.6 Q-3.1,-82.8 -1.5,-81.6 Q-3.1,-80.8 -4.7,-81.6 Z")}" fill="#dcd2c8"/>` +
      `<circle cx="${f(x + 0.1)}" cy="-81.6" r=".72" fill="#3c4a3c"/>` +
      `<circle cx="${f(x + 0.1)}" cy="-81.6" r=".34" fill="#050505"/>` +
      `<circle cx="${f(x - 0.2)}" cy="-81.9" r=".16" fill="#fff"/>` +
      // heavy lid over the top of the iris
      `<path d="${M("M-4.9,-81.7 Q-3.1,-83.3 -1.3,-81.8 Q-3.1,-82.2 -4.9,-81.7 Z")}" fill="#a8765a"/>` +
      line(M("M-4.9,-81.6 Q-3.1,-82.5 -1.3,-81.7"), "#241510", 0.45, 0.9) +
      line(M("M-4.4,-80.3 Q-3,-79.5 -1.7,-80.2"), "#6e4636", 0.35, 0.6) +
      line(M("M-5.7,-83.9 C-4.5,-84.8 -2.6,-84.9 -1.2,-84.2"), "#2a1f1a", 0.85)
    );
  };
  return (
    shape("M-3.9,-74.6 L3.9,-74.6 L4.5,-65.4 L-4.5,-65.4 Z", "url(#skin)", 1) +
    `<path d="M-4.1,-73.6 C-2,-70.6 2,-70.6 4.1,-73.6 L4.3,-69.4 C2,-68.4 -2,-68.4 -4.3,-69.4 Z" fill="${SKIN_SHADOW}" opacity=".5"/>` +
    shape(ear, "url(#skin)", 0.8) +
    shape(mirror(ear), "#a06e52", 0.8) +
    line("M-7.6,-82.6 C-8.6,-82 -8.6,-80 -7.6,-79.2", "#6a4332", 0.35, 0.8) +
    shape(face, "url(#skin)") +
    `<path d="M1.6,-91.2 C5,-90.6 7.2,-88.4 7.2,-84 C7.4,-79 6.8,-75.5 5,-73.3 C3.6,-71.8 2,-71.3 0.8,-71.2 C3.8,-74 5.2,-78 4.6,-84 C4.3,-87.6 3,-89.8 1.6,-91.2 Z" fill="${SKIN_SHADOW}" opacity=".3"/>` +
    `<ellipse cx="-3.2" cy="-87.4" rx="3.2" ry="2" fill="url(#sheen)"/>` +
    // stubble
    `<path d="M-6.4,-77 C-6,-73.5 -3.6,-71.4 0,-71.4 C3.6,-71.4 6,-73.5 6.4,-77 C4.6,-75 3,-75.3 1.8,-75.8 C1,-74.6 -1,-74.6 -1.8,-75.8 C-3,-75.3 -4.6,-75 -6.4,-77 Z" fill="#2e2a34" opacity=".26"/>` +
    eye(-1) +
    eye(1) +
    // nose
    line("M0.9,-82 C1.2,-80 1.6,-78.2 1.9,-77", "#7a4c38", 0.45, 0.55) +
    line("M-0.5,-80.6 L-0.4,-77.8", "#f4d0b0", 0.45, 0.55) +
    `<ellipse cx=".5" cy="-76.1" rx="1.9" ry=".55" fill="${SKIN_SHADOW}" opacity=".35"/>` +
    line("M-1.7,-76.7 C-1,-75.9 1,-75.9 1.7,-76.7", "#6a3e2c", 0.45, 0.85) +
    line("M-2.1,-76.4 C-2.9,-75.3 -3,-74.5 -2.9,-73.8 M2.1,-76.4 C2.9,-75.3 3,-74.5 2.9,-73.8", "#7a4c38", 0.35, 0.35) +
    // mouth, set flat
    `<path d="M-2.3,-73.6 C-1,-74.3 1,-74.3 2.3,-73.6 C1,-73.5 -1,-73.5 -2.3,-73.6 Z" fill="#8a5242"/>` +
    line("M-2.5,-73.5 C-1,-74.1 1,-74.1 2.5,-73.5", "#4a2a20", 0.5, 0.9) +
    line("M-1.2,-72.8 L1.2,-72.8", "#d09a80", 0.4, 0.45) +
    // hair: short, a little unkempt
    shape(
      "M-7.7,-83 C-8.4,-88.4 -6.6,-92.8 -1,-93.8 C3.8,-94.4 7.8,-92 8,-87.4 C8.1,-85.6 7.9,-84 7.4,-82.6 " +
        "C7,-85 6.2,-87.2 4.6,-88.4 C2,-87.4 -1.4,-88 -3.4,-89.4 C-4.6,-88.6 -5.8,-87.8 -6.4,-86.6 C-6.8,-85.6 -7,-84.4 -7.1,-82.8 Z",
      "url(#hair)",
      1,
    ) +
    line("M-6.4,-88 C-4.6,-91.6 -1,-93 2.6,-92.6 M-3.8,-89.4 C-2.4,-91.4 0.6,-92.2 3.6,-91.6", "#6e5a4e", 0.45, 0.6) +
    line("M4.6,-88.4 C5.8,-89.2 6.8,-90.6 7,-91.4 M1,-88.2 C2.6,-89.6 3.6,-90.8 3.8,-92", "#050404", 0.45, 0.6) +
    line("M7.9,-87.4 C8.1,-85.4 7.8,-83.6 7.4,-82.6 M7.3,-82 C7.4,-78.6 6.8,-75.8 5.3,-73.6", RIM, 0.4, 0.4)
  );
}

/** Frontal shoe at ankle a, toe splayed by s. */
function shoe([ax, ay], s) {
  const bx = ax + s * 1;
  return (
    shape(
      `M${f(ax - 4.2)},${f(ay)} L${f(ax + 4.2)},${f(ay)} L${f(ax + 4.6)},${f(ay + 2)} C${f(bx + 6)},${f(ay + 3)} ${f(bx + 6.2)},${f(ay + 6.2)} ${f(bx + 5.4)},58 ` +
        `L${f(bx - 5.4)},58 C${f(bx - 6.2)},${f(ay + 6.2)} ${f(bx - 6)},${f(ay + 3)} ${f(ax - 4.6)},${f(ay + 2)} Z`,
      "url(#leather)",
    ) +
    line(`M${f(bx - 3.4)},${f(ay + 3.4)} C${f(bx - 1)},${f(ay + 2.6)} ${f(bx + 1)},${f(ay + 2.6)} ${f(bx + 2.6)},${f(ay + 3.2)}`, "#9aa0aa", 0.5, 0.6) +
    shape(`M${f(bx - 5.5)},57 L${f(bx + 5.5)},57 L${f(bx + 5.4)},58 L${f(bx - 5.4)},58 Z`, "#050506", 0.4)
  );
}

/** Paper coffee cup with its lid and sleeve, centred at x, rim at y. */
function coffeeCup(x, y) {
  return (
    shape(`M${f(x - 3.8)},${f(y)} L${f(x + 3.8)},${f(y)} L${f(x + 2.9)},${f(y + 11.4)} L${f(x - 2.9)},${f(y + 11.4)} Z`, "url(#cup)", 0.8) +
    shape(`M${f(x - 3.6)},${f(y + 2.6)} L${f(x + 3.6)},${f(y + 2.6)} L${f(x + 3.2)},${f(y + 7)} L${f(x - 3.2)},${f(y + 7)} Z`, "#7a5436", 0.4) +
    line(`M${f(x - 2.8)},${f(y + 3.4)} L${f(x - 2.6)},${f(y + 6.2)}`, "#c09a74", 0.4, 0.6) +
    shape(`M${f(x - 4.4)},${f(y - 1.8)} L${f(x + 4.4)},${f(y - 1.8)} L${f(x + 4.1)},${f(y + 0.4)} L${f(x - 4.1)},${f(y + 0.4)} Z`, "#ece6dc", 0.7) +
    shape(`M${f(x - 2.4)},${f(y - 3)} L${f(x + 2.4)},${f(y - 3)} L${f(x + 2.8)},${f(y - 1.8)} L${f(x - 2.8)},${f(y - 1.8)} Z`, "#d8d0c4", 0.5)
  );
}

/** Fingers wrapped round the cup from the side (hand coming from above-left). */
function cupHand(x, y) {
  return (
    shape(`M${f(x - 5.4)},${f(y + 1)} C${f(x - 6.6)},${f(y + 3)} ${f(x - 6.4)},${f(y + 7)} ${f(x - 4.8)},${f(y + 9)} L${f(x - 2.8)},${f(y + 8.6)} L${f(x - 3)},${f(y + 1.2)} Z`, "url(#skin)", 0.8) +
    [2.6, 4.6, 6.6]
      .map((dy) => part([x - 3.4, y + dy], [x + 2.6, y + dy + 0.3], 2.1, 1.8, { fill: "url(#skin)", hi: 0.2, rim: 0, ink: 0.6, hiColor: "#f4d0b0" }))
      .join("") +
    shape(`M${f(x - 3.6)},${f(y + 0.2)} C${f(x - 1.6)},${f(y - 0.6)} ${f(x + 0.4)},${f(y)} ${f(x + 1)},${f(y + 1)} L${f(x - 3)},${f(y + 1.8)} Z`, "url(#skin)", 0.6)
  );
}

const steamWisps = (x, y) =>
  `<g filter="url(#steam)" fill="none" stroke="#e8eef4" stroke-linecap="round">` +
  `<path d="M${f(x - 1)},${f(y)} C${f(x - 3)},${f(y - 3)} ${f(x + 1.4)},${f(y - 5)} ${f(x - 0.6)},${f(y - 9)} C${f(x - 2)},${f(y - 11.6)} ${f(x + 0.8)},${f(y - 13)} ${f(x)},${f(y - 16)}" stroke-width=".9" stroke-opacity=".35"/>` +
  `<path d="M${f(x + 1.2)},${f(y - 1)} C${f(x + 3)},${f(y - 4)} ${f(x)},${f(y - 6)} ${f(x + 2)},${f(y - 10)}" stroke-width=".7" stroke-opacity=".25"/></g>`;

/** Cadet uniform shirt, tie and duty belt, front view. */
function cadetTorsoFront() {
  const shirt =
    "M-4.6,-67.6 L4.6,-67.6 C8,-66.4 12,-65.2 15.4,-63.2 C17.8,-61.8 18.4,-58 18,-54 C17.4,-48 15.4,-41 14.4,-34 " +
    "C14,-30 14.2,-26 14.4,-23 L-14.4,-23 C-14.2,-26 -14,-30 -14.4,-34 C-15.4,-41 -17.4,-48 -18,-54 " +
    "C-18.4,-58 -17.8,-61.8 -15.4,-63.2 C-12,-65.2 -8,-66.4 -4.6,-67.6 Z";
  const collar = "M-4.8,-68.2 L-0.8,-62.6 L-7.4,-63.4 L-7.6,-66.8 Z";
  const pocket = "M-12.4,-54.6 L-4.4,-54.6 L-4.6,-45 C-6.6,-44.4 -10.2,-44.4 -12.2,-45 Z";
  const flap = "M-12.8,-55.2 L-4,-55.2 L-4.2,-52.4 L-8.4,-51.4 L-12.6,-52.4 Z";
  const epaulette = "M5,-66.6 L15.8,-63.2 L15.2,-61.2 L4.8,-64.6 Z";
  return (
    shape(shirt, "url(#shirt)") +
    `<path d="M-2.8,-67.6 L2.8,-67.6 L0,-62.6 Z" fill="url(#skin)"/>` +
    shape(pocket, "#3e4d60", 0.5) +
    shape(mirror(pocket), "#2a3645", 0.5) +
    shape(flap, "#4a5b70", 0.5) +
    shape(mirror(flap), "#303d4e", 0.5) +
    // badge, name tape
    shape("M8.6,-62.6 L11.8,-61.4 C11.8,-58 10.8,-56 8.6,-54.6 C6.4,-56 5.4,-58 5.4,-61.4 Z", "url(#badge)", 0.5) +
    `<circle cx="8.6" cy="-58.8" r="1.2" fill="#8a7a48" stroke="#4a3f20" stroke-width=".25"/>` +
    `<rect x="-12.2" y="-58.8" width="7.4" height="1.9" rx=".3" fill="#1a2230" stroke="#9aa8b8" stroke-width=".25"/>` +
    line("M-11.2,-57.8 L-6,-57.8", "#9aa8b8", 0.4, 0.6) +
    shape(epaulette, "#232d3b", 0.5) +
    shape(mirror(epaulette), "#2e3a4b", 0.5) +
    // folds
    line("M-15.4,-46 C-12,-42 -10.8,-37 -11.6,-30 M15.6,-46 C12.4,-42 11,-37 11.8,-30", "#18202b", 0.6, 0.55) +
    line("M-9,-25.4 L-7.6,-28.6 M-4,-24.8 L-3.4,-28 M6,-24.8 L5.2,-28.4 M10.4,-25.2 L9,-28.6", "#18202b", 0.5, 0.6) +
    line("M-14.6,-44 C-13.4,-40 -12.4,-36 -12.8,-32", "#8a9db2", 0.45, 0.4) +
    line("M17.2,-56 C16.8,-50 15.6,-43 14.8,-36", RIM, 0.55, 0.5) +
    // loosened tie
    shape("M-1.3,-64.6 L1.5,-64.6 L1.9,-61.6 L3,-39.6 L0.9,-36.6 L-1.2,-39.6 L-1.1,-61.6 Z", "#141a25", 0.7) +
    shape("M-1.8,-65.8 L2,-65.8 L1.6,-62.4 L-1.4,-62.4 Z", "#1e2634", 0.6) +
    line("M-0.4,-61 L0.9,-40", "#3c4a60", 0.35, 0.6) +
    shape(collar, "#5a6d83", 0.7) +
    shape(mirror(collar), "#34414f", 0.7) +
    // duty belt
    shape("M-14.8,-24.2 L14.8,-24.2 L15.2,-19.4 L-15.2,-19.4 Z", "url(#leather)") +
    `<rect x="-2.4" y="-23.8" width="4.8" height="4" rx=".4" fill="none" stroke="#b8bec8" stroke-width=".7"/>` +
    shape("M9.6,-25.6 L14.6,-25.6 L14.4,-16.8 L9.8,-16.8 Z", "url(#leather)", 0.7) +
    `<rect x="11" y="-27.6" width="1.2" height="2.4" fill="#1a1a1f" stroke="${INK}" stroke-width=".3"/>` +
    shape("M-13.8,-25 L-9.8,-25 L-9.8,-19.6 L-13.8,-19.6 Z", "url(#leather)", 0.6)
  );
}

function cadetFront() {
  // coffee held at belt height, elbow by the ribs; the other hand hooked in a pocket
  const cupX = -10.4;
  const cupY = -25.4;
  const coffee = clothArm({ sh: [-16.4, -61], el: [-22.6, -34], wr: [cupX - 5.2, cupY + 2.4] }, -1, { hi: 0.22, rim: 0.3 });
  const pocket = clothArm({ sh: [16.4, -61], el: [22.8, -33.6], wr: [15.4, -20.8] }, 1, { hi: 0.15, rim: 0.55 });
  const legs =
    shape("M-15.2,-20 L15.2,-20 L15.8,-11 C10,-9.2 4,-8.4 0,-7.6 C-4,-8.4 -10,-9.2 -15.8,-11 Z", "url(#pants)") +
    cloth([-8.4, -15], [-9.6, 19], 14, 10.6, "url(#pants)", 0.6, 0.3) +
    cloth([8.4, -15], [9.6, 19], 14, 10.6, "url(#pants)", 0.6, 0.45) +
    cloth([-9.6, 19], [-11, 51.4], 10.6, 9.2, "url(#pants)", 0.3, 0.3) +
    cloth([9.6, 19], [11, 51.4], 10.6, 9.2, "url(#pants)", 0.3, 0.45) +
    line("M-9,-12 L-10.2,50 M9,-12 L10.4,50", "#0a0d14", 0.4, 0.45) +
    line("M-4,20 C-2,24 -1.6,30 -2.6,40", "#0a0d14", 0.4, 0.4) +
    shoe([-11, 51.6], -1) +
    shoe([11, 51.6], 1);
  const arms =
    pocket.body +
    // hand in pocket: thumb hooked over the edge, the pocket mouth hides the fingers
    shape("M12.6,-22 C14.8,-23.2 17.8,-22.4 18.6,-20.4 L16.8,-15.6 C15,-14.8 12.8,-15 11.6,-16.2 Z", "url(#skin)", 0.8) +
    `<path d="M16.8,-21.6 C17.8,-20.6 17.8,-18.6 16.8,-16" fill="none" stroke="${SKIN_SHADOW}" stroke-width="1.2" opacity=".35"/>` +
    shape("M11.2,-17.4 C13.6,-16.4 16,-15.6 18.4,-15.4 L17.6,-12.2 C15.2,-12.6 12.6,-13.4 10.4,-14.6 Z", "#1c2334", 0.6) +
    line("M11.2,-17.2 C13.6,-16.2 16,-15.4 18.4,-15.2", "#4a5670", 0.4, 0.7) +
    shape("M13,-20.4 C11.6,-20 10.6,-18.6 10.4,-16.6 C10.4,-15.6 11.2,-15.2 11.8,-15.8 C12.2,-17 12.8,-18 13.8,-18.6 Z", "url(#skin)", 0.7) +
    coffee.body +
    // Bureau shoulder patches
    `<circle cx="-19" cy="-55" r="2.5" fill="#101826" stroke="#0a8aa0" stroke-width=".6"/>` +
    `<circle cx="19.2" cy="-55" r="2.5" fill="#101826" stroke="#0a7688" stroke-width=".6"/>` +
    line("M-20,-56.2 L-18,-56.2 L-20,-53.8 L-18,-53.8 Z", "#5ad8ea", 0.35, 0.9) +
    // coffee hand
    coffeeCup(cupX, cupY) +
    cupHand(cupX, cupY - 0.4);
  return { body: legs + cadetTorsoFront() + arms + cadetHeadFront(), steam: steamWisps(cupX, cupY - 2) };
}

// ---------------------------------------------------------------------------
// Front desk scene
// ---------------------------------------------------------------------------

/** Coffee cup rim position for the desk cadet, in his own frame. */
const DESK_CUP = [-1.6, -27.6];

/** Cadet in three-quarter view facing right, badging a card with his left hand. */
function cadetSide() {
  const face =
    "M-5.8,-86 C-6.6,-81 -6,-76 -3.6,-73.2 C-1.8,-71.4 0.8,-70.8 3,-71.2 C4.6,-71.6 5.6,-72.6 6,-73.8 L6.3,-75.6 " +
    "C6.6,-76.1 7.4,-76.4 7.6,-77 L7.4,-77.9 C8.2,-78.6 8.9,-79.2 8.7,-79.9 C8.4,-81 7.8,-81.8 7.6,-82.6 " +
    "C7.8,-84.6 8,-87 7.2,-89.2 C5.6,-91.8 2.4,-92.6 -0.6,-92 C-3.8,-91.2 -5.4,-89 -5.8,-86 Z";
  // far arm: elbow dropped behind the chest, forearm reaching out to the scanner
  const far = clothArm({ sh: [9.6, -61], el: [13.2, -37.2], wr: [30.2, -43.2] }, 1, { hi: 0.12, rim: 0.5, shadow: false });
  const farArm =
    far.body +
    // card hand: fingers under the card, thumb pinching it from above
    shape("M31.8,-42 C34.2,-42.8 37.2,-42 37.8,-40.4 C38,-39.2 37,-38.4 35.6,-38.6 C34,-38.8 32.6,-39.2 31.6,-39.6 Z", "url(#skin)", 0.7) +
    line("M33.8,-42.2 C35.4,-41.8 36.4,-41 36.8,-39.8", "#6a4332", 0.35, 0.6) +
    `<g transform="translate(35.4,-42.6) rotate(-14)">` +
    shape("M-2.4,-3.8 L3.4,-3.8 L3.4,4 L-2.4,4 Z", "#e8eef4", 0.6) +
    `<rect x="-1.6" y="-2.8" width="2.4" height="2.6" fill="#7a8898"/>` +
    `<rect x="-1.6" y="0.6" width="4.2" height=".7" fill="#0066aa"/>` +
    `<rect x="-1.6" y="2" width="3.2" height=".5" fill="#9aa8b8"/>` +
    `</g>` +
    shape("M29.4,-45.8 C31.4,-47.2 34,-46.8 34.8,-45.2 C35.2,-43.8 34.6,-41.8 33,-40.8 C31.2,-40 29.8,-40.8 29.4,-42.4 Z", "url(#skin)", 0.8) +
    shape("M33.2,-46.2 C34.8,-47.4 36.8,-47 37.2,-45.8 C37.4,-45 36.6,-44.6 35.8,-44.8 C35,-45 34,-44.8 33.2,-44.4 Z", "url(#skin)", 0.6) +
    line("M30.4,-45.6 C31.8,-46.4 33.4,-46.2 34.2,-45.4", "#f4d0b0", 0.4, 0.55);
  const torsoPath =
    "M-8,-67 C-12,-65.6 -14.6,-63.4 -15,-60 C-15.6,-54 -14.6,-46 -13.2,-38 C-12.6,-32 -12.4,-27 -12.2,-23 " +
    "L12.4,-23 C12.6,-28 13,-33 13.8,-38 C14.8,-44 15.6,-50 14.6,-55 C13.8,-59.6 11.6,-62.6 8.4,-64.4 C5.6,-66 3,-67 1,-67.6 Z";
  const legs =
    cloth([5.4, -16], [7.4, 19], 12, 10, "url(#pants)", 0.6, 0.5) +
    cloth([7.4, 19], [8.4, 51.4], 10, 8.6, "url(#pants)", 0.3, 0.5) +
    shoeSide([8.4, 51.6], true) +
    shape("M-12.4,-24 L12.6,-24 L13,-13 C8,-11 2,-10 -3,-10.5 C-7,-11 -10,-12 -12.8,-13 Z", "url(#pants)") +
    cloth([-5, -16], [-4.4, 19], 13, 10.4, "url(#pants)", 0.6, 0.3) +
    cloth([-4.4, 19], [-5.4, 51.4], 10.4, 8.8, "url(#pants)", 0.3, 0.3) +
    line("M-3.6,-10 L-4.6,50", "#0a0d14", 0.4, 0.45) +
    shoeSide([-5.4, 51.6], false);
  const torso =
    shape(torsoPath, "url(#shirt)") +
    `<path d="M1.6,-67.4 L6.8,-67.4 L4,-62.4 Z" fill="url(#skin)"/>` +
    shape("M5.4,-54 L12.4,-54.6 L12.2,-45.2 C10.4,-44.4 7.4,-44.4 5.8,-45 Z", "#2a3645", 0.5) +
    shape("M9.6,-62.2 L12.2,-61 C12.2,-58 11.4,-56.4 9.8,-55.2 C8,-56.4 7.2,-58 7.2,-61 Z", "url(#badge)", 0.5) +
    shape("M3,-64.2 L5.4,-64.2 L6,-61.4 L7.4,-40 L5.4,-37 L3.6,-40 L3.4,-61.4 Z", "#141a25", 0.7) +
    shape("M1,-68 L4.4,-62.4 L-2,-63.8 L-2.4,-66.8 Z", "#5a6d83", 0.7) +
    shape("M7.6,-67.4 L4.8,-62.4 L9.6,-63.2 L9.4,-66.2 Z", "#34414f", 0.7) +
    shape("M-8.4,-66.6 L-15,-61.6 L-14.2,-59.8 L-7.6,-64.6 Z", "#232d3b", 0.5) +
    line("M-14.4,-50 C-12.6,-44 -11.8,-38 -12,-30", "#8a9db2", 0.45, 0.4) +
    line("M14.8,-54 C14.6,-48 13.6,-42 13,-36", RIM, 0.55, 0.45) +
    line("M-6,-25 L-5,-28.4 M4,-24.8 L3.4,-28.2 M9,-25 L8,-28.4", "#18202b", 0.5, 0.6) +
    shape("M-12.6,-24.2 L12.8,-24.2 L13,-19.4 L-12.8,-19.4 Z", "url(#leather)") +
    `<rect x="2.6" y="-23.8" width="4.4" height="4" rx=".4" fill="none" stroke="#b8bec8" stroke-width=".7"/>` +
    shape("M-13,-25 L-8.4,-25 L-8.6,-16.4 L-12.8,-16.4 Z", "url(#leather)", 0.7);
  // near arm: coffee held at belt height, forearm angled toward the counter
  const near = clothArm({ sh: [-10.6, -61.4], el: [-14.6, -34.4], wr: [DESK_CUP[0] - 5.2, DESK_CUP[1] + 2.4] }, -1, { hi: 0.22, rim: 0.3 });
  const nearArm =
    near.body +
    `<circle cx="-12.8" cy="-55.4" r="2.5" fill="#101826" stroke="#0a8aa0" stroke-width=".6"/>` +
    coffeeCup(...DESK_CUP) +
    cupHand(DESK_CUP[0], DESK_CUP[1] - 0.4);
  const head =
    shape("M-2.6,-74.8 L4.2,-74.8 L4.6,-65.4 L-3.6,-65.4 Z", "url(#skin)", 1) +
    `<path d="M-2.4,-73 C0,-70.6 3,-70.6 4.4,-72 L4.5,-68.6 C2,-67.6 -1,-67.8 -2.8,-69 Z" fill="${SKIN_SHADOW}" opacity=".5"/>` +
    shape(face, "url(#skin)") +
    `<path d="M-5.8,-86 C-6.6,-81 -6,-76 -3.6,-73.2 C-1.8,-71.4 0.8,-70.8 3,-71.2 C0,-73 -2.6,-76 -3,-80 C-3.4,-84 -2.6,-88 -0.6,-92 C-3.8,-91.2 -5.4,-89 -5.8,-86 Z" fill="${SKIN_SHADOW}" opacity=".32"/>` +
    // ear
    shape("M-1.6,-83.6 C-3.8,-84.6 -5,-82.4 -4.8,-80.4 C-4.6,-78.6 -3.4,-77.8 -2,-78.2 Z", "#b07a5a", 0.7) +
    line("M-2.4,-82.6 C-3.6,-82.2 -3.8,-80.6 -2.8,-79.6", "#6a4332", 0.35, 0.8) +
    // stubble along the jaw
    `<path d="M-3.4,-77 C-2,-73.6 0.6,-71.6 3,-71.4 C4.6,-71.6 5.6,-72.6 6,-73.8 L6.3,-75.6 C4.8,-75.2 3,-75.4 1.6,-76.2 C0,-76.4 -2,-76.6 -3.4,-77 Z" fill="#2e2a34" opacity=".26"/>` +
    // eye, brow, nose, mouth — all turned toward the desk
    `<path d="M3.2,-81.8 Q4.6,-82.8 6,-81.9 Q4.6,-81.1 3.2,-81.8 Z" fill="#dcd2c8"/>` +
    `<circle cx="5.2" cy="-81.8" r=".62" fill="#3c4a3c"/><circle cx="5.3" cy="-81.8" r=".3" fill="#050505"/>` +
    `<path d="M3,-81.9 Q4.6,-83.3 6.1,-82 Q4.6,-82.4 3,-81.9 Z" fill="#a8765a"/>` +
    line("M3,-81.8 Q4.6,-82.7 6.1,-81.9", "#241510", 0.45, 0.9) +
    line("M3.4,-80.4 Q4.6,-79.7 5.8,-80.3", "#6e4636", 0.35, 0.6) +
    line("M2.2,-84 C3.8,-84.9 5.8,-85 7.4,-84.3", "#2a1f1a", 0.85) +
    line("M7.6,-82.4 C8.1,-81.2 8.6,-80.4 8.6,-79.8 C8.2,-79 7.6,-78.6 7.2,-78.4", "#7a4c38", 0.45, 0.7) +
    line("M5.6,-78.8 C6.2,-78.2 6.8,-78.2 7.2,-78.4", "#6a3e2c", 0.4, 0.7) +
    line("M4.4,-75.6 C5.4,-75.9 6.4,-75.9 7.2,-76.2", "#4a2a20", 0.5, 0.9) +
    line("M5,-74.6 C5.8,-74.6 6.2,-74.8 6.6,-75.1", "#d09a80", 0.4, 0.5) +
    `<ellipse cx="3" cy="-87.6" rx="2.8" ry="1.6" fill="url(#sheen)"/>` +
    // hair
    shape(
      "M-6.8,-85.6 C-7.6,-90.8 -3.8,-94.2 1,-94 C5.6,-93.8 8.4,-90.8 8.2,-86.8 C7.4,-87.8 6.4,-88.4 5.2,-88.6 " +
        "C3,-88.2 0.6,-88.8 -1.2,-89.2 C-1.6,-87 -2,-85.4 -2.4,-84 C-3.2,-83.4 -3.8,-82.8 -4.2,-81.4 C-5.2,-80.6 -6.4,-81 -6.8,-82.6 Z",
      "url(#hair)",
      1,
    ) +
    line("M-5.6,-88 C-3.6,-91.8 0,-93 4,-92.4 M-2.6,-89.6 C-0.6,-91.4 2.4,-91.8 5.6,-90.8", "#6e5a4e", 0.45, 0.6) +
    line("M8,-87 C8.2,-85.4 7.9,-83.8 7.6,-82.8", RIM, 0.45, 0.5);
  return farArm + legs + torso + nearArm + head;
}

/** Shoe seen three-quarter, toe pointing right. */
function shoeSide([ax, ay], far) {
  return shape(
    `M${f(ax - 3.8)},${f(ay)} L${f(ax + 3.8)},${f(ay)} C${f(ax + 6)},${f(ay + 1)} ${f(ax + 9)},${f(ay + 3)} ${f(ax + 10.6)},${f(ay + 4.6)} ` +
      `C${f(ax + 11.4)},${f(ay + 5.6)} ${f(ax + 11)},58 ${f(ax + 9.8)},58 L${f(ax - 4.2)},58 C${f(ax - 4.8)},${f(ay + 4.4)} ${f(ax - 4.6)},${f(ay + 2)} ${f(ax - 3.8)},${f(ay)} Z`,
    far ? "#121216" : "url(#leather)",
  ) + line(`M${f(ax + 1)},${f(ay + 1.6)} C${f(ax + 4)},${f(ay + 2)} ${f(ax + 7)},${f(ay + 3.4)} ${f(ax + 9.4)},${f(ay + 4.8)}`, "#9aa0aa", 0.45, far ? 0.25 : 0.55);
}

const DESK_DEFS = `
<linearGradient id="counter" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#3a4452"/><stop offset=".45" stop-color="#232a35"/>
  <stop offset="1" stop-color="#11151c"/></linearGradient>
<linearGradient id="counterTop" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#8a98a8"/><stop offset=".5" stop-color="#56616e"/>
  <stop offset="1" stop-color="#2c333d"/></linearGradient>
<linearGradient id="blouse" x1="0" y1="0" x2="1" y2=".3">
  <stop offset="0" stop-color="#4aa6a2"/><stop offset=".45" stop-color="#2a7a7a"/>
  <stop offset="1" stop-color="#123c40"/></linearGradient>
<linearGradient id="skinF" x1="0" y1="0" x2="1" y2=".3">
  <stop offset="0" stop-color="#f0c4a0"/><stop offset=".5" stop-color="#dba882"/>
  <stop offset="1" stop-color="#9a6c50"/></linearGradient>
<linearGradient id="hairF" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#6a3a22"/><stop offset=".5" stop-color="#3a1c10"/>
  <stop offset="1" stop-color="#160904"/></linearGradient>
<linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#5ab4ff"/><stop offset=".5" stop-color="#2a6ad0"/>
  <stop offset="1" stop-color="#14306a"/></linearGradient>
<radialGradient id="screenLight"><stop offset="0" stop-color="#7ac8ff" stop-opacity=".4"/>
  <stop offset="1" stop-color="#7ac8ff" stop-opacity="0"/></radialGradient>`;

/** Receptionist seated behind the counter, eyes on her monitor (world coordinates). */
function receptionist() {
  const face =
    "M4,-7 C1,-9.6 -4.6,-9.4 -6.6,-6 C-7.4,-4.4 -7.4,-2.6 -7.2,-1.6 C-8.2,-0.6 -8.6,0.2 -8.4,0.8 C-8,1.2 -7.4,1.4 -7.2,1.8 " +
    "L-7.2,2.8 C-7.6,3.4 -7.4,4 -6.8,4.3 C-6.6,5 -6.8,5.8 -6.2,6.8 C-5,8.6 -2,9.4 0.4,8.6 C3,7.6 4.6,5 5,1 C5.4,-2 5.2,-5 4,-7 Z";
  return (
    // chair back
    shape("M72,-56 C78,-58 86,-57 88,-52 L87,-28 L72,-28 Z", "#15181e") +
    line("M74,-54 C79,-55.6 84,-55 86,-52", "#3a404a", 0.5, 0.7) +
    // torso
    shape("M52,-40 C55,-44.4 60,-46 66,-46 C72,-46 77,-44 80,-40 C82,-36 83,-31 83,-26 L50,-26 C50,-31 50.4,-36 52,-40 Z", "url(#blouse)") +
    line("M60,-45.6 C62,-42 66,-41 70,-44.6", "#123c40", 0.5, 0.8) +
    line("M60.6,-44.6 C62.6,-41.2 66.6,-40.6 69.8,-43.8", "#d8b060", 0.4, 0.9) +
    `<circle cx="64.6" cy="-41.4" r=".6" fill="#f0d080"/>` +
    line("M79.4,-39 C81,-35 82,-31 82.2,-27", RIM, 0.5, 0.35) +
    // neck
    shape("M61,-50 L67.6,-50 L68.4,-44.4 C66,-43.4 62.6,-43.4 60.6,-44.6 Z", "url(#skinF)", 0.8) +
    // head, bowed toward the screen
    `<g transform="translate(64.6,-57.4) rotate(-12)">` +
    shape("M-1,-9.6 C4,-11.6 9.4,-9.6 10.2,-3.6 C10.8,1.4 8.6,6 5,8.4 L1,6 Z", "url(#hairF)") +
    `<circle cx="8.8" cy="-8.2" r="4.4" fill="url(#hairF)" stroke="${INK}" stroke-width="1"/>` +
    line("M6.4,-10.4 C8.6,-11.4 11,-10.4 12,-8.4", "#9a5a36", 0.45, 0.7) +
    shape(face, "url(#skinF)") +
    `<path d="M4,-7 C5.2,-5 5.4,-2 5,1 C4.6,5 3,7.6 0.4,8.6 C2,5 2.4,0 1.6,-4 Z" fill="#6a4030" opacity=".35"/>` +
    `<ellipse cx="-5" cy="-2" rx="3" ry="3.6" fill="url(#screenLight)"/>` +
    // downcast eye: lid, lashes
    line("M-5.6,-1.4 Q-4.2,-0.2 -2.6,-1", "#1a0e08", 0.55, 0.95) +
    line("M-5.2,-0.8 L-5.8,0.2 M-4.4,-0.5 L-4.8,0.6 M-3.5,-0.5 L-3.7,0.5", "#1a0e08", 0.3, 0.8) +
    line("M-6.2,-3.8 Q-4.6,-4.8 -2.6,-4.2", "#3a1c10", 0.6, 0.9) +
    line("M-7.8,0 C-7.4,0.8 -7,1.2 -6.8,1.6", "#9a6c50", 0.4, 0.6) +
    `<path d="M-7.3,3.1 C-6.6,2.8 -5.8,3.1 -5.4,3.5 C-6,4.3 -6.8,4.6 -7.1,4.2 Z" fill="#b85a5a"/>` +
    // hair sweep over the ear, earring
    shape("M-1,-9.6 C-4.6,-9.4 -6.8,-7.4 -7,-5.4 C-4,-7 -1,-6.6 1.4,-5 C2.4,-2 2.2,2 1,6 C3,5 4.6,1 4.4,-3.6 C4.2,-6.8 2.6,-9 -1,-9.6 Z", "url(#hairF)", 0.8) +
    line("M-5,-7.4 C-2.6,-8.4 0.6,-8 2.8,-6", "#9a5a36", 0.4, 0.7) +
    `<circle cx="2.4" cy="5" r=".8" fill="#f0d080" stroke="${INK}" stroke-width=".3"/>` +
    `</g>` +
    // forearm reaching for the keyboard
    part([56, -38], [44, -30.6], 6.4, 5, { fill: "url(#blouse)", bulge: 0.6, hi: 0.2, rim: 0, ink: 1 })
  );
}

function monitor() {
  return (
    shape("M31,-33.6 L41,-33.6 L40,-35.4 L32,-35.4 Z", "#1a1d22", 0.6) +
    shape("M34.6,-35.4 L37.4,-35.4 L37,-41 L35,-41 Z", "#2a2e36", 0.6) +
    shape("M22,-63 L26.4,-61.6 L26.4,-39 L22,-40.4 Z", "#0c0e12", 0.9) +
    shape("M26.4,-61.6 L46,-58.6 L46,-38.6 L26.4,-39 Z", "#15181e") +
    shape("M27.6,-60.2 L44.8,-57.6 L44.8,-39.8 L27.6,-40.2 Z", "url(#screen)", 0.4) +
    line("M29.6,-56.6 L38,-55.4 M29.6,-53.6 L42.6,-51.6 M29.6,-50.4 L40,-49 M29.6,-46.6 L36.4,-45.8", "#d8ecff", 0.6, 0.5) +
    line("M26.6,-61.4 L46,-58.4", "#6a7888", 0.4, 0.6)
  );
}

function counter() {
  const emblem =
    `<circle cx="42" cy="12" r="10" fill="none" stroke="#0a7688" stroke-width="1.1" stroke-opacity=".6"/>` +
    `<circle cx="42" cy="12" r="7.2" fill="none" stroke="#0a7688" stroke-width=".5" stroke-opacity=".5"/>` +
    `<path d="M38.4,6.6 L45.6,6.6 L42,12 Z M38.4,17.4 L45.6,17.4 L42,12 Z" fill="#0a7688" fill-opacity=".55"/>`;
  return (
    `<ellipse cx="42" cy="58.6" rx="76" ry="3.4" fill="url(#shade)"/>` +
    // counter body and end
    shape("M-26,-30 L-22,-34 L-22,55 L-26,58.4 Z", "#3c4654") +
    shape("M-26,-30 L108,-30 L108,58.4 L-26,58.4 Z", "url(#counter)") +
    line("M8,-26 L8,56 M76,-26 L76,56", "#0a0d12", 0.6, 0.8) +
    line("M8.6,-26 L8.6,56 M76.6,-26 L76.6,56", "#4a5664", 0.35, 0.5) +
    shape("M-26,46 L108,46 L108,58.4 L-26,58.4 Z", "#0c0f14", 0.8) +
    emblem +
    // top slab
    shape("M-27.6,-30 L-23.4,-35.2 L108,-35.2 L108,-30 Z", "url(#counterTop)") +
    shape("M-27.6,-30 L108,-30 L108,-27.6 L-27.6,-27.6 Z", "#1c222b", 0.8) +
    line("M-26.8,-30.6 L107,-30.6", "#d8e4f0", 0.5, 0.5) +
    // light strip under the slab edge
    `<rect x="-25" y="-26.8" width="132" height="1" fill="#0a7688"/>` +
    // paperwork and a mug on the receptionist's side
    shape("M58,-35.2 L74,-35.2 L75.4,-36.8 L59.6,-36.8 Z", "#d8dde4", 0.6) +
    line("M59,-35.9 L74.6,-35.9", "#8a96a4", 0.35, 0.8) +
    shape("M86,-35.2 L92,-35.2 L92.4,-42 L85.6,-42 Z", "#2a6a6e", 0.8) +
    line("M86.6,-41 L87,-36", "#7ac0c0", 0.4, 0.6) +
    line("M92.4,-40.4 C95,-40.4 95,-36.8 92.2,-36.8", INK, 0.8) +
    // badge scanner
    shape("M-19.6,-35.2 L-7.4,-35.2 L-8.4,-38.6 L-18.2,-38.6 Z", "#1a1f27", 0.8) +
    shape("M-17,-38.2 L-9.6,-38.2 L-10,-37 L-16.6,-37 Z", "#0a8a74", 0.4)
  );
}

function deskModel() {
  return {
    box: [-104, -100, 214, 164],
    defs: CADET_DEFS + DESK_DEFS,
    layers: [
      { markup: receptionist() + monitor(), anim: { type: "breathe", amp: 0.004, speed: 1.3, pivot: [66, -26] } },
      {
        markup:
          `<path d="M27.6,-60.2 L44.8,-57.6 L44.8,-39.8 L27.6,-40.2 Z" fill="#3a8aff" filter="url(#glow)" opacity=".6"/>` +
          `<ellipse cx="48" cy="-52" rx="16" ry="12" fill="url(#screenLight)"/>`,
        anim: { type: "flicker", min: 0.55, max: 1, speed: 1.1 },
        blend: "lighter",
      },
      { markup: counter() },
      {
        markup:
          `<g filter="url(#glow)" fill="#00e5ff"><rect x="-25" y="-27" width="132" height="1.4"/></g>` +
          `<g filter="url(#glow)" fill="#1affc0"><path d="M-17,-38.2 L-9.6,-38.2 L-10,-37 L-16.6,-37 Z"/></g>`,
        anim: { type: "pulse", min: 0.55, max: 1, speed: 2.6 },
        blend: "lighter",
      },
      {
        markup: `<ellipse cx="-50" cy="58.6" rx="22" ry="3.6" fill="url(#shade)"/><g transform="translate(-50,0)">${cadetSide()}</g>`,
        anim: { type: "breathe", amp: 0.006, speed: 1.4, pivot: [-50, 58] },
      },
      { markup: steamWisps(DESK_CUP[0] - 50, DESK_CUP[1] - 2), anim: { type: "float", amp: 1.2, speed: 1.3 } },
    ],
  };
}

const cadet = cadetFront();

export const MODELS = {
  /** Armored temporal agent (Temporal Combat Armor, Alpha Prototype) in a heroic stance. */
  hero: standingModel({ armed: false }),

  /** The armored agent at low ready with a chrono rifle, energy cell and emitters lit. */
  hero_armed: standingModel({ armed: true }),

  /** The player before the armor: a tired Bureau field cadet with a bad coffee. */
  hero_human: {
    box: [-36, -100, 72, 164],
    defs: CADET_DEFS,
    anim: { type: "breathe", amp: 0.006, speed: 1.3, pivot: [0, 58] },
    layers: [
      { markup: `<ellipse cx="0" cy="58.6" rx="24" ry="3.8" fill="url(#shade)"/>${cadet.body}` },
      { markup: cadet.steam, anim: { type: "float", amp: 1.2, speed: 1.3 } },
    ],
  },

  /** Badging in at the Chronos Station front desk; the receptionist never looks up. */
  hero_at_desk: deskModel(),

  /** The armored agent down on the floor: cape splayed, armor cracked, visor failing. */
  hero_fallen: fallenModel(),
};
