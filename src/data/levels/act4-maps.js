// ═══════════════════════════════════════════════════════════════════
// ACT IV MAPS — The Sacrifice
// Seven levels, one ally staying behind in each of the middle four, in the
// reverse of the order they joined (spec docs/superpowers/specs/
// 2026-09-22-campaign-story-restructure-design.md §7, Act IV):
//
//   IV-1 entry_last        the airlock where it began, falling into the rift
//   IV-2 the_loop          a district caught in a loop; rewind through the seam
//   IV-3 containment_last  Kael's last stand: a fighting retreat to the doors
//   IV-4 nexus_decoy       Nova runs toward them, and the level is yours
//   IV-5 archive_burns     Rook burns the Archive behind you
//   IV-6 engine_firing     Lyra fires the Engine on her countdown
//   IV-7 core_endgame      the Core with its rings gone: you, alone, and him
//
// The remixes start from the finished station grid (cloned, never the shared
// one) and re-carve it; the new maps are built from scratch on the same
// skeleton. Which way each level runs is the level entry's rotation in
// src/data/campaign/acts.js; everything here, set pieces included, is in the
// map's own coordinates, before that turn.
//
// `ACT4_SET_PIECES` are the Act IV chrono set pieces
// (src/data/campaign/set-pieces.js spreads them into SET_PIECES): cells are
// [col, row], rects [c1, r1, c2, r2], points world units.
// Tile legend: 0 empty, 1 stone, 2 tech, 3 metal, 4 energy, 5 door,
// 6 secret, 7 boss wall, 8 glass, 9 temporal rift.
// ═══════════════════════════════════════════════════════════════════
import {
  createGrid,
  createHeights,
  carve,
  hWall,
  vWall,
  tile,
  door,
  room,
  lowWall,
  lowTile,
  LAYER,
} from "./map-helpers.js";
import { STATION_MAPS } from "./station-maps.js";

const W = 60;
const H = 60;
const RIFT = 9;

/** A station map's grid and heights, copied so the original never changes. */
function cloneStation(id) {
  const base = STATION_MAPS[id];
  return {
    g: structuredClone(base.grid),
    hm: base.heightMap ? structuredClone(base.heightMap) : createHeights(W, H),
  };
}

/** Every cell of a rect, row by row. */
function cellsOf([c1, r1, c2, r2]) {
  const out = [];
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) out.push([c, r]);
  return out;
}

/** A collapse that fills rows `from`..`to` of cols c1..c2, one row a step. */
function rowSweep(c1, c2, from, to) {
  const steps = [];
  const dir = to < from ? -1 : 1;
  for (let r = from; r !== to + dir; r += dir) steps.push(cellsOf([c1, r, c2, r]));
  return steps;
}

/** A collapse that fills columns `from`..`to` of rows r1..r2, one column a step. */
function colSweep(r1, r2, from, to) {
  const steps = [];
  const dir = to < from ? -1 : 1;
  for (let c = from; c !== to + dir; c += dir) steps.push(cellsOf([c, r1, c, r2]));
  return steps;
}

const enemy = (x, y, enemyType) => ({ x, y, type: "enemy", enemyType });
const pickup = (x, y, type, weaponId) =>
  weaponId == null ? { x, y, type } : { x, y, type, weaponId };

// ── IV-1: Entry — Last Time ──────────────────────────────────────
// The airlock where the game began. The station is falling toward the rift:
// a chasm of it tears the atrium corner to corner, so the straight corridor
// you walked on your first morning is gone and the way north runs through
// the offices. Behind you the lobby comes down into rift, row by row, while
// you fight in it.
// ──────────────────────────────────────────────────────────────────
function buildEntryLast() {
  const { g, hm } = cloneStation("entry");

  // The chasm: a three-wide band of rift from the atrium's north-west corner
  // to its south-east corner. Steps of at most two columns a row keep it
  // closed to a four-way walk, so the atrium really is cut in two.
  for (let r = 21; r <= 39; r++) {
    const c0 = 17 + Math.round(((r - 21) * 24) / 18);
    for (let c = c0; c <= c0 + 2; c++) if (c >= 16 && c <= 43) g[r][c] = RIFT;
  }

  // The offices become the road: doors through their shared walls and up
  // into the north cross corridor.
  door(g, 28, 12);
  door(g, 24, 12);
  door(g, 20, 12);

  // Rubble in what is left of the atrium: waist-high, so the fight across
  // the chasm has angles.
  lowWall(g, hm, 35, 19, 35, 20, LAYER.WAIST, 3);
  lowWall(g, hm, 37, 24, 37, 25, LAYER.KNEE, 3);
  lowWall(g, hm, 24, 36, 24, 37, LAYER.WAIST, 3);
  lowWall(g, hm, 31, 40, 32, 40, LAYER.WAIST, 3);
  // The lobby's reception desk split where the ceiling hit it.
  g[49][29] = 0;
  g[49][30] = 0;
  hm[49][29] = LAYER.FULL;
  hm[49][30] = LAYER.FULL;
  lowTile(g, hm, 47, 25, LAYER.KNEE, 3);

  // Rift veins through the command bridge: it is closest to the fall.
  tile(g, 4, 20, RIFT);
  tile(g, 11, 39, RIFT);
  tile(g, 8, 19, RIFT);
  lowWall(g, hm, 10, 22, 10, 23, LAYER.WAIST, 3);

  return {
    name: "Entry — Last Time",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // Lobby: the first fight, with the floor falling behind it.
      enemy(24.5, 46.5, "echoDrone"),
      enemy(35.5, 46.5, "echoDrone"),
      enemy(30.5, 45.5, "phaseStalker"),
      // Crew quarters and comms, off the south cross corridor.
      enemy(9.5, 36.5, "echoDrone"),
      enemy(50.5, 43.5, "sentinel"),
      // What is left of the atrium, this side of the chasm.
      enemy(20.5, 33.5, "beast"),
      enemy(29.5, 40.5, "sentinel"),
      // The offices, now the only road.
      enemy(9.5, 30.5, "riftLeaper"),
      enemy(9.5, 22.5, "phaseStalker"),
      // North cross corridor.
      enemy(18.5, 18.5, "riftLeaper"),
      enemy(40.5, 19.5, "riftLeaper"),
      // The far side of the chasm, and east operations.
      enemy(36.5, 26.5, "timeWarden"),
      enemy(24.5, 23.5, "echoDrone"),
      enemy(50.5, 29.5, "sentinel"),
      // Command bridge.
      enemy(25.5, 7.5, "beast"),
      enemy(35.5, 7.5, "sentinel"),
      enemy(30.5, 5.5, "timeWarden"),
      // ── Pickups ──
      pickup(20.5, 50.5, "health"),
      pickup(39.5, 50.5, "ammo"),
      pickup(8.5, 42.5, "ammo"),
      pickup(19.5, 37.5, "health"),
      pickup(5.5, 26.5, "ammo"),
      pickup(12.5, 18.5, "health"),
      pickup(45.5, 23.5, "ammo"),
      pickup(30.5, 9.5, "health"),
      pickup(50.5, 7.5, "ammo"),
      // Secrets
      pickup(1.5, 26.5, "health"),
      pickup(57.5, 28.5, "ammo"),
    ],
    exit: { x: 30.5, y: 3.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 26,
        description: "The supply cache from your first morning. Somebody left it exactly as you did.",
      },
      {
        wallX: 56,
        wallY: 28,
        description: "The armory reserve, half of it already floating toward the rift.",
      },
    ],
    props: [
      // The lobby you walked in through, three days and a lifetime ago.
      { x: 18, y: 52, type: "potted_plant" },
      { x: 41, y: 52, type: "potted_plant" },
      { x: 28, y: 49, type: "desk" },
      { x: 26, y: 50, type: "chair" },
      { x: 20, y: 44, type: "barrier" },
      { x: 38, y: 44, type: "barrier" },
      { x: 8, y: 26, type: "desk" },
      { x: 8, y: 30, type: "filing_cabinet" },
      { x: 14, y: 22, type: "filing_cabinet" },
      { x: 48, y: 23, type: "monitor_bank" },
      { x: 28, y: 7, type: "monitor_bank" },
      { x: 31, y: 7, type: "monitor_bank" },
      { x: 47, y: 6, type: "weapon_rack" },
      { x: 5, y: 6, type: "crate" },
    ],
  };
}

