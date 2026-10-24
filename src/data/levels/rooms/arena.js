/**
 * The station's arena, dressed on the prologue map after the floor plan is
 * built (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/arena.js), lamps, props and room boxes.
 *
 * The prologue uses it as R&D's holo sim hall and exhibit floor: emitter
 * panels and holo-grid walls, the observation window onto the deck, R&D's
 * crates, SIM IN PROGRESS over the way in, the cover pillars as sim columns
 * round the exhibit projector, and at the north end the extraction lift
 * (its doors, shaft frame, call panel and floor indicator) behind the beacon.
 * Every cover pillar stays solid: the sim and the lift waves are fought round
 * them.
 */

/** Wall ids, painted by src/rendering/env/rooms/arena.js. */
export const ARENA_WALLS = {
  GRID: 100,
  EMITTER: 101,
  CRATES: 102,
  SIM_SIGN: 103,
  OBS_WINDOW: 104,
  COLUMN_A: 105,
  COLUMN_B: 106,
  COLUMN_C: 107,
  PROJECTOR: 108,
  SHAFT_L: 109,
  CALL_PANEL: 110,
  LIFT_DOOR_L: 111,
  LIFT_DOOR_R: 112,
  LIFT_JAMB: 113,
  SHAFT_R: 114,
  GALLERY: 115,
  /** A holo cover block, raised waist-high by the sim (js/tutorial-system.js). */
  HOLO_BLOCK: 116,
  /** Lin's control booth (`booth`, below): its desk, a low wall (heightMap WAIST), and the screens behind it. */
  BOOTH_DESK: 157,
  BOOTH_CONSOLE: 158,
};

/**
 * The sim hall as a cover arena: where its holo blocks rise, [row, col],
 * one layout per wave (the last stays up for the evac). Clear of the
 * columns, the exhibit pad, the lift's mouth and the waves' spawn points.
 */
export const COVER_LAYOUTS = {
  lanes: [[9, 24], [9, 25], [9, 34], [9, 35], [7, 12], [7, 13], [7, 46], [7, 47], [4, 20], [4, 21], [4, 38], [4, 39]],
  scatter: [[6, 17], [6, 18], [9, 27], [9, 32], [7, 23], [7, 36], [4, 12], [4, 47], [9, 15], [9, 44]],
  // The cover drill (before the waves): a block facing the hall's north end
  // to take and fire from, and four tiles west along the south wall a second
  // one, its face toward the first, to slide to.
  drill: [[9, 42], [9, 43], [9, 37], [10, 37]],
};
/** The drill's two blocks, as the drill and the bot need them: where you stand to take each. */
export const DRILL_COVER = { first: { x: 43.0, y: 10.4 }, second: { x: 38.4, y: 10.3 } };

const W = ARENA_WALLS;

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(ARENA_WALLS),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "arena", x: 15.5, y: 6.5, color: [190, 230, 255], radius: 5, intensity: 0.6 },
    { room: "arena", x: 44.5, y: 6.5, color: [190, 230, 255], radius: 5, intensity: 0.6 },
    { room: "arena", x: 29.5, y: 4.6, color: [255, 214, 150], radius: 4, intensity: 0.4 },
    { room: "arena", x: 29.5, y: 9.4, color: [220, 236, 255], radius: 4.5, intensity: 0.5 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    arena: { x0: 8, y0: 2, x1: 51, y1: 11 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // R&D's crates in the corners, clear of the waves' spawn points.
    { x: 9, y: 3, type: "crate" }, { x: 9, y: 10, type: "crate" },
    { x: 50, y: 3, type: "crate" }, { x: 50, y: 10, type: "crate" },
    { x: 50, y: 9, type: "ammo_crate" },
    // The resupply crate stood inside the exhibit projector.
    { x: 26, y: 10, type: "ammo_crate" },
  ],
  dropProps: [{ x: 30, y: 6 }],
  /** Rewrite the room's cells. `h` has the floor plan's carve/hWall/vWall/pillar/door. */
  dress(g) {
    // North wall: emitters between holo-grid panels; the lift in the middle.
    const NORTH = [W.GRID, W.EMITTER, W.GRID, W.GRID, W.CRATES];
    for (let c = 9; c <= 50; c++) if (g[2][c] === 2) g[2][c] = NORTH[c % NORTH.length];
    g[2][27] = W.SHAFT_L;
    g[2][28] = W.CALL_PANEL;
    g[2][29] = W.LIFT_DOOR_L;
    g[2][30] = W.LIFT_DOOR_R;
    g[2][31] = W.LIFT_JAMB;
    g[2][32] = W.SHAFT_R;
    // South wall: the gallery glass over the way in, emitters along it.
    const SOUTH = [W.GALLERY, W.GRID, W.EMITTER, W.GALLERY, W.GRID];
    for (let c = 9; c <= 50; c++) if (g[11][c] === 2) g[11][c] = SOUTH[c % SOUTH.length];
    g[11][27] = W.SIM_SIGN;
    g[11][32] = W.SIM_SIGN;
    // West wall: the observation deck's window; east wall: R&D's store.
    for (let r = 3; r <= 10; r++) {
      if (g[r][8] === 2) g[r][8] = r <= 6 ? W.OBS_WINDOW : r === 8 ? W.SIM_SIGN : W.GRID;
      if (g[r][51] === 2) g[r][51] = r === 6 ? W.SIM_SIGN : r % 2 ? W.CRATES : W.EMITTER;
    }
    // Corners take the panel either side of them.
    for (const [r, c] of [[2, 8], [2, 51], [11, 8], [11, 51]]) g[r][c] = W.GRID;
    // The cover pillars become sim columns (still solid), the centre one the
    // exhibit projector.
    const COLS = [W.COLUMN_A, W.COLUMN_B, W.COLUMN_C];
    [[5, 15], [5, 25], [5, 35], [5, 44], [8, 20], [8, 30], [8, 40]].forEach(([r, c], i) => {
      if (g[r][c] === 2) g[r][c] = COLS[i % COLS.length];
    });
    if (g[6][30] === 3) g[6][30] = W.PROJECTOR;
  },
};

/**
 * Lin's control booth, let into the sim hall's south wall west of the way
 * in (rows 12-13, cols 19-23): a waist-high desk across its mouth with the
 * sim's controls on it, the screens on the back wall, a gap at the west end
 * to walk round. Lin runs the sim from behind the desk; you talk to her
 * across it (js/tutorial-system.js). Dressed with the east wing, after the
 * Precinct's copy of the floor is taken, so the Precinct keeps its plain wall.
 */
export const BOOTH_AT = { x: 21.5, y: 12.6 };
/** Where you stand at the desk to talk to her. */
export const BOOTH_FRONT = { x: 21.5, y: 10.3 };

export const booth = {
  ownWalls: [W.BOOTH_DESK, W.BOOTH_CONSOLE],
  lights: [{ room: "booth", x: 21.5, y: 12.8, color: [120, 230, 255], radius: 3, intensity: 0.6 }],
  boxes: { booth: { x0: 18, y0: 11, x1: 24, y1: 14 } },
  props: [{ x: 23, y: 13, type: "chair" }],
  dropProps: [],
  dress(g, { carve, hm, lowWall, LAYER }) {
    carve(11, 19, 13, 23);
    lowWall(g, hm, 11, 20, 11, 23, LAYER.WAIST, W.BOOTH_DESK);
    for (let c = 19; c <= 23; c++) g[14][c] = W.BOOTH_CONSOLE;
    for (const r of [12, 13]) {
      g[r][18] = W.GRID;
      g[r][24] = W.GRID;
    }
  },
};
