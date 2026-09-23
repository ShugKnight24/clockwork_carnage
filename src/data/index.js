// CUTSCENE_SCRIPTS is deliberately not re-exported: importing it from here would
// pull ~130 KB of script data into the boot bundle. Import it from
// ./cutscene-scripts.js inside lazily loaded code only.
export {
  CHARACTER_COLORS, SKIN_TONES, HAIR_STYLES, EYE_COLORS,
  ARMOR_STYLES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES,
  BADGES, WEAPON_SKINS, LOADOUT_CLASSES, BACKSTORIES, VOICE_PROFILES,
  DEFAULT_CHARACTER,
  gearBonuses,
  GEAR_SLOTS,
} from './cosmetics.js';
export { ARIA_COMMS } from './dialogue.js';
export { WALL_COLORS } from './walls.js';
export { TUTORIAL_MAP } from './levels/tutorial.js';
export { ARENA_MAPS, ARENA_MAP } from './levels/arena.js';
export { MAPS, campaignMap, campaignLevelMap, campaignMaps } from './levels/campaign.js';
export { ACTS, NG_PLUS, getAct, getActLevel, isLastAct } from './campaign/acts.js';
export { WEAPONS } from './weapons.js';
export { ENEMY_TYPES } from './enemies.js';
export { UPGRADES } from './upgrades.js';
export { ACHIEVEMENT_ICON_SVGS, ACHIEVEMENTS } from './achievements.js';

// Vite HMR — accept data module updates without full page reload
if (import.meta.hot) {
  import.meta.hot.accept();
}
