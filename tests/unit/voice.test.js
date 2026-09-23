import { describe, it, expect } from "vitest";
import {
  VOICES,
  playerVoice,
  voiceKeyFor,
  syllabify,
  planUtterance,
  planBark,
} from "../../src/audio/voice.js";

describe("syllabify", () => {
  it("gives one syllable per vowel group", () => {
    expect(syllabify("paradox").length).toBe(3);
  });

  it("drops a silent trailing e", () => {
    expect(syllabify("time").length).toBe(1);
    expect(syllabify("the").length).toBe(1);
  });

  it("keeps every character accounted for", () => {
    const word = "strength";
    expect(syllabify(word).reduce((a, s) => a + s.chars, 0)).toBe(word.length);
  });

  it("voices a vowel-less word as one schwa", () => {
    expect(syllabify("hmm")).toEqual([{ chars: 3, vowel: "@", onset: "breath" }]);
  });
});

describe("planUtterance", () => {
  const text = "Stay on objective. Stay alive!";

  it("lasts as long as the text takes to type", () => {
    const { duration } = planUtterance(text, VOICES.aria, { charsPerSec: 18 });
    // Every character is 1/18 s; sentence ends add a short breath each.
    expect(duration).toBeGreaterThanOrEqual(text.length / 18);
    expect(duration).toBeLessThan(text.length / 18 + 0.5);
  });

  it("is deterministic for the same line", () => {
    const a = planUtterance(text, VOICES.lyra);
    const b = planUtterance(text, VOICES.lyra);
    expect(a).toEqual(b);
  });

  it("keeps events in time order inside the line", () => {
    const { events, duration } = planUtterance(text, VOICES.kael);
    for (let i = 1; i < events.length; i++) expect(events[i].t).toBeGreaterThan(events[i - 1].t);
    expect(events.at(-1).t + events.at(-1).slot).toBeLessThanOrEqual(duration);
  });

  it("raises the end of a question", () => {
    const { events } = planUtterance("You hear me?", VOICES.nova);
    const last = events.at(-1);
    expect(last.semiEnd).toBeGreaterThan(last.semi);
  });

  it("snaps pitch to the voice's scale", () => {
    const { events } = planUtterance("Warning. Temporal breach detected.", VOICES.aria);
    for (const e of events) expect([0, 2, 4, 7, 9]).toContain(((e.semi % 12) + 12) % 12);
  });

  it("is silent for empty text", () => {
    expect(planUtterance("", VOICES.aria).events).toEqual([]);
  });
});

describe("voiceKeyFor", () => {
  it("prefers an explicit voice", () => {
    expect(voiceKeyFor({ lineVoice: "rook", speaker: "ARIA" })).toBe("rook");
  });

  it("maps printed speaker labels", () => {
    expect(voiceKeyFor({ speaker: "ARIA" })).toBe("aria");
    expect(voiceKeyFor({ speaker: "Lyra" })).toBe("lyra");
  });

  it("voices quoted lines from the frame art", () => {
    expect(voiceKeyFor({ quoted: true, art: "villain_form2" })).toBe("lord");
  });

  it("leaves narration silent", () => {
    expect(voiceKeyFor({ quoted: false, art: "lyra" })).toBeNull();
  });
});

describe("player voices", () => {
  it("gives each creator preset a different pitch", () => {
    const pitches = ["rookie", "veteran", "calm", "synthetic"].map((id) => playerVoice({ id }).pitch);
    expect(new Set(pitches).size).toBe(4);
  });

  it("falls back to calm", () => {
    expect(playerVoice({ id: "nope" })).toBe(playerVoice({ id: "calm" }));
  });

  it("has a bark for each grunt kind", () => {
    for (const k of ["hurt", "death", "slide", "dash", "jump"]) expect(planBark(k).events.length).toBe(1);
  });
});
