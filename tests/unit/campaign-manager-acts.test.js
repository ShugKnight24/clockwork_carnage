import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// CampaignManager walks whatever ACTS holds: briefings, boss kills, act
// transitions and victory come from the table, not from act numbers.

vi.mock("../../js/analytics.js", () => ({ trackEvent: () => {} }));

const { CampaignManager } = await import("../../js/campaign-manager.js");
const { ACTS, NG_PLUS } = await import("../../src/data/campaign/acts.js");
const { getDifficultyMultipliers } = await import("../../src/systems/spawner.js");
const { GameState } = await import("../../src/types.js");

function makeCampaign({ scripts = () => true } = {}) {
  const scenes = [];
  const aria = [];
  const g = {
    mode: "campaign",
    settings: { difficulty: "normal" },
    achievementStats: {},
    player: {
      x: 0, y: 0, angle: 0, alive: true, weapons: [], health: 10, maxHealth: 100,
      ammo: 0, reset() {}, deserialize() {},
    },
    entities: [],
    time: 0,
    glitchEffect: 0,
    getDifficultyMultipliers: () => getDifficultyMultipliers(1),
    killStreakSystem: { reset() {} },
    squadComms: null,
    ariaComms: null,
    queueAriaMessage: (k) => aria.push(k),
    renderer: { applyActPalette() {} },
    audio: { startTrack() {}, startAmbient() {}, stopMusic() {}, roundComplete() {} },
    lockPointer() {}, unlockPointer() {},
    saveAchievements() {}, checkAchievements() {},
    startCutscene: (key, cb) => { scenes.push(key); cb?.(); },
    hasCutsceneScript: scripts,
  };
  const cm = new CampaignManager(g);
  cm.save = () => {};
  cm.clearSave = () => {};
  return { g, cm, scenes, aria };
}

