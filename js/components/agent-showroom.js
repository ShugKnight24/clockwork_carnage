import {
  AGENT_VIEW,
  badgeIcon,
  buildAgentSvg,
  buildRifleSvg,
} from "../../src/rendering/svg-art/agent-rig.js";
import { tokensCss } from "../../src/ui/design-tokens.js";
import { isRealisticArt, onArtStyleChange } from "../../src/rendering/art-style.js";
import { gameUnlockContext, unlockState, LOCKABLE } from "../../src/systems/unlocks.js";
import {
  ARMOR_STYLES,
  BACKSTORIES,
  BADGES,
  CHARACTER_COLORS,
  DEFAULT_CHARACTER,
  EYE_COLORS,
  HAIR_STYLES,
  HELMET_STYLES,
  LOADOUT_CLASSES,
  SHOULDER_STYLES,
  SKIN_TONES,
  VISOR_STYLES,
  VOICE_PROFILES,
  WEAPON_SKINS,
} from "../../src/data/cosmetics.js";

/**
 * Modern-mode agent customizer: a full-screen "hero showroom" shown while the
 * game sits in GameState.CHARACTER_CREATE with Modern art selected.
 *
 * It edits game.character live (like the canvas creator), previews hovered or
 * focused options without committing them, and leaves through the same
 * game._exitCreator(saved) path, so first-run, tutorial and mode-select return
 * flows are unchanged. Keys reach it through the game's own dispatch (real
 * keyboard, ccDebug.pressKey and gamepad all funnel into handleKey), so there
 * is exactly one input path.
 */

