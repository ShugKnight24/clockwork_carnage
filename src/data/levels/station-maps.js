// ═══════════════════════════════════════════════════════════════════
// STATION MAPS — Programmatic 60×60 Campaign Levels
// The nine Chronos Station maps, levels 1-9: Entry, Security Checkpoint,
// Research Wing, Containment Block, Server Farm, Reactor Access,
// Voss' Laboratory, Temporal Nexus and the Paradox Core (boss).
// Uses same builder pattern as tutorial.js. Which act plays which map, and
// how each is turned and varied, is src/data/campaign/acts.js.
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
  corridor,
  coverGrid,
  lowWall,
  lowTile,
  LAYER,
} from "./map-helpers.js";

// ── LEVEL 1: Chronos Station — Entry ─────────────────────────────
// Stone walls (1). Player breaches via south airlock, pushes north
// to the command bridge. First contact with temporal hostiles.
// ──────────────────────────────────────────────────────────────────
function buildEntry() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 1);
  const hm = createHeights(W, H);

  // ── ENTRY AIRLOCK (rows 53-57, cols 25-34) ──
  carve(g, 53, 25, 57, 34);
  door(g, 52, 29);
  door(g, 52, 30);

  // ── MAIN LOBBY (rows 44-52, cols 17-42) ──
  carve(g, 44, 17, 52, 42);
  // Reception desk — waist high, so the lobby fight has an angle over it
  // instead of a blind wall across the middle of the room.
  lowWall(g, hm, 49, 27, 49, 32, LAYER.WAIST, 3);
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
    heightMap: hm,
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
          "Unsigned research notes — 'The suit responds to the subject's temporal frequency. Fascinating.'",
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

// ═══════════════════════════════════════════════════════════════════
// Levels 4-6: Containment Block, Server Farm, Reactor Access
// Narrative focus: Voss breadcrumb reveal → "three steps ahead"
// ═══════════════════════════════════════════════════════════════════

// ── LEVEL 4: Containment Block ───────────────────────────────────
// Metal (3) walls. Prisoner cell block. Sub-boss vibe: Shield Commander.
// Narrative: Prisoner logs mention Voss volunteering for the experiment.
// ──────────────────────────────────────────────────────────────────
function buildContainment() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 1);

  // ── ENTRY AIRLOCK (south) ──
  carve(g, 53, 26, 57, 33);
  door(g, 52, 29);
  door(g, 52, 30);

  // ── INTAKE PROCESSING (rows 44-52, cols 15-44) ──
  carve(g, 44, 15, 52, 44);
  // Metal desk barrier
  for (let c = 25; c <= 34; c++) tile(g, 48, c, 3);
  carve(g, 48, 29, 48, 30); // gap

  // ── MAIN SPINE CORRIDOR (rows 20-43, cols 27-32) ──
  carve(g, 20, 27, 43, 32);

  // ── WEST CELL BANK (cols 3-14, rows 28-48) — 4 cells ──
  room(g, 28, 3, 32, 12, 3);
  room(g, 32, 3, 36, 12, 3);
  room(g, 36, 3, 40, 12, 3);
  room(g, 40, 3, 44, 12, 3);
  // Cells share boundary rows and room() re-walls them, so doors placed between
  // room() calls were erased. Place the chain doors after every room exists.
  door(g, 32, 7);
  door(g, 36, 7);
  door(g, 40, 7);
  // The bank had no entrance at all: col 12 was solid and the only surviving
  // door (row 44) opened onto rock. Enter the bottom cell from the walkway,
  // next to where the walkway meets the spine.
  door(g, 42, 12);
  // Cell-block corridor
  carve(g, 28, 13, 48, 16);
  // Connect to spine
  carve(g, 46, 16, 46, 27);
  // Prisoner cots (metal)
  tile(g, 30, 5);
  tile(g, 34, 5);
  tile(g, 38, 5);
  tile(g, 42, 5);

  // ── EAST CELL BANK (cols 45-56, rows 28-48) — 4 cells ──
  room(g, 28, 47, 32, 56, 3);
  room(g, 32, 47, 36, 56, 3);
  room(g, 36, 47, 40, 56, 3);
  room(g, 40, 47, 44, 56, 3);
  // Same shared-wall ordering and missing entrance as the west bank.
  door(g, 32, 51);
  door(g, 36, 51);
  door(g, 40, 51);
  door(g, 42, 47);
  carve(g, 28, 43, 48, 46);
  carve(g, 46, 32, 46, 43);
  tile(g, 30, 53);
  tile(g, 34, 53);
  tile(g, 38, 53);
  tile(g, 42, 53);

  // ── CENTRAL GUARD STATION (rows 20-27, cols 20-39) ──
  room(g, 20, 20, 27, 39, 3);
  door(g, 27, 29);
  door(g, 27, 30);
  door(g, 20, 29);
  door(g, 20, 30);
  // Command desks (away from central spine)
  tile(g, 23, 22, 3);
  tile(g, 23, 25, 3);
  tile(g, 23, 34, 3);
  tile(g, 23, 37, 3);
  // Glass observation windows south (to processing)
  hWall(g, 27, 22, 26, 8);
  hWall(g, 27, 33, 37, 8);

  // ── NORTH CORRIDOR (rows 13-19, cols 5-54) ──
  carve(g, 13, 5, 19, 54);

  // ── SUB-BOSS ARENA: Shield Commander (rows 3-12, cols 18-41) ──
  carve(g, 3, 18, 12, 41);
  // Metal columns for cover
  tile(g, 6, 22, 3);
  tile(g, 6, 37, 3);
  tile(g, 9, 22, 3);
  tile(g, 9, 37, 3);
  tile(g, 7, 29, 3);
  tile(g, 7, 30, 3);
  door(g, 12, 29);
  door(g, 12, 30);

  // ── WARDEN'S OFFICE (rows 4-11, cols 3-14) — Voss docs ──
  room(g, 4, 3, 11, 14, 3);
  door(g, 11, 8);
  carve(g, 12, 7, 13, 9);
  tile(g, 7, 6, 3);
  tile(g, 7, 10, 3);

  // ── EVIDENCE LOCKER (rows 4-11, cols 45-56) ──
  room(g, 4, 45, 11, 56, 3);
  door(g, 11, 50);
  carve(g, 12, 49, 13, 51);
  tile(g, 7, 48, 3);
  tile(g, 7, 53, 3);

  // ── SECRET: Prisoner escape tunnel ──
  carve(g, 36, 1, 38, 2);
  g[37][3] = 6;
  // ── SECRET: Classified memo room ──
  carve(g, 5, 57, 7, 58);
  g[6][56] = 6;

  return {
    name: "Containment Block",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // Intake processing
      { x: 22.5, y: 47.5, type: "enemy", enemyType: "sentinel" },
      { x: 37.5, y: 47.5, type: "enemy", enemyType: "sentinel" },
      { x: 29.5, y: 45.5, type: "enemy", enemyType: "henchman" },
      // Cell corridors
      { x: 14.5, y: 35.5, type: "enemy", enemyType: "corruptCop" },
      { x: 14.5, y: 42.5, type: "enemy", enemyType: "drone" },
      { x: 44.5, y: 35.5, type: "enemy", enemyType: "corruptCop" },
      { x: 44.5, y: 42.5, type: "enemy", enemyType: "drone" },
      // Cells (some occupied by escaped hostiles)
      { x: 7.5, y: 42.5, type: "enemy", enemyType: "glitchling" },
      { x: 51.5, y: 42.5, type: "enemy", enemyType: "glitchling" },
      // Spine corridor patrols
      { x: 29.5, y: 38.5, type: "enemy", enemyType: "drone" },
      { x: 29.5, y: 30.5, type: "enemy", enemyType: "phantom" },
      // Guard station
      { x: 24.5, y: 24.5, type: "enemy", enemyType: "sentinel" },
      { x: 35.5, y: 24.5, type: "enemy", enemyType: "sentinel" },
      // North corridor
      { x: 10.5, y: 16.5, type: "enemy", enemyType: "corruptCop" },
      { x: 49.5, y: 16.5, type: "enemy", enemyType: "corruptCop" },
      // Sub-boss arena: the Shield Commander ARIA warns about, flanked
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "sentinel" },
      { x: 34.5, y: 7.5, type: "enemy", enemyType: "sentinel" },
      { x: 29.5, y: 5.5, type: "enemy", enemyType: "shieldCommander" },
      { x: 30.5, y: 5.5, type: "enemy", enemyType: "phantom" },
      // Warden's office — Voss docs guarded
      { x: 7.5, y: 7.5, type: "enemy", enemyType: "henchman" },
      // Evidence locker
      { x: 50.5, y: 7.5, type: "enemy", enemyType: "henchman" },
      // ── Pickups ──
      { x: 20.5, y: 48.5, type: "health" },
      { x: 39.5, y: 48.5, type: "ammo" },
      { x: 7.5, y: 30.5, type: "health" },
      { x: 52.5, y: 30.5, type: "ammo" },
      { x: 29.5, y: 24.5, type: "health" },
      { x: 29.5, y: 15.5, type: "ammo" },
      { x: 7.5, y: 7.5, type: "weapon", weaponId: 5 }, // Temporal Sniper
      { x: 51.5, y: 7.5, type: "weapon", weaponId: 1 },
      { x: 29.5, y: 8.5, type: "ammo" }, // in front of the centre column, not on it
      // Secrets
      { x: 1.5, y: 37.5, type: "health" },
      { x: 57.5, y: 6.5, type: "ammo" },
    ],
    exit: { x: 29.5, y: 3.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 37,
        description:
          "Prisoner log: 'Subject V volunteered. Nobody told him what the experiment really was.'",
      },
      {
        wallX: 56,
        wallY: 6,
        description:
          "Classified memo: Project PARADOX approval — signed 'the Doctor'. Full signature redacted.",
      },
    ],
    props: [
      { x: 29, y: 49, type: "desk" },
      { x: 30, y: 49, type: "desk" },
      { x: 20, y: 47, type: "chair" },
      { x: 39, y: 47, type: "chair" },
      { x: 7, y: 30, type: "crate" },
      { x: 7, y: 38, type: "crate" },
      { x: 52, y: 30, type: "crate" },
      { x: 52, y: 38, type: "crate" },
      { x: 24, y: 23, type: "monitor_bank" },
      { x: 35, y: 23, type: "monitor_bank" },
      { x: 29, y: 7, type: "monitor_bank" },
      { x: 7, y: 10, type: "desk" },
      { x: 51, y: 10, type: "weapon_rack" },
    ],
  };
}

