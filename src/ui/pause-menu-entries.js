/**
 * The pause menu's rows, shared by the Legacy (js/game.js) and Modern
 * renderers. With a pad in use only the rows a pad can reach are listed,
 * with its buttons; quitting from a pad asks first (Game._padPauseMenu).
 */
import { activeDevice } from "./input-glyphs.js";

/** @returns {{ title: string, entries: { key?: string, pad?: string, label: string, primary?: boolean, danger?: boolean }[] }} */
export function pauseMenuEntries(game, resumeKey) {
  if (activeDevice(game) === "gamepad") {
    if (game.pauseQuitConfirm) {
      return {
        title: "QUIT TO TITLE?",
        entries: [
          { pad: "back", label: "Cancel", primary: true },
          { pad: "confirm", label: "Quit to title", danger: true },
        ],
      };
    }
    return {
      title: "PAUSED",
      entries: [
        { pad: "confirm", label: "Resume", primary: true },
        { pad: "deploy", label: "Settings" },
        { pad: "randomize", label: "Quit to title", danger: true },
      ],
    };
  }
  const entries = [
    { key: resumeKey, label: "Resume", primary: true },
    { key: "S", label: "Settings" },
    { key: "A", label: "Achievements" },
    { key: "B", label: "Archive" },
    { key: "T", label: "Stats" },
    { key: "L", label: "ARIA log" },
  ];
  if (game.mode === "campaign") entries.push({ key: "F", label: "Save game" });
  entries.push({ key: "Q", label: "Quit to title", danger: true });
  return { title: "PAUSED", entries };
}
