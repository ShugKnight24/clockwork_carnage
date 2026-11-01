import { describe, it, expect } from "vitest";
import { readingTime } from "../../src/systems/aria-comms.js";

describe("reading time", () => {
  it("holds a line longer only at Slow", () => {
    const line = "x".repeat(130);
    expect(readingTime(line, 0)).toBeCloseTo(14, 5);
    // Normal keeps each line's own time: no floor, so the story is not slowed.
    expect(readingTime(line, 1)).toBe(0);
    expect(readingTime("", 0)).toBe(1);
  });
});
