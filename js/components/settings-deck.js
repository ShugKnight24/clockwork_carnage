/**
 * <settings-deck>: the settings panel beside the live game view. One DOM and
 * one behaviour in three skins (host `skin` = html[data-art-profile]).
 *
 * What is shown where comes from src/ui/settings-sections.js, every key rule
 * from src/ui/settings-deck-model.js, and every change goes through
 * src/ui/settings-apply.js, so this file is DOM, pointer and skin only. The
 * game routes keys here (handleKey) the way it does for <agent-showroom>.
 */
import { SECTIONS, SECTION_OF, rowsForSection, QUICK_CARDS, ART_CARDS } from "../../src/ui/settings-sections.js";
import { applySettingValue, stepSetting, resetSetting } from "../../src/ui/settings-apply.js";
import { createDeckState, deckKey, deckKeyUp } from "../../src/ui/settings-deck-model.js";
import { SETTINGS_REGISTRY, settingDisplayItem } from "../settings-registry.js";
import { activeDevice, renderDomGlyphs, GLYPH_CSS } from "../../src/ui/input-glyphs.js";
import { COLOR, tokensCss } from "../../src/ui/design-tokens.js";
import { onArtStyleChange } from "../../src/rendering/art-style.js";

const SHEET_BELOW = 700; // px: narrower windows get the bottom sheet

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const defOf = (key) => SETTINGS_REGISTRY.find((d) => d.key === key);
const decimals = (step) => (String(step).split(".")[1] || "").length;

// "Accessibility & HUD" does not fit a six-tab strip; the tab says less.
const TAB_LABEL = { access: "Access & HUD" };
const ART_DESC = [
  "The original neon look: glowing lines, pixel sprites.",
  "Inked comic art with bold outlines and halftone.",
  "Realistic lighting, soft shadows and a film grade.",
];
// Releasing a volume slider plays a sample on its bus.
const VOLUME_SAMPLE = {
  masterVolume: (a) => a.shootPistol(),
  sfxVolume: (a) => a.shootPistol(),
  musicVolume: (a) => a.musicSting(),
  voiceVolume: (a) => a.speak("Systems nominal.", "aria", { channel: "comms" }),
};
// Keys and the d-pad have no release per step: sample once the nudges pause.
const SAMPLE_AFTER_MS = 300;
const RESET_DESC = "Put every setting in this section back to its default.";

const ICON = {
  battery: '<rect x="3" y="7" width="15" height="10" rx="1.5"/><path d="M21 10.5v3M6.5 10v4"/>',
  balanced: '<path d="M4 16.5a8 8 0 0 1 16 0"/><path d="M12 16.5l4-5"/>',
  max: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  custom: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  pad: '<path d="M7.5 7h9a4.5 4.5 0 0 1 4.3 5.8l-1.2 4a2.4 2.4 0 0 1-4.1.9L13.8 16h-3.6l-1.7 1.7a2.4 2.4 0 0 1-4.1-.9l-1.2-4A4.5 4.5 0 0 1 7.5 7z"/><path d="M8 10v3M6.5 11.5h3"/><circle cx="16" cy="10.5" r=".6"/><circle cx="17.5" cy="12.5" r=".6"/>',
  prev: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  next: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
};
const svg = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

