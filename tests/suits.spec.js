/** Full-look captures: each new suit with its matching helmet and pauldrons. */
import { test } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

const LOOKS = [
  { name: "standard", armor: "standard", helmet: "standard", shoulder: "pads", visor: "standard" },
  { name: "howitzer", armor: "howitzer", helmet: "ordnance", shoulder: "ordnance", visor: "slit" },
  { name: "breaker", armor: "trencher", helmet: "bucket", shoulder: "slab", visor: "slit" },
  { name: "reliquary", armor: "reliquary", helmet: "crusader", shoulder: "dome", visor: "glow" },
  { name: "pathfinder", armor: "pathfinder", helmet: "sealed", shoulder: "layered", visor: "fullface" },
];

for (const look of LOOKS) {
  test(`look ${look.name}`, async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
    await loadGame(page);
    await debug(page, "showCharacterCreate");
    await page.waitForTimeout(700);
    await page.evaluate(async (l) => {
      const g = window.ccDebug.game;
      const m = await import("/src/systems/unlocks.js");
      for (const it of m.lockedItems(m.gameUnlockContext(g, { fresh: true }))) m.grantOwned(it.key, it.index);
      const d = await import("/src/data/cosmetics.js");
      const idx = (table, id) => Math.max(0, table.findIndex((t) => t.id === id));
      g.character.armorIndex = idx(d.ARMOR_STYLES, l.armor);
      g.character.helmetIndex = idx(d.HELMET_STYLES, l.helmet);
      g.character.shoulderIndex = idx(d.SHOULDER_STYLES, l.shoulder);
      g.character.visorIndex = idx(d.VISOR_STYLES, l.visor);
      const el = document.querySelector("agent-showroom");
      if (el?.isOpen) el.renderAll();
    }, look);
    await page.waitForTimeout(900);
    await page.locator("agent-showroom").screenshot({ path: `screenshots/look-${look.name}.png` });
  });
}
