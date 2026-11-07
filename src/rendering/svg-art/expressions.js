/**
 * The mouth's expression (EXPRESSIONS in src/data/cosmetics.js), as every
 * piece of art that draws a mouth takes it: the bare face's mouth in each
 * build's own lips (agent-rig.js face()), the beard's mouth opening, where
 * the lip ring and the cigar sit (accessories/face.js), and the LED mask's
 * lit pattern (wardrobe-themes/runner.js).
 *
 * Drawn in head space, before the feminine jaw's warp narrows it with the
 * face (every "x,y" pair is narrowed, so mouths are paths, never circles).
 * The face: nose tip at y -76.1, chin -71.2, so a mouth keeps to -75.5..-71.8;
 * the corners sit near x ±2.6, inside the cheeks.
 *
 * "default" is the mouth each face wore before the pick, kept as it was
 * drawn, mark for mark. Every other expression is one shape, the line the
 * lips part along (`part`) and, for an open mouth, the lower lip's inner
 * edge (`open`), each a cubic from the left corner to the right; both
 * builds draw their lips from it, so one shape reads the same on either.
 */
import { mixHexClamped as mix } from "../../utils/color.js";
import { line } from "./models/hero.js";

/** Head-space numbers at two places: a mouth is a few units across. */
const f = (n) => Math.round(n * 100) / 100;
const P = ([x, y]) => `${f(x)},${f(y)}`;

/** Point t (0..1) along the cubic [a, b, c, d]. */
function bez([a, b, c, d], t) {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((i) => k[0] * a[i] + k[1] * b[i] + k[2] * c[i] + k[3] * d[i]);
}

/** n + 1 points along a cubic from t0 to t1, each moved down by dy(t) (up when negative). */
function along(curve, dy = () => 0, n = 10, t0 = 0, t1 = 1) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / n;
    const [x, y] = bez(curve, t);
    return [x, y + dy(t)];
  });
}

/** A smooth path through points (Catmull-Rom as cubics), closed when asked. */
function smooth(pts, closed = false) {
  const at = (i) => pts[closed ? (i + pts.length) % pts.length : Math.max(0, Math.min(pts.length - 1, i))];
  let d = `M${P(pts[0])}`;
  const last = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return closed ? `${d} Z` : d;
}

/** The area between two runs of points from corner to corner: one forward, the other back. */
const band = (top, bottom) => smooth([...top, ...bottom.slice().reverse()], true);

/** 0 at the corners, 1 at the middle. */
const arch = (t) => Math.sin(Math.PI * t);

/**
 * Every expression but the default, as shapes. `part` is where the lips
 * meet (the upper lip's inner edge on an open mouth), `open` the lower
 * lip's inner edge for a mouth that shows its inside, `teeth` which rows
 * show ("upper", or "both"), `tongue` whether it shows, and `creases` the
 * folds at the corners that carry a smile or a frown at a distance. `lit`
 * is the LED mask's pattern: [column, row] cells on its grid (columns -5..5
 * across the mask, rows 0..4 from the top).
 */
