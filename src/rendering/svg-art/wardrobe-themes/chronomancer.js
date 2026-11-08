/**
 * Wardrobe theme "chronomancer" (Chronomancer): the art for
 * src/data/wardrobe-themes/chronomancer.js, by id. See ./index.js for what
 * each painter is given and returns.
 *
 *   vestment — a ritual robe split down the front over the suit, a clock tabard,
 *              an hourglass at the belt, rune-etched gauntlets
 *   hood     — a deep hood, the face lost in shadow but for two lit eyes, a
 *              clock-ring halo floating behind
 *   mantle   — a stiff ceremonial collar plate engraved with runes, a tassel
 *   wraps    — cloth hand wraps in the robe's colours, the fingertips bare
 *              and a rune on the back that glows with the agent's energy
 */
import { INK, f, pt, lerp, shape, line, energy, muscle, armJoints, LIMB } from "../models/hero.js";
import { STEEL_DK, plateAt, lineAt, k, angle, cuffPath, cuffLine, wristMid } from "../frame-kit.js";

const PAINT = "url(#paint)";

/** Embroidery thread: gold, or silver on a palette that is gold already. */
const GOLD_THREAD = "#d8b25a";
const SILVER_THREAD = "#c9d3dc";

/** Hue in degrees and saturation (0–1) of a #rrggbb colour. */
function hueSat(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  const d = hi - lo;
  if (!d) return [0, 0];
  const h = hi === r ? ((g - b) / d) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(hi + lo - 1))];
}

/**
 * Robe cloth: a deep plum-black only tinted by the palette, so the palette's
 * own colour (the tabard, the mantle plates) and the thread stand out on it
 * rather than the whole robe going one colour.
 */
export const cloth = (c, mix) => {
  const base = mix("#1a1622", c.pal.dark, 0.3);
  const [h, sat] = hueSat(c.pal.primary);
  const trim = h > 30 && h < 66 && sat > 0.4 ? SILVER_THREAD : GOLD_THREAD;
  return { base, lo: mix(base, "#000000", 0.45), hi: mix(c.pal.primary, base, 0.6), trim };
};

/** Glyphs for the runes, drawn about their own origin (~3 units tall). */
const RUNES = [
  "M-1,-1.5 L1,0 L-1,1.5",
  "M0,-1.6 L0,1.6 M-1.1,-0.7 L1.1,0.7",
  "M-1.2,1.4 L0,-1.4 L1.2,1.4 M-0.6,0.2 L0.6,0.2",
  "M-1,-1.4 L1,-1.4 L-1,1.4 L1,1.4",
  "M0,-1.6 L0,1.6 M0,-0.4 L1.2,-1.4 M0,0.4 L-1.2,1.4",
  "M-1.1,-1.4 L-1.1,1.4 L1.1,-1.4 L1.1,1.4",
];

/** A clock face at (x, y), radius r: rim, twelve ticks, two hands. */
function clock(x, y, r, c, { face = "#0a0b10", ring = PAINT } = {}) {
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const r0 = i % 3 === 0 ? r * 0.62 : r * 0.74;
    ticks += `M${pt(x + Math.sin(a) * r0, y - Math.cos(a) * r0)} L${pt(x + Math.sin(a) * r * 0.86, y - Math.cos(a) * r * 0.86)} `;
  }
  return (
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 1)}" fill="${ring}" stroke="${INK}" stroke-width=".8"/>` +
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${face}" stroke="${INK}" stroke-width=".5"/>` +
    line(ticks, c.pal.accent, 0.45, 0.95) +
    line(`M${pt(x, y)} L${pt(x + r * 0.5, y - r * 0.3)} M${pt(x, y)} L${pt(x - r * 0.12, y - r * 0.7)}`, c.pal.accent, 0.6, 1) +
    line(`M${pt(x - r * 0.62, y - r * 0.5)} A${f(r * 0.8)},${f(r * 0.8)} 0 0 1 ${pt(x - r * 0.1, y - r * 0.8)}`, "#ffffff", 0.4, 0.35)
  );
}

