/** One screenshot per campaign level, same spot each time, to compare looks. */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

const NAMES = [
  "0-entry", "1-checkpoint", "2-research", "3-containment",
  "4-server-farm", "5-reactor", "6-lab", "7-nexus", "8-paradox",
];

for (let i = 0; i < NAMES.length; i++) {
  test(`level ${NAMES[i]}`, async ({ page }) => {
    await loadGame(page);
    await debug(page, "startCampaign", i);
    await debug(page, "godMode", true);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/look-${NAMES[i]}.png` });
  });
}

// Low cover used to end the ray: the view over level 1's waist-high counter
// (row 49, six blocks ahead of the spawn) showed only floor and ceiling.
test("level 1 spawn: walls and enemies show over low cover", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startCampaign", 0);
  await debug(page, "godMode", true);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const d = window.ccDebug;
    const g = d.game;
    const R = g.renderer;
    d.slowmo(0.01);
    d.teleport(29.5, 55.5);
    g.player.angle = -Math.PI / 2;
    g.player.crouchBlend = 0;
    // Park an enemy behind the counter, dead ahead.
    const e = g.entities.find((en) => en.type === "enemy" && en.active);
    e.x = 29.5;
    e.y = 47.5;
    e.speed = 0;
    d.forceRender();
    const x = R.width >> 1;
    return {
      counterRow: g.map.heightMap[49].slice(27, 33),
      shortWalls: R._occN[x],
      depth: R.zBuffer[x],
      enemyDepth: 55.5 - 47.5,
      enemyClip: R.coverClipY(x, 55.5 - 47.5),
      height: R.height,
    };
  });
  await page.screenshot({ path: "screenshots/look-0-entry-low-cover.png" });
  expect(r.counterRow).toEqual([2, 2, 2, 2, 2, 2]);
  // The ray crosses the counter and ends at the far wall behind it.
  expect(r.shortWalls).toBe(1);
  expect(r.depth).toBeGreaterThan(r.enemyDepth);
  // The enemy behind the counter is cut at the counter's top, below the
  // horizon, so its upper body shows.
  expect(r.enemyClip).toBeGreaterThan(r.height / 2);
  expect(r.enemyClip).toBeLessThan(r.height);
});