// ── LEVEL 5: Server Farm ─────────────────────────────────────────
// Tech (2) walls. Data corridors + server rack rooms.
// Narrative: ARIA pulls Voss' dossier. Reveals clearance Omega, deceased.
// ──────────────────────────────────────────────────────────────────
function buildServerFarm() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 2);

  // ── ENTRY (south) ──
  carve(g, 53, 26, 57, 33);
  door(g, 52, 29);
  door(g, 52, 30);

  // ── MAIN HALL (rows 44-52, cols 15-44) ──
  carve(g, 44, 15, 52, 44);
  tile(g, 47, 22, 2);
  tile(g, 47, 37, 2);
  tile(g, 50, 22, 2);
  tile(g, 50, 37, 2);

  // ── SERVER POD A (rows 34-43, cols 4-16) — tech walls ──
  room(g, 34, 4, 43, 16, 2);
  door(g, 43, 9);
  // Stub has to reach the main hall at col 15; it used to stop at col 10.
  carve(g, 44, 8, 44, 14);
  // Server racks (grid of tech pillars)
  for (let r = 36; r <= 41; r += 2)
    for (let c = 6; c <= 14; c += 2) tile(g, r, c, 2);
  carve(g, 37, 7, 40, 13); // center aisle

  // ── SERVER POD B (rows 34-43, cols 43-55) ──
  room(g, 34, 43, 43, 55, 2);
  door(g, 43, 50);
  carve(g, 44, 45, 44, 51); // reach the main hall at col 44
  for (let r = 36; r <= 41; r += 2)
    for (let c = 45; c <= 53; c += 2) tile(g, r, c, 2);
  carve(g, 37, 46, 40, 52);

  // ── CENTRAL DATA SPINE (rows 20-43, cols 27-32) ──
  carve(g, 20, 27, 43, 32);

  // ── CROSS CORRIDOR (rows 32-33, cols 17-42) ──
  carve(g, 32, 17, 33, 42);

  // ── MAINFRAME CHAMBER (rows 20-31, cols 20-39) — classified files ──
  carve(g, 20, 20, 31, 39);
  hWall(g, 20, 20, 39, 2);
  hWall(g, 31, 20, 39, 2);
  vWall(g, 20, 31, 20, 2);
  vWall(g, 20, 31, 39, 2);
  door(g, 31, 29);
  door(g, 31, 30);
  door(g, 20, 29);
  door(g, 20, 30);
  carve(g, 21, 21, 30, 38);
  // Mainframe pillars (off central spine)
  tile(g, 23, 24, 2);
  tile(g, 23, 35, 2);
  tile(g, 28, 24, 2);
  tile(g, 28, 35, 2);
  tile(g, 25, 24, 2);
  tile(g, 25, 35, 2);

  // ── NORTH CORRIDOR (rows 13-19, cols 5-54) ──
  carve(g, 13, 5, 19, 54);

  // ── NW ARCHIVE (rows 4-11, cols 3-16) ──
  room(g, 4, 3, 11, 16, 2);
  door(g, 11, 9);
  carve(g, 12, 8, 12, 10);
  tile(g, 6, 6, 2);
  tile(g, 6, 13, 2);
  tile(g, 9, 6, 2);
  tile(g, 9, 13, 2);

  // ── NE ARCHIVE (rows 4-11, cols 43-56) — Voss dossier locked ──
  room(g, 4, 43, 11, 56, 2);
  door(g, 11, 50);
  carve(g, 12, 49, 12, 51);
  tile(g, 6, 46, 2);
  tile(g, 6, 53, 2);
  tile(g, 9, 46, 2);
  tile(g, 9, 53, 2);

  // ── EXIT CHAMBER (rows 4-11, cols 18-41) ──
  carve(g, 4, 18, 11, 41);
  tile(g, 7, 22, 2);
  tile(g, 7, 37, 2);
  door(g, 12, 29);
  door(g, 12, 30);

  // ── SECRETS ──
  carve(g, 26, 1, 28, 2);
  g[27][3] = 6; // W sub-archive
  carve(g, 26, 57, 28, 58);
  g[27][56] = 6; // E recovered audio log
  // No room was ever built beside either secret, so neither could be reached.
  // Run a corridor out of the mainframe chamber's side walls to each one; a
  // dead end is the cue that the wall at the end is worth checking.
  door(g, 27, 20);
  carve(g, 27, 4, 27, 19);
  door(g, 27, 39);
  carve(g, 27, 40, 27, 55);

  return {
    name: "Server Farm",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // Main hall drones
      { x: 21.5, y: 47.5, type: "enemy", enemyType: "drone" }, // beside the pillar, not on it
      { x: 38.5, y: 47.5, type: "enemy", enemyType: "drone" },
      { x: 29.5, y: 49.5, type: "enemy", enemyType: "henchman" },
      // Server pod A
      { x: 7.5, y: 37.5, type: "enemy", enemyType: "drone" },
      { x: 13.5, y: 40.5, type: "enemy", enemyType: "glitchling" },
      { x: 9.5, y: 42.5, type: "enemy", enemyType: "phantom" },
      // Server pod B
      { x: 52.5, y: 37.5, type: "enemy", enemyType: "drone" },
      { x: 46.5, y: 40.5, type: "enemy", enemyType: "glitchling" },
      { x: 50.5, y: 42.5, type: "enemy", enemyType: "phantom" },
      // Spine & cross corridor
      { x: 29.5, y: 38.5, type: "enemy", enemyType: "drone" },
      { x: 20.5, y: 32.5, type: "enemy", enemyType: "corruptCop" },
      { x: 39.5, y: 32.5, type: "enemy", enemyType: "corruptCop" },
      // Mainframe chamber
      { x: 25.5, y: 25.5, type: "enemy", enemyType: "sentinel" },
      { x: 34.5, y: 25.5, type: "enemy", enemyType: "sentinel" },
      { x: 29.5, y: 28.5, type: "enemy", enemyType: "chronoBomber" },
      // North corridor
      { x: 10.5, y: 16.5, type: "enemy", enemyType: "phantom" },
      { x: 49.5, y: 16.5, type: "enemy", enemyType: "phantom" },
      // NW archive
      { x: 9.5, y: 7.5, type: "enemy", enemyType: "henchman" },
      // NE archive (Voss dossier)
      { x: 50.5, y: 7.5, type: "enemy", enemyType: "sentinel" },
      { x: 50.5, y: 9.5, type: "enemy", enemyType: "henchman" },
      // ── Pickups ──
      { x: 20.5, y: 48.5, type: "health" },
      { x: 39.5, y: 48.5, type: "ammo" },
      { x: 9.5, y: 39.5, type: "ammo" },
      { x: 50.5, y: 39.5, type: "health" },
      { x: 29.5, y: 25.5, type: "health" },
      { x: 29.5, y: 15.5, type: "ammo" },
      { x: 29.5, y: 7.5, type: "weapon", weaponId: 4 }, // Experimental Rail
      { x: 9.5, y: 7.5, type: "ammo" },
      { x: 50.5, y: 7.5, type: "weapon", weaponId: 2 },
      { x: 1.5, y: 27.5, type: "health" },
      { x: 58.5, y: 27.5, type: "ammo" },
    ],
    exit: { x: 29.5, y: 4.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 27,
        description:
          "ARIA: 'Dr. Elias Voss — lead temporal physicist. Clearance Omega. Status: DECEASED.'",
      },
      {
        wallX: 56,
        wallY: 27,
        description:
          "Voss audio log: 'The suit works. Subject merges with the temporal field. We can't control the paradox feedback.'",
      },
    ],
    props: [
      { x: 29, y: 49, type: "monitor_bank" },
      { x: 30, y: 49, type: "monitor_bank" },
      { x: 8, y: 38, type: "monitor_bank" },
      { x: 13, y: 38, type: "monitor_bank" },
      { x: 46, y: 38, type: "monitor_bank" },
      { x: 52, y: 38, type: "monitor_bank" },
      { x: 25, y: 23, type: "monitor_bank" },
      { x: 34, y: 23, type: "monitor_bank" },
      { x: 29, y: 26, type: "monitor_bank" },
      { x: 30, y: 26, type: "monitor_bank" },
      { x: 7, y: 8, type: "crate" },
      { x: 13, y: 8, type: "crate" },
      { x: 47, y: 8, type: "weapon_rack" },
      { x: 53, y: 8, type: "weapon_rack" },
    ],
  };
}

