import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tutorialStepCopy, beatCaption } from "../../src/ui/tutorial-ui.js";
import { TUTORIAL_SANDBOX_STEP } from "../../src/constants.js";
import { PROLOGUE_STEPS, PROLOGUE_BEATS, lineDuration } from "../../src/data/prologue.js";

const desktop = tutorialStepCopy(false);
const mobile = tutorialStepCopy(true);
// Steps with a card: the opening scene and the HUD boot have none.
const cardSteps = desktop.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);

const systemSource = readFileSync(
  fileURLToPath(new URL("../../js/tutorial-system.js", import.meta.url)),
  "utf8",
);

/** Step ids the LOGIC table in js/tutorial-system.js handles. */
function logicIds(src) {
  const body = src.slice(src.indexOf("const LOGIC = {"), src.indexOf("export class TutorialSystem"));
  return [...body.matchAll(/^ {2}(\w+): \{$/gm)].map((m) => m[1]);
}

describe("tutorial step numbering", () => {
  it("leaves step 0 without a card — it is the HUD boot animation", () => {
    expect(desktop[0]).toBeNull();
  });

  it("puts the sandbox exactly one step past the last card", () => {
    expect(desktop.length).toBe(TUTORIAL_SANDBOX_STEP);
    expect(PROLOGUE_STEPS.length).toBe(TUTORIAL_SANDBOX_STEP);
    expect(desktop[TUTORIAL_SANDBOX_STEP]).toBeUndefined();
  });

  it.each(cardSteps)("step %i has a complete card", (i) => {
    expect(desktop[i]).toMatchObject({
      title: expect.any(String),
      hint: expect.any(String),
      color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
    });
    expect(desktop[i].title.length).toBeGreaterThan(0);
    expect(desktop[i].hint.length).toBeGreaterThan(0);
  });

  it("gives mobile the same steps in the same order", () => {
    expect(mobile.length).toBe(desktop.length);
    expect(mobile.map((s) => s?.title)).toEqual(desktop.map((s) => s?.title));
  });

  it("never tells a touch player to press a key or click", () => {
    const keyboardVerbs = /\b(mouse|click|press [A-Z]|WASD|W A S D|SHIFT|CTRL|scroll)\b/;
    for (const step of mobile.filter(Boolean)) {
      expect(step.hint).not.toMatch(keyboardVerbs);
    }
  });

  it("drives every step with logic", () => {
    const ids = logicIds(systemSource);
    for (const s of PROLOGUE_STEPS) expect(ids, s.id).toContain(s.id);
  });
});

describe("the prologue", () => {
  it("runs through its beats in order, each with at least one step", () => {
    const beats = PROLOGUE_STEPS.map((s) => s.beat);
    expect([...beats].sort((a, b) => a - b)).toEqual(beats);
    for (let b = 0; b < PROLOGUE_BEATS.length; b++) expect(beats).toContain(b);
  });

  it("has unique step ids", () => {
    const ids = PROLOGUE_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every beat a checkpoint", () => {
    for (let b = 0; b < PROLOGUE_BEATS.length; b++) {
      expect(PROLOGUE_STEPS.some((s) => s.beat === b && s.checkpoint !== false)).toBe(true);
    }
  });

  it("captions each card with its beat", () => {
    expect(beatCaption(1)).toBe(`PROLOGUE · 2/${PROLOGUE_BEATS.length} · THE RANGE`);
    for (const card of desktop.filter(Boolean)) expect(beatCaption(card.beat)).toMatch(/^PROLOGUE · \d\/\d · /);
  });

  it("is told by ARIA and the Supervisor, in lines short enough to say", () => {
    for (const s of PROLOGUE_STEPS) {
      for (const [speaker, text, emotion] of s.lines || []) {
        expect(["ARIA", "SUPERVISOR", "OFFICER", "LT. REYES", "PA"]).toContain(speaker);
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThan(170);
        if (emotion != null) expect(typeof emotion).toBe("string");
        expect(lineDuration(text)).toBeGreaterThanOrEqual(3.2);
      }
    }
  });

  it("trains on harmless things first: targets, then holograms, then a simulation, then the real attack", () => {
    const ids = PROLOGUE_STEPS.map((s) => s.id);
    const at = (id) => ids.indexOf(id);
    expect(at("fire")).toBeLessThan(at("lab"));
    expect(at("lab")).toBeLessThan(at("sim"));
    expect(at("sim")).toBeLessThan(at("alarm"));
    // Nothing before the alarm is a real fight.
    expect(ids.slice(0, at("alarm"))).not.toContain("cover");
  });

  it("builds the morning toward the breach with announcements, flickers and tremors", () => {
    const events = PROLOGUE_STEPS.flatMap((s) => (s.events || []).map((e) => [s.id, ...e]));
    expect(events.length).toBeGreaterThanOrEqual(6);
    for (const [id, at, kind, text] of events) {
      expect(["pa", "flicker", "tremor"], id).toContain(kind);
      expect(at).toBeGreaterThanOrEqual(0);
      if (kind === "pa") expect(text.length).toBeGreaterThan(10);
    }
  });

  it("teaches what the old tutorial never did", () => {
    const ids = PROLOGUE_STEPS.map((s) => s.id);
    for (const id of ["cells", "sprint", "chrono", "cover", "shield", "shotgun", "moving", "course", "vents"]) {
      expect(ids).toContain(id);
    }
  });
});
