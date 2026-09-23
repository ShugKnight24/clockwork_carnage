/** Gear drops: a kill can drop a piece, picking it up unlocks it for good. */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

test("a dropped piece is granted, announced and kept", async ({ page }) => {
  // addInitScript runs on every navigation, so guard it — the reload below is
  // the whole point of the test and must not wipe the store it is checking.
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("cc_test_cleared")) {
        localStorage.clear();
        sessionStorage.setItem("cc_test_cleared", "1");
      }
    } catch (_) {}
  });
  await loadGame(page);
  await debug(page, "startCampaign", 0);
  await debug(page, "godMode", true);
  await page.waitForTimeout(900);

  const before = await page.evaluate(async () => {
    const m = await import("/src/systems/unlocks.js");
    const g = window.ccDebug.game;
    const locked = m.lockedItems(m.gameUnlockContext(g, { fresh: true }));
    return { lockedCount: locked.length, first: locked[0] };
  });
  expect(before.lockedCount).toBeGreaterThan(0);

  // Force a drop next to the player, then walk onto it.
  const result = await page.evaluate(async () => {
    const { Pickup } = await import("/js/entities.js");
    const m = await import("/src/systems/unlocks.js");
    const g = window.ccDebug.game;
    const pick = m.lockedItems(m.gameUnlockContext(g, { fresh: true }))[0];
    const entry = m.LOCKABLE[pick.key];
    g.entities.push(new Pickup(g.player.x + 0.3, g.player.y, "gear", {
      slot: pick.key, slotIndex: pick.index,
      label: entry.table[pick.index].name, kind: entry.kind,
    }));
    await new Promise((r) => setTimeout(r, 700));
    const ctx = m.gameUnlockContext(g, { fresh: true });
    return {
      granted: m.unlockState(pick.key, pick.index, ctx).unlocked,
      stillLocked: m.lockedItems(ctx).length,
      gearFound: g.achievementStats.gearFound,
      toast: !!document.querySelector("unlock-toast"),
      picked: pick,
    };
  });

  expect(result.granted).toBe(true);
  expect(result.stillLocked).toBe(before.lockedCount - 1);
  expect(result.gearFound).toBe(1);
  expect(result.toast).toBe(true);

  // Survives a reload: ownership lives in the unlock store, not the run.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.ccDebug != null);
  const after = await page.evaluate(async (pick) => {
    const m = await import("/src/systems/unlocks.js");
    const g = window.ccDebug.game;
    return m.unlockState(pick.key, pick.index, m.gameUnlockContext(g, { fresh: true })).unlocked;
  }, result.picked);
  expect(after).toBe(true);
});
