/**
 * Dress the station floors' rooms after their floor plans are built.
 *
 * The maps were laid out as rooms of bare hull, so every floor read as the
 * same grey corridor whatever the story said it was. Each dresser here names
 * what a floor's rooms are (holding cells, interview rooms, dispatch, the
 * labs, the reactor plant) and hangs that on their walls, with the
 * furniture to match and, where a room had nothing to stand behind, a desk
 * or a counter at waist height.
 *
 * It only ever repaints plain walls (hull, tech, bulkhead) that face open
 * floor: doors, secret panels, glass, energy and rift walls keep their tile,
 * so nothing a set piece, a secret or the exit planner reads changes. The
 * cover it adds is never a lone pillar, so varyCover (map-helpers.js) walks
 * the same pillars with the same rolls it always did.
 *
 * Wall ids: src/data/levels/rooms/precinct.js (painted by
 * src/rendering/env/rooms/precinct.js) and the prologue rooms' it reuses.
 */
import { createHeights, LAYER } from "./map-helpers.js";
import { PRECINCT_WALLS as P, SHARED_WALLS as S } from "./rooms/precinct.js";

const PLAIN = new Set([1, 2, 3]);
// The reactor level is built of energy-cell wall (4) throughout, so there
// the plain wall it dresses is that.
const PLAIN_REACTOR = new Set([1, 2, 3, 4]);

/**
 * The tools a dresser works with, bound to one level. Rows and columns are
 * the builders' (r, c); props go down as { x: c, y: r }.
 */
function toolkit(level, plain = PLAIN) {
  const g = level.grid;
  const hm = level.heightMap || createHeights(level.width, level.height);
  const props = [];
  const floorBeside = (r, c) =>
    g[r - 1]?.[c] === 0 || g[r + 1]?.[c] === 0 || g[r]?.[c - 1] === 0 || g[r]?.[c + 1] === 0;
  /** Repaint one wall cell, if it is plain wall someone can see. */
  const at = (r, c, id) => {
    if (id == null || !plain.has(g[r]?.[c]) || !floorBeside(r, c)) return;
    if (hm[r][c] < LAYER.FULL) return; // low cover keeps its own look
    g[r][c] = id;
  };
  /** A run of wall along a row or a column, the ids repeated along it. */
  const row = (r, c1, c2, ids) => {
    for (let c = c1; c <= c2; c++) at(r, c, ids[(c - c1) % ids.length]);
  };
  const col = (c, r1, r2, ids) => {
    for (let r = r1; r <= r2; r++) at(r, c, ids[(r - r1) % ids.length]);
  };
  return {
    g,
    at,
    row,
    col,
    /**
     * The four walls round a room's interior { r1, c1, r2, c2 }: `n`, `s`,
     * `w`, `e` are the ids each side repeats (any may be left out).
     */
    walls({ r1, c1, r2, c2 }, { n, s, w, e }) {
      if (n) row(r1 - 1, c1, c2, n);
      if (s) row(r2 + 1, c1, c2, s);
      if (w) col(c1 - 1, r1, r2, w);
      if (e) col(c2 + 1, r1, r2, e);
    },
    /**
     * Every plain wall someone can see inside a rectangle, the ids laid
     * along it on the diagonal (null leaves the wall as it was): for the
     * big halls and shafts, where a room is its whole area.
     */
    area(r1, c1, r2, c2, ids) {
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) at(r, c, ids[(r + c) % ids.length]);
    },
    /** Waist-high furniture you can crouch behind and shoot over. */
    low(r1, c1, r2, c2, id = 3, layers = LAYER.WAIST) {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          if (g[r][c] !== 0) continue;
          g[r][c] = id;
          hm[r][c] = layers;
        }
      }
    },
    prop(r, c, type) {
      props.push({ x: c, y: r, type });
    },
    done() {
      return { ...level, heightMap: hm, props: [...(level.props || []), ...props] };
    },
  };
}

