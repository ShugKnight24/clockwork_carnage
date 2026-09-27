import { describe, it, expect, vi, afterEach } from "vitest";
import { createAttract, attractFrameCap, titleBusy, ATTRACT_IDLE_MS, ATTRACT_FPS } from "../../src/cinematic/attract.js";
import { playReel, stopReel } from "../../src/cinematic/director.js";
import { AudioManager } from "../../js/audio.js";

function fakeDoc({ consent = null, toast = null, titleHidden = false, visibility = "visible" } = {}) {
  const els = {
    titleScreen: { classList: { contains: (c) => c === "hidden" && titleHidden, remove() {} } },
  };
  if (consent) els["cc-analytics-modal"] = consent;
  return {
    visibilityState: visibility,
    getElementById: (id) => els[id] ?? null,
    querySelector: (sel) => (sel === "unlock-toast" ? toast : null),
  };
}

describe("attract idle timer", () => {
  const game = () => ({ state: "title" });

  it("starts after 25 s of idle on the plain title", () => {
    let now = 0;
    const start = vi.fn();
    const a = createAttract(game(), { now: () => now, busy: () => null, start });
    now = ATTRACT_IDLE_MS - 1;
    a.tick();
    expect(start).not.toHaveBeenCalled();
    now = ATTRACT_IDLE_MS + 1;
    a.tick();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("any input restarts the count", () => {
    let now = 0;
    const start = vi.fn();
    const a = createAttract(game(), { now: () => now, busy: () => null, start });
    now = 20000;
    a.poke();
    now = 30000;
    a.tick();
    expect(start).not.toHaveBeenCalled();
    now = 45001;
    a.tick();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("only counts while nothing else owns the screen", () => {
    let now = 0;
    let busy = "consent";
    const start = vi.fn();
    const a = createAttract(game(), { now: () => now, busy: () => busy, start });
    now = 60000;
    a.tick();
    expect(start).not.toHaveBeenCalled();
    busy = null; // the card was answered: the count starts from here
    now = 61000;
    a.tick();
    expect(start).not.toHaveBeenCalled();
    now = 60000 + ATTRACT_IDLE_MS + 1;
    a.tick();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("a pad in use counts as input", () => {
    let now = 0;
    const g = game();
    const start = vi.fn();
    const a = createAttract(g, { now: () => now, busy: () => null, start });
    g.lastPadInputAt = 20000;
    now = 30000;
    a.tick();
    expect(start).not.toHaveBeenCalled();
  });

  it("restarts the count once a reel is over", () => {
    let now = 0;
    const g = game();
    const start = vi.fn();
    const a = createAttract(g, { now: () => now, busy: () => null, start });
    g._cinematic = {};
    now = 80000;
    a.tick();
    delete g._cinematic;
    now = 81000;
    a.tick();
    expect(start).not.toHaveBeenCalled();
  });
});

describe("titleBusy", () => {
  it("is free on the plain, visible title", () => {
    expect(titleBusy({ state: "title" }, fakeDoc())).toBeNull();
  });
  it("names whatever owns the screen", () => {
    expect(titleBusy({ state: "modeSelect" }, fakeDoc())).toBe("state");
    expect(titleBusy({ state: "title" }, fakeDoc({ titleHidden: true }))).toBe("title-hidden");
    expect(titleBusy({ state: "title" }, fakeDoc({ visibility: "hidden" }))).toBe("hidden");
    expect(titleBusy({ state: "title" }, fakeDoc({ consent: { isConnected: true, style: { display: "flex" } } }))).toBe("consent");
    expect(titleBusy({ state: "title" }, fakeDoc({ toast: { busy: true } }))).toBe("toast");
    expect(titleBusy({ state: "title" }, fakeDoc(), { deckLoading: () => true })).toBe("preloading");
    expect(titleBusy({ state: "title", transitioning: true }, fakeDoc())).toBe("transition");
  });
  it("ignores a consent card that is hidden or gone", () => {
    expect(titleBusy({ state: "title" }, fakeDoc({ consent: { isConnected: true, style: { display: "none" } } }))).toBeNull();
    expect(titleBusy({ state: "title" }, fakeDoc({ consent: { isConnected: false, style: { display: "flex" } } }))).toBeNull();
  });
});

describe("attract frame cap", () => {
  it("caps the attract loop at 30 fps and leaves every other reel alone", () => {
    expect(attractFrameCap({ _cinematic: { returnTo: "title" } }, 0)).toBe(ATTRACT_FPS);
    expect(attractFrameCap({ _cinematic: { returnTo: "title" } }, 120)).toBe(ATTRACT_FPS);
    expect(attractFrameCap({ _cinematic: { returnTo: "menu" } }, 0)).toBe(0);
    expect(attractFrameCap({}, 60)).toBe(60);
  });
});

describe("audio mute and beat subscription", () => {
  it("setMuted works before audio is initialised and zeroes the master once it is", () => {
    const a = new AudioManager();
    expect(() => a.setMuted(true)).not.toThrow();
    expect(a._masterTarget()).toBe(0);
    a.setMuted(false);
    expect(a._masterTarget()).toBeGreaterThan(0);
  });

  it("onBeat hears every dispatched beat until unsubscribed", () => {
    const a = new AudioManager();
    a._beatCampaign = () => {};
    const heard = [];
    const off = a.onBeat((track, beat) => heard.push([track, beat]));
    a._dispatchBeat("campaign", 3, 0.5);
    off();
    a._dispatchBeat("campaign", 4, 0.5);
    expect(heard).toEqual([["campaign", 3]]);
  });
});

describe("the consent card during a reel", () => {
  const origDoc = globalThis.document;
  afterEach(() => {
    globalThis.document = origDoc;
  });

  it("is hidden while a reel plays and comes back as it was", async () => {
    const card = { style: { display: "flex" } };
    globalThis.document = {
      hidden: false,
      activeElement: null,
      getElementById: (id) => (id === "cc-analytics-modal" ? card : null),
      addEventListener() {},
      removeEventListener() {},
    };
    const g = { state: "modeSelect", timeScale: 1, player: {}, audio: null };
    const reel = { id: "c", bpm: 120, bars: 1, music: [], narration: [], captions: [], shots: [{ id: "a", at: 0, len: 4, scene: { kind: "none" } }] };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const done = playReel(g, reel, { returnTo: "menu" });
    expect(card.style.display).toBe("none");
    stopReel(g);
    await done;
    expect(card.style.display).toBe("flex");
  });
});