// ── IV-2: The Loop ───────────────────────────────────────────────
// Habitat Ring C, caught in a loop. The boulevard is built in four identical
// blocks, same lamps, same benches, same planters, so walking it reads as
// walking the same block again; its north end is a seam that puts you back
// at the south end. Only the first block does not quite match (its lamps
// are glass): Foresight shows the seam, and a rewind through it breaks it.
// Tenements to the west, a market to the east; behind one flat's wall, a
// room held still at one instant (voss_4).
// ──────────────────────────────────────────────────────────────────

/** The boulevard's four blocks, each eight rows from its top row. */
const LOOP_BLOCKS = [14, 22, 30, 38];

function buildLoop() {
  const g = createGrid(W, H, 1);
  const hm = createHeights(W, H);

  // ── ARRIVAL PLATFORM (south) ──
  carve(g, 52, 25, 57, 34);
  door(g, 51, 29);
  door(g, 51, 30);

  // ── SOUTH PLAZA (rows 46-50) ──
  carve(g, 46, 8, 50, 51);
  // A dry fountain in front of the boulevard's mouth.
  lowWall(g, hm, 47, 28, 48, 31, LAYER.WAIST, 3);
  lowWall(g, hm, 48, 14, 48, 16, LAYER.KNEE, 3);
  lowWall(g, hm, 47, 43, 47, 45, LAYER.WAIST, 3);

  // ── THE BOULEVARD (rows 14-44, cols 26-33): the loop ──
  carve(g, 14, 26, 44, 33);
  carve(g, 45, 26, 45, 33);
  for (const [i, t] of LOOP_BLOCKS.entries()) {
    // The first block's lamps are glass: the one place it does not match.
    const lamp = i === 0 ? 8 : 3;
    tile(g, t + 1, 27, lamp);
    tile(g, t + 1, 32, lamp);
    lowWall(g, hm, t + 4, 29, t + 4, 30, LAYER.KNEE, 3);
    // Side doors into the tenements and the market.
    door(g, t + 2, 25);
    carve(g, t + 2, 24, t + 2, 24);
    door(g, t + 2, 34);
    carve(g, t + 2, 35, t + 2, 35);
  }

  // ── TRANSIT GATE (north): the way out, past the seam ──
  carve(g, 13, 26, 13, 33);
  carve(g, 3, 16, 12, 43);
  tile(g, 6, 21, 3);
  tile(g, 6, 38, 3);
  tile(g, 10, 19, 3);
  tile(g, 10, 40, 3);
  // Turnstiles: knee-high, a bank of them with gaps.
  lowWall(g, hm, 8, 22, 8, 26, LAYER.KNEE, 3);
  lowWall(g, hm, 8, 33, 8, 37, LAYER.KNEE, 3);

  // ── WEST TENEMENTS ──
  carve(g, 15, 21, 45, 23); // back hall, open to the plaza at its foot
  room(g, 14, 8, 22, 20, 1);
  room(g, 22, 8, 30, 20, 1);
  room(g, 30, 8, 38, 20, 1);
  room(g, 38, 8, 45, 20, 1);
  for (const r of [18, 26, 34, 41]) door(g, r, 20);
  // Bunks and kitchen counters.
  for (const t of [15, 23, 31]) {
    lowWall(g, hm, t + 1, 10, t + 1, 12, LAYER.KNEE, 3);
    lowWall(g, hm, t + 5, 15, t + 5, 17, LAYER.WAIST, 3);
  }
  lowWall(g, hm, 40, 11, 40, 13, LAYER.KNEE, 3);

  // ── THE STILL FLAT (secret, behind the second tenement) ──
  carve(g, 23, 2, 29, 7);
  g[26][8] = 6;
  lowWall(g, hm, 25, 4, 25, 5, LAYER.WAIST, 3); // a table, set for three

  // ── EAST MARKET ──
  carve(g, 15, 36, 44, 55);
  carve(g, 45, 44, 45, 47); // back door to the plaza
  for (const r of [18, 24, 30, 36, 42]) {
    lowWall(g, hm, r, 38, r, 42, LAYER.WAIST, 3);
    lowWall(g, hm, r, 47, r, 53, LAYER.WAIST, 3);
  }
  tile(g, 21, 45, 3);
  tile(g, 27, 50, 3);
  tile(g, 33, 44, 3);
  tile(g, 39, 50, 3);
  // Secret: a stallholder's lockbox.
  carve(g, 29, 57, 31, 58);
  g[30][56] = 6;

  return {
    name: "The Loop",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // Plaza.
      enemy(18.5, 48.5, "echoDrone"),
      enemy(41.5, 49.5, "echoDrone"),
      enemy(29.5, 46.5, "riftLeaper"),
      // The boulevard: you will pass them more than once.
      enemy(28.5, 28.5, "echoDrone"),
      enemy(31.5, 40.5, "riftLeaper"),
      // Tenements.
      enemy(14.5, 18.5, "riftLeaper"),
      enemy(14.5, 34.5, "phaseStalker"),
      enemy(12.5, 42.5, "echoDrone"),
      enemy(22.5, 30.5, "sentinel"),
      // Market.
      enemy(44.5, 20.5, "riftLeaper"),
      enemy(50.5, 32.5, "riftLeaper"),
      enemy(40.5, 39.5, "echoDrone"),
      enemy(45.5, 27.5, "timeWarden"),
      // Transit gate, past the seam.
      enemy(29.5, 6.5, "timeWarden"),
      enemy(22.5, 5.5, "riftLeaper"),
      enemy(37.5, 5.5, "riftLeaper"),
      enemy(29.5, 10.5, "sentinel"),
      // ── Pickups ──
      pickup(10.5, 49.5, "health"),
      pickup(49.5, 48.5, "ammo"),
      pickup(26.5, 36.5, "ammo"),
      pickup(12.5, 25.5, "health"),
      pickup(17.5, 39.5, "ammo"),
      pickup(53.5, 16.5, "health"),
      pickup(38.5, 43.5, "ammo"),
      pickup(18.5, 4.5, "health"),
      pickup(41.5, 11.5, "ammo"),
      // The still flat and the lockbox.
      pickup(3.5, 27.5, "health"),
      pickup(57.5, 30.5, "ammo"),
    ],
    exit: { x: 29.5, y: 4.5 },
    secrets: [
      {
        wallX: 8,
        wallY: 26,
        description: "A flat held still at one instant. Three mugs on the table. One of them is still falling.",
      },
      {
        wallX: 56,
        wallY: 30,
        description: "A stallholder's lockbox. The receipt inside is dated tomorrow.",
      },
    ],
    props: [
      // The same block, four times: a bench, a vending machine, a plant.
      ...LOOP_BLOCKS.flatMap((t) => [
        { x: 28, y: t + 6, type: "bench" },
        { x: 33, y: t + 5, type: "vending_machine" },
        { x: 26, y: t + 6, type: "potted_plant" },
      ]),
      { x: 11, y: 17, type: "table" },
      { x: 12, y: 18, type: "chair" },
      { x: 11, y: 33, type: "locker" },
      { x: 17, y: 43, type: "table" },
      { x: 4, y: 26, type: "table" },
      { x: 6, y: 27, type: "chair" },
      { x: 40, y: 17, type: "crate" },
      { x: 50, y: 23, type: "crate" },
      { x: 42, y: 35, type: "vending_machine" },
      { x: 27, y: 9, type: "barrier" },
      { x: 32, y: 9, type: "barrier" },
      { x: 24, y: 4, type: "monitor_bank" },
    ],
  };
}

