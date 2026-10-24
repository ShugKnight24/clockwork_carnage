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
    expect(migrateKeybinds({ crouch: "KeyZ", dash: "KeyC" })).toEqual({ crouch: "KeyZ", dash: "KeyC", aim: "KeyR", cover: "KeyG" });
  });

  it("never moves an action onto a key the save already uses for another", () => {
    const m = migrateKeybinds({ crouch: "ControlLeft", dash: "KeyC", interact: "Space", toggleFPS: "KeyC" });
    expect(m.toggleFPS).toBe("KeyC");
    expect(m.crouch).toBe("KeyB");
    expect(m.dash).toBe("KeyG");
    expect(m.aim).toBe("KeyZ");
    expect(m.cover).toBe("KeyH"); // G went to the dash
    const used = Object.entries({ ...DEFAULT_KEYBINDS, ...m }).map(([, c]) => c).filter(Boolean);
    expect(new Set(used).size).toBe(used.length);
  });

  it("gives a version-2 save the new aim key, unless Z is already taken", () => {
    expect(migrateKeybinds({ _v: 2, crouch: "ControlLeft" })).toMatchObject({ crouch: "ControlLeft", aim: "KeyZ" });
    expect(migrateKeybinds({ _v: 2, interact: "KeyZ" }).aim).toBe("KeyR");
  });

  it("gives a version-3 save the cover key on G, unless G is already taken", () => {
    expect(DEFAULT_KEYBINDS.cover).toBe("KeyG");
    expect(migrateKeybinds({ _v: 3, interact: "KeyF" })).toMatchObject({ interact: "KeyF", cover: "KeyG" });
    expect(migrateKeybinds({ _v: 3, interact: "KeyG" })).toMatchObject({ interact: "KeyG", cover: "KeyH" });
    const m = migrateKeybinds({ _v: 3, interact: "KeyG", crouch: "KeyH" });
    expect(m.cover).toBe("KeyB");
  });
});
