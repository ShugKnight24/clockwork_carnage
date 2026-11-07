import { describe, it, expect } from "vitest";
import { CREATOR_CATEGORIES, faceSlotFoot, getCreatorLayout, listRows, previewView } from "../../src/ui/character-creator.js";
import { EXPRESSIONS, DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { cloneLook } from "../../src/core/character-fields.js";

const tab = CREATOR_CATEGORIES.find((c) => c.key === "expression");
const wearing = (helmet) => ({ ...cloneLook(DEFAULT_CHARACTER), helmet });

describe("legacy creator expression tab", () => {
  it("sits beside the face, hair and eyes tabs and lists every expression", () => {
    const keys = CREATOR_CATEGORIES.map((c) => c.key);
    expect(keys.indexOf("expression")).toBe(keys.indexOf("eye") + 1);
    expect(tab.data).toBe(EXPRESSIONS);
    expect(tab.shortLabel).toBe("EXPR");
  });

  it("frames the bust, as the other face tabs do", () => {
    expect(previewView("expression")).toBe("bust");
  });

  it("notes a helmet that hides or covers the mouth, and says nothing where it shows", () => {
    const L = getCreatorLayout(1280, 720, false, false);
    const head = (helmet) => faceSlotFoot(L, tab, wearing(helmet))?.head.join(" ") ?? null;
    expect(head("standard")).toBe("HIDDEN UNDER THE STANDARD DOME");
    expect(head("brim")).toBe("COVERED BY THE MARSHAL'S BRIM");
    expect(faceSlotFoot(L, tab, wearing("brim")).sub).toEqual(["Shows with another helmet"]);
    expect(faceSlotFoot(L, tab, wearing("standard")).tint).toBeNull();
    for (const helmet of ["wide", "ledmask", "bubble", "bandana"]) expect(head(helmet), helmet).toBeNull();
  });

  // The phone viewports tests/mobile-layout.spec.js plays, and a phone upright.
  it.each([[375, 667], [667, 375], [844, 390], [640, 360]])("keeps two rows of picks above the note on a %ix%i touch screen", (w, h) => {
    const L = getCreatorLayout(w, h, w < 700, true);
    const foot = faceSlotFoot(L, tab, wearing("standard"));
    const rows = listRows(L, tab, wearing("standard"));
    expect(rows).toBeGreaterThanOrEqual(2);
    expect(L.contentY + 8 + rows * L.itemH).toBeLessThanOrEqual(foot.top);
  });
});
