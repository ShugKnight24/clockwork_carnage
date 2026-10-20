// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

// ── Build 60x60 police station grid programmatically ──
const W = 60, H = 60;
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

export const TUTORIAL_MAP = {
  name: "Chronos PD — Temporal Crimes Division HQ",
  width: W,
  height: H,
  grid: g,
  // The station's own walls, painted for this map (js/renderer.js
  // _ensureMapWalls): every locker type, lit and open twins included.
  ownWalls: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
  playerStart: { x: 13.5, y: 43.5, dir: -1.5708 }, // Center of locker room, facing north
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
  },
  // Props for environmental decoration (consumed by Track 2B props system)
  props: [
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
  ],
};
