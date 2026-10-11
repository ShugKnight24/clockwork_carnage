/**
 * Customised agent: the cutscene hero rig (models/hero.js) dressed from a saved
 * character — palette, armor, helmet, visor, shoulders, badge, weapon skin,
 * loadout gear, origin insignia, and a face/hair/eyes head for open helmets.
 *
 * Used live by the Modern showroom (js/components/agent-showroom.js) as inline
 * DOM SVG, so it is rebuilt on change rather than per frame. Pieces from the
 * hero rig are reused as-is and recoloured by swapping their hard-coded hex
 * values, so the cutscene hero itself is untouched.
 *
 * Groups carry `ag-*` classes so the page can animate them (breathe, cape sway,
 * visor pulse) and offset them for the turn parallax.
 */

import {
  INK,
  RIM,
  f,
  pt,
  lerp,
  mirror,
  clamp,
  shape,
  line,
  part,
  armoredLeg,
  armoredArm,
  armJoints,
  VAMBRACE,
  armSwing,
  pauldron,
  torso,
  TORSO_GLOW,
  energy,
  gorget,
  standingCape,
  chronoRifle,
  STAND,
  headScale,
  ARMED,
  RIFLE_AT,
  RIFLE_ROT,
  FALLEN,
  FALLEN_TF,
  FALLEN_SPARKS,
  fallenCape,
  capeFlap,
  fallenDamage,
  debris,
} from "./models/hero.js";
import {
  CHARACTER_COLORS,
  SKIN_TONES,
  HAIR_STYLES,
  EYE_COLORS,
  ARMOR_STYLES,
  BODY_FRAMES,
  CAPE_STYLES,
  BODY_TYPES,
  CAMO_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  BACKSTORIES,
} from "../../data/cosmetics.js";
import { renderBadge, resolveTreatment } from "./insignia/compose.js";
import { normalizeBadge, normalizeAccessories, migrateLegacyBadge } from "../../core/character-normalize.js";
import { ENAMELS, METALS } from "../../data/badges.js";
import { paintAccessories } from "./accessories/index.js";
import { FRAME_SHAPE, frameLayers } from "./frames.js";
import { realizeMarkup, realizeDefs, realFilters, swapGradient, sheen, contactShadow, volumetric, realHex, SOFT_HIGHLIGHTS } from "./models/realistic.js";

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (r) => `#${r.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
/** Blend two hex colours; t = 0 → a, 1 → b. */
export const mix = (a, b, t) => {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return rgbHex(x.map((v, i) => v + (y[i] - v) * t));
};
const desat = (h, t) => {
  const [r, g, b] = hexRgb(h);
  const l = r * 0.3 + g * 0.59 + b * 0.11;
  return rgbHex([r, g, b].map((v) => v + (l - v) * t));
};

/** Swap every hard-coded hex in `markup` found in `map` (keys lower-case). */
const recolor = (markup, map) => markup.replace(/#[0-9a-fA-F]{6}\b/g, (h) => map[h.toLowerCase()] || h);

const pick = (list, i) => list[clamp(i | 0, 0, list.length - 1)] || list[0];

// ---------------------------------------------------------------------------
// Style tables (visual only; names/tiers live in data/cosmetics.js)
// ---------------------------------------------------------------------------

/** Steel ramps per armor style: [spec, light, mid, dark, deep]. */
const ARMOR_STEEL = {
  standard: ["#9ab2c7", "#6f8aa3", "#3a4d61", "#1c2733", "#111821"],
  recon: ["#b3bda9", "#7f8c78", "#475243", "#232a22", "#141813"],
  heavy: ["#98a2ac", "#66717c", "#353d46", "#171b21", "#0b0e12"],
  stealth: ["#5f6975", "#3c444e", "#22282f", "#0f1318", "#07090c"],
  tech: ["#c2b9a2", "#918872", "#554f40", "#29261e", "#15130f"],
  // Gun steel, warmed by the brass of its own feed.
  howitzer: ["#a6a79c", "#74776d", "#41443d", "#1f221e", "#101210"],
  // Field-painted olive slab plate.
  trencher: ["#a8ad93", "#757a63", "#424636", "#20231b", "#101208"],
  // Matte black: almost no specular range, so the candy red carries the suit.
  reliquary: ["#4a4a50", "#2d2d33", "#18181c", "#0b0b0e", "#050506"],
  // Pale sealed ceramic, cool and clean.
  pathfinder: ["#d3dcd9", "#9fadab", "#5d6c6b", "#2c3636", "#161c1d"],
};
const ARMOR_WIDTH = {
  standard: 1, recon: 0.95, heavy: 1.1, stealth: 0.97, tech: 1.03,
  howitzer: 1.14, trencher: 1.12, reliquary: 1.06, pathfinder: 0.96,
};

/**
 * Armour that barely reflects. Drives the matte suit gradient, the flattened
 * sheen and the low specular on the helmet.
 */
const MATTE = new Set(["stealth", "reliquary"]);

/** Candy red: the Reliquary's tabard and trim, not the player's palette. */
const CANDY = "#c8102e";
const CANDY_HI = "#ff3c54";

/** Rifle finish ramps and energy colour override (null = palette accent). */
const WEAPON_FINISH = {
  default: { stops: ["#6a7888", "#36414d", "#0e1217"], energy: null },
  carbon: { stops: ["#3c3f45", "#1b1d21", "#050608"], energy: null },
  chrome: { stops: ["#f2f7fc", "#8e9cac", "#1c232b"], energy: null, mirror: true },
  ember: { stops: ["#6a4030", "#2c1810", "#0a0503"], energy: "#ff7a2a" },
  frost: { stops: ["#eaf6ff", "#8fb6d4", "#1e3044"], energy: "#9ff0ff" },
  toxic: { stops: ["#5a7a40", "#243418", "#070c04"], energy: "#7dff4a" },
};

const AMBER = "#ffae3a";

// ---------------------------------------------------------------------------
// Resolved look
// ---------------------------------------------------------------------------

function resolve(ch) {
  const pal = pick(CHARACTER_COLORS, ch.colorIndex);
  const armor = pick(ARMOR_STYLES, ch.armorIndex).id;
  const weapon = pick(WEAPON_SKINS, ch.weaponSkinIndex).id;
  const finish = WEAPON_FINISH[weapon] || WEAPON_FINISH.default;
  const capeBase = mix(desat(pal.primary, 0.22), "#000000", 0.22);
  const c = {
    pal,
    armor,
    frame: pick(BODY_FRAMES, ch.frameIndex).id,
    capeOff: pick(CAPE_STYLES, ch.capeIndex).id === "none",
    fem: pick(BODY_TYPES, ch.bodyIndex).id === "fem",
    camo: ch.camoIndex ? CAMO_STYLES[ch.camoIndex] || null : null,
    helmet: pick(HELMET_STYLES, ch.helmetIndex).id,
    visor: pick(VISOR_STYLES, ch.visorIndex).id,
    shoulder: pick(SHOULDER_STYLES, ch.shoulderIndex).id,
    badge: ch.badge ? normalizeBadge(ch.badge) : migrateLegacyBadge(ch.badgeIndex | 0, ch.shoulderIndex | 0),
    treatment: resolveTreatment(ch),
    accessories: normalizeAccessories(ch.accessories),
    weapon,
    finish,
    loadout: pick(LOADOUT_CLASSES, ch.loadoutIndex).id,
    origin: pick(BACKSTORIES, ch.backstoryIndex).id,
    skin: pick(SKIN_TONES, ch.skinToneIndex),
    hair: pick(HAIR_STYLES, ch.hairIndex),
    eyes: pick(EYE_COLORS, ch.eyeIndex).color,
    variant: ch.armorVariant ? pick(ARMOR_STYLES, ch.armorIndex).variant || null : null,
    energy: pal.accent,
    core: mix(pal.accent, "#ffffff", 0.72),
    hot: mix(pal.accent, "#ffffff", 0.88),
    rim: mix(pal.accent, RIM, 0.3),
    housing: mix(pal.primary, "#000000", 0.35),
    channel: mix(pal.dark, "#000000", 0.62),
    cape: [mix(capeBase, "#ffffff", 0.14), capeBase, mix(capeBase, "#000000", 0.32), mix(capeBase, "#000000", 0.78)],
  };
  c.gunEnergy = finish.energy || c.energy;
  return c;
}

function bodyMap(c) {
  const m = {
    "#22e6ff": c.rim,
    "#00e5ff": c.energy,
    "#bffcff": c.core,
    "#8af6ff": c.core,
    "#e6ffff": c.hot,
    "#e8ffff": c.hot,
    "#0b6f80": c.housing,
    "#0b7c90": c.housing,
    "#0a8aa0": c.housing,
    "#05131a": c.channel,
    "#1a0303": mix(c.cape[3], "#000000", 0.4),
    "#2a0606": c.cape[3],
    "#c43a3a": c.cape[0],
    "#d04444": mix(c.cape[0], "#ffffff", 0.15),
    "#7a1818": c.cape[1],
    "#4a0e0e": c.cape[2],
  };
  if (MATTE.has(c.armor)) {
    // Matte plating: knock the painted-in speculars down.
    Object.assign(m, { "#eaf4ff": "#7d8996", "#f4faff": "#8a96a3", "#ffffff": "#8a96a3", "#b8cadb": "#56606c", "#dfe9f4": "#56606c" });
  }
  return m;
}

function gunMap(c) {
  const e = c.gunEnergy;
  return {
    "#22e6ff": c.rim,
    "#00e5ff": e,
    "#bffcff": mix(e, "#ffffff", 0.72),
    "#e8ffff": mix(e, "#ffffff", 0.88),
    "#0b6f80": mix(e, "#000000", 0.5),
    "#05131a": mix(e, "#000000", 0.85),
    ...(c.finish.mirror ? { "#aab8c6": "#ffffff", "#c6d4e2": "#ffffff" } : {}),
  };
}

// ---------------------------------------------------------------------------
// Defs
// ---------------------------------------------------------------------------

/** Seeded 0..1 noise for camo layouts (the same pattern every render). */
const camoRand = (i) => {
  const v = Math.sin(i * 91.7 + 47.3) * 43758.5453;
  return v - Math.floor(v);
};
/** A smooth closed blob through jittered points around (cx, cy). */
function blobPath(cx, cy, r, seed) {
  const n = 7;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.6 + camoRand(seed + i) * 0.7);
    pts.push([cx + Math.cos(a) * rr * 1.35, cy + Math.sin(a) * rr * 0.8]);
  }
  let d = `M${pt(...pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${pt(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)} ${pt(p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)} ${pt(...p2)}`;
  }
  return d + "Z";
}

/**
 * A seamless camo tile as an SVG <pattern> with the given id: organic blobs
 * (drawn again across the tile edges so it wraps cleanly) or pixel blocks.
 */
export function camoPattern(camo, id, scale = 1) {
  const T = 18;
  let body = `<rect width="${T}" height="${T}" fill="${camo.base}"/>`;
  if (camo.kind === "pixel") {
    const q = 1.5;
    for (let y = 0; y < T; y += q) {
      for (let x = 0; x < T; x += q) {
        const r = camoRand(x * 13.1 + y * 7.7);
        if (r < 0.45) continue;
        body += `<rect x="${f(x)}" y="${f(y)}" width="${q}" height="${q}" fill="${camo.blobs[Math.floor(r * 10) % camo.blobs.length]}"/>`;
      }
    }
  } else {
    camo.blobs.forEach((col, k) => {
      for (let i = 0; i < 5; i++) {
        const seed = k * 37 + i * 11;
        const cx = camoRand(seed) * T;
        const cy = camoRand(seed + 5) * T;
        const r = 2 + camoRand(seed + 9) * 2.4;
        for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) {
          if (cx + dx < -5 || cx + dx > T + 5 || cy + dy < -5 || cy + dy > T + 5) continue;
          body += `<path d="${blobPath(cx + dx, cy + dy, r, seed)}" fill="${col}"/>`;
        }
      }
    });
  }
  // A light shading wash so the fabric is not perfectly flat.
  return `<pattern id="${id}" width="${T}" height="${T}" patternUnits="userSpaceOnUse" patternTransform="scale(${scale}) rotate(-12)">${body}</pattern>`;
}

function defs(c) {
  const s = ARMOR_STEEL[c.armor] || ARMOR_STEEL.standard;
  const g = c.finish.stops;
  const skin = c.skin;
  const hair = c.hair.color;
  const suitLo = MATTE.has(c.armor) ? ["#1a222c", "#0c1118", "#040609"] : ["#262c33", "#13171c", "#050709"];
  const gun = c.finish.mirror
    ? `<stop offset="0" stop-color="${g[0]}"/><stop offset=".28" stop-color="${g[1]}"/><stop offset=".46" stop-color="#e8eef5"/><stop offset=".7" stop-color="#4a5664"/><stop offset="1" stop-color="${g[2]}"/>`
    : `<stop offset="0" stop-color="${g[0]}"/><stop offset=".3" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/>`;
  return `
<linearGradient id="steel" x1="0" y1="0" x2="1" y2=".35">
  <stop offset="0" stop-color="${s[0]}"/><stop offset=".18" stop-color="${s[1]}"/>
  <stop offset=".5" stop-color="${s[2]}"/><stop offset=".82" stop-color="${s[3]}"/>
  <stop offset="1" stop-color="${s[4]}"/></linearGradient>
<linearGradient id="steelDk" x1="0" y1="0" x2="1" y2=".35">
  <stop offset="0" stop-color="${mix(s[1], s[2], 0.55)}"/><stop offset=".45" stop-color="${mix(s[2], s[3], 0.5)}"/>
  <stop offset="1" stop-color="${mix(s[4], "#000000", 0.3)}"/></linearGradient>
${c.camo ? camoPattern(c.camo, "suit") : `<linearGradient id="suit" x1="0" y1="0" x2="1" y2=".25">
  <stop offset="0" stop-color="${suitLo[0]}"/><stop offset=".45" stop-color="${suitLo[1]}"/>
  <stop offset="1" stop-color="${suitLo[2]}"/></linearGradient>`}
<linearGradient id="cape" gradientUnits="userSpaceOnUse" x1="-38" y1="-50" x2="34" y2="10">
  <stop offset="0" stop-color="${c.cape[0]}"/><stop offset=".3" stop-color="${c.cape[1]}"/>
  <stop offset=".62" stop-color="${c.cape[2]}"/><stop offset="1" stop-color="${c.cape[3]}"/></linearGradient>
<linearGradient id="paint" x1="0" y1="0" x2="1" y2=".4">
  <stop offset="0" stop-color="${mix(c.pal.primary, "#ffffff", 0.35)}"/><stop offset=".45" stop-color="${c.pal.primary}"/>
  <stop offset="1" stop-color="${mix(c.pal.dark, "#000000", 0.35)}"/></linearGradient>
<linearGradient id="visor" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${mix(c.energy, "#000000", 0.78)}"/><stop offset=".42" stop-color="${mix(c.energy, "#000000", 0.12)}"/>
  <stop offset=".58" stop-color="${c.core}"/><stop offset="1" stop-color="${mix(c.energy, "#000000", 0.82)}"/></linearGradient>
<linearGradient id="mirrorGlass" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#3c4a5c"/><stop offset=".35" stop-color="#0b1119"/>
  <stop offset=".55" stop-color="${mix(c.energy, "#0b1119", 0.72)}"/><stop offset=".7" stop-color="#05080d"/>
  <stop offset="1" stop-color="#1a2330"/></linearGradient>
<linearGradient id="gun" x1="0" y1="0" x2="0" y2="1">${gun}</linearGradient>
<linearGradient id="goldGlass" x1="0" y1="0" x2=".25" y2="1">
  <stop offset="0" stop-color="#3a2405"/><stop offset=".28" stop-color="#b47a16"/><stop offset=".42" stop-color="#ffe39a"/>
  <stop offset=".56" stop-color="#c88a1c"/><stop offset="1" stop-color="#2a1803"/></linearGradient>
<linearGradient id="skin" x1="0" y1="0" x2="1" y2=".3">
  <stop offset="0" stop-color="${mix(skin.color, "#ffffff", 0.22)}"/><stop offset=".42" stop-color="${skin.color}"/>
  <stop offset=".8" stop-color="${mix(skin.color, skin.shadow, 0.6)}"/><stop offset="1" stop-color="${skin.shadow}"/></linearGradient>
<linearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${mix(hair, "#ffffff", 0.22)}"/><stop offset=".45" stop-color="${hair}"/>
  <stop offset="1" stop-color="${mix(hair, "#000000", 0.6)}"/></linearGradient>
<linearGradient id="leather" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3a3430"/><stop offset=".45" stop-color="#1c1815"/>
  <stop offset="1" stop-color="#080706"/></linearGradient>
<radialGradient id="shade"><stop offset="0" stop-color="#000" stop-opacity=".7"/>
  <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="sheen"><stop offset="0" stop-color="#fff" stop-opacity="${MATTE.has(c.armor) ? 0.18 : 0.5}"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.3"/></filter>
<filter id="bloom" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="ao" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="1.5"/></filter>
<pattern id="weave" width=".9" height=".9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width=".9" height=".32" fill="#000" opacity=".3"/><rect y=".45" width=".32" height=".45" fill="#fff" opacity=".06"/></pattern>
${CAPE_HEM[c.armor] ? `<clipPath id="capeCut"><path d="${capeCut(CAPE_HEM[c.armor])}"/></clipPath>` : ""}`;
}

/** Cape hems per armor (right to left): recon mantle, ghost tatters. Standard keeps the full cape. */
const CAPE_HEM = {
  recon: [[80, -4], [34, -6], [26, 2], [16, -4], [6, 3], [-4, -4], [-14, 2], [-24, -5], [-34, 1], [-80, -4]],
  stealth: [[80, 22], [38, 24], [33, 40], [27, 28], [22, 44], [15, 31], [8, 46], [1, 32], [-6, 45], [-12, 30], [-19, 43], [-25, 29], [-31, 42], [-36, 26], [-80, 22]],
};
const capeCut = (hem) => `M-80,-120 L80,-120 ${hem.map((p) => `L${pt(...p)}`).join(" ")} Z`;
const capeHemLine = (hem) => `M${hem.slice(1, -1).map((p) => pt(...p)).join(" L")}`;

/** Energy element (bloom + bright core) in an explicit colour. */
const glowOf = (inner, color, core) =>
  `<g filter="url(#glow)" fill="${color}" stroke="${color}">${inner}</g>` + `<g fill="${core}" stroke="${core}" opacity=".9">${inner}</g>`;

// ---------------------------------------------------------------------------
// Head: face, eyes, hair
// ---------------------------------------------------------------------------

const FACE =
  "M-7.2,-84 C-7.4,-79 -6.8,-75.5 -5,-73.3 C-3.6,-71.8 -1.8,-71.2 0,-71.2 C1.8,-71.2 3.6,-71.8 5,-73.3 " +
  "C6.8,-75.5 7.4,-79 7.2,-84 C7,-89.5 4,-91.6 0,-91.6 C-4,-91.6 -7,-89.5 -7.2,-84 Z";
const NECK = "M-3.9,-74.6 L3.9,-74.6 L4.5,-65.4 L-4.5,-65.4 Z";

function eyes(c) {
  const shadow = c.skin.shadow;
  const eye = (s) => {
    const x = s * 3.1;
    const M = s > 0 ? mirror : (d) => d;
    return (
      // Soft socket shade, kept small: a wide dark band read as goggles.
      `<ellipse cx="${x}" cy="-82.3" rx="2.3" ry="1.2" fill="${shadow}" opacity=".16"/>` +
      `<path d="${M("M-4.7,-81.6 Q-3.1,-83.3 -1.5,-81.7 Q-3.1,-80.3 -4.7,-81.6 Z")}" fill="#ece6de"/>` +
      `<circle cx="${f(x + 0.1)}" cy="-81.65" r=".95" fill="${c.eyes}"/>` +
      `<circle cx="${f(x + 0.1)}" cy="-81.65" r=".95" fill="none" stroke="${mix(c.eyes, "#000000", 0.55)}" stroke-width=".2"/>` +
      `<circle cx="${f(x + 0.1)}" cy="-81.65" r=".42" fill="#050505"/>` +
      `<circle cx="${f(x - 0.25)}" cy="-82.05" r=".22" fill="#fff"/>` +
      // Upper lid: a thin fold, so the eye reads open and alert, not sleepy.
      `<path d="${M("M-4.9,-81.75 Q-3.1,-83.7 -1.3,-81.9 Q-3.1,-83.1 -4.9,-81.75 Z")}" fill="${mix(c.skin.color, shadow, 0.4)}"/>` +
      line(M("M-4.9,-81.7 Q-3.1,-83.3 -1.3,-81.8"), "#1a100c", 0.5, 0.95) +
      line(M("M-4.4,-80.95 Q-3.1,-80.35 -1.8,-80.95"), shadow, 0.25, 0.45) +
      // Brow: tapered, arched, hair-coloured.
      `<path d="${M("M-5.9,-83.7 C-4.8,-85 -2.8,-85.3 -1.1,-84.5 L-1.2,-84 C-2.8,-84.6 -4.6,-84.4 -5.7,-83.4 Z")}" fill="${mix(c.hair.brow || (c.hair.id === "none" ? c.skin.shadow : c.hair.color), "#000000", 0.2)}"/>`
    );
  };
  return eye(-1) + eye(1);
}