// The corridor runs: the station's painted block with what hangs in a
// police building's halls, a lamp bracket between each.
const HALL = [S.CORRIDOR, S.PHOTOS, S.CORRIDOR, S.NOTICE, S.CORRIDOR, S.WANTED];
const HALL_QUIET = [S.CORRIDOR, S.CORRIDOR, S.NOTICE, S.CORRIDOR, S.CORRIDOR, S.PHOTOS];
const OFFICE = [S.BLIND, S.BINDERS, S.BLIND, S.OFFICE_NOTICES];
// Spare banks mostly, a named pair now and then: the same names round a
// room read as one locker pasted down the wall.
const LOCKERS = [S.LOCKERS_SPARE_1, S.LOCKERS_A, S.LOCKERS_SPARE_2, S.LOCKERS_SPARE_3, S.LOCKERS_B, S.LOCKERS_SPARE_1, S.LOCKERS_SPARE_2, S.LOCKERS_E, S.LOCKERS_SPARE_3, S.LOCKERS_C, S.LOCKERS_SPARE_2, S.LOCKERS_G];
const EVIDENCE = [S.SHELVES_A, S.CAGE, S.SHELVES_B, S.CAGE];
const CELL_FRONT = [P.CELL_BARS, P.CELL_BARS, P.CELL_DOOR, P.CELL_BARS, P.CELL_BARS];
const LAB = [P.LAB_SHELVES, S.SIM_GRID, P.FUME_HOOD, S.SIM_GRID, P.LAB_BOARD, S.SIM_GRID];
const RACKS = [P.SERVER_RACK];
const PLANT = [P.GAUGES, null, P.GAUGES, null];
const LAB_HALL = [P.LAB_WALL, P.LAB_WALL, P.LAB_BOARD, P.LAB_WALL, P.LAB_WALL, P.LAB_SHELVES];

// ── I-1 Entry: the precinct's front floor ────────────────────────
// The lobby is the front desk, the crew quarters a locker room, the comms
// centre dispatch, the atrium the squad room, the west offices interview
// rooms either side of an observation room, east operations the briefing
// room and records, the supply room the evidence store, the armoury itself.
function dressEntry(level) {
  const d = toolkit(level);
  // Airlock and lobby: the division's crest facing you as the door opens.
  d.walls({ r1: 53, c1: 25, r2: 57, c2: 34 }, { w: [S.NOTICE, S.CORRIDOR], e: [S.CORRIDOR, S.WANTED, S.NOTICE] });
  d.walls({ r1: 44, c1: 17, r2: 51, c2: 42 }, { n: HALL, s: [S.PHOTOS, S.CORRIDOR, S.WANTED, S.CORRIDOR], w: [S.CREST], e: [S.CREST] });
  d.at(43, 26, S.CREST);
  d.at(43, 33, S.CREST);
  d.prop(48, 24, "bench");
  d.prop(48, 35, "bench");
  d.prop(51, 21, "vending_machine");
  // Locker room and bunk room off the south cross corridor.
  d.walls({ r1: 34, c1: 4, r2: 38, c2: 14 }, { n: LOCKERS, w: LOCKERS, s: [null, ...LOCKERS] });
  d.walls({ r1: 42, c1: 4, r2: 44, c2: 14 }, { s: LOCKERS, w: LOCKERS });
  d.prop(36, 8, "bench");
  d.prop(43, 8, "bench");
  // Dispatch: the ring board along the north wall, the console under it.
  d.walls({ r1: 35, c1: 45, r2: 37, c2: 55 }, { n: [P.DISPATCH, S.MONITORS, P.DISPATCH, S.MONITORS_CASE], e: [S.MONITORS_CASE], w: [S.MONITORS] });
  d.walls({ r1: 42, c1: 45, r2: 44, c2: 55 }, { s: [S.COFFEE, S.SINK, S.FRIDGE, S.ROSTER, S.CORRIDOR] });
  d.prop(36, 46, "chair");
  d.prop(36, 54, "chair");
  d.prop(43, 52, "table");
  d.prop(43, 53, "chair");
  // Cross corridors: the halls, a sign at each branch.
  d.walls({ r1: 40, c1: 5, r2: 41, c2: 54 }, { n: HALL, s: HALL_QUIET });
  d.walls({ r1: 18, c1: 5, r2: 19, c2: 54 }, { n: HALL_QUIET, s: HALL });
  d.at(39, 12, S.SIGN_LOCKERS);
  d.at(24, 16, P.SIGN_INTERVIEW);
  // The squad room: the main corridor runs through it, desks either side.
  d.walls({ r1: 22, c1: 17, r2: 38, c2: 26 }, { s: OFFICE, w: [S.CLOCK, ...OFFICE] });
  d.walls({ r1: 22, c1: 33, r2: 38, c2: 42 }, { s: OFFICE, e: [S.CLOCK, ...OFFICE] });
  d.walls({ r1: 13, c1: 27, r2: 43, c2: 32 }, { w: HALL_QUIET, e: HALL_QUIET });
  d.low(23, 18, 23, 19);
  d.low(32, 18, 32, 19);
  d.low(23, 40, 23, 41);
  d.low(32, 40, 32, 41);
  d.low(37, 24, 37, 25);
  d.low(37, 34, 37, 35);
  for (const [r, c] of [[24, 18], [33, 19], [24, 41], [33, 40], [36, 24], [36, 35]]) d.prop(r, c, "chair");
  for (const [r, c] of [[22, 25], [38, 18], [22, 34], [38, 41]]) d.prop(r, c, "filing_cabinet");
  d.prop(27, 25, "potted_plant");
  d.prop(27, 34, "potted_plant");
  // Interview 1 and 2 either side of the observation room, through one-way glass.
  d.walls({ r1: 21, c1: 4, r2: 23, c2: 15 }, { n: [P.INTERVIEW], w: [P.INTERVIEW], s: [P.ONE_WAY] });
  d.walls({ r1: 25, c1: 4, r2: 27, c2: 15 }, { w: [S.MONITORS, S.MONITORS_CASE] });
  d.walls({ r1: 29, c1: 4, r2: 31, c2: 15 }, { n: [P.ONE_WAY], w: [P.INTERVIEW], s: [P.INTERVIEW] });
  for (const r of [22, 30]) {
    d.prop(r, 7, "chair");
    d.prop(r, 9, "chair");
  }
  d.prop(26, 6, "monitor_bank");
  d.prop(26, 10, "chair");
  // Briefing room and records, east, behind the glass.
  d.walls({ r1: 21, c1: 44, r2: 25, c2: 55 }, { e: [P.CASE_BOARD], s: [S.BLIND, S.OFFICE_NOTICES] });
  d.walls({ r1: 27, c1: 44, r2: 31, c2: 55 }, { e: [S.SHELVES_A, S.SHELVES_B], s: [S.BINDERS, S.BOOKCASE] });
  for (const c of [47, 50, 53]) d.prop(24, c, "chair");
  d.prop(30, 47, "filing_cabinet");
  d.prop(30, 53, "filing_cabinet");
  // The watch commander's floor, where the level ends.
  d.walls({ r1: 3, c1: 18, r2: 12, c2: 41 }, { w: [P.CASE_BOARD, P.DISPATCH, S.MONITORS], e: [P.CASE_BOARD, S.MONITORS, S.MONITORS_CASE] });
  // The evidence store and the armoury.
  d.walls({ r1: 5, c1: 4, r2: 9, c2: 13 }, { n: EVIDENCE, w: [S.SHELVES_A, S.CUSTODY_LOG], e: [S.SHELVES_B], s: [P.INTAKE] });
  d.walls({ r1: 5, c1: 46, r2: 9, c2: 55 }, { n: [S.ARMORY_CAGE, S.ARMORY_AMMO], e: [S.ARMORY_AMMO, S.ARMORY_CAGE], w: [S.ARMORY_CAGE] });
  return d.done();
}

