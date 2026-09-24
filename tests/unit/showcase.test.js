import { describe, it, expect, vi } from "vitest";
import { getActLevel, campaignMap } from "../../js/data.js";
import { hasLineOfSight, samplePath } from "../../src/systems/showcase-path.js";
import {
  showcaseAct,
  showcaseLevel,
  startShowcase,
  stopShowcase,
  updateShowcase,
  SHOWCASE_FIELDS,
  LOOP_SECONDS,
} from "../../src/systems/showcase.js";

function fakeGame() {
  return {
    state: "settings",
    map: { name: "old" }, world: { w: 1 }, entities: [{ id: 1 }], projectiles: [{ id: 2 }],
    exitEntity: { id: 3 }, dustMotes: [1], mode: "campaign", tracers: [{ id: 4 }],
    damageNumbers: [{ id: 5 }], bossNameCard: { name: "x" }, objectiveWaypoint: { x: 1 },
    player: { x: 1, y: 2, angle: 3, health: 7 },
    settings: { fov: 75 },
    quality: { particleMultiplier: 1 },
    renderer: { applyActPalette: vi.fn(), prewarmEnv: vi.fn(), _actPalette: 2, _envLevel: "lab" },
    achievementStats: { campaignActsCleared: 0 },
  };
}

const borrowed = (g) => structuredClone(Object.fromEntries(SHOWCASE_FIELDS.map((k) => [k, g[k]])));
const open = (m, x, y) => m.grid[Math.floor(y)]?.[Math.floor(x)] === 0;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

describe("showcase", () => {
  it("never picks an act beyond progress", () => {
    expect(showcaseAct({ campaignActsCleared: 0 }, null)).toBe(1);
    expect(showcaseAct({ campaignActsCleared: 1 }, null)).toBe(2);
    expect(showcaseAct({ campaignActsCleared: 0 }, { act: 3 })).toBe(3);
    expect(showcaseAct({ campaignActsCleared: 9 }, null)).toBe(4);
    expect(showcaseAct({ campaignComplete: true }, null)).toBe(4);
    expect(showcaseAct(undefined, undefined)).toBe(1);
  });

  it("restores every borrowed field exactly", async () => {
    const g = fakeGame();
    const before = borrowed(g);
    const player = g.player;
    const playerBefore = { ...g.player };
    await startShowcase(g);
    expect(g.mode).toBe("showcase");
    updateShowcase(g, 0.5);
    expect(g.map.name).not.toBe("old");
    expect(g.player).not.toBe(player); // a fresh player: the HUD shows its values
    stopShowcase(g);
    expect(borrowed(g)).toEqual(before);
    expect(g.player).toBe(player);
    expect(g.player).toEqual(playerBefore);
    expect(g.renderer.applyActPalette).toHaveBeenLastCalledWith(2, "lab");
  });

  it("a stop before the install finishes leaves the game untouched", async () => {
    const g = fakeGame();
    const before = borrowed(g);
    const p = startShowcase(g);
    stopShowcase(g);
    await p;
    expect(borrowed(g)).toEqual(before);
    expect(g.renderer.applyActPalette).not.toHaveBeenCalled();
    // A late frame after the stop moves nothing either.
    updateShowcase(g, 1);
    expect(borrowed(g)).toEqual(before);
  });

  it("a newer start supersedes one still loading", async () => {
    const g = fakeGame();
    const before = borrowed(g);
    const first = startShowcase(g);
    const second = startShowcase(g);
    await Promise.all([first, second]);
    stopShowcase(g);
    expect(borrowed(g)).toEqual(before);
  });

  it("moves the camera along the path", async () => {
    const g = fakeGame();
    await startShowcase(g);
    const a = { ...g.player };
    updateShowcase(g, 2);
    expect(Math.hypot(g.player.x - a.x, g.player.y - a.y)).toBeGreaterThan(0.01);
    stopShowcase(g);
  });

  it("uses a forced act when a test asks for one", async () => {
    const g = fakeGame();
    g._showcaseForceAct = 3;
    await startShowcase(g);
    expect(g.showcaseAct).toBe(3);
    stopShowcase(g);
    expect(g.showcaseAct).toBeUndefined();
  });

  for (const act of [1, 2, 3, 4]) {
    it(`act ${act}: curated level has a long loop, idle enemies in view and a smooth heading`, async () => {
      const g = fakeGame();
      g._showcaseForceAct = act;
      await startShowcase(g);
      const map = g.map;
      expect(map).toEqual(campaignMap(getActLevel(act, showcaseLevel(act))));
      const path = g._showcase.path;
      let len = 0;
      for (let i = 0; i < path.length; i++) len += Math.hypot(path[(i + 1) % path.length].x - path[i].x, path[(i + 1) % path.length].y - path[i].y);
      expect(len).toBeGreaterThan(60);

      const enemies = g.entities.filter((e) => e.type === "enemy");
      expect(enemies.length).toBeGreaterThanOrEqual(3);
      const samples = Array.from({ length: 400 }, (_, i) => samplePath(path, i / 400));
      for (const e of enemies) {
        expect(e.state).toBe("idle");
        expect(open(map, e.x, e.y)).toBe(true);
        const nearest = Math.min(...samples.map((s) => Math.hypot(s.x - e.x, s.y - e.y)));
        expect(nearest, e.enemyType).toBeGreaterThan(1.2); // never on the camera's line
        expect(samples.some((s) => hasLineOfSight(map.grid, s, e))).toBe(true);
      }
      // The level's own props dress the scene.
      expect(g.entities.some((e) => e.type === "prop")).toBe(true);

      // One full loop at 60 fps: the camera stays in the open and never whips round.
      const dt = 1 / 60;
      let prev = g.player.angle;
      let worst = 0;
      for (let i = 0; i < LOOP_SECONDS * 60; i++) {
        updateShowcase(g, dt);
        expect(open(map, g.player.x, g.player.y)).toBe(true);
        worst = Math.max(worst, Math.abs(wrap(g.player.angle - prev)) / dt);
        prev = g.player.angle;
      }
      expect(worst).toBeLessThan(1.4); // rad/s
      stopShowcase(g);
    });
  }

  it("frames the subject left of the side panel", async () => {
    const g = fakeGame();
    await startShowcase(g);
    for (let i = 0; i < 300; i++) updateShowcase(g, 1 / 60, { panelFrac: 0 });
    const centred = g.player.angle;
    stopShowcase(g);
    const g2 = fakeGame();
    await startShowcase(g2);
    for (let i = 0; i < 300; i++) updateShowcase(g2, 1 / 60, { panelFrac: 0.32 });
    // Turned right of the path, so the path's heading sits left of centre.
    expect(wrap(g2.player.angle - centred)).toBeGreaterThan(0.1);
    stopShowcase(g2);
  });
});
