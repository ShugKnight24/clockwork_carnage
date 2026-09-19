/**
 * Campaign map integrity.
 *
 * Encodes what a level has to satisfy to be playable as authored. Reachability
 * uses the same passability the game does: floor (0) is walkable, and doors (5)
 * and secret walls (6) become floor when the player interacts with them. Nothing
 * else in the grid ever changes at runtime.
 */
import { describe, it, expect } from "vitest";
import { CAMPAIGN_LEVELS } from "../../src/data/index.js";
import { validatePropPosition } from "../../src/systems/spawner.js";

const OPENABLE = new Set([0, 5, 6]);

function reachableFrom(level) {
  const sx = Math.floor(level.playerStart.x);
  const sy = Math.floor(level.playerStart.y);
  const seen = new Set([`${sx},${sy}`]);
  const queue = [[sx, sy]];
  for (let i = 0; i < queue.length; i++) {
    const [cx, cy] = queue[i];
    for (const [nx, ny] of [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) continue;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !OPENABLE.has(level.grid[ny][nx])) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

const label = (e) => `${e.enemyType || e.type}@${Math.floor(e.x)},${Math.floor(e.y)}`;

describe.each(CAMPAIGN_LEVELS.map((level, i) => [i, level.name, level]))(
  "campaign level %i — %s",
  (_i, _name, level) => {
    const reach = reachableFrom(level);

    it("places every entity on open floor", () => {
      const inWalls = (level.entities || []).filter((e) => {
        const t = level.grid[Math.floor(e.y)]?.[Math.floor(e.x)];
        return t !== 0;
      });
      expect(inWalls.map(label)).toEqual([]);
    });

    it("lets the player reach every enemy and pickup", () => {
      const sealed = (level.entities || []).filter(
        (e) => !reach.has(`${Math.floor(e.x)},${Math.floor(e.y)}`),
      );
      expect(sealed.map(label)).toEqual([]);
    });

    it("authors the exit on reachable floor", () => {
      if (!level.exit) return; // boss level ends on the kill
      const ex = Math.floor(level.exit.x);
      const ey = Math.floor(level.exit.y);
      expect(level.grid[ey][ex], "exit tile").toBe(0);
      expect(reach.has(`${ex},${ey}`), "exit reachable").toBe(true);
    });

    it("puts every secret wall where the player can stand next to it", () => {
      // Interaction probes 0.5-1.5 tiles straight ahead, so the player has to
      // stand on reachable floor orthogonally adjacent to the secret.
      const blocked = [];
      for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
          if (level.grid[y][x] !== 6) continue;
          const standable = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
          ].some(
            ([ax, ay]) =>
              level.grid[ay]?.[ax] === 0 && reach.has(`${ax},${ay}`),
          );
          if (!standable) blocked.push(`${x},${y}`);
        }
      }
      expect(blocked).toEqual([]);
    });
  },
);

describe("runtime nudge safety net", () => {
  it("never has to fall back to a wall position", () => {
    const stranded = [];
    CAMPAIGN_LEVELS.forEach((level, i) => {
      for (const e of level.entities || []) {
        const pos = validatePropPosition(
          Math.floor(e.x),
          Math.floor(e.y),
          level.grid,
          level.width,
          level.height,
        );
        if (!pos) stranded.push(`${i}:${label(e)}`);
      }
    });
    expect(stranded).toEqual([]);
  });
});

describe("prop coverage", () => {
  it("every prop placed by a level has a renderer", async () => {
    const [{ PROP_SPRITES }, levels] = await Promise.all([
      import("../../src/rendering/svg-art/sprites/props.js"),
      import("../../src/data/levels/campaign.js"),
    ]);
    const placed = new Set();
    for (const lvl of levels.CAMPAIGN_LEVELS) {
      for (const p of lvl.props || []) placed.add(p.type);
    }
    // A prop with no sprite draws nothing and fails silently in both paths.
    const missing = [...placed].filter((t) => !PROP_SPRITES[t]);
    expect(missing).toEqual([]);
  });
});