// ── I-2 Security Checkpoint: the security wing ───────────────────
// Booking in the plaza, holding cells either side, the security office's
// monitor wall, the observation deck over the cells, the armoury vault,
// the briefing room and the evidence room.
function dressCheckpoint(level) {
  const d = toolkit(level);
  d.walls({ r1: 52, c1: 20, r2: 57, c2: 39 }, { w: [S.NOTICE, S.CORRIDOR], e: [S.CORRIDOR, S.WANTED], s: HALL_QUIET });
  // Booking: height charts down the plaza's sides, the sign over the lanes.
  d.walls({ r1: 45, c1: 14, r2: 51, c2: 45 }, { w: [P.BOOKING, S.CORRIDOR], e: [P.BOOKING, S.CORRIDOR], s: [S.CORRIDOR, S.NOTICE] });
  d.prop(50, 16, "bench");
  d.prop(50, 43, "bench");
  // Holding, west and east: bars to the walkway, the bunk wall at the back.
  for (const r1 of [28, 36, 40]) {
    d.walls({ r1, c1: 4, r2: r1 + 2, c2: 11 }, { e: CELL_FRONT.slice(1, 4), w: [P.CELL_BACK] });
    d.walls({ r1, c1: 48, r2: r1 + 2, c2: 55 }, { w: CELL_FRONT.slice(1, 4), e: [P.CELL_BACK] });
  }
  d.walls({ r1: 27, c1: 13, r2: 43, c2: 15 }, { e: [S.CORRIDOR, S.CUSTODY_LOG, S.CORRIDOR, S.NOTICE] });
  d.walls({ r1: 27, c1: 44, r2: 43, c2: 46 }, { w: [S.CORRIDOR, S.NOTICE, S.CORRIDOR, S.CUSTODY_LOG] });
  d.at(27, 14, P.SIGN_HOLDING);
  d.at(27, 45, P.SIGN_HOLDING);
  // The central corridor and the east-west run.
  d.walls({ r1: 33, c1: 16, r2: 34, c2: 43 }, { n: HALL, s: HALL_QUIET });
  d.walls({ r1: 27, c1: 27, r2: 32, c2: 32 }, { w: HALL_QUIET, e: HALL_QUIET });
  // Security office: the monitor wall is already there; dispatch either side.
  d.row(19, 24, 35, [S.MONITORS, S.MONITORS_CASE]);
  d.walls({ r1: 20, c1: 21, r2: 25, c2: 38 }, { w: [P.DISPATCH, S.MONITORS], e: [P.DISPATCH, S.MONITORS], s: OFFICE });
  d.prop(24, 24, "chair");
  d.prop(24, 35, "chair");
  // The observation deck over the west cells.
  d.walls({ r1: 20, c1: 4, r2: 23, c2: 15 }, { w: [S.MONITORS, S.MONITORS_CASE], e: [S.MONITORS_CASE] });
  // Armoury vault.
  d.walls({ r1: 20, c1: 44, r2: 23, c2: 55 }, { n: [S.ARMORY_CAGE, S.ARMORY_AMMO, S.ARMORY_CAGE], e: [S.ARMORY_AMMO], s: [S.ARMORY_AMMO, S.ARMORY_CAGE] });
  // The north patrol corridor.
  d.walls({ r1: 13, c1: 5, r2: 18, c2: 54 }, { n: HALL, s: HALL_QUIET });
  // Briefing room: the case board, the blinds, rows of chairs to it.
  d.walls({ r1: 4, c1: 4, r2: 10, c2: 17 }, { n: [S.BLIND, P.CASE_BOARD, P.CASE_BOARD, S.BLIND], w: [S.OFFICE_NOTICES, S.BLIND], e: OFFICE });
  for (const c of [6, 8, 11, 14, 16]) d.prop(9, c, "chair");
  // Evidence: the cage along the north, intake by the door.
  d.at(11, 47, P.INTAKE);
  d.walls({ r1: 4, c1: 42, r2: 10, c2: 55 }, { n: EVIDENCE, e: [S.SHELVES_A, S.CUSTODY_LOG], w: [S.SHELVES_B], s: [S.SHELVES_B, S.SHELVES_A] });
  // The sally port out: the crest over the last door.
  d.walls({ r1: 4, c1: 23, r2: 10, c2: 36 }, { n: [S.CORRIDOR, S.WANTED, S.CORRIDOR], w: [P.CASE_BOARD], e: [S.WANTED] });
  return d.done();
}

