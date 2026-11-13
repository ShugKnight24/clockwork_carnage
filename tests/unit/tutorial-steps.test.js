import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tutorialStepCopy, beatCaption } from "../../src/ui/tutorial-ui.js";
import { TUTORIAL_SANDBOX_STEP } from "../../src/constants.js";
import { PROLOGUE_STEPS, PROLOGUE_BEATS, PROLOGUE_TRIALS, PROLOGUE_ODDITIES, RELOAD_CREDIT, gradeTrial, lineDuration, trialStart } from "../../src/data/prologue.js";

const desktop = tutorialStepCopy(false);
const mobile = tutorialStepCopy(true);
// Steps with a card: the opening scene and the HUD boot have none.
const cardSteps = desktop.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);

const systemSource = readFileSync(
  fileURLToPath(new URL("../../js/tutorial-system.js", import.meta.url)),
  "utf8",
);

/** Step ids the LOGIC table in js/tutorial-system.js handles. */
function logicIds(src) {
  const body = src.slice(src.indexOf("const LOGIC = {"), src.indexOf("export class TutorialSystem"));
  return [...body.matchAll(/^ {2}(\w+): \{$/gm)].map((m) => m[1]);
}

describe("tutorial step numbering", () => {
  it("leaves step 0 without a card — it is the HUD boot animation", () => {
    expect(desktop[0]).toBeNull();
  });

  it("puts the sandbox exactly one step past the last card", () => {
    expect(desktop.length).toBe(TUTORIAL_SANDBOX_STEP);
    expect(PROLOGUE_STEPS.length).toBe(TUTORIAL_SANDBOX_STEP);
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
    for (const step of mobile.filter(Boolean)) {
      expect(step.hint).not.toMatch(keyboardVerbs);
    }
  });

  it("drives every step with logic", () => {
    const ids = logicIds(systemSource);
    for (const s of PROLOGUE_STEPS) expect(ids, s.id).toContain(s.id);
  });
});

describe("the prologue", () => {
  it("runs through its beats in order, each with at least one step", () => {
    const beats = PROLOGUE_STEPS.map((s) => s.beat);
    expect([...beats].sort((a, b) => a - b)).toEqual(beats);
    for (let b = 0; b < PROLOGUE_BEATS.length; b++) expect(beats).toContain(b);
  });

  it("has unique step ids", () => {
    const ids = PROLOGUE_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every beat a checkpoint", () => {
    for (let b = 0; b < PROLOGUE_BEATS.length; b++) {
      expect(PROLOGUE_STEPS.some((s) => s.beat === b && s.checkpoint !== false)).toBe(true);
    }
  });

  it("captions each card with its beat", () => {
    expect(beatCaption(3)).toBe(`PROLOGUE · 4/${PROLOGUE_BEATS.length} · TRIAL · WEAPONS`);
    for (const card of desktop.filter(Boolean)) expect(beatCaption(card.beat)).toMatch(/^PROLOGUE · \d+\/\d+ · /);
  });

  it("is told by ARIA, the Supervisor and R&D, in lines short enough to say", () => {
    const oddities = PROLOGUE_ODDITIES.flatMap((o) => [...(o.lines || []), ...(o.away || [])]);
    for (const lines of [...PROLOGUE_STEPS.map((s) => [...(s.lines || []), ...(s.brief || [])]), oddities]) {
      for (const [speaker, text, emotion] of lines) {
        expect(["ARIA", "SUPERVISOR", "OFFICER", "LT. RASCZAK", "SGT. KAEL", "PA", "DR. ORR", "LIN", "VALE"]).toContain(speaker);
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThan(170);
        if (emotion != null) expect(typeof emotion).toBe("string");
        expect(lineDuration(text)).toBeGreaterThanOrEqual(3.2);
      }
    }
  });

  it("trains on harmless things first: targets, then holograms, then a simulation, then the real attack", () => {
    const ids = PROLOGUE_STEPS.map((s) => s.id);
    const at = (id) => ids.indexOf(id);
    expect(at("fire")).toBeLessThan(at("lab"));
    expect(at("lab")).toBeLessThan(at("sim"));
    expect(at("sim")).toBeLessThan(at("alarm"));
    // Nothing before the alarm is a real fight.
    expect(ids.slice(0, at("alarm"))).not.toContain("cover");
  });

  it("builds the morning toward the breach a trial at a time, not on a timer", () => {
    // One oddity for each trial before the last; the last trial's is 06:47.
    expect(PROLOGUE_ODDITIES).toHaveLength(PROLOGUE_TRIALS.length - 1);
    for (const o of PROLOGUE_ODDITIES) expect(o.pa || o.lines || o.repeat).toBeTruthy();
    // The trials themselves keep no timed oddities.
    for (const s of PROLOGUE_STEPS.filter((d) => d.trial)) expect(s.events ?? []).toEqual([]);
    const events = PROLOGUE_STEPS.flatMap((s) => (s.events || []).map((e) => [s.id, ...e]));
    for (const [id, at, kind, text] of events) {
      expect(["pa", "flicker", "tremor"], id).toContain(kind);
      expect(at).toBeGreaterThanOrEqual(0);
      if (kind === "pa") expect(text.length).toBeGreaterThan(10);
    }
  });

  it("teaches what the old tutorial never did", () => {
    const ids = PROLOGUE_STEPS.map((s) => s.id);
    for (const id of ["breaker", "sprint", "slide", "tunnel", "dash", "chrono", "cover", "shield", "shotgun", "moving", "vents", "calibrate"]) {
      expect(ids).toContain(id);
    }
  });
});

describe("certification day", () => {
  const ids = PROLOGUE_STEPS.map((s) => s.id);
  const at = (id) => ids.indexOf(id);

  it("calibrates the suit first, hands out the sheet, and signs it off before 06:47", () => {
    // Calibration is the first trial, from the range to R&D, before the sheet.
    expect(PROLOGUE_TRIALS[0].id).toBe("calibration");
    expect(at("toRange")).toBeLessThan(trialStart("calibration"));
    expect(trialStart("calibration")).toBeLessThan(at("certify"));
    for (const tr of PROLOGUE_TRIALS.slice(1)) {
      expect(trialStart(tr.id), tr.id).toBeGreaterThan(at("certify"));
      expect(trialStart(tr.id), tr.id).toBeLessThan(at("signOff"));
    }
    expect(at("signOff")).toBeLessThan(at("sixFortySeven"));
    // After the minute, the Supervisor to his armour and back, then down.
    expect(at("sixFortySeven")).toBeLessThan(at("escort"));
    expect(at("escort")).toBeLessThan(at("kitUp"));
    expect(at("kitUp")).toBeLessThan(at("escortBack"));
    expect(at("escortBack")).toBeLessThan(at("alarm"));
  });

  it("has each trial run in person by the one who owns it", () => {
    for (const tr of PROLOGUE_TRIALS) expect(["DR. ORR", "SUPERVISOR", "VALE", "LIN"], tr.id).toContain(tr.lead);
    // The trial's first step has its lead speaking (Lin briefs from the hub, before the sim starts).
    for (const tr of PROLOGUE_TRIALS.filter((d) => d.id !== "combat")) {
      const first = PROLOGUE_STEPS[trialStart(tr.id)];
      expect(first.lines.some(([who]) => who === tr.lead), tr.id).toBe(true);
    }
  });

  it("keeps each trial's steps together, in its own beat", () => {
    for (const tr of PROLOGUE_TRIALS) {
      const steps = PROLOGUE_STEPS.map((s, i) => [s, i]).filter(([s]) => s.trial === tr.id);
      expect(steps.length, tr.id).toBeGreaterThan(0);
      const first = steps[0][1];
      steps.forEach(([s, i], k) => {
        expect(i).toBe(first + k);
        expect(s.beat).toBe(steps[0][0].beat);
      });
      // A trial's first step is its beat's checkpoint: dying puts you back at its start.
      expect(PROLOGUE_STEPS.findIndex((s) => s.beat === steps[0][0].beat)).toBe(first);
    }
  });

  it("leaves hooks for the reload drill and the cover lesson", () => {
    for (const [id, trial] of [["reloadDrill", "weapons"], ["coverDrill", "combat"]]) {
      const s = PROLOGUE_STEPS[at(id)];
      expect(s?.trial).toBe(trial);
    }
    expect(at("reloadDrill")).toBeGreaterThan(at("shotgun"));
    expect(at("coverDrill")).toBeLessThan(at("sim"));
  });

  it("grades a trial on its time and its aim", () => {
    const weapons = PROLOGUE_TRIALS.find((tr) => tr.id === "weapons");
    expect(gradeTrial(weapons, weapons.par * 0.7, 0.7)).toBe("S");
    expect(gradeTrial(weapons, weapons.par, 0.7)).toBe("A");
    expect(gradeTrial(weapons, weapons.par * 1.2, 0.7)).toBe("B");
    expect(gradeTrial(weapons, weapons.par * 2, 0.7)).toBe("C");
    // Aim moves it a grade either way.
    expect(gradeTrial(weapons, weapons.par * 1.2, 0.9)).toBe("A");
    expect(gradeTrial(weapons, weapons.par, 0.3)).toBe("B");
    expect(gradeTrial(PROLOGUE_TRIALS.find((tr) => tr.id === "calibration"), 30, null)).toBe("PASS");
  });

  it("counts the active reloads landed on the range toward the weapons grade, and only there", () => {
    const weapons = PROLOGUE_TRIALS.find((tr) => tr.id === "weapons");
    const combat = PROLOGUE_TRIALS.find((tr) => tr.id === "combat");
    // Just over par: a B, unless the reloads buy the seconds back.
    const t = weapons.par + RELOAD_CREDIT;
    expect(gradeTrial(weapons, t, 0.7)).toBe("B");
    expect(gradeTrial(weapons, t, 0.7, { reloads: 1 })).toBe("A");
    expect(gradeTrial(combat, combat.par + RELOAD_CREDIT, 0.7, { reloads: 1 })).toBe("B");
  });
});

// The rig holds each bar at its part's reading only while that part runs.
describe("the calibration's stamina bar", () => {
  async function calibrating() {
    const { TutorialSystem } = await import("../../js/tutorial-system.js");
    const { RIG_AT } = await import("../../src/data/levels/rooms/rnd.js");
    const player = { x: RIG_AT.x, y: RIG_AT.y, angle: 0, stamina: 0, maxStamina: 100, chronoEnergy: 0, maxChronoEnergy: 100 };
    const game = { player, entities: [], keys: {}, deltaTime: 1 / 60, audio: { stopSpeech() {}, playSound() {} } };
    const t = new TutorialSystem(game);
    t.step = PROLOGUE_STEPS.findIndex((s) => s.id === "calibrate");
    t.c = {};
    for (const m of ["toStation", "place", "say", "flicker"]) t[m] = () => {};
    t.logic.enter(t, game);
    return { t, game, player, RIG_AT };
  }

  it("fills with the frame, and is the cadet's own once the frame is done", async () => {
    const { t, game, player, RIG_AT } = await calibrating();
    for (let i = 0; i < 60; i++) t.logic.update(t, game);
    expect(player.stamina).toBeGreaterThan(30);
    expect(player.stamina).toBeLessThan(70);
    for (let i = 0; i < 90; i++) t.logic.update(t, game);
    expect(t.c.part).toBe("eyes");
    expect(player.stamina).toBe(100);

    // Through the anchor, off the pad: what is spent stays spent.
    t.c.part = "anchor";
    player.x = RIG_AT.x + 3;
    player.stamina = 12;
    for (let i = 0; i < 30; i++) t.logic.update(t, game);
    expect(player.stamina).toBe(12);
  });
});

// The Supervisor's set routes are straight legs: each crosses only open floor
// or a door the prologue opens before he walks it.
describe("the Supervisor's routes", () => {
  const OPENED = { enter: ["door1"], ahead: ["door1", "door2"] };

  it("walk through no wall and no shut door", async () => {
    const { TUTORIAL_MAP } = await import("../../src/data/levels/tutorial.js");
    const block = systemSource.slice(systemSource.indexOf("const SUP_ROUTES"), systemSource.indexOf("const SUP_AT_LIFT"));
    for (const [, name, legs] of block.matchAll(/^ {2}(\w+): (\[\[.*\]\]),$/gm)) {
      if (name === "leave") continue; // into Lift B, whose doors open for him
      const open = new Set((OPENED[name] || []).flatMap((d) => TUTORIAL_MAP.doors[d].map((c) => `${c.x},${c.y}`)));
      const pts = JSON.parse(legs);
      for (let i = 0; i < pts.length - 1; i++) {
        const [[ax, ay], [bx, by]] = [pts[i], pts[i + 1]];
        for (let s = 0; s <= 100; s++) {
          const x = Math.floor(ax + ((bx - ax) * s) / 100);
          const y = Math.floor(ay + ((by - ay) * s) / 100);
          if (TUTORIAL_MAP.grid[y][x] !== 0) expect(open.has(`${x},${y}`), `${name} at (${x}, ${y})`).toBe(true);
        }
      }
    }
  });

  it("opens the range door as he goes on ahead to it", () => {
    const suitUp = systemSource.slice(systemSource.indexOf("  suitUp: {"), systemSource.indexOf("  boot: {"));
    expect(suitUp.indexOf('openDoors(g, "door2")')).toBeGreaterThan(-1);
    expect(suitUp.indexOf('openDoors(g, "door2")')).toBeLessThan(suitUp.indexOf('supWalk(g, "ahead")'));
  });
});

describe("the cover drill", () => {
  async function drilling() {
    const { TutorialSystem } = await import("../../js/tutorial-system.js");
    const player = { x: 43, y: 10.4, angle: 0, cover: null, isAiming: false };
    const game = { player, entities: [], keys: {}, deltaTime: 1 / 60, time: 0, shotsFired: 0, coverStats: { tookCover: 0, peekKills: 0, blindFireKills: 0, coverDashes: 0, shotsBlocked: 0 }, audio: {} };
    const t = new TutorialSystem(game);
    t.step = PROLOGUE_STEPS.findIndex((s) => s.id === "coverDrill");
    t.c = {};
    for (const m of ["raiseCover", "say", "drillVolley"]) t[m] = () => {};
    t._cover = [[0, 0], [0, 0], [0, 0], [0, 0]];
    t.logic.enter(t, game);
    const targets = () => game.entities.filter((e) => e._tutTag === "coverDrill" && e.health > 0).map((e) => `${e.x},${e.y}`);
    const downAll = () => game.entities.forEach((e) => { if (e._tutTag === "coverDrill") e.health = 0; });
    return { t, game, player, targets, downAll };
  }

  it("counts blind fire only once the blind part starts", async () => {
    const { t, game, player } = await drilling();
    game.coverStats.tookCover = 1;
    t.logic.update(t, game);
    expect(t.c.stage).toBe("peek");
    // Hip shots from cover while the drill still wants peek kills.
    player.cover = {};
    game.shotsFired = 3;
    t.logic.update(t, game);
    expect(t.logic.progress(t, game)).toContain("BLIND FIRE 0/4");
    game.coverStats.peekKills = 2;
    t.logic.update(t, game);
    expect(t.c.stage).toBe("blind");
    game.shotsFired = 5;
    t.logic.update(t, game);
    expect(t.logic.progress(t, game)).toContain("BLIND FIRE 2/4");
  });

  it("stands its targets up somewhere new each time they go down", async () => {
    const { t, game, targets, downAll } = await drilling();
    game.coverStats.tookCover = 1;
    t.logic.update(t, game);
    const seen = [targets().join(" ")];
    for (let i = 0; i < 3; i++) {
      downAll();
      t.logic.update(t, game);
      seen.push(targets().join(" "));
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i], `respawn ${i}`).not.toBe(seen[i - 1]);
  });

  it("stands them on open floor in sight of the first block", async () => {
    const { TUTORIAL_MAP } = await import("../../src/data/levels/tutorial.js");
    const { DRILL_COVER } = await import("../../src/data/levels/rooms/arena.js");
    const block = systemSource.slice(systemSource.indexOf("const DRILL_TARGETS"), systemSource.indexOf("const DRILL_VOLLEY"));
    const spots = [...block.matchAll(/\[(\d+\.5), (\d+\.5)\]/g)].map((m) => [+m[1], +m[2]]);
    expect(spots.length).toBeGreaterThanOrEqual(6);
    const from = DRILL_COVER.first;
    for (const [x, y] of spots) {
      expect(TUTORIAL_MAP.grid[Math.floor(y)][Math.floor(x)], `(${x}, ${y})`).toBe(0);
      for (let s = 0; s <= 200; s++) {
        const cx = Math.floor(from.x + ((x - from.x) * s) / 200);
        const cy = Math.floor(from.y + ((y - from.y) * s) / 200);
        expect(TUTORIAL_MAP.grid[cy][cx], `(${x}, ${y}) seen through (${cx}, ${cy})`).toBe(0);
      }
    }
  });
});

