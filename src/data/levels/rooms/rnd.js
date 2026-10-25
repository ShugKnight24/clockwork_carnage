/**
 * R&D's suit lab, dressed on the prologue map after the floor plan is built
 * (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/rnd.js), lamps, props and room boxes.
 *
 * The bay (rows 2-13, cols 62-79) at the north end of the spine, the side
 * of the station nearest the Engine. Lift A, R&D's freight car to the
 * Engine level, is in its east wall, locked out for the calibration. In the
 * middle, the telemetry rig the cadet stands in; along the north wall the
 * suits it came from: three C-series heavy frames, the plate the squads
 * still wear, and the empty cradle the D-series prototype left this
 * morning. Orr's whiteboard, the rig's consoles, the tool wall, and on the
 * south wall the bay's main breaker (the prologue's power step).
 *
 * It is a working lab, not a showroom: sample fridges, a server rack and
 * the window onto the cleanroom next door, scopes on the benches, cables
 * run across the floor to the rig, and screens reading the cadet's body
 * and nerves live (the rig calibrates the suit to them: the prologue's
 * first trial).
 */
export const RND_WALLS = {
  WALL: 192,
  CONSOLE: 193,
  SUIT_RACK: 194,
  SUIT_CRADLE: 195,
  WHITEBOARD: 196,
  LIFT_A: 197,
  LIFT_A_PANEL: 198,
  BREAKER: 199,
  /** The breaker thrown, its bus lit (swapped in by the prologue). */
  BREAKER_LIVE: 200,
  TOOLS: 201,
  SIGN: 202,
  VENT: 203,
  /** A workbench: a low wall (heightMap WAIST). */
  BENCH: 233,
  FRIDGE: 153,
  CLEANROOM: 154,
  /** The cadet's live readouts: heart, breath, the neural match. */
  BIOMON: 155,
  RACK: 156,
  /** The lab's hazard board, the D-series blueprint, the gas cylinders. */
  NOTICE: 170,
  SCHEMATIC: 171,
  GAS: 172,
};
const W = RND_WALLS;

/** Where the cadet stands to be read, and the breaker's cell. */
export const RIG_AT = { x: 70.5, y: 7.5 };
export const BREAKER_CELL = { x: 76, y: 14 };

const COOL = [214, 234, 255];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "rnd", x: 65.5, y: 4.5, color: COOL, radius: 5, intensity: 0.6 },
    { room: "rnd", x: 75.5, y: 4.5, color: COOL, radius: 5, intensity: 0.6 },
    { room: "rnd", x: 66.5, y: 11.0, color: COOL, radius: 4.5, intensity: 0.5 },
    { room: "rnd", x: 70.5, y: 7.5, color: [90, 230, 255], radius: 3, intensity: 0.7 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    rnd: { x0: 60, y0: 1, x1: 80, y1: 14 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // The rig, and Orr's console beside it.
    { x: 70, y: 7, type: "telemetry_rig" },
    { x: 72, y: 9, type: "monitor_bank" }, { x: 73, y: 9, type: "desk" },
    // Stools at the workbenches, a cabinet, crates by the lift.
    { x: 65, y: 6, type: "chair" }, { x: 65, y: 8, type: "chair" },
    { x: 63, y: 8, type: "monitor_bank" }, { x: 63, y: 12, type: "filing_cabinet" },
    { x: 78, y: 3, type: "crate" }, { x: 78, y: 11, type: "crate" }, { x: 77, y: 12, type: "crate" },
    { x: 66, y: 12, type: "chair" },
    // Scopes on their stands by the benches, the vitals cart at the rig,
    // and the cables from the rig to its consoles.
    { x: 68, y: 4, type: "lab_scope" }, { x: 68, y: 10, type: "lab_scope" },
    { x: 72, y: 6, type: "vitals_cart" }, { x: 75, y: 10, type: "vitals_cart" },
    { x: 70, y: 8, type: "cable_run" }, { x: 70, y: 9, type: "cable_run" }, { x: 69, y: 10, type: "cable_run" }, { x: 69, y: 12, type: "cable_run" },
    // The east bench under the cleanroom window: two more scopes, a stool,
    // a monitor reading the anchor module on the stand.
    { x: 75, y: 4, type: "lab_scope" }, { x: 77, y: 4, type: "chair" }, { x: 74, y: 4, type: "monitor_bank" },
    { x: 66, y: 7, type: "vitals_cart" }, { x: 63, y: 4, type: "monitor_bank" },
  ],
  dropProps: [],
  /** Rewrite the room's cells. `h` has the floor plan's helpers, and its heightMap. */
  dress(g, { hm, lowWall, LAYER }) {
    for (let c = 61; c <= 80; c++) for (const r of [1, 14]) g[r][c] = W.WALL;
    for (let r = 1; r <= 14; r++) for (const c of [61, 80]) if (g[r][c] === 3) g[r][c] = W.WALL;
    // North wall: the C-series rack, the empty cradle, the whiteboard.
    for (let c = 63; c <= 66; c++) g[1][c] = W.SUIT_RACK;
    g[1][69] = W.SUIT_CRADLE;
    g[1][73] = W.WHITEBOARD;
    g[1][77] = W.VENT;
    // East wall: Lift A to the Engine level, its locked call panel.
    g[6][80] = W.LIFT_A;
    g[7][80] = W.LIFT_A;
    g[5][80] = W.LIFT_A_PANEL;
    g[9][80] = W.SIGN;
    // South wall: the rig's consoles, the breaker, the tool wall.
    for (let c = 68; c <= 71; c++) g[14][c] = W.CONSOLE;
    g[14][BREAKER_CELL.x] = W.BREAKER;
    for (const c of [63, 64]) g[14][c] = W.TOOLS;
    // West wall inside: the tool wall, the sample fridges, the lab's sign by the door.
    for (const r of [3, 4, 5]) g[r][61] = W.TOOLS;
    g[6][61] = W.FRIDGE;
    g[7][61] = W.FRIDGE;
    g[9][61] = W.SIGN;
    // The cleanroom's window and its rack, either end of the east wall; a
    // fridge and the rack in the south-west.
    g[2][80] = W.RACK;
    g[3][80] = W.RACK;
    g[11][80] = W.CLEANROOM;
    g[12][80] = W.CLEANROOM;
    g[1][75] = W.CLEANROOM;
    g[14][66] = W.FRIDGE;
    g[14][73] = W.RACK;
    // Two of the rig's consoles read the cadet: the body, then the mind.
    g[14][69] = W.BIOMON;
    g[14][70] = W.BIOMON;
    // The plain runs between: the safety board by each door, the blueprint
    // over the benches, the gas rack in the corners nearest the cleanroom.
    g[1][67] = W.NOTICE;
    g[14][78] = W.NOTICE;
    g[1][71] = W.SCHEMATIC;
    g[14][62] = W.SCHEMATIC;
    g[1][79] = W.GAS;
    g[13][80] = W.GAS;
    // The workbenches, waist-high islands down the west half, and the
    // rig's console island south of it.
    lowWall(g, hm, 4, 64, 5, 67, LAYER.WAIST, W.BENCH);
    lowWall(g, hm, 9, 64, 10, 67, LAYER.WAIST, W.BENCH);
    lowWall(g, hm, 11, 70, 11, 73, LAYER.WAIST, W.BENCH);
    lowWall(g, hm, 3, 74, 3, 77, LAYER.WAIST, W.BENCH);
  },
};
