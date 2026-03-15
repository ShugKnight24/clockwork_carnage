/**
 * Settings registry — pure data, no browser dependencies.
 * Extracted from game.js so layout.js (and its tests) can import
 * without pulling in the entire game module tree.
 */

/** Viewport height threshold for compact mobile layout (landscape phones) */
export const COMPACT_PHONE_HEIGHT = 420;

// ── Settings Registry ──────────────────────────────────
// Single source of truth for all settings. Adding a new setting = adding one object here.
// Fields:
//   key         – property name in this.settings
//   label       – display name in the settings menu
//   type        – "slider" | "toggle" | "enum"
//   platform    – "all" | "mobile" | "desktop"
//   height      – { compact, normal } row heights
//   --- slider-specific ---
//   min, max, step, round  – numeric range
//   format(v)              – value → display string
//   barColor(v)            – value → slider fill color
//   --- enum-specific ---
//   values[]     – display names for each integer value
//   colors[]     – optional per-value colors
//   wrap         – whether cycling wraps around
//   --- toggle-specific ---
//   onColor      – color when ON (defaults to "#00ccff")
//   --- shared ---
//   onChange(game) – callback after value changes
//   widget         – special sub-widget key ("crosshairPreview")
export const SETTINGS_REGISTRY = [
  // ─── Gameplay ───
  {
    key: "difficulty",
    label: "Difficulty",
    type: "enum",
    values: ["Easy", "Normal", "Hard", "Nightmare"],
    colors: ["#44ff44", "#00ccff", "#ffaa00", "#ff2200"],
    min: 0,
    max: 3,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "crosshair",
    label: "Crosshair",
    type: "enum",
    values: [
      "Red Dot",
      "Green Cross",
      "ACOG Scope",
      "Circle",
      "Minimal",
      "None",
    ],
    min: 0,
    max: 5,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 50, normal: 70 },
    widget: "crosshairPreview",
  },
  // ─── Display ───
  {
    key: "minimapSize",
    label: "Minimap Size",
    type: "slider",
    min: 100,
    max: 300,
    step: 20,
    format: (v) => `${v}px`,
    barColor: () => "#00ccff",
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  // ─── Audio ───
  {
    key: "musicVolume",
    label: "Music Volume",
    type: "slider",
    min: 0,
    max: 100,
    step: 10,
    format: (v) => (v === 0 ? "MUTED" : `${v}%`),
    barColor: (v) => (v === 0 ? "#ff4444" : "#00ff88"),
    onChange: (g) => g.audio.setMusicVolume(g.settings.musicVolume / 100),
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "sfxVolume",
    label: "SFX Volume",
    type: "slider",
    min: 0,
    max: 100,
    step: 10,
    format: (v) => (v === 0 ? "MUTED" : `${v}%`),
    barColor: (v) => (v === 0 ? "#ff4444" : "#88aaff"),
    onChange: (g) => g.audio.setSfxVolume(g.settings.sfxVolume / 100),
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  // ─── Controls ───
  {
    key: "sensitivity",
    label: "Mouse Sensitivity",
    type: "slider",
    min: 0.5,
    max: 2.0,
    step: 0.1,
    round: 1,
    format: (v) => `${v.toFixed(1)}x`,
    barColor: () => "#ffcc00",
    platform: "desktop",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "fov",
    label: "FOV",
    type: "slider",
    min: 50,
    max: 120,
    step: 5,
    format: (v) => `${v}°`,
    barColor: () => "#cc88ff",
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "viewMode",
    label: "View Mode",
    type: "enum",
    values: ["First Person", "Third Person"],
    colors: ["#00ccff", "#ff88cc"],
    min: 0,
    max: 1,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "invertX",
    label: "Invert X Axis",
    type: "toggle",
    onColor: "#ff8844",
    platform: "desktop",
    height: { compact: 30, normal: 44 },
  },
  // ─── Accessibility ───
  {
    key: "fontScale",
    label: "Font Scale",
    type: "slider",
    min: 100,
    max: 150,
    step: 25,
    format: (v) => `${v}%`,
    barColor: () => "#aaaacc",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "colorblind",
    label: "Colorblind Mode",
    type: "enum",
    values: ["Off", "Deuteranopia", "Protanopia", "Tritanopia"],
    colors: ["#888888", "#ffcc00", "#ffcc00", "#ffcc00"],
    min: 0,
    max: 3,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "visualStyle",
    label: "Visual Style",
    type: "enum",
    values: ["Clockwork", "Brutal"],
    colors: ["#00ccff", "#ff4422"],
    min: 0,
    max: 1,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => {
      if (g.renderer) g.renderer.applyVisualStyle(g.settings.visualStyle);
    },
  },
  // ─── HUD ───
  {
    key: "hudScale",
    label: "HUD Scale",
    type: "slider",
    min: 75,
    max: 125,
    step: 25,
    format: (v) => `${v}%`,
    barColor: () => "#44ffaa",
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "staminaBarSize",
    label: "Stamina Bar Size",
    type: "slider",
    min: 75,
    max: 150,
    step: 25,
    format: (v) => `${v}%`,
    barColor: () => "#00ccff",
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "showPortrait",
    label: "Show Portrait",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "showWeapons",
    label: "Show Weapons",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "showKills",
    label: "Show Kills",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "showScore",
    label: "Show Score",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  // ─── Touch / Mobile ───
  {
    key: "touchSensitivity",
    label: "Touch Sensitivity",
    type: "slider",
    min: 0.5,
    max: 3.0,
    step: 0.1,
    round: 1,
    format: (v) => `${v.toFixed(1)}x`,
    barColor: () => "#ff88cc",
    platform: "mobile",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "haptics",
    label: "Haptic Feedback",
    type: "toggle",
    onColor: "#00ffcc",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "autoFire",
    label: "Auto-Fire (Twin Stick)",
    type: "toggle",
    onColor: "#ffaa00",
    platform: "mobile",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "swipeWeapons",
    label: "Swipe to Swap Weapons",
    type: "toggle",
    onColor: "#00ccff",
    platform: "mobile",
    height: { compact: 30, normal: 44 },
  },
];

/** Filter registry by platform */
export function getVisibleSettings(isTouchDevice) {
  return SETTINGS_REGISTRY.filter(
    (s) =>
      s.platform === "all" ||
      (s.platform === "mobile" && isTouchDevice) ||
      (s.platform === "desktop" && !isTouchDevice),
  );
}
