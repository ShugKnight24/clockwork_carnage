import { describe, it, expect, vi } from "vitest";
import { AriaCommsSystem } from "../../src/systems/aria-comms.js";
import { AudioManager } from "../../js/audio.js";

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

describe("unvoiced dialogue (Spoken Dialogue off, the default)", () => {
  const unvoiced = () => {
    const a = new AudioManager();
    a.ctx = { currentTime: 0 };
    a._voice = { play: vi.fn(() => ({ endTime: 5, stop() {} })) };
    a.commsBlip = vi.fn();
    return a;
  };

  it("says nothing, blips on comms, and hands back no handle to wait on", () => {
    const a = unvoiced();
    expect(a.voicesOn).toBe(false);
    expect(a.speak("Hello.", "aria", { channel: "comms" })).toBeNull();
    expect(a.speak("Hello.", "aria", { channel: "cutscene" })).toBeNull();
    expect(a._voice.play).not.toHaveBeenCalled();
    expect(a.commsBlip).toHaveBeenCalledOnce();
    expect(a.isSpeaking(null)).toBe(false);
    a.voicesOn = true;
    expect(a.speak("Hello.", "aria", { channel: "comms" })).not.toBeNull();
  });

  it("lets a comms line go on its reading time", () => {
    const a = unvoiced();
    const comms = new AriaCommsSystem({ audio: a, character: { name: "Agent" } });
    comms.enabled = true;
    comms.queueLine({ text: "A line nobody voices.", duration: 3 });
    comms.queueLine({ text: "The next line.", duration: 3 });
    run(comms, 3.5);
    expect(comms.message?.text).toBe("The next line.");
  });
});
