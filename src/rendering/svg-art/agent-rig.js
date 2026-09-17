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
  armSwing,
  pauldron,
  torso,
  TORSO_GLOW,
  gorget,
  standingCape,
  chronoRifle,
  STAND,
  ARMED,
  RIFLE_AT,
  RIFLE_ROT,
} from "./models/hero.js";
import {
  CHARACTER_COLORS,
  SKIN_TONES,
  HAIR_STYLES,
  EYE_COLORS,
  ARMOR_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  BADGES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  BACKSTORIES,
} from "../../data/cosmetics.js";

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
};
const ARMOR_WIDTH = { standard: 1, recon: 0.95, heavy: 1.1, stealth: 0.97, tech: 1.03 };

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
    helmet: pick(HELMET_STYLES, ch.helmetIndex).id,
    visor: pick(VISOR_STYLES, ch.visorIndex).id,
    shoulder: pick(SHOULDER_STYLES, ch.shoulderIndex).id,
    badge: pick(BADGES, ch.badgeIndex).icon,
    weapon,
    finish,
    loadout: pick(LOADOUT_CLASSES, ch.loadoutIndex).id,
    origin: pick(BACKSTORIES, ch.backstoryIndex).id,
    skin: pick(SKIN_TONES, ch.skinToneIndex),
    hair: pick(HAIR_STYLES, ch.hairIndex),
    eyes: pick(EYE_COLORS, ch.eyeIndex).color,
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
  if (c.armor === "stealth") {
    // Ghost plating is matte: knock the painted-in speculars down.
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

function defs(c) {
  const s = ARMOR_STEEL[c.armor] || ARMOR_STEEL.standard;
  const g = c.finish.stops;
  const skin = c.skin;
  const hair = c.hair.color;
  const suitLo = c.armor === "stealth" ? ["#1a222c", "#0c1118", "#040609"] : ["#2e4058", "#162232", "#070b12"];
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
<linearGradient id="suit" x1="0" y1="0" x2="1" y2=".25">
  <stop offset="0" stop-color="${suitLo[0]}"/><stop offset=".45" stop-color="${suitLo[1]}"/>
  <stop offset="1" stop-color="${suitLo[2]}"/></linearGradient>
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
<radialGradient id="sheen"><stop offset="0" stop-color="#fff" stop-opacity="${c.armor === "stealth" ? 0.18 : 0.5}"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.3"/></filter>
<filter id="bloom" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="ao" x="-.5" y="-.5" width="2" height="2"><feGaussianBlur stdDeviation="1.5"/></filter>
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
      `<ellipse cx="${x}" cy="-81.9" rx="2.9" ry="1.8" fill="${shadow}" opacity=".35"/>` +
      `<path d="${M("M-4.7,-81.6 Q-3.1,-82.8 -1.5,-81.6 Q-3.1,-80.7 -4.7,-81.6 Z")}" fill="#e2dad2"/>` +
      `<circle cx="${f(x + 0.1)}" cy="-81.6" r=".78" fill="${c.eyes}"/>` +
      `<circle cx="${f(x + 0.1)}" cy="-81.6" r=".34" fill="#050505"/>` +
      `<circle cx="${f(x - 0.2)}" cy="-81.95" r=".17" fill="#fff"/>` +
      `<path d="${M("M-4.9,-81.7 Q-3.1,-83.2 -1.3,-81.8 Q-3.1,-82.3 -4.9,-81.7 Z")}" fill="${mix(c.skin.color, shadow, 0.4)}"/>` +
      line(M("M-4.9,-81.6 Q-3.1,-82.6 -1.3,-81.7"), "#1a100c", 0.45, 0.9) +
      line(M("M-5.7,-83.9 C-4.5,-84.8 -2.6,-84.9 -1.2,-84.2"), mix(c.hair.id === "none" ? c.skin.shadow : c.hair.color, "#000000", 0.2), 0.85)
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
    `<path d="M-2.3,-73.6 C-1,-74.2 1,-74.2 2.3,-73.6 C1,-73.3 -1,-73.3 -2.3,-73.6 Z" fill="${mix(c.skin.shadow, "#a04040", 0.3)}"/>` +
    line("M-2.5,-73.5 C-1,-74.1 1,-74.1 2.5,-73.5", mix(shadow, "#000000", 0.4), 0.5, 0.9) +
    line("M-1.2,-72.6 L1.2,-72.6", mix(c.skin.color, "#ffffff", 0.25), 0.4, 0.4) +
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
    if (id === "buzz") return line("M-7,-84.6 L-6.9,-82 M7,-84.6 L6.9,-82", c.hair.color, 0.9, 0.7);
    return "";
  }
  if (id === "none")
    return `<ellipse cx="-2.6" cy="-89.4" rx="3.6" ry="1.6" fill="#fff" opacity=".18"/>` + line("M-6.4,-88.6 C-4,-91.4 2,-91.8 5.6,-89.4", c.skin.shadow, 0.4, 0.3);
  if (id === "buzz")
    return (
      `<path d="M-7.4,-83.4 C-7.8,-89.6 -4.4,-92.6 0,-92.6 C4.4,-92.6 7.8,-89.6 7.4,-83.4 C6.8,-86.6 4.4,-88.2 0,-88.5 C-4.4,-88.2 -6.8,-86.6 -7.4,-83.4 Z" fill="url(#hair)" opacity=".9" stroke="${INK}" stroke-width=".5"/>` +
      line("M-5.2,-89.6 C-3,-91.4 1,-91.6 3.6,-90.6", hl, 0.35, 0.35)
    );
  if (id === "coil") {
    let curls = "";
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (1.06 + (i / 10) * 0.88);
      const x = Math.cos(a) * 7.6;
      const y = -85.2 + Math.sin(a) * 7.4;
      curls += `<circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="url(#hair)" stroke="${INK}" stroke-width=".5"/>`;
      curls += line(`M${pt(x - 1.1, y - 0.6)} Q${pt(x, y - 1.6)} ${pt(x + 1, y - 0.7)}`, hl, 0.35, 0.5);
    }
    return shape("M-7.6,-83 C-8.2,-90 -4.4,-93.6 0,-93.6 C4.4,-93.6 8.2,-90 7.6,-83 C6,-86 3,-87.4 0,-87.4 C-3,-87.4 -6,-86 -7.6,-83 Z", "url(#hair)", 0.6) + curls;
  }
  if (id === "braid")
    return (
      shape("M-7.5,-83.4 C-8,-89.8 -4.6,-93 0,-93 C4.6,-93 8,-89.8 7.5,-83.4 C6.6,-86.8 3.6,-88.4 0.6,-88.6 L-0.4,-87 C-3,-87.8 -6,-86.8 -7.5,-83.4 Z", "url(#hair)", 0.7) +
      line("M0.6,-92.6 L0.6,-88.6", lo, 0.45, 0.8) +
      line("M-5.6,-89.6 C-4,-91.4 -1.4,-92.2 0,-92.2 M2,-92 C4,-91.6 5.8,-90.2 6.6,-88", hl, 0.4, 0.5) +
      braid(c)
    );
  // short sweep / white shock share the swept cut
  const sweep =
    shape(
      "M-7.7,-83 C-8.4,-88.4 -6.6,-92.8 -1,-93.8 C3.8,-94.4 7.8,-92 8,-87.4 C8.1,-85.6 7.9,-84 7.4,-82.6 " +
        "C7,-85 6.2,-87.2 4.6,-88.4 C2,-87.4 -1.4,-88 -3.4,-89.4 C-4.6,-88.6 -5.8,-87.8 -6.4,-86.6 C-6.8,-85.6 -7,-84.4 -7.1,-82.8 Z",
      "url(#hair)",
      1,
    ) +
    line("M-6.4,-88 C-4.6,-91.6 -1,-93 2.6,-92.6 M-3.8,-89.4 C-2.4,-91.4 0.6,-92.2 3.6,-91.6", hl, 0.45, 0.6) +
    line("M4.6,-88.4 C5.8,-89.2 6.8,-90.6 7,-91.4 M1,-88.2 C2.6,-89.6 3.6,-90.8 3.8,-92", lo, 0.45, 0.6);
  return id === "white" ? sweep + line("M-5,-89.8 C-3,-92.4 0,-93.2 3,-92.8", c.energy, 0.5, 0.75) : sweep;
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