// ── Vestment ───────────────────────────────────────────────────────────────

function vestment(P, c, K) {
  const { mix } = K;
  const C = cloth(c, mix);
  // How far each foot has moved off its standing line: the skirts follow it.
  const dx = P.legs.map((leg, i) => {
    const s = i === 0 ? -1 : 1;
    return leg.an[0] - leg.hip[0] - s * 4.6;
  });
  const X = (s, x, t) => f(s * x + dx[s < 0 ? 0 : 1] * t);

  // The back of the robe, behind the legs, its hem at the shins.
  const backSide = (s) =>
    `M0,-64 L${f(s * 17)},-64 C${f(s * 20)},-46 ${f(s * 20.6)},-30 ${X(s, 21.6, 0.3)},-6 ` +
    `L${X(s, 26.4, 1)},38.6 L${X(s, 20, 1)},40.4 L${X(s, 13, 1)},39.2 L${X(s, 6, 0.6)},40 L0,39.4 Z`;
  const under =
    shape(backSide(-1), C.lo, 1) +
    shape(backSide(1), C.lo, 1) +
    `<path d="${backSide(-1)}" fill="url(#weave)" opacity=".5"/><path d="${backSide(1)}" fill="url(#weave)" opacity=".5"/>` +
    line(`M${X(-1, 9, 0.6)},-10 L${X(-1, 11, 1)},38 M${X(1, 9, 0.6)},-10 L${X(1, 11, 1)},38`, "#000000", 0.6, 0.45);

  // Front skirts, split at the front so the legs stride through; trimmed
  // along every edge in the palette's accent.
  const panel = (s) =>
    `M${f(s * 5.4)},-66.6 C${f(s * 10)},-67.6 ${f(s * 15)},-67.4 ${f(s * 18.6)},-65.6 ` +
    `C${f(s * 20.6)},-56 ${f(s * 20.4)},-42 ${f(s * 19.4)},-30 ` +
    `C${X(s, 20.6, 0.2)},-18 ${X(s, 22.4, 0.5)},4 ${X(s, 24.6, 1)},35.6 ` +
    `L${X(s, 21.2, 1)},37.4 L${X(s, 17.4, 1)},36.2 L${X(s, 13.6, 1)},37.6 ` +
    `C${X(s, 11.6, 0.8)},18 ${X(s, 8.6, 0.4)},-6 ${f(s * 6.2)},-26 ` +
    `C${f(s * 4.6)},-40 ${f(s * 4.2)},-54 ${f(s * 5.4)},-66.6 Z`;
  const hem = (s) => `M${X(s, 24.6, 1)},35.6 L${X(s, 21.2, 1)},37.4 L${X(s, 17.4, 1)},36.2 L${X(s, 13.6, 1)},37.6`;
  const inner = (s) => `M${X(s, 13.6, 1)},37.6 C${X(s, 11.6, 0.8)},18 ${X(s, 8.6, 0.4)},-6 ${f(s * 6.2)},-26`;
  const trimLine = (d) => line(d, INK, 2, 0.9) + line(d, C.trim, 1.1, 1);
  const skirts = [-1, 1]
    .map(
      (s) =>
        shape(panel(s), C.base, 1.1) +
        `<path d="${panel(s)}" fill="url(#weave)" opacity=".55"/>` +
        // Folds: a shadow and a lit crest down each skirt.
        line(`M${X(s, 15, 0.3)},-20 C${X(s, 16, 0.6)},0 ${X(s, 17.4, 0.9)},20 ${X(s, 18.4, 1)},35`, "#000000", 0.9, 0.4) +
        line(`M${X(s, 12.6, 0.3)},-18 C${X(s, 13.2, 0.6)},0 ${X(s, 14.6, 0.9)},20 ${X(s, 15.4, 1)},34`, C.hi, 0.6, s < 0 ? 0.6 : 0.3) +
        line(`M${f(s * 18.2)},-62 C${f(s * 19.6)},-52 ${f(s * 19.4)},-40 ${f(s * 18.6)},-31`, s < 0 ? C.hi : c.rim, 0.6, s < 0 ? 0.55 : 0.6) +
        trimLine(hem(s)) +
        trimLine(inner(s)),
    )
    .join("");

  // Tabard down the front: the palette's paint, a clock crest at the chest,
  // a notched hem between the knees.
  const tab = "M-6.4,-64.4 L6.4,-64.4 L6.8,-30 L7.4,18 L3.6,15.4 L0,20.6 L-3.6,15.4 L-7.4,18 L-6.8,-30 Z";
  const tabard =
    shape(tab, PAINT, 1.1) +
    `<path d="${tab}" fill="url(#weave)" opacity=".35"/>` +
    `<path d="M-6.8,-30 L6.8,-30 L7.4,18 L3.6,15.4 L0,20.6 L-3.6,15.4 L-7.4,18 Z" fill="#000" opacity=".22"/>` +
    line("M-5,-63 L-5.3,-32 L-5.8,15.6 L-3.6,13.6 L0,18.4 L3.6,13.6 L5.8,15.6 L5.3,-32 L5,-63", C.trim, 0.55, 0.85) +
    line("M-5.8,-62 L-6,-34", "#ffffff", 0.5, 0.35) +
    clock(0, -51, 5, c) +
    // A rune under the crest and one on the apron, below the hourglass.
    lineAt([0, -40.4], [0, 0], [0, 1], RUNES[2], C.trim, 0.55, 0.9) +
    lineAt([0, 5], [0, 0], [0, 1], RUNES[4], C.trim, 0.6, 0.85);

  // Cowl folded round the collar.
  const cowl = "M-12,-68.6 C-6,-64.6 6,-64.6 12,-68.6 C14.6,-67 16.4,-65.4 16.6,-63.4 C10,-60.2 -10,-60.2 -16.6,-63.4 C-16.4,-65.4 -14.6,-67 -12,-68.6 Z";

  // Sash and clasp at the waist; the hourglass hangs from the clasp down the
  // middle of the tabard, where neither build's arms reach it.
  const sash = "M-19.4,-27.6 C-10,-29.2 10,-29.2 19.4,-27.6 L19.2,-22 C10,-23.4 -10,-23.4 -19.2,-22 Z";
  const hx = 0;
  const glassD = `M${f(hx - 2.6)},-21.4 C${f(hx - 2.6)},-18.4 ${f(hx - 0.5)},-17.6 ${f(hx - 0.5)},-16 C${f(hx - 0.5)},-14.4 ${f(hx - 2.6)},-13.6 ${f(hx - 2.6)},-10.6 L${f(hx + 2.6)},-10.6 C${f(hx + 2.6)},-13.6 ${f(hx + 0.5)},-14.4 ${f(hx + 0.5)},-16 C${f(hx + 0.5)},-17.6 ${f(hx + 2.6)},-18.4 ${f(hx + 2.6)},-21.4 Z`;
  const cap = (y) => shape(`M${f(hx - 3.6)},${f(y)} L${f(hx + 3.6)},${f(y)} L${f(hx + 3.2)},${f(y + 1.6)} L${f(hx - 3.2)},${f(y + 1.6)} Z`, C.trim, 0.6);
  const sand = `M${f(hx - 1.8)},-19.4 L${f(hx + 1.8)},-19.4 L${f(hx)},-16.4 Z M${f(hx - 2.2)},-11.4 C${f(hx - 1)},-13.2 ${f(hx + 1)},-13.2 ${f(hx + 2.2)},-11.4 Z`;
  const hourglass =
    line(`M${f(hx)},-25 L${f(hx)},-23.2`, "#8c96a2", 0.7, 1) +
    `<path d="${glassD}" fill="${mix(c.energy, "#05070c", 0.82)}" stroke="${INK}" stroke-width=".7"/>` +
    line(`M${f(hx - 1.9)},-20.6 C${f(hx - 1.9)},-18.8 ${f(hx - 0.8)},-17.8 ${f(hx - 0.6)},-17`, "#ffffff", 0.4, 0.55) +
    line(`M${f(hx - 3.1)},-21.2 L${f(hx - 3.1)},-10.8 M${f(hx + 3.1)},-21.2 L${f(hx + 3.1)},-10.8`, INK, 1.3, 1) +
    line(`M${f(hx - 3.1)},-21.2 L${f(hx - 3.1)},-10.8 M${f(hx + 3.1)},-21.2 L${f(hx + 3.1)},-10.8`, "#8c96a2", 0.6, 1) +
    // Sand running through, lit from inside.
    `<g filter="url(#glow)" fill="${c.energy}" opacity=".8"><path d="${sand}"/></g>` +
    `<path d="${sand}" fill="${mix(c.energy, "#ffffff", 0.55)}"/>` +
    line(`M${f(hx)},-16 L${f(hx)},-12.6`, mix(c.energy, "#ffffff", 0.55), 0.35, 1) +
    cap(-23.2) +
    cap(-10.8);

  const torso =
    skirts +
    tabard +
    shape(cowl, C.base, 1) +
    `<path d="${cowl}" fill="url(#weave)" opacity=".5"/>` +
    line("M-11.4,-66.4 C-6,-62.8 6,-62.8 11.4,-66.4", "#000000", 0.7, 0.45) +
    line("M-15.4,-63.8 C-10,-61.4 -4,-61 0,-61", C.hi, 0.5, 0.55) +
    shape(sash, C.lo, 1) +
    line("M-19.2,-26.2 C-10,-27.6 10,-27.6 19.2,-26.2", C.trim, 0.55, 0.85) +
    line("M-19.2,-23.4 C-10,-24.8 10,-24.8 19.2,-23.4", C.trim, 0.55, 0.85) +
    `<circle cx="0" cy="-25" r="3.4" fill="${PAINT}" stroke="${INK}" stroke-width=".7"/>` +
    `<circle cx="0" cy="-25" r="2.2" fill="#07080c" stroke="${INK}" stroke-width=".4"/>` +
    // Sash tails down the left.
    shape("M-10.6,-23 L-7.4,-23 L-7,-6 L-8.8,-8 L-10.8,-6.4 Z", C.lo, 0.8) +
    line("M-10.2,-21.6 L-10.4,-8", C.trim, 0.45, 0.7) +
    `<g transform="translate(0,2.4)">${hourglass}</g>`;

  // Rune gauntlets: a dark plate down the forearm, a flared cuff at the
  // elbow end, runes cut into it that glow with the agent's energy.
  let glow = "";
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { el, wr } = armJoints(arm, s);
      const rot = f(angle(el, wr));
      const plate = muscle(lerp(el, wr, 0.16), lerp(el, wr, 0.96), k(LIMB.FOREARM.out, 1.12), k(LIMB.FOREARM.in, 1.1), s, { fill: STEEL_DK, hi: 0.45, rim: 0.6 });
      const cuff = plateAt(lerp(el, wr, 0.14), el, wr, "M-7.6,-2 C-3,-3 3,-3 7.6,-2 L6.4,3 C2,2.2 -2,2.2 -6.4,3 Z", PAINT, 0.9);
      const band = plateAt(lerp(el, wr, 0.9), el, wr, "M-4.8,-1.4 L4.8,-1.4 L5,1.4 L-5,1.4 Z", PAINT, 0.6);
      let runes = "";
      [0.38, 0.56, 0.74].forEach((t, j) => {
        const at = lerp(el, wr, t);
        const g = RUNES[(j + (s < 0 ? 0 : 3)) % RUNES.length];
        runes += lineAt(at, el, wr, g, "#05070c", 1.2, 0.9);
        glow += energy(`<g transform="translate(${pt(...at)}) rotate(${rot})"><path d="${g}" fill="none" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round"/></g>`, c.energy);
      });
      return plate + lineAt(lerp(el, wr, 0.3), el, wr, `M${f(-s * 4.6)},0 L${f(-s * 3.6)},14`, "#ffffff", 0.5, 0.3) + cuff + band + runes;
    })
    .join("");

  // Chrono light: the crest's centre (the hourglass sand lights itself, so a
  // gun held across it covers it).
  glow += energy(`<circle cx="0" cy="-51" r=".9"/>`, c.energy);
  return { under, legs: "", torso, arms, glow };
}

