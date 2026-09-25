// tests/unit/cinematic-director.test.js
import { describe, it, expect, vi } from "vitest";
import { playReel, stopReel, updateDirector, directorInput, directorState, registerScene, stepFixed } from "../../src/cinematic/director.js";
import { SHOWCASE_FIELDS } from "../../src/systems/showcase.js";

function fakeGame() {
  return { state: "title", timeScale: 1, player: { chronoActive: false }, audio: { startTrack: vi.fn(), stopMusic: vi.fn(), musicSting: vi.fn(), speak: vi.fn(), setMuted: vi.fn() } };
}
const log = [];
registerScene("fake", {
  build: (g, spec) => log.push(`build:${spec.n}`),
  update: () => {},
  event: (g, ev) => log.push(`ev:${ev.type}`),
  teardown: () => log.push("teardown"),
});
const reel = {
  id: "r", bpm: 120, bars: 2, music: [{ at: 0, track: "campaign" }], narration: [], captions: [],
  shots: [
    { id: "s1", at: 0, len: 4, scene: { kind: "fake", n: 1 }, events: [{ at: 0, type: "go" }] },
    { id: "s2", at: 4, len: 4, scene: { kind: "fake", n: 2 }, events: [{ at: 2, type: "boom" }] },
  ],
};

describe("director", () => {
  it("builds each shot, fires events once, tears down, and restores the opener", async () => {
    log.length = 0;
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    for (let i = 0; i < 300; i++) updateDirector(g, 1 / 60);
    await done;
    expect(log).toEqual(["build:1", "ev:go", "teardown", "build:2", "ev:boom", "teardown"]);
    expect(g.state).toBe("title");
    expect(directorState(g)).toBeNull();
  });

  it("any input skips and restores", async () => {
    log.length = 0;
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "menu" });
    updateDirector(g, 0.1);
    directorInput(g, "key", { down: true, code: "KeyA" });
    await done;
    expect(g.state).toBe("modeSelect");
    expect(log.at(-1)).toBe("teardown");
  });

  it("skip during an async build abandons it cleanly", async () => {
    log.length = 0;
    let release;
    registerScene("slow", { build: () => new Promise((r) => (release = r)), update() {}, event() {}, teardown: () => log.push("slow-teardown") });
    const g = fakeGame();
    const done = playReel(g, { ...reel, shots: [{ ...reel.shots[0], scene: { kind: "slow" } }, reel.shots[1]] }, { returnTo: "title" });
    updateDirector(g, 0.01);
    directorInput(g, "pointer", { down: true });
    release();
    await done;
    expect(g.state).toBe("title");
    expect(log).toContain("slow-teardown");
  });

  it("restores time scale and chrono state when stopped mid slow-motion", async () => {
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    updateDirector(g, 0.1);
    g.timeScale = 0.3;
    g.player.chronoActive = true;
    stopReel(g, { skipped: true });
    await done;
    expect(g.timeScale).toBe(1);
    expect(g.player.chronoActive).toBe(false);
  });

  it("does not advance while paused (tab hidden) and never double-fires events", async () => {
    log.length = 0;
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    updateDirector(g, 0.5);
    const before = directorState(g).t;
    g._cinematicHidden = true;
    for (let i = 0; i < 60; i++) updateDirector(g, 1 / 60);
    expect(directorState(g).t).toBe(before);
    g._cinematicHidden = false;
    for (let i = 0; i < 300; i++) updateDirector(g, 1 / 60);
    await done;
    expect(log.filter((x) => x === "ev:boom")).toHaveLength(1);
  });

  it("holds the clock at the shot start while a build is in flight", async () => {
    log.length = 0;
    let release;
    registerScene("held", { build: () => new Promise((r) => (release = r)), update() {}, event: (g, ev) => log.push(`held:${ev.type}`), teardown() {} });
    const g = fakeGame();
    const done = playReel(g, { ...reel, shots: [reel.shots[0], { ...reel.shots[1], scene: { kind: "held" } }] }, { returnTo: "title" });
    for (let i = 0; i < 180; i++) updateDirector(g, 1 / 60); // 3 s: into the second shot
    const held = directorState(g).t;
    expect(held).toBeCloseTo(2, 6);
    for (let i = 0; i < 60; i++) updateDirector(g, 1 / 60);
    expect(directorState(g).t).toBe(held);
    release();
    await Promise.resolve();
    for (let i = 0; i < 180; i++) updateDirector(g, 1 / 60);
    await done;
    expect(log).toContain("held:boom");
  });

  it("the fixed clock ignores frame time and steps exactly 1/60 s", async () => {
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "title", clock: "fixed" });
    updateDirector(g, 1);
    expect(directorState(g).t).toBeLessThan(0);
    await stepFixed(g);
    await stepFixed(g);
    expect(directorState(g).t).toBeCloseTo(2 / 60 - 1e-6, 9);
    stopReel(g);
    await done;
  });

  it("a lore reel skips only after the skip is held", async () => {
    const g = fakeGame();
    let ended = 0;
    const done = playReel(g, reel, { returnTo: "campaign", onEnd: () => ended++ });
    updateDirector(g, 0.1);
    directorInput(g, "key", { down: true, code: "Space" });
    updateDirector(g, 0.1);
    expect(directorState(g)).not.toBeNull();
    expect(directorState(g).hint).toBe(true);
    directorInput(g, "key", { down: false, code: "Space" });
    const now = vi.spyOn(performance, "now");
    const t0 = performance.now();
    now.mockReturnValue(t0);
    directorInput(g, "key", { down: true, code: "Space" });
    now.mockReturnValue(t0 + 900);
    updateDirector(g, 1 / 60);
    now.mockRestore();
    await done;
    expect(ended).toBe(1);
    expect(g.state).toBe("cinematic"); // the campaign hand-off owns the next state
  });
});

