import { describe, it, expect } from "vitest";
import { SET_THEMES, equipSet, setPieces, wearsSet } from "../../src/systems/wardrobe-sets.js";
import { WARDROBE_THEMES } from "../../src/data/wardrobe-themes/index.js";
import { unlockContext, unlockState, ownedKey } from "../../src/systems/unlocks.js";
import { DEFAULT_CHARACTER } from "../../src/data/index.js";
import { cloneLook } from "../../src/core/character-fields.js";

/** An unlock context that owns exactly `pieces` ([field, id] pairs) and has earned nothing else. */
const owning = (...pieces) => unlockContext({ owned: Object.fromEntries(pieces.map(([k, id]) => [ownedKey(k, id), true])) });
const fresh = () => cloneLook(DEFAULT_CHARACTER);

describe("wardrobe sets", () => {
  it("one set per designed theme, in theme order, and none for Field Issue", () => {
    expect(SET_THEMES.map((t) => t.id)).toEqual(WARDROBE_THEMES.map((t) => t.id).filter((id) => id !== "issue"));
    for (const t of SET_THEMES) expect(setPieces(t.id).map((p) => p.field)).toEqual(["frame", "helmet", "shoulder"]);
  });

  it("issue has no set", () => {
    expect(() => equipSet(fresh(), "issue", unlockContext())).toThrow(RangeError);
    expect(() => setPieces("issue")).toThrow(RangeError);
    expect(() => equipSet(fresh(), "nope", unlockContext())).toThrow(RangeError);
  });

  it("equipSet with a locked helmet equips frame and shoulders and reports the helmet", () => {
    // Every piece of Ronin's set is tiered gear: a fresh save owns none of it.
    const ctx = owning(["frame", "lamellar"], ["shoulder", "sode"]);
    expect(unlockState("helmet", "kabuto", ctx).unlocked).toBe(false);
    const ch = { ...fresh(), helmet: "wide" };
    const { changes, skipped } = equipSet(ch, "ronin", ctx);
    expect(changes).toEqual({ frame: "lamellar", shoulder: "sode" });
    expect(skipped).toEqual([{ field: "helmet", id: "kabuto", hint: unlockState("helmet", "kabuto", ctx).hint }]);
    expect(skipped[0].hint).toBeTruthy();
    // The helmet slot keeps what is worn.
    expect({ ...ch, ...changes }.helmet).toBe("wide");
  });

  it("equipSet with a locked frame keeps the frame worn and reports it", () => {
    const ctx = owning(["helmet", "kabuto"], ["shoulder", "sode"]);
    expect(unlockState("frame", "lamellar", ctx).unlocked).toBe(false);
    const ch = { ...fresh(), frame: "wraith" };
    const { changes, skipped } = equipSet(ch, "ronin", ctx);
    expect(changes).toEqual({ helmet: "kabuto", shoulder: "sode" });
    expect(skipped).toEqual([{ field: "frame", id: "lamellar", hint: unlockState("frame", "lamellar", ctx).hint }]);
    expect({ ...ch, ...changes }.frame).toBe("wraith");
  });

  it("equipSet never equips a locked piece", () => {
    // Nothing owned; only a helmet; every helmet and shoulder but no frame.
    const allButFrames = owning(...SET_THEMES.flatMap((t) => setPieces(t.id).filter((p) => p.field !== "frame").map((p) => [p.field, p.id])));
    for (const ctx of [unlockContext(), owning(["helmet", "cockpit"]), allButFrames]) {
      for (const t of SET_THEMES) {
        const { changes, skipped } = equipSet(fresh(), t.id, ctx);
        for (const [field, id] of Object.entries(changes)) expect(unlockState(field, id, ctx).unlocked, `${t.id} ${field}`).toBe(true);
        for (const s of skipped) {
          expect(unlockState(s.field, s.id, ctx).unlocked).toBe(false);
          expect(s.field in changes).toBe(false);
        }
        // Every piece of the set is either worn or reported.
        expect(Object.keys(changes).length + skipped.length).toBe(3);
        if (ctx === allButFrames) expect(skipped.map((s) => s.field), t.id).toEqual(["frame"]);
      }
    }
  });

  it("with everything owned, the whole set goes on and is worn", () => {
    for (const t of SET_THEMES) {
      const ctx = owning(...setPieces(t.id).map((p) => [p.field, p.id]));
      const ch = fresh();
      const { changes, skipped } = equipSet(ch, t.id, ctx);
      expect(skipped).toEqual([]);
      expect(wearsSet({ ...ch, ...changes }, t.id)).toBe(true);
      expect(wearsSet(ch, t.id)).toBe(false);
    }
  });
});
