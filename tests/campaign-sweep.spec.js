/**
 * Campaign fighting sweep (js/testing/campaign-sweep.js): the bot plays all
 * 29 campaign levels for real, seeds × head/body aim, retrying on death.
 *
 * Long (a few minutes) and meant for a nightly, so it is skipped unless
 * CC_SWEEP=1: `npm run test:sweep`. CC_SWEEP_SEEDS (default 5) sets how
 * many seeds.
 *
 * It fails on what makes a level unwinnable, not on difficulty: an attempt
 * that got stuck or ran out of time (a soft lock, an unreachable exit or
 * objective), a page error, or a level that cannot be cleared even with
 * unlimited HP.
 * The per-level table is printed and attached either way.
 */
import { test, expect } from "@playwright/test";
import { loadGame } from "./helpers.js";

const SEEDS = Number(process.env.CC_SWEEP_SEEDS ?? 5);
const RUNS = [];
for (const aim of ["head", "body"]) for (let seed = 1; seed <= SEEDS; seed++) RUNS.push({ seed, aim });

test.describe("Campaign fighting sweep", () => {
  test.skip(!process.env.CC_SWEEP, "nightly only: set CC_SWEEP=1 (npm run test:sweep)");
  test.describe.configure({ mode: "serial" });

  const results = [];

  for (const opts of RUNS) {
    test(`plays every level: seed ${opts.seed}, ${opts.aim} aim`, async ({ page }) => {
      test.setTimeout(10 * 60_000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await loadGame(page);
      await page.waitForFunction(() => window.ccTest != null, { timeout: 10_000 });
      const res = await page.evaluate((o) => window.ccTest.sweep(o), opts);
      results.push(res);
      expect(res.error, "sweep threw").toBeUndefined();
      expect(errors, "page errors").toEqual([]);
      const locked = res.levels
        .filter((L) => L.blocked === "stuck" || L.blocked === "timeout")
        .map((L) => ({ level: L.slot, ...L.attempts.at(-1) }));
      expect(locked, "levels the bot could not make progress in").toEqual([]);
    });
  }

  test("every level is won by some run", async ({ page }, info) => {
    await loadGame(page);
    await page.waitForFunction(() => window.ccTest != null, { timeout: 10_000 });
    const { rows, levels } = await page.evaluate(async (runs) => {
      const { summariseSweeps } = await import("/js/testing/campaign-sweep.js");
      const { totalLevels } = await import("/src/data/campaign/acts.js");
      return { rows: summariseSweeps(runs), levels: totalLevels() };
    }, results);
    const table = [
      "| level | map | honest | assisted | failed | avg deaths | avg time s | top killer |",
      "|---|---|---|---|---|---|---|---|",
      ...rows.map((r) => `| ${r.slot} | ${r.map} | ${r.honest}/${r.runs} | ${r.assisted} | ${r.failed} | ${r.avgDeaths} | ${r.avgTime} | ${r.topKiller} |`),
    ].join("\n");
    console.log(table);
    await info.attach("sweep-table.md", { body: table, contentType: "text/markdown" });
    await info.attach("sweep-runs.json", { body: JSON.stringify(results), contentType: "application/json" });
    expect(rows.length).toBe(levels);
    // A level no run won, not even assisted, is played once more with HP to
    // spare: if that cannot finish it either, it cannot be won.
    const unwon = rows.filter((r) => r.honest + r.assisted === 0);
    const proofs = await page.evaluate(async (slots) => {
      const out = [];
      for (const r of slots) {
        const res = await window.ccTest.sweep({ from: [r.act, r.level], to: [r.act, r.level], attempts: 0, assistHp: 1e6, levelCapS: 900, stuckS: 300 });
        out.push({ level: r.slot, cleared: !!res.levels[0]?.cleared, last: res.levels[0]?.attempts.at(-1) });
      }
      return out;
    }, unwon);
    if (proofs.length) console.log("won only with unlimited HP:", proofs.filter((x) => x.cleared).map((x) => x.level).join(", "));
    expect(proofs.filter((x) => !x.cleared), "levels that cannot be won").toEqual([]);
  });
});