const OPEN_HELMETS = new Set(["wide", "mohawk"]);

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
};
const SHELL_HALF = { standard: 11.2, angular: 12.2, crested: 11.4, wide: 14.2, mohawk: 11.7 };

/** Closed visor per style: recess + glass markup and its glow. */
function closedVisor(c) {
  const v = c.visor;
  const e = c.energy;
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
function head(c, peek) {
  const style = c.helmet;
  const w = SHELL_HALF[style] || 11.2;
  const earX = w - 0.3;
  if (peek) {
    return { front: face(c) + hair(c, false), glow: eyeGlow(c, 0.45) };
  }
  const shell = SHELLS[style] || SHELLS.standard;
  const ears =
    `<circle cx="${f(-earX)}" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="${f(earX)}" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>`;
  const earGlow = glowOf(`<circle cx="${f(-earX)}" cy="-80.6" r=".6"/><circle cx="${f(earX)}" cy="-80.6" r=".6"/>`, c.energy, c.core);
  const dome =
    `<ellipse cx="-5.2" cy="-89.6" rx="4.4" ry="2.8" fill="url(#sheen)"/>` +
    line(`M${f(-w + 3.2)},-91 C-6.4,-93.4 -3.8,-94.4 -2.3,-94.4`, "#f4faff", 0.8, c.armor === "stealth" ? 0.3 : 0.8) +
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
      front: liner + face(c) + hair(c, true) + shape(shell, "url(#steel)") + dome + extra + ears + visorUp.body,
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
    front: fins + shape(shell, "url(#steel)") + dome + details + ears + visor.body,
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
    default:
      // "pads": the hero pauldron with a painted rim stripe
      return pauldron(s, tilt) + rot(trim("M13.8,-64.2 C18.6,-66.2 24.2,-65.4 27,-60.8"));
  }
}

