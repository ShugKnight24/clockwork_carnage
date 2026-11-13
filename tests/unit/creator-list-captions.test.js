import { describe, it, expect } from "vitest";
import { CREATOR_CATEGORIES, getCreatorLayout, listRows, listWindow } from "../../src/ui/character-creator.js";
import { WARDROBE_THEMES } from "../../src/data/wardrobe-themes/index.js";
import { DEFAULT_CHARACTER } from "../../src/data/index.js";
import { cloneLook } from "../../src/core/character-fields.js";

const cat = (key) => CREATOR_CATEGORIES.find((c) => c.key === key);
const ch = cloneLook(DEFAULT_CHARACTER);
const THEME_ORDER = WARDROBE_THEMES.map((t) => t.name.toUpperCase());

describe("legacy creator list captions", () => {
  for (const [w, h, mobile, touch] of [[1280, 720, false, false], [844, 390, false, true], [667, 375, true, true]]) {
    for (const key of ["helmet", "shoulder"]) {
      it(`${key} list at ${w}x${h}: every pick in view, rows inside the panel, captions in theme order`, () => {
        const L = getCreatorLayout(w, h, mobile, touch);
        const c = cat(key);
        const bottom = L.contentY + 8 + listRows(L, c, ch) * L.itemH;
        for (let sel = 0; sel < c.data.length; sel++) {
          const rows = listWindow(L, c, ch, sel);
          expect(rows.some((r) => r.type === "item" && r.i === sel), `pick ${sel} in view`).toBe(true);
          let y = L.contentY + 8;
          for (const r of rows) {
            expect(r.y).toBeGreaterThanOrEqual(y);
            y = r.y + r.h;
          }
          expect(y).toBeLessThanOrEqual(bottom);
          // The window opens on a caption: the run it starts in is always named.
          expect(rows[0].type).toBe("caption");
          // Each item sits under its own theme's caption.
          let theme = null;
          for (const r of rows) {
            if (r.type === "caption") theme = r.theme;
            else expect(c.data[r.i].theme).toBe(theme);
          }
          const caps = rows.filter((r) => r.type === "caption").map((r) => r.text);
          expect(caps).toEqual(THEME_ORDER.filter((t) => caps.includes(t)));
        }
        // From the top: Field Issue first.
        expect(listWindow(L, c, ch, 0)[0].text).toBe("FIELD ISSUE");
      });
    }
  }

  it.each([[844, 390, false], [667, 375, true], [640, 360, true]])("the tab strip keeps two rows of fingertip tabs at %ix%i", (w, h, mobile) => {
    const L = getCreatorLayout(w, h, mobile, true);
    expect(CREATOR_CATEGORIES.map((c) => c.key)).toEqual(expect.arrayContaining(["frame", "body", "cape", "camo"]));
    expect(L.tabRows).toBe(2);
    expect(L.tabW).toBeGreaterThanOrEqual(28);
    expect(L.perRow * L.tabW + (L.perRow - 1) * L.tabGap).toBeLessThanOrEqual(w - 2 * L.inset);
  });

  it("the SUIT FRAME list is captioned by theme like the helmets", () => {
    const L = getCreatorLayout(1280, 720, false, false);
    const rows = listWindow(L, cat("frame"), ch, cat("frame").data.findIndex((e) => e.id === "diving"));
    expect(rows.filter((r) => r.type === "caption").map((r) => r.text)).toContain("ABYSSAL DIVER");
  });

  it("lists without themes keep one row per option, scrolled as before", () => {
    const L = getCreatorLayout(1280, 720, false, false);
    const c = cat("color");
    const n = listRows(L, c, ch);
    for (let sel = 0; sel < c.data.length; sel++) {
      const rows = listWindow(L, c, ch, sel);
      const off = sel >= n ? sel - n + 1 : 0;
      expect(rows.map((r) => [r.type, r.i, r.y])).toEqual(
        Array.from({ length: Math.min(n, c.data.length - off) }, (_, vi) => ["item", vi + off, L.contentY + 8 + vi * L.itemH]),
      );
    }
  });
});
