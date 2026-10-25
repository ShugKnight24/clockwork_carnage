/**
 * The civic wing, dressed on the prologue map after the floor plan is built
 * (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/civic.js), lamps, props and room boxes.
 *
 * The station's public front, in the south-east corner: the part of Chronos
 * PD the city sees. Off the critical path; the spine's south end opens on a
 * passage down to it.
 *
 *   PASSAGE (cols 58-59, rows 58-61), from the spine
 *   ┌ RECORDS (rows 63-79, ─┬─ GREAT HALL (rows 63-79, cols 46-73) ─┬─ BUREAU DESK ┐
 *   │  cols 22-43): the     │  marble and bronze, balconies up three │  (rows 63-79, │
 *   │  stacks, and a        │  storeys under a skylight, the seal;   │  cols 76-84): │
 *   │  reading room by the  │  four garden beds with their trees, a  │  the Bureau's │
 *   │  windows              │  fountain; the security line across    │  regional     │
 *   │                       │  the public doors                      │  liaison      │
 *   └──── glass onto the street, the whole south side (row 80) ───────┴── and east ──┘
 *
 * The south wall (and the Bureau's east wall) is a curtain wall onto the
 * city: the river road, the towers, the morning. Rooms sit behind walls two
 * cells thick, so each side of a wall carries its own room's art.
 */
export const CIVIC_WALLS = {
  /** Marble ashlar: the passage, the hall's corners. */
  STONE: 237,
  /** The great hall's walls: a colonnade, and two tiers of balconies over it up to the skylight. */
  BALCONY: 238,
  /** An engaged column, fluted, between the balconies. */
  COLUMN: 239,
  /** The seal of the city's police, gilded, over the passage from the station. */
  SEAL: 240,
  BANNER: 241,
  /** The cornerstone's bronze plaque. */
  PLAQUE: 242,
  DIRECTORY: 243,
  /** The curtain wall onto the city: three views, so a run of them doesn't repeat. */
  WINDOW_A: 244,
  WINDOW_B: 245,
  WINDOW_C: 246,
  /** The public doors onto the street, locked till eight. */
  ENTRANCE: 247,
  /** A garden bed's granite kerb and its planting: a low wall (heightMap KNEE). */
  PLANTER: 248,
  /** The fountain's basin: a low wall (heightMap WAIST). */
  FOUNTAIN: 249,
  /** The security desk's front (WAIST). */
  CHECK_DESK: 250,
  /** The security line's glass gates (WAIST). */
  CHECK_GATE: 251,
  /** Records: oak panelling over the card catalogue. */
  RECORDS: 252,
  /** The stacks: archive boxes, filed by the minute. */
  STACKS: 253,
  /** The Bureau's desk: its panelled wall and motto. */
  BUREAU: 254,
  /** The Bureau's board: the certification, due by noon. */
  BUREAU_BOARD: 255,
};
const W = CIVIC_WALLS;

/** The wing's rooms, as carved (x is the column). */
export const CIVIC_HALL = { x0: 46, y0: 63, x1: 73, y1: 79 };
export const CIVIC_RECORDS = { x0: 22, y0: 63, x1: 43, y1: 79 };
export const CIVIC_BUREAU = { x0: 76, y0: 63, x1: 84, y1: 79 };
/** The garden beds: a kerb round each, the tree in the middle cell. */
export const CIVIC_BEDS = [
  { r: 64, c: 48 }, { r: 64, c: 69 },
  { r: 72, c: 48 }, { r: 72, c: 69 },
];
/** The fountain: a basin four cells square, its four jets in the middle. */
export const CIVIC_FOUNTAIN = { r: 68, c: 58 };
/** The security line across the hall, and its gates (columns left open). */
export const CIVIC_LINE = { r: 76, gates: [56, 59, 60, 63] };

