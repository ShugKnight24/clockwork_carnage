import { describe, it, expect } from "vitest";
import {
  AUTO_PACING,
  autoAdvanceAt,
  autoHoldMs,
  countWords,
  pageHoldMs,
} from "../../src/systems/cutscene-pacing.js";

describe("countWords", () => {
  it("counts words, ignoring punctuation-only tokens", () => {
    expect(countWords("Time is broken.")).toBe(3);
    expect(countWords("CHRONOS STATION — 06:47. One lab light")).toBe(6);
    expect(countWords("  ")).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });

  it("sums arrays", () => {
    expect(countWords(["a b", "c", null])).toBe(3);
  });
});

describe("autoHoldMs", () => {
  it("is 1800 + 300 per word inside the clamp", () => {
    expect(autoHoldMs(5)).toBe(3300);
    expect(autoHoldMs(10)).toBe(4800);
  });

  it("clamps to 3000..9000", () => {
    expect(autoHoldMs(1)).toBe(3000);
    expect(autoHoldMs(24)).toBe(9000);
    expect(autoHoldMs(200)).toBe(9000);
  });

  it("holds 4000 ms with no text", () => {
    expect(autoHoldMs(0)).toBe(AUTO_PACING.noText);
    expect(autoHoldMs(0)).toBe(4000);
  });
});

describe("autoAdvanceAt", () => {
  it("holds after the text finishes", () => {
    expect(autoAdvanceAt({ textDoneAt: 2000, words: 10 })).toBe(6800);
  });

  it("keeps a longer explicit duration", () => {
    expect(autoAdvanceAt({ textDoneAt: 1000, words: 4, duration: 9500 })).toBe(9500);
    expect(autoAdvanceAt({ textDoneAt: 1000, words: 4, duration: 2000 })).toBe(4000);
  });

  it("counts the hold from when AUTO was switched on mid-frame", () => {
    expect(autoAdvanceAt({ textDoneAt: 2000, words: 4, autoFrom: 10000 })).toBe(13000);
  });

  it("holds a text-free frame 4000 ms", () => {
    expect(autoAdvanceAt({})).toBe(4000);
  });
});

describe("pageHoldMs", () => {
  it("stretches a captioned page to 2500 + 280 per word", () => {
    // 10 words → 5300
    const page = { hold: 1600, panel: { caption: "Badge 11235. Beat cop. Nobody's idea of a hero, really." } };
    expect(pageHoldMs(page)).toBe(2500 + 280 * 10);
  });

  it("keeps a longer page hold", () => {
    expect(pageHoldMs({ hold: 6000, panel: { caption: "Then somebody broke the sky." } })).toBe(6000);
  });

  it("caps the caption hold at 9000", () => {
    const caption = Array.from({ length: 40 }, () => "word").join(" ");
    expect(pageHoldMs({ hold: 1400, panel: { caption } })).toBe(9000);
    expect(pageHoldMs({ hold: 12000, panel: { caption } })).toBe(12000);
  });

  it("leaves captionless pages alone and defaults to 1400", () => {
    expect(pageHoldMs({ hold: 1500, panel: {} })).toBe(1500);
    expect(pageHoldMs({ panel: {} })).toBe(1400);
  });
});
