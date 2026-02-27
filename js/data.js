// Map legend:
// 0 = empty, 1 = stone, 2 = tech, 3 = metal, 4 = energy, 5 = door, 6 = secret
// 7 = boss wall, 8 = glass, 9 = temporal rift wall

export const WALL_COLORS = {
  1: { r: 80, g: 80, b: 100 }, // Stone - blue-grey
  2: { r: 40, g: 80, b: 120 }, // Tech - dark blue
  3: { r: 100, g: 100, b: 110 }, // Metal - silver
  4: { r: 60, g: 20, b: 120 }, // Energy - purple
  5: { r: 120, g: 80, b: 30 }, // Door - bronze
  6: { r: 78, g: 78, b: 98 }, // Secret - looks like stone
  7: { r: 30, g: 10, b: 60 }, // Boss - dark purple
  8: { r: 100, g: 140, b: 160 }, // Glass - light blue
  9: { r: 20, g: 60, b: 80 }, // Temporal rift
};

// Entity types for map placement
// E = enemy spawn, P = player start, H = health, A = ammo, W = weapon pickup
// K = key, S = secret trigger, D = door trigger, B = boss, X = exit

// TODO: Add additional variety to Arena map... procedurally generate or randomize, otherwise it gets repetitive
export const ARENA_MAP = {
  name: "Temporal Arena",
  width: 24,
  height: 24,
  grid: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    [1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
  playerStart: { x: 12.5, y: 12.5, dir: 0 },
  enemySpawns: [
    { x: 1.5, y: 1.5 },
    { x: 22.5, y: 1.5 },
    { x: 1.5, y: 22.5 },
    { x: 22.5, y: 22.5 },
    { x: 12.5, y: 2.5 },
    { x: 12.5, y: 21.5 },
    { x: 2.5, y: 12.5 },
    { x: 21.5, y: 12.5 },
    { x: 6.5, y: 1.5 },
    { x: 17.5, y: 1.5 },
    { x: 6.5, y: 22.5 },
    { x: 17.5, y: 22.5 },
    { x: 10.5, y: 6.5 },
    { x: 13.5, y: 6.5 },
    { x: 10.5, y: 17.5 },
    { x: 13.5, y: 17.5 },
  ],
  pickups: [
    { x: 12, y: 7, type: "health" },
    { x: 12, y: 17, type: "health" },
    { x: 7, y: 12, type: "ammo" },
    { x: 17, y: 12, type: "ammo" },
    { x: 5, y: 5, type: "weapon", weaponId: 1 },
  ],
};

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
      { x: 28.5, y: 6.5, type: "ammo" },
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

// Weapon definitions
// TODO: Add more weapons with unique mechanics (e.g. grenades, beam weapons, etc.)
export const WEAPONS = [
  {
    id: 0,
    name: "Chrono Pistol",
    damage: 15,
    fireRate: 300, // ms between shots
    ammoPerShot: 1,
    maxAmmo: 999,
    spread: 0.02,
    range: 50,
    type: "hitscan",
    color: "#00ffcc",
    description: "Standard issue temporal sidearm",
  },
  {
    id: 1,
    name: "Temporal Shotgun",
    damage: 8,
    pellets: 6,
    fireRate: 600,
    ammoPerShot: 1,
    maxAmmo: 50,
    spread: 0.08,
    range: 15,
    type: "hitscan",
    color: "#ff8800",
    description: "Scatters temporal fragments",
  },
  {
    id: 2,
    name: "Phase Rifle",
    damage: 40,
    fireRate: 150,
    ammoPerShot: 2,
    maxAmmo: 100,
    spread: 0.01,
    range: 100,
    type: "hitscan",
    color: "#8800ff",
    description: "High-energy phase beam",
  },
  {
    id: 3,
    name: "Quantum Cannon",
    damage: 80,
    fireRate: 1000,
    ammoPerShot: 5,
    maxAmmo: 40,
    spread: 0.0,
    range: 100,
    type: "projectile",
    color: "#ff0044",
    description: "Devastating quantum payload",
  },
];

// Enemy definitions
// TODO: Add more enemy types with unique behaviors (e.g. teleporting, summoning minions, etc.)
// TODO: Add different variants of the same enemy type with different stats /colors unique designs for later levels?
export const ENEMY_TYPES = {
  drone: {
    name: "Glitched Drone",
    health: 30,
    speed: 1.5,
    damage: 8,
    attackRate: 1000,
    attackRange: 8,
    sightRange: 12,
    radius: 0.3,
    score: 100,
    color1: "#00ccff",
    color2: "#004466",
    xp: 10,
    attackType: "ranged",
  },
  phantom: {
    name: "Time Phantom",
    health: 60,
    speed: 2.0,
    damage: 15,
    attackRate: 800,
    attackRange: 10,
    sightRange: 16,
    radius: 0.35,
    score: 250,
    color1: "#cc44ff",
    color2: "#440066",
    xp: 25,
    attackType: "ranged",
  },
  beast: {
    name: "Chrono Beast",
    health: 120,
    speed: 1.2,
    damage: 25,
    attackRate: 1500,
    attackRange: 3,
    sightRange: 14,
    radius: 0.45,
    score: 500,
    color1: "#ff4400",
    color2: "#661100",
    xp: 50,
    attackType: "melee",
  },
  boss: {
    name: "Paradox Lord",
    health: 800,
    speed: 1.0,
    damage: 35,
    attackRate: 600,
    attackRange: 15,
    sightRange: 30,
    radius: 0.6,
    score: 5000,
    color1: "#ff0088",
    color2: "#440022",
    xp: 200,
    attackType: "ranged",
  },
  corruptCop: {
    name: "Corrupt SWAT Officer",
    health: 50,
    speed: 1.8,
    damage: 12,
    attackRate: 900,
    attackRange: 10,
    sightRange: 14,
    radius: 0.3,
    score: 200,
    color1: "#ddaa00",
    color2: "#664400",
    xp: 20,
    attackType: "ranged",
  },
  sentinel: {
    name: "Chrono Sentinel",
    health: 180,
    speed: 0.9,
    damage: 30,
    attackRate: 2000,
    attackRange: 2.5,
    sightRange: 12,
    radius: 0.5,
    score: 600,
    color1: "#88aacc",
    color2: "#334466",
    xp: 60,
    attackType: "melee",
  },
  glitchling: {
    name: "Glitchling",
    health: 18,
    speed: 3.0,
    damage: 6,
    attackRate: 500,
    attackRange: 1.8,
    sightRange: 18,
    radius: 0.2,
    score: 75,
    color1: "#00ff44",
    color2: "#004411",
    xp: 8,
    attackType: "melee",
  },
};

// Arena Upgrades
export const UPGRADES = {
  maxHealth: {
    name: "Temporal Armor",
    description: "+25 Max Health",
    baseCost: 200,
    costScale: 1.6,
    maxLevel: 8,
    apply: (player) => {
      player.maxHealth += 25;
      player.health = Math.min(player.health + 25, player.maxHealth);
    },
  },
  damage: {
    name: "Chrono Amplifier",
    description: "+15% Damage",
    baseCost: 300,
    costScale: 1.7,
    maxLevel: 8,
    apply: (player) => {
      player.damageMultiplier = (player.damageMultiplier || 1) + 0.15;
    },
  },
  speed: {
    name: "Phase Boots",
    description: "+10% Movement Speed",
    baseCost: 250,
    costScale: 1.5,
    maxLevel: 5,
    apply: (player) => {
      player.moveSpeed *= 1.1;
    },
  },
  ammo: {
    name: "Ammo Synthesizer",
    description: "+20 Ammo Capacity",
    baseCost: 150,
    costScale: 1.4,
    maxLevel: 8,
    apply: (player) => {
      player.ammo = Math.min(player.ammo + 20, 999);
    },
  },
  regen: {
    name: "Temporal Regeneration",
    description: "Regenerate 1 HP/sec",
    baseCost: 400,
    costScale: 2.2,
    maxLevel: 5,
    apply: (player) => {
      player.regenRate = (player.regenRate || 0) + 1;
    },
  },
  armor: {
    name: "Chrono Plating",
    description: "+10 Armor (reduces damage)",
    baseCost: 250,
    costScale: 1.6,
    maxLevel: 8,
    apply: (player) => {
      player.armor = (player.armor || 0) + 10;
    },
  },
  critChance: {
    name: "Rift Precision",
    description: "+8% Critical Hit Chance",
    baseCost: 350,
    costScale: 1.8,
    maxLevel: 6,
    apply: (player) => {
      player.critChance = (player.critChance || 0) + 0.08;
    },
  },
  lifeSteal: {
    name: "Temporal Drain",
    description: "Heal 5% of damage dealt",
    baseCost: 500,
    costScale: 2.2,
    maxLevel: 5,
    apply: (player) => {
      player.lifeSteal = (player.lifeSteal || 0) + 0.05;
    },
  },
  explosiveRounds: {
    name: "Quantum Splash",
    description: "Attacks deal 10% splash damage",
    baseCost: 600,
    costScale: 2.4,
    maxLevel: 4,
    apply: (player) => {
      player.splashDamage = (player.splashDamage || 0) + 0.1;
    },
  },
  fireRate: {
    name: "Overclock Chamber",
    description: "+12% Fire Rate",
    baseCost: 275,
    costScale: 1.6,
    maxLevel: 6,
    apply: (player) => {
      player.fireRateMultiplier = (player.fireRateMultiplier || 1) + 0.12;
    },
  },
  dodgeChance: {
    name: "Temporal Reflex",
    description: "+6% Dodge Chance",
    baseCost: 350,
    costScale: 1.9,
    maxLevel: 5,
    apply: (player) => {
      player.dodgeChance = (player.dodgeChance || 0) + 0.06;
    },
  },
  shield: {
    name: "Rift Barrier",
    description: "+20 Rechargeable Shield",
    baseCost: 450,
    costScale: 2.0,
    maxLevel: 5,
    apply: (player) => {
      player.maxShield = (player.maxShield || 0) + 20;
      player.shield = player.maxShield;
    },
  },
  multiShot: {
    name: "Quantum Split",
    description: "+1 Projectile per shot",
    baseCost: 700,
    costScale: 2.5,
    maxLevel: 3,
    apply: (player) => {
      player.multiShot = (player.multiShot || 1) + 1;
    },
  },
  thorns: {
    name: "Paradox Thorns",
    description: "Reflect 12% damage to attackers",
    baseCost: 325,
    costScale: 1.8,
    maxLevel: 5,
    apply: (player) => {
      player.thorns = (player.thorns || 0) + 0.12;
    },
  },
};
