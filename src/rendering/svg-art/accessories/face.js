/**
 * Eyes and face slots (FACE_SLOTS in src/data/accessories.js). Drawn in head
 * space on the face itself (agent-rig.js face(): eyes at y -81.6, x -3 and
 * 3.2; brows near -84.4; nose -80..-76; mouth -74; cheeks out to x ±7.2),
 * returned as `face`, with lights in `glow` (the rig blooms them). Paint that
 * lies on the skin itself (a scar, freckles, war paint) is returned as `skin`
 * instead: the rig draws it first, under the eyewear and the rest, and clips
 * it to the face's own outline for the build, so no stroke of it can leave
 * the face whatever its numbers. Draw skin paint to end inside the cheek all
 * the same; the clip is a guard, not a shape. The rig draws them only where
 * the face shows and the helmet leaves the slot room (its entry's faceSlots),
 * shaped to the feminine jaw like the face under them (every "x,y" pair is
 * narrowed, so draw with paths, not circles or arcs, where the fit matters).
 * Like every painter, an id comes from K.uid and its markup goes to K.defs.
 */

import { hexRgb, mixHex as mix } from "../../../utils/color.js";
import { accessoryItem } from "../../../data/accessories.js";
import { beardMouthOf, cigarAt, lipRingAt } from "../expressions.js";

const f = (n) => Math.round(n * 100) / 100;
const INK = "#0a0d12";
const BRASS = "#c9a24a";
const stroke = (d, color, w, op = 1) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fill = (d, color, sw = 0.5, extra = "") => `<path d="${d}" fill="${color}" stroke="${INK}" stroke-width="${f(sw)}" stroke-linejoin="round"${extra}/>`;
const dot = (x, y, r, color, sw = 0) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}"${sw ? ` stroke="${INK}" stroke-width="${f(sw)}"` : ""}/>`;

