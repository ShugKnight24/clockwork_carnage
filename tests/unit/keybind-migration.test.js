import { describe, it, expect } from "vitest";
import { migrateKeybinds, DEFAULT_KEYBINDS, KEYBINDS_VERSION } from "../../js/input-manager.js";

describe("keybind migration", () => {
  it("keeps crouch off Ctrl by default: Ctrl+W would close the tab", () => {
    expect(DEFAULT_KEYBINDS.crouch).not.toMatch(/Control/);
    expect(DEFAULT_KEYBINDS.dash).toBe("Space");
  });

  it("moves an old save's Ctrl crouch to C, and its C dash to Space", () => {
    const m = migrateKeybinds({ crouch: "ControlLeft", dash: "KeyC", interact: "KeyF" });
    expect(m.crouch).toBe("KeyC");
    expect(m.dash).toBe("Space");
    expect(m.interact).toBe("KeyF"); // the player's own rebinds stay
  });

  it("leaves a current save alone, even with crouch on Ctrl by choice", () => {
    const m = migrateKeybinds({ _v: KEYBINDS_VERSION, crouch: "ControlLeft" });
    expect(m.crouch).toBe("ControlLeft");
  });

  it("leaves an old save's own crouch key alone", () => {
    expect(migrateKeybinds({ crouch: "KeyZ", dash: "KeyC" })).toEqual({ crouch: "KeyZ", dash: "KeyC" });
  });
});
