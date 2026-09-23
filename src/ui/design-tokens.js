/**
 * Modern-mode design tokens — the one source for the graphic-novel UI family
 * (canvas HUD/menus in modern-ui-kit.js, DOM menus in style.css, the
 * <agent-showroom> web component).
 *
 * Machined steel plates with an ink outline, chamfered top-left/bottom-right
 * corners and cyan brackets on the two square corners; cream comic caption
 * plates with a hard ink drop shadow; crimson for the primary/destructive
 * action; steel keycaps; a condensed system display face.
 *
 * JS consumers import the values. DOM consumers read CSS custom properties:
 * `injectDesignTokens()` writes them once on :root, and `tokensCss(selector)`
 * returns the same declarations for a shadow root's `:host`. style.css keeps a
 * static copy of the `--cc-*` basics for first paint (before modules run);
 * tests/unit/design-tokens.test.js keeps that copy in step with this file.
 */

export const COLOR = {
  ink: "#04060b",
  void: "#05060c",
  navy: "#0b1422",
  steel: "#2a3a4a",
  steelHi: "#6f8aa3",
  text: "#e4edf5",
  textDim: "#8fa4b8",
  textFaint: "#5d7185",
  cyan: "#22e6ff",
  energy: "#00ffcc",
  crimson: "#ff2a4a",
  danger: "#ff3344",
  amber: "#ffae3a",
  gold: "#ffd24a",
  violet: "#9b5cff",
  green: "#3dff8a",
  cream: "#f3e9cf",
  captionInk: "#1a1208",
  // Machined hairlines and bevels, as used on every plate.
  bevel: "rgba(185, 210, 232, 0.3)",
  hairline: "rgba(130, 160, 188, 0.2)",
};

/** System font stacks only — no web fonts ship with the game. */
export const FONT = {
  display: 'Bahnschrift, "Avenir Next Condensed", "DIN Condensed", "Roboto Condensed", "Arial Narrow", "Helvetica Neue", sans-serif',
  mono: '"SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace',
};

/** Type scale in CSS px (canvas sizes match at 1× HUD scale). */
export const TYPE = {
  micro: 9, // caption footers, keycap legends on phones
  keycap: 10,
  label: 11, // tile names, stat labels
  section: 12, // section headers (letter-spacing 0.12em)
  body: 13,
  row: 15, // menu rows / buttons
  heading: 22,
  title: 40, // panel titles ("PAUSED")
  display: 54, // hero titles
  tracking: { caption: "0.08em", section: "0.12em", row: "1px", title: "0.06em" },
};

/** Ink outline widths (px). */
export const INK = {
  outline: 2, // DOM plates: 2px ink border
  canvas: 1.5, // canvas plates: inset of the steel body inside the ink silhouette
  hairline: 1,
  shadow: 3, // hard offset drop shadow under caption plates
};

/** Chamfer (cut corner) sizes and corner-bracket geometry (px). */
export const SHAPE = {
  chamferSm: 7, // chips, feature cards, keys
  chamfer: 12, // buttons, mission plates, tiles
  chamferLg: 20, // menu panels
  bracketLen: 12,
  bracketWidth: 2,
  keycapRadius: 3,
};

/** Steel panel fills [top, mid, bottom], stops at 0 / 0.45 / 1. */
export const PANEL = {
  hud: ["rgba(44,60,77,0.86)", "rgba(22,32,43,0.84)", "rgba(10,16,24,0.86)"],
  menu: ["rgba(40,55,71,0.97)", "rgba(20,29,39,0.97)", "rgba(9,14,21,0.97)"],
  raised: ["rgba(66,88,111,0.97)", "rgba(31,44,58,0.97)", "rgba(15,23,32,0.97)"],
  well: ["rgba(4,7,11,0.92)", "rgba(9,14,20,0.9)", "rgba(20,29,39,0.9)"],
  glass: ["rgba(8,14,22,0.72)", "rgba(6,10,16,0.7)", "rgba(10,16,24,0.74)"],
};

/** Opaque DOM plate gradients (mission plates, buttons). */
export const PLATE = {
  steel: "linear-gradient(180deg, #2e3f51 0%, #18232f 46%, #0b1219 100%)",
  steelHi: "linear-gradient(180deg, #43596f 0%, #213141 46%, #111a24 100%)",
  cream: "linear-gradient(180deg, #f7eed6 0%, #ddcca2 100%)",
};

