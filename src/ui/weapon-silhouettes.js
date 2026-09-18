/**
 * Side-profile weapon art for the Vanguard HUD, one compact SVG per weapon id.
 *
 * The viewmodels (svg-art/viewmodel/weapons.js) are built for a first-person
 * camera, so the HUD gets its own profiles: the same materials, silhouettes
 * and emissive channels, flattened to a side view in the graphic-novel style
 * (3-tone material gradients, key light from above, ink outline, detail lines).
 * Two layers per weapon — body and glow — each rasterised once per size bucket
 * through svg-art/raster.js; the HUD tints and pulses the glow per frame.
 */

import { getLayerImage } from "../rendering/svg-art/raster.js";
import { COLOR } from "./design-tokens.js";

export const SILHOUETTE_BOX = [0, 0, 160, 56];
const INK = COLOR.ink;

// Material ramps (shadow → mid → light), matching the viewmodel palettes.
const RAMPS = {
  steel: ["#1c2733", "#3a4d61", "#8fa8be"],
  gunmetal: ["#0d1218", "#27313c", "#6a7a8a"],
  polymer: ["#07090c", "#1b222a", "#3f4a56"],
  bronze: ["#2e1d10", "#6b4a2a", "#c29462"],
  crimson: ["#2c0a15", "#6b2338", "#c16a84"],
  plum: ["#27101e", "#56364a", "#9c7b8e"],
  navy: ["#10202f", "#2b4a66", "#7aa0bf"],
  brass: ["#29240f", "#6a6238", "#c3b67f"],
  teal: ["#0f201f", "#2b5250", "#7fb3b0"],
  indigo: ["#15153a", "#35356a", "#8585bd"],
};

const DEFS =
  Object.entries(RAMPS)
    .map(([k, [d, m, l]]) =>
      `<linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l}"/>` +
      `<stop offset=".45" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></linearGradient>`)
    .join("") +
  `<filter id="bloom" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="1.6"/></filter>`;

const part = (d, mat, sw = 1.2) =>
  `<path d="${d}" fill="url(#${mat})" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const flat = (d, fill, sw = 1) =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const detail = (d, o = 0.6, w = 0.6) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
const shine = (d, o = 0.55) =>
  `<path d="${d}" fill="none" stroke="#e8f3fb" stroke-width=".7" stroke-linecap="round" opacity="${o}"/>`;
const rim = (d) => `<path d="${d}" fill="none" stroke="${COLOR.cyan}" stroke-width=".8" stroke-linecap="round" opacity=".45"/>`;
/** Emissive strokes: drawn wide and blurred, then a hot core. */
const glow = (d, w = 1.4) =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w * 2.6}" stroke-linecap="round" filter="url(#bloom)" opacity=".8"/>` +
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>` +
  `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${w * 0.35}" stroke-linecap="round" opacity=".85"/>`;