// ── I-3 Research Wing: the research division ─────────────────────
// Lab benches in the bio-lab and physics lab bays, specimen shelving down
// the hallway, the data archive as records, server racks in the NW room,
// and Voss' early office lined with books and his whiteboard.
function dressResearch(level) {
  const d = toolkit(level);
  d.walls({ r1: 52, c1: 22, r2: 57, c2: 37 }, { w: [P.LAB_WALL, P.LAB_BOARD], e: [P.LAB_WALL, P.LAB_SHELVES] });
  d.walls({ r1: 47, c1: 14, r2: 51, c2: 45 }, { s: LAB_HALL, w: [P.SIGN_RESEARCH], e: [P.SIGN_RESEARCH] });
  // The bio-lab and the physics lab: benches against the walls of their bays.
  d.walls({ r1: 35, c1: 4, r2: 45, c2: 23 }, { n: LAB, w: [P.FUME_HOOD, P.LAB_SHELVES] });
  d.walls({ r1: 35, c1: 36, r2: 45, c2: 55 }, { n: [S.CRATES, P.LAB_BOARD, S.SIM_GRID, P.LAB_SHELVES], e: [P.FUME_HOOD, S.SIM_GRID] });
  d.low(44, 5, 44, 7);
  d.low(44, 12, 44, 14);
  d.low(35, 52, 35, 54);
  d.low(45, 36, 45, 38);
  for (const [r, c] of [[43, 6], [43, 13], [36, 53], [44, 37]]) d.prop(r, c, "chair");
  // The specimen hallway and the corridors.
  d.walls({ r1: 22, c1: 25, r2: 46, c2: 34 }, { w: [P.LAB_SHELVES], e: [P.LAB_SHELVES] });
  d.walls({ r1: 30, c1: 5, r2: 31, c2: 54 }, { n: LAB_HALL, s: LAB_HALL });
  d.walls({ r1: 16, c1: 5, r2: 21, c2: 54 }, { n: LAB_HALL, s: LAB_HALL });
  // The data archive is the division's records.
  d.walls({ r1: 23, c1: 4, r2: 28, c2: 19 }, { n: [S.SHELVES_A, S.BINDERS, S.SHELVES_B], s: [S.BOOKCASE, S.SHELVES_A], w: [S.BINDERS] });
  d.at(29, 9, P.SIGN_RECORDS);
  // The server room.
  d.walls({ r1: 5, c1: 4, r2: 13, c2: 17 }, { n: RACKS, w: RACKS, e: RACKS });
  d.at(15, 6, P.SIGN_DATA);
  // Voss' early office.
  d.walls({ r1: 5, c1: 22, r2: 13, c2: 37 }, { n: [S.BOOKCASE, P.LAB_BOARD, S.BOOKCASE, S.BLIND], w: [S.BOOKCASE, S.COMMENDATIONS], e: [P.LAB_BOARD, S.BOOKCASE] });
  return d.done();
}

