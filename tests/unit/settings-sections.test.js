import { describe, it, expect, vi } from "vitest";
import { SETTINGS_REGISTRY, DEFAULT_SETTINGS, getVisibleSettings } from "../../js/settings-registry.js";
import { SECTIONS, SECTION_OF, rowsForSection, QUICK_CARDS } from "../../src/ui/settings-sections.js";
import { applySettingValue, stepSetting, resetSetting } from "../../src/ui/settings-apply.js";

const ids = SECTIONS.map((s) => s.id);

describe("settings sections", () => {
  it("has the six spec sections in order", () => {
    expect(ids).toEqual(["quick", "video", "audio", "controls", "gameplay", "access"]);
  });

  it("maps every registry row to a real section", () => {
    for (const def of SETTINGS_REGISTRY) {
      expect(SECTION_OF[def.key], def.key).toBeTruthy();
      expect(ids).toContain(SECTION_OF[def.key].section);
    }
  });

  it("loses no desktop row: every visible row appears in exactly one section", () => {
    const s = { ...DEFAULT_SETTINGS };
    const seen = [];
    for (const id of ids) for (const g of rowsForSection(id, false, s)) seen.push(...g.rows.map((r) => r.key));
    const visible = getVisibleSettings(false, s).map((d) => d.key);
    expect(seen.sort()).toEqual([...new Set(visible)].sort());
  });

  it("puts Video rows in the spec groups", () => {
    const groups = rowsForSection("video", false, { ...DEFAULT_SETTINGS }).map((g) => g.group);
    expect(groups).toEqual(["Look", "Quality", "Effects", "Diagnostics"]);
  });

  it("gives every Effects and Quality row a cost label", () => {
    for (const g of rowsForSection("video", false, { ...DEFAULT_SETTINGS })) {
      if (g.group === "Look" || g.group === "Diagnostics") continue;
      for (const r of g.rows) expect(SECTION_OF[r.key].cost, r.key).toMatch(/^(low|med|high)$/);
    }
  });

  it("shows touch rows only on touch devices", () => {
    const s = { ...DEFAULT_SETTINGS };
    const touchGroups = (t) => rowsForSection("controls", t, s).map((g) => g.group);
    expect(touchGroups(false)).not.toContain("Touch");
    expect(touchGroups(true)).toContain("Touch");
  });

  it("defines the four preset cards", () => {
    expect(QUICK_CARDS.map((c) => c.id)).toEqual(["battery", "balanced", "max", "custom"]);
  });
});

describe("settings apply", () => {
  const game = () => ({ settings: { ...DEFAULT_SETTINGS }, saveSettings: vi.fn() });
  const bloom = SETTINGS_REGISTRY.find((d) => d.key === "enableBloom");
  const fov = SETTINGS_REGISTRY.find((d) => d.key === "fov");

  it("sets, runs onChange and saves once", () => {
    const g = game();
    const spy = vi.fn();
    const def = { ...bloom, onChange: spy };
    expect(applySettingValue(g, def, !g.settings.enableBloom)).toBe(true);
    expect(spy).toHaveBeenCalledWith(g);
    expect(g.saveSettings).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the value is unchanged", () => {
    const g = game();
    expect(applySettingValue(g, bloom, g.settings.enableBloom)).toBe(false);
    expect(g.saveSettings).not.toHaveBeenCalled();
  });

  it("steps sliders within bounds and resets to default", () => {
    const g = game();
    stepSetting(g, fov, 1);
    expect(g.settings.fov).toBe(DEFAULT_SETTINGS.fov + fov.step);
    expect(resetSetting(g, fov)).toBe(true);
    expect(g.settings.fov).toBe(DEFAULT_SETTINGS.fov);
  });
});