const glowDot = (x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="currentColor" filter="url(#bloom)" opacity=".75"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#fff"/>`;

const grip = (x, mat = "polymer", tilt = 9, len = 20) =>
  part(`M${x},30 L${x + 16},30 L${x + 16 - tilt * 0.4},${30 + len} L${x - tilt},${30 + len} Z`, mat) +
  detail(`M${x + 3},36 L${x + 12},36 M${x + 2},41 L${x + 11},41 M${x},46 L${x + 9},46`, 0.5, 0.5);
const guard = (x0, x1, y = 30) => detail(`M${x0},${y} C${x0 + 1},${y + 9} ${x1 - 2},${y + 9} ${x1},${y}`, 0.95, 1.4);

/** Each entry: { body, glow } markup in the 160×56 box, weapon facing right. */
const PROFILES = {
  // Chrono Pistol: steel slide over a polymer frame, chrono channel along the top.
  0: {
    body:
      grip(44) + guard(62, 80) +
      part("M34,27 L112,27 L112,33 L66,33 L62,30 L38,30 Z", "polymer") +
      part("M30,14 L114,14 L120,18 L120,27 L30,27 L28,20 Z", "steel") +
      part("M120,19 L128,19 L128,25 L120,25 Z", "gunmetal", 1) +
      part("M36,10.5 L42,10.5 L42,14 L36,14 Z M104,10.5 L110,10.5 L110,14 L104,14 Z", "gunmetal", 0.9) +
      detail("M34,18 L34,25 M38,18 L38,25 M42,18 L42,25 M46,18 L46,25") +
      flat("M76,19 L92,19 L92,24 L76,24 Z", "#05070a", 0.7) +
      shine("M34,15.4 L112,15.4") + rim("M114,14.6 L119.4,18.4"),
    glow: glow("M50,16.6 L104,16.6", 1.2) + glowDot(122, 22, 1.3),
  },
  // Temporal Shotgun: bronze receiver, twin steel barrels, ribbed pump.
  1: {
    body:
      part("M4,22 L26,17 L26,33 L12,44 L4,42 Z", "bronze") +
      grip(40, "bronze", 10, 19) + guard(58, 74) +
      part("M24,13 L72,13 L76,17 L76,33 L24,33 Z", "bronze") +
      part("M74,13 L154,13 L154,19 L74,19 Z", "gunmetal") +
      part("M74,19.5 L150,19.5 L150,25.5 L74,25.5 Z", "gunmetal") +
      part("M92,26 L128,26 L128,33 L92,33 Z", "steel", 1) +
      detail("M97,26.5 L97,32.5 M102,26.5 L102,32.5 M107,26.5 L107,32.5 M112,26.5 L112,32.5 M117,26.5 L117,32.5 M122,26.5 L122,32.5") +
      flat("M40,18 L58,18 L58,27 L40,27 Z", "#0a0603", 0.7) + flat("M44,20 L54,20 L54,25 L44,25 Z", "#c89a3c", 0.5) +
      shine("M26,14.4 L72,14.4 M76,14.4 L152,14.4") + rim("M152,13.6 L154,15"),
    glow: glow("M30,16 L68,16", 1.1) + glowDot(151, 16, 1.2) + glowDot(147, 22.5, 1),
  },
  // Phase Rifle: indigo handguard banded with emitter rings, optic, power cell.
  2: {
    body:
      part("M4,20 L30,18 L30,32 L18,40 L4,38 Z", "polymer") +
      grip(42) + guard(60, 76) +
      part("M68,31 L94,31 L94,43 L68,43 Z", "gunmetal", 1) +
      part("M28,17 L100,17 L102,20 L102,31 L28,31 Z", "indigo") +
      part("M100,18 L142,18 L144,21 L144,29 L100,29 Z", "indigo") +
      part("M142,21.5 L156,21.5 L156,26.5 L142,26.5 Z", "gunmetal", 1) +
      part("M50,8 L90,8 L92,12 L92,16 L50,16 Z", "gunmetal") +
      part("M58,16 L62,16 L62,17 L58,17 Z M80,16 L84,16 L84,17 L80,17 Z", "steel", 0.7) +
      detail("M108,18.5 L108,28.5 M118,18.5 L118,28.5 M128,18.5 L128,28.5") +
      shine("M30,18.4 L100,18.4 M52,9.2 L90,9.2") + rim("M142,18.6 L144,21"),
    glow: glow("M108,19.5 L108,27.5 M118,19.5 L118,27.5 M128,19.5 L128,27.5", 1.3) + glowDot(92, 12, 1.4) + glow("M72,37 L90,37", 1.2),
  },
  // Quantum Cannon: heavy crimson chassis, tapering coil housing, exposed core.
  3: {
    body:
      part("M4,18 L22,14 L22,40 L6,44 Z", "gunmetal") +
      grip(44, "gunmetal", 8, 18) + guard(62, 78) +
      part("M20,10 L104,10 L110,15 L110,41 L20,41 Z", "crimson") +
      part("M108,14 L148,19 L148,33 L108,38 Z", "gunmetal") +
      part("M146,20 L156,21 L156,31 L146,32 Z", "steel", 1) +
      part("M44,4 L84,4 L84,10 L44,10 Z", "gunmetal", 1) +
      flat("M56,17 L86,17 L86,34 L56,34 Z", "#05070a", 0.9) +
      detail("M118,16 L118,36 M128,17.5 L128,34.5 M138,18.8 L138,33.2", 0.8, 0.8) +
      shine("M22,11.4 L102,11.4") + rim("M108,14.8 L147,19.8"),
    glow: glowDot(71, 25.5, 4.2) + glow("M118,18 L118,34 M128,19.5 L128,32.5 M138,20.8 L138,31.2", 1.1) + glowDot(151, 26, 1.4),
  },
  // Phase Scattergun: wide plum body, three stacked barrels under a vented shroud.
  4: {
    body:
      part("M4,20 L24,16 L24,36 L8,42 L4,40 Z", "polymer") +
      grip(38, "polymer", 9, 19) + guard(56, 72) +
      part("M22,12 L100,12 L104,16 L104,38 L22,38 Z", "plum") +
      part("M100,16 L146,16 L146,21 L100,21 Z M100,22.5 L146,22.5 L146,27.5 L100,27.5 Z M100,29 L146,29 L146,34 L100,34 Z", "gunmetal", 1) +
      part("M98,9 L140,9 L144,14 L98,14 Z", "plum", 1) +
      detail("M106,10.5 L110,12.5 M114,10.5 L118,12.5 M122,10.5 L126,12.5 M130,10.5 L134,12.5", 0.9, 0.9) +
      flat("M44,18 L60,18 L60,30 L44,30 Z", "#05070a", 0.8) +
      shine("M24,13.4 L98,13.4 M100,10.2 L140,10.2") + rim("M140,9.2 L144,13.6"),
    glow: glowDot(52, 24, 3.2) + glowDot(147, 18.5, 1) + glowDot(147, 25, 1) + glowDot(147, 31.5, 1),
  },
  // Temporal Sniper: long fluted barrel with coil rings, bolt, ring sights.
  5: {
    body:
      part("M2,22 L22,19 L26,26 L20,40 L4,42 L10,30 Z", "navy") +
      grip(34, "gunmetal", 9, 19) + guard(52, 68) +
      part("M20,18 L74,18 L76,20 L76,32 L20,32 Z", "navy") +
      part("M74,21.5 L148,21.5 L148,26.5 L74,26.5 Z", "navy", 1) +
      part("M146,20 L157,20 L157,28 L146,28 Z", "gunmetal", 1) +
      part("M60,12 L64,12 L64,18 L60,18 Z M28,12 L34,12 L34,18 L28,18 Z", "gunmetal", 0.8) +
      `<circle cx="31" cy="8" r="5.5" fill="none" stroke="${INK}" stroke-width="2.6"/><circle cx="31" cy="8" r="5.5" fill="none" stroke="#6a7a8a" stroke-width="1.2"/>` +
      `<circle cx="62" cy="9" r="3.4" fill="none" stroke="${INK}" stroke-width="2.2"/>` +
      part("M44,30 L52,30 L54,36 L48,38 Z", "steel", 0.9) +
      detail("M110,22 L118,22 M122,22 L130,22 M134,22 L142,22", 0.7, 0.6) +
      shine("M22,19.2 L74,19.2 M76,22.6 L146,22.6") + rim("M146,20.6 L157,20.6"),
    glow: glow("M88,21.5 L88,26.5 M96,21.5 L96,26.5 M104,21.5 L104,26.5", 1.2) + glow("M59,9 A3,3 0 1 0 65,9 A3,3 0 1 0 59,9", 0.8) + glow("M28,24 L68,24", 1),
  },
  // Ricochet Pistol: angular brass slide with deflector fins and zig-zag channel.
  6: {
    body:
      grip(46, "polymer", 10, 20) + guard(64, 80) +
      part("M36,27 L108,27 L108,33 L68,33 L64,30 L40,30 Z", "polymer") +
      part("M32,15 L104,13 L124,19 L124,27 L32,27 L30,21 Z", "brass") +
      part("M50,15 L56,8 L60,14.6 Z M70,14.4 L76,7 L80,14 Z M90,13.8 L96,7 L100,13.4 Z", "brass", 0.9) +
      part("M124,20 L131,20 L131,25 L124,25 Z", "gunmetal", 1) +
      detail("M36,18 L36,25 M40,18 L40,25 M44,18 L44,25") +
      shine("M34,16.2 L103,14.4 L122,19.6") + rim("M104,13.6 L123.6,19"),
    glow: glow("M50,21 L58,18 L66,24 L74,18 L82,24 L90,18 L98,24 L108,20", 1.1) + glowDot(126.5, 22.5, 1.2),
  },
  // EMP Launcher: armoured teal tube with charging rings and capacitor bank.
  7: {
    body:
      part("M4,20 L24,17 L24,37 L8,41 L4,39 Z", "gunmetal") +
      grip(40, "gunmetal", 8, 18) + guard(58, 74) +
      part("M96,34 L108,34 L106,50 L94,50 Z", "gunmetal", 1) +
      part("M22,11 L140,11 L150,15 L150,37 L140,41 L22,41 Z", "teal") +
      part("M148,14 L157,12 L157,40 L148,38 Z", "gunmetal") +
      part("M34,41 L66,41 L66,47 L34,47 Z", "steel", 1) +
      detail("M40,41.5 L40,46.5 M46,41.5 L46,46.5 M52,41.5 L52,46.5 M58,41.5 L58,46.5", 0.7) +
      part("M30,6 L46,6 L46,11 L30,11 Z", "gunmetal", 0.9) +
      detail("M84,11.5 L84,40.5 M100,11.5 L100,40.5 M116,11.5 L116,40.5 M132,11.5 L132,40.5", 0.9, 1) +
      shine("M24,12.4 L140,12.4") + rim("M140,11.6 L149.6,15.4"),
    glow: glow("M84,14 L84,38 M100,14 L100,38 M116,14 L116,38 M132,14 L132,38", 1.1) + glowDot(152.5, 26, 2),
  },
};

export const hasSilhouette = (id) => id in PROFILES;

/**
 * Bitmaps for a weapon profile at `pxPerUnit` device pixels per art unit, or
 * null while decoding. `color` tints the glow layer (it uses currentColor).
 */
export function silhouetteLayers(id, color, pxPerUnit) {
  const prof = PROFILES[id];
  if (!prof) return null;
  const body = getLayerImage(`wsil:${id}:body`, SILHOUETTE_BOX, DEFS, prof.body, pxPerUnit);
  const glowImg = getLayerImage(`wsil:${id}:glow:${color}`, SILHOUETTE_BOX, DEFS, `<g color="${color}">${prof.glow}</g>`, pxPerUnit);
  return body ? { body, glow: glowImg } : null;
}
