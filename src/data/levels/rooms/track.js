/**
 * The training hall, dressed on the prologue map after the floor plan is
 * built (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/track.js), lamps, props and room boxes.
 *
 * Off the gym: a door in the gym's west wall opens on a back passage (cols
 * 1-2) that runs south past the locker room to the hall, and the lobby's
 * west alcove opens on it too. The hall (rows 50-79, cols 1-16) is four
 * lanes, north to south, split by waist-high rails:
 *
 *   lane 1 (cols 1-3)   the sprint straight, 27 cells: longer than a full
 *                       bar of stamina lasts at a sprint (4 s, ~22 cells)
 *   lane 2 (cols 5-7)   back up under three slide bars
 *   lane 3 (cols 9-11)  down through the crouch tunnel, then the foam pit
 *                       you phase-dash
 *   lane 4 (cols 13-16) the warm-up lane, Vale's bench and the timing board
 *
 * The bars and the tunnel are `shutter` props (src/rendering/props.js): the
 * lip is 0.4 of a wall's height above the floor (SHUTTER_LIP), which a slide
 * or a crouch passes under and a standing cadet does not. The run itself (its
 * gates, and the bars and pit enforced) is js/tutorial-system.js's.
 */
export const TRACK_WALLS = {
  WALL: 147,
  /** Crash mats on the south wall, where the lanes end. */
  PAD: 148,
  BOARD: 149,
  SIGN: 150,
  /** A lane rail: a low wall, knee-high (heightMap KNEE), so you see across the lanes. */
  RAIL: 151,
  /** Distance boards down both long walls, from the lanes' north ends. */
  DIST_10: 162,
  DIST_20: 163,
  /** The pace clock: a big sweep hand over sixty seconds. */
  CLOCK: 164,
  /** The first-aid point: defibrillator, extinguisher, the drinking fountain. */
  AID: 165,
  /** Each lane's header over its north end: number, what it is for. */
  LANE_1: 166,
  LANE_2: 167,
  LANE_3: 168,
  LANE_4: 169,
};
const W = TRACK_WALLS;

/** The hall's floor, as carved: the room the mobility trial asks you to be in. */
export const TRACK_AREA = { x0: 1, y0: 50, x1: 17, y1: 80 };
/** Lane centres (x) and the hall's ends (y). */
export const LANES = { 1: 2.5, 2: 6.5, 3: 10.5, 4: 15.0 };

/** Each slide bar across lane 2, and the tunnel's cells in lane 3: [x, y] cells. */
const across = (c0, c1, r) => Array.from({ length: c1 - c0 + 1 }, (_, i) => [c0 + i, r]);
export const TRACK_BARS = [71, 63, 55].flatMap((r) => across(5, 7, r));
export const TRACK_TUNNEL = [53, 54, 55, 56].flatMap((r) => across(9, 11, r));
/** The foam pit across lane 3: floor you only cross mid-dash. */
export const TRACK_PIT = { x0: 9, x1: 11, y0: 63, y1: 64 };

