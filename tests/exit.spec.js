/**
 * The level exit: an extraction beacon, held sealed on the reactor level until
 * its power cells are found (src/systems/exit-cells.js EXIT_GATES).
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

test("the exit stays sealed until the power cells are found, then completes the level", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startCampaign", 5); // I-6 Reactor Access
  await debug(page, "godMode", true);
  await debug(page, "killAll");

  const start = await page.evaluate(() => {
    const g = window.ccDebug.game;
    const cells = g.entities.filter((x) => x.type === "powerCell");
    return { cells: cells.length, sealed: !!g.exitEntity.sealed, total: g.powerCells?.total ?? 0 };
  });
  // The reactor scrammed: two cells off the main corridor restart the lift.
  expect(start).toEqual({ cells: 2, sealed: true, total: 2 });

  // Facing the beacon from a few cells away.
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    const e = g.entities.find((x) => x.type === "exit");
    let y = e.y;
    while (y < e.y + 4 && g.map.grid[Math.floor(y + 1)]?.[Math.floor(e.x)] === 0) y += 1;
    g.player.x = e.x;
    g.player.y = y;
    g.player.angle = -Math.PI / 2;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: "screenshots/exit-beacon-sealed.png" });

  // Sealed: walking into it does not end the level.
  const goToExit = () =>
    page.evaluate(() => {
      const g = window.ccDebug.game;
      g.player.x = g.exitEntity.x;
      g.player.y = g.exitEntity.y;
    });
  await goToExit();
  await page.waitForTimeout(600);
  expect(await debug(page, "getState")).toBe("playing");

  // Pick up every cell: the seal drops.
  const cells = await page.evaluate(() => window.ccDebug.game.entities.filter((x) => x.type === "powerCell").map((c) => [c.x, c.y]));
  for (const [x, y] of cells) {
    await page.evaluate(([x, y]) => {
      const p = window.ccDebug.game.player;
      p.x = x;
      p.y = y;
    }, [x, y]);
    await page.waitForTimeout(250);
  }
  expect(await page.evaluate(() => [window.ccDebug.game.powerCells.found, window.ccDebug.game.exitEntity.sealed])).toEqual([2, false]);

  // Open: walking into it ends the level.
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    g.player.x = g.exitEntity.x + 3;
  });
  await page.waitForTimeout(200);
  await goToExit();
  await page.waitForTimeout(600);
  expect(await debug(page, "getState")).toBe("levelComplete");
});
