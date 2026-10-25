/**
 * ARIA, the suit AI, as the suit's emitter projects her: a three-quarter
 * figure of light (crown to mid-thigh) standing in the projection cone, in a
 * fitted flight suit, one hand raised with a data glyph turning over the palm.
 *
 * Hologram language, each in its own layer so the canvas animates them
 * without a re-bake: a dark core so she survives bright backdrops, the
 * painted figure, a red/blue chromatic fringe off her edges, a soft rim glow,
 * scanlines inside her silhouette, glitch slices, rising data motes. Her
 * lower body dissolves into dropout bands before it reaches the emitter.
 *
 * Same box and layer count as the bust she replaces, so every frame that
 * shows "aria" (cutscenes, the flipbook, the HUD projection) frames her the
 * same way. Art units; the emitter's lens sits at y = +41.
 */

import { INK, r1, lin, rad, blur, at, mir, limb, headPath, faceDefs, face, lightDefs, formLight, fold } from "./kit.js";

const LINE = "#0a3a52"; // her "ink": deep teal, never black
const HX = 0;
const HY = -73; // head centre
const HS = 1.32; // head scale: crown -86, chin -60
const TILT = -4; // a slight tilt toward the viewer's left: attentive, not stiff

const ARIA_FACE = {
  skin: ["#dcfcff", "#5cc6e0", "#0b4260"],
  ink: LINE,
  inkW: 0.42,
  lid: "#032a40",
  white: "#f0ffff",
  iris: "#14d8f0",
  browC: "#0a4a66",
  browL: "soft",
  browR: "arch",
  look: [0.38, 0.05],
  lip: ["#9fe2f2", "#4aa4c2"],
  lipLine: "#0a3a52",
  blush: "#a8b8ff",
  terminator: "#3a7cff",
  lashes: true,
  mouth: "soft",
  rim: "#dcffff",
  neck: 3.1,
  neckLen: 14,
  tilt: TILT,
};

/** Head-local point (as face() draws it) to art units. */
function headPt(x, y) {
  const a = (TILT * Math.PI) / 180;
  const dy = y - 6;
  const rx = x * Math.cos(a) - dy * Math.sin(a);
  const ry = x * Math.sin(a) + dy * Math.cos(a) + 6;
  return [HX + rx * HS, HY + ry * HS];
}

// ── Hair: a side-swept bob sculpted out of light ──────────────────────────
// Parted on her left (screen right), swept across the brow and falling past
// the jaw on the other side; the short side tucked behind the ear.

const HAIR_BACK =
  "M-8.2,-2 C-9.6,-10.6 -4.8,-13.2 0.4,-13 C6,-12.8 9.4,-9.4 8.4,-2.6 C8.8,0.6 8.4,3.2 7.6,4.8 " +
  "L5.2,4.4 L5,0 L-5,0 L-6,8 C-7,10.6 -8.6,12 -9.8,12.4 C-9.4,7.8 -8.8,2.6 -8.2,-2Z";
const HAIR_FRONT =
  "M2.6,-11.9 C6.4,-11.6 8.6,-8.8 8.1,-3.2 C7.6,-5.6 6.6,-7.4 4.8,-8.2 C3.6,-7 2.4,-6.4 1.2,-6.2 " +
  "C-1.6,-5.6 -4.2,-3.8 -5.4,-1 C-6.2,1.4 -6.2,4.6 -5.6,7.6 C-6.2,9.6 -7.4,11 -9,11.8 " +
  "C-8.6,9 -8.8,6 -8.4,2.2 C-8.6,-3.6 -8,-8.6 -4.4,-11 C-2,-12.4 0.4,-12.2 2.6,-11.9Z";

