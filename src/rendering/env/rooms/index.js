/** Every station room's wall painters, by id (merged into wall-art.js's PAINTERS). */
import { PAINTERS as corridor } from "./corridor.js";
import { PAINTERS as gym } from "./gym.js";
import { PAINTERS as office } from "./office.js";
import { PAINTERS as arena } from "./arena.js";
import { PAINTERS as precinct } from "./precinct.js";
import { PAINTERS as halls } from "./halls.js";
import { PAINTERS as rnd } from "./rnd.js";
import { PAINTERS as dispatch } from "./dispatch.js";
import { PAINTERS as atrium } from "./atrium.js";
import { PAINTERS as holding } from "./holding.js";
import { PAINTERS as interview } from "./interview.js";
import { PAINTERS as track } from "./track.js";

export const ROOM_PAINTERS = {
  ...corridor, ...gym, ...office, ...arena, ...precinct,
  // The east wing (Certification Day).
  ...halls, ...rnd, ...dispatch, ...atrium, ...holding, ...interview,
  // The training hall off the gym.
  ...track,
};
