// tests/unit/cinematic-events.test.js
import { describe, it, expect, vi } from "vitest";
import { playReel, stopReel, stepFixed, updateDirector, directorState, registerScene, SCENES } from "../../src/cinematic/director.js";
import { ChronoPowers, inLockSlab } from "../../src/systems/chrono-powers.js";
import { SHOWCASE_FIELDS } from "../../src/systems/showcase.js";

/**
 * The parts of js/game.js a campaign shot's combat reaches, written the way
 * the game writes them (prototype methods, so a shot that shadows one for
 * its length can be seen putting it back).
 */
class FakeGame {
  constructor() {
    Object.assign(this, {
      state: "title", timeScale: 1, slowMoTimer: 0, time: 0, deltaTime: 1 / 60,
      map: { name: "old" }, world: null, entities: [], projectiles: [], exitEntity: null, dustMotes: null,
      mode: null, tracers: [], lights: [], damageNumbers: [], bossNameCard: null, objectiveWaypoint: null,
      screenShake: 0, glitchEffect: 0, _hudDisabledUntil: 0,
      player: { x: 1, y: 2, angle: 3, chronoActive: false, health: 100, chronoEnergy: 50, maxChronoEnergy: 100, alive: true },
      settings: { fov: 75 }, quality: { particleMultiplier: 1 },
      renderer: { applyActPalette: vi.fn(), prewarmEnv: vi.fn() },
      audio: { stopMusic: vi.fn(), startTrack: vi.fn(), setTimeScale: vi.fn(), musicSting: vi.fn() },
      achievementStats: { totalShotsFired: 3, totalKills: 2, weaponKills: { 0: 2 } },
      chronoPowers: new ChronoPowers(),
      aria: [],
      fired: 0,
    });
  }
  startChronoShift() {
    this.player.chronoActive = true;
    this.chronoPowers.onShiftStart(this);
  }
  endChronoShift() {
    this.player.chronoActive = false;
    this.timeScale = 1;
  }
  _updateTimeScale() {
    if (this.player.chronoActive) this.timeScale = 0.3;
    else if (this.timeScale !== 1 && !(this.slowMoTimer > 0)) this.timeScale = 1;
  }
  fireWeapon() {
    this.fired++;
    this.achievementStats.totalShotsFired++;
  }
  damagePlayer(amount) {
    this.player.health -= amount;
  }
  queueAriaMessage(m) {
    this.aria.push(m);
  }
}

const shot = (events, scene = {}) => ({
  id: "reel", bpm: 120, bars: 3, music: [], narration: [], captions: [],
  shots: [{ id: "a", at: 0, len: 12, scene: { kind: "campaign", act: 1, level: 5, enemies: false, camera: { kind: "path" }, ...scene }, events }],
});
const borrowed = (g) => structuredClone(Object.fromEntries(SHOWCASE_FIELDS.map((k) => [k, g[k]])));
const steps = async (g, n) => {
  for (let i = 0; i < n; i++) await stepFixed(g);
};

