/** Every station room's wall painters, by id (merged into wall-art.js's PAINTERS). */
import { PAINTERS as corridor } from "./corridor.js";
import { PAINTERS as gym } from "./gym.js";
import { PAINTERS as office } from "./office.js";
import { PAINTERS as arena } from "./arena.js";
import { PAINTERS as precinct } from "./precinct.js";

export const ROOM_PAINTERS = { ...corridor, ...gym, ...office, ...arena, ...precinct };
