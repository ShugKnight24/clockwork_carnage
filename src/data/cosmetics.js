// ── Character Creator ────────────────────────────────────

import { DEFAULT_BADGE } from "./badges.js";
import { ACCESSORY_SLOTS, DEFAULT_ACCESSORIES, FACE_SLOTS, accessoryItem } from "./accessories.js";
import { RETIRED_PIECES } from "./retired-pieces.js";
import { themeTable, frameHides, helmetSeats, helmetFaceSlots } from "./wardrobe-themes/index.js";

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
  // Earned palettes: each carries the rule that unlocks it (src/systems/unlocks.js).
  {
    id: "gunmetal",
    name: "Gunmetal",
    primary: "#4a5560",
    accent: "#9fd0ff",
    dark: "#1c2229",
    unlock: { type: "dashes", count: 300, label: "Dash 300 times", unit: "dashes" },
  },
  {
    id: "glacier",
    name: "Glacier",
    primary: "#3f8fb0",
    accent: "#a8f4ff",
    dark: "#123a4a",
    unlock: { type: "arenaRound", count: 10, label: "Survive arena round 10", unit: "rounds" },
  },
  {
    id: "copper_patina",
    name: "Copper Patina",
    primary: "#2f7a68",
    accent: "#ffa860",
    dark: "#143a31",
    unlock: { type: "campaignActs", count: 2, label: "Clear Act 2", unit: "acts" },
  },
  {
    id: "sakura",
    name: "Sakura",
    primary: "#b04c7a",
    accent: "#ff9ed0",
    dark: "#4a1a33",
    unlock: { type: "achievement", id: "speedDemon", label: "Earn Speed Demon" },
  },
  {
    id: "toxic_lime",
    name: "Toxic Lime",
    primary: "#5c7a12",
    accent: "#d4ff3a",
    dark: "#243306",
    unlock: { type: "achievement", id: "centurion", label: "Earn Centurion" },
  },
  {
    id: "obsidian_gold",
    name: "Obsidian Gold",
    primary: "#2e2a25",
    accent: "#ffc94a",
    dark: "#12100d",
    unlock: { type: "achievement", id: "lordSlayer", label: "Earn Lord Slayer" },
  },
  {
    id: "abyssal",
    name: "Abyssal",
    primary: "#0f2d50",
    accent: "#3dffb0",
    dark: "#06142a",
    unlock: { type: "campaignActs", count: 3, label: "Clear Act 3", unit: "acts" },
  },
  {
    id: "eclipse",
    name: "Eclipse",
    primary: "#24143f",
    accent: "#ff4df2",
    dark: "#0c0717",
    unlock: { type: "achievement", id: "campaignClear", label: "Earn Timeline Restored" },
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
  // Appended, never inserted: saves store the index.
  { id: "fade", name: "High Top Fade", desc: "Flat top, faded sides", color: "#16110e" },
  // `brow` overrides the eyebrow colour for dyed cuts.
  { id: "hawk", name: "Mohawk", desc: "Regulation it is not", color: "#b01e3c", brow: "#2a1a12" },
  { id: "afro", name: "Afro", desc: "Full volume, helmet be damned", color: "#1e1410" },
  { id: "topknot", name: "Top Knot", desc: "Tied up and out of the way", color: "#241712" },
  { id: "slick", name: "Slicked Back", desc: "Briefing-room polish", color: "#101010" },
  { id: "curtain", name: "Curtain Fringe", desc: "Middle part, soft fringe", color: "#c9a25a" },
  { id: "long", name: "Long Loose", desc: "Shoulder length", color: "#3a2416" },
  { id: "locs", name: "Locs", desc: "Shoulder-length locs", color: "#2b1a10" },
  { id: "ponytail", name: "Ponytail", desc: "Pulled back tight", color: "#6b3a1c" },
];

/**
 * Hair colour, picked apart from the cut (agent-rig.js hairOf). "natural"
 * keeps the cut's own colour; a natural shade colours the brows with it; a
 * dye (`dye: true`) leaves the brows the cut's natural colour; Chrono Charged
 * (`energy: true`) takes the suit's energy colour. Never locked.
 */