// ── I-4 Containment Block: the detention level ───────────────────
// Booking and property intake at the door, the cell banks behind their bars,
// the guard station over the spine, a gallery of cells round the Shield
// Commander's floor, the warden's office and the evidence locker.
function dressContainment(level) {
  const d = toolkit(level);
  d.walls({ r1: 53, c1: 26, r2: 57, c2: 33 }, { w: [S.NOTICE, S.CORRIDOR], e: [S.WANTED, S.CORRIDOR] });
  d.walls({ r1: 44, c1: 13, r2: 52, c2: 46 }, { s: [P.BOOKING, S.CORRIDOR, P.INTAKE, S.CORRIDOR], w: [P.BOOKING, S.CORRIDOR], e: [P.BOOKING, S.CORRIDOR] });
  d.prop(46, 16, "bench");
  d.prop(46, 43, "bench");
  // The cell banks: bars to the walkway, bunks at the back.
  for (const r1 of [29, 33, 37, 41]) {
    d.walls({ r1, c1: 4, r2: r1 + 2, c2: 11 }, { e: CELL_FRONT.slice(1, 4), w: [P.CELL_BACK] });
    d.walls({ r1, c1: 48, r2: r1 + 2, c2: 55 }, { w: CELL_FRONT.slice(1, 4), e: [P.CELL_BACK] });
  }
  d.walls({ r1: 28, c1: 13, r2: 43, c2: 16 }, { e: [S.CORRIDOR, S.CUSTODY_LOG, S.CORRIDOR, S.NOTICE] });
  d.walls({ r1: 28, c1: 43, r2: 43, c2: 46 }, { w: [S.CORRIDOR, S.NOTICE, S.CORRIDOR, S.CUSTODY_LOG] });
  d.walls({ r1: 28, c1: 27, r2: 43, c2: 32 }, { w: HALL_QUIET, e: HALL_QUIET });
  // The guard station.
  d.walls({ r1: 21, c1: 21, r2: 26, c2: 38 }, { n: [S.MONITORS, S.MONITORS_CASE, P.DISPATCH], w: [P.DISPATCH, S.MONITORS], e: [P.DISPATCH, S.MONITORS] });
  // The north corridor, and the gallery of cells round the arena.
  d.walls({ r1: 13, c1: 5, r2: 19, c2: 54 }, { n: HALL_QUIET, s: HALL });
  d.at(12, 6, P.SIGN_DETENTION);
  d.walls({ r1: 3, c1: 18, r2: 12, c2: 41 }, { w: CELL_FRONT, e: CELL_FRONT });
  // The warden's office and the evidence locker.
  d.walls({ r1: 5, c1: 4, r2: 10, c2: 13 }, { n: [S.COMMENDATIONS, S.BLIND, S.BINDERS], w: [S.BLIND, S.BINDERS], e: OFFICE });
  d.walls({ r1: 5, c1: 46, r2: 10, c2: 55 }, { n: EVIDENCE, w: [S.SHELVES_A, S.CUSTODY_LOG], e: [S.SHELVES_B] });
  return d.done();
}

