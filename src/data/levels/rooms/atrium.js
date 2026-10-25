/**
 * The atrium, dressed on the prologue map after the floor plan is built
 * (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/atrium.js), lamps, props and room boxes.
 *
 * The station's two-storey hall (rows 33-50, cols 62-84), seen from the
 * upper floor: a catwalk two cells wide runs round a void, a waist-high
 * glass balustrade along its edge, and a bridge crosses the middle (rows
 * 41-42). One section of the bridge is out (ATRIUM_GAP): the mobility trial
 * dashes it (js/tutorial-system.js); everyone else walks round. At the far
 * end of the bridge, the great clock.
 */
export const ATRIUM_WALLS = {
  WALL: 212,
  BANNER: 213,
  CLOCK: 214,
  PLAQUE: 215,
  /** The glass balustrade: a low wall (heightMap WAIST). */
  BALUSTRADE: 216,
};
const W = ATRIUM_WALLS;

/** The bridge's missing section: floor you can only cross mid-dash. */
export const ATRIUM_GAP = { x: 73, y0: 41, y1: 42 };
/** The bridge, west landing to east. */
export const ATRIUM_BRIDGE = { y0: 41, y1: 42, x0: 64, x1: 82 };

const DAY = [236, 244, 255];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "atrium", x: 62.8, y: 41.5, color: DAY, radius: 5, intensity: 0.5 },
    { room: "atrium", x: 83.5, y: 41.5, color: [255, 220, 170], radius: 5, intensity: 0.55 },
    { room: "atrium", x: 73.0, y: 33.6, color: DAY, radius: 6, intensity: 0.45 },
    { room: "atrium", x: 73.0, y: 49.6, color: DAY, radius: 6, intensity: 0.45 },
    // The floor below, lit from under: the void reads as a drop.
    { room: "atrium", x: 69.5, y: 37.5, color: [120, 160, 220], radius: 4, intensity: 0.35 },
    { room: "atrium", x: 77.5, y: 45.5, color: [120, 160, 220], radius: 4, intensity: 0.35 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    atrium: { x0: 61, y0: 32, x1: 85, y1: 51 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // Plants at the catwalk's corners, a bench on each long side.
    { x: 62, y: 33, type: "potted_plant" }, { x: 84, y: 33, type: "potted_plant" },
    { x: 84, y: 50, type: "potted_plant" }, { x: 62, y: 50, type: "potted_plant" },
    { x: 72, y: 33, type: "waiting_bench" }, { x: 74, y: 50, type: "waiting_bench" },
    // The concourse below, over the balustrade: its trees and benches.
    { x: 68, y: 37, type: "potted_plant" }, { x: 79, y: 38, type: "potted_plant" },
    { x: 70, y: 46, type: "potted_plant" }, { x: 76, y: 45, type: "waiting_bench" },
    // The bridge's missing section.
    { x: ATRIUM_GAP.x, y: ATRIUM_GAP.y0, type: "floor_gap" },
    { x: ATRIUM_GAP.x, y: ATRIUM_GAP.y1, type: "floor_gap" },
  ],
  dropProps: [],
  /** Rewrite the room's cells. `h` has the floor plan's helpers, and its heightMap. */
  dress(g, { hm, lowWall, LAYER }) {
    for (let c = 61; c <= 85; c++) {
      g[32][c] = c % 6 === 1 ? W.BANNER : W.WALL;
      g[51][c] = c % 6 === 4 ? W.BANNER : W.WALL;
    }
    for (let r = 32; r <= 51; r++) {
      if (g[r][61] === 3) g[r][61] = W.WALL;
      g[r][85] = W.WALL;
    }
    // The great clock at the end of the bridge.
    g[41][85] = W.CLOCK;
    g[42][85] = W.PLAQUE;
    // The void, edged in glass; the bridge across it, edged too.
    const B = W.BALUSTRADE;
    lowWall(g, hm, 35, 64, 35, 82, LAYER.WAIST, B);
    lowWall(g, hm, 48, 64, 48, 82, LAYER.WAIST, B);
    lowWall(g, hm, 35, 64, 48, 64, LAYER.WAIST, B);
    lowWall(g, hm, 35, 82, 48, 82, LAYER.WAIST, B);
    for (let r = ATRIUM_BRIDGE.y0; r <= ATRIUM_BRIDGE.y1; r++) {
      for (let c = ATRIUM_BRIDGE.x0; c <= ATRIUM_BRIDGE.x1; c++) {
        g[r][c] = 0;
        hm[r][c] = LAYER.FULL;
      }
    }
    lowWall(g, hm, 40, 65, 40, 81, LAYER.WAIST, B);
    lowWall(g, hm, 43, 65, 43, 81, LAYER.WAIST, B);
  },
};
