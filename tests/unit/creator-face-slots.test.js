// The canvas creator's eyes and face tabs: a note at the foot of the list
// when the helmet worn hides the slot or leaves it no room, and the list
// keeps out of it. Tiles show the bare head, so each item reads.
import { describe, it, expect } from "vitest";
import { CREATOR_CATEGORIES, faceSlotFoot, getCreatorLayout, listRows } from "../../src/ui/character-creator.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const tab = (slot) => CREATOR_CATEGORIES.find((c) => c.slot === slot);
const VIEWPORTS = [[1440, 900, false, false], [844, 390, false, true], [667, 375, true, true], [375, 667, true, true]];

describe("legacy creator eyes and face tabs", () => {
  it("lists both slots with the other gear", () => {
    expect(tab("eyes").key).toBe("acc.eyes");
    expect(tab("face").key).toBe("acc.face");
  });

  it("says nothing when the slot shows", () => {
    const L = getCreatorLayout(1440, 900, false, false);
    for (const helmet of ["wide", "mohawk", "bubble"]) {
      for (const slot of ["eyes", "face"]) expect(faceSlotFoot(L, tab(slot), lookFromIds({ helmet })), `${helmet} ${slot}`).toBeNull();
    }
    expect(faceSlotFoot(L, tab("eyes"), lookFromIds({ helmet: "brim" }))).toBeNull();
    expect(faceSlotFoot(L, CREATOR_CATEGORIES.find((c) => c.slot === "neck"), lookFromIds({ helmet: "standard" }))).toBeNull();
  });

  it("names the helmet that hides the slot or leaves it no room", () => {
    const L = getCreatorLayout(1440, 900, false, false);
    const hidden = faceSlotFoot(L, tab("eyes"), lookFromIds({ helmet: "standard" }));
    expect(hidden.head.join(" ")).toBe("HIDDEN UNDER THE STANDARD DOME");
    expect(hidden.sub.join(" ")).toBe("Shows with an open helmet");
    const room = faceSlotFoot(L, tab("face"), lookFromIds({ helmet: "brim" }));
    expect(room.head.join(" ")).toBe("NO ROOM UNDER THE MARSHAL'S BRIM");
    expect(room.sub.join(" ")).toBe("Shows with another helmet");
    expect(faceSlotFoot(L, tab("eyes"), lookFromIds({ helmet: "ledmask" })).head.join(" ")).toBe("NO ROOM UNDER THE LED MASK");
  });

  it.each(VIEWPORTS)("keeps the list above the note at %ix%i", (w, h, mobile, touch) => {
    const L = getCreatorLayout(w, h, mobile, touch);
    for (const helmet of ["standard", "brim", "ledmask"]) {
      const ch = lookFromIds({ helmet });
      for (const slot of ["eyes", "face"]) {
        const foot = faceSlotFoot(L, tab(slot), ch);
        if (!foot) continue;
        const rows = listRows(L, tab(slot), ch);
        expect(rows).toBeGreaterThanOrEqual(2);
        expect(L.contentY + 8 + rows * L.itemH, `${helmet} ${slot}`).toBeLessThanOrEqual(foot.top);
        // Every line fits across the list.
        for (const line of [...foot.head, ...foot.sub]) expect(line.length * 6.1, line).toBeLessThanOrEqual(L.listW - 20);
        expect(foot.top + foot.h).toBeLessThanOrEqual(L.contentY + L.panelH);
      }
      // With nothing to say the list keeps its full height.
      expect(listRows(L, tab("eyes"), lookFromIds({ helmet: "wide" }))).toBe(Math.min(tab("eyes").data.length, L.maxBySpace));
    }
  });
});
