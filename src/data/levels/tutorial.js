// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

import { room as corridorRoom } from "./rooms/corridor.js";
import { room as gymRoom } from "./rooms/gym.js";
import { room as officeRoom } from "./rooms/office.js";
import { room as arenaRoom } from "./rooms/arena.js";
import { room as hallsRoom } from "./rooms/halls.js";
import { room as rndRoom } from "./rooms/rnd.js";
import { room as dispatchRoom } from "./rooms/dispatch.js";
import { room as atriumRoom } from "./rooms/atrium.js";
import { room as holdingRoom } from "./rooms/holding.js";
import { room as interviewRoom } from "./rooms/interview.js";
import { createHeights, lowWall, LAYER } from "./map-helpers.js";

// ── Build the police station grid programmatically ──
// The station proper is the 60x60 it always was (the Precinct, in Act II,
// is built from that: STATION_CORE). Certification Day added the east wing
// beyond it, so the floor is wider and a little deeper.
const CORE = 60;
const W = 86, H = 62;
const g = Array.from({ length: H }, () => Array(W).fill(3)); // default: metal walls

// Helpers
const carve = (r1, c1, r2, c2, v = 0) => {
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) g[r][c] = v;
};
const hWall = (r, c1, c2, v) => { for (let c = c1; c <= c2; c++) g[r][c] = v; };
const vWall = (r1, r2, c, v) => { for (let r = r1; r <= r2; r++) g[r][c] = v; };
const pillar = (r, c, v = 3) => { g[r][c] = v; };
const door = (r, c) => { g[r][c] = 5; };

// ════════════════════════════════════════════════════════════════
// ZONE LAYOUT — Police Station Floor Plan
//
//  ┌─────────────────── COMBAT ARENA (2) ──────────────────┐
//  │            rows 2-11, cols 8-51                        │
//  └───────────┐                          ┌────────────────┘
//              │     NORTH CORRIDOR       │
//  ┌───────────┘     rows 12-13           └────────────────┐
//  │ FITNESS    │                          │ SUPERVISOR'S   │
//  │ CENTER (1) │    MAIN CORRIDOR        │ OFFICE (4)     │
//  │ rows 15-26 │    cols 27-32           │ rows 15-26     │
//  │ cols 3-24  │    rows 13-50           │ cols 35-56     │
//  └────────────┤                         ├────────────────┘
//               │   rows 27-36            │
//  ┌────────────┤   (corridor)            ├────────────────┐
//  │ LOCKER     │                         │ FIRING RANGE   │
//  │ ROOM (3)   │                         │ (2)            │
//  │ rows 37-47 │                         │ rows 37-47     │
//  │ cols 3-24  │                         │ cols 35-56     │
//  └────────────┤                         ├────────────────┘
//               │                         │
//               │   ENTRANCE LOBBY        │
//               │   rows 49-57            │
//               │   cols 22-37            │
//               └─────────────────────────┘
// ════════════════════════════════════════════════════════════════

// ── 1. ENTRANCE LOBBY (rows 49-57, cols 22-37) ──
carve(49, 22, 57, 37);
// Glass front windows
hWall(57, 23, 36, 8);
// Reception desk (pillars)
pillar(53, 28); pillar(53, 29); pillar(53, 30); pillar(53, 31);
// Waiting area pillars
pillar(55, 24); pillar(55, 35);
// Lobby side alcoves
carve(51, 19, 54, 21); // west alcove
carve(51, 38, 54, 40); // east alcove

// ── 2. MAIN CORRIDOR (cols 27-32, rows 13-48) ──
carve(13, 27, 48, 32);
// Connect corridor to lobby
carve(48, 27, 49, 32);