// ── IV-3: Containment — Last Stand ───────────────────────────────
// Kael's door. The block is run backwards: you come in at the north breach,
// where the rift is, and fight your way back to the airlock you entered by
// in Act I, while the rift eats the spine behind you a row at a time. The
// cell banks are blown open into two side lanes, which never fall, so the
// retreat always has a way out. The Temporal Summoner holds the intake hall
// in front of the blast doors. Behind the intake's west wall, a field
// medbay (miri_4).
// ──────────────────────────────────────────────────────────────────
function buildContainmentLast() {
  const { g, hm } = cloneStation("containment");

  // The breach: rift in the north arena's walls, where the sector is being
  // dragged toward the Core.
  hWall(g, 2, 20, 39, RIFT);
  tile(g, 3, 18, RIFT);
  tile(g, 3, 41, RIFT);

  // Side lanes: the guard station opens west and east into the cell-block
  // corridors, which now run up to meet it.
  door(g, 24, 20);
  door(g, 25, 20);
  carve(g, 24, 13, 25, 19);
  carve(g, 24, 13, 27, 16);
  door(g, 24, 39);
  door(g, 25, 39);
  carve(g, 24, 40, 25, 46);
  carve(g, 24, 43, 27, 46);
  // Cell walls blown out into the lanes.
  for (const r of [30, 34, 38]) {
    g[r][12] = 0;
    g[r][47] = 0;
  }

  // Cover for a fighting retreat: waist-high barricades facing north.
  lowWall(g, hm, 40, 28, 40, 31, LAYER.WAIST, 3);
  lowWall(g, hm, 33, 13, 33, 14, LAYER.WAIST, 3);
  lowWall(g, hm, 33, 45, 33, 46, LAYER.WAIST, 3);
  lowWall(g, hm, 45, 20, 45, 23, LAYER.WAIST, 3);
  lowWall(g, hm, 45, 36, 45, 39, LAYER.WAIST, 3);
  lowWall(g, hm, 16, 24, 16, 26, LAYER.KNEE, 3);
  lowWall(g, hm, 16, 33, 16, 35, LAYER.KNEE, 3);

  // The field medbay (secret), off the intake hall.
  carve(g, 50, 9, 52, 13);
  g[51][14] = 6;

  return {
    name: "Containment — Last Stand",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    // In at the breach, facing the long way back.
    playerStart: { x: 29.5, y: 4.5, dir: Math.PI / 2 },
    entities: [
      // North corridor.
      enemy(12.5, 16.5, "beast"),
      enemy(47.5, 16.5, "beast"),
      enemy(29.5, 17.5, "timeWarden"),
      enemy(7.5, 8.5, "phaseStalker"),
      enemy(51.5, 8.5, "echoDrone"),
      // Guard station.
      enemy(24.5, 25.5, "sentinel"),
      enemy(35.5, 25.5, "sentinel"),
      // West lane and its blown cells.
      enemy(14.5, 31.5, "riftLeaper"),
      enemy(7.5, 34.5, "riftLeaper"),
      enemy(14.5, 43.5, "beast"),
      // East lane.
      enemy(44.5, 31.5, "timeWarden"),
      enemy(51.5, 38.5, "phaseStalker"),
      // Spine.
      enemy(29.5, 33.5, "beast"),
      enemy(30.5, 42.5, "sentinel"),
      // Intake: the Summoner in front of the doors.
      enemy(29.5, 46.5, "temporalSummoner"),
      enemy(21.5, 47.5, "sentinel"),
      enemy(38.5, 47.5, "sentinel"),
      enemy(33.5, 50.5, "timeWarden"),
      // ── Pickups ──
      pickup(24.5, 9.5, "health"),
      pickup(35.5, 9.5, "ammo"),
      pickup(7.5, 7.5, "ammo"),
      pickup(51.5, 7.5, "health"),
      pickup(29.5, 24.5, "health"),
      pickup(15.5, 26.5, "ammo"),
      pickup(45.5, 26.5, "ammo"),
      pickup(7.5, 38.5, "health"),
      pickup(52.5, 30.5, "health"),
      pickup(29.5, 38.5, "ammo"),
      pickup(17.5, 50.5, "ammo"),
      // Secrets: the old escape tunnel, the memo room, the medbay.
      pickup(1.5, 37.5, "health"),
      pickup(57.5, 6.5, "ammo"),
      pickup(10.5, 51.5, "health"),
    ],
    exit: { x: 29.5, y: 55.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 37,
        description: "The prisoner's tunnel. Someone has scratched a tally on the wall. It stops at eleven.",
      },
      {
        wallX: 56,
        wallY: 6,
        description: "The PARADOX memo, the signature no longer redacted. It never needed to be.",
      },
      {
        wallX: 14,
        wallY: 51,
        description: "A field medbay nobody logged. A stabiliser kit, one dose short. Someone hummed while they packed it.",
      },
    ],
    props: [
      { x: 29, y: 7, type: "monitor_bank" },
      { x: 24, y: 23, type: "monitor_bank" },
      { x: 35, y: 23, type: "monitor_bank" },
      { x: 7, y: 30, type: "crate" },
      { x: 52, y: 34, type: "crate" },
      { x: 29, y: 49, type: "desk" },
      { x: 20, y: 47, type: "chair" },
      { x: 39, y: 50, type: "barrier" },
      { x: 25, y: 44, type: "barrier" },
      { x: 34, y: 44, type: "barrier" },
      { x: 7, y: 10, type: "desk" },
      { x: 51, y: 10, type: "weapon_rack" },
      { x: 11, y: 50, type: "bench" },
    ],
  };
}

