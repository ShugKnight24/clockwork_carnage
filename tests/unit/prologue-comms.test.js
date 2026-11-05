import { describe, it, expect } from "vitest";
import { AriaCommsSystem } from "../../src/systems/aria-comms.js";
import { TutorialSystem } from "../../js/tutorial-system.js";
import { SKIP_LINES } from "../../src/data/prologue.js";

// The prologue scripts every line ARIA says; her stock chatter only got in
// the way of it (and held up the instructions queued behind).
describe("ARIA's stock chatter in the prologue", () => {
  it("stays quiet in the prologue, but its script still plays", () => {
    const comms = new AriaCommsSystem({ mode: "tutorial" });
    comms.enabled = true;
    comms.queueMessage("killStreak");
    comms.queueMessage("idle");
    expect(comms.queue).toHaveLength(0);
    comms.queueLine({ speaker: "DR. ORR", text: "Walk with me." });
    expect(comms.queue.map((m) => m.text)).toEqual(["Walk with me."]);
  });

  it("still talks everywhere else", () => {
    const comms = new AriaCommsSystem({ mode: "campaign" });
    comms.enabled = true;
    comms.queueMessage("idle");
    expect(comms.queue.length).toBeGreaterThan(0);
  });
});

// The prologue's own line queue (js/tutorial-system.js say / _updateScript).

function rig() {
  const comms = new AriaCommsSystem({ mode: "tutorial" });
  comms.enabled = true;
  const game = { ariaComms: comms, audio: { stopSpeech() {} }, player: { x: 46, y: 42 }, keys: {}, deltaTime: 1 / 60 };
  const t = new TutorialSystem(game);
  t.step = 5;
  /** One frame: the tutorial picks its next line, the comms put it up. */
  const tick = (dt = 1 / 60) => {
    game.deltaTime = dt;
    t.runClock += dt;
    t._updateSkip(dt);
    t._updateScript(dt);
    comms.update(dt, true);
  };
  const said = () => comms.message?.text ?? null;
  return { t, game, comms, tick, said };
}

describe("skipping the prologue's lines", () => {
  const lines = [["ARIA", "One."], ["ARIA", "Two."], ["ARIA", "Three."]];

  it("skips the line being said, and the next comes on", () => {
    const { t, tick, said } = rig();
    t.say(lines);
    tick();
    expect(said()).toBe("One.");
    expect(t.canSkip()).toBe(true);
    expect(t.skipLine()).toBe(true);
    expect(said()).toBeNull();
    for (let i = 0; i < 30; i++) tick();
    expect(said()).toBe("Two.");
  });

  it("skips everything queued on a double press", () => {
    const { t, tick, said } = rig();
    t.say(lines);
    tick();
    t.skipLine();
    tick(0.1);
    t.skipLine();
    expect(t.script).toHaveLength(0);
    for (let i = 0; i < 60; i++) tick();
    expect(said()).toBeNull();
    expect(t.scriptIdle()).toBe(true);
  });

  it("takes the keyboard key: a press skips one, a hold skips the lot", () => {
    const { t, game, tick, said } = rig();
    t.say(lines);
    tick();
    game.keys[SKIP_LINES.key] = true;
    tick();
    expect(t.script.map((q) => q.line[1])).toEqual(["Two.", "Three."]);
    tick(SKIP_LINES.hold);
    expect(t.script).toHaveLength(0);
    game.keys[SKIP_LINES.key] = false;
    for (let i = 0; i < 60; i++) tick();
    expect(said()).toBeNull();
  });

  it("keeps a line that says what to do next", () => {
    const { t } = rig();
    t.say([["ARIA", "Story."], ["ARIA", "Do this.", "calm", { need: true }]]);
    t.flushLines();
    expect(t.script.map((q) => q.line[1])).toEqual(["Do this."]);
  });

  it("does nothing with no line up", () => {
    const { t } = rig();
    expect(t.skipLine()).toBe(false);
  });
});

describe("a reply waits for what it answers", () => {
  // Outrun Orr up to R&D: her lines wait for her, and so must ARIA's answer.
  const walk = [
    ["SUPERVISOR", "Orr tunes it."],
    ["DR. ORR", "You were the best match."],
    ["ARIA", "She's not exaggerating."],
  ];

  it("holds ARIA's line while Orr is out of earshot", () => {
    const { t, game, tick, said } = rig();
    t.people.orr = { active: true, x: 46, y: 30 };
    game.player.x = 70; // in the R&D bay, Orr still in the corridor
    game.player.y = 8;
    t.say(walk);
    tick();
    expect(said()).toBe("Orr tunes it.");
    t.skipLine();
    for (let i = 0; i < 60; i++) tick();
    expect(said()).toBeNull();
    expect(t.scriptIdle()).toBe(true);
    // She catches up: her line, then the answer.
    t.people.orr.x = 68;
    t.people.orr.y = 9;
    tick();
    expect(said()).toBe("You were the best match.");
    t.skipLine();
    for (let i = 0; i < 30; i++) tick();
    expect(said()).toBe("She's not exaggerating.");
  });

  it("lets other exchanges go on meanwhile", () => {
    const { t, game, tick, said } = rig();
    t.people.orr = { active: true, x: 46, y: 30 };
    game.player.x = 70;
    game.player.y = 8;
    t.say([["DR. ORR", "Over here."]]);
    t.say([["ARIA", "Somebody's calling."]]);
    tick();
    expect(said()).toBe("Somebody's calling.");
  });
});
