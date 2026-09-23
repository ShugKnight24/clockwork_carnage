/**
 * Renders the PNG app icons (install icons, home-screen icons) from the brand
 * SVGs, which build-brand.mjs writes. PNGs are only needed where platforms do
 * not take SVG: the web manifest's install icons and Apple's touch icon.
 * Run after build-brand: node scripts/brand/render-icons.mjs
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BRAND = path.resolve("assets/brand");
const OUT = path.join(BRAND, "icons");
fs.mkdirSync(OUT, { recursive: true });

// The twin-C mark on its Comic ground: at app-icon size both Cs read, and
// Comic is the default art style.
const src = fs.readFileSync(path.join(BRAND, "comic/mark-twin-tile.svg"), "utf8");
const CREAM = "#f3e9cf";

const ICONS = [
  { file: "icon-192.png", size: 192, inset: 0 },
  { file: "icon-512.png", size: 512, inset: 0 },
  // Maskable icons are cropped to a circle or squircle by the OS; keep the
  // mark inside the central 80% safe zone and fill the rest with the ground.
  { file: "icon-maskable-512.png", size: 512, inset: 0.12 },
  { file: "apple-touch-icon.png", size: 180, inset: 0.04 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, inset } of ICONS) {
  const pad = Math.round(size * inset);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${CREAM}">` +
      `<div style="width:${size}px;height:${size}px;box-sizing:border-box;padding:${pad}px">` +
      `<img style="width:100%;height:100%;display:block" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}">` +
      `</div></body></html>`,
  );
  await page.waitForFunction(() => document.images[0]?.complete);
  await page.screenshot({ path: path.join(OUT, file), omitBackground: false });
}
await browser.close();
console.log(`icons written to ${path.relative(process.cwd(), OUT)}`);
