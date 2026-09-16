import * as Save from "./save-system.js";

export function saveSettings(game) {
  Save.saveSettings(game.settings);
  game.input.saveKeybinds();
}

export function loadSettings(game) {
  Save.loadSettings(game.settings);
}

export function saveCharacter(game) {
  Save.saveCharacter(game.character);
}

export function loadCharacter(game) {
  Save.loadCharacter(game.character);
}

export function saveAchievements(game) {
  game.achievementSystem.save();
}

export function loadAchievements(game) {
  game.achievementSystem.load();
}

export function saveArena(game) {
  Save.saveArena(
    game.arenaRound,
    game.player,
    game.upgradeLevels,
    game.settings.difficulty,
  );
}

export function loadArena(game) {
  const data = Save.loadArenaData();
  if (!data) return false;
  game.mode = "arena";
  game.arenaRound = data.round;
  game.player.reset();
  game.player.deserialize(data);
  game.upgradeLevels = data.upgradeLevels || {};
  game.settings.difficulty = data.difficulty ?? game.settings.difficulty;
  game.startArenaRound();
  return true;
}

export function clearArenaSave() {
  Save.clearArenaSave();
}

export function saveCampaign(game) {
  game.campaign.save();
}

export function loadCampaignSave(game) {
  return game.campaign.load();
}

export function clearCampaignSave(game) {
  game.campaign.clearSave();
}

export function startNgPlus(game) {
  game.campaign.startNgPlus();
}

export function applyMobileMigration(...args) { return Save.applyMobileMigration(...args); }
export function loadDevFlags(...args) { return Save.loadDevFlags(...args); }
export function setAlwaysTutorial(...args) { return Save.setAlwaysTutorial(...args); }
export function hasSave(...args) { return Save.hasSave(...args); }
export function getSaveInfo(...args) { return Save.getSaveInfo(...args); }
