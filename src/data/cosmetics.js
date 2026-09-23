// ── Character Creator ────────────────────────────────────

import { DEFAULT_BADGE } from "./badges.js";
import { ACCESSORY_SLOTS, DEFAULT_ACCESSORIES, accessoryItem } from "./accessories.js";

export const CHARACTER_COLORS = [
  {
    id: "chrono_teal",
    name: "Chrono Teal",
    primary: "#00ccaa",
    accent: "#00ffdd",
    dark: "#005544",
  },
  {
    id: "midnight_blue",
    name: "Midnight Blue",
    primary: "#2244aa",
    accent: "#4488ff",
    dark: "#112255",
  },
  {
    id: "paradox_red",
    name: "Paradox Red",
    primary: "#aa2233",
    accent: "#ff4455",
    dark: "#551122",
  },
  {
    id: "void_purple",
    name: "Void Purple",
    primary: "#6622aa",
    accent: "#aa44ff",
    dark: "#331166",
  },
  {
    id: "solar_gold",
    name: "Solar Gold",
    primary: "#aa8822",
    accent: "#ffcc44",
    dark: "#554411",
  },
  {
    id: "arctic_white",
    name: "Arctic White",
    primary: "#99aabb",
    accent: "#ddeeff",
    dark: "#445566",
  },
  {
    id: "neon_green",
    name: "Neon Green",
    primary: "#22aa44",
    accent: "#44ff66",
    dark: "#115522",
  },
  {
    id: "rust_orange",
    name: "Rust Orange",
    primary: "#aa5522",
    accent: "#ff8844",
    dark: "#552211",
  },
];

export const SKIN_TONES = [
  { id: "warm_light", name: "Warm Light", color: "#d8a06f", shadow: "#8f5b3c" },
  { id: "golden", name: "Golden", color: "#b98252", shadow: "#70432c" },
  { id: "deep_brown", name: "Deep Brown", color: "#6b3d2e", shadow: "#321b17" },
  { id: "cool_fair", name: "Cool Fair", color: "#e2bda3", shadow: "#9b735f" },
  { id: "olive", name: "Olive", color: "#a97952", shadow: "#5b3e2f" },
  { id: "synthetic", name: "Synthetic Chrome", color: "#9fa8b8", shadow: "#4a5260" },
];

export const HAIR_STYLES = [
  { id: "buzz", name: "Buzz Cut", desc: "Regulation close crop", color: "#1b1512" },
  { id: "short", name: "Short Sweep", desc: "Field-ready sweep", color: "#3b2418" },
  { id: "coil", name: "Coils", desc: "Compact tactical coils", color: "#120d0b" },
  { id: "braid", name: "Side Braid", desc: "Tucked under the comm band", color: "#2a1710" },
  { id: "white", name: "White Shock", desc: "Temporal stress streak", color: "#d9e8ff" },
  { id: "none", name: "Clean Shave", desc: "Helmet-seal smooth", color: "#111111" },
];

export const EYE_COLORS = [
  { id: "amber", name: "Amber", color: "#ffcc66" },
  { id: "blue", name: "Blue", color: "#66bbff" },
  { id: "green", name: "Green", color: "#77ff99" },
  { id: "violet", name: "Violet", color: "#bb88ff" },
  { id: "red", name: "Chrono Red", color: "#ff5566" },
  { id: "silver", name: "Silver", color: "#ddeeff" },
];

