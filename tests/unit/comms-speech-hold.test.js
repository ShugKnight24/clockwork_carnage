import { describe, it, expect } from "vitest";
import { AriaCommsSystem } from "../../src/systems/aria-comms.js";

// A voice that runs as long as the test says: speak() hands back a handle,
// isSpeaking() reads it.
const fakeGame = () => {
  const audio = {
    talking: true,
    speak: () => ({ id: 1 }),
    isSpeaking: () => audio.talking,
  };
  return { audio, character: { name: "Agent" } };
};

const run = (comms, seconds) => {
  for (let t = 0; t < seconds; t += 0.1) comms.update(0.1, true);
};

describe("a comms line and its voice", () => {
  it("stays up until the voice finishes, so the next line cannot cut it off", () => {
    const g = fakeGame();
    const comms = new AriaCommsSystem(g);
    comms.enabled = true;
    comms.queueLine({ text: "A long line the voice takes its time over.", duration: 3 });
    comms.queueLine({ text: "The next line.", duration: 3 });
    run(comms, 4); // past its reading time, still talking
    expect(comms.message?.text).toMatch(/^A long line/);
    g.audio.talking = false;
    run(comms, 1);
    expect(comms.message?.text).toBe("The next line.");
  });

  it("gives up waiting on a voice that never reports its end", () => {
    const g = fakeGame();
    const comms = new AriaCommsSystem(g);
    comms.enabled = true;
    comms.queueLine({ text: "Stuck voice.", duration: 3 });
    run(comms, 3 + 8 + 1);
    expect(comms.message).toBeNull();
  });
});
