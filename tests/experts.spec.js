/**
 * Expert Review Tests — Industry professionals roasting the game.
 *
 * Each test runs one expert's automated audit against the live game
 * and reports structured findings with severity ratings.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug, screenshot } from "./helpers.js";

// ── Helper: run an expert audit inside the page context ──
async function runExpert(page, auditFn, ...extraArgs) {
  return page.evaluate(
    ({ fn, args }) => {
      // The experts module is loaded via dynamic import
      const mod = window._ccExperts;
      if (!mod) throw new Error("Experts module not loaded");
      return mod[fn](
        ...args.map((a) => {
          if (a === "__GAME__") return window._ccGame;
          if (a === "__DOM__") return document;
          return a;
        }),
      );
    },
    { fn: auditFn, args: extraArgs },
  );
}

test.describe("Expert Reviews", () => {
  // Load the experts module before each test
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
    // Inject the experts module into the page
    await page.evaluate(async () => {
      const mod = await import("/js/testing/experts.js");
      window._ccExperts = mod;
      window._ccGame = window.ccDebug; // experts use the debug bridge as game interface
    });
  });

  test("UX Designer audit", async ({ page }) => {
    const result = await page.evaluate(() => {
      return window._ccExperts.auditUX(null, document);
    });

    console.log(`\n🎨 UX DESIGNER — ${result.findings.length} findings`);
    for (const f of result.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-ux-title");

    // Navigate to mode select for more surface area
    await page.click("#titleScreen");
    await page.waitForSelector("#modeSelect", {
      state: "visible",
      timeout: 5000,
    });
    const modeResult = await page.evaluate(() => {
      return window._ccExperts.auditUX(null, document);
    });
    console.log(
      `\n🎨 UX DESIGNER (Mode Select) — ${modeResult.findings.length} findings`,
    );
    for (const f of modeResult.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-ux-mode-select");

    // No critical UX issues should exist
    const criticals = result.findings.filter((f) => f.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  test("Accessibility Specialist audit", async ({ page }) => {
    const result = await page.evaluate(() => {
      return window._ccExperts.auditAccessibility(null, document);
    });

    console.log(`\n♿ ACCESSIBILITY — ${result.findings.length} findings`);
    for (const f of result.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-a11y");

    // Log severity breakdown
    const counts = { critical: 0, major: 0, minor: 0, nit: 0 };
    result.findings.forEach((f) => counts[f.severity]++);
    console.log(
      `\n  Summary: ${counts.critical} critical, ${counts.major} major, ${counts.minor} minor, ${counts.nit} nit`,
    );

    // No critical a11y violations
    expect(counts.critical).toBe(0);
  });

  test("Mobile Specialist audit", async ({ page }) => {
    const result = await page.evaluate(() => {
      return window._ccExperts.auditMobile(document);
    });

    console.log(`\n📱 MOBILE — ${result.findings.length} findings`);
    for (const f of result.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-mobile");
    const criticals = result.findings.filter((f) => f.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  test("Security Reviewer audit", async ({ page }) => {
    const result = await page.evaluate(() => {
      return window._ccExperts.auditSecurity(document);
    });

    console.log(`\n🔒 SECURITY — ${result.findings.length} findings`);
    for (const f of result.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-security");
    const criticals = result.findings.filter((f) => f.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  test("Game Journalist gameplay audit", async ({ page }) => {
    // Need game state for gameplay audit
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const game = window._ccGame;
      return window._ccExperts.auditGameplay(game);
    });

    console.log(`\n🎮 GAME JOURNALIST — ${result.findings.length} findings`);
    for (const f of result.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-gameplay");
    const criticals = result.findings.filter((f) => f.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  test("Performance Engineer audit", async ({ page }) => {
    // Start arena and collect frame timing data
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(300);

    // Collect 120 frames of timing data
    const frames = await page.evaluate(() => {
      return new Promise((resolve) => {
        const data = [];
        let last = performance.now();
        let count = 0;
        function sample() {
          const now = performance.now();
          data.push({ dt: now - last });
          last = now;
          count++;
          if (count >= 120) return resolve(data);
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
    });

    const result = await page.evaluate((frameData) => {
      const game = window._ccGame;
      return window._ccExperts.auditPerformance(game, frameData);
    }, frames);

    console.log(`\n⚡ PERFORMANCE — ${result.findings.length} findings`);
    for (const f of result.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-perf");
    const criticals = result.findings.filter((f) => f.severity === "critical");
    expect(criticals).toHaveLength(0);
  });

  test("Retention Analyst audit", async ({ page }) => {
    // Start arena so game has state
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      return window._ccExperts.auditRetention(window._ccGame);
    });

    console.log(`\n📊 RETENTION — ${result.findings.length} findings`);
    for (const f of result.findings) {
      const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
        f.severity
      ];
      console.log(`  ${icon} [${f.area}] ${f.finding}`);
    }

    await screenshot(page, "expert-retention");
    // Retention findings are mostly advisory, no hard fail
  });

  test("FULL EXPERT PANEL — combined report", async ({ page }) => {
    test.setTimeout(90_000);

    // Get gameplay state
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(300);

    // Collect frames
    const frames = await page.evaluate(() => {
      return new Promise((resolve) => {
        const data = [];
        let last = performance.now();
        let count = 0;
        function sample() {
          const now = performance.now();
          data.push({ dt: now - last });
          last = now;
          count++;
          if (count >= 60) return resolve(data);
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
    });

    const summary = await page.evaluate((frameData) => {
      return window._ccExperts.runFullReview(
        window._ccGame,
        document,
        frameData,
      );
    }, frames);

    // Print the full panel report
    console.log("\n" + "═".repeat(60));
    console.log("  CLOCKWORK CARNAGE — EXPERT REVIEW PANEL");
    console.log("═".repeat(60));
    console.log(
      `  ${summary.experts} experts | ${summary.totalFindings} total findings`,
    );
    console.log(
      `  🔴 ${summary.critical} critical | 🟠 ${summary.major} major | 🟡 ${summary.minor} minor | ⚪ ${summary.nit} nit`,
    );
    console.log("─".repeat(60));

    for (const review of summary.reviews) {
      const grade =
        review.critical > 0
          ? "F"
          : review.major > 2
            ? "D"
            : review.major > 0
              ? "C"
              : review.minor > 2
                ? "B"
                : "A";
      console.log(`\n  ${grade} | ${review.expert} (${review.total} findings)`);
      for (const f of review.findings) {
        const icon = { critical: "🔴", major: "🟠", minor: "🟡", nit: "⚪" }[
          f.severity
        ];
        console.log(`    ${icon} [${f.area}] ${f.finding}`);
      }
    }

    console.log("\n" + "═".repeat(60));
    const overallGrade =
      summary.critical > 0
        ? "FAIL"
        : summary.major > 5
          ? "NEEDS WORK"
          : summary.major > 0
            ? "ACCEPTABLE"
            : "EXCELLENT";
    console.log(`  OVERALL: ${overallGrade}`);
    console.log("═".repeat(60) + "\n");

    await screenshot(page, "expert-panel-full");

    // Hard fail on critical issues only
    expect(summary.critical).toBe(0);
  });
});
