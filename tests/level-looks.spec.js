/** One screenshot per campaign level, same spot each time, to compare looks. */
import { test } from "@playwright/test";
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
