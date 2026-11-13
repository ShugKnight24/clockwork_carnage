// The canvas creator's info panel: a gear pick's perk lines stack under its
// description, never over it, on a phone on its side and on a desktop.
import { describe, it, expect } from "vitest";
import { CREATOR_CATEGORIES, getCreatorLayout, gearPerkLines, infoTextLayout, INFO_TEXT } from "../../src/ui/character-creator.js";
import { gearPickCounts } from "../../src/data/cosmetics.js";

// Monospace: every glyph is 0.6 of the font size wide (bold a touch wider).
const measure = (text, font) => text.length * parseFloat(font.match(/(\d+)px/)[1]) * (font.startsWith("bold") ? 0.61 : 0.6);
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const SCREENS = [
  ["phone on its side, 844×390", getCreatorLayout(844, 390, false, true)],
  ["desktop, 1440×900", getCreatorLayout(1440, 900, false, false)],
];

describe("info panel text", () => {
  for (const [name, L] of SCREENS) {
    it(`${name}: every gear pick's perk and note sit under its description, inside the panel`, () => {
      expect(L.infoW).toBeGreaterThan(0);
      const infoX = L.contentX + L.listW + L.contentGap + L.previewW + L.contentGap;
      let checked = 0;
      for (const cat of CREATOR_CATEGORIES) {
        for (const item of cat.data || []) {
          const perk = gearPerkLines(cat, item).map((l) => l.toUpperCase());
          if (!perk.length) continue;
          const t = infoTextLayout(L, infoX, { desc: item.desc || "", perk, note: ["Not drawn here: perk doesn't apply"] }, measure);
          const lower = [...t.perk, ...t.note];
          for (const d of t.desc) for (const l of lower) expect(overlaps(d.rect, l.rect), `${cat.key} ${item.id}: "${l.text}" over "${d.text}"`).toBe(false);
          for (const l of [...t.desc, ...lower]) {
            expect(l.rect.x, `${cat.key} ${item.id}`).toBeGreaterThanOrEqual(infoX);
            expect(l.rect.x + l.rect.w, `${cat.key} ${item.id}: "${l.text}"`).toBeLessThanOrEqual(infoX + L.infoW - 12 + 1e-9);
          }
          expect(t.bottom, `${cat.key} ${item.id}`).toBeLessThanOrEqual(L.contentY + L.panelH);
          if (t.desc.length) expect(t.perk[0].rect.y).toBeGreaterThan(t.desc.at(-1).rect.y + t.desc.at(-1).rect.h);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(50);
    });
  }

  it("wraps a long line to the panel and keeps the description's step", () => {
    const L = SCREENS[0][1];
    const t = infoTextLayout(L, 0, { desc: "a ".repeat(60).trim(), perk: ["+0.08 HEALTH PER SECOND"] }, measure);
    expect(t.desc.length).toBeGreaterThan(1);
    expect(t.desc[1].y - t.desc[0].y).toBe(INFO_TEXT.desc.line);
  });
});

describe("dimmed perks", () => {
  it("a pick the figure does not draw does not count", () => {
    expect(gearPickCounts({ frame: "operator" }, "shoulder")).toBe(false);
    expect(gearPickCounts({ frame: "standard" }, "shoulder")).toBe(true);
    expect(gearPickCounts({ helmet: "standard" }, "acc.eyes")).toBe(false);
    expect(gearPickCounts({ helmet: "brim" }, "acc.face")).toBe(false);
    expect(gearPickCounts({ helmet: "brim" }, "acc.eyes")).toBe(true);
    expect(gearPickCounts({ helmet: "bubble", accessories: { helmet: "whip" } }, "acc.helmet")).toBe(false);
    expect(gearPickCounts({ helmet: "cockpit" }, "visor")).toBe(false);
    expect(gearPickCounts({}, "armor")).toBe(true);
  });
});