// ── IV-4: Temporal Nexus — The Decoy ─────────────────────────────
// The Nexus with a light touch: the sanctum's gates blown wide, the north
// chamber half down, cover in the outer ring, and the two secrets it never
// had. Four approach corridors, and every hunter on the level is chasing
// Nova (the set piece's decoy), so the rest of it is yours.
// ──────────────────────────────────────────────────────────────────
function buildNexusDecoy() {
  const { g, hm } = cloneStation("nexus");

  // Sanctum gates blown wide.
  carve(g, 31, 27, 31, 32);
  carve(g, 20, 27, 20, 32);
  carve(g, 24, 20, 27, 20);
  carve(g, 24, 39, 27, 39);

  // The north chamber, half collapsed: rubble to the east of the exit.
  carve(g, 4, 34, 7, 41, 3);
  lowWall(g, hm, 8, 36, 8, 38, LAYER.WAIST, 3);
  lowTile(g, hm, 10, 33, LAYER.KNEE, 3);

  // Cover in the outer ring, off the mirror.
  lowWall(g, hm, 46, 16, 46, 18, LAYER.WAIST, 3);
  lowWall(g, hm, 50, 40, 50, 42, LAYER.WAIST, 3);
  lowWall(g, hm, 45, 29, 45, 30, LAYER.KNEE, 3);
  lowWall(g, hm, 28, 9, 30, 11, LAYER.WAIST, 3);
  lowWall(g, hm, 38, 48, 38, 50, LAYER.WAIST, 3);

  // Secrets: behind both storage rooms.
  carve(g, 6, 1, 8, 2);
  g[7][3] = 6;
  carve(g, 6, 57, 8, 58);
  g[7][56] = 6;

  return {
    name: "Temporal Nexus — The Decoy",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // Outer ring.
      enemy(21.5, 48.5, "phaseStalker"),
      enemy(38.5, 49.5, "phaseStalker"),
      enemy(9.5, 47.5, "riftLeaper"),
      // Side rooms.
      enemy(9.5, 40.5, "sentinel"),
      enemy(51.5, 39.5, "echoDrone"),
      // Approach corridors.
      enemy(10.5, 33.5, "riftLeaper"),
      enemy(49.5, 35.5, "phaseStalker"),
      enemy(10.5, 24.5, "beast"),
      enemy(48.5, 25.5, "riftLeaper"),
      // Cross corridor.
      enemy(18.5, 32.5, "phaseStalker"),
      // Sanctum.
      enemy(25.5, 26.5, "sentinel"),
      enemy(34.5, 24.5, "timeWarden"),
      // North approach and chamber.
      enemy(12.5, 16.5, "riftLeaper"),
      enemy(46.5, 15.5, "beast"),
      enemy(24.5, 7.5, "sentinel"),
      enemy(31.5, 5.5, "riftLeaper"),
      // ── Pickups ──
      pickup(29.5, 48.5, "health"),
      pickup(45.5, 47.5, "ammo"),
      pickup(9.5, 38.5, "ammo"),
      pickup(51.5, 41.5, "health"),
      pickup(29.5, 25.5, "health"),
      pickup(29.5, 22.5, "ammo"),
      pickup(8.5, 7.5, "ammo"),
      pickup(51.5, 7.5, "health"),
      pickup(21.5, 5.5, "ammo"),
      // Secrets
      pickup(1.5, 7.5, "health"),
      pickup(57.5, 7.5, "ammo"),
    ],
    exit: { x: 29.5, y: 4.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 7,
        description: "A stash of spare blades, and a note: \"If found, return to the fastest thing on the station.\"",
      },
      {
        wallX: 56,
        wallY: 7,
        description: "A maintenance hatch, welded shut from this side. The weld is Rook's.",
      },
    ],
    props: [
      { x: 29, y: 48, type: "crate" },
      { x: 30, y: 49, type: "crate" },
      { x: 25, y: 24, type: "monitor_bank" },
      { x: 34, y: 27, type: "monitor_bank" },
      { x: 29, y: 7, type: "monitor_bank" },
      { x: 9, y: 41, type: "ammo_crate" },
      { x: 51, y: 42, type: "weapon_rack" },
      { x: 7, y: 9, type: "crate" },
      { x: 52, y: 9, type: "crate" },
      { x: 17, y: 44, type: "barrier" },
      { x: 42, y: 44, type: "barrier" },
    ],
  };
}

