/** Each loadout class should read on the model, not only in the stat panel. */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

const CLASSES = ["recruit", "gunslinger", "enforcer", "phantom", "breacher", "marksman", "saboteur", "corpsman"];

for (const id of CLASSES) {
  test(`class ${id}`, async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await loadGame(page);
    await debug(page, "showCharacterCreate");
    await page.waitForTimeout(700);
    await page.evaluate(async (cid) => {
      const g = window.ccDebug.game;
      const m = await import("/src/systems/unlocks.js");
      for (const it of m.lockedItems(m.gameUnlockContext(g, { fresh: true }))) m.grantOwned(it.key, it.index);
      const d = await import("/src/data/cosmetics.js");
      g.character.loadoutIndex = Math.max(0, d.LOADOUT_CLASSES.findIndex((c) => c.id === cid));
      g.character.armorIndex = 0;
      const el = document.querySelector("agent-showroom");
      if (el?.isOpen) el.renderAll();
    }, id);
    await page.waitForTimeout(800);
    await page.locator("agent-showroom").screenshot({ path: `screenshots/class-${id}.png` });
  });
}

test("every class starts a run with its own kit", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await loadGame(page);
  const out = await page.evaluate(async () => {
    const d = await import("/src/data/cosmetics.js");
    const g = window.ccDebug.game;
    const rows = [];
    for (let i = 0; i < d.LOADOUT_CLASSES.length; i++) {
      g.character.loadoutIndex = i;
      window.ccDebug.startArena();
      rows.push({
        id: d.LOADOUT_CLASSES[i].id,
        weapons: [...g.player.weapons],
        maxHealth: g.player.maxHealth,
        regen: g.player.regenRate,
        chrono: g.player.maxChronoEnergy,
      });
    }
    return rows;
  });
  console.log("CLASS KITS", JSON.stringify(out, null, 1));
  const corpsman = out.find((r) => r.id === "corpsman");
  expect(corpsman.regen).toBeGreaterThan(0);
  const marksman = out.find((r) => r.id === "marksman");
  expect(marksman.weapons).toContain(5);
  // Distinct opening kits are the point of the roles; a Set has size, not length.
  expect(new Set(out.map((r) => r.weapons.join(","))).size).toBeGreaterThanOrEqual(4);
});
