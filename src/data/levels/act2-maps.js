// ═══════════════════════════════════════════════════════════════════
// ACT 2 MAPS — Programmatic 60×60 Campaign Levels
// Levels 4-6: Containment Block, Server Farm, Reactor Access
// Narrative focus: Voss breadcrumb reveal → "three steps ahead"
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
      // Sub-boss arena (shield commander approach)
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "sentinel" },
      { x: 34.5, y: 7.5, type: "enemy", enemyType: "sentinel" },
      { x: 29.5, y: 5.5, type: "enemy", enemyType: "phantom" },
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

export const ACT2_LEVELS = [
  buildContainment(),
  buildServerFarm(),
  buildReactor(),
];