// ── 3. LOCKER ROOM — Zone 1 (rows 37-47, cols 3-24) ──
// Room walls are default metal (3). Carve interior.
carve(38, 4, 46, 23);
// The lockers line the north and south walls, full height, two to a cell,
// each with its officer's name (src/rendering/env/locker-art.js). The
// cadet's is on the south wall: LOCKERS_MINE, swapped for its lit and open
// twins by the prologue. Benches down the middle are props.
const LOCKER_ROW = [10, 11, 12, 13];
for (let c = 4; c <= 23; c++) {
  if (g[37][c] === 3) g[37][c] = LOCKER_ROW[c % 4];
  if (g[47][c] === 3) g[47][c] = LOCKER_ROW[(c + 2) % 4];
}
// Connecting corridor east (row 41-42)
carve(41, 24, 42, 26);
// Door from corridor to locker room
door(41, 26); door(42, 26);

g[47][14] = 14; // the cadet's locker (and ABARA's beside it)

// ── 4. FIRING RANGE — Zone 2 (rows 37-47, cols 35-56) ──
// Tech walls
carve(38, 36, 46, 55);
hWall(37, 35, 56, 2); // top wall
hWall(47, 35, 56, 2); // bottom wall
vWall(37, 47, 35, 2); // left wall
vWall(37, 47, 56, 2); // right wall
// Shooting booths: three east-facing lanes divided at the firing line, open
// downrange so targets can cross the whole width.
for (let c = 39; c <= 44; c++) {
  pillar(40, c, 2);
  pillar(44, c, 2);
}
// Target wall at far end (east)
hWall(38, 53, 55, 2);
// Glass observation window at south
hWall(46, 38, 44, 8);
hWall(46, 48, 54, 8);
// Acoustic baffles round the range (the target wall and booths stay tech).
for (let c = 35; c <= 56; c++) for (const r of [37, 47]) if (g[r][c] === 2) g[r][c] = 18;
for (let r = 38; r <= 46; r++) for (const c of [35, 56]) if (g[r][c] === 2) g[r][c] = 18;
g[37][45] = 22; // EYES & EARS, on the north wall
// The range as a range (src/rendering/env/range-art.js): the bullet trap
// across the east wall with a numbered lane and HOT lamp over each lane,
// felt booth partitions with the target controllers at the firing line,
// the rules and the ear defenders by the door, distance markers down the
// north wall, and the target store in the far corner.
for (let r = 38; r <= 46; r++) g[r][56] = 23;
g[39][56] = 24; g[42][56] = 25; g[45][56] = 26;
for (let c = 39; c <= 44; c++) { g[40][c] = 27; g[44][c] = 27; }
g[40][44] = 28; g[44][44] = 29;
g[38][35] = 30; g[39][35] = 31; g[40][35] = 30;
g[43][35] = 31; g[44][35] = 30; g[45][35] = 31; g[46][35] = 30;
g[37][50] = 32; g[37][55] = 33;
for (let c = 53; c <= 55; c++) g[38][c] = 34;
// Connecting corridor west (row 41-42)
carve(41, 33, 42, 35);
door(41, 33); door(42, 33);

// ── 5. FITNESS CENTER — Zone 3 (rows 15-26, cols 3-24) ──
// Stone walls
carve(16, 4, 25, 23);
hWall(15, 3, 24, 1); vWall(15, 26, 3, 1);
hWall(26, 3, 24, 1); vWall(15, 26, 24, 1);
// Equipment pillars (represent benches, weights, machines)
// Weight rack area (northwest corner)
pillar(17, 6, 1); pillar(17, 8, 1); pillar(17, 10, 1);
pillar(19, 6, 1); pillar(19, 8, 1); pillar(19, 10, 1);
// Running track pillars (south side — lane markers)
pillar(24, 7, 1); pillar(24, 12, 1); pillar(24, 17, 1);
// Central mat area — open for sprint/dash practice
// Punching bag pillars
pillar(18, 18, 1); pillar(18, 21, 1);
pillar(20, 18, 1); pillar(20, 21, 1);
// Padded walls and the mirror round the gym.
for (let c = 3; c <= 24; c++) for (const r of [15, 26]) if (g[r][c] === 1) g[r][c] = 17;
for (let r = 16; r <= 25; r++) for (const c of [3, 24]) if (g[r][c] === 1) g[r][c] = 17;
g[15][13] = 19; // the PT board, over the north wall
// The weight racks, and padded columns for the track's markers and the bags.
for (const c of [6, 8, 10]) for (const r of [17, 19]) g[r][c] = 20;
for (const c of [7, 12, 17]) g[24][c] = 21;
for (const c of [18, 21]) for (const r of [18, 20]) g[r][c] = 21;
// Connecting corridor east (row 20-21)
carve(20, 24, 21, 26);
door(20, 24); door(21, 24);