// ── Hood ───────────────────────────────────────────────────────────────────

function hood(c, K) {
  const C = cloth(c, K.mix);
  // The clock ring floats behind the head.
  const R = 21;
  const cy = -91;
  let ticks = "";
  for (let i = 0; i < 24; i++) {
    const a = (i * 15 * Math.PI) / 180;
    const big = i % 2 === 0;
    const r0 = R - (big ? 2.2 : 1.2);
    ticks += `M${pt(Math.sin(a) * r0, cy - Math.cos(a) * r0)} L${pt(Math.sin(a) * (R - 0.4), cy - Math.cos(a) * (R - 0.4))} `;
  }
  const halo =
    `<circle cx="0" cy="${cy}" r="${R}" fill="none" stroke="${INK}" stroke-width="2.6"/>` +
    `<circle cx="0" cy="${cy}" r="${R}" fill="none" stroke="${C.trim}" stroke-width="1.2"/>` +
    `<circle cx="0" cy="${cy}" r="${R - 2.6}" fill="none" stroke="${INK}" stroke-width=".5" opacity=".7"/>` +
    line(ticks, INK, 0.5, 0.9) +
    // Roman-ish hour marks at the quarters standing proud of the ring.
    [0, 90, -90, 45, -45].map((d) => `<g transform="rotate(${d} 0 ${cy})">${shape(`M-1.2,${f(cy - R - 2.6)} L1.2,${f(cy - R - 2.6)} L0.7,${f(cy - R + 1.6)} L-0.7,${f(cy - R + 1.6)} Z`, PAINT, 0.5)}</g>`).join("");

  // The hood: a peaked cowl that drapes onto the shoulders, deep enough that
  // the face is lost in it.
  const shell =
    "M0,-101.4 C3.4,-100.6 8.6,-98.8 11.6,-94.6 C14.8,-90 15.2,-82 14.4,-76 C13.8,-71.6 15,-67.6 17.4,-64.2 " +
    "C10,-61.6 -10,-61.6 -17.4,-64.2 C-15,-67.6 -13.8,-71.6 -14.4,-76 C-15.2,-82 -14.8,-90 -11.6,-94.6 C-8.6,-98.8 -3.4,-100.6 0,-101.4 Z";
  const opening = "M0,-93.6 C5.4,-93.4 8.8,-89 8.8,-83 C8.8,-77 6.4,-71.6 0,-69.4 C-6.4,-71.6 -8.8,-77 -8.8,-83 C-8.8,-89 -5.4,-93.4 0,-93.6 Z";
  const inside = "M0,-91.6 C4.4,-91.4 7,-87.6 7,-82.8 C7,-77.6 5,-73.2 0,-71.4 C-5,-73.2 -7,-77.6 -7,-82.8 C-7,-87.6 -4.4,-91.4 0,-91.6 Z";
  const eye = (x) => `<path d="M${f(x - 1.7)},-81.4 C${f(x - 0.8)},-82.6 ${f(x + 0.8)},-82.6 ${f(x + 1.7)},-81.8 C${f(x + 0.8)},-81 ${f(x - 0.8)},-80.8 ${f(x - 1.7)},-81.4 Z"/>`;
  const front =
    halo +
    shape(shell, C.base, 1.1) +
    `<path d="${shell}" fill="url(#weave)" opacity=".55"/>` +
    // Light from the left, the right side falling into shade.
    `<path d="M2,-100 C8,-98 12.6,-93 14,-86 C15,-80 14,-74 15.4,-66 L8,-64 C9.6,-72 10.6,-82 9,-90 Z" fill="#000" opacity=".25"/>` +
    line("M-12.6,-90 C-10.4,-96.2 -5.4,-99.6 -0.8,-100.4", C.hi, 0.8, 0.7) +
    line("M14.4,-88 C15.2,-82 14.4,-76 14.6,-72", c.rim, 0.6, 0.7) +
    // Fold lines down to the drape.
    line("M-11.4,-74 C-12.4,-70 -13.8,-67 -16,-64.6 M11.4,-74 C12.4,-70 13.8,-67 16,-64.6 M-4,-67.4 L-5,-63 M4,-67.4 L5,-63", "#000000", 0.6, 0.45) +
    // Rolled trim round the face and the shadowed hollow inside it.
    shape(opening, C.lo, 1) +
    line(opening, INK, 2.4, 1) +
    line(opening, C.trim, 1.1, 1) +
    `<path d="${inside}" fill="#020306"/>` +
    `<path d="M-6.6,-84 C-6,-89.6 -3,-91.4 0,-91.4 C3,-91.4 6,-89.6 6.6,-84 C4,-86.6 -4,-86.6 -6.6,-84 Z" fill="${C.lo}" opacity=".9"/>` +
    // A clasp under the chin with a small crest.
    `<path d="M-2.6,-66.4 L2.6,-66.4 L2,-63 L0,-62 L-2,-63 Z" fill="${PAINT}" stroke="${INK}" stroke-width=".6"/>`;
  const glow =
    energy(eye(-3) + eye(3.2), c.energy) +
    // The halo burns along its upper arc, clear of the hood.
    energy(`<path d="M${pt(-Math.sin(2.1) * R, cy - Math.cos(2.1) * R)} A${R},${R} 0 1 1 ${pt(Math.sin(2.1) * R, cy - Math.cos(2.1) * R)}" fill="none" stroke-width=".5"/>`, c.energy) +
    `<g opacity=".35">${energy(`<circle cx="0" cy="${cy - R}" r=".9"/>`, c.energy)}</g>`;
  return { front, glow };
}

