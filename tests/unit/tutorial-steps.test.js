import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tutorialStepCopy, beatCaption } from "../../src/ui/tutorial-ui.js";
import { TUTORIAL_SANDBOX_STEP } from "../../src/constants.js";
import { PROLOGUE_STEPS, PROLOGUE_BEATS, PROLOGUE_TRIALS, PROLOGUE_ODDITIES, RELOAD_CREDIT, gradeTrial, lineDuration, trialStart } from "../../src/data/prologue.js";

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
    expect(beatCaption(3)).toBe(`PROLOGUE · 4/${PROLOGUE_BEATS.length} · TRIAL · WEAPONS`);
    for (const card of desktop.filter(Boolean)) expect(beatCaption(card.beat)).toMatch(/^PROLOGUE · \d+\/\d+ · /);
  });

  it("is told by ARIA, the Supervisor and R&D, in lines short enough to say", () => {
    const oddities = PROLOGUE_ODDITIES.flatMap((o) => [...(o.lines || []), ...(o.away || [])]);
    for (const lines of [...PROLOGUE_STEPS.map((s) => [...(s.lines || []), ...(s.brief || [])]), oddities]) {
      for (const [speaker, text, emotion] of lines) {
        expect(["ARIA", "SUPERVISOR", "OFFICER", "LT. RASCZAK", "SGT. KAEL", "PA", "DR. ORR", "LIN", "VALE"]).toContain(speaker);
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

  it("builds the morning toward the breach a trial at a time, not on a timer", () => {
    // One oddity for each trial before the last; the last trial's is 06:47.
    expect(PROLOGUE_ODDITIES).toHaveLength(PROLOGUE_TRIALS.length - 1);
    for (const o of PROLOGUE_ODDITIES) expect(o.pa || o.lines || o.repeat).toBeTruthy();
    // The trials themselves keep no timed oddities.
    for (const s of PROLOGUE_STEPS.filter((d) => d.trial)) expect(s.events ?? []).toEqual([]);
    const events = PROLOGUE_STEPS.flatMap((s) => (s.events || []).map((e) => [s.id, ...e]));
    for (const [id, at, kind, text] of events) {
      expect(["pa", "flicker", "tremor"], id).toContain(kind);
      expect(at).toBeGreaterThanOrEqual(0);
      if (kind === "pa") expect(text.length).toBeGreaterThan(10);
    }
  });

  it("teaches what the old tutorial never did", () => {
    const ids = PROLOGUE_STEPS.map((s) => s.id);
    for (const id of ["breaker", "sprint", "slide", "tunnel", "dash", "chrono", "cover", "shield", "shotgun", "moving", "vents", "calibrate"]) {
      expect(ids).toContain(id);
    }
  });
});

describe("certification day", () => {
  const ids = PROLOGUE_STEPS.map((s) => s.id);
  const at = (id) => ids.indexOf(id);

  it("calibrates the suit first, hands out the sheet, and signs it off before 06:47", () => {
    // Calibration is the first trial, from the range to R&D, before the sheet.
    expect(PROLOGUE_TRIALS[0].id).toBe("calibration");
    expect(at("toRange")).toBeLessThan(trialStart("calibration"));
    expect(trialStart("calibration")).toBeLessThan(at("certify"));
    for (const tr of PROLOGUE_TRIALS.slice(1)) {
      expect(trialStart(tr.id), tr.id).toBeGreaterThan(at("certify"));
      expect(trialStart(tr.id), tr.id).toBeLessThan(at("signOff"));
    }
    expect(at("signOff")).toBeLessThan(at("sixFortySeven"));
    // After the minute, the Supervisor to his armour and back, then down.
    expect(at("sixFortySeven")).toBeLessThan(at("escort"));
    expect(at("escort")).toBeLessThan(at("kitUp"));
    expect(at("kitUp")).toBeLessThan(at("escortBack"));
    expect(at("escortBack")).toBeLessThan(at("alarm"));
  });

  it("has each trial run in person by the one who owns it", () => {
    for (const tr of PROLOGUE_TRIALS) expect(["DR. ORR", "SUPERVISOR", "VALE", "LIN"], tr.id).toContain(tr.lead);
    // The trial's first step has its lead speaking (Lin briefs from the hub, before the sim starts).
    for (const tr of PROLOGUE_TRIALS.filter((d) => d.id !== "combat")) {
      const first = PROLOGUE_STEPS[trialStart(tr.id)];
      expect(first.lines.some(([who]) => who === tr.lead), tr.id).toBe(true);
    }
  });

  it("keeps each trial's steps together, in its own beat", () => {
    for (const tr of PROLOGUE_TRIALS) {
      const steps = PROLOGUE_STEPS.map((s, i) => [s, i]).filter(([s]) => s.trial === tr.id);
      expect(steps.length, tr.id).toBeGreaterThan(0);
      const first = steps[0][1];
      steps.forEach(([s, i], k) => {
        expect(i).toBe(first + k);
        expect(s.beat).toBe(steps[0][0].beat);
      });
      // A trial's first step is its beat's checkpoint: dying puts you back at its start.
      expect(PROLOGUE_STEPS.findIndex((s) => s.beat === steps[0][0].beat)).toBe(first);
    }
  });

  it("leaves hooks for the reload drill and the cover lesson", () => {
    for (const [id, trial] of [["reloadDrill", "weapons"], ["coverDrill", "combat"]]) {
      const s = PROLOGUE_STEPS[at(id)];
      expect(s?.trial).toBe(trial);
    }
    expect(at("reloadDrill")).toBeGreaterThan(at("shotgun"));
    expect(at("coverDrill")).toBeLessThan(at("sim"));
  });

  it("grades a trial on its time and its aim", () => {
    const weapons = PROLOGUE_TRIALS.find((tr) => tr.id === "weapons");
    expect(gradeTrial(weapons, weapons.par * 0.7, 0.7)).toBe("S");
    expect(gradeTrial(weapons, weapons.par, 0.7)).toBe("A");
    expect(gradeTrial(weapons, weapons.par * 1.2, 0.7)).toBe("B");
    expect(gradeTrial(weapons, weapons.par * 2, 0.7)).toBe("C");
    // Aim moves it a grade either way.
    expect(gradeTrial(weapons, weapons.par * 1.2, 0.9)).toBe("A");
    expect(gradeTrial(weapons, weapons.par, 0.3)).toBe("B");
    expect(gradeTrial(PROLOGUE_TRIALS.find((tr) => tr.id === "calibration"), 30, null)).toBe("PASS");
  });

  it("counts the active reloads landed on the range toward the weapons grade, and only there", () => {
    const weapons = PROLOGUE_TRIALS.find((tr) => tr.id === "weapons");
    const combat = PROLOGUE_TRIALS.find((tr) => tr.id === "combat");
    // Just over par: a B, unless the reloads buy the seconds back.
    const t = weapons.par + RELOAD_CREDIT;
    expect(gradeTrial(weapons, t, 0.7)).toBe("B");
    expect(gradeTrial(weapons, t, 0.7, { reloads: 1 })).toBe("A");
    expect(gradeTrial(combat, combat.par + RELOAD_CREDIT, 0.7, { reloads: 1 })).toBe("B");
  });
});
