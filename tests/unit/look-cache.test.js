import { describe, it, expect } from "vitest";
import { lookKey, cloneLook } from "../../src/core/character-fields.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";

/**
 * The cutscene cast cache (src/rendering/svg-art/index.js castHashOf), the
 * Modern HUD portrait cache (src/ui/portrait-modern.js characterLayers) and
 * the showroom stage/thumbnail caches (js/components/agent-showroom.js
 * renderStage/refreshContent) all key off `lookKey(ch)` verbatim as of Task 11.
 *
 * Observing an actual cache rebuild end-to-end means rasterising through
 * getLayerImage, which needs a real canvas; this suite runs under the
 * "node" vitest environment (see vite.config test.environment) and has none,
 * so per the task-11 brief this test instead proves the cache KEY changes for
 * exactly the mutations Tasks 9 and 10 found serving stale art: accessories,
 * armour variant, and badge placements/layers/finish. Because every cache
 * above now uses `lookKey(ch)` verbatim as its key, a changed key guarantees
 * a cache miss (rebuild) and an unchanged key guarantees the cached art is
 * reused — this is exhaustively covered for the DRAWN fields already in
 * tests/unit/character-fields.test.js ("lookKey changes with every drawn
 * field..."); this file narrows to the Task 11 regression scenarios.
 */
describe("look cache key (cast, portrait, showroom)", () => {
  const fresh = () => cloneLook(DEFAULT_CHARACTER);

  it("is stable for an untouched character (cache hit)", () => {
    const a = fresh();
    const b = fresh();
    expect(lookKey(a)).toBe(lookKey(b));
  });

  it("changes when an accessory slot changes (cache rebuild)", () => {
    const a = fresh();
    const b = cloneLook(a);
    b.accessories.back = "cloak";
    expect(lookKey(b)).not.toBe(lookKey(a));
  });

  it("changes when the armour variant changes (cache rebuild)", () => {
    const a = fresh();
    const b = cloneLook(a);
    b.armorVariant = 1;
    expect(lookKey(b)).not.toBe(lookKey(a));
  });

  it("changes when a badge placement, layer or finish changes (cache rebuild)", () => {
    const a = fresh();
    for (const mutate of [
      (c) => { c.badge.placements = ["chest"]; },
      (c) => { c.badge.layers[0].symbol = "star"; },
      (c) => { c.badge.finish = "holo"; },
    ]) {
      const b = cloneLook(a);
      mutate(b);
      expect(lookKey(b)).not.toBe(lookKey(a));
    }
  });
});