const DAY = [240, 246, 255];
const WARM = [255, 226, 180];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** The curtain wall's art runs up to the ceiling (the map's tallWalls). */
  tallWalls: [W.WINDOW_A, W.WINDOW_B, W.WINDOW_C],
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    // The skylight's daylight down the balconies, and the low sun in
    // through the glass and the doors.
    { room: "civicHall", x: 51.5, y: 63.6, color: DAY, radius: 6, intensity: 0.7 },
    { room: "civicHall", x: 67.5, y: 63.6, color: DAY, radius: 6, intensity: 0.7 },
    { room: "civicHall", x: 46.8, y: 71.0, color: DAY, radius: 5, intensity: 0.6 },
    { room: "civicHall", x: 72.2, y: 71.0, color: DAY, radius: 5, intensity: 0.6 },
    { room: "civicHall", x: 52.0, y: 78.8, color: WARM, radius: 6, intensity: 0.65 },
    { room: "civicHall", x: 67.0, y: 78.8, color: WARM, radius: 6, intensity: 0.65 },
    // The fountain, lit from its basin.
    { room: "civicHall", x: 59.5, y: 69.5, color: [150, 210, 255], radius: 4, intensity: 0.55 },
    { room: "civicPassage", x: 58.9, y: 59.5, color: WARM, radius: 4, intensity: 0.5 },
    // Records: reading lamps in the stacks, daylight by the windows.
    { room: "records", x: 28.5, y: 68.5, color: WARM, radius: 5, intensity: 0.55 },
    { room: "records", x: 37.5, y: 68.5, color: WARM, radius: 5, intensity: 0.55 },
    { room: "records", x: 27.5, y: 77.5, color: DAY, radius: 5, intensity: 0.6 },
    { room: "records", x: 38.5, y: 77.5, color: DAY, radius: 5, intensity: 0.6 },
    // The Bureau's desk: office light, and the morning off the river.
    { room: "bureau", x: 80.0, y: 66.5, color: [230, 238, 255], radius: 5, intensity: 0.6 },
    { room: "bureau", x: 80.0, y: 76.0, color: [230, 238, 255], radius: 5, intensity: 0.6 },
    { room: "bureau", x: 83.6, y: 71.5, color: DAY, radius: 4, intensity: 0.5 },
  ],
  /**
   * Decks of its own (the WebGL floor shader, map.decks): marble under the
   * skylight in the hall, oak boards and plaster in the rest.
   */
  decks: [
    { ...CIVIC_HALL, kind: 1 },
    { x0: 58, y0: 58, x1: 59, y1: 62, kind: 2 },
    { ...CIVIC_RECORDS, kind: 2 },
    { ...CIVIC_BUREAU, kind: 2 },
    // The doorways through to records and the Bureau.
    { x0: 44, y0: 70, x1: 45, y1: 71, kind: 1 },
    { x0: 74, y0: 70, x1: 75, y1: 71, kind: 1 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    civicPassage: { x0: 57, y0: 58, x1: 60, y1: 62 },
    civicHall: { x0: 45, y0: 62, x1: 74, y1: 80 },
    records: { x0: 21, y0: 62, x1: 44, y1: 80 },
    bureau: { x0: 75, y0: 62, x1: 85, y1: 80 },
  },
  /** Props to add (`variant` picks a prop's look), and cells whose existing props to drop. */
  props: [
    // The hall: a tree in each bed, the fountain's jets, flags either side
    // of the public doors, benches under the balconies, the scanners in the
    // security line's gates, the queue's posts on the public side.
    ...CIVIC_BEDS.map(({ r, c }) => ({ x: c + 1, y: r + 1, type: "garden_tree" })),
    ...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([dc, dr]) => ({ x: CIVIC_FOUNTAIN.c + 1 + dc, y: CIVIC_FOUNTAIN.r + 1 + dr, type: "fountain" })),
    { x: 57, y: 79, type: "flag_stand" }, { x: 62, y: 79, type: "flag_stand" },
    { x: 47, y: 63, type: "potted_plant" }, { x: 72, y: 63, type: "potted_plant" },
    { x: 56, y: 63, type: "potted_plant" }, { x: 61, y: 63, type: "potted_plant" },
    { x: 46, y: 68, type: "bench" }, { x: 73, y: 68, type: "bench" },
    { x: 54, y: 70, type: "bench" }, { x: 65, y: 70, type: "bench" },
    ...CIVIC_LINE.gates.map((x) => ({ x, y: CIVIC_LINE.r, type: "scanner_arch" })),
    { x: 66, y: 73, type: "monitor_bank" },
    { x: 49, y: 78, type: "bench" }, { x: 70, y: 78, type: "bench" },
    { x: 46, y: 79, type: "potted_plant" }, { x: 73, y: 79, type: "potted_plant" },
    // Records: the reading room's tables and lamps, a trolley in the stacks.
    { x: 26, y: 77, type: "table" }, { x: 27, y: 77, type: "table" },
    { x: 26, y: 76, type: "chair" }, { x: 27, y: 78, type: "chair" },
    { x: 33, y: 77, type: "table" }, { x: 34, y: 77, type: "table" },
    { x: 33, y: 78, type: "chair" }, { x: 34, y: 76, type: "chair" },
    { x: 40, y: 76, type: "desk" }, { x: 41, y: 76, type: "desk" },
    { x: 42, y: 64, type: "filing_cabinet" }, { x: 42, y: 65, type: "filing_cabinet" },
    { x: 29, y: 69, type: "crate" }, { x: 23, y: 79, type: "potted_plant" },
    // The Bureau's desk.
    { x: 79, y: 67, type: "desk" }, { x: 80, y: 67, type: "desk" },
    { x: 79, y: 66, type: "chair" },
    { x: 79, y: 75, type: "desk" }, { x: 80, y: 75, type: "desk" },
    { x: 84, y: 64, type: "filing_cabinet" }, { x: 84, y: 65, type: "filing_cabinet" },
    { x: 77, y: 64, type: "monitor_bank" }, { x: 84, y: 79, type: "potted_plant" },
    { x: 77, y: 79, type: "vending_machine" },
    // The passage: something green on the way down.
    { x: 58, y: 60, type: "potted_plant" },
  ],
  dropProps: [],
  /** Rewrite the room's cells. `h` has the floor plan's helpers, and its heightMap. */
  dress(g, { carve, hm, lowWall, LAYER }) {
    // The passage down from the spine's south end.
    carve(58, 58, 61, 59);
    for (let r = 58; r <= 61; r++) {
      g[r][57] = W.STONE;
      g[r][60] = W.STONE;
    }
    g[59][57] = W.DIRECTORY;
    // The rooms, and the doors between them.
    for (const b of [CIVIC_HALL, CIVIC_RECORDS, CIVIC_BUREAU]) carve(b.y0, b.x0, b.y1, b.x1);
    carve(62, 58, 62, 59);
    carve(70, 44, 71, 45);
    carve(70, 74, 71, 75);
    const wall = (r, c, v) => {
      if (g[r][c] !== 0) g[r][c] = v;
    };

    // The great hall. North: balconies and columns, the seal over the way
    // in from the station, banners either side, the cornerstone.
    for (let c = 45; c <= 74; c++) {
      wall(62, c, c % 3 === 0 ? W.COLUMN : W.BALCONY);
      // South: the curtain wall onto the street, the public doors in the middle.
      wall(80, c, [W.WINDOW_A, W.WINDOW_B, W.WINDOW_C][c % 3]);
    }
    for (const c of [58, 59, 60, 61]) g[80][c] = W.ENTRANCE;
    g[80][45] = W.STONE;
    g[80][74] = W.STONE;
    g[62][57] = W.SEAL;
    g[62][60] = W.SEAL;
    g[62][55] = W.BANNER;
    g[62][62] = W.BANNER;
    g[62][51] = W.BANNER;
    g[62][66] = W.BANNER;
    for (let r = 63; r <= 79; r++) {
      wall(r, 45, r % 3 === 0 ? W.COLUMN : W.BALCONY);
      wall(r, 74, r % 3 === 0 ? W.COLUMN : W.BALCONY);
    }
    g[67][45] = W.DIRECTORY;
    g[67][74] = W.PLAQUE;
    // Its gardens: four beds behind knee-high granite, a tree in each.
    for (const { r, c } of CIVIC_BEDS) {
      lowWall(g, hm, r, c, r + 2, c + 2, LAYER.KNEE, W.PLANTER);
      g[r + 1][c + 1] = 0;
      hm[r + 1][c + 1] = LAYER.FULL;
    }
    // Long beds along the hall's north side, either side of the way in.
    lowWall(g, hm, 66, 52, 66, 55, LAYER.KNEE, W.PLANTER);
    lowWall(g, hm, 66, 62, 66, 65, LAYER.KNEE, W.PLANTER);
    // The fountain: its basin round four jets.
    const F = CIVIC_FOUNTAIN;
    lowWall(g, hm, F.r, F.c, F.r + 3, F.c + 3, LAYER.WAIST, W.FOUNTAIN);
    for (const [dr, dc] of [[1, 1], [1, 2], [2, 1], [2, 2]]) {
      g[F.r + dr][F.c + dc] = 0;
      hm[F.r + dr][F.c + dc] = LAYER.FULL;
    }
    // Security: the desk, and the line of glass gates across the hall.
    lowWall(g, hm, 74, 63, 74, 66, LAYER.WAIST, W.CHECK_DESK);
    lowWall(g, hm, CIVIC_LINE.r, CIVIC_HALL.x0, CIVIC_LINE.r, CIVIC_HALL.x1, LAYER.WAIST, W.CHECK_GATE);
    for (const c of CIVIC_LINE.gates) {
      g[CIVIC_LINE.r][c] = 0;
      hm[CIVIC_LINE.r][c] = LAYER.FULL;
    }

    // Records: panelled round, the stacks in rows north to south, the
    // reading room along the windows.
    for (let c = 21; c <= 44; c++) {
      wall(62, c, W.RECORDS);
      wall(80, c, c === 21 || c === 44 ? W.RECORDS : [W.WINDOW_C, W.WINDOW_A, W.WINDOW_B][c % 3]);
    }
    for (let r = 62; r <= 80; r++) {
      wall(r, 21, W.RECORDS);
      wall(r, 44, W.RECORDS);
    }
    for (const c of [24, 27, 30, 33, 36]) for (let r = 64; r <= 73; r++) g[r][c] = W.STACKS;

    // The Bureau's desk: panelled, its board on the north wall, glass on
    // the river to the east and south.
    for (let c = 75; c <= 85; c++) {
      wall(62, c, W.BUREAU);
      wall(80, c, c === 75 || c === 85 ? W.BUREAU : [W.WINDOW_B, W.WINDOW_C, W.WINDOW_A][c % 3]);
    }
    for (let r = 62; r <= 80; r++) {
      wall(r, 75, W.BUREAU);
      if (r > 62 && r < 80) g[r][85] = [W.WINDOW_A, W.WINDOW_B, W.WINDOW_C][r % 3];
      else g[r][85] = W.BUREAU;
    }
    g[62][80] = W.BUREAU_BOARD;
  },
};
