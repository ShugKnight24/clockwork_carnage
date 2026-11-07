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
  cigar: () => ({
    face:
      fill("M2,-74.4 L7.6,-75.8 L7.8,-74.6 L2.2,-73.4 Z", "#5a3a22", 0.45) +
      stroke("M3.4,-74.6 L3.6,-73.8", BRASS, 0.5) +
      fill("M7.6,-75.8 L8.4,-76 L8.6,-74.8 L7.8,-74.6 Z", "#6a6a6a", 0.35) +
      stroke("M8.6,-76.6 C9.4,-78 8.4,-79.4 9.2,-81 C9.8,-82.4 9,-83.6 9.6,-85", "#d8dde2", 0.4, 0.35),
    glow: dot(8.5, -75.4, 0.6, "#ff7a2a"),
  }),
  nosestrip: () => ({
    face: fill("M-2.8,-79.4 L2.8,-79.6 L2.9,-78.2 L-2.7,-78 Z", "#e8e2d6", 0.4) + stroke("M-1.6,-79.2 L-1.5,-78.2 M0,-79.3 L0.1,-78.2 M1.6,-79.4 L1.7,-78.3", "#b8b0a2", 0.3),
  }),
  piercings: () => {
    const metal = "#d6dde5";
    return {
      face:
        stroke("M3.4,-85.4 L5,-84.2", INK, 0.7) +
        dot(3.4, -85.4, 0.45, metal) +
        dot(5, -84.2, 0.45, metal) +
        `<circle cx="1.6" cy="-73" r=".9" fill="none" stroke="${INK}" stroke-width=".7"/><circle cx="1.6" cy="-73" r=".9" fill="none" stroke="${metal}" stroke-width=".35"/>`,
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
    const mouth = "M-2.4,-74.6 C-1,-75 1,-75 2.4,-74.6 C1.2,-73.2 -1.2,-73.2 -2.4,-74.6 Z";
    return {
      face:
        `<path d="${beard}" fill="${hair}" opacity=".88"/>` +
        `<path d="${mouth}" fill="${mix(c.skin.shadow, "#a04040", 0.3)}"/>` +
        stroke("M-2.6,-74.6 C-1.2,-74.1 1.2,-74.1 2.6,-74.6", INK, 0.45, 0.8) +
        stroke("M-4.6,-73.6 C-2,-71.4 2,-71.4 4.6,-73.6", mix(hair, "#ffffff", 0.3), 0.35, 0.5),
    };
  },
};