/** Face without hair (head top -91.6, chin -71.2). */
function face(c) {
  const shadow = c.skin.shadow;
  const ear = "M-7,-83.6 C-8.9,-84.4 -9.6,-82 -9.2,-79.8 C-8.9,-78.2 -8,-77.4 -6.8,-77.8 Z";
  const synthetic = c.skin.id === "synthetic";
  return (
    shape(ear, "url(#skin)", 0.8) +
    shape(mirror(ear), mix(c.skin.color, shadow, 0.55), 0.8) +
    shape(FACE, "url(#skin)") +
    `<path d="M1.6,-91.2 C5,-90.6 7.2,-88.4 7.2,-84 C7.4,-79 6.8,-75.5 5,-73.3 C3.6,-71.8 2,-71.3 0.8,-71.2 C3.8,-74 5.2,-78 4.6,-84 C4.3,-87.6 3,-89.8 1.6,-91.2 Z" fill="${shadow}" opacity=".35"/>` +
    `<ellipse cx="-3.2" cy="-87.4" rx="3.2" ry="2" fill="url(#sheen)"/>` +
    eyes(c) +
    line("M0.9,-82 C1.2,-80 1.6,-78.2 1.9,-77", shadow, 0.45, 0.6) +
    line("M-0.5,-80.6 L-0.4,-77.8", mix(c.skin.color, "#ffffff", 0.35), 0.45, 0.5) +
    `<ellipse cx=".5" cy="-76.1" rx="1.9" ry=".55" fill="${shadow}" opacity=".35"/>` +
    line("M-1.7,-76.7 C-1,-75.9 1,-75.9 1.7,-76.7", shadow, 0.45, 0.85) +
    // Cheeks: a faint warm lift under each eye.
    `<ellipse cx="-4.2" cy="-78.2" rx="1.7" ry="1" fill="${mix(c.skin.color, "#d0605a", 0.35)}" opacity=".22"/>` +
    `<ellipse cx="4.2" cy="-78.2" rx="1.7" ry="1" fill="${mix(c.skin.color, "#d0605a", 0.35)}" opacity=".16"/>` +
    // Mouth: a level, slightly lifted line (the old curve read as a frown).
    `<path d="M-2.4,-74 C-1,-74.3 1,-74.3 2.4,-74 C1.2,-73.3 -1.2,-73.3 -2.4,-74 Z" fill="${mix(c.skin.shadow, "#a04040", 0.3)}"/>` +
    line("M-2.6,-74.05 C-1.2,-73.55 1.2,-73.55 2.6,-74.05", mix(shadow, "#000000", 0.4), 0.5, 0.9) +
    line("M-1.3,-72.75 C-0.5,-72.5 0.5,-72.5 1.3,-72.75", mix(c.skin.color, "#ffffff", 0.3), 0.4, 0.45) +
    (synthetic
      ? line("M-6.6,-79.6 L-4.4,-77.4 L-4.6,-74.4 M6.6,-79.6 L4.4,-77.4 L4.6,-74.4 M0,-91.4 L0,-87.8", "#3a424e", 0.4, 0.8)
      : "") +
    line("M7.3,-87 C7.6,-84 7.4,-80 6.9,-77 M7,-76.4 C6.4,-74.8 5.6,-73.6 4.6,-72.8", c.rim, 0.4, 0.5)
  );
}

/** Hair. `under` = only what shows under an open helmet. */
function hair(c, under) {
  const id = c.hair.id;
  const hl = mix(c.hair.color, "#ffffff", 0.45);
  const lo = mix(c.hair.color, "#000000", 0.7);
  if (under) {
    if (id === "short" || id === "white")
      return (
        shape("M-6.8,-87.6 L6.8,-87.6 L6.6,-85.8 C5,-84.6 3.6,-84.8 2.2,-85.8 C0.6,-84.2 -1.8,-84.4 -3.4,-85.6 C-4.6,-84.8 -5.8,-85 -6.8,-85.8 Z", "url(#hair)", 0.6) +
        line("M-5.4,-86.4 C-4.2,-85.6 -3.6,-85.6 -3,-86.2 M0,-86.8 C1,-85.8 1.8,-85.8 2.4,-86.4", hl, 0.35, 0.6)
      );
    if (id === "coil")
      return [-6.2, -3.4, 3.4, 6.2]
        .map((x) => `<circle cx="${x}" cy="-86.4" r="1.6" fill="url(#hair)" stroke="${INK}" stroke-width=".45"/>`)
        .join("");
    if (id === "braid") return braid(c);
    if (id === "buzz" || id === "fade" || id === "hawk" || id === "slick" || id === "topknot")
      return line("M-7,-84.6 L-6.9,-82 M7,-84.6 L6.9,-82", c.hair.color, 0.9, 0.7);
    if (id === "afro")
      return [-6.4, -4, 4, 6.4]
        .map((x) => `<circle cx="${x}" cy="${Math.abs(x) > 5 ? -85.4 : -86.8}" r="1.9" fill="url(#hair)" stroke="${INK}" stroke-width=".45"/>`)
        .join("");
    if (id === "curtain" || id === "long")
      return shape("M-6.8,-87.6 L6.8,-87.6 L6.6,-85.4 C4.8,-85.6 2.6,-86.2 0.8,-87.2 L-0.8,-87.2 C-2.6,-86.2 -4.8,-85.6 -6.6,-85.4 Z", "url(#hair)", 0.6);
    return "";
  }
  if (id === "none")
    return `<ellipse cx="-2.6" cy="-89.4" rx="3.6" ry="1.6" fill="#fff" opacity=".18"/>` + line("M-6.4,-88.6 C-4,-91.4 2,-91.8 5.6,-89.4", c.skin.shadow, 0.4, 0.3);
  return scalpHair(c, HAIR_CUTS[id] || HAIR_CUTS.short);
}

// ── Natural hair ────────────────────────────────────────────────────────────
// Every cut is built on one scalp: a mass that wraps the skull past the
// temples into sideburns in front of the ears, a real hairline (temples set
// back, a soft centre) that feathers into the skin with no ink on it, a
// shadow the hair casts on the forehead, and strands that follow the cut.
// Only the outer silhouette is inked, so the hair reads as growing from the
// head rather than a cap set on top of it. Cut-specific pieces (a fringe, a
// bun, a crest, curls) are drawn over that base.

/**
 * Per-cut shape. `v` volume beyond the skull, `line` hairline height at the
 * centre (lower = more forehead covered), `burn` sideburn depth, `part` the
 * x of the parting (null = swept back), `flow` strand lean (-1 left .. 1
 * right), `fade` how much skin shows through (close crops), `tex` texture.
 */
const HAIR_CUTS = {
  buzz: { v: 0.15, line: -88.6, burn: -80.8, part: null, flow: 0, fade: 0.3, tex: "stipple" },
  short: { v: 0.95, line: -88.4, burn: -80.4, part: -3, flow: 1, tex: "strand", extra: "sweep" },
  white: { v: 0.95, line: -88.4, burn: -80.4, part: -3, flow: 1, tex: "strand", extra: "sweep" },
  coil: { v: 1.5, line: -88.6, burn: -80.6, part: null, flow: 0, tex: "coil" },
  braid: { v: 0.45, line: -88.8, burn: -80.8, part: 0.6, flow: 0, tex: "strand", extra: "braid" },
  fade: { v: 0.12, line: -88.8, burn: -81.4, part: null, flow: 0, fade: 0.45, tex: "stipple", extra: "flattop" },
  hawk: { v: 0.08, line: -88.8, burn: -81.6, part: null, flow: 0, fade: 0.6, tex: "stipple", extra: "crest" },
  afro: { v: 3.4, line: -88.4, burn: -80.2, part: null, flow: 0, tex: "coil", round: true },
  topknot: { v: 0.4, line: -88.9, burn: -80.8, part: null, flow: 0, back: true, tex: "strand", extra: "bun" },
  slick: { v: 0.7, line: -89, burn: -80.8, part: null, flow: 0, back: true, tex: "strand", shine: true },
  curtain: { v: 1.05, line: -88.2, burn: -80, part: 0, flow: 0, tex: "strand", extra: "curtain" },
  long: { v: 1.1, line: -88.4, burn: -79.6, part: 0.8, flow: 0, tex: "strand", extra: "curtain" },
  locs: { v: 0.9, line: -88.6, burn: -80.4, part: null, flow: 0, back: true, tex: "locs", extra: "locs" },
  ponytail: { v: 0.5, line: -88.9, burn: -80.8, part: null, flow: 0, back: true, tex: "strand", shine: true },
};

/** Hairline, right sideburn to left: temples set back, a soft dip at the centre. */
function hairlinePath(cut) {
  const y = cut.line;
  const b = cut.burn;
  return (
    `L6.6,${f(b)} C6.4,${f(b - 1.8)} 6.4,-84.6 6.2,-85.6 ` +
    `C6,-86.8 5.6,${f(y + 0.6)} 4.8,${f(y + 0.3)} ` +
    `C3.4,${f(y - 0.1)} 1.4,${f(y)} 0,${f(y + 0.15)} ` +
    `C-1.4,${f(y)} -3.4,${f(y - 0.1)} -4.8,${f(y + 0.3)} ` +
    `C-5.6,${f(y + 0.6)} -6,-86.8 -6.2,-85.6 ` +
    `C-6.4,-84.6 -6.4,${f(b - 1.8)} -6.6,${f(b)}`
  );
}

/** Outer silhouette, left sideburn over the crown to the right one. */
function crownPath(cut) {
  const v = cut.v;
  const b = cut.burn;
  if (cut.round) {
    // A full rounded mass: wider than tall, sitting down over the ears.
    return (
      `M-7.1,${f(b)} C-7.4,${f(b - 1.6)} -7.6,-82.6 -${f(8 + v * 0.5)},-84 C-${f(8.6 + v * 1.1)},-85.4 -${f(8.8 + v * 1.1)},-88.6 -${f(7.6 + v)},${f(-92 - v * 0.5)} ` +
      `C-${f(6 + v * 0.6)},${f(-96 - v * 0.9)} -3,${f(-97 - v)} 0,${f(-97.2 - v)} ` +
      `C3,${f(-97 - v)} ${f(6 + v * 0.6)},${f(-96 - v * 0.9)} ${f(7.6 + v)},${f(-92 - v * 0.5)} ` +
      `C${f(8.8 + v * 1.1)},-88.6 ${f(8.6 + v * 1.1)},-85.4 ${f(8 + v * 0.5)},-84 C7.6,-82.6 7.4,${f(b - 1.6)} 7.1,${f(b)}`
    );
  }
  return (
    `M-7.1,${f(b)} C-7.3,${f(b - 1.6)} -7.4,-83 -${f(7.5 + v * 0.3)},-84.4 C-${f(7.7 + v * 0.55)},-85.8 -${f(7.7 + v * 0.6)},-87 -${f(7.6 + v * 0.6)},-88 ` +
    `C-${f(7.2 + v * 0.5)},${f(-91.4 - v * 0.6)} -4.4,${f(-92.6 - v * 1.2)} 0,${f(-92.8 - v * 1.25)} ` +
    `C4.4,${f(-92.6 - v * 1.2)} ${f(7.2 + v * 0.5)},${f(-91.4 - v * 0.6)} ${f(7.6 + v * 0.6)},-88 ` +
    `C${f(7.7 + v * 0.6)},-87 ${f(7.7 + v * 0.55)},-85.8 ${f(7.5 + v * 0.3)},-84.4 C7.4,-83 7.3,${f(b - 1.6)} 7.1,${f(b)}`
  );
}

/** Seeded 0..1 noise so a cut's texture is the same every render. */
const hairRand = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function hairTexture(c, cut, hl, lo) {
  let out = "";
  const top = -92.6 - cut.v * 1.2;
  if (cut.tex === "stipple") {
    // Close crop: short flecks over the scalp, denser toward the crown.
    for (let i = 0; i < 70; i++) {
      const x = (hairRand(i) - 0.5) * 15;
      const y = top + 0.6 + hairRand(i + 99) * (cut.line - top + 3 - Math.abs(x) * 0.1);
      out += `<path d="M${pt(x, y)} l${f((hairRand(i + 7) - 0.5) * 0.4)},.45" stroke="${i % 3 ? lo : hl}" stroke-width=".22" stroke-opacity="${i % 3 ? 0.5 : 0.35}"/>`;
    }
    return out;
  }
  if (cut.tex === "coil" || cut.tex === "locs") {
    // Tight curls: small arcs scattered over the mass, light on the upper side.
    const n = cut.round ? 90 : 46;
    const w = cut.round ? 8.4 + cut.v : 7.6 + cut.v * 0.6;
    for (let i = 0; i < n; i++) {
      const x = (hairRand(i) - 0.5) * 2 * w;
      const yTop = -92.6 - cut.v * (cut.round ? 1.3 : 1.1) + (x / w) ** 2 * (cut.round ? 4.2 : 3);
      const y = yTop + 0.5 + hairRand(i + 50) * (cut.line + (Math.abs(x) > 5.6 ? 6 : 0) - yTop);
      const r = 0.55 + hairRand(i + 21) * 0.4;
      out += `<path d="M${pt(x - r, y)} a${f(r)},${f(r)} 0 0 1 ${f(r * 2)},0" fill="none" stroke="${hl}" stroke-width=".26" stroke-opacity=".42"/>`;
      out += `<path d="M${pt(x - r, y + 0.15)} a${f(r)},${f(r)} 0 0 0 ${f(r * 2)},0" fill="none" stroke="${lo}" stroke-width=".26" stroke-opacity=".5"/>`;
    }
    return out;
  }
  // Strands: from the parting (or the crown, swept back) out to the hairline
  // and down the sides, bowed in the direction of the cut's flow.
  const n = 26;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = Math.PI * (1.02 + t * 0.96);
    const ex = Math.cos(a) * 7.4;
    const ey = Math.max(-91, cut.line + 0.4 + (1 - Math.abs(Math.sin(a))) * 6);
    let sx;
    let sy;
    if (cut.back) {
      // Swept back: strands run from the hairline up over the crown.
      sx = ex * 0.35;
      sy = top + 0.4;
    } else {
      sx = cut.part ?? 0;
      sy = top + 0.9;
      if ((cut.part ?? 0) !== 0 && Math.sign(ex - sx) !== Math.sign(cut.flow || 1) && Math.abs(ex - sx) > 2) sx += (ex - sx) * 0.15;
    }
    const bow = (cut.flow || (ex < (cut.part ?? 0) ? -0.6 : 0.6)) * 1.4;
    const mx = (sx + ex) / 2 + bow;
    const my = (sy + ey) / 2 - 0.6;
    const col = i % 3 === 0 ? hl : lo;
    out += `<path d="M${pt(sx, sy)} Q${pt(mx, my)} ${pt(ex, ey)}" fill="none" stroke="${col}" stroke-width="${i % 3 === 0 ? 0.24 : 0.26}" stroke-opacity="${(i % 3 === 0 ? 0.36 : 0.32) * (cut.shine ? 0.6 : 1)}" stroke-linecap="round"/>`;
  }
  if (cut.part != null) out += line(`M${pt(cut.part, top + 0.8)} L${pt(cut.part * 0.9, cut.line + 0.2)}`, lo, 0.4, 0.55);
  return out;
}

function scalpHair(c, cut) {
  // Shaved sides of a dyed cut (the mohawk) grow back the natural colour.
  const root = cut.extra === "crest" && c.hair.brow ? c.hair.brow : c.hair.color;
  const color = cut.fade ? mix(root, c.skin.color, cut.fade) : c.hair.color;
  const hl = mix(root, "#ffffff", 0.42);
  const lo = mix(root, "#000000", 0.62);
  const crown = crownPath(cut);
  const mass = `${crown} ${hairlinePath(cut)} Z`;
  // The hairline alone, as an open path, for the feather and the cast shadow.
  const hairline = `M6.6,${f(cut.burn)} ` + hairlinePath(cut).slice(1);
  const shadowLine = hairline.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => `${x},${f(Number(y) + 0.7)}`);
  const fill = cut.fade ? color : "url(#hair)";
  let out =
    // Shadow the hair casts on the forehead and temples.
    line(shadowLine.replace(/^M/, "M"), c.skin.shadow, 1.6, 0.22) +
    // Feather: a soft fringe of hair colour just past the edge.
    line(hairline, color, 0.9, cut.fade ? 0.25 : 0.4) +
    `<path d="${mass}" fill="${fill}"/>` +
    `<clipPath id="hairClip"><path d="${mass}"/></clipPath>` +
    `<g clip-path="url(#hairClip)">` +
    // Light from the top left: a sheen band across the crown.
    `<path d="M-7,${f(-90 - cut.v)} C-4,${f(-93 - cut.v * 1.2)} 2,${f(-93.4 - cut.v * 1.2)} 6,${f(-91.4 - cut.v)}" fill="none" stroke="${hl}" stroke-width="${cut.shine ? 1.6 : 1.1}" stroke-opacity="${cut.shine ? 0.35 : 0.2}" stroke-linecap="round"/>` +
    hairTexture(c, cut, hl, lo) +
    // Depth: the sides and the hair over the ears sit in shade.
    `<path d="M7.8,-80 L7.8,-92 L4,-96 L10,-96 L10,-80 Z" fill="${lo}" opacity=".25"/>` +
    `</g>` +
    // Ink on the outer silhouette only.
    `<path d="${crown}" fill="none" stroke="${INK}" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += hairExtra(c, cut, hl, lo);
  return out;
}

function hairExtra(c, cut, hl, lo) {
  switch (cut.extra) {
    case "sweep": {
      // A fringe lock swept from the parting across the forehead.
      const lock =
        "M-3,-92.4 C0.4,-92.8 4.8,-91.4 6.6,-87.8 C6.9,-87 7,-86.2 6.8,-85.4 C6,-86.6 4.8,-87.3 3.4,-87.4 " +
        "C1.6,-87.5 -0.2,-88.1 -1.4,-89.2 C-2.2,-89.9 -2.8,-90.9 -3,-92.4 Z";
      let s = `<path d="${lock}" fill="url(#hair)" stroke="${INK}" stroke-width=".35"/>`;
      s += line("M-2.4,-91.6 C0,-91.6 3.6,-90.4 5.8,-87.6 M-1.6,-90.4 C0.6,-89.8 3,-89.2 4.8,-88", hl, 0.3, 0.55);
      s += line("M-0.6,-89.2 C1.4,-88.4 3.6,-88.2 5.4,-87.2", lo, 0.3, 0.5);
      if (c.hair.id === "white") s += line("M-2.2,-91.8 C0.4,-91.8 3.6,-90.6 5.6,-88", c.energy, 0.45, 0.8);
      return s;
    }
    case "curtain": {
      // Two soft curtains from a centre parting, falling past the temples.
      const L = "M-0.2,-92.6 C-2.6,-92.4 -5.4,-90.6 -6.6,-87.4 C-7.2,-85.8 -7.4,-84 -7.2,-82.2 C-6.6,-83.8 -5.8,-85.4 -4.6,-86.4 C-3.2,-87.4 -1.4,-88.6 -0.2,-92.6 Z";
      const piece = (d) =>
        `<path d="${d}" fill="url(#hair)" stroke="${INK}" stroke-width=".35"/>` +
        line(d.split(" C")[0] + " C" + d.split(" C")[1], hl, 0.3, 0.5);
      let s = piece(L) + piece(mirror(L));
      if (c.hair.id === "long") {
        // Locks in front of the ears, down to the collar.
        const lock = "M-7.4,-84 C-8.2,-80 -8.4,-75 -8,-70.6 C-7.8,-68.8 -7,-67.6 -6.2,-67.2 C-6.8,-70.4 -6.8,-75 -6.4,-79.4 C-6.2,-81.4 -6.4,-83 -7.4,-84 Z";
        s += `<path d="${lock}" fill="url(#hair)" stroke="${INK}" stroke-width=".35"/>` + `<path d="${mirror(lock)}" fill="url(#hair)" stroke="${INK}" stroke-width=".35"/>`;
        s += line("M-7.6,-80 C-7.8,-76 -7.6,-72 -7,-69 M7.6,-80 C7.8,-76 7.6,-72 7,-69", hl, 0.25, 0.45);
      }
      return s;
    }
    case "flattop": {
      // High-top: a squared block rising from the crown, softened corners.
      const d = "M-6,-88.6 C-6.4,-91 -6.6,-94.2 -6.2,-96.4 C-6,-97.2 -5.4,-97.6 -4.6,-97.7 L4.6,-97.7 C5.4,-97.6 6,-97.2 6.2,-96.4 C6.6,-94.2 6.4,-91 6,-88.6 C4,-89.6 -4,-89.6 -6,-88.6 Z";
      let s = `<path d="${d}" fill="url(#hair)" stroke="${INK}" stroke-width=".45"/>`;
      for (let x = -5; x <= 5.1; x += 1.25) s += line(`M${pt(x, -97)} L${pt(x * 1.04, -90)}`, lo, 0.25, 0.35);
      s += line("M-5.4,-96.8 L5.4,-96.8", hl, 0.4, 0.45);
      return s;
    }
    case "crest": {
      // Mohawk: a tapered crest rooted along the centre of the scalp.
      const d = "M-1.8,-88.4 C-2.6,-91.6 -2.6,-95.2 -1.6,-98.4 L-0.7,-96.6 L0,-101 L0.8,-96.8 L1.8,-98.8 C2.8,-95.4 2.8,-91.6 1.8,-88.4 C1,-88.9 -1,-88.9 -1.8,-88.4 Z";
      return `<path d="${d}" fill="url(#hair)" stroke="${INK}" stroke-width=".45"/>` + line("M-0.8,-90 C-1.1,-93 -0.9,-95.6 -0.3,-97.4", hl, 0.4, 0.6) + line("M0.9,-90 C1.1,-93 1,-95 0.6,-96.4", lo, 0.35, 0.5);
    }
    case "bun": {
      const tie = shape("M-1.5,-93.4 L1.5,-93.4 L1.3,-92.5 L-1.3,-92.5 Z", c.pal.primary, 0.4);
      return (
        `<circle cx="0" cy="-96" r="3.1" fill="url(#hair)" stroke="${INK}" stroke-width=".45"/>` +
        line("M-2.2,-96.6 C-1,-98.4 1,-98.4 2.2,-96.6 M-2,-95 C-0.6,-96.2 1,-96.2 2.4,-95.2", hl, 0.3, 0.5) +
        tie
      );
    }
    case "braid":
      return braid(c);
    case "locs": {
      // Two locs frame each side of the face, hanging past the jaw.
      let strands = "";
      for (const [x, len] of [[-8.3, 13], [-7.1, 10.5], [7.1, 10.5], [8.3, 13]]) {
        const y1 = -86 + len;
        const w = x < 0 ? -0.35 : 0.35;
        strands += `<path d="M${f(x - 0.6)},-86 C${f(x - 0.6 + w)},${f(-86 + len * 0.5)} ${f(x - 0.5 - w)},${f(y1 - 1.5)} ${f(x - 0.4)},${f(y1)} C${f(x - 0.2)},${f(y1 + 0.7)} ${f(x + 0.2)},${f(y1 + 0.7)} ${f(x + 0.4)},${f(y1)} C${f(x + 0.5 - w)},${f(y1 - 1.5)} ${f(x + 0.6 + w)},${f(-86 + len * 0.5)} ${f(x + 0.6)},-86 Z" fill="url(#hair)" stroke="${INK}" stroke-width=".35"/>`;
      }
      return strands;
    }
    default:
      return "";
  }
}

/** Hair that falls behind the face: volume at the back of the head, and long cuts. */
function hairBack(c) {
  const id = c.hair.id;
  const back = mix(c.hair.color, "#000000", 0.3);
  if (id === "none") return "";
  const cut = HAIR_CUTS[id] || HAIR_CUTS.short;
  // Back of the head, showing past the skull and behind the ears.
  const v = cut.v;
  const w = cut.round ? 8.4 + v * 1.05 : 7.6 + v * 0.55;
  let out = cut.fade && !cut.round
    ? ""
    : `<path d="M-${f(w - 0.8)},-81.6 C-${f(w + 0.2)},-86 -${f(w - 0.4)},${f(-92 - v)} 0,${f(-93 - v * 1.1)} C${f(w - 0.4)},${f(-92 - v)} ${f(w + 0.2)},-86 ${f(w - 0.8)},-81.6 C${f(w - 2)},-80.6 -${f(w - 2)},-80.6 -${f(w - 0.8)},-81.6 Z" fill="${back}" stroke="${INK}" stroke-width=".45"/>`;
  if (id === "long")
    out += shape("M-8.6,-86 C-9.8,-94 -4.8,-95.2 0,-95.2 C4.8,-95.2 9.8,-94 8.6,-86 L9.8,-70.4 C10,-66.6 8.4,-64.8 6.2,-65.4 L-6.2,-65.4 C-8.4,-64.8 -10,-66.6 -9.8,-70.4 Z", back, 0.6);
  if (id === "locs") {
    for (let x = -8.4; x <= 8.5; x += 2.1) {
      const y0 = -91 + (x / 8.4) ** 2 * 4;
      out += `<path d="M${f(x - 0.9)},${f(y0)} C${f(x - 1.1)},-80 ${f(x - 0.7)},-74 ${f(x - 0.9)},-67.4 C${f(x - 0.6)},-66 ${f(x + 0.6)},-66 ${f(x + 0.9)},-67.4 C${f(x + 0.7)},-74 ${f(x + 1.1)},-80 ${f(x + 0.9)},${f(y0)} Z" fill="${back}" stroke="${INK}" stroke-width=".35"/>`;
    }
  }
  if (id === "ponytail")
    out += shape("M6.6,-90.6 C10.6,-90 11.4,-85.4 10.6,-80 C10,-75.4 10.8,-71.4 12,-68.4 C9.6,-69.4 8.2,-72.8 8,-77 C7.8,-81 8.4,-85.6 6.4,-88.2 Z", "url(#hair)", 0.6);
  return out;
}

function braid(c) {
  let out = "";
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const x = -8 - t * 4;
    const y = -78 + t * 21;
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="1.9" ry="2.4" transform="rotate(${f(12 + t * 8)} ${f(x)} ${f(y)})" fill="url(#hair)" stroke="${INK}" stroke-width=".5"/>`;
  }
  return out + `<circle cx="-12.2" cy="-55" r="1" fill="${c.pal.primary}" stroke="${INK}" stroke-width=".4"/>`;
}

