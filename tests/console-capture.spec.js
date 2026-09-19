import { test, expect } from "@playwright/test";
import { loadGame } from "./helpers.js";

test("capture all failures", async ({ page }) => {
  const logs = [];
  page.on("console", (msg) => logs.push(msg.text()));
  await loadGame(page);

  // Run all validation suites
  for (const suite of ["data", "maps", "balance", "states"]) {
    await page.evaluate((s) => window.ccTest.validate(s), suite);
  }

  const failures = logs.filter((l) => l.includes("❌"));
  console.log("SUITE FAILURES:", JSON.stringify(failures, null, 2));
  expect(failures.length).toBe(0);
});
