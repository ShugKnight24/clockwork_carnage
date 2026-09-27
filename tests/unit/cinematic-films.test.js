import { describe, it, expect, vi } from "vitest";
import { FILMS, LORE_SEEN_KEY, playLoreThen, filmById } from "../../src/cinematic/films.js";
import { SCENES } from "../../src/cinematic/director.js";
import { CAMPAIGN_LORE } from "../../src/cinematic/reels/campaign-lore.js";
import { SIZZLE } from "../../src/cinematic/reels/sizzle.js";
import { handAngles } from "../../src/cinematic/scenes/lore.js";

function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), has: (k) => m.has(k) };
}

describe("films", () => {
  it("lists the trailer and the lore video for the Archive", () => {
    expect(FILMS.map((f) => f.title)).toEqual(["Trailer", "Chrono-Corp: Origins"]);
    expect(filmById("sizzle").reel).toBe(SIZZLE);
    expect(filmById("lore").reel).toBe(CAMPAIGN_LORE);
  });

  it("registers every scene kind the lore video uses", () => {
    for (const s of CAMPAIGN_LORE.shots) expect(SCENES[s.scene.kind], s.scene.kind).toBeTruthy();
  });
});

describe("playLoreThen", () => {
  it("plays the lore video once, handing off to the campaign as it ends", async () => {
    const storage = memoryStorage();
    const play = vi.fn(() => Promise.resolve());
    const next = vi.fn();
    const game = {};
    playLoreThen(game, next, { play, storage });
    expect(play).toHaveBeenCalledTimes(1);
    const [g, reel, opts] = play.mock.calls[0];
    expect(g).toBe(game);
    expect(reel).toBe(CAMPAIGN_LORE);
    expect(opts.returnTo).toBe("campaign");
    expect(next).not.toHaveBeenCalled();
    opts.onEnd({ skipped: false });
    expect(storage.getItem(LORE_SEEN_KEY)).toBe("1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("marks it seen when skipped too", () => {
    const storage = memoryStorage();
    const play = vi.fn(() => Promise.resolve());
    const next = vi.fn();
    playLoreThen({}, next, { play, storage });
    play.mock.calls[0][2].onEnd({ skipped: true });
    expect(storage.getItem(LORE_SEEN_KEY)).toBe("1");
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("goes straight on once it has been seen", () => {
    const storage = memoryStorage({ [LORE_SEEN_KEY]: "1" });
    const play = vi.fn();
    const next = vi.fn();
    playLoreThen({}, next, { play, storage });
    expect(play).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("goes straight on, once, if the reel fails after it starts", async () => {
    const next = vi.fn();
    playLoreThen({}, next, { play: () => Promise.reject(new Error("lost")), storage: memoryStorage() });
    await new Promise((r) => setTimeout(r, 0));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("goes straight on if the reel cannot start", () => {
    const next = vi.fn();
    playLoreThen({}, next, { play: () => { throw new Error("no"); }, storage: memoryStorage() });
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("the lore clock", () => {
  it("spins its hands fast, slows, and lands both on twelve", () => {
    const land = 3;
    const early = handAngles(0.3, land);
    const late = handAngles(land - 0.3, land);
    const speed = (t) => handAngles(t + 0.01, land).minute - handAngles(t, land).minute;
    expect(speed(0.2)).toBeGreaterThan(speed(land - 0.3) * 4);
    expect(early.minute).toBeLessThan(late.minute);
    const at = handAngles(land, land);
    const TAU = Math.PI * 2;
    expect(Math.abs(Math.sin(at.minute / 2))).toBeLessThan(1e-9); // a whole number of turns
    expect(Math.abs(Math.sin(at.hour / 2))).toBeLessThan(1e-9);
    expect(handAngles(land + 2, land)).toEqual(at);
    expect(at.minute / TAU).toBeGreaterThan(4);
  });
});
