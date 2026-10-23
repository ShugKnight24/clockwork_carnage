import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyDefaultsMigration } from "../../src/core/save-system.js";

beforeEach(() => {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  });
});

describe("applyDefaultsMigration", () => {
  it("moves values still on the old defaults", () => {
    const s = { sensitivity: 1.0, hudStyle: 4 };
    const save = vi.fn();
    applyDefaultsMigration(false, s, save);
    expect(s).toEqual({ sensitivity: 0.7, hudStyle: 1 });
    expect(save).toHaveBeenCalledOnce();
  });

  it("keeps values the player chose", () => {
    const s = { sensitivity: 1.4, hudStyle: 2 };
    const save = vi.fn();
    applyDefaultsMigration(false, s, save);
    expect(s).toEqual({ sensitivity: 1.4, hudStyle: 2 });
    expect(save).not.toHaveBeenCalled();
  });

  it("runs once, so a player can pick the old value again", () => {
    applyDefaultsMigration(false, { sensitivity: 1.0, hudStyle: 4 }, () => {});
    const s = { sensitivity: 1.0, hudStyle: 4 };
    applyDefaultsMigration(false, s, () => {});
    expect(s).toEqual({ sensitivity: 1.0, hudStyle: 4 });
  });

  it("leaves phones on Vanguard", () => {
    const s = { sensitivity: 1.0, hudStyle: 4 };
    applyDefaultsMigration(true, s, () => {});
    expect(s.hudStyle).toBe(4);
  });

  it("turns spoken dialogue off once, then keeps a deliberate re-enable", () => {
    const s = { sensitivity: 0.7, hudStyle: 1, voices: true };
    const save = vi.fn();
    applyDefaultsMigration(false, s, save);
    expect(s.voices).toBe(false);
    expect(save).toHaveBeenCalledOnce();
    s.voices = true;
    applyDefaultsMigration(false, s, save);
    expect(s.voices).toBe(true);
  });

  it("turns voices off for players who already had the v1 defaults", () => {
    localStorage.setItem("cc_defaults_v1", "1");
    const s = { sensitivity: 1.0, voices: true };
    applyDefaultsMigration(false, s, () => {});
    expect(s).toEqual({ sensitivity: 1.0, voices: false });
  });
});
