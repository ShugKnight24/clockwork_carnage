import { defineConfig } from "@playwright/test";
import base from "./playwright.config.js";

// The game as GitHub Pages serves it (tests/pages/server.mjs): unbundled
// source under /clockwork_carnage/, no Vite. Catches what only breaks there,
// like asset paths that assume the dev server's root.
const PORT = Number(process.env.CC_PAGES_PORT ?? 4455);

export default defineConfig({
  ...base,
  testDir: "./tests/pages",
  testIgnore: [],
  // Chromium only. The base projects carry their own testIgnore (which skips
  // tests/pages/) and a WebKit project scoped to the dev-server specs.
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  use: { ...base.use, baseURL: `http://localhost:${PORT}/clockwork_carnage/` },
  // Its own folders, so running it after the dev-server specs (as CI does)
  // doesn't wipe their failure screenshots and report.
  outputDir: "test-results-pages",
  reporter: [["html", { outputFolder: "playwright-report-pages", open: "never" }], ["list"]],
  webServer: {
    command: `node tests/pages/server.mjs ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
