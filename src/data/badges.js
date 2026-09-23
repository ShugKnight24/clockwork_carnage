/**
 * Suit badges: a stack of layers (frame + symbol + colours) plus a finish and
 * the places it is worn. Everything is referenced by id so tables can grow or
 * reorder without breaking saves. Drawn by src/rendering/svg-art/insignia/.
 */

const achievement = (id, label) => ({ type: "achievement", id, label });
const levels = (count, label) => ({ type: "campaignLevels", count, label, unit: "levels" });
const acts = (count, label) => ({ type: "campaignActs", count, label, unit: "acts" });

export const SYMBOLS = [
  // Classic: the original seven, redrawn. Free.
  { id: "shield", name: "Temporal Shield", set: "classic" },
  { id: "skull", name: "Kill Specialist", set: "classic" },
  { id: "clock", name: "Chrono Division", set: "classic" },
  { id: "star", name: "Gold Star", set: "classic" },
  { id: "bolt", name: "Lightning Strike", set: "classic" },
  { id: "eye", name: "The Watcher", set: "classic" },
  { id: "rift", name: "Rift Walker", set: "classic" },
  // Factions. Free.
  { id: "corps", name: "Chrono Corps", set: "faction" },
  { id: "aegis", name: "Temporal Aegis", set: "faction" },
  { id: "walkers", name: "Rift Walkers", set: "faction" },
  { id: "deadsquad", name: "Dead Squad", set: "faction" },
  { id: "guard", name: "Clockwork Guard", set: "faction" },
  { id: "hunters", name: "Paradox Hunters", set: "faction" },
  { id: "crew", name: "Station Crew", set: "faction" },
  { id: "aria", name: "ARIA Liaison", set: "faction" },
  // Ranks, by campaign levels cleared.
  { id: "rank1", name: "Recruit", set: "rank" },
  { id: "rank2", name: "Operator", set: "rank", unlock: levels(2, "Clear 2 campaign levels") },
  { id: "rank3", name: "Sergeant", set: "rank", unlock: levels(4, "Clear 4 campaign levels") },
  { id: "rank4", name: "Lieutenant", set: "rank", unlock: levels(6, "Clear 6 campaign levels") },
  { id: "rank5", name: "Captain", set: "rank", unlock: levels(8, "Clear 8 campaign levels") },
  { id: "rank6", name: "Commander", set: "rank", unlock: achievement("campaignClear", "Finish the campaign") },
  // Act emblems.
  { id: "act1", name: "First Incursion", set: "act", unlock: acts(1, "Defeat the Paradox Lord in Act 1") },
  { id: "act2", name: "Second Incursion", set: "act", unlock: acts(2, "Defeat the Paradox Lord in Act 2") },
  { id: "act3", name: "Final Incursion", set: "act", unlock: acts(3, "Defeat the Paradox Lord in Act 3") },
  // Earned from achievements.
  { id: "lordslayer", name: "Lord Slayer", set: "earned", unlock: achievement("lordSlayer", "Earn Lord Slayer") },
  { id: "untouchable", name: "Untouchable", set: "earned", unlock: achievement("untouchable", "Earn Untouchable") },
  { id: "centurion", name: "Centurion", set: "earned", unlock: achievement("centurion", "Earn Centurion") },
  { id: "speeddemon", name: "Speed Demon", set: "earned", unlock: achievement("speedDemon", "Earn Speed Demon") },
  { id: "veteran", name: "Round Veteran", set: "earned", unlock: achievement("roundVeteran", "Earn Round Veteran") },
  { id: "firstblood", name: "First Blood", set: "earned", unlock: achievement("firstBlood", "Earn First Blood") },
  { id: "dronehunter", name: "Drone Hunter", set: "earned", unlock: achievement("droneHunter", "Earn Drone Hunter") },
  { id: "phantom", name: "Phantom Slayer", set: "earned", unlock: achievement("phantomSlayer", "Earn Phantom Slayer") },
  { id: "tamer", name: "Beast Tamer", set: "earned", unlock: achievement("beastTamer", "Earn Beast Tamer") },
  { id: "scoremaster", name: "Score Master", set: "earned", unlock: achievement("scoreMaster", "Earn Score Master") },
  { id: "graduate", name: "Academy Graduate", set: "earned", unlock: achievement("tutorialGrad", "Earn Academy Graduate") },
  { id: "survivor", name: "Round Survivor", set: "earned", unlock: achievement("roundSurvivor", "Earn Round Survivor") },
];

export const FRAMES = [
  { id: "disc", name: "Disc" },
  { id: "shield", name: "Shield" },
  { id: "hex", name: "Hex" },
  { id: "chevron", name: "Chevron" },
  { id: "tag", name: "Tag" },
  { id: "cog", name: "Cog" },
];

export const ENAMELS = [
  { id: "teal", name: "Chrono Teal", color: "#1f6f78" },
  { id: "navy", name: "Navy", color: "#1c2f5a" },
  { id: "crimson", name: "Crimson", color: "#7a1426" },
  { id: "oxblood", name: "Oxblood", color: "#4a1016" },
  { id: "forest", name: "Forest", color: "#1f4a2c" },
  { id: "olive", name: "Olive Drab", color: "#4a4f2a" },
  { id: "violet", name: "Rift Violet", color: "#44206e" },
  { id: "amber", name: "Amber", color: "#9a5a10" },
  { id: "ivory", name: "Ivory", color: "#d8d0bc" },
  { id: "slate", name: "Slate", color: "#3a4450" },
  { id: "black", name: "Black", color: "#16181c" },
  { id: "sky", name: "Sky", color: "#2f78b8" },
];

