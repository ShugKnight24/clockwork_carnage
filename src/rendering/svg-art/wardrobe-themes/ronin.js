/**
 * Wardrobe theme "ronin" (Ronin): the art for src/data/wardrobe-themes/ronin.js,
 * by id. See ./index.js for what each painter is given and returns.
 *
 * Samurai armour recast in chrono-steel, worn over the suit: rows of small
 * plates laced together with palette-coloured cord.
 */
import { INK, RIM, f, pt, lerp, mirror, shape, line, energy, armJoints } from "../models/hero.js";
import { STEEL, STEEL_DK, plateAt, lineAt, S } from "../frame-kit.js";

/** Bone-white cross-knots (hishinui) on the bottom row of each laced panel. */
const KNOT = "#e6dcc2";

/**
 * One laced row: a plate band between two edges (each [x, y] left → right),
 * the plate's top lip showing steel with rivets and the lower part covered
 * in vertical lacing.
 */
function row(tl, tr, br, bl, lace, { fill = STEEL, cords = 4.2, knots = false, lit = 0.5 } = {}) {
  const d = `M${pt(...tl)} L${pt(...tr)} L${pt(...br)} L${pt(...bl)} Z`;
  const n = Math.max(2, Math.round(Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) / cords));
  let cord = "";
  let rivets = "";
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const top = lerp(lerp(tl, bl, 0.42), lerp(tr, br, 0.42), t);
    const bot = lerp(lerp(tl, bl, 0.94), lerp(tr, br, 0.94), t);
    cord += `M${pt(...top)} L${pt(...bot)} `;
    if (i % 2 === 0) {
      const r = lerp(lerp(tl, bl, 0.2), lerp(tr, br, 0.2), t);
      rivets += `<circle cx="${f(r[0])}" cy="${f(r[1])}" r=".42"/>`;
    }
  }
  let x = "";
  if (knots) {
    for (let i = 1; i < n; i += 4) {
      const t = i / n;
      const c0 = lerp(lerp(tl, bl, 0.5), lerp(tr, br, 0.5), t - 0.6 / n);
      const c1 = lerp(lerp(tl, bl, 0.88), lerp(tr, br, 0.88), t + 0.6 / n);
      const c2 = lerp(lerp(tl, bl, 0.5), lerp(tr, br, 0.5), t + 0.6 / n);
      const c3 = lerp(lerp(tl, bl, 0.88), lerp(tr, br, 0.88), t - 0.6 / n);
      x += `M${pt(...c0)} L${pt(...c1)} M${pt(...c2)} L${pt(...c3)} `;
    }
  }
  return (
    shape(d, fill, 0.8) +
    `<path d="${d}" fill="url(#cyl)" opacity=".6"/>` +
    line(cord, INK, 1.4, 0.9) +
    line(cord, lace, 0.9, 1) +
    line(cord, "#ffffff", 0.25, 0.3) +
    line(`M${pt(...lerp(tl, bl, 0.97))} L${pt(...lerp(tr, br, 0.97))}`, "#000000", 0.9, 0.45) +
    (x ? line(x, INK, 0.9, 0.8) + line(x, KNOT, 0.5, 1) : "") +
    `<g fill="#0a0f16">${rivets}</g>` +
    line(`M${pt(...lerp(tl, bl, 0.08))} L${pt(...lerp(tr, br, 0.08))}`, "#f4faff", 0.45, lit)
  );
}

/** A hanging panel of `rows` laced rows, top edge [x0..x1] at y, flaring to [bx0..bx1] at yb. */
function panel(x0, x1, y, bx0, bx1, yb, rows, lace, o = {}) {
  let out = "";
  const at = (t) => [lerp([x0, y], [bx0, yb], t), lerp([x1, y + (o.tilt || 0)], [bx1, yb + (o.tilt || 0)], t)];
  // Bottom row first so each row above laps over the one beneath it.
  for (let i = rows - 1; i >= 0; i--) {
    const [tl, tr] = at(i / rows);
    const [bl, br] = at((i + 1) / rows);
    out += row(tl, tr, [br[0], br[1] + 0.6], [bl[0], bl[1] + 0.6], lace, { ...o, knots: i === rows - 1 });
  }
  return out;
}

// ── Frame: lamellar ────────────────────────────────────────────────────────