const SHAPES = {
  smile: {
    part: [[-2.8, -74.7], [-1.5, -73.25], [1.5, -73.25], [2.8, -74.7]],
    creases: ["M-3.05,-75.05 C-3.35,-74.75 -3.45,-74.4 -3.4,-74.05", "M3.05,-75.05 C3.35,-74.75 3.45,-74.4 3.4,-74.05"],
    lit: [[-4, 1], [4, 1], [-3, 2], [3, 2], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3]],
  },
  grin: {
    part: [[-3, -74.75], [-1.6, -74.05], [1.6, -74.05], [3, -74.75]],
    open: [[-3, -74.75], [-1.9, -71.95], [1.9, -71.95], [3, -74.75]],
    teeth: "both",
    creases: ["M-3.25,-75.1 C-3.55,-74.8 -3.65,-74.4 -3.55,-74", "M3.25,-75.1 C3.55,-74.8 3.65,-74.4 3.55,-74"],
    lit: [[-4, 1], [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [-4, 2], [-2, 2], [0, 2], [2, 2], [4, 2], [-3, 3], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3], [3, 3]],
  },
  smirk: {
    part: [[-2.4, -73.75], [-0.9, -73.55], [1.2, -73.6], [2.8, -74.95]],
    creases: ["M3.05,-75.3 C3.35,-75 3.45,-74.65 3.4,-74.3"],
    lit: [[-3, 3], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 2], [3, 2], [4, 1]],
  },
  grim: {
    part: [[-2.7, -73.9], [-1, -74], [1, -74], [2.7, -73.9]],
    // Pressed lips: a short tuck down at each corner.
    creases: ["M-2.75,-73.95 L-2.9,-73.45", "M2.75,-73.95 L2.9,-73.45"],
    lit: [[-4, 2], [-3, 2], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]],
  },
  frown: {
    part: [[-2.7, -73.15], [-1.4, -74.45], [1.4, -74.45], [2.7, -73.15]],
    creases: ["M-2.95,-72.85 C-3.25,-73.05 -3.4,-73.4 -3.4,-73.75", "M2.95,-72.85 C3.25,-73.05 3.4,-73.4 3.4,-73.75"],
    lit: [[-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-3, 2], [3, 2], [-4, 3], [4, 3]],
  },
  shout: {
    part: [[-2.7, -74.9], [-1.4, -75.35], [1.4, -75.35], [2.7, -74.9]],
    open: [[-2.7, -74.9], [-2.5, -71.5], [2.5, -71.5], [2.7, -74.9]],
    teeth: "upper",
    tongue: true,
    lit: [[-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [-4, 1], [4, 1], [-4, 2], [4, 2], [-3, 3], [3, 3], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4]],
  },
  shocked: {
    part: [[-1.15, -73.75], [-1.15, -75.15], [1.15, -75.15], [1.15, -73.75]],
    open: [[-1.15, -73.75], [-1.15, -72.25], [1.15, -72.25], [1.15, -73.75]],
    lit: [[-1, 1], [0, 1], [1, 1], [-2, 2], [2, 2], [-1, 3], [0, 3], [1, 3]],
  },
};

/** The ids drawn as shapes: every expression but the default. */
export const EXPRESSION_SHAPES = Object.freeze(Object.keys(SHAPES));

/** The shape an expression id draws, or null for the default (and an id no shape has). */
const shapeOf = (id) => SHAPES[id] || null;

/** The mouth's inside, its teeth and tongue, for an open shape. */
function inside(s) {
  const top = along(s.part);
  const bottom = along(s.open);
  const gap = (t) => bez(s.open, t)[1] - bez(s.part, t)[1];
  let m = `<path d="${band(top, bottom)}" fill="#2a0e10"/>`;
  if (s.tongue) {
    const lift = (t) => -Math.min(0.85, gap(t) * 0.4) * arch(t);
    m += `<path d="${band(along(s.open, lift, 10, 0.2, 0.8), along(s.open, () => 0, 10, 0.2, 0.8))}" fill="#a8454e"/>`;
  }
  if (s.teeth) {
    const upper = along(s.part, (t) => Math.min(0.75, gap(t) * 0.42) * arch(t) ** 0.35, 10, 0.08, 0.92);
    m += `<path d="${band(along(s.part, () => 0, 10, 0.08, 0.92), upper)}" fill="#efe8dc"/>`;
    if (s.teeth === "both") {
      const lower = along(s.open, (t) => -Math.min(0.6, gap(t) * 0.36) * arch(t) ** 0.35, 10, 0.12, 0.88);
      m += `<path d="${band(lower, along(s.open, () => 0, 10, 0.12, 0.88))}" fill="#ddd5c8"/>`;
    }
    // Where the teeth meet, a few gaps either side of the middle.
    const gaps = [0.32, 0.44, 0.56, 0.68].map((t) => {
      const [x, y] = bez(s.part, t);
      return `M${P([x, y + 0.05])} L${P([x, y + Math.min(0.7, gap(t) * 0.4)])}`;
    });
    m += line(gaps.join(" "), "#8a7f74", 0.14, 0.7);
  }
  return m;
}

