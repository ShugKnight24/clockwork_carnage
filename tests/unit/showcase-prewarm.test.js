// tests/unit/showcase-prewarm.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// The sprite prefetches need a browser; stand in for them and count calls.
const calls = { enemy: [], prop: [], warmSet: 0 };
let readyAfter = 0;
vi.mock("../../src/rendering/svg-art/sprites/enemies.js", () => ({
  prefetchIdleEnemy: (ctx, e, hs) => {
    calls.enemy.push([e, hs]);
    return calls.enemy.length > readyAfter;
  },
}));
vi.mock("../../src/rendering/props.js", () => ({
  prefetchPropSprite: (ctx, type, hs) => {
    calls.prop.push([type, hs]);
    return true;
  },
  warmPropSet: () => { calls.warmSet++; },
}));
vi.mock("../../src/rendering/art-style.js", async (orig) => ({ ...(await orig()), isModernArt: () => true }));

const { startShowcase } = await import("../../src/systems/showcase.js");

function fakeGame() {
  return {
    state: "settings",
    map: null, world: null, entities: [], projectiles: [], exitEntity: null, dustMotes: null, mode: null,
    tracers: [], damageNumbers: [], bossNameCard: null, objectiveWaypoint: null, player: { x: 0, y: 0, angle: 0 },
    settings: { fov: 75 },
    quality: { particleMultiplier: 1 },
    renderer: { ctx: {}, height: 900, applyActPalette: vi.fn(), prewarmEnv: vi.fn() },
    achievementStats: { campaignActsCleared: 0 },
  };
}

describe("showcase prewarm", () => {
  beforeEach(() => {
    calls.enemy.length = 0;
    calls.prop.length = 0;
    calls.warmSet = 0;
  });

  it("decodes every enemy's and prop's sprite sizes before it installs", async () => {
    const g = fakeGame();
    let frames = 0;
    let installedAt = -1;
    readyAfter = 18; // the enemy prefetches report ready only after a few frames
    await startShowcase(g, {
      wait: async () => {
        frames++;
        if (g._showcase?.installed && installedAt < 0) installedAt = frames;
      },
    });
    expect(g._showcase.installed).toBe(true);
    const enemies = g.entities.filter((e) => e.type === "enemy");
    expect(enemies.length).toBeGreaterThan(0);
    // Each enemy was prefetched, at the sizes the loop shows it.
    for (const e of enemies) {
      const hs = calls.enemy.find(([x]) => x === e)?.[1];
      expect(hs?.length, e.enemyType).toBeGreaterThan(0);
      expect(hs.every((h) => h > 0 && Number.isFinite(h))).toBe(true);
    }
    // It kept asking until every prefetch was ready, and only then installed.
    expect(calls.enemy.length).toBeGreaterThan(readyAfter);
    expect(installedAt).toBe(-1); // no wait() ran after the install
    expect(calls.prop.length).toBeGreaterThan(0);
    expect(calls.warmSet).toBe(1);
  });
});