// ---------------------------------------------------------------------------
// Helmets and visors
// ---------------------------------------------------------------------------

/** Helmets that leave the face visible without `peek`. */
export const OPEN_HELMETS = new Set(["wide", "mohawk"]);

const SHELLS = {
  standard:
    "M0,-95 C7.6,-95 11.4,-89.8 11.4,-82.5 L11,-77 C10.6,-73.4 8.6,-70.6 5,-69 C3,-68.2 1.5,-68 0,-68 " +
    "C-1.5,-68 -3,-68.2 -5,-69 C-8.6,-70.6 -10.6,-73.4 -11,-77 L-11.4,-82.5 C-11.4,-89.8 -7.6,-95 0,-95 Z",
  angular: "M0,-96 L7.8,-94.4 L12,-88.4 L12.3,-79 L9.8,-72 L4.6,-68.2 L0,-67.6 L-4.6,-68.2 L-9.8,-72 L-12.3,-79 L-12,-88.4 L-7.8,-94.4 Z",
  crested:
    "M0,-95.6 C7.8,-95 11.6,-89.8 11.6,-82.5 L11.2,-77 C10.8,-73 8.6,-70.4 5,-68.8 L0,-67.6 L-5,-68.8 " +
    "C-8.6,-70.4 -10.8,-73 -11.2,-77 L-11.6,-82.5 C-11.6,-89.8 -7.8,-95 0,-95.6 Z",
  wide:
    "M0,-96.4 C9.6,-96.4 14.2,-90.6 14.2,-82.8 L14.4,-75.4 C14,-71.6 11.2,-69.2 7.4,-68.4 L4.8,-68.2 L4.8,-71.6 " +
    "C6.8,-73.2 8,-75.8 8.2,-79 L8.4,-87 L-8.4,-87 L-8.2,-79 C-8,-75.8 -6.8,-73.2 -4.8,-71.6 L-4.8,-68.2 L-7.4,-68.4 " +
    "C-11.2,-69.2 -14,-71.6 -14.4,-75.4 L-14.2,-82.8 C-14.2,-90.6 -9.6,-96.4 0,-96.4 Z",
  mohawk:
    "M0,-95 C7.8,-95 11.8,-89.8 11.8,-82.5 L11.6,-76 C11.4,-72 9.8,-69.6 6.8,-68.6 L4.2,-68.4 C3.8,-71.4 3.6,-74 4.6,-76.6 " +
    "L6.6,-80 L6.8,-86.6 L-6.8,-86.6 L-6.6,-80 L-4.6,-76.6 C-3.6,-74 -3.8,-71.4 -4.2,-68.4 L-6.8,-68.6 " +
    "C-9.8,-69.6 -11.4,-72 -11.6,-76 L-11.8,-82.5 C-11.8,-89.8 -7.8,-95 0,-95 Z",
  // Ordnance: hard faceted brow over a narrow jaw, built around a raised
  // centre ridge that carries the targeting spine.
  ordnance:
    "M0,-97.4 L6.4,-95.6 L11.8,-90.4 L12.6,-82 L11.4,-76.6 L7.2,-71.2 L3.2,-68.2 L0,-67.8 " +
    "L-3.2,-68.2 L-7.2,-71.2 L-11.4,-76.6 L-12.6,-82 L-11.8,-90.4 L-6.4,-95.6 Z",
  // Bucket: low, wide and round, sunk deep so the collar swallows the neck.
  bucket:
    "M0,-93.2 C9,-93.2 13.6,-88.4 13.8,-81.6 L13.6,-75.4 C13.2,-71.6 10.4,-69 6.2,-68.2 " +
    "L0,-67.6 L-6.2,-68.2 C-10.4,-69 -13.2,-71.6 -13.6,-75.4 L-13.8,-81.6 C-13.6,-88.4 -9,-93.2 0,-93.2 Z",
  // Crusader: a beaked snout under a domed skull, cut for a vertical slit.
  crusader:
    "M0,-97 C8,-96.4 11.8,-90.8 11.8,-83.4 L11.4,-79 C11,-76.2 9.6,-74.2 7.4,-73 " +
    "L5.6,-68.2 C3.6,-66.6 -3.6,-66.6 -5.6,-68.2 L-7.4,-73 C-9.6,-74.2 -11,-76.2 -11.4,-79 " +
    "L-11.8,-83.4 C-11.8,-90.8 -8,-96.4 0,-97 Z",
  // Sealed: one continuous teardrop shell, no ear cups, no seams.
  sealed:
    "M0,-95.8 C8.2,-95.8 12,-90.2 11.8,-82.6 L11.2,-76.2 C10.6,-72.4 8,-69.6 4.4,-68.4 " +
    "L0,-67.8 L-4.4,-68.4 C-8,-69.6 -10.6,-72.4 -11.2,-76.2 L-11.8,-82.6 C-12,-90.2 -8.2,-95.8 0,-95.8 Z",
};
const SHELL_HALF = {
  standard: 11.2, angular: 12.2, crested: 11.4, wide: 14.2, mohawk: 11.7,
  ordnance: 12.5, bucket: 13.7, crusader: 11.7, sealed: 11.7,
};

/** Helmets that are one sealed shell — no bolted-on ear cups. */
const EARLESS_HELMETS = new Set(["sealed", "crusader"]);

/** Extra shell detail per helmet, drawn over the shell and under the visor. */
function helmetDetail(c, style, w) {
  switch (style) {
    case "ordnance":
      // Targeting spine down the centre ridge, plus a stubby sensor stalk.
      return (
        line("M0,-96.4 L0,-69", INK, 1.5, 0.75) +
        line("M0,-95.6 L0,-70", "#c9d6e2", 0.6, 0.6) +
        shape("M-12.4,-88.6 L-16.8,-90.6 L-17.4,-86.2 L-12.6,-84.6 Z", "url(#steelDk)", 0.7) +
        line("M-5.4,-93.6 L-9.6,-89.4 M5.4,-93.6 L9.6,-89.4", INK, 0.55, 0.6)
      );
    case "bucket":
      // Riveted brow band and a chin vent — utilitarian, not sculpted.
      return (
        line(`M${f(-w + 1.4)},-85.6 C-6,-88.4 6,-88.4 ${f(w - 1.4)},-85.6`, INK, 0.7, 0.75) +
        `<g fill="#0a0f16">` +
        [-9.4, -4.8, 4.8, 9.4].map((x) => `<circle cx="${f(x)}" cy="-84.2" r=".75"/>`).join("") +
        `</g>` +
        line("M-5.6,-72 L5.6,-72 M-4.8,-70.2 L4.8,-70.2", INK, 0.55, 0.65)
      );
    case "crusader":
      // Beak ridge and a rim of rivets around the dome, monastic rather than
      // military: the shell reads as cast, not assembled.
      return (
        line("M0,-96 L0,-73.4", INK, 1.2, 0.7) +
        shape("M-2.4,-74.8 L2.4,-74.8 L1.8,-67.2 L-1.8,-67.2 Z", "url(#steelDk)", 0.7) +
        `<g fill="#c8102e">` +
        [-8.6, 0, 8.6].map((x) => `<circle cx="${f(x)}" cy="-91.4" r=".9"/>`).join("") +
        `</g>` +
        line("M-9.8,-88.4 C-5,-91 5,-91 9.8,-88.4", "#c8102e", 0.7, 0.85)
      );
    case "sealed":
      // Almost nothing: one soft crown highlight is the whole point.
      return line("M-6.6,-92.4 C-2.6,-94.2 2.6,-94.2 6.6,-92.4", "#f4fbfa", 0.8, 0.5);
    default:
      return "";
  }
}

/** Closed visor per style: recess + glass markup and its glow. */
function closedVisor(c) {
  const v = c.visor;
  const e = c.energy;
  if (v === "goldwrap") {
    // A big tinted dome visor wrapping the face: you see yourself, not them.
    const glass = "M-10.8,-87.4 C-5,-89.6 5,-89.6 10.8,-87.4 L10.6,-80.4 C9.6,-77.4 6.8,-75.8 3.4,-75.6 L-3.4,-75.6 C-6.8,-75.8 -9.6,-77.4 -10.6,-80.4 Z";
    return {
      jaw: true,
      body:
        shape("M-11.6,-88.4 C-5,-90.8 5,-90.8 11.6,-88.4 L11.4,-79.8 C10.4,-76.4 7.2,-74.6 3.6,-74.4 L-3.6,-74.4 C-7.2,-74.6 -10.4,-76.4 -11.4,-79.8 Z", "#05070a", 0.6) +
        shape(glass, "url(#goldGlass)", 0.4) +
        line("M-9.2,-86 C-5,-87.8 -1,-88.2 2.4,-88", "#fff6d0", 0.9, 0.75) +
        line("M-9.6,-83.4 L-6.4,-77.6 M-7,-84.6 L-4.4,-79.8", "#ffffff", 0.5, 0.3) +
        line("M8.8,-86.4 C10.2,-84.6 10.4,-82.4 10,-80.4", "#fff6d0", 0.5, 0.5),
      glow: line("M-8.6,-77.2 C-4,-75.8 4,-75.8 8.6,-77.2", e, 0.45, 0.6),
      eyeGlints: false,
    };
  }
  if (v === "fullface") {
    const plate =
      "M-10.8,-88 C-4,-89.6 4,-89.6 10.8,-88 L10.6,-78.4 C9.8,-74.6 7.2,-71.6 3.8,-70.4 L-3.8,-70.4 C-7.2,-71.6 -9.8,-74.6 -10.6,-78.4 Z";
    return {
      jaw: false,
      body:
        shape(plate, "url(#mirrorGlass)", 0.8) +
        line("M-8.6,-86.4 L-3.4,-74.2 M-5.6,-87.4 L-1.8,-78.6", "#ffffff", 0.7, 0.28) +
        line("M6.6,-87.6 C9.2,-86.8 10.2,-84 10,-80", "#ffffff", 0.5, 0.45) +
        line("M-10.4,-78.2 C-9.6,-74.6 -7.2,-71.8 -3.8,-70.6", INK, 0.5, 0.8),
      glow: line("M-8.8,-80.2 L8.8,-80.2", e, 0.5, 0.55) + `<path d="M-8.8,-80.2 L8.8,-80.2" stroke="${e}" stroke-width="1.6" filter="url(#glow)" opacity=".5"/>`,
      eyeGlints: false,
    };
  }
  if (v === "slit") {
    const recess = "M-11.2,-84.8 L0,-83.6 L11.2,-84.8 L11,-80 L0,-79 L-11,-80 Z";
    const glass = "M-10.2,-83.1 L0,-82.1 L10.2,-83.1 L10.1,-81.3 L0,-80.5 L-10.1,-81.3 Z";
    return {
      jaw: true,
      body: shape(recess, "#03060a", 0.5) + shape(glass, "url(#visor)", 0.3),
      glow:
        `<path d="${glass}" fill="${e}" filter="url(#bloom)" opacity=".75"/><path d="${glass}" fill="${e}" filter="url(#glow)"/>` +
        line("M-9.6,-82.2 L0,-81.3 L9.6,-82.2", c.hot, 0.55, 1),
      eyeGlints: true,
    };
  }
  if (v === "split") {
    const recess = "M-11.2,-86 L-1.4,-85 L0,-83.8 L1.4,-85 L11.2,-86 L10.9,-78.2 L1.8,-77.8 L0,-78.8 L-1.8,-77.8 L-10.9,-78.2 Z";
    const lens = "M-9.8,-84.4 C-6.6,-84.6 -3.6,-84.2 -2,-83.2 C-1.6,-81.4 -1.8,-79.8 -2.6,-79 C-5,-78.8 -7.8,-78.8 -9.6,-79.2 C-10.2,-81 -10.2,-82.8 -9.8,-84.4 Z";
    const lenses = `<path d="${lens}"/><path d="${mirror(lens)}"/>`;
    return {
      jaw: true,
      body:
        shape(recess, "#03060a", 0.5) +
        `<g fill="url(#visor)" stroke="${INK}" stroke-width=".3">${lenses}</g>` +
        line("M-8.8,-83.6 L-5.4,-83.5", "#ffffff", 0.5, 0.7),
      glow:
        `<g fill="${e}" filter="url(#bloom)" opacity=".7">${lenses}</g><g fill="${e}" filter="url(#glow)">${lenses}</g>` +
        `<g fill="${c.hot}"><ellipse cx="-5.8" cy="-81.6" rx="2.2" ry=".7"/><ellipse cx="5.8" cy="-81.6" rx="2.2" ry=".7"/></g>`,
      eyeGlints: true,
    };
  }
  const recess = "M-11.3,-86.2 L-2.4,-84.8 L0,-83.2 L2.4,-84.8 L11.3,-86.2 L10.9,-78.4 L3.4,-76.6 L0,-75.6 L-3.4,-76.6 L-10.9,-78.4 Z";
  const glass = "M-10.2,-85.1 L-2.4,-83.8 L0,-82.3 L2.4,-83.8 L10.2,-85.1 L10,-79.3 L3.2,-77.7 L0,-76.9 L-3.2,-77.7 L-10,-79.3 Z";
  const band = "M-9.4,-81.8 L-2.6,-80.6 L0,-79.6 L2.6,-80.6 L9.4,-81.8";
  if (v === "glow") {
    return {
      jaw: true,
      body: shape(recess, "#03060a", 0.5) + shape(glass, "url(#visor)", 0.3) + shape("M-4,-86.8 L4,-86.8 L3,-84.6 L-3,-84.6 Z", "url(#steelDk)", 0.4),
      glow:
        `<ellipse cx="0" cy="-81" rx="17" ry="7" fill="${e}" filter="url(#bloom)" opacity=".45"/>` +
        `<path d="${glass}" fill="${e}" filter="url(#bloom)"/><path d="${glass}" fill="${c.core}" filter="url(#glow)"/>` +
        line(band, "#ffffff", 1.6, 1) +
        `<rect x="-2.4" y="-86.2" width="4.8" height="1" fill="${c.hot}"/>`,
      eyeGlints: false,
    };
  }
  return {
    jaw: true,
    body: shape(recess, "#03060a", 0.5) + shape(glass, "url(#visor)", 0.3) + line("M-9,-84 L-4.6,-83.1", "#ffffff", 0.6, 0.8),
    glow: `<path d="${glass}" fill="${e}" filter="url(#bloom)" opacity=".7"/><path d="${glass}" fill="${e}" filter="url(#glow)"/>` + line(band, c.hot, 0.8, 1),
    eyeGlints: true,
  };
}

/** Visor flipped up onto the brow of an open helmet. */
function raisedVisor(c, y) {
  const v = c.visor;
  const e = c.energy;
  const plate = `M-10.4,${y - 4.6} C-4,${y - 5.8} 4,${y - 5.8} 10.4,${y - 4.6} L10,${y} C4,${y - 0.8} -4,${y - 0.8} -10,${y} Z`;
  let glass;
  if (v === "fullface") glass = `<path d="M-9.4,${y - 4} C-4,${y - 5} 4,${y - 5} 9.4,${y - 4} L9.1,${y - 0.9} C4,${y - 1.6} -4,${y - 1.6} -9.1,${y - 0.9} Z" fill="url(#mirrorGlass)"/>`;
  else if (v === "split")
    glass = `<g fill="url(#visor)"><ellipse cx="-5.2" cy="${y - 2.6}" rx="3.6" ry="1.5"/><ellipse cx="5.2" cy="${y - 2.6}" rx="3.6" ry="1.5"/></g>`;
  else if (v === "slit") glass = `<rect x="-9" y="${f(y - 3.1)}" width="18" height="1" fill="url(#visor)"/>`;
  else glass = `<path d="M-9.2,${y - 3.8} C-4,${y - 4.8} 4,${y - 4.8} 9.2,${y - 3.8} L9,${y - 1.4} C4,${y - 2.2} -4,${y - 2.2} -9,${y - 1.4} Z" fill="url(#visor)"/>`;
  const glowPath = v === "fullface" ? "" : `<path d="M-8,${f(y - 2.7)} C-4,${f(y - 3.4)} 4,${f(y - 3.4)} 8,${f(y - 2.7)}" fill="none" stroke="${e}" stroke-width="${v === "glow" ? 1.4 : 0.8}"/>`;
  return {
    body: shape(plate, "url(#steelDk)", 0.8) + glass + line(`M-9.6,${f(y - 4.8)} C-4,${f(y - 6)} 2,${f(y - 6)} 6,${f(y - 5.4)}`, "#eaf4ff", 0.45, 0.6),
    glow: glowPath ? `<g filter="url(#glow)" opacity=".7">${glowPath}</g>${glowPath.replace(e, c.core)}` : "",
  };
}

/**
 * Head assembly. Returns { back, front, glow }: `back` goes behind the body
 * (hoods, tool arms), `front` is the head itself, `glow` the lit parts.
 */
/**
 * Body-type reshape: scale every x by a factor that depends on height, so
 * shoulders, waist and hips change width and everything at that height —
 * plates, arms, gear, badges — follows the silhouette. Works on any markup
 * whose coordinates are absolute "x,y" pairs (the whole rig).
 */
/** The belt buckle light alone, for suits whose chest carries its own lights. */
const BELT_GLOW = energy(`<rect x="-1.8" y="-26" width="3.6" height="2.2" rx=".3"/>`);
/**
 * Remap the x of every point in rig markup: "x,y" pairs (paths, polygons,
 * translate(x,y)), cx/cy (circles, ellipses) and x/y (rects, text).
 * fx(x, y) returns the new x; y is kept.
 */
