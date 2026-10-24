import { describe, it, expect } from "vitest";
import {
  coverClass,
  coverFace,
  findCover,
  facePoint,
  edgeAt,
  leanS,
  clampS,
  coverBlocksShot,
  coverDashTarget,
  coverViewAngle,
  flankSpot,
  boltClearsCover,
  COVER_OFFSET,
  BLIND_FIRE_MIN_CONE,
} from "../../src/systems/cover.js";
import {
  createCoverStats,
  coverPress,
  updateCover,
  coverShields,
  coverCone,
  coverDash,
  beginCoverShot,
  endCoverShot,
  noteCoverKill,
  leaveCover,
} from "../../src/systems/cover-play.js";
import { hasLineOfSight, EYE_Z, CROUCH_EYE_Z } from "../../src/systems/physics.js";
import { createGrid, createHeights, lowWall, lowTile, coverBlocks, LAYER, room } from "../../src/data/levels/map-helpers.js";

/**
 * A 24x16 room. Low (waist) cover along row 5, columns 4-6; a single low
 * block at (10, 6); a full-height pillar at column 12, rows 3-4; a knee-high
 * step at (2, 9) and a door at (8, 0).
 */
function testMap() {
  const g = createGrid(24, 16, 1);
  const hm = createHeights(24, 16);
  room(g, 0, 0, 15, 23, 1);
  lowWall(g, hm, 5, 4, 5, 6, LAYER.WAIST);
  lowTile(g, hm, 6, 10, LAYER.WAIST);
  g[3][12] = 1;
  g[4][12] = 1;
  lowTile(g, hm, 9, 2, LAYER.KNEE);
  g[0][8] = 5;
  return { width: 24, height: 16, grid: g, heightMap: hm };
}

const NORTH = -Math.PI / 2; // toward smaller y
const EAST = 0;

describe("what counts as cover", () => {
  const map = testMap();
  it("sorts cells into low and high cover", () => {
    expect(coverClass(map, 5, 5)).toBe("low");
    expect(coverClass(map, 12, 3)).toBe("high");
    expect(coverClass(map, 0, 5)).toBe("high"); // a room's wall is high cover
  });
  it("ignores floor, knee-high steps and doors", () => {
    expect(coverClass(map, 3, 3)).toBeNull();
    expect(coverClass(map, 2, 9)).toBeNull();
    expect(coverClass(map, 8, 0)).toBeNull();
    expect(coverClass(map, -1, 3)).toBeNull();
  });
  it("grows a face along a run of the same kind", () => {
    const f = coverFace(map, 5, 5, 0, 1);
    expect(f).toMatchObject({ low: true, alongX: true, kLo: 4, kHi: 6, face: 6, edgeLo: true, edgeHi: true });
    expect(f.depth).toBeCloseTo(6 + COVER_OFFSET);
  });
});

describe("finding cover in front of the player", () => {
  const map = testMap();
  it("finds the face being looked at, with the point to snap to", () => {
    const f = findCover(map, 5.5, 6.9, NORTH);
    expect(f).toMatchObject({ cx: 5, cy: 5, nx: 0, ny: 1 });
    expect(f.x).toBeCloseTo(5.5);
    expect(f.y).toBeCloseTo(6 + COVER_OFFSET);
  });
  it("clamps the snap inside the run's ends", () => {
    const f = findCover(map, 6.95, 6.8, NORTH);
    expect(f.x).toBeCloseTo(f.sMax);
  });
  it("finds nothing looking away, or too far off", () => {
    expect(findCover(map, 5.5, 6.9, Math.PI / 2)).toBeNull();
    expect(findCover(map, 5.5, 8.6, NORTH)).toBeNull();
    expect(findCover(map, 5.5, 6.9, NORTH, 0.5)).toBeNull();
  });
  it("takes a room's wall as high cover", () => {
    const f = findCover(map, 3.5, 1.6, NORTH);
    expect(f).toMatchObject({ low: false, nx: 0, ny: 1, cy: 0 });
  });
});