function hair() {
  const back =
    `<path d="${HAIR_BACK}" fill="url(#ahb)" stroke="${LINE}" stroke-width="0.4"/>` +
    `<path d="M-8.8,2 C-8.6,6 -9,9.6 -9.6,12 M7.8,-1 C8.2,1 8,3 7.4,4.4" fill="none" stroke="#7ff4ff" stroke-width="0.3" opacity="0.6"/>`;
  const front =
    `<path d="${HAIR_FRONT}" fill="url(#ahr)" stroke="${LINE}" stroke-width="0.42" stroke-linejoin="round"/>` +
    // the sweep: strands of light following the flow, brightest along the crown
    `<path d="M2.2,-11.4 C-1.6,-11 -5.4,-8.6 -6.8,-3.6 C-7.6,0.6 -7.4,5.4 -7.8,10.2" fill="none" stroke="#c8ffff" stroke-width="0.5" opacity="0.8" stroke-linecap="round"/>` +
    `<path d="M3.4,-10.4 C0,-9.8 -3.4,-7.8 -5,-4 C-6,-1.4 -6.6,2.6 -6.6,7 M4.6,-9.2 C1.6,-8.4 -1.6,-7 -3.6,-4.6 M1.2,-11 C-2.2,-10.4 -5.6,-7.2 -6.2,-3.6 C-6.8,0 -6.8,4 -7,8.6" fill="none" stroke="#8ff6ff" stroke-width="0.26" opacity="0.7" stroke-linecap="round"/>` +
    `<path d="M3,-11.6 C5.8,-11 7.6,-8.6 7.7,-4.6 M4,-10.6 C6,-9.6 7,-7.6 7.2,-5.4" fill="none" stroke="#8ff6ff" stroke-width="0.26" opacity="0.6" stroke-linecap="round"/>` +
    `<path d="M-4.6,-4.4 C-3,-6 -0.6,-6.6 1.6,-6.6" fill="none" stroke="#06283a" stroke-width="0.5" opacity="0.6" stroke-linecap="round"/>` +
    // the parting: a seam of brighter light
    `<path d="M2.6,-11.9 C2.8,-10.2 2.4,-8.4 1.6,-6.8" fill="none" stroke="#e8ffff" stroke-width="0.3" opacity="0.7"/>` +
    // the tip breaks into pixels where the projection loses it
    `<g fill="#bfffff"><rect x="-9.6" y="12.6" width="0.7" height="0.7" opacity="0.8"/><rect x="-8.4" y="13.8" width="0.5" height="0.5" opacity="0.6"/><rect x="-10.2" y="14.6" width="0.45" height="0.45" opacity="0.45"/><rect x="-9.2" y="16" width="0.35" height="0.35" opacity="0.3"/></g>`;
  // earpiece on the tucked side, its lead tracing the temple; a circuit trace
  // of light at the hairline says she is rendered, not born
  const over =
    `<rect x="7.2" y="-1.6" width="1.9" height="3.8" rx="0.95" fill="url(#ast)" stroke="${LINE}" stroke-width="0.3"/>` +
    `<circle cx="8.15" cy="0.1" r="0.45" fill="#bfffff"/>` +
    `<path d="M8.2,2.2 C7.8,4.4 6.6,5.6 4.8,6.2" fill="none" stroke="#2a9ec0" stroke-width="0.35"/><circle cx="4.6" cy="6.25" r="0.35" fill="#bfffff"/>` +
    `<path d="M6.4,-4.2 L6.9,-3.4 L6.9,-2.2 M5.8,-3.6 L6.1,-3.1" fill="none" stroke="#c8ffff" stroke-width="0.18" opacity="0.6"/>`;
  return { back, front: front + over };
}

// ── Body ──────────────────────────────────────────────────────────────────

const TORSO =
  "M4.6,-58.4 C8.6,-57 12.6,-56 15.6,-54.4 C17.6,-53.2 18.6,-50.6 18.4,-47 C18,-44 16,-42.4 14.8,-41 " +
  "C15.4,-37 14.6,-32.6 13.2,-29 C11.8,-25.6 10.6,-22.6 10.6,-19.4 C10.8,-14 13.2,-9.6 14.4,-4 C14.8,0 14.6,4 14,8 " +
  "C9,9.4 4,10.6 0,11 C-4,10.6 -9,9.4 -14,8 C-14.6,4 -14.8,0 -14.4,-4 C-13.2,-9.6 -10.8,-14 -10.6,-19.4 " +
  "C-10.6,-22.6 -11.8,-25.6 -13.2,-29 C-14.6,-32.6 -15.4,-37 -14.8,-41 C-16,-42.4 -18,-44 -18.4,-47 " +
  "C-18.6,-50.6 -17.6,-53.2 -15.6,-54.4 C-12.6,-56 -8.6,-57 -4.6,-58.4Z";