// ── I-5 Server Farm: the data centre ──────────────────────────────
// Rack rows down the pods and the north corridor (racks you can stand
// behind but not see over), the mainframe's monitors, the archives' files.
function dressServerFarm(level) {
  const d = toolkit(level);
  d.walls({ r1: 53, c1: 26, r2: 57, c2: 33 }, { w: [P.SIGN_DATA, P.LAB_WALL], e: [P.LAB_WALL] });
  d.walls({ r1: 44, c1: 15, r2: 52, c2: 44 }, { s: [P.SERVER_RACK, P.LAB_WALL], w: RACKS, e: RACKS });
  d.walls({ r1: 35, c1: 5, r2: 42, c2: 15 }, { n: RACKS, w: RACKS, e: RACKS });
  d.walls({ r1: 35, c1: 44, r2: 42, c2: 54 }, { n: RACKS, w: RACKS, e: RACKS });
  d.walls({ r1: 32, c1: 17, r2: 33, c2: 42 }, { s: LAB_HALL });
  d.walls({ r1: 34, c1: 27, r2: 43, c2: 32 }, { w: RACKS, e: RACKS });
  d.walls({ r1: 21, c1: 21, r2: 30, c2: 38 }, { w: [S.MONITORS, S.MONITORS_CASE], e: [S.MONITORS_CASE, S.MONITORS] });
  // The north corridor was a 50-tile empty run: two rack rows stand in it.
  d.walls({ r1: 13, c1: 5, r2: 19, c2: 54 }, { n: LAB_HALL, s: [P.SERVER_RACK, P.LAB_WALL] });
  d.low(15, 20, 16, 20, P.SERVER_RACK, LAYER.TALL);
  d.low(15, 39, 16, 39, P.SERVER_RACK, LAYER.TALL);
  d.walls({ r1: 5, c1: 4, r2: 10, c2: 15 }, { n: [S.SHELVES_A, S.BINDERS, S.SHELVES_B], w: [S.BINDERS] });
  d.walls({ r1: 5, c1: 44, r2: 10, c2: 55 }, { n: [S.SHELVES_B, S.BINDERS, S.SHELVES_A], e: [S.BINDERS] });
  d.walls({ r1: 4, c1: 18, r2: 11, c2: 41 }, { w: RACKS, e: RACKS });
  return d.done();
}

// ── I-6 Reactor Access: the reactor level ─────────────────────────
// The plant: pipe runs and gauges round the ring and down the conduit
// tunnels, the radiation notice where you come in, the control room's
// monitors, and the stores.
function dressReactor(level) {
  const d = toolkit(level, PLAIN_REACTOR);
  d.walls({ r1: 53, c1: 26, r2: 57, c2: 33 }, { w: [P.RADIATION, null], e: [null, P.RADIATION] });
  d.walls({ r1: 44, c1: 5, r2: 52, c2: 54 }, { s: PLANT });
  d.walls({ r1: 20, c1: 4, r2: 43, c2: 12 }, { w: PLANT, e: PLANT });
  d.walls({ r1: 20, c1: 47, r2: 43, c2: 55 }, { w: PLANT, e: PLANT });
  d.walls({ r1: 13, c1: 5, r2: 19, c2: 54 }, { n: PLANT });
  d.at(12, 30, P.SIGN_REACTOR);
  d.walls({ r1: 4, c1: 18, r2: 11, c2: 41 }, { n: [S.MONITORS, S.MONITORS_CASE, P.GAUGES], w: [P.GAUGES, S.MONITORS], e: [S.MONITORS, P.GAUGES] });
  d.walls({ r1: 5, c1: 4, r2: 10, c2: 15 }, { n: [S.CRATES], w: [S.CRATES, S.ARMORY_AMMO] });
  d.walls({ r1: 5, c1: 44, r2: 10, c2: 55 }, { n: [S.CRATES], e: [S.CRATES, S.ARMORY_AMMO] });
  return d.done();
}

