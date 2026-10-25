import { describe, it, expect } from "vitest";
import { voiceQuality, voiceGender, castVoices, speakableText, GOOD_VOICE } from "../../src/audio/speech.js";

const v = (name, lang = "en-US") => ({ name, lang, voiceURI: name });

describe("text-to-speech voices", () => {
  it("ranks neural and online voices above legacy ones", () => {
    const natural = voiceQuality(v("Microsoft Aria Online (Natural) - English (United States)"));
    const google = voiceQuality(v("Google US English"));
    const sapi = voiceQuality(v("Microsoft Zira - English (United States)"));
    expect(natural).toBeGreaterThan(google);
    expect(google).toBeGreaterThanOrEqual(GOOD_VOICE);
    expect(sapi).toBeLessThan(GOOD_VOICE);
    expect(voiceQuality(v("Google français", "fr-FR"))).toBe(0);
  });

  it("reads gender from the voice name", () => {
    expect(voiceGender(v("Microsoft Jenny Online (Natural)"))).toBe("f");
    expect(voiceGender(v("Microsoft Guy Online (Natural)"))).toBe("m");
    expect(voiceGender(v("Google US English"))).toBe(null);
  });

  it("casts by gender and spreads the cast across voices", () => {
    const voices = [
      v("Microsoft Aria Online (Natural)"), v("Microsoft Jenny Online (Natural)"), v("Microsoft Sonia Online (Natural)", "en-GB"),
      v("Microsoft Guy Online (Natural)"), v("Microsoft Davis Online (Natural)"), v("Microsoft Ryan Online (Natural)", "en-GB"),
    ];
    const cast = castVoices(voices);
    expect(cast.get("aria").name).toMatch(/Aria/);
    expect(voiceGender(cast.get("kael"))).toBe("m");
    expect(voiceGender(cast.get("lyra"))).toBe("f");
    expect(cast.get("lyra")).not.toBe(cast.get("aria"));
  });

  it("strips labels and stage directions before speaking", () => {
    expect(speakableText('ARIA: "Easy, cadet." [static] Breathe…')).toBe("Easy, cadet. Breathe...");
    expect(speakableText("They're already insi—")).toBe("They're already insi,");
  });
});
