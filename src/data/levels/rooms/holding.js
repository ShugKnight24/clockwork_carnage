/**
 * Holding, dressed on the prologue map after the floor plan is built
 * (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/holding.js), lamps, props and room boxes.
 *
 * Processing at the front (rows 53-57, cols 62-74): the booking desk, the
 * height chart and the booking camera facing it, the fingerprint station,
 * the detainee's rights. The property cage in the corner (cols 75-84), mesh
 * on the two sides you see it from, shelved inside. Behind, the cell block:
 * a walkway along six cells, barred fronts and one glass-fronted for the
 * watch cell, painted on the cells' front wall (row 60) with the cell
 * behind the bars. The cage reuses the gym's evidence-cage mesh.
 */
import { GYM_WALLS } from "./gym.js";

export const HOLDING_WALLS = {
  WALL: 158,
  BARS: 159,
  BARS_OCCUPIED: 160,
  GLASS_CELL: 161,
  HEIGHT_CHART: 162,
  BOOKING: 163,
  PROPERTY: 164,
  SIGN: 165,
  RIGHTS: 166,
  DIVIDER: 167,
  /** Processing's booking counter: a low wall (WAIST). */
  COUNTER: 176,
};
const W = HOLDING_WALLS;

const FLUOR = [232, 244, 238];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "holding", x: 66.5, y: 55.0, color: FLUOR, radius: 5, intensity: 0.55 },
    { room: "holding", x: 79.5, y: 54.5, color: [255, 214, 160], radius: 4, intensity: 0.4 },
    { room: "holding", x: 67.5, y: 58.8, color: FLUOR, radius: 4.5, intensity: 0.45 },
    { room: "holding", x: 78.5, y: 58.8, color: FLUOR, radius: 4.5, intensity: 0.45 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    holding: { x0: 61, y0: 52, x1: 85, y1: 60 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // The clerk's chair behind the counter, the camera facing the height chart.
    { x: 68, y: 53, type: "chair" },
    { x: 63, y: 56, type: "booking_camera" },
    { x: 72, y: 54, type: "filing_cabinet" }, { x: 73, y: 54, type: "filing_cabinet" },
    // The property cage: crates of bagged property.
    { x: 79, y: 54, type: "crate" }, { x: 83, y: 53, type: "crate" }, { x: 83, y: 56, type: "crate" },
    // The cell walkway's bench.
    { x: 63, y: 58, type: "bench" },
  ],
  dropProps: [],
  /** Rewrite the room's cells. `h` has the floor plan's helpers, and its heightMap. */
  dress(g, { hm, lowWall, LAYER }) {
    for (let c = 61; c <= 85; c++) g[52][c] = W.WALL;
    for (let r = 52; r <= 60; r++) {
      if (g[r][61] === 3) g[r][61] = W.WALL;
      if (g[r][85] === 3) g[r][85] = W.WALL;
    }
    g[54][61] = W.SIGN;
    // Processing's wall: the height chart behind where the detainee stands,
    // the fingerprint and photo station, their rights.
    g[52][63] = W.HEIGHT_CHART;
    g[52][64] = W.HEIGHT_CHART;
    g[52][67] = W.BOOKING;
    g[52][70] = W.RIGHTS;
    // The property cage: mesh on the two sides you see, its window, shelves.
    for (let r = 53; r <= 56; r++) g[r][75] = GYM_WALLS.CAGE;
    for (let c = 75; c <= 84; c++) g[57][c] = GYM_WALLS.CAGE;
    g[55][75] = 0; // the way in
    g[54][75] = W.PROPERTY;
    for (let c = 76; c <= 84; c++) g[52][c] = c % 2 ? GYM_WALLS.SHELVES_A : GYM_WALLS.SHELVES_B;
    for (let r = 53; r <= 56; r++) g[r][85] = r % 2 ? GYM_WALLS.SHELVES_B : GYM_WALLS.SHELVES_A;
    // The booking counter across processing.
    lowWall(g, hm, 54, 66, 54, 70, LAYER.WAIST, W.COUNTER);
    // The cells' fronts: three cells' width of bars, a divider, the next.
    const FRONT = [W.BARS, W.BARS_OCCUPIED, W.GLASS_CELL, W.BARS, W.BARS_OCCUPIED, W.BARS];
    for (let c = 62; c <= 84; c++) {
      const k = c - 62;
      g[60][c] = k % 4 === 3 ? W.DIVIDER : FRONT[Math.floor(k / 4)];
    }
  },
};
