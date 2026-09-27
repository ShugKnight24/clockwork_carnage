#!/usr/bin/env node
/**
 * Run the in-game benchmark (js/testing/bench.js) in a real browser window and
 * save the report. Headed by default: a headless browser may not use the GPU,
 * and the GPU is usually what a slow machine is short of.
 *
 *   npm run bench                           local dev server (CC_TEST_PORT, default 5173)
 *   npm run bench -- --live                 the GitHub Pages build
 *   npm run bench -- --url <url>            any deployment
 *   npm run bench -- --art 2 --fixed        Modern, render scale held at 1
 *   npm run bench -- --chrome               the installed Google Chrome, not Playwright's Chromium
 *   npm run bench -- --headless             no window (CPU numbers only; GPU may be software)
 *   npm run bench -- --out report.json      where to write (default bench-results/<host>-<time>.json)
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import path from "node:path";

const LIVE = "https://shugknight24.github.io/clockwork_carnage/";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const base = opt("url") ?? (flag("live") ? LIVE : `http://localhost:${process.env.CC_TEST_PORT ?? 5173}/`);
const url = new URL(base);
url.searchParams.set("bench", "");
if (flag("fixed")) url.searchParams.set("fixed", "");
if (opt("art") != null) url.searchParams.set("art", opt("art"));

const browser = await chromium.launch({
  headless: flag("headless"),
  channel: flag("chrome") ? "chrome" : undefined,
  args: ["--use-gl=angle", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: null });
page.on("pageerror", (e) => console.error("[page error]", e.message));

console.log(`Benchmark: ${url.href}`);
await page.goto(url.href);
const report = await page
  .waitForFunction(() => window.ccBenchResult, null, { timeout: 180_000, polling: 500 })
  .then((h) => h.jsonValue());
await browser.close();

if (report.error) {
  console.error("Benchmark failed:", report.error);
  process.exit(1);
}

const out =
  opt("out") ??
  path.join("bench-results", `${hostname().replace(/\W+/g, "-")}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2));

const e = report.env;
console.log(`${e.gpu?.renderer ?? "unknown GPU"} · ${e.cores} cores · ${e.viewport.join("x")} @${e.dpr}x · ${e.rendererPath} · display ${(1000 / report.refreshMs).toFixed(0)} Hz`);
console.table(
  Object.fromEntries(
    report.phases.map((p) => [
      p.label,
      { fps: p.fps, p50: p.p50, p95: p.p95, p99: p.p99, max: p.max, ">33ms": p.over33, long: p.longTasks, cpuMs: +(p.cpuUpdateMs + p.cpuRenderMs).toFixed(1), scale: +(p.renderScale[1] ?? 1).toFixed(2) },
    ]),
  ),
);
console.log(`Saved ${out}`);