// ── Mantle ─────────────────────────────────────────────────────────────────

function mantle(c, s, K) {
  const C = cloth(c, K.mix);
  const { M, rot, lit } = K;
  // A stiff plate standing up at the neck and sweeping out over the shoulder,
  // its lower edge scalloped; a cloth lining shows under it.
  const lining = "M11.6,-66 C17,-68.2 25,-66.4 30.4,-59.6 C32.6,-56.4 33.2,-52.4 32.4,-49 C27,-51 20,-52 15,-50.6 C15.4,-56 14,-62 11.6,-66 Z";
  const plate =
    "M10.2,-66.4 L11.4,-73.4 C12,-75.6 13.6,-76.4 15.4,-75.6 C17.6,-71.6 22.6,-69.4 28,-67.2 C31.8,-64.4 34,-59.6 33.8,-54.4 " +
    "L31.6,-52.2 L29.4,-54 L26.6,-52.4 L23.8,-54.4 L20.8,-53 L18.4,-55.4 L15.8,-54.6 C15.6,-59 14,-63.4 10.2,-66.4 Z";
  const ridge = "M12.4,-70.6 C16,-68 21.8,-66.6 27.2,-64.4 C30.8,-62.4 32.4,-58.6 32.4,-55.6";
  const glyphs = [
    [17.6, -63.4, 0],
    [22.4, -61.6, 3],
    [27.2, -59, 5],
  ]
    .map(([x, y, g]) => `<g transform="translate(${f(s * x)},${f(y)}) rotate(${f(s * 14)})">${line(RUNES[g], INK, 0.9, 0.8)}${line(RUNES[g], C.trim, 0.45, 0.95)}</g>`)
    .join("");
  // Tassel from the outer tip: cord, a knot bead, a fringe.
  const tx = 32.2;
  const tassel =
    line(M(`M${tx},-53.6 C${tx + 0.6},-50 ${tx + 0.4},-47 ${tx},-45`), INK, 1.4, 1) +
    line(M(`M${tx},-53.6 C${tx + 0.6},-50 ${tx + 0.4},-47 ${tx},-45`), C.trim, 0.7, 1) +
    shape(M(`M${tx - 1.4},-45.6 C${tx - 1.4},-47 ${tx + 1.4},-47 ${tx + 1.4},-45.6 L${tx + 1},-43.4 L${tx - 1},-43.4 Z`), PAINT, 0.6) +
    shape(M(`M${tx - 1},-43.4 L${tx + 1},-43.4 L${tx + 2.2},-35.4 C${tx + 0.6},-34.6 ${tx - 0.6},-34.6 ${tx - 2.2},-35.4 Z`), C.trim, 0.7) +
    line(M(`M${tx - 0.6},-42.6 L${tx - 1.2},-35.6 M${tx},-42.6 L${tx},-35.2 M${tx + 0.6},-42.6 L${tx + 1.2},-35.6`), "#000000", 0.4, 0.4);
  return rot(
    shape(M(lining), C.lo, 0.9) +
      `<path d="${M(lining)}" fill="url(#weave)" opacity=".5"/>` +
      shape(M(plate), PAINT, 1.1) +
      `<path d="${M("M15.8,-54.6 L18.4,-55.4 L20.8,-53 L23.8,-54.4 L26.6,-52.4 L29.4,-54 L31.6,-52.2 L33.8,-54.4 C33.6,-57 33,-59 32,-60.6 C26,-60 20,-59.4 15.6,-58.6 Z")}" fill="#000" opacity=".22"/>` +
      line(M(ridge), INK, 2.6, 0.9) +
      line(M(ridge), "#8c96a2", 1.6, 1) +
      line(M(ridge), "#ffffff", 0.4, lit ? 0.6 : 0.3) +
      line(M("M16.4,-56.6 L18.6,-57.4 L20.8,-55.2 L23.8,-56.6 L26.6,-54.6 L29.4,-56.2 L31.8,-54.6"), C.trim, 0.5, 0.8) +
      line(M("M12.6,-73.6 C13.4,-74.8 14.6,-75 15.2,-74.4"), "#ffffff", 0.6, lit ? 0.8 : 0.4) +
      line(M("M15.2,-72.4 C18.6,-69.2 23,-67.6 27.4,-66"), "#ffffff", 0.5, lit ? 0.55 : 0.25) +
      glyphs +
      `<circle cx="${f(s * 13.2)}" cy="-70.4" r="1.3" fill="${C.trim}" stroke="${INK}" stroke-width=".5"/>` +
      (lit ? "" : line("M33.4,-60 C34.2,-57.6 34.2,-55.8 33.8,-54.6", c.rim, 0.7, 0.85)) +
      tassel,
  );
}