// ── LEVEL 6: Reactor Access ──────────────────────────────────────
// Energy (4) walls. Beasts lurking. Signs of experiment gone wrong.
// ARIA: "Energy readings are off the scale. Something is wrong here."
// ──────────────────────────────────────────────────────────────────
function buildReactor() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 4);

  // ── ENTRY (south) ──
  carve(g, 53, 26, 57, 33);
  door(g, 52, 29);
  door(g, 52, 30);

  // ── OUTER RING CORRIDOR (rows 44-52) ──
  carve(g, 44, 5, 52, 54);
  // Energy conduit pillars
  tile(g, 47, 12, 4);
  tile(g, 47, 22, 4);
  tile(g, 47, 37, 4);
  tile(g, 47, 47, 4);
  tile(g, 50, 12, 4);
  tile(g, 50, 22, 4);
  tile(g, 50, 37, 4);
  tile(g, 50, 47, 4);

  // ── WEST CONDUIT TUNNEL (rows 20-43, cols 4-12) ──
  carve(g, 20, 4, 43, 12);
  hWall(g, 32, 4, 12, 4);
  carve(g, 32, 7, 32, 9); // divider with gap
  tile(g, 25, 8, 4);
  tile(g, 39, 8, 4);

  // ── EAST CONDUIT TUNNEL (rows 20-43, cols 47-55) ──
  carve(g, 20, 47, 43, 55);
  hWall(g, 32, 47, 55, 4);
  carve(g, 32, 50, 32, 52);
  tile(g, 25, 51, 4);
  tile(g, 39, 51, 4);

  // ── CENTRAL REACTOR CHAMBER (rows 20-43, cols 22-37) ──
  carve(g, 20, 22, 43, 37);
  // Inner reactor core (energy walls)
  hWall(g, 27, 27, 32, 4);
  hWall(g, 36, 27, 32, 4);
  vWall(g, 27, 36, 27, 4);
  vWall(g, 27, 36, 32, 4);
  carve(g, 28, 28, 35, 31);
  // Core pillars
  tile(g, 29, 29, 4);
  tile(g, 29, 30, 4);
  tile(g, 34, 29, 4);
  tile(g, 34, 30, 4);
  // Entry gaps in core walls
  carve(g, 27, 29, 27, 30);
  carve(g, 36, 29, 36, 30);

  // ── CONNECTING CORRIDORS ──
  carve(g, 43, 13, 43, 21); // W conduit → central (south)
  carve(g, 43, 38, 43, 46); // E conduit → central
  carve(g, 20, 13, 20, 21);
  carve(g, 20, 38, 20, 46);

  // ── SPINE TO REACTOR (rows 44-52 already carved; add doors to central) ──
  door(g, 43, 29);
  door(g, 43, 30);

  // ── NORTH APPROACH (rows 13-19, cols 5-54) ──
  carve(g, 13, 5, 19, 54);

  // ── NORTH CONTROL ROOM (rows 4-11, cols 18-41) — shutdown terminal ──
  carve(g, 4, 18, 11, 41);
  // Glass windows south
  hWall(g, 12, 18, 28, 8);
  hWall(g, 12, 31, 41, 8);
  door(g, 12, 29);
  door(g, 12, 30);
  tile(g, 7, 22, 4);
  tile(g, 7, 37, 4);
  tile(g, 9, 24, 4);
  tile(g, 9, 35, 4);

  // ── NW STORAGE (rows 4-11, cols 3-16) ──
  room(g, 4, 3, 11, 16, 4);
  door(g, 11, 8);
  carve(g, 12, 7, 12, 9);
  tile(g, 7, 6, 4);
  tile(g, 7, 13, 4);

  // ── NE STORAGE (rows 4-11, cols 43-56) ──
  room(g, 4, 43, 11, 56, 4);
  door(g, 11, 50);
  carve(g, 12, 49, 12, 51);
  tile(g, 7, 46, 4);
  tile(g, 7, 53, 4);

  // ── SECRETS ──
  carve(g, 26, 1, 28, 2);
  g[27][3] = 6; // Voss lab coat
  carve(g, 26, 57, 28, 58);
  g[27][56] = 6; // Shutdown terminal log

  return {
    name: "Reactor Access",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // Outer ring — chrono bombers near conduits
      { x: 13.5, y: 47.5, type: "enemy", enemyType: "chronoBomber" }, // beside the pillar, not on it
      { x: 46.5, y: 47.5, type: "enemy", enemyType: "chronoBomber" },
      { x: 22.5, y: 48.5, type: "enemy", enemyType: "drone" },
      { x: 37.5, y: 48.5, type: "enemy", enemyType: "drone" },
      // West conduit — beasts
      { x: 8.5, y: 28.5, type: "enemy", enemyType: "beast" },
      { x: 8.5, y: 38.5, type: "enemy", enemyType: "glitchling" },
      // East conduit — beasts
      { x: 51.5, y: 28.5, type: "enemy", enemyType: "beast" },
      { x: 51.5, y: 38.5, type: "enemy", enemyType: "glitchling" },
      // Central reactor chamber
      { x: 25.5, y: 40.5, type: "enemy", enemyType: "sentinel" },
      { x: 34.5, y: 40.5, type: "enemy", enemyType: "sentinel" },
      { x: 25.5, y: 22.5, type: "enemy", enemyType: "phantom" },
      { x: 34.5, y: 22.5, type: "enemy", enemyType: "phantom" },
      // Reactor core — elite
      { x: 29.5, y: 31.5, type: "enemy", enemyType: "beast" },
      // North approach
      { x: 10.5, y: 16.5, type: "enemy", enemyType: "henchman" },
      { x: 49.5, y: 16.5, type: "enemy", enemyType: "henchman" },
      { x: 29.5, y: 15.5, type: "enemy", enemyType: "chronoBomber" },
      // Control room
      { x: 22.5, y: 8.5, type: "enemy", enemyType: "sentinel" }, // guard in front of the pillar
      { x: 37.5, y: 8.5, type: "enemy", enemyType: "sentinel" },
      { x: 29.5, y: 5.5, type: "enemy", enemyType: "phantom" },
      // ── Pickups ──
      { x: 29.5, y: 48.5, type: "health" },
      { x: 8.5, y: 48.5, type: "ammo" },
      { x: 51.5, y: 48.5, type: "health" },
      { x: 29.5, y: 32.5, type: "health" }, // in reactor core
      { x: 29.5, y: 25.5, type: "ammo" },
      { x: 29.5, y: 7.5, type: "weapon", weaponId: 7 }, // EMP Launcher
      { x: 7.5, y: 7.5, type: "ammo" },
      { x: 52.5, y: 7.5, type: "health" },
      // Secrets
      { x: 1.5, y: 27.5, type: "ammo" },
      { x: 58.5, y: 27.5, type: "health" },
    ],
    exit: { x: 29.5, y: 4.5 },
    secrets: [
      {
        wallX: 3,
        wallY: 27,
        description:
          "Scorched lab coat: 'Dr. E. Voss — Temporal Division.' Burn marks from temporal discharge.",
      },
      {
        wallX: 56,
        wallY: 27,
        description:
          "Shutdown terminal log: 'Reactor breach. Voss has merged with the field. God help us.'",
      },
    ],
    props: [
      { x: 29, y: 48, type: "crate" },
      { x: 30, y: 48, type: "crate" },
      { x: 29, y: 31, type: "monitor_bank" },
      { x: 29, y: 7, type: "monitor_bank" },
      { x: 30, y: 7, type: "monitor_bank" },
      { x: 24, y: 8, type: "chair" },
      { x: 35, y: 8, type: "chair" },
      { x: 7, y: 8, type: "ammo_crate" },
      { x: 13, y: 8, type: "ammo_crate" },
      { x: 47, y: 8, type: "ammo_crate" },
      { x: 53, y: 8, type: "ammo_crate" },
      { x: 22, y: 41, type: "crate" },
      { x: 37, y: 41, type: "crate" },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════
// Levels 7-9: Voss' Lab, Temporal Nexus, Paradox Core (boss)
// Narrative focus: Voss IS Paradox Lord reveal → final boss
// ═══════════════════════════════════════════════════════════════════

// ── LEVEL 7: Dr. Voss' Laboratory ────────────────────────────────
// Tech (2) walls + glass (8) observation + rift (9) anomalies.
// Full reveal: Voss IS the Paradox Lord. Personal journals.
// ──────────────────────────────────────────────────────────────────
function buildVossLab() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 2);

  // ── ENTRY (SW corner — player arrives from teleport) ──
  carve(g, 53, 3, 57, 10);
  door(g, 52, 6);
  door(g, 52, 7);

  // ── SW CORRIDOR up to lab wings ──
  carve(g, 40, 5, 52, 11);

  // ── SW LAB WING (rows 34-44, cols 4-18) — prototype research ──
  room(g, 34, 4, 44, 18, 2);
  door(g, 40, 18);
  carve(g, 40, 19, 40, 23);
  door(g, 44, 6);
  door(g, 44, 7); // SW corridor pass-through
  // Experiment tables
  tile(g, 37, 7, 2);
  tile(g, 37, 11, 2);
  tile(g, 37, 15, 2);
  tile(g, 41, 7, 2);
  tile(g, 41, 11, 2);
  tile(g, 41, 15, 2);
  // Glass observation wall east
  hWall(g, 38, 17, 17, 8);

  // ── SE LAB WING (rows 34-44, cols 41-55) ──
  room(g, 34, 41, 44, 55, 2);
  door(g, 40, 41);
  carve(g, 40, 36, 40, 40);
  tile(g, 37, 44, 2);
  tile(g, 37, 48, 2);
  tile(g, 37, 52, 2);
  tile(g, 41, 44, 2);
  tile(g, 41, 48, 2);
  tile(g, 41, 52, 2);

  // ── CENTRAL RIFT CHAMBER (rows 24-43, cols 22-37) — temporal rifts ──
  carve(g, 24, 22, 43, 37);
  hWall(g, 24, 22, 37, 2);
  hWall(g, 43, 22, 37, 2);
  vWall(g, 24, 43, 22, 2);
  vWall(g, 24, 43, 37, 2);
  carve(g, 25, 23, 42, 36);
  door(g, 43, 29);
  door(g, 43, 30);
  door(g, 24, 29);
  door(g, 24, 30);
  door(g, 40, 37);
  door(g, 40, 22); // E/W to lab wings
  // Rift clusters (wall type 9 = temporal rift)
  tile(g, 29, 26, 9);
  tile(g, 29, 27, 9);
  tile(g, 29, 32, 9);
  tile(g, 29, 33, 9);
  tile(g, 38, 26, 9);
  tile(g, 38, 27, 9);
  tile(g, 38, 32, 9);
  tile(g, 38, 33, 9);
  // Center altar (the Paradox Engine prototype)
  tile(g, 33, 29, 4);
  tile(g, 33, 30, 4);
  tile(g, 34, 29, 4);
  tile(g, 34, 30, 4);

  // ── CROSS CORRIDOR (rows 32-33, cols 11-48) ──
  carve(g, 32, 11, 33, 21);
  carve(g, 32, 38, 33, 48);
  // The chamber's side walls (cols 22 and 37) cut the corridor into two sealed
  // segments; open it through them.
  door(g, 32, 22);
  door(g, 33, 22);
  door(g, 32, 37);
  door(g, 33, 37);

  // ── NW LAB (rows 18-30, cols 4-18) — Voss personal journals ──
  room(g, 18, 4, 30, 18, 2);
  door(g, 24, 18);
  carve(g, 24, 19, 24, 22);
  door(g, 25, 22); // stub ended on the chamber's corner; step down into it
  door(g, 18, 10); // connect to north approach
  tile(g, 21, 7, 2);
  tile(g, 21, 11, 2);
  tile(g, 21, 15, 2);
  tile(g, 27, 7, 2);
  tile(g, 27, 15, 2);

  // ── NE LAB (rows 18-30, cols 41-55) — suit prototype ──
  room(g, 18, 41, 30, 55, 2);
  door(g, 24, 41);
  carve(g, 24, 37, 24, 40);
  door(g, 25, 37);
  door(g, 18, 50); // connect to north approach
  tile(g, 21, 44, 2);
  tile(g, 21, 48, 2);
  tile(g, 21, 52, 2);
  tile(g, 27, 44, 2);
  tile(g, 27, 52, 2);

  // ── NORTH APPROACH (rows 12-17, cols 5-54) ──
  carve(g, 12, 5, 17, 54);
  // Link the rift chamber's north doors (row 24) up to the approach. Rows 18-23
  // were never carved, so the doors opened onto solid wall and the whole upper
  // half of the level — the study, both labs, both supply rooms — was sealed.
  carve(g, 18, 29, 23, 30);

  // ── VOSS' PRIVATE STUDY (rows 3-11, cols 20-39) ──
  carve(g, 3, 20, 11, 39);
  hWall(g, 3, 20, 39, 2);
  hWall(g, 11, 20, 39, 2);
  vWall(g, 3, 11, 20, 2);
  vWall(g, 3, 11, 39, 2);
  carve(g, 4, 21, 10, 38);
  door(g, 11, 29);
  door(g, 11, 30);
  // Desk + rift fragment
  tile(g, 5, 29, 2);
  tile(g, 5, 30, 2);
  tile(g, 8, 24, 9);
  tile(g, 8, 35, 9);

  // ── NW SUPPLY (rows 4-10, cols 3-16) ──
  room(g, 4, 3, 10, 16, 2);
  door(g, 10, 8);
  carve(g, 11, 7, 12, 9);

  // ── NE SUPPLY (rows 4-10, cols 43-56) ──
  room(g, 4, 43, 10, 56, 2);
  door(g, 10, 50);
  carve(g, 11, 49, 12, 51);

  // ── SECRETS ──
  // Both secrets sat one tile outside their room's wall, so no floor was ever
  // adjacent to them. Put each on the wall itself and extend its alcove to meet.
  carve(g, 21, 1, 23, 3);
  g[22][4] = 6; // Voss journal — on the NW lab's west wall
  carve(g, 33, 56, 35, 58);
  g[35][55] = 6; // Final entry — on the SE wing's east wall
  carve(g, 7, 57, 8, 58);
  g[7][56] = 6; // ARIA reveal

  // Exit through east side
  carve(g, 50, 50, 57, 56);
  door(g, 50, 53);
  // Connect SE lab wing → exit chamber
  carve(g, 44, 50, 52, 53);
  door(g, 44, 52);

  return {
    name: "Dr. Voss' Laboratory",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 6.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // SW lab wing
      { x: 8.5, y: 37.5, type: "enemy", enemyType: "henchman" },
      { x: 14.5, y: 41.5, type: "enemy", enemyType: "chronoBomber" },
      // SE lab wing
      { x: 51.5, y: 37.5, type: "enemy", enemyType: "henchman" },
      { x: 45.5, y: 41.5, type: "enemy", enemyType: "chronoBomber" },
      // Central rift chamber — TEMPORAL SUMMONER centerpiece
      // Summoner in front of the altar and phantoms beside the rift clusters —
      // all five were placed on the altar and rift tiles themselves.
      { x: 29.5, y: 35.5, type: "enemy", enemyType: "temporalSummoner" },
      { x: 25.5, y: 29.5, type: "enemy", enemyType: "phantom" },
      { x: 34.5, y: 29.5, type: "enemy", enemyType: "phantom" },
      { x: 25.5, y: 38.5, type: "enemy", enemyType: "phantom" },
      { x: 34.5, y: 38.5, type: "enemy", enemyType: "phantom" },
      // Cross corridor
      { x: 15.5, y: 32.5, type: "enemy", enemyType: "drone" },
      { x: 44.5, y: 32.5, type: "enemy", enemyType: "drone" },
      // NW lab — Voss journals
      { x: 10.5, y: 24.5, type: "enemy", enemyType: "sentinel" },
      { x: 14.5, y: 27.5, type: "enemy", enemyType: "henchman" },
      // NE lab — suit prototype
      { x: 48.5, y: 24.5, type: "enemy", enemyType: "sentinel" },
      { x: 45.5, y: 27.5, type: "enemy", enemyType: "henchman" }, // mirrors x 14.5 beside its table
      // North approach
      { x: 10.5, y: 15.5, type: "enemy", enemyType: "drone" },
      { x: 49.5, y: 15.5, type: "enemy", enemyType: "drone" },
      // Voss' private study
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "phantom" },
      { x: 34.5, y: 7.5, type: "enemy", enemyType: "phantom" },
      { x: 29.5, y: 6.5, type: "enemy", enemyType: "sentinel" }, // guarding the desk, not standing on it
      // ── Pickups ──
      { x: 11.5, y: 40.5, type: "health" },
      { x: 48.5, y: 40.5, type: "ammo" },
      { x: 29.5, y: 36.5, type: "health" },
      { x: 11.5, y: 24.5, type: "ammo" },
      { x: 48.5, y: 24.5, type: "weapon", weaponId: 6 }, // Ricochet Pistol
      { x: 29.5, y: 7.5, type: "weapon", weaponId: 2 },
      { x: 7.5, y: 7.5, type: "health" },
      { x: 51.5, y: 7.5, type: "ammo" },
      // Secrets
      { x: 1.5, y: 22.5, type: "ammo" },
      { x: 58.5, y: 34.5, type: "health" },
      { x: 58.5, y: 7.5, type: "health" },
    ],
    exit: { x: 55.5, y: 53.5 },
    secrets: [
      {
        wallX: 4,
        wallY: 22,
        description:
          "ARIA: 'Voss' journals. He built YOUR suit. Badge C-0017. You're wearing the prototype.'",
      },
      {
        wallX: 55,
        wallY: 35,
        description:
          "Voss final entry: 'The Paradox Engine responds to consciousness. I didn't break it. I became it.'",
      },
      {
        wallX: 56,
        wallY: 7,
        description:
          "ARIA: 'Temporal signature matches. The Paradox Lord. Voss didn't die. He became something else.'",
      },
    ],
    props: [
      { x: 7, y: 37, type: "monitor_bank" },
      { x: 15, y: 37, type: "monitor_bank" },
      { x: 44, y: 37, type: "monitor_bank" },
      { x: 52, y: 37, type: "monitor_bank" },
      { x: 29, y: 33, type: "monitor_bank" },
      { x: 30, y: 33, type: "monitor_bank" },
      { x: 11, y: 21, type: "desk" },
      { x: 48, y: 21, type: "desk" },
      { x: 25, y: 6, type: "chair" },
      { x: 34, y: 6, type: "chair" },
      { x: 29, y: 5, type: "monitor_bank" },
      { x: 30, y: 5, type: "monitor_bank" },
      { x: 7, y: 8, type: "crate" },
      { x: 52, y: 8, type: "crate" },
    ],
  };
}