const NUM = String.raw`(-?\d*\.?\d+)`;
const PAIR_RE = new RegExp(`${NUM},${NUM}`, "g");
const CXY_RE = new RegExp(`cx="${NUM}" cy="${NUM}"`, "g");
const XY_RE = new RegExp(`(<(?:rect|text)[^>]*?) x="${NUM}" y="${NUM}"`, "g");
function mapX(markup, fx) {
  const nx = (x, y) => f(fx(Number(x), Number(y)));
  const mapTag = (tag) =>
    tag
      .replace(PAIR_RE, (_, x, y) => `${nx(x, y)},${y}`)
      .replace(CXY_RE, (_, x, y) => `cx="${nx(x, y)}" cy="${y}"`)
      .replace(XY_RE, (_, pre, x, y) => `${pre} x="${nx(x, y)}" y="${y}"`);
  // A group drawn in its own rotated frame (rotate(a), no pivot) is local:
  // its origin moves with the map, the shape inside it does not.
  const out = [];
  const local = [false];
  for (const part of markup.split(/(<[^>]+>)/)) {
    if (!part) continue;
    if (part[0] !== "<") {
      out.push(part);
      continue;
    }
    const inLocal = local[local.length - 1];
    if (part.startsWith("</g")) {
      local.pop();
      out.push(part);
    } else if (part.startsWith("<g") && !part.endsWith("/>")) {
      const rot = /rotate\(\s*-?[\d.]+\s*\)/.test(part);
      out.push(inLocal ? part : mapTag(part));
      local.push(inLocal || rot);
    } else {
      out.push(inLocal ? part : mapTag(part));
    }
  }
  return out.join("");
}

const warpX = (markup, k) => mapX(markup, (x, y) => x * k(y));
const piecewise = (stops) => (y) => {
  if (y <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [y1, v1] = stops[i];
    if (y <= y1) {
      const [y0, v0] = stops[i - 1];
      return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
    }
  }
  return stops[stops.length - 1][1];
};
/**
 * Body builds. Proportions move the joints (shoulder and hip spacing), so
 * limbs keep their own shape and only get thicker or slimmer (armW, legW);
 * the torso alone is reshaped by height (`torso`). `scale` grows the whole
 * figure from the soles while the head keeps its size, so a taller build
 * also reads more heroic; `shoulder` scales the pauldrons.
 */
const BUILDS = {
  // Taller, broad through the chest and shoulders, a V down to the waist,
  // heavier arms.
  masc: {
    sh: 1.07, hip: 1, armW: 1.12, legW: 1.04, shoulder: 1.08, scale: 1.05, head: 1,
    torso: piecewise([[-80, 1.1], [-64, 1.1], [-52, 1.08], [-42, 1.03], [-34, 0.97], [-26, 1], [60, 1]]),
  },
  // Athletic: narrower shoulders, a defined waist, fuller hips; toned limbs,
  // not thin ones.
  fem: {
    sh: 0.91, hip: 1.07, armW: 0.93, legW: 0.99, shoulder: 0.9, scale: 0.99, head: 0.95,
    torso: piecewise([[-80, 0.9], [-64, 0.9], [-54, 0.95], [-46, 0.9], [-36, 0.84], [-28, 0.94], [-20, 1.1], [-6, 1.12], [60, 1.12]]),
  },
};
/**
 * Three-quarter turn. The rig is drawn facing the camera; turning it projects
 * every point through a depth model of the body — an ellipse at each height
 * for the torso (half-width TURN_W, front depth TURN_D), a sphere for the
 * head — so features on the front slide toward the far side and the far side
 * compresses, the way a body turned ~22° reads. Layers behind the body (cape,
 * back gear) turn the other way. Limbs, outside the torso's ellipse, only
 * close up a little.
 */
const TURN = (28 * Math.PI) / 180;
const TURN_W = piecewise([[-76, 7], [-68, 15], [-60, 18.4], [-48, 18], [-36, 14.6], [-24, 15.6], [-10, 14.4], [-4, 6], [0, 0.01], [60, 0.01]]);
const TURN_D = piecewise([[-76, 5], [-66, 9.4], [-54, 10.4], [-40, 8.6], [-24, 8.6], [-10, 6.4], [0, 3], [60, 2]]);
/** Limbs and the outer body close up less than a true cosine would (they are round too). */
const TURN_COS = piecewise([[-80, 0.9], [-10, 0.9], [10, 0.95], [60, 0.95]]);
function turnBody(markup, dir = 1, limbs = [], a = TURN) {
  const sn = Math.sin(a);
  const cs = Math.cos(a);
  return mapX(markup, (x, y) => {
    const q = 1 - (x / TURN_W(y)) ** 2;
    if (q > 0) return x * TURN_COS(y) + dir * sn * TURN_D(y) * Math.sqrt(q);
    // Outside the torso, a point on a limb turns about that limb's own axis:
    // its offset from the axis foreshortens and its depth carries it round,
    // so detail stays inside the limb's outline.
    for (const L of limbs) {
      const [ax, ay] = L.a;
      const [bx, by] = L.b;
      const dx = bx - ax;
      const dy = by - ay;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      const cx = ax + dx * t;
      const off = x - cx;
      if (Math.abs(off) < L.r && Math.abs(y - (ay + dy * t)) < L.r) {
        return cx * TURN_COS(y) + off * cs + dir * sn * L.r * 0.7 * Math.sqrt(1 - (off / L.r) ** 2);
      }
    }
    return x * TURN_COS(y);
  });
}



/** The head turns as a sphere about its centre (head coordinates). */
function turnHead(markup, a = TURN) {
  const sn = Math.sin(a);
  const cs = Math.cos(a);
  return mapX(markup, (x, y) => {
    const q = 1 - (x / 12) ** 2 - ((y + 82) / 15) ** 2;
    return x * cs + sn * (q > 0 ? 10.5 * Math.sqrt(q) : 0);
  });
}


/** A pose with the build's shoulder and hip spacing. Explicit elbow/wrist points (a grip) stay put. */
function buildPose(P, B) {
  return {
    ...P,
    arms: P.arms.map((arm) => ({ ...arm, sh: [arm.sh[0] * B.sh, arm.sh[1]] })),
    legs: P.legs.map((leg) => {
      const dx = leg.hip[0] * (B.hip - 1);
      const mv = (p) => [p[0] + dx, p[1]];
      return { ...leg, hip: mv(leg.hip), kn: mv(leg.kn), an: mv(leg.an) };
    }),
  };
}
/** Feminine jaw: the face narrows toward a softer chin. */
const FEM_JAW = piecewise([[-84, 1], [-78, 0.95], [-71, 0.8]]);
const femFace = (markup) =>
  warpX(markup, FEM_JAW) +
  // Lashes on the upper lids.
  line("M-4.7,-81.8 Q-5.3,-82 -5.8,-82.6 M4.7,-81.8 Q5.3,-82 5.8,-82.6", "#1a100c", 0.32, 0.85) +
  // Fuller lips.
  `<path d="M-2.1,-74.2 C-1.2,-74.9 -0.4,-74.6 0,-74.3 C0.4,-74.6 1.2,-74.9 2.1,-74.2 C1.2,-72.9 -1.2,-72.9 -2.1,-74.2 Z" fill="#a85a58" opacity=".55"/>`;
/** A moulded chest plate for the feminine frame (before the reshape narrows it). */
const FEM_CHEST =
  `<ellipse cx="-7" cy="-53" rx="6.4" ry="5" fill="url(#sheen)" opacity=".5"/>` +
  `<ellipse cx="7" cy="-53" rx="6.4" ry="5" fill="#000" opacity=".12"/>` +
  line("M-14.6,-51 C-13,-44.8 -5.2,-44 -1,-47.6 M14.6,-51 C13,-44.8 5.2,-44 1,-47.6", INK, 0.6, 0.55) +
  line("M-13.4,-50.6 C-11.6,-45.8 -5.6,-45.2 -2,-47.8", "#eaf4ff", 0.45, 0.35);

/**
 * Reaper: a knit balaclava with a painted skull, the agent's own eyes looking
 * out of the sockets, a comms headset and a field scarf bunched at the neck.
 */
function reaperHood(c) {
  const knit = "#141513";
  const bone = "#cfc8b6";
  const boneLo = "#8f8776";
  const hood =
    "M0,-95.6 C6.9,-95.6 10.1,-90.8 10.1,-84 C10.1,-78 9.4,-72.6 7,-68.6 L8.4,-64.8 L-8.4,-64.8 L-7,-68.6 " +
    "C-9.4,-72.6 -10.1,-78 -10.1,-84 C-10.1,-90.8 -6.9,-95.6 0,-95.6 Z";
  // Gaunt, angular skull: sharp temples, a brow that cuts down toward the
  // nose (a scowl), hollow cheeks, a long grimace from cheek to cheek.
  const cranium =
    "M-7,-85.6 C-7.2,-90.6 -4.2,-93.6 0,-93.6 C4.2,-93.6 7.2,-90.6 7,-85.6 L6.4,-81.6 C5.2,-82.6 3.4,-83.4 1.2,-82 " +
    "L0,-80.6 L-1.2,-82 C-3.4,-83.4 -5.2,-82.6 -6.4,-81.6 Z";
  const jaw =
    "M-6.2,-81 L-6.8,-77.6 L-5.4,-74.8 L-4,-72.4 L-2.6,-69.8 L2.6,-69.8 L4,-72.4 L5.4,-74.8 L6.8,-77.6 L6.2,-81 " +
    "C5,-79.8 3.6,-79.2 2.4,-79 L-2.4,-79 C-3.6,-79.2 -5,-79.8 -6.2,-81 Z";
  // Sockets slant down toward the nose; the top edge is the scowl.
  const socket = "M-6.2,-84.6 C-4.6,-84.4 -2.6,-83.4 -1.1,-81.8 C-1.2,-80.2 -2.4,-79.2 -3.8,-79.2 C-5.6,-79.4 -6.6,-81.4 -6.2,-84.6 Z";
  // Eyes behind the mask: black eye paint, only a cold glint shows.
  const eye = (x) =>
    `<ellipse cx="${x}" cy="-81.4" rx="1.05" ry=".42" fill="#2a2620" opacity=".9"/>` +
    `<circle cx="${x}" cy="-81.4" r=".42" fill="${mix(c.eyes, "#000000", 0.35)}"/><circle cx="${x}" cy="-81.4" r=".2" fill="#020202"/>` +
    `<circle cx="${f(x - 0.16)}" cy="-81.6" r=".11" fill="#fff"/>`;
  let teeth = "";
  // A long grimace: narrow teeth across the whole jaw, dark gaps between.
  for (let i = -4; i <= 4; i++) {
    const x = i * 0.78;
    const h = 1.9 - Math.abs(i) * 0.14;
    const y = -75.6 + Math.abs(i) * Math.abs(i) * 0.05;
    teeth +=
      `<rect x="${f(x - 0.3)}" y="${f(y)}" width=".6" height="${f(h)}" rx=".22" fill="${bone}"/>` +
      `<rect x="${f(x - 0.28)}" y="${f(y + h + 0.35)}" width=".56" height="${f(h * 0.85)}" rx=".22" fill="${boneLo}"/>`;
  }
  const mouth = "M-3.9,-75.8 C-2,-76.4 2,-76.4 3.9,-75.8 L3.4,-72.2 C1.6,-71.4 -1.6,-71.4 -3.4,-72.2 Z";
  const scarf =
    "M-9.8,-70.2 C-6,-67 6,-67 9.8,-70.2 C11.6,-68.4 12.8,-66.4 12.6,-64.6 C10.4,-63.4 8.6,-63.6 7,-62.4 " +
    "C4.6,-61 2.4,-62.2 0,-61 C-2.4,-62.2 -4.6,-61 -7,-62.4 C-8.6,-63.6 -10.4,-63.4 -12.6,-64.6 C-12.8,-66.4 -11.6,-68.4 -9.8,-70.2 Z";
  const front =
    shape(hood, knit, 1) +
    `<path d="${hood}" fill="url(#weave)" opacity=".6"/>` +
    `<ellipse cx="-4.4" cy="-90.6" rx="4" ry="2.4" fill="#fff" opacity=".05"/>` +
    // The print, worn into the knit.
    `<path d="${cranium}" fill="${bone}"/>` +
    `<path d="${jaw}" fill="${bone}"/>` +
    `<path d="M-6.6,-85.6 C-6.4,-89.8 -3.6,-92.4 0,-92.8" fill="none" stroke="#fff" stroke-width=".55" stroke-opacity=".35"/>` +
    // Temple and cheek hollows.
    `<path d="M6.8,-87.6 C6.2,-85.6 5.8,-84.4 5.2,-83.6 L6.6,-82.4 Z" fill="#141513" opacity=".55"/>` +
    `<path d="M-6.8,-87.6 C-6.2,-85.6 -5.8,-84.4 -5.2,-83.6 L-6.6,-82.4 Z" fill="#141513" opacity=".55"/>` +
    `<path d="M-6.4,-79.6 C-5.6,-78.4 -4.6,-77.4 -3.4,-76.8 L-5.2,-75.4 C-5.8,-76.6 -6.4,-78 -6.4,-79.6 Z" fill="#141513" opacity=".7"/>` +
    `<path d="M6.4,-79.6 C5.6,-78.4 4.6,-77.4 3.4,-76.8 L5.2,-75.4 C5.8,-76.6 6.4,-78 6.4,-79.6 Z" fill="#141513" opacity=".7"/>` +
    `<path d="${socket}" fill="#070707"/><path d="${mirror(socket)}" fill="#070707"/>` +
    eye(-3.4) +
    eye(3.4) +
    // Grime running down from the sockets.
    line("M-4.6,-79.2 C-4.8,-77.6 -4.6,-76.6 -4.9,-75.6 M-3.2,-79.2 L-3.3,-77.8 M4.4,-79.2 C4.6,-77.8 4.4,-77 4.6,-76.2", "#3a352a", 0.45, 0.55) +
    `<path d="M-0.75,-79.2 L0,-81 L0.75,-79.2 L0.45,-77 L-0.45,-77 Z" fill="#070707"/>` +
    `<path d="${mouth}" fill="#070707"/>` +
    teeth +
    `<g opacity=".25"><path d="${cranium}" fill="url(#weave)"/><path d="${jaw}" fill="url(#weave)"/></g>` +
    `<g fill="#2e2a22" opacity=".3"><ellipse cx="4.8" cy="-89.4" rx="1.6" ry=".8"/><ellipse cx="-5.4" cy="-73.6" rx="1.1" ry=".6"/><ellipse cx="1.4" cy="-92" rx=".9" ry=".45"/></g>` +
    // Comms headset.
    line("M-9.6,-85 C-9.8,-95 9.8,-95 9.6,-85", INK, 1.8, 1) +
    line("M-9.6,-85 C-9.8,-95 9.8,-95 9.6,-85", "#25282a", 1.1, 1) +
    shape("M-12,-84.6 C-12,-86.2 -10.8,-86.8 -9.6,-86.8 L-8.8,-86.8 L-8.8,-76.6 L-9.6,-76.6 C-10.8,-76.6 -12,-77.2 -12,-78.8 Z", "#202326", 0.8) +
    shape("M12,-84.6 C12,-86.2 10.8,-86.8 9.6,-86.8 L8.8,-86.8 L8.8,-76.6 L9.6,-76.6 C10.8,-76.6 12,-77.2 12,-78.8 Z", "#202326", 0.8) +
    line("M-11.4,-85 L-11.4,-78.4 M11.4,-85 L11.4,-78.4", "#3a3f44", 0.5, 0.8) +
    line("M-9.2,-79.6 C-8.6,-76.6 -7.4,-74.8 -5,-74.2", INK, 1, 1) +
    line("M-9.2,-79.6 C-8.6,-76.6 -7.4,-74.8 -5,-74.2", "#30353a", 0.55, 1) +
    `<ellipse cx="-4.8" cy="-74.2" rx=".8" ry=".65" fill="#111" stroke="${INK}" stroke-width=".35"/>` +
    // Field scarf, drab and worn.
    shape(scarf, "#34392a", 1) +
    `<path d="${scarf}" fill="url(#weave)"/>` +
    line("M-8.8,-67.8 C-5,-65 5,-65 8.8,-67.8 M-10.6,-66 C-7.4,-63.8 -4,-64.4 -1.6,-63 M10.6,-66 C7.4,-63.8 4,-64.4 1.6,-63", "#1c1f16", 0.6, 0.8) +
    line("M-10.4,-69.4 C-6,-66.2 -2,-65.6 1,-65.6", "#5c624a", 0.5, 0.55);
  return { front, glow: eyeGlow(c, 0.12) };
}

/** Do-rag: a tied head wrap over the skull, the face bare. */
function bandanaHead(c) {
  const cloth = "#2c3036";
  const wrap =
    "M-7.8,-84.4 C-8.2,-91.2 -4.6,-94.6 0,-94.6 C4.6,-94.6 8.2,-91.2 7.8,-84.4 C6.6,-86.8 4,-87.8 0,-87.9 C-4,-87.8 -6.6,-86.8 -7.8,-84.4 Z";
  const knot = "M7.2,-89.6 C9.6,-90.6 11,-89.4 10.4,-87.6 C9.8,-86.4 8.4,-86.6 7.6,-87.4 Z";
  const tails = "M9.6,-87.6 C11.4,-85 12.4,-81 12,-77.4 L10.6,-77.8 C10.8,-81 10.2,-84.4 8.8,-86.8 Z M10.2,-88 C12.6,-86.8 14.2,-84 14.4,-81.2 L13.2,-81 C12.8,-83.4 11.6,-85.6 9.6,-86.8 Z";
  let dots = "";
  for (let i = 0; i < 16; i++) {
    const x = -6.4 + (i % 8) * 1.8 + (i > 7 ? 0.9 : 0);
    const y = i > 7 ? -89.6 : -92.2;
    dots += `<circle cx="${f(x)}" cy="${f(y + Math.abs(x) * 0.08)}" r=".32" fill="#5a6068"/>`;
  }
  const faceMarkup = c.fem ? femFace(face(c)) : face(c);
  return {
    front:
      faceMarkup +
      shape(tails, cloth, 0.7) +
      shape(wrap, cloth, 0.8) +
      `<path d="${wrap}" fill="url(#weave)" opacity=".5"/>` +
      dots +
      line("M-6.8,-86.6 C-3.6,-88.6 3.6,-88.6 6.8,-86.6", "#4a5058", 0.5, 0.8) +
      line("M-6,-91 C-3.6,-93 0,-93.4 2.6,-93", "#ffffff", 0.5, 0.18) +
      shape(knot, cloth, 0.7),
    glow: eyeGlow(c, 0.3),
  };
}