// ── 6. SUPERVISOR'S OFFICE — Zone 4 (rows 15-26, cols 35-56) ──
// Energy walls
carve(16, 36, 25, 55);
hWall(15, 35, 56, 4); vWall(15, 26, 35, 4);
hWall(26, 35, 56, 4); vWall(15, 26, 56, 4);
// Inner office chamber (smaller room within)
hWall(19, 42, 50, 4); hWall(23, 42, 50, 4);
vWall(19, 23, 42, 4); vWall(19, 23, 50, 4);
carve(20, 43, 22, 49); // inner office floor
door(19, 46); // door into inner office
// Desk (pillar cluster)
pillar(21, 45, 4); pillar(21, 46, 4); pillar(21, 47, 4);
// Filing cabinets
pillar(17, 38, 4); pillar(17, 40, 4);
pillar(17, 52, 4); pillar(17, 54, 4);
// Connecting corridor west (row 20-21)
carve(20, 33, 21, 35);
door(20, 35); door(21, 35);

// ── 7. COMBAT ARENA — Zone 5 (rows 2-11, cols 8-51) ──
// Tech walls
carve(3, 9, 10, 50);
hWall(2, 8, 51, 2); hWall(11, 8, 51, 2);
vWall(2, 11, 8, 2);  vWall(2, 11, 51, 2);
// Cover pillars (strategic placement)
pillar(5, 15, 2); pillar(5, 25, 2); pillar(5, 35, 2); pillar(5, 44, 2);
pillar(8, 20, 2); pillar(8, 30, 2); pillar(8, 40, 2);
pillar(6, 30); // center pillar (metal for variety)
// Connecting corridor south (row 11-12)
carve(11, 28, 13, 31);
door(11, 29); door(11, 30);

// ── 8. CROSS CORRIDORS (east-west branches) ──
// North cross corridor (connects fitness + office to main corridor)
// Already open via carve calls for corridor connections

// South cross corridor (connects locker + range to main corridor)
// Already open via carve calls

// ── 9. SIDE CORRIDORS for atmosphere ──
// West side corridor connecting lobby alcove to locker room
carve(47, 19, 50, 21);
// carve(47, 19, 47, 23) removed — seal locker room south exit, force door1

// East side corridor connecting lobby alcove to range
carve(47, 38, 50, 40);
carve(47, 36, 47, 40); // connecting top

// North-west corridor to fitness center
carve(27, 10, 36, 12);
carve(27, 10, 27, 26); // east-west branch
carve(36, 10, 36, 23); // connect south to locker area top
door(37, 12); // door from corridor into locker area

// North-east corridor
carve(27, 47, 36, 49);
carve(27, 34, 27, 49); // east-west branch
carve(36, 36, 36, 49); // connect south
door(37, 48); // door from corridor into range area

// ── 10. BREAK ROOM — small room off main corridor ──
carve(30, 19, 34, 25);
hWall(29, 18, 26, 3); hWall(35, 18, 26, 3);
vWall(29, 35, 18, 3); // west wall already exists
carve(30, 25, 31, 27); // corridor connection
door(30, 25); door(31, 25);
// Break room furniture
pillar(32, 21); pillar(32, 23); // table

// ── 11. ARMORY — small room off main corridor (east side) ──
carve(30, 34, 34, 40);
hWall(29, 33, 41, 3); hWall(35, 33, 41, 3);
vWall(29, 35, 41, 3);
carve(30, 32, 31, 34); // corridor connection
door(30, 34); door(31, 34);
// Weapon racks
pillar(33, 36); pillar(33, 38); pillar(33, 40);