// ── I-7 Voss' Laboratory: the restricted level ────────────────────
// Four lab wings, the corridors between them, the supply rooms, and his
// study: books, the whiteboard where he worked the eleven seconds out.
function dressVossLab(level) {
  const d = toolkit(level);
  d.walls({ r1: 35, c1: 5, r2: 43, c2: 17 }, { s: LAB, w: [P.FUME_HOOD, P.LAB_SHELVES] });
  d.walls({ r1: 35, c1: 42, r2: 43, c2: 54 }, { s: LAB, e: [P.LAB_SHELVES, P.FUME_HOOD] });
  d.walls({ r1: 19, c1: 5, r2: 29, c2: 17 }, { n: [S.BOOKCASE, P.LAB_BOARD, S.BOOKCASE], s: LAB });
  d.walls({ r1: 19, c1: 42, r2: 29, c2: 54 }, { n: [S.CRATES, P.LAB_BOARD, S.SIM_GRID], s: LAB });
  d.low(28, 8, 28, 10);
  d.low(28, 46, 28, 48);
  d.prop(29, 9, "chair");
  d.prop(29, 47, "chair");
  d.walls({ r1: 12, c1: 5, r2: 17, c2: 54 }, { n: LAB_HALL, s: LAB_HALL });
  d.walls({ r1: 32, c1: 11, r2: 33, c2: 48 }, { n: LAB_HALL, s: LAB_HALL });
  d.walls({ r1: 44, c1: 5, r2: 57, c2: 10 }, { w: LAB_HALL, e: LAB_HALL });
  d.walls({ r1: 4, c1: 21, r2: 10, c2: 38 }, { n: [S.BOOKCASE, S.BOOKCASE, P.LAB_BOARD], w: [S.BOOKCASE, S.COMMENDATIONS], e: [P.LAB_BOARD, S.BOOKCASE] });
  d.walls({ r1: 5, c1: 4, r2: 9, c2: 15 }, { n: [P.LAB_SHELVES, S.CRATES] });
  d.walls({ r1: 5, c1: 44, r2: 9, c2: 55 }, { n: [S.CRATES, P.LAB_SHELVES] });
  return d.done();
}

// ── Act II: the outer rings ──────────────────────────────────────
// Nothing here is police but the Precinct, which is the prologue's own
// rooms already. The rest are the station's plant and its public decks, so
// they get its pipework, crates, notices and lockers, sparsely: a hall of
// one picture over and over reads as wallpaper, not a place.

const PIPES = [P.GAUGES, null, null, null];
const SCRAP = [S.CRATES, null, S.CRATES, null, null];
const PUBLIC = [S.CORRIDOR, S.NOTICE, S.CORRIDOR, S.WANTED, S.CORRIDOR, S.PHOTOS];
const CONTROL = [S.MONITORS, S.MONITORS_CASE, P.DISPATCH];

// II-1: the crash bay's wreckage, the shafts' and pump hall's pipework,
// the control room's screens, the lift lobby's notices.
function dressEvacShafts(level) {
  const d = toolkit(level);
  d.area(2, 31, 8, 37, CONTROL);
  d.area(2, 3, 13, 31, PIPES);
  d.area(12, 5, 48, 10, PIPES);
  d.area(48, 2, 57, 18, SCRAP);
  d.area(28, 41, 41, 57, [S.NOTICE, null, S.FIRE, null, S.CORRIDOR]);
  return d.done();
}

// II-2: the hangar's racked salvage, Rook's armoury on the east side, the
// receiving hall's notices, the dock ring's plant.
function dressSalvageDeck(level) {
  const d = toolkit(level);
  d.area(21, 44, 38, 56, [S.ARMORY_CAGE, S.ARMORY_AMMO, null]);
  d.area(19, 5, 44, 44, SCRAP);
  d.area(44, 15, 56, 44, [S.NOTICE, S.CRATES, null, S.FIRE, null]);
  d.area(0, 2, 19, 57, PIPES);
  return d.done();
}

// II-3: the spine's plant, and Kai's drafting office.
function dressMaintenanceSpine(level) {
  const d = toolkit(level);
  d.area(3, 3, 10, 17, [S.BINDERS, P.LAB_BOARD, S.BOOKCASE, S.BLIND]);
  d.area(49, 2, 57, 14, [S.NOTICE, S.FIRE, null]);
  d.area(14, 3, 24, 31, [S.CRATES, null, P.GAUGES, null]);
  d.area(0, 0, 59, 59, PIPES);
  return d.done();
}

// II-4: the stations' public walls, and the transit police post at the
// south-east station.
function dressTransitLoop(level) {
  const d = toolkit(level);
  d.area(35, 34, 49, 49, [S.WANTED, S.CORRIDOR, S.NOTICE, S.CORRIDOR, P.CELL_DOOR, S.CORRIDOR]);
  d.area(10, 10, 23, 25, PUBLIC);
  d.area(39, 10, 50, 25, PUBLIC);
  d.area(9, 34, 20, 49, PUBLIC);
  return d.done();
}