describe("campaign shot combat", () => {
  it("a reel stopped mid Chrono Shift puts time, chrono, powers, invulnerability and tempo back (Review Focus 1)", async () => {
    const g = new FakeGame();
    const player = g.player;
    const powers = g.chronoPowers;
    const stats = structuredClone(g.achievementStats);
    const before = borrowed(g);
    const done = playReel(g, shot([{ at: 1, type: "chrono", on: true }, { at: 1, type: "rewind" }]), { returnTo: "title", clock: "fixed" });
    await steps(g, 45); // 0.75 s: past beat 1
    expect(g.mode).toBe("reel");
    expect(g.player).not.toBe(player);
    expect(g.player.chronoActive).toBe(true);
    expect(g.timeScale).toBeCloseTo(0.3);
    // The shot has its own Chronos, with the powers it uses granted.
    expect(g.chronoPowers).not.toBe(powers);
    expect(g.chronoPowers.has("rewind")).toBe(true);
    // Nothing hurts the shot's agent.
    const hp = g.player.health;
    g.damagePlayer(50);
    expect(g.player.health).toBe(hp);

    stopReel(g, { skipped: true });
    await done;
    expect(g.timeScale).toBe(1);
    expect(g.player).toBe(player);
    expect(player.chronoActive).toBe(false);
    expect(g.chronoPowers).toBe(powers);
    expect(powers.powers).toEqual([]);
    expect(Object.hasOwn(g, "damagePlayer")).toBe(false);
    g.damagePlayer(10);
    expect(player.health).toBe(90);
    expect(g.audio.setTimeScale).toHaveBeenLastCalledWith(1);
    expect(g.achievementStats).toEqual(stats);
    expect(borrowed(g)).toEqual({ ...before, player: { ...before.player, health: 90 } });
  });

  it("chrono off lets time run again, the way releasing the key does", async () => {
    const g = new FakeGame();
    const done = playReel(g, shot([{ at: 1, type: "chrono", on: true }, { at: 3, type: "chrono", on: false }]), { returnTo: "title", clock: "fixed" });
    await steps(g, 45);
    expect(g.timeScale).toBeCloseTo(0.3);
    // The shift outlasts the energy it would have in play.
    await steps(g, 30);
    expect(g.player.chronoActive).toBe(true);
    await steps(g, 30); // past beat 3
    expect(g.player.chronoActive).toBe(false);
    expect(g.timeScale).toBe(1);
    stopReel(g);
    await done;
  });

  it("fire switches to the weapon and holds the trigger for `dur` beats, with no stats", async () => {
    const g = new FakeGame();
    const stats = structuredClone(g.achievementStats);
    const done = playReel(g, shot([{ at: 1, type: "fire", weapon: 1, dur: 2 }]), { returnTo: "title", clock: "fixed" });
    await steps(g, 40); // beat 1.33
    expect(g.player.getWeaponDef().id).toBe(1);
    expect(g.player.isFiring).toBe(true);
    expect(g.fired).toBeGreaterThan(0);
    await steps(g, 60); // beat 3.33
    expect(g.player.isFiring).toBe(false);
    const fired = g.fired;
    await steps(g, 10);
    expect(g.fired).toBe(fired);
    stopReel(g);
    await done;
    expect(g.achievementStats).toEqual(stats);
    expect(g.aria).toEqual([]);
  });

  it("spawn puts enemies ahead of the camera and attack winds the nearest one up", async () => {
    const g = new FakeGame();
    const done = playReel(g, shot([{ at: 0.5, type: "spawn", enemy: "drone", pos: "ahead", count: 2 }, { at: 1, type: "attack" }]), { returnTo: "title", clock: "fixed" });
    await steps(g, 20);
    const foes = g.entities.filter((e) => e.type === "enemy");
    expect(foes).toHaveLength(2);
    expect(foes.every((e) => e.enemyType === "drone")).toBe(true);
    const p = g.player;
    for (const e of foes) {
      // In front of the camera, on open floor.
      const a = Math.atan2(e.y - p.y, e.x - p.x) - p.angle;
      expect(Math.cos(a)).toBeGreaterThan(0.5);
      expect(g.map.grid[Math.floor(e.y)][Math.floor(e.x)]).toBe(0);
    }
    await steps(g, 20);
    const near = foes.reduce((a, b) => (Math.hypot(a.x - p.x, a.y - p.y) <= Math.hypot(b.x - p.x, b.y - p.y) ? a : b));
    expect(near.state).toBe("windup");
    stopReel(g);
    await done;
    expect(g.entities).toEqual([]);
  });

  it("refuses to spawn a late-game boss", async () => {
    const g = new FakeGame();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const done = playReel(g, shot([{ at: 0.5, type: "spawn", enemy: "boss_form3" }]), { returnTo: "title", clock: "fixed" });
    await steps(g, 20);
    expect(g.entities.filter((e) => e.type === "enemy")).toHaveLength(0);
    stopReel(g);
    await done;
    warn.mockRestore();
  });

  it("timeLock and freeze go through Kael's lock; rewind jumps the agent back", async () => {
    const g = new FakeGame();
    const done = playReel(
      g,
      shot([
        { at: 0.5, type: "spawn", enemy: "henchman", count: 1 },
        { at: 1, type: "timeLock" },
        { at: 2, type: "freeze", target: "nearest" },
        { at: 8, type: "rewind" },
      ]),
      { returnTo: "title", clock: "fixed" },
    );
    await steps(g, 35);
    expect(g.chronoPowers.lock).toBeTruthy();
    await steps(g, 30); // past beat 2
    const foe = g.entities.find((e) => e.type === "enemy");
    expect(inLockSlab(g.chronoPowers.lock, foe.x, foe.y)).toBe(true);
    await steps(g, 180); // past beat 8 (4 s)
    expect(g.chronoPowers.echo).toBeTruthy();
    const { echo } = g.chronoPowers;
    // The agent stands where it was three seconds ago, the echo where it was.
    expect(Math.hypot(g.player.x - echo.x, g.player.y - echo.y)).toBeGreaterThan(0.2);
    stopReel(g);
    await done;
  });
});

