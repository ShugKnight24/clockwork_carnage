/**
 * The station's gym, dressed on the prologue map after the floor plan is
 * built (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/gym.js), lamps, props and room boxes.
 *
 * The gym (rows 15-26, cols 3-24): a mirror wall along the north side with
 * the notice board, PT board and poster in the middle of it, the TV and a
 * poster facing you as you come in, cubbies, towel lockers and a fountain.
 * Its old equipment columns are gone; the weights and bags are props, clear
 * of the course (js/tutorial-system.js COURSE_GATES).
 *
 * The evidence cage in its south-west corner (rows 22-25, cols 9-15): its
 * walls are seen from both the gym and inside, so they are mesh lockers and
 * a padlocked cage door; only the south wall, inside, has the shelving and
 * the log. The way in is still the loose panel at g[23][15].
 *
 * The observation deck (rows 3-6, cols 3-7) is opened onto its passage (rows
 * 7-14) and gets its sign, its acoustic walls and a console at the glass.
 */

const W = {
  MIRROR_A: 60,
  MIRROR_B: 61,
  BLOCK: 62,
  PT_BOARD: 63,
  POSTER: 64,
  NOTICES: 65,
  CUBBIES: 66,
  TOWELS: 67,
  FOUNTAIN: 68,
  TV: 69,
  CAGE: 70,
  CAGE_DOOR: 71,
  SHELVES_A: 72,
  SHELVES_B: 73,
  LOG: 74,
  DECK: 75,
  DECK_SIGN: 76,
};

const LAMP = [236, 242, 255];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "gym", x: 8.5, y: 18.5, color: LAMP, radius: 5, intensity: 0.6 },
    { room: "gym", x: 17.5, y: 18.0, color: LAMP, radius: 5, intensity: 0.6 },
    { room: "gym", x: 18.5, y: 23.5, color: LAMP, radius: 5, intensity: 0.55 },
    { room: "evidence", x: 12.0, y: 23.8, color: [255, 210, 150], radius: 3, intensity: 0.65 },
    { room: "obsDeck", x: 5.0, y: 5.0, color: [160, 196, 255], radius: 4, intensity: 0.55 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    gym: { x0: 3, y0: 15, x1: 24, y1: 26 },
    evidence: { x0: 9, y0: 22, x1: 15, y1: 25 },
    obsDeck: { x0: 3, y0: 3, x1: 7, y1: 13 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // Weights in front of the mirror, a bench, the bags by the south wall.
    { x: 16, y: 16, type: "weight_rack" }, { x: 18, y: 16, type: "weight_rack" },
    { x: 20, y: 16, type: "dumbbell" },
    { x: 10, y: 16, type: "bench" },
    { x: 7, y: 19, type: "weight_rack" }, { x: 9, y: 19, type: "dumbbell" },
    { x: 16, y: 25, type: "punching_bag" }, { x: 18, y: 25, type: "punching_bag" },
    // Evidence: the Ricochet Pistol laid out on a table, a cabinet, a crate.
    { x: 12, y: 23, type: "table" },
    { x: 10, y: 23, type: "filing_cabinet" }, { x: 10, y: 24, type: "crate" },
    // Observation deck: the console at the glass.
    { x: 6, y: 4, type: "monitor_bank" }, { x: 6, y: 5, type: "desk" },
  ],
  dropProps: [
    { x: 7, y: 17 }, { x: 9, y: 17 }, { x: 7, y: 19 }, { x: 9, y: 19 },
    { x: 19, y: 18 }, { x: 22, y: 18 }, { x: 19, y: 20 }, { x: 22, y: 20 },
    { x: 12, y: 23 },
  ],
  /** Rewrite the room's cells. `h` has the floor plan's carve/hWall/vWall/pillar/door. */
  dress(g, h) {
    // The equipment columns, rack cubes and track markers come out.
    for (let r = 16; r <= 25; r++) for (let c = 4; c <= 23; c++) if (g[r][c] === 20 || g[r][c] === 21) g[r][c] = 0;

    // North wall: mirror, with the notice board, PT board and poster mid-way.
    for (let c = 3; c <= 24; c++) g[15][c] = W.BLOCK;
    for (let c = 4; c <= 21; c++) g[15][c] = c % 2 ? W.MIRROR_B : W.MIRROR_A;
    g[15][12] = W.NOTICES;
    g[15][13] = W.PT_BOARD;
    g[15][14] = W.POSTER;
    // West wall, the one you face coming in: the TV, a poster, cubbies, a fountain.
    const west = { 16: W.BLOCK, 17: W.CUBBIES, 18: W.POSTER, 19: W.BLOCK, 20: W.TV, 21: W.BLOCK, 22: W.FOUNTAIN, 23: W.BLOCK, 24: W.CUBBIES, 25: W.BLOCK };
    // East wall, either side of the door: towels and cubbies.
    const east = { 16: W.TOWELS, 17: W.CUBBIES, 18: W.BLOCK, 19: W.BLOCK, 22: W.BLOCK, 23: W.TOWELS, 24: W.CUBBIES, 25: W.BLOCK };
    for (let r = 16; r <= 25; r++) {
      g[r][3] = west[r];
      if (east[r]) g[r][24] = east[r];
    }
    // South wall (the north-west passage sees its other side): plain, a fountain, notices.
    for (let c = 3; c <= 24; c++) g[26][c] = W.BLOCK;
    g[26][6] = W.NOTICES;
    g[26][21] = W.FOUNTAIN;

    // Evidence cage: mesh walls (seen from both sides), the padlocked door
    // facing the gym, shelving and the log on the south wall inside.
    for (let c = 9; c <= 14; c++) g[22][c] = W.CAGE;
    for (let r = 23; r <= 25; r++) g[r][9] = W.CAGE;
    g[22][12] = W.CAGE_DOOR;
    g[24][15] = W.CAGE;
    const south = [W.SHELVES_A, W.SHELVES_B, W.SHELVES_A, W.LOG, W.SHELVES_B];
    for (let c = 10; c <= 14; c++) g[25][c] = south[c - 10];

    // Observation deck: open onto its passage, sign over the way in.
    h.carve(6, 4, 6, 6);
    for (let c = 3; c <= 6; c++) g[3][c] = W.DECK;
    g[3][5] = W.DECK_SIGN;
    for (let r = 4; r <= 6; r++) g[r][3] = W.DECK;
    for (let r = 7; r <= 14; r++) {
      g[r][3] = W.BLOCK;
      g[r][7] = W.BLOCK;
    }
  },
};