export const METALS = [
  { id: "brass", name: "Brass", ramp: ["#fff1b8", "#d9a441", "#7a5418", "#3e2808"] },
  { id: "steel", name: "Steel", ramp: ["#f2f6fa", "#a8b4c0", "#56606c", "#22282e"] },
  { id: "blackened", name: "Blackened", ramp: ["#7c8088", "#3a3d43", "#1c1e22", "#08090b"] },
  { id: "gold", name: "Gold", ramp: ["#fff6c8", "#f2c230", "#9a6a08", "#4a3004"] },
];

export const FINISHES = [
  { id: "auto", name: "Auto (match armour)" },
  { id: "insignia", name: "Insignia" },
  { id: "stencil", name: "Stencil", unlock: { type: "tutorial", label: "Graduate Chronos Academy (tutorial)" } },
  { id: "patch", name: "Field Patch", unlock: acts(1, "Defeat the Paradox Lord in Act 1") },
  { id: "holo", name: "Holo", unlock: achievement("campaignClear", "Finish the campaign") },
];

export const PLACEMENTS = [
  { id: "chest", name: "Chest" },
  { id: "shoulder", name: "Shoulder" },
  { id: "helmet", name: "Helmet" },
  { id: "forearm", name: "Forearm" },
];

/** One layer; Stage 2 (layer editor) uses x/y/scale/rot, Stage 1 leaves them at rest. */
export const layer = (symbol, frame = "disc", enamel = "teal", metal = "brass") =>
  ({ frame, symbol, enamel, metal, x: 0, y: 0, scale: 1, rot: 0 });

export const DEFAULT_BADGE = { layers: [layer("clock")], finish: "auto", placements: [] };

/** Old BADGES[].icon → symbol id (identity today, kept explicit for migration). */
export const LEGACY_ICON_SYMBOL = {
  shield: "shield", skull: "skull", clock: "clock", star: "star", bolt: "bolt", eye: "eye", rift: "rift",
};

const preset = (id, name, set, l, finish = "auto", unlock) => ({ id, name, set, badge: { layers: [l], finish }, ...(unlock ? { unlock } : {}) });

export const BADGE_PRESETS = [
  preset("p_corps", "Chrono Corps", "faction", layer("corps", "disc", "teal", "brass")),
  preset("p_aegis", "Temporal Aegis", "faction", layer("aegis", "shield", "navy", "steel")),
  preset("p_walkers", "Rift Walkers", "faction", layer("walkers", "hex", "violet", "brass")),
  preset("p_deadsquad", "Dead Squad", "faction", layer("deadsquad", "shield", "black", "blackened")),
  preset("p_guard", "Clockwork Guard", "faction", layer("guard", "cog", "oxblood", "brass")),
  preset("p_hunters", "Paradox Hunters", "faction", layer("hunters", "chevron", "crimson", "steel")),
  preset("p_crew", "Station Crew", "faction", layer("crew", "tag", "slate", "steel")),
  preset("p_aria", "ARIA Liaison", "faction", layer("aria", "disc", "sky", "steel")),
  preset("p_shield", "Temporal Shield", "classic", layer("shield", "disc", "navy", "brass")),
  preset("p_skull", "Kill Specialist", "classic", layer("skull", "hex", "black", "steel")),
  preset("p_clock", "Chrono Division", "classic", layer("clock", "disc", "teal", "brass")),
  preset("p_star", "Gold Star", "classic", layer("star", "shield", "navy", "gold")),
  preset("p_bolt", "Lightning Strike", "classic", layer("bolt", "chevron", "amber", "steel")),
  preset("p_eye", "The Watcher", "classic", layer("eye", "disc", "violet", "blackened")),
  preset("p_rift", "Rift Walker", "classic", layer("rift", "hex", "violet", "brass")),
  preset("p_rank1", "Recruit", "rank", layer("rank1", "tag", "olive", "brass")),
  preset("p_rank3", "Sergeant", "rank", layer("rank3", "tag", "olive", "brass"), "auto", levels(4, "Clear 4 campaign levels")),
  preset("p_rank5", "Captain", "rank", layer("rank5", "shield", "navy", "gold"), "auto", levels(8, "Clear 8 campaign levels")),
  preset("p_rank6", "Commander", "rank", layer("rank6", "shield", "crimson", "gold"), "insignia", achievement("campaignClear", "Finish the campaign")),
  preset("p_act1", "First Incursion", "act", layer("act1", "cog", "teal", "brass"), "auto", acts(1, "Defeat the Paradox Lord in Act 1")),
  preset("p_act2", "Second Incursion", "act", layer("act2", "cog", "oxblood", "steel"), "auto", acts(2, "Defeat the Paradox Lord in Act 2")),
  preset("p_act3", "Final Incursion", "act", layer("act3", "cog", "black", "gold"), "auto", acts(3, "Defeat the Paradox Lord in Act 3")),
  preset("p_lordslayer", "Lord Slayer", "earned", layer("lordslayer", "shield", "crimson", "gold"), "insignia", achievement("lordSlayer", "Earn Lord Slayer")),
  preset("p_untouchable", "Untouchable", "earned", layer("untouchable", "disc", "ivory", "steel"), "insignia", achievement("untouchable", "Earn Untouchable")),
  preset("p_centurion", "Centurion", "earned", layer("centurion", "hex", "oxblood", "brass"), "insignia", achievement("centurion", "Earn Centurion")),
  preset("p_speeddemon", "Speed Demon", "earned", layer("speeddemon", "chevron", "amber", "steel"), "insignia", achievement("speedDemon", "Earn Speed Demon")),
];

export const byId = (table, id) => table.find((x) => x.id === id);
export const indexOfId = (table, id) => table.findIndex((x) => x.id === id);
