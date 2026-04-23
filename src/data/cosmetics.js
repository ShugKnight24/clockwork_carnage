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
    unlocked: true,
    startWeapons: [0],
    bonuses: {},
  },
  {
    id: "gunslinger",
    name: "Gunslinger",
    desc: "Fast hands, light feet",
    unlocked: false,
    startWeapons: [0, 1],
    bonuses: { fireRateMultiplier: 0.9 },
  },
  {
    id: "enforcer",
    name: "Enforcer",
    desc: "Heavy armor, heavy hits",
    unlocked: false,
    startWeapons: [0],
    bonuses: { maxHealth: 125, moveSpeed: -0.3 },
  },
  {
    id: "phantom",
    name: "Phantom",
    desc: "Speed demon",
    unlocked: false,
    startWeapons: [0],
    bonuses: { moveSpeed: 0.5, maxStamina: 130 },
  },
];

export const DEFAULT_CHARACTER = {
  name: "Agent",
  colorIndex: 0,
  armorIndex: 0,
  helmetIndex: 0,
  visorIndex: 0,
  shoulderIndex: 0,
  badgeIndex: 0,
  weaponSkinIndex: 0,
  loadoutIndex: 0,
};
