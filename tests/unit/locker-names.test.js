import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TUTORIAL_MAP } from "../../src/data/levels/tutorial.js";
import { LOCKER_BANKS, lockerAt } from "../../src/rendering/env/locker-art.js";

// The prologue's squad kits up in front of their own lockers: KIT_AT and
// SQUAD_NAMES in js/tutorial-system.js, read from its source (they aren't
// exported), against the names on the banks the locker room's map lays down.
const systemSource = readFileSync(fileURLToPath(new URL("../../js/tutorial-system.js", import.meta.url)), "utf8");
const KIT_AT = JSON.parse(systemSource.match(/const KIT_AT = (\[[^;]*\]);/)[1].replace(/,\s*\]/g, "]"));
const SQUAD_NAMES = Function(`return ${systemSource.match(/const SQUAD_NAMES = (\{[^;]*\});/)[1]}`)();

const g = TUTORIAL_MAP.grid;
const NORTH = 37;
const SOUTH = 47;

/** The lockers either side of x (two when x is on the seam between doors) on the bank a stand faces. */
function lockersFacing(x, y) {
  const row = y < 42 ? NORTH : SOUTH;
  const xs = Math.abs(x * 2 - Math.round(x * 2)) < 1e-6 ? [x - 0.01, x + 0.01] : [x];
  return xs.map((px) => lockerAt(g[row][Math.floor(px)], px, row === NORTH)).filter(Boolean);
}

describe("locker room nameplates", () => {
  const named = Object.entries(SQUAD_NAMES).map(([i, full]) => [Number(i), full.split(" ").pop().toUpperCase()]);

  it("reads the squad's stands and names from the tutorial system", () => {
    expect(KIT_AT).toHaveLength(8);
    expect(named.map(([, n]) => n).sort()).toEqual(["BRANDT", "KAEL", "OKAFOR", "RASCZAK"]);
  });

  it.each(named)("officer %i (%s) kits up at his own named locker", (i, name) => {
    const [x, y] = KIT_AT[i];
    expect(lockersFacing(x, y).map((l) => l.name)).toContain(name);
  });

  it("puts every named officer's locker in the room once", () => {
    for (const [, name] of named) {
      let cells = 0;
      for (const row of [NORTH, SOUTH]) {
        for (let c = 4; c <= 23; c++) {
          const bank = LOCKER_BANKS[g[row][c]];
          if (bank && (bank.left.name === name || bank.right.name === name)) cells++;
        }
      }
      expect(cells, name).toBe(1);
    }
  });

  it("stands nobody else in front of a named officer's locker", () => {
    const names = new Set(named.map(([, n]) => n));
    KIT_AT.forEach(([x, y], i) => {
      const own = named.find(([j]) => j === i)?.[1];
      for (const l of lockersFacing(x, y)) if (names.has(l.name)) expect(l.name).toBe(own);
    });
  });
});
