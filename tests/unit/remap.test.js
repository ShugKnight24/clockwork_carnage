// tests/unit/remap.test.js
import { describe, it, expect } from "vitest";
import { PAD, GAMEPAD_ACTIONS, DEFAULT_GAMEPAD_ACTIONS, REMAPPABLE_PAD_ACTIONS } from "../../src/systems/pad-actions.js";
import { planBind, applyBind, resetBindings, loadPadBinds, savePadBinds, isReservedKey, isReservedButton, REMAPPABLE_KEY_ACTIONS } from "../../src/systems/remap.js";
import { DEFAULT_KEYBINDS } from "../../js/input-manager.js";

const pad = () => ({ ...DEFAULT_GAMEPAD_ACTIONS });
const keys = () => ({ ...DEFAULT_KEYBINDS });

describe("remap rules", () => {
  it("reserves Escape and Start", () => {
    expect(isReservedKey("Escape")).toBe(true);
    expect(isReservedButton(PAD.MENU)).toBe(true);
    expect(planBind(pad(), "dash", PAD.MENU, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: false, reason: "reserved" });
    expect(planBind(keys(), "interact", "Escape", REMAPPABLE_KEY_ACTIONS)).toEqual({ ok: false, reason: "reserved" });
  });

  it("pause is not remappable", () => {
    expect(REMAPPABLE_KEY_ACTIONS).not.toContain("pause");
    expect(planBind(keys(), "pause", "KeyP", REMAPPABLE_KEY_ACTIONS)).toEqual({ ok: false, reason: "unknown" });
  });

  it("rejects button indices outside the standard layout", () => {
    expect(planBind(pad(), "dash", 16, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: false, reason: "unknown" });
    expect(planBind(pad(), "dash", -1, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: false, reason: "unknown" });
    expect(planBind(pad(), "dash", "KeyE", REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: false, reason: "unknown" });
  });

  it("detects a conflict and swaps on request", () => {
    const t = keys();
    const plan = planBind(t, "interact", t.sprint, REMAPPABLE_KEY_ACTIONS);
    expect(plan).toEqual({ ok: true, swapWith: "sprint" });
    const oldInteract = t.interact;
    applyBind(t, "interact", t.sprint, true);
    expect(t.interact).toBe(DEFAULT_KEYBINDS.sprint);
    expect(t.sprint).toBe(oldInteract);
  });

  it("the RB rewind/previous-weapon pair is not a conflict with itself", () => {
    const t = pad();
    expect(planBind(t, "chronoRewind", PAD.RB, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: true, swapWith: null });
    expect(planBind(t, "weaponPrev", PAD.RB, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: true, swapWith: null });
  });

  it("a swap only moves remappable actions of the same table", () => {
    // Y is also the cutscene "auto" and showroom "deploy" button; those stay put.
    const t = pad();
    expect(planBind(t, "dash", PAD.Y, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: true, swapWith: "weaponNext" });
    applyBind(t, "dash", PAD.Y, true);
    expect(t.weaponNext).toBe(PAD.A);
    expect(t.auto).toBe(PAD.Y);
    expect(t.deploy).toBe(PAD.Y);
    expect(t.confirm).toBe(PAD.A);
  });

  it("taking RB displaces both halves of the shared pair together", () => {
    const t = pad();
    applyBind(t, "weaponNext", PAD.RB, true);
    expect(t.weaponNext).toBe(PAD.RB);
    expect(t.chronoRewind).toBe(PAD.Y);
    expect(t.weaponPrev).toBe(PAD.Y);
    expect(loadPadBinds(savePadBinds(t))).toEqual({ weaponNext: PAD.RB, chronoRewind: PAD.Y, weaponPrev: PAD.Y });
  });

  it("resets to defaults", () => {
    const t = pad();
    applyBind(t, "dash", PAD.Y, true);
    resetBindings(t, DEFAULT_GAMEPAD_ACTIONS, REMAPPABLE_PAD_ACTIONS);
    expect(t).toEqual(DEFAULT_GAMEPAD_ACTIONS);
  });

  it("round-trips overrides through cc_padbinds", () => {
    const t = pad();
    applyBind(t, "dash", PAD.Y, true);
    const raw = savePadBinds(t);
    expect(JSON.parse(raw)).toEqual({ dash: PAD.Y, weaponNext: PAD.A });
    expect(loadPadBinds(raw)).toEqual({ dash: PAD.Y, weaponNext: PAD.A });
  });

  it("drops hostile or corrupt cc_padbinds entries without throwing", () => {
    expect(loadPadBinds("not json")).toEqual({});
    expect(loadPadBinds(null)).toEqual({});
    expect(loadPadBinds(JSON.stringify({ dash: 99, nope: 1, interact: PAD.MENU, crouch: "B", fire: PAD.RT }))).toEqual({ fire: PAD.RT });
    // Two actions on one button: neither may stand, since dash on Y only
    // works if weaponNext moved off it, and the file does not say where.
    expect(loadPadBinds(JSON.stringify({ dash: PAD.Y, weaponNext: PAD.Y }))).toEqual({});
    // An override landing on a button another action keeps by default is dropped.
    expect(loadPadBinds(JSON.stringify({ dash: PAD.Y }))).toEqual({});
  });

  it("never throws, whatever cc_padbinds holds", () => {
    const hostile = [
      undefined, "", "null", "0", "42", "true", '"dash"', "[]", "[0,1,2]", "{}",
      JSON.stringify([PAD.Y, PAD.A]),
      JSON.stringify({ dash: { valueOf: 3 } }),
      JSON.stringify({ dash: [PAD.Y] }),
      JSON.stringify({ dash: 1.5, crouch: -1, fire: 1e308, aim: NaN }),
      '{"__proto__": {"dash": 3}}',
      '{"__proto__": 3, "constructor": 1, "toString": 2, "hasOwnProperty": 4}',
      '{"dash": 3, "dash": 0}',
      "{".repeat(5000),
    ];
    for (const raw of hostile) {
      expect(() => loadPadBinds(raw)).not.toThrow();
      const out = loadPadBinds(raw);
      expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
      for (const [a, v] of Object.entries(out)) {
        expect(REMAPPABLE_PAD_ACTIONS).toContain(a);
        expect(Number.isInteger(v)).toBe(true);
      }
    }
    expect(loadPadBinds('{"__proto__": {"dash": 3}}')).toEqual({});
    expect(loadPadBinds({ dash: 3 })).toEqual({});
    expect(({}).dash).toBeUndefined();
  });

  it("a loaded table never puts two actions on one button, except the RB pair", () => {
    const raw = JSON.stringify({ dash: PAD.X, crouch: PAD.X, sprint: PAD.RB, fire: PAD.LT, aim: PAD.RT });
    const t = { ...DEFAULT_GAMEPAD_ACTIONS, ...loadPadBinds(raw) };
    const seen = new Map();
    for (const a of REMAPPABLE_PAD_ACTIONS) {
      const other = seen.get(t[a]);
      if (other) expect([other, a].sort()).toEqual(["chronoRewind", "weaponPrev"]);
      seen.set(t[a], a);
    }
    expect(t.fire).toBe(PAD.LT);
    expect(t.aim).toBe(PAD.RT);
  });

  it("the live table the game reads is the same object remaps change", () => {
    expect(GAMEPAD_ACTIONS).not.toBe(DEFAULT_GAMEPAD_ACTIONS);
    expect(Object.isFrozen(DEFAULT_GAMEPAD_ACTIONS)).toBe(true);
    expect(Object.isFrozen(GAMEPAD_ACTIONS)).toBe(false);
  });
});