/** Caption plate schemes: gradient top/bottom and text colour. */
export const CAPTION = {
  cream: { top: "#f7eed6", bottom: "#ddcca2", text: COLOR.captionInk },
  crimson: { top: "#ff5068", bottom: "#b3142c", text: "#fff4f4" },
  cyan: { top: "#7df2ff", bottom: "#12a9c6", text: "#021219" },
  amber: { top: "#ffd48a", bottom: "#d58414", text: "#1d1004" },
  steel: { top: "#3b4f63", bottom: "#18222e", text: COLOR.text },
  violet: { top: "#c09bff", bottom: "#6a38c9", text: "#fbf7ff" },
};

/** Primary action = the crimson caption scheme on a button plate. */
export const PRIMARY = CAPTION.crimson;

/** Steel keycap gradient stops [offset, colour]. */
export const KEYCAP = [
  [0, "#56708a"],
  [0.12, "#34475b"],
  [0.8, "#1c2835"],
  [1, "#0d141c"],
];

/** Chrome title fill: split highlight like brushed chrome lettering. */
export const TITLE = { fillTop: "#ffffff", fillBottom: "#9fb4c7", split: 0.55 };

/** Motion. */
export const MOTION = {
  fast: 150, // hover/press
  base: 200, // panel swaps, toggles
  slow: 260, // sheets, camera moves
  ease: "cubic-bezier(0.2, 0.7, 0.2, 1)",
};

const gradient = (c) => `linear-gradient(180deg, ${c.top} 0%, ${c.bottom} 100%)`;
const panelGradient = (p) => `linear-gradient(180deg, ${p[0]} 0%, ${p[1]} 45%, ${p[2]} 100%)`;
const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Chamfer polygon for clip-path (top-left and bottom-right cut). */
export const chamferClip = (px) => `polygon(${px}px 0, 100% 0, 100% calc(100% - ${px}px), calc(100% - ${px}px) 100%, 0 100%, 0 ${px}px)`;

/** All tokens as CSS custom property declarations (no selector). */
export function tokenDeclarations() {
  const d = {};
  for (const [k, v] of Object.entries(COLOR)) d[`--cc-${kebab(k)}`] = v;
  d["--cc-font"] = FONT.display;
  d["--cc-font-mono"] = FONT.mono;
  d["--cc-steel"] = PLATE.steel; // historical name used by style.css for the plate gradient
  d["--cc-steel-hi"] = PLATE.steelHi;
  d["--cc-cream"] = PLATE.cream;
  d["--cc-steel-flat"] = COLOR.steel;
  d["--cc-steel-hi-flat"] = COLOR.steelHi;
  for (const [k, v] of Object.entries(PANEL)) d[`--cc-panel-${k}`] = panelGradient(v);
  for (const [k, v] of Object.entries(CAPTION)) {
    d[`--cc-caption-${k}`] = gradient(v);
    d[`--cc-caption-${k}-text`] = v.text;
  }
  d["--cc-primary"] = gradient(PRIMARY);
  d["--cc-primary-text"] = PRIMARY.text;
  d["--cc-keycap"] = `linear-gradient(180deg, ${KEYCAP.map(([o, c]) => `${c} ${o * 100}%`).join(", ")})`;
  d["--cc-title-fill"] = `linear-gradient(180deg, ${TITLE.fillTop} 0%, ${TITLE.fillTop} ${TITLE.split * 100}%, ${TITLE.fillBottom} ${TITLE.split * 100 + 1}%, ${TITLE.fillBottom} 100%)`;
  for (const [k, v] of Object.entries(TYPE)) if (typeof v === "number") d[`--cc-type-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(TYPE.tracking)) d[`--cc-track-${k}`] = v;
  for (const [k, v] of Object.entries(INK)) d[`--cc-ink-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(SHAPE)) d[`--cc-${kebab(k)}`] = `${v}px`;
  d["--cc-dur-fast"] = `${MOTION.fast}ms`;
  d["--cc-dur-base"] = `${MOTION.base}ms`;
  d["--cc-dur-slow"] = `${MOTION.slow}ms`;
  d["--cc-ease"] = MOTION.ease;
  return d;
}

/** `selector { --cc-…: …; }` text. */
export function tokensCss(selector = ':root[data-art-style="modern"]') {
  const body = Object.entries(tokenDeclarations())
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

/** Write the tokens onto :root once (Modern scope). Safe to call repeatedly. */
export function injectDesignTokens() {
  if (typeof document === "undefined" || document.getElementById("cc-design-tokens")) return;
  const style = document.createElement("style");
  style.id = "cc-design-tokens";
  style.textContent = tokensCss();
  document.head.appendChild(style);
}