function lamellar(P, c, K) {
  const lace = c.pal.primary;
  const lacquer = K.mix(c.pal.dark, "#07080b", 0.45);
  let glow = "";

  // Behind the body: a back banner (sashimono) on a pole rising over the
  // right shoulder, a chrono crest on the cloth. It stands no higher than
  // the kabuto's crest, so the bust camera holds it: drawn at full size in
  // its own coordinates (the table below) and fitted by B, ~60% as tall.
  const B = (d) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => pt(14.8 + (x - 15.4) * 0.68, -103 + (+y + 111.4) * 0.6));
  const flag = B("M16.8,-110.4 L30,-110.8 C29.6,-102 30.4,-94 29.8,-83.6 L26.6,-86.6 L23.4,-82.8 L20.2,-86.4 L17.2,-83.2 C17.6,-92 17,-101 16.8,-110.4 Z");
  const mon = B("23.4,-99").split(",").map(Number);
  const pole = "M12.4,-58 L15.1,-103.8";
  const under =
    line(pole, INK, 2.4, 1) +
    line(pole, "#2a2016", 1.4, 1) +
    line("M12.7,-62 L15,-102", "#6a5640", 0.4, 0.8) +
    shape(flag, "url(#paint)", 0.9) +
    line(B("M18,-108.6 C18.4,-100 18.2,-92 18.4,-86"), "#ffffff", 0.5, 0.35) +
    line(B("M29,-108 C28.6,-100 29.2,-92 28.8,-86"), "#000000", 0.7, 0.3) +
    line(B("M15.4,-111.2 L31,-111.6"), INK, 2, 1) +
    line(B("M15.4,-111.2 L31,-111.6"), "#2a2016", 1.1, 1) +
    `<circle cx="${f(mon[0])}" cy="${f(mon[1])}" r="3.3" fill="${lacquer}" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="${f(mon[0])}" cy="${f(mon[1])}" r="2.4" fill="none" stroke="${KNOT}" stroke-width=".5"/>` +
    line(`M${pt(mon[0], mon[1] - 2.2)} L${pt(...mon)} L${pt(mon[0] + 1.5, mon[1] + 0.8)}`, KNOT, 0.5, 1) +
    `<path d="M${pt(mon[0] - 2.8, mon[1] + 4.8)} L${pt(mon[0] + 2.8, mon[1] + 4.8)}" stroke="${lacquer}" stroke-width="1"/>` +
    `<path d="M${pt(mon[0] - 2.1, mon[1] + 6.1)} L${pt(mon[0] + 2.1, mon[1] + 6.1)}" stroke="${lacquer}" stroke-width=".6"/>`;
  glow += energy(`<circle cx="${f(mon[0])}" cy="${f(mon[1])}" r="2.4" fill="none" stroke-width=".4"/><circle cx="${f(mon[0])}" cy="${f(mon[1])}" r=".55"/>`, c.energy);

  // Shin guards: splinted plates down the front of the shin, laced at the top.
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      const at = S(leg, 0.5);
      return (
        plateAt(at, leg.kn, leg.an, "M-5.6,-11 C-2,-12 2,-12 5.6,-11 L5,10.4 C2,11.4 -2,11.4 -5,10.4 Z", STEEL_DK, 1) +
        lineAt(at, leg.kn, leg.an, "M-2.8,-10.6 L-2.5,10.4 M0,-10.9 L0,10.8 M2.8,-10.6 L2.5,10.4", INK, 0.55, 0.7) +
        lineAt(at, leg.kn, leg.an, "M-4.6,-9.6 L-4.2,9.4", "#f4faff", 0.45, s < 0 ? 0.6 : 0.3) +
        lineAt(at, leg.kn, leg.an, "M-5.4,-8.2 L5.4,-8.2 M-5.2,7.4 L5.2,7.4", INK, 1.2, 0.9) +
        lineAt(at, leg.kn, leg.an, "M-5.4,-8.2 L5.4,-8.2 M-5.2,7.4 L5.2,7.4", lace, 0.7, 1) +
        plateAt(S(leg, 0.06), leg.kn, leg.an, "M0,-5 C3.4,-5 5,-3 5,-0.4 C5,2.6 2.8,4.6 0,5 C-2.8,4.6 -5,2.6 -5,-0.4 C-5,-3 -3.4,-5 0,-5 Z", STEEL, 0.9) +
        lineAt(S(leg, 0.06), leg.kn, leg.an, "M-3.2,-1.6 C-1.2,-3 1.2,-3 3.2,-1.6", "#f4faff", 0.45, 0.6)
      );
    })
    .join("");

  // Laced forearm guards with a hand plate at the wrist.
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { el, wr } = armJoints(arm, s);
      const at = lerp(el, wr, 0.55);
      return (
        plateAt(at, el, wr, "M-5.6,-8.4 L5.6,-8.4 L6,7.2 L-6,7.2 Z", STEEL_DK, 1) +
        lineAt(at, el, wr, "M-5.4,-4.4 L5.6,-4.4 M-5.6,-0.4 L5.8,-0.4 M-5.8,3.6 L5.9,3.6", INK, 0.55, 0.65) +
        lineAt(at, el, wr, "M-3,-8 L-3,7 M0,-8 L0,7.2 M3,-8 L3,7", lace, 0.6, 0.85) +
        lineAt(at, el, wr, `M${f(s * -4.8)},-7.6 L${f(s * -5.2)},6.6`, "#f4faff", 0.45, 0.5) +
        plateAt(wr, el, wr, "M-4.8,0.6 L4.8,0.6 L5.4,5.4 L0,6.6 L-5.4,5.4 Z", STEEL, 0.8)
      );
    })
    .join("");

  // The cuirass: a steel breast plate over six laced rows, an obi at the
  // waist with a short blade through it, tassets hanging below.
  const breast = "M-15.6,-65.6 C-10,-67.6 -5,-66.4 -3.6,-63.6 C-1.6,-62 1.6,-62 3.6,-63.6 C5,-66.4 10,-67.6 15.6,-65.6 L16.8,-59.8 C8,-61 -8,-61 -16.8,-59.8 Z";
  const W = [17.4, 17.6, 17.2, 16.4, 15.4, 14.6, 14.4];
  const Y = [-60.4, -55.6, -50.8, -46, -41.2, -36.4, -31.6];
  let rows = "";
  for (let i = 5; i >= 0; i--) {
    const sag = 0.7;
    rows += row([-W[i], Y[i]], [W[i], Y[i]], [W[i + 1], Y[i + 1] + 0.6], [-W[i + 1], Y[i + 1] + 0.6], lace, { cords: 3.6, lit: 0.55 });
    rows += line(`M${pt(-W[i] + 1, Y[i] + 0.2)} C${pt(-4, Y[i] + sag)} ${pt(4, Y[i] + sag)} ${pt(W[i] - 1, Y[i] + 0.2)}`, INK, 0.4, 0.4);
  }
  // The tassets hang in a front and a side panel each side, parted over
  // the stock hip plate so the origin insignia engraved there shows.
  const side = (sx) => panel(sx * 12.8, sx * 17.4, -24, sx * 13.6, sx * 20, -4.2, 4, lace, { tilt: 0.8 });
  const front = (sx) => panel(sx * 0.6, sx * 7.2, -23.4, sx * 0.6, sx * 8.6, -1.6, 4, lace);
  const obi = "M-15,-32 C-6,-30.8 6,-30.8 15,-32 L15.2,-22.4 C6,-21.4 -6,-21.4 -15.2,-22.4 Z";
  const sash = K.mix(c.pal.primary, "#15181d", 0.62);
  // The blade: a short sword thrust through the sash, its scabbard ending
  // at the left hip inside the arm's swing, the wrapped hilt angled up
  // across the belly, a round guard where it enters the sash.
  const guard = [-4.2, -29.6];
  const hiltEnd = [4.6, -36.4];
  // The feminine arm hangs closer in, so her scabbard is shorter.
  const sayaEnd = c.fem ? [-12, -21] : [-13.8, -21.8];
  // Where the scabbard goes under a fold of the sash.
  const tuck = lerp(guard, sayaEnd, 0.5);
  const hiltWrap = [0.2, 0.4, 0.6, 0.8]
    .map((t) => {
      const p = lerp(guard, hiltEnd, t);
      return `M${pt(p[0] - 0.9, p[1] - 1.3)} L${pt(p[0] + 0.9, p[1] + 1.3)} M${pt(p[0] + 0.4, p[1] - 1.5)} L${pt(p[0] + 1.6, p[1] + 0.4)}`;
    })
    .join(" ");
  // A bow on the right hip: two loops, two tails, a wrapped centre.
  const bow = "M10.4,-27.4 C8.4,-31.4 5.4,-31 5.6,-28.4 C5.8,-26.2 8.6,-26.2 10.4,-27.4 Z M10.4,-27.4 C12.4,-31.4 15.4,-31 15.2,-28.4 C15,-26.2 12.2,-26.2 10.4,-27.4 Z";
  const tails = "M9.6,-27 L7.2,-18.6 L8.8,-19.6 L9.8,-18.2 L11,-26.8 Z M11.2,-27 L13.6,-19.2 L12,-19.8 L11.4,-18.4 L10.2,-26.8 Z";
  const knot =
    shape(tails, sash, 0.7) +
    shape(bow, sash, 0.7) +
    `<path d="${bow}" fill="url(#weave)" opacity=".8"/>` +
    line("M6.4,-29.2 C7.4,-30.2 8.6,-29.8 9.4,-28.6", "#ffffff", 0.4, 0.35) +
    `<ellipse cx="10.4" cy="-27.4" rx="1.3" ry="1.5" fill="${sash}" stroke="${INK}" stroke-width=".6"/>`;
  const torso =
    rows +
    shape(breast, STEEL, 1.1) +
    `<path d="${breast}" fill="url(#cyl)" opacity=".7"/>` +
    line("M-14.8,-64.4 C-10,-66 -6.4,-65.4 -4.6,-63.4", "#ffffff", 0.7, 0.75) +
    line("M16.2,-64.4 L16.8,-60.4", RIM, 0.7, 0.85) +
    line("M-16.4,-60.4 C-8,-61.4 8,-61.4 16.4,-60.4", lace, 0.9, 1) +
    // The chest core sits in a round crest fitting.
    `<circle cx="0" cy="-54" r="3.9" fill="url(#steel)" stroke="${INK}" stroke-width=".7"/>` +
    `<circle cx="0" cy="-54" r="2.6" fill="#070c12" stroke="${INK}" stroke-width=".4"/>` +
    `<circle cx="0" cy="-54" r="1.7" fill="#0b7c90"/>` +
    side(-1) +
    side(1) +
    front(-1) +
    front(1) +
    shape(obi, sash, 1) +
    `<path d="${obi}" fill="url(#weave)" opacity=".8"/>` +
    line("M-14.6,-29.6 C-6,-28.6 6,-28.6 14.6,-29.6", "#000000", 0.6, 0.4) +
    line("M-14.6,-25.4 C-6,-24.4 6,-24.4 14.6,-25.4", "#000000", 0.6, 0.4) +
    line("M-14,-31 C-8,-30.2 -4,-30 -1,-30", "#ffffff", 0.5, 0.35) +
    // Knot on the right hip, tails hanging.
    knot +
    // Chrono clasp: the belt light shows through it.
    `<rect x="-3.2" y="-27.6" width="6.4" height="5" rx="1.2" fill="url(#steel)" stroke="${INK}" stroke-width=".6"/>` +
    `<rect x="-2.1" y="-26.3" width="4.2" height="2.6" rx=".4" fill="#0b6f80"/>` +
    // Scabbard along the sash, a fold of the sash wrapped over it, the
    // steel chape at its end.
    line(`M${pt(...guard)} L${pt(...sayaEnd)}`, INK, 3.4, 1) +
    line(`M${pt(...guard)} L${pt(...sayaEnd)}`, lacquer, 2.4, 1) +
    line(`M${pt(guard[0] - 1.2, guard[1] - 0.3)} L${pt(sayaEnd[0] + 0.8, sayaEnd[1] - 0.9)}`, "#ffffff", 0.4, 0.35) +
    shape(`M${pt(tuck[0] - 1.1, tuck[1] - 3)} L${pt(tuck[0] + 1.3, tuck[1] - 3.4)} L${pt(tuck[0] + 1.9, tuck[1] + 2.4)} L${pt(tuck[0] - 0.5, tuck[1] + 2.8)} Z`, sash, 0.6) +
    line(`M${pt(tuck[0] - 0.6, tuck[1] - 2.4)} L${pt(tuck[0], tuck[1] + 2)}`, "#000000", 0.5, 0.35) +
    `<circle cx="${f(sayaEnd[0])}" cy="${f(sayaEnd[1])}" r="1.3" fill="url(#steel)" stroke="${INK}" stroke-width=".5"/>` +
    line(`M${pt(...guard)} L${pt(...hiltEnd)}`, INK, 3, 1) +
    line(`M${pt(...guard)} L${pt(...hiltEnd)}`, "#191b20", 2.1, 1) +
    line(hiltWrap, lace, 0.55, 1) +
    `<circle cx="${f(hiltEnd[0])}" cy="${f(hiltEnd[1])}" r="1.2" fill="url(#steel)" stroke="${INK}" stroke-width=".5"/>` +
    `<ellipse cx="${f(guard[0])}" cy="${f(guard[1])}" rx="2.6" ry="1.5" transform="rotate(-32 ${f(guard[0])} ${f(guard[1])})" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>`;

  // softTorso drops the stock chest light, so the fitting carries its own.
  glow += energy(`<circle cx="0" cy="-54" r="1.7"/>`, c.energy);
  return { under, legs, torso, arms, glow };
}