describe("director cards", () => {
  const cardReel = {
    id: "cards", bpm: 120, bars: 4, music: [], narration: [], captions: [],
    shots: [
      {
        id: "a", at: 0, len: 16, scene: { kind: "noop" },
        events: [
          { at: 1, type: "card", title: "The Hound", sub: "SUIT C-0016. NOBODY INSIDE.", silhouette: true, len: 3 },
          { at: 6, type: "squad", members: ["lyra", "rook", "nova", "kael"], len: 8 },
        ],
      },
    ],
  };
  const seen = [];
  registerScene("noop", { build() {}, update() {}, event: (g, ev) => seen.push(ev.type), teardown() {} });

  it("draws a card for its length and the squad one member at a time; neither reaches the scene", async () => {
    const g = new FakeGame();
    const done = playReel(g, cardReel, { returnTo: "title" });
    const at = (beat) => {
      while ((directorState(g)?.t ?? Infinity) < beat / 2) updateDirector(g, 1 / 60);
      return directorState(g);
    };
    expect(at(0.5).card).toBeNull();
    expect(at(1.5).card).toBe("The Hound");
    expect(at(4.5).card).toBeNull();
    expect([6.5, 8.5, 10.5, 12.5].map((b) => at(b).squad)).toEqual(["lyra", "rook", "nova", "kael"]);
    expect(at(14.5).squad).toBeNull();
    stopReel(g);
    await done;
    expect(seen).toEqual([]);
  });
});

describe("prepare", () => {
  it("prepares the next shot while the current one plays and hands the result to its build", async () => {
    const log = [];
    registerScene("prep", {
      prepare: (g, spec) => (log.push(`prepare:${spec.n}`), { n: spec.n }),
      build: (g, spec, rng, { prepared }) => log.push(`build:${spec.n}:${prepared?.n ?? "-"}`),
      update() {},
      event() {},
      teardown: () => log.push("teardown"),
    });
    const reel = {
      id: "p", bpm: 120, bars: 3, music: [], narration: [], captions: [],
      shots: [0, 1, 2].map((n) => ({ id: `s${n}`, at: n * 4, len: 4, scene: { kind: "prep", n } })),
    };
    const g = new FakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    for (let i = 0; i < 400; i++) updateDirector(g, 1 / 60);
    await done;
    // The first shot has nothing to prepare ahead of it; each later one is
    // prepared once, after the shot before it is up, and never while built.
    expect(log).toEqual(["build:0:-", "prepare:1", "teardown", "build:1:1", "prepare:2", "teardown", "build:2:2", "teardown"]);
  });

  it("a prepared level cuts in on the same frame, without holding the clock", async () => {
    registerScene("still", { build() {}, update() {}, event() {}, teardown() {} });
    const reel = {
      id: "cut", bpm: 120, bars: 2, music: [], narration: [], captions: [],
      shots: [
        { id: "a", at: 0, len: 4, scene: { kind: "still" } },
        { id: "b", at: 4, len: 4, scene: { kind: "campaign", act: 1, level: 5, camera: { kind: "path" } } },
      ],
    };
    const { prepare } = SCENES.campaign;
    let prep = null;
    SCENES.campaign.prepare = (...args) => (prep = prepare(...args));
    const g = new FakeGame();
    const done = playReel(g, reel, { returnTo: "title" });
    updateDirector(g, 1 / 60);
    SCENES.campaign.prepare = prepare;
    // The level is prepared in the background (its waits are timers here).
    expect(prep).not.toBeNull();
    await prep.done;
    expect(g.map.name).toBe("old");
    // Frames, with no await between them: the cut's own frame has the level.
    for (let i = 0; i < 121; i++) updateDirector(g, 1 / 60);
    expect(directorState(g).shotId).toBe("b");
    expect(directorState(g).paused).toBe(false);
    expect(g.mode).toBe("showcase");
    stopReel(g);
    await done;
    expect(g.map.name).toBe("old");
  });
});
