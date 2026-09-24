/**
 * One way to change a setting, shared by the settings deck and the canvas
 * screens that still exist: set the value, let the row react (its onChange
 * re-applies graphics, audio, pad settings…), then persist.
 */
import { DEFAULT_SETTINGS, applySettingStep } from "../../js/settings-registry.js";

export function applySettingValue(game, def, value) {
  if (game.settings[def.key] === value) return false;
  game.settings[def.key] = value;
  def.onChange?.(game);
  game.saveSettings();
  return true;
}

export function stepSetting(game, def, dir) {
  if (def.type === "action") return false;
  const changed = applySettingStep(game.settings, def, dir);
  if (!changed) return false;
  def.onChange?.(game);
  game.saveSettings();
  return true;
}

export function resetSetting(game, def) {
  const fallback = DEFAULT_SETTINGS[def.key];
  if (def.type === "action" || fallback === undefined) return false;
  return applySettingValue(game, def, fallback);
}