export const ARMOR_STYLES = [
  {
    id: "standard",
    name: "Standard Issue",
    desc: "Regulation Chrono-Corp armor",
    tier: 1,
    badgeTreatment: { finish: "insignia", metal: "brass" },
    variant: { id: "standard_parade", name: "Parade Dress", desc: "Polished for the medal line", trim: "#d9a441", wear: 0, badgeTreatment: { finish: "insignia", metal: "gold" }, unlock: { type: "achievement", id: "tutorialGrad", label: "Earn Academy Graduate" } },
  },
  {
    id: "recon",
    name: "Recon",
    desc: "Lightweight scout plating",
    tier: 2,
    bonuses: { moveSpeedAdd: 0.25, maxStaminaAdd: 15 },
    badgeTreatment: { finish: "stencil", metal: "steel" },
    variant: { id: "recon_ghostline", name: "Ghostline", desc: "Taped seams, scuffed paint", trim: "#9fb8c8", wear: 0.5, badgeTreatment: { finish: "stencil", metal: "blackened" }, unlock: { type: "dashes", count: 500, label: "Dash 500 times", unit: "dashes" } },
  },
  {
    id: "heavy",
    name: "Juggernaut",
    desc: "Reinforced temporal shielding",
    tier: 3,
    bonuses: { maxHealthAdd: 25, armorAdd: 6, moveSpeedAdd: -0.15 },
    badgeTreatment: { finish: "insignia", metal: "steel" },
    variant: { id: "juggernaut_siegebreaker", name: "Siegebreaker", desc: "Battle-scarred and riveted", trim: "#b0482c", wear: 0.8, badgeTreatment: { finish: "stencil", metal: "steel" }, unlock: { type: "achievement", id: "centurion", label: "Earn Centurion" } },
  },
  {
    id: "stealth",
    name: "Ghost",
    desc: "Low-profile shadow plating",
    tier: 2,
    bonuses: { dashCostAdd: -4, moveSpeedAdd: 0.1 },
    badgeTreatment: { finish: "insignia", metal: "blackened" },
    variant: { id: "ghost_nightfall", name: "Nightfall", desc: "Light-eating finish", trim: "#3a4a66", wear: 0.1, badgeTreatment: { finish: "insignia", metal: "blackened" }, unlock: { type: "achievement", id: "untouchable", label: "Earn Untouchable" } },
  },
  {
    id: "tech",
    name: "Engineer",
    desc: "Utility-integrated hardsuit",
    tier: 3,
    bonuses: { maxChronoEnergyAdd: 25, maxHealthAdd: 10 },
    badgeTreatment: { finish: "stencil", metal: "steel" },
    variant: { id: "engineer_foreman", name: "Foreman", desc: "Hazard stripes and tool scars", trim: "#e0a030", wear: 0.6, badgeTreatment: { finish: "stencil", metal: "brass" }, unlock: { type: "achievement", id: "droneHunter", label: "Earn Drone Hunter" } },
  },
  {
    id: "howitzer",
    name: "Howitzer",
    desc: "Shoulder-mounted ordnance platform",
    tier: 3,
    bonuses: { maxHealthAdd: 20, armorAdd: 6, moveSpeedAdd: -0.2 },
    badgeTreatment: { finish: "insignia", metal: "steel" },
    variant: { id: "howitzer_redline", name: "Redline", desc: "Heat-blued barrels and red trim", trim: "#c8342a", wear: 0.5, badgeTreatment: { finish: "insignia", metal: "blackened" }, unlock: { type: "achievement", id: "scoreMaster", label: "Earn Score Master" } },
  },
  {
    id: "trencher",
    name: "Trencher",
    desc: "Slab-plated line infantry rig",
    tier: 3,
    bonuses: { maxHealthAdd: 20, armorAdd: 5, maxStaminaAdd: 10 },
    badgeTreatment: { finish: "patch", metal: "brass" },
    variant: { id: "trencher_mudlark", name: "Mudlark", desc: "Caked in trench mud", trim: "#6a5a3a", wear: 1, badgeTreatment: { finish: "patch", metal: "blackened" }, unlock: { type: "achievement", id: "roundVeteran", label: "Earn Round Veteran" } },
  },
  {
    id: "reliquary",
    name: "Reliquary",
    desc: "Matte black crusader plate, candy red tabard",
    tier: 3,
    bonuses: { maxHealthAdd: 15, armorAdd: 7, maxChronoEnergyAdd: 10 },
    badgeTreatment: { finish: "insignia", metal: "gold" },
    variant: { id: "reliquary_gilded", name: "Gilded", desc: "Gold leaf over every edge", trim: "#f2c230", wear: 0, badgeTreatment: { finish: "insignia", metal: "gold" }, unlock: { type: "achievement", id: "lordSlayer", label: "Earn Lord Slayer" } },
  },
  {
    id: "pathfinder",
    name: "Pathfinder",
    desc: "Sealed ceramic recon shell",
    tier: 2,
    bonuses: { moveSpeedAdd: 0.2, maxStaminaAdd: 20, dashCostAdd: -3 },
    badgeTreatment: { finish: "insignia", metal: "brass" },
    variant: { id: "pathfinder_frontier", name: "Frontier", desc: "Sun-bleached and patched", trim: "#c8b98a", wear: 0.7, badgeTreatment: { finish: "patch", metal: "brass" }, unlock: { type: "achievement", id: "speedDemon", label: "Earn Speed Demon" } },
  },
];