// ── LEVEL 8: Temporal Nexus ──────────────────────────────────────
// Tech (2) + Energy (4) + Rift (9) mixed. Gauntlet before boss.
// Four approach corridors converge on a rift-locked inner sanctum.
// ──────────────────────────────────────────────────────────────────
function buildNexus() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 2);

  // ── ENTRY (south) ──
  carve(g, 53, 26, 57, 33);
  door(g, 52, 29);
  door(g, 52, 30);

  // ── OUTER RING (rows 44-52, cols 5-54) ──
  carve(g, 44, 5, 52, 54);
  // Energy pillars
  tile(g, 47, 12, 4);
  tile(g, 47, 22, 4);
  tile(g, 47, 37, 4);
  tile(g, 47, 47, 4);
  tile(g, 50, 12, 4);
  tile(g, 50, 22, 4);
  tile(g, 50, 37, 4);
  tile(g, 50, 47, 4);

  // ── FOUR APPROACH CORRIDORS ──
  carve(g, 20, 7, 43, 13); // SW
  carve(g, 20, 46, 43, 52); // SE
  carve(g, 32, 14, 33, 45); // mid east-west

  // ── INNER SANCTUM (rows 20-31, cols 20-39) — rift-walled ──
  carve(g, 20, 20, 31, 39);
  // Rift wall surround
  hWall(g, 20, 20, 39, 9);
  hWall(g, 31, 20, 39, 9);
  vWall(g, 20, 31, 20, 9);
  vWall(g, 20, 31, 39, 9);
  carve(g, 21, 21, 30, 38);
  // Rift gates
  door(g, 31, 29);
  door(g, 31, 30);
  door(g, 20, 29);
  door(g, 20, 30);
  door(g, 25, 20);
  door(g, 26, 20);
  door(g, 25, 39);
  door(g, 26, 39);
  // Inner energy pillars
  tile(g, 23, 24, 4);
  tile(g, 23, 35, 4);
  tile(g, 28, 24, 4);
  tile(g, 28, 35, 4);

  // ── NORTH APPROACH (rows 13-19, cols 5-54) ──
  carve(g, 13, 5, 19, 54);

  // ── NORTH CHAMBER (rows 4-11, cols 18-41) — pre-boss airlock ──
  carve(g, 4, 18, 11, 41);
  tile(g, 7, 22, 2);
  tile(g, 7, 37, 2);
  tile(g, 9, 24, 9);
  tile(g, 9, 35, 9);
  door(g, 12, 29);
  door(g, 12, 30);

  // ── NW STORAGE (rows 4-11, cols 3-16) ──
  room(g, 4, 3, 11, 16, 2);
  door(g, 11, 8);
  carve(g, 12, 7, 12, 9);

  // ── NE STORAGE (rows 4-11, cols 43-56) ──
  room(g, 4, 43, 11, 56, 2);
  door(g, 11, 50);
  carve(g, 12, 49, 12, 51);

  // Sub-rooms off east ring (rows 36-43, cols 47-55)
  room(g, 36, 47, 43, 55, 4);
  door(g, 43, 51);
  // Sub-rooms off west ring (rows 36-43, cols 5-13)
  room(g, 36, 5, 43, 13, 4);
  door(g, 43, 9);

  return {
    name: "Temporal Nexus",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // Outer ring
      { x: 22.5, y: 48.5, type: "enemy", enemyType: "phantom" },
      { x: 37.5, y: 48.5, type: "enemy", enemyType: "phantom" },
      { x: 10.5, y: 48.5, type: "enemy", enemyType: "beast" },
      { x: 49.5, y: 48.5, type: "enemy", enemyType: "beast" },
      // Side sub-rooms
      { x: 9.5, y: 40.5, type: "enemy", enemyType: "corruptCop" },
      { x: 51.5, y: 40.5, type: "enemy", enemyType: "sentinel" },
      // Approach corridors
      { x: 10.5, y: 35.5, type: "enemy", enemyType: "glitchling" },
      { x: 49.5, y: 35.5, type: "enemy", enemyType: "glitchling" },
      { x: 10.5, y: 25.5, type: "enemy", enemyType: "beast" },
      { x: 49.5, y: 25.5, type: "enemy", enemyType: "beast" },
      // Mid cross corridor
      { x: 17.5, y: 32.5, type: "enemy", enemyType: "phantom" },
      { x: 42.5, y: 32.5, type: "enemy", enemyType: "phantom" },
      // Inner sanctum
      { x: 25.5, y: 25.5, type: "enemy", enemyType: "sentinel" },
      { x: 34.5, y: 25.5, type: "enemy", enemyType: "sentinel" },
      { x: 29.5, y: 27.5, type: "enemy", enemyType: "phantom" },
      // North approach
      { x: 10.5, y: 16.5, type: "enemy", enemyType: "corruptCop" },
      { x: 49.5, y: 16.5, type: "enemy", enemyType: "corruptCop" },
      { x: 29.5, y: 15.5, type: "enemy", enemyType: "chronoBomber" },
      // North chamber
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "beast" },
      { x: 34.5, y: 7.5, type: "enemy", enemyType: "beast" },
      // ── Pickups ──
      { x: 29.5, y: 48.5, type: "health" },
      { x: 29.5, y: 25.5, type: "health" },
      { x: 29.5, y: 22.5, type: "ammo" },
      { x: 9.5, y: 40.5, type: "ammo" },
      { x: 51.5, y: 40.5, type: "health" },
      { x: 29.5, y: 7.5, type: "weapon", weaponId: 2 },
      { x: 7.5, y: 7.5, type: "ammo" },
      { x: 52.5, y: 7.5, type: "health" },
    ],
    exit: { x: 29.5, y: 4.5 },
    secrets: [],
    props: [
      { x: 29, y: 48, type: "crate" },
      { x: 30, y: 48, type: "crate" },
      { x: 25, y: 24, type: "monitor_bank" },
      { x: 34, y: 24, type: "monitor_bank" },
      { x: 29, y: 7, type: "monitor_bank" },
      { x: 30, y: 7, type: "monitor_bank" },
      { x: 9, y: 40, type: "ammo_crate" },
      { x: 51, y: 40, type: "weapon_rack" },
      { x: 7, y: 8, type: "crate" },
      { x: 52, y: 8, type: "crate" },
    ],
  };
}

