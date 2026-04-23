// ═══════════════════════════════════════════════════════════════════
// ACT 3 MAPS — Programmatic 60×60 Campaign Levels
// Levels 7-9: Voss' Lab, Temporal Nexus, Paradox Core (boss)
// Narrative focus: Voss IS Paradox Lord reveal → final boss
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

  // ── NW LAB (rows 18-30, cols 4-18) — Voss personal journals ──
  room(g, 18, 4, 30, 18, 2);
  door(g, 24, 18);
  carve(g, 24, 19, 24, 22);
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
  door(g, 18, 50); // connect to north approach
  tile(g, 21, 44, 2);
  tile(g, 21, 48, 2);
  tile(g, 21, 52, 2);
  tile(g, 27, 44, 2);
  tile(g, 27, 52, 2);

  // ── NORTH APPROACH (rows 12-17, cols 5-54) ──
  carve(g, 12, 5, 17, 54);

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
  carve(g, 21, 1, 23, 2);
  g[22][3] = 6; // Voss journal
  carve(g, 33, 57, 35, 58);
  g[34][56] = 6; // Final entry
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
      { x: 7.5, y: 37.5, type: "enemy", enemyType: "henchman" },
      { x: 14.5, y: 41.5, type: "enemy", enemyType: "chronoBomber" },
      // SE lab wing
      { x: 52.5, y: 37.5, type: "enemy", enemyType: "henchman" },
      { x: 45.5, y: 41.5, type: "enemy", enemyType: "chronoBomber" },
      // Central rift chamber — TEMPORAL SUMMONER centerpiece
      { x: 29.5, y: 33.5, type: "enemy", enemyType: "temporalSummoner" },
      { x: 26.5, y: 29.5, type: "enemy", enemyType: "phantom" },
      { x: 33.5, y: 29.5, type: "enemy", enemyType: "phantom" },
      { x: 26.5, y: 38.5, type: "enemy", enemyType: "phantom" },
      { x: 33.5, y: 38.5, type: "enemy", enemyType: "phantom" },
      // Cross corridor
      { x: 15.5, y: 32.5, type: "enemy", enemyType: "drone" },
      { x: 44.5, y: 32.5, type: "enemy", enemyType: "drone" },
      // NW lab — Voss journals
      { x: 10.5, y: 24.5, type: "enemy", enemyType: "sentinel" },
      { x: 14.5, y: 27.5, type: "enemy", enemyType: "henchman" },
      // NE lab — suit prototype
      { x: 48.5, y: 24.5, type: "enemy", enemyType: "sentinel" },
      { x: 44.5, y: 27.5, type: "enemy", enemyType: "henchman" },
      // North approach
      { x: 10.5, y: 15.5, type: "enemy", enemyType: "drone" },
      { x: 49.5, y: 15.5, type: "enemy", enemyType: "drone" },
      // Voss' private study
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "phantom" },
      { x: 34.5, y: 7.5, type: "enemy", enemyType: "phantom" },
      { x: 29.5, y: 5.5, type: "enemy", enemyType: "sentinel" },
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
        wallX: 3,
        wallY: 22,
        description:
          "ARIA: 'Voss' journals. He built YOUR suit. Badge C-0017. You're wearing the prototype.'",
      },
      {
        wallX: 56,
        wallY: 34,
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
    exit: { x: 29.5, y: 3.5 },
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
      // THE BOSS — center
      { x: 29.5, y: 22.5, type: "enemy", enemyType: "boss" },
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
      { x: 16.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      { x: 42.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      { x: 16.5, y: 27.5, type: "enemy", enemyType: "sentinel" },
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

export const ACT3_LEVELS = [buildVossLab(), buildNexus(), buildParadoxCore()];
