/**
 * The station's office, dressed on the prologue map after the floor plan is
 * built (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/office.js), lamps, props and room boxes.
 *
 * The Supervisor's office is a squad room round a glass-walled office: wood
 * wainscot and painted plaster outside, his commendations, the station map
 * with its pins, the binders, the window blinds and the coat rack; inside, the
 * desk wall behind him and the monitor wall he watches. North of it the
 * Captain's quarters, sparser, through door8 (its doorway in the office's
 * north wall, and the step up from its passage into the room, are opened here
 * so the door leads somewhere).
 */

/** Wall ids, painted by src/rendering/env/rooms/office.js. */
export const OFFICE_WALLS = {
  COMMENDATIONS: 80,
  BLIND: 81,
  BINDERS: 82,
  NOTICES: 83,
  STATION_MAP: 84,
  COAT_RACK: 85,
  CLOCK: 86,
  GLASS: 87,
  NAMEPLATE: 88,
  GLASS_LETTERED: 89,
  MONITORS: 90,
  MONITORS_CASE: 91,
  DESK_WALL: 92,
  DESK_FLAG: 93,
  BOOKCASE: 94,
  CAPTAIN_SIGN: 95,
  CAPTAIN_PANEL: 96,
  CAPTAIN_PORTRAIT: 97,
  CAPTAIN_TROPHIES: 98,
  CAPTAIN_BLIND: 99,
};