// ── IV-5: The Archive Burns ──────────────────────────────────────
// Where Voss keeps his takes, in its Act IV state: Rook's charges are set,
// and the fire is already in the stacks. Three galleries run west to east.
// The fire front eats the central one behind you, a column at a time; the
// north and south galleries never burn, so the way ahead is always open.
// In the south gallery a reading room loops you back toward the flames
// until you shift through its seam. Kai's anchor (kai_4) is yours at the
// far door.
// ──────────────────────────────────────────────────────────────────
function buildArchiveBurns() {
  const g = createGrid(W, H, 2);
  const hm = createHeights(W, H);

  // ── VESTIBULE (west) ──
  carve(g, 26, 1, 33, 6);

  // ── CENTRAL GALLERY (rows 21-38) ──
  carve(g, 21, 7, 38, 50);
  // The stacks: shelving running north-south, a centre aisle through them.
  for (const c of [10, 13, 16, 19, 22, 37, 40, 43, 46]) {
    vWall(g, 22, 26, c, 2);
    vWall(g, 33, 37, c, 2);
  }
  // The rotunda: four core pillars and the rift core Rook has wired.
  for (const [r, c] of [[26, 26], [26, 33], [33, 26], [33, 33]]) tile(g, r, c, 4);
  carve(g, 29, 29, 30, 30, RIFT);
  lowWall(g, hm, 27, 29, 27, 30, LAYER.KNEE, 3);
  lowWall(g, hm, 32, 29, 32, 30, LAYER.KNEE, 3);

  // ── NORTH GALLERY (rows 8-15): glass carrels ──
  carve(g, 8, 7, 15, 50);
  for (const c of [12, 18, 24, 30, 36, 42]) {
    lowWall(g, hm, 10, c, 10, c + 2, LAYER.WAIST, 8);
    lowWall(g, hm, 13, c + 3, 13, c + 4, LAYER.WAIST, 8);
  }
  carve(g, 16, 7, 20, 8);
  carve(g, 16, 29, 20, 30);
  carve(g, 16, 49, 20, 50);

  // ── SOUTH GALLERY (rows 44-51), with the reading room ──
  // Reached from the central gallery's west end only: once the fire has
  // passed it, the way on is east through the reading room, or back.
  carve(g, 44, 7, 51, 50);
  carve(g, 39, 7, 43, 8);
  // The reading room's desks, in the loop.
  for (const c of [32, 36, 40]) lowWall(g, hm, 46, c, 46, c + 1, LAYER.WAIST, 3);
  lowWall(g, hm, 49, 34, 49, 35, LAYER.WAIST, 3);
  // West of the reading room: more stacks.
  for (const c of [12, 17, 22]) vWall(g, 45, 48, c, 2);

  // ── EAST HALL (the far door) ──
  carve(g, 18, 52, 41, 58);
  carve(g, 27, 51, 32, 51);
  carve(g, 12, 51, 12, 51);
  carve(g, 13, 51, 17, 52);
  carve(g, 47, 51, 47, 51);
  carve(g, 42, 51, 46, 52);
  tile(g, 24, 55, 3);
  tile(g, 35, 55, 3);

  // ── SECRETS ──
  // Rook's old workbench, behind the north gallery.
  carve(g, 10, 3, 12, 5);
  g[11][6] = 6;
  // A sealed cabinet of takes nobody watched, behind the south gallery.
  carve(g, 46, 3, 48, 5);
  g[47][6] = 6;

  return {
    name: "The Archive Burns",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 3.5, y: 29.5, dir: 0 },
    entities: [
      // Central gallery.
      enemy(11.5, 29.5, "echoDrone"),
      enemy(20.5, 28.5, "echoDrone"),
      enemy(24.5, 31.5, "timeWarden"),
      enemy(35.5, 28.5, "echoDrone"),
      enemy(41.5, 30.5, "timeWarden"),
      enemy(48.5, 23.5, "riftLeaper"),
      // North gallery.
      enemy(15.5, 11.5, "echoDrone"),
      enemy(27.5, 12.5, "riftLeaper"),
      enemy(39.5, 9.5, "timeWarden"),
      // South gallery and the reading room.
      enemy(15.5, 49.5, "echoDrone"),
      enemy(27.5, 47.5, "riftLeaper"),
      enemy(38.5, 50.5, "echoDrone"),
      enemy(46.5, 45.5, "timeWarden"),
      // East hall.
      enemy(55.5, 23.5, "sentinel"),
      enemy(55.5, 36.5, "timeWarden"),
      enemy(53.5, 29.5, "echoDrone"),
      // ── Pickups ──
      pickup(4.5, 27.5, "ammo"),
      pickup(8.5, 22.5, "health"),
      pickup(29.5, 23.5, "ammo"),
      pickup(29.5, 36.5, "health"),
      pickup(21.5, 14.5, "ammo"),
      pickup(45.5, 12.5, "health"),
      pickup(9.5, 50.5, "ammo"),
      pickup(31.5, 50.5, "health"),
      pickup(56.5, 20.5, "ammo"),
      pickup(56.5, 39.5, "health"),
      // Secrets
      pickup(4.5, 11.5, "health"),
      pickup(4.5, 47.5, "ammo"),
    ],
    exit: { x: 56.5, y: 29.5 },
    secrets: [
      {
        wallX: 6,
        wallY: 11,
        description: "A workbench with ROOK scratched into the vice. Six years of his tools, laid out for a job he never wanted.",
      },
      {
        wallX: 6,
        wallY: 47,
        description: "A cabinet of takes nobody watched. In every one, somebody holds a door.",
      },
    ],
    props: [
      { x: 4, y: 31, type: "filing_cabinet" },
      { x: 4, y: 28, type: "filing_cabinet" },
      { x: 11, y: 22, type: "filing_cabinet" },
      { x: 17, y: 37, type: "filing_cabinet" },
      { x: 38, y: 22, type: "filing_cabinet" },
      { x: 44, y: 37, type: "filing_cabinet" },
      { x: 25, y: 29, type: "crate" },
      { x: 34, y: 30, type: "ammo_crate" },
      { x: 20, y: 9, type: "desk" },
      { x: 32, y: 9, type: "desk" },
      { x: 33, y: 47, type: "chair" },
      { x: 37, y: 47, type: "chair" },
      { x: 41, y: 47, type: "chair" },
      { x: 4, y: 10, type: "weapon_rack" },
      { x: 56, y: 26, type: "monitor_bank" },
      { x: 56, y: 33, type: "monitor_bank" },
    ],
  };
}

