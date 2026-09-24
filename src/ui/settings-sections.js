/**
 * How the settings deck groups SETTINGS_REGISTRY: six sections, each split
 * into named groups, in the order the spec lays out. The registry stays the
 * one list of settings; this file only says where each one is shown.
 */
import { SETTINGS_REGISTRY, getVisibleSettings } from "../../js/settings-registry.js";

export const SECTIONS = [
  { id: "quick", label: "Quick" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "controls", label: "Controls" },
  { id: "gameplay", label: "Gameplay" },
  { id: "access", label: "Accessibility & HUD" },
];

const at = (section, group, cost) => (cost ? { section, group, cost } : { section, group });

export const SECTION_OF = {
  // Video
  artStyle: at("video", "Look"),
  visualStyle: at("video", "Look"),
  fov: at("video", "Look"),
  viewMode: at("video", "Look"),
  graphicsPreset: at("video", "Quality", "high"),
  renderScale: at("video", "Quality", "high"),
  frameTarget: at("video", "Quality", "med"),
  batterySaver: at("video", "Quality", "high"),
  renderMode: at("video", "Quality", "med"),
  gpuPostFx: at("video", "Quality", "med"),
  enableBloom: at("video", "Effects", "med"),
  enableChromaticAberration: at("video", "Effects", "low"),
  enableFilmGrain: at("video", "Effects", "low"),
  postProcessing: at("video", "Effects", "med"),
  effectsQuality: at("video", "Effects", "med"),
  floorTexture: at("video", "Effects", "med"),
  screenShake: at("video", "Effects", "low"),
  weaponBob: at("video", "Effects", "low"),
  showPerformanceOverlay: at("video", "Diagnostics"),
  // Audio
  masterVolume: at("audio", "Volume"),
  musicVolume: at("audio", "Volume"),
  sfxVolume: at("audio", "Volume"),
  voiceVolume: at("audio", "Volume"),
  // Controls
  sensitivity: at("controls", "Mouse"),
  invertX: at("controls", "Mouse"),
  invertY: at("controls", "Mouse"),
  gamepadStatus: at("controls", "Controller"),
  gamepadCalibrate: at("controls", "Controller"),
  gamepadEnabled: at("controls", "Controller"),
  gamepadLookSensitivity: at("controls", "Controller"),
  gamepadDeadzone: at("controls", "Controller"),
  gamepadRumble: at("controls", "Controller"),
  touchSensitivity: at("controls", "Touch"),
  autoFire: at("controls", "Touch"),
  swipeWeapons: at("controls", "Touch"),
  haptics: at("controls", "Touch"),
  forgeFov: at("controls", "Forge"),
  forgeInvertY: at("controls", "Forge"),
  // Gameplay
  difficulty: at("gameplay", "Challenge"),
  hunterResponse: at("gameplay", "Challenge"),
  cutsceneAutoAdvance: at("gameplay", "Story"),
  crosshair: at("gameplay", "Interface"),
  minimapSize: at("gameplay", "Interface"),
  // Accessibility & HUD
  fontScale: at("access", "Readability"),
  colorblind: at("access", "Readability"),
  hudStyle: at("access", "HUD"),
  editCustomHud: at("access", "HUD"),
  hudScale: at("access", "HUD"),
  staminaBarSize: at("access", "HUD"),
  showPortrait: at("access", "HUD"),
  showWeapons: at("access", "HUD"),
  showKills: at("access", "HUD"),
  showScore: at("access", "HUD"),
};

// Group order per section, as the spec lists them.
const GROUP_ORDER = {
  video: ["Look", "Quality", "Effects", "Diagnostics"],
  audio: ["Volume"],
  controls: ["Mouse", "Keyboard", "Controller", "Touch", "Forge"],
  gameplay: ["Challenge", "Story", "Interface"],
  access: ["Readability", "HUD"],
  quick: [],
};

/** Visible rows of one section, grouped, empty groups dropped. */
export function rowsForSection(sectionId, isTouch, settings) {
  const visible = getVisibleSettings(isTouch, settings);
  const order = GROUP_ORDER[sectionId] ?? [];
  const byGroup = new Map(order.map((g) => [g, []]));
  for (const def of visible) {
    const at = SECTION_OF[def.key];
    if (!at || at.section !== sectionId) continue;
    if (!byGroup.has(at.group)) byGroup.set(at.group, []);
    byGroup.get(at.group).push(def);
  }
  return [...byGroup].filter(([, rows]) => rows.length).map(([group, rows]) => ({ group, rows }));
}

const presetIndex = (name) => {
  const def = SETTINGS_REGISTRY.find((d) => d.key === "graphicsPreset");
  return def.values.findIndex((v) => v.toLowerCase() === name);
};

/** Quick preset cards. Custom only jumps to Video (the deck handles that). */
export const QUICK_CARDS = [
  { id: "battery", label: "Battery", desc: "30 fps cap, lighter effects. For laptops on battery.", apply: (s) => ({ ...s, batterySaver: true }) },
  { id: "balanced", label: "Balanced", desc: "Adapts resolution to hold the frame rate.", apply: (s) => ({ ...s, batterySaver: false, graphicsPreset: presetIndex("auto") }) },
  { id: "max", label: "Max", desc: "Everything on at full resolution.", apply: (s) => ({ ...s, batterySaver: false, graphicsPreset: presetIndex("ultra") }) },
  { id: "custom", label: "Custom", desc: "Pick every option yourself in Video.", apply: (s) => ({ ...s, graphicsPreset: presetIndex("custom") }) },
];

export const ART_CARDS = [
  { style: 0, label: "Legacy" },
  { style: 1, label: "Comic" },
  { style: 2, label: "Modern" },
];
