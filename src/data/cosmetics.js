// ── Character Creator ────────────────────────────────────

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
  },
  { id: "recon", name: "Recon", desc: "Lightweight scout plating", tier: 2 },
  {
    id: "heavy",
    name: "Juggernaut",
    desc: "Reinforced temporal shielding",
    tier: 3,
  },
  { id: "stealth", name: "Ghost", desc: "Low-profile shadow plating", tier: 2 },
  {
    id: "tech",
    name: "Engineer",
    desc: "Utility-integrated hardsuit",
    tier: 3,
  },
];

export const HELMET_STYLES = [
  { id: "standard", name: "Standard Dome", desc: "Regulation sphere shell", tier: 1 },
  { id: "wide", name: "Bastion", desc: "Wide reinforced dome", tier: 2 },
  { id: "angular", name: "Angular", desc: "Faceted tactical shell", tier: 2 },
  { id: "mohawk", name: "Centurion", desc: "Crested ridge crown", tier: 3 },
  { id: "crested", name: "Vanguard", desc: "Forward combat fin", tier: 3 },
];

export const VISOR_STYLES = [
  { id: "standard", name: "Wide Visor", desc: "Full lower-arc optics", tier: 1 },
  { id: "slit", name: "Slit", desc: "Narrow tactical band", tier: 2 },
  { id: "fullface", name: "Blackout", desc: "Full-face mirrored shell", tier: 3 },
  { id: "split", name: "Dual Lens", desc: "Twin segmented optics", tier: 2 },
  { id: "glow", name: "Beacon", desc: "High-lumen emitter strip", tier: 3 },
];

export const SHOULDER_STYLES = [
  { id: "none", name: "Bare", desc: "No additional plating", tier: 1 },
  { id: "pads", name: "Combat Pads", desc: "Standard oval shoulder pads", tier: 1 },
  { id: "spikes", name: "Jagged", desc: "Aggressive spiked guards", tier: 2 },
  { id: "pauldrons", name: "Pauldrons", desc: "Heavy trapezoidal plates", tier: 3 },
  { id: "armored", name: "Bulwark", desc: "Angular armored blocks", tier: 3 },
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
};
