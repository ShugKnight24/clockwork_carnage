import { describe, it, expect } from "vitest";
import { CUTSCENE_SCRIPTS } from "../../src/data/cutscene-scripts.js";
import { CUTSCENE_KEYS } from "../../src/data/cutscene-keys.js";
import { ACTS, NG_PLUS, sceneSlots } from "../../src/data/campaign/acts.js";
import { VOICES, EMOTIONS, voiceKeyFor } from "../../src/audio/voice.js";
import { classifyLine } from "../../src/ui/cutscene-text.js";
import { PARTY_ORDER } from "../../src/rendering/party.js";

// The story as the player meets it: every scene a slot names exists, every
// line someone says has a voice, and the party art never shows anyone before
// they have joined.

/** Every { frame, owner, line, where } in every script, panels included. */
function allLines() {
  const out = [];
  for (const [key, script] of Object.entries(CUTSCENE_SCRIPTS)) {
    script.forEach((frame, i) => {
      const add = (owner, where) =>
        (owner.lines ?? []).forEach((line) => out.push({ frame, owner, line, where }));
      add(frame, `${key}[${i}]`);
      frame.panels?.forEach((p, j) => add(p, `${key}[${i}].panels[${j}]`));
    });
  }
  return out;
}

/** Members recruited by each (act, level): everyone who has been present so far. */
function recruitedBySlot() {
  const map = new Map();
  const seen = new Set();
  for (const act of ACTS) {
    act.levels.forEach((l, i) => {
      l.squad.forEach((m) => seen.add(m));
      map.set(`${act.id}.${i}`, new Set(seen));
    });
  }
  return map;
}

describe("scene keys", () => {
  it("names no scene that does not exist, from the table or the campaign code", () => {
    const named = [
      ...sceneSlots().map((s) => s.key),
      ...NG_PLUS.trueEnding,
      // CampaignManager.start and startNgPlus
      "intro_flipbook", "clocking_in", "intro", "intro_memory_01", "ng_plus_intro",
    ];
    for (const k of named) {
      expect(CUTSCENE_KEYS.has(k), k).toBe(true);
      expect(CUTSCENE_SCRIPTS[k]?.length, k).toBeGreaterThan(0);
    }
  });

  it("introduces each ally's tagline exactly once", () => {
    const text = allLines().map((l) => l.line.text);
    for (const name of ["LYRA", "ROOK", "NOVA", "KAEL"]) {
      const taglines = text.filter((t) => new RegExp(`^${name} — `).test(t));
      expect(taglines, name).toHaveLength(1);
    }
  });
});

describe("voices", () => {
  const voiced = new Set([...Object.keys(VOICES), "player"]);

  it("gives every spoken line a voice", () => {
    const silent = [];
    let spoken = 0;
    for (const { frame, owner, line, where } of allLines()) {
      const cls = classifyLine(String(line.text).replace(/\{AGENT\}/g, "Agent"));
      if (!cls.speaker && !cls.quoted) continue;
      spoken++;
      const key = voiceKeyFor({
        speaker: cls.speaker,
        quoted: cls.quoted,
        lineVoice: line.voice,
        frameVoice: owner.voice ?? frame.voice,
        art: owner.art ?? frame.art,
      });
      // A printed label the voice table does not know falls back to "unknown";
      // only the UNKNOWN label itself should sound like that.
      const misfiled = cls.speaker && key === "unknown" && cls.speaker !== "UNKNOWN" && !line.voice && !(owner.voice ?? frame.voice);
      if (!key || !voiced.has(key) || misfiled) silent.push(`${where}: ${line.text}`);
    }
    expect(silent).toEqual([]);
    expect(spoken).toBeGreaterThan(300);
  });

  it("names only real voices and emotions", () => {
    for (const { frame, owner, line, where } of allLines()) {
      for (const v of [line.voice, owner.voice, frame.voice]) {
        if (v) expect(voiced.has(v), `${where}: voice ${v}`).toBe(true);
      }
      for (const e of [line.emotion, owner.emotion, frame.emotion]) {
        if (e) expect(EMOTIONS[e], `${where}: emotion ${e}`).toBeDefined();
      }
    }
  });

  it("voices every quoted line on a party frame explicitly", () => {
    for (const { frame, line, where } of allLines()) {
      if (frame.art !== "party") continue;
      if (classifyLine(line.text).quoted) expect(line.voice, `${where}: ${line.text}`).toBeTruthy();
    }
  });
});

describe("party art", () => {
  const recruited = recruitedBySlot();
  const slotOf = new Map(sceneSlots().map((s) => [s.key, `${s.act}.${s.level}`]));
  const partyFrames = Object.entries(CUTSCENE_SCRIPTS).flatMap(([key, script]) =>
    script.map((f, i) => ({ key, i, f })).filter(({ f }) => f.art === "party"),
  );

  it("names its members on every frame, in lineup terms", () => {
    expect(partyFrames.length).toBeGreaterThan(0);
    for (const { key, i, f } of partyFrames) {
      expect(Array.isArray(f.party), `${key}[${i}]`).toBe(true);
      for (const m of f.party) expect(PARTY_ORDER, `${key}[${i}]: ${m}`).toContain(m);
      expect(f.party, `${key}[${i}] has the player`).toContain("you");
    }
  });

  it("shows only members already recruited in the slot the scene plays in", () => {
    for (const { key, i, f } of partyFrames) {
      const slot = slotOf.get(key);
      if (!slot) continue; // NG+ scenes: everyone has been recruited
      const have = recruited.get(slot);
      for (const m of f.party.filter((m) => m !== "you")) {
        expect(have.has(m), `${key}[${i}] at ${slot} shows ${m} before they join`).toBe(true);
      }
    }
  });

  it("draws the recruits of the Gathering as they arrive: three, four, five", () => {
    const sizes = ["the_hunt_begins", "gathering_greenhouse", "gathering_kael_joins"].map(
      (k) => CUTSCENE_SCRIPTS[k].find((f) => f.art === "party").party.length,
    );
    expect(sizes).toEqual([3, 4, 5]);
    // Before Rook joins there is no lineup at all, only Lyra's own frames.
    for (const k of ["gathering_extraction", "gathering_lyra", "gathering_rook"]) {
      expect(CUTSCENE_SCRIPTS[k].some((f) => f.art === "party"), k).toBe(false);
    }
  });
});