describe("hold to skip", () => {
  it("a key released that was pressed before the reel began shows no hint", async () => {
    const g = fakeGame();
    const done = playReel(g, reel, { returnTo: "campaign" });
    updateDirector(g, 0.1);
    directorInput(g, "key", { down: false, code: "Enter" });
    expect(directorState(g).hint).toBe(false);
    // A press and release the reel did see still does.
    directorInput(g, "key", { down: true, code: "Space" });
    directorInput(g, "key", { down: false, code: "Space" });
    expect(directorState(g).hint).toBe(true);
    stopReel(g);
    await done;
  });
});

describe("campaign scene", () => {
  function levelGame() {
    return {
      state: "title", timeScale: 1,
      map: { name: "old" }, world: null, entities: [{ id: 1 }], projectiles: [], exitEntity: null, dustMotes: null,
      mode: null, tracers: [], lights: [], damageNumbers: [], bossNameCard: null, objectiveWaypoint: null,
      player: { x: 1, y: 2, angle: 3, chronoActive: false },
      settings: { fov: 75 }, quality: { particleMultiplier: 1 },
      renderer: { applyActPalette: vi.fn(), prewarmEnv: vi.fn(), _actPalette: 2, _envLevel: "lab" },
      audio: { stopMusic: vi.fn(), startTrack: vi.fn() },
    };
  }
  const borrowed = (g) => structuredClone(Object.fromEntries(SHOWCASE_FIELDS.map((k) => [k, g[k]])));
  const levelReel = {
    id: "lv", bpm: 120, bars: 1, music: [], narration: [], captions: [],
    shots: [{ id: "a", at: 0, len: 4, scene: { kind: "campaign", act: 1, level: 5, camera: { kind: "path" } } }],
  };

  it("flies a live level and puts every borrowed field back", async () => {
    const g = levelGame();
    const before = borrowed(g);
    const player = g.player;
    const done = playReel(g, levelReel, { returnTo: "title", clock: "fixed" });
    await stepFixed(g);
    expect(g.map.name).not.toBe("old");
    expect(g.player).not.toBe(player);
    const a = { x: g.player.x, y: g.player.y };
    for (let i = 0; i < 30; i++) await stepFixed(g);
    expect(Math.hypot(g.player.x - a.x, g.player.y - a.y)).toBeGreaterThan(0.01);
    stopReel(g);
    await done;
    expect(borrowed(g)).toEqual(before);
    expect(g.player).toBe(player);
    expect(g.showcaseAct).toBeUndefined();
    expect(g.renderer.applyActPalette).toHaveBeenLastCalledWith(2, "lab");
  });

  it("a skip mid-install leaves the game untouched (Review Focus 2)", async () => {
    const g = levelGame();
    const before = borrowed(g);
    const done = playReel(g, levelReel, { returnTo: "menu" });
    updateDirector(g, 1 / 60); // starts the staged build
    directorInput(g, "pad", { down: true });
    await done;
    await new Promise((r) => setTimeout(r, 50)); // let the abandoned build run out
    expect(g.state).toBe("modeSelect");
    expect(borrowed(g)).toEqual(before);
    expect(g.renderer.applyActPalette).not.toHaveBeenCalled();
  });
});

