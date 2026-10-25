/**
 * The east wing's halls, dressed on the prologue map after the floor plan is
 * built (src/data/levels/tutorial.js): their own wall ids (painted by
 * src/rendering/env/rooms/halls.js), lamps, props and room boxes.
 *
 * The spine (cols 58-59, rows 8-57) runs the length of the station's east
 * side, with a door to a room every dozen steps; the north hall (rows 8-9)
 * comes in from the sim hall across the Captain's passage, the south hall
 * (rows 49-50) from the lobby under the range. They borrow the corridor's
 * painted walls (notices, photos, wanted posters) and add their own: the
 * clocks the morning stops, the floor directory, the C-series memorial, the
 * certification board, signs at each door and the vent grilles.
 */
import { CORRIDOR_WALLS as C } from "./corridor.js";

export const HALL_WALLS = {
  CLOCK: 180,
  /** The same clock, reading 06:47 (the calibration's first oddity swaps them). */
  CLOCK_STOPPED: 181,
  SIGN_RND: 182,
  SIGN_DISPATCH: 183,
  SIGN_ATRIUM: 184,
  SIGN_HOLDING: 185,
  SIGN_INTERVIEW: 186,
  CERT_BOARD: 187,
  DIRECTORY: 188,
  MEMORIAL: 189,
  VENT: 190,
  PT_POSTER: 191,
};
const W = HALL_WALLS;

const WARM = [255, 228, 196];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "spineN", x: 58.9, y: 13.5, color: WARM, radius: 5, intensity: 0.5 },
    { room: "spineN", x: 58.9, y: 23.5, color: WARM, radius: 5, intensity: 0.5 },
    { room: "spineS", x: 58.9, y: 38.5, color: WARM, radius: 5, intensity: 0.5 },
    { room: "spineS", x: 58.9, y: 52.0, color: WARM, radius: 5, intensity: 0.5 },
    { room: "southHall", x: 47.5, y: 49.9, color: WARM, radius: 5, intensity: 0.5 },
    { room: "northHall", x: 54.0, y: 8.9, color: WARM, radius: 4, intensity: 0.45 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    spineN: { x0: 57, y0: 7, x1: 60, y1: 30 },
    spineS: { x0: 57, y0: 31, x1: 60, y1: 58 },
    southHall: { x0: 41, y0: 48, x1: 57, y1: 51 },
    northHall: { x0: 51, y0: 7, x1: 57, y1: 10 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // The spine: a bench and a plant at each stretch, the coffee machine
    // halfway, so no length of it is bare.
    { x: 58, y: 14, type: "waiting_bench" }, { x: 59, y: 17, type: "potted_plant" },
    { x: 59, y: 24, type: "vending_machine" }, { x: 58, y: 31, type: "potted_plant" },
    { x: 58, y: 40, type: "waiting_bench" }, { x: 59, y: 44, type: "potted_plant" },
    { x: 58, y: 53, type: "waiting_bench" },
    // South hall: the waiting bench outside interview, a machine, a plant.
    { x: 46, y: 49, type: "waiting_bench" }, { x: 52, y: 49, type: "vending_machine" },
    { x: 56, y: 50, type: "potted_plant" },
    // North hall.
    { x: 57, y: 9, type: "potted_plant" },
  ],
  dropProps: [],
  /** Rewrite the halls' cells. `h` has the floor plan's helpers. */
  dress(g) {
    // The spine's walls, a rotation of the corridor's, then the hero cells.
    const WEST = [C.WALL, C.NOTICE, C.WALL, C.PHOTOS, C.WALL, C.WANTED, C.WALL, C.FIRE];
    const EAST = [C.WALL, C.PHOTOS, C.WALL, C.NOTICE, C.WALL, C.WANTED];
    for (let r = 8; r <= 57; r++) {
      if (g[r][57] === 3) g[r][57] = WEST[r % WEST.length];
      if (g[r][60] === 3) g[r][60] = EAST[r % EAST.length];
    }
    for (const c of [58, 59]) {
      g[7][c] = W.SIGN_RND; // the north end, seen all the way down
      g[58][c] = C.WALL;
    }
    g[7][58] = C.CREST;
    g[7][59] = C.NOTICE;
    // A sign beside each door, on the side you come at it from.
    g[12][60] = W.SIGN_RND;
    g[18][60] = W.SIGN_DISPATCH;
    g[33][60] = W.SIGN_ATRIUM;
    g[46][60] = W.SIGN_ATRIUM;
    g[54][60] = W.SIGN_HOLDING;
    // The west wall: the clock, the directory by the office door, the PT
    // poster before the long run south, the memorial to the heavy squad.
    g[16][57] = W.CLOCK;
    g[22][57] = W.DIRECTORY;
    g[25][57] = W.PT_POSTER;
    g[30][57] = W.MEMORIAL;
    g[38][57] = W.VENT;
    g[44][57] = W.CLOCK;

    // North hall: plain walls with a notice board, the vent the breach uses.
    for (let c = 51; c <= 57; c++) {
      for (const r of [7, 10]) if (g[r][c] === 3 || g[r][c] === 4) g[r][c] = C.WALL;
    }
    g[7][57] = C.NOTICE;
    g[10][57] = W.VENT;

    // South hall: the directory at its mouth, interview's sign, notices.
    for (let c = 41; c <= 57; c++) {
      if (g[48][c] === 3) g[48][c] = [C.WALL, C.NOTICE, C.WALL, C.PHOTOS, C.WALL, C.WANTED][c % 6];
      if (g[51][c] === 3) g[51][c] = c % 4 ? C.WALL : C.NOTICE;
    }
    g[48][42] = W.DIRECTORY;
    g[48][50] = W.CLOCK;
    g[51][45] = W.SIGN_INTERVIEW;
    g[51][52] = W.SIGN_INTERVIEW;

    // The main corridor: the certification board opposite the range, a
    // second clock, and the grilles the drones drop out of after the breach.
    g[43][26] = W.CERT_BOARD;
    g[34][26] = W.CLOCK;
    g[36][26] = W.VENT;
    g[43][33] = W.VENT;
  },
};
