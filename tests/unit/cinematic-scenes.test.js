// tests/unit/cinematic-scenes.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { playReel, stopReel, stepFixed, registerScene } from "../../src/cinematic/director.js";
import { ChronoPowers } from "../../src/systems/chrono-powers.js";
import { getArtStyle, setArtStyle, onArtStyleChange, ART_LEGACY, ART_MODERN, ART_REALISTIC } from "../../src/rendering/art-style.js";
import { planBuild, placedAt } from "../../src/cinematic/scenes/forge.js";
import { creator, looksFor, LOOKS } from "../../src/cinematic/scenes/creator.js";
import { brandFolder } from "../../src/cinematic/brand.js";
import { END_CARD } from "../../src/cinematic/scenes/title.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";

/** The parts of js/game.js a Meltdown shot's fight reaches (see cinematic-events.test.js). */
class FakeGame {
  constructor() {
    Object.assign(this, {
      state: "title", timeScale: 1, slowMoTimer: 0, time: 0, deltaTime: 1 / 60,
      map: { name: "old" }, world: null, entities: [], projectiles: [], exitEntity: null, dustMotes: null,
      mode: null, tracers: [], lights: [], damageNumbers: [], bossNameCard: null, objectiveWaypoint: null,
      screenShake: 0, glitchEffect: 0, _hudDisabledUntil: 0,
      meltdown: { real: true, heat: 0 },
      _meltdownUpgradeChoices: null, _meltdownUpgradeSel: 0,
      player: { x: 1, y: 2, angle: 3, chronoActive: false, health: 100, chronoEnergy: 50, maxChronoEnergy: 100, alive: true },
      settings: { fov: 75, artStyle: ART_MODERN }, quality: { particleMultiplier: 1 },
      renderer: { applyActPalette: vi.fn(), prewarmEnv: vi.fn(), width: 320, height: 200 },
      audio: { stopMusic: vi.fn(), startTrack: vi.fn(), setTimeScale: vi.fn(), musicSting: vi.fn() },
      achievementStats: { totalShotsFired: 3, totalKills: 2, totalGamesPlayed: 4, weaponKills: { 0: 2 } },
      chronoPowers: new ChronoPowers(),
      character: { ...structuredClone({ ...DEFAULT_CHARACTER }), name: "Vex", colorIndex: 5 },
      saveSettings: vi.fn(),
    });
  }
  getDifficultyMultipliers() {
    return { healthMul: 1, speedMul: 1, damageMul: 1 };
  }
}

const reelOf = (scene, events = [], len = 12) => ({
  id: "scenes", bpm: 120, bars: len / 4, music: [], narration: [], captions: [],
  shots: [{ id: "a", at: 0, len, scene, events }],
});
const steps = async (g, n) => {
  for (let i = 0; i < n; i++) await stepFixed(g);
};
/** Every own field of the game, by identity for objects (the shot must put the very same ones back). */
const fields = (g) => new Map(Object.keys(g).map((k) => [k, g[k]]));
function expectSameFields(g, before) {
  expect([...Object.keys(g)].sort()).toEqual([...before.keys()].sort());
  // `time` is the sim clock, which the game advances in every state.
  for (const [k, v] of before) if (k !== "time") expect(g[k], k).toBe(v);
}

let storage;
beforeEach(() => {
  storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
  vi.stubGlobal("localStorage", storage);
});
afterEach(() => vi.unstubAllGlobals());