// ── 12. EVIDENCE ROOM — secret room ──
carve(22, 10, 25, 14);
vWall(22, 25, 9, 1); // west wall
hWall(22, 10, 14, 1); // north wall
hWall(25, 10, 14, 1); // south wall — keep east open to fitness
// Secret passage from fitness center: the only way in.
g[23][15] = 6; // secret wall tile
g[24][15] = 1;

// ── 13. OBSERVATION DECK — glass-walled overlook above arena ──
carve(3, 3, 6, 7);
vWall(3, 6, 7, 8); // glass east wall looking into arena
hWall(3, 3, 7, 3); hWall(6, 3, 6, 3); vWall(3, 6, 3, 3);
// Connect to fitness via small corridor
carve(7, 4, 14, 6);
vWall(7, 14, 3, 1); vWall(7, 14, 7, 1);
door(14, 5);

// ── 14. CAPTAIN'S QUARTERS — east observation ──
carve(3, 52, 6, 57);
vWall(3, 6, 52, 8); // glass west wall
hWall(3, 52, 57, 4); hWall(6, 52, 57, 4); vWall(3, 6, 57, 4);
pillar(5, 54, 4); pillar(5, 55, 4); // desk
// Connect to supervisor office
carve(7, 53, 14, 55);
vWall(7, 14, 52, 4); vWall(7, 14, 56, 4);
door(14, 54);

// The rooms dress themselves on the finished floor plan (src/data/levels/rooms/).
const ROOMS = [corridorRoom, gymRoom, officeRoom, arenaRoom];
for (const r of ROOMS) r.dress(g, { carve, hWall, vWall, pillar, door });

// The station as it stood before the east wing: the Precinct (Act II) is
// this floor three days on, and keeps its own 60x60 plan.
const CORE_GRID = g.slice(0, CORE).map((row) => row.slice(0, CORE));

// ════════════════════════════════════════════════════════════════
// THE EAST WING — added for Certification Day
//
//  sim hall ═ NORTH HALL (rows 8-9) ═╗
//                                    ║ ┌ R&D BAY (rows 2-13, cols 62-79) ┐
//  office ═══ east door (rows 20-21) ╣ ├ DISPATCH (rows 16-30, cols 62-83)
//                                SPINE ├ ATRIUM (rows 33-50, cols 62-84):
//                         (cols 58-59, │   a catwalk ring round a two-storey
//                          rows 8-57)  │   void, and a bridge across it
//  lobby ═ SOUTH HALL (rows 49-50) ════╣ └ HOLDING (rows 53-63, cols 62-84)
//          └ INTERVIEW SUITE (rows 53-57, cols 43-55)    (cells behind, row 60)
//
// Rooms sit behind walls two cells thick, so each side of a wall can carry
// its own room's art (a cell is painted the same from both sides).
// ════════════════════════════════════════════════════════════════

// ── 15. THE HALLS ──
// North hall: out of the sim hall's east wall, across the Captain's passage.
carve(8, 51, 9, 57);
door(8, 51); door(9, 51);
// The spine, down the east side of the old station.
carve(8, 58, 57, 59);
// The office's east door onto it, and the gym's second door (the course
// goes in at the south door and out at the north one).
carve(20, 56, 21, 57);
door(20, 56); door(21, 56);
carve(16, 24, 17, 26);
door(16, 24); door(17, 24);
// South hall: from the lobby's east alcove along under the range.
carve(49, 41, 50, 57);

// ── 16. R&D BAY (rows 2-13, cols 62-79), off the north end of the spine ──
carve(2, 62, 13, 79);
carve(10, 60, 11, 61);

// ── 17. DISPATCH / BULLPEN (rows 16-30, cols 62-83) ──
carve(16, 62, 30, 83);
carve(19, 60, 20, 61);
carve(27, 60, 28, 61);

// ── 18. ATRIUM (rows 33-50, cols 62-84) ──
carve(33, 62, 50, 84);
carve(34, 60, 35, 61);
carve(47, 60, 48, 61);