// Structure and the Comic look (the default art style) first; Legacy and
// Modern override the --d-* palette plus a few shapes below. Colours are the
// design tokens, the legacy menu colours from style.css, and the showroom's
// Modern palette.
const STYLE = `
${tokensCss(":host")}
:host {
  --d-font: var(--cc-font); --d-head: var(--cc-font);
  --d-text: var(--cc-text); --d-dim: var(--cc-text-dim); --d-faint: var(--cc-text-faint);
  --d-accent: var(--cc-cyan); --d-group: var(--cc-text);
  --d-note: var(--cc-amber); --d-line: var(--cc-hairline); --d-line-hi: rgba(130, 160, 188, 0.4);
  --d-panel: var(--cc-panel-menu); --d-focus: rgba(34, 230, 255, 0.1); --d-track: rgba(2, 4, 8, 0.9);
  --panel-w: clamp(360px, 32vw, 480px);
  position: fixed; inset: 0; z-index: 150; display: none; pointer-events: none;
  font: 500 15px/1.35 var(--d-font); color: var(--d-text);
  -webkit-font-smoothing: antialiased; user-select: none; -webkit-user-select: none;
}
:host([open]) { display: block; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; text-align: inherit; }
svg { display: block; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
p { margin: 0; }
[hidden] { display: none !important; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
:host(:not([input="gamepad"])) .in-pad, :host([input="gamepad"]) .in-kb { display: none !important; }
.in-pad, .in-kb { display: inline-flex; align-items: center; gap: 4px; }

/* Readability gradient under the panel; the canvas itself is never filtered. */
.shade { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, transparent calc(100% - var(--panel-w) - 38vw), rgba(4, 6, 11, 0.62) calc(100% - var(--panel-w) + 20px)); }
.panel { position: absolute; top: 0; right: 0; bottom: 0; width: var(--panel-w); pointer-events: auto; }
.body { position: absolute; inset: 0; display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; min-height: 0;
  background: var(--d-panel); border-left: 1px solid var(--d-line); }

/* ── Header ── */
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 16px 10px 22px; }
.title { margin: 0; font: 800 var(--cc-type-heading)/1 var(--d-head); letter-spacing: 0.12em; text-transform: uppercase; }
.back { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px; outline: none;
  font: 700 var(--cc-type-label)/1 var(--d-font); letter-spacing: 0.14em; text-transform: uppercase; color: var(--d-dim);
  border: 1px solid var(--d-line-hi); transition: color var(--cc-dur-fast), border-color var(--cc-dur-fast), background var(--cc-dur-fast); }
.back:hover, .back:focus-visible { color: var(--d-text); border-color: var(--d-accent); }
.back:focus-visible { outline: 2px solid var(--d-accent); outline-offset: 2px; }
.key { display: inline-flex; align-items: center; justify-content: center; min-width: 1.9em; height: 1.9em; padding: 0 0.45em;
  font: 700 var(--cc-type-keycap)/1 var(--cc-font); letter-spacing: 0.04em; color: var(--cc-text); text-transform: none;
  background: var(--cc-keycap); border: 1px solid var(--cc-ink); border-radius: var(--cc-keycap-radius); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35); }

/* ── Tabs ── */
.tabs { position: relative; display: flex; gap: 2px; margin: 0 12px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--d-line); }
.tabs::-webkit-scrollbar { display: none; }
/* A strip too narrow for every tab fades at the edge that has more. */
.tabs.more-r { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); }
.tabs.more-l { -webkit-mask-image: linear-gradient(90deg, transparent, #000 28px); mask-image: linear-gradient(90deg, transparent, #000 28px); }
.tabs.more-l.more-r { -webkit-mask-image: linear-gradient(90deg, transparent, #000 28px, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, transparent, #000 28px, #000 calc(100% - 28px), transparent); }
[role="tab"] { position: relative; flex: 1 0 auto; min-height: 44px; padding: 0 9px; outline: none; white-space: nowrap; text-align: center;
  font: 700 var(--cc-type-label)/1 var(--d-font); letter-spacing: 0.1em; text-transform: uppercase; color: var(--d-dim);
  transition: color var(--cc-dur-fast), background var(--cc-dur-fast); }
[role="tab"]:hover { color: var(--d-text); }
[role="tab"][aria-selected="true"] { color: var(--d-text); }
[role="tab"][aria-selected="true"]::after { content: ""; position: absolute; left: 8px; right: 8px; bottom: 0; height: 2px; background: var(--d-accent); }
[role="tab"]:focus-visible, :host(.kbd) [role="tab"]:focus { box-shadow: inset 0 0 0 2px var(--d-accent); }

/* ── Rows ── */
.rows { min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; padding: 2px 12px 18px;
  scrollbar-width: thin; scrollbar-color: var(--d-line-hi) transparent; }
.group { display: flex; align-items: center; gap: 10px; margin: 18px 4px 6px 10px; font: 700 var(--cc-type-section)/1 var(--d-head);
  letter-spacing: var(--cc-track-section); text-transform: uppercase; color: var(--d-group); }
.group::after { content: ""; flex: 1; height: 1px; background: var(--d-line); }
.row { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: 12px; width: 100%;
  min-height: 48px; padding: 2px 8px 2px 14px; cursor: pointer; outline: none; transition: background var(--cc-dur-fast), box-shadow var(--cc-dur-fast); }
.row.focused { background: var(--d-focus); box-shadow: inset 3px 0 0 var(--d-accent); }
:host(.kbd) .row:focus { box-shadow: inset 3px 0 0 var(--d-accent), inset 0 0 0 1px var(--d-accent); }
.label { font: 600 var(--cc-type-row)/1.2 var(--d-font); letter-spacing: 0.02em; overflow-wrap: anywhere; }
.pips { display: inline-flex; gap: 2px; margin-left: 8px; vertical-align: 2px; }
.pips i { width: 3px; height: 8px; background: var(--d-line-hi); }
.pips[data-cost="low"] i:nth-child(-n+1), .pips[data-cost="med"] i:nth-child(-n+2), .pips[data-cost="high"] i { background: var(--pip); }
[data-cost="low"] { --pip: var(--cc-green); } [data-cost="med"] { --pip: var(--cc-amber); } [data-cost="high"] { --pip: var(--cc-crimson); }
.value { display: flex; align-items: center; justify-content: flex-end; gap: 10px; font: 700 var(--cc-type-body)/1 var(--d-font);
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--d-dim); white-space: nowrap; }
.row.focused .value { color: var(--d-text); }

/* Switch */
.sw { position: relative; flex: none; width: 42px; height: 22px; background: var(--d-track); border: 2px solid var(--cc-ink);
  box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.5); transition: background var(--cc-dur-base) var(--cc-ease); }
.sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: var(--cc-keycap); border: 1px solid var(--cc-ink);
  transition: transform var(--cc-dur-base) var(--cc-ease); }
[aria-checked="true"] .sw { background: var(--cc-caption-cyan); }
[aria-checked="true"] .sw::after { transform: translateX(20px); }
.capped .sw { background: repeating-linear-gradient(135deg, rgba(255, 174, 58, 0.45) 0 4px, rgba(255, 174, 58, 0.12) 4px 8px); }
.capped .vt { color: var(--d-note); }

/* Slider */
.row[data-kind="slider"] { grid-template-rows: auto auto; padding-block: 10px 12px; touch-action: pan-y; }
.track { grid-column: 1 / -1; position: relative; height: 6px; margin: 10px 2px 0 0; background: var(--d-track); box-shadow: 0 0 0 1.5px var(--cc-ink); }
.track i { position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--f) * 100%); background: var(--d-accent); }
.track b { position: absolute; top: 50%; left: calc(var(--f) * 100%); width: 10px; height: 18px; transform: translate(-50%, -50%);
  background: var(--cc-keycap); border: 1.5px solid var(--cc-ink); }
.row.focused .track b { background: var(--d-text); }

/* Stepper */
.value .step { display: grid; place-items: center; width: 44px; min-height: 44px; margin: -2px 0; color: var(--d-faint); transition: color var(--cc-dur-fast); }
.value .step svg { width: 16px; height: 16px; stroke-width: 2.4; }
.row.focused .step, .step:hover { color: var(--d-accent); }
.row[data-kind="enum"] .value { gap: 0; }
.row[data-kind="enum"] .vt { min-width: 6.6em; text-align: center; }

/* Action */
.chip { padding: 7px 10px 6px; font: 700 var(--cc-type-label)/1 var(--d-font); letter-spacing: 0.12em; border: 1px solid var(--d-line-hi); color: var(--d-text); }
.row.focused .chip { border-color: var(--d-accent); color: var(--d-accent); }
.row.reset { grid-template-columns: 1fr; margin-top: 18px; text-align: center; }
.row.reset .label { font: 700 var(--cc-type-label)/1 var(--d-font); letter-spacing: 0.14em; text-transform: uppercase; color: var(--d-dim); }
.row.reset.focused .label { color: var(--d-text); }

/* Quick cards */
.cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cards.art { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.cards.pad { grid-template-columns: minmax(0, 1fr); }
.row.card.padcard { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; column-gap: 12px; min-height: 64px; }
.padcard .cdesc { grid-column: 2; margin-top: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.padcard .label { grid-column: 2; }
.padcard .ico { grid-row: 1 / 3; }
.padcard .chip { grid-column: 3; grid-row: 1 / 3; }
.row.card.padcard.focused .chip { border-color: var(--d-accent); color: var(--d-accent); }
.row.card { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 10px; min-height: 88px; padding: 12px;
  border: 1px solid var(--d-line-hi); background: rgba(255, 255, 255, 0.02); }
.card .ico { width: 26px; height: 26px; color: var(--d-dim); }
.card[aria-current="true"] { border-color: var(--d-accent); }
.card[aria-current="true"] .ico { color: var(--d-accent); }
.card[aria-current="true"]::after { content: ""; position: absolute; top: 9px; right: 9px; width: 8px; height: 8px; background: var(--d-accent); box-shadow: 0 0 0 2px var(--cc-ink); }
.row.card.focused { box-shadow: inset 0 0 0 1px var(--d-accent); }
.card .label { font-size: var(--cc-type-body); letter-spacing: 0.12em; text-transform: uppercase; }
.card .cdesc { margin-top: -4px; font: 500 var(--cc-type-label)/1.35 var(--d-font); color: var(--d-dim); }
.art .row.card { padding: 8px 8px 10px; gap: 8px; }
/* Each art card previews its own style, whatever the deck's skin (so literal
   ink: the Modern skin blanks --cc-ink). */
.thumb { position: relative; display: grid; place-items: center; width: 100%; aspect-ratio: 16 / 10; overflow: hidden; }
.thumb b { font-size: 22px; line-height: 1; }
.thumb.s0 { background: repeating-linear-gradient(0deg, rgba(0, 255, 204, 0.08) 0 1px, transparent 1px 4px), radial-gradient(ellipse at center, #0a0a2e, #020210 80%); border: 1px solid rgba(0, 200, 255, 0.35); }
.thumb.s0 b { font-family: "Courier New", monospace; color: var(--cc-energy); text-shadow: 0 0 10px rgba(0, 255, 200, 0.7); }
.thumb.s1 { background: radial-gradient(rgba(4, 6, 11, 0.16) 1px, transparent 1.4px) 0 0 / 5px 5px, var(--cc-cream); border: 2px solid ${COLOR.ink}; box-shadow: inset 0 -10px 0 rgba(34, 230, 255, 0.35); }
.thumb.s1 b { font-family: var(--cc-font); font-weight: 900; color: ${COLOR.ink}; text-shadow: 2px 2px 0 ${COLOR.cyan}; }
.thumb.s2 { background: radial-gradient(ellipse 70% 80% at 30% 20%, rgba(255, 236, 214, 0.2), transparent 70%), linear-gradient(180deg, #2a2d30, #0a0b0c); border: 1px solid rgba(228, 230, 225, 0.2); }
.thumb.s2 b { font-family: var(--cc-font); font-weight: 300; color: #e4e6e1; letter-spacing: 0.08em; }

/* ── Footer ── */
footer { position: relative; display: grid; gap: 8px; padding: 12px 16px calc(14px + env(safe-area-inset-bottom)) 22px; border-top: 1px solid var(--d-line); }
.desc { min-height: 2.7em; font: 500 var(--cc-type-body)/1.35 var(--d-font); color: var(--d-dim); }
.note { font: 600 var(--cc-type-label)/1.35 var(--d-font); color: var(--d-note); }
.note:empty { display: none; }
.cost { display: inline-flex; align-items: center; gap: 8px; font: 700 var(--cc-type-label)/1 var(--d-font); letter-spacing: 0.1em; text-transform: uppercase; color: var(--d-dim); }
.cost .pips { margin: 0; }
.prompts { display: flex; flex-wrap: wrap; gap: 6px 14px; font: 700 var(--cc-type-micro)/1 var(--d-font); letter-spacing: 0.12em; text-transform: uppercase; color: var(--d-faint); }
.prompts > span { gap: 5px; }
:host(:not([section="video"])) .p-compare, :host([input="touch"]) .prompts { display: none !important; }
.confirm { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; padding: 8px 8px 8px 12px; border: 1px solid var(--d-note); }
.confirm p { font: 600 var(--cc-type-body)/1.3 var(--d-font); color: var(--d-text); }
.confirm button { min-height: 44px; padding: 0 12px; font: 700 var(--cc-type-label)/1 var(--d-font); letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid var(--d-line-hi); outline: none; }
.confirm button:hover, .confirm button:focus-visible { border-color: var(--d-accent); }
.confirm [data-confirm="yes"] { color: var(--cc-primary-text); background: var(--cc-primary); border-color: var(--cc-ink); }

/* ── Bottom sheet (narrow windows) ── */
:host([layout="sheet"]) { --panel-w: 100vw; }
:host([layout="sheet"]) .shade { background: linear-gradient(180deg, transparent 28%, rgba(4, 6, 11, 0.62) 42%); }
:host([layout="sheet"]) .panel { top: auto; left: 0; width: auto; height: min(62vh, 640px); }
:host([layout="sheet"]) .body { border-left: 0; border-top: 1px solid var(--d-line); }
:host([layout="sheet"]) .head { padding: 14px 12px 6px 16px; }
:host([layout="sheet"]) .title { font-size: var(--cc-type-row); }
:host([layout="sheet"]) .tabs { margin: 0 6px; }
:host([layout="sheet"]) [role="tab"] { padding: 0 6px; letter-spacing: 0.04em; }
:host([layout="sheet"]) .rows { padding: 0 6px 14px; }
:host([layout="sheet"]) footer { padding: 10px 12px calc(10px + env(safe-area-inset-bottom)) 16px; }
:host([layout="sheet"]) .desc { min-height: 0; }

/* ── Comic (art profile "modern"): machined steel plate, ink, brackets ── */
:host([skin="modern"]) .panel { top: 16px; right: 16px; bottom: 16px; --chamfer: var(--cc-chamfer-lg); background: var(--cc-ink);
  clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer)); }
:host([skin="modern"]) .body { inset: var(--cc-ink-outline); border: 0;
  clip-path: polygon(calc(var(--chamfer) - 0.8px) 0, 100% 0, 100% calc(100% - var(--chamfer) + 0.8px), calc(100% - var(--chamfer) + 0.8px) 100%, 0 100%, 0 calc(var(--chamfer) - 0.8px));
  background: linear-gradient(160deg, rgba(190, 215, 235, 0.1), rgba(190, 215, 235, 0.02) 35%, transparent 60%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.022) 0 1px, transparent 1px 3px), var(--cc-panel-menu);
  box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.34), inset 1px 0 0 rgba(185, 210, 232, 0.12); }
:host([skin="modern"][layout="sheet"]) .panel { top: auto; right: 0; bottom: 0; }
:host([skin="modern"]) .brackets { position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right 5px top 5px / var(--cc-bracket-len) 1.5px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) right 5px top 5px / 1.5px var(--cc-bracket-len) no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left 5px bottom 5px / var(--cc-bracket-len) 1.5px no-repeat,
    linear-gradient(var(--cc-cyan), var(--cc-cyan)) left 5px bottom 5px / 1.5px var(--cc-bracket-len) no-repeat; }
/* Cream caption title with a hard ink drop shadow, as the showroom's kicker. */
:host([skin="modern"]) .title { padding: 5px 14px 3px; font-size: var(--cc-type-row); letter-spacing: 4px; color: var(--cc-caption-cream-text);
  background: var(--cc-caption-cream); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: 4px 4px 0 var(--cc-ink); }
:host([skin="modern"]) .back { background: var(--cc-steel); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.25), 2px 2px 0 var(--cc-ink); }
:host([skin="modern"]) .back:hover, :host([skin="modern"]) .back:focus-visible { color: #fff; background: var(--cc-steel-hi); }
:host([skin="modern"]) [role="tab"][aria-selected="true"] { color: #fff; background: var(--cc-panel-raised); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.34), inset 0 0 0 1px var(--cc-ink); }
:host([skin="modern"]) [role="tab"][aria-selected="true"]::after { left: 26%; right: 26%; bottom: 3px; box-shadow: 0 0 8px var(--cc-cyan); }
:host([skin="modern"]) .group { position: relative; padding-left: 13px; margin-left: 4px; }
:host([skin="modern"]) .group::before { content: ""; position: absolute; left: 0; top: -1px; bottom: -1px; width: 7px; background: var(--cc-cyan); box-shadow: 0 0 0 1px var(--cc-ink); }
:host([skin="modern"]) .group::after { background: linear-gradient(90deg, var(--cc-hairline) calc(100% - 10px), var(--cc-cyan) calc(100% - 10px)); }
:host([skin="modern"]) .row { --cut: var(--cc-chamfer-sm);
  clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut)); }
:host([skin="modern"]) .row.focused { background: linear-gradient(90deg, rgba(34, 230, 255, 0.13), rgba(34, 230, 255, 0.04)), var(--cc-steel-hi);
  box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.4), inset 4px 0 0 var(--cc-cyan), inset 0 0 0 2px rgba(34, 230, 255, 0.5); }
:host([skin="modern"]) .row.card { --cut: var(--cc-chamfer); background: var(--cc-steel); border: var(--cc-ink-outline) solid var(--cc-ink);
  box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.3), inset 3px 0 0 rgba(34, 230, 255, 0.35); }
:host([skin="modern"]) .row.card.focused { background: var(--cc-steel-hi); box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.42), inset 5px 0 0 var(--cc-cyan), inset 0 0 0 2px rgba(34, 230, 255, 0.6); }
:host([skin="modern"]) .card[aria-current="true"] { background: linear-gradient(180deg, rgba(34, 230, 255, 0.16), transparent 70%), var(--cc-steel-hi); }
:host([skin="modern"]) .chip { color: var(--cc-text); background: var(--cc-keycap); border: 1px solid var(--cc-ink); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.35), 2px 2px 0 var(--cc-ink); }
:host([skin="modern"]) .row.focused .chip { color: var(--cc-caption-cyan-text); background: var(--cc-caption-cyan); }
:host([skin="modern"]) .row.reset { background: var(--cc-panel-well); box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.55); }
:host([skin="modern"]) .confirm { background: var(--cc-panel-well); border: var(--cc-ink-outline) solid var(--cc-ink); box-shadow: inset 0 0 0 1px var(--cc-amber); }

/* ── Legacy: neon on navy, monospace, cyan and violet ── */
:host([skin="legacy"]) {
  --d-font: "Courier New", monospace; --d-head: "Courier New", monospace;
  --d-text: #aaddff; --d-dim: #8899aa; --d-faint: #667788; --d-accent: var(--cc-energy); --d-group: #cc88ff;
  --d-line: rgba(0, 200, 255, 0.22); --d-line-hi: rgba(0, 200, 255, 0.4); --d-focus: rgba(0, 255, 204, 0.09); --d-track: rgba(0, 200, 255, 0.1);
  --d-panel: linear-gradient(180deg, rgba(10, 10, 46, 0.93) 0%, rgba(2, 2, 16, 0.95) 100%);
}
:host([skin="legacy"]) .title { color: var(--cc-energy); text-shadow: 0 0 20px rgba(0, 255, 200, 0.5), 2px 2px 0 #003322; }
:host([skin="legacy"]) [role="tab"] { padding: 0 6px; letter-spacing: 0.02em; }
:host([skin="legacy"]) [role="tab"][aria-selected="true"] { color: var(--cc-energy); text-shadow: 0 0 10px rgba(0, 255, 200, 0.55); }
:host([skin="legacy"]) [role="tab"][aria-selected="true"]::after { box-shadow: 0 0 8px var(--cc-energy); }
:host([skin="legacy"]) .group { text-shadow: 0 0 10px rgba(204, 136, 255, 0.35); }
:host([skin="legacy"]) .group::after { background: linear-gradient(90deg, rgba(204, 136, 255, 0.35), transparent); }
:host([skin="legacy"]) .label { font-weight: 700; }
:host([skin="legacy"]) .row.focused { box-shadow: inset 0 0 0 1px rgba(0, 255, 204, 0.5), inset 3px 0 0 var(--cc-energy); }
:host([skin="legacy"]) .row.focused .label { color: var(--cc-energy); }
:host([skin="legacy"]) .row[data-kind="enum"] .vt { color: var(--vc, var(--d-text)); }
:host([skin="legacy"]) .sw { border: 1px solid var(--d-line-hi); box-shadow: none; }
:host([skin="legacy"]) .sw::after { top: 3px; left: 3px; background: var(--d-dim); border: 0; }
:host([skin="legacy"]) [aria-checked="true"] .sw { background: rgba(0, 255, 204, 0.18); border-color: var(--cc-energy); box-shadow: 0 0 10px rgba(0, 255, 204, 0.35); }
:host([skin="legacy"]) [aria-checked="true"] .sw::after { background: var(--cc-energy); box-shadow: 0 0 8px var(--cc-energy); }
:host([skin="legacy"]) .track { box-shadow: inset 0 0 0 1px var(--d-line-hi); }
:host([skin="legacy"]) .track i { box-shadow: 0 0 8px rgba(0, 255, 204, 0.6); }
:host([skin="legacy"]) .track b { width: 8px; background: var(--d-text); border: 0; }
:host([skin="legacy"]) .key { font-family: "Courier New", monospace; color: var(--d-text); background: rgba(0, 200, 255, 0.08); border-color: var(--d-line-hi); box-shadow: none; }
:host([skin="legacy"]) .back:hover, :host([skin="legacy"]) .back:focus-visible { color: var(--cc-energy); background: rgba(0, 200, 255, 0.1); }
:host([skin="legacy"]) .card[aria-current="true"] { background: rgba(0, 255, 204, 0.07); box-shadow: 0 0 14px rgba(0, 255, 204, 0.18) inset; }
:host([skin="legacy"]) .card[aria-current="true"]::after { box-shadow: 0 0 8px var(--cc-energy); }
:host([skin="legacy"]) .confirm [data-confirm="yes"] { color: #fff; background: rgba(255, 42, 74, 0.25); border-color: var(--cc-crimson); }

/* ── Modern (art profile "realistic"): off-white on dark, hairlines, no ink ── */
:host([skin="realistic"]) {
  --d-text: #e4e6e1; --d-dim: #98a3a4; --d-faint: #687375; --d-accent: #8fbcc4; --d-group: #98a3a4; --d-note: #dca24c;
  --d-line: rgba(228, 230, 225, 0.12); --d-line-hi: rgba(228, 230, 225, 0.28); --d-focus: rgba(255, 255, 255, 0.06); --d-track: rgba(255, 255, 255, 0.1);
  --d-panel: linear-gradient(180deg, rgba(22, 25, 28, 0.9), rgba(11, 13, 15, 0.93));
  --cc-ink: transparent; --cc-green: #9cc7a4; --cc-amber: #dca24c; --cc-crimson: #e0493f;
}
:host([skin="realistic"]) .title { font-weight: 600; font-size: var(--cc-type-row); letter-spacing: 0.34em; }
:host([skin="realistic"]) .back, :host([skin="realistic"]) [role="tab"], :host([skin="realistic"]) .group, :host([skin="realistic"]) .chip { font-weight: 600; }
:host([skin="realistic"]) .back { border-radius: 2px; }
:host([skin="realistic"]) [role="tab"][aria-selected="true"]::after { height: 1px; left: 12px; right: 12px; }
:host([skin="realistic"]) .group { letter-spacing: 0.22em; }
:host([skin="realistic"]) .label { font-weight: 500; }
:host([skin="realistic"]) .row { border-radius: 3px; }
:host([skin="realistic"]) .row.focused { box-shadow: inset 2px 0 0 var(--d-accent); }
:host(.kbd[skin="realistic"]) .row:focus { box-shadow: inset 2px 0 0 var(--d-accent), inset 0 0 0 1px var(--d-line-hi); }
:host([skin="realistic"]) .value { font-weight: 600; letter-spacing: 0.12em; }
:host([skin="realistic"]) .sw { width: 36px; height: 20px; border: 0; border-radius: 10px; box-shadow: inset 0 0 0 1px var(--d-line-hi); }
:host([skin="realistic"]) .sw::after { top: 3px; left: 3px; width: 14px; height: 14px; border: 0; border-radius: 50%; background: var(--d-dim); }
:host([skin="realistic"]) [aria-checked="true"] .sw { background: var(--d-accent); box-shadow: none; }
:host([skin="realistic"]) [aria-checked="true"] .sw::after { transform: translateX(16px); background: #f4f5f2; }
:host([skin="realistic"]) .track { height: 2px; box-shadow: none; }
:host([skin="realistic"]) .track b { width: 12px; height: 12px; border: 0; border-radius: 50%; background: var(--d-dim); }
:host([skin="realistic"]) .row.focused .track b { background: #f4f5f2; }
:host([skin="realistic"]) .row.card { border-radius: 3px; background: rgba(255, 255, 255, 0.03); }
:host([skin="realistic"]) .card[aria-current="true"]::after { border-radius: 50%; box-shadow: none; }
:host([skin="realistic"]) .thumb { border-radius: 2px; }
:host([skin="realistic"]) .chip { border-radius: 2px; }
:host([skin="realistic"]) .key { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--d-line-hi); box-shadow: none; color: var(--d-text); font-weight: 600; }
:host([skin="realistic"]) .confirm { border-radius: 3px; }
:host([skin="realistic"]) .confirm [data-confirm="yes"] { color: #fff4f2; background: #8c2e27; border: 0; border-radius: 2px; }

@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
`;