describe("meltdown shots", () => {
  it("show the upgrade cards on the beat, then run the corridor, and put every field back", async () => {
    const g = new FakeGame();
    const before = fields(g);
    const stats = structuredClone(g.achievementStats);
    const done = playReel(g, reelOf({ kind: "meltdown", pickBeats: 4, pick: 2 }, [{ at: 5, type: "spawn", enemy: "drone", count: 3 }]), { returnTo: "title", clock: "fixed" });
    await steps(g, 36); // beat 1.2: the highlight is on the second card
    expect(g.meltdown).not.toBe(before.get("meltdown"));
    expect(g.map.name).toBe("Reactor Run");
    expect(g._meltdownUpgradeChoices).toHaveLength(3);
    expect(g._meltdownUpgradeSel).toBe(1);
    const y0 = g.player.y;
    await steps(g, 60); // beat 3.2: it settles on the pick, the run still waiting
    expect(g._meltdownUpgradeSel).toBe(2);
    expect(g.player.y).toBe(y0);
    await steps(g, 60); // beat 5.2: the run is on, the swarm in
    expect(g._meltdownUpgradeChoices).toBeNull();
    expect(g.player.y).toBeGreaterThan(y0);
    expect(g.meltdown.heat).toBeGreaterThan(20);
    expect(g.entities.filter((e) => e.type === "enemy").length).toBeGreaterThanOrEqual(3);
    stopReel(g, { skipped: true });
    await done;
    expectSameFields(g, before);
    expect(g.achievementStats).toEqual(stats);
    // No run record, best score or stat: nothing written at all.
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("the same shot runs the same corridor and cards every time", async () => {
    const seen = [];
    for (let i = 0; i < 2; i++) {
      const g = new FakeGame();
      const done = playReel(g, reelOf({ kind: "meltdown" }), { returnTo: "title", clock: "fixed" });
      await steps(g, 10);
      seen.push(JSON.stringify([g.map.grid, g._meltdownUpgradeChoices.map((c) => c.id)]));
      stopReel(g);
      await done;
    }
    expect(seen[0]).toBe(seen[1]);
  });
});

describe("forge shots", () => {
  it("borrow no game field (and, with no WebGL2, stay dark rather than fail)", async () => {
    const g = new FakeGame();
    const before = fields(g);
    const done = playReel(g, reelOf({ kind: "forge", build: "tower" }), { returnTo: "title", clock: "fixed" });
    await steps(g, 30);
    stopReel(g);
    await done;
    expectSameFields(g, before);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("plan a tower that rises layer by layer on a founded, cleared site", () => {
    const world = generateWorld({ terrain: true, seed: 20260924, act: 1 });
    const plan = planBuild(world, "tower");
    expect(plan.placements.length).toBeGreaterThan(400);
    const zs = plan.placements.map((p) => p[2]);
    expect(zs).toEqual([...zs].sort((a, b) => a - b));
    expect(zs[0]).toBe(plan.base);
    // Nothing is placed yet, and nothing stands under the first layer but ground.
    for (const [x, y, z] of plan.placements.slice(0, 24)) {
      expect(world.get(x, y, z)).toBe(0);
      expect(world.get(x, y, z - 1)).not.toBe(0);
    }
  });

  it("plan a bridge whose piers stand before its deck", () => {
    const world = generateWorld({ terrain: true, seed: 20260924, act: 1 });
    const plan = planBuild(world, "bridge");
    const firstPlank = plan.placements.findIndex((p) => p[3] === 22);
    const lastPier = plan.placements.findLastIndex((p, i) => i < firstPlank && p[3] === 20);
    expect(firstPlank).toBeGreaterThan(0);
    expect(lastPier).toBe(firstPlank - 1);
  });

  it("release each beat's blocks in the first half of the beat, all of them by the end", () => {
    const plan = { placements: new Array(100).fill(0) };
    expect(placedAt(plan, 0, 10)).toBe(0);
    expect(placedAt(plan, 0.5, 10)).toBe(10);
    expect(placedAt(plan, 0.9, 10)).toBe(10);
    expect(placedAt(plan, 1.25, 10)).toBe(15);
    expect(placedAt(plan, 10, 10)).toBe(100);
    expect(placedAt(plan, 99, 10)).toBe(100);
    let prev = 0;
    for (let b = 0; b <= 12; b += 0.05) {
      const n = placedAt(plan, b, 10);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});

describe("creator shots", () => {
  const ctxFor = (handle) => ({ handle, reel: { bpm: 120 }, live: () => true });

  it("dress a copy of the player's agent and cycle looks on events", async () => {
    const g = new FakeGame();
    const own = structuredClone(g.character);
    const handle = {};
    await creator.build(g, { looks: "curated", view: "full" }, Math.random, ctxFor(handle));
    const st = handle.creator;
    expect(st.looks).toHaveLength(1 + LOOKS.length);
    expect(st.looks[0]).toEqual(own);
    expect(st.looks[0]).not.toBe(g.character);
    expect(st.looks[1].name).toBe("Vex"); // a look is a suit, not a new agent
    expect(st.looks[1].helmetIndex).toBe(LOOKS[0].helmetIndex);
    creator.event(g, { type: "look" }, handle);
    expect(st.index).toBe(1);
    creator.event(g, { type: "look", index: 3 }, handle);
    expect(st.index).toBe(3);
    creator.event(g, { type: "look" }, handle);
    expect(st.index).toBe(0);
    creator.event(g, { type: "visor", at: 4, len: 2 }, handle);
    expect(st.visorAt).toBe(2);
    expect(st.visorLen).toBe(1);
    // Editing a shot's look never reaches the player's.
    st.looks[2].colorIndex = 7;
    creator.teardown(g, handle);
    expect(g.character).toEqual(own);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("show the default agent when the player has none (Review Focus 5)", () => {
    const [look] = looksFor(undefined, {});
    expect(look).toEqual({ ...DEFAULT_CHARACTER });
    expect(look).not.toBe(DEFAULT_CHARACTER);
  });
});

describe("title shots", () => {
  it("wear the art profile's logotype finish", () => {
    expect(brandFolder("legacy")).toBe("legacy");
    expect(brandFolder("modern")).toBe("comic"); // the style players call Comic
    expect(brandFolder("realistic")).toBe("modern"); // the style players call Modern
    expect(END_CARD).toEqual(["Play free in your browser", "shugknight24.github.io/clockwork_carnage", "Keyboard · Mouse · Controller"]);
  });
});

describe("artStyle events", () => {
  registerScene("still", { build() {}, update() {}, event() {}, teardown() {} });
  const flipReel = {
    id: "flip", bpm: 120, bars: 4, music: [], narration: [], captions: [],
    shots: [
      { id: "a", at: 0, len: 8, scene: { kind: "still" }, events: [{ at: 1, type: "artStyle", style: ART_LEGACY }, { at: 3, type: "artStyle", style: ART_REALISTIC }] },
      { id: "b", at: 8, len: 8, scene: { kind: "still" }, events: [{ at: 2, type: "artStyle", style: ART_LEGACY }] },
    ],
  };

  /** js/game.js's listener: saves any style change as the player's setting, unless a reel's flip. */
  function gameListener(g) {
    return onArtStyleChange((style) => {
      if (g._reelArtStyle) return;
      if (g.settings.artStyle === style) return;
      g.settings.artStyle = style;
      g.saveSettings();
    });
  }

  it("switch the style for the rest of the shot, save nothing, and put the player's back at the cut", async () => {
    setArtStyle(ART_MODERN);
    const g = new FakeGame();
    const off = gameListener(g);
    const seen = [];
    const done = playReel(g, flipReel, { returnTo: "title", clock: "fixed" });
    // 8 s of reel, and the step that ends it.
    for (let i = 0; i < 481; i++) {
      await stepFixed(g);
      if (i % 15 === 0) seen.push(getArtStyle());
    }
    await done;
    off();
    expect(seen).toContain(ART_LEGACY);
    expect(seen).toContain(ART_REALISTIC);
    // Shot a ends in its last flip (3.75 s); shot b opens in the player's style (4.25 s).
    expect(seen[15]).toBe(ART_REALISTIC);
    expect(seen[17]).toBe(ART_MODERN);
    expect(getArtStyle()).toBe(ART_MODERN);
    expect(g.settings.artStyle).toBe(ART_MODERN);
    expect(g.saveSettings).not.toHaveBeenCalled();
    expect(Object.hasOwn(g, "_reelArtStyle")).toBe(false);
  });

  it("put the player's style back when the reel is skipped mid-flip", async () => {
    setArtStyle(ART_REALISTIC);
    const g = new FakeGame();
    g.settings.artStyle = ART_REALISTIC;
    const off = gameListener(g);
    const done = playReel(g, flipReel, { returnTo: "title", clock: "fixed" });
    await steps(g, 40);
    expect(getArtStyle()).toBe(ART_LEGACY);
    stopReel(g, { skipped: true });
    await done;
    off();
    expect(getArtStyle()).toBe(ART_REALISTIC);
    expect(g.saveSettings).not.toHaveBeenCalled();
    setArtStyle(ART_MODERN);
  });
});