describe("resource lifetime", () => {
  // Two quick shots, the second one's adapter under test.
  const twoShots = (kind) => ({ ...reel, shots: [reel.shots[0], { ...reel.shots[1], scene: { kind } }] });
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it("a build that lands after a stop is torn down exactly once, and what it was prepared with is freed", async () => {
    const res = { freed: 0 };
    const calls = { prepare: 0, discard: 0, teardown: 0 };
    let land;
    registerScene("late", {
      prepare: () => (calls.prepare++, { res }),
      discard: () => calls.discard++,
      // The worst case: an adapter that installs whatever it was handed, live or not.
      build: (g, spec, rng, { handle, prepared }) =>
        new Promise((r) => (land = r)).then(() => {
          handle.res = prepared.res;
        }),
      update() {},
      event() {},
      teardown: (g, h) => {
        calls.teardown++;
        if (h.res) h.res.freed++;
        h.res = null;
      },
    });
    const g = fakeGame();
    const done = playReel(g, twoShots("late"), { returnTo: "title" });
    for (let i = 0; i < 150; i++) updateDirector(g, 1 / 60); // into the second shot: its build is in flight
    expect(calls.prepare).toBe(1);
    expect(directorState(g).paused).toBe(true);
    stopReel(g, { skipped: true });
    await done;
    expect(calls.teardown).toBe(0); // nothing is up yet
    land();
    await flush();
    expect(calls.teardown).toBe(1);
    expect(res.freed).toBe(1);
    expect(calls.discard).toBe(0); // the build took it over
    await flush();
    expect(calls.teardown).toBe(1);
  });

  it("a build that fails part-way is still torn down, so whatever it had put up comes down", async () => {
    const calls = { teardown: 0 };
    registerScene("broken", {
      build: (g, spec, rng, { handle }) =>
        Promise.resolve().then(() => {
          handle.borrowed = true;
          throw new Error("boom");
        }),
      update() {},
      event() {},
      teardown: (g, h) => {
        if (h.borrowed) calls.teardown++;
        h.borrowed = false;
      },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const g = fakeGame();
    const done = playReel(g, twoShots("broken"), { returnTo: "title" });
    for (let i = 0; i < 150; i++) updateDirector(g, 1 / 60);
    await flush();
    stopReel(g);
    await done;
    await flush();
    warn.mockRestore();
    expect(calls.teardown).toBe(1);
  });

  it("a stop before the next shot builds hands its prepare back once", async () => {
    const calls = { discard: 0, build: 0 };
    registerScene("unbuilt", { prepare: () => ({ res: 1 }), discard: () => calls.discard++, build: () => calls.build++, update() {}, event() {}, teardown() {} });
    const g = fakeGame();
    const done = playReel(g, twoShots("unbuilt"), { returnTo: "title" });
    updateDirector(g, 0.1); // the first shot is up, the second prepared
    stopReel(g, { skipped: true });
    await done;
    expect(calls.build).toBe(0);
    expect(calls.discard).toBe(1);
  });

  it("a reel skipped on its opening hold discards every early prepare and releases every preload, once", async () => {
    const calls = { discard: 0, release: 0, build: 0 };
    let finish;
    const pending = new Promise((r) => (finish = r));
    registerScene("heavy", {
      early: true,
      prepare: () => ({ done: pending }),
      discard: () => calls.discard++,
      preload: () => pending,
      release: () => calls.release++,
      build: () => calls.build++,
      update() {},
      event() {},
      teardown() {},
    });
    const g = fakeGame();
    const done = playReel(g, { ...reel, shots: [{ ...reel.shots[0], scene: { kind: "heavy" } }, { ...reel.shots[1], scene: { kind: "heavy" } }] }, { returnTo: "title" });
    updateDirector(g, 0.1);
    expect(directorState(g).paused).toBe(true); // holding on the opening black
    stopReel(g, { skipped: true });
    await done;
    finish();
    await flush();
    expect(calls.build).toBe(0);
    expect(calls.discard).toBe(2);
    expect(calls.release).toBe(1); // once per adapter, not per shot
  });
});

describe("forge resources", () => {
  // A renderer that counts itself: the reel's GL contexts must all be gone after a skip.
  const made = vi.hoisted(() => []);
  // Closed, the valley never finishes meshing (the reel holds on its opening black).
  const meshing = vi.hoisted(() => ({ done: true }));
  vi.mock("../../src/rendering/voxel/voxel-renderer.js", () => ({
    VoxelRenderer: {
      create() {
        const vr = {
          destroyed: 0,
          gl: null,
          canvas: {},
          setStyle() {},
          resize() {},
          render: (cam, world) => (meshing.done && world.dirty.clear(), true),
          destroy: () => vr.destroyed++,
        };
        made.push(vr);
        return vr;
      },
    },
  }));
  const forgeGame = () => ({ ...fakeGame(), renderer: { width: 64, height: 40 } });
  const forgeReel = (first) => ({
    ...reel,
    shots: [{ ...reel.shots[0], scene: first }, { ...reel.shots[1], scene: { kind: "forge", build: "tower" } }],
  });
  const until = async (fn) => {
    for (let i = 0; i < 400 && !fn(); i++) await new Promise((r) => setTimeout(r, 5));
  };
  const live = () => made.filter((vr) => !vr.destroyed);

  it("a skip during the opening hold frees the renderer made for the Forge shot", async () => {
    made.length = 0;
    meshing.done = false;
    const g = forgeGame();
    const done = playReel(g, forgeReel({ kind: "fake", n: 1 }), { returnTo: "title" });
    await until(() => made.length > 0); // the early prepare has its GL context, still meshing
    expect(directorState(g).paused).toBe(true);
    stopReel(g, { skipped: true });
    meshing.done = true;
    await done;
    await until(() => !live().length);
    expect(made.length).toBe(1);
    expect(made[0].destroyed).toBe(1);
  });

  it("a skip after the valley is ready, before its shot, frees it once", async () => {
    made.length = 0;
    const g = forgeGame();
    const done = playReel(g, forgeReel({ kind: "fake", n: 1 }), { returnTo: "title" });
    await until(() => directorState(g) && !directorState(g).paused);
    expect(made.length).toBe(1);
    updateDirector(g, 0.5);
    stopReel(g, { skipped: true });
    await done;
    await new Promise((r) => setTimeout(r, 20));
    expect(made[0].destroyed).toBe(1);
  });

  it("a Forge shot on screen when the reel stops frees its renderer once", async () => {
    made.length = 0;
    const g = forgeGame();
    const done = playReel(g, forgeReel({ kind: "fake", n: 1 }), { returnTo: "title" });
    await until(() => directorState(g) && !directorState(g).paused);
    for (let i = 0; i < 150; i++) updateDirector(g, 1 / 60);
    expect(directorState(g).shotId).toBe("s2");
    stopReel(g, { skipped: true });
    await done;
    await new Promise((r) => setTimeout(r, 20));
    expect(made.map((vr) => vr.destroyed)).toEqual([1]);
  });
});