/** Pilot: a sealed shell with a dark face plate and three round optics. */
function pilotHelmet(c) {
  const e = c.energy;
  const shell = SHELLS.standard;
  const plate = "M-9.6,-87.2 C-4.6,-88.8 4.6,-88.8 9.6,-87.2 L9.4,-77.8 C8,-74 5,-71.6 0,-70.8 C-5,-71.6 -8,-74 -9.4,-77.8 Z";
  const lenses = [[0, -82.6, 2.5], [-5, -83.2, 1.9], [5, -83.2, 1.9]];
  const ring = lenses.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${f(r + 0.7)}" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#visor)" stroke="${INK}" stroke-width=".35"/>`).join("");
  return {
    front:
      shape(shell, "url(#steel)") +
      `<ellipse cx="-5.2" cy="-89.6" rx="4.4" ry="2.8" fill="url(#sheen)"/>` +
      shape("M-2,-94.8 C-1.2,-95.4 1.2,-95.4 2,-94.8 L1.5,-88.6 L-1.5,-88.6 Z", "url(#steelDk)", 0.5) +
      shape(plate, "#0c0f13", 0.8) +
      ring +
      line("M-2.6,-75.4 L2.6,-75.4 M-3,-73.8 L3,-73.8", "#2a3038", 0.6, 1) +
      line("M-1.2,-84.2 C-0.6,-84.8 0.4,-84.9 1,-84.6", "#ffffff", 0.45, 0.8) +
      `<circle cx="-11" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/><circle cx="11" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>`,
    glow:
      `<g fill="${e}" filter="url(#bloom)" opacity=".6">${lenses.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>` +
      `<g fill="${c.core}">${lenses.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${f(r * 0.45)}"/>`).join("")}</g>`,
  };
}

function head(c, peek) {
  const style = c.helmet;
  if (style === "reaper" && !peek) return reaperHood(c);
  if (style === "bandana" && !peek) return bandanaHead(c);
  if (style === "pilot" && !peek) return pilotHelmet(c);
  const w = SHELL_HALF[style] || 11.2;
  const earX = w - 0.3;
  if (peek) {
    return { front: hairBack(c) + (c.fem ? femFace(face(c)) : face(c)) + hair(c, false), glow: eyeGlow(c, 0.45) };
  }
  const shell = SHELLS[style] || SHELLS.standard;
  const ears = EARLESS_HELMETS.has(style)
    ? ""
    : `<circle cx="${f(-earX)}" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>` +
      `<circle cx="${f(earX)}" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>`;
  const earGlow = EARLESS_HELMETS.has(style)
    ? ""
    : glowOf(`<circle cx="${f(-earX)}" cy="-80.6" r=".6"/><circle cx="${f(earX)}" cy="-80.6" r=".6"/>`, c.energy, c.core);
  const dome =
    `<ellipse cx="-5.2" cy="-89.6" rx="4.4" ry="2.8" fill="url(#sheen)"/>` +
    line(`M${f(-w + 3.2)},-91 C-6.4,-93.4 -3.8,-94.4 -2.3,-94.4`, "#f4faff", 0.8, MATTE.has(c.armor) ? 0.3 : 0.8) +
    line(`M${f(w - 0.6)},-90 C${f(w + 0.4)},-87 ${f(w + 0.4)},-83 ${f(w - 0.2)},-78.6`, c.rim, 0.8, 0.85);

  if (OPEN_HELMETS.has(style)) {
    const liner = `<path d="M${f(-w + 1.2)},-86 C${f(-w + 1.2)},-92 -5,-94.4 0,-94.4 C5,-94.4 ${f(w - 1.2)},-92 ${f(w - 1.2)},-86 L${f(w - 1.6)},-70 L${f(-w + 1.6)},-70 Z" fill="#070a10"/>`;
    const visorUp = raisedVisor(c, style === "wide" ? -86.6 : -86.4);
    let extra = "";
    if (style === "wide") {
      extra =
        line("M-14.2,-82.8 C-10,-84.6 -8.8,-86 -8.4,-87", INK, 0.5, 0.6) +
        line("M14.2,-82.8 C10,-84.6 8.8,-86 8.4,-87", INK, 0.5, 0.6) +
        line("M-12.8,-76 L-8.8,-76.6 M12.8,-76 L8.8,-76.6", INK, 0.45, 0.55) +
        shape("M-4.8,-96 L4.8,-96 L4.2,-92.6 L-4.2,-92.6 Z", "url(#paint)", 0.5);
    } else {
      // Centurion: painted bristle crest front-to-back, cheek guard rivets
      extra =
        shape("M-2.9,-94.6 C-3.6,-100.6 -2.6,-105.6 0,-107.4 C2.6,-105.6 3.6,-100.6 2.9,-94.6 Z", "url(#paint)", 0.8) +
        line("M-1.4,-95 L-1.6,-104.4 M0,-95 L0,-106.6 M1.4,-95 L1.6,-104.4", mix(c.pal.dark, "#000000", 0.4), 0.35, 0.8) +
        line("M-2,-96 C-2.6,-100 -2,-103.6 -0.4,-105.8", mix(c.pal.primary, "#ffffff", 0.5), 0.45, 0.7) +
        `<g fill="#9fb2c4"><circle cx="-8.4" cy="-74" r=".55"/><circle cx="8.4" cy="-74" r=".55"/><circle cx="-9.2" cy="-78.2" r=".55"/><circle cx="9.2" cy="-78.2" r=".55"/></g>`;
    }
    return {
      front: hairBack(c) + liner + face(c) + hair(c, true) + shape(shell, "url(#steel)") + dome + extra + ears + visorUp.body,
      glow: earGlow + visorUp.glow + eyeGlow(c, 0.35),
    };
  }

  const visor = closedVisor(c);
  let details = line(`M${f(-w + 0.3)},-86 C-6,-88.4 6,-88.4 ${f(w - 0.3)},-86`, INK, 0.6, 0.7);
  if (visor.jaw) {
    const jaw =
      style === "angular"
        ? "M-6.8,-76.4 L0,-75.2 L6.8,-76.4 L5,-70 L0,-68.4 L-5,-70 Z"
        : "M-6.6,-76.1 L-3.3,-76.8 L0,-75.7 L3.3,-76.8 L6.6,-76.1 L5.3,-71 C3.6,-69.5 1.8,-68.9 0,-68.8 C-1.8,-68.9 -3.6,-69.5 -5.3,-71 Z";
    details +=
      line(`M${f(-w + 0.4)},-78 C-8.8,-75 -7.6,-72.6 -5.2,-70.6`, INK, 0.5, 0.6) +
      line(`M${f(w - 0.4)},-78 C8.8,-75 7.6,-72.6 5.2,-70.6`, INK, 0.5, 0.6) +
      shape(jaw, "url(#steelDk)", 0.6) +
      line("M-2.2,-74 L2.2,-74 M-2.4,-72.5 L2.4,-72.5 M-2,-71 L2,-71", "#020306", 0.55, 0.9);
  }
  if (style === "standard") details = shape("M-2,-94.8 C-1.2,-95.4 1.2,-95.4 2,-94.8 L1.5,-86.6 L-1.5,-86.6 Z", "url(#steelDk)", 0.5) + details;
  if (style === "angular")
    details += line("M-12,-88.4 L0,-90.6 L12,-88.4 M-7.8,-94.4 L0,-90.6 L7.8,-94.4 M0,-96 L0,-90.6", INK, 0.45, 0.55) + line("M-11.4,-88.8 L-1,-90.6", "#f4faff", 0.45, 0.5);
  let fins = "";
  if (style === "crested") {
    const cheek = "M-11,-85 L-17.6,-93.4 L-16.2,-86.4 L-11.4,-78.6 Z";
    fins =
      shape(cheek, "url(#steelDk)", 0.7) +
      shape(mirror(cheek), "url(#steelDk)", 0.7) +
      line("M-16.8,-91.6 L-12,-84.6", c.pal.accent, 0.4, 0.55);
    details +=
      shape("M-1.6,-94.8 L-1,-103 L0,-105.2 L1,-103 L1.6,-94.8 Z", "url(#steel)", 0.7) +
      shape("M-0.8,-95 L-0.5,-102 L0,-103.4 L0.5,-102 L0.8,-95 Z", "url(#paint)", 0.3) +
      line("M-1.6,-94.8 L-1.5,-88.6 M1.6,-94.8 L1.5,-88.6", INK, 0.4, 0.5);
  }
  return {
    front: fins + shape(shell, "url(#steel)") + dome + details + helmetDetail(c, style, w) + ears + visor.body,
    glow: earGlow + visor.glow + (visor.eyeGlints ? eyeGlow(c, 0.9, true) : ""),
  };
}

/** Eye glow: chrono-augmented irises, visible faintly through a visor. */
function eyeGlow(c, op, behindVisor = false) {
  const r = behindVisor ? 0.75 : 1.1;
  return (
    `<g filter="url(#glow)" fill="${c.eyes}" opacity="${op}"><circle cx="-3" cy="-81.6" r="${r * 1.4}"/><circle cx="3.2" cy="-81.6" r="${r * 1.4}"/></g>` +
    (behindVisor ? `<g fill="${mix(c.eyes, "#ffffff", 0.5)}"><circle cx="-3" cy="-81.6" r="${r * 0.6}"/><circle cx="3.2" cy="-81.6" r="${r * 0.6}"/></g>` : "")
  );
}

// ---------------------------------------------------------------------------
// Shoulders
// ---------------------------------------------------------------------------

function shoulder(c, s, tilt) {
  const M = s < 0 ? mirror : (d) => d;
  const lit = s < 0;
  const rot = (inner) => `<g transform="rotate(${f(tilt)} ${f(s * 12)} -65)">${inner}</g>`;
  const trim = (d) => line(M(d), INK, 2.2, 0.9) + line(M(d), c.pal.primary, 1.4, 1);
  switch (c.shoulder) {
    case "none": {
      const cap = "M11,-66.8 C15.6,-68.8 21.6,-67.8 23.8,-63 C25,-60.2 24.6,-57.4 23.4,-55.4 C21,-56.8 18.4,-57.2 16,-56.6 C15.8,-60.6 14,-64 11,-65.6 Z";
      return rot(
        shape(M(cap), "url(#steel)", 0.9) +
          line(M("M13.4,-65.6 C17,-67 21,-66.4 22.8,-63"), "#f4faff", 0.7, lit ? 0.8 : 0.4) +
          (lit ? "" : line("M23.8,-62 C24.8,-59.6 24.6,-57.4 23.6,-55.8", c.rim, 0.7, 0.85)),
      );
    }
    case "spikes": {
      const spikes = [
        ["M14.6,-66.2 L15.6,-76.8 L19.4,-67.6 Z"],
        ["M20.2,-67.8 L23.8,-79 L25.2,-66.2 Z"],
        ["M25.4,-65 L32.6,-72.8 L29,-61.4 Z"],
      ]
        .map(([d]) => shape(M(d), "url(#steelDk)", 0.8) + line(M(d.split(" L")[0] + " L" + d.split(" L")[1]), "#eaf4ff", 0.4, 0.5))
        .join("");
      const jag = "M16.6,-43.6 L19.4,-39.6 L21.8,-43 L24.6,-39.2 L26.8,-42.6 L27.4,-44 Z";
      return rot(spikes) + pauldron(s, tilt) + rot(shape(M(jag), "url(#steelDk)", 0.7) + trim("M13.8,-64.2 C18.6,-66.2 24.2,-65.4 27,-60.8"));
    }
    case "pauldrons": {
      const plate = "M9.8,-68.6 L27.4,-72 L35,-60.6 L33.6,-44.4 L16.2,-46.6 C17.2,-55 14.8,-62.2 9.8,-65 Z";
      const lameA = "M16.4,-46.8 L33.8,-44.4 L32.8,-39.4 L17,-41.6 Z";
      const lameB = "M17,-42 L32.8,-39.8 L31.4,-35.2 L17.6,-37.2 Z";
      return rot(
        shape(M(lameB), "url(#steelDk)", 0.8) +
          shape(M(lameA), "url(#steel)", 0.8) +
          shape(M(plate), "url(#steel)") +
          shape(M("M12.4,-67.2 L27,-70.2 L29.6,-66.4 L14.6,-63.4 Z"), "url(#paint)", 0.6) +
          line(M("M17.6,-60.4 L32.6,-58"), INK, 0.5, 0.6) +
          line(M("M15.4,-62.8 L30.4,-60.4"), "#f4faff", 0.55, lit ? 0.8 : 0.4) +
          `<g fill="#0a0f16"><circle cx="${f(s * 30.6)}" cy="-50" r=".7"/><circle cx="${f(s * 21)}" cy="-50.8" r=".7"/></g>` +
          (lit ? `<ellipse cx="-24" cy="-56" rx="6" ry="4" fill="url(#sheen)"/>` : line("M35.2,-60 L33.8,-44.6", c.rim, 0.8, 0.9)),
      );
    }
    case "armored": {
      const block = "M10.4,-67.8 L30.4,-70.4 L34.4,-66.2 L34.4,-48.6 L30.2,-44.8 L15.6,-46.8 C16.8,-55 14.6,-61.8 10.4,-64.4 Z";
      const face = "M15.4,-64.6 L29.6,-66.4 L31.4,-64 L31.4,-50.4 L29,-48.2 L18,-49.6 C18.4,-55 17.6,-60.6 15.4,-64.6 Z";
      return rot(
        shape(M(block), "url(#steelDk)") +
          shape(M(face), "url(#steel)", 0.7) +
          shape(M("M22.6,-65.6 L25.2,-65.9 L25.2,-48.8 L22.6,-49.2 Z"), "url(#paint)", 0.5) +
          line(M("M16.6,-63.6 L29.2,-65.4"), "#f4faff", 0.55, lit ? 0.85 : 0.4) +
          `<g fill="#0a0f16"><circle cx="${f(s * 18.6)}" cy="-61.8" r=".6"/><circle cx="${f(s * 29.4)}" cy="-63.2" r=".6"/><circle cx="${f(s * 29.4)}" cy="-51.4" r=".6"/><circle cx="${f(s * 19.6)}" cy="-50.8" r=".6"/></g>` +
          (lit ? "" : line("M34.6,-65.6 L34.6,-49", c.rim, 0.8, 0.9)),
      );
    }
    case "slab": {
      // Oversized rounded slab — the single widest silhouette in the set. It
      // overhangs the arm rather than capping it, so the shoulders read first.
      const plate = "M8.6,-69.4 C20,-74.6 33,-72.2 38.4,-62 C41.4,-56.2 41,-48.6 38.2,-42.4 " +
        "C31.6,-38.4 22.4,-38.2 15.4,-41.6 C17.4,-51.2 14.6,-62.4 8.6,-66.2 Z";
      const lip = "M12.6,-66.8 C22.6,-70.6 32.6,-68.2 37,-60.2";
      return rot(
        shape(M(plate), "url(#steel)") +
          shape(M("M16.4,-45.6 C23.6,-42.4 32,-42.6 38,-46"), "url(#steelDk)", 0.9) +
          line(M(lip), INK, 2.4, 0.9) +
          line(M(lip), c.pal.primary, 1.5, 1) +
          line(M("M14.4,-63.2 C23.4,-67 32.2,-64.8 36,-57.6"), "#f4faff", 0.7, lit ? 0.85 : 0.4) +
          // Unit indicator, the one bright mark on a very large plate.
          `<circle cx="${f(s * 27)}" cy="-55" r="3.4" fill="url(#steelDk)" stroke="${INK}" stroke-width=".8"/>` +
          `<circle cx="${f(s * 27)}" cy="-55" r="1.7" fill="${c.pal.primary}" stroke="${INK}" stroke-width=".4"/>` +
          (lit
            ? `<ellipse cx="-26" cy="-60" rx="8" ry="5" fill="url(#sheen)"/>`
            : line("M40.2,-58 C41.4,-50 40.6,-45.4 38.6,-42.8", c.rim, 0.9, 0.9)),
      );
    }
    case "dome": {
      // Domed crusader pauldron: a deep half-shell with a raised rim, the
      // heraldic surface of the suit.
      const shell = "M9.4,-68.6 C21,-76 34.6,-71.4 38,-58.8 C39.8,-52 38.4,-45.6 35.4,-41.4 " +
        "C28,-38.6 20,-39.6 15.8,-42.8 C17.8,-52.4 15.2,-63.6 9.4,-66.6 Z";
      const rim = "M9.6,-67.4 C21.4,-74.2 33.6,-69.8 36.8,-58.4 C38.4,-52.4 37.2,-46.8 34.6,-42.8";
      return rot(
        shape(M(shell), "url(#steel)") +
          line(M(rim), INK, 3.6, 1) +
          line(M(rim), CANDY, 2.2, 1) +
          line(M("M13.8,-62.8 C22.4,-67.6 30.6,-64.4 33.8,-56"), CANDY_HI, 0.7, lit ? 0.8 : 0.35) +
          // Heraldic drop on the face of the plate.
          `<path d="M${f(s * 26)},-61.6 L${f(s * 30.4)},-53.4 L${f(s * 26)},-45.6 L${f(s * 21.6)},-53.4 Z" fill="${CANDY}" stroke="${INK}" stroke-width=".7"/>` +
          `<circle cx="${f(s * 26)}" cy="-53.4" r="1.4" fill="#e8d9a4" stroke="${INK}" stroke-width=".35"/>` +
          (lit ? "" : line("M37.4,-52 C38,-46.6 36.8,-43.4 35,-41.6", c.rim, 0.9, 0.9)),
      );
    }
    case "ordnance": {
      // Boxy launcher housing rather than a plate: vents, a lift handle and a
      // rail along the top.
      const box = "M10.4,-68.6 L29.6,-71.8 L35.2,-66.4 L35.6,-48.2 L30,-43.4 L15.6,-45.4 C17,-54.4 14.8,-63.4 10.4,-65.6 Z";
      return rot(
        shape(M(box), "url(#steelDk)") +
          shape(M("M15,-64.2 L29.4,-66.4 L31.8,-63.6 L32,-49.6 L29.2,-47 L18.2,-48.4 C18.8,-55.4 17.6,-60.4 15,-64.2 Z"), "url(#steel)", 0.8) +
          // Vent louvres
          [0, 1, 2].map((i) => line(M(`M19.4,${f(-60.6 + i * 4.4)} L30,${f(-62 + i * 4.4)}`), INK, 1.1, 0.75)).join("") +
          line(M("M12.4,-69 L30.2,-72"), INK, 2.6, 1) +
          line(M("M12.4,-69 L30.2,-72"), AMBER, 1.4, 0.9) +
          // Lift handle
          line(M("M21,-73.4 C24,-77.2 28.6,-77.6 31,-74.4"), INK, 2.4) +
          line(M("M21,-73.4 C24,-77.2 28.6,-77.6 31,-74.4"), "#9aa3ad", 1.3) +
          (lit ? "" : line("M35.8,-65.4 L36.2,-48.6", c.rim, 0.9, 0.9)),
      );
    }
    case "layered": {
      // Three angular plates stepping down the arm, the sealed-suit answer to
      // a pauldron: light, overlapping, no bulk.
      const p1 = "M10.6,-68 L26.4,-70.4 L31.6,-63.4 L29.4,-57.4 L13.4,-58.6 C14.4,-62.4 13,-66 10.6,-68 Z";
      const p2 = "M13.8,-57 L29.6,-55.8 L32.4,-50.2 L29.2,-46.6 L15.4,-47.4 Z";
      const p3 = "M15.8,-46 L29.4,-45.2 L31,-41 L27.8,-38.4 L16.8,-39.4 Z";
      return rot(
        shape(M(p3), "url(#steelDk)", 0.9) +
          shape(M(p2), "url(#steel)", 0.9) +
          shape(M(p1), "url(#steel)", 1) +
          line(M("M13.4,-65.6 L25.6,-67.4 L29.6,-62.4"), "#f4fbfa", 0.65, lit ? 0.85 : 0.4) +
          line(M("M13.8,-57 L29.6,-55.8"), INK, 0.55, 0.7) +
          line(M("M15.8,-46 L29.4,-45.2"), INK, 0.55, 0.7) +
          (lit ? "" : line("M31.4,-62.8 L32.6,-50 L30.8,-40.6", c.rim, 0.8, 0.9)),
      );
    }
    default:
      // "pads": the hero pauldron with a painted rim stripe
      return pauldron(s, tilt) + rot(trim("M13.8,-64.2 C18.6,-66.2 24.2,-65.4 27,-60.8"));
  }
}

// ---------------------------------------------------------------------------
// Emblems
// ---------------------------------------------------------------------------

/** Origin insignia, engraved into the left tasset. */
function insignia(c) {
  const col = MATTE.has(c.armor) ? "#6e7a88" : "#cfdae6";
  let d;
  switch (c.origin) {
    case "rift_scientist":
      d = `<ellipse rx="3.6" ry="1.3" fill="none"/><ellipse rx="3.6" ry="1.3" transform="rotate(60)" fill="none"/><ellipse rx="3.6" ry="1.3" transform="rotate(-60)" fill="none"/><circle r=".6"/>`;
      break;
    case "arena_runner":
      d = `<path d="M-3,-2.6 L0,-0.4 L3,-2.6 M-3,0.2 L0,2.4 L3,0.2" fill="none"/>`;
      break;
    case "ex_enforcer":
      d = `<path d="M-3.4,-3 L3.4,-3 M-3.4,0 L3.4,0 M-3.4,3 L3.4,3 M-3.4,-3.8 L-3.4,3.8" fill="none"/>`;
      break;
    default:
      d = `<path d="M0,-3.6 L1,-1.2 L3.4,-1 L1.6,0.8 L2.2,3.4 L0,2 L-2.2,3.4 L-1.6,0.8 L-3.4,-1 L-1,-1.2 Z" fill="none"/>`;
  }
  return (
    `<g transform="translate(-10.4,-15.2) scale(.62)" stroke-width=".9" stroke-linejoin="round">` +
    `<g transform="translate(.5,.5)" stroke="#000" fill="#000" opacity=".55">${d}</g>` +
    `<g stroke="${col}" fill="${col}" opacity=".75">${d}</g></g>`
  );
}

// ---------------------------------------------------------------------------
// Armor style and loadout gear
// ---------------------------------------------------------------------------

/** Parts behind the body (in front of the cape), on the body, and glows. */
function gear(c, pose) {
  let back = "";
  let front = "";
  let glow = "";
  const legs = pose.legs;

  switch (c.armor) {
    case "recon": {
      back +=
        line("M13,-68 L21,-104", INK, 1.6) +
        line("M13,-68 L21,-104", "#6f7a70", 0.8) +
        shape("M10.6,-72 L15.8,-72 L15.2,-64 L11,-64 Z", "url(#steelDk)", 0.6);
      glow += glowOf(`<circle cx="21" cy="-104.4" r=".9"/>`, "#ff3344", "#ffd0d4");
      const strap = "M-14.6,-63.4 L12.8,-28.6";
      front +=
        line(strap, INK, 3.6) +
        line(strap, "#2c3326", 2.6) +
        line("M-14,-64.4 L13.2,-29.6", "#5b6650", 0.45, 0.8) +
        [0.42, 0.62]
          .map((t) => {
            const [x, y] = lerp([-14.6, -63.4], [12.8, -28.6], t);
            return `<g transform="translate(${pt(x, y)}) rotate(38)">${shape("M-2.6,-2.4 L2.6,-2.4 L2.4,2.8 L-2.4,2.8 Z", "#2c3326", 0.6)}${line("M-2.4,-1 L2.4,-1", "#6a7660", 0.4, 0.8)}</g>`;
          })
          .join("");
      const sand = "#8a7c5c";
      const shemagh =
        "M-12,-70.4 C-6,-67.2 6,-67.2 12,-70.4 C15,-67.4 16.6,-63 15.8,-59 C12.2,-56.6 8.2,-58 4.8,-54.8 " +
        "C2.2,-52.8 -2.2,-52.8 -4.8,-54.8 C-8.2,-58 -12.2,-56.6 -15.8,-59 C-16.6,-63 -15,-67.4 -12,-70.4 Z";
      const tail = "M-14.6,-60 C-17,-55 -17.4,-49 -16.4,-44.6 L-13.8,-43.2 C-14.6,-48 -13.8,-53.4 -12,-57.6 Z";
      front +=
        shape(tail, mix(sand, "#000000", 0.15), 0.8) +
        shape(shemagh, sand, 0.9) +
        `<path d="${shemagh}" fill="url(#weave)" opacity=".7"/>` +
        line("M-10.6,-67.6 C-5,-64.6 5,-64.6 10.6,-67.6 M-13.4,-63.6 C-8,-60.6 -3,-60.4 0,-59.4 M13.4,-63.6 C8,-60.6 3,-60.4 0,-59.4", "#5c5038", 0.6, 0.8) +
        line("M-11.6,-69.2 C-6,-66.4 -2,-65.8 1,-65.8", "#c4b48c", 0.5, 0.6) +
        line("M-15.4,-58 L-16,-45.6", "#5c5038", 0.5, 0.7) +
        // Utility belt: a row of pouches round the waist.
        [-13.8, -8.2, 3.4, 9].map((x) => shape(`M${f(x)},-29.2 L${f(x + 4.6)},-29.2 L${f(x + 4.4)},-21.4 L${f(x + 0.2)},-21.4 Z`, "#3a3f30", 0.7) + line(`M${f(x + 0.4)},-27.6 L${f(x + 4.2)},-27.6`, "#62684e", 0.45, 0.8)).join("");
      break;
    }
    case "heavy": {
      const collar = "M-15.4,-64.4 C-16,-69 -13,-72.8 -9.6,-74 L-7.6,-69.8 C-9.8,-68.8 -11.2,-67 -11.4,-64.2 Z";
      front += shape(collar, "url(#steel)", 0.9) + shape(mirror(collar), "url(#steelDk)", 0.9) + line("M-14.4,-66 C-14,-69.2 -12,-71.6 -9.8,-72.6", "#f4faff", 0.5, 0.7);
      // Heavy chest plate carrying twin round lights.
      front +=
        shape("M-15.8,-64.6 C-8,-67 8,-67 15.8,-64.6 L16.8,-44.8 C8,-42.6 -8,-42.6 -16.8,-44.8 Z", "url(#steel)", 1.1) +
        line("M-14.6,-62.6 C-8,-64.6 -2,-64.8 1,-64.8", "#f4faff", 0.7, 0.6) +
        line("M-15.6,-50 C-8,-48.4 8,-48.4 15.6,-50", INK, 0.55, 0.5) +
        line("M0,-64.6 L0,-60.6 M0,-49 L0,-43.6", INK, 0.55, 0.55);
      for (const x of [-7.6, 7.6]) {
        front +=
          `<circle cx="${x}" cy="-56" r="5" fill="url(#steelDk)" stroke="${INK}" stroke-width=".9"/>` +
          `<circle cx="${x}" cy="-56" r="3.6" fill="#05080b" stroke="${INK}" stroke-width=".5"/>` +
          `<circle cx="${x}" cy="-56" r="1.2" fill="url(#steel)"/>`;
        glow +=
          `<circle cx="${x}" cy="-56" r="2.7" fill="none" stroke="${c.energy}" stroke-width="1.3" filter="url(#bloom)" opacity=".8"/>` +
          `<circle cx="${x}" cy="-56" r="2.7" fill="none" stroke="${c.core}" stroke-width=".7"/>`;
      }
      break;
    }
    case "stealth": {
      back += shape("M-15.4,-64 C-18,-84 -12.6,-101 0,-102 C12.6,-101 18,-84 15.4,-64 Z", "#0d1016", 1);
      back += line("M-13.6,-70 C-15.4,-86 -11,-98.6 0,-99.8", "#2a313c", 0.6, 0.8) + line("M13.8,-72 C15.4,-86 11.6,-97 3,-99.6", c.rim, 0.5, 0.45);
      const cowl = "M-16.4,-64.2 C-17.4,-70 -14.6,-75.2 -10.4,-77.2 L-7.8,-69.6 C-10,-68.6 -11.2,-66.8 -11.2,-64 Z";
      front += shape(cowl, "#161b22", 0.9) + shape(mirror(cowl), "#0d1016", 0.9) + line("M-15.4,-66 C-15.6,-70 -13.6,-73.6 -10.8,-75.2", "#343c48", 0.45, 0.8);
      break;
    }
    case "tech": {
      back +=
        shape("M-15.6,-75 L15.6,-75 L17.6,-38 L-17.6,-38 Z", "url(#steelDk)") +
        line("M-13.6,-73.4 L13.6,-73.4", "#eaf4ff", 0.5, 0.5) +
        part([13.6, -72], [24.6, -90], 3.4, 2.8, { fill: "url(#steelDk)", hi: 0.4, rimColor: c.rim, ink: 0.8 }) +
        part([24.6, -90], [33.4, -83], 2.8, 2.2, { fill: "url(#steel)", hi: 0.4, rimColor: c.rim, ink: 0.8 }) +
        `<circle cx="24.6" cy="-90" r="2" fill="url(#steel)" stroke="${INK}" stroke-width=".7"/>` +
        shape("M33,-85.6 L37.4,-86.4 L36,-83.4 L37.6,-80.8 L33.2,-80.8 Z", "url(#steelDk)", 0.6) +
        line("M-13,-73 L-17,-90", INK, 1.4) +
        line("M-13,-73 L-17,-90", "#8a8574", 0.6);
      glow += glowOf(`<circle cx="-17" cy="-90.4" r=".9"/><circle cx="35.6" cy="-83.2" r=".7"/>`, AMBER, "#ffe2b0");
      // hazard stripes on the belt pouches
      const hz = (x) =>
        `<g transform="translate(${x},-27.2)">${[0, 1.6, 3.2].map((o) => `<path d="M${f(o)},0 L${f(o + 1)},0 L${f(o - 0.6)},5.4 L${f(o - 1.6)},5.4 Z" fill="${AMBER}" opacity=".85"/>`).join("")}</g>`;
      front += hz(-12) + hz(9.8) + shape("M10.4,-22 L15.6,-22.6 L15.8,-14 L10.8,-13.8 Z", "url(#steelDk)", 0.7) + line("M10.8,-19.6 L15.6,-20", AMBER, 0.6, 0.8);
      break;
    }
    case "howitzer": {
      // Shoulder ordnance pod, fed by a belt that runs down into a back hopper.
      back +=
        // Feed belt: shoulder housing down to the hip hopper, links reading
        // along it. The Launcher pauldron is what it feeds.
        line("M19.6,-75.6 C15.4,-69 14.4,-59 16.4,-49", INK, 3.6) +
        line("M19.6,-75.6 C15.4,-69 14.4,-59 16.4,-49", "#a8813f", 2.4) +
        [0.2, 0.42, 0.66, 0.88]
          .map((t) => {
            const y = -75.6 + ((-49) - (-75.6)) * t;
            const x = 19.6 - 5 * Math.sin(t * Math.PI * 0.9);
            return `<g transform="translate(${pt(x, y)})">${shape("M-1.5,-1.5 L1.5,-1.5 L1.5,1.5 L-1.5,1.5 Z", "#c99a3e", 0.5)}</g>`;
          })
          .join("") +
        shape("M8.6,-52 L19.6,-50.4 L20.4,-38.6 L9.2,-39.8 Z", "url(#steelDk)", 0.9);
      glow += glowOf(`<circle cx="16.8" cy="-47.4" r=".9"/>`, AMBER, "#ffe2b0");
      // Slab chest with a raised centre rib.
      front +=
        shape("M-13.8,-63.4 L13.8,-63.4 L15.4,-41 L-15.4,-41 Z", "url(#steel)", 1) +
        shape("M-3.4,-63 L3.4,-63 L4,-41.4 L-4,-41.4 Z", "url(#steelDk)", 0.8) +
        line("M-12.6,-61.6 L12.6,-61.6", "#f0f5ff", 0.6, 0.5) +
        line("M-13.2,-52 L13.2,-52", INK, 0.6, 0.6) +
        // Hazard chevrons on the lower plate.
        [-11.2, -2.6, 6].map((x) => line(`M${pt(x, -44.8)} l2.6,-4 l2.6,4`, AMBER, 1.5, 0.8)).join("");
      break;
    }
    case "trencher": {
      // Squared gorget both sides, one heavy slab, webbing, knee plates.
      const carrier = "#3c4131";
      const web = "#2a2e22";
      front +=
        // Shoulder straps.
        line("M-11.4,-63.4 L-12.6,-70.6 M11.4,-63.4 L12.6,-70.6", INK, 3.4) +
        line("M-11.4,-63.4 L-12.6,-70.6 M11.4,-63.4 L12.6,-70.6", carrier, 2.4) +
        // Carrier body with MOLLE rows.
        shape("M-13.8,-64 C-7,-65.4 7,-65.4 13.8,-64 L14.6,-38.6 C7,-37.2 -7,-37.2 -14.6,-38.6 Z", carrier, 1) +
        `<path d="M-13.8,-64 C-7,-65.4 7,-65.4 13.8,-64 L14.6,-38.6 C7,-37.2 -7,-37.2 -14.6,-38.6 Z" fill="url(#weave)" opacity=".6"/>` +
        [-58.6, -54.2, -49.8].map((y) => line(`M-13.4,${y} L13.4,${y}`, web, 1.1, 0.95) + [-10, -5, 0, 5, 10].map((x) => line(`M${x},${f(y - 0.6)} L${x},${f(y + 0.6)}`, "#55593f", 0.4, 0.9)).join("")).join("") +
        // Admin pouch high on the chest, a patch on it.
        shape("M-5.2,-62.4 L5.2,-62.4 L5,-55.6 L-5,-55.6 Z", mix(carrier, "#000000", 0.18), 0.7) +
        `<rect x="-3.2" y="-61.4" width="6.4" height="3.2" rx=".4" fill="#4e5440" stroke="${INK}" stroke-width=".35"/>` +
        // Mag pouches.
        [-11.6, -5.6, 0.4, 6.4].map((x) => shape(`M${f(x)},-48 L${f(x + 5.2)},-48 L${f(x + 5)},-39.8 L${f(x + 0.2)},-39.8 Z`, mix(carrier, "#000000", 0.1), 0.7) + line(`M${f(x + 0.4)},-46.4 L${f(x + 4.8)},-46.4`, "#62684e", 0.45, 0.8)).join("") +
        // Radio on the left strap, aerial up past the shoulder.
        shape("M-16.2,-66.4 L-12.6,-67 L-12.2,-58.6 L-15.8,-58.2 Z", "#22262a", 0.8) +
        line("M-15.4,-66.6 L-16.6,-74.4", INK, 1.1) +
        line("M-15.4,-66.6 L-16.6,-74.4", "#3c4147", 0.5) +
        // Webbing and pouches at the belt.
        line("M-15,-38.4 L15,-38.4", "#2b3024", 2.6) +
        [-10.4, -2.6, 6.2].map((x) => shape(`M${f(x)},-38 L${f(x + 5)},-38 L${f(x + 4.4)},-29.4 L${f(x + 0.6)},-29.4 Z`, "url(#steelDk)", 0.7)).join("");
      break;
    }
    case "reliquary": {
      // High gorget to the jaw, domed chest boss, candy tabard to the knees.
      const stole = "M-9.6,-70 L-5.4,-70.4 L-3.2,-18 L-8.4,-17.6 Z";
      back += shape(stole, CANDY, 0.9) + shape(mirror(stole), mix(CANDY, "#000000", 0.35), 0.9);
      const gorge = "M-14.8,-63.6 C-16.4,-71.6 -12.4,-78.6 -6.2,-80.4 L-4.2,-73.2 C-8.2,-72 -10.6,-68.4 -10.4,-63.4 Z";
      front +=
        shape(gorge, "url(#steel)", 0.9) +
        shape(mirror(gorge), "url(#steelDk)", 0.9) +
        line("M-13.6,-65.6 C-14.4,-71.8 -11.4,-76.6 -7,-78.4", CANDY_HI, 0.7, 0.8) +
        // Domed chest with a raised central boss.
        shape("M-14.2,-64 C-6,-67.2 6,-67.2 14.2,-64 L15.2,-42 L-15.2,-42 Z", "url(#steel)", 1) +
        `<circle cx="0" cy="-54.4" r="6.6" fill="url(#steelDk)" stroke="${INK}" stroke-width=".9"/>` +
        `<circle cx="0" cy="-54.4" r="3.2" fill="${CANDY}" stroke="${INK}" stroke-width=".7"/>` +
        `<circle cx="-1.4" cy="-56" r="1.1" fill="${CANDY_HI}" opacity=".8"/>` +
        line("M-13,-61.4 C-6,-64 6,-64 13,-61.4", CANDY, 1.2, 0.9) +
        // Tabard, hanging in front of the legs.
        shape("M-8.6,-41 L8.6,-41 L10.4,-4 L6.6,0.6 L-6.6,0.6 L-10.4,-4 Z", CANDY, 1) +
        line("M-7.6,-36.4 L7.6,-36.4", mix(CANDY, "#000000", 0.5), 0.8, 0.9) +
        line("M0,-40 L0,-0.2", mix(CANDY, "#000000", 0.4), 0.6, 0.7) +
        line("M-8.8,-14 L8.8,-14", CANDY_HI, 0.6, 0.5) +
        // Devotional seals on ribbons.
        [-5.4, 4.2].map((x) =>
          line(`M${f(x)},-33.6 l0,7.4`, "#d9c88a", 0.7, 0.9) +
          `<circle cx="${f(x)}" cy="-25.4" r="1.8" fill="#d9c88a" stroke="${INK}" stroke-width=".5"/>`,
        ).join("");
      break;
    }
    case "pathfinder": {
      // Sealed ceramic: one smooth shell, almost no seams, a chest readout.
      back += shape("M-11.6,-72 L11.6,-72 L13,-48 L-13,-48 Z", "url(#steelDk)", 0.9) +
        line("M-9.8,-70 L9.8,-70", "#eef6f4", 0.5, 0.45);
      front +=
        // Moulded collar ring the helmet seats into.
        shape("M-9.6,-72.6 C-4.6,-74.2 4.6,-74.2 9.6,-72.6 L13.8,-66.4 C7,-64.4 -7,-64.4 -13.8,-66.4 Z", "url(#steelDk)", 0.9) +
        line("M-8.8,-72 C-4.4,-73.4 0,-73.6 2.4,-73.4", "#f4fbfa", 0.6, 0.6) +
        shape("M-14.4,-66.4 C-7.6,-70.4 7.6,-70.4 14.4,-66.4 L15,-40 C7,-37.4 -7,-37.4 -15,-40 Z", "url(#steel)", 1) +
        // Sculpted abdominal plating under the chest shell.
        shape("M-10.6,-39.4 C-6,-38.2 6,-38.2 10.6,-39.4 L9.8,-29.2 C5,-28.2 -5,-28.2 -9.8,-29.2 Z", "url(#steel)", 0.9) +
        line("M0,-38.6 L0,-29", INK, 0.55, 0.6) +
        line("M-9.8,-35.6 C-5,-34.6 5,-34.6 9.8,-35.6 M-9.6,-32.2 C-5,-31.2 5,-31.2 9.6,-32.2", INK, 0.45, 0.45) +
        line("M-9.4,-38 C-5,-37.2 -2,-37.1 -0.6,-37.1", "#f4fbfa", 0.5, 0.5) +
        // One long seam is the only break in the shell.
        line("M-13.2,-55.6 C-6.4,-58 6.4,-58 13.2,-55.6", INK, 0.6, 0.55) +
        line("M-13.4,-63.8 C-7,-67 7,-67 13.4,-63.8", "#f4fbfa", 0.7, 0.6) +
        // Compact chest computer with a lit readout.
        shape("M4.2,-53.6 L13.4,-54.6 L13.8,-46.2 L4.6,-45.4 Z", "url(#steelDk)", 0.8) +
        line("M5.6,-51.6 L12.2,-52.2 M5.8,-49.4 L10.4,-49.8", c.rim, 0.55, 0.85);
      glow += glowOf(`<rect x="5.2" y="-52.2" width="7.4" height="1" rx=".5"/>`, c.rim, mix(c.rim, "#ffffff", 0.7));
      break;
    }
    default:
      break;
  }

  switch (c.loadout) {
    case "gunslinger":
      legs.forEach((leg, i) => {
        const s = i === 0 ? -1 : 1;
        const p = lerp(leg.hip, leg.kn, 0.5);
        const x = p[0] + s * 1.6;
        const ang = (Math.atan2(leg.kn[0] - leg.hip[0], leg.kn[1] - leg.hip[1]) * -180) / Math.PI;
        front +=
          line(`M${pt(p[0] - 5.4, p[1] - 3)} L${pt(x, p[1] - 2.4)} M${pt(p[0] - 5.4, p[1] + 3.6)} L${pt(x, p[1] + 4)}`, "#1c1815", 1.3) +
          `<g transform="translate(${pt(x, p[1])}) rotate(${f(ang)})">` +
          shape("M-1.2,-6 L2,-6.2 L2.6,-11.4 L-0.4,-11.8 Z", "url(#gun)", 0.6) +
          shape("M-2.8,-6.4 L2.8,-6.4 L3.2,6.8 C2,8.8 -2,8.8 -3.2,6.8 Z", "url(#leather)", 0.8) +
          line("M-2.2,-4.8 L2.2,-4.8", "#6a5a4a", 0.4, 0.8) +
          `</g>`;
        glow += glowOf(`<circle cx="${f(x + 0.6)}" cy="${f(p[1] - 9)}" r=".45"/>`, c.gunEnergy, mix(c.gunEnergy, "#ffffff", 0.7));
      });
      break;
    case "enforcer":
      back +=
        shape("M-41,-61 L-25,-65 L-22.6,-4 L-38.6,-0.4 Z", "url(#steelDk)", 1.2) +
        shape("M-38.4,-57.4 L-27.4,-60.2 L-25.6,-8 L-36.4,-5.4 Z", "url(#steel)", 0.6) +
        shape("M-37.2,-40 L-26.4,-42.4 L-26.2,-37.8 L-37,-35.6 Z", "url(#paint)", 0.5) +
        shape("M-35.4,-53.6 L-29,-55 L-28.9,-52.6 L-35.3,-51.3 Z", "#05080c", 0.4);
      front +=
        shape("M-11.8,-40.8 L11.8,-40.8 L10.8,-28.4 L-10.8,-28.4 Z", "url(#steelDk)", 0.9) +
        shape("M-9.6,-38.8 L9.6,-38.8 L8.8,-30.4 L-8.8,-30.4 Z", "url(#steel)", 0.6) +
        line("M-6,-36.6 L0,-33.2 L6,-36.6", c.pal.primary, 1.2, 0.95) +
        `<g fill="#0a0f16"><circle cx="-10" cy="-39.4" r=".5"/><circle cx="10" cy="-39.4" r=".5"/><circle cx="-9.4" cy="-29.6" r=".5"/><circle cx="9.4" cy="-29.6" r=".5"/></g>`;
      break;
    case "phantom": {
      const tail = "M-12.6,-25 C-15.6,-6 -19.4,14 -25,37 L-21.6,34.6 L-19.4,39.6 C-15.4,18 -11.6,-2 -9,-24.6 Z";
      back += shape(tail, "url(#cape)", 0.9) + shape(mirror(tail), "url(#cape)", 0.9);
      legs.forEach((leg, i) => {
        const s = i === 0 ? -1 : 1;
        const p = lerp(leg.kn, leg.an, 0.5);
        const x = p[0] + s * 4.6;
        const fin = s < 0 ? "M0,-8 L-4.2,-3.6 L-4.2,6.4 L0,4.4 Z" : "M0,-8 L4.2,-3.6 L4.2,6.4 L0,4.4 Z";
        front += `<g transform="translate(${pt(x, p[1])})">${shape(fin, "url(#steelDk)", 0.7)}</g>`;
        glow += `<g transform="translate(${pt(x, p[1])})">${glowOf(`<path d="M${f(s * 2)},-2.4 L${f(s * 2)},3.8" fill="none" stroke-width=".7"/>`, c.energy, c.core)}</g>`;
      });
      break;
    }
    case "breacher": {
      // Ram slung on the back and a shield plate on the off arm. Both sit
      // outboard of the torso, where the Enforcer's pack reads, or the
      // pauldrons swallow them.
      back +=
        line("M-30.6,-63 L-19.4,-8", INK, 5.4) +
        line("M-30.6,-63 L-19.4,-8", "#4a5058", 3.4) +
        shape("M-33.8,-66.4 L-25.6,-68.2 L-23.2,-56.6 L-31.4,-54.8 Z", "url(#steelDk)", 1.1) +
        line("M-32.2,-63.6 L-26,-65", AMBER, 0.9, 0.9) +
        line("M-31.4,-59.6 L-25.2,-61", AMBER, 0.9, 0.7);
      // Charges across the chest rig, bigger and evenly spaced.
      front +=
        [-11.4, -2.9, 5.6].map((x) =>
          shape(`M${f(x)},-40 L${f(x + 5.8)},-40 L${f(x + 5)},-29.6 L${f(x + 0.8)},-29.6 Z`, "url(#steelDk)", 0.8) +
          line(`M${f(x + 1.2)},-37.2 L${f(x + 4.6)},-37.2`, AMBER, 0.8, 0.95),
        ).join("") +
        // Forearm shield plate.
        shape("M-28.4,-46.6 L-18.6,-49 L-16.2,-29.6 L-26,-27.2 Z", "url(#steel)", 1) +
        line("M-26.6,-44.4 L-19.6,-46.2", "#f0f5ff", 0.6, 0.75) +
        line("M-25.4,-38 L-18.4,-39.8", INK, 0.6, 0.6);
      glow += glowOf(`<circle cx="-8.8" cy="-34.4" r=".6"/><circle cx="-0.3" cy="-34.4" r=".6"/><circle cx="8.2" cy="-34.4" r=".6"/>`, AMBER, "#ffe2b0");
      break;
    }
    case "marksman": {
      // Long rifle case slung diagonally across the back, and a spotting
      // scope on a stalk above the shoulder line where nothing occludes it.
      back +=
        shape("M-36.4,-70.6 L-25.6,-74.4 L-9.4,-14.6 L-20.2,-10.8 Z", "url(#steelDk)", 1.2) +
        shape("M-34.2,-67.4 L-27.4,-69.8 L-12.4,-16.4 L-19.2,-14 Z", "url(#steel)", 0.6) +
        line("M-31.6,-58.6 L-24.8,-61", INK, 0.7, 0.7) +
        line("M-27.6,-42.4 L-20.8,-44.8", INK, 0.7, 0.7) +
        shape("M-30.6,-52.6 L-24.2,-54.8 L-23.4,-50.6 L-29.8,-48.4 Z", "url(#paint)", 0.5);
      front +=
        // Scope stalk clearing the pauldron.
        line("M15.4,-70.4 L22.6,-80.6", INK, 2.6) +
        line("M15.4,-70.4 L22.6,-80.6", "#6d7884", 1.5) +
        shape("M19.2,-84.6 L31.4,-82.4 L30.6,-76 L18.6,-78.2 Z", "url(#steelDk)", 0.9) +
        `<circle cx="30" cy="-79.4" r="2.6" fill="#0a1016" stroke="${INK}" stroke-width=".7"/>` +
        line("M21,-82.6 L27.6,-81.4", "#f0f5ff", 0.55, 0.7);
      glow += glowOf(`<circle cx="30" cy="-79.4" r="1.3"/>`, c.rim, mix(c.rim, "#ffffff", 0.7));
      break;
    }
    case "saboteur": {
      // Satchel of charges hanging clear of the hip, wired to a wrist
      // detonator on the other side.
      back +=
        shape("M24.4,-52.6 L42.2,-49.4 L39.4,-18.4 L21.6,-21.6 Z", "url(#steelDk)", 1.2) +
        shape("M26.6,-49.4 L40,-47 L37.8,-22.4 L24.4,-24.8 Z", "#1a1d14", 0.6) +
        [0, 1, 2].map((i) =>
          shape(`M${f(28.2 + i * 4.4)},-44.6 L${f(31.8 + i * 4.4)},-44 L${f(30.6 + i * 4.4)},-28.4 L${f(27 + i * 4.4)},-29 Z`, AMBER, 0.6),
        ).join("") +
        line("M24,-53.4 C14,-60.6 4,-61 -6,-56", INK, 2.2) +
        line("M24,-53.4 C14,-60.6 4,-61 -6,-56", "#8a6a34", 1.2);
      front +=
        shape("M-29.6,-36.6 L-19.6,-38.8 L-18,-27.4 L-28,-25.2 Z", "url(#steel)", 1) +
        `<circle cx="-24" cy="-32" r="2.6" fill="${AMBER}" stroke="${INK}" stroke-width=".6"/>` +
        line("M-28.2,-35 L-21.4,-36.6", "#f0f5ff", 0.55, 0.7);
      glow += glowOf(`<circle cx="-24" cy="-32" r="1.3"/>`, AMBER, "#ffe2b0");
      break;
    }
    case "corpsman": {
      // Medical satchel hanging clear of the hip with the cross on its face,
      // a shoulder beacon, and stim injectors on the thigh. The cross is the
      // read: it is the one piece of kit nobody mistakes for a weapon.
      const CROSS = "#eef7f2";
      back +=
        shape("M-44.4,-52.6 L-26.6,-56.2 L-23.4,-22 L-41.2,-18.4 Z", "url(#steelDk)", 1.2) +
        shape("M-42,-49.8 L-28.8,-52.4 L-26.2,-24.8 L-39.4,-22.2 Z", "#16241e", 0.6) +
        `<g fill="${CROSS}"><rect x="-36.4" y="-43.6" width="3.8" height="13.4" rx=".5"/><rect x="-41" y="-39" width="13" height="3.8" rx=".5"/></g>` +
        line("M-44,-53.2 C-34,-60.6 -22,-61.4 -12,-56.6", INK, 2.2) +
        line("M-44,-53.2 C-34,-60.6 -22,-61.4 -12,-56.6", "#3c4a44", 1.2);
      front +=
        // Shoulder beacon, so the corpsman is findable in a fight.
        shape("M13.8,-68.6 L21.6,-70.2 L22.4,-63.8 L14.6,-62.2 Z", "url(#steelDk)", 0.8) +
        `<g fill="${CROSS}"><rect x="17" y="-68" width="1.8" height="4.6" rx=".3"/><rect x="15.9" y="-66.9" width="4" height="1.8" rx=".3"/></g>`;
      legs.forEach((leg, i) => {
        const s = i === 0 ? -1 : 1;
        const p = lerp(leg.hip, leg.kn, 0.46);
        front += [0, 1].map((k) =>
          shape(`M${pt(p[0] + s * (3.4 + k * 3), p[1] - 4.4)} l${f(s * 2.4)},0 l${f(s * -0.4)},9 l${f(s * -1.6)},0 Z`, "#d8ece4", 0.55),
        ).join("");
      });
      glow += glowOf(`<rect x="17.2" y="-67.8" width="1.4" height="4.2" rx=".3"/><rect x="16.1" y="-66.7" width="3.6" height="1.4" rx=".3"/>`, "#7fffd0", "#eafff7");
      break;
    }
    default:
      break;
  }
  return { back, front, glow };
}

// ---------------------------------------------------------------------------
// Rifle finish extras (rifle frame coordinates)
// ---------------------------------------------------------------------------

function finishExtras(c) {
  switch (c.weapon) {
    case "carbon":
      return {
        body: line("M50,-3 L53,3 M54,-3 L57,3 M64,-3 L67,3 M76,-3 L79,3 M2,-2 L5,5 M6,-3 L9,4 M26,-5 L29,3 M30,-5 L33,3", "#5a5f68", 0.35, 0.5),
        glow: "",
      };
    case "chrome":
      return { body: line("M13,-5 L44,-5 M48,-3.4 L80,-2.8 M19.6,-10 L37,-10", "#ffffff", 0.55, 0.9), glow: "" };
    case "ember":
      return {
        body: "",
        glow: glowOf(`<path d="M14,-4.6 L44,-4.6 M48,-3.2 L79,-2.6 M1,6 L9,3.6" fill="none" stroke-width=".4"/>`, "#ff6a1a", "#ffd0a0"),
      };
    case "frost":
      return {
        body: line("M52,-3 L54,-1 L52,1 M54,-1 L56.6,-1 M70,2 L72,0 M20,-5 L22,-3.4 L24,-5 M4,5.6 L6,3.4", "#ffffff", 0.35, 0.85),
        glow: "",
      };
    case "toxic":
      return {
        body: `<g fill="#7dff4a" opacity=".55"><circle cx="30" cy="4.6" r=".6"/><circle cx="58" cy="3.6" r=".5"/><path d="M40,4.4 C40.6,6 40.6,7 40,7.6 C39.4,7 39.4,6 40,4.4 Z"/></g>`,
        glow: glowOf(`<rect x="52" y="-1.6" width="2.2" height="3.6"/><rect x="56.4" y="-1.6" width="2.2" height="3.6"/><rect x="60.8" y="-1.6" width="2.2" height="3.6"/>`, "#5aff2a", "#d8ffc8"),
      };
    default:
      return { body: "", glow: "" };
  }
}

const RIFLE_TF = `transform="translate(${pt(...RIFLE_AT)}) rotate(${RIFLE_ROT})"`;

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** Canvas of the stage: fits both poses, crests and gear without jumping. */
export const AGENT_VIEW = { full: [-74, -116, 148, 182], bust: [-30, -111, 60, 60], torso: [-42, -104, 84, 84], helm: [-21, -110, 42, 42], face: [-19, -105, 38, 40] };

/** Close crops on the body region each accessory slot occupies, for gear thumbnails. */
export const GEAR_VIEW = {
  back: [-40, -106, 80, 80],
  waist: [-34, -70, 68, 68],
  helmet: [-25, -128, 50, 50],
  arms: [-38, -84, 76, 76],
  neck: [-30, -102, 60, 60],
  legs: [-32, -34, 64, 64],
};

/** Pectoral seam paths (left/right), shared by chestTrim and variantTrim so they never drift apart. */
const SEAM_L = "M-15.2,-49.6 C-11,-45 -5,-45.2 -1.2,-47.6";
const SEAM_R = "M15.2,-49.6 C11,-45 5,-45.2 1.2,-47.6";

/** Chest trim paint following the pectoral seams under the ink lines. */
const chestTrim = (c) =>
  line(SEAM_L, c.pal.primary, 1.3, 0.9) +
  line(SEAM_R, mix(c.pal.primary, "#000000", 0.35), 1.3, 0.9) +
  line("M-15.8,-50 C-11,-44.6 -5,-44.8 -0.6,-47.6 M15.8,-50 C11,-44.6 5,-44.8 0.6,-47.6", INK, 0.45, 0.8);

/** Variant overlay: trim stripes along the existing chest seams and, with wear, scratches. */
function variantTrim(c) {
  const v = c.variant;
  if (!v) return "";
  let out =
    `<g data-variant="${v.id}">` +
    line(SEAM_L, v.trim, 0.9, 0.95) +
    line(SEAM_R, v.trim, 0.9, 0.95) +
    line("M-12,-30 L12,-30", v.trim, 0.7, 0.8);
  if (v.wear > 0.3) {
    const n = Math.round(v.wear * 8);
    let d = "";
    for (let i = 0; i < n; i++) {
      const x = -14 + ((i * 37) % 28);
      const y = -52 + ((i * 23) % 30);
      d += `M${x},${y} l${2 + (i % 3)},${1 + (i % 2)} `;
    }
    out += `<path class="ag-wear" d="${d}" stroke="#c8ccd0" stroke-width=".35" opacity="${f(0.25 + v.wear * 0.35)}" fill="none"/>`;
  }
  return out + `</g>`;
}

/**
 * Forearm badge: a third of the way down the vambrace, pushed off the
 * centreline toward the arm's outer side far enough that the badge clears the
 * energy channel and its ink seam in every pose (and so the chrono device).
 */
function forearmAnchor({ el, wr }, s, t = 0.3, size = 4.4) {
  const len = Math.hypot(wr[0] - el[0], wr[1] - el[1]) || 1;
  const d = [(wr[0] - el[0]) / len, (wr[1] - el[1]) / len];
  let n = [-d[1], d[0]];
  if (n[0] * s < 0) n = [-n[0], -n[1]];
  const off = size / 2 + VAMBRACE.seam / 2 + 0.25;
  return {
    x: el[0] + d[0] * len * t + n[0] * off,
    y: el[1] + d[1] * len * t + n[1] * off,
    rot: Math.atan2(d[1], d[0]) * 57.3 - 90,
    size,
  };
}

/** Direction a→b as an anchor turn: 0 points down (+y), like the badge anchors. */
const turnOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 57.3 - 90;

/** Forearm centreline: midpoint, turn and length, for gear that wraps the arm. */
function forearmAxis({ el, wr }) {
  return { x: (el[0] + wr[0]) / 2, y: (el[1] + wr[1]) / 2, rot: turnOf(el, wr), len: Math.hypot(wr[0] - el[0], wr[1] - el[1]), size: 0 };
}

/** Height of the side rail where lamps and whips mount; Ordnance's sensor stalk sits there, so it drops to the ear cup. */
const SIDE_RAIL = { ordnance: -79.4 };

/** Top of each helmet shell (SHELLS), where crown gear seats. */
const SHELL_TOP = {
  standard: -95, angular: -96, crested: -95.6, wide: -96.4, mohawk: -95,
  ordnance: -97.4, bucket: -93.2, crusader: -97, sealed: -95.8,
};

/**
 * Attachment points on the rig, in rig units: badges (Task 8) and
 * accessories (Task 9) are placed from here, never from their own offsets.
 * `size` is the badge diameter at that point. Helmet mounts (crown, browL,
 * sideL) are seated on the given helmet's shell.
 */
export function rigAnchors(P, tilt, pose, helmet = "standard") {
  const [armL, armR] = P.arms.map((a, i) => armJoints(a, i === 0 ? -1 : 1));
  const [hipL, hipR] = P.legs.map((l) => l.hip);
  const [kneeL, kneeR] = P.legs.map((l) => l.kn);
  const top = SHELL_TOP[helmet] ?? SHELL_TOP.standard;
  const half = SHELL_HALF[helmet] || SHELL_HALF.standard;
  const [legL, legR] = P.legs;
  const thigh = lerp(legL.hip, legL.kn, 0.36);
  return {
    chest: { x: 8.8, y: -57.4, rot: 0, size: 7.7 },
    shoulderL: { x: -24.4, y: -56, rot: tilt[0], pivot: [-12, -65], size: 6.2 },
    forearmL: forearmAnchor(armL, -1),
    forearmR: forearmAnchor(armR, 1),
    forearmAxisL: forearmAxis(armL),
    forearmAxisR: forearmAxis(armR),
    helmet: { x: -8.6, y: -90, rot: -8, size: 4.6 },
    neck: { x: 0, y: -69, rot: 0, size: 0 },
    back: { x: 0, y: -48, rot: 0, size: 0 },
    belt: { x: 0, y: -25.2, rot: 0, size: 0, half: 14.4 },
    hipL: { x: hipL[0] - 3, y: hipL[1] + 2, rot: 0, size: 0 },
    hipR: { x: hipR[0] + 3, y: hipR[1] + 2, rot: 0, size: 0 },
    thighL: { x: thigh[0], y: thigh[1], rot: turnOf(legL.hip, legL.kn), size: 0 },
    kneeL: { x: kneeL[0], y: kneeL[1], rot: turnOf(legL.kn, legL.an), size: 0 },
    kneeR: { x: kneeR[0], y: kneeR[1], rot: turnOf(legR.kn, legR.an), size: 0 },
    crown: { x: 0, y: top + 0.8, rot: 0, size: 0 },
    browL: { x: 0, y: top + 7.6, rot: 0, size: 0 },
    sideL: { x: -half + 0.2, y: SIDE_RAIL[helmet] ?? -86.4, rot: 0, size: 0 },
    pose,
  };
}

/** A badge sized and turned for one anchor. */
function badgeAt(c, a, detail = "high") {
  // Badge art spans ~100 units; f() rounds to 0.1, too coarse for these scales.
  const s = Math.round(a.size * 10) / 1000;
  const inner = `<g transform="translate(${f(a.x)},${f(a.y)}) rotate(${f(a.rot)}) scale(${s})">${renderBadge(c.badge, { treatment: c.treatment, detail })}</g>`;
  return a.pivot ? `<g transform="rotate(${f(a.rot)} ${a.pivot[0]} ${a.pivot[1]})">${inner.replace(` rotate(${f(a.rot)})`, " rotate(0)")}</g>` : inner;
}

const wears = (c, where) => c.badge.placements.includes(where);

/** Gorget, with the bare neck above it when the face shows. */
const collarOf = (c, showFace, map) =>
  (showFace ? shape(NECK, "url(#skin)", 1) + `<path d="M-4.1,-73.6 C-2,-70.6 2,-70.6 4.1,-73.6 L4.3,-69.4 C2,-68.4 -2,-68.4 -4.3,-69.4 Z" fill="${c.skin.shadow}" opacity=".5"/>` : "") +
  recolor(gorget(), map);

/**
 * All layers of a customised agent as markup strings (without the <svg>).
 * @param {object} character game.character-shaped record
 * @param {{ pose?: "idle"|"hero"|"bust", peek?: boolean }} opts
 */
export function buildAgentParts(character, { pose = "idle", peek = false, turn = true } = {}) {
  const c = resolve(character || {});
  const armed = pose === "hero";
  const B = c.fem ? BUILDS.fem : BUILDS.masc;
  const P = buildPose(armed ? ARMED : STAND, B);
  const map = bodyMap(c);
  const legs = P.legs.map((leg, i) => armoredLeg(leg, i === 0 ? -1 : 1, B.legW));
  const arms = P.arms.map((arm, i) => armoredArm(arm, i === 0 ? -1 : 1, !armed && i === 0, B.armW));
  const tilt = P.arms.map((arm, i) => {
    const s = i === 0 ? -1 : 1;
    return -s * clamp((armSwing(arm, s) - 8) * 0.35, -4, 12);
  });
  const A = rigAnchors(P, tilt, armed ? "armed" : "standing", c.helmet);
  const acc = paintAccessories(c.accessories, A, c);
  const shoulderAO = P.arms.map((arm) => `<ellipse cx="${f(arm.sh[0])}" cy="${f(arm.sh[1] + 9)}" rx="7" ry="3.4" fill="url(#shade)"/>`).join("");
  const kit = gear(c, P);
  const showFace = peek || OPEN_HELMETS.has(c.helmet);

  let rifle = { body: "", hands: "", glow: "" };
  if (armed) {
    const r = chronoRifle();
    const gm = gunMap(c);
    const extra = finishExtras(c);
    rifle = {
      body: recolor(r.body, gm) + `<g ${RIFLE_TF}>${extra.body}</g>`,
      hands: recolor(r.hands, map),
      glow: recolor(r.glow, gm) + (extra.glow ? `<g ${RIFLE_TF}>${extra.glow}</g>` : ""),
    };
  }

  const collar = collarOf(c, showFace, map);
  const fr = frameLayers(c.frame, P, c);
  const fs = FRAME_SHAPE[c.frame] || FRAME_SHAPE.standard;
  // Shoulders scale about their joint with the frame; a Strider leaves the
  // right shoulder bare (soft cap) for its asymmetric kit.
  const shoulderAt = (s, t) => {
    if (fs.noShoulders) return "";
    const inner = fs.bareRight && s > 0 ? shoulder({ ...c, shoulder: "none" }, s, t) : shoulder(c, s, t);
    // A little smaller and lifted, so the deltoid swells out beneath the plate.
    const k = fs.shoulder * B.shoulder * 0.9;
    const dx = s * 20 * (B.sh - 1);
    // Space-separated: a pivot, not a point, so turns and reshapes leave it alone.
    return `<g transform="translate(${f(s * 14.6 + dx)} -66.4) scale(${f(k)}) translate(${f(-s * 14)} 64)">${inner}</g>`;
  };
  // The torso and what sits on it take the build's shape; limbs already
  // carry it through their joints and thickness.
  const TW = (m) => warpX(m, B.torso);
  // Turned, the far arm (screen right) and its shoulder sit behind the torso.
  // (Armed, both hands are on the rifle in front, so neither goes behind.)
  const farBehind = turn && !armed;
  const farArm = farBehind ? recolor(arms[1].body, map) + recolor(shoulderAt(1, tilt[1]), map) : "";
  const body =
    recolor(fr.under + legs.map((l) => l.body).join("") + fr.legs, map) +
    farArm +
    TW(
      recolor(torso() + (c.fem ? FEM_CHEST : "") + fr.torso, map) +
        (fs.softTorso ? "" : chestTrim(c)) +
        variantTrim(c) +
        insignia(c) +
        kit.front +
        acc.front,
    ) +
    rifle.body +
    recolor((farBehind ? arms[0].body : arms.map((a) => a.body).join("")) + fr.arms + shoulderAO, map) +
    recolor(shoulderAt(-1, tilt[0]) + (farBehind ? "" : shoulderAt(1, tilt[1])), map) +
    (wears(c, "chest") ? TW(badgeAt(c, A.chest)) : "") +
    (wears(c, "shoulder") ? badgeAt(c, A.shoulderL, "low") : "") +
    (wears(c, "forearm") ? badgeAt(c, A.forearmL, "low") : "") +
    rifle.hands +
    TW(collar) +
    acc.top;

  const torsoGlow = c.armor === "heavy" || c.armor === "trencher" || fs.softTorso ? BELT_GLOW : TORSO_GLOW;
  const limbGlow = fs.noLimbGlow ? "" : legs.map((l) => l.glow).join("") + arms.map((a) => a.glow).join("");
  const glow = recolor(limbGlow, map) + TW(recolor(torsoGlow, map) + kit.glow) + fr.glow + rifle.glow + acc.glow;
  const h = head(c, peek);
  const helmBadge = wears(c, "helmet") && !OPEN_HELMETS.has(c.helmet) ? badgeAt(c, A.helmet, "low") : "";
  let cape = acc.replacesCape || c.capeOff || (FRAME_SHAPE[c.frame] || {}).noCape ? "" : recolor(standingCape(), map).replace(/^<ellipse[^>]*\/>/, "");
  if (cape && CAPE_HEM[c.armor]) {
    cape = `<g clip-path="url(#capeCut)">${cape}</g>` + line(capeHemLine(CAPE_HEM[c.armor]), mix(c.cape[3], "#000000", 0.4), 1.1, 0.8);
  }
  // Limb axes for the turn: each limb turns about its own cylinder.
  const limbAxes = [
    ...P.legs.flatMap((l) => [{ a: l.hip, b: l.kn, r: 8.6 }, { a: l.kn, b: l.an, r: 6.6 }]),
    ...P.arms.flatMap((arm, i) => {
      const { sh, el, wr } = armJoints(arm, i === 0 ? -1 : 1);
      return [{ a: sh, b: el, r: 7.2 }, { a: el, b: wr, r: 5.6 }];
    }),
  ];
  const TB = (m, dir = 1) => (turn && m ? turnBody(m, dir, dir > 0 ? limbAxes : []) : m);
  const TH = (m) => (turn && m ? turnHead(m) : m);
  // Grow the figure from the soles; the head rides up on the neck at its own size.
  const W = (m) => (B.scale === 1 || !m ? m : `<g transform="translate(0,58) scale(${B.scale}) translate(0,-58)">${m}</g>`);
  const neckLift = f(-126 * (B.scale - 1));
  const headFem = (m) => `<g transform="translate(0,${neckLift}) translate(0,-67) scale(${B.head}) translate(0,67)">${m}</g>`;
  return {
    defs: defs(c),
    width: (ARMOR_WIDTH[c.armor] || 1) * fs.width,
    shadow: `<ellipse cx="0" cy="58.6" rx="${armed ? 44 : 38}" ry="4.8" fill="url(#shade)"/>`,
    back: W(TB(kit.back + acc.back, -1)),
    cape: W(TB(cape, -1)),
    body: W(TB(body)),
    glow: W(TB(glow)),
    collar: W(TB(TW(collar))),
    head: headFem(headScale(TH(h.front + helmBadge + acc.head))),
    headGlow: headFem(headScale(TH(h.glow + acc.headGlow))),
    eyesVisible: showFace,
    look: c,
  };
}

/** Prefix every id / url(#id) / href="#id" so several agents can share a document. */
export function scopeIds(markup, prefix) {
  if (!prefix) return markup;
  return markup
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
}

/**
 * Full <svg> for a customised agent.
 * @param {object} character
 * `headOnly` draws just collar + head (option tiles), framed by AGENT_VIEW.helm.
 * `realistic` renders the Modern (realistic) look instead of the Comic one.
 * `px` is the [width, height] in CSS pixels the view will be drawn at; Modern
 * sizes its lighting filters from it (default: the stage's full-body frame).
 * @param {{ pose?: "idle"|"hero"|"bust", lighting?: "showroom"|"flat", peek?: boolean, idPrefix?: string, className?: string, view?: number[], headOnly?: boolean, realistic?: boolean, px?: number[] }} opts
 */
export function buildAgentSvg(character, { pose = "idle", lighting = "showroom", peek = false, idPrefix = "", className = "", view, headOnly = false, realistic = false, px } = {}) {
  const p = buildAgentParts(character, { pose: pose === "bust" ? "idle" : pose, peek });
  if (realistic) return realAgentSvg(p, { pose, idPrefix, className, view, headOnly, px });
  if (headOnly) {
    const v = view || AGENT_VIEW.helm;
    return scopeIds(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(" ")}" class="${className}" aria-hidden="true"><defs>${p.defs}</defs>${p.collar}${p.head}${p.headGlow}</svg>`,
      idPrefix,
    );
  }
  view = view || (pose === "bust" ? AGENT_VIEW.bust : AGENT_VIEW.full);
  const k = f(p.width);
  const bodyTf = k === 1 ? "" : ` transform="scale(${k} 1)"`;
  const rimSweep =
    lighting === "showroom"
      ? `<ellipse cx="0" cy="-24" rx="52" ry="86" fill="url(#aura)" class="ag-aura"/>`
      : "";
  const accent = pick(CHARACTER_COLORS, (character || {}).colorIndex).accent;
  const aura = `<radialGradient id="aura"><stop offset="0" stop-color="${accent}" stop-opacity=".16"/><stop offset=".6" stop-color="${accent}" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.join(" ")}" class="${className}" role="img" aria-label="Agent preview">` +
    `<defs>${p.defs}${aura}</defs>` +
    rimSweep +
    `<g class="ag-fig">` +
    `<g class="ag-shadow">${p.shadow}</g>` +
    `<g class="ag-yaw-back"><g${bodyTf}>${p.back}</g></g>` +
    `<g class="ag-yaw-cape"><g class="ag-cape"><g${bodyTf}>${p.cape}</g></g></g>` +
    `<g class="ag-yaw-body"><g class="ag-body"><g${bodyTf}>${p.body}</g></g>` +
    `<g class="ag-glow"><g${bodyTf}>${p.glow}</g></g></g>` +
    `<g class="ag-yaw-head"><g class="ag-head">${p.head}</g><g class="ag-visor">${p.headGlow}</g></g>` +
    `</g></svg>`;
  return scopeIds(markup, idPrefix);
}

