/**
 * Dispatch and the detectives' bullpen, dressed on the prologue map after
 * the floor plan is built (src/data/levels/tutorial.js): its own wall ids
 * (painted by src/rendering/env/rooms/dispatch.js), lamps, props and boxes.
 *
 * One long room (rows 16-30, cols 62-83): the bullpen's desks in three rows
 * nearest the spine, and at the far end the dispatch consoles facing the
 * city map, the call board either side of it and the radio rack. The duty
 * board on the north wall has both heavy squads down for the Engine level.
 */
export const DISPATCH_WALLS = {
  WALL: 144,
  CITY_MAP: 145,
  CALL_BOARD: 146,
  RADIO_RACK: 147,
  DUTY_BOARD: 148,
  BLINDS: 149,
  SIGN: 150,
  AWARDS: 151,
  /** The bullpen's desk islands and dispatch's console: low walls (WAIST). */
  DESK: 174,
  CONSOLE: 175,
};
const W = DISPATCH_WALLS;

const OFFICE = [250, 236, 214];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "dispatch", x: 67.5, y: 20.5, color: OFFICE, radius: 5, intensity: 0.5 },
    { room: "dispatch", x: 67.5, y: 27.0, color: OFFICE, radius: 5, intensity: 0.5 },
    { room: "dispatch", x: 75.5, y: 23.5, color: OFFICE, radius: 5, intensity: 0.45 },
    // The map wall's own glow.
    { room: "dispatch", x: 82.5, y: 22.5, color: [120, 200, 255], radius: 4, intensity: 0.55 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    dispatch: { x0: 61, y0: 15, x1: 84, y1: 31 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // The bullpen: a chair either side of each desk island.
    ...[17, 20, 22, 25, 27].flatMap((y) => [{ x: 65, y, type: "chair" }, { x: 71, y, type: "chair" }]),
    // Dispatch: the dispatchers' chairs at the console, facing the map.
    { x: 79, y: 21, type: "chair" }, { x: 79, y: 23, type: "chair" },
    // Cabinets and plants round the walls.
    { x: 63, y: 16, type: "filing_cabinet" }, { x: 64, y: 16, type: "filing_cabinet" },
    { x: 83, y: 30, type: "potted_plant" }, { x: 62, y: 30, type: "potted_plant" },
    { x: 78, y: 16, type: "vending_machine" },
  ],
  dropProps: [],
  /** Rewrite the room's cells. `h` has the floor plan's helpers, and its heightMap. */
  dress(g, { hm, lowWall, LAYER }) {
    const NORTH = [W.WALL, W.BLINDS, W.WALL, W.AWARDS, W.BLINDS];
    for (let c = 61; c <= 84; c++) {
      g[15][c] = NORTH[c % NORTH.length];
      g[31][c] = [W.BLINDS, W.WALL, W.AWARDS, W.WALL][c % 4];
    }
    for (let r = 15; r <= 31; r++) {
      if (g[r][61] === 3) g[r][61] = r % 3 ? W.WALL : W.BLINDS;
      g[r][84] = W.WALL;
    }
    // The duty board where the squads come in from the spine.
    g[15][67] = W.DUTY_BOARD;
    g[15][72] = W.SIGN;
    // The far wall: the map, the call board either side, the radios.
    for (let r = 19; r <= 25; r++) g[r][84] = W.CITY_MAP;
    for (const r of [17, 18, 26, 27]) g[r][84] = W.CALL_BOARD;
    for (const r of [28, 29]) g[r][84] = W.RADIO_RACK;
    // Desk islands, two desks facing two, with aisles between; the console
    // arc in front of the map.
    for (const r of [18, 23]) {
      for (const c of [64, 70]) lowWall(g, hm, r, c, r + 1, c + 3, LAYER.WAIST, W.DESK);
    }
    lowWall(g, hm, 28, 64, 28, 67, LAYER.WAIST, W.DESK);
    lowWall(g, hm, 20, 80, 24, 80, LAYER.WAIST, W.CONSOLE);
  },
};
