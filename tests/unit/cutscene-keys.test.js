import { describe, it, expect } from "vitest";
import { CUTSCENE_KEYS } from "../../src/data/cutscene-keys.js";
import { CUTSCENE_SCRIPTS } from "../../src/data/cutscene-scripts.js";

describe("CUTSCENE_KEYS", () => {
  it("matches the non-empty scripts exactly", () => {
    const expected = Object.keys(CUTSCENE_SCRIPTS).filter(
      (k) => CUTSCENE_SCRIPTS[k].length > 0,
    );
    expect([...CUTSCENE_KEYS].sort()).toEqual(expected.sort());
  });
});
