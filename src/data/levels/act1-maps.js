// ═══════════════════════════════════════════════════════════════════
// ACT 1 MAPS — Programmatic 60×60 Campaign Levels
// Uses same builder pattern as tutorial.js
// ═══════════════════════════════════════════════════════════════════
import {
  createGrid,
  carve,
  hWall,
  vWall,
  tile,
  door,
  room,
  corridor,
  coverGrid,
} from "./map-helpers.js";

// ── LEVEL 1: Chronos Station — Entry ─────────────────────────────
// Stone walls (1). Player breaches via south airlock, pushes north
// to the command bridge. First contact with temporal hostiles.
// ──────────────────────────────────────────────────────────────────
function buildEntry() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 1);

  // ── ENTRY AIRLOCK (rows 53-57, cols 25-34) ──
  carve(g, 53, 25, 57, 34);
  door(g, 52, 29);
  door(g, 52, 30);

  // ── MAIN LOBBY (rows 44-52, cols 17-42) ──
  carve(g, 44, 17, 52, 42);
  // Reception desk (metal pillars)
  for (let c = 27; c <= 32; c++) tile(g, 49, c, 3);
  // Columns
  tile(g, 46, 22);
  tile(g, 46, 37);
  tile(g, 50, 22);
  tile(g, 50, 37);
  // Side alcoves
  carve(g, 47, 14, 50, 16);
  carve(g, 47, 43, 50, 45);

  // ── MAIN CORRIDOR (cols 27-32, rows 13-43) ──
  carve(g, 13, 27, 43, 32);

  // ── SOUTH CROSS CORRIDOR (rows 40-41, cols 5-54) ──
  carve(g, 40, 5, 41, 54);

  // ── WEST CREW QUARTERS (rows 33-44, cols 3-16) ──
  carve(g, 34, 4, 38, 14); // upper bunk room
  door(g, 39, 9); // upper bunk had no way in — open onto the south cross corridor
  carve(g, 42, 4, 44, 14); // lower bunk room
  door(g, 40, 14);
  door(g, 41, 14);
  // Bunk pillars
  tile(g, 35, 6);
  tile(g, 35, 10);
  tile(g, 37, 6);
  tile(g, 37, 10);
  tile(g, 43, 6);
  tile(g, 43, 10);
  // Connect to lobby
  carve(g, 44, 14, 44, 16);

  // ── EAST COMMS CENTER (rows 33-44, cols 43-56) — tech accents ──
  carve(g, 34, 45, 38, 55);
  carve(g, 42, 45, 44, 55);
  hWall(g, 34, 45, 55, 2);
  hWall(g, 38, 45, 55, 2);
  // The south hWall closed the upper comms room off entirely; give it a door
  // down to the cross corridor through the wall row beneath.
  door(g, 38, 50);
  carve(g, 39, 50, 39, 50);
  door(g, 40, 45);
  door(g, 41, 45);
  tile(g, 36, 48, 2);
  tile(g, 36, 52, 2);
  carve(g, 44, 43, 44, 45);

  // ── NORTH CROSS CORRIDOR (rows 18-19, cols 5-54) ──
  carve(g, 18, 5, 19, 54);

  // ── CENTRAL ATRIUM (rows 22-38, cols 17-42) ──
  // The two halves meet the main corridor (cols 27-32). They previously
  // stopped at col 25 / started at col 34, leaving 1-tile walls at 26 and 33
  // that sealed the atrium, both office wings and both secrets.
  carve(g, 22, 17, 38, 26);
  carve(g, 22, 33, 38, 42);
  // Tactical cover pillars
  tile(g, 25, 20);
  tile(g, 25, 39);
  tile(g, 30, 22);
  tile(g, 30, 37);
  tile(g, 35, 20);
  tile(g, 35, 39);
  tile(g, 28, 30, 3); // center metal pillar

  // ── WEST OFFICES (3 stacked, cols 3-16) ──
  room(g, 20, 3, 24, 16, 1);
  door(g, 22, 16);
  room(g, 24, 3, 28, 16, 1);
  door(g, 26, 16);
  room(g, 28, 3, 32, 16, 1);
  door(g, 30, 16);
  tile(g, 22, 8);
  tile(g, 26, 8);
  tile(g, 30, 8); // desks

  // ── EAST OPERATIONS (rows 20-32, cols 43-56) — tech theme ──
  room(g, 20, 43, 26, 56, 2);
  door(g, 23, 43);
  room(g, 26, 43, 32, 56, 2);
  door(g, 29, 43);
  hWall(g, 20, 46, 53, 8); // glass observation window
  tile(g, 23, 48, 2);
  tile(g, 23, 52, 2);
  tile(g, 29, 48, 2);
  tile(g, 29, 52, 2);

  // ── NORTH CORRIDOR (rows 13-17) ──
  carve(g, 13, 5, 17, 16);
  carve(g, 13, 43, 17, 54);

  // ── COMMAND BRIDGE (rows 3-12, cols 18-41) ──
  carve(g, 3, 18, 12, 41);
  tile(g, 6, 24, 2);
  tile(g, 6, 35, 2);
  tile(g, 9, 24, 2);
  tile(g, 9, 35, 2);
  for (let c = 28; c <= 31; c++) tile(g, 7, c, 3); // command table
  door(g, 12, 29);
  door(g, 12, 30);

  // ── NW SUPPLY ROOM (rows 4-10, cols 3-14) ──
  room(g, 4, 3, 10, 14, 1);
  door(g, 10, 9);
  carve(g, 11, 8, 12, 10);
  tile(g, 6, 5);
  tile(g, 6, 8);
  tile(g, 6, 12);
  tile(g, 8, 5);
  tile(g, 8, 12);

  // ── NE ARMORY (rows 4-10, cols 45-56) ──
  room(g, 4, 45, 10, 56, 3);
  door(g, 10, 50);
  carve(g, 11, 49, 12, 51);
  tile(g, 6, 47, 3);
  tile(g, 6, 50, 3);
  tile(g, 6, 53, 3);
  tile(g, 8, 47, 3);
  tile(g, 8, 53, 3);

  // ── SECRET ROOMS ──
  // 1: Behind west offices
  carve(g, 25, 1, 27, 2);
  g[26][3] = 6;
  // 2: Behind east ops
  carve(g, 27, 57, 29, 58);
  g[28][56] = 6;

  return {
    name: "Chronos Station - Entry",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // ── Enemies (15) — intro difficulty ──
      // Lobby
      { x: 25.5, y: 47.5, type: "enemy", enemyType: "drone" },
      { x: 35.5, y: 47.5, type: "enemy", enemyType: "drone" },
      { x: 30.5, y: 45.5, type: "enemy", enemyType: "glitchling" },
      // West crew quarters
      { x: 9.5, y: 36.5, type: "enemy", enemyType: "corruptCop" },
      { x: 9.5, y: 43.5, type: "enemy", enemyType: "drone" },
      // East comms
      { x: 50.5, y: 36.5, type: "enemy", enemyType: "corruptCop" },
      { x: 50.5, y: 43.5, type: "enemy", enemyType: "drone" },
      // Central atrium
      { x: 22.5, y: 27.5, type: "enemy", enemyType: "glitchling" },
      { x: 37.5, y: 27.5, type: "enemy", enemyType: "glitchling" },
      { x: 30.5, y: 32.5, type: "enemy", enemyType: "sentinel" },
      // West offices
      { x: 9.5, y: 22.5, type: "enemy", enemyType: "corruptCop" },
      // East operations
      { x: 50.5, y: 23.5, type: "enemy", enemyType: "phantom" },
      // Command bridge
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "sentinel" },
      { x: 35.5, y: 7.5, type: "enemy", enemyType: "corruptCop" },
      { x: 30.5, y: 5.5, type: "enemy", enemyType: "phantom" },
      // ── Pickups ──
      { x: 20.5, y: 48.5, type: "health" },
      { x: 39.5, y: 48.5, type: "ammo" },
      { x: 8.5, y: 38.5, type: "ammo" },
      { x: 50.5, y: 37.5, type: "health" },
      { x: 22.5, y: 22.5, type: "health" },
      { x: 37.5, y: 35.5, type: "ammo" },
      { x: 30.5, y: 9.5, type: "ammo" },
      { x: 50.5, y: 7.5, type: "weapon", weaponId: 1 },
      // Secret supplies
      { x: 1.5, y: 26.5, type: "health" },
      { x: 57.5, y: 28.5, type: "ammo" },
    ],
    exit: { x: 30.5, y: 3.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 26,
        description: "Hidden supply cache behind the west offices",
      },
      {
        wallX: 56,
        wallY: 28,
        description: "Secret armory — reinforced ammo reserves",
      },
    ],
    props: [
      { x: 28, y: 49, type: "desk" },
      { x: 31, y: 49, type: "desk" },
      { x: 20, y: 50, type: "chair" },
      { x: 39, y: 50, type: "chair" },
      { x: 18, y: 52, type: "potted_plant" },
      { x: 41, y: 52, type: "potted_plant" },
      { x: 8, y: 22, type: "desk" },
      { x: 8, y: 26, type: "desk" },
      { x: 48, y: 23, type: "monitor_bank" },
      { x: 52, y: 23, type: "monitor_bank" },
      { x: 28, y: 7, type: "monitor_bank" },
      { x: 31, y: 7, type: "monitor_bank" },
      { x: 5, y: 6, type: "ammo_crate" },
      { x: 12, y: 6, type: "ammo_crate" },
      { x: 47, y: 6, type: "weapon_rack" },
      { x: 53, y: 6, type: "weapon_rack" },
    ],
  };
}