const THIGH = "M0.8,4 C5,6 10,6 14,5 C14.6,14 13.6,25 12.2,38 L2.6,38 C2.2,28 1.4,16 0.8,4Z";
// her right arm (screen left) at rest, her left raised with the palm up
const ARM_REST = limb([[-16.4, -51.4, 8.4], [-18.8, -40, 7], [-20.2, -28, 6], [-20.4, -18, 5.4], [-19.6, -8.6, 4.4]]);
const ARM_UP = limb([[16.4, -51.4, 8.4], [19.6, -40, 7], [21.8, -30.4, 6.2]]);
const FORE_UP = limb([[21.6, -29.4, 6], [24.8, -37.8, 5.1], [27.4, -44.6, 4.3]]);
const HAND_REST =
  "M-21.6,-8.6 C-22.2,-5.4 -22,-2.2 -20.8,0.2 C-19.8,1.4 -18.2,1.2 -17.8,-0.2 C-17.6,-3 -17.4,-6 -17.6,-8.6Z";
const HAND_UP =
  "M25.4,-44.4 C26.8,-47.2 29.8,-48.8 33.4,-48.6 C35,-48.4 35.6,-47.4 34.8,-46.8 C32.6,-45.6 30.6,-44.6 29,-43.2 C28,-42.4 26.4,-42.2 25.4,-44.4Z";
const THUMB_UP = "M27.8,-46.4 C27.2,-48.6 28,-50.2 29.4,-50 C30.2,-49.4 30,-48.2 29.6,-47.2Z";