// II-5: the lounge's kitchenette, the seed vault's shelving, the
// glasshouse's clean white panels.
function dressGreenhouse(level) {
  const d = toolkit(level);
  d.area(47, 21, 57, 38, [S.COFFEE, null, S.NOTICE, null, S.FRIDGE, null]);
  d.area(3, 15, 20, 42, [P.LAB_SHELVES, null, P.LAB_SHELVES, P.LAB_WALL]);
  d.area(19, 2, 37, 16, [P.LAB_WALL, null]);
  return d.done();
}

// II-7: the rack hall's suit lockers and the casting floor's plant.
function dressFoundry(level) {
  const d = toolkit(level);
  d.area(50, 21, 57, 38, [S.NOTICE, S.FIRE, null]);
  d.area(29, 7, 43, 52, [S.LOCKERS_SPARE_1, S.LOCKERS_SPARE_2, null, S.LOCKERS_SPARE_3]);
  d.area(3, 7, 29, 52, PIPES);
  return d.done();
}

// ── Acts III and IV ──────────────────────────────────────────────
// The remixes of the Act I floors are built on the dressed station maps, so
// they come back to the same rooms. These are the places that are new: the
// Archive (twice), the Engine (twice) and Habitat Ring C.

const STACKS = [S.SHELVES_A, S.SHELVES_B, S.BINDERS, S.SHELVES_B];

// III-5: the stacks halls are archive shelving, the vestibule the desk.
function dressArchive(level) {
  const d = toolkit(level);
  d.area(50, 22, 58, 38, [S.BINDERS, P.SIGN_RECORDS, S.BINDERS, S.CLOCK]);
  d.area(40, 3, 50, 56, STACKS);
  d.area(18, 3, 29, 56, STACKS);
  return d.done();
}

// III-6: the maintenance lift's notices and the arcades' pipework; the
// processional itself is left as the hall it is.
function dressEngine(level) {
  const d = toolkit(level);
  d.area(51, 18, 58, 41, [S.NOTICE, null, S.FIRE, null]);
  d.area(17, 0, 47, 20, PIPES);
  d.area(17, 39, 47, 59, PIPES);
  return d.done();
}

// IV-2: Habitat Ring C. The tenements' halls, the market's stalls and
// stores, the transit gate's notices. The boulevard's own walls (cols 24-35)
// stay bare: its blocks have to repeat tile for tile for the loop to read.
function dressLoop(level) {
  const d = toolkit(level);
  d.area(14, 8, 46, 21, [S.CORRIDOR, S.PHOTOS, S.CORRIDOR, S.NOTICE]);
  d.area(14, 36, 46, 57, [S.CORRIDOR, S.CRATES, S.NOTICE, S.CORRIDOR, S.WANTED]);
  d.area(2, 15, 13, 45, PUBLIC);
  d.area(46, 7, 51, 53, PUBLIC);
  return d.done();
}

// IV-5: the Archive again, burning: the same stacks.
function dressArchiveBurns(level) {
  const d = toolkit(level);
  d.area(0, 0, 59, 59, [S.SHELVES_A, null, S.SHELVES_B, S.BINDERS, null]);
  return d.done();
}

// IV-6: Lyra's control booth, the stores, the gantry and the Engine hall's
// plant.
function dressEngineFiring(level) {
  const d = toolkit(level);
  d.area(3, 4, 11, 17, CONTROL);
  d.area(3, 42, 11, 55, [S.CRATES, S.ARMORY_AMMO, null]);
  d.area(49, 21, 58, 38, [S.NOTICE, S.FIRE, null]);
  d.area(12, 4, 49, 55, [P.GAUGES, null, null, null, null, null]);
  return d.done();
}

const DRESSERS = {
  entry: dressEntry,
  checkpoint: dressCheckpoint,
  research: dressResearch,
  containment: dressContainment,
  server_farm: dressServerFarm,
  reactor: dressReactor,
  voss_lab: dressVossLab,
  evac_shafts: dressEvacShafts,
  salvage_deck: dressSalvageDeck,
  maintenance_spine: dressMaintenanceSpine,
  transit_loop: dressTransitLoop,
  greenhouse: dressGreenhouse,
  foundry: dressFoundry,
  archive: dressArchive,
  engine: dressEngine,
  the_loop: dressLoop,
  archive_burns: dressArchiveBurns,
  engine_firing: dressEngineFiring,
};

/** Whether a dresser may repaint a wall tile on this map. */
export const repaintable = (id, tile) => (id === "reactor" ? PLAIN_REACTOR : PLAIN).has(tile);

/** The level as dressed for its story, or as built when nothing dresses it. */
export function dressStation(id, level) {
  const fn = DRESSERS[id];
  return fn ? fn(level) : level;
}