export const HELMET_STYLES = [
  { id: "standard", name: "Standard Dome", desc: "Regulation sphere shell", tier: 1 },
  { id: "wide", name: "Bastion", desc: "Wide reinforced dome", tier: 2, bonuses: { maxHealthAdd: 10 } },
  { id: "angular", name: "Angular", desc: "Faceted tactical shell", tier: 2, bonuses: { armorAdd: 3 } },
  { id: "mohawk", name: "Centurion", desc: "Crested ridge crown", tier: 3, bonuses: { maxHealthAdd: 15, armorAdd: 2 } },
  { id: "crested", name: "Vanguard", desc: "Forward combat fin", tier: 3, bonuses: { maxStaminaAdd: 20, moveSpeedAdd: 0.1 } },
  { id: "ordnance", name: "Ordnance", desc: "Faceted gunner's helm with targeting spine", tier: 3, bonuses: { armorAdd: 4, maxHealthAdd: 8 } },
  { id: "bucket", name: "Bucket", desc: "Low riveted dome, sunk into the collar", tier: 3, bonuses: { maxHealthAdd: 18 } },
  { id: "crusader", name: "Crusader", desc: "Beaked cast helm, rivet crown", tier: 3, bonuses: { armorAdd: 5, maxChronoEnergyAdd: 8 } },
  { id: "sealed", name: "Sealed", desc: "One-piece shell, no seams", tier: 2, bonuses: { maxStaminaAdd: 12, moveSpeedAdd: 0.08 } },
];

export const VISOR_STYLES = [
  { id: "standard", name: "Wide Visor", desc: "Full lower-arc optics", tier: 1 },
  { id: "slit", name: "Slit", desc: "Narrow tactical band", tier: 2, bonuses: { maxChronoEnergyAdd: 10 } },
  { id: "fullface", name: "Blackout", desc: "Full-face mirrored shell", tier: 3, bonuses: { armorAdd: 4, maxChronoEnergyAdd: 10 } },
  { id: "split", name: "Dual Lens", desc: "Twin segmented optics", tier: 2, bonuses: { maxStaminaAdd: 10 } },
  { id: "glow", name: "Beacon", desc: "High-lumen emitter strip", tier: 3, bonuses: { maxChronoEnergyAdd: 25 } },
];

export const SHOULDER_STYLES = [
  { id: "none", name: "Bare", desc: "No additional plating", tier: 1 },
  { id: "pads", name: "Combat Pads", desc: "Standard oval shoulder pads", tier: 1 },
  { id: "spikes", name: "Jagged", desc: "Aggressive spiked guards", tier: 2, bonuses: { armorAdd: 3 } },
  { id: "pauldrons", name: "Pauldrons", desc: "Heavy trapezoidal plates", tier: 3, bonuses: { maxHealthAdd: 15, armorAdd: 4 } },
  { id: "armored", name: "Bulwark", desc: "Angular armored blocks", tier: 3, bonuses: { armorAdd: 8, moveSpeedAdd: -0.1 } },
  { id: "slab", name: "Slab", desc: "Oversized rounded shoulder slabs", tier: 3, bonuses: { maxHealthAdd: 18, armorAdd: 4, moveSpeedAdd: -0.12 } },
  { id: "dome", name: "Domed", desc: "Deep crusader half-shells with a raised rim", tier: 3, bonuses: { armorAdd: 9, moveSpeedAdd: -0.08 } },
  { id: "ordnance", name: "Launcher", desc: "Vented ordnance housing on a rail", tier: 3, bonuses: { armorAdd: 6, maxHealthAdd: 10, moveSpeedAdd: -0.1 } },
  { id: "layered", name: "Layered", desc: "Stepped overlapping plates", tier: 2, bonuses: { maxStaminaAdd: 14, moveSpeedAdd: 0.1 } },
];