function suit() {
  const st = `stroke="${LINE}" stroke-width="0.6" stroke-linejoin="round"`;
  let s = "";
  // legs, then the arm behind the hip, the torso, the raised arm in front
  s += `<path d="${THIGH}" fill="url(#asl)" ${st}/><path d="${mir(THIGH)}" fill="url(#asl)" ${st}/>`;
  s += `<path d="M11.4,10 C12,18 11.4,26 10.4,34 M-11.4,10 C-12,18 -11.4,26 -10.4,34" fill="none" stroke="#c8ffff" stroke-width="0.4" opacity="0.5"/>`;
  s += `<path d="M3,12 C3.4,20 3.6,28 3.6,36 M-3,12 C-3.4,20 -3.6,28 -3.6,36" fill="none" stroke="#03202e" stroke-width="0.8" opacity="0.45"/>`;
  s += `<path d="M5,18 L12.6,17.4 L12.2,24 L5.2,24.6Z M-5,18 L-12.6,17.4 L-12.2,24 L-5.2,24.6Z" fill="#0b3c54" fill-opacity="0.6" stroke="#7ff4ff" stroke-width="0.3" stroke-opacity="0.6"/>`;
  s += `<path d="${ARM_REST}" fill="url(#asa)" ${st}/>`;
  s += `<path d="${HAND_REST}" fill="url(#afsk)" stroke="${LINE}" stroke-width="0.45"/>`;
  s += `<path d="M-21.4,-4 C-21.8,-2 -21.4,-0.4 -20.6,0.6 M-17.8,-6.4 C-16.8,-5.4 -16.6,-3.8 -17.2,-2.6" fill="none" stroke="#0f4c68" stroke-width="0.3" opacity="0.7"/>`;
  s += `<path d="M-22.2,-9.4 L-17.2,-9.4 L-17,-7.6 L-22.4,-7.6Z" fill="#9ff6ff" fill-opacity="0.7" stroke="${LINE}" stroke-width="0.3"/>`;
  s += `<path d="${TORSO}" fill="url(#asu)" ${st}/>`;
  s += formLight("al", "altc", TORSO, [-20, -60, 40, 72]);
  // shoulder yoke panels, lighter, piped
  const yoke = "M4.8,-57.8 C9,-56.4 13,-55.4 15.8,-53.8 C17.8,-52.6 18.6,-50.4 18.4,-47.4 C14.6,-47.2 10.8,-48.6 8.4,-51 C6.8,-52.8 5.6,-55.2 4.8,-57.8Z";
  s += `<path d="${yoke}" fill="#8ff0ff" fill-opacity="0.32" stroke="#bfffff" stroke-width="0.35"/><path d="${mir(yoke)}" fill="#8ff0ff" fill-opacity="0.45" stroke="#bfffff" stroke-width="0.35"/>`;
  // bust and ribcage: the form, said with folds rather than outline
  s += fold("M-12.8,-37 C-10,-32.2 -5,-31.8 -1.6,-34.8", { dark: "#03202e", lit: "#bfffff", op: 0.3 });
  s += fold("M1.8,-34.8 C5,-31.8 10,-32.2 12.8,-37", { dark: "#03202e", lit: "#bfffff", op: 0.38 });
  s += fold("M-10.4,-22 C-8.6,-24.4 -7.6,-27 -7.6,-29.4 M10.2,-21.6 C8.8,-24 8,-26.6 8,-29", { dark: "#03202e", lit: "#9ff6ff", op: 0.4, w: 0.8 });
  // asymmetric closure from her right collar to the left hip, piped in light
  const zip = "M-3.6,-57.4 C-1.2,-48 3.8,-36 6,-24.6 C7.2,-17 8.2,-10.4 9.4,-2.8";
  s += `<path d="${zip}" fill="none" stroke="#03202e" stroke-width="1.3" opacity="0.6"/><path d="${zip}" fill="none" stroke="#c8ffff" stroke-width="0.45" transform="translate(-0.5 0)"/>`;
  s += [-50, -41, -32, -23, -14].map((y, i) => `<path d="M${r1(-2.4 + i * 2.4)},${y} l1.4,0.4" stroke="#bfffff" stroke-width="0.35" opacity="0.7"/>`).join("");
  // belt: a band of light with a buckle off-centre
  s += `<path d="M-11,-16.4 C-4,-14.8 4,-14.8 11,-16.4 L11.4,-12.6 C4,-11 -4,-11 -11.4,-12.6Z" fill="#0b3c54" fill-opacity="0.7" stroke="#9ff6ff" stroke-width="0.35"/>`;
  s += `<rect x="5.4" y="-16" width="4" height="3.6" rx="0.6" fill="#dcffff" fill-opacity="0.85" stroke="${LINE}" stroke-width="0.3"/><rect x="6.4" y="-15.1" width="2" height="1.8" rx="0.3" fill="#0b3c54"/>`;
  // hip seams and the panel lines that make it a flight suit
  s += `<path d="M-13.6,-6 C-9,-3.6 -5,-2.4 0,-2 M13.6,-6 C10.6,-4.4 9.4,-3.4 9.4,-2.8" fill="none" stroke="#7ff4ff" stroke-width="0.35" opacity="0.6"/>`;
  s += `<path d="M-14.6,-40 C-12,-38 -12.2,-34 -13.2,-29 M14.4,-40 C12,-38 12.2,-34 13.2,-29" fill="none" stroke="#7ff4ff" stroke-width="0.3" opacity="0.5"/>`;
  s += fold("M-9.6,-8 C-7,-5.6 -3.4,-5 -0.6,-5.6", { dark: "#03202e", lit: "#9ff6ff", op: 0.4, w: 0.8 });
  // insignia over her heart (screen right): the suit AI's mark
  s += `<g transform="translate(10.2 -46.6) rotate(-8)"><circle r="2.4" fill="#0b3c54" fill-opacity="0.7" stroke="#bfffff" stroke-width="0.35"/><path d="M-1.4,0.9 L0,-1.4 L1.4,0.9 M-0.7,0.2 L0.7,0.2" fill="none" stroke="#e8ffff" stroke-width="0.4" stroke-linejoin="round"/></g>`;
  s += `<path d="M7.6,-42 L13.2,-42.6 M7.6,-40.6 L11.4,-41" stroke="#9ff6ff" stroke-width="0.35" opacity="0.7"/>`;
  // high collar, open at the throat
  const collar = "M-5.2,-62.6 C-6.4,-60.8 -7,-59.2 -7.4,-57.2 L-3.4,-55.8 L-2.8,-58.8Z";
  s += `<path d="${collar}" fill="url(#asa)" stroke="${LINE}" stroke-width="0.45"/><path d="${mir(collar)}" fill="url(#asa)" stroke="${LINE}" stroke-width="0.45"/>`;
  s += `<path d="M-5.2,-62.4 C-6.2,-60.8 -6.8,-59.2 -7.2,-57.4 M5.2,-62.4 C6.2,-60.8 6.8,-59.2 7.2,-57.4" fill="none" stroke="#dcffff" stroke-width="0.35"/>`;
  // the raised arm, over the torso edge
  s += `<path d="${ARM_UP}" fill="url(#asa)" ${st}/><path d="${FORE_UP}" fill="url(#asa)" ${st}/>`;
  s += fold("M19.4,-32.6 C20.6,-31 21.6,-30.4 23,-30.6", { dark: "#03202e", lit: "#9ff6ff", op: 0.6, w: 0.8 });
  s += `<path d="M14.6,-52.6 C17.4,-51.4 19.4,-46 20.6,-40 M17.6,-50 C19,-46 20.4,-38 21.2,-32" fill="none" stroke="#c8ffff" stroke-width="0.35" opacity="0.6"/>`;
  s += `<path d="M24.4,-42.6 L28.6,-44.6 L29.2,-42.8 L25.2,-40.8Z" fill="#9ff6ff" fill-opacity="0.75" stroke="${LINE}" stroke-width="0.3"/>`;
  s += `<path d="${HAND_UP}" fill="url(#afsk)" stroke="${LINE}" stroke-width="0.45"/><path d="${THUMB_UP}" fill="url(#afsk)" stroke="${LINE}" stroke-width="0.4"/>`;
  s += `<path d="M29.6,-46.6 C31.6,-47.2 33,-47.4 34.2,-47.4 M29.2,-45.4 C31,-46 32.6,-46.2 33.6,-46.2" fill="none" stroke="#0f4c68" stroke-width="0.25" opacity="0.7"/>`;
  return s;
}

