// tests/unit/forge-inventory-screen.test.js
import { describe, it, expect } from "vitest";
import { ForgeMode } from "../../js/forge.js";
import { World } from "../../src/world/world.js";

const forge = () => {
  const f = new ForgeMode({
    renderer: null,
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: {}, keybinds: {}, canvas: null,
  });
  f._adopt(new World({ mode: "survival" }), 0);
  f.active = true;
  return f;
};

describe("the inventory screen", () => {
  it("is shut in creative and cannot be opened", () => {
    const f = new ForgeMode({
      renderer: null, audio: { menuSelect() {}, menuConfirm() {} },
      settings: {}, keybinds: {}, canvas: null,
    });
    f._adopt(new World(), 0);
    f.active = true;
    f.handleKeyDown({ code: "KeyI" });
    expect(f.invOpen).toBe(false);
  });

  it("toggles with I and closes with Escape in survival", () => {
    const f = forge();
    expect(f.invOpen).toBe(false);
    expect(f.handleKeyDown({ code: "KeyI" })).toBe(true);
    expect(f.invOpen).toBe(true);
    f.handleKeyDown({ code: "KeyI" });
    expect(f.invOpen).toBe(false);

    f.handleKeyDown({ code: "KeyI" });
    expect(f.handleKeyDown({ code: "Escape" })).toBe(true);
    expect(f.invOpen).toBe(false);
  });

  it("does not steal Ctrl+I, which is import", () => {
    const f = forge();
    // The stub needs `preventDefault` precisely because the key must fall
    // through to the import handler, which calls it.
    let imported = false;
    f.importMap = () => { imported = true; };
    f.handleKeyDown({ code: "KeyI", ctrlKey: true, preventDefault() {} });
    expect(f.invOpen).toBe(false);
    expect(imported).toBe(true);
  });

  it("suspends look and breaking while open", () => {
    const f = forge();
    f.holdingBreak = true;
    f.handleKeyDown({ code: "KeyI" });
    expect(f.holdingBreak).toBe(false);
    const before = f.player.angle;
    f.mouseLocked = true;
    f.mouseDx = 500;
    f.update(1 / 60);
    expect(f.player.angle).toBe(before);
  });

  it("tracks the cursor only while open", () => {
    const f = forge();
    f.handleMouseMove(100, 200);
    expect(f.cursor).toEqual({ x: 0, y: 0 });
    f.handleKeyDown({ code: "KeyI" });
    f.handleMouseMove(100, 200);
    expect(f.cursor).toEqual({ x: 100, y: 200 });
  });

  // Review Focus 1
  it("returns a carried stack when it closes", () => {
    const f = forge();
    f.survival.inventory.add("stone", 9);
    f.handleKeyDown({ code: "KeyI" });
    f.carried = { item: "stone", n: 9 };
    f.survival.inventory.slots[0] = null;
    f.handleKeyDown({ code: "Escape" });
    expect(f.carried).toBe(null);
    expect(f.survival.inventory.count("stone")).toBe(9);
  });

  // Review Focus 3
  it("still closes when the browser refuses to re-lock the pointer", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyI" });
    // requestPointerLockSafe swallows a refusal; the screen must not depend
    // on it succeeding, or a refusal would trap the player with no controls.
    f.canvas = { requestPointerLock: () => { throw new Error("refused"); } };
    expect(() => f.handleKeyDown({ code: "KeyI" })).not.toThrow();
    expect(f.invOpen).toBe(false);
  });

  it("returns a carried stack when the world is swapped", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyI" });
    f.carried = { item: "rock", n: 4 };
    f._adopt(new World({ mode: "survival" }), 1);
    expect(f.carried).toBe(null);
    expect(f.invOpen).toBe(false);
  });
});