/** Relative brightness of a hex colour, 0 (black) to 1 (white). */
const lum = (hex) => {
  const [r, g, b] = hexRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** A teardrop lens round an eye, on side s (-1 left, 1 right). */
const tear = (s) =>
  `M${f(s * 0.9)},-83.2 C${f(s * 3)},-83.8 ${f(s * 5.8)},-83.8 ${f(s * 6.6)},-82.8 C${f(s * 7)},-80.6 ${f(s * 6)},-78.4 ${f(s * 4)},-78.2 C${f(s * 2)},-78.2 ${f(s * 0.9)},-79.6 ${f(s * 0.8)},-81.4 Z`;

/** The eyepatch's straps: over the brow to the right temple, and back over the left ear. */
const EYEPATCH_STRAP = "M-0.9,-83.5 C0,-85.3 1.2,-86.8 2.8,-87.4 C4.2,-87.9 5.9,-88 7.4,-87.5 M-5.7,-82.6 L-7.3,-83.6";

/** Eyewear. */
export const EYES = {
  aviators: () => {
    const lens = (s) => fill(tear(s), "#2a2218", 0.55, ' fill-opacity=".92"') + stroke(`M${f(s * 1.6)},-82.6 C${f(s * 3)},-83 ${f(s * 4.4)},-83 ${f(s * 5.6)},-82.4`, "#fff3d0", 0.45, 0.6);
    return {
      face:
        lens(-1) +
        lens(1) +
        stroke("M-0.9,-82.4 C-0.4,-83 0.4,-83 0.9,-82.4", BRASS, 0.55) +
        stroke(`${tear(-1).replace(" Z", "")} M${tear(1).slice(1).replace(" Z", "")}`, BRASS, 0.4, 0.9) +
        stroke("M-6.6,-82.8 L-7.4,-83 M6.6,-82.8 L7.4,-83", BRASS, 0.5),
    };
  },
  shades: (A, c) => {
    const band = "M-7.2,-83.6 C-3,-84.6 3,-84.6 7.2,-83.6 L7,-80.6 C4,-79.2 1.6,-79.6 0,-80.2 C-1.6,-79.6 -4,-79.2 -7,-80.6 Z";
    return {
      face: fill(band, mix(c.energy, "#05080c", 0.7), 0.6) + stroke("M-6.4,-83 C-3,-83.8 0,-83.8 2.6,-83.4", "#ffffff", 0.45, 0.5),
      glow: stroke("M-6.6,-81.6 C-3,-82 3,-82 6.6,-81.6", c.energy, 0.5, 0.7),
    };
  },
  // The patch over the left eye. Its strap runs from the patch's top inner
  // corner up across the forehead, above the right brow (the feminine brow
  // arches to -86.1), to the right temple, and a short one from its outer
  // edge back over the left side of the head, above the ear: neither comes
  // near the right eye or brow.
  eyepatch: () => ({
    face:
      stroke(EYEPATCH_STRAP, INK, 1.1) +
      stroke(EYEPATCH_STRAP, "#1e1b18", 0.6) +
      fill("M-5.6,-83.4 C-4,-84.6 -1.8,-84.4 -0.8,-83 C-0.6,-81 -1.4,-79.2 -3.2,-78.8 C-5,-79 -6,-80.8 -5.6,-83.4 Z", "#16130f", 0.6) +
      stroke("M-4.6,-83.2 C-3.6,-83.8 -2.2,-83.8 -1.6,-83.2", "#4a443c", 0.4, 0.8),
  }),
  cybereye: (A, c) => ({
    face:
      fill("M0.9,-84.8 L5.8,-85 L6.8,-81.8 L5.6,-78.6 L1.2,-78.6 L0.4,-81.6 Z", "#2a3038", 0.55) +
      dot(3.2, -81.7, 1.9, "#05080c", 0.45) +
      stroke("M5.8,-85 L7.2,-86.2 M6.8,-81.8 L7.6,-81.8", "#5a6470", 0.45),
    glow: dot(3.2, -81.7, 1.2, c.energy) + dot(3.2, -81.7, 0.5, "#ffffff"),
  }),
  // A brass ring over the right eye, its glass catching the light from the
  // top left (a gradient of its own, under a scoped id), and its chain.
  monocle: (A, c, K) => {
    const glass = K.uid("glass");
    K.defs(
      `<radialGradient id="${glass}" cx=".35" cy=".3" r=".8">` +
        `<stop offset="0" stop-color="#ffffff" stop-opacity=".45"/>` +
        `<stop offset=".5" stop-color="#cfe6ff" stop-opacity=".12"/>` +
        `<stop offset="1" stop-color="#cfe6ff" stop-opacity=".28"/></radialGradient>`,
    );
    return {
      face:
        `<circle cx="3.1" cy="-81.7" r="2.4" fill="url(#${glass})" stroke="${BRASS}" stroke-width=".6"/>` +
        stroke("M2,-83.2 C2.8,-83.6 3.8,-83.6 4.4,-83", "#ffffff", 0.35, 0.7) +
        stroke("M4.8,-80 C6.2,-77 6.8,-74 6.4,-70.6", BRASS, 0.35, 0.9),
    };
  },
};

/**
 * Where the brow bar goes on each build's face (agent-rig.js face() and
 * EYE): its two beads, above and below the outer right brow. The lip ring's
 * point on the lower lip follows the expression (lipRingAt).
 */
const PIERCE = {
  masc: { brow: ["4.4,-85.35", "4.75,-83.75"] },
  fem: { brow: ["4.4,-85.95", "4.75,-84.35"] },
};

/**
 * The cigar: its body, band, ash and smoke, and its lit tip, each point
 * passed through `at` (the body, turned with the mouth) or `rise` (the
 * smoke, which only moves: smoke rises whatever the cigar does).
 */
function cigarArt(at, rise) {
  const d = (pts, close = true) => `M${pts.map(([x, y]) => at(x, y)).join(" L")}${close ? " Z" : ""}`;
  const smoke = [[4.2, -73.1], [4.8, -73.9], [3.9, -74.6], [4.4, -75.5], [4.8, -76.2], [4.2, -76.8], [4.5, -77.5]].map(([x, y]) => rise(x, y));
  return {
    face:
      fill(d([[2.29, -74.49], [3.92, -72.86], [3.14, -72.08], [1.51, -73.71]]), "#5a3a22", 0.45) +
      stroke(d([[2.64, -74.14], [1.86, -73.36]], false), BRASS, 0.5) +
      fill(d([[3.92, -72.86], [4.31, -72.47], [3.53, -71.69], [3.14, -72.08]]), "#6a6a6a", 0.35) +
      stroke(`M${smoke[0]} C${smoke[1]} ${smoke[2]} ${smoke[3]} C${smoke[4]} ${smoke[5]} ${smoke[6]}`, "#d8dde2", 0.4, 0.35),
    glow: `<path d="M${at(3.92, -72.08)} L${at(3.92, -72.08)}" stroke="#ff7a2a" stroke-width=".9" stroke-linecap="round"/>`,
  };
}

/** Everything else worn on the face. */
export const FACE = {
  scar: (A, c) => {
    const d = "M2.2,-86.4 L3.4,-83.8 L3.2,-82.6 M3.6,-80.4 L4.6,-77.6 L5.4,-76.4";
    return { skin: stroke(d, mix(c.skin.shadow, "#7a2a28", 0.35), 0.75, 0.9) + stroke(d, mix(c.skin.color, "#ffffff", 0.35), 0.25, 0.7) };
  },
  // Two stripes under each eye in the player's paint (c.tints.face; its
  // default for a look resolved without one), never the suit's colours.
  // Each stripe is edged against the skin under it, not the paint: dark on
  // light skin and light on deep skin, so any paint reads on any face, even
  // one close to the skin's own colour (the edge then thickens, since the
  // paint alone no longer parts it from the skin). The lower stripe is
  // thinner, as if dragged by two fingers. Each runs out from beside the
  // nose and tapers to a point on the cheekbone, short of the cheek's edge
  // (x 7.2), the way a fingertip lifts off.
  warpaint: (A, c) => {
    const paint = c.tints?.face ?? accessoryItem("face", "warpaint").tint.default;
    const skin = lum(c.skin.color);
    const edge = skin > 0.42 ? mix(c.skin.shadow, "#000000", 0.55) : mix(c.skin.color, "#ffffff", 0.55);
    const width = Math.abs(skin - lum(paint)) < 0.3 ? 0.5 : 0.32;
    // A stripe on side s from its inner end at (1.8, y), t thick, its tip at x `tip`.
    const stripe = (s, y, t, tip) =>
      `M${f(s * 1.8)},${f(y)} C${f(s * 3.4)},${f(y - 0.45)} ${f(s * (tip - 1.4))},${f(y - 0.75)} ${f(s * tip)},${f(y - 0.6)} ` +
      `C${f(s * (tip - 1.8))},${f(y - 0.6 + t * 0.5)} ${f(s * 3.4)},${f(y + t)} ${f(s * 2)},${f(y + t * 0.9)} Z`;
    const band = (d, op) => `<path d="${d}" fill="${paint}" stroke="${edge}" stroke-width="${width}" stroke-linejoin="round" opacity="${op}"/>`;
    return {
      skin: [-1, 1].map((s) => band(stripe(s, -79.8, 1.5, 5.9), ".92") + band(stripe(s, -77.7, 1.1, 5.5), ".85")).join(""),
    };
  },
  // A short cigar drooping from the right corner of the mouth, its lit tip
  // over the chin and neck: clear of every cut that frames the face (the
  // long cut's locks start at x 6.2, the back hair beside the neck at 4.5).
  // A thin wisp of smoke rises over the cheek, not into the hair. It follows
  // the expression (cigarAt): gripped in the right corner wherever a closed
  // mouth or a grin puts it; a mouth too open to grip it (the shout, the
  // shocked O) leaves it stuck to the lower lip, hanging steeper.
  cigar: (A, c) => {
    const pose = cigarAt(c);
    if (!pose) return cigarArt((x, y) => `${f(x)},${f(y)}`, (x, y) => `${f(x)},${f(y)}`);
    const { move, turn, about } = pose;
    const [cos, sin] = [Math.cos((turn * Math.PI) / 180), Math.sin((turn * Math.PI) / 180)];
    const turned = (x, y) => [about[0] + (x - about[0]) * cos - (y - about[1]) * sin, about[1] + (x - about[0]) * sin + (y - about[1]) * cos];
    const at = (x, y) => {
      const [tx, ty] = turned(x, y);
      return `${f(tx + move[0])},${f(ty + move[1])}`;
    };
    // The smoke leaves the lit tip, wherever the turn has taken it.
    const [tipX, tipY] = turned(3.92, -72.08);
    const rise = (x, y) => `${f(x + tipX - 3.92 + move[0])},${f(y + tipY + 72.08 + move[1])}`;
    return cigarArt(at, rise);
  },
  nosestrip: () => ({
    face: fill("M-2.8,-79.4 L2.8,-79.6 L2.9,-78.2 L-2.7,-78 Z", "#e8e2d6", 0.4) + stroke("M-1.6,-79.2 L-1.5,-78.2 M0,-79.3 L0.1,-78.2 M1.6,-79.4 L1.7,-78.3", "#b8b0a2", 0.3),
  }),
  // A bar through the outer right brow, a bead showing above and below it,
  // and a ring through the lower lip: it leaves the lip at two points and
  // only its lower loop shows, the rest inside the lip. Placed on each
  // build's own brow and lip (the feminine brow arches higher, her lower lip
  // is fuller), the lip as the expression sets it (lipRingAt), before the
  // jaw's warp narrows them with the face.
  piercings: (A, c) => {
    const metal = "#d6dde5";
    const { brow } = c.fem ? PIERCE.fem : PIERCE.masc;
    const [x, y] = lipRingAt(c);
    const ring = `M${f(x - 0.55)},${f(y)} C${f(x - 0.6)},${f(y + 1.35)} ${f(x + 0.6)},${f(y + 1.35)} ${f(x + 0.55)},${f(y)}`;
    const bead = ([bx, by]) => `M${bx},${by} L${bx},${by}`;
    return {
      face:
        stroke(`M${brow[0]} L${brow[1]}`, INK, 0.7) +
        stroke(`${bead(brow[0].split(","))} ${bead(brow[1].split(","))}`, INK, 1.2) +
        stroke(`${bead(brow[0].split(","))} ${bead(brow[1].split(","))}`, metal, 0.8) +
        stroke(ring, INK, 0.7) +
        stroke(ring, metal, 0.35),
    };
  },
  freckles: (A, c) => {
    const tone = mix(c.skin.shadow, "#5a3a22", 0.4);
    const pts = [[-5, -78.6], [-4, -79.4], [-3.2, -78.2], [-2.2, -79], [-1.4, -79.8], [1.4, -79.8], [2.2, -79], [3.2, -78.2], [4, -79.4], [5, -78.6], [-4.4, -77.6], [4.4, -77.6]];
    // Dots as round-capped strokes of no length, so they narrow with the feminine jaw.
    return { skin: `<path d="${pts.map(([x, y]) => `M${x},${y} L${x},${y}`).join(" ")}" stroke="${tone}" stroke-width=".64" stroke-linecap="round" opacity=".7"/>` };
  },
  beard: (A, c) => {
    const hair = c.hair.color;
    const beard =
      "M-6.9,-79 C-6.6,-76 -5.4,-73.4 -3.6,-72 C-2.2,-70.8 -1,-70.4 0,-70.4 C1,-70.4 2.2,-70.8 3.6,-72 C5.4,-73.4 6.6,-76 6.9,-79 " +
      "C6,-77 5,-75.8 3.6,-75.6 C2.4,-75.4 1.6,-76.4 0,-76.4 C-1.6,-76.4 -2.4,-75.4 -3.6,-75.6 C-5,-75.8 -6,-77 -6.9,-79 Z";
    return {
      face:
        `<path d="${beard}" fill="${hair}" opacity=".88"/>` +
        // The mouth through the beard, in the expression the face shows.
        beardMouthOf(c, INK) +
        stroke("M-4.6,-73.6 C-2,-71.4 2,-71.4 4.6,-73.6", mix(hair, "#ffffff", 0.3), 0.35, 0.5),
    };
  },
};
