/**
 * Playtest Gate — three automated players probe every core mode for blockers.
 *
 * This is a release gate, not a balance test. It fails when a mode cannot be
 * entered, cannot make progress, strands the player, or lands in invalid state.
 */
import { test, expect } from "@playwright/test";
import { loadGame, screenshot } from "./helpers.js";

test.describe("Three-Player Playtest Gate", () => {
  test("core modes stay playable and progressable", async ({ page }) => {
    test.setTimeout(240_000);

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await loadGame(page);
    const report = await page.evaluate(() =>
      window.ccTest.gate({
        players: ["scout", "striker", "gremlin"],
        modes: ["tutorial", "campaign", "arena", "meltdown", "builder", "customize"],
        maxTicksPerScenario: 22_000,
        stuckTicks: 900,
        sampleEvery: 120,
      }),
    );

    if (!report.ok) await screenshot(page, "playtest-gate-failure");

    expect(pageErrors, pageErrors.join("\n")).toHaveLength(0);
    expect(report.ok, JSON.stringify(report.failures, null, 2)).toBe(true);
  });
});