/** Chrono rifle alone, level, in its weapon finish (for loadout chips). */
export function buildRifleSvg(character, { idPrefix = "", realistic = false } = {}) {
  const c = resolve(character || {});
  const gm = gunMap(c);
  const r = chronoRifle();
  const extra = finishExtras(c);
  const inv = `transform="rotate(${-RIFLE_ROT}) translate(${f(-RIFLE_AT[0])},${f(-RIFLE_AT[1])})"`;
  const label = `Chrono rifle, ${pick(WEAPON_SKINS, character.weaponSkinIndex).name} finish`;
  const body = recolor(r.body, gm) + `<g ${RIFLE_TF}>${extra.body}</g>`;
  const glow = recolor(r.glow, gm) + (extra.glow ? `<g ${RIFLE_TF}>${extra.glow}</g>` : "");
  if (realistic) {
    const o = { rims: [c.rim, RIM], keep: SOFT_HIGHLIGHTS };
    const markup =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -16 106 34" role="img" aria-label="${label}">` +
      `<defs>${realAgentDefs(c)}${realFilters([-40, -110, 180, 180], { u: 0.4, spec: 0.6, grime: 0.28, seed: 3 })}</defs>` +
      `<g ${inv}><g filter="url(#rmat)">${realizeMarkup(body, o)}</g>${realizeMarkup(glow, o)}</g>` +
      `</svg>`;
    return scopeIds(markup, idPrefix);
  }
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -16 106 34" role="img" aria-label="${label}">` +
    `<defs>${defs(c)}</defs>` +
    `<g ${inv}>${body}${glow}</g>` +
    `</svg>`;
  return scopeIds(markup, idPrefix);
}

