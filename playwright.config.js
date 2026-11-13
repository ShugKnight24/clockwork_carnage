import { defineConfig, devices } from "@playwright/test";
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

// tests/unit/ holds vitest specs. Playwright globbed them too, so a bare
// `npx playwright test` (what `npm test` runs) crashed on the vitest expect
// symbol before reaching a single browser test.
// tests/pages/ runs against the Pages-style server (playwright.pages.config.js).
const IGNORED = ["**/unit/**", "**/pages/**"];

// Visual-only specs: they capture screenshots for a look by eye and assert
// little or nothing. They run on demand (npm run test:visual) and nightly,
// never by accident in a plain `npx playwright test`.
const VISUAL_SPECS = ["**/screenshots.spec.js", "**/level-looks.spec.js"];
const visual = process.env.CC_VISUAL === "1";

export default defineConfig({
  testDir: "./tests",
  testIgnore: IGNORED,
  // A CI runner has no GPU and draws the game a few frames a second, and the
  // specs wait on game time (helpers.js play), so the same test takes several
  // times as long there.
  timeout: process.env.CI ? 180_000 : 60_000,
  // One retry on CI absorbs a timing flake on a busy runner; the report
  // still marks the test flaky.
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
    // Plain headless Chromium has no WebGL at all, so the Forge (WebGL2) and
    // the renderer's GL hybrid path would never run under test.
    // CC_SOFTWARE_GL=1 renders in software (SwiftShader), as a CI runner with
    // no GPU does, to reproduce its frame rate locally.
    launchOptions: {
      args: process.env.CC_SOFTWARE_GL === "1"
        ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
        : ["--use-gl=angle", "--enable-gpu"],
    },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    // Opt-in only: a server already on the port may be another app or another
    // checkout, and the specs would pass or fail against the wrong code.
    reuseExistingServer: process.env.CC_REUSE_SERVER === "1",
    timeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
      // A project's testIgnore replaces the top-level one, so repeat it.
      testIgnore: visual ? IGNORED : [...IGNORED, ...VISUAL_SPECS],
    },
    {
      // The phone players actually use: WebKit with touch, held sideways.
      // Only the boot paths run here (smoke and cold-start); the rest leans on
      // Chromium's GL flags and the debug bridge, and headless WebKit stalls in
      // some of the heavier art builds, so cinematics stay on Chromium.
      name: "webkit-iphone",
      use: {
        ...devices["iPhone 15 Pro landscape"],
        // devices[] carries a WebKit UA but the Chromium GL flags above are
        // Chromium-only; WebKit rejects unknown launch args.
        launchOptions: {},
      },
      testMatch: ["**/smoke.spec.js", "**/cold-start.spec.js"],
    },
  ],
  outputDir: "test-results",
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
});
