#!/usr/bin/env node
// npm run validate:maps — every campaign map (all 29, as the acts prepare
// them) and the tutorial: grid dimensions, the start and every entity on open
// floor, the exit reachable. Exits non-zero on any problem, for CI.
import { campaignMaps, TUTORIAL_MAP } from "../../src/data/index.js";
import { mapProblems } from "./map-checks.js";

const maps = [...campaignMaps().map((m, i) => [`campaign ${i}`, m]), ["tutorial", TUTORIAL_MAP]];
let bad = 0;
for (const [where, map] of maps) {
  const problems = mapProblems(map);
  const exit = map.exit ? "" : " (no exit: ends on a kill or a script)";
  if (problems.length) {
    bad++;
    console.log(`✗ ${where} — ${map.name}`);
    for (const p of problems) console.log(`    ${p}`);
  } else {
    console.log(`✓ ${where} — ${map.name} ${map.width}×${map.height}${exit}`);
  }
}
console.log(`\n${maps.length - bad}/${maps.length} maps valid`);
process.exitCode = bad ? 1 : 0;