// Everything she is, as plain outlines: the dark core, the fringe, the rim
// and the scanline mask all trace this.
const headShapes = (hb, hf) =>
  at(HX, HY, HS, `<g transform="rotate(${TILT} 0 6)">${hb}<path d="${headPath(ARIA_FACE)}"/>${hf}</g><path d="M-3.4,4 L-3.6,14.4 L3.6,14.4 L3.4,4Z"/>`);
const SILHOUETTE =
  `<path d="${THIGH}"/><path d="${mir(THIGH)}"/><path d="${ARM_REST}"/><path d="${HAND_REST}"/><path d="${TORSO}"/>` +
  `<path d="${ARM_UP}"/><path d="${FORE_UP}"/><path d="${HAND_UP}"/><path d="${THUMB_UP}"/>` +
  headShapes(`<path d="${HAIR_BACK}"/>`, `<path d="${HAIR_FRONT}"/>`);

export function ariaModel() {
  const { back, front } = hair();
  const head = face("af", { ...ARIA_FACE, x: HX, y: HY, s: HS, back, front });
  const figure = `<g mask="url(#afm)">${suit()}${head}</g>`;

  const fringe =
    `<g mask="url(#afm)"><g mask="url(#aout)" fill="none" stroke-width="1.4" stroke-linejoin="round">` +
    `<g transform="translate(-0.8 0.2)" stroke="#ff4fd0" opacity="0.5">${SILHOUETTE}</g>` +
    `<g transform="translate(0.8 -0.2)" stroke="#3a6cff" opacity="0.6">${SILHOUETTE}</g></g></g>`;
  // one soft glow and one crisp edge
  const outline =
    `<g mask="url(#afm)"><g fill="none" stroke="#5ff0ff" stroke-width="1.6" stroke-linejoin="round" opacity="0.5" filter="url(#agl2)">${SILHOUETTE}</g>` +
    `<g mask="url(#aout)" fill="none" stroke="#dcffff" stroke-width="0.9" stroke-linejoin="round" opacity="0.8">${SILHOUETTE}</g></g>`;
  // glitch: two thin slices of her, displaced sideways
  const shimmer =
    `<clipPath id="aslc"><rect x="-80" y="-50.6" width="160" height="1.6"/><rect x="-80" y="-31" width="160" height="2.4"/><rect x="-80" y="-4" width="160" height="1.2"/></clipPath>` +
    `<g clip-path="url(#aslc)" transform="translate(2.8 0)" fill="#9ffaff" opacity="0.45">${SILHOUETTE}</g>`;
  let scanD = "";
  for (let y = -88; y <= 40; y += 1.3) scanD += `M-36,${r1(y)}H40`;
  const scan = `<g mask="url(#asm)"><path d="${scanD}" stroke="#dcffff" stroke-width="0.26" opacity="0.26"/></g>`;

  // The cone: the emitter's beam widening up through her, with a few rays.
  const cone =
    `<path d="M-12.6,41 L-40,-30 L40,-30 L12.6,41Z" fill="url(#acn)"/>` +
    `<path d="M-6,41 L-17,-14 L-11,-14 L-2.6,41Z M4,41 L13,-20 L18,-20 L7,41Z M-1,41 L-2,-40 L2,-40 L1.2,41Z" fill="url(#acr)"/>` +
    `<ellipse cx="0" cy="40.6" rx="14" ry="2.4" fill="#8ff8ff" opacity="0.7" filter="url(#agl)"/>` +
    `<ellipse cx="0" cy="36" rx="16" ry="2" fill="none" stroke="#8ff8ff" stroke-width="0.4" opacity="0.5"/>` +
    `<ellipse cx="0" cy="28" rx="18" ry="2.2" fill="none" stroke="#8ff8ff" stroke-width="0.3" opacity="0.35"/>`;
  const ring =
    `<circle cx="0" cy="${HY}" r="20" fill="none" stroke="#5ff0ff" stroke-width="0.5" stroke-dasharray="11 4 2.4 4" opacity="0.4"/>` +
    `<circle cx="0" cy="${HY}" r="23" fill="none" stroke="#5ff0ff" stroke-width="1.3" stroke-dasharray="0.5 2.9" opacity="0.28"/>` +
    `<path d="M-1.8,${HY - 26} L1.8,${HY - 26} L0,${HY - 23.4}Z" fill="#8ff8ff" opacity="0.7"/>`;
  const frame =
    `<path d="M-58,-95 L-72,-34 L-58,24 L58,24 L72,-34 L58,-95Z" fill="#22e6ff" fill-opacity="0.02" stroke="#22e6ff" stroke-width="0.7" stroke-opacity="0.3"/>` +
    `<path d="M-50,-95 L-58,-95 L-61.6,-81 M50,-95 L58,-95 L61.6,-81 M-50,24 L-58,24 L-61.4,10.4 M50,24 L58,24 L61.4,10.4" fill="none" stroke="#8ff8ff" stroke-width="1"/>` +
    `<g transform="translate(-64 -12)" fill="#7ff6ff">` +
    [0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${i * 3}" width="${[9, 14, 6, 11, 8][i]}" height="1.2" opacity="0.5"/>`).join("") +
    `</g>` +
    `<path d="M40,12 L44,12 L45.4,6 L47.4,17 L49.4,3 L51.4,15 L53.4,8 L55,12 L62,12" fill="none" stroke="#8ff8ff" stroke-width="0.6" opacity="0.7"/>`;

  // Motes rising through the cone, the glyph over her palm, her eyes' glow.
  let seed = 5;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  let motes = "";
  for (let i = 0; i < 26; i++) {
    const y = 38 - rnd() * 110;
    const spread = 12 + (38 - y) * 0.24;
    const x = (rnd() - 0.5) * 2 * spread;
    const z = 0.3 + rnd() * 0.6;
    motes += i % 3
      ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(z * 0.6)}" fill="#bfffff" opacity="${r1(0.3 + rnd() * 0.5)}"/>`
      : `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(z)}" height="${r1(z)}" fill="#dcffff" opacity="${r1(0.3 + rnd() * 0.5)}"/>`;
  }
  const glyph =
    `<g transform="translate(31 -56.4)">` +
    `<ellipse cx="0" cy="7.4" rx="5" ry="1.2" fill="#8ff8ff" opacity="0.5" filter="url(#agl2)"/>` +
    `<path d="M-2.6,6.6 L-4,-1 M2.6,6.6 L4,-1" stroke="#8ff8ff" stroke-width="0.3" opacity="0.5"/>` +
    `<path d="M0,-4.4 L3.8,-2.2 L3.8,2.2 L0,4.4 L-3.8,2.2 L-3.8,-2.2Z M0,-4.4 L0,0 L3.8,2.2 M0,0 L-3.8,2.2" fill="#22e6ff" fill-opacity="0.12" stroke="#dcffff" stroke-width="0.4" stroke-linejoin="round"/>` +
    `<circle r="1" fill="#ffffff" filter="url(#agl2)"/></g>`;
  const eyes =
    [-1, 1].map((sx) => {
      const [x, y] = headPt(sx * 3 + ARIA_FACE.look[0], -0.1);
      return `<circle cx="${r1(x)}" cy="${r1(y)}" r="0.9" fill="#bffcff" opacity="0.7" filter="url(#agl2)"/>`;
    }).join("") +
    (() => {
      const [x, y] = headPt(8.15, 0.1);
      return `<circle cx="${r1(x)}" cy="${r1(y)}" r="0.8" fill="#8ffcff" filter="url(#agl2)"/>`;
    })() +
    `<circle cx="10.2" cy="-46.6" r="1.4" fill="#8ffcff" opacity="0.6" filter="url(#agl2)"/>`;

  const projector =
    `<path d="M-19,41 L19,41 L23,47.6 L-23,47.6Z" fill="url(#ast)" stroke="${INK}" stroke-width="1"/>` +
    `<path d="M-23,47.6 L23,47.6 L21.6,50 L-21.6,50Z" fill="#0a1018" stroke="${INK}" stroke-width="0.8"/>` +
    `<path d="M-17.4,44.2 L-12,44.2 M-17.8,45.8 L-12.4,45.8 M12,44.2 L17.4,44.2 M12.4,45.8 L17.8,45.8" stroke="#050a10" stroke-width="0.7"/>` +
    `<ellipse cx="0" cy="40.6" rx="14.4" ry="2.6" fill="#041620" stroke="#22e6ff" stroke-width="0.7"/>` +
    `<ellipse cx="0" cy="40.6" rx="8" ry="1.4" fill="url(#alens)"/>` +
    `<path d="M-18,42.4 L18,42.4" stroke="#b8d8ee" stroke-width="0.4" opacity="0.6"/>` +
    `<circle cx="-16" cy="45" r="0.7" fill="#22e6ff"/><circle cx="16" cy="45" r="0.7" fill="#22e6ff"/>`;
  const backing =
    `<path d="M-58,-95 L-72,-34 L-58,24 L58,24 L72,-34 L58,-95Z" fill="url(#abk)" filter="url(#agl)"/>` +
    `<path d="M-54,-91 L-67,-34 L-54,20 L54,20 L67,-34 L54,-91Z" fill="#02070c" opacity="0.55"/>` +
    `<path d="M-19,41 L19,41 L23,50 L-23,50Z" fill="#000" opacity="0.5" filter="url(#agl)"/>`;

  const float = { type: "float", amp: 1.2, speed: 1.1 };
  return {
    box: [-76, -96, 152, 148],
    defs:
      faceDefs("af", ARIA_FACE) +
      lightDefs("al", { key: "#f0ffff", bounce: "#3a8cff", shade: "#001420", ks: 0.32, ss: 0.6, bs: 0.3 }) +
      lin("ahr", [[0, "#5ad6ee"], [0.35, "#1a7898"], [1, "#05283a"]], 0, 0, 0.8, 1) +
      lin("ahb", [[0, "#0e5a78"], [1, "#021820"]], 0, 0, 1, 1) +
      lin("asu", [[0, "#64d0ea"], [0.4, "#1e84a8"], [1, "#083248"]], 0, 0, 1, 0.5) +
      lin("asa", [[0, "#4ab8d6"], [0.5, "#16698a"], [1, "#062634"]], 0, 0, 1, 0.2) +
      lin("asl", [[0, "#3aa4c4"], [0.6, "#0e4e6a"], [1, "#04202e"]], 0, 0, 1, 0.3) +
      lin("ast", [[0, "#6f8aa3"], [0.4, "#3a4d61"], [1, "#141c26"]], 0, 0, 1, 0.5) +
      lin("acn", [[0, "#22e6ff", 0], [0.5, "#22e6ff", 0.05], [1, "#22e6ff", 0.2]]) +
      lin("acr", [[0, "#bfffff", 0], [0.6, "#bfffff", 0.06], [1, "#bfffff", 0.22]]) +
      rad("alens", [[0, "#ffffff"], [0.5, "#8ff8ff"], [1, "#22e6ff", 0.3]]) +
      rad("abg", [[0, "#22e6ff", 0.1], [1, "#22e6ff", 0]]) +
      rad("abk", [[0, "#01060b", 0.82], [0.75, "#01060b", 0.7], [1, "#01060b", 0.35]]) +
      // she dissolves from the hips down, in bands, before the emitter
      `<linearGradient id="afg" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="38"><stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#9a9a9a"/><stop offset="1" stop-color="#000"/></linearGradient>` +
      `<mask id="afm" maskUnits="userSpaceOnUse" x="-100" y="-120" width="200" height="200"><rect x="-100" y="-120" width="200" height="200" fill="url(#afg)"/>` +
      `<g fill="#000"><rect x="-100" y="14" width="200" height="0.7"/><rect x="-100" y="20" width="200" height="1.3"/><rect x="-100" y="25.4" width="200" height="0.8"/><rect x="-100" y="29" width="200" height="1.8"/><rect x="-100" y="-27" width="200" height="0.4"/><rect x="-100" y="-55.6" width="200" height="0.35"/></g></mask>` +
      `<mask id="aout" maskUnits="userSpaceOnUse" x="-100" y="-120" width="200" height="200"><rect x="-100" y="-120" width="200" height="200" fill="#fff"/><g fill="#000">${SILHOUETTE}</g></mask>` +
      `<mask id="asm" maskUnits="userSpaceOnUse" x="-100" y="-120" width="200" height="200"><g mask="url(#afm)" fill="#fff">${SILHOUETTE}</g></mask>` +
      blur("agl", 2) +
      blur("agl2", 1.2),
    layers: [
      { markup: backing },
      { markup: `<ellipse cx="0" cy="-40" rx="76" ry="82" fill="url(#abg)"/>`, anim: { type: "pulse", min: 0.6, max: 1, speed: 1.3 } },
      { markup: cone, anim: { type: "pulse", min: 0.55, max: 1, speed: 2.1 }, blend: "lighter" },
      { markup: ring, anim: { type: "spin", speed: 0.25, pivot: [0, HY] }, blend: "lighter" },
      { markup: frame, anim: { type: "flicker", min: 0.5, max: 0.9, speed: 0.7 }, blend: "lighter" },
      // Dark core first, then the figure drawn normally: the interior art has
      // to survive, or she is a white cut-out. The additive passes after it
      // are what make her read as projected light.
      { markup: `<g mask="url(#afm)" fill="#01080e">${SILHOUETTE}</g>`, anim: float, opacity: 0.62 },
      { markup: figure, anim: float, opacity: 0.94 },
      { markup: fringe, anim: { ...float, phase: 0.08 }, blend: "lighter", opacity: 0.8 },
      { markup: outline, anim: float, blend: "lighter", opacity: 0.6 },
      { markup: shimmer, anim: { type: "flicker", min: 0, max: 0.6, speed: 1.6 }, blend: "lighter" },
      { markup: scan, anim: float, blend: "lighter", opacity: 0.4 },
      { markup: motes + glyph + eyes, anim: float, blend: "lighter" },
      { markup: projector },
    ],
  };
}
