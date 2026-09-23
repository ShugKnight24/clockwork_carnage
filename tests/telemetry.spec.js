/**
 * Telemetry Tests — Verify telemetry collection works end-to-end.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

test.describe("Telemetry Collection", () => {
  test("collects session data during arena play", async ({ page }) => {
    await loadGame(page);

    // Start telemetry
    const sessionId = await page.evaluate(() => {
      return window.ccTelemetry.start(200); // snapshot every 200ms
    });
    expect(sessionId).toBeTruthy();

    // Play a few seconds of arena
    await debug(page, "startArena");
    await debug(page, "godMode", true);
    await page.waitForTimeout(2000);

    // Stop and get summary
    const summary = await page.evaluate(() => window.ccTelemetry.stop());

    expect(summary.sessionId).toBe(sessionId);
    expect(summary.events).toBeGreaterThan(0);
    expect(summary.snapshots).toBeGreaterThan(0);
    expect(summary.stateTransitions).toBeGreaterThan(0);
  });

  test("records state changes", async ({ page }) => {
    await loadGame(page);

    await page.evaluate(() => window.ccTelemetry.start(500));

    // Navigate through several states
    await debug(page, "startArena");
    await page.waitForTimeout(200);
    await debug(page, "showPauseMenu");
    await page.waitForTimeout(200);
    await debug(page, "showUpgradeScreen", 1000);
    await page.waitForTimeout(200);

    const summary = await page.evaluate(() => window.ccTelemetry.stop());
    expect(summary.stateTransitions).toBeGreaterThanOrEqual(3);
  });

  test("exports and clears persisted data", async ({ page }) => {
    await loadGame(page);

    // Run a quick session
    await page.evaluate(() => {
      window.ccTelemetry.start(100);
    });
    await debug(page, "startArena");
    await page.waitForTimeout(500);
    await page.evaluate(() => window.ccTelemetry.stop());

    // Export
    const exported = await page.evaluate(() => {
      const { TelemetryCollector } = window._ccTelemetryModule;
      return TelemetryCollector.exportAll();
    });
    const parsed = JSON.parse(exported);
    expect(parsed.length).toBeGreaterThan(0);

    // Clear
    await page.evaluate(() => {
      const { TelemetryCollector } = window._ccTelemetryModule;
      TelemetryCollector.clearAll();
    });
    const afterClear = await page.evaluate(() => {
      const { TelemetryCollector } = window._ccTelemetryModule;
      return TelemetryCollector.exportAll();
    });
    expect(JSON.parse(afterClear)).toHaveLength(0);
  });

  test("aggregate stats work across sessions", async ({ page }) => {
    await loadGame(page);

    // Run two quick sessions
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.ccTelemetry.start(100));
      await debug(page, "startArena");
      await page.waitForTimeout(300);
      await page.evaluate(() => window.ccTelemetry.stop());
    }

    const aggregate = await page.evaluate(() => {
      const { TelemetryCollector } = window._ccTelemetryModule;
      return TelemetryCollector.getAggregate();
    });

    expect(aggregate).toBeTruthy();
    expect(aggregate.sessions).toBeGreaterThanOrEqual(2);

    // Clean up
    await page.evaluate(() => {
      const { TelemetryCollector } = window._ccTelemetryModule;
      TelemetryCollector.clearAll();
    });
  });
});