// ---------------------------------------------------------------------------
// Modern (realistic) look
// ---------------------------------------------------------------------------

/**
 * Photographic materials for a resolved look, swapped over the Comic defs by
 * id: each armor keeps its own tint (olive recon, tan tech, pale pathfinder,
 * black reliquary…) as painted metal with one narrow specular; the undersuit
 * is dark rubberised fabric, the cape wool, the visor smoked glass tinted by
 * the palette's energy colour. Palette and skin keep more of their colour than
 * the armor so every choice stays distinguishable.
 */
function realAgentDefs(c) {
  const s = (ARMOR_STEEL[c.armor] || ARMOR_STEEL.standard).map((h) => realHex(h, 0.35));
  const matte = MATTE.has(c.armor);
  const spec = matte ? mix(s[1], s[0], 0.55) : mix(s[0], "#ffffff", 0.15);
  const base = mix(s[1], s[2], 0.4);
  const ramp = `x1="0" y1="0" x2="1" y2=".35"`;
  const cape = c.cape.map((h) => realHex(h, 0.45));
  const g = c.finish.stops.map((h) => realHex(h, 0.35));
  const e = c.energy;
  let d = realizeDefs(defs(c), {}, 0.3);
  const swap = {
    steel: sheen("steel", base, spec, s[3], s[4], 0.15, ramp),
    steelDk: sheen("steelDk", mix(base, s[3], 0.45), mix(base, spec, 0.4), s[3], mix(s[4], "#000000", 0.3), 0.16, ramp),
    suit: c.camo
      ? camoPattern(c.camo, "suit")
      : `<linearGradient id="suit" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="${matte ? "#26292d" : "#3a3e43"}"/>` +
      `<stop offset=".45" stop-color="${matte ? "#131517" : "#1d2024"}"/><stop offset="1" stop-color="#08090a"/></linearGradient>`,
    cape:
      `<linearGradient id="cape" gradientUnits="userSpaceOnUse" x1="-38" y1="-50" x2="34" y2="10">` +
      `<stop offset="0" stop-color="${cape[0]}"/><stop offset=".3" stop-color="${cape[1]}"/>` +
      `<stop offset=".62" stop-color="${cape[2]}"/><stop offset="1" stop-color="${cape[3]}"/></linearGradient>`,
    visor:
      `<linearGradient id="visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(e, "#05080a", 0.9)}"/>` +
      `<stop offset=".42" stop-color="${mix(e, "#0b1216", 0.62)}"/><stop offset=".58" stop-color="${mix(e, "#d8e2e6", 0.35)}"/>` +
      `<stop offset="1" stop-color="${mix(e, "#040607", 0.9)}"/></linearGradient>`,
    gun: c.finish.mirror
      ? sheen("gun", "#9aa2a8", "#f2f4f5", "#4a5258", "#15181b", 0.3, `x1="0" y1="0" x2="0" y2="1"`)
      : sheen("gun", g[0], mix(g[0], "#ffffff", 0.3), g[1], g[2], 0.24, `x1="0" y1="0" x2="0" y2="1"`),
  };
  for (const [id, m] of Object.entries(swap)) d = swapGradient(d, id, m);
  return d;
}