describe("along the face", () => {
  const f = coverFace(testMap(), 5, 5, 0, 1);
  it("stops at the ends", () => {
    expect(clampS(f, 100)).toBe(f.sMax);
    expect(clampS(f, -100)).toBe(f.sMin);
  });
  it("knows when it is at an end it can lean round", () => {
    expect(edgeAt(f, f.sMin)).toBe(-1);
    expect(edgeAt(f, f.sMax)).toBe(1);
    expect(edgeAt(f, 5.5)).toBe(0);
    expect(leanS(f, -1)).toBeLessThan(f.kLo);
    expect(leanS(f, 1)).toBeGreaterThan(f.kHi + 1);
  });
  it("puts points on the standing line", () => {
    expect(facePoint(f, 5.2)).toEqual({ x: 5.2, y: f.depth });
  });
});

describe("blocked shots", () => {
  const f = coverFace(testMap(), 5, 5, 0, 1);
  const px = 5.5;
  const py = f.depth;
  it("stops a shot from the far side through the run", () => {
    expect(coverBlocksShot(f, px, py, 5.5, 1.5)).toBe(true);
    expect(coverBlocksShot(f, px, py, 3.5, 2.5)).toBe(true);
  });
  it("lets through a shot from behind or round the end", () => {
    expect(coverBlocksShot(f, px, py, 5.5, 10)).toBe(false);
    expect(coverBlocksShot(f, px, py, 14.5, 4.5)).toBe(false);
  });
  it("does not cover a player leaned out past the end", () => {
    expect(coverBlocksShot(f, leanS(f, -1), py, leanS(f, -1), 1.5)).toBe(false);
  });
});

describe("cover to cover", () => {
  const map = testMap();
  const here = coverFace(map, 5, 5, 0, 1);
  it("finds the next cover along the view and a clear way to it", () => {
    const t = coverDashTarget(map, 5.5, here.depth, EAST, here);
    expect(t).toMatchObject({ cx: 10, cy: 6, nx: -1, ny: 0 });
    expect(t.x).toBeCloseTo(10 - COVER_OFFSET);
  });
  it("finds nothing too far or with no cover in view", () => {
    expect(coverDashTarget(map, 5.5, here.depth, Math.PI / 2, here)).toBeNull();
    expect(coverDashTarget(map, 5.5, here.depth, EAST, here, 2)).toBeNull();
  });
  it("never offers the face the player is already on", () => {
    expect(coverDashTarget(map, 5.5, here.depth, NORTH, here)).toBeNull();
  });
});

describe("the view after snapping", () => {
  const map = testMap();
  it("keeps the view over low cover", () => {
    expect(coverViewAngle(coverFace(map, 5, 5, 0, 1), 5.5, 1.23)).toBe(1.23);
  });
  it("turns along high cover toward its open end, angled past the wall", () => {
    // The pillar's west face: the open ends are north (y 3) and south (y 5).
    const f = coverFace(map, 12, 3, -1, 0);
    expect(f.edgeLo && f.edgeHi).toBe(true);
    const a = coverViewAngle(f, f.sMin, 0);
    // Toward -y (the nearer end) and +x (past the wall).
    expect(Math.sin(a)).toBeLessThan(0);
    expect(Math.cos(a)).toBeGreaterThan(0);
  });
});

describe("flanking a player in cover", () => {
  it("picks open floor with sight of the crouched player, not the blocked front", () => {
    const map = testMap();
    const f = coverFace(map, 5, 5, 0, 1);
    const player = { x: 5.5, y: f.depth };
    const enemy = { x: 5.5, y: 2.5 };
    expect(hasLineOfSight(map, enemy.x, enemy.y, player.x, player.y, EYE_Z, CROUCH_EYE_Z)).toBe(false);
    const spot = flankSpot(map, player, CROUCH_EYE_Z, enemy);
    expect(spot).not.toBeNull();
    expect(hasLineOfSight(map, spot.x, spot.y, player.x, player.y, EYE_Z, CROUCH_EYE_Z)).toBe(true);
    // Given the face, it comes round to the player's side of the cover.
    const round = flankSpot(map, player, CROUCH_EYE_Z, enemy, f);
    expect(round.y).toBeGreaterThan(f.face);
    expect(coverBlocksShot(f, player.x, player.y, round.x, round.y)).toBe(false);
  });
});

