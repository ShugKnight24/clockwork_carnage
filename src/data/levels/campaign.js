// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

// Entity types for map placement
// E = enemy spawn, P = player start, H = health, A = ammo, W = weapon pickup
// K = key, S = secret trigger, D = door trigger, B = boss, X = exit

// TODO: Add more campaign levels with different themes, layouts, and enemy types
// TODO: Possibly extract per level
export const CAMPAIGN_LEVELS = [
  {
    name: "Chronos Station - Entry",
    width: 32,
    height: 32,
    grid: [
      [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 2, 2, 0,
        0, 0, 2, 2, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 0, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 5, 1, 1, 0, 0, 1, 1, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 0, 2, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 5, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 0, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 2, 2, 0,
        0, 0, 2, 2, 2, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 1, 6, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1,
        1, 5, 1, 1, 1, 1, 1, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 5, 3, 3, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0,
        0, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 6, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3,
        3, 3, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
      ],
      [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1,
      ],
    ],
    playerStart: { x: 2.5, y: 2.5, dir: 0 },
    entities: [
      { x: 10.5, y: 3.5, type: "enemy", enemyType: "drone" },
      { x: 14.5, y: 3.5, type: "enemy", enemyType: "glitchling" },
      { x: 5.5, y: 10.5, type: "enemy", enemyType: "corruptCop" },
      { x: 10.5, y: 9.5, type: "enemy", enemyType: "drone" },
      { x: 22.5, y: 6.5, type: "enemy", enemyType: "sentinel" },
      { x: 25.5, y: 2.5, type: "enemy", enemyType: "phantom" },
      { x: 14.5, y: 16.5, type: "enemy", enemyType: "glitchling" },
      { x: 23.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      { x: 5.5, y: 20.5, type: "enemy", enemyType: "beast" },
      { x: 28.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      { x: 20.5, y: 21.5, type: "enemy", enemyType: "drone" },
      { x: 5.5, y: 29.5, type: "enemy", enemyType: "phantom" },
      { x: 15.5, y: 29.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 2.5, y: 15.5, type: "health" },
      { x: 10.5, y: 7.5, type: "ammo" },
      { x: 22.5, y: 10.5, type: "health" },
      { x: 27.5, y: 6.5, type: "ammo" },
      { x: 14.5, y: 14.5, type: "ammo" },
      { x: 23.5, y: 22.5, type: "health" },
      { x: 10.5, y: 29.5, type: "ammo" },
      // Weapon pickup
      { x: 14.5, y: 8.5, type: "weapon", weaponId: 1 },
      // Secrets
      { x: 2.5, y: 25.5, type: "health" }, // in secret room
      { x: 2.5, y: 24.5, type: "ammo" },
    ],
    exit: { x: 29.5, y: 29.5 },
    secrets: [
      { wallX: 6, wallY: 13, description: "Hidden supply cache" },
      { wallX: 5, wallY: 23, description: "Secret armory" },
    ],
  },
  // ── Level 2: Security Checkpoint ──────────────────────────────────
  // Tighter corridors, first encounter with Corrupt SWAT officers.
  // ARIA: "Security wing. These officers were supposed to protect the station."
  {
    name: "Security Checkpoint",
    width: 24,
    height: 24,
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 5, 1, 1, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 5, 1, 1, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 1, 1, 5, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    playerStart: { x: 2.5, y: 2.5, dir: Math.PI / 2 },
    entities: [
      { x: 11.5, y: 2.5, type: "enemy", enemyType: "corruptCop" },
      { x: 15.5, y: 3.5, type: "enemy", enemyType: "corruptCop" },
      { x: 3.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 20.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 11.5, y: 11.5, type: "enemy", enemyType: "corruptCop" },
      { x: 12.5, y: 12.5, type: "enemy", enemyType: "corruptCop" },
      { x: 6.5, y: 14.5, type: "enemy", enemyType: "glitchling" },
      { x: 17.5, y: 14.5, type: "enemy", enemyType: "glitchling" },
      { x: 11.5, y: 17.5, type: "enemy", enemyType: "corruptCop" },
      { x: 3.5, y: 20.5, type: "enemy", enemyType: "drone" },
      { x: 20.5, y: 20.5, type: "enemy", enemyType: "drone" },
      { x: 12.5, y: 7.5, type: "health" },
      { x: 11.5, y: 21.5, type: "ammo" },
      { x: 20.5, y: 2.5, type: "health" },
      { x: 2.5, y: 16.5, type: "ammo" },
      { x: 20.5, y: 16.5, type: "weapon", weaponId: 1 },
    ],
    exit: { x: 21.5, y: 21.5 },
    secrets: [{ wallX: 11, wallY: 10, description: "Security locker" }],
  },
  // ── Level 3: Research Wing ────────────────────────────────────────
  // Glass walls, open labs. Phantoms phase through. ARIA finds early files.
  // ARIA: "Research wing. Whatever they were studying here... it didn't end well."
  {
    name: "Research Wing",
    width: 28,
    height: 24,
    grid: [
      // row 0 — outer border
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
      // row 1 — upper lab corridor (glass dividers, open centre) — exit at x=25
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 2
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 3
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 4 — upper lab doorways; energy accent pillars at x=0→inner corner x=6 junction
      [
        2, 8, 8, 8, 5, 8, 4, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 4, 8, 5, 8, 8, 2, 0,
        0, 0, 0, 2,
      ],
      // row 5 — open lab floor; energy node stub at x=10 to mark secret wall
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      // row 6
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      // row 7 — side alcove; energy corner accents on pillar bases
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8,
        5, 8, 8, 2,
      ],
      // row 8 — alcove pillars replaced with energy walls for atmosphere
      [
        2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 9 — energy pillar continuation
      [
        2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 10 — lab section separator; energy accents replace two tech walls
      [
        4, 2, 2, 5, 2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 2, 2, 5, 2, 2, 0,
        0, 0, 0, 2,
      ],
      // row 11 — central corridor (fully open)
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 12 — central corridor
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 13 — lower section separator; matching energy accents
      [
        4, 2, 2, 5, 2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 2, 2, 5, 2, 2, 0,
        0, 0, 0, 2,
      ],
      // row 14 — energy pillar
      [
        2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 15 — energy pillar continuation
      [
        2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 16 — side alcove mirror
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8,
        5, 8, 8, 2,
      ],
      // row 17
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      // row 18
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 2,
      ],
      // row 19 — lower lab doorways; energy accent at pillar junction
      [
        2, 8, 8, 8, 5, 8, 4, 0, 0, 0, 2, 8, 8, 2, 0, 0, 0, 4, 8, 5, 8, 8, 2, 0,
        0, 0, 0, 2,
      ],
      // row 20 — lower corridor (glass dividers)
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 21
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 22
      [
        2, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      // row 23 — outer border
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
    ],
    playerStart: { x: 2.5, y: 1.5, dir: Math.PI / 2 },
    entities: [
      { x: 11.5, y: 5.5, type: "enemy", enemyType: "phantom" },
      { x: 11.5, y: 11.5, type: "enemy", enemyType: "phantom" },
      { x: 20.5, y: 2.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 5.5, type: "enemy", enemyType: "drone" },
      { x: 3.5, y: 11.5, type: "enemy", enemyType: "corruptCop" },
      { x: 14.5, y: 8.5, type: "enemy", enemyType: "glitchling" },
      { x: 14.5, y: 15.5, type: "enemy", enemyType: "glitchling" },
      { x: 25.5, y: 9.5, type: "enemy", enemyType: "corruptCop" },
      { x: 20.5, y: 12.5, type: "enemy", enemyType: "phantom" },
      { x: 3.5, y: 17.5, type: "enemy", enemyType: "drone" },
      { x: 11.5, y: 17.5, type: "enemy", enemyType: "phantom" },
      { x: 25.5, y: 17.5, type: "enemy", enemyType: "drone" },
      { x: 20.5, y: 21.5, type: "enemy", enemyType: "corruptCop" },
      { x: 14.5, y: 11.5, type: "health" },
      { x: 2.5, y: 21.5, type: "ammo" },
      { x: 25.5, y: 21.5, type: "weapon", weaponId: 1 },
      { x: 2.5, y: 8.5, type: "health" },
      { x: 25.5, y: 12.5, type: "ammo" },
      { x: 8.5, y: 21.5, type: "health" },
    ],
    exit: { x: 25.5, y: 1.5 },
    secrets: [
      { wallX: 10, wallY: 5, description: "Dr. Voss' early research notes" },
    ],
  },
  // ── Level 4: Containment Block ────────────────────────────────────
  // Prison cells, heavy sentinels. Sub-boss: Shield Commander.
  // Narrative: Prisoner logs mention "Dr. Voss" and the Chronos Experiment.
  {
    name: "Containment Block",
    width: 28,
    height: 28,
    grid: [
      [
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 5, 3, 3, 3, 3,
        5, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 3, 3, 3, 3, 0, 0, 0, 3, 3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 3, 0, 0, 0,
        3, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0,
        5, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0,
        5, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
        3, 0, 0, 3,
      ],
      [
        3, 3, 3, 3, 3, 3, 0, 0, 0, 3, 3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 3, 0, 0, 0,
        3, 3, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 5, 3, 3, 3, 3, 5, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 5, 3, 3, 3,
        3, 5, 3, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0,
        0, 0, 0, 3,
      ],
      [
        3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
        3, 3, 3, 3,
      ],
    ],
    playerStart: { x: 1.5, y: 7.5, dir: 0 },
    entities: [
      // Cells - sentinels guarding prisoners
      { x: 2.5, y: 2.5, type: "enemy", enemyType: "sentinel" },
      { x: 7.5, y: 2.5, type: "enemy", enemyType: "corruptCop" },
      { x: 21.5, y: 2.5, type: "enemy", enemyType: "corruptCop" },
      { x: 26.5, y: 2.5, type: "enemy", enemyType: "sentinel" },
      // Central block - sub-boss
      { x: 14.5, y: 13.5, type: "enemy", enemyType: "shieldCommander" },
      { x: 11.5, y: 11.5, type: "enemy", enemyType: "henchman" },
      { x: 17.5, y: 15.5, type: "enemy", enemyType: "henchman" },
      // Lower cells
      { x: 2.5, y: 13.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 13.5, type: "enemy", enemyType: "drone" },
      { x: 2.5, y: 23.5, type: "enemy", enemyType: "sentinel" },
      { x: 25.5, y: 23.5, type: "enemy", enemyType: "corruptCop" },
      // Glitchlings in corridors
      { x: 7.5, y: 7.5, type: "enemy", enemyType: "glitchling" },
      { x: 20.5, y: 7.5, type: "enemy", enemyType: "glitchling" },
      { x: 7.5, y: 19.5, type: "enemy", enemyType: "glitchling" },
      { x: 20.5, y: 19.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 14.5, y: 7.5, type: "health" },
      { x: 14.5, y: 19.5, type: "ammo" },
      { x: 7.5, y: 13.5, type: "health" },
      { x: 21.5, y: 12.5, type: "weapon", weaponId: 1 },
    ],
    exit: { x: 14.5, y: 25.5 },
    secrets: [
      {
        wallX: 12,
        wallY: 9,
        description:
          "Prisoner log: Subject V — 'He volunteered for the experiment. Nobody told him what it really was.'",
      },
      {
        wallX: 5,
        wallY: 21,
        description:
          "Classified memo: Project PARADOX approval — signed by Dr. Elias Voss",
      },
    ],
  },
  // ── Level 5: Server Farm ──────────────────────────────────────────
  // Tech walls everywhere, drones patrol data corridors. Narrative-heavy.
  // ARIA discovers classified files about Voss' temporal research.
  {
    name: "Server Farm",
    width: 24,
    height: 28,
    grid: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 2, 5, 2, 2, 5, 2, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 5, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 2, 2, 5, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 2, 5, 2, 2, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 2, 5, 2, 2, 2, 2, 5, 2, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 2],
      [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2],
      [2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 0, 0, 0, 2, 5, 2, 2, 2, 2, 5, 2, 0, 0, 0, 0, 0, 0, 0, 2],
      [2, 2, 2, 5, 2, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 2, 5, 2, 2, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 5, 0, 0, 2, 2, 5, 2, 2, 5, 2, 2, 0, 0, 5, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    ],
    playerStart: { x: 2.5, y: 1.5, dir: Math.PI / 2 },
    entities: [
      // Drone patrols in data corridors
      { x: 11.5, y: 5.5, type: "enemy", enemyType: "drone" },
      { x: 12.5, y: 5.5, type: "enemy", enemyType: "drone" },
      { x: 2.5, y: 8.5, type: "enemy", enemyType: "drone" },
      { x: 21.5, y: 8.5, type: "enemy", enemyType: "drone" },
      { x: 11.5, y: 12.5, type: "enemy", enemyType: "drone" },
      { x: 12.5, y: 15.5, type: "enemy", enemyType: "drone" },
      // Henchmen guarding server rooms
      { x: 2.5, y: 12.5, type: "enemy", enemyType: "henchman" },
      { x: 21.5, y: 12.5, type: "enemy", enemyType: "henchman" },
      { x: 11.5, y: 22.5, type: "enemy", enemyType: "chronoBomber" },
      // Phantoms roaming
      { x: 8.5, y: 9.5, type: "enemy", enemyType: "phantom" },
      { x: 15.5, y: 18.5, type: "enemy", enemyType: "phantom" },
      // Glitchlings
      { x: 7.5, y: 4.5, type: "enemy", enemyType: "glitchling" },
      { x: 16.5, y: 23.5, type: "enemy", enemyType: "glitchling" },
      { x: 2.5, y: 18.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 11.5, y: 8.5, type: "health" },
      { x: 11.5, y: 18.5, type: "ammo" },
      { x: 2.5, y: 25.5, type: "health" },
      { x: 21.5, y: 25.5, type: "weapon", weaponId: 2 },
      // Act 2: additional weapon pickup (Experimental Rail)
      { x: 6.5, y: 22.5, type: "weapon", weaponId: 4 },
    ],
    exit: { x: 21.5, y: 1.5 },
    secrets: [
      {
        wallX: 10,
        wallY: 7,
        description:
          "ARIA: 'I'm pulling files from the mainframe... Dr. Elias Voss — lead temporal physicist. Clearance level: Omega. Status: DECEASED.'",
      },
      {
        wallX: 4,
        wallY: 10,
        description:
          "Recovered audio log: 'The suit prototype works. Subject merges with the temporal field. But the side effects... we can't control the paradox feedback.'",
      },
    ],
  },
  // ── Level 6: Reactor Access ───────────────────────────────────────
  // Energy walls, beasts lurking. Signs of the experiment gone wrong.
  // ARIA: "Reactor level. The energy readings are off the scale."
  {
    name: "Reactor Access",
    width: 28,
    height: 24,
    grid: [
      [
        4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
        4, 4, 4, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 4, 4, 4, 5, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 5,
        4, 4, 4, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 4, 4, 4, 5, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 5,
        4, 4, 4, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 4,
      ],
      [
        4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
        4, 4, 4, 4,
      ],
    ],
    playerStart: { x: 2.5, y: 1.5, dir: Math.PI / 2 },
    entities: [
      // Beasts lurking near reactor
      { x: 13.5, y: 5.5, type: "enemy", enemyType: "beast" },
      { x: 14.5, y: 12.5, type: "enemy", enemyType: "beast" },
      { x: 13.5, y: 19.5, type: "enemy", enemyType: "beast" },
      // Chrono-bombers near energy conduits
      { x: 7.5, y: 7.5, type: "enemy", enemyType: "chronoBomber" },
      { x: 20.5, y: 7.5, type: "enemy", enemyType: "chronoBomber" },
      // Drones patrolling perimeter
      { x: 2.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 7.5, type: "enemy", enemyType: "drone" },
      { x: 2.5, y: 16.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 16.5, type: "enemy", enemyType: "drone" },
      // Henchmen
      { x: 7.5, y: 15.5, type: "enemy", enemyType: "henchman" },
      { x: 20.5, y: 15.5, type: "enemy", enemyType: "henchman" },
      // Glitchlings in vents
      { x: 6.5, y: 11.5, type: "enemy", enemyType: "glitchling" },
      { x: 21.5, y: 11.5, type: "enemy", enemyType: "glitchling" },
      { x: 14.5, y: 8.5, type: "enemy", enemyType: "glitchling" },
      // Pickups
      { x: 14.5, y: 11.5, type: "health" },
      { x: 2.5, y: 21.5, type: "ammo" },
      { x: 25.5, y: 21.5, type: "health" },
      { x: 14.5, y: 21.5, type: "ammo" },
      // Act 2: EMP Launcher placed in Reactor Access as a strategic pickup
      { x: 14.5, y: 17.5, type: "weapon", weaponId: 7 },
    ],
    exit: { x: 25.5, y: 21.5 },
    secrets: [
      {
        wallX: 4,
        wallY: 6,
        description:
          "Scorched lab coat with name badge: 'Dr. E. Voss — Temporal Division.' Burn marks suggest temporal energy discharge.",
      },
      {
        wallX: 23,
        wallY: 17,
        description:
          "Emergency shutdown terminal — failed. Log: 'Reactor containment breach. Subject Voss has... merged with the temporal field. God help us.'",
      },
    ],
  },
  // ── Level 7: Dr. Voss' Laboratory ────────────────────────────────
  // Personal lab of the Paradox Lord's former self. Narrative climax before boss.
  // Full reveal: Voss IS the Paradox Lord. His final research notes.
  {
    name: "Dr. Voss' Laboratory",
    width: 28,
    height: 28,
    grid: [
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 8, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 5, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0,
        5, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 8, 8, 8, 8, 8, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 8, 8,
        8, 8, 8, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0,
        5, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 2, 2, 2, 5, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5, 2, 2,
        2, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
    ],
    playerStart: { x: 1.5, y: 1.5, dir: Math.PI / 4 },
    entities: [
      // Temporal Summoner in the central rift chamber
      { x: 14.5, y: 14.5, type: "enemy", enemyType: "temporalSummoner" },
      // Henchmen guarding lab wings
      { x: 7.5, y: 7.5, type: "enemy", enemyType: "henchman" },
      { x: 21.5, y: 7.5, type: "enemy", enemyType: "henchman" },
      { x: 7.5, y: 21.5, type: "enemy", enemyType: "henchman" },
      { x: 21.5, y: 21.5, type: "enemy", enemyType: "henchman" },
      // Phantoms near rift
      { x: 10.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      { x: 18.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      // Chrono-bombers in corridors
      { x: 5.5, y: 13.5, type: "enemy", enemyType: "chronoBomber" },
      { x: 23.5, y: 13.5, type: "enemy", enemyType: "chronoBomber" },
      // Drones
      { x: 13.5, y: 3.5, type: "enemy", enemyType: "drone" },
      { x: 14.5, y: 25.5, type: "enemy", enemyType: "drone" },
      { x: 3.5, y: 13.5, type: "enemy", enemyType: "drone" },
      { x: 25.5, y: 13.5, type: "enemy", enemyType: "drone" },
      // Pickups
      { x: 7.5, y: 5.5, type: "health" },
      { x: 21.5, y: 5.5, type: "ammo" },
      { x: 7.5, y: 22.5, type: "ammo" },
      { x: 21.5, y: 22.5, type: "health" },
      { x: 14.5, y: 7.5, type: "weapon", weaponId: 2 },
    ],
    exit: { x: 26.5, y: 26.5 },
    secrets: [
      {
        wallX: 6,
        wallY: 6,
        description:
          "ARIA: 'These are Voss' personal journals. He wrote about the suit — YOUR suit. He built the prototype. Badge number C-0017.'",
      },
      {
        wallX: 13,
        wallY: 13,
        description:
          "Final entry — Dr. Voss: 'The Paradox Engine responds to consciousness, not controls. I didn't break it. I became it. If you're reading this, I'm sorry. I was trying to save everyone.'",
      },
      {
        wallX: 22,
        wallY: 20,
        description:
          "ARIA: 'Temporal signature matches... Oh. Oh no. The Paradox Lord. He was listed as deceased three years ago. Dr. Elias Voss didn't die. He became something else.'",
      },
    ],
  },
  {
    name: "Temporal Nexus",
    width: 28,
    height: 28,
    grid: [
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 4, 0, 0, 4, 4, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 5, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 5, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 4, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 4, 4, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 4, 4,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 5, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 5,
        2, 2, 2, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 4, 4, 0, 0, 4, 4, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,
        0, 0, 0, 2,
      ],
      [
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        2, 2, 2, 2,
      ],
    ],
    playerStart: { x: 3.5, y: 2.5, dir: 0 },
    entities: [
      { x: 14.5, y: 5.5, type: "enemy", enemyType: "phantom" },
      { x: 5.5, y: 9.5, type: "enemy", enemyType: "corruptCop" },
      { x: 22.5, y: 9.5, type: "enemy", enemyType: "sentinel" },
      { x: 8.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      { x: 19.5, y: 14.5, type: "enemy", enemyType: "phantom" },
      { x: 5.5, y: 18.5, type: "enemy", enemyType: "glitchling" },
      { x: 22.5, y: 18.5, type: "enemy", enemyType: "beast" },
      { x: 14.5, y: 22.5, type: "enemy", enemyType: "phantom" },
      { x: 3.5, y: 22.5, type: "enemy", enemyType: "beast" },
      { x: 24.5, y: 22.5, type: "enemy", enemyType: "beast" },
      { x: 14.5, y: 1.5, type: "enemy", enemyType: "glitchling" },
      { x: 14.5, y: 26.5, type: "enemy", enemyType: "corruptCop" },
      // Pickups
      { x: 14, y: 13.5, type: "health" },
      { x: 14, y: 14.5, type: "ammo" },
      { x: 2.5, y: 9.5, type: "health" },
      { x: 25.5, y: 9.5, type: "ammo" },
      { x: 2.5, y: 18.5, type: "ammo" },
      { x: 25.5, y: 18.5, type: "health" },
      { x: 24.5, y: 2.5, type: "weapon", weaponId: 2 },
    ],
    exit: { x: 24.5, y: 25.5 },
    secrets: [],
  },
  {
    name: "The Paradox Core",
    width: 32,
    height: 32,
    grid: [
      [
        7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        5, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 7, 5, 7, 7, 7, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 7, 7, 5, 7, 7, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        9, 9, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 5, 4, 4, 4, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 7, 7,
      ],
      [
        7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 5, 4, 4, 4, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        9, 9, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 7, 5, 7, 7, 7, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 7, 7, 5, 7, 7, 7, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        5, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        7, 0, 0, 0, 0, 0, 0, 7,
      ],
      [
        7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
        7, 7, 7, 7, 7, 7, 7, 7,
      ],
    ],
    playerStart: { x: 3.5, y: 2.5, dir: 0 },
    entities: [
      // Boss in the center
      { x: 15.5, y: 15.5, type: "enemy", enemyType: "boss" },
      // Guards
      { x: 8.5, y: 8.5, type: "enemy", enemyType: "beast" },
      { x: 22.5, y: 8.5, type: "enemy", enemyType: "sentinel" },
      { x: 8.5, y: 22.5, type: "enemy", enemyType: "sentinel" },
      { x: 22.5, y: 22.5, type: "enemy", enemyType: "beast" },
      { x: 15.5, y: 8.5, type: "enemy", enemyType: "phantom" },
      { x: 15.5, y: 22.5, type: "enemy", enemyType: "phantom" },
      { x: 8.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      { x: 22.5, y: 15.5, type: "enemy", enemyType: "corruptCop" },
      { x: 3.5, y: 9.5, type: "enemy", enemyType: "glitchling" },
      { x: 28.5, y: 9.5, type: "enemy", enemyType: "glitchling" },
      { x: 3.5, y: 22.5, type: "enemy", enemyType: "drone" },
      { x: 28.5, y: 22.5, type: "enemy", enemyType: "drone" },
      // Pickups
      { x: 3.5, y: 29.5, type: "health" },
      { x: 28.5, y: 29.5, type: "health" },
      { x: 3.5, y: 15.5, type: "ammo" },
      { x: 28.5, y: 15.5, type: "ammo" },
      { x: 15.5, y: 3.5, type: "health" },
      { x: 28.5, y: 2.5, type: "health" },
      { x: 3.5, y: 28.5, type: "ammo" },
      { x: 28.5, y: 28.5, type: "ammo" },
      { x: 15.5, y: 28.5, type: "weapon", weaponId: 3 },
    ],
    exit: null, // Boss level - beat boss to win
    isBossLevel: true,
    secrets: [],
  },
];