describe("CampaignManager on ACTS", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("performance", { now: () => Date.now() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("plays each level's briefing before loading it", () => {
    for (const act of ACTS) {
      act.levels.forEach((entry, level) => {
        if (level === 0) return;
        const { cm, scenes } = makeCampaign();
        cm.act = act.id;
        cm.level = level - 1;
        cm.nextLevel();
        expect(scenes, `${act.id}.${level}`).toEqual(entry.briefing ?? []);
        expect(cm.level).toBe(level);
      });
    }
  });

  it("counts levels cleared across the campaign, not within the act", () => {
    const { g, cm } = makeCampaign();
    cm.act = 2;
    cm.level = 0;
    cm.nextLevel();
    expect(g.achievementStats.campaignLevelsCleared).toBe(ACTS[0].levels.length + 1);
  });

  it("skips a briefing this build has no script for", () => {
    const { g, cm, scenes } = makeCampaign({ scripts: () => false });
    cm.act = 1;
    cm.level = 0;
    cm.nextLevel();
    expect(scenes).toEqual([]);
    expect(g.state).toBe(GameState.PLAYING);
    expect(cm.level).toBe(1);
  });

  it("opens the next act at level 0 behind this act's outro and the next act's intro", () => {
    ACTS.slice(0, -1).forEach((act, i) => {
      const next = ACTS[i + 1];
      const { g, cm, scenes } = makeCampaign();
      cm.act = act.id;
      cm.level = act.levels.length - 1;
      cm.handleBossKill();
      expect(scenes).toEqual([...act.outro, ...next.intro]);
      expect([cm.act, cm.level]).toEqual([next.id, 0]);
      expect(g.state).toBe(GameState.PLAYING);
      expect(g.player.health).toBe(g.player.maxHealth);
      expect(g.achievementStats.campaignActsCleared).toBe(act.id);
    });
  });

  it("wins after the last act's boss: the true ending takes NG+ and every fragment", () => {
    const last = ACTS.at(-1);
    const run = (ngPlusCycle, found) => {
      const c = makeCampaign();
      c.g.archive = { fragmentProgress: () => ({ found, total: NG_PLUS.fragments }) };
      c.cm.act = last.id;
      c.cm.level = last.levels.length - 1;
      c.cm.ngPlusCycle = ngPlusCycle;
      c.cm.handleBossKill();
      return c;
    };
    // The first run ends on the ending and the epilogue, and offers a loop.
    const first = run(0, NG_PLUS.fragments);
    expect(first.scenes).toEqual(last.outro);
    expect(last.outro).toEqual(["true_victory", "epilogue_message"]);
    expect(first.g.state).toBe(GameState.VICTORY);
    expect(first.cm.ngPlusPrompt).toBe(true);
    expect(first.cm.trueEnding).toBe(false);
    expect(first.g.achievementStats.campaignComplete).toBe(true);

    // NG+1 (spec decision 2) with all twelve: the true ending.
    expect(NG_PLUS.trueEndingCycle).toBe(1);
    expect(NG_PLUS.fragments).toBe(12);
    const trueEnd = run(1, 12);
    expect(trueEnd.scenes).toEqual([...last.outro, ...NG_PLUS.trueEnding]);
    expect(trueEnd.g.state).toBe(GameState.VICTORY);
    expect(trueEnd.cm.ngPlusPrompt).toBe(false);
    expect(trueEnd.cm.trueEnding).toBe(true);

    // One memory short, and the loop goes round again, even on NG+3.
    for (const cycle of [1, 3]) {
      const short = run(cycle, 11);
      expect(short.scenes).toEqual(last.outro);
      expect(short.cm.ngPlusPrompt).toBe(true);
      expect(short.cm.trueEnding).toBe(false);
    }
  });

  it("plays the Gathering's déjà-vu echoes in NG+, and the originals before it", () => {
    const act2 = ACTS.find((a) => a.id === 2);
    const echoed = Object.keys(NG_PLUS.scenes);
    expect(echoed).toHaveLength(6);
    for (const ng of [0, 1]) {
      const played = [];
      act2.levels.forEach((entry, level) => {
        if (level === 0) return;
        const { cm, scenes } = makeCampaign();
        cm.act = 2;
        cm.level = level - 1;
        cm.ngPlusCycle = ng;
        cm.nextLevel();
        played.push(...scenes);
      });
      // The act's intro, through the same path.
      const { cm, scenes } = makeCampaign();
      cm.ngPlusCycle = ng;
      cm._playScenes(act2.intro, () => {});
      played.push(...scenes);
      for (const key of echoed) {
        expect(played.includes(key), `ng ${ng}: ${key}`).toBe(ng === 0);
        expect(played.includes(NG_PLUS.scenes[key]), `ng ${ng}: ${NG_PLUS.scenes[key]}`).toBe(ng > 0);
      }
    }
  });

  it("announces each parting gift once, as its ally stays behind", () => {
    const iv = ACTS.at(-1);
    const heard = [];
    iv.levels.forEach((entry, level) => {
      const { g, cm, aria } = makeCampaign();
      g.chronoPowers = { startLevel() {}, freshGifts: entry.gifts ?? [] };
      cm.act = iv.id;
      cm.loadLevel(level);
      vi.advanceTimersByTime(10000);
      heard.push(...aria.filter((k) => k.startsWith("gift")));
    });
    expect(heard).toEqual(["giftTimeLock", "giftRewind", "giftDash", "giftForesight"]);
  });

  it("shows the act's boss card and ARIA line at its boss level", () => {
    for (const act of ACTS) {
      const { g, cm, aria } = makeCampaign();
      cm.act = act.id;
      cm.level = act.levels.findIndex((l) => l.boss);
      cm.loadLevel(cm.level);
      expect(g.bossNameCard).toMatchObject(act.boss.card);
      expect(aria[0]).toBe(act.boss.aria);
      expect(g.entities.some((e) => e.enemyType === act.boss.type)).toBe(true);
    }
  });

  it("queues a level's onStart lines, NG+ ones only on NG+", () => {
    const withLines = ACTS.flatMap((a) =>
      a.levels.map((l, i) => ({ act: a.id, level: i, entry: l })),
    ).filter((s) => s.entry.onStart.length);
    expect(withLines.length).toBeGreaterThan(0);
    for (const { act, level, entry } of withLines) {
      for (const ng of [0, 1]) {
        const { cm, aria } = makeCampaign();
        cm.act = act;
        cm.level = level;
        cm.ngPlusCycle = ng;
        cm.loadLevel(level);
        vi.runAllTimers();
        const expected = entry.onStart.filter((l) => (l.minNgPlus ?? 0) <= ng).map((l) => l.aria);
        expect(aria.filter((k) => expected.includes(k)), `${act}.${level} ng${ng}`).toEqual(expected);
      }
    }
  });

  it("wins when asked to load past the act's last level", () => {
    const { g, cm } = makeCampaign();
    cm.act = 1;
    cm.loadLevel(ACTS[0].levels.length);
    expect(g.state).toBe(GameState.VICTORY);
  });
});