/**
 * Unlock rules for tiered gear (armor, helmet, visor, shoulders). Tier 1 is
 * standard issue. Rule shapes are evaluated in src/systems/unlocks.js.
 */
export const TIER_UNLOCKS = {
  2: { type: "tutorial", label: "Graduate Chronos Academy (tutorial)" },
  3: {
    type: "anyOf",
    label: "Clear Act 1 or survive arena round 5",
    rules: [
      { type: "campaignLevels", count: 3, label: "Clear Act 1", unit: "levels" },
      { type: "arenaRound", count: 5, label: "Survive arena round 5", unit: "rounds" },
    ],
  },
};

export const BADGES = [
  { id: "none", name: "None", icon: null },
  { id: "shield", name: "Temporal Shield", icon: "shield" },
  { id: "skull", name: "Kill Specialist", icon: "skull" },
  { id: "clock", name: "Chrono Division", icon: "clock" },
  { id: "star", name: "Gold Star", icon: "star" },
  { id: "bolt", name: "Lightning Strike", icon: "bolt" },
  { id: "eye", name: "The Watcher", icon: "eye" },
  { id: "rift", name: "Rift Walker", icon: "rift" },
];

export const WEAPON_SKINS = [
  { id: "default", name: "Factory Default", desc: "Standard issue finish" },
  { id: "carbon", name: "Carbon Fiber", desc: "Matte black composite" },
  { id: "chrome", name: "Chrome", desc: "Polished reflective plating" },
  { id: "ember", name: "Ember", desc: "Heat-treated orange glow" },
  { id: "frost", name: "Frostbite", desc: "Cryo-cooled blue tint" },
  { id: "toxic", name: "Toxic", desc: "Corrosive green finish" },
];

export const LOADOUT_CLASSES = [
  {
    id: "recruit",
    name: "Recruit",
    desc: "Balanced starter",
    startWeapons: [0],
    bonuses: {},
  },
  {
    id: "gunslinger",
    name: "Gunslinger",
    desc: "Fast hands, light feet",
    // Earned with the sidearms every agent starts with.
    unlock: { type: "weaponKills", weapons: [0, 6], count: 40, label: "Score 40 pistol kills", unit: "kills" },
    startWeapons: [0, 1],
    bonuses: { fireRateMultiplier: 0.9 },
  },
  {
    id: "enforcer",
    name: "Enforcer",
    desc: "Heavy armor, heavy hits",
    unlock: { type: "campaignLevels", count: 3, label: "Clear Act 1 of the campaign", unit: "levels" },
    startWeapons: [0],
    bonuses: { maxHealth: 125, moveSpeed: -0.3 },
  },
  {
    id: "phantom",
    name: "Phantom",
    desc: "Speed demon",
    unlock: { type: "dashes", count: 50, label: "Dash 50 times", unit: "dashes" },
    startWeapons: [0],
    bonuses: { moveSpeed: 0.5, maxStamina: 130 },
  },
  // ── Special forces ──
  // What the cadet is training to become. Each one is a role rather than a
  // stat tilt: they change which weapon you open a fight with.
  {
    id: "breacher",
    name: "Breacher",
    desc: "First through the door",
    unlock: { type: "weaponKills", weapons: [1, 4], count: 40, label: "Score 40 shotgun kills", unit: "kills" },
    startWeapons: [0, 1],
    bonuses: { maxHealth: 115, moveSpeed: -0.1 },
  },
  {
    id: "marksman",
    name: "Marksman",
    desc: "One shot, one target",
    unlock: { type: "weaponKills", weapons: [2, 5], count: 30, label: "Score 30 rifle kills", unit: "kills" },
    startWeapons: [0, 5],
    bonuses: { moveSpeed: -0.15, maxStamina: 115 },
  },
  {
    id: "saboteur",
    name: "Saboteur",
    desc: "Breaks what shoots back",
    unlock: { type: "arenaRound", count: 10, label: "Survive 10 arena rounds", unit: "rounds" },
    startWeapons: [0, 7],
    bonuses: { fireRateMultiplier: 0.95 },
  },
  {
    id: "corpsman",
    name: "Corpsman",
    desc: "Keeps the squad standing",
    unlock: { type: "campaignLevels", count: 6, label: "Clear Act 2 of the campaign", unit: "levels" },
    startWeapons: [0, 1],
    // Regen is the squad-support kit turned inward until there is a squad to
    // point it at. See src/systems/unlocks.js for how the class is earned.
    bonuses: { maxHealth: 110, regenRate: 1.4 },
  },
];