// ── Helmet: kabuto ─────────────────────────────────────────────────────────

function kabuto(c, K) {
  const lace = c.pal.primary;
  // Neck guard: four lames flaring down and out behind the mask.
  let guard = "";
  const lames = [
    [-11.6, -16.6, -87.4, -82.4],
    [-11.8, -18.8, -83.2, -78.2],
    [-11.4, -21, -79, -74],
    [-10.8, -23, -74.8, -69.8],
  ];
  for (let i = lames.length - 1; i >= 0; i--) {
    const [xi, xo, yt, yb] = lames[i];
    for (const s of [-1, 1]) {
      const X = (x) => -s * x; // the table is drawn for the left; s = 1 mirrors it
      const pts = [[X(xi), yt], [X(xo), yt + 1.6], [X(xo - 0.6), yb + 1.8], [X(xi), yb]];
      guard += s < 0 ? row(pts[0], pts[1], pts[2], pts[3], lace, { cords: 3.6, knots: i === 3, lit: 0.6 }) : row(pts[1], pts[0], pts[3], pts[2], lace, { cords: 3.6, knots: i === 3, lit: 0.3 });
    }
  }
  const bowl = "M-12.6,-85.8 C-13.2,-93 -7.6,-98.4 0,-98.4 C7.6,-98.4 13.2,-93 12.6,-85.8 Z";
  const ribs = [-9.4, -6.2, -3.1, 3.1, 6.2, 9.4]
    .map((x) => `M${f(x * 0.32)},-97.8 C${f(x * 0.8)},-96.4 ${f(x * 1.04)},-91 ${f(x * 1.06)},-86.4`)
    .join(" ");
  const wing = "M-11.8,-88.4 C-14.4,-90.6 -18,-90.6 -19.4,-88.2 L-17.6,-81.2 C-16.2,-83.4 -14,-84.6 -12,-84.4 Z";
  const brim = "M-13.4,-87.4 C-6,-89.8 6,-89.8 13.4,-87.4 L12,-84.8 C6,-86.8 -6,-86.8 -12,-84.8 Z";
  const recess = "M-10.6,-85.6 C-6,-86.8 6,-86.8 10.6,-85.6 L10.4,-79.4 L-10.4,-79.4 Z";
  const mask = "M-10.4,-80.6 C-6.4,-79.4 -2.6,-80.4 0,-82.8 C2.6,-80.4 6.4,-79.4 10.4,-80.6 L9.8,-75.2 C8.6,-71.2 5,-68.4 0,-67.8 C-5,-68.4 -8.6,-71.2 -9.8,-75.2 Z";
  const mouth = "M-5.8,-75.2 C-3,-76.6 3,-76.6 5.8,-75.2 L4.6,-71.6 C2,-70.6 -2,-70.6 -4.6,-71.6 Z";
  const teethTop = "M-4.8,-75.3 L-3.6,-73.9 L-2.4,-75.6 L-1.2,-74.2 L0,-75.8 L1.2,-74.2 L2.4,-75.6 L3.6,-73.9 L4.8,-75.3 C2,-76.2 -2,-76.2 -4.8,-75.3 Z";
  const teethLow = "M-3.8,-71.7 L-2.6,-72.9 L-1.3,-71.4 L0,-72.8 L1.3,-71.4 L2.6,-72.9 L3.8,-71.7 C2,-71.1 -2,-71.1 -3.8,-71.7 Z";
  const crest = "M0,-89.6 C-7.6,-90 -14.4,-96 -18.4,-107 C-12.2,-100.4 -6.2,-97.2 0,-96.6 C6.2,-97.2 12.2,-100.4 18.4,-107 C14.4,-96 7.6,-90 0,-89.6 Z";
  const front =
    guard +
    // Throat guard under the mask.
    shape("M-7.2,-70.8 L7.2,-70.8 L7.8,-66.6 L-7.8,-66.6 Z", STEEL_DK, 0.7) +
    line("M-7,-68.6 L7,-68.6", lace, 0.7, 1) +
    shape(bowl, STEEL) +
    `<path d="${bowl}" fill="url(#cyl)" opacity=".6"/>` +
    line(ribs, INK, 0.5, 0.55) +
    `<ellipse cx="-5.4" cy="-93.4" rx="4" ry="2.4" fill="url(#sheen)"/>` +
    line("M-10.6,-90.4 C-8.6,-94.6 -5.2,-96.8 -2,-97.4", "#f4faff", 0.7, 0.75) +
    line("M12.2,-90 C13,-88.6 13,-87.2 12.8,-86.2", c.rim, 0.7, 0.85) +
    `<circle cx="0" cy="-98.2" r="1.4" fill="url(#steelDk)" stroke="${INK}" stroke-width=".5"/>` +
    shape(wing, "url(#paint)", 0.8) +
    shape(mirror(wing), "url(#paint)", 0.8) +
    line("M-12.6,-87.6 C-14.8,-89.2 -17.4,-89.2 -18.4,-87.8", "#ffffff", 0.45, 0.5) +
    shape(recess, "#06080c", 0.7) +
    shape(brim, STEEL_DK, 0.9) +
    line("M-12.4,-87.2 C-6,-89 -2,-89.2 0,-89.2", "#f4faff", 0.5, 0.6) +
    // The war mask: lacquered, a hooked nose, a snarl of teeth, whiskers.
    shape(mask, STEEL_DK, 0.9) +
    `<path d="${mask}" fill="url(#cyl)" opacity=".6"/>` +
    line("M-9.4,-79.6 C-7,-78.6 -4.6,-79 -2.6,-80.4", "#ffffff", 0.5, 0.4) +
    line("M-8.6,-77.4 C-7,-75.6 -6.6,-74 -6.8,-72.4 M8.6,-77.4 C7,-75.6 6.6,-74 6.8,-72.4", INK, 0.6, 0.7) +
    shape("M-1.4,-81.8 L0,-82.6 L1.4,-81.8 L2.4,-77.6 L0.8,-76.6 L-0.8,-76.6 L-2.4,-77.6 Z", STEEL, 0.6) +
    line("M-0.4,-81.6 L-1.2,-78", "#ffffff", 0.35, 0.45) +
    shape(mouth, "#120406", 0.7) +
    shape(teethTop, KNOT, 0.4) +
    shape(teethLow, KNOT, 0.4) +
    shape("M-5.4,-75.2 L-4.4,-72.4 L-3.8,-74.8 Z M5.4,-75.2 L4.4,-72.4 L3.8,-74.8 Z", "#f4efe0", 0.35) +
    line("M-2.2,-76.6 C-4.6,-77.4 -7.4,-76.6 -9.6,-73.4 M2.2,-76.6 C4.6,-77.4 7.4,-76.6 9.6,-73.4", INK, 1, 0.9) +
    line("M-2.2,-76.6 C-4.6,-77.4 -7.4,-76.6 -9.6,-73.4 M2.2,-76.6 C4.6,-77.4 7.4,-76.6 9.6,-73.4", "#c8ccd0", 0.5, 1) +
    line("M-1.6,-70.4 C-1,-69.2 1,-69.2 1.6,-70.4", INK, 0.5, 0.6) +
    // Crescent crest on its mount, a clock face at its heart.
    shape(crest, "url(#paint)", 0.9) +
    line("M-1,-90.4 C-7.6,-91.2 -13.4,-96.4 -16.8,-104.2", "#ffffff", 0.5, 0.55) +
    line("M16.6,-103.6 C13.6,-97 9,-92.6 3,-90.6", "#000000", 0.6, 0.3) +
    `<circle cx="0" cy="-92.2" r="2.8" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="0" cy="-92.2" r="1.8" fill="#05080d"/>`;
  const eyes = `<ellipse cx="-4.4" cy="-82.2" rx="2.4" ry="1" transform="rotate(10 -4.4 -82.2)"/><ellipse cx="4.4" cy="-82.2" rx="2.4" ry="1" transform="rotate(-10 4.4 -82.2)"/>`;
  const glow =
    `<g fill="${c.eyes}" filter="url(#bloom)" opacity=".8">${eyes}</g>` +
    `<g fill="${K.mix(c.eyes, "#ffffff", 0.55)}" transform="translate(0,-.1)">${eyes.replace(/rx="2.4" ry="1"/g, 'rx="1.5" ry=".45"')}</g>` +
    energy(
      `<circle cx="0" cy="-92.2" r="1.7" fill="none" stroke-width=".45"/><path d="M0,-93.6 L0,-92.2 L1,-91.6" fill="none" stroke-width=".35"/>` +
        `<path d="M-3.4,-73.6 L3.4,-73.6" stroke-width=".9" opacity=".55"/>`,
      c.energy,
    );
  return { front, glow };
}

