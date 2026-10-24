/**
 * The interview suite, dressed on the prologue map after the floor plan is
 * built (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/interview.js), lamps, props and room boxes.
 *
 * Off the south hall (rows 53-57): interview 1 (cols 43-46), the
 * observation room (cols 48-51) and interview 2 (cols 53-55). The one-way
 * glass between them is one wall cell seen from both rooms, painted dark
 * enough to read as a mirror from the table and a window from behind it.
 * Acoustic panels, the RECORDED notice, the recorder rack in observation.
 */
export const INTERVIEW_WALLS = {
  WALL: 228,
  ONE_WAY: 229,
  RECORDER: 230,
  NOTICE: 231,
  DOOR_PLATE: 232,
};
const W = INTERVIEW_WALLS;

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    // One hard lamp over each table, dimmer in observation.
    { room: "interview", x: 44.5, y: 55.5, color: [255, 236, 200], radius: 3.5, intensity: 0.7 },
    { room: "interview", x: 49.5, y: 55.0, color: [150, 170, 210], radius: 3, intensity: 0.3 },
    { room: "interview", x: 54.0, y: 55.5, color: [255, 236, 200], radius: 3.5, intensity: 0.6 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    interview: { x0: 42, y0: 51, x1: 56, y1: 58 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // Interview 1: the table between the detective and the suspect.
    { x: 44, y: 55, type: "table" },
    // Observation: the recorder desk and a chair at the glass.
    { x: 50, y: 56, type: "desk" }, { x: 51, y: 56, type: "monitor_bank" }, { x: 49, y: 54, type: "chair" },
    // Interview 2, empty: the table, two chairs.
    { x: 54, y: 55, type: "table" }, { x: 54, y: 54, type: "chair" }, { x: 54, y: 56, type: "chair" },
  ],
  dropProps: [],
  /** Rewrite the rooms' cells. */
  dress(g) {
    for (let c = 42; c <= 56; c++) for (const r of [52, 58]) if (g[r][c] === 3) g[r][c] = W.WALL;
    for (let r = 52; r <= 58; r++) for (const c of [42, 47, 52, 56]) if (g[r][c] === 3) g[r][c] = W.WALL;
    // The glass, either side of observation.
    for (let r = 54; r <= 56; r++) {
      g[r][47] = W.ONE_WAY;
      g[r][52] = W.ONE_WAY;
    }
    g[58][44] = W.NOTICE;
    g[58][54] = W.NOTICE;
    g[58][49] = W.RECORDER;
    g[58][50] = W.RECORDER;
    g[52][45] = W.DOOR_PLATE;
    g[52][55] = W.DOOR_PLATE;
  },
};