export const BACKSTORIES = [
  {
    id: "beat_cop",
    name: "Beat Cop",
    desc: "Street instincts, steady hands, first one through the door.",
    perk: "+5 max health",
    bonuses: { maxHealthAdd: 5 },
  },
  {
    id: "rift_scientist",
    name: "Rift Scientist",
    desc: "You helped build the chrono tech. Now you get to survive it.",
    perk: "+10 chrono energy",
    bonuses: { maxChronoEnergyAdd: 10 },
  },
  {
    id: "arena_runner",
    name: "Arena Runner",
    desc: "Courier reflexes, illegal footwork, impossible escapes.",
    perk: "Dash costs -3 stamina",
    bonuses: { dashCostAdd: -3 },
  },
  {
    id: "ex_enforcer",
    name: "Ex-Enforcer",
    desc: "Armor discipline from a timeline that no longer exists.",
    perk: "+8 armor on deployment",
    bonuses: { armorAdd: 8 },
  },
];

export const VOICE_PROFILES = [
  { id: "rookie", name: "Rookie", desc: "Young, sharp, nervous under fire", pitch: 1.25 },
  { id: "veteran", name: "Veteran", desc: "Low, controlled, exhausted", pitch: 0.82 },
  { id: "calm", name: "Calm", desc: "Measured breaths, no panic", pitch: 1.0 },
  { id: "synthetic", name: "Synthetic", desc: "Vocoder edge, chrono-modulated", pitch: 1.45 },
];

/**
 * The starting look. `badge` and `accessories` are the shared singletons from
 * badges.js / accessories.js, so a spread of this record aliases them — build a
 * live, editable character with `cloneLook(DEFAULT_CHARACTER)` instead.
 */
export const DEFAULT_CHARACTER = {
  name: "Agent",
  colorIndex: 0,
  skinToneIndex: 0,
  hairIndex: 0,
  eyeIndex: 0,
  armorIndex: 0,
  helmetIndex: 0,
  visorIndex: 0,
  shoulderIndex: 0,
  badgeIndex: 0,
  weaponSkinIndex: 0,
  loadoutIndex: 0,
  backstoryIndex: 0,
  voiceIndex: 0,
  badge: DEFAULT_BADGE,
  accessories: DEFAULT_ACCESSORIES,
  armorVariant: 0,
};

/**
 * Slots whose equipped option can carry stat bonuses, in the order they are
 * summed. Gear uses the same bonus vocabulary as origins (see BACKSTORIES).
 */
export const GEAR_SLOTS = [
  ["armorIndex", () => ARMOR_STYLES],
  ["helmetIndex", () => HELMET_STYLES],
  ["visorIndex", () => VISOR_STYLES],
  ["shoulderIndex", () => SHOULDER_STYLES],
];

/**
 * Total stat bonuses from everything a character is wearing. Additive, and
 * recomputed from the character each run — nothing about gear is persisted on
 * the player.
 * @param {object} character
 * @returns {Record<string, number>}
 */
export function gearBonuses(character) {
  const out = {};
  if (!character) return out;
  const add = (bonuses) => {
    if (!bonuses) return;
    for (const [stat, value] of Object.entries(bonuses)) out[stat] = (out[stat] || 0) + value;
  };
  for (const [key, table] of GEAR_SLOTS) add(table()[character[key] || 0]?.bonuses);
  const acc = character.accessories || {};
  for (const { id } of ACCESSORY_SLOTS) add(accessoryItem(id, acc[id])?.bonuses);
  return out;
}
