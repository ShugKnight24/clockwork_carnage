export { CUTSCENE_SCRIPTS } from './cutscene-scripts.js';
export { CHARACTER_COLORS, ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES, BADGES, WEAPON_SKINS, LOADOUT_CLASSES, DEFAULT_CHARACTER } from './cosmetics.js';
export { ARIA_COMMS } from './dialogue.js';
export { WALL_COLORS } from './walls.js';
export { TUTORIAL_MAP } from './levels/tutorial.js';
export { ARENA_MAPS, ARENA_MAP } from './levels/arena.js';
export { CAMPAIGN_LEVELS } from './levels/campaign.js';
export { WEAPONS } from './weapons.js';
export { ENEMY_TYPES } from './enemies.js';
export { UPGRADES } from './upgrades.js';
export { ACHIEVEMENT_ICON_SVGS, ACHIEVEMENTS } from './achievements.js';

// Vite HMR — accept data module updates without full page reload
if (import.meta.hot) {
  import.meta.hot.accept();
}