describe("bolts and low cover", () => {
  const map = testMap();
  it("lets a player's bolt from cover fly over the block it was fired across", () => {
    const bolt = { owner: "player", _overCover: true, x: 5.5, y: 5.6, originX: 5.5, originY: 6.3 };
    expect(boltClearsCover(bolt, map, 5, 5, null)).toBe(true);
    expect(boltClearsCover({ ...bolt, _overCover: false }, map, 5, 5, null)).toBe(false);
  });
  it("lets an enemy bolt over only while the player stands up over that block", () => {
    const f = coverFace(map, 5, 5, 0, 1);
    const player = { x: 5.5, y: f.depth, cover: { face: f }, coverPeeking: true };
    const bolt = { owner: "enemy", x: 5.5, y: 5.5 };
    expect(boltClearsCover(bolt, map, 5, 5, player)).toBe(true);
    expect(boltClearsCover(bolt, map, 5, 5, { ...player, coverPeeking: false })).toBe(false);
  });
  it("never lets a bolt through a full wall", () => {
    const bolt = { owner: "player", _overCover: true, x: 12.5, y: 3.5, originX: 11.5, originY: 3.5 };
    expect(boltClearsCover(bolt, map, 12, 3, null)).toBe(false);
  });
});

describe("coverBlocks map helper", () => {
  it("places waist-high blocks at cells and hands them back as x/y", () => {
    const g = createGrid(8, 8, 0);
    const hm = createHeights(8, 8);
    const out = coverBlocks(g, hm, [[2, 3], { x: 5, y: 6 }]);
    expect(out).toEqual([{ x: 3, y: 2 }, { x: 5, y: 6 }]);
    expect(g[2][3]).toBe(3);
    expect(hm[6][5]).toBe(LAYER.WAIST);
    expect(coverClass({ width: 8, height: 8, grid: g, heightMap: hm }, 3, 2)).toBe("low");
  });
});

// ── Cover in play, on a stand-in game ──

function fakeGame(x, y, angle) {
  const player = {
    x, y, angle, alive: true, isAiming: false, isSprinting: false, isDashing: false, isSliding: false,
    crouchBlend: 0, slideDuration: 0.6, slideDirX: 0, slideDirY: 0, cover: null,
  };
  return { map: testMap(), player, time: 0, coverStats: createCoverStats(), audio: {}, screenShake: 0 };
}

/** Run `n` frames of 1/60 s. */
function frames(game, n, each = null) {
  for (let i = 0; i < n; i++) {
    each?.(game);
    game.time += 1000 / 60;
    updateCover(game, 1 / 60);
  }
}

describe("taking and holding cover", () => {
  it("snaps onto the face with a short ease and crouches behind low cover", () => {
    const game = fakeGame(5.5, 7, NORTH);
    expect(coverPress(game)).toBe(true);
    expect(game.coverStats.tookCover).toBe(1);
    frames(game, 1);
    expect(game.player.y).toBeGreaterThan(6 + COVER_OFFSET); // still easing
    frames(game, 12);
    expect(game.player.y).toBeCloseTo(6 + COVER_OFFSET);
    expect(game.player.coverDown).toBe(true);
    expect(game.player.coverPeeking).toBe(false);
  });

  it("slides along the face and stops at its end; forward does nothing", () => {
    const game = fakeGame(5.5, 7, NORTH);
    coverPress(game);
    frames(game, 12);
    const f = game.player.cover.face;
    frames(game, 60, (g) => { g.player.coverIntentX = 0.05; });
    expect(game.player.x).toBeCloseTo(f.sMax);
    frames(game, 30, (g) => { g.player.coverIntentY = -0.05; });
    expect(game.player.y).toBeCloseTo(f.depth);
    expect(game.player.cover).not.toBeNull();
  });

  it("steps out when held away from the cover, or on the key again", () => {
    const game = fakeGame(5.5, 7, NORTH);
    coverPress(game);
    frames(game, 12);
    frames(game, 20, (g) => { g.player.coverIntentY = 0.05; });
    expect(game.player.cover).toBeNull();
    coverPress(game);
    frames(game, 12);
    expect(coverPress(game)).toBe(true);
    expect(game.player.cover).toBeNull();
  });

  it("peeks over low cover with the sights up, which exposes the player", () => {
    const game = fakeGame(5.5, 7, NORTH);
    coverPress(game);
    frames(game, 12);
    expect(coverShields(game, 5.5, 1.5)).toBe(true);
    expect(game.coverStats.shotsBlocked).toBe(1);
    game.player.isAiming = true;
    frames(game, 10);
    expect(game.player.coverDown).toBe(false);
    expect(game.player.coverPeeking).toBe(true);
    expect(coverShields(game, 5.5, 1.5)).toBe(false);
  });

  it("leans out round the end of high cover, and back in", () => {
    // Against the pillar's west face, at its north end.
    const game = fakeGame(11.2, 3.4, EAST);
    coverPress(game);
    frames(game, 12);
    const f = game.player.cover.face;
    expect(f.low).toBe(false);
    frames(game, 30, (g) => { g.player.coverIntentY = -0.05; });
    expect(game.player.y).toBeCloseTo(f.sMin);
    game.player.isAiming = true;
    frames(game, 20);
    expect(game.player.y).toBeLessThan(f.kLo); // past the pillar's end
    expect(game.player.coverPeeking).toBe(true);
    game.player.isAiming = false;
    frames(game, 30);
    expect(game.player.y).toBeCloseTo(f.sMin);
    expect(game.player.coverPeeking).toBe(false);
  });
});