// ── LEVEL 2: Security Checkpoint ─────────────────────────────────
// Stone (1) + Metal (3) walls, glass (8) observation windows.
// Tighter corridors, checkpoint lanes, holding cells.
// First encounter with Corrupt SWAT officers en masse.
// ──────────────────────────────────────────────────────────────────
function buildCheckpoint() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 1);

  // ── ENTRY HALL (rows 52-57, cols 20-39) ──
  carve(g, 52, 20, 57, 39);
  // Blast doors
  door(g, 51, 29);
  door(g, 51, 30);

  // ── CHECKPOINT HALL (rows 38-51, cols 14-45) ── 3 processing lanes
  carve(g, 38, 14, 51, 45);
  // Lane dividers (metal barriers)
  for (let r = 40; r <= 49; r++) {
    tile(g, r, 22, 3); // lane 1|2
    tile(g, r, 30, 3); // lane 2|3
    tile(g, r, 37, 3); // lane 3|4
  }
  // Checkpoint barriers (gaps for passage)
  hWall(g, 44, 14, 45, 3);
  carve(g, 44, 18, 44, 19); // gap lane 1
  carve(g, 44, 25, 44, 27); // gap lane 2
  carve(g, 44, 33, 44, 35); // gap lane 3
  carve(g, 44, 40, 44, 42); // gap lane 4
  // Metal desk at each checkpoint
  tile(g, 45, 18, 3);
  tile(g, 45, 26, 3);
  tile(g, 45, 34, 3);
  tile(g, 45, 41, 3);

  // ── MAIN CORRIDOR (rows 26-37, cols 27-32) ──
  carve(g, 26, 27, 37, 32);
  door(g, 37, 29);
  door(g, 37, 30);

  // ── EAST-WEST CORRIDOR (rows 33-34, cols 5-54) ──
  carve(g, 33, 5, 34, 54);

  // ── WEST HOLDING CELLS (rows 27-44, cols 3-16) ── 4 cells stacked
  room(g, 27, 3, 31, 12, 3);
  room(g, 31, 3, 35, 12, 3);
  room(g, 35, 3, 39, 12, 3);
  room(g, 39, 3, 43, 12, 3);
  // Stacked cells share their boundary rows, and each room() call re-walls the
  // shared row — so a door placed before the next room() was silently erased.
  // Place the cell-to-cell doors after every room is built. (The old chain also
  // ended in a door at row 43 that opened onto solid rock; it is dropped.)
  door(g, 31, 7);
  door(g, 35, 7);
  door(g, 39, 7);
  // The E-W corridor (rows 33-34) runs through the middle cell, but room()
  // re-walls col 12 after it is carved. Reopen the corridor through the wall.
  door(g, 33, 12);
  door(g, 34, 12);
  // Corridor outside cells
  carve(g, 27, 13, 43, 15);
  door(g, 33, 15);
  door(g, 34, 15);
  // Cell furniture
  tile(g, 29, 5);
  tile(g, 33, 5);
  tile(g, 37, 5);
  tile(g, 41, 5);

  // ── EAST HOLDING CELLS (rows 27-44, cols 47-56) ── 4 cells
  room(g, 27, 47, 31, 56, 3);
  room(g, 31, 47, 35, 56, 3);
  room(g, 35, 47, 39, 56, 3);
  room(g, 39, 47, 43, 56, 3);
  // Same shared-wall ordering as the west block.
  door(g, 31, 51);
  door(g, 35, 51);
  door(g, 39, 51);
  door(g, 33, 47);
  door(g, 34, 47);
  carve(g, 27, 44, 43, 46);
  door(g, 33, 44);
  door(g, 34, 44);
  tile(g, 29, 53);
  tile(g, 33, 53);
  tile(g, 37, 53);
  tile(g, 41, 53);

  // ── CENTRAL SECURITY OFFICE (rows 19-26, cols 20-39) ──
  room(g, 19, 20, 26, 39, 3);
  door(g, 26, 29);
  door(g, 26, 30);
  // Inner desk cluster
  tile(g, 22, 27, 3);
  tile(g, 22, 28, 3);
  tile(g, 22, 31, 3);
  tile(g, 22, 32, 3);
  // Monitor wall
  hWall(g, 19, 24, 35, 2);
  // North exits to patrol corridor
  door(g, 19, 22);
  door(g, 19, 37);

  // ── OBSERVATION DECK (rows 19-24, cols 3-16) — glass wall south ──
  room(g, 19, 3, 24, 16, 1);
  hWall(g, 24, 5, 14, 8); // glass south wall (overlooks cell block)
  door(g, 22, 16);
  // Connect to security office approach
  carve(g, 22, 17, 22, 19);
  door(g, 22, 20); // the approach stopped at the office's west wall

  // ── ARMORY VAULT (rows 19-24, cols 43-56) — metal walls ──
  room(g, 19, 43, 24, 56, 3);
  door(g, 22, 43);
  carve(g, 22, 40, 22, 42);
  door(g, 22, 39); // the approach stopped at the office's east wall
  // Weapon racks
  tile(g, 21, 47, 3);
  tile(g, 21, 50, 3);
  tile(g, 21, 53, 3);

  // ── NORTH PATROL CORRIDOR (rows 13-18, cols 5-54) ──
  carve(g, 13, 5, 18, 54);
  // Cover pillars for patrol encounters
  tile(g, 15, 15, 3);
  tile(g, 15, 30, 3);
  tile(g, 15, 44, 3);
  tile(g, 17, 10, 3);
  tile(g, 17, 25, 3);
  tile(g, 17, 37, 3);
  tile(g, 17, 50, 3);

  // ── NORTH ROOMS ──
  // NW Briefing room
  room(g, 3, 3, 11, 18, 1);
  door(g, 11, 10);
  carve(g, 12, 9, 12, 11);
  tile(g, 6, 8);
  tile(g, 6, 9);
  tile(g, 6, 12);
  tile(g, 6, 13); // table

  // NE Evidence room
  room(g, 3, 41, 11, 56, 2);
  door(g, 11, 48);
  carve(g, 12, 47, 12, 49);
  tile(g, 6, 45, 2);
  tile(g, 6, 48, 2);
  tile(g, 6, 52, 2);
  tile(g, 8, 45, 2);
  tile(g, 8, 52, 2);

  // North exit corridor
  room(g, 3, 22, 11, 37, 1);
  door(g, 11, 29);
  door(g, 11, 30);
  carve(g, 12, 28, 12, 31);
  // Final guard posts
  tile(g, 6, 26, 3);
  tile(g, 6, 33, 3);

  // ── SECRET ROOM — behind observation deck ──
  carve(g, 20, 1, 22, 2);
  g[21][3] = 6;

  return {
    name: "Security Checkpoint",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // ── Enemies (17) — checkpoint theme ──
      // Checkpoint hall
      { x: 18.5, y: 42.5, type: "enemy", enemyType: "corruptCop" },
      { x: 26.5, y: 42.5, type: "enemy", enemyType: "corruptCop" },
      { x: 34.5, y: 42.5, type: "enemy", enemyType: "corruptCop" },
      { x: 41.5, y: 42.5, type: "enemy", enemyType: "corruptCop" },
      { x: 30.5, y: 39.5, type: "enemy", enemyType: "drone" },
      // West cells
      { x: 7.5, y: 29.5, type: "enemy", enemyType: "drone" },
      { x: 7.5, y: 37.5, type: "enemy", enemyType: "glitchling" },
      // East cells
      { x: 51.5, y: 29.5, type: "enemy", enemyType: "drone" },
      { x: 51.5, y: 41.5, type: "enemy", enemyType: "glitchling" },
      // Security office
      { x: 29.5, y: 22.5, type: "enemy", enemyType: "sentinel" },
      { x: 33.5, y: 23.5, type: "enemy", enemyType: "corruptCop" },
      // North patrol
      { x: 16.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      { x: 30.5, y: 16.5, type: "enemy", enemyType: "drone" },
      { x: 45.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      // North rooms
      { x: 10.5, y: 7.5, type: "enemy", enemyType: "sentinel" },
      { x: 48.5, y: 7.5, type: "enemy", enemyType: "phantom" },
      { x: 29.5, y: 7.5, type: "enemy", enemyType: "corruptCop" },
      // ── Pickups ──
      { x: 23.5, y: 49.5, type: "health" },
      { x: 38.5, y: 49.5, type: "ammo" },
      { x: 14.5, y: 35.5, type: "ammo" },
      { x: 45.5, y: 35.5, type: "health" },
      { x: 9.5, y: 22.5, type: "health" }, // observation deck
      { x: 49.5, y: 22.5, type: "ammo" }, // armory vault
      { x: 50.5, y: 22.5, type: "weapon", weaponId: 1 }, // in front of the rack, not on it
      { x: 29.5, y: 16.5, type: "health" },
      // Secret
      { x: 1.5, y: 21.5, type: "health" },
    ],
    exit: { x: 29.5, y: 4.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 21,
        description: "Security locker — emergency medical supplies",
      },
    ],
    props: [
      // Checkpoint desks
      { x: 18, y: 45, type: "desk" },
      { x: 26, y: 45, type: "desk" },
      { x: 34, y: 45, type: "desk" },
      { x: 41, y: 45, type: "desk" },
      // Security office
      { x: 27, y: 22, type: "monitor_bank" },
      { x: 32, y: 22, type: "monitor_bank" },
      // Observation deck
      { x: 7, y: 21, type: "desk" },
      { x: 12, y: 21, type: "chair" },
      // Armory
      { x: 47, y: 21, type: "weapon_rack" },
      { x: 50, y: 21, type: "weapon_rack" },
      { x: 53, y: 21, type: "weapon_rack" },
      // Evidence room
      { x: 45, y: 6, type: "filing_cabinet" },
      { x: 52, y: 6, type: "filing_cabinet" },
      // Briefing room
      { x: 8, y: 6, type: "table" },
      { x: 13, y: 6, type: "table" },
    ],
  };
}

