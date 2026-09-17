import {
  AGENT_VIEW,
  badgeIcon,
  buildAgentSvg,
  buildRifleSvg,
} from "../../src/rendering/svg-art/agent-rig.js";
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

// No unlock progression exists for classes yet; the hint says how they are gated.
const LOCK_HINTS = {
  gunslinger: "Requires Bureau marksman clearance",
  enforcer: "Requires Enforcer division transfer",
  phantom: "Requires Rift-runner certification",
};

const PRESETS = [
  { name: "Regulation", ch: { colorIndex: 0, skinToneIndex: 0, hairIndex: 1, eyeIndex: 1, armorIndex: 0, helmetIndex: 0, visorIndex: 0, shoulderIndex: 1, badgeIndex: 3, weaponSkinIndex: 0 } },
  { name: "Juggernaut", ch: { colorIndex: 2, skinToneIndex: 2, hairIndex: 2, eyeIndex: 4, armorIndex: 2, helmetIndex: 3, visorIndex: 4, shoulderIndex: 3, badgeIndex: 2, weaponSkinIndex: 3 } },
  { name: "Ghost", ch: { colorIndex: 3, skinToneIndex: 3, hairIndex: 0, eyeIndex: 3, armorIndex: 3, helmetIndex: 2, visorIndex: 2, shoulderIndex: 0, badgeIndex: 6, weaponSkinIndex: 1 } },
  { name: "Engineer", ch: { colorIndex: 4, skinToneIndex: 4, hairIndex: 3, eyeIndex: 0, armorIndex: 4, helmetIndex: 1, visorIndex: 3, shoulderIndex: 4, badgeIndex: 5, weaponSkinIndex: 2 } },
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

const STYLE = `
:host {
  --ink: #04060b; --void: #05060c; --navy: #0b1422; --steel: #2a3a4a; --steel-hi: #6f8aa3;
  --text: #e4edf5; --dim: #8fa4b8; --faint: #5d7185; --cyan: #22e6ff; --energy: #00ffcc;
  --crimson: #ff2a4a; --amber: #ffae3a;
  --accent: #00ffdd; --primary: #00ccaa;
  --display: Bahnschrift, "Avenir Next Condensed", "DIN Condensed", "Roboto Condensed", "Arial Narrow", "Helvetica Neue", sans-serif;
  --mono: "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace;
  --ease: cubic-bezier(.2, .7, .2, 1);
  position: fixed; inset: 0; z-index: 50; display: none;
  font-family: var(--display); color: var(--text);
  -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none;
}
:host([open]) { display: block; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
svg { display: block; }
.icon svg, .tab svg, .tool svg, .lock svg, .play svg, .tick svg, .handle svg, .hint-turn svg {
  fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
}
.play svg { fill: currentColor; stroke: none; }

.root { position: absolute; inset: 0; overflow: hidden; background: #03050a; opacity: 0; transition: opacity .22s var(--ease); }
:host([shown]) .root { opacity: 1; }

/* ── Backdrop ─────────────────────────────────────────── */
.backdrop { position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(60% 55% at 32% 42%, color-mix(in srgb, var(--accent) 14%, #0e1a2a) 0%, #070c16 55%, #020308 100%); }
.shaft { position: absolute; top: -10%; width: 26%; height: 90%; left: 19%;
  background: linear-gradient(180deg, rgba(200,230,255,.12), rgba(200,230,255,0) 80%);
  clip-path: polygon(35% 0, 65% 0, 100% 100%, 0 100%); filter: blur(6px); }
.haze { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .5; }
.haze.h1 { width: 46vw; height: 30vh; left: 6vw; top: 52vh; background: color-mix(in srgb, var(--accent) 22%, transparent); animation: drift 14s ease-in-out infinite alternate; }
.haze.h2 { width: 30vw; height: 40vh; left: 36vw; top: 8vh; background: rgba(90, 120, 180, .18); animation: drift 18s ease-in-out infinite alternate-reverse; }
@keyframes drift { to { transform: translate(4vw, -3vh) scale(1.1); } }
.floor { position: absolute; left: -20%; right: 20%; bottom: -8%; height: 46%;
  background-image: linear-gradient(rgba(34,230,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,230,255,.08) 1px, transparent 1px);
  background-size: 48px 48px; transform: perspective(520px) rotateX(64deg); transform-origin: 50% 100%;
  mask-image: radial-gradient(60% 70% at 50% 60%, #000 20%, transparent 75%); -webkit-mask-image: radial-gradient(60% 70% at 50% 60%, #000 20%, transparent 75%); }
.grain { position: absolute; inset: 0; opacity: .05; background: repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px); mix-blend-mode: overlay; }
.vignette { position: absolute; inset: 0; background: radial-gradient(120% 90% at 35% 45%, transparent 55%, rgba(0,0,0,.75) 100%); }

/* ── Stage ────────────────────────────────────────────── */
.stage { position: absolute; left: 0; top: 0; bottom: 0; right: calc(var(--panel-w) + 32px); outline: none; touch-action: none; cursor: grab; }
.stage.dragging { cursor: grabbing; }
.stage:focus-visible .pedestal .ring { box-shadow: 0 0 0 2px var(--cyan); }
:host { --panel-w: min(452px, 38vw); }
.rim { position: absolute; width: 34%; height: 62%; top: 16%; border-radius: 50%; filter: blur(46px); opacity: .55; pointer-events: none;
  transition: transform .5s var(--ease); }
.rim.r1 { left: 18%; background: rgba(170, 205, 255, .26); transform: translateX(calc(var(--yaw) * -40px)); }
.rim.r2 { right: 14%; background: color-mix(in srgb, var(--accent) 45%, transparent); transform: translateX(calc(var(--yaw) * 40px)); animation: rimPulse 5s ease-in-out infinite; }
@keyframes rimPulse { 50% { opacity: .38; } }
.pedestal { position: absolute; left: 50%; bottom: 8.5%; width: min(56%, 440px); aspect-ratio: 4 / 1; transform: translateX(-50%); pointer-events: none; transition: opacity .4s var(--ease), transform .5s var(--ease); }
.pedestal .plate { position: absolute; inset: 16% 6% 18%; border-radius: 50%;
  background: radial-gradient(60% 70% at 42% 35%, #3a4d61 0%, #1c2733 45%, #0a0f16 100%);
  box-shadow: inset 0 2px 0 rgba(180,210,235,.35), inset 0 -8px 16px rgba(0,0,0,.7), 0 0 0 1.5px var(--ink), 0 18px 40px rgba(0,0,0,.8); }
.pedestal .plate::after { content: ""; position: absolute; inset: 22% 14%; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 35%, transparent), inset 0 0 12px color-mix(in srgb, var(--accent) 25%, transparent); }
.pedestal .ring { position: absolute; inset: 0; border-radius: 50%; overflow: hidden;
  -webkit-mask-image: radial-gradient(closest-side, transparent 84%, #000 88%, #000 96%, transparent 100%); mask-image: radial-gradient(closest-side, transparent 84%, #000 88%, #000 96%, transparent 100%); }
.pedestal .ring::before { content: ""; position: absolute; left: 50%; top: 50%; width: 140%; aspect-ratio: 1; transform: translate(-50%, -50%) scaleY(.25);
  background: conic-gradient(from 0deg, transparent 0 18%, var(--accent) 24%, transparent 34% 62%, rgba(220,240,255,.9) 68%, transparent 78%);
  animation: spin 7s linear infinite; }
@keyframes spin { to { transform: translate(-50%, -50%) scaleY(.25) rotate(360deg); } }
.figure-wrap { position: absolute; left: 50%; bottom: 11.5%; height: 80%; aspect-ratio: 148 / 182; transform: translateX(-50%); pointer-events: none; }
.figure { position: absolute; inset: 0; -webkit-box-reflect: below calc(var(--fig-h, 500px) * -0.043) linear-gradient(transparent 72%, rgba(255,255,255,.16)); }
:host([camera="bust"]) .figure { -webkit-box-reflect: none; }
.figure svg { width: 100%; height: 100%; overflow: visible; }
.sweep { position: absolute; inset: 0; mix-blend-mode: overlay; opacity: .9; pointer-events: none;
  background: linear-gradient(100deg, transparent 38%, rgba(255,255,255,.35) 48%, transparent 58%);
  background-size: 260% 100%; background-position: calc(50% + var(--yaw) * 60%) 0; transition: background-position .2s linear; }
:host([camera="bust"]) .pedestal { opacity: 0; transform: translateX(-50%) translateY(40px); }

/* idle motion — inside the live stage SVG only */
.figure .ag-fig { animation: breathe 3.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
@keyframes breathe { 50% { transform: scaleY(1.009); } }
.figure .ag-cape { animation: sway 4.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 0; }
@keyframes sway { 0%, 100% { transform: rotate(-.7deg) skewX(-.4deg); } 50% { transform: rotate(.7deg) skewX(.4deg); } }
.figure .ag-visor { animation: pulse 2.4s ease-in-out infinite; }
.figure .ag-glow { animation: pulse 3.4s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: .68; } }

/* ── Header & tools ───────────────────────────────────── */
.hdr { position: absolute; left: 32px; top: 26px; right: calc(var(--panel-w) + 280px); pointer-events: none; }
.kicker { font: 600 11px/1 var(--mono); letter-spacing: .28em; color: var(--dim); text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
.kicker::before { content: ""; width: 22px; height: 2px; background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
.callsign { margin: 10px 0 6px; font: 800 clamp(30px, 4.4vw, 54px)/.92 var(--display); letter-spacing: .03em; text-transform: uppercase;
  color: #f4f8fb; text-shadow: 3px 3px 0 var(--ink), 0 0 30px color-mix(in srgb, var(--accent) 35%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font: 600 13px/1.3 var(--display); letter-spacing: .16em; text-transform: uppercase; color: var(--dim); }
.sub b { color: var(--accent); font-weight: 700; }

.toolbar { position: absolute; top: 24px; right: calc(var(--panel-w) + 44px); display: flex; gap: 8px; }
.tool { position: relative; display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px 0 10px;
  font: 700 12px/1 var(--display); letter-spacing: .12em; text-transform: uppercase; color: var(--text);
  background: linear-gradient(180deg, rgba(42,58,74,.85), rgba(12,19,30,.9));
  box-shadow: inset 0 1px 0 rgba(180,210,235,.2), inset 0 0 0 1px rgba(111,138,163,.28), 0 0 0 1px var(--ink);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
  transition: transform .18s var(--ease), box-shadow .18s var(--ease), color .18s; }
.tool svg { width: 18px; height: 18px; }
.tool:hover { transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(180,210,235,.3), inset 0 0 0 1px rgba(34,230,255,.55), 0 0 0 1px var(--ink); color: #fff; }
.tool:disabled { opacity: .38; cursor: default; transform: none; }
.tool kbd, .key { font: 600 10px/1 var(--mono); color: var(--dim); padding: 3px 5px; border-radius: 3px; background: rgba(0,0,0,.4); box-shadow: inset 0 0 0 1px rgba(111,138,163,.35); }

.stage-tools { position: absolute; bottom: 22px; left: calc((100% - var(--panel-w) - 32px) / 2); transform: translateX(-50%); display: flex; gap: 10px; align-items: center; white-space: nowrap; }
.seg { display: inline-flex; padding: 3px; gap: 2px; background: rgba(4,6,11,.7); box-shadow: inset 0 0 0 1px rgba(111,138,163,.3); clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px); }
.seg button { height: 32px; padding: 0 12px; font: 700 11px/1 var(--display); letter-spacing: .14em; text-transform: uppercase; color: var(--dim); transition: color .18s, background .18s; }
.seg button[aria-pressed="true"] { color: var(--ink); background: linear-gradient(180deg, #8af6ff, var(--cyan)); }
.seg button:hover:not([aria-pressed="true"]) { color: var(--text); }
.hint-turn { display: inline-flex; align-items: center; gap: 6px; font: 600 10px/1 var(--mono); letter-spacing: .14em; color: var(--faint); text-transform: uppercase; }
.hint-turn svg { width: 18px; height: 18px; }

.presets { position: absolute; left: 30px; top: 50%; transform: translateY(-42%); display: flex; flex-direction: column; gap: 12px; align-items: center; }
.presets .lbl { font: 600 10px/1 var(--mono); letter-spacing: .24em; color: var(--faint); text-transform: uppercase; }
.preset { display: flex; flex-direction: column; align-items: center; gap: 5px; width: 64px; transition: transform .18s var(--ease); }
.preset .pthumb { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 40% 35%, #1d2e44, #060a12);
  box-shadow: 0 0 0 1.5px var(--ink), 0 0 0 2.5px rgba(111,138,163,.4); transition: box-shadow .18s var(--ease); }
.preset .pthumb svg { width: 100%; height: 100%; }
.preset > span:last-child { font: 700 10px/1 var(--display); letter-spacing: .12em; text-transform: uppercase; color: var(--dim); }
.preset:hover { transform: translateY(-2px); }
.preset:hover .pthumb { box-shadow: 0 0 0 1.5px var(--ink), 0 0 0 2.5px var(--cyan), 0 0 16px rgba(34,230,255,.4); }

/* ── Panel ────────────────────────────────────────────── */
.panel { position: absolute; top: 16px; right: 16px; bottom: 16px; width: var(--panel-w); display: flex; flex-direction: column;
  filter: drop-shadow(0 24px 50px rgba(0,0,0,.65)); transition: transform .26s var(--ease); }
.panel-body { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0;
  background: linear-gradient(180deg, rgba(24,36,52,.94), rgba(8,13,22,.96) 40%, rgba(5,9,15,.97));
  box-shadow: inset 0 1px 0 rgba(180,210,235,.22), inset 0 0 0 1px rgba(111,138,163,.26), inset 0 0 0 2px var(--ink);
  clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px); }
.bracket { position: absolute; width: 16px; height: 16px; border: 2px solid var(--cyan); filter: drop-shadow(0 0 4px rgba(34,230,255,.7)); pointer-events: none; z-index: 2; }
.bracket.tr { right: 6px; top: 6px; border-left: 0; border-bottom: 0; }
.bracket.bl { left: 6px; bottom: 6px; border-right: 0; border-top: 0; }
.handle { display: none; }
.tabs { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); padding: 12px 12px 0 22px; gap: 2px; border-bottom: 1px solid rgba(111,138,163,.2); }
.tab { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 8px 2px 11px; color: var(--faint);
  font: 700 11px/1 var(--display); letter-spacing: .14em; text-transform: uppercase; transition: color .18s var(--ease); }
.tab svg { width: 22px; height: 22px; transition: transform .2s var(--ease); }
.tab:hover { color: var(--text); }
.tab[aria-selected="true"] { color: #fff; }
.tab[aria-selected="true"] svg { color: var(--cyan); filter: drop-shadow(0 0 6px rgba(34,230,255,.6)); transform: translateY(-1px); }
.tab-ind { position: absolute; bottom: -1px; left: 0; height: 3px; background: var(--cyan); box-shadow: 0 0 10px var(--cyan); transition: transform .24s var(--ease), width .24s var(--ease); }

.content { position: relative; flex: 1; overflow-y: auto; overflow-x: hidden; padding: 6px 18px 18px 22px; scrollbar-width: thin; scrollbar-color: #2a3a4a transparent; overscroll-behavior: contain; }
.content.swap { animation: swapIn .22s var(--ease); }
@keyframes swapIn { from { opacity: 0; transform: translateX(var(--swap-dir, 12px)); } }
.section { margin-top: 16px; }
.section h3 { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 10px; font: 700 12px/1 var(--display); letter-spacing: .24em; text-transform: uppercase; color: var(--dim); }
.section h3 .cur { font: 600 12px/1 var(--display); letter-spacing: .08em; color: var(--text); text-transform: none; }
.section h3 .cur.preview { color: var(--cyan); }
.grid { display: grid; gap: 8px; }
.grid.torso, .grid.head, .grid.hair { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
.grid.badge { grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); }
.grid.eye, .grid.skin { grid-template-columns: repeat(6, 1fr); }
.grid.palette { grid-template-columns: repeat(2, 1fr); }
.grid.rifle { grid-template-columns: repeat(3, 1fr); }
.grid.origin, .grid.voice, .grid.class { grid-template-columns: 1fr; }

.opt { position: relative; display: flex; flex-direction: column; gap: 6px; text-align: left; padding: 5px; outline: none;
  background: linear-gradient(180deg, rgba(30,44,60,.7), rgba(8,13,21,.85));
  box-shadow: inset 0 1px 0 rgba(180,210,235,.12), inset 0 0 0 1px rgba(111,138,163,.22);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
  transition: transform .18s var(--ease), box-shadow .18s var(--ease), background .18s var(--ease); }
.opt:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(180,210,235,.2), inset 0 0 0 1px rgba(34,230,255,.5); }
.opt:focus-visible, :host(.kbd) .opt:focus { box-shadow: inset 0 0 0 2px #fff, inset 0 0 0 4px var(--cyan), inset 0 0 22px rgba(34,230,255,.25); background: linear-gradient(180deg, rgba(34,230,255,.2), rgba(8,13,21,.9)); transform: translateY(-2px); }
.opt[aria-checked="true"] { background: linear-gradient(180deg, color-mix(in srgb, var(--cyan) 18%, #13202e), rgba(6,11,18,.92));
  box-shadow: inset 0 1px 0 rgba(180,240,255,.35), inset 0 0 0 1.5px var(--cyan), inset 0 0 18px rgba(34,230,255,.18); }
.opt .tick { position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; padding: 2px; color: var(--ink); background: var(--cyan); clip-path: polygon(0 0, 100% 0, 100% 60%, 60% 100%, 0 100%); opacity: 0; transform: scale(.6); transition: opacity .18s, transform .18s var(--ease); z-index: 2; }
.opt .tick svg { stroke-width: 3.2; }
.opt[aria-checked="true"] .tick { opacity: 1; transform: none; }
.thumb { position: relative; aspect-ratio: 1; background: radial-gradient(circle at 45% 38%, #1a2a3e, #050910 78%); box-shadow: inset 0 0 0 1px var(--ink); overflow: hidden; }
.thumb svg { width: 100%; height: 100%; }
.grid.torso .thumb { aspect-ratio: 1; }
.oname { font: 700 10.5px/1.1 var(--display); letter-spacing: .05em; text-transform: uppercase; color: var(--text); padding: 0 2px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.grid.torso .oname, .grid.head .oname, .grid.hair .oname, .grid.badge .oname, .grid.rifle .oname { min-height: 2.2em; }
.tier { display: flex; gap: 2px; padding: 0 2px 2px; align-items: center; font: 600 8.5px/1 var(--mono); color: var(--faint); letter-spacing: .06em; white-space: nowrap; }
.tier i { width: 8px; height: 3px; background: rgba(111,138,163,.3); }
.tier i.on { background: var(--amber); box-shadow: 0 0 4px rgba(255,174,58,.6); }
.swatch { aspect-ratio: 1; border-radius: 50%; box-shadow: 0 0 0 1.5px var(--ink), inset 0 -4px 6px rgba(0,0,0,.35), inset 0 3px 4px rgba(255,255,255,.25); }
.grid.eye .opt, .grid.skin .opt { padding: 7px 4px; align-items: center; clip-path: none; border-radius: 6px; }
.grid.eye .swatch, .grid.skin .swatch { width: min(36px, 100%); flex: none; }
.grid.eye .swatch { background: radial-gradient(circle, #fff 0 12%, var(--c) 26%, color-mix(in srgb, var(--c) 30%, #000) 70%); box-shadow: 0 0 0 1.5px var(--ink), 0 0 12px color-mix(in srgb, var(--c) 60%, transparent); }
.grid.eye .oname, .grid.skin .oname { display: none; }
.pal { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; height: 44px; gap: 2px; box-shadow: 0 0 0 1px var(--ink); }
.pal i:first-child { grid-row: span 2; }
.badge-tile { aspect-ratio: 1; display: grid; place-items: center; background: radial-gradient(circle at 45% 38%, #1a2a3e, #050910 78%); box-shadow: inset 0 0 0 1px var(--ink); }
.badge-tile svg { width: 64%; height: 64%; }
.grid.rifle .thumb { aspect-ratio: 2.4; }
.card { padding: 10px 12px 11px; gap: 4px; }
.card .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.card .desc { font: 500 12.5px/1.35 var(--display); color: var(--dim); letter-spacing: .02em; }
.card .oname { font-size: 14px; letter-spacing: .12em; }
.perk { display: inline-flex; align-self: flex-start; margin-top: 3px; padding: 3px 7px; font: 700 10.5px/1 var(--mono); letter-spacing: .06em; color: var(--ink); background: var(--energy); clip-path: polygon(0 0, 100% 0, calc(100% - 5px) 100%, 0 100%); }
.play { flex: none; width: 38px; height: 38px; display: grid; place-items: center; color: var(--cyan); border-radius: 50%; box-shadow: inset 0 0 0 1.5px rgba(34,230,255,.5); transition: background .18s, color .18s, transform .18s var(--ease); }
.play svg { width: 16px; height: 16px; margin-left: 2px; }
.play:hover, .play:focus-visible { background: var(--cyan); color: var(--ink); outline: none; transform: scale(1.06); }
.play.ping { animation: ping .5s var(--ease); }
@keyframes ping { 40% { box-shadow: inset 0 0 0 1.5px var(--cyan), 0 0 0 8px rgba(34,230,255,.2); } }
.stats { display: grid; grid-template-columns: 70px 1fr 42px; gap: 5px 8px; align-items: center; margin-top: 6px; }
.stats span { font: 600 10px/1 var(--mono); letter-spacing: .08em; color: var(--dim); text-transform: uppercase; }
.stats b { font: 700 11px/1 var(--mono); text-align: right; color: var(--text); }
.stats b.up { color: #3dff8a; } .stats b.down { color: var(--crimson); }
.bar { position: relative; height: 6px; background: rgba(111,138,163,.18); box-shadow: inset 0 0 0 1px rgba(0,0,0,.6); }
.bar i { position: absolute; left: 0; top: 0; bottom: 0; width: var(--w); background: linear-gradient(90deg, #1a8aa0, var(--cyan)); box-shadow: 0 0 6px rgba(34,230,255,.5); transition: width .3s var(--ease); }
.bar i.base { background: rgba(228,237,245,.2); box-shadow: none; }
.locked .thumb svg, .locked .stats { filter: saturate(.2) brightness(.7); }
.lock { display: inline-flex; align-items: center; gap: 5px; font: 700 10px/1.2 var(--mono); color: var(--amber); letter-spacing: .06em; }
.lock svg { width: 13px; height: 13px; flex: none; }
.opt.locked { cursor: not-allowed; }
.opt.shake { animation: shake .36s; }
@keyframes shake { 20%, 60% { transform: translateX(-4px); } 40%, 80% { transform: translateX(4px); } }
.rifle-hero { margin: 4px 0 10px; height: 92px; perspective: 700px; display: grid; place-items: center;
  background: radial-gradient(60% 80% at 50% 50%, color-mix(in srgb, var(--accent) 18%, #0c1522), #04070c 80%); box-shadow: inset 0 0 0 1px var(--ink), inset 0 0 0 2px rgba(111,138,163,.2); }
.rifle-hero .spin { width: 82%; animation: turntable 7s ease-in-out infinite; transform-style: preserve-3d; }
@keyframes turntable { 0%, 100% { transform: rotateY(-28deg) rotateX(8deg); } 50% { transform: rotateY(28deg) rotateX(8deg); } }

.field { position: relative; display: block; }
.field input { width: 100%; height: 50px; padding: 0 64px 0 16px; font: 800 24px/1 var(--display); letter-spacing: .06em; text-transform: uppercase; color: #fff;
  background: rgba(2,4,8,.8); border: 0; outline: none; user-select: text; -webkit-user-select: text;
  box-shadow: inset 0 0 0 1px rgba(111,138,163,.35), inset 0 2px 8px rgba(0,0,0,.6);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%); transition: box-shadow .18s; }
.field input:focus { box-shadow: inset 0 0 0 2px var(--cyan), inset 0 2px 8px rgba(0,0,0,.6), inset 0 0 20px rgba(34,230,255,.12); }
.field input[aria-invalid="true"] { box-shadow: inset 0 0 0 2px var(--crimson), inset 0 2px 8px rgba(0,0,0,.6); }
.field .count { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font: 600 11px/1 var(--mono); color: var(--faint); }
.err { min-height: 16px; margin: 6px 0 0; font: 600 11px/1.3 var(--mono); color: var(--crimson); }
.err.ok { color: var(--faint); }

.actions { display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 12px 22px 18px; border-top: 1px solid rgba(111,138,163,.2); background: linear-gradient(180deg, rgba(4,7,12,.3), rgba(4,7,12,.7)); }
.keys { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px 12px; font: 600 10px/1 var(--mono); color: var(--faint); letter-spacing: .06em; }
.keys span { display: inline-flex; gap: 5px; align-items: center; }
.btn { position: relative; height: 50px; padding: 0 18px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  font: 800 15px/1 var(--display); letter-spacing: .18em; text-transform: uppercase; outline: none;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  transition: transform .18s var(--ease), filter .18s var(--ease), box-shadow .18s; }
.btn.ghost { color: var(--text); background: linear-gradient(180deg, rgba(42,58,74,.8), rgba(12,19,30,.9)); box-shadow: inset 0 1px 0 rgba(180,210,235,.2), inset 0 0 0 1px rgba(111,138,163,.35); }
.btn.ghost:hover, .btn.ghost:focus-visible, :host(.kbd) .btn.ghost:focus { box-shadow: inset 0 1px 0 rgba(180,210,235,.3), inset 0 0 0 2px var(--cyan); }
.btn.primary { color: #fff4f0; text-shadow: 1px 1px 0 rgba(60,0,10,.7); overflow: hidden;
  background: linear-gradient(180deg, #ff5a6e 0%, var(--crimson) 38%, #a3122a 100%);
  box-shadow: inset 0 1px 0 rgba(255,210,215,.6), inset 0 0 0 1px rgba(60,0,10,.8), inset 0 -3px 0 rgba(80,0,16,.5); }
.btn.primary::after { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent); transform: skewX(-18deg); transition: left .5s var(--ease); }
.btn.primary:hover::after, .btn.primary:focus-visible::after { left: 120%; }
.btn.primary:hover, .btn.primary:focus-visible, :host(.kbd) .btn.primary:focus { filter: brightness(1.12); transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,210,215,.6), inset 0 0 0 2px #fff, inset 0 -3px 0 rgba(80,0,16,.5); }
.btn.primary[aria-disabled="true"] { filter: saturate(.3) brightness(.7); cursor: not-allowed; }
.btn .key { color: rgba(255,240,240,.8); background: rgba(60,0,10,.35); box-shadow: inset 0 0 0 1px rgba(255,200,205,.35); }
.btn:active { transform: translateY(1px); }

.toast { position: absolute; left: calc((100% - var(--panel-w) - 32px) / 2); bottom: 80px; transform: translate(-50%, 12px); white-space: nowrap; padding: 10px 16px; opacity: 0; pointer-events: none;
  font: 700 12px/1 var(--display); letter-spacing: .12em; text-transform: uppercase; color: var(--ink); background: var(--amber);
  clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%); transition: opacity .2s, transform .2s var(--ease); }
.toast.on { opacity: 1; transform: translate(-50%, 0); }

.confirm { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(2,4,8,.72); backdrop-filter: blur(4px); animation: fadeIn .18s var(--ease); z-index: 10; }
.confirm[hidden] { display: none; }
@keyframes fadeIn { from { opacity: 0; } }
.dialog { position: relative; width: min(420px, 90vw); padding: 24px 24px 20px; background: linear-gradient(180deg, #1a2638, #080d16); box-shadow: inset 0 1px 0 rgba(180,210,235,.25), inset 0 0 0 1px rgba(111,138,163,.35), inset 0 0 0 2px var(--ink);
  clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); animation: pop .22s var(--ease); }
@keyframes pop { from { transform: scale(.94); opacity: 0; } }
.dialog h2 { margin: 0 0 8px; font: 800 22px/1 var(--display); letter-spacing: .1em; text-transform: uppercase; }
.dialog p { margin: 0 0 18px; font: 500 14px/1.4 var(--display); color: var(--dim); }
.dialog .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.btn.danger { color: #fff; background: linear-gradient(180deg, #3a1219, #1a0609); box-shadow: inset 0 0 0 1px rgba(255,42,74,.6); }
.btn.danger:hover, .btn.danger:focus-visible, :host(.kbd) .btn.danger:focus { box-shadow: inset 0 0 0 2px var(--crimson); }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
button:focus-visible { outline: none; }
.tab:focus-visible, :host(.kbd) .tab:focus, .tool:focus-visible, :host(.kbd) .tool:focus, .seg button:focus-visible, .preset:focus-visible, :host(.kbd) .preset:focus { outline: 2px solid var(--cyan); outline-offset: 2px; }

/* ── Phones (landscape) — panel becomes a collapsible sheet ── */
@media (max-height: 500px) {
  :host { --panel-w: 56vw; }
  .panel { top: 6px; right: 6px; bottom: 6px; }
  .panel-body { clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px); }
  .handle { display: flex; position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 64px; height: 18px; align-items: center; justify-content: center; color: var(--dim); z-index: 3; }
  .handle svg { width: 18px; height: 18px; transform: rotate(0); transition: transform .26s var(--ease); }
  :host([sheet="collapsed"]) .panel { transform: translateY(calc(100% - 68px)); }
  :host([sheet="collapsed"]) .handle svg { transform: rotate(180deg); }
  :host([sheet="collapsed"]) .stage { right: 0; }
  :host([sheet="collapsed"]) .hdr { right: 180px; }
  .stage { right: calc(var(--panel-w) + 8px); }
  .tabs { padding: 16px 8px 0 12px; }
  .tab { padding: 4px 0 8px; font-size: 10px; letter-spacing: .06em; gap: 3px; }
  .tab svg { width: 20px; height: 20px; }
  .content { padding: 0 10px 12px 12px; }
  .section { margin-top: 10px; }
  .actions { padding: 8px 12px 10px; grid-template-columns: 1fr 1.6fr; }
  .keys { display: none; }
  .btn { height: 44px; font-size: 13px; letter-spacing: .12em; }
  .btn .key { display: none; }
  .hdr { left: 14px; top: 10px; right: calc(var(--panel-w) + 20px); }
  .kicker { display: none; }
  .callsign { margin: 0 0 2px; font-size: 22px; }
  .sub { font-size: 10px; letter-spacing: .1em; }
  .toolbar { top: auto; bottom: 64px; right: auto; left: 10px; flex-direction: column; gap: 6px; }
  .tool { height: 40px; width: 44px; padding: 0; justify-content: center; }
  .tool .t, .tool kbd { display: none; }
  .presets { left: auto; right: calc(var(--panel-w) + 16px); top: 60px; bottom: auto; transform: none; flex-direction: column; gap: 6px; }
  :host([sheet="collapsed"]) .presets { right: 10px; }
  .presets .lbl, .preset > span:last-child { display: none; }
  .preset { width: 40px; }
  .preset .pthumb { width: 40px; height: 40px; }
  .stage-tools { bottom: 8px; margin-left: 0; left: 64px; transform: none; gap: 6px; }
  .seg button { height: 40px; padding: 0 9px; font-size: 10px; letter-spacing: .08em; }
  .hint-turn { display: none; }
  .figure-wrap { bottom: 16%; height: 70%; }
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
  .presets, .stage-tools .hint-turn { display: none; }
  .stage-tools { margin-left: 0; bottom: calc(56vh + 8px); left: 12px; transform: none; }
  .toast { left: 50%; bottom: calc(56vh + 60px); }
}
@media (hover: none) { .opt:hover, .tool:hover, .preset:hover { transform: none; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: .01ms !important; }
}
`;

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
      tabInd: $(".tab-ind"),
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
  <div class="backdrop"><div class="shaft"></div><div class="haze h1"></div><div class="haze h2"></div><div class="floor"></div><div class="grain"></div><div class="vignette"></div></div>
  <section class="stage" tabindex="0" aria-label="Agent preview. Drag or use the arrow keys to turn the agent.">
    <div class="rim r1"></div><div class="rim r2"></div>
    <div class="pedestal"><div class="ring"></div><div class="plate"></div></div>
    <div class="figure-wrap"><div class="figure"></div><div class="sweep"></div></div>
  </section>
  <header class="hdr">
    <div class="kicker">Chronos Bureau · Field Armory</div>
    <h1 class="callsign">Agent</h1>
    <div class="sub"></div>
  </header>
  <div class="toolbar" role="toolbar" aria-label="Edit">
    <button class="tool" data-act="undo" aria-label="Undo last change">${I.undo}<span class="t">Undo</span><kbd>Z</kbd></button>
    <button class="tool" data-act="reset" aria-label="Reset appearance to standard issue">${I.reset}<span class="t">Reset</span></button>
    <button class="tool" data-act="random" aria-label="Randomize appearance">${I.dice}<span class="t">Randomize</span><kbd>R</kbd></button>
  </div>
  <div class="presets" role="group" aria-label="Presets"><span class="lbl">Presets</span>${presets}</div>
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
    <span class="bracket tr"></span><span class="bracket bl"></span>
    <div class="panel-body">
      <button class="handle" aria-label="Collapse panel" aria-expanded="true">${I.chevron}</button>
      <div class="tabs" role="tablist" aria-label="Categories">${tabs}<span class="tab-ind"></span></div>
      <div class="content" id="panel" role="tabpanel"></div>
      <footer class="actions">
        <div class="keys" aria-hidden="true">
          <span><kbd class="key">Tab</kbd>Category</span><span><kbd class="key">↑↓←→</kbd>Browse</span><span><kbd class="key">Enter</kbd>Select</span>
          <span><kbd class="key">R</kbd>Random</span><span><kbd class="key">Z</kbd>Undo</span><span><kbd class="key">Esc</kbd>Back</span>
        </div>
        <button class="btn ghost back">Back</button>
        <button class="btn primary save">Save &amp; Deploy <kbd class="key">⇧⏎</kbd></button>
      </footer>
    </div>
  </aside>
  <div class="toast" role="status" aria-live="polite"></div>
  <div class="sr live" aria-live="polite"></div>
  <div class="confirm" hidden>
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d">
      <h2 id="cf-t">Discard changes?</h2>
      <p id="cf-d">Your agent has unsaved changes. Leaving now restores the last saved loadout.</p>
      <div class="row"><button class="btn ghost" data-confirm="keep">Keep editing</button><button class="btn danger" data-confirm="discard">Discard</button></div>
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
      return;
    }
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
  }

  open() {
    this.isOpen = true;
    this.setAttribute("open", "");
    requestAnimationFrame(() => this.setAttribute("shown", ""));
    this.renderAll();
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
    if (item.unlocked === false) {
      el?.classList.remove("shake");
      void el?.offsetWidth;
      el?.classList.add("shake");
      this.toast(`${item.name} locked · ${LOCK_HINTS[item.id] || "Classified"}`);
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
    const unlocked = LOADOUT_CLASSES.map((c, i) => (c.unlocked === false ? -1 : i)).filter((i) => i >= 0);
    if (unlocked.length > 1) next.loadoutIndex = unlocked[r(unlocked.length)];
    this.commit(next);
    this.sfx("menuConfirm");
    this.flashStage();
    this.announce("Randomized appearance");
  }

  applyPreset(i) {
    const p = PRESETS[i];
    if (!p) return;
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
    this.game._exitCreator(true);
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
    g._creatorExitTime = performance.now();
    g._exitCreator(false);
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
    this.style.setProperty("--yaw", y.toFixed(3));
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
    this.positionTabIndicator();
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
    this.positionTabIndicator();
    if (rebuildContent) this.renderContent(swapDir);
    else this.refreshContent();
    this.renderPresets();
    this.renderStage();
    this.renderHeader();
    this.el.undo.disabled = this.undoStack.length === 0;
  }

  positionTabIndicator() {
    const tab = this.el.tabs[this.category];
    if (!tab || !tab.offsetWidth) return;
    this.el.tabInd.style.width = `${tab.offsetWidth - 16}px`;
    this.el.tabInd.style.transform = `translateX(${tab.offsetLeft + 8}px)`;
  }

  renderHeader() {
    const ch = this.effective();
    this.el.callsign.textContent = ch.name || "Agent";
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
    const key = `${pose}|${peek}|${APPEARANCE.concat(["loadoutIndex", "backstoryIndex"]).map((k) => ch[k]).join(",")}`;
    if (key === this._stageKey) return;
    this._stageKey = key;
    let markup = this._stageCache.get(key);
    if (!markup) {
      markup = buildAgentSvg(ch, { pose, peek, idPrefix: "st-" });
      this._stageCache.set(key, markup);
      if (this._stageCache.size > 48) this._stageCache.delete(this._stageCache.keys().next().value);
    }
    this.el.figure.innerHTML = markup;
    this.applyView();
    this.applyYaw();
  }

  renderPresets() {
    if (this._presetsBuilt) return;
    this._presetsBuilt = true;
    this.el.presets.querySelectorAll(".preset").forEach((btn, i) => {
      const ch = { ...DEFAULT_CHARACTER, ...PRESETS[i].ch };
      btn.querySelector(".pthumb").innerHTML = buildAgentSvg(ch, { view: [-22, -106, 44, 44], idPrefix: `ps${i}-`, lighting: "flat" });
    });
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
    return `<div class="section" data-key="${s.key}"><h3><span>${s.title}</span><span class="cur"></span></h3>${extra}<div class="grid ${s.kind}" role="radiogroup" aria-label="${s.title}">${items}</div></div>`;
  }

  optionHtml(s, item, i) {
    const locked = item.unlocked === false;
    const attrs = `class="opt${s.kind === "origin" || s.kind === "voice" || s.kind === "class" ? " card" : ""}${locked ? " locked" : ""}" role="radio" aria-checked="false" data-key="${s.key}" data-idx="${i}" tabindex="-1"`;
    const label = `${item.name}${item.desc ? `. ${item.desc}` : ""}${item.perk ? `. Perk: ${item.perk}` : ""}${locked ? `. Locked: ${LOCK_HINTS[item.id] || "classified"}` : ""}`;
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
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="row"><span class="oname">${esc(item.name)}</span></span><span class="desc">${esc(item.desc)}</span><span class="perk">${esc(item.perk)}</span></button>`;
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
        const lock = locked ? `<span class="lock">${I.lock}${esc(LOCK_HINTS[item.id] || "Classified")}</span>` : "";
        return `<button ${attrs} aria-label="${esc(label)}" aria-disabled="${locked}">${tick}<span class="row"><span class="oname">${esc(item.name)}</span>${lock}</span><span class="desc">${esc(item.desc)}</span><span class="stats" aria-hidden="true">${stats}</span></button>`;
      }
      case "rifle":
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="thumb" data-thumb="rifle"></span><span class="oname">${esc(item.name)}</span></button>`;
      default:
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="thumb" data-thumb="${s.kind}"></span><span class="oname">${esc(item.name)}</span>${tier}</button>`;
    }
  }

  /** Update checked states and rebuild thumbnails whose look depends on the character. */
  refreshContent(force = false) {
    const ch = this.character;
    const sig = APPEARANCE.map((k) => ch[k]).join(",");
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
          thumb.innerHTML = buildAgentSvg(variant, { headOnly: true, idPrefix: id });
          break;
        case "hair":
          thumb.innerHTML = buildAgentSvg(variant, { headOnly: true, peek: true, idPrefix: id });
          break;
        case "torso":
          thumb.innerHTML = buildAgentSvg(variant, { view: AGENT_VIEW.torso, idPrefix: id, lighting: "flat" });
          break;
        case "rifle":
          thumb.innerHTML = buildRifleSvg(variant, { idPrefix: id });
          break;
        default:
      }
    });
    const spin = this.shadowRoot.querySelector(".rifle-hero .spin");
    if (spin && (force || spin.dataset.sig !== sig)) {
      spin.dataset.sig = sig;
      spin.innerHTML = buildRifleSvg(ch, { idPrefix: `rh${this._thumbSeq++}-` });
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