// Timers are set on the step's clock, which starts again at every step.
describe("the prologue's timers across a step change", () => {
  it("still fire their delay after they were set, not on the old step's clock", async () => {
    const { TutorialSystem } = await import("../../js/tutorial-system.js");
    const t = new TutorialSystem({ player: { x: 0, y: 0 }, entities: [], keys: {}, audio: {} });
    t.clock = 94;
    t._timers.push({ at: t.clock + 0.6, fn: () => {} });
    t._rebaseTimers();
    t.clock = 0;
    expect(t._timers[0].at).toBeCloseTo(0.6);
  });
});

// Sent across the floor in sight, the Supervisor keeps to it: a shut door on
// the way is opened, never walked through, and he never crosses a wall.
describe("the Supervisor's walks", () => {
  it("opens his office door on the way back from the range", async () => {
    const { TutorialSystem } = await import("../../js/tutorial-system.js");
    const { Npc } = await import("../../js/npc.js");
    const { TUTORIAL_MAP } = await import("../../src/data/levels/tutorial.js");
    const grid = TUTORIAL_MAP.grid.map((row) => row.slice());
    // Every door shut, as before the trials open them.
    for (const cells of Object.values(TUTORIAL_MAP.doors)) for (const d of cells) grid[d.y][d.x] = 5;
    const map = { ...TUTORIAL_MAP, grid };
    const player = { x: 38.5, y: 42.5 };
    const sup = new Npc(37.5, 44.8, "supervisor", { name: "Supervisor Simon" });
    const game = { map, player, entities: [sup], keys: {}, audio: {} };
    const t = new TutorialSystem(game);
    let path = null;
    sup.walk = (p) => { path = p; };
    t.goTo(game, sup, 47.0, 22.4);
    expect(path).not.toBeNull();
    // Each leg, sampled finely, stays on open floor.
    let [x, y] = [sup.x, sup.y];
    for (const [nx, ny] of path) {
      for (let s = 0; s <= 40; s++) {
        const cx = Math.floor(x + ((nx - x) * s) / 40);
        const cy = Math.floor(y + ((ny - y) * s) / 40);
        expect(grid[cy][cx], `(${cx}, ${cy}) on the way to (${nx}, ${ny})`).toBe(0);
      }
      [x, y] = [nx, ny];
    }
    for (const d of TUTORIAL_MAP.doors.door6) expect(grid[d.y][d.x]).toBe(0);
  });
});
