import { describe, it, expect } from "vitest";
import { AriaCommsSystem } from "../../src/systems/aria-comms.js";

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
