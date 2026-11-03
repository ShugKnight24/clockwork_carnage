import { describe, it, expect } from "vitest";
import { wrapWords } from "../../src/utils/text.js";
import { clamp01, lerpPoint } from "../../src/utils/math.js";

// The greedy wrap archive-screen, tutorial-ui and the cinematic overlay each
// carried (they differed only in how they split and measured).
function oldWrap(words, measure, maxW) {
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (measure(test) > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const TEXTS = [
  "",
  "one",
  "The station's lights are out and the clock in the hall is running backwards.",
  "  leading and trailing   spaces  ",
  "a supercalifragilisticexpialidocious word that is wider than the line",
];

describe("wrapWords", () => {
  const measure = (s) => s.length * 7;
  it("matches the local greedy wraps it replaced", () => {
    for (const text of TEXTS) {
      for (const maxW of [0, 30, 70, 140, 400, 10000]) {
        for (const words of [text.split(" "), String(text).split(/\s+/)]) {
          expect(wrapWords(words, measure, maxW), `${maxW}: ${text}`).toEqual(oldWrap(words, measure, maxW));
        }
      }
    }
  });
});

describe("clamp01 and lerpPoint", () => {
  it("clamp01 matches the Math.max/min copies", () => {
    for (const v of [-2, -0.5, 0, 0.25, 0.5, 1, 1.5, 99, NaN]) {
      expect(clamp01(v)).toBe(Math.max(0, Math.min(1, v)));
    }
  });

  it("lerpPoint interpolates both axes", () => {
    expect(lerpPoint([0, 10], [10, 30], 0.25)).toEqual([2.5, 15]);
    expect(lerpPoint([1, 2], [3, 4], 0)).toEqual([1, 2]);
  });
});