const LED = [226, 238, 255];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "track", x: 2.5, y: 55.5, color: LED, radius: 5, intensity: 0.6 },
    { room: "track", x: 2.5, y: 72.5, color: LED, radius: 5, intensity: 0.6 },
    { room: "track", x: 6.5, y: 63.5, color: LED, radius: 5, intensity: 0.55 },
    { room: "track", x: 10.5, y: 55.5, color: LED, radius: 5, intensity: 0.6 },
    { room: "track", x: 10.5, y: 72.5, color: LED, radius: 5, intensity: 0.6 },
    { room: "track", x: 15.0, y: 52.5, color: [255, 228, 180], radius: 4.5, intensity: 0.55 },
    // Washers down lane 4, so the east wall and its boards are not lost.
    { room: "track", x: 15.5, y: 64.5, color: LED, radius: 5, intensity: 0.6 },
    { room: "track", x: 15.5, y: 76.0, color: [255, 228, 180], radius: 4.5, intensity: 0.55 },
    // The pit, lit from inside its foam.
    { room: "track", x: 10.5, y: 64.0, color: [255, 150, 60], radius: 2.6, intensity: 0.5 },
    { room: "trackPassage", x: 1.5, y: 30.5, color: LED, radius: 4, intensity: 0.45 },
    { room: "trackPassage", x: 1.5, y: 42.5, color: LED, radius: 4, intensity: 0.45 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    track: { x0: 0, y0: 48, x1: 18, y1: 81 },
    trackPassage: { x0: 0, y0: 22, x1: 3, y1: 49 },
  },
  /** Props to add (`variant` picks a prop's look), and cells whose existing props to drop. */
  props: [
    ...TRACK_BARS.map(([x, y]) => ({ x, y, type: "shutter", variant: "bar" })),
    ...TRACK_TUNNEL.map(([x, y]) => ({ x, y, type: "shutter", variant: "tunnel" })),
    ...across(TRACK_PIT.x0, TRACK_PIT.x1, TRACK_PIT.y0).concat(across(TRACK_PIT.x0, TRACK_PIT.x1, TRACK_PIT.y1)).map(([x, y]) => ({ x, y, type: "floor_gap", variant: "pit" })),
    // The start line at the top of lane 1, the finish at the bottom of lane 3.
    ...across(1, 3, 51).map(([x, y]) => ({ x, y, type: "lane_mark", variant: "start" })),
    ...across(9, 11, 78).map(([x, y]) => ({ x, y, type: "lane_mark", variant: "finish" })),
    // Lane 4: Vale's bench, the mats and the water.
    { x: 16, y: 56, type: "bench" }, { x: 16, y: 68, type: "bench" },
    { x: 16, y: 75, type: "crate" }, { x: 13, y: 79, type: "crate" },
  ],
  dropProps: [],
  /** Rewrite the room's cells. `h` has the floor plan's helpers, and its heightMap. */
  dress(g, { carve, hm, lowWall, LAYER }) {
    // The way in from the gym, and the passage south past the locker room.
    carve(23, 1, 49, 2);
    g[23][3] = 0;
    g[24][3] = 0;
    // The hall, and its door onto the lobby's west alcove.
    carve(50, 1, 79, 16);
    carve(52, 17, 53, 18);
    // The passage's walls (the locker room's own west wall stays its own).
    for (let r = 22; r <= 49; r++) g[r][0] = W.WALL;
    for (const c of [1, 2]) g[22][c] = W.WALL;
    for (let r = 27; r <= 36; r++) g[r][3] = W.WALL;
    g[23][0] = W.SIGN;
    g[48][3] = W.WALL;
    // The hall: plain wall round it, the board and its sign on the north
    // wall over the lanes' tops, mats where the lanes end.
    for (let c = 0; c <= 17; c++) {
      if (g[49][c] !== 0) g[49][c] = W.WALL;
      g[80][c] = c >= 1 && c <= 11 ? W.PAD : W.WALL;
    }
    for (let r = 50; r <= 80; r++) {
      g[r][0] = W.WALL;
      if (g[r][17] !== 0) g[r][17] = W.WALL;
    }
    // Dressing only ever goes on wall: an opening stays open.
    const dress = (r, c, v) => {
      if (g[r][c] !== 0) g[r][c] = v;
    };
    // North wall, over the lanes' heads: each lane's header, the hall's
    // sign, the pace clock over the middle rail, the timing board.
    dress(49, 3, W.LANE_1);
    dress(49, 4, W.SIGN);
    dress(49, 6, W.LANE_2);
    dress(49, 8, W.CLOCK);
    dress(49, 10, W.LANE_3);
    dress(49, 12, W.BOARD);
    dress(49, 15, W.LANE_4);
    dress(80, 14, W.BOARD);
    dress(80, 16, W.CLOCK);
    dress(51, 17, W.SIGN);
    // Down the long walls: distance boards level with 10 m and 20 m from
    // the lanes' north ends, and a first-aid point either side.
    for (const c of [0, 17]) {
      dress(61, c, W.DIST_10);
      dress(71, c, W.DIST_20);
    }
    dress(66, 17, W.AID);
    dress(56, 0, W.AID);
    // The rails between the lanes, open at both ends for the turns.
    for (const c of [4, 8, 12]) lowWall(g, hm, 53, c, 76, c, LAYER.KNEE, W.RAIL);
  },
};