// ── Hand wraps ──────────────────────────────────────────────────────────────

/**
 * Cloth hand wraps in the robe's colours: bound round the palm and the back
 * of the hand and down each finger to the last joint, the fingertips bare,
 * the thread trim across the knuckles, a loose end hanging from the wrist,
 * and a rune cut on the back that glows with the agent's energy.
 */
function wraps(H, c, K) {
  const C = cloth(c, K.mix);
  const skin = c.skin;
  const digit = (F) => {
    const cut = F.len - Math.min(2.2, F.len * 0.3);
    let out =
      K.digit(F, skin.color, { hi: K.mix(skin.color, "#ffffff", 0.45), hiOp: 0.5, crease: skin.shadow, creaseOp: 0.6 }) +
      shape(K.span(F, 0, cut), C.base, 0.6) +
      `<path d="${K.span(F, 0, cut)}" fill="url(#weave)" opacity=".5"/>`;
    // The binding's turns, and its edge at the cut.
    for (let s = 1.6; s < cut - 0.5; s += 1.3) out += line(K.across(F, s, 0.15), C.lo, 0.45, 0.9);
    return out + line(K.across(F, cut - 0.15, 0.15), C.hi, 0.4, 0.8);
  };
  const [w0, w1] = H.back.wrist;
  const kn = H.back.knuckles;
  let turns = "";
  for (const t of [0.22, 0.42, 0.62]) turns += `M${pt(...lerp(w0, kn[0], t + 0.12))}L${pt(...lerp(w1, kn[3], t))}`;
  const [x, y] = lerp(wristMid(H), lerp(kn[1], kn[2], 0.5), 0.5);
  const rune = `<g transform="translate(${pt(x, y)}) scale(.55)"><path d="${RUNES[2]}" fill="none" stroke-width=".6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const a = H.wrist / 2 + 0.5;
  const o = H.out;
  return {
    palm: H.palm ? shape(H.palm.d, C.lo, 0.6) : "",
    back:
      shape(H.back.d, C.base, 0.8) +
      `<path d="${H.back.d}" fill="url(#weave)" opacity=".5"/>` +
      `<path d="${H.back.d}" fill="url(#cyl)"/>` +
      line(turns, C.lo, 0.5, 0.9) +
      line(H.back.ridge, C.trim, 0.4, 0.8) +
      `<g transform="translate(${pt(x, y)}) scale(.55)">${line(RUNES[2], "#05070c", 1.4, 0.9)}</g>`,
    fingers: H.fingers.map(digit),
    thumb: digit(H.thumb),
    cuff:
      shape(`M${f(o * (a - 0.4))},-0.6 C${f(o * (a + 0.8))},0.6 ${f(o * (a + 1.2))},2.4 ${f(o * (a + 0.8))},4.2 L${f(o * (a - 0.4))},3.8 C${f(o * (a + 0.2))},2.4 ${f(o * a)},1 ${f(o * (a - 1.4))},0 Z`, C.base, 0.6) +
      shape(cuffPath(H, -2.8, 0.6, 0.5, 0.5), C.base, 0.7) +
      `<path d="${cuffPath(H, -2.8, 0.6, 0.5, 0.5)}" fill="url(#weave)" opacity=".5"/>` +
      line(cuffLine(H, -1.6, 0.5), C.lo, 0.45, 0.9) +
      line(cuffLine(H, -2.3, 0.5), C.trim, 0.4, 0.8),
    glow: energy(rune, c.energy),
  };
}

export default {
  id: "chronomancer",
  frames: {
    vestment: {
      // A robe over the chest and limbs: no chest kit, trim or limb
      // channels, and it falls where a cape would hang. The cowl lies over
      // the collar plate, which stays.
      shape: { width: 1.02, shoulder: 1, softTorso: true },
      layers: vestment,
    },
  },
  helmets: {
    // The halo rings the hood's peak and the hollow fills its brow, so
    // neither takes gear; lamps, whips and a headset sit on the hood's
    // sides at the eyes. The badge is pinned on the clasp under the chin.
    hood: {
      anchors: { top: -101.4, half: 14.4, rail: -82, badge: { x: 0, y: -64.6, rot: 0, size: 3.6 } },
      paint: hood,
    },
  },
  shoulders: {
    mantle: { paint: mantle },
  },
  gloves: {
    wraps: { paint: wraps },
  },
};