/** A shape on the masculine face: a dark parting line over a lit lower lip, as the default draws it. */
function mascMouth(c, s) {
  const shadow = c.skin.shadow;
  const ink = mix(shadow, "#000000", 0.4);
  // The lit lower lip, under the parting or, on an open mouth, close under its rim.
  const lowLip = (curve, dy) => line(smooth(along(curve, () => dy, 6, 0.32, 0.68)), mix(c.skin.color, "#ffffff", 0.3), 0.4, 0.45);
  if (s.open) {
    return (
      inside(s) +
      line(smooth([...along(s.part), ...along(s.open).reverse().slice(1)]), ink, 0.45, 0.9) +
      lowLip(s.open, 0.55)
    );
  }
  return (
    `<path d="${band(along(s.part, (t) => -0.32 * arch(t)), along(s.part, (t) => 0.36 * arch(t)))}" fill="${mix(shadow, "#a04040", 0.3)}"/>` +
    line(smooth(along(s.part)), ink, 0.5, 0.9) +
    lowLip(s.part, 1.2)
  );
}

/** A shape on the feminine face: a cupid's-bow upper lip over a fuller lower lip, as her default draws them. */
function femMouth(c, s) {
  const lip = mix(c.skin.color, "#b0474f", 0.42);
  const ink = mix(c.skin.shadow, "#000000", 0.35);
  // The upper lip rises to two peaks with the bow's dip between them.
  const bow = (t) => -(0.85 * arch(t) ** 0.7 - 0.32 * Math.exp(-(((t - 0.5) / 0.09) ** 2)));
  const fuller = (t) => 1.4 * arch(t) ** 0.8;
  const lower = s.open || s.part;
  const sheen = along(lower, (t) => (s.open ? 0.55 : 0.8) * arch(t), 4, 0.48, 0.66);
  return (
    `<path d="${band(along(s.part, bow), along(s.part))}" fill="${mix(lip, "#000000", 0.12)}"/>` +
    `<path d="${band(along(lower), along(lower, s.open ? (t) => 1.05 * arch(t) ** 0.8 : fuller))}" fill="${lip}"/>` +
    (s.open ? inside(s) + line(smooth([...along(s.part), ...along(s.open).reverse().slice(1)]), ink, 0.35, 0.85) : line(smooth(along(s.part)), ink, 0.4, 0.85)) +
    line(smooth(sheen), "#ffffff", 0.45, 0.22)
  );
}

/** Each build's mouth as it was drawn before expressions: the default. */
const DEFAULT_MOUTH = {
  // A level, slightly lifted line (the old curve read as a frown).
  masc: (c) =>
    `<path d="M-2.4,-74 C-1,-74.3 1,-74.3 2.4,-74 C1.2,-73.3 -1.2,-73.3 -2.4,-74 Z" fill="${mix(c.skin.shadow, "#a04040", 0.3)}"/>` +
    line("M-2.6,-74.05 C-1.2,-73.55 1.2,-73.55 2.6,-74.05", mix(c.skin.shadow, "#000000", 0.4), 0.5, 0.9) +
    line("M-1.3,-72.75 C-0.5,-72.5 0.5,-72.5 1.3,-72.75", mix(c.skin.color, "#ffffff", 0.3), 0.4, 0.45),
  // A cupid's-bow upper lip over a fuller lower lip.
  fem: (c) => {
    const lip = mix(c.skin.color, "#b0474f", 0.42);
    return (
      `<path d="M-2.5,-74 C-1.6,-74.9 -0.6,-74.9 0,-74.4 C0.6,-74.9 1.6,-74.9 2.5,-74 C1.2,-73.75 -1.2,-73.75 -2.5,-74 Z" fill="${mix(lip, "#000000", 0.12)}"/>` +
      `<path d="M-2.4,-73.9 C-1.2,-73.7 1.2,-73.7 2.4,-73.9 C1.6,-72.3 -1.6,-72.3 -2.4,-73.9 Z" fill="${lip}"/>` +
      line("M-2.6,-74 C-1.2,-73.6 1.2,-73.6 2.6,-74", mix(c.skin.shadow, "#000000", 0.35), 0.4, 0.85) +
      `<ellipse cx=".5" cy="-73.1" rx="1" ry=".32" fill="#fff" opacity=".22"/>`
    );
  },
};

/**
 * The mouth on the bare face, in the build's lips: the expression the face
 * shows (c.mouth: agent-rig.js resolves it, the default where the helmet
 * covers the mouth; a look resolved without one shows the default).
 */
export function mouthOf(c) {
  const s = shapeOf(c.mouth);
  if (!s) return c.fem ? DEFAULT_MOUTH.fem(c) : DEFAULT_MOUTH.masc(c);
  return c.fem ? femMouth(c, s) : mascMouth(c, s);
}

