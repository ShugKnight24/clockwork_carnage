// ESLint flat config. `npm run lint`, and a CI step.
//
// @eslint/js recommended, held to what the code already passes: the rules
// that would need a sweep across many files (unused names, empty catch
// blocks, and so on) warn instead of fail, so the lint step catches new real
// errors (undefined names, unreachable code, duplicate keys) without a
// mass rewrite. Tighten a rule back to "error" once its warnings are gone.
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    // Build output, browsers, reports, and the untracked local folders
    // (.gitignore): only tracked source is linted.
    ignores: [
      "dist/**",
      "node_modules/**",
      ".playwright/**",
      ".playwright-mcp/**",
      "playwright-report/**",
      "test-results/**",
      "screenshots/**",
      "coverage/**",
      "archive/**",
      "prototypes/**",
      "scratch/**",
      "tools/**",
      "telemetry/**",
      "simulations/**",
      "js/editor/**",
      "scripts/*",
      "!scripts/brand/",
      "!scripts/reel/",
      "!scripts/bench.mjs",
      "!scripts/release-playtest.mjs",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-useless-assignment": "warn",
      "preserve-caught-error": "off",
      // js/cutscene.js strips ANSI escapes on purpose.
      "no-control-regex": "warn",
    },
  },
  {
    // Google Analytics' globals, defined by the gtag snippet it loads.
    files: ["js/analytics.js"],
    languageOptions: { globals: { dataLayer: "writable", gtag: "readonly" } },
  },
  {
    files: ["js/net/server.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Node-side code: configs, tooling, the scripts, and the test files
    // (Playwright specs also run callbacks in the page, hence browser too).
    files: ["*.config.js", "tests/**", "scripts/**"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        // Page globals that page.evaluate callbacks reach without window.
        ccDebug: "readonly",
        ccTest: "readonly",
        __snap: "writable",
        __diff: "writable",
      },
    },
  },
];
