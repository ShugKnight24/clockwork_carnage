/**
 * Settings registry — pure data, no browser dependencies.
 * Extracted from game.js so layout.js (and its tests) can import
 * without pulling in the entire game module tree.
 */

// Re-exported for existing importers; the value lives in src/constants.js.
export { COMPACT_PHONE_HEIGHT } from "../src/constants.js";
// art-style.js guards its localStorage/document access, so tests can still
// import this registry without a browser.
import { setArtStyle } from "../src/rendering/art-style.js";

/**
 * Values a fresh profile starts with. Game copies this, then touch-device
 * overrides and saved settings are applied on top.
 */
export const DEFAULT_SETTINGS = Object.freeze({
  crosshair: 0, // 0=red dot, 1=green cross, 2=acog, 3=circle, 4=minimal, 5=none
  difficulty: 1, // 0=easy, 1=normal, 2=hard, 3=nightmare
  cutsceneAutoAdvance: false, // manual advance by default
  minimapSize: 200,
  musicVolume: 80, // 0..100
  sfxVolume: 80, // 0..100
  sensitivity: 0.7, // 0.2..2.0
  fov: 70, // 50..120 degrees
  forgeFov: 120, // Forge only; defaults to the widest view for building
  forgeInvertY: false, // Forge look is non-inverted regardless of the FPS setting
  viewMode: 0, // 0=first-person, 1=third-person
  invertX: false,
  invertY: false,
  fontScale: 100, // 100, 125, 150 percent
  colorblind: 0, // 0=off, 1=deuteranopia, 2=protanopia, 3=tritanopia
  visualStyle: 0, // 0=Clockwork (cartoony), 1=Brutal
  artStyle: 1, // 0=Legacy (procedural canvas art), 1=Modern (vector SVG art)
  hudStyle: 1, // 0=Minimal, 1=Classic DOOM (bottom bar + portrait), 2=Tactical, 3=Custom, 4=Vanguard (Modern only; Legacy draws it as Minimal)
  hudScale: 100, // 75, 100, 125 percent
  staminaBarSize: 100, // 75, 100, 125, 150 percent
  showPortrait: true,
  showWeapons: true,
  showKills: true,
  showScore: true,
  touchSensitivity: 2.0,
  haptics: true,
  autoFire: false,
  swipeWeapons: true,
  graphicsPreset: 0,
  frameTarget: 0,
  batterySaver: false,
  renderScale: 100,
  effectsQuality: 2,
  postProcessing: true,
  gpuPostFx: false, // filmic GPU pass: copies each frame to WebGL, so opt-in
  floorTexture: true,
  screenShake: true,
  weaponBob: true,
  showPerformanceOverlay: false,
  enableBloom: true,
  enableChromaticAberration: true,
  enableFilmGrain: true,
  shadowQuality: 2, // 0=off, 1=low, 2=high
  lightingQuality: 2, // 0=low, 1=medium, 2=high
  renderMode: 0, // 0=auto, 1=2D (Canvas), 2=3D (WebGL)
  gamepadEnabled: true,
  gamepadLookSensitivity: 2.5,
  gamepadDeadzone: 0.15,
  gamepadRumble: true,
});

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
/** Ordered list of setting categories shown in the sidebar */
export const SETTING_CATEGORIES = [
  "Gameplay",
  "Display",
  "Performance",
  "Audio",
  "Controls",
  "Gamepad",
  "Accessibility",
  "HUD",
  "Mobile",
];

