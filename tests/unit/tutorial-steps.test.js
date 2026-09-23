import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tutorialStepCopy } from "../../src/ui/tutorial-ui.js";
import { TUTORIAL_SANDBOX_STEP } from "../../src/constants.js";

const desktop = tutorialStepCopy(false);
const mobile = tutorialStepCopy(true);
const cardSteps = desktop.map((_, i) => i).filter((i) => i > 0);

const systemSource = readFileSync(
  fileURLToPath(new URL("../../js/tutorial-system.js", import.meta.url)),
  "utf8",
);

/** Step indices the progression switch in TutorialSystem.update() handles. */
function handledSteps(src) {
  const body = src.slice(src.indexOf("switch (this.step)"));
  const steps = new Set();
  for (const m of body.matchAll(/^\s{6}case (\d+|TUTORIAL_SANDBOX_STEP):/gm)) {
    steps.add(m[1] === "TUTORIAL_SANDBOX_STEP" ? TUTORIAL_SANDBOX_STEP : Number(m[1]));
  }
  return [...steps].sort((a, b) => a - b);
}

describe("tutorial step numbering", () => {
  it("leaves step 0 without a card — it is the HUD boot animation", () => {
    expect(desktop[0]).toBeNull();
  });

  it("puts the sandbox exactly one step past the last card", () => {
    expect(desktop.length).toBe(TUTORIAL_SANDBOX_STEP);
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
    for (const step of mobile.slice(1)) {
      expect(step.hint).not.toMatch(keyboardVerbs);
    }
  });

  it("is covered end to end by the progression switch", () => {
    const handled = handledSteps(systemSource);
    const expected = Array.from({ length: TUTORIAL_SANDBOX_STEP + 1 }, (_, i) => i);
    expect(handled).toEqual(expected);
  });
});