// ── IV-6: The Engine — Firing ────────────────────────────────────
// The Chronos Engine, awake. It fills the hall, and it breathes: four lines
// of discharge vents cross the floor between you and the Core door and fire
// in turn, like a countdown. A shift widens their gaps. Lyra is in the
// control booth by the door, calling the percentages until it opens.
// ──────────────────────────────────────────────────────────────────

/** The Engine's centre, in world units. */
const ENGINE = { x: 30, y: 30 };

function buildEngineFiring() {
  const g = createGrid(W, H, 3);
  const hm = createHeights(W, H);

  // ── SOUTH GANTRY ──
  carve(g, 50, 22, 57, 37);
  door(g, 49, 29);
  door(g, 49, 30);
  lowWall(g, hm, 53, 25, 53, 26, LAYER.KNEE, 3);
  lowWall(g, hm, 53, 33, 53, 34, LAYER.KNEE, 3);

  // ── ENGINE HALL ──
  carve(g, 13, 5, 48, 54);
  // The Engine: a ring of energy around a rift core.
  for (let r = 22; r <= 38; r++) {
    for (let c = 21; c <= 38; c++) {
      const d = Math.hypot(c + 0.5 - ENGINE.x, r + 0.5 - ENGINE.y);
      if (d < 5) g[r][c] = RIFT;
      else if (d < 6.6) g[r][c] = 4;
    }
  }
  // Catwalk rails down both sides: knee-high, so you see over them.
  lowWall(g, hm, 20, 13, 26, 13, LAYER.KNEE, 3);
  lowWall(g, hm, 34, 13, 40, 13, LAYER.KNEE, 3);
  lowWall(g, hm, 20, 46, 26, 46, LAYER.KNEE, 3);
  lowWall(g, hm, 34, 46, 40, 46, LAYER.KNEE, 3);
  // Coolant stacks.
  for (const [r, c] of [[16, 9], [16, 50], [45, 9], [45, 50], [24, 18], [36, 41]]) tile(g, r, c, 2);
  lowWall(g, hm, 44, 20, 44, 23, LAYER.WAIST, 3);
  lowWall(g, hm, 44, 36, 44, 39, LAYER.WAIST, 3);
  lowWall(g, hm, 18, 24, 18, 26, LAYER.WAIST, 3);
  lowWall(g, hm, 18, 33, 18, 35, LAYER.WAIST, 3);

  // ── THE CORE DOOR (north) ──
  carve(g, 4, 20, 11, 39);
  door(g, 12, 29);
  door(g, 12, 30);
  tile(g, 7, 23, 7);
  tile(g, 7, 36, 7);

  // ── CONTROL BOOTH (north-west): Lyra's console ──
  room(g, 3, 4, 11, 17, 2);
  hWall(g, 11, 6, 9, 8);
  door(g, 11, 13);
  carve(g, 12, 13, 12, 13);
  lowWall(g, hm, 5, 8, 5, 12, LAYER.WAIST, 2);

  // ── STORES (north-east) ──
  room(g, 3, 42, 11, 55, 3);
  door(g, 11, 48);
  carve(g, 12, 48, 12, 48);

  // ── SECRETS ──
  carve(g, 6, 1, 8, 3);
  g[7][4] = 6;
  carve(g, 6, 56, 8, 58);
  g[7][55] = 6;

  return {
    name: "The Engine — Firing",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // South apron.
      enemy(15.5, 46.5, "timeWarden"),
      enemy(44.5, 46.5, "sentinel"),
      enemy(29.5, 44.5, "echoDrone"),
      // West walkway.
      enemy(9.5, 35.5, "sentinel"),
      enemy(16.5, 30.5, "temporalSummoner"),
      enemy(8.5, 22.5, "echoDrone"),
      // East walkway.
      enemy(50.5, 36.5, "timeWarden"),
      enemy(43.5, 29.5, "temporalSummoner"),
      enemy(51.5, 22.5, "echoDrone"),
      // North apron, before the door.
      enemy(20.5, 15.5, "sentinel"),
      enemy(39.5, 15.5, "sentinel"),
      enemy(29.5, 17.5, "timeWarden"),
      // The door.
      enemy(25.5, 7.5, "timeWarden"),
      enemy(34.5, 8.5, "sentinel"),
      // Stores.
      enemy(48.5, 6.5, "echoDrone"),
      // ── Pickups ──
      pickup(24.5, 55.5, "health"),
      pickup(35.5, 55.5, "ammo"),
      pickup(7.5, 44.5, "ammo"),
      pickup(52.5, 44.5, "health"),
      pickup(7.5, 29.5, "health"),
      pickup(52.5, 30.5, "ammo"),
      pickup(29.5, 14.5, "health"),
      pickup(10.5, 8.5, "ammo"),
      pickup(51.5, 5.5, "health"),
      pickup(29.5, 9.5, "ammo"),
      // Secrets
      pickup(1.5, 7.5, "health"),
      pickup(57.5, 7.5, "ammo"),
    ],
    exit: { x: 29.5, y: 5.5 },
    secrets: [
      {
        wallX: 4,
        wallY: 7,
        description: "Behind the booth: a thermos, still warm, and a chair turned to face the Engine. She has been here every night.",
      },
      {
        wallX: 55,
        wallY: 7,
        description: "The Engine's original interlock, pulled out and kept. Rook's crew tag on it.",
      },
    ],
    props: [
      { x: 9, y: 6, type: "monitor_bank" },
      { x: 12, y: 6, type: "monitor_bank" },
      { x: 15, y: 8, type: "chair" },
      { x: 45, y: 6, type: "crate" },
      { x: 52, y: 9, type: "ammo_crate" },
      { x: 6, y: 17, type: "barrier" },
      { x: 53, y: 17, type: "barrier" },
      { x: 6, y: 42, type: "crate" },
      { x: 53, y: 42, type: "crate" },
      { x: 29, y: 52, type: "monitor_bank" },
    ],
  };
}