// ── LEVEL 3: Research Wing ───────────────────────────────────────
// Tech (2) walls, glass (8), energy (4) accents. Open labs with
// glass dividers. Phantoms phase through. ARIA finds early files.
// "Whatever they were studying here... it didn't end well."
// ──────────────────────────────────────────────────────────────────
function buildResearchWing() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 2); // fill with tech walls

  // ── LAB ENTRANCE (rows 52-57, cols 22-37) ──
  carve(g, 52, 22, 57, 37);
  // Glass front windows
  hWall(g, 57, 23, 36, 8);
  door(g, 51, 29);
  door(g, 51, 30);

  // ── SOUTH CORRIDOR (rows 47-51, cols 14-45) ──
  carve(g, 47, 14, 51, 45);
  // Energy pillar accents
  tile(g, 49, 18, 4);
  tile(g, 49, 41, 4);

  // ── WEST BIO-LAB (rows 34-46, cols 3-24) ──
  carve(g, 35, 4, 45, 23);
  // Glass dividers creating lab sections. Each leaves a 2-tile passage at
  // rows 39-40: full-height dividers sealed the two outer sections, along with
  // the enemies and pickups placed inside them.
  vWall(g, 35, 38, 10, 8);
  vWall(g, 41, 45, 10, 8);
  vWall(g, 35, 38, 17, 8);
  vWall(g, 41, 45, 17, 8);
  // Work benches
  tile(g, 38, 7);
  tile(g, 38, 13);
  tile(g, 38, 20);
  tile(g, 42, 7);
  tile(g, 42, 13);
  tile(g, 42, 20);
  // Glass observation (south wall)
  hWall(g, 46, 4, 23, 8);
  // Door to south corridor
  carve(g, 46, 18, 47, 19);
  door(g, 46, 18);
  door(g, 46, 19);

  // ── EAST PHYSICS LAB (rows 34-46, cols 35-56) ──
  carve(g, 35, 36, 45, 55);
  // Energy-walled containment sections, with the same rows 39-40 passages as
  // the west lab so the outer sections can be entered.
  vWall(g, 35, 38, 42, 4);
  vWall(g, 41, 45, 42, 4);
  vWall(g, 35, 38, 49, 4);
  vWall(g, 41, 45, 49, 4);
  // Equipment pillars
  tile(g, 38, 39, 4);
  tile(g, 38, 45, 4);
  tile(g, 38, 52, 4);
  tile(g, 42, 39, 4);
  tile(g, 42, 45, 4);
  tile(g, 42, 52, 4);
  hWall(g, 46, 36, 55, 8);
  carve(g, 46, 40, 47, 41);
  door(g, 46, 40);
  door(g, 46, 41);

  // ── CENTRAL SPECIMEN HALLWAY (rows 22-46, cols 25-34) ──
  carve(g, 22, 25, 46, 34);
  // Glass viewing windows on sides
  vWall(g, 35, 45, 24, 8);
  vWall(g, 35, 45, 35, 8);
  // Specimen display pillars
  tile(g, 30, 28, 4);
  tile(g, 30, 31, 4);
  tile(g, 36, 28, 4);
  tile(g, 36, 31, 4);
  tile(g, 42, 28, 4);
  tile(g, 42, 31, 4);

  // ── CROSS CORRIDOR (rows 30-31, cols 5-54) ──
  carve(g, 30, 5, 31, 54);

  // ── WEST DATA ARCHIVE (rows 22-29, cols 3-20) ──
  room(g, 22, 3, 29, 20, 2);
  door(g, 29, 11);
  // Server racks
  tile(g, 24, 6, 2);
  tile(g, 24, 10, 2);
  tile(g, 24, 14, 2);
  tile(g, 24, 18, 2);
  tile(g, 27, 6, 2);
  tile(g, 27, 10, 2);
  tile(g, 27, 14, 2);
  tile(g, 27, 18, 2);

  // ── EAST CONTAINMENT (rows 22-29, cols 39-56) ── energy walls
  room(g, 22, 39, 29, 56, 4);
  door(g, 29, 47);
  // Containment pods
  tile(g, 24, 43, 4);
  tile(g, 24, 47, 4);
  tile(g, 24, 51, 4);
  tile(g, 27, 43, 4);
  tile(g, 27, 47, 4);
  tile(g, 27, 51, 4);

  // ── NORTH CORRIDOR (rows 16-21, cols 5-54) ──
  carve(g, 16, 5, 21, 54);
  // Energy accent pillars
  tile(g, 18, 12, 4);
  tile(g, 18, 29, 4);
  tile(g, 18, 47, 4);
  tile(g, 20, 20, 4);
  tile(g, 20, 39, 4);

  // ── NW SERVER ROOM (rows 4-14, cols 3-18) ──
  room(g, 4, 3, 14, 18, 2);
  door(g, 14, 10);
  carve(g, 15, 9, 15, 11);
  // Dense server rack grid
  for (let r = 6; r <= 12; r += 2)
    for (let c = 5; c <= 16; c += 4) tile(g, r, c, 2);

  // ── NE EXPERIMENT CHAMBER (rows 4-14, cols 41-56) ──
  room(g, 4, 41, 14, 56, 4);
  door(g, 14, 48);
  carve(g, 15, 47, 15, 49);
  // Central experiment platform (glass)
  room(g, 7, 45, 11, 52, 8);
  tile(g, 9, 48, 4); // energy core

  // ── CENTRAL OFFICE (rows 4-14, cols 21-38) — Dr. Voss' early workspace ──
  room(g, 4, 21, 14, 38, 2);
  door(g, 14, 29);
  door(g, 14, 30);
  carve(g, 15, 28, 15, 31);
  // Glass interior partition
  hWall(g, 9, 24, 35, 8);
  door(g, 9, 29);
  // Desk + equipment
  tile(g, 6, 27);
  tile(g, 6, 28);
  tile(g, 6, 31);
  tile(g, 6, 32);
  tile(g, 12, 24, 2);
  tile(g, 12, 35, 2);

  // ── SECRET ROOMS ──
  // 1: Dr. Voss' hidden notes — behind data archive
  carve(g, 24, 1, 26, 2);
  g[25][3] = 6;
  // 2: Prototype storage — behind experiment chamber
  carve(g, 8, 57, 10, 58);
  g[9][56] = 6;

  return {
    name: "Research Wing",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // ── Enemies (18) — phantoms heavy, glass-themed ──
      // South corridor
      { x: 22.5, y: 49.5, type: "enemy", enemyType: "drone" },
      { x: 37.5, y: 49.5, type: "enemy", enemyType: "drone" },
      // West bio-lab
      { x: 8.5, y: 38.5, type: "enemy", enemyType: "phantom" },
      { x: 14.5, y: 42.5, type: "enemy", enemyType: "glitchling" },
      { x: 21.5, y: 38.5, type: "enemy", enemyType: "corruptCop" },
      // East physics lab
      { x: 40.5, y: 38.5, type: "enemy", enemyType: "phantom" },
      { x: 46.5, y: 42.5, type: "enemy", enemyType: "phantom" },
      { x: 53.5, y: 38.5, type: "enemy", enemyType: "drone" },
      // Central hallway
      { x: 29.5, y: 35.5, type: "enemy", enemyType: "phantom" },
      { x: 29.5, y: 25.5, type: "enemy", enemyType: "glitchling" },
      // Data archive
      { x: 11.5, y: 25.5, type: "enemy", enemyType: "drone" },
      // Containment
      { x: 47.5, y: 25.5, type: "enemy", enemyType: "corruptCop" },
      // North corridor
      { x: 20.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      { x: 39.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      // Server room
      { x: 10.5, y: 9.5, type: "enemy", enemyType: "drone" },
      // Experiment chamber
      // Was on the energy core inside the sealed glass platform, where it could
      // never be reached or shot but still counted toward the kill total.
      { x: 48.5, y: 12.5, type: "enemy", enemyType: "glitchling" },
      // Central office
      { x: 29.5, y: 7.5, type: "enemy", enemyType: "corruptCop" },
      { x: 33.5, y: 11.5, type: "enemy", enemyType: "phantom" },
      // ── Pickups ──
      { x: 29.5, y: 53.5, type: "health" },
      { x: 16.5, y: 47.5, type: "ammo" },
      { x: 43.5, y: 47.5, type: "ammo" },
      { x: 14.5, y: 38.5, type: "health" },
      { x: 46.5, y: 38.5, type: "health" },
      { x: 8.5, y: 25.5, type: "ammo" },
      { x: 50.5, y: 25.5, type: "health" },
      { x: 30.5, y: 18.5, type: "ammo" },
      { x: 10.5, y: 7.5, type: "weapon", weaponId: 1 },
      // Secrets
      { x: 1.5, y: 25.5, type: "health" },
      { x: 57.5, y: 9.5, type: "ammo" },
    ],
    exit: { x: 29.5, y: 5.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 25,
        description:
          "Dr. Voss' early research notes — 'The suit responds to the subject's temporal frequency. Fascinating.'",
      },
      {
        wallX: 56,
        wallY: 9,
        description:
          "Prototype temporal lens — 'If this works, we can SEE through time itself.'",
      },
    ],
    props: [
      // Bio-lab
      { x: 7, y: 38, type: "desk" },
      { x: 13, y: 38, type: "desk" },
      { x: 7, y: 42, type: "desk" },
      { x: 13, y: 42, type: "desk" },
      // Physics lab
      { x: 39, y: 38, type: "monitor_bank" },
      { x: 52, y: 38, type: "monitor_bank" },
      // Data archive
      { x: 6, y: 24, type: "filing_cabinet" },
      { x: 14, y: 24, type: "filing_cabinet" },
      { x: 6, y: 27, type: "filing_cabinet" },
      { x: 14, y: 27, type: "filing_cabinet" },
      // Central office
      { x: 27, y: 6, type: "desk" },
      { x: 32, y: 6, type: "desk" },
      { x: 24, y: 12, type: "monitor_bank" },
      { x: 35, y: 12, type: "monitor_bank" },
      // Specimen hallway
      { x: 28, y: 30, type: "barrier" },
      { x: 31, y: 36, type: "barrier" },
    ],
  };
}

export const ACT1_LEVELS = [
  buildEntry(),
  buildCheckpoint(),
  buildResearchWing(),
];
