// tests/unit/pause-menu-entries.test.js
import { describe, it, expect } from "vitest";
import { pauseMenuEntries } from "../../src/ui/pause-menu-entries.js";

const padGame = (over = {}) => ({ inputDevice: "gamepad", gamepad: { connected: true }, ...over });

describe("pause menu entries", () => {
  it("keyboard lists every screen with its key", () => {
    const { title, entries } = pauseMenuEntries({ inputDevice: "keyboard", mode: "campaign" }, "ESC");
    expect(title).toBe("PAUSED");
    expect(entries.map((e) => e.key)).toEqual(["ESC", "S", "A", "B", "T", "L", "F", "Q"]);
  });

  it("a pad lists only what it can reach, with its buttons", () => {
    const { entries } = pauseMenuEntries(padGame(), "ESC");
    expect(entries.map((e) => [e.pad, e.label])).toEqual([
      ["confirm", "Resume"],
      ["deploy", "Settings"],
      ["randomize", "Quit to title"],
    ]);
  });

  it("a pad's quit asks first", () => {
    const { title, entries } = pauseMenuEntries(padGame({ pauseQuitConfirm: true }), "ESC");
    expect(title).toBe("QUIT TO TITLE?");
    expect(entries.map((e) => [e.pad, e.label])).toEqual([
      ["back", "Cancel"],
      ["confirm", "Quit to title"],
    ]);
  });
});
