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
    const { Pickup } = await import("/src/entities/index.js");
    const m = await import("/src/systems/unlocks.js");
    const g = window.ccDebug.game;
    const pick = m.lockedItems(m.gameUnlockContext(g, { fresh: true }))[0];
    g.entities.push(new Pickup(g.player.x + 0.3, g.player.y, "gear", {
      slot: pick.key, pieceId: pick.id,
      label: m.itemOf(pick.key, pick.id).name, kind: m.LOCKABLE[pick.key].kind,
    }));
    // Wait for the pickup frame rather than a fixed time: a slow runner can
    // take longer than a fast one to run it.
    const has = () => m.unlockState(pick.key, pick.id, m.gameUnlockContext(g, { fresh: true })).unlocked;
    for (const end = performance.now() + 8000; !has() && performance.now() < end; ) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const ctx = m.gameUnlockContext(g, { fresh: true });
    const drop = g.entities.find((e) => e.type === "gear" && e.pieceId === pick.id);
    return {
      granted: m.unlockState(pick.key, pick.id, ctx).unlocked,
      // What the pickup saw, should it never happen.
      seen: {
        player: [g.player.x, g.player.y, g.player.z],
        drop: drop && [drop.x, drop.y, drop.z, drop.active],
        state: g.state,
      },
      stillLocked: m.lockedItems(ctx).length,
      gearFound: g.achievementStats.gearFound,
      toast: !!document.querySelector("unlock-toast"),
      picked: pick,
    };
  });

  expect(result.granted, JSON.stringify(result.seen)).toBe(true);
  expect(result.stillLocked).toBe(before.lockedCount - 1);
  expect(result.gearFound).toBe(1);
  expect(result.toast).toBe(true);

  // Survives a reload: ownership lives in the unlock store, not the run.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.ccDebug != null);
  const after = await page.evaluate(async (pick) => {
    const m = await import("/src/systems/unlocks.js");
    const g = window.ccDebug.game;
    return m.unlockState(pick.key, pick.id, m.gameUnlockContext(g, { fresh: true })).unlocked;
  }, result.picked);
  expect(after).toBe(true);
});

test("a gear drop can be a frame, and a frame with stats goes on over a plain one", async ({ page }) => {
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

  // Act 1 is working towards the tier 2 theme frames: they are in the pool,
  // and a kill rolls one through the same path every drop takes.
  const result = await page.evaluate(async () => {
    const m = await import("/src/systems/unlocks.js");
    const { maybeDropGear } = await import("/src/systems/combat-orchestrator.js");
    const g = window.ccDebug.game;
    const pool = m.droppableItems(m.gameUnlockContext(g, { fresh: true }));
    const frames = pool.filter((p) => p.key === "frame").map((p) => p.id);
    const at = pool.findIndex((p) => p.key === "frame" && p.id === "clockwork");
    const rolls = [0, (at + 0.5) / pool.length];
    const random = Math.random;
    Math.random = () => (rolls.length ? rolls.shift() : random());
    let drop;
    try {
      drop = maybeDropGear(g, { x: g.player.x + 0.3, y: g.player.y, def: {}, maxHealth: 10 });
    } finally {
      Math.random = random;
    }
    const was = g.character.frame;
    const has = () => m.unlockState("frame", "clockwork", m.gameUnlockContext(g, { fresh: true })).unlocked;
    for (const end = performance.now() + 8000; !has() && performance.now() < end; ) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const ctx = m.gameUnlockContext(g, { fresh: true });
    return {
      frames,
      drop: drop && { slot: drop.slot, pieceId: drop.pieceId, label: drop.label, kind: drop.kind },
      was,
      now: g.character.frame,
      granted: m.unlockState("frame", "clockwork", ctx).unlocked,
      stillDroppable: m.droppableItems(ctx).some((p) => p.key === "frame" && p.id === "clockwork"),
      exoDroppable: m.droppableItems(ctx).some((p) => p.key === "frame" && p.id === "exo"),
      gearFound: g.achievementStats.gearFound,
    };
  });

  // Act 1 works towards the Act 1 frames only: the Diver opens with Act 2, the Exo-Frame with Act 4.
  expect(result.frames).toEqual(expect.arrayContaining(["clockwork", "duster", "lamellar"]));
  expect(result.frames).not.toContain("diving");
  expect(result.frames).not.toContain("exo");
  expect(result.drop).toEqual({ slot: "frame", pieceId: "clockwork", label: "Clockwork", kind: "Frame" });
  expect(result.granted).toBe(true);
  expect(result.stillDroppable).toBe(false);
  expect(result.exoDroppable).toBe(false);
  // The stock frame carries no stats, so the dropped one goes on.
  expect(result.was).toBe("standard");
  expect(result.now).toBe("clockwork");
  expect(result.gearFound).toBe(1);
});