class SettingsDeck extends HTMLElement {
  constructor() {
    super();
    this.game = null;
    this.isOpen = false;
    this.returnTo = "pause";
    this.state = createDeckState();
    this.items = [];
    this.previous = {}; // key → value before the latest change, for compare
    this.compareKey = null;
    this.compareValue = undefined;

    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLE}${GLYPH_CSS}</style>${this.template()}`;
    const $ = (s) => root.querySelector(s);
    this.el = {
      panel: $(".panel"),
      tabs: [...root.querySelectorAll('[role="tab"]')],
      tablist: $(".tabs"),
      rows: $(".rows"),
      desc: $(".desc"),
      note: $(".note"),
      confirm: $(".confirm"),
      confirmText: $(".confirm p"),
      live: $(".live"),
    };
    this.bind();
    new ResizeObserver(() => this.onResize()).observe(document.documentElement);
    onArtStyleChange(() => {
      this.syncSkin();
      if (!this.isOpen) return;
      this.renderRows();
      this.focusCurrent();
    });
  }

  template() {
    const tabs = SECTIONS.map(
      (s, i) => `<button role="tab" id="deck-tab-${s.id}" aria-selected="false" aria-controls="deck-panel" tabindex="-1" data-section="${i}">${esc(TAB_LABEL[s.id] ?? s.label)}</button>`,
    ).join("");
    const pad = (action) => `<span class="in-pad" data-glyph="${action}" data-glyph-device="gamepad"></span>`;
    return `
<div class="shade"></div>
<aside class="panel" aria-labelledby="deck-title">
  <div class="body">
    <header class="head">
      <h2 class="title" id="deck-title">Settings</h2>
      <button class="back" data-act="back"><kbd class="key in-kb">Esc</kbd>${pad("back")}Back</button>
    </header>
    <div class="tabs" role="tablist" aria-label="Settings sections">${tabs}</div>
    <div class="rows" id="deck-panel" role="tabpanel"></div>
    <footer>
      <div class="confirm" role="group" aria-labelledby="deck-confirm" hidden>
        <p id="deck-confirm"></p><button data-confirm="yes">Reset</button><button data-confirm="no">Cancel</button>
      </div>
      <p class="desc"></p>
      <p class="note"></p>
      <div class="prompts" aria-hidden="true">
        <span class="in-kb"><kbd class="key">↑</kbd><kbd class="key">↓</kbd>Move</span>
        <span class="in-kb"><kbd class="key">←</kbd><kbd class="key">→</kbd>Change</span>
        <span class="in-kb"><kbd class="key">Enter</kbd>Select</span>
        <span class="in-kb"><kbd class="key">Q</kbd><kbd class="key">E</kbd>Section</span>
        <span class="in-kb"><kbd class="key">X</kbd>Reset</span>
        <span class="in-kb p-compare"><kbd class="key">C</kbd>Hold: before</span>
        <span class="in-pad">${pad("navigate")}Move</span>
        <span class="in-pad">${pad("confirm")}Select</span>
        <span class="in-pad">${pad("prevTab")}${pad("nextTab")}Section</span>
        <span class="in-pad">${pad("randomize")}Reset</span>
        <span class="in-pad p-compare">${pad("deploy")}Hold: before</span>
      </div>
    </footer>
  </div>
  <span class="brackets"></span>
</aside>
<div class="sr live" role="status" aria-live="polite"></div>`;
  }

  // ── Lifecycle ───────────────────────────────────────────

  // Attributes cannot be set in the constructor of a created element.
  connectedCallback() {
    this.syncLayout();
  }

  open({ returnTo = "pause", section } = {}) {
    this.returnTo = returnTo;
    const idx = SECTIONS.findIndex((s) => s.id === section);
    this.state = createDeckState({ section: Math.max(0, idx) });
    this.previous = {};
    this.syncSkin();
    this.syncLayout();
    this.syncInput();
    this._onInput ??= () => this.isOpen && this.syncInput();
    window.addEventListener("cc-input-change", this._onInput);
    this.isOpen = true;
    this.toggleAttribute("open", true);
    this.render();
    this.focusCurrent();
  }

  close() {
    this.hide();
    this.game?.onSettingsDeckClose?.(this.returnTo);
  }

  /** Put away without telling the game (it already left Settings). */
  hide() {
    clearTimeout(this._sampleTimer);
    if (this.compareKey) this.compare(false);
    this.state = { ...this.state, confirm: null, compare: false };
    this.el.confirm.hidden = true;
    this.isOpen = false;
    this.shadowRoot.activeElement?.blur?.();
    this.removeAttribute("open");
    this.classList.remove("kbd");
    window.removeEventListener("cc-input-change", this._onInput);
  }

  /** Called every frame by the render pipeline. */
  sync(inSettings) {
    if (!inSettings) {
      if (this.isOpen) this.hide();
      return;
    }
    this.syncSkin();
    if (activeDevice(this.game) !== this.getAttribute("input")) this.syncInput();
    // The controller card comes and goes with the pad.
    const pad = !!this.game.gamepad?.connected;
    if (pad !== this._pad) {
      this._pad = pad;
      if (this.isOpen && this.section().id === "quick") this.refresh();
    }
  }

  syncSkin() {
    const skin = document.documentElement.dataset.artProfile || "modern";
    if (this.getAttribute("skin") !== skin) this.setAttribute("skin", skin);
  }

  /** Show keyboard or pad hints, whichever the player used last. */
  syncInput() {
    this.setAttribute("input", activeDevice(this.game));
    renderDomGlyphs(this.game, this.shadowRoot);
  }

  syncLayout() {
    const layout = innerWidth < SHEET_BELOW ? "sheet" : "side";
    if (this.getAttribute("layout") !== layout) this.setAttribute("layout", layout);
  }

  onResize() {
    this.syncLayout();
    if (!this.isOpen) return;
    // Keep the focused row focused and in view across side panel ↔ sheet.
    const active = this.shadowRoot.activeElement;
    if (!active || active.classList.contains("row")) this.focusCurrent();
    else this.reveal(this.rowEls()[this.state.row]);
    this.revealTab();
  }

  /** The panel's size in CSS px (the live view's framing reads it). */
  get panelWidth() {
    return this.el.panel.offsetWidth;
  }

  get panelHeight() {
    return this.el.panel.offsetHeight;
  }

  /** Play the sample for a volume row now, or once its nudges pause. */
  sampleVolume(def, later = false) {
    const play = VOLUME_SAMPLE[def?.key];
    if (!play) return;
    clearTimeout(this._sampleTimer);
    const run = () => {
      try {
        if (this.game?.audio) play(this.game.audio);
      } catch (_) {}
    };
    if (later) this._sampleTimer = setTimeout(run, SAMPLE_AFTER_MS);
    else run();
  }

  sfx(name) {
    try {
      this.game?.audio?.[name]?.();
    } catch (_) {}
  }

  announce(msg) {
    this.el.live.textContent = msg;
  }

  // ── Events ──────────────────────────────────────────────

  bind() {
    const root = this.shadowRoot;
    root.addEventListener("click", (e) => this.onClick(e));
    root.addEventListener("pointerover", (e) => this.onHover(e));
    // Mouse use hides keyboard focus rings again.
    root.addEventListener("pointerdown", () => this.classList.remove("kbd"));
    // Keys arrive through the game's dispatch (handleKey); stop the browser
    // from also clicking the focused button on Enter / Space.
    const noActivate = (e) => {
      if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space") e.preventDefault();
    };
    root.addEventListener("keydown", noActivate);
    root.addEventListener("keyup", noActivate);
    this.el.tablist.addEventListener("scroll", () => this.syncTabFade(), { passive: true });

    // Sliders drag. A touch only drags once it moves sideways, so swiping the
    // list up and down never changes a volume on the way past.
    const rows = this.el.rows;
    rows.addEventListener("pointerdown", (e) => {
      const row = e.target.closest?.('[role="slider"]');
      if (!row || (e.pointerType === "mouse" && e.button !== 0)) return;
      row.setPointerCapture(e.pointerId);
      this._drag = { row, x: e.clientX, y: e.clientY, live: e.pointerType === "mouse", moved: false };
      this.focusRow(this.indexOf(row), { reveal: false });
      if (this._drag.live) this.dragTo(e.clientX);
    });
    rows.addEventListener("pointermove", (e) => {
      const d = this._drag;
      if (!d) return;
      const dx = Math.abs(e.clientX - d.x);
      if (!d.live && dx > 6 && dx > Math.abs(e.clientY - d.y)) d.live = true;
      if (dx > 3 || Math.abs(e.clientY - d.y) > 3) d.moved = true;
      if (d.live) this.dragTo(e.clientX);
    });
    const end = (e) => {
      const d = this._drag;
      this._drag = null;
      if (!d) return;
      if (e.type === "pointerup" && !d.live && !d.moved) this.dragTo(e.clientX); // a tap sets the value too
      const def = this.current()?.def;
      if (def) this.announceValue(def);
      if (def && e.type === "pointerup") this.sampleVolume(def);
    };
    rows.addEventListener("pointerup", end);
    rows.addEventListener("pointercancel", end);
  }

  onClick(e) {
    const t = e.target.closest?.("button, .row");
    if (!t) return;
    if (t.dataset.section != null) return this.setSection(Number(t.dataset.section));
    if (t.dataset.act === "back") return this.run([{ type: "close" }]);
    if (t.dataset.confirm) return this.answerConfirm(t.dataset.confirm === "yes");
    const row = t.closest(".row");
    if (!row) return;
    const i = this.indexOf(row);
    if (i !== this.state.row) this.focusRow(i, { reveal: false });
    if (t.dataset.step) return this.run([{ type: "step", dir: Number(t.dataset.step) }]);
    if (row.dataset.kind === "slider") return; // pointerdown already set it
    this.run([{ type: "activate" }]);
  }

  onHover(e) {
    if (e.pointerType === "touch" || this._drag) return;
    const row = e.target.closest?.(".row");
    if (!row) return;
    const i = this.indexOf(row);
    if (i !== this.state.row) this.focusRow(i, { reveal: false });
  }

  dragTo(x) {
    const item = this.current();
    const row = this.rowEls()[this.state.row];
    if (!item?.def || !row) return;
    const def = item.def;
    const r = row.querySelector(".track").getBoundingClientRect();
    const f = clamp((x - r.left) / r.width, 0, 1);
    const v = Number((def.min + Math.round((f * (def.max - def.min)) / def.step) * def.step).toFixed(decimals(def.step)));
    this.change(def, () => applySettingValue(this.game, def, v), false);
  }

  // ── Keys (routed from the game's dispatch) ──────────────

  /** Returns true when the key was consumed. `e` is absent for ccDebug.pressKey. */
  handleKey(code, e) {
    if (!this.isOpen || code === "Tab") return false; // Tab moves native focus
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    this.classList.add("kbd");
    const alias = { KeyW: "ArrowUp", KeyS: "ArrowDown", KeyA: "ArrowLeft", KeyD: "ArrowRight", NumpadEnter: "Enter" };
    let c = alias[code] ?? code;
    const active = this.shadowRoot.activeElement;
    const confirming = !!this.state.confirm;
    // Buttons outside the list act on their own: Back, a tab, the reset prompt.
    const press = c === "Enter" || c === "Space";
    if (press && !confirming && active?.matches?.(".back")) {
      this.run([{ type: "close" }]);
      return true;
    }
    if (press && confirming && active?.dataset?.confirm) {
      this.answerConfirm(active.dataset.confirm === "yes");
      return true;
    }
    const onTab = active?.getAttribute?.("role") === "tab";
    if (onTab && (c === "ArrowLeft" || c === "ArrowRight")) c = c === "ArrowLeft" ? "KeyQ" : "KeyE";
    else if (onTab && (c === "ArrowDown" || press)) {
      this.focusCurrent();
      return true;
    }

    const ctx = { sectionCount: SECTIONS.length, rows: this.rowKinds(), repeat: !!e?.repeat, now: performance.now() };
    const { state, effects } = deckKey(this.state, c, ctx);
    this.state = state;
    this.run(effects, { keepTab: onTab });
    this.syncConfirm();
    return true;
  }

  handleKeyUp(code) {
    if (!this.isOpen) return;
    const { state, effects } = deckKeyUp(this.state, code);
    this.state = state;
    this.run(effects);
  }

  run(effects, { keepTab = false } = {}) {
    for (const fx of effects) {
      const item = this.current();
      switch (fx.type) {
        case "step":
          if (item?.def) this.change(item.def, () => stepSetting(this.game, item.def, fx.dir));
          break;
        case "activate":
          if (item) this.activate(item);
          break;
        case "reset":
          if (item?.def && this.change(item.def, () => resetSetting(this.game, item.def), false)) this.announce(`${item.def.label} reset`);
          break;
        case "resetSection":
          this.resetSection();
          break;
        case "compare":
          this.compare(fx.on);
          break;
        case "focus":
          this.render();
          if (keepTab) this.el.tabs[this.state.section].focus({ preventScroll: true });
          else this.focusCurrent();
          break;
        case "sound":
          this.sfx(fx.name);
          break;
        case "close":
          this.close();
          break;
        default:
      }
    }
  }

  // ── Changes ─────────────────────────────────────────────

  /** Apply one change; remember the old value for compare, refresh, announce. */
  change(def, apply, speak = true) {
    const before = this.game.settings[def.key];
    if (!apply()) return false;
    if (!this._drag) this.sampleVolume(def, true);
    if (!this.compareKey) this.previous[def.key] = before;
    this.refresh();
    if (speak) this.announceValue(def);
    return true;
  }

  announceValue(def) {
    const { value } = settingDisplayItem(def, this.game.settings);
    this.announce(def.type === "toggle" ? `${def.label} ${value.toLowerCase()}` : `${def.label}: ${value}`);
  }

  activate(item) {
    const { def, card, art } = item;
    if (item.key === "resetSection") {
      this.state = { ...this.state, confirm: "resetSection" };
      this.syncConfirm();
      return;
    }
    if (item.pad) {
      const cal = defOf("gamepadCalibrate");
      cal.onClick?.(this.game);
      this.sfx("menuConfirm");
      this.announce(cal.label);
      this.refresh();
      return;
    }
    if (card) return this.applyCard(card);
    if (art) {
      const artDef = defOf("artStyle");
      if (this.change(artDef, () => applySettingValue(this.game, artDef, art.style), false)) this.announce(`Art style: ${art.label}`);
      return;
    }
    switch (def.type) {
      case "toggle":
        this.change(def, () => applySettingValue(this.game, def, !this.game.settings[def.key]));
        break;
      case "enum":
        this.change(def, () => stepSetting(this.game, def, 1));
        break;
      case "action":
        def.onClick?.(this.game);
        this.sfx("menuConfirm");
        this.announce(def.label);
        this.refresh();
        break;
      default:
    }
  }

  applyCard(card) {
    const s = this.game.settings;
    const next = card.apply({ ...s });
    for (const key of Object.keys(next)) {
      const def = next[key] !== s[key] && defOf(key);
      if (def) this.change(def, () => applySettingValue(this.game, def, next[key]), false);
    }
    this.sfx("menuConfirm");
    this.announce(`${card.label} preset`);
    if (card.id === "custom") {
      this.state = { ...this.state, section: SECTIONS.findIndex((x) => x.id === "video"), row: 0 };
      this.render();
      this.focusCurrent();
    }
  }

  resetSection() {
    for (const item of this.items) if (item.def) resetSetting(this.game, item.def);
    this.refresh();
    this.announce(`${SECTIONS[this.state.section].label} reset to defaults`);
  }

  answerConfirm(yes) {
    const { state, effects } = deckKey(this.state, yes ? "Enter" : "Escape", { sectionCount: SECTIONS.length, rows: this.rowKinds(), repeat: false, now: performance.now() });
    this.state = state;
    this.run(effects);
    this.syncConfirm();
    this.focusCurrent();
  }

  syncConfirm() {
    const on = this.state.confirm === "resetSection";
    if (on === !this.el.confirm.hidden) return;
    this.el.confirm.hidden = !on;
    if (!on) return;
    const label = SECTIONS[this.state.section].label;
    this.el.confirmText.textContent = `Reset every ${label} setting?`;
    this.announce(`Reset every ${label} setting to its default? Enter to confirm, any other key to cancel.`);
  }

  /** Hold to show the value before the latest change (Video rows only). */
  compare(on) {
    if (on) {
      const def = this.current()?.def;
      const before = def && this.previous[def.key];
      if (!def || SECTION_OF[def.key]?.section !== "video" || before === undefined || before === this.game.settings[def.key]) return;
      this.compareKey = def.key;
      this.compareValue = this.game.settings[def.key];
      applySettingValue(this.game, def, before);
      this.announce(`${def.label}: showing before`);
    } else {
      if (!this.compareKey) return;
      const def = defOf(this.compareKey);
      applySettingValue(this.game, def, this.compareValue);
      this.compareKey = null;
      this.announceValue(def);
    }
    this.refresh();
  }

  // ── Rows ────────────────────────────────────────────────

  section() {
    return SECTIONS[this.state.section];
  }

  buildItems() {
    const id = this.section().id;
    if (id === "quick") {
      return [
        ...QUICK_CARDS.map((card) => ({ kind: "card", key: `card:${card.id}`, card, group: "Performance" })),
        ...ART_CARDS.map((art) => ({ kind: "card", key: `art:${art.style}`, art, group: "Art style" })),
        // Only with a pad connected: its status, and Calibrate on activate.
        ...(this.game.gamepad?.connected ? [{ kind: "card", key: "card:controller", pad: true, group: "Controller" }] : []),
      ];
    }
    const items = [];
    for (const { group, rows } of rowsForSection(id, this.game.isTouchDevice, this.game.settings)) {
      for (const def of rows) items.push({ kind: def.type, key: def.key, def, group });
    }
    items.push({ kind: "action", key: "resetSection", group: null });
    return items;
  }

  rowKinds() {
    return this.items.map(({ kind, key }) => ({ kind, key }));
  }

  rowEls() {
    return [...this.el.rows.querySelectorAll(".row")];
  }

  indexOf(row) {
    return this.rowEls().indexOf(row);
  }

  current() {
    return this.items[this.state.row];
  }

  /** A new section: tabs, rows, list back at the top. */
  render() {
    this.renderTabs();
    this.renderRows();
    this.el.rows.scrollTop = 0;
  }

  renderTabs() {
    const sel = this.state.section;
    this.el.tabs.forEach((t, i) => {
      t.setAttribute("aria-selected", String(i === sel));
      t.tabIndex = i === sel ? 0 : -1;
    });
    this.el.rows.setAttribute("aria-labelledby", this.el.tabs[sel].id);
    this.setAttribute("section", this.section().id);
    this.revealTab();
  }

  renderRows() {
    this.items = this.buildItems();
    this.state = { ...this.state, row: clamp(this.state.row, 0, Math.max(0, this.items.length - 1)) };
    let html = "";
    let group;
    let cards = false;
    for (const item of this.items) {
      if (item.group !== group) {
        if (cards) html += "</div>";
        cards = item.kind === "card";
        group = item.group;
        if (group) html += `<h3 class="group">${esc(group)}</h3>`;
        if (cards) html += `<div class="cards${item.art ? " art" : item.pad ? " pad" : ""}">`;
      }
      html += this.rowHtml(item);
    }
    if (cards) html += "</div>";
    this.el.rows.innerHTML = html;
    this.patchRows();
  }

  rowHtml(item) {
    const { def, card, art, key } = item;
    const k = `data-key="${esc(key)}" data-kind="${item.kind}" tabindex="-1"`;
    if (item.pad) return `<button class="row card padcard" ${k}>${svg("pad", "ico")}<span class="label"></span><span class="cdesc"></span><span class="chip">Calibrate</span></button>`;
    if (card) return `<button class="row card" ${k}>${svg(card.id, "ico")}<span class="label">${esc(card.label)}</span><span class="cdesc">${esc(card.desc)}</span></button>`;
    if (art) return `<button class="row card" ${k}><span class="thumb s${art.style}" aria-hidden="true"><b>Aa</b></span><span class="label">${esc(art.label)}</span></button>`;
    if (key === "resetSection") return `<button class="row reset" ${k}><span class="label">Reset ${esc(this.section().label)}</span></button>`;
    const cost = SECTION_OF[def.key]?.cost;
    const pips = cost ? `<span class="pips" data-cost="${cost}" aria-hidden="true"><i></i><i></i><i></i></span>` : "";
    const label = `<span class="label">${esc(def.label)}${pips}</span>`;
    switch (def.type) {
      case "toggle":
        return `<div class="row" role="switch" aria-label="${esc(def.label)}" ${k}>${label}<span class="value"><span class="vt"></span><span class="sw" aria-hidden="true"></span></span></div>`;
      case "slider":
        return `<div class="row" role="slider" aria-label="${esc(def.label)}" aria-valuemin="${def.min}" aria-valuemax="${def.max}" ${k}>${label}<span class="value"><span class="vt"></span></span><span class="track" aria-hidden="true"><i></i><b></b></span></div>`;
      case "enum":
        return `<div class="row" role="group" ${k}>${label}<span class="value"><button class="step" data-step="-1" tabindex="-1" aria-label="Previous ${esc(def.label)}">${svg("prev")}</button><span class="vt"></span><button class="step" data-step="1" tabindex="-1" aria-label="Next ${esc(def.label)}">${svg("next")}</button></span></div>`;
      default:
        return `<button class="row" ${k}>${label}<span class="value"><span class="chip"></span></span></button>`;
    }
  }

  /** Values and states, written in place so focus and pointer capture survive. */
  patchRows() {
    const s = this.game.settings;
    const els = this.rowEls();
    this.items.forEach((item, i) => {
      const el = els[i];
      const { def, card, art } = item;
      if (item.pad) {
        const { value, desc } = this.padStatus();
        const label = el.querySelector(".label");
        if (label.textContent !== value) label.textContent = value;
        el.querySelector(".cdesc").textContent = desc;
        return el.setAttribute("aria-label", `Controller ${value}. Calibrate sticks`);
      }
      if (card) return el.setAttribute("aria-current", String(this.cardActive(card)));
      if (art) return el.setAttribute("aria-current", String(s.artStyle === art.style));
      if (!def) return;
      const d = settingDisplayItem(def, s);
      const vt = el.querySelector(".vt, .chip");
      if (vt.textContent !== d.value) vt.textContent = d.value;
      if (def.type === "toggle") {
        el.setAttribute("aria-checked", String(!!s[def.key]));
        el.classList.toggle("capped", !!d.note);
      } else if (def.type === "slider") {
        el.setAttribute("aria-valuenow", String(s[def.key]));
        el.setAttribute("aria-valuetext", d.value);
        el.style.setProperty("--f", String(clamp((s[def.key] - def.min) / (def.max - def.min), 0, 1)));
      } else if (def.type === "enum") {
        el.setAttribute("aria-label", `${def.label}: ${d.value}`);
        if (d.color) el.style.setProperty("--vc", d.color);
      }
    });
  }

  padStatus() {
    const st = this.game.gamepad?.status;
    return { value: st?.value || "CONNECTED", desc: st?.desc || "" };
  }

  cardActive(card) {
    const s = this.game.settings;
    const preset = defOf("graphicsPreset").values[s.graphicsPreset]?.toLowerCase();
    if (card.id === "battery") return !!s.batterySaver;
    if (s.batterySaver) return false;
    return { balanced: "auto", max: "ultra", custom: "custom" }[card.id] === preset;
  }

  /** After a change: rebuild when rows appeared or vanished, else patch. */
  refresh() {
    const keys = this.items.map((i) => i.key).join();
    const next = this.buildItems().map((i) => i.key).join();
    if (keys !== next) {
      const key = this.current()?.key;
      this.renderRows();
      const i = this.items.findIndex((it) => it.key === key);
      if (i >= 0) this.state = { ...this.state, row: i };
      this.focusCurrent();
    } else {
      this.patchRows();
      this.renderFooter();
    }
  }

  // ── Focus ───────────────────────────────────────────────

  focusRow(i, { reveal = true } = {}) {
    this.state = { ...this.state, row: i };
    this.focusCurrent(reveal);
  }

  focusCurrent(reveal = true) {
    const els = this.rowEls();
    if (!els.length) return;
    const row = clamp(this.state.row, 0, els.length - 1);
    this.state = { ...this.state, row };
    els.forEach((el, i) => {
      el.tabIndex = i === row ? 0 : -1;
      el.classList.toggle("focused", i === row);
    });
    els[row].focus({ preventScroll: true });
    // The footer first: its height sets how much list is left to scroll in.
    this.renderFooter();
    if (reveal) this.reveal(els[row]);
  }

  /** Test hook, and for callers that open on a given row. */
  focusRowByKey(key) {
    let i = this.items.findIndex((it) => it.key === key);
    if (i < 0) {
      const section = SECTIONS.findIndex((s) => s.id === SECTION_OF[key]?.section);
      if (section < 0) return false;
      this.state = { ...this.state, section, row: 0 };
      this.render();
      i = this.items.findIndex((it) => it.key === key);
      if (i < 0) return false;
    }
    this.focusRow(i);
    return true;
  }

  /**
   * Scroll the list (never the page) so `el` shows, with its group heading
   * when it is the first row of a group.
   */
  reveal(el) {
    if (!el) return;
    const box = this.el.rows;
    const b = box.getBoundingClientRect();
    const head = el.previousElementSibling?.classList.contains("group") ? el.previousElementSibling : el.parentElement.classList.contains("cards") && !el.previousElementSibling ? el.parentElement.previousElementSibling : null;
    const top = Math.min(el.getBoundingClientRect().top, head?.getBoundingClientRect().top ?? Infinity);
    const bottom = el.getBoundingClientRect().bottom;
    if (top < b.top + 4) box.scrollTop -= b.top + 4 - top;
    else if (bottom > b.bottom - 8) box.scrollTop += bottom - b.bottom + 8;
  }

  revealTab() {
    const t = this.el.tabs[this.state.section];
    const bar = this.el.tablist;
    const tr = t.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    if (tr.left < br.left) bar.scrollLeft -= br.left - tr.left + 24;
    else if (tr.right > br.right) bar.scrollLeft += tr.right - br.right + 24;
    this.syncTabFade();
  }

  syncTabFade() {
    const bar = this.el.tablist;
    bar.classList.toggle("more-l", bar.scrollLeft > 1);
    bar.classList.toggle("more-r", bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1);
  }

  setSection(i) {
    if (i !== this.state.section) this.sfx("menuSelect");
    this.state = { ...this.state, section: i, row: 0, confirm: null };
    this.syncConfirm();
    this.render();
    this.focusCurrent();
    this.el.tabs[i].focus({ preventScroll: true });
  }

  // ── Footer ──────────────────────────────────────────────

  renderFooter() {
    const item = this.current();
    if (!item) return;
    const { def, card, art } = item;
    const desc = item.pad ? this.padStatus().desc : card?.desc ?? (art ? ART_DESC[art.style] : def ? def.desc : RESET_DESC);
    this.el.desc.textContent = desc ?? "";
    const note = def ? settingDisplayItem(def, this.game.settings).note : "";
    const cost = def && SECTION_OF[def.key]?.cost;
    this.el.note.innerHTML = [
      note ? esc(note) : "",
      cost ? `<span class="cost" data-cost="${cost}">Performance cost: ${cost}<span class="pips" data-cost="${cost}" aria-hidden="true"><i></i><i></i><i></i></span></span>` : "",
    ].filter(Boolean).join("<br>");
  }
}

if (!customElements.get("settings-deck")) customElements.define("settings-deck", SettingsDeck);

/** Create (once) and return the settings deck bound to `game`. */
export function mountSettingsDeck(game) {
  let el = document.querySelector("settings-deck");
  if (!el) {
    el = document.createElement("settings-deck");
    document.body.appendChild(el);
  }
  el.game = game;
  return el;
}
