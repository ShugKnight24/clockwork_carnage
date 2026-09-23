import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Keep browsers beside the repo for local runs. On CI `playwright install`
// populates the default cache, so leave that alone or chromium is not found.
const localBrowsers = path.join(__dirname, ".playwright");
if (!process.env.CI && fs.existsSync(localBrowsers)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
}

const PORT = Number(process.env.CC_TEST_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests",
  // tests/unit/ holds vitest specs. Playwright globbed them too, so a bare
  // `npx playwright test` (what `npm test` runs) crashed on the vitest expect
  // symbol before reaching a single browser test.
  testIgnore: "**/unit/**",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
    // Plain headless Chromium has no WebGL at all, so the Forge (WebGL2) and
    // the renderer's GL hybrid path would never run under test.
    launchOptions: { args: ["--use-gl=angle", "--enable-gpu"] },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  outputDir: "test-results",
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
});