// ---------------------------------------------------------------------------
// Emblems
// ---------------------------------------------------------------------------

const STAR = (() => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 2 : 4.8;
    d += `${i ? "L" : "M"}${pt(Math.cos(a) * r, Math.sin(a) * r + 0.3)} `;
  }
  return d + "Z";
})();

/** Badge icon in a -5..5 box, drawn in `color`. */
export function badgeIcon(icon, color, dark) {
  switch (icon) {
    case "shield":
      return `<path d="M0,-4.8 L4,-3.3 C4,0.8 2.4,3.4 0,4.8 C-2.4,3.4 -4,0.8 -4,-3.3 Z" fill="${color}"/><path d="M-2,-0.6 L0,1.6 L2,-0.6" fill="none" stroke="${dark}" stroke-width=".9"/>`;
    case "skull":
      return `<path d="M-3.8,0.8 C-4.8,-4.8 4.8,-4.8 3.8,0.8 L2.6,1.8 L2.6,4 L-2.6,4 L-2.6,1.8 Z" fill="${color}"/><g fill="${dark}"><circle cx="-1.6" cy="-0.6" r="1.1"/><circle cx="1.6" cy="-0.6" r="1.1"/><rect x="-.3" y="2.2" width=".6" height="1.8"/></g>`;
    case "clock":
      return `<circle r="4.2" fill="none" stroke="${color}" stroke-width="1.1"/><path d="M0,-2.8 L0,0 L2,1.4" fill="none" stroke="${color}" stroke-width=".9" stroke-linecap="round"/>`;
    case "star":
      return `<path d="${STAR}" fill="${color}"/>`;
    case "bolt":
      return `<path d="M1.2,-5 L-3,0.8 L-0.4,0.8 L-1.4,5 L3,-1 L0.4,-1 Z" fill="${color}"/>`;
    case "eye":
      return `<path d="M-4.8,0 Q0,-4.2 4.8,0 Q0,4.2 -4.8,0 Z" fill="${color}"/><circle r="1.6" fill="${dark}"/>`;
    case "rift":
      return `<path d="M0,-5 L1.8,0 L0,5 L-1.8,0 Z" fill="${color}"/><path d="M-4.2,-2.4 C-2,-4 2.2,-3.6 3.6,-1 M4.2,2.4 C2,4 -2.2,3.6 -3.6,1" fill="none" stroke="${color}" stroke-width=".8" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

/** Painted decal: dark roundel, icon in palette accent. */
function decal(c, x, y, scale) {
  if (!c.badge) return "";
  return (
    `<g transform="translate(${f(x)},${f(y)}) scale(${scale})">` +
    `<circle r="6.2" fill="#070b11" stroke="${INK}" stroke-width=".8"/>` +
    `<circle r="5.4" fill="none" stroke="${c.pal.primary}" stroke-width=".7" opacity=".9"/>` +
    badgeIcon(c.badge, c.pal.accent, "#070b11") +
    `</g>`
  );
}

/** Origin insignia, engraved into the left tasset. */
function insignia(c) {
  const col = c.armor === "stealth" ? "#6e7a88" : "#cfdae6";
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
      break;
    }
    case "heavy": {
      const collar = "M-15.4,-64.4 C-16,-69 -13,-72.8 -9.6,-74 L-7.6,-69.8 C-9.8,-68.8 -11.2,-67 -11.4,-64.2 Z";
      front += shape(collar, "url(#steel)", 0.9) + shape(mirror(collar), "url(#steelDk)", 0.9) + line("M-14.4,-66 C-14,-69.2 -12,-71.6 -9.8,-72.6", "#f4faff", 0.5, 0.7);
      legs.forEach((leg, i) => {
        const s = i === 0 ? -1 : 1;
        front += part(lerp(leg.hip, leg.kn, 0.26), lerp(leg.hip, leg.kn, 0.7), 15, 12, { bulge: 1, hi: 0.5, rimColor: c.rim });
        front += line(`M${pt(...lerp(leg.hip, leg.kn, 0.3))} l${f(s * 4.6)},1`, INK, 0.5, 0.6);
      });
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
export const AGENT_VIEW = { full: [-74, -116, 148, 182], bust: [-30, -111, 60, 60], torso: [-42, -104, 84, 84], helm: [-21, -110, 42, 42] };

/**
 * All layers of a customised agent as markup strings (without the <svg>).
 * @param {object} character game.character-shaped record
 * @param {{ pose?: "idle"|"hero"|"bust", peek?: boolean }} opts
 */
export function buildAgentParts(character, { pose = "idle", peek = false } = {}) {
  const c = resolve(character || {});
  const armed = pose === "hero";
  const P = armed ? ARMED : STAND;
  const map = bodyMap(c);
  const legs = P.legs.map((leg, i) => armoredLeg(leg, i === 0 ? -1 : 1));
  const arms = P.arms.map((arm, i) => armoredArm(arm, i === 0 ? -1 : 1, !armed && i === 0));
  const tilt = P.arms.map((arm, i) => {
    const s = i === 0 ? -1 : 1;
    return -s * clamp((armSwing(arm, s) - 8) * 0.35, -4, 12);
  });
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

  // Chest trim paint follows the pectoral seams under the ink lines.
  const chestTrim =
    line("M-15.2,-49.6 C-11,-45 -5,-45.2 -1.2,-47.6", c.pal.primary, 1.3, 0.9) +
    line("M15.2,-49.6 C11,-45 5,-45.2 1.2,-47.6", mix(c.pal.primary, "#000000", 0.35), 1.3, 0.9) +
    line("M-15.8,-50 C-11,-44.6 -5,-44.8 -0.6,-47.6 M15.8,-50 C11,-44.6 5,-44.8 0.6,-47.6", INK, 0.45, 0.8);

  const collar =
    (showFace ? shape(NECK, "url(#skin)", 1) + `<path d="M-4.1,-73.6 C-2,-70.6 2,-70.6 4.1,-73.6 L4.3,-69.4 C2,-68.4 -2,-68.4 -4.3,-69.4 Z" fill="${c.skin.shadow}" opacity=".5"/>` : "") +
    recolor(gorget(), map);
  const body =
    recolor(legs.map((l) => l.body).join("") + torso(), map) +
    chestTrim +
    insignia(c) +
    kit.front +
    rifle.body +
    recolor(arms.map((a) => a.body).join("") + shoulderAO, map) +
    recolor(shoulder(c, -1, tilt[0]) + shoulder(c, 1, tilt[1]), map) +
    decal(c, 8.8, -57.4, 0.62) +
    (c.shoulder === "pauldrons" || c.shoulder === "armored" ? `<g transform="rotate(${f(tilt[0])} -12 -65)">${decal(c, -24.4, -56, 0.5)}</g>` : "") +
    rifle.hands +
    collar;

  const glow = recolor(legs.map((l) => l.glow).join("") + TORSO_GLOW + arms.map((a) => a.glow).join(""), map) + kit.glow + rifle.glow;
  const h = head(c, peek);
  let cape = recolor(standingCape(), map).replace(/^<ellipse[^>]*\/>/, "");
  if (CAPE_HEM[c.armor]) {
    cape = `<g clip-path="url(#capeCut)">${cape}</g>` + line(capeHemLine(CAPE_HEM[c.armor]), mix(c.cape[3], "#000000", 0.4), 1.1, 0.8);
  }
  return {
    defs: defs(c),
    width: ARMOR_WIDTH[c.armor] || 1,
    shadow: `<ellipse cx="0" cy="58.6" rx="${armed ? 44 : 38}" ry="4.8" fill="url(#shade)"/>`,
    back: kit.back,
    cape,
    body,
    glow,
    collar,
    head: h.front,
    headGlow: h.glow,
    eyesVisible: showFace,
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
 * @param {{ pose?: "idle"|"hero"|"bust", lighting?: "showroom"|"flat", peek?: boolean, idPrefix?: string, className?: string, view?: number[], headOnly?: boolean }} opts
 */
export function buildAgentSvg(character, { pose = "idle", lighting = "showroom", peek = false, idPrefix = "", className = "", view, headOnly = false } = {}) {
  const p = buildAgentParts(character, { pose: pose === "bust" ? "idle" : pose, peek });
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
export function buildRifleSvg(character, { idPrefix = "" } = {}) {
  const c = resolve(character || {});
  const gm = gunMap(c);
  const r = chronoRifle();
  const extra = finishExtras(c);
  const inv = `transform="rotate(${-RIFLE_ROT}) translate(${f(-RIFLE_AT[0])},${f(-RIFLE_AT[1])})"`;
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -16 106 34" role="img" aria-label="Chrono rifle, ${pick(WEAPON_SKINS, character.weaponSkinIndex).name} finish">` +
    `<defs>${defs(c)}</defs>` +
    `<g ${inv}>${recolor(r.body, gm)}<g ${RIFLE_TF}>${extra.body}</g>${recolor(r.glow, gm)}${extra.glow ? `<g ${RIFLE_TF}>${extra.glow}</g>` : ""}</g>` +
    `</svg>`;
  return scopeIds(markup, idPrefix);
}