// ── LEVEL 9: The Paradox Core ────────────────────────────────────
// Boss (7) walls. Wide arena so the multi-form boss has room to move.
// Concentric rings of rift + energy barriers player breaks through.
// ──────────────────────────────────────────────────────────────────
function buildParadoxCore() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, 7);

  // ── ENTRY CORRIDOR (south) ──
  carve(g, 53, 26, 57, 33);
  door(g, 52, 29);
  door(g, 52, 30);

  // ── ANTECHAMBER (rows 44-52, cols 5-54) ──
  carve(g, 44, 5, 52, 54);
  // Boss-wall pillars
  tile(g, 47, 12, 7);
  tile(g, 47, 47, 7);
  tile(g, 50, 12, 7);
  tile(g, 50, 47, 7);

  // ── OUTER RING (rows 34-43, cols 6-53) ──
  carve(g, 34, 6, 43, 53);
  // Connect antechamber → outer ring
  door(g, 43, 29);
  door(g, 43, 30);

  // ── MID RING BARRIER (rift) (rows 32-33) ──
  hWall(g, 33, 12, 47, 9);
  carve(g, 33, 29, 33, 30); // center gap

  // ── BOSS ARENA (rows 13-32, cols 10-49) ──
  carve(g, 13, 10, 32, 49);
  // Arena walls
  hWall(g, 13, 10, 49, 7);
  hWall(g, 32, 10, 49, 7);
  vWall(g, 13, 32, 10, 7);
  vWall(g, 13, 32, 49, 7);
  carve(g, 14, 11, 31, 48);
  // Arena entry gates
  carve(g, 32, 29, 32, 30);
  // Cover pillars (boss needs LOS breaks but 4 corridors for escape)
  tile(g, 18, 16, 7);
  tile(g, 18, 43, 7);
  tile(g, 27, 16, 7);
  tile(g, 27, 43, 7);
  tile(g, 22, 22, 9);
  tile(g, 22, 37, 9);
  tile(g, 23, 22, 9);
  tile(g, 23, 37, 9);
  // Center pedestal (rift)
  tile(g, 22, 29, 9);
  tile(g, 22, 30, 9);
  tile(g, 23, 29, 9);
  tile(g, 23, 30, 9);

  // ── NORTH OBSERVATION (rows 4-12, cols 20-39) — escape route ──
  carve(g, 4, 20, 12, 39);
  door(g, 13, 29);
  door(g, 13, 30);
  tile(g, 7, 24, 7);
  tile(g, 7, 35, 7);

  // ── EAST FLANK CORRIDOR (cols 50-56, rows 15-43) ──
  carve(g, 15, 50, 43, 56);
  door(g, 30, 49);
  door(g, 31, 49);

  // ── WEST FLANK CORRIDOR (cols 3-9, rows 15-43) ──
  carve(g, 15, 3, 43, 9);
  door(g, 30, 10);
  door(g, 31, 10);

  return {
    name: "The Paradox Core",
    width: W,
    height: H,
    grid: g,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    entities: [
      // THE BOSS — in front of the rift pedestal, facing the arena entrance.
      // It was placed on the 2x2 pedestal tiles themselves.
      { x: 29.5, y: 24.5, type: "enemy", enemyType: "boss" },
      // Antechamber guards
      { x: 15.5, y: 48.5, type: "enemy", enemyType: "drone" },
      { x: 43.5, y: 48.5, type: "enemy", enemyType: "drone" },
      { x: 29.5, y: 47.5, type: "enemy", enemyType: "sentinel" },
      // Outer ring
      { x: 12.5, y: 38.5, type: "enemy", enemyType: "beast" },
      { x: 46.5, y: 38.5, type: "enemy", enemyType: "beast" },
      { x: 22.5, y: 38.5, type: "enemy", enemyType: "corruptCop" },
      { x: 36.5, y: 38.5, type: "enemy", enemyType: "corruptCop" },
      // Flanks
      { x: 6.5, y: 25.5, type: "enemy", enemyType: "phantom" },
      { x: 53.5, y: 25.5, type: "enemy", enemyType: "phantom" },
      { x: 6.5, y: 38.5, type: "enemy", enemyType: "glitchling" },
      { x: 53.5, y: 38.5, type: "enemy", enemyType: "glitchling" },
      // Arena support (spawns around boss)
      { x: 17.5, y: 18.5, type: "enemy", enemyType: "phantom" }, // mirrors x 42.5 beside the col 43 pillar
      { x: 42.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      { x: 17.5, y: 27.5, type: "enemy", enemyType: "sentinel" },
      { x: 42.5, y: 27.5, type: "enemy", enemyType: "sentinel" },
      // North observation
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "beast" },
      { x: 33.5, y: 7.5, type: "enemy", enemyType: "beast" },
      // ── Pickups ──
      { x: 29.5, y: 48.5, type: "health" },
      { x: 10.5, y: 48.5, type: "ammo" },
      { x: 49.5, y: 48.5, type: "ammo" },
      { x: 14.5, y: 38.5, type: "health" },
      { x: 44.5, y: 38.5, type: "health" },
      { x: 6.5, y: 29.5, type: "ammo" },
      { x: 53.5, y: 29.5, type: "ammo" },
      { x: 14.5, y: 15.5, type: "health" },
      { x: 44.5, y: 15.5, type: "health" },
      { x: 29.5, y: 6.5, type: "weapon", weaponId: 3 },
      { x: 25.5, y: 5.5, type: "ammo" },
      { x: 33.5, y: 5.5, type: "ammo" },
    ],
    exit: null, // Boss level
    isBossLevel: true,
    secrets: [],
    props: [
      { x: 29, y: 48, type: "crate" },
      { x: 30, y: 48, type: "crate" },
      { x: 10, y: 48, type: "ammo_crate" },
      { x: 49, y: 48, type: "ammo_crate" },
      { x: 29, y: 6, type: "weapon_rack" },
    ],
  };
}

/** Every station map, built once, keyed by the id levels name it by. */
export const STATION_MAPS = {
  entry: buildEntry(),
  checkpoint: buildCheckpoint(),
  research: buildResearchWing(),
  containment: buildContainment(),
  server_farm: buildServerFarm(),
  reactor: buildReactor(),
  voss_lab: buildVossLab(),
  nexus: buildNexus(),
  core: buildParadoxCore(),
};
