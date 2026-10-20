/** The Chronos PD station's own wall types (src/rendering/env/locker-art.js paints them). */
export const STATION_WALLS = {
  LOCKERS_A: 10,
  LOCKERS_B: 11,
  LOCKERS_C: 12,
  LOCKERS_D: 13,
  LOCKERS_MINE: 14,
  LOCKERS_MINE_LIT: 15,
  LOCKERS_MINE_OPEN: 16,
  GYM: 17,
  RANGE: 18,
  GYM_BOARD: 19,
  GYM_RACK: 20,
  GYM_PAD: 21,
  RANGE_SIGN: 22,
};

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
  // Chronos PD (src/rendering/env/locker-art.js): locker banks, the cadet's
  // locker (lit, open), the gym's padded wall, the range's baffles.
  10: { r: 44, g: 64, b: 104 },
  11: { r: 44, g: 64, b: 104 },
  12: { r: 44, g: 64, b: 104 },
  13: { r: 44, g: 64, b: 104 },
  14: { r: 44, g: 64, b: 104 },
  15: { r: 120, g: 90, b: 50 },
  16: { r: 44, g: 64, b: 104 },
  17: { r: 50, g: 62, b: 90 },
  18: { r: 46, g: 52, b: 62 },
  19: { r: 50, g: 62, b: 90 },
  20: { r: 54, g: 60, b: 70 },
  21: { r: 60, g: 90, b: 150 },
  22: { r: 46, g: 52, b: 62 },
};

// Entity types for map placement
// E = enemy spawn, P = player start, H = health, A = ammo, W = weapon pickup
// K = key, S = secret trigger, D = door trigger, B = boss, X = exit

// TODO: Add additional variety to Arena map... procedurally generate or randomize, otherwise it gets repetitive

