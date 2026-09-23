import { describe, it, expect } from "vitest";
import {
  ART_LEGACY,
  ART_MODERN,
  ART_REALISTIC,
  getArtStyle,
  isModernArt,
  isRealisticArt,
  onArtStyleChange,
  setArtStyle,
} from "../../src/rendering/art-style.js";

describe("art style", () => {
  it("shares the Modern asset set with Realistic", () => {
    setArtStyle(ART_REALISTIC);
    expect(isModernArt()).toBe(true);
    expect(isRealisticArt()).toBe(true);

    setArtStyle(ART_MODERN);
    expect(isModernArt()).toBe(true);
    expect(isRealisticArt()).toBe(false);

    setArtStyle(ART_LEGACY);
    expect(isModernArt()).toBe(false);
    expect(isRealisticArt()).toBe(false);
  });

  it("normalises unknown values to Modern", () => {
    setArtStyle(ART_LEGACY);
    setArtStyle(7);
    expect(getArtStyle()).toBe(ART_MODERN);
  });

  it("tells listeners the previous style so they can release its assets", () => {
    setArtStyle(ART_REALISTIC);
    const seen = [];
    const off = onArtStyleChange((style, prev) => seen.push([style, prev]));
    setArtStyle(ART_LEGACY);
    setArtStyle(ART_LEGACY); // no-op: no event
    off();
    setArtStyle(ART_MODERN); // unsubscribed
    expect(seen).toEqual([[ART_LEGACY, ART_REALISTIC]]);
  });
});