export const HAIR_COLORS = Object.freeze([
  { id: "natural", name: "Natural", color: null },
  { id: "jet", name: "Jet Black", color: "#0e0b0a" },
  { id: "brown", name: "Dark Brown", color: "#3a2416" },
  { id: "chestnut", name: "Chestnut", color: "#6b3a1c" },
  { id: "auburn", name: "Auburn", color: "#8a3218" },
  { id: "copper", name: "Copper", color: "#b85a24" },
  { id: "honey", name: "Honey Blonde", color: "#c9a25a" },
  { id: "platinum", name: "Platinum", color: "#e8dcc0" },
  { id: "silver", name: "Silver", color: "#a8b0b8" },
  { id: "snow", name: "Snow White", color: "#eef4ff" },
  { id: "crimson", name: "Crimson", color: "#b01e3c", dye: true },
  { id: "pink", name: "Hot Pink", color: "#e8408c", dye: true },
  { id: "violet", name: "Violet", color: "#7a3ad0", dye: true },
  { id: "electric", name: "Electric Blue", color: "#2a7cff", dye: true },
  { id: "teal", name: "Teal", color: "#1aa8a0", dye: true },
  { id: "toxic", name: "Toxic Green", color: "#5ad02a", dye: true },
  { id: "sunset", name: "Sunset Orange", color: "#ff7a2a", dye: true },
  { id: "chrono", name: "Chrono Charged", color: null, dye: true, energy: true },
].map((e) => Object.freeze(e)));

export const EYE_COLORS = [
  { id: "amber", name: "Amber", color: "#ffcc66" },
  { id: "blue", name: "Blue", color: "#66bbff" },
  { id: "green", name: "Green", color: "#77ff99" },
  { id: "violet", name: "Violet", color: "#bb88ff" },
  { id: "red", name: "Chrono Red", color: "#ff5566" },
  { id: "silver", name: "Silver", color: "#ddeeff" },
];

/**
 * Body frames: the silhouette the suit is built on, from the wardrobe themes
 * (src/data/wardrobe-themes/), in theme order. Any armour style can be worn
 * on any frame.
 */
export const BODY_FRAMES = themeTable("frames");

/**
 * Under-suit camouflage (the fabric between the plates). `base` and `blobs`
 * colours; `kind` blob or pixel. Earned; Plain is always open. Appended,
 * never inserted.
 */
export const CAMO_STYLES = [
  { id: "none", name: "Plain", desc: "Issue black" },
  {
    id: "woodland", name: "Woodland", desc: "Greens and browns for the tree line", kind: "blob",
    base: "#4a5236", blobs: ["#2f3a22", "#6b5a3a", "#1c1f16"],
    unlock: { type: "tutorial", label: "Graduate Chronos Academy (tutorial)" },
  },
  {
    id: "desert", name: "Desert", desc: "Sand, scrub and shadow", kind: "blob",
    base: "#b3a07a", blobs: ["#8f7a52", "#d1c096", "#6e5a3c"],
    unlock: { type: "arenaRound", count: 5, label: "Survive arena round 5", unit: "rounds" },
  },
  {
    id: "urban", name: "Urban", desc: "Concrete greys", kind: "blob",
    base: "#6a6f74", blobs: ["#44494e", "#959ba1", "#2a2e32"],
    unlock: { type: "campaignActs", count: 1, label: "Clear Act 1", unit: "acts" },
  },
  {
    id: "arctic", name: "Arctic", desc: "Snow and ice-shadow", kind: "blob",
    base: "#d4d9de", blobs: ["#a6b0b9", "#eef2f5", "#7a848d"],
    unlock: { type: "campaignActs", count: 3, label: "Clear Act 3", unit: "acts" },
  },
  {
    id: "digital", name: "Night Digital", desc: "Pixelated blues for night ops", kind: "pixel",
    base: "#283039", blobs: ["#171b21", "#3c4857", "#566373"],
    unlock: { type: "achievement", id: "roundVeteran", label: "Earn Arena Veteran" },
  },
];

/** Body type. Appended, never inserted. */
export const BODY_TYPES = [
  { id: "masc", name: "Masculine", desc: "Broad shoulders, straight frame" },
  { id: "fem", name: "Feminine", desc: "Narrower shoulders, defined waist, fuller hips" },
];