// ── IV-7: The Paradox Core — Endgame ─────────────────────────────
// The Core with its rings gone: one open floor walled in rift, so the Final
// Form's stopped time has nowhere to hide either of you. Sparse, uneven
// waist-high cover you can read a lunge over, two boss-wall pillars to break
// his line, a handful of adds that freeze when he stops time.
// ──────────────────────────────────────────────────────────────────
function buildCoreEndgame() {
  const g = createGrid(W, H, 7);
  const hm = createHeights(W, H);

  // ── ENTRY CORRIDOR and a short antechamber ──
  carve(g, 53, 26, 57, 33);
  door(g, 52, 29);
  door(g, 52, 30);
  carve(g, 47, 18, 51, 41);
  lowWall(g, hm, 49, 22, 49, 23, LAYER.WAIST, 3);
  lowWall(g, hm, 49, 36, 49, 37, LAYER.WAIST, 3);
  door(g, 46, 29);
  door(g, 46, 30);

  // ── THE OPEN FLOOR ──
  carve(g, 8, 6, 45, 53);
  // Rift walls: the perimeter is the rift, in long bands.
  for (let c = 6; c <= 53; c++) {
    if (((c / 5) | 0) % 2 === 0) {
      g[7][c] = RIFT;
    }
  }
  for (let r = 8; r <= 45; r++) {
    if (((r / 4) | 0) % 2 === 0) {
      g[r][5] = RIFT;
      g[r][54] = RIFT;
    }
  }
  // Two pillars to break his line, off the mirror.
  tile(g, 18, 16, 7);
  tile(g, 19, 16, 7);
  tile(g, 35, 42, 7);
  tile(g, 36, 42, 7);
  // Waist-high cover you can read a lunge over.
  lowWall(g, hm, 14, 22, 14, 24, LAYER.WAIST, 3);
  lowWall(g, hm, 24, 40, 26, 40, LAYER.WAIST, 3);
  lowWall(g, hm, 31, 13, 31, 15, LAYER.WAIST, 3);
  lowWall(g, hm, 38, 26, 38, 28, LAYER.WAIST, 3);
  lowWall(g, hm, 12, 37, 12, 38, LAYER.KNEE, 3);
  lowWall(g, hm, 29, 47, 30, 47, LAYER.KNEE, 3);
  lowWall(g, hm, 41, 18, 41, 19, LAYER.KNEE, 3);

  return {
    name: "The Paradox Core — Endgame",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // The Final Form, waiting in the middle of nothing.
      enemy(29.5, 21.5, "boss"),
      // The antechamber.
      enemy(21.5, 48.5, "echoDrone"),
      enemy(38.5, 48.5, "echoDrone"),
      // A few on the floor: they stop when he stops time.
      enemy(11.5, 30.5, "sentinel"),
      enemy(48.5, 29.5, "sentinel"),
      enemy(18.5, 11.5, "phaseStalker"),
      enemy(42.5, 12.5, "phaseStalker"),
      // ── Pickups ──
      pickup(29.5, 49.5, "health"),
      pickup(19.5, 50.5, "ammo"),
      pickup(40.5, 50.5, "ammo"),
      pickup(8.5, 42.5, "health"),
      pickup(51.5, 42.5, "health"),
      pickup(8.5, 10.5, "ammo"),
      pickup(51.5, 10.5, "ammo"),
      pickup(29.5, 9.5, "health"),
      pickup(16.5, 27.5, "ammo"),
      pickup(44.5, 35.5, "ammo"),
    ],
    exit: null, // Boss level
    isBossLevel: true,
    secrets: [],
    props: [
      { x: 20, y: 48, type: "crate" },
      { x: 39, y: 48, type: "crate" },
    ],
  };
}