/**
 * The beard's mouth: the opening it leaves for the lips, over the face's own
 * mouth, so the beard follows the expression (`ink`: its outline). The
 * default opening sits a little above the face's mouth, as it always has;
 * every other expression's lies on the face's, in one shape whatever the
 * build, as the default's is.
 */
export function beardMouthOf(c, ink) {
  const s = shapeOf(c.mouth);
  const lips = mix(c.skin.shadow, "#a04040", 0.3);
  if (!s) {
    return (
      `<path d="M-2.4,-74.6 C-1,-75 1,-75 2.4,-74.6 C1.2,-73.2 -1.2,-73.2 -2.4,-74.6 Z" fill="${lips}"/>` +
      line("M-2.6,-74.6 C-1.2,-74.1 1.2,-74.1 2.6,-74.6", ink, 0.45, 0.8)
    );
  }
  // The lips, parted from the hair round them, then the mouth itself.
  const lower = s.open || s.part;
  const lipsBand = `<path d="${band(along(s.part, (t) => -0.45 * arch(t)), along(lower, (t) => 0.55 * arch(t)))}" fill="${lips}"/>`;
  const outline = s.open ? smooth([...along(s.part), ...along(s.open).reverse().slice(1)]) : smooth(along(s.part));
  return lipsBand + (s.open ? inside(s) : "") + line(outline, ink, 0.45, 0.8);
}

/** Where each build's lower lip takes the ring at rest (the default mouth): see PIERCE in accessories/face.js. */
const DEFAULT_LIP = { masc: [1.4, -73.2], fem: [1.4, -73.35] };

/**
 * The point on the lower lip a lip ring leaves from, right of the middle,
 * for the expression the face shows and the build (the feminine lower lip
 * is fuller, so the ring sits a little deeper into it).
 */
export function lipRingAt(c) {
  const s = shapeOf(c.mouth);
  if (!s) return DEFAULT_LIP[c.fem ? "fem" : "masc"];
  const [x, y] = bez(s.open || s.part, 0.74);
  return [f(x), f(y + (s.open ? 0.45 : c.fem ? 0.55 : 0.7))];
}

/** The default mouth's right corner, where the cigar was drawn from. */
const DEFAULT_CORNER = [2.4, -74];

/**
 * How the cigar sits for the expression the face shows: null at rest (it is
 * drawn as it always was), else `{ move: [dx, dy], turn, about }`, a shift
 * and a turn (degrees, about the point it bites on) for its every point.
 * A closed mouth or a grin grips it in the right corner, wherever that
 * corner has gone. A mouth too open to grip it (the shout, the shocked O)
 * leaves it stuck to the lower lip, right of the middle, hanging steeper.
 */
export function cigarAt(c) {
  const s = shapeOf(c.mouth);
  if (!s) return null;
  if (s.open && s.teeth !== "both") {
    const [x, y] = bez(s.open, 0.72);
    // The end it bites on (1.9, -74.1) sits on the lip.
    return { move: [x + 0.25 - 1.9, y + 0.3 + 74.1], turn: 22, about: [1.9, -74.1] };
  }
  const [x, y] = s.part[3];
  return { move: [x - DEFAULT_CORNER[0], y - DEFAULT_CORNER[1]], turn: 0, about: [1.9, -74.1] };
}

/** The LED mask's lit cells at rest: the pixel grin it always wore, in mask units (its rows sit off the grid). */
const DEFAULT_LIT = [
  [-4, -75.4], [-3, -74.4], [-2, -74], [-1, -74], [0, -74], [1, -74], [2, -74], [3, -74.4], [4, -75.4],
  [-2, -72.8], [-1, -72.4], [0, -72.4], [1, -72.4], [2, -72.8],
];

/** The LED mask's grid: its columns' x (before the build narrows them) and its rows' y. */
export const LED_COLUMNS = Object.freeze([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
export const LED_ROWS = Object.freeze([-76.6, -75.4, -74.2, -73, -71.8]);

/**
 * The LED mask's lit cells for an expression, as [x, y] cell centres in
 * mask units (before the feminine build narrows x): the default's own
 * cells, or a pattern on the grid the unlit cells fill.
 * @param {string} id expression id
 */
export function ledCells(id) {
  const s = shapeOf(id);
  if (!s) return DEFAULT_LIT;
  return s.lit.map(([col, row]) => [col, LED_ROWS[row]]);
}
