/** One showroom capture per armour style, to compare silhouettes. */
import { test } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

const IDS = ["standard", "recon", "heavy", "stealth", "tech", "howitzer", "trencher", "reliquary", "pathfinder"];

for (let i = 0; i < IDS.length; i++) {
  test(`armour ${IDS[i]}`, async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await loadGame(page);
    await debug(page, "showCharacterCreate");
    await page.waitForTimeout(700);
    await page.evaluate(async (idx) => {
      const g = window.ccDebug.game;
      const m = await import("/src/systems/unlocks.js");
      // Unlock everything so each suit can actually be shown.
      const ctx = m.gameUnlockContext(g, { fresh: true });
      for (const it of m.lockedItems(ctx)) m.grantOwned(it.key, it.index);
      g.character.armorIndex = idx;
      g.character.shoulderIndex = 1;
      const el = document.querySelector("agent-showroom");
      if (el?.isOpen) el.renderAll();
    }, i);
    await page.waitForTimeout(900);
    const stage = page.locator("agent-showroom");
    await stage.screenshot({ path: `screenshots/suit-${IDS[i]}.png` });
  });
}