// ── Shoulders: sode ────────────────────────────────────────────────────────

function sode(c, s, K) {
  const lace = c.pal.primary;
  const { M, rot, lit } = K;
  // Drawn for the right side, mirrored by M; rows stepping down the arm.
  const P = (x, y) => [s * x, y];
  const rows = 5;
  let plates = "";
  for (let i = rows - 1; i >= 0; i--) {
    const dx = i * 0.5;
    const dy = i * 5.3;
    const tl = P(14 + dx, -67 + dy);
    const tr = P(33.4 + dx, -69 + dy);
    const br = P(33.8 + dx, -63 + dy);
    const bl = P(14.4 + dx, -61.2 + dy);
    plates += s > 0 ? row(tl, tr, br, bl, lace, { knots: i === rows - 1, lit: 0.4 }) : row(tr, tl, bl, br, lace, { knots: i === rows - 1, lit: 0.8 });
  }
  const cord = "M15.6,-68.2 C14.4,-71.8 18.2,-72.6 18.6,-69.4 C19,-72.8 22.8,-72.4 21.8,-68.8 M18.6,-69.4 L17.4,-66.4 M18.6,-69.4 L20.2,-66.6";
  const cap = "M12.8,-68.6 L32.6,-71.4 C34.2,-71.6 35,-70.6 34.6,-69.2 L34.2,-67.2 L13.6,-65 Z";
  return rot(
    // Cords tying the plate to the shoulder.
    plates +
      shape(M(cap), STEEL, 1) +
      shape(M("M14.4,-67.6 L32.2,-70.2 L32,-68.8 L14.6,-66.4 Z"), "url(#paint)", 0.4) +
      line(M("M13.4,-68.2 L32.4,-70.8"), "#f4faff", 0.55, lit ? 0.85 : 0.4) +
      `<g fill="#0a0f16"><circle cx="${f(s * 17.4)}" cy="-66.2" r=".55"/><circle cx="${f(s * 30.6)}" cy="-68.2" r=".55"/></g>` +
      // The tying cord, knotted in a bow on the cap.
      line(M(cord), INK, 1.5, 1) +
      line(M(cord), lace, 0.9, 1) +
      (lit ? `<ellipse cx="-22" cy="-60" rx="6" ry="3.4" fill="url(#sheen)" opacity=".7"/>` : line("M34.4,-66.6 L34.8,-63 M34.9,-61.6 L36,-41.6", c.rim, 0.8, 0.85)),
  );
}

export default {
  id: "ronin",
  frames: {
    // Laced plate over the chest: no chest trim; the crest fitting carries
    // its own core light.
    lamellar: { shape: { width: 1.04, shoulder: 1.02, softTorso: true }, layers: lamellar },
  },
  helmets: {
    // The crescent crest holds the crown and its clock fitting the brow, so
    // neither takes gear; lamps, whips and a headset mount where the bowl
    // meets the wing (fukigaeshi). The badge is a mon on the left wing.
    kabuto: {
      anchors: { top: -98.4, half: 13, rail: -87, badge: { x: -15.6, y: -86.8, rot: -12, size: 3.8 } },
      paint: kabuto,
    },
  },
  shoulders: {
    sode: { paint: sode },
  },
};
