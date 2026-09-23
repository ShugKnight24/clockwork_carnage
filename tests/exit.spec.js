/** The level exit was the last world entity with no Modern art path. */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

test("the airlock has a Modern sprite and still completes the level", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startCampaign", 0);
  await debug(page, "godMode", true);
  await debug(page, "killAll");

  const hasSprite = await page.evaluate(async () => {
    const m = await import("/src/rendering/svg-art/sprites/pickups.js");
    const s = m.PICKUP_SPRITES.exit;
    return !!s && Array.isArray(s.layers) && s.layers.length >= 3;
  });
  expect(hasSprite).toBe(true);

  await page.evaluate(() => {
    const g = window.ccDebug.game;
    const e = g.entities.find((x) => x.type === "exit");
    let y = e.y;
    while (y < e.y + 8 && g.map.grid[Math.floor(y + 1)]?.[Math.floor(e.x)] === 0) y += 1;
    g.player.x = e.x;
    g.player.y = y;
    g.player.angle = -Math.PI / 2;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "screenshots/airlock-modern.png" });

  // Walking into it still ends the level.
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    const e = g.entities.find((x) => x.type === "exit");
    g.player.x = e.x;
    g.player.y = e.y;
  });
  await page.waitForTimeout(600);
  expect(await debug(page, "getState")).toBe("levelComplete");
});