const W = OFFICE_WALLS;

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(OFFICE_WALLS),
  /**
   * Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights).
   * Three in the office: the alarm adds five red ones of its own round here.
   */
  lights: [
    { room: "office", x: 39.5, y: 18.5, color: [255, 228, 190], radius: 5, intensity: 0.6 },
    { room: "office", x: 46.5, y: 21.5, color: [255, 214, 160], radius: 4, intensity: 0.65 },
    { room: "office", x: 53.5, y: 22.5, color: [255, 228, 190], radius: 5, intensity: 0.6 },
    { room: "captain", x: 54.5, y: 4.5, color: [255, 210, 150], radius: 4, intensity: 0.6 },
    { room: "captain", x: 54.5, y: 10.5, color: [255, 228, 190], radius: 4, intensity: 0.5 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    office: { x0: 35, y0: 15, x1: 56, y1: 26 },
    // Stops short of row 14 so its lamps stay off while you are in the office.
    captain: { x0: 52, y0: 3, x1: 57, y1: 11 },
  },
  /** Props to add (`variant` picks a look), and cells whose existing props to drop. */
  props: [
    // The Supervisor's desk stands where its pillars stood (the map's own desk
    // props, 46-47); his chair behind it.
    { x: 46, y: 22, type: "chair", variant: 1 },
    { x: 43, y: 20, type: "potted_plant" },
    // Filing cabinets against the north wall, an officer's desk by the south.
    { x: 38, y: 16, type: "filing_cabinet" }, { x: 39, y: 16, type: "filing_cabinet" },
    { x: 40, y: 16, type: "filing_cabinet" },
    { x: 51, y: 16, type: "filing_cabinet" }, { x: 52, y: 16, type: "filing_cabinet" },
    { x: 38, y: 25, type: "desk" }, { x: 39, y: 25, type: "desk" }, { x: 38, y: 24, type: "chair" },
    { x: 40, y: 25, type: "waste_bin" },
    { x: 36, y: 25, type: "potted_plant" }, { x: 55, y: 25, type: "potted_plant" },
    // A second officer's desk in the east half, the squad's board, the
    // copier by the cabinets, the water and the coffee in the corner by the
    // door.
    { x: 52, y: 25, type: "desk" }, { x: 53, y: 25, type: "desk" }, { x: 52, y: 24, type: "chair" },
    { x: 54, y: 25, type: "waste_bin" }, { x: 55, y: 18, type: "whiteboard" },
    { x: 50, y: 16, type: "copier" },
    { x: 36, y: 16, type: "water_cooler" }, { x: 37, y: 16, type: "coffee_cart" },
    // His office: a reading lamp by the bookcase, a bin by the desk.
    { x: 49, y: 20, type: "floor_lamp" }, { x: 48, y: 22, type: "waste_bin" },
    // The Captain's: a desk under the portrait, a cabinet, a plant.
    { x: 54, y: 4, type: "desk" }, { x: 55, y: 4, type: "desk" }, { x: 54, y: 5, type: "chair", variant: 1 },
    { x: 56, y: 5, type: "potted_plant" }, { x: 53, y: 4, type: "filing_cabinet" },
    { x: 56, y: 4, type: "floor_lamp" },
  ],
  dropProps: [
    { x: 39, y: 17 }, { x: 41, y: 17 }, { x: 53, y: 17 }, { x: 55, y: 17 },
  ],
  /** Rewrite the room's cells. `h` has the floor plan's carve/hWall/vWall/pillar/door. */
  dress(g) {
    // The furniture stand-ins go: the props stand there instead.
    for (const c of [45, 46, 47]) g[21][c] = 0;
    for (const c of [38, 40, 52, 54]) g[17][c] = 0;
    for (const c of [54, 55]) g[5][c] = 0;

    // Outer walls: north, south, west, east, each a rotation of what a
    // squad room hangs on its walls.
    const NORTH = [W.COMMENDATIONS, W.BLIND, W.BINDERS, W.BLIND];
    const SOUTH = [W.BLIND, W.BINDERS, W.NOTICES, W.BLIND, W.COMMENDATIONS];
    const EAST = [W.BLIND, W.BINDERS, W.BLIND, W.COMMENDATIONS];
    for (let c = 35; c <= 56; c++) {
      if (g[15][c] === 4) g[15][c] = NORTH[c % NORTH.length];
      if (g[26][c] === 4) g[26][c] = SOUTH[c % SOUTH.length];
    }
    for (let r = 16; r <= 25; r++) {
      if (g[r][35] === 4) g[r][35] = [W.NOTICES, W.COMMENDATIONS, W.BINDERS][r % 3];
      if (g[r][56] === 4) g[r][56] = EAST[r % EAST.length];
    }
    // Hero cells: the station map over the inner office door, the clock and
    // the coat rack by the way in, the Captain's doorway in the north wall.
    g[15][46] = W.STATION_MAP;
    g[19][35] = W.CLOCK;
    g[22][35] = W.COAT_RACK;
    g[26][36] = W.COAT_RACK;
    g[15][44] = W.NOTICES;
    g[15][54] = 0; // the way through to door8
    g[15][53] = W.CAPTAIN_SIGN;
    g[15][55] = W.CAPTAIN_SIGN;

    // The inner office: glass partitions on a wood dado, his name by the door.
    for (let c = 42; c <= 50; c++) for (const r of [19, 23]) if (g[r][c] === 4) g[r][c] = W.GLASS;
    for (let r = 19; r <= 23; r++) for (const c of [42, 50]) if (g[r][c] === 4) g[r][c] = W.GLASS;
    g[19][45] = W.GLASS_LETTERED;
    g[19][47] = W.NAMEPLATE;
    // Inside: the monitor wall along the south, the desk wall behind him on
    // the west, the bookcase on the east.
    for (let c = 44; c <= 48; c++) g[23][c] = c % 2 ? W.MONITORS : W.MONITORS_CASE;
    g[20][42] = W.DESK_WALL; g[21][42] = W.DESK_FLAG; g[22][42] = W.DESK_WALL;
    g[20][50] = W.BOOKCASE; g[21][50] = W.BOOKCASE; g[22][50] = W.BOOKCASE;

    // The Captain's quarters (rows 3-6) and the passage up to them (rows 7-14).
    g[6][53] = 0; // the passage opens into the room
    for (let c = 52; c <= 57; c++) {
      if (g[3][c] === 4) g[3][c] = c === 54 ? W.CAPTAIN_PORTRAIT : c === 56 ? W.CAPTAIN_TROPHIES : W.CAPTAIN_PANEL;
      if (g[6][c] === 4) g[6][c] = c === 55 ? W.CAPTAIN_TROPHIES : W.CAPTAIN_PANEL;
    }
    for (let r = 4; r <= 5; r++) if (g[r][57] === 4) g[r][57] = W.CAPTAIN_BLIND;
    for (let r = 7; r <= 14; r++) {
      for (const c of [52, 56]) if (g[r][c] === 4) g[r][c] = r % 3 === 0 ? W.COMMENDATIONS : W.CAPTAIN_PANEL;
    }
  },
};