/** Cape on or off (gear that replaces the cape still wins). Appended, never inserted. */
export const CAPE_STYLES = [
  { id: "cape", name: "Cape", desc: "Your colours, down to the knees" },
  { id: "none", name: "No Cape", desc: "Nothing to snag on a door frame" },
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

/**
 * Helmets, from the wardrobe themes (src/data/wardrobe-themes/), in theme
 * order. `face: true` marks an open helmet (FACE_HELMETS); `visor: false` a
 * head with no visor to fit (takesVisor).
 */
export const HELMET_STYLES = themeTable("helmets");

/** Whether this helmet wears the visor pick (HELMET_STYLES[].visor). */
export function takesVisor(helmetId) {
  return pieceIn(HELMET_STYLES, "helmet", helmetId).visor !== false;
}

export const VISOR_STYLES = [
  { id: "standard", name: "Wide Visor", desc: "Full lower-arc optics", tier: 1 },
  { id: "slit", name: "Slit", desc: "Narrow tactical band", tier: 2, bonuses: { maxChronoEnergyAdd: 10 } },
  { id: "fullface", name: "Blackout", desc: "Full-face mirrored shell", tier: 3, bonuses: { armorAdd: 4, maxChronoEnergyAdd: 10 } },
  { id: "split", name: "Dual Lens", desc: "Twin segmented optics", tier: 2, bonuses: { maxStaminaAdd: 10 } },
  { id: "glow", name: "Beacon", desc: "High-lumen emitter strip", tier: 3, bonuses: { maxChronoEnergyAdd: 25 } },
  { id: "goldwrap", name: "Gold Wrap", desc: "Wraparound tinted dome visor", tier: 2, bonuses: { maxChronoEnergyAdd: 6 } },
];

/** Shoulder pieces, from the wardrobe themes (src/data/wardrobe-themes/), in theme order. */
export const SHOULDER_STYLES = themeTable("shoulders");

/**
 * Unlock rules for tiered gear (armor, helmet, visor, shoulders, and the
 * accessories in src/data/accessories.js). Tier 1 is standard issue. Spread
 * over the campaign: MK II with Act I, MK III with Act II, so each act still
 * has a wardrobe to earn. Rule shapes are evaluated in src/systems/unlocks.js.
 */
export const TIER_UNLOCKS = {
  2: {
    type: "anyOf",
    label: "Clear Act 1 or survive arena round 10",
    rules: [
      { type: "campaignActs", count: 1, label: "Clear Act 1", unit: "acts" },
      { type: "arenaRound", count: 10, label: "Survive arena round 10", unit: "rounds" },
    ],
  },
  3: {
    type: "anyOf",
    label: "Clear Act 2 or survive arena round 15",
    rules: [
      { type: "campaignActs", count: 2, label: "Clear Act 2", unit: "acts" },
      { type: "arenaRound", count: 15, label: "Survive arena round 15", unit: "rounds" },
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
    unlock: { type: "campaignLevels", count: 3, label: "Clear 3 campaign levels", unit: "levels" },
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
    unlock: { type: "campaignActs", count: 2, label: "Clear Act 2 of the campaign", unit: "acts" },
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
 * The piece each look field starts on, and falls back to for an id the tables
 * do not know. Named by id, never by position: a table's order is only how
 * the creator lists it.
 */
export const DEFAULT_LOOK_IDS = Object.freeze({
  color: "chrono_teal",
  skinTone: "warm_light",
  hair: "buzz",
  hairColor: "natural",
  eye: "amber",
  armor: "standard",
  helmet: "standard",
  visor: "standard",
  shoulder: "none",
  weaponSkin: "default",
  loadout: "recruit",
  backstory: "beat_cop",
  voice: "rookie",
  frame: "standard",
  cape: "cape",
  body: "masc",
  camo: "none",
});

const ID_MAPS = new WeakMap();

/** A table's entries by id, built once per table. */
function idMap(table) {
  let map = ID_MAPS.get(table);
  if (!map) ID_MAPS.set(table, (map = new Map(table.map((e) => [e.id, e]))));
  return map;
}

/**
 * The entry a stored id names in a look table: the id itself, else the piece
 * that replaced it (RETIRED_PIECES), else the field's default
 * (DEFAULT_LOOK_IDS), so an id the tables do not know (a cut piece, a newer
 * build's save) draws the default rather than nothing. Prefer
 * `pieceOf(ch, field)` in src/core/character-fields.js; this is the same
 * lookup for code that holds a table rather than a character.
 * @param {object[]} table
 * @param {string} field look field name, for the retired map and the default
 * @param {unknown} id
 */
export function pieceIn(table, field, id) {
  const map = idMap(table);
  const found = typeof id === "string" ? map.get(id) ?? map.get(RETIRED_PIECES[field]?.[id]) : undefined;
  if (found) return found;
  const fallback = map.get(DEFAULT_LOOK_IDS[field]);
  if (!fallback) throw new Error(`pieceIn: no default "${DEFAULT_LOOK_IDS[field]}" for look field "${field}"`);
  return fallback;
}

/**
 * The starting look. `badge` and `accessories` are the shared singletons from
 * badges.js / accessories.js, so a spread of this record aliases them — build a
 * live, editable character with `cloneLook(DEFAULT_CHARACTER)` instead.
 */
export const DEFAULT_CHARACTER = {
  name: "Agent",
  color: DEFAULT_LOOK_IDS.color,
  skinTone: DEFAULT_LOOK_IDS.skinTone,
  hair: DEFAULT_LOOK_IDS.hair,
  hairColor: DEFAULT_LOOK_IDS.hairColor,
  eye: DEFAULT_LOOK_IDS.eye,
  armor: DEFAULT_LOOK_IDS.armor,
  frame: DEFAULT_LOOK_IDS.frame,
  body: DEFAULT_LOOK_IDS.body,
  camo: DEFAULT_LOOK_IDS.camo,
  cape: DEFAULT_LOOK_IDS.cape,
  helmet: DEFAULT_LOOK_IDS.helmet,
  visor: DEFAULT_LOOK_IDS.visor,
  shoulder: DEFAULT_LOOK_IDS.shoulder,
  weaponSkin: DEFAULT_LOOK_IDS.weaponSkin,
  // Per-weapon finishes and the player's own (src/data/weapon-skins.js).
  weaponFinishes: {},
  customSkins: [],
  loadout: DEFAULT_LOOK_IDS.loadout,
  backstory: DEFAULT_LOOK_IDS.backstory,
  voice: DEFAULT_LOOK_IDS.voice,
  badge: DEFAULT_BADGE,
  accessories: DEFAULT_ACCESSORIES,
  // Colours picked for tintable accessories, by slot (src/data/accessories.js).
  accessoryTints: {},
  armorVariant: 0,
};

/**
 * Slots whose equipped option can carry stat bonuses, in the order they are
 * summed. Gear uses the same bonus vocabulary as origins (see BACKSTORIES).
 */
export const GEAR_SLOTS = [
  ["armor", () => ARMOR_STYLES],
  ["frame", () => BODY_FRAMES],
  ["helmet", () => HELMET_STYLES],
  ["visor", () => VISOR_STYLES],
  ["shoulder", () => SHOULDER_STYLES],
];

/**
 * Total stat bonuses from everything a character is wearing. Additive, and
 * recomputed from the character each run — nothing about gear is persisted on
 * the player.
 *
 * Only what the figure draws counts: a pick kept but not worn gives nothing.
 * That is shoulders on a frame that hides them (its `hides`), a visor under
 * a helmet that has none (takesVisor), helmet gear on a seat the helmet
 * refuses (helmetSeats), and an eyes or face item the helmet has no room for
 * or covers (helmetFaceSlots). A frame hiding stock art (the kit, collar,
 * hips, cape or limb light) takes no pick off, so it takes no stat away.
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
  const frame = pieceIn(BODY_FRAMES, "frame", character.frame).id;
  const helmet = pieceIn(HELMET_STYLES, "helmet", character.helmet).id;
  for (const [field, table] of GEAR_SLOTS) {
    if (field === "visor" && !takesVisor(helmet)) continue;
    if (field === "shoulder" && frameHides(frame, "shoulders")) continue;
    add(pieceIn(table(), field, character[field]).bonuses);
  }
  const acc = character.accessories || {};
  const seats = helmetSeats(helmet);
  const faceRoom = helmetFaceSlots(helmet);
  for (const { id: slot } of ACCESSORY_SLOTS) {
    const item = accessoryItem(slot, acc[slot]);
    if (slot === "helmet" && item?.seat && !seats[item.seat]) continue;
    if (FACE_SLOTS.includes(slot) && !faceRoom[slot]) continue;
    add(item?.bonuses);
  }
  return out;
}
