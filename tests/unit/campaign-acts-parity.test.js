import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Phase-1 parity for the campaign acts refactor. Every act/level slot is
// driven through the real CampaignManager against a recording stand-in for
// the game, and what it did — briefing, roster, boss form and card, squad and
// ARIA context, palette, map — is compared with a fixture captured from the
// code before acts became data. A diff here is a player-visible change.

vi.mock("../../js/analytics.js", () => ({ trackEvent: () => {} }));

const { CampaignManager } = await import("../../js/campaign-manager.js");
const { getDifficultyMultipliers } = await import("../../src/systems/spawner.js");
const { applyActEnemyRoster } = await import("../../src/systems/spawner.js");
const { getPresentSquad } = await import("../../src/systems/squad-comms.js");
const { AriaCommsSystem } = await import("../../src/systems/aria-comms.js");
const { resolveEnvPalette, envSalt } = await import("../../src/rendering/env/palettes.js");
const { CUTSCENE_KEYS } = await import("../../src/data/cutscene-keys.js");
const { ENEMY_TYPES } = await import("../../js/data.js");
const { unlockContext } = await import("../../src/systems/unlocks.js");

const ACT_IDS = [1, 2, 3];
const LEVELS_PER_ACT = 9;
const BOSS_LEVEL = 8;

/** A game that records what the campaign asks of it. */
function fakeGame(log) {
  const t0 = Date.now();
  const at = () => Date.now() - t0;
  const player = {
    x: 0, y: 0, angle: 0, alive: true, weapons: [], health: 100, maxHealth: 100,
    ammo: 0, shield: 0, maxShield: 0,
    reset() {}, deserialize() {},
  };
  return {
    mode: "campaign",
    settings: { difficulty: "normal" },
    achievementStats: {},
    player,
    entities: [],
    time: 0,
    glitchEffect: 0,
    getDifficultyMultipliers: () => getDifficultyMultipliers(1),
    killStreakSystem: { reset() {} },
    squadComms: {
      setContext: (act, level) => log.push(["squadContext", act, level]),
      onBossPhase: (phase) => log.push(["squadBossPhase", phase, at()]),
      onCombatStart: () => log.push(["squadCombatStart", at()]),
    },
    ariaComms: {
      setNarrativeContext: (ctx) => log.push(["ariaContext", ctx]),
    },
    queueAriaMessage: (key) => log.push(["aria", key, at()]),
    renderer: { applyActPalette: (...args) => log.push(["palette", args]) },
    audio: {
      startTrack: (t) => log.push(["track", t]),
      startAmbient() {}, stopMusic() {}, roundComplete() {},
    },
    lockPointer() {}, unlockPointer() {},
    saveAchievements() {}, checkAchievements() {},
    startCutscene: (key, cb) => { log.push(["cutscene", key]); cb?.(); },
    hasCutsceneScript: (key) => CUTSCENE_KEYS.has(key),
  };
}

function makeCampaign() {
  const log = [];
  const g = fakeGame(log);
  const cm = new CampaignManager(g);
  g.campaign = cm;
  cm.save = () => {};
  cm.clearSave = () => log.push(["clearSave"]);
  return { g, cm, log };
}

/** Everything a level start leaves behind that the player can see or hear. */
function levelSnapshot(g, cm, log) {
  vi.runAllTimers();
  const enemies = g.entities
    .filter((e) => e.type === "enemy")
    .map((e) => [e.enemyType, Math.round(e.x * 100) / 100, Math.round(e.y * 100) / 100,
      e.health, e.maxHealth, e.def?.damage ?? e.damage]);
  const paletteCall = log.find((l) => l[0] === "palette");
  const ariaCall = log.find((l) => l[0] === "ariaContext");
  return {
    act: cm.act,
    level: cm.level,
    state: g.state,
    map: {
      name: g.map?.name,
      start: g.map?.playerStart,
      exit: g.map?.exit ?? null,
      grid: hash(g.map?.grid?.map((r) => r.join("")).join("/")),
      heights: hash(g.map?.heightMap?.map((r) => r.join(",")).join("/")),
    },
    enemies,
    bossNameCard: g.bossNameCard
      ? { title: g.bossNameCard.title, subtitle: g.bossNameCard.subtitle }
      : null,
    palette: paletteCall ? resolveEnvPalette(...paletteCall[1]) : null,
    // Wall and deck painting are salted per level; the salt must not move.
    textureSalt: paletteCall ? envSalt(paletteCall[1][1]) : null,
    idlePools: ariaCall ? idlePools(ariaCall[1]) : null,
    events: log.filter((l) => l[0] !== "palette" && l[0] !== "ariaContext"),
  };
}

