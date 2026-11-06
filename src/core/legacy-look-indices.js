// Generated from origin/master 834d0d28 — never edit.
//
// The id order of every look table as it shipped when saves stored table
// positions (`helmetIndex: 3`). A legacy index is read against these arrays,
// never against today's tables, so reordering or growing a table cannot
// change an old save. Read only by the save and unlock migrations.

/** Legacy `*Index` save field -> ids of its table, in shipped order. */
export const LEGACY_LOOK_INDICES = Object.freeze({
  colorIndex: Object.freeze(["chrono_teal", "midnight_blue", "paradox_red", "void_purple", "solar_gold", "arctic_white", "neon_green", "rust_orange", "gunmetal", "glacier", "copper_patina", "sakura", "toxic_lime", "obsidian_gold", "abyssal", "eclipse"]),
  skinToneIndex: Object.freeze(["warm_light", "golden", "deep_brown", "cool_fair", "olive", "synthetic"]),
  hairIndex: Object.freeze(["buzz", "short", "coil", "braid", "white", "none", "fade", "hawk", "afro", "topknot", "slick", "curtain", "long", "locs", "ponytail"]),
  eyeIndex: Object.freeze(["amber", "blue", "green", "violet", "red", "silver"]),
  armorIndex: Object.freeze(["standard", "recon", "heavy", "stealth", "tech", "howitzer", "trencher", "reliquary", "pathfinder"]),
  helmetIndex: Object.freeze(["standard", "wide", "angular", "mohawk", "crested", "ordnance", "bucket", "crusader", "sealed", "reaper", "pilot", "bandana"]),
  visorIndex: Object.freeze(["standard", "slit", "fullface", "split", "glow", "goldwrap"]),
  shoulderIndex: Object.freeze(["none", "pads", "spikes", "pauldrons", "armored", "slab", "dome", "ordnance", "layered"]),
  badgeIndex: Object.freeze(["none", "shield", "skull", "clock", "star", "bolt", "eye", "rift"]),
  weaponSkinIndex: Object.freeze(["default", "carbon", "chrome", "ember", "frost", "toxic"]),
  loadoutIndex: Object.freeze(["recruit", "gunslinger", "enforcer", "phantom", "breacher", "marksman", "saboteur", "corpsman"]),
  backstoryIndex: Object.freeze(["beat_cop", "rift_scientist", "arena_runner", "ex_enforcer"]),
  voiceIndex: Object.freeze(["rookie", "veteran", "calm", "synthetic"]),
  frameIndex: Object.freeze(["standard", "strider", "vanguard", "operator", "wraith", "breacher"]),
  capeIndex: Object.freeze(["cape", "none"]),
  bodyIndex: Object.freeze(["masc", "fem"]),
  camoIndex: Object.freeze(["none", "woodland", "desert", "urban", "arctic", "digital"]),
});

/** Legacy `*Index` save field -> the id field that replaces it. */
export const LEGACY_FIELD_NAMES = Object.freeze({
  colorIndex: "color",
  skinToneIndex: "skinTone",
  hairIndex: "hair",
  eyeIndex: "eye",
  armorIndex: "armor",
  helmetIndex: "helmet",
  visorIndex: "visor",
  shoulderIndex: "shoulder",
  badgeIndex: "badge",
  weaponSkinIndex: "weaponSkin",
  loadoutIndex: "loadout",
  backstoryIndex: "backstory",
  voiceIndex: "voice",
  frameIndex: "frame",
  capeIndex: "cape",
  bodyIndex: "body",
  camoIndex: "camo",
});