export const SETTINGS_REGISTRY = [
  // ─── Gameplay ───
  {
    key: "difficulty",
    label: "Difficulty",
    desc: "Enemy damage, health and aggression.",
    category: "Gameplay",
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
    key: "cutsceneAutoAdvance",
    label: "Cutscene Auto-Advance",
    desc: "Story panels advance on their own.",
    category: "Gameplay",
    type: "toggle",
    onColor: "#ffaa00",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "crosshair",
    label: "Crosshair",
    desc: "Reticle shape drawn at screen centre.",
    category: "Gameplay",
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
    desc: "Pixel width of the corner minimap.",
    category: "Display",
    type: "slider",
    min: 100,
    max: 300,
    step: 20,
    format: (v) => `${v}px`,
    barColor: () => "#00ccff",
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "artStyle",
    label: "Art Style",
    desc: "Legacy pixel look, Comic inked art, or Modern realistic lighting.",
    category: "Display",
    type: "enum",
    // Ids are stable (saved settings store them): 1 is the inked style, 2 the
    // realistic one. Only the player-facing names changed.
    values: ["Legacy", "Comic", "Modern"],
    colors: ["#aa8866", "#00ffcc", "#e8d2a8"],
    min: 0,
    max: 2,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
    // Applied synchronously so input and rendering switch on the same frame.
    onChange: (g) => setArtStyle(g.settings.artStyle),
  },
  {
    key: "visualStyle",
    label: "Visual Style",
    desc: "Colour grade and lighting mood.",
    category: "Display",
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
  // ─── Performance ───
  {
    key: "graphicsPreset",
    label: "Graphics Preset",
    desc: "One-click quality bundle. Auto picks by device.",
    category: "Performance",
    type: "enum",
    values: ["Auto", "Ultra-Low", "Low", "Medium", "High", "Ultra", "Custom"],
    colors: ["#00ffcc", "#666688", "#88aacc", "#00ccff", "#44ffaa", "#ffaa00", "#cc88ff"],
    min: 0,
    max: 6,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "frameTarget",
    label: "Frame Target",
    desc: "Frame cap. Auto follows the display refresh rate.",
    category: "Performance",
    type: "enum",
    values: ["Auto", "30 FPS", "60 FPS", "90 FPS", "120 FPS"],
    colors: ["#00ffcc", "#88aacc", "#00ccff", "#44ffaa", "#ffaa00"],
    min: 0,
    max: 4,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "batterySaver",
    label: "Battery Saver",
    desc: "Lower the frame cap and render scale to save power.",
    category: "Performance",
    type: "toggle",
    onColor: "#44ffaa",
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "renderScale",
    label: "Render Scale",
    desc: "Internal resolution. Lower is faster and softer.",
    category: "Performance",
    type: "slider",
    min: 50,
    max: 100,
    step: 10,
    format: (v) => `${v}%`,
    barColor: () => "#00ccff",
    platform: "all",
    height: { compact: 42, normal: 60 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "effectsQuality",
    label: "Effects Quality",
    desc: "Particle, decal and debris budget.",
    category: "Performance",
    type: "enum",
    values: ["Low", "Medium", "High"],
    colors: ["#88aacc", "#00ccff", "#ffaa00"],
    min: 0,
    max: 2,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "postProcessing",
    label: "Post Processing",
    desc: "Full-screen effect pass. Off is fastest.",
    category: "Performance",
    type: "toggle",
    onColor: "#cc88ff",
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "gpuPostFx",
    label: "GPU Film Grade",
    desc: "Filmic tonemap, bloom and grain on the GPU. Can stutter on some devices.",
    category: "Performance",
    type: "toggle",
    onColor: "#cc88ff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "floorTexture",
    label: "Floor Detail",
    desc: "Detailed floor and ceiling texturing.",
    category: "Performance",
    type: "toggle",
    onColor: "#ffaa00",
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "screenShake",
    label: "Screen Shake",
    desc: "Camera kick on hits and explosions.",
    category: "Performance",
    type: "toggle",
    onColor: "#ff8844",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "weaponBob",
    label: "Weapon Bob",
    desc: "Weapon sway while moving.",
    category: "Performance",
    type: "toggle",
    onColor: "#44ffaa",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "showPerformanceOverlay",
    label: "Performance Overlay",
    desc: "FPS and frame-time readout. Same as F.",
    category: "Performance",
    type: "toggle",
    onColor: "#ffcc00",
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => { g.showFPS = !!g.settings.showPerformanceOverlay; },
  },
  {
    key: "enableBloom",
    label: "Bloom",
    desc: "Glow bleed around bright pixels.",
    category: "Performance",
    type: "toggle",
    onColor: "#cc88ff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "enableChromaticAberration",
    label: "Chromatic Aberration",
    desc: "Colour fringing towards the screen edges.",
    category: "Performance",
    type: "toggle",
    onColor: "#cc88ff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "enableFilmGrain",
    label: "Film Grain",
    desc: "Animated grain over the frame.",
    category: "Performance",
    type: "toggle",
    onColor: "#cc88ff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "shadowQuality",
    label: "Shadow Quality",
    desc: "Resolution of cast shadows.",
    category: "Performance",
    type: "enum",
    values: ["Off", "Low", "High"],
    colors: ["#888888", "#88aacc", "#ffaa00"],
    min: 0,
    max: 2,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "lightingQuality",
    label: "Lighting Quality",
    desc: "Number of dynamic lights drawn per frame.",
    category: "Performance",
    type: "enum",
    values: ["Low", "Medium", "High"],
    colors: ["#88aacc", "#00ccff", "#ffaa00"],
    min: 0,
    max: 2,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyPerformanceSettings?.(),
  },
  {
    key: "renderMode",
    label: "Render Mode",
    desc: "Canvas2D, or the WebGL hybrid renderer.",
    category: "Display",
    type: "enum",
    values: ["Auto", "2D (Canvas)", "3D (WebGL)"],
    colors: ["#00ffcc", "#00ccff", "#ffaa00"],
    min: 0,
    max: 2,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyRenderMode?.(),
  },
  // ─── Audio ───
  {
    key: "musicVolume",
    label: "Music Volume",
    desc: "Soundtrack level.",
    category: "Audio",
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
    desc: "Weapons, enemies and interface level.",
    category: "Audio",
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
    desc: "Mouse look speed.",
    category: "Controls",
    type: "slider",
    min: 0.2,
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
    desc: "Field of view in degrees. Higher sees wider.",
    category: "Controls",
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
    key: "forgeFov",
    label: "Forge FOV",
    desc: "Field of view inside the Forge. Separate from the campaign so building can sit further back.",
    category: "Controls",
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
    key: "forgeInvertY",
    label: "Forge Invert Y",
    desc: "Invert vertical look inside the Forge only. Off by default.",
    category: "Controls",
    type: "toggle",
    platform: "all",
    height: { compact: 42, normal: 60 },
  },
  {
    key: "viewMode",
    label: "View Mode",
    desc: "Camera position for the player character.",
    category: "Controls",
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
    desc: "Flip the horizontal look direction.",
    category: "Controls",
    type: "toggle",
    onColor: "#ff8844",
    platform: "desktop",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "invertY",
    label: "Invert Y Axis",
    desc: "Flip the vertical look direction.",
    category: "Controls",
    type: "toggle",
    onColor: "#ff8844",
    platform: "desktop",
    height: { compact: 30, normal: 44 },
  },
  // ─── Gamepad ───
  {
    key: "gamepadEnabled",
    label: "Controller Support",
    desc: "Read connected controllers.",
    category: "Gamepad",
    type: "toggle",
    onColor: "#00ffcc",
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyGamepadSettings?.(),
  },
  {
    key: "gamepadLookSensitivity",
    label: "Look Sensitivity",
    desc: "Right-stick look speed.",
    category: "Gamepad",
    type: "slider",
    min: 0.5,
    max: 4.0,
    step: 0.25,
    round: 2,
    format: (v) => `${v.toFixed(2)}x`,
    barColor: () => "#cc88ff",
    platform: "all",
    height: { compact: 42, normal: 60 },
    onChange: (g) => g.applyGamepadSettings?.(),
  },
  {
    key: "gamepadDeadzone",
    label: "Stick Deadzone",
    desc: "Stick travel ignored around centre. Raise to stop drift.",
    category: "Gamepad",
    type: "slider",
    min: 0.05,
    max: 0.35,
    step: 0.05,
    round: 2,
    format: (v) => `${Math.round(v * 100)}%`,
    barColor: () => "#00ccff",
    platform: "all",
    height: { compact: 42, normal: 60 },
    onChange: (g) => g.applyGamepadSettings?.(),
  },
  {
    key: "gamepadRumble",
    label: "Controller Rumble",
    desc: "Vibration on hits and weapon fire.",
    category: "Gamepad",
    type: "toggle",
    onColor: "#ffaa00",
    platform: "all",
    height: { compact: 30, normal: 44 },
    onChange: (g) => g.applyGamepadSettings?.(),
  },
  // ─── Accessibility ───
  {
    key: "fontScale",
    label: "Font Scale",
    desc: "Size of all interface text.",
    category: "Accessibility",
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
    desc: "Recolour damage, pickups and markers.",
    category: "Accessibility",
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
  // ─── HUD ───
  {
    key: "hudStyle",
    label: "HUD Style",
    desc: "Preset arrangement of the heads-up display.",
    category: "HUD",
    type: "enum",
    values: ["Minimal", "Classic DOOM", "Tactical", "Custom", "Vanguard"],
    colors: ["#00ccff", "#ff2200", "#44ffaa", "#cc88ff", "#22e6ff"],
    min: 0,
    max: 4,
    step: 1,
    wrap: true,
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "editCustomHud",
    label: "Edit Custom HUD",
    desc: "Open the drag-and-drop HUD editor.",
    category: "HUD",
    type: "action",
    buttonLabel: "EDIT LAYOUT",
    color: "#cc88ff",
    platform: "all",
    height: { compact: 30, normal: 44 },
    onClick: (game) => game.hudEditor.start(),
  },
  {
    key: "hudScale",
    label: "HUD Scale",
    desc: "Size of the heads-up display.",
    category: "HUD",
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
    desc: "Width of the stamina bar.",
    category: "HUD",
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
    desc: "Character portrait and health face.",
    category: "HUD",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "showWeapons",
    label: "Show Weapons",
    desc: "Weapon slot strip.",
    category: "HUD",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "showKills",
    label: "Show Kills",
    desc: "Kill counter.",
    category: "HUD",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "showScore",
    label: "Show Score",
    desc: "Score readout.",
    category: "HUD",
    type: "toggle",
    onColor: "#00ccff",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  // ─── Touch / Mobile ───
  {
    key: "touchSensitivity",
    label: "Touch Sensitivity",
    desc: "Drag-to-look speed.",
    category: "Mobile",
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
    desc: "Vibration on touch controls.",
    category: "Mobile",
    type: "toggle",
    onColor: "#00ffcc",
    platform: "all",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "autoFire",
    label: "Auto-Fire (Twin Stick)",
    desc: "Fire automatically while the right stick is held.",
    category: "Mobile",
    type: "toggle",
    onColor: "#ffaa00",
    platform: "mobile",
    height: { compact: 30, normal: 44 },
  },
  {
    key: "swipeWeapons",
    label: "Swipe to Swap Weapons",
    desc: "Swipe across the screen to change weapon.",
    category: "Mobile",
    type: "toggle",
    onColor: "#00ccff",
    platform: "mobile",
    height: { compact: 30, normal: 44 },
  },
];

/** Filter registry by platform */
export function getVisibleSettings(isTouchDevice, settings) {
  return SETTINGS_REGISTRY.filter((s) => {
    if (s.isVisible && settings && !s.isVisible(settings)) return false;
    return (
      s.platform === "all" ||
      (s.platform === "mobile" && isTouchDevice) ||
      (s.platform === "desktop" && !isTouchDevice)
    );
  });
}

/** Filter registry by platform AND category */
export function getSettingsForCategory(isTouchDevice, category, settings) {
  return getVisibleSettings(isTouchDevice, settings).filter(
    (s) => s.category === category,
  );
}

/** Return ordered list of categories that have at least one visible setting */
export function getVisibleCategories(isTouchDevice, settings) {
  const visible = getVisibleSettings(isTouchDevice, settings);
  return SETTING_CATEGORIES.filter((cat) =>
    visible.some((s) => s.category === cat),
  );
}

/**
 * Apply a +1 or -1 step to a setting value in-place.
 * Handles toggle, wrap-around enum, and clamped slider types.
 * Returns true if the value changed.
 */
export function applySettingStep(settings, def, direction) {
  const old = settings[def.key];
  if (def.type === "toggle") {
    settings[def.key] = !settings[def.key];
  } else if (def.wrap) {
    const range = def.max - def.min + 1;
    settings[def.key] =
      def.min + ((settings[def.key] - def.min + direction + range) % range);
  } else {
    let val = settings[def.key] + direction * def.step;
    val = Math.max(def.min, Math.min(def.max, val));
    if (def.round != null)
      val = Math.round(val * Math.pow(10, def.round)) / Math.pow(10, def.round);
    settings[def.key] = val;
  }
  return settings[def.key] !== old;
}

/** Format a setting definition + current value into display-ready { label, value, color } */
export function settingDisplayItem(def, settings) {
  const v = settings[def.key];
  switch (def.type) {
    case "toggle":
      return {
        label: def.label,
        value: v ? "ON" : "OFF",
        color: v ? def.onColor || "#00ccff" : "#888888",
      };
    case "enum":
      return {
        label: def.label,
        value: def.values[v] || String(v),
        color: def.colors ? def.colors[v] : undefined,
      };
    case "slider":
      return {
        label: def.label,
        value: def.format ? def.format(v) : String(v),
        color: undefined,
      };
    case "action":
      return {
        label: def.label,
        value: def.buttonLabel || "ACT",
        color: def.color || "#ffffff",
      };
    default:
      return { label: def.label, value: String(v) };
  }
}