/** Every Act IV map, built once, keyed by the id levels name it by. */
export const ACT4_MAPS = {
  entry_last: buildEntryLast(),
  the_loop: buildLoop(),
  containment_last: buildContainmentLast(),
  nexus_decoy: buildNexusDecoy(),
  archive_burns: buildArchiveBurns(),
  engine_firing: buildEngineFiring(),
  core_endgame: buildCoreEndgame(),
};

// ── Set pieces ───────────────────────────────────────────────────────────────

const [firstBlock] = LOOP_BLOCKS;

export const ACT4_SET_PIECES = {
  // IV-1. The lobby comes down behind you into the rift while you fight in
  // it, from the airlock up. It never fills the row you stand on.
  entry_falls: {
    hazards: [
      {
        id: "lobby_falls", type: "collapse", trigger: [17, 47, 42, 51],
        steps: rowSweep(17, 42, 57, 44), delay: 2, rate: 1.2, damage: 6, wall: RIFT, aria: "collapseChase",
      },
    ],
  },

  // IV-2. The boulevard repeats. Out through its north end and you are back
  // at its south end, until you rewind through the seam.
  the_loop: {
    hazards: [
      {
        id: "boulevard_loop", type: "loop", rect: [26, firstBlock, 33, 44],
        seamA: { x: 26, y: firstBlock }, seamB: { x: 34, y: firstBlock },
        out: { x: 30, y: firstBlock - 1.5 }, back: { x: 30, y: 43.6 },
        breaksOn: "rewind",
      },
      { id: "still_flat", type: "stasis", rect: [2, 23, 7, 29], motes: 40 },
    ],
    enter: { rect: [2, 23, 7, 29], aria: "stasisRoom" },
  },

  // IV-3. The rift eats the spine behind you: the north corridor, the guard
  // station, then the spine itself. The side lanes never fall. Kael takes
  // the doors when you reach the intake.
  last_stand: {
    hazards: [
      {
        id: "rift_retreat", type: "collapse", trigger: [21, 21, 38, 26],
        steps: [...rowSweep(18, 41, 12, 19), ...rowSweep(21, 38, 20, 27), ...rowSweep(27, 32, 28, 43)],
        delay: 3, rate: 0.9, damage: 6, wall: RIFT, aria: "collapseChase",
      },
    ],
    scripted: [
      {
        id: "kael_doors", rect: [15, 44, 44, 51],
        squad: { member: "kael", text: "I've got the doors. Go. Don't look back, Cadet. That's an order." },
      },
    ],
  },

  // IV-4. Nova has every hunter on the level behind her. The meter still
  // fills and still warns; nothing comes through for you.
  nova_decoy: {
    decoy: {
      member: "nova",
      lines: [
        "Heard that one. So did they. They're on me. Keep going.",
        "Another pack on my tail. I'm faster. Always was.",
        "Still got them. Still winning. Don't slow down on my account.",
      ],
    },
    scripted: [
      {
        id: "nova_peels", rect: [5, 44, 54, 50],
        squad: { member: "nova", text: "Four corridors, four packs, one of me. Pick a corridor and run, Cadet." },
      },
    ],
  },

  // IV-5. The fire front closes the central gallery behind you, column by
  // column; the reading room loops you back toward it until you shift
  // through its seam. A cache past the loop.
  archive_fire: {
    hazards: [
      {
        id: "fire_front", type: "collapse", trigger: [7, 21, 9, 38],
        steps: colSweep(21, 38, 7, 50), delay: 6, rate: 0.8, damage: 8, wall: 4, aria: "collapseChase",
      },
      {
        id: "reading_room", type: "loop", rect: [30, 44, 41, 51],
        seamA: { x: 42, y: 44 }, seamB: { x: 42, y: 52 },
        out: { x: 43.5, y: 47.5 }, back: { x: 30.5, y: 47.5 },
      },
    ],
    cache: { x: 47.5, y: 48.5 },
    scripted: [
      {
        id: "rook_charges", rect: [24, 21, 35, 38],
        squad: { member: "rook", text: "Charges are live. You've got till the fire gets here. Don't wait for me." },
      },
    ],
  },

  // IV-6. The Engine breathes: four lines of discharge vents between you
  // and the door, firing in turn. Lyra calls the percentages.
  engine_countdown: {
    hazards: [
      { id: "vent_south", type: "vent", rect: [5, 42, 54, 42], period: 3.2, on: 1.3, phase: 0, damage: 15 },
      { id: "vent_west", type: "vent", rect: [5, 29, 23, 30], period: 3.2, on: 1.3, phase: 0.8, damage: 15 },
      { id: "vent_east", type: "vent", rect: [36, 29, 54, 30], period: 3.2, on: 1.3, phase: 0.8, damage: 15 },
      { id: "vent_north", type: "vent", rect: [5, 19, 54, 19], period: 3.2, on: 1.3, phase: 1.6, damage: 15 },
    ],
    scripted: [
      {
        id: "lyra_40", rect: [5, 40, 54, 47],
        squad: { member: "lyra", text: "Engine's at forty percent. The door opens at a hundred. Keep moving." },
      },
      {
        id: "lyra_70", rect: [5, 24, 54, 35],
        squad: { member: "lyra", text: "Seventy. They've worked out what I'm doing. Don't let them care." },
      },
      {
        id: "lyra_90", rect: [5, 13, 54, 20],
        squad: { member: "lyra", text: "Ninety. I've got the door. I've got you. Go." },
      },
    ],
  },
};
