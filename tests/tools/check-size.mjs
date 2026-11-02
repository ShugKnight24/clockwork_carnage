#!/usr/bin/env node
// npm run check:size — run after `npm run build`. Prints every JS chunk in
// dist/assets, largest first, and fails when their total passes the budget.
//
// The budget sits about 10% over the size when it was set, so ordinary work
// fits and a sudden jump (a library pulled into the boot path, a data table
// inlined twice) does not slip through. Raise it on purpose, in its own
// commit, when growth is intended.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// 2026-11-02: 3,308,951 bytes of JS. Budget = that + 10%, rounded up.
const BUDGET = 3_640_000;

const dir = join(process.cwd(), "dist", "assets");
let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`No ${dir}: run npm run build first.`);
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(1).padStart(8)} KB`;
const sizes = files.map((f) => [f, statSync(join(dir, f)).size]).sort((a, b) => b[1] - a[1]);
const total = sizes.reduce((s, [, n]) => s + n, 0);
for (const [f, n] of sizes) console.log(`${kb(n)}  ${f}`);
console.log(`\n${kb(total)}  total JS in ${sizes.length} files (${total.toLocaleString("en-US")} bytes)`);
console.log(`${kb(BUDGET)}  budget (${((total / BUDGET) * 100).toFixed(1)}% used)`);
if (total > BUDGET) {
  console.error(`\nOver budget by ${(total - BUDGET).toLocaleString("en-US")} bytes.`);
  process.exit(1);
}
