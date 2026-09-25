// tests/unit/settings-deck-model.test.js
import { describe, it, expect } from "vitest";
import { createDeckState, deckKey, deckKeyUp } from "../../src/ui/settings-deck-model.js";

const rows = [
  { kind: "toggle", key: "enableBloom" },
  { kind: "slider", key: "fov" },
  { kind: "action", key: "gamepadCalibrate" },
];
const ctx = (over = {}) => ({ sectionCount: 6, rows, repeat: false, now: 0, ...over });
const press = (state, code, over) => deckKey(state, code, ctx(over));
const types = (r) => r.effects.map((e) => e.type);

describe("deck navigation", () => {
  it("moves rows with arrows and wraps", () => {
    let s = createDeckState();
    s = press(s, "ArrowUp").state;
    expect(s.row).toBe(2);
    s = press(s, "ArrowDown").state;
    expect(s.row).toBe(0);
  });

  it("switches section with Q/E from anywhere and resets the row", () => {
    let s = createDeckState({ section: 0, row: 2 });
    s = press(s, "KeyE").state;
    expect(s).toMatchObject({ section: 1, row: 0 });
    s = press(s, "KeyQ").state;
    s = press(s, "KeyQ").state;
    expect(s.section).toBe(5);
  });

  it("left/right step the focused value; Enter activates", () => {
    const s = createDeckState({ row: 1 });
    expect(press(s, "ArrowLeft").effects).toContainEqual({ type: "step", dir: -1 });
    expect(press(s, "ArrowRight").effects).toContainEqual({ type: "step", dir: 1 });
    expect(types(press(s, "Enter"))).toContain("activate");
  });

  it("left/right on an action row does nothing", () => {
    const s = createDeckState({ row: 2 });
    expect(types(press(s, "ArrowRight"))).not.toContain("step");
  });

  it("auto-repeat navigates and nudges sliders but never flips a toggle or fires an action", () => {
    expect(types(press(createDeckState({ row: 1 }), "ArrowRight", { repeat: true }))).toContain("step");
    expect(press(createDeckState(), "ArrowDown", { repeat: true }).state.row).toBe(1);
    expect(types(press(createDeckState({ row: 0 }), "ArrowRight", { repeat: true }))).not.toContain("step");
    expect(types(press(createDeckState({ row: 0 }), "Enter", { repeat: true }))).not.toContain("activate");
    expect(types(press(createDeckState({ row: 2 }), "Enter", { repeat: true }))).not.toContain("activate");
  });

  it("a held R keeps the reset-section prompt open and a held Enter never confirms it", () => {
    let r = press(createDeckState(), "KeyR");
    r = press(r.state, "KeyR", { repeat: true });
    expect(r.state.confirm).toBe("resetSection");
    r = press(r.state, "Enter", { repeat: true });
    expect(types(r)).not.toContain("resetSection");
    expect(r.state.confirm).toBe("resetSection");
  });

  it("X / Backspace reset the focused row", () => {
    expect(types(press(createDeckState(), "Backspace"))).toContain("reset");
  });

  it("Escape closes; during capture it cancels capture instead", () => {
    expect(types(press(createDeckState(), "Escape"))).toContain("close");
    const capturing = { ...createDeckState(), capture: { action: "interact", device: "keyboard", until: 8000 } };
    const r = press(capturing, "Escape");
    expect(types(r)).toEqual(["captureCancel"]);
    expect(r.state.capture).toBeNull();
  });

  it("activating a remap cell starts capture for that device; the next key goes to the deck", () => {
    const remapRows = [{ kind: "remap", key: "interact", device: "keyboard" }];
    const r = deckKey(createDeckState(), "Enter", { sectionCount: 6, rows: remapRows, repeat: false, now: 1000 });
    expect(r.effects).toContainEqual({ type: "capture", action: "interact", device: "keyboard" });
    expect(types(r)).not.toContain("activate");
    expect(r.state.capture).toEqual({ action: "interact", device: "keyboard", until: 9000 });
  });

  it("a held Enter does not start capture again", () => {
    const remapRows = [{ kind: "remap", key: "interact", device: "keyboard" }];
    const r = deckKey(createDeckState(), "Enter", { sectionCount: 6, rows: remapRows, repeat: true, now: 1000 });
    expect(r.state.capture).toBeNull();
    expect(r.effects).toEqual([]);
  });

  it("capture times out after 8 seconds", () => {
    const s = { ...createDeckState(), capture: { action: "interact", device: "keyboard", until: 9000 } };
    const r = deckKey(s, "ArrowDown", { sectionCount: 6, rows: [], repeat: false, now: 9001 });
    expect(r.state.capture).toBeNull();
    expect(types(r)).toContain("captureCancel");
    expect(r.state.row).toBe(0); // the late key is not also a move
  });

  it("while capturing, the other device's inputs are ignored but its Escape / Start still cancels", () => {
    const pad = { ...createDeckState(), capture: { action: "dash", device: "gamepad", until: 9000 } };
    const key = deckKey(pad, "KeyF", ctx({ now: 100, device: "keyboard" }));
    expect(key.state.capture).toEqual(pad.capture);
    expect(key.effects).toEqual([]);
    for (const device of ["keyboard", "gamepad"]) {
      const r = deckKey(pad, "Escape", ctx({ now: 100, device }));
      expect(r.state.capture).toBeNull();
      expect(types(r)).toEqual(["captureCancel"]);
    }
    const kb = { ...createDeckState(), capture: { action: "interact", device: "keyboard", until: 9000 } };
    const start = deckKey(kb, "Escape", ctx({ now: 100, device: "gamepad" }));
    expect(start.state.capture).toBeNull();
    expect(types(start)).toEqual(["captureCancel"]);
  });

  it("holding C shows the previous value until release", () => {
    let r = press(createDeckState(), "KeyC");
    expect(r.effects).toContainEqual({ type: "compare", on: true });
    r = deckKeyUp(r.state, "KeyC");
    expect(r.effects).toContainEqual({ type: "compare", on: false });
  });

  it("reset section asks for confirmation first", () => {
    let r = press(createDeckState(), "KeyR");
    expect(r.state.confirm).toBe("resetSection");
    expect(types(r)).not.toContain("resetSection");
    r = press(r.state, "Enter");
    expect(types(r)).toContain("resetSection");
    expect(r.state.confirm).toBeNull();
  });

  it("clamps a row left past the end when the list shrinks", () => {
    const r = press(createDeckState({ row: 5 }), "ArrowRight");
    expect(r.state.row).toBe(2);
    expect(types(r)).not.toContain("step");
  });

  it("cancelling the reset prompt does not reset or play the confirm sound", () => {
    const open = press(createDeckState(), "KeyR").state;
    const r = press(open, "Escape");
    expect(types(r)).not.toContain("resetSection");
    expect(types(r)).not.toContain("close");
    expect(r.effects).not.toContainEqual({ type: "sound", name: "menuConfirm" });
    expect(r.state.confirm).toBeNull();
  });

  it("an empty section still closes on Escape", () => {
    expect(types(deckKey(createDeckState(), "Escape", ctx({ rows: [] })))).toContain("close");
  });
});