/** FNV-1a, so a whole map fits in the fixture as one number. */
function hash(str) {
  if (str == null) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The idle pool ARIA picks at a spread of rolls, given her narrative context. */
function idlePools(ctx) {
  const aria = new AriaCommsSystem(null);
  aria.setNarrativeContext(ctx);
  const rolls = [0.1, 0.3, 0.4, 0.6];
  return rolls.map((r) => {
    vi.spyOn(Math, "random").mockReturnValue(r);
    const pool = aria._pickIdlePool();
    Math.random.mockRestore();
    return pool;
  });
}

function captureCampaign() {
  const out = { slots: {}, bossKills: {}, ngPlus: null, rosters: {}, squad: {}, unlocks: null };

  for (const act of ACT_IDS) {
    for (let level = 0; level < LEVELS_PER_ACT; level++) {
      const { g, cm, log } = makeCampaign();
      cm.act = act;
      if (level === 0) {
        cm.level = 0;
        cm.loadLevel(0);
      } else {
        cm.level = level - 1;
        cm.nextLevel();
      }
      out.slots[`${act}.${level}`] = {
        ...levelSnapshot(g, cm, log),
        levelsCleared: g.achievementStats.campaignLevelsCleared ?? null,
      };
    }
  }

  for (const act of ACT_IDS) {
    for (const ng of act === 3 ? [0, 3] : [0]) {
      const { g, cm, log } = makeCampaign();
      cm.act = act;
      cm.level = BOSS_LEVEL;
      cm.ngPlusCycle = ng;
      cm.handleBossKill();
      out.bossKills[`${act}.ng${ng}`] = {
        ...levelSnapshot(g, cm, log),
        actsCleared: g.achievementStats.campaignActsCleared,
        complete: !!g.achievementStats.campaignComplete,
        ngPlusPrompt: cm.ngPlusPrompt,
      };
    }
  }

  {
    const { g, cm, log } = makeCampaign();
    cm.act = 3;
    cm.level = BOSS_LEVEL;
    cm.ngPlusCycle = 0;
    cm.startNgPlus();
    out.ngPlus = levelSnapshot(g, cm, log);
  }

  // Continue: a save resumes its own act and level; one that points past
  // the act's levels is dropped.
  out.continue = [
    { act: 2, level: 4 },
    { act: 3, level: 8 },
    { act: 1, level: 12 },
  ].map((save) => {
    const { g, cm, log } = makeCampaign();
    const stored = JSON.stringify({ version: 1, difficulty: "normal", ...save });
    vi.stubGlobal("localStorage", {
      getItem: (k) => (k === "cc_campaign_save" ? stored : null),
      setItem() {}, removeItem() {},
    });
    const ok = cm.load();
    return {
      save, ok, act: cm.act, level: cm.level, map: g.map?.name ?? null,
      cleared: log.some((l) => l[0] === "clearSave"),
    };
  });

  const diff = getDifficultyMultipliers(1);
  const types = Object.keys(ENEMY_TYPES).sort();
  for (const act of ACT_IDS) {
    const entities = types.map((t) => ({ type: "enemy", enemyType: t }));
    applyActEnemyRoster(entities, act, diff);
    out.rosters[act] = Object.fromEntries(types.map((t, i) => [t, entities[i].enemyType]));
    for (let level = 0; level < LEVELS_PER_ACT; level++) {
      out.squad[`${act}.${level}`] = getPresentSquad(act, level);
    }
  }

  out.unlocks = [
    {},
    { campaignComplete: true },
    { bossKilled: true, campaignLevelsCleared: 4 },
  ].map((stats) => unlockContext({ stats, campaignSaveLevel: 2, campaignSaveAct: 2 }));

  return out;
}

describe("campaign acts parity (phase 1: no visible change)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("performance", { now: () => Date.now() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("drives every act and level exactly as the three-act campaign did", async () => {
    const snapshot = captureCampaign();
    await expect(JSON.stringify(snapshot, null, 1) + "\n").toMatchFileSnapshot(
      "./fixtures/campaign-acts-phase1.json",
    );
  });
});