describe("firing from cover", () => {
  it("sprays blind fire wider and fires it from over the cover", () => {
    const game = fakeGame(5.5, 7, NORTH);
    coverPress(game);
    frames(game, 12);
    game.player.crouchBlend = 1;
    expect(coverCone(game.player, 0.01)).toBeGreaterThanOrEqual(BLIND_FIRE_MIN_CONE);
    expect(coverCone(game.player, 0.05)).toBeCloseTo(0.05 * 3.5);
    const saved = beginCoverShot(game);
    expect(game.player.crouchBlend).toBe(0);
    endCoverShot(game, saved);
    expect(game.player.crouchBlend).toBe(1);
    game.player.isAiming = true;
    expect(coverCone(game.player, 0.01)).toBe(0.01);
    expect(beginCoverShot(game)).toBeNull();
  });

  it("counts peeked and blind-fired kills", () => {
    const game = fakeGame(5.5, 7, NORTH);
    coverPress(game);
    frames(game, 12);
    beginCoverShot(game);
    noteCoverKill(game);
    expect(game.coverStats.blindFireKills).toBe(1);
    game.player.isAiming = true;
    frames(game, 10);
    noteCoverKill(game);
    expect(game.coverStats.peekKills).toBe(1);
    leaveCover(game);
    noteCoverKill(game);
    expect(game.coverStats).toMatchObject({ peekKills: 1, blindFireKills: 1 });
  });
});

describe("cover-to-cover dash", () => {
  it("slides to the cover in view and snaps onto it", () => {
    const game = fakeGame(5.5, 7, NORTH);
    coverPress(game);
    frames(game, 12);
    game.player.angle = EAST;
    expect(coverDash(game, 1, 0)).toBe(true);
    expect(game.player.isSliding).toBe(true);
    // Stand in for the slide's own movement.
    frames(game, 60, (g) => {
      if (g.player.isSliding) g.player.x += 0.15;
    });
    expect(game.coverStats.coverDashes).toBe(1);
    expect(game.player.cover.face).toMatchObject({ cx: 10, cy: 6 });
    expect(game.player.x).toBeCloseTo(10 - COVER_OFFSET);
  });

  it("from cover with nothing in view, steps out and lets the dash go", () => {
    const game = fakeGame(5.5, 7, NORTH);
    coverPress(game);
    frames(game, 12);
    game.player.angle = Math.PI / 2;
    expect(coverDash(game, 0, 1)).toBe(false);
    expect(game.player.cover).toBeNull();
  });

  it("on a pad, a dash toward the cover in front takes it", () => {
    const game = fakeGame(5.5, 7, NORTH);
    game.inputDevice = "gamepad";
    game.gamepad = { connected: true };
    frames(game, 1);
    expect(game.player.coverAvailable).not.toBeNull();
    expect(coverDash(game, 1, 0)).toBe(false); // sideways: a dash
    expect(coverDash(game, 0, -1)).toBe(true);
    expect(game.player.cover).not.toBeNull();
  });
});
