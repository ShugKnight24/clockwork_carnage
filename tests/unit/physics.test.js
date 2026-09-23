import { describe, it, expect } from "vitest";
import { isPassable, hasLineOfSight, moveWithCollision } from "../../src/systems/physics.js";

// Simple 5x5 map: walls around edges, open center
const makeMap = (overrides = []) => {
  const grid = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];
  for (const [y, x, v] of overrides) grid[y][x] = v;
  return { width: 5, height: 5, grid };
};

describe("isPassable", () => {
  const map = makeMap();

  it("open cell → true", () => {
    expect(isPassable(map, 1, 1)).toBe(true);
    expect(isPassable(map, 2, 2)).toBe(true);
    expect(isPassable(map, 3, 3)).toBe(true);
  });

  it("wall cell → false", () => {
    expect(isPassable(map, 0, 0)).toBe(false);
    expect(isPassable(map, 4, 4)).toBe(false);
    expect(isPassable(map, 2, 0)).toBe(false);
  });

  it("out of bounds → false", () => {
    expect(isPassable(map, -1, 0)).toBe(false);
    expect(isPassable(map, 0, -1)).toBe(false);
    expect(isPassable(map, 5, 2)).toBe(false);
    expect(isPassable(map, 2, 5)).toBe(false);
  });
});

describe("hasLineOfSight", () => {
  it("clear path → true", () => {
    const map = makeMap();
    expect(hasLineOfSight(map, 1.5, 1.5, 3.5, 3.5)).toBe(true);
  });

  it("wall blocks LOS → false", () => {
    // Place wall in middle
    const map = makeMap([[2, 2, 1]]);
    expect(hasLineOfSight(map, 1.5, 1.5, 3.5, 3.5)).toBe(false);
  });

  it("same point → true", () => {
    const map = makeMap();
    expect(hasLineOfSight(map, 2.5, 2.5, 2.5, 2.5)).toBe(true);
  });

  it("adjacent cells → true when both open", () => {
    const map = makeMap();
    expect(hasLineOfSight(map, 1.5, 1.5, 2.5, 1.5)).toBe(true);
  });

  it("ray exits bounds → false", () => {
    const map = makeMap();
    expect(hasLineOfSight(map, 1.5, 1.5, -1, -1)).toBe(false);
  });
});

describe("moveWithCollision", () => {
  const map = makeMap();
  const margin = 0.2;

  it("open move → full displacement", () => {
    const result = moveWithCollision(map, 2.5, 2.5, 0.3, 0.3, margin);
    expect(result.x).toBeCloseTo(2.8);
    expect(result.y).toBeCloseTo(2.8);
  });

  it("blocked by wall → no movement", () => {
    // Try to move into top wall from (1.5, 1.3)
    const result = moveWithCollision(map, 1.5, 1.3, 0, -0.5, margin);
    expect(result.y).toBeCloseTo(1.3); // stayed
    expect(result.x).toBeCloseTo(1.5);
  });

  it("axis separation — slides along wall", () => {
    // Near top-left corner, diagonal into wall
    const result = moveWithCollision(map, 1.3, 1.3, -0.5, 0.3, margin);
    // X blocked (would go into wall), Y should still move
    expect(result.x).toBeCloseTo(1.3); // X stayed
    expect(result.y).toBeCloseTo(1.6); // Y moved
  });

  it("zero delta → same position", () => {
    const result = moveWithCollision(map, 2.5, 2.5, 0, 0, margin);
    expect(result.x).toBeCloseTo(2.5);
    expect(result.y).toBeCloseTo(2.5);
  });
});