/** Figure markup for the Modern (realistic) look: see buildAgentSvg. */
/** realizeMarkup options for a resolved look. */
function realOpts(c) {
  // Badge enamel and metal keep their colour so brass stays warm under the grade.
  const badgeKeep = {};
  for (const e of ENAMELS) badgeKeep[e.color] = e.color;
  for (const m of METALS) for (const col of m.ramp) badgeKeep[col] = col;
  // Candy red is lacquer, not light: it darkens like paint under the key.
  return { rims: [c.rim, RIM], desat: 0.4, keep: { ...badgeKeep, ...(MATTE.has(c.armor) ? {} : SOFT_HIGHLIGHTS), [CANDY]: "#962330", [CANDY_HI]: "#b3434c" } };
}

function realAgentSvg(p, { pose, idPrefix, className, view, headOnly, px }) {
  const c = p.look;
  const o = realOpts(c);
  const head = realizeMarkup(p.head, { ...o, desat: 0.15 });
  const headGlow = realizeMarkup(p.headGlow, o);
  const collar = realizeMarkup(p.collar, o);
  // Filter blur and grain are sized in art units, so scale them to the frame:
  // the stage figure spans ~450px, option tiles ~64px.
  const v = view || (headOnly ? AGENT_VIEW.helm : pose === "bust" ? AGENT_VIEW.bust : AGENT_VIEW.full);
  // A close-up drawn with the full-body `u` magnifies every blur and grain
  // with the zoom, so a caller that knows its frame passes it in `px`.
  const u = px ? Math.max(v[2] / px[0], v[3] / px[1]) : v[2] / (v[2] >= 140 ? 450 : 64);
  const pad = v[2] * 0.25;
  const box = [f(v[0] - pad), f(v[1] - pad), f(v[2] + pad * 2), f(v[3] + pad * 2)];
  const fdefs = realAgentDefs(c) + realFilters(box, { u, spec: MATTE.has(c.armor) ? 0.18 : 0.55, grime: 0.14, seed: 5, tight: true, smooth: px ? 4 : 1 });
  // A visible face gets skin shading; the cloth filter's blur and weave
  // smeared eyes and mouth into a grainy mask.
  const headFx = p.eyesVisible ? "rskin" : "rmat";
  if (headOnly) {
    return scopeIds(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(" ")}" class="${className}" aria-hidden="true"><defs>${fdefs}</defs>` +
        `<g filter="url(#rmat)">${collar}</g><g filter="url(#${headFx})">${head}</g>${headGlow}</svg>`,
      idPrefix,
    );
  }
  const k = f(p.width);
  const bodyTf = k === 1 ? "" : ` transform="scale(${k} 1)"`;
  const armed = pose === "hero";
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.join(" ")}" class="${className}" role="img" aria-label="Agent preview">` +
    `<defs>${fdefs}</defs>` +
    `<g class="ag-fig">` +
    `<g class="ag-shadow">${contactShadow(0, 58.8, armed ? 44 : 38, 6.2)}</g>` +
    `<g class="ag-yaw-back"><g${bodyTf}><g filter="url(#rmat)">${realizeMarkup(p.back, o)}</g></g></g>` +
    `<g class="ag-yaw-cape"><g class="ag-cape"><g${bodyTf}><g filter="url(#rcloth)">${realizeMarkup(p.cape, o)}</g></g></g></g>` +
    `<g class="ag-yaw-body"><g class="ag-body"><g${bodyTf}><g filter="url(#rmat)">${realizeMarkup(p.body, o)}</g></g></g>` +
    `<g class="ag-glow"><g${bodyTf}>${realizeMarkup(p.glow, o)}</g></g></g>` +
    `<g class="ag-yaw-head"><g class="ag-head"><g filter="url(#${headFx})">${head}</g></g><g class="ag-visor">${headGlow}</g></g>` +
    `</g></svg>`;
  return scopeIds(markup, idPrefix);
}

// ---------------------------------------------------------------------------
// Cutscene cast
// ---------------------------------------------------------------------------

/**
 * Cutscene / flipbook art keys that show the armoured agent. They follow the
 * saved character; the unarmoured cadet (hero_human, hero_at_desk) does not.
 */
export const CAST_KEYS = ["hero", "hero_armed", "hero_fallen"];

const auraDef = (e) =>
  `<radialGradient id="aura"><stop offset="0" stop-color="${e}" stop-opacity=".13"/>` +
  `<stop offset=".6" stop-color="${e}" stop-opacity=".04"/><stop offset="1" stop-color="${e}" stop-opacity="0"/></radialGradient>`;

/** Cracks across a closed visor, for the fallen agent (head coordinates). */
const visorCracks = (c) =>
  line("M-7.6,-84.6 L-4.8,-81.6 L-5.6,-79.4 M-4.8,-81.6 L-1.6,-80.8 L0.8,-78.2 M-1.6,-80.8 L-0.6,-83.4", mix(c.core, "#ffffff", 0.3), 0.45, 0.85) +
  line("M-4.8,-81.6 L-8.4,-80.2", mix(c.core, "#ffffff", 0.3), 0.35, 0.6) +
  line("M4.4,-89.2 L6.2,-86.6 L5.4,-85.6 M6.2,-86.6 L8.6,-86.8", INK, 0.55, 0.9);

/**
 * The customised agent down on the floor, in the rig coordinates of the stock
 * hero_fallen (models/hero.js): same limbs, damage and cape, dressed in the
 * character's armour, shoulders, helmet, gear and colours.
 */
function fallenParts(c) {
  const map = { ...bodyMap(c), "#4a0c0c": c.cape[2], "#e05050": mix(c.cape[0], "#ffffff", 0.2), "#140202": mix(c.cape[3], "#000000", 0.5) };
  const P = FALLEN;
  const [upperArm, trappedArm] = [armoredArm(P.arms[0], -1, true), armoredArm(P.arms[1], 1, false)];
  const [upperLeg, lowerLeg] = [armoredLeg(P.legs[0], -1), armoredLeg(P.legs[1], 1)];
  const kit = gear(c, P);
  const showFace = OPEN_HELMETS.has(c.helmet);
  const h = head(c, false);
  const headTf = (inner) => `<g transform="translate(8,2)"><g transform="rotate(24 0 -69)">${headScale(inner)}</g></g>`;
  const A = rigAnchors(FALLEN, [14, -4], "fallen", c.helmet);
  const acc = paintAccessories(c.accessories, A, c);
  const helmBadge = wears(c, "helmet") && !showFace ? badgeAt(c, A.helmet, "low") : "";
  const leftBadge = wears(c, "shoulder") ? badgeAt(c, { ...A.shoulderL, rot: 14 }, "low") : "";
  // The free arm lies on top of the body, so its vambrace badge rides with it.
  const armBadge = wears(c, "forearm") ? badgeAt(c, A.forearmL, "low") : "";
  return {
    width: ARMOR_WIDTH[c.armor] || 1,
    pool: acc.replacesCape || c.capeOff ? "" : recolor(fallenCape(), map),
    under:
      kit.back +
      acc.back +
      recolor(trappedArm.body + lowerLeg.body + upperLeg.body + torso(), map) +
      chestTrim(c) +
      variantTrim(c) +
      insignia(c) +
      kit.front +
      fallenDamage() +
      recolor(shoulder(c, 1, -4), map) +
      (wears(c, "chest") ? badgeAt(c, A.chest) : "") +
      collarOf(c, showFace, map) +
      acc.front,
    head: headTf(h.front + helmBadge + (showFace ? "" : visorCracks(c)) + acc.head),
    over: recolor((acc.replacesCape || c.capeOff ? "" : capeFlap()) + upperArm.body + shoulder(c, -1, 14), map) + leftBadge + armBadge + acc.top,
    glow: recolor(lowerLeg.glow + upperLeg.glow + TORSO_GLOW + upperArm.glow, map) + kit.glow + acc.glow,
    headGlow: headTf(h.glow + acc.headGlow),
    sparks: recolor(FALLEN_SPARKS, map),
    capeIn:
      `<linearGradient id="capeIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.cape[3]}"/>` +
      `<stop offset="1" stop-color="${mix(c.cape[3], "#000000", 0.5)}"/></linearGradient>` +
      `<radialGradient id="scorch"><stop offset="0" stop-color="#050302" stop-opacity=".85"/>` +
      `<stop offset=".5" stop-color="#1a0f08" stop-opacity=".5"/><stop offset="1" stop-color="#1a0f08" stop-opacity="0"/></radialGradient>`,
  };
}

/**
 * A cutscene model (svg-art/index.js format) of the customised agent for one
 * of CAST_KEYS. Poses, rig coordinates, layer order and animation match the
 * stock models in models/hero.js, so every scene keeps its framing; only the
 * build differs. `realistic` gives the Modern (photographic) treatment.
 * Pure string work: build once per character and style, never per frame.
 * @param {object} character game.character-shaped record
 * @param {string} key one of CAST_KEYS
 * @param {{ realistic?: boolean }} [opts]
 */
export function buildCastModel(character, key, { realistic = false } = {}) {
  const ch = character || {};
  if (key === "hero_fallen") return castFallen(resolve(ch), realistic);
  const armed = key === "hero_armed";
  const p = buildAgentParts(ch, { pose: armed ? "hero" : "idle" });
  const c = p.look;
  const k = f(p.width);
  const sc = (m) => (k === 1 ? m : `<g transform="scale(${k} 1)">${m}</g>`);
  const breathe = { type: "breathe", amp: 0.006, speed: 1.6, pivot: [0, 58] };
  const sway = { type: "sway", amp: 0.022, speed: 1.7, pivot: [0, -64] };
  const pulse = { type: "pulse", min: 0.7, max: 1, speed: armed ? 3.4 : 2.4 };
  if (!realistic) {
    return {
      box: [-74, -116, armed ? 164 : 148, 182],
      defs: p.defs + auraDef(c.energy),
      anim: breathe,
      layers: [
        { markup: `<ellipse cx="0" cy="-22" rx="46" ry="78" fill="url(#aura)"/>`, anim: { type: "pulse", min: 0.6, max: 1, speed: 1.2 } },
        { markup: p.shadow + sc(p.back) },
        { markup: sc(p.cape), anim: sway },
        { markup: sc(p.body) + p.head },
        { markup: sc(p.glow) + p.headGlow, anim: pulse, blend: "lighter" },
      ],
    };
  }
  const box = [-86, -140, 208, 214];
  const o = realOpts(c);
  const R = (m) => realizeMarkup(m, o);
  const headFx = p.eyesVisible ? "rskin" : "rmat";
  return {
    box,
    defs: realAgentDefs(c) + realFilters(box, { u: 0.45, spec: MATTE.has(c.armor) ? 0.18 : 0.55, grime: 0.26, seed: 5 }),
    anim: breathe,
    layers: [
      {
        markup: volumetric({ cx: 4, cy: -26, rx: 58, ry: 84, color: mix("#9fb4c6", c.energy, 0.18), top: -140, shaftW: 44, bottom: 60 }),
        anim: { type: "pulse", min: 0.82, max: 1, speed: 0.9 },
        blend: "screen",
      },
      { markup: contactShadow(0, 58.8, armed ? 46 : 40, 7) + `<g filter="url(#rmat)">${sc(R(p.back))}</g>` },
      { markup: `<g filter="url(#rcloth)">${sc(R(p.cape))}</g>`, anim: sway },
      { markup: `<g filter="url(#rmat)">${sc(R(p.body))}</g><g filter="url(#${headFx})">${realizeMarkup(p.head, { ...o, desat: 0.15 })}</g>` },
      { markup: sc(R(p.glow)) + R(p.headGlow), anim: pulse, blend: "lighter" },
    ],
  };
}

function castFallen(c, realistic) {
  const p = fallenParts(c);
  const k = f(p.width);
  const sc = (m) => (k === 1 ? m : `<g transform="scale(${k} 1)">${m}</g>`);
  const TF = (m) => `<g ${FALLEN_TF}>${m}</g>`;
  const box = [-112, -40, 224, 118];
  const breathe = { type: "breathe", amp: 0.01, speed: 1.1, pivot: [0, 40] };
  const glowAnim = { type: "flicker", min: 0.15, max: 0.7, speed: 1.4 };
  const headAnim = { type: "flicker", min: 0.2, max: 0.65, speed: 2.2 };
  const sparkAnim = { type: "flicker", min: 0, max: 1, speed: 3.1 };
  const floor = `<ellipse cx="-4" cy="50" rx="96" ry="14" fill="url(#shade)"/>` + debris();
  if (!realistic) {
    return {
      box,
      defs: defs(c) + p.capeIn,
      layers: [
        { markup: floor },
        { markup: TF(sc(p.pool + p.under) + p.head + sc(p.over)), anim: breathe },
        { markup: TF(sc(p.glow)), anim: glowAnim, blend: "lighter" },
        { markup: TF(p.headGlow), anim: headAnim, blend: "lighter" },
        { markup: p.sparks, anim: sparkAnim, blend: "lighter" },
      ],
    };
  }
  const o = realOpts(c);
  const R = (m) => realizeMarkup(m, o);
  // Filters wrap the rotated rig so the key light stays screen-space.
  const headFx = OPEN_HELMETS.has(c.helmet) ? "rcloth" : "rmat";
  return {
    box,
    defs: realAgentDefs(c) + realizeDefs(p.capeIn, {}, 0.45) + realFilters(box, { u: 0.45, spec: MATTE.has(c.armor) ? 0.18 : 0.5, grime: 0.32, seed: 9 }),
    layers: [
      { markup: contactShadow(-4, 48, 100, 16) + R(debris()) },
      {
        markup:
          `<g filter="url(#rcloth)">${TF(sc(R(p.pool)))}</g>` +
          `<g filter="url(#rmat)">${TF(sc(R(p.under)))}</g>` +
          `<g filter="url(#${headFx})">${TF(realizeMarkup(p.head, { ...o, desat: 0.15 }))}</g>` +
          `<g filter="url(#rmat)">${TF(sc(R(p.over)))}</g>`,
        anim: breathe,
      },
      { markup: TF(sc(R(p.glow))), anim: glowAnim, blend: "lighter" },
      { markup: TF(R(p.headGlow)), anim: headAnim, blend: "lighter" },
      { markup: R(p.sparks), anim: sparkAnim, blend: "lighter" },
    ],
  };
}