const APPEARANCE = [
  "colorIndex",
  "skinToneIndex",
  "hairIndex",
  "eyeIndex",
  "armorIndex",
  "helmetIndex",
  "visorIndex",
  "shoulderIndex",
  "badgeIndex",
  "weaponSkinIndex",
];
const FIELDS = Object.keys(DEFAULT_CHARACTER);
const NAME_RE = /^[A-Za-z0-9 _.'-]+$/;
const OPEN_HELMETS = new Set(["wide", "mohawk"]);
const FACE_KEYS = new Set(["skinToneIndex", "hairIndex", "eyeIndex"]);

const PRESETS = [
  { name: "Regulation", ch: { colorIndex: 0, skinToneIndex: 0, hairIndex: 1, eyeIndex: 1, armorIndex: 0, helmetIndex: 0, visorIndex: 0, shoulderIndex: 1, badgeIndex: 3, weaponSkinIndex: 0 } },
  { name: "Juggernaut", ch: { colorIndex: 2, skinToneIndex: 2, hairIndex: 2, eyeIndex: 4, armorIndex: 2, helmetIndex: 3, visorIndex: 4, shoulderIndex: 3, badgeIndex: 2, weaponSkinIndex: 3 } },
  { name: "Ghost", ch: { colorIndex: 3, skinToneIndex: 3, hairIndex: 0, eyeIndex: 3, armorIndex: 3, helmetIndex: 2, visorIndex: 2, shoulderIndex: 0, badgeIndex: 6, weaponSkinIndex: 1 } },
  { name: "Engineer", ch: { colorIndex: 4, skinToneIndex: 4, hairIndex: 3, eyeIndex: 0, armorIndex: 4, helmetIndex: 1, visorIndex: 3, shoulderIndex: 4, badgeIndex: 5, weaponSkinIndex: 2 } },
  // Full looks: each of these only reads right with its own helmet and
  // pauldrons, so the preset is how a player gets the intended silhouette.
  { name: "Howitzer", ch: { colorIndex: 7, skinToneIndex: 1, hairIndex: 0, eyeIndex: 2, armorIndex: 5, helmetIndex: 5, visorIndex: 1, shoulderIndex: 7, badgeIndex: 2, weaponSkinIndex: 3 } },
  { name: "Breaker", ch: { colorIndex: 6, skinToneIndex: 2, hairIndex: 1, eyeIndex: 1, armorIndex: 6, helmetIndex: 6, visorIndex: 1, shoulderIndex: 5, badgeIndex: 4, weaponSkinIndex: 5 } },
  { name: "Reliquary", ch: { colorIndex: 2, skinToneIndex: 3, hairIndex: 0, eyeIndex: 4, armorIndex: 7, helmetIndex: 7, visorIndex: 2, shoulderIndex: 6, badgeIndex: 1, weaponSkinIndex: 1 } },
  { name: "Pathfinder", ch: { colorIndex: 5, skinToneIndex: 0, hairIndex: 2, eyeIndex: 3, armorIndex: 8, helmetIndex: 8, visorIndex: 2, shoulderIndex: 8, badgeIndex: 7, weaponSkinIndex: 2 } },
];

const I = {
  identity: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.4"/><path d="M5.6 16.4c.8-1.8 2-2.6 3.4-2.6s2.6.8 3.4 2.6M14.5 10h4M14.5 13.5h3"/></svg>`,
  suit: `<svg viewBox="0 0 24 24"><path d="M8 3 4 5.5 3 11l3 1.2V21h12v-8.8l3-1.2-1-5.5L16 3c-.8 1.6-2.2 2.4-4 2.4S8.8 4.6 8 3Z"/><path d="M12 9v8M9 12.5h6"/></svg>`,
  helmet: `<svg viewBox="0 0 24 24"><path d="M12 3c5 0 7.5 3.5 7.5 8.2V16c0 2.4-2 4.6-4.6 5H9.1C6.5 20.6 4.5 18.4 4.5 16v-4.8C4.5 6.5 7 3 12 3Z"/><path d="M5 11.2 11 12.4l1 1.2 1-1.2 6-1.2-.2 3.4-5.6 1-1.2.8-1.2-.8-5.6-1Z"/></svg>`,
  colors: `<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.4-1.2-1.6-1.2-3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.3"/><circle cx="10" cy="7" r="1.3"/><circle cx="15" cy="7" r="1.3"/></svg>`,
  loadout: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,
  undo: `<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -6)"/></svg>`,
  reset: `<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.4h4.4"/></svg>`,
  dice: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5Z"/></svg>`,
  check: `<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>`,
  turn: `<svg viewBox="0 0 24 24"><path d="M3 12c0-2.8 4-5 9-5s9 2.2 9 5-4 5-9 5"/><path d="m14 14.5-2.4 2.5 2.4 2.5"/></svg>`,
};

const CATEGORIES = [
  {
    id: "identity",
    label: "Identity",
    sections: [
      { type: "name", title: "Callsign" },
      { key: "backstoryIndex", title: "Origin", data: BACKSTORIES, kind: "origin" },
      { key: "voiceIndex", title: "Voice", data: VOICE_PROFILES, kind: "voice" },
    ],
  },
  {
    id: "suit",
    label: "Suit",
    sections: [
      { key: "armorIndex", title: "Armor", data: ARMOR_STYLES, kind: "torso" },
      { key: "shoulderIndex", title: "Shoulders", data: SHOULDER_STYLES, kind: "torso" },
      { key: "badgeIndex", title: "Badge", data: BADGES, kind: "badge" },
    ],
  },
  {
    id: "helmet",
    label: "Helmet",
    camera: "bust",
    sections: [
      { key: "helmetIndex", title: "Helmet", data: HELMET_STYLES, kind: "head" },
      { key: "visorIndex", title: "Visor", data: VISOR_STYLES, kind: "head" },
      { key: "eyeIndex", title: "Eyes", data: EYE_COLORS, kind: "eye" },
      { key: "skinToneIndex", title: "Face", data: SKIN_TONES, kind: "skin" },
      { key: "hairIndex", title: "Hair", data: HAIR_STYLES, kind: "hair" },
    ],
  },
  {
    id: "colors",
    label: "Colors",
    sections: [{ key: "colorIndex", title: "Palette", data: CHARACTER_COLORS, kind: "palette" }],
  },
  {
    id: "loadout",
    label: "Loadout",
    pose: "hero",
    sections: [
      { key: "loadoutIndex", title: "Class", data: LOADOUT_CLASSES, kind: "class" },
      { key: "weaponSkinIndex", title: "Weapon finish", data: WEAPON_SKINS, kind: "rifle" },
    ],
  },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TIER = ["", "I", "II", "III"];

/** Stat lines for a loadout, mirroring Game.applyLoadoutBonuses. */
function classStats(cls) {
  const b = cls.bonuses || {};
  const chrono = { phantom: 120, enforcer: 80 }[cls.id] ?? 100;
  return [
    { label: "Health", value: b.maxHealth ?? 100, base: 100, max: 150 },
    { label: "Speed", value: 3.5 + (b.moveSpeed ?? 0), base: 3.5, max: 4.5, fmt: (v) => v.toFixed(1) },
    { label: "Fire rate", value: 1 / (b.fireRateMultiplier ?? 1), base: 1, max: 1.25, fmt: (v) => `${Math.round(v * 100)}%` },
    { label: "Stamina", value: b.maxStamina ?? 100, base: 100, max: 150 },
    { label: "Chrono", value: chrono, base: 100, max: 130 },
    { label: "Damage", value: cls.id === "enforcer" ? 1.15 : 1, base: 1, max: 1.25, fmt: (v) => `${Math.round(v * 100)}%` },
  ];
}

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Every colour, font, chamfer, ink width, plate gradient, keycap and duration
// below comes from src/ui/design-tokens.js (injected as :host custom
// properties), so the showroom renders as the same family as the pause menu,
// mission select and HUD.
const STYLE = `
${tokensCss(":host")}
:host {
  --accent: #00ffdd; --primary: #00ccaa;
  --panel-w: min(452px, 38vw);
  --plate-bevel: inset 0 1px 0 rgba(185, 210, 232, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.55);
  position: fixed; inset: 0; z-index: 50; display: none;
  font-family: var(--cc-font); color: var(--cc-text);
  -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none;
}
:host([open]) { display: block; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
svg { display: block; }
.tab svg, .tool svg, .lock svg, .play svg, .tick svg, .handle svg, .hint-turn svg {
  fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
}
.play svg { fill: currentColor; stroke: none; }

/* ── Shared family pieces ─────────────────────────────── */
/* Steel keycap (drawKeycap). */
.key { display: inline-flex; align-items: center; justify-content: center; min-width: 1.9em; height: 1.9em; padding: 0 0.5em;
  font: 700 var(--cc-type-keycap)/1 var(--cc-font); letter-spacing: 0.5px; color: var(--cc-text); text-transform: none;
  background: var(--cc-keycap); border: 1px solid var(--cc-ink); border-radius: var(--cc-keycap-radius);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35); text-shadow: none; }
/* Comic caption plate (drawCaption): gradient card, ink edge, hard ink drop shadow. */
.caption { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 2px; font: 700 var(--cc-type-label)/1.2 var(--cc-font);
  letter-spacing: var(--cc-track-caption); text-transform: uppercase; border: var(--cc-ink-outline) solid var(--cc-ink);
  box-shadow: 2px 2px 0 var(--cc-ink), inset 0 1px 0 rgba(255, 255, 255, 0.35); }
.caption.cream { background: var(--cc-caption-cream); color: var(--cc-caption-cream-text); }
.caption.cyan { background: var(--cc-caption-cyan); color: var(--cc-caption-cyan-text); }
.caption.amber { background: var(--cc-caption-amber); color: var(--cc-caption-amber-text); }
.caption.steel { background: var(--cc-caption-steel); color: var(--cc-caption-steel-text); }
.caption.crimson { background: var(--cc-caption-crimson); color: var(--cc-caption-crimson-text); }
/* Corner brackets on the two square corners + tick on the top-left chamfer (drawPanel). */
.brackets { position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background:
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right 2px top 2px / var(--cc-bracket-len) 1.5px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right 2px top 2px / 1.5px var(--cc-bracket-len) no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left 2px bottom 2px / var(--cc-bracket-len) 1.5px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left 2px bottom 2px / 1.5px var(--cc-bracket-len) no-repeat,
    linear-gradient(135deg, transparent calc(var(--chamfer, 20px) - 2px), rgba(34, 230, 255, 0.7) calc(var(--chamfer, 20px) - 2px), rgba(34, 230, 255, 0.7) calc(var(--chamfer, 20px) - 0.5px), transparent calc(var(--chamfer, 20px) - 0.5px)) left top / calc(var(--chamfer, 20px) + 2px) calc(var(--chamfer, 20px) + 2px) no-repeat; }
/* Machined steel panel (drawPanel "menu"): ink silhouette, steel body inset, brushed grain, key-light sheen, top bevel, inner hairline. */
.frame { position: relative; --chamfer: var(--cc-chamfer-lg); background: var(--cc-ink);
  clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer)); }
.frame > .body { position: absolute; inset: var(--cc-ink-canvas); display: flex; flex-direction: column; min-height: 0;
  clip-path: polygon(calc(var(--chamfer) - 0.6px) 0, 100% 0, 100% calc(100% - var(--chamfer) + 0.6px), calc(100% - var(--chamfer) + 0.6px) 100%, 0 100%, 0 calc(var(--chamfer) - 0.6px));
  background:
    linear-gradient(160deg, rgba(190, 215, 235, 0.1), rgba(190, 215, 235, 0.02) 35%, rgba(190, 215, 235, 0) 60%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.022) 0 1px, transparent 1px 3px),
    var(--cc-panel-menu);
  box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.34), inset 1px 0 0 rgba(185, 210, 232, 0.12), inset 0 -1px 0 rgba(0, 0, 0, 0.45); }
.frame > .body::after { content: ""; position: absolute; inset: 2.5px; pointer-events: none; border: 1px solid var(--cc-hairline);
  clip-path: polygon(calc(var(--chamfer) - 1.5px) 0, 100% 0, 100% calc(100% - var(--chamfer) + 1.5px), calc(100% - var(--chamfer) + 1.5px) 100%, 0 100%, 0 calc(var(--chamfer) - 1.5px)); }
/* Section header (drawSectionHeader): accent tab, label, hairline, end tick. */
.section h3 { position: relative; display: flex; align-items: center; gap: 10px; margin: 0 0 10px; padding-left: 13px; height: 19px;
  font: 700 var(--cc-type-section)/1 var(--cc-font); letter-spacing: var(--cc-track-section); text-transform: uppercase; color: var(--cc-text); }
.section h3::before { content: ""; position: absolute; left: 0; top: 1px; bottom: 1px; width: 7px; background: var(--cc-cyan); box-shadow: 0 0 0 1px var(--cc-ink); }
.section h3::after { content: ""; flex: 1; height: 1px; order: 1; background: linear-gradient(90deg, rgba(130, 160, 188, 0.28) calc(100% - 10px), var(--cc-cyan) calc(100% - 10px)); box-shadow: 0 1px 0 transparent; }
.section h3 .cur { order: 2; font: 600 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 0.04em; color: var(--cc-text-dim); text-transform: none; }
.section h3 .cur.preview { color: var(--cc-cyan); }
/* Mission plate (style.css #modeSelect .mode-btn): steel, ink edge, chamfer, left accent inset. */
.plate { position: relative; color: var(--cc-text); background: var(--cc-steel); border: var(--cc-ink-outline) solid var(--cc-ink);
  clip-path: polygon(var(--cc-chamfer) 0, 100% 0, 100% calc(100% - var(--cc-chamfer)), calc(100% - var(--cc-chamfer)) 100%, 0 100%, 0 var(--cc-chamfer));
  box-shadow: var(--plate-bevel), inset 3px 0 0 rgba(34, 230, 255, 0.35);
  transition: transform var(--cc-dur-fast), box-shadow var(--cc-dur-fast), color var(--cc-dur-fast), background var(--cc-dur-fast); }
.plate:hover, .plate:focus-visible, :host(.kbd) .plate:focus { color: #fff; background: var(--cc-steel-hi); outline: none;
  box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.42), inset 5px 0 0 var(--cc-cyan), inset 0 0 0 2px rgba(34, 230, 255, 0.6), inset 0 0 26px rgba(34, 230, 255, 0.14); }
.plate:active { background: var(--cc-steel); }

.root { position: absolute; inset: 0; overflow: hidden; opacity: 0; transition: opacity var(--cc-dur-base) var(--cc-ease);
  background:
    radial-gradient(ellipse 70% 55% at 32% 30%, rgba(34, 230, 255, 0.07), transparent 70%),
    radial-gradient(ellipse at 36% 36%, #0d1826 0%, #05070d 70%, #020306 100%); }
:host([shown]) .root { opacity: 1; }

/* ── Backdrop ─────────────────────────────────────────── */
.backdrop { position: absolute; inset: 0; pointer-events: none; }
.backdrop::before { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 55% at 32% 44%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%); }
/* Halftone dots toward the bottom (the Modern stand-in for CRT scanlines) and ink letterbox rules. */
.halftone { position: absolute; inset: 0; background: radial-gradient(rgba(150, 180, 205, 0.07) 1px, transparent 1.6px) 0 0 / 7px 7px;
  -webkit-mask-image: linear-gradient(180deg, transparent 50%, #000 100%); mask-image: linear-gradient(180deg, transparent 50%, #000 100%); }
.letterbox { position: absolute; inset: 0; border-top: 3px solid rgba(4, 6, 11, 0.9); border-bottom: 3px solid rgba(4, 6, 11, 0.9); }
.shaft { position: absolute; top: -10%; width: 26%; height: 90%; left: 19%;
  background: linear-gradient(180deg, rgba(200, 230, 255, 0.1), rgba(200, 230, 255, 0) 80%);
  clip-path: polygon(35% 0, 65% 0, 100% 100%, 0 100%); filter: blur(6px); }
/* Big blurs get their own compositor layers (will-change): drifting or
   yaw-shifted on a shared layer, each movement re-rasterised 60px blurs at
   device resolution — ~100 ms GPU raster tasks every half second. */
.haze { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.45; will-change: transform; }
.haze.h1 { width: 46vw; height: 30vh; left: 6vw; top: 52vh; background: color-mix(in srgb, var(--accent) 22%, transparent); animation: drift 14s ease-in-out infinite alternate; }
.haze.h2 { width: 30vw; height: 40vh; left: 36vw; top: 8vh; background: rgba(90, 120, 180, 0.16); animation: drift 18s ease-in-out infinite alternate-reverse; }
@keyframes drift { to { transform: translate(4vw, -3vh) scale(1.1); } }
.floor { position: absolute; left: -20%; right: 20%; bottom: -8%; height: 46%;
  background-image: linear-gradient(rgba(34, 230, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 230, 255, 0.07) 1px, transparent 1px);
  background-size: 48px 48px; transform: perspective(520px) rotateX(64deg); transform-origin: 50% 100%;
  mask-image: radial-gradient(60% 70% at 50% 60%, #000 20%, transparent 75%); -webkit-mask-image: radial-gradient(60% 70% at 50% 60%, #000 20%, transparent 75%); }
.vignette { position: absolute; inset: 0; background: radial-gradient(120% 90% at 35% 45%, transparent 55%, rgba(0, 0, 0, 0.7) 100%); }

/* ── Stage ────────────────────────────────────────────── */
.stage { position: absolute; left: 0; top: 0; bottom: 0; right: calc(var(--panel-w) + 32px); outline: none; touch-action: none; cursor: grab; }
.stage.dragging { cursor: grabbing; }
.stage:focus-visible .pedestal .plate-disc { box-shadow: 0 0 0 2px var(--cc-cyan), 0 18px 40px rgba(0, 0, 0, 0.8); }
.rim { position: absolute; width: 34%; height: 62%; top: 16%; border-radius: 50%; filter: blur(46px); opacity: 0.55; pointer-events: none; transition: transform 0.5s var(--cc-ease); will-change: transform; }
.rim.r1 { left: 18%; background: rgba(170, 205, 255, 0.24); transform: translateX(calc(var(--yaw) * -40px)); }
.rim.r2 { right: 14%; background: color-mix(in srgb, var(--accent) 45%, transparent); transform: translateX(calc(var(--yaw) * 40px)); animation: rimPulse 5s ease-in-out infinite; }
@keyframes rimPulse { 50% { opacity: 0.38; } }
.pedestal { position: absolute; left: 50%; bottom: 8.5%; width: min(56%, 440px); aspect-ratio: 4 / 1; transform: translateX(-50%); pointer-events: none; transition: opacity 0.4s var(--cc-ease), transform 0.5s var(--cc-ease); }
.pedestal .plate-disc { position: absolute; inset: 16% 6% 18%; border-radius: 50%;
  background: radial-gradient(60% 70% at 42% 35%, #3a4d61 0%, #1c2733 45%, #0a0f16 100%);
  box-shadow: inset 0 2px 0 rgba(180, 210, 235, 0.35), inset 0 -8px 16px rgba(0, 0, 0, 0.7), 0 0 0 var(--cc-ink-outline) var(--cc-ink), 0 18px 40px rgba(0, 0, 0, 0.8); }
.pedestal .plate-disc::after { content: ""; position: absolute; inset: 22% 14%; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 35%, transparent), inset 0 0 12px color-mix(in srgb, var(--accent) 25%, transparent); }
.pedestal .ring { position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
  -webkit-mask-image: radial-gradient(closest-side, transparent 84%, #000 88%, #000 96%, transparent 100%); mask-image: radial-gradient(closest-side, transparent 84%, #000 88%, #000 96%, transparent 100%); }
.pedestal .ring::before { content: ""; position: absolute; left: 50%; top: 50%; width: 140%; aspect-ratio: 1; transform: translate(-50%, -50%) scaleY(0.25);
  background: conic-gradient(from 0deg, transparent 0 18%, var(--accent) 24%, transparent 34% 62%, rgba(220, 240, 255, 0.9) 68%, transparent 78%);
  animation: spin 7s linear infinite; }
@keyframes spin { to { transform: translate(-50%, -50%) scaleY(0.25) rotate(360deg); } }
.figure-wrap { position: absolute; left: 50%; bottom: 11.5%; height: 78%; aspect-ratio: 148 / 182; transform: translateX(-50%); pointer-events: none; }
.figure { position: absolute; inset: 0; -webkit-box-reflect: below calc(var(--fig-h, 500px) * -0.043) linear-gradient(transparent 72%, rgba(255, 255, 255, 0.16)); }
:host([camera="bust"]) .figure { -webkit-box-reflect: none; }
.figure svg { width: 100%; height: 100%; overflow: visible; }
.sweep { position: absolute; inset: 0; mix-blend-mode: overlay; opacity: 0.9; pointer-events: none;
  background: linear-gradient(100deg, transparent 38%, rgba(255, 255, 255, 0.35) 48%, transparent 58%);
  background-size: 260% 100%; background-position: calc(50% + var(--yaw) * 60%) 0; transition: background-position 0.2s linear; }
:host([camera="bust"]) .pedestal { opacity: 0; transform: translateX(-50%) translateY(40px); }
/* Motion lives on wrapper layers, never inside the SVG: the figure carries
   glow filters (and Modern adds lighting filters), and any animated change
   inside it re-rasterised the whole figure plus its floor reflection —
   ~100 ms GPU raster tasks several times a second. */
.fig-breathe { position: absolute; inset: 0; will-change: transform; transform-origin: 50% 100%; animation: breathe 3.8s ease-in-out infinite; }
.figure .ag-fig { transform-box: fill-box; transform-origin: 50% 100%; }
@keyframes breathe { 50% { transform: scaleY(1.009); } }
.figure .ag-cape { transform-box: fill-box; transform-origin: 50% 0; }
@keyframes sway { 0%, 100% { transform: rotate(-0.7deg) skewX(-0.4deg); } 50% { transform: rotate(0.7deg) skewX(0.4deg); } }
.figure { will-change: transform; }
@keyframes pulse { 50% { opacity: 0.68; } }

/* ── Header ───────────────────────────────────────────── */
.hdr { position: absolute; left: 32px; top: 24px; right: calc(var(--panel-w) + 300px); pointer-events: none; }
/* Cream caption heading, as the mission select's h2. */
.kicker { display: inline-block; padding: 4px 14px 2px; font: 800 var(--cc-type-section)/1.2 var(--cc-font); letter-spacing: 4px; text-transform: uppercase;
  color: var(--cc-caption-cream-text); background: var(--cc-caption-cream); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: 4px 4px 0 var(--cc-ink); }
/* Chrome title with ink outline, offset ink shadow and accent rule (drawTitle / #titleScreen h1). */
.callsign { position: relative; isolation: isolate; display: block; width: max-content; max-width: 100%; margin: 14px 0 0; padding: 0 6px 2px 3px; font: 800 clamp(30px, 4.2vw, var(--cc-type-display))/1.02 var(--cc-font);
  letter-spacing: var(--cc-track-title); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: transparent; filter: drop-shadow(3px 3px 0 var(--cc-ink)) drop-shadow(0 0 16px color-mix(in srgb, var(--accent) 40%, transparent)); }
/* Ink outline drawn by a stroked copy behind the chrome fill (a stroke on the
   clipped text itself would eat into the letters). */
.callsign::before, .dialog h2::before, .callsign::after, .dialog h2::after { content: attr(data-text); position: absolute; inset: 0; padding: inherit; white-space: nowrap; }
.callsign::before, .dialog h2::before { color: var(--cc-ink); -webkit-text-stroke: 6px var(--cc-ink); }
.callsign::after, .dialog h2::after { color: transparent; background: var(--cc-title-fill); -webkit-background-clip: text; background-clip: text; }
/* Accent underline rule: 2px accent line on a 6px ink bar (drawTitle). */
.rule { display: block; width: 190px; height: 6px; margin: 8px 0 10px 4px; background: linear-gradient(var(--accent), var(--accent)) 2px 50% / calc(100% - 4px) 2px no-repeat, var(--cc-ink); }
.sub { font: 700 var(--cc-type-body)/1.3 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; color: var(--cc-text-dim); text-shadow: 0 1px 0 var(--cc-ink); }
.sub b { color: var(--accent); font-weight: 800; }
.ready { margin-top: 12px; }
.ready[hidden] { display: none; }

.toolbar { position: absolute; top: 24px; right: calc(var(--panel-w) + 44px); display: flex; gap: 10px; }
/* Mission-select back button: steel, ink border, hard ink shadow. */
.tool { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 10px 0 9px;
  font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; color: var(--cc-text-dim);
  background: var(--cc-steel); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.25), 2px 2px 0 var(--cc-ink);
  transition: color var(--cc-dur-fast), background var(--cc-dur-fast), transform var(--cc-dur-fast); }
.tool svg { width: 17px; height: 17px; }
.tool:hover, .tool:focus-visible, :host(.kbd) .tool:focus { color: #fff; background: var(--cc-steel-hi); outline: 2px solid var(--cc-cyan); outline-offset: 2px; }
.tool:active { transform: translate(1px, 1px); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.25), 1px 1px 0 var(--cc-ink); }
.tool:disabled { opacity: 0.4; cursor: default; filter: grayscale(1); outline: none; }

.stage-tools { position: absolute; bottom: 22px; left: calc((100% - var(--panel-w) - 32px) / 2); transform: translateX(-50%); display: flex; gap: 10px; align-items: center; white-space: nowrap; }
.seg { display: inline-flex; padding: 3px; gap: 3px; background: var(--cc-panel-well); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.55), 2px 2px 0 var(--cc-ink); }
.seg button { height: 30px; padding: 0 11px; font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 1.5px; text-transform: uppercase; color: var(--cc-text-dim);
  transition: color var(--cc-dur-fast), background var(--cc-dur-fast); }
.seg button[aria-pressed="true"] { color: var(--cc-caption-cyan-text); background: var(--cc-caption-cyan); box-shadow: 0 0 0 1px var(--cc-ink), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
.seg button:hover:not([aria-pressed="true"]) { color: var(--cc-text); }
.hint-turn { display: inline-flex; align-items: center; gap: 6px; font: 700 var(--cc-type-micro)/1 var(--cc-font); letter-spacing: 2px; color: var(--cc-text-faint); text-transform: uppercase; }
.hint-turn svg { width: 18px; height: 18px; }

/* Tighter gap and a lower anchor so the "Presets" label clears the origin
   subtitle under the callsign (it sat on top of it at 1280x720). */
.presets { position: absolute; left: 30px; top: calc(50% + 18px); transform: translateY(-40%); display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.presets .lbl { margin-bottom: 2px; }
.preset { display: flex; align-items: center; gap: 10px; padding: 0; transition: transform var(--cc-dur-fast) var(--cc-ease); }
.preset .pthumb { position: relative; width: 52px; height: 52px; overflow: hidden; background: radial-gradient(circle at 45% 38%, #1d2e44, #060a12); border: var(--cc-ink-outline) solid var(--cc-ink);
  clip-path: polygon(var(--cc-chamfer-sm) 0, 100% 0, 100% calc(100% - var(--cc-chamfer-sm)), calc(100% - var(--cc-chamfer-sm)) 100%, 0 100%, 0 var(--cc-chamfer-sm));
  box-shadow: var(--plate-bevel), inset 0 0 0 1px rgba(111, 138, 163, 0.25); transition: box-shadow var(--cc-dur-fast); }
.preset .pthumb svg { width: 100%; height: 100%; }
.preset > span:last-child { font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 1.5px; text-transform: uppercase; color: var(--cc-text-dim); transition: color var(--cc-dur-fast); }
.preset:hover, .preset:focus-visible, :host(.kbd) .preset:focus { transform: translateX(4px); outline: none; }
.preset:hover .pthumb, .preset:focus-visible .pthumb, :host(.kbd) .preset:focus .pthumb { box-shadow: inset 0 0 0 2px var(--cc-cyan), inset 0 0 16px rgba(34, 230, 255, 0.3); }
.preset:hover > span:last-child, .preset:focus-visible > span:last-child { color: #fff; }

/* ── Panel ────────────────────────────────────────────── */
.panel { position: absolute; top: 16px; right: 16px; bottom: 16px; width: var(--panel-w); filter: drop-shadow(0 24px 40px rgba(0, 0, 0, 0.6)) drop-shadow(4px 4px 0 rgba(4, 6, 11, 0.9));
  transition: transform var(--cc-dur-slow) var(--cc-ease); }
.panel > .frame { position: absolute; inset: 0; }
.handle { display: none; }
.tabs { position: relative; display: grid; grid-template-columns: auto repeat(5, 1fr) auto; align-items: center; gap: 4px; padding: 14px 14px 10px 22px; }
.tabkey { margin: 0 2px; }
.tab { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px 2px 10px; color: var(--cc-text-dim); background: transparent;
  font: 700 var(--cc-type-label)/1 var(--cc-font); letter-spacing: 1.5px; text-transform: uppercase; outline: none;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  transition: color var(--cc-dur-fast), background var(--cc-dur-fast), box-shadow var(--cc-dur-fast); }
.tab svg { width: 22px; height: 22px; }
.tab:hover { color: var(--cc-text); background: rgba(130, 160, 188, 0.08); }
/* Focused button (drawButton "focus"): raised steel, accent bar, centred accent underline. */
.tab[aria-selected="true"] { color: #fff; background: var(--cc-panel-raised); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.34), inset 0 0 0 1px var(--cc-ink); }
.tab[aria-selected="true"]::after { content: ""; position: absolute; left: 30%; right: 30%; bottom: 3px; height: 2px; background: var(--cc-cyan); box-shadow: 0 0 8px var(--cc-cyan); }
.tab[aria-selected="true"] svg { color: var(--cc-cyan); filter: drop-shadow(0 0 6px rgba(34, 230, 255, 0.55)); }
.tab:focus-visible, :host(.kbd) .tab:focus { box-shadow: inset 0 0 0 2px var(--cc-cyan); }
.tabs::after { content: ""; position: absolute; left: 22px; right: 14px; bottom: 0; height: 1px; background: var(--cc-hairline); }

.content { position: relative; flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 16px 18px 22px; scrollbar-width: thin; scrollbar-color: #2e3f51 transparent; overscroll-behavior: contain; }
.content::-webkit-scrollbar { width: 8px; }
.content::-webkit-scrollbar-thumb { background: #2e3f51; border: 1px solid var(--cc-ink); }
.content.swap { animation: swapIn var(--cc-dur-base) var(--cc-ease); }
@keyframes swapIn { from { opacity: 0; transform: translateX(var(--swap-dir, 12px)); } }
.section { margin-top: 18px; }
.grid { display: grid; gap: 8px; }
.grid.torso, .grid.head, .grid.hair { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
.grid.badge { grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); }
.grid.eye, .grid.skin { grid-template-columns: repeat(6, 1fr); }
.grid.palette { grid-template-columns: repeat(2, 1fr); }
.grid.rifle { grid-template-columns: repeat(3, 1fr); }
.grid.origin, .grid.voice, .grid.class { grid-template-columns: 1fr; }

/* Option tiles are mission plates; square tiles use the small chamfer and no side bar. */
.opt { display: flex; flex-direction: column; gap: 6px; text-align: left; padding: 4px; --cc-chamfer: 9px; box-shadow: var(--plate-bevel); }
.opt.card { padding: 10px 12px 11px 14px; gap: 5px; --cc-chamfer: 12px; box-shadow: var(--plate-bevel), inset 3px 0 0 rgba(34, 230, 255, 0.35); }
.opt:hover, .opt:focus-visible, :host(.kbd) .opt:focus { box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.42), inset 0 0 0 2px rgba(34, 230, 255, 0.6), inset 0 0 22px rgba(34, 230, 255, 0.14); }
.opt.card:hover, .opt.card:focus-visible, :host(.kbd) .opt.card:focus { box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.42), inset 5px 0 0 var(--cc-cyan), inset 0 0 0 2px rgba(34, 230, 255, 0.6), inset 0 0 26px rgba(34, 230, 255, 0.14); }
.opt:focus-visible, :host(.kbd) .opt:focus { box-shadow: inset 0 0 0 2px #fff, inset 0 0 0 4px var(--cc-cyan), inset 0 0 22px rgba(34, 230, 255, 0.25) !important; }
.opt[aria-checked="true"] { background: linear-gradient(180deg, rgba(34, 230, 255, 0.16), rgba(34, 230, 255, 0) 70%), var(--cc-steel-hi); color: #fff;
  box-shadow: inset 0 1px 0 rgba(185, 240, 255, 0.45), inset 0 0 0 2px var(--cc-cyan), inset 0 0 20px rgba(34, 230, 255, 0.16); }
.opt.card[aria-checked="true"] { box-shadow: inset 0 1px 0 rgba(185, 240, 255, 0.45), inset 5px 0 0 var(--cc-cyan), inset 0 0 0 2px var(--cc-cyan), inset 0 0 26px rgba(34, 230, 255, 0.16); }
/* Brackets on the square corners of the chosen plate (mode-btn::before). */
.opt::before { content: ""; position: absolute; inset: 3px; pointer-events: none; opacity: 0.45; z-index: 2; transition: opacity var(--cc-dur-fast);
  background:
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right top / 10px 2px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right top / 2px 10px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left bottom / 10px 2px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left bottom / 2px 10px no-repeat; }
.opt[aria-checked="true"]::before, .opt:hover::before { opacity: 1; }
.opt .tick { position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; padding: 2px; color: var(--cc-caption-cyan-text); background: var(--cc-caption-cyan);
  clip-path: polygon(0 0, 100% 0, 100% 60%, 60% 100%, 0 100%); opacity: 0; transform: scale(0.6); transition: opacity var(--cc-dur-fast), transform var(--cc-dur-fast) var(--cc-ease); z-index: 3; }
.opt .tick svg { stroke-width: 3.2; }
.opt[aria-checked="true"] .tick { opacity: 1; transform: none; }
.thumb { position: relative; aspect-ratio: 1; background: radial-gradient(circle at 45% 38%, #1a2a3e, #050910 78%); box-shadow: inset 0 0 0 1px var(--cc-ink), inset 0 2px 0 rgba(0, 0, 0, 0.55); overflow: hidden; }
.thumb svg { width: 100%; height: 100%; }
.oname { font: 700 var(--cc-type-label)/1.1 var(--cc-font); letter-spacing: 0.6px; text-transform: uppercase; color: inherit; padding: 0 2px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.grid.torso .oname, .grid.head .oname, .grid.hair .oname, .grid.badge .oname, .grid.rifle .oname { min-height: 2.2em; letter-spacing: 0.2px; }
.card .oname { font-size: var(--cc-type-row); letter-spacing: var(--cc-track-row); }
.tier { display: flex; gap: 2px; padding: 0 2px 2px; align-items: center; font: 700 var(--cc-type-micro)/1 var(--cc-font); color: var(--cc-text-dim); letter-spacing: 1px; white-space: nowrap; }
.tier i { width: 8px; height: 3px; background: rgba(111, 138, 163, 0.3); box-shadow: 0 0 0 0.5px var(--cc-ink); }
.tier i.on { background: var(--cc-amber); }
.swatch { aspect-ratio: 1; border-radius: 50%; box-shadow: 0 0 0 var(--cc-ink-outline) var(--cc-ink), inset 0 -4px 6px rgba(0, 0, 0, 0.35), inset 0 3px 4px rgba(255, 255, 255, 0.25); }
.grid.eye .opt, .grid.skin .opt { padding: 7px 4px; align-items: center; --cc-chamfer: 7px; }
.grid.eye .swatch, .grid.skin .swatch { width: min(34px, 100%); flex: none; }
.grid.eye .swatch { background: radial-gradient(circle, #fff 0 12%, var(--c) 26%, color-mix(in srgb, var(--c) 30%, #000) 70%); box-shadow: 0 0 0 var(--cc-ink-outline) var(--cc-ink), 0 0 12px color-mix(in srgb, var(--c) 60%, transparent); }
.grid.eye .oname, .grid.skin .oname { display: none; }
.pal { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; height: 42px; gap: 2px; background: var(--cc-ink); padding: 1.5px; }
.pal i:first-child { grid-row: span 2; }
.badge-tile { aspect-ratio: 1; display: grid; place-items: center; background: radial-gradient(circle at 45% 38%, #1a2a3e, #050910 78%); box-shadow: inset 0 0 0 1px var(--cc-ink), inset 0 2px 0 rgba(0, 0, 0, 0.55); }
.badge-tile svg { width: 64%; height: 64%; }
.grid.rifle .thumb { aspect-ratio: 2.4; }
.card .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card .desc { font: 500 var(--cc-type-body)/1.35 var(--cc-font); color: var(--cc-text-dim); letter-spacing: 0.3px; }
.perk { align-self: flex-start; margin-top: 4px; font-size: var(--cc-type-micro); padding: 2px 7px 1px; }
.play { flex: none; width: 38px; height: 38px; display: grid; place-items: center; color: var(--cc-text); background: var(--cc-keycap); border: 1px solid var(--cc-ink); border-radius: var(--cc-keycap-radius);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35), 2px 2px 0 var(--cc-ink); transition: background var(--cc-dur-fast), color var(--cc-dur-fast), transform var(--cc-dur-fast); }
.play svg { width: 15px; height: 15px; margin-left: 2px; }
.play:hover, .play:focus-visible, :host(.kbd) .play:focus { outline: none; color: var(--cc-caption-cyan-text); background: var(--cc-caption-cyan); }
.play:active, .play.ping { transform: translate(1px, 1px); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35), 1px 1px 0 var(--cc-ink); }
/* Stat bars (drawBar): inked groove, glass gloss, ink segment gaps, bright leading edge. */
.stats { display: grid; grid-template-columns: 74px 1fr 44px; gap: 6px 10px; align-items: center; margin-top: 6px; }
.stats span { font: 700 var(--cc-type-micro)/1 var(--cc-font); letter-spacing: 1.5px; color: var(--cc-text-dim); text-transform: uppercase; }
.stats b { font: 700 var(--cc-type-label)/1 var(--cc-font-mono); text-align: right; color: var(--cc-text); }
.stats b.up { color: var(--cc-green); } .stats b.down { color: var(--cc-crimson); }
.bar { position: relative; height: 7px; background: linear-gradient(180deg, rgba(2, 4, 8, 0.95), rgba(24, 33, 44, 0.95)); box-shadow: 0 0 0 1.5px var(--cc-ink), inset 0 1px 0 rgba(0, 0, 0, 0.6); }
.bar i { position: absolute; left: 0; top: 0; bottom: 0; width: var(--w); background: var(--cc-cyan); box-shadow: inset -1.5px 0 0 rgba(255, 255, 255, 0.85); transition: width 0.3s var(--cc-ease); }
.bar::after { content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08) 38%, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.28)),
    repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), var(--cc-ink) calc(10% - 1px) 10%); }
.locked .thumb svg, .locked .stats { filter: saturate(0.2) brightness(0.7); }
.lock { font-size: var(--cc-type-micro); padding: 2px 6px 1px; gap: 4px; letter-spacing: 0.5px; box-shadow: 2px 2px 0 var(--cc-ink); }
.lock svg { width: 12px; height: 12px; flex: none; }
.opt.locked { cursor: not-allowed; }
.lockbadge { position: absolute; top: 3px; right: 3px; z-index: 3; display: grid; place-items: center; width: 17px; height: 17px; color: var(--cc-caption-amber-text);
  background: var(--cc-caption-amber); border: 1px solid var(--cc-ink); box-shadow: 1px 1px 0 var(--cc-ink); }
.lockbadge svg { width: 11px; height: 11px; fill: none; stroke: currentColor; stroke-width: 2.4; }
/* Unlock requirements under a section: lock, requirement, progress. */
.lockinfo { display: grid; gap: 6px; margin-top: 8px; }
.lockrow { display: grid; grid-template-columns: auto 1fr; gap: 3px 8px; align-items: center; font: 600 var(--cc-type-label)/1.25 var(--cc-font); color: var(--cc-text-dim); }
.lockrow .lock { grid-row: span 2; align-self: start; }
.lockrow .bar { height: 5px; }
.lockrow .bar i { background: var(--cc-amber); }
.card .lockprog { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; margin-top: 4px; font: 700 var(--cc-type-micro)/1 var(--cc-font); letter-spacing: 1px; color: var(--cc-amber); text-transform: uppercase; }
.card .lockprog .bar i { background: var(--cc-amber); }
.preset.locked .pthumb svg { filter: saturate(0.2) brightness(0.6); }
.preset .lockbadge { top: auto; bottom: 2px; right: 2px; }
.opt.shake { animation: shake 0.36s; }
@keyframes shake { 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
.rifle-hero { margin: 0 0 10px; height: 92px; perspective: 700px; display: grid; place-items: center;
  background: radial-gradient(60% 80% at 50% 50%, color-mix(in srgb, var(--accent) 16%, #0c1522), #04070c 80%); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.55); }
.rifle-hero .spin { width: 82%; animation: turntable 7s ease-in-out infinite; transform-style: preserve-3d; }
@keyframes turntable { 0%, 100% { transform: rotateY(-28deg) rotateX(8deg); } 50% { transform: rotateY(28deg) rotateX(8deg); } }

.field { position: relative; display: block; }
.field input { width: 100%; height: 50px; padding: 0 64px 0 16px; font: 800 var(--cc-type-heading)/1 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; color: #fff;
  background: var(--cc-panel-well); border: var(--cc-ink-outline) solid var(--cc-ink); outline: none; user-select: text; -webkit-user-select: text;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cc-chamfer)), calc(100% - var(--cc-chamfer)) 100%, 0 100%);
  box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.55), inset 0 -1px 0 rgba(111, 138, 163, 0.18); transition: box-shadow var(--cc-dur-fast); }
.field input:focus { box-shadow: inset 0 0 0 2px var(--cc-cyan), inset 0 0 20px rgba(34, 230, 255, 0.12); }
.field input[aria-invalid="true"] { box-shadow: inset 0 0 0 2px var(--cc-crimson); }
.field .count { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font: 700 var(--cc-type-label)/1 var(--cc-font-mono); color: var(--cc-text-faint); }
.err { min-height: 16px; margin: 7px 0 0; font: 600 var(--cc-type-label)/1.3 var(--cc-font); letter-spacing: 0.5px; color: var(--cc-crimson); }
.err.ok { color: var(--cc-text-faint); }

.actions { display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 12px 22px 18px; position: relative; }
.actions::before { content: ""; position: absolute; left: 22px; right: 14px; top: 0; height: 1px; background: var(--cc-hairline); }
.keys { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px 12px; font: 700 var(--cc-type-micro)/1 var(--cc-font); color: var(--cc-text-dim); letter-spacing: 1.5px; text-transform: uppercase; }
.keys span { display: inline-flex; gap: 6px; align-items: center; }
.btn { position: relative; height: 50px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  font: 800 var(--cc-type-row)/1 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; outline: none; }
.btn.plate:hover, .btn.plate:focus-visible, :host(.kbd) .btn.plate:focus { transform: translateX(3px); }
/* Primary action: crimson caption scheme on a chamfered plate. */
.btn.primary { color: var(--cc-primary-text); text-shadow: 1px 1px 0 rgba(60, 0, 10, 0.6); overflow: hidden; background: var(--cc-primary); border: var(--cc-ink-outline) solid var(--cc-ink);
  clip-path: polygon(var(--cc-chamfer) 0, 100% 0, 100% calc(100% - var(--cc-chamfer)), calc(100% - var(--cc-chamfer)) 100%, 0 100%, 0 var(--cc-chamfer));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -3px 0 rgba(80, 0, 16, 0.45);
  transition: filter var(--cc-dur-fast), transform var(--cc-dur-fast), box-shadow var(--cc-dur-fast); }
.btn.primary::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.35), transparent); transform: skewX(-18deg); transition: left 0.5s var(--cc-ease); }
.btn.primary:hover::after, .btn.primary:focus-visible::after, :host(.kbd) .btn.primary:focus::after { left: 120%; }
.btn.primary:hover, .btn.primary:focus-visible, :host(.kbd) .btn.primary:focus, .btn.primary.ready:focus { filter: brightness(1.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 0 0 2px #fff, inset 0 -3px 0 rgba(80, 0, 16, 0.45); }
.btn.primary.ready { animation: readyPulse 1.8s ease-in-out infinite; }
@keyframes readyPulse { 50% { filter: brightness(1.18); } }
.btn.primary[aria-disabled="true"] { filter: saturate(0.3) brightness(0.7); cursor: not-allowed; animation: none; }
.btn.primary .key { color: var(--cc-text); }
.save .k-focus { display: none; }
.save:focus .k-focus { display: inline-flex; }
.save:focus .k-any { display: none; }
.btn:active { transform: translateY(1px); }

.toast { position: absolute; left: calc((100% - var(--panel-w) - 32px) / 2); bottom: 80px; transform: translate(-50%, 12px); white-space: nowrap; opacity: 0; pointer-events: none;
  font-size: var(--cc-type-section); padding: 5px 12px 3px; transition: opacity var(--cc-dur-base), transform var(--cc-dur-base) var(--cc-ease); }
.toast.on { opacity: 1; transform: translate(-50%, 0); }

.confirm { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(2, 4, 8, 0.72); backdrop-filter: blur(3px); animation: fadeIn var(--cc-dur-base) var(--cc-ease); z-index: 10; }
.confirm[hidden] { display: none; }
@keyframes fadeIn { from { opacity: 0; } }
.dialog { position: relative; width: min(400px, 90vw); height: 214px; filter: drop-shadow(4px 4px 0 rgba(4, 6, 11, 0.9)); animation: pop var(--cc-dur-base) var(--cc-ease); }
.dialog > .frame { position: absolute; inset: 0; }
.dialog .body { padding: 26px 24px 20px; align-items: center; text-align: center; }
@keyframes pop { from { transform: scale(0.96); opacity: 0; } }
.dialog h2 { position: relative; isolation: isolate; padding: 0 4px; margin: 0; font: 800 34px/1 var(--cc-font); letter-spacing: var(--cc-track-title); text-transform: uppercase;
  color: transparent; filter: drop-shadow(2px 2px 0 var(--cc-ink)) drop-shadow(0 0 12px rgba(255, 42, 74, 0.35)); }
.dialog .rule { margin: 8px auto 12px; width: 46%; background: linear-gradient(var(--cc-crimson), var(--cc-crimson)) 2px 50% / calc(100% - 4px) 2px no-repeat, var(--cc-ink); }
.dialog p { margin: 0 0 16px; font: 500 var(--cc-type-body)/1.4 var(--cc-font); color: var(--cc-text-dim); }
.dialog .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
.dialog .btn { height: 44px; }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
button:focus-visible { outline: none; }
.seg button:focus-visible, :host(.kbd) .seg button:focus { outline: 2px solid var(--cc-cyan); outline-offset: 1px; }

/* ── Phones (landscape) — panel becomes a collapsible sheet ── */
@media (max-height: 500px) {
  :host { --panel-w: 56vw; }
  .panel { top: 6px; right: 6px; bottom: 6px; }
  .panel > .frame { --chamfer: 12px; }
  .handle { display: flex; position: absolute; left: 50%; top: 1px; transform: translateX(-50%); width: 64px; height: 16px; align-items: center; justify-content: center; color: var(--cc-text-dim); z-index: 4; }
  .handle svg { width: 16px; height: 16px; transition: transform var(--cc-dur-slow) var(--cc-ease); }
  :host([sheet="collapsed"]) .panel { transform: translateY(calc(100% - 66px)); }
  :host([sheet="collapsed"]) .handle svg { transform: rotate(180deg); }
  :host([sheet="collapsed"]) .stage { right: 0; }
  :host([sheet="collapsed"]) .hdr { right: 180px; }
  .stage { right: calc(var(--panel-w) + 8px); }
  .tabs { padding: 14px 8px 6px 12px; grid-template-columns: repeat(5, 1fr); }
  .tabkey, .keys, .btn .key, .hint-turn, .presets .lbl, .preset > span:last-child { display: none; }
  .tab { padding: 4px 0 7px; font-size: var(--cc-type-micro); letter-spacing: 0.5px; gap: 3px; }
  .tab svg { width: 20px; height: 20px; }
  .tabs::after { left: 12px; right: 8px; }
  .content { padding: 0 10px 12px 12px; }
  .section { margin-top: 12px; }
  .actions { padding: 8px 12px 10px; grid-template-columns: 1fr 1.6fr; }
  .actions::before { left: 12px; right: 8px; }
  .btn { height: 44px; font-size: var(--cc-type-body); letter-spacing: 1.5px; }
  .hdr { left: 14px; top: 10px; right: calc(var(--panel-w) + 20px); }
  .kicker { display: none; }
  .callsign { margin: 0; font-size: 22px; filter: drop-shadow(2px 2px 0 var(--cc-ink)); }
  .callsign::before { -webkit-text-stroke-width: 4px; }
  .rule { height: 4px; margin: 4px 0 5px 2px; width: 110px; background: linear-gradient(var(--accent), var(--accent)) 1.5px 50% / calc(100% - 3px) 1.5px no-repeat, var(--cc-ink); }
  .sub { font-size: var(--cc-type-micro); letter-spacing: 1px; }
  .ready { margin-top: 6px; font-size: var(--cc-type-micro); }
  .toolbar { top: auto; bottom: 62px; right: auto; left: 10px; flex-direction: column; gap: 8px; }
  .tool { height: 40px; width: 44px; padding: 0; justify-content: center; }
  .tool .t, .tool .key { display: none; }
  .presets { left: auto; right: calc(var(--panel-w) + 16px); top: 60px; transform: none; gap: 6px; }
  :host([sheet="collapsed"]) .presets { right: 10px; }
  .preset .pthumb { width: 40px; height: 40px; }
  /* The vertical toolbar ends well above this row, so the old 64px inset only
     cost width — on a 640px-wide phone it pushed "Helmet off" off the stage. */
  .stage-tools { bottom: 8px; left: 8px; right: calc(var(--panel-w) + 12px); transform: none; gap: 6px; flex-wrap: wrap;
    pointer-events: none; }
  .stage-tools .seg { pointer-events: auto; }
  .seg button { height: 38px; padding: 0 8px; font-size: var(--cc-type-micro); letter-spacing: 0.5px; }
  .figure-wrap { bottom: 16%; height: 66%; }
  .pedestal { bottom: 12%; width: 70%; }
  .toast { bottom: 58px; }
  .grid.torso, .grid.head, .grid.hair { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); }
  .opt { min-height: 44px; }
}
@media (max-width: 600px) and (min-height: 501px) {
  :host { --panel-w: 100vw; }
  .panel { top: 44vh; left: 0; right: 0; bottom: 0; width: auto; }
  .stage { right: 0; bottom: 56vh; }
  .hdr { right: 16px; }
  .toolbar { top: auto; bottom: calc(56vh + 8px); right: 12px; }
  .presets, .hint-turn { display: none; }
  .stage-tools { bottom: calc(56vh + 8px); left: 12px; transform: none; }
  .toast { left: 50%; bottom: calc(56vh + 60px); }
}
@media (hover: none) { .opt:hover, .tool:hover, .preset:hover, .plate:hover { transform: none; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 0.01ms !important; }
}
`;

// Modern (realistic) chrome, adopted into the shadow root the first time that
// style opens (so the Comic markup and stylesheet stay byte-identical). Every
// rule is scoped to :host([realistic]): thin 1px lines instead of ink, dark
// translucent plates, off-white text, one desaturated accent, amber only for
// locks and red only for the destructive/primary warning, and a stage lit like
// a studio photo (key, fill, rim, polished floor) instead of glow rings.
const REALISTIC_STYLE = `
:host([realistic]) {
  --r-text: #e4e6e1; --r-dim: #98a3a4; --r-faint: #687375; --r-accent: #8fbcc4;
  --r-line: rgba(228, 230, 225, 0.14); --r-line-hi: rgba(228, 230, 225, 0.32);
  --r-plate: rgba(16, 18, 21, 0.62); --r-plate-hi: rgba(40, 44, 48, 0.72);
  --cc-ink: transparent; --cc-cyan: #8fbcc4; --cc-amber: #dca24c; --cc-crimson: #e0493f; --cc-green: #d3dbd5;
  --cc-text: #e4e6e1; --cc-text-dim: #98a3a4; --cc-text-faint: #687375; --cc-hairline: rgba(228, 230, 225, 0.12);
  --cc-steel: rgba(255, 255, 255, 0.035); --cc-steel-hi: rgba(255, 255, 255, 0.075);
  --cc-panel-menu: linear-gradient(180deg, rgba(22, 25, 28, 0.9), rgba(11, 13, 15, 0.92));
  --cc-panel-well: rgba(0, 0, 0, 0.34); --cc-panel-raised: rgba(255, 255, 255, 0.06);
  --cc-keycap: rgba(255, 255, 255, 0.05);
  --plate-bevel: none;
}
:host([realistic]) .root { --accent: var(--r-accent);
  background:
    radial-gradient(ellipse 46% 60% at 30% 22%, rgba(255, 236, 214, 0.07), transparent 70%),
    linear-gradient(180deg, #16181b 0%, #0f1113 58%, #0a0b0c 72%, #070808 100%); }

/* Stage: a locker-room wall under a warm key from the upper left, a cool fill
   from the right, a rim behind the figure and a polished concrete floor. */
:host([realistic]) .backdrop::before {
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.028) 0 1px, rgba(0, 0, 0, 0.18) 1px 3px, transparent 3px 92px),
    repeating-linear-gradient(180deg, transparent 0 34px, rgba(255, 255, 255, 0.018) 34px 35px, transparent 35px 46px);
  -webkit-mask-image: linear-gradient(180deg, transparent 4%, #000 30%, #000 64%, transparent 73%); mask-image: linear-gradient(180deg, transparent 4%, #000 30%, #000 64%, transparent 73%); }
:host([realistic]) .shaft { left: 14%; width: 34%; background: linear-gradient(180deg, rgba(255, 238, 218, 0.1), rgba(255, 238, 218, 0) 85%); filter: blur(22px); }
:host([realistic]) .haze.h1 { background: rgba(160, 150, 138, 0.1); }
:host([realistic]) .haze.h2 { background: rgba(120, 140, 160, 0.08); }
:host([realistic]) .floor { background-image: radial-gradient(50% 40% at 50% 38%, rgba(255, 240, 222, 0.08), transparent 70%), linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.3)); background-size: auto; }
:host([realistic]) .halftone, :host([realistic]) .letterbox { display: none; }
:host([realistic]) .vignette { background: radial-gradient(115% 90% at 36% 42%, transparent 48%, rgba(0, 0, 0, 0.78) 100%); }
:host([realistic]) .rim { filter: blur(56px); }
:host([realistic]) .rim.r1 { background: rgba(255, 230, 204, 0.12); }
:host([realistic]) .rim.r2 { background: rgba(170, 196, 214, 0.16); animation: none; }
:host([realistic]) .pedestal .plate-disc {
  background: radial-gradient(60% 70% at 42% 32%, #3b3e41 0%, #232527 48%, #0d0e0f 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 -8px 16px rgba(0, 0, 0, 0.65), 0 18px 36px rgba(0, 0, 0, 0.7); }
:host([realistic]) .pedestal .plate-disc::after { border-color: rgba(255, 255, 255, 0.07); box-shadow: none; }
:host([realistic]) .pedestal .ring { opacity: 0.18; }
:host([realistic]) .pedestal .ring::before { background: conic-gradient(from 0deg, transparent 0 60%, rgba(255, 244, 230, 0.7) 68%, transparent 78%); }
:host([realistic]) .stage:focus-visible .pedestal .plate-disc { box-shadow: 0 0 0 1px var(--r-accent), 0 18px 36px rgba(0, 0, 0, 0.7); }
:host([realistic]) .figure { -webkit-box-reflect: below calc(var(--fig-h, 500px) * -0.043) linear-gradient(transparent 80%, rgba(255, 255, 255, 0.07)); }
:host([realistic][camera="bust"]) .figure { -webkit-box-reflect: none; }
/* Performance: the Modern figure is filter-heavy SVG. Keep every per-frame
   change off it — no box-reflect (it re-renders the whole figure), no CSS
   animations inside the SVG, and the turn and breathing done as compositor
   transforms on wrapper layers. The visor and glow pulse move to opacity on
   the wrapper-free overlay the SVG already paints, so they are dropped here. */
:host([realistic]) .figure {
  -webkit-box-reflect: none;
  will-change: transform;
  transform: translateX(calc(var(--yaw, 0) * 1.1%)) scaleX(var(--yaw-sx, 1));
  transform-origin: 50% 100%;
}
:host([realistic]) .fig-breathe {
  position: absolute; inset: 0;
  will-change: transform;
  transform-origin: 50% 100%;
  animation: breathe 3.8s ease-in-out infinite;
}
:host([realistic]) .figure .ag-fig,
:host([realistic]) .figure .ag-cape,
:host([realistic]) .figure .ag-visor,
:host([realistic]) .figure .ag-glow { animation: none; }
:host([realistic]) .haze,
:host([realistic]) .rim,
:host([realistic]) .shaft { will-change: transform; }
:host([realistic]) .sweep { opacity: 0.3; }

/* Type and captions: off-white on nothing, tracked small labels, no ink. */
:host([realistic]) .kicker { padding: 0; background: none; border: 0; box-shadow: none; color: var(--r-dim); font-weight: 600; letter-spacing: 0.32em; }
:host([realistic]) .callsign, :host([realistic]) .dialog h2 { color: var(--r-text); filter: none; font-weight: 600; letter-spacing: 0.05em; }
:host([realistic]) .callsign::before, :host([realistic]) .callsign::after, :host([realistic]) .dialog h2::before, :host([realistic]) .dialog h2::after { display: none; }
:host([realistic]) .rule { height: 1px; width: 120px; margin: 10px 0 12px 4px; background: var(--r-accent); opacity: 0.7; }
:host([realistic]) .dialog .rule { margin: 10px auto 14px; background: var(--cc-crimson); }
:host([realistic]) .sub { color: var(--r-dim); text-shadow: none; font-weight: 600; letter-spacing: 0.18em; }
:host([realistic]) .sub b { color: var(--r-text); font-weight: 700; }
:host([realistic]) .caption { background: rgba(10, 12, 14, 0.55); border: 1px solid; box-shadow: none; font-weight: 600; letter-spacing: 0.14em; }
:host([realistic]) .caption.cream, :host([realistic]) .caption.steel { color: var(--r-text); border-color: var(--r-line-hi); }
:host([realistic]) .caption.cyan { color: var(--r-accent); border-color: rgba(143, 188, 196, 0.45); }
:host([realistic]) .caption.amber { color: var(--cc-amber); border-color: rgba(220, 162, 76, 0.5); }
:host([realistic]) .caption.crimson { color: var(--cc-crimson); border-color: rgba(224, 73, 63, 0.5); }
:host([realistic]) .key { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--r-line-hi); border-radius: 3px; box-shadow: none; color: var(--r-text); font-weight: 600; }
:host([realistic]) .hint-turn, :host([realistic]) .keys { color: var(--r-faint); }

/* Plates: translucent dark, 1px hairline, square corners. */
:host([realistic]) .brackets, :host([realistic]) .opt::before, :host([realistic]) .btn.primary::after { display: none; }
:host([realistic]) .panel, :host([realistic]) .dialog { filter: drop-shadow(0 24px 44px rgba(0, 0, 0, 0.55)); }
:host([realistic]) .frame { background: none; clip-path: none; }
:host([realistic]) .frame > .body { inset: 0; clip-path: none; box-shadow: inset 0 0 0 1px var(--r-line), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
:host([realistic]) .frame > .body::after { display: none; }
:host([realistic]) .section h3 { font-weight: 600; letter-spacing: 0.2em; color: var(--r-dim); padding-left: 10px; }
:host([realistic]) .section h3::before { width: 2px; background: var(--r-accent); box-shadow: none; }
:host([realistic]) .section h3::after { background: var(--r-line); }
:host([realistic]) .section h3 .cur { color: var(--r-faint); }
:host([realistic]) .section h3 .cur.preview { color: var(--r-accent); }
:host([realistic]) .plate { background: rgba(255, 255, 255, 0.035); border: 1px solid var(--r-line); clip-path: none; border-radius: 2px; box-shadow: none; }
:host([realistic]) .plate:hover, :host([realistic]) .plate:focus-visible, :host([realistic].kbd) .plate:focus { background: rgba(255, 255, 255, 0.07); border-color: var(--r-line-hi); box-shadow: none; color: #fff; }
:host([realistic]) .opt, :host([realistic]) .opt.card, :host([realistic]) .opt:hover, :host([realistic]) .opt.card:hover { box-shadow: none; }
:host([realistic]) .opt:focus-visible, :host([realistic].kbd) .opt:focus { box-shadow: none !important; outline: 1px solid var(--r-accent); outline-offset: 2px; }
:host([realistic]) .opt[aria-checked="true"] { background: rgba(143, 188, 196, 0.1); border-color: rgba(143, 188, 196, 0.7); box-shadow: none; }
:host([realistic]) .opt.card[aria-checked="true"] { box-shadow: inset 2px 0 0 var(--r-accent); }
:host([realistic]) .opt .tick { color: #0c0e10; background: var(--r-accent); clip-path: none; border-radius: 1px; width: 13px; height: 13px; }
:host([realistic]) .thumb, :host([realistic]) .badge-tile { background: radial-gradient(circle at 42% 34%, #2a2d31, #0c0d0f 78%); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05); }
:host([realistic]) .tier i { background: rgba(228, 230, 225, 0.14); box-shadow: none; }
:host([realistic]) .tier i.on { background: var(--r-text); }
:host([realistic]) .swatch { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 -3px 5px rgba(0, 0, 0, 0.3); }
:host([realistic]) .grid.eye .swatch { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 6px color-mix(in srgb, var(--c) 35%, transparent); }
:host([realistic]) .pal { background: rgba(0, 0, 0, 0.45); padding: 1px; gap: 1px; }
:host([realistic]) .bar { height: 4px; background: rgba(228, 230, 225, 0.1); box-shadow: none; }
:host([realistic]) .bar i { background: var(--r-accent); box-shadow: none; }
:host([realistic]) .bar::after { display: none; }
:host([realistic]) .lockrow .bar i, :host([realistic]) .card .lockprog .bar i { background: var(--cc-amber); }
:host([realistic]) .lockbadge { color: #1a1206; background: var(--cc-amber); border: 0; box-shadow: none; border-radius: 1px; }
:host([realistic]) .lock { box-shadow: none; }
:host([realistic]) .rifle-hero { background: radial-gradient(60% 80% at 50% 50%, #25282c, #0a0b0c 80%); border: 1px solid var(--r-line); box-shadow: none; }
:host([realistic]) .field input { background: rgba(0, 0, 0, 0.34); border: 0; border-bottom: 1px solid var(--r-line-hi); clip-path: none; box-shadow: none; font-weight: 600; letter-spacing: 0.12em; }
:host([realistic]) .field input:focus { border-bottom-color: var(--r-accent); box-shadow: 0 1px 0 var(--r-accent); }
:host([realistic]) .field input[aria-invalid="true"] { border-bottom-color: var(--cc-crimson); box-shadow: 0 1px 0 var(--cc-crimson); }
:host([realistic]) .content { scrollbar-color: rgba(228, 230, 225, 0.2) transparent; }
:host([realistic]) .content::-webkit-scrollbar-thumb { background: rgba(228, 230, 225, 0.2); border: 0; }

/* Tabs, tools, segmented controls, presets. */
:host([realistic]) .tab { clip-path: none; font-weight: 600; letter-spacing: 0.14em; }
:host([realistic]) .tab:hover { background: rgba(255, 255, 255, 0.04); }
:host([realistic]) .tab[aria-selected="true"] { background: rgba(255, 255, 255, 0.06); box-shadow: none; color: var(--r-text); }
:host([realistic]) .tab[aria-selected="true"]::after { left: 22%; right: 22%; bottom: 0; height: 1px; background: var(--r-accent); box-shadow: none; }
:host([realistic]) .tab[aria-selected="true"] svg { color: var(--r-accent); filter: none; }
:host([realistic]) .tab:focus-visible, :host([realistic].kbd) .tab:focus { box-shadow: inset 0 0 0 1px var(--r-accent); }
:host([realistic]) .tool, :host([realistic]) .seg, :host([realistic]) .play { background: rgba(14, 16, 18, 0.6); border: 1px solid var(--r-line); border-radius: 2px; box-shadow: none; }
:host([realistic]) .tool { font-weight: 600; }
:host([realistic]) .tool:hover, :host([realistic]) .tool:focus-visible, :host([realistic].kbd) .tool:focus { background: rgba(40, 44, 48, 0.72); outline: 1px solid var(--r-accent); outline-offset: 1px; }
:host([realistic]) .tool:active, :host([realistic]) .play:active, :host([realistic]) .play.ping { box-shadow: none; }
:host([realistic]) .tool:disabled { outline: none; }
:host([realistic]) .seg button { font-weight: 600; }
:host([realistic]) .seg button[aria-pressed="true"] { color: var(--r-text); background: rgba(228, 230, 225, 0.1); box-shadow: inset 0 -1px 0 var(--r-accent); }
:host([realistic]) .seg button:focus-visible, :host([realistic].kbd) .seg button:focus { outline: 1px solid var(--r-accent); }
:host([realistic]) .play:hover, :host([realistic]) .play:focus-visible, :host([realistic].kbd) .play:focus { color: #0c0e10; background: var(--r-accent); }
:host([realistic]) .preset .pthumb { background: radial-gradient(circle at 42% 34%, #2a2d31, #0c0d0f); border: 1px solid var(--r-line); clip-path: none; box-shadow: none; }
:host([realistic]) .preset:hover .pthumb, :host([realistic]) .preset:focus-visible .pthumb, :host([realistic].kbd) .preset:focus .pthumb { box-shadow: inset 0 0 0 1px var(--r-accent); }
:host([realistic]) .preset > span:last-child { font-weight: 600; letter-spacing: 0.16em; }
:host([realistic]) .presets .lbl { background: rgba(12, 14, 16, 0.92); }

/* Actions: the primary is an off-white plate, not a crimson caption. */
:host([realistic]) .btn { font-weight: 600; letter-spacing: 0.16em; }
:host([realistic]) .btn.primary { color: #0d0f11; background: #dfe1dc; border: 0; clip-path: none; border-radius: 2px; text-shadow: none; box-shadow: none; }
:host([realistic]) .btn.primary:hover, :host([realistic]) .btn.primary:focus-visible, :host([realistic].kbd) .btn.primary:focus, :host([realistic]) .btn.primary.ready:focus {
  filter: none; background: #f4f5f2; box-shadow: 0 0 0 1px #0d0f11, 0 0 0 2px var(--r-accent); }
:host([realistic]) .btn.primary .key { color: #0d0f11; background: rgba(0, 0, 0, 0.06); border-color: rgba(0, 0, 0, 0.28); }
:host([realistic]) .dialog .btn.primary { color: #fff4f2; background: #8c2e27; }
:host([realistic]) .dialog .btn.primary:hover, :host([realistic]) .dialog .btn.primary:focus-visible, :host([realistic].kbd) .dialog .btn.primary:focus { background: #a8362d; }
:host([realistic]) .confirm { background: rgba(4, 5, 6, 0.72); }
`;

let realSheet = null;

class AgentShowroom extends HTMLElement {
  constructor() {
    super();
    this.game = null;
    this.category = 0;
    this.preview = null; // { key, value } applied on top of game.character for the stage
    this.previewSection = null;
    this.undoStack = [];
    this.snapshot = null;
    this.session = false;
    this.isOpen = false;
    this.poseChoice = "idle";
    this.cameraChoice = "full";
    this.helmetOff = false;
    this.yaw = 0;
    this.yawTarget = 0;
    this.view = AGENT_VIEW.full.slice();
    this._stageCache = new Map();
    this._raf = 0;
    this._renderQueued = false;
    this._thumbSeq = 0;
    this._real = false; // Modern (realistic) look; Comic otherwise

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLE}</style>${this.template()}`;
    const $ = (s) => root.querySelector(s);
    this.$ = $;
    this.el = {
      root: $(".root"),
      stage: $(".stage"),
      figure: $(".figure"),
      figureWrap: $(".figure-wrap"),
      callsign: $(".callsign"),
      sub: $(".sub"),
      tabs: [...root.querySelectorAll(".tab")],
      content: $(".content"),
      save: $(".save"),
      back: $(".back"),
      undo: $('[data-act="undo"]'),
      toast: $(".toast"),
      confirm: $(".confirm"),
      presets: $(".presets"),
      live: $(".live"),
    };
    this.bind();
    onArtStyleChange(() => {
      if (this.isOpen && this.syncProfile()) this.renderAll();
    });
  }

  template() {
    const tabs = CATEGORIES.map(
      (c, i) =>
        `<button class="tab" role="tab" id="tab-${c.id}" aria-controls="panel" aria-selected="false" data-cat="${i}" tabindex="-1">${I[c.id]}<span>${c.label}</span></button>`,
    ).join("");
    const presets = PRESETS.map(
      (p, i) => `<button class="preset" data-preset="${i}" aria-label="Apply ${p.name} preset"><span class="pthumb"></span><span>${p.name}</span></button>`,
    ).join("");
    return `
<div class="root">
  <div class="backdrop"><div class="shaft"></div><div class="haze h1"></div><div class="haze h2"></div><div class="floor"></div><div class="halftone"></div><div class="vignette"></div><div class="letterbox"></div></div>
  <section class="stage" tabindex="0" aria-label="Agent preview. Drag or use the arrow keys to turn the agent.">
    <div class="rim r1"></div><div class="rim r2"></div>
    <div class="pedestal"><div class="ring"></div><div class="plate-disc"></div></div>
    <div class="figure-wrap"><div class="figure"></div><div class="sweep"></div></div>
  </section>
  <header class="hdr">
    <div class="kicker">Field Armory</div>
    <h1 class="callsign">Agent</h1>
    <span class="rule" aria-hidden="true"></span>
    <div class="sub"></div>
    <div class="ready caption cyan" hidden>Returning agent · <kbd class="key">Enter</kbd> to deploy</div>
  </header>
  <div class="toolbar" role="toolbar" aria-label="Edit">
    <button class="tool" data-act="undo" aria-label="Undo last change">${I.undo}<span class="t">Undo</span><kbd class="key">Z</kbd></button>
    <button class="tool" data-act="reset" aria-label="Reset appearance to standard issue">${I.reset}<span class="t">Reset</span></button>
    <button class="tool" data-act="random" aria-label="Randomize appearance">${I.dice}<span class="t">Randomize</span><kbd class="key">R</kbd></button>
  </div>
  <div class="presets" role="group" aria-label="Presets"><span class="lbl caption steel">Presets</span>${presets}</div>
  <div class="stage-tools">
    <div class="seg" role="group" aria-label="Camera">
      <button data-camera="full" aria-pressed="true">Full</button><button data-camera="bust" aria-pressed="false">Bust</button>
    </div>
    <div class="seg" role="group" aria-label="Pose">
      <button data-pose="idle" aria-pressed="true">Idle</button><button data-pose="hero" aria-pressed="false">Ready</button>
    </div>
    <div class="seg" role="group" aria-label="Helmet">
      <button data-helmet-off aria-pressed="false">Helmet off</button>
    </div>
    <span class="hint-turn" aria-hidden="true">${I.turn}Drag to turn</span>
  </div>
  <aside class="panel" aria-label="Customization">
    <div class="frame"><div class="body">
      <button class="handle" aria-label="Collapse panel" aria-expanded="true">${I.chevron}</button>
      <div class="tabs" role="tablist" aria-label="Categories"><kbd class="key tabkey" aria-hidden="true">Q</kbd>${tabs}<kbd class="key tabkey" aria-hidden="true">E</kbd></div>
      <div class="content" id="panel" role="tabpanel"></div>
      <footer class="actions">
        <div class="keys" aria-hidden="true">
          <span><kbd class="key">Tab</kbd>Category</span><span><kbd class="key">↑↓←→</kbd>Browse</span><span><kbd class="key">Enter</kbd>Select</span>
          <span><kbd class="key">R</kbd>Random</span><span><kbd class="key">Z</kbd>Undo</span>
        </div>
        <button class="btn plate back"><kbd class="key">Esc</kbd>Back</button>
        <button class="btn primary save">Save &amp; Deploy <kbd class="key k-any">⇧ Enter</kbd><kbd class="key k-focus">Enter</kbd></button>
      </footer>
    </div><span class="brackets"></span></div>
  </aside>
  <div class="toast caption amber" role="status" aria-live="polite"></div>
  <div class="sr live" aria-live="polite"></div>
  <div class="confirm" hidden>
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d">
      <div class="frame"><div class="body">
        <h2 id="cf-t" data-text="Discard changes?">Discard changes?</h2>
        <span class="rule" aria-hidden="true"></span>
        <p id="cf-d">Your agent has unsaved changes. Leaving now restores the last saved loadout.</p>
        <div class="row"><button class="btn plate" data-confirm="keep">Keep editing</button><button class="btn primary" data-confirm="discard">Discard</button></div>
      </div><span class="brackets"></span></div>
    </div>
  </div>
</div>`;
  }

  // ── Lifecycle ───────────────────────────────────────────

  /** Called every frame by the render pipeline. */
  sync(inCreator, modern) {
    if (!inCreator) {
      if (this.isOpen) this.close();
      this.session = false;
      this._exitedAt = 0;
      return;
    }
    // After Save/Back the exit callback may keep the state in CHARACTER_CREATE
    // for a moment (e.g. while the flipbook chunk loads). Stay closed — the
    // canvas is held dark — instead of reopening a fresh session.
    if (this._exitedAt && performance.now() - this._exitedAt < 5000) return;
    this._exitedAt = 0;
    if (!this.session) this.beginSession();
    if (modern && !this.isOpen) this.open();
    else if (!modern && this.isOpen) this.close();
  }

  beginSession() {
    this.session = true;
    this.snapshot = this.pick(this.game.character);
    this.undoStack = [];
    this.preview = null;
    this.previewSection = null;
    this.confirmOpen = false;
    this.el.confirm.hidden = true;
    this.category = 0;
    this.yaw = this.yawTarget = 0;
    this.poseChoice = "idle";
    this.cameraChoice = "full";
    this.setAttribute("camera", "full");
    this.view = AGENT_VIEW.full.slice();
    this._viewTween = null;
    this._stageKey = null;
    this.helmetOff = false;
    this.shadowRoot.querySelector("[data-helmet-off]").setAttribute("aria-pressed", "false");
    this.shadowRoot.querySelectorAll("[data-pose]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pose === "idle")));
    this.shadowRoot.querySelectorAll("[data-camera]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.camera === "full")));
    this.removeAttribute("sheet");
    this.classList.remove("kbd");
    // A saved agent means a returning player: Save & Deploy starts focused so
    // one Enter (or gamepad A) deploys.
    let saved = null;
    try {
      saved = localStorage.getItem("cc_character");
    } catch (_) {}
    this.returning = !!saved;
    this._focusSaveOnOpen = this.returning;
  }

  /**
   * Follow the art style: Modern (realistic) swaps the agent renders and, via
   * the host's [realistic] attribute, the chrome. Returns true on a change.
   */
  syncProfile() {
    const real = isRealisticArt();
    if (real === this._real) return false;
    this._real = real;
    if (real && !this._realAdopted) {
      if (!realSheet) {
        realSheet = new CSSStyleSheet();
        realSheet.replaceSync(REALISTIC_STYLE);
      }
      this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets, realSheet];
      this._realAdopted = true;
    }
    this.toggleAttribute("realistic", real);
    (real ? this : this.el.stage).style.removeProperty("--yaw");
    this._stageKey = null;
    this._presetsBuilt = false;
    return true;
  }

  open() {
    this._unlockCtx = null;
    this.syncProfile();
    this.isOpen = true;
    this.setAttribute("open", "");
    requestAnimationFrame(() => this.setAttribute("shown", ""));
    this.renderAll();
    const ready = this.shadowRoot.querySelector(".ready");
    ready.hidden = !this.returning;
    this.el.save.classList.toggle("ready", !!this.returning);
    if (this._focusSaveOnOpen) {
      this._focusSaveOnOpen = false;
      this.el.save.focus({ preventScroll: true });
    }
    this._resizeObs ??= new ResizeObserver(() => this.onResize());
    this._resizeObs.observe(this.el.figureWrap);
  }

  close() {
    this.isOpen = false;
    this.shadowRoot.activeElement?.blur?.();
    this.removeAttribute("shown");
    this.removeAttribute("open");
    this.preview = null;
    this._resizeObs?.disconnect();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  pick(ch) {
    const out = {};
    for (const k of FIELDS) out[k] = ch[k];
    return out;
  }

  get character() {
    return this.game.character;
  }

  isDirty() {
    const ch = this.character;
    return FIELDS.some((k) => ch[k] !== this.snapshot[k]);
  }

  sfx(name) {
    try {
      this.game?.audio?.[name]?.();
    } catch (_) {}
  }

  // ── Events ──────────────────────────────────────────────

  bind() {
    const root = this.shadowRoot;
    root.addEventListener("click", (e) => this.onClick(e));
    root.addEventListener("pointerover", (e) => this.onHover(e, true));
    root.addEventListener("pointerout", (e) => this.onHover(e, false));
    root.addEventListener("focusin", (e) => this.onFocus(e, true));
    root.addEventListener("focusout", (e) => this.onFocus(e, false));
    // Mouse use hides keyboard focus rings again.
    root.addEventListener("pointerdown", () => this.classList.remove("kbd"));

    // Name field: typed keys belong to the input, not to game shortcuts.
    root.addEventListener("keydown", (e) => {
      if (e.target?.tagName !== "INPUT") return;
      if (e.code === "Tab") return;
      e.stopPropagation();
      if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Escape") {
        e.preventDefault();
        e.target.blur();
        this.focusNav(this.el.tabs[this.category]);
      }
    });
    root.addEventListener("input", (e) => {
      if (e.target?.name === "callsign") this.onName(e.target);
    });

    // Stage drag to turn.
    const st = this.el.stage;
    st.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      st.setPointerCapture(e.pointerId);
      this._drag = { x: e.clientX, yaw: this.yawTarget };
      st.classList.add("dragging");
    });
    st.addEventListener("pointermove", (e) => {
      if (!this._drag) return;
      this.setYaw(this._drag.yaw + (e.clientX - this._drag.x) / 240, true);
    });
    const end = () => {
      this._drag = null;
      st.classList.remove("dragging");
    };
    st.addEventListener("pointerup", end);
    st.addEventListener("pointercancel", end);
    st.addEventListener("dblclick", () => this.setYaw(0));

    // Swipe the panel content sideways to change category (touch).
    const content = this.el.content;
    content.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") this._swipe = { x: e.clientX, y: e.clientY };
    });
    content.addEventListener("pointerup", (e) => {
      const s = this._swipe;
      this._swipe = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 70 && Math.abs(e.clientY - s.y) < 40) {
        this._swallowClick = true;
        this.setCategory(this.category + (dx < 0 ? 1 : -1));
      }
    });
  }

  onClick(e) {
    const t = e.target.closest?.("button, [data-idx]");
    if (!t) return;
    if (this._swallowClick) {
      this._swallowClick = false;
      return;
    }
    if (t.dataset.cat != null) return this.setCategory(Number(t.dataset.cat));
    if (t.dataset.voice != null) return this.playVoice(Number(t.dataset.voice), t);
    if (t.dataset.idx != null) return this.choose(t.dataset.key, Number(t.dataset.idx), t);
    if (t.dataset.preset != null) return this.applyPreset(Number(t.dataset.preset));
    if (t.dataset.camera) return this.setCamera(t.dataset.camera, true);
    if (t.dataset.pose) return this.setPose(t.dataset.pose, true);
    if (t.hasAttribute("data-helmet-off")) return this.toggleHelmet();
    if (t.dataset.confirm) return t.dataset.confirm === "discard" ? this.discard() : this.closeConfirm();
    if (t.classList.contains("handle")) return this.toggleSheet();
    if (t === this.el.save) return this.save();
    if (t === this.el.back) return this.back();
    switch (t.dataset.act) {
      case "undo":
        return this.undo();
      case "reset":
        return this.reset();
      case "random":
        return this.randomize();
      default:
    }
  }

  onHover(e, on) {
    if (e.pointerType === "touch") return;
    const opt = e.target.closest?.(".opt[data-idx]");
    if (!opt) return;
    if (!on && opt.contains(e.relatedTarget)) return;
    this.setPreview(on ? { key: opt.dataset.key, value: Number(opt.dataset.idx) } : null);
  }

  onFocus(e, on) {
    const opt = e.target.closest?.(".opt[data-idx]");
    if (opt && this.classList.contains("kbd")) {
      this.setPreview(on ? { key: opt.dataset.key, value: Number(opt.dataset.idx) } : null);
    }
    const sec = e.target.closest?.(".section");
    this.previewSection = on && sec ? sec.dataset.key || null : null;
  }

  // ── Keys (routed from the game's dispatch) ──────────────

  /** Returns true when the key was consumed. `e` is absent for ccDebug.pressKey. */
  handleKey(code, e) {
    if (!this.isOpen) return false;
    const real = !!(e && typeof e.preventDefault === "function");
    const consume = () => {
      if (real) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      return true;
    };
    const active = this.shadowRoot.activeElement;
    const shift = !!(e?.shiftKey || this.game?.keys?.ShiftLeft || this.game?.keys?.ShiftRight);
    const nav = /^(Arrow|Key[WASD]$)/.test(code);
    if (nav || code === "Tab" || code === "KeyQ" || code === "KeyE") this.classList.add("kbd");

    if (this.confirmOpen) {
      if (code === "Escape" || code === "GamepadB") {
        this.closeConfirm();
        return consume();
      }
      if (nav) {
        const btns = [...this.el.confirm.querySelectorAll("button")];
        const i = btns.indexOf(active);
        btns[(i + 1) % 2].focus();
        return consume();
      }
      if (code === "Enter" || code === "Space" || code === "NumpadEnter") {
        if (real && active?.tagName === "BUTTON") return true;
        (active?.closest(".confirm") ? active : this.el.confirm.querySelector("[data-confirm=keep]")).click();
        return consume();
      }
      return consume();
    }

    switch (code) {
      case "Tab":
        this.setCategory(this.category + (shift ? -1 : 1), true);
        return consume();
      case "KeyQ":
        this.setCategory(this.category - 1, true);
        return consume();
      case "KeyE":
        this.setCategory(this.category + 1, true);
        return consume();
      case "KeyR":
      case "GamepadX":
        this.randomize();
        return consume();
      case "KeyZ":
        this.undo();
        return consume();
      case "KeyC":
        this.setCamera(this.cameraChoice === "bust" ? "full" : "bust", true);
        return consume();
      case "GamepadY":
        this.save();
        return consume();
      case "Escape":
        this.back();
        return consume();
      case "Enter":
      case "NumpadEnter":
      case "Space":
        if (code !== "Space" && shift) {
          this.save();
          return consume();
        }
        if (active && active !== this.el.stage && active.matches("button")) {
          if (real) return true; // the browser activates the focused button itself
          active.click();
          return consume();
        }
        if (code !== "Space") this.save();
        return consume();
      default:
    }
    if (nav) {
      const dir = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" }[code];
      if (active === this.el.stage && (dir === "left" || dir === "right")) {
        this.setYaw(this.yawTarget + (dir === "left" ? -0.25 : 0.25));
        return consume();
      }
      this.moveFocus(dir, active);
      return consume();
    }
    return false;
  }

  navItems() {
    const root = this.shadowRoot;
    return [
      ...this.el.tabs,
      ...root.querySelectorAll(".content .opt, .content input, .content .play"),
      this.el.back,
      this.el.save,
    ].filter((el) => el.offsetParent !== null);
  }

  moveFocus(dir, active) {
    const items = this.navItems();
    if (!active || !items.includes(active)) {
      const sel = this.el.content.querySelector('.opt[aria-checked="true"]') || items.find((el) => el.classList.contains("opt")) || this.el.tabs[this.category];
      return this.focusNav(sel);
    }
    if (active.classList.contains("tab") && (dir === "left" || dir === "right")) {
      this.setCategory(this.category + (dir === "left" ? -1 : 1), true, true);
      return;
    }
    const a = active.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const el of items) {
      if (el === active) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - ax;
      const dy = r.top + r.height / 2 - ay;
      const along = { up: -dy, down: dy, left: -dx, right: dx }[dir];
      const across = dir === "up" || dir === "down" ? Math.abs(dx) : Math.abs(dy);
      // Only candidates inside a ~60° cone, so "right" from a full-width card doesn't jump rows.
      if (along <= 4 || across > along * 1.2 + 12) continue;
      const score = along + across * 2.2;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) {
      this.focusNav(best);
      this.sfx("menuNav");
    }
  }

  focusNav(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  }

  // ── Editing ─────────────────────────────────────────────

  effective() {
    const ch = this.pick(this.character);
    if (this.preview) ch[this.preview.key] = this.preview.value;
    return ch;
  }

  setPreview(p) {
    const same = p && this.preview && p.key === this.preview.key && p.value === this.preview.value;
    if (same || (!p && !this.preview)) return;
    if (p && this.character[p.key] === p.value) p = null;
    clearTimeout(this._previewClear);
    if (!p) {
      // Short grace so sliding between tiles doesn't flash the committed look.
      this._previewClear = setTimeout(() => {
        this.preview = null;
        this.queueRender();
      }, 70);
      return;
    }
    this.preview = p;
    this.queueRender();
  }

  choose(key, idx, el) {
    const sec = this.sectionFor(key);
    const item = sec?.data?.[idx];
    if (!item) return;
    const st = unlockState(key, idx, this.unlockCtx());
    if (!st.unlocked) {
      el?.classList.remove("shake");
      void el?.offsetWidth;
      el?.classList.add("shake");
      this.toast(`${item.name} locked · ${st.hint}`);
      this.sfx("menuNav");
      return;
    }
    if (this.character[key] === idx) {
      this.preview = null;
      return;
    }
    this.commit({ [key]: idx });
    this.sfx("menuSelect");
    this.announce(`${sec.title}: ${item.name}`);
  }

  commit(changes) {
    this.el.save.classList.remove("ready");
    const ch = this.character;
    const prev = this.pick(ch);
    if (!Object.keys(changes).some((k) => ch[k] !== changes[k])) return false;
    this.undoStack.push(prev);
    if (this.undoStack.length > 60) this.undoStack.shift();
    Object.assign(ch, changes);
    this.preview = null;
    this.renderAll(false);
    return true;
  }

  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return this.sfx("menuNav");
    Object.assign(this.character, prev);
    this.preview = null;
    this.sfx("menuSelect");
    this.announce("Undone");
    this.renderAll(false);
  }

  reset() {
    const def = {};
    for (const k of APPEARANCE) def[k] = DEFAULT_CHARACTER[k];
    if (this.commit(def)) {
      this.sfx("menuSelect");
      this.toast("Reset to standard issue");
    }
  }

  randomize() {
    const r = (n) => Math.floor(Math.random() * n);
    const next = {
      colorIndex: r(CHARACTER_COLORS.length),
      skinToneIndex: r(SKIN_TONES.length),
      hairIndex: r(HAIR_STYLES.length),
      eyeIndex: r(EYE_COLORS.length),
      armorIndex: r(ARMOR_STYLES.length),
      helmetIndex: r(HELMET_STYLES.length),
      visorIndex: r(VISOR_STYLES.length),
      shoulderIndex: r(SHOULDER_STYLES.length),
      // Most agents wear a badge; plain chests stay rare.
      badgeIndex: Math.random() < 0.15 ? 0 : 1 + r(BADGES.length - 1),
      weaponSkinIndex: r(WEAPON_SKINS.length),
    };
    // Keep it tasteful: Ghost plating reads best with dark optics and finishes,
    // synthetic skin with cool eyes.
    if (ARMOR_STYLES[next.armorIndex].id === "stealth") {
      if (Math.random() < 0.6) next.visorIndex = Math.random() < 0.5 ? 1 : 2;
      if (Math.random() < 0.6) next.weaponSkinIndex = 1;
    }
    if (SKIN_TONES[next.skinToneIndex].id === "synthetic" && Math.random() < 0.7) next.eyeIndex = Math.random() < 0.5 ? 5 : 1;
    // Only what the agent has earned: re-roll locked picks from the unlocked set.
    const ctx = this.unlockCtx();
    for (const key of Object.keys(LOCKABLE)) {
      const open = LOCKABLE[key].table.map((_, i) => i).filter((i) => unlockState(key, i, ctx).unlocked);
      if (key === "loadoutIndex") next.loadoutIndex = open[r(open.length)] ?? this.character.loadoutIndex;
      else if (!open.includes(next[key])) next[key] = open[r(open.length)] ?? 0;
    }
    this.commit(next);
    this.sfx("menuConfirm");
    this.flashStage();
    this.announce("Randomized appearance");
  }

  /** First locked piece of a preset, or null when the agent can wear all of it. */
  presetLock(i) {
    const ctx = this.unlockCtx();
    for (const [key, idx] of Object.entries(PRESETS[i].ch)) {
      if (!LOCKABLE[key]) continue;
      const st = unlockState(key, idx, ctx);
      if (!st.unlocked) return st;
    }
    return null;
  }

  applyPreset(i) {
    const p = PRESETS[i];
    if (!p) return;
    const lock = this.presetLock(i);
    if (lock) {
      this.toast(`${p.name} locked · ${lock.hint}`);
      this.sfx("menuNav");
      return;
    }
    this.commit({ ...p.ch });
    this.sfx("menuConfirm");
    this.flashStage();
    this.toast(`${p.name} preset applied`);
  }

  onName(input) {
    const raw = input.value.slice(0, 16);
    if (raw !== input.value) input.value = raw;
    const msg = this.nameError(raw);
    const err = this.shadowRoot.querySelector(".err");
    input.setAttribute("aria-invalid", String(!!msg));
    if (err) {
      err.textContent = msg || "Letters, numbers, space . _ ' -";
      err.classList.toggle("ok", !msg);
    }
    this.shadowRoot.querySelector(".count").textContent = `${raw.length}/16`;
    if (!msg && raw.trim() !== this.character.name) {
      // Typing is one undo step per pause, not per letter.
      const now = performance.now();
      if (!this._nameEditAt || now - this._nameEditAt > 1200) this.undoStack.push(this.pick(this.character));
      this._nameEditAt = now;
      this.character.name = raw.trim();
    }
    this.el.save.setAttribute("aria-disabled", String(!!msg));
    this.el.undo.disabled = this.undoStack.length === 0;
    this.renderHeader();
  }

  nameError(v) {
    const t = v.trim();
    if (!t) return "Callsign required";
    if (!NAME_RE.test(t)) return "Use letters, numbers, space . _ ' -";
    return "";
  }

  playVoice(i, btn) {
    const profile = VOICE_PROFILES[i];
    const audio = this.game?.audio;
    try {
      audio?.init?.();
      audio?.resume?.();
      audio?.playerGrunt?.(profile, "hurt");
      setTimeout(() => audio?.playerGrunt?.(profile, "slide"), 220);
    } catch (_) {}
    btn.classList.remove("ping");
    void btn.offsetWidth;
    btn.classList.add("ping");
  }

  // ── Exits ───────────────────────────────────────────────

  save() {
    const input = this.shadowRoot.querySelector("input[name=callsign]");
    const msg = this.nameError(input ? input.value : this.character.name || "");
    if (msg) {
      this.setCategory(0);
      this.toast(msg);
      requestAnimationFrame(() => this.shadowRoot.querySelector("input[name=callsign]")?.focus());
      return;
    }
    if (input) this.character.name = input.value.trim() || this.character.name;
    this.preview = null;
    this.sfx("menuConfirm");
    this.close();
    this.session = false;
    this._exitedAt = performance.now();
    this.game._exitCreator(true);
    this.clearExitGuard();
  }

  back() {
    if (this.isDirty()) return this.openConfirm();
    this.leave();
  }

  discard() {
    Object.assign(this.character, this.snapshot);
    this.closeConfirm(true);
    this.leave();
  }

  leave() {
    const g = this.game;
    this.sfx("menuConfirm");
    this.close();
    this.session = false;
    this._exitedAt = performance.now();
    g._creatorExitTime = performance.now();
    g._exitCreator(false);
    this.clearExitGuard();
  }

  /** The exit guard only matters while the exit callback is still pending in CHARACTER_CREATE. */
  clearExitGuard() {
    if (this.game.state !== "characterCreate") this._exitedAt = 0;
  }

  openConfirm() {
    this.confirmOpen = true;
    this.el.confirm.hidden = false;
    this._confirmReturn = this.shadowRoot.activeElement;
    this.sfx("menuNav");
    requestAnimationFrame(() => this.el.confirm.querySelector("[data-confirm=keep]").focus());
  }

  closeConfirm(silent) {
    this.confirmOpen = false;
    this.el.confirm.hidden = true;
    if (!silent) this._confirmReturn?.focus?.();
  }

  // ── Stage controls ──────────────────────────────────────

  setCategory(i, keyboard = false, keepTabFocus = false) {
    const n = CATEGORIES.length;
    const next = ((i % n) + n) % n;
    const dir = next > this.category ? 1 : -1;
    const changed = next !== this.category;
    this.category = next;
    this.preview = null;
    const cat = CATEGORIES[next];
    // Categories frame the stage for what they edit; manual toggles still win after.
    this.setCamera(cat.camera || "full");
    this.setPose(cat.pose || "idle");
    if (changed) this.sfx("menuNav");
    this.renderAll(true, changed ? dir : 0);
    if (keyboard) {
      if (keepTabFocus) this.focusNav(this.el.tabs[next]);
      else this.focusNav(this.el.content.querySelector('.opt[aria-checked="true"]') || this.el.content.querySelector(".opt, input"));
    }
  }

  sectionFor(key) {
    for (const c of CATEGORIES) for (const s of c.sections) if (s.key === key) return s;
    return null;
  }

  setCamera(mode, user = false) {
    this.cameraChoice = mode;
    this.setAttribute("camera", mode);
    this.shadowRoot.querySelectorAll("[data-camera]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.camera === mode)));
    this.tweenView(mode === "bust" ? AGENT_VIEW.bust : AGENT_VIEW.full);
    if (user) this.sfx("menuNav");
  }

  setPose(pose, user = false) {
    if (pose === this.poseChoice && !user) return;
    this.poseChoice = pose;
    this.shadowRoot.querySelectorAll("[data-pose]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pose === pose)));
    if (user) this.sfx("menuNav");
    this.queueRender();
  }

  toggleHelmet() {
    this.helmetOff = !this.helmetOff;
    this.shadowRoot.querySelector("[data-helmet-off]").setAttribute("aria-pressed", String(this.helmetOff));
    this.sfx("menuNav");
    this.queueRender();
  }

  toggleSheet() {
    const collapsed = this.getAttribute("sheet") === "collapsed";
    if (collapsed) this.removeAttribute("sheet");
    else this.setAttribute("sheet", "collapsed");
    this.shadowRoot.querySelector(".handle").setAttribute("aria-expanded", String(collapsed));
    this.sfx("menuNav");
  }

  setYaw(v, immediate = false) {
    this.yawTarget = clamp(v, -1, 1);
    if (immediate || reducedMotion()) this.yaw = this.yawTarget;
    this.animate();
  }

  tweenView(target) {
    const from = this.view.slice();
    if (reducedMotion() || !this.isOpen) {
      this.view = target.slice();
      this.applyView();
      return;
    }
    this._viewTween = { from, to: target.slice(), t0: performance.now(), dur: 520 };
    this.animate();
  }

  animate() {
    if (this._raf || !this.isOpen) return;
    const step = (now) => {
      this._raf = 0;
      let more = false;
      const tw = this._viewTween;
      if (tw) {
        const t = clamp((now - tw.t0) / tw.dur, 0, 1);
        const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.view = tw.from.map((v, i) => v + (tw.to[i] - v) * k);
        this.applyView();
        if (t < 1) more = true;
        else this._viewTween = null;
      }
      if (Math.abs(this.yaw - this.yawTarget) > 0.002) {
        this.yaw += (this.yawTarget - this.yaw) * 0.18;
        more = true;
      } else this.yaw = this.yawTarget;
      this.applyYaw();
      if (more) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  applyView() {
    this.el.figure.querySelector("svg")?.setAttribute("viewBox", this.view.map((v) => v.toFixed(2)).join(" "));
  }

  /** Turn parallax: back gear and cape slide against the body, head leads, light sweeps. */
  applyYaw() {
    const y = this.yaw;
    // Modern (realistic) scopes the property to the stage: set on the host it
    // restyles every tile, and each filtered thumbnail would re-rasterise per frame.
    (this._real ? this.el.stage : this).style.setProperty("--yaw", y.toFixed(3));
    if (this._real) {
      // Modern's figure carries lighting filters (diffuse + specular + noise).
      // Any change inside that SVG re-runs them — 100-200 ms at 2x DPR — so
      // the turn is a compositor transform on the wrapper instead of per-part
      // parallax transforms inside the SVG.
      this.el.figure.style.setProperty("--yaw-sx", (1 - Math.abs(y) * 0.07).toFixed(3));
      return;
    }
    const svg = this.el.figure.querySelector("svg");
    if (!svg) return;
    const set = (sel, tf) => svg.querySelector(sel)?.setAttribute("transform", tf);
    const sx = (1 - Math.abs(y) * 0.07).toFixed(3);
    set(".ag-yaw-back", `translate(${(-y * 7).toFixed(2)} 0) scale(${sx} 1)`);
    set(".ag-yaw-cape", `translate(${(-y * 4.5).toFixed(2)} 0) scale(${sx} 1)`);
    set(".ag-yaw-body", `translate(${(y * 0.8).toFixed(2)} 0) scale(${sx} 1)`);
    set(".ag-yaw-head", `translate(${(y * 2.4).toFixed(2)} 0)`);
    set(".ag-shadow", `translate(${(y * 3).toFixed(2)} 0)`);
  }

  flashStage() {
    const f = this.el.figure;
    if (reducedMotion()) return;
    f.animate?.([{ filter: "brightness(1.8)" }, { filter: "brightness(1)" }], { duration: 320, easing: "ease-out" });
  }

  onResize() {
    this.style.setProperty("--fig-h", `${this.el.figureWrap.clientHeight}px`);
  }

  // ── Rendering ───────────────────────────────────────────

  queueRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => {
      this._renderQueued = false;
      if (!this.isOpen) return;
      this.renderStage();
      this.renderHeader();
      this.renderPreviewLabels();
    });
  }

  renderAll(rebuildContent = true, swapDir = 0) {
    if (!this.isOpen) return;
    const pal = CHARACTER_COLORS[this.character.colorIndex] || CHARACTER_COLORS[0];
    this.style.setProperty("--accent", pal.accent);
    this.style.setProperty("--primary", pal.primary);
    this.el.tabs.forEach((t, i) => {
      const on = i === this.category;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (rebuildContent) this.renderContent(swapDir);
    else this.refreshContent();
    this.renderPresets();
    this.renderStage();
    this.renderHeader();
    this.el.undo.disabled = this.undoStack.length === 0;
  }

  renderHeader() {
    const ch = this.effective();
    this.el.callsign.textContent = ch.name || "Agent";
    this.el.callsign.dataset.text = ch.name || "Agent";
    const cls = LOADOUT_CLASSES[ch.loadoutIndex] || LOADOUT_CLASSES[0];
    const org = BACKSTORIES[ch.backstoryIndex || 0];
    const armor = ARMOR_STYLES[ch.armorIndex] || ARMOR_STYLES[0];
    this.el.sub.innerHTML = `<b>${esc(cls.name)}</b> · ${esc(org.name)} · ${esc(armor.name)}`;
    const pal = CHARACTER_COLORS[ch.colorIndex] || CHARACTER_COLORS[0];
    this.style.setProperty("--accent", pal.accent);
  }

  stagePeek(ch) {
    if (this.helmetOff) return true;
    const helm = HELMET_STYLES[ch.helmetIndex]?.id;
    if (OPEN_HELMETS.has(helm)) return false;
    // Face edits show the face even under a closed helmet.
    const key = this.preview?.key || this.previewSection;
    return FACE_KEYS.has(key);
  }

  renderStage() {
    const ch = this.effective();
    const pose = this.poseChoice;
    const peek = this.stagePeek(ch);
    const key = `${this._real ? "r|" : ""}${pose}|${peek}|${APPEARANCE.concat(["loadoutIndex", "backstoryIndex"]).map((k) => ch[k]).join(",")}`;
    if (key === this._stageKey) return;
    this._stageKey = key;
    let markup = this._stageCache.get(key);
    if (!markup) {
      markup = buildAgentSvg(ch, { pose, peek, idPrefix: "st-", realistic: this._real });
      this._stageCache.set(key, markup);
      if (this._stageCache.size > 48) this._stageCache.delete(this._stageCache.keys().next().value);
    }
    // A wrapper carries the breathing animation, so the filtered SVG inside is
    // rasterised once and only moved by the compositor.
    this.el.figure.innerHTML = `<div class="fig-breathe">${markup}</div>`;
    this.applyView();
    this.applyYaw();
  }

  renderPresets() {
    this.el.presets.querySelectorAll(".preset").forEach((btn, i) => {
      if (!this._presetsBuilt) {
        const ch = { ...DEFAULT_CHARACTER, ...PRESETS[i].ch };
        btn.querySelector(".pthumb").innerHTML = buildAgentSvg(ch, { view: [-22, -106, 44, 44], idPrefix: `ps${i}-`, lighting: "flat", realistic: this._real });
      }
      const lock = this.presetLock(i);
      btn.classList.toggle("locked", !!lock);
      btn.setAttribute("aria-label", `Apply ${PRESETS[i].name} preset${lock ? `. Locked: ${lock.hint}` : ""}`);
      btn.title = lock ? lock.hint : "";
      const thumb = btn.querySelector(".pthumb");
      thumb.querySelector(".lockbadge")?.remove();
      if (lock) thumb.insertAdjacentHTML("beforeend", `<span class="lockbadge" aria-hidden="true">${I.lock}</span>`);
    });
    this._presetsBuilt = true;
  }

  /** Unlock context, refreshed each time the showroom opens. */
  unlockCtx() {
    if (!this._unlockCtx) this._unlockCtx = gameUnlockContext(this.game, { fresh: true });
    return this._unlockCtx;
  }

  renderPreviewLabels() {
    this.shadowRoot.querySelectorAll(".section[data-key]").forEach((sec) => {
      const s = this.sectionFor(sec.dataset.key);
      const cur = sec.querySelector(".cur");
      if (!s || !cur) return;
      const previewing = this.preview?.key === s.key;
      const idx = previewing ? this.preview.value : this.character[s.key];
      cur.textContent = s.data[idx]?.name || "";
      cur.classList.toggle("preview", previewing);
    });
  }

  renderContent(swapDir = 0) {
    const cat = CATEGORIES[this.category];
    const c = this.el.content;
    c.setAttribute("aria-labelledby", `tab-${cat.id}`);
    c.innerHTML = cat.sections.map((s) => this.sectionHtml(s)).join("");
    c.scrollTop = 0;
    if (swapDir) {
      c.style.setProperty("--swap-dir", `${swapDir * 14}px`);
      c.classList.remove("swap");
      void c.offsetWidth;
      c.classList.add("swap");
    }
    this.refreshContent(true);
  }

  sectionHtml(s) {
    if (s.type === "name") {
      const name = this.character.name || "";
      const msg = this.nameError(name);
      return `<div class="section" data-section="name"><h3><label for="callsign">${s.title}</label></h3>
        <label class="field"><input id="callsign" name="callsign" maxlength="16" autocomplete="off" spellcheck="false" value="${esc(name)}" aria-describedby="callsign-err" aria-invalid="${!!msg}"><span class="count">${name.length}/16</span></label>
        <p class="err ${msg ? "" : "ok"}" id="callsign-err">${esc(msg || "Letters, numbers, space . _ ' -")}</p></div>`;
    }
    const items = s.data.map((item, i) => this.optionHtml(s, item, i)).join("");
    const extra = s.kind === "rifle" ? `<div class="rifle-hero" aria-hidden="true"><div class="spin"></div></div>` : "";
    return `<div class="section" data-key="${s.key}"><h3><span>${s.title}</span><span class="cur"></span></h3>${extra}<div class="grid ${s.kind}" role="radiogroup" aria-label="${s.title}">${items}</div>${this.lockInfoHtml(s)}</div>`;
  }

  /** Requirement rows for locked tiles (cards carry their own). One row per distinct rule. */
  lockInfoHtml(s) {
    if (!LOCKABLE[s.key] || s.kind === "class") return "";
    const ctx = this.unlockCtx();
    const rows = new Map();
    s.data.forEach((item, i) => {
      const st = unlockState(s.key, i, ctx);
      if (st.unlocked) return;
      const row = rows.get(st.hint) || { st, names: [] };
      row.names.push(item.name);
      rows.set(st.hint, row);
    });
    if (!rows.size) return "";
    const html = [...rows.values()]
      .map(({ st, names }) => `<div class="lockrow"><span class="lock caption amber">${I.lock}${esc(names.join(", "))}</span><span>${esc(st.hint)}</span><span class="bar" aria-hidden="true"><i style="--w:${Math.round(st.pct * 100)}%"></i></span></div>`)
      .join("");
    return `<div class="lockinfo">${html}</div>`;
  }

  optionHtml(s, item, i) {
    const st = LOCKABLE[s.key] ? unlockState(s.key, i, this.unlockCtx()) : null;
    const locked = !!st && !st.unlocked;
    const attrs = `class="opt plate${s.kind === "origin" || s.kind === "voice" || s.kind === "class" ? " card" : ""}${locked ? " locked" : ""}" role="radio" aria-checked="false" data-key="${s.key}" data-idx="${i}" tabindex="-1"`;
    const label = `${item.name}${item.desc ? `. ${item.desc}` : ""}${item.perk ? `. Perk: ${item.perk}` : ""}${locked ? `. Locked: ${st.hint}` : ""}`;
    const tick = `<span class="tick" aria-hidden="true">${I.check}</span>`;
    const tier = item.tier ? `<span class="tier" aria-hidden="true">${[1, 2, 3].map((t) => `<i class="${t <= item.tier ? "on" : ""}"></i>`).join("")}&nbsp;${TIER[item.tier]}</span>` : "";
    switch (s.kind) {
      case "eye":
        return `<button ${attrs} aria-label="${esc(label)}" title="${esc(item.name)}"><span class="swatch" style="--c:${item.color}"></span><span class="oname">${esc(item.name)}</span></button>`;
      case "skin":
        return `<button ${attrs} aria-label="${esc(label)}" title="${esc(item.name)}"><span class="swatch" style="background:radial-gradient(circle at 35% 30%, ${item.color}, ${item.shadow})"></span><span class="oname">${esc(item.name)}</span></button>`;
      case "palette":
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="pal" aria-hidden="true"><i style="background:linear-gradient(135deg, ${item.primary}, ${item.dark})"></i><i style="background:${item.accent}"></i><i style="background:${item.dark}"></i></span><span class="oname">${esc(item.name)}</span></button>`;
      case "badge":
        return `<button ${attrs} aria-label="${esc(label)}" title="${esc(item.name)}">${tick}<span class="badge-tile" aria-hidden="true">${item.icon ? `<svg viewBox="-6.5 -6.5 13 13">${badgeIcon(item.icon, "var(--accent)", "#070b11")}</svg>` : `<span class="oname" style="color:var(--faint)">None</span>`}</span><span class="oname">${esc(item.name)}</span></button>`;
      case "origin":
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="row"><span class="oname">${esc(item.name)}</span></span><span class="desc">${esc(item.desc)}</span><span class="perk caption cyan">${esc(item.perk)}</span></button>`;
      case "voice":
        return `<div class="voice-row" style="position:relative"><button ${attrs} aria-label="${esc(label)}" style="width:100%;padding-right:60px">${tick}<span class="oname">${esc(item.name)}</span><span class="desc">${esc(item.desc)}</span></button><button class="play" data-voice="${i}" aria-label="Preview ${esc(item.name)} voice" style="position:absolute;right:10px;top:50%;transform:translateY(-50%)">${I.play}</button></div>`;
      case "class": {
        const stats = classStats(item)
          .map((st) => {
            const pct = (v) => `${Math.round(clamp(v / st.max, 0, 1) * 100)}%`;
            const fmt = st.fmt || ((v) => Math.round(v));
            const d = st.value - st.base;
            const cls = Math.abs(d) < 1e-6 ? "" : d > 0 ? "up" : "down";
            return `<span>${st.label}</span><span class="bar"><i style="--w:${pct(st.value)}"></i></span><b class="${cls}">${fmt(st.value)}</b>`;
          })
          .join("");
        const lock = locked ? `<span class="lock caption amber">${I.lock}Locked</span>` : "";
        const prog = locked
          ? `<span class="lockprog"><span>${esc(st.hint)}</span><span class="bar" style="width:70px" aria-hidden="true"><i style="--w:${Math.round(st.pct * 100)}%"></i></span></span>`
          : "";
        return `<button ${attrs} aria-label="${esc(label)}" aria-disabled="${locked}">${tick}<span class="row"><span class="oname">${esc(item.name)}</span>${lock}</span><span class="desc">${esc(item.desc)}</span>${prog}<span class="stats" aria-hidden="true">${stats}</span></button>`;
      }
      case "rifle":
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="thumb" data-thumb="rifle"></span><span class="oname">${esc(item.name)}</span></button>`;
      default:
        return `<button ${attrs} aria-label="${esc(label)}"${locked ? ` aria-disabled="true" title="${esc(st.hint)}"` : ""}>${tick}${locked ? `<span class="lockbadge" aria-hidden="true">${I.lock}</span>` : ""}<span class="thumb" data-thumb="${s.kind}"></span><span class="oname">${esc(item.name)}</span>${tier}</button>`;
    }
  }

  /** Update checked states and rebuild thumbnails whose look depends on the character. */
  refreshContent(force = false) {
    const ch = this.character;
    const sig = APPEARANCE.map((k) => ch[k]).join(",") + (this._real ? "|r" : "");
    const realistic = this._real;
    this.shadowRoot.querySelectorAll(".content .opt[data-key]").forEach((opt) => {
      const key = opt.dataset.key;
      const idx = Number(opt.dataset.idx);
      opt.setAttribute("aria-checked", String(ch[key] === idx));
      const thumb = opt.querySelector(".thumb[data-thumb]");
      if (!thumb || (!force && thumb.dataset.sig === sig)) return;
      thumb.dataset.sig = sig;
      const variant = { ...ch, [key]: idx };
      const id = `t${this._thumbSeq++}-`;
      switch (thumb.dataset.thumb) {
        case "head":
          thumb.innerHTML = buildAgentSvg(variant, { headOnly: true, idPrefix: id, realistic });
          break;
        case "hair":
          thumb.innerHTML = buildAgentSvg(variant, { headOnly: true, peek: true, idPrefix: id, realistic });
          break;
        case "torso":
          thumb.innerHTML = buildAgentSvg(variant, { view: AGENT_VIEW.torso, idPrefix: id, lighting: "flat", realistic });
          break;
        case "rifle":
          thumb.innerHTML = buildRifleSvg(variant, { idPrefix: id, realistic });
          break;
        default:
      }
    });
    const spin = this.shadowRoot.querySelector(".rifle-hero .spin");
    if (spin && (force || spin.dataset.sig !== sig)) {
      spin.dataset.sig = sig;
      spin.innerHTML = buildRifleSvg(ch, { idPrefix: `rh${this._thumbSeq++}-`, realistic });
    }
    const input = this.shadowRoot.querySelector("input[name=callsign]");
    if (input && this.shadowRoot.activeElement !== input && input.value !== (ch.name || "")) input.value = ch.name || "";
    this.el.save.setAttribute("aria-disabled", String(!!this.nameError(ch.name || "")));
    this.renderPreviewLabels();
    this.el.undo.disabled = this.undoStack.length === 0;
  }

  // ── Feedback ────────────────────────────────────────────

  toast(msg) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove("on"), 2200);
  }

  announce(msg) {
    this.el.live.textContent = msg;
  }
}

if (!customElements.get("agent-showroom")) customElements.define("agent-showroom", AgentShowroom);

/** Create (once) and return the showroom bound to `game`. */
export function mountShowroom(game) {
  let el = document.querySelector("agent-showroom");
  if (!el) {
    el = document.createElement("agent-showroom");
    document.body.appendChild(el);
  }
  el.game = game;
  return el;
}