// ── 19. HOLDING (rows 53-63, cols 62-84): processing, property, the cells ──
carve(53, 62, 59, 84);
carve(55, 60, 56, 61);

// ── 20. INTERVIEW SUITE (rows 53-57): two rooms either side of observation ──
carve(53, 43, 57, 46); // interview 1
carve(53, 48, 57, 51); // observation
carve(53, 53, 57, 55); // interview 2
for (const c of [44, 50, 54]) carve(51, c, 52, c);

// Low walls (src/data/levels/map-helpers.js): the atrium's glass
// balustrade, and the sim hall's holo cover, which the prologue raises.
const hm = createHeights(W, H);
const EAST_ROOMS = [hallsRoom, rndRoom, dispatchRoom, atriumRoom, holdingRoom, interviewRoom];
for (const r of EAST_ROOMS) r.dress(g, { carve, hWall, vWall, pillar, door, hm, lowWall, LAYER });
const ALL_ROOMS = [...ROOMS, ...EAST_ROOMS];

/** Props for environmental decoration (consumed by Track 2B props system). */
const CORE_PROPS = [
  // Locker Room
  { x: 6, y: 42, type: "bench" }, { x: 13, y: 42, type: "bench" },
  { x: 17, y: 42, type: "bench" }, { x: 21, y: 42, type: "bench" },
  // Firing Range
  { x: 54, y: 39, type: "target" }, { x: 54, y: 42, type: "target" },
  { x: 54, y: 45, type: "target" },
  { x: 37, y: 38, type: "ammo_crate" },
  // Fitness Center
  { x: 7, y: 17, type: "weight_rack" }, { x: 9, y: 17, type: "weight_rack" },
  { x: 7, y: 19, type: "dumbbell" }, { x: 9, y: 19, type: "dumbbell" },
  { x: 19, y: 18, type: "punching_bag" }, { x: 22, y: 18, type: "punching_bag" },
  { x: 19, y: 20, type: "punching_bag" }, { x: 22, y: 20, type: "punching_bag" },
  { x: 12, y: 23, type: "bench" },
  // Supervisor Office
  { x: 46, y: 21, type: "desk" }, { x: 47, y: 21, type: "desk" },
  { x: 39, y: 17, type: "filing_cabinet" }, { x: 41, y: 17, type: "filing_cabinet" },
  { x: 53, y: 17, type: "filing_cabinet" }, { x: 55, y: 17, type: "filing_cabinet" },
  { x: 44, y: 17, type: "monitor_bank" },
  // Break Room
  { x: 21, y: 32, type: "table" }, { x: 23, y: 32, type: "table" },
  { x: 20, y: 31, type: "chair" }, { x: 24, y: 31, type: "chair" },
  { x: 20, y: 33, type: "vending_machine" },
  // Armory
  { x: 36, y: 33, type: "weapon_rack" }, { x: 38, y: 33, type: "weapon_rack" },
  { x: 40, y: 33, type: "weapon_rack" },
  // Entrance Lobby
  { x: 29, y: 53, type: "desk" }, { x: 30, y: 53, type: "desk" },
  { x: 24, y: 55, type: "chair" }, { x: 35, y: 55, type: "chair" },
  { x: 29, y: 56, type: "potted_plant" }, { x: 30, y: 56, type: "potted_plant" },
  // Combat Arena
  { x: 30, y: 6, type: "ammo_crate" },
  { x: 15, y: 8, type: "barrier" }, { x: 44, y: 8, type: "barrier" },
]
  .filter((p) => !ROOMS.some((r) => r.dropProps.some((d) => d.x === p.x && d.y === p.y)))
  .concat(ROOMS.flatMap((r) => r.props));

