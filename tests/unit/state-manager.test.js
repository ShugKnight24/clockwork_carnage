// tests/unit/state-manager.test.js
import { describe, it, expect, vi, afterEach } from "vitest";
import { StateManager } from "../../js/state-manager.js";

describe("state manager transitions", () => {
  afterEach(() => vi.restoreAllMocks());

  it("goes settings → HUD editor → settings without a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sm = new StateManager("settings");
    sm.transition("hudEditor");
    sm.transition("settings");
    expect(sm.current).toBe("settings");
    expect(warn).not.toHaveBeenCalled();
  });

  it("still warns on a transition nobody declared", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    new StateManager("upgrade").transition("hudEditor");
    expect(warn).toHaveBeenCalled();
  });
});
