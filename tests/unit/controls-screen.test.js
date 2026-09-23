import { describe, it, expect } from "vitest";
import { bindingsScroll } from "../../src/ui/controls-screen.js";
import { DEFAULT_KEYBINDS } from "../../js/input-manager.js";

describe("key bindings", () => {
  it("binds Rewind and Time-Lock to their own keys, no key doing two jobs", () => {
    expect(DEFAULT_KEYBINDS.chronoRewind).toBe("KeyX");
    expect(DEFAULT_KEYBINDS.chronoLock).toBe("KeyV");
    const codes = Object.values(DEFAULT_KEYBINDS);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("scrolls the list only when it does not fit, keeping the selection on screen", () => {
    const rows = Object.keys(DEFAULT_KEYBINDS).length;
    expect(bindingsScroll(1080, rows, rows)).toBe(0);
    for (const sel of [0, 5, rows - 1, rows]) {
      const scroll = bindingsScroll(720, rows, sel);
      const rowTop = 100 + sel * 36 - scroll;
      expect(rowTop, `row ${sel}`).toBeGreaterThanOrEqual(84);
      expect(rowTop + 36, `row ${sel}`).toBeLessThanOrEqual(720);
    }
    expect(bindingsScroll(720, rows, 0)).toBe(0);
  });
});