export const TUTORIAL_MAP = {
  name: "Chronos PD — Temporal Crimes Division HQ",
  width: W,
  height: H,
  grid: g,
  // The station's own walls, painted for this map (js/renderer.js
  // _ensureMapWalls): every locker type, lit and open twins included.
  ownWalls: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, ...ALL_ROOMS.flatMap((r) => r.ownWalls)],
  playerStart: { x: 13.5, y: 43.5, dir: -1.5708 }, // Center of locker room, facing north
  // Each room's own lamps (js/tutorial-system.js _syncRoomLights), on while
  // you are near enough to see them: the range's floods on the bullet trap,
  // one over each lane, and the cooler task light along the booths.
  roomLights: [
    { room: "range", x: 54.5, y: 39.5, color: [255, 226, 186], radius: 4, intensity: 0.55 },
    { room: "range", x: 54.5, y: 42.5, color: [255, 226, 186], radius: 4, intensity: 0.55 },
    { room: "range", x: 54.5, y: 45.5, color: [255, 226, 186], radius: 4, intensity: 0.55 },
    { room: "range", x: 42.5, y: 42.5, color: [200, 220, 255], radius: 5, intensity: 0.7 },
    ...ALL_ROOMS.flatMap((r) => r.lights),
  ],
  rooms: { range: { x0: 35, y0: 37, x1: 56, y1: 47 }, ...Object.assign({}, ...ALL_ROOMS.map((r) => r.boxes)) },
  // The range's weapons and the Supervisor's desk are put down by the
  // prologue as their steps begin (js/tutorial-system.js).
  pickups: [
    // Armory — extra weapon, found while restoring power
    { x: 36.5, y: 32.5, type: "weapon", weaponId: 2 },
    // Evidence room (behind the gym's secret wall) — Ricochet Pistol and a med pack
    { x: 12.5, y: 23.5, type: "weapon", weaponId: 6 },
    { x: 11.5, y: 24.5, type: "health" },
    // Break room bonus
    { x: 22.5, y: 32.5, type: "health" },
    // Combat arena resupply
    { x: 29.5, y: 9.5, type: "ammo" },
    { x: 30.5, y: 9.5, type: "health" },
  ],
  doors: {
    // Locker room → corridor
    door1: [{ x: 26, y: 41 }, { x: 26, y: 42 }],
    // Corridor → firing range
    door2: [{ x: 33, y: 41 }, { x: 33, y: 42 }],
    // Corridor → fitness center
    door3: [{ x: 24, y: 20 }, { x: 24, y: 21 }],
    // Corridor → supervisor office
    door4: [{ x: 35, y: 20 }, { x: 35, y: 21 }],
    // Corridor → combat arena
    door5: [{ x: 29, y: 11 }, { x: 30, y: 11 }],
    // Inner supervisor office
    door6: [{ x: 46, y: 19 }],
    // Observation deck
    door7: [{ x: 5, y: 14 }],
    // Captain's quarters
    door8: [{ x: 54, y: 14 }],
    // Break room
    door9: [{ x: 25, y: 30 }, { x: 25, y: 31 }],
    // Armory
    door10: [{ x: 34, y: 30 }, { x: 34, y: 31 }],
    // Side corridor doors
    door11: [{ x: 12, y: 37 }],
    door12: [{ x: 48, y: 37 }],
    // Sim hall → north hall (the east wing, R&D)
    door13: [{ x: 51, y: 8 }, { x: 51, y: 9 }],
    // Supervisor office → the spine
    door15: [{ x: 56, y: 20 }, { x: 56, y: 21 }],
    // The gym's north door, onto the corridor (the course's way out)
    door16: [{ x: 24, y: 16 }, { x: 24, y: 17 }],
  },
  props: CORE_PROPS
    .filter((p) => !EAST_ROOMS.some((r) => r.dropProps.some((d) => d.x === p.x && d.y === p.y)))
    .concat(EAST_ROOMS.flatMap((r) => r.props)),
  heightMap: hm,
};

/**
 * The station's 60x60 plan as it was before the east wing, and its props:
 * what the Precinct (src/data/levels/act2-maps.js) is built from.
 */
export const STATION_CORE = { width: CORE, height: CORE, grid: CORE_GRID, props: CORE_PROPS };
