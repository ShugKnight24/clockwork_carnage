/**
 * Full-look captures: each new suit with its matching helmet and pauldrons.
 * Each look has to name real table entries (a missing id used to fall back to
 * the first entry silently) and the showroom has to draw a figure for it.
 */
import { test, expect } from "@playwright/test";
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
    const missing = await page.evaluate(async (l) => {
      const g = window.ccDebug.game;
      const m = await import("/src/systems/unlocks.js");
      for (const it of m.lockedItems(m.gameUnlockContext(g, { fresh: true }))) m.grantOwned(it.key, it.id);
      const d = await import("/src/data/cosmetics.js");
      const missing = [];
      const known = (table, id) => {
        if (!table.some((t) => t.id === id)) missing.push(id);
        return id;
      };
      g.character.armor = known(d.ARMOR_STYLES, l.armor);
      g.character.helmet = known(d.HELMET_STYLES, l.helmet);
      g.character.shoulder = known(d.SHOULDER_STYLES, l.shoulder);
      g.character.visor = known(d.VISOR_STYLES, l.visor);
      const el = document.querySelector("agent-showroom");
      if (el?.isOpen) el.renderAll();
      return missing;
    }, look);
    expect(missing, "look ids not in the cosmetics tables").toEqual([]);
    await page.waitForTimeout(900);
    const drawn = await page.evaluate(() => {
      const fig = document.querySelector("agent-showroom")?.shadowRoot?.querySelector(".figure");
      if (!fig) return 0;
      const r = fig.getBoundingClientRect();
      return fig.querySelectorAll("svg *, img, canvas").length && r.width > 0 && r.height > 0 ? fig.querySelectorAll("svg *, img, canvas").length : 0;
    });
    expect(drawn, "the showroom draws a figure").toBeGreaterThan(0);
    await page.locator("agent-showroom").screenshot({ path: `screenshots/look-${look.name}.png` });
  });
}
