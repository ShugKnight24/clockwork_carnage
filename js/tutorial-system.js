/**
 * TutorialSystem — the prologue chapter (src/data/prologue.js): state,
 * progression, set pieces and checkpoints.
 *
 * Each step of PROLOGUE_STEPS has logic here, keyed by its id: `enter` sets
 * the step up (opens doors, spawns targets or hostiles, starts a hazard) and
 * `update` says when it is done. A beat's first step is a checkpoint: dying
 * puts you back there with the beat set up again, never back to the start.
 *
 * Certification Day starts with the suit's calibration in R&D, Orr walking
 * the cadet there from the range; then the "certify" step holds the sheet
 * and starts whichever trial you take up with the one who runs it (the
 * Supervisor at the range, Vale on the track, Lin at her booth). A trial's
 * last step hands back to it, and each trial finished makes the Engine's
 * calibration a little stranger (escalate). After the last, the sign-off at
 * Lift B, and 06:47. The Supervisor tears free of the minute; the cadet
 * walks him to his armour in the locker room and back to the lift.
 *
 * What moves the story on is being in a room (AREAS), never crossing a
 * particular doorway: any way in counts.
 *
 * Receives a `game` reference for the shared state (player, entities, audio,
 * map, comms).
 */
import { TUTORIAL_MAP } from "./data.js";
import { STATION_WALLS } from "../src/data/walls.js";
import { Enemy, Pickup, Prop, Projectile } from "./entities.js";
import { GameState } from "../src/types.js";
import { validatePropPosition } from "../src/systems/spawner.js";
import { TUTORIAL_SANDBOX_STEP } from "../src/constants.js";
import { PROLOGUE_STEPS, PROLOGUE_BEATS, PROLOGUE_TRIALS, PROLOGUE_ODDITIES, TRIAL_GRADES, gradeTrial, lineDuration, trialStart } from "../src/data/prologue.js";
import { ARIA_COMMS } from "../src/data/dialogue.js";
import { drawLine } from "../src/systems/aria-comms.js";
import { spawnEnergyBurst } from "./particle-system.js";
import { VENT_CHRONO } from "../src/systems/chrono-hazards.js";
import { playChronoSound } from "../src/audio/chrono-sounds.js";
import { Npc } from "./npc.js";
import { NPC_TYPES } from "../src/data/npcs.js";
import { ARENA_WALLS, COVER_LAYOUTS, DRILL_COVER, BOOTH_AT, BOOTH_FRONT } from "../src/data/levels/rooms/arena.js";
import { TRACK_AREA, TRACK_BARS, TRACK_TUNNEL, TRACK_PIT, TRACK_WALLS, LANES } from "../src/data/levels/rooms/track.js";
import { arrive as startArrival, pendingArrivals, clearArrivals } from "../src/systems/arrival.js";
import { shovePlayer } from "../src/systems/ai.js";
import { HALL_WALLS } from "../src/data/levels/rooms/halls.js";
import { RND_WALLS, RIG_AT, BREAKER_CELL } from "../src/data/levels/rooms/rnd.js";
import { ATRIUM_GAP } from "../src/data/levels/rooms/atrium.js";
import { CORRIDOR_WALLS } from "../src/data/levels/rooms/corridor.js";
import { DISPATCH_WALLS } from "../src/data/levels/rooms/dispatch.js";
import { HOLDING_WALLS } from "../src/data/levels/rooms/holding.js";
import { INTERVIEW_WALLS } from "../src/data/levels/rooms/interview.js";
import { CIVIC_WALLS } from "../src/data/levels/rooms/civic.js";
import { buildNavField } from "../src/systems/ai-nav.js";
import { hasLineOfSight } from "../src/systems/physics.js";
import { LAYER } from "../src/data/levels/map-helpers.js";
import { prefetchEnemyModel } from "../src/rendering/svg-art/sprites/enemies.js";
import { ART_LEGACY, getArtStyle } from "../src/rendering/art-style.js";

const SPEAKER_STYLE = {
  ARIA: { color: "#00ffdd", voice: "aria" },
  // In the room he sounds like a man; on the radio, like a radio.
  SUPERVISOR: { color: "#ffb028", voice: "supervisorLive", radioVoice: "supervisor" },
  PA: { color: "#9fb4c8", voice: "system" },
  OFFICER: { color: "#6fb6ff", voice: "officer" },
  "LT. RASCZAK": { color: "#6fb6ff", voice: "officer" },
  "SGT. KAEL": { color: "#4f9dff", voice: "kael" },
  // R&D, and the floor's people when you talk to them.
  "DR. ORR": { color: "#9ff0d8", voice: "miri" },
  LIN: { color: "#9fd8f0", voice: "kai" },
  VALE: { color: "#f0d89f", voice: "nova" },
  STAFF: { color: "#c8d0dc", voice: "lyra" },
  STAFF_M: { color: "#c8d0dc", voice: "kai" },
};

/**
 * The locker room on the morning of the breach (cols 4-23, rows 38-46): the
 * squad at their lockers, the cadet's own locker (the one with the light),
 * and the routes people take through it.
 */
const SQUAD_AT = [
  [9.5, 40.5],
  [16.5, 39.8],
  [7.5, 44.5],
  [21.5, 44.8],
  [12.2, 39.4],
  [19.6, 39.9],
  [10.8, 45.6],
  [5.0, 40.6],
];
/** Who is who in the squads: the lieutenant, the sergeant, and the two who rib the cadet. */
const SQUAD_NAMES = { 1: "Sgt. Kael", 3: "Lt. Rasczak", 4: "Ofc. Brandt", 6: "Ofc. Okafor" };
/**
 * Where each officer kits up: in front of their own locker, on the north
 * bank (row 37) or the south (row 47), clear of the benches and the cadet's.
 */
const KIT_AT = [
  [8.5, 38.6],
  [15.2, 38.6],
  [8.5, 46.3],
  [22.5, 46.3],
  [10.2, 38.6],
  [19.0, 38.6],
  [10.6, 46.3],
  [4.6, 38.6],
];
/** The cadet's locker: the left of the pair in the south wall's cell (14, 47), and where to face it from. */
const MY_LOCKER = { x: 14.3, y: 46.9 };
const MY_LOCKER_CELL = { x: 14, y: 47 };
/** Out of the locker room's door and up the main corridor, toward the Engine level. */
const OUT_OF_LOCKERS = (x, y) => [[x, y], [x, 43.5], [23.0, 43.5], [23.5, 41.5], [26.5, 41.5], [29.5, 41.5], [29.5, 30.5]];
/** The Supervisor's marks, step by step: where he walks to and waits. */
const SUP_ROUTES = {
  // In at the door and round the benches, to where the cadet can see him.
  enter: [[27.5, 41.5], [24.5, 41.5], [23.0, 43.5], [18.5, 44.3]],
  // He leaves you to the suit and goes on ahead to the range.
  ahead: [[23.0, 43.5], [24.5, 41.5], [27.5, 41.5], [29.5, 41.5], [34.5, 41.5], [37.5, 44.8]],
  atRange: [[37.5, 44.8]],
  // At the alarm he goes down to his people the only way there is: Lift B,
  // the car the thing came up in. He turns in it to look at you.
  leave: [[33.5, 4.4], [30.0, 3.6], [30.0, 2.45]],
};
/** Where the Supervisor waits for the sheet: by Lift B, in the sim hall. */
const SUP_AT_LIFT = { x: 33.5, y: 6.0 };
/**
 * The Supervisor's locker (the north bank, by the door: src/data/levels/
 * tutorial.js), where he stands to kit up, and what he faces.
 */
const SUP_LOCKER_CELL = { x: 22, y: 37 };
const SUP_LOCKER = { x: 22.5, y: 38.6 };
/**
 * The escort to the locker room: how fast he can walk with the minute still
 * in his legs, how often it catches him (a half-second stop), how far ahead
 * he'll go without you, and where things come through on the way (each when
 * he is past `after`, his y down the corridor).
 */
const ESCORT_SPEED = 1.25;
const ESCORT_STUTTER = 2.8;
const ESCORT_LEASH = 6.5;
const ESCORT_WAVES = [
  { after: 14, spots: [[29.5, 25.5, "henchman"]] },
  { after: 30, spots: [[27.5, 36.5, "drone", "vent"], [32.5, 43.5, "drone", "vent"]] },
];

/**
 * Lift B, in the sim hall's north wall: the service lift down to the Engine
 * level. Its doors are the two wall cells (2, 29) and (2, 30); open, they
 * leave the car, one cell deep, behind them. The breach comes up in it, the
 * Supervisor goes down in it, and the evac calls it back up.
 */
const LIFT_DOORS = [
  { x: 29, y: 2, shut: ARENA_WALLS.LIFT_DOOR_L },
  { x: 30, y: 2, shut: ARENA_WALLS.LIFT_DOOR_R },
];
/** Inside the car, and where the open car's beacon stands. */
const LIFT_CAR = { x: 30.0, y: 2.6 };
/**
 * The alarm at Lift B: how close you get to the car before he puts you out
 * of it (or how long he waits for you), and how long after that the doors
 * shut. What he says when he does.
 */
const ALARM_REFUSE_AT = 2.2;
const ALARM_REFUSE_WAIT = 6;
const ALARM_DOORS_AFTER = 4.5;
const ALARM_REFUSAL = [
  ["SUPERVISOR", "No. Not you.", "urgent"],
  ["SUPERVISOR", "Bureau property doesn't go down there uncertified. Neither do you. Hold this floor, Cadet. That's an order.", "urgent"],
  ["ARIA", "He's keyed the car to his badge. I can't call it back.", "afraid"],
];
/**
 * The breach on this floor: up through the sim hall as the lift shuts on
 * him, between you and it; then his office, the override on the desk.
 */
const COVER_WAVES = [
  [
    [22.5, 9.5, "henchman"],
    [38.5, 9.5, "henchman"],
    [33.5, 4.5, "drone"],
  ],
  [
    [53.5, 24.5, "henchman"],
    [53.5, 16.5, "henchman"],
    [48.5, 24.5, "henchman"],
  ],
];
const COVER_TO_OFFICE = [
  ["SUPERVISOR", "Breach, every sector, they're already insi—", "afraid", { radio: true }],
  ["ARIA", "Lost him. Lost the whole network. Whatever came up that shaft, more will follow.", "urgent"],
  ["ARIA", "His override's on his desk. He said hold the floor, {AGENT}. He didn't say which one.", "urgent"],
];

/**
 * The floor's people that morning, who aren't police on the Engine detail.
 * `at` is where the morning has them, `face` what they're turned to, and
 * `caught` what they were doing when 06:47 stopped them (for the stopped
 * look: src/rendering/enemies/station-people.js). After the breach
 * (TutorialSystem.aftermath) every one of them stands where it caught them.
 * Kinds the NPC rig doesn't have yet stand in as officers.
 */
const PEOPLE = {
  pike: { kind: "clerk", name: "Dana Pike", look: 1, at: [29.0, 52.4], face: [29.0, 56], caught: "typing" }, // front desk
  nand: { kind: "clerk", name: "Priya Nand", look: 0, at: [39.5, 17.3], face: [39.5, 15], caught: "filing" }, // the office's clerk, at her cabinets
  brooks: { kind: "clerk", name: "Hal Brooks", look: 1, at: [21.6, 31.4], face: [20.2, 30.6], caught: "talking" }, // at the coffee
  mendez: { kind: "officer", name: "Ofc. Mendez", at: [20.2, 30.6], face: [20.2, 29], caught: "pouring" }, // off shift, the coffee
  varga: { kind: "officer", name: "Ofc. Varga", at: [17.2, 24.0], face: [16.5, 25.5], caught: "punching" }, // PT, at the bags
  // R&D: Orr meets you at the range to walk you to the rig; Lin and Vale
  // are at their trials all morning, in the sim hall's booth and the track.
  orr: { kind: "staff", name: "Dr. Nadia Orr", look: 0, at: [37.2, 38.8], face: [34.5, 41.5], caught: "stepping" },
  lin: { kind: "staff", name: "Teo Lin", look: 1, at: [BOOTH_AT.x, BOOTH_AT.y], face: [BOOTH_AT.x, 9], caught: "watching" },
  vale: { kind: "staff", name: "Ines Vale", look: 1, at: [LANES[4], 52.5], face: [LANES[1], 51.5], caught: "timing" },
  // The east wing.
  booker: { kind: "clerk", name: "Clerk Ruiz", look: 0, at: [68.5, 53.4], face: [68.5, 56], caught: "stamping" },
  detainee: { kind: "clerk", name: "Detainee", look: 1, at: [63.5, 53.4], face: [63.5, 57], caught: "posing" },
  haas: { kind: "officer", name: "Det. Haas", at: [44.5, 53.9], face: [44.5, 56.6], caught: "asking" },
  suspect: { kind: "clerk", name: "Suspect", look: 1, at: [44.5, 56.6], face: [44.5, 53.9], caught: "answering" },
  cole: { kind: "clerk", name: "Dispatcher Cole", look: 0, at: [78.8, 21.5], face: [84, 21.5], caught: "radio" },
  imani: { kind: "staff", name: "Dispatcher Imani", look: 0, at: [78.8, 23.5], face: [84, 23.5], caught: "radio" },
  // The civic wing: the public side of the station, before its doors open.
  okafor: { kind: "officer", name: "Ofc. Okafor", at: [64.5, 73.4], face: [64.5, 77], caught: "checking" }, // the security desk
  visitor: { kind: "clerk", name: "Visitor", look: 1, at: [56.5, 77.3], face: [56.5, 74], caught: "stepping" }, // first through the scanner
  mott: { kind: "staff", name: "Groundsman Mott", look: 1, at: [51.6, 67.4], face: [49.5, 65.5], caught: "watering" }, // the beds
  wisher: { kind: "clerk", name: "Visitor", look: 0, at: [57.4, 72.5], face: [59.5, 70.0], caught: "tossing" }, // a coin for the fountain
  bell: { kind: "clerk", name: "Archivist Bell", look: 0, at: [38.4, 69.5], face: [36.0, 69.5], caught: "reaching" }, // the stacks
  reader: { kind: "clerk", name: "Reader", look: 1, at: [27.5, 76.4], face: [27.0, 77.5], caught: "reading" }, // the reading room
  sato: { kind: "clerk", name: "Agent Sato", look: 1, at: [80.5, 64.2], face: [80.5, 62], caught: "reading" }, // the Bureau's board
  adeyemi: { kind: "staff", name: "Bureau Clerk Adeyemi", look: 0, at: [80.4, 68.3], face: [80.4, 67.0], caught: "typing" }, // the Bureau's desk
};
/**
 * What 06:47 caught in the air (src/rendering/props.js): Mendez's coffee
 * mid-pour beside him, and a form falling off the booking desk by Ruiz.
 */
const FROZEN_POUR = { x: 19.5, y: 30.5 };
const FROZEN_PAPER = { x: 69.4, y: 53.7, lift: 0.85 };
/** Up the corridor from the front desk to her cabinets, while you cross to the range. */
const NAND_ROUTE = [[29.5, 46.5], [29.5, 20.6], [34.6, 20.6], [37.5, 18.6], [39.5, 17.3]];
/** Where R&D run their trials from. */
const STATIONS = {
  orr: { x: 73.5, y: 8.5, face: RIG_AT },
  lin: { x: BOOTH_AT.x, y: BOOTH_AT.y, face: { x: BOOTH_AT.x, y: 9 } },
  vale: { x: LANES[4], y: 52.5, face: { x: LANES[1], y: 51.5 } },
};
/** How fast Orr walks you to R&D: a little under your own walk, so you keep together. */
const ORR_WALK = 2.7;
/** How far ahead of you she'll get before she stops for you, and the longest she waits to start. */
const ORR_LEASH = 4;
const ORR_WAIT_MAX = 20;

/**
 * The rooms the story asks you to be in, as their floors are carved
 * (src/data/levels/tutorial.js and its rooms): any door into one counts.
 * x1 and y1 are exclusive.
 */
const AREAS = {
  lockers: { x0: 4, y0: 38, x1: 24, y1: 47 },
  range: { x0: 36, y0: 38, x1: 56, y1: 47 },
  rnd: { x0: 62, y0: 2, x1: 80, y1: 14 },
  arena: { x0: 9, y0: 3, x1: 51, y1: 11 },
  track: TRACK_AREA,
};
const inArea = (p, name) => {
  const a = AREAS[name];
  return p.x >= a.x0 && p.x < a.x1 && p.y >= a.y0 && p.y < a.y1;
};
/** R&D's people by the name their lines go under, and how far a voice carries outside its room. */
const EARSHOT_OF = { "DR. ORR": "orr", LIN: "lin", VALE: "vale" };
const EARSHOT = 14;
/**
 * The room each of them carries through, wherever they stand in it: Lin
 * talks the sim hall through from her booth's mic (the booth is below the
 * hall's floor box), Orr has R&D, Vale the track.
 */
const ROOM_OF = { orr: "rnd", lin: "arena", vale: "track" };

/**
 * What the floor's people say if you talk to them (press interact facing
 * them): a line each, in turn, in the voice named (SPEAKER_STYLE) and under
 * their own name. Never a stop; nobody waits on it.
 */
const TALK = {
  pike: [["STAFF", "Front desk. If it's lost property, it's Thursday's problem."], ["STAFF", "Lift B again? The log says nobody's on it. It's said that all night."]],
  nand: [["STAFF", "Post for the Supervisor. Mostly the Bureau, wanting things by noon."]],
  brooks: [["STAFF_M", "Mendez says you won't pass. I've got five on you."]],
  mendez: [["OFFICER", "Coffee's terrible. I came in on my day off for it anyway."]],
  varga: [["OFFICER", "Pace the run. Everyone sprints the first straight and walks the last."]],
  orr: [["DR. ORR", "Calibration's the one I lose sleep over. You stand there and I worry."]],
  lin: [["LIN", "The sim's only light. It still hurts your pride."]],
  vale: [["VALE", "Everyone sprints lane one and walks lane three. Don't be everyone."]],
  booker: [["STAFF_M", "Booking's quiet till nine. Unless you've brought me someone."]],
  detainee: [["STAFF", "What time is it? No, really. What time is it?"]],
  haas: [["OFFICER", "Close the door, Cadet. We're nearly there with this one."]],
  suspect: [["STAFF", "I told him already. I keep losing the same minute."]],
  cole: [["STAFF_M", "Engine level's not answering check-ins. They say it's the calibration."]],
  imani: [["STAFF", "Heavy A and B, both on the chamber door. Quiet morning, apart from that."]],
  okafor: [["OFFICER", "Public doors open at eight. Till then it's staff, deliveries and the Bureau."], ["OFFICER", "Queue's round the corner already. Parking appeals, mostly."]],
  visitor: [["STAFF_M", "They let me in early for the records. I've been waiting on this form since spring."]],
  mott: [["STAFF_M", "The ficus gets watered at a quarter to seven. Every morning. It knows."]],
  wisher: [["STAFF", "You throw a coin in and wish for more time. Everyone in this city wishes for more time."]],
  bell: [["STAFF", "Every case since the Engine was lit, filed to the minute. Ask me for any minute you like."]],
  reader: [["STAFF_M", "Family history. My grandmother was arrested here once. Twice, it turns out."]],
  sato: [["STAFF", "The Bureau's regional desk, Cadet. We sign your plate off at noon, once R&D have."]],
  adeyemi: [["STAFF", "Forms for the certification. In triplicate. The Bureau likes a copy of the copy."]],
};
/** ARIA, once, if you try to talk to someone the minute caught. */
const FROZEN_TALK = [
  ["ARIA", "Nothing. Not a blink. They're in the minute and we're not.", "sad"],
  ["ARIA", "Stopped mid-word. Breathing? No. Dead? Also no.", "afraid"],
  ["ARIA", "Leave them be, {AGENT}. We'll get them back.", "tender"],
];

/**
 * Walls worth reading (press interact facing one): ARIA reads it out. Optional
 * story; it never blocks a step.
 */
const READABLE = {
  [HALL_WALLS.CERT_BOARD]: [["ARIA", "R&D's board. Four trials, your badge at the top. Somebody drew a smiley next to calibration.", "happy"]],
  [HALL_WALLS.DIRECTORY]: [["ARIA", "Floor plan. R&D's up the east side, past dispatch. The training hall's through the gym. Holding's at the bottom.", "calm"]],
  [HALL_WALLS.MEMORIAL]: [["ARIA", "The heavy squads, in C-series plate. The suit before yours. Rasczak's in the middle.", "calm"]],
  [HALL_WALLS.PT_POSTER]: [["ARIA", "Varga's poster. 'Pace yourself.' Annoyingly good advice.", "warm"]],
  [CORRIDOR_WALLS.NOTICE]: [["ARIA", "Softball against the fire department, Saturday. You're not on the team sheet. Yet.", "warm"]],
  [RND_WALLS.WHITEBOARD]: [["ARIA", "Orr's maths. 'C: a half. D: one?' And six forty-seven, circled twice.", "curious"]],
  [RND_WALLS.LIFT_A]: [["ARIA", "Lift A. R&D's freight car to the Engine level. Locked out for the calibration.", "calm"]],
  [RND_WALLS.SUIT_RACK]: [["ARIA", "C-series. The squads' heavy plate. Same frame as yours, two generations back.", "curious"]],
  [RND_WALLS.BREAKER]: [["ARIA", "R&D's main breaker. It feeds Lift B, apparently.", "calm"]],
  [RND_WALLS.BIOMON]: [["ARIA", "That's you. Heart, breath, and something Orr calls a neural match. Ninety-eight point seven.", "warm"]],
  [RND_WALLS.CLEANROOM]: [["ARIA", "Their cleanroom. Someone in a bunny suit is pretending not to watch you.", "happy"]],
  [RND_WALLS.FRIDGE]: [["ARIA", "Samples. I'm choosing not to ask whose.", "curious"]],
  [TRACK_WALLS.BOARD]: [["ARIA", "Vale's board. Her name's on top. Yours is the blank line.", "warm"]],
  [DISPATCH_WALLS.DUTY_BOARD]: [["ARIA", "Both heavy squads on the Engine level. And you: trials.", "calm"]],
  [DISPATCH_WALLS.CITY_MAP]: [["ARIA", "Every unit in the city. One red one hasn't checked in.", "worried"]],
  [HOLDING_WALLS.RIGHTS]: [["ARIA", "'You may know the time of your arrest.' Funny thing to promise.", "curious"]],
  [INTERVIEW_WALLS.ONE_WAY]: [["ARIA", "One-way glass. From in there it's a mirror. They still wave at it.", "warm"]],
  [CIVIC_WALLS.PLAQUE]: [["ARIA", "The cornerstone. 'Built by the city, kept by the hour.' They laid it the year the Engine was lit.", "calm"]],
  [CIVIC_WALLS.DIRECTORY]: [["ARIA", "Great hall, records west, the Bureau's desk east. The station's back up the passage. Lost property: Thursdays.", "calm"]],
  [CIVIC_WALLS.SEAL]: [["ARIA", "The department's seal. A clock and a key. Somebody polishes it every morning.", "warm"]],
  [CIVIC_WALLS.WINDOW_A]: [["ARIA", "The old town, and the clock spire. Every clock in the city is set from the one under our feet.", "curious"]],
  [CIVIC_WALLS.WINDOW_B]: [["ARIA", "The morning airship, coming in to the towers. Right on time. Everything here is.", "warm"]],
  [CIVIC_WALLS.WINDOW_C]: [["ARIA", "The river road. First tram of the day. The city doesn't know we're up yet.", "calm"]],
  [CIVIC_WALLS.ENTRANCE]: [["ARIA", "The public doors. Locked till eight, and there's already a queue on the steps.", "happy"]],
  [CIVIC_WALLS.STACKS]: [["ARIA", "Case files, boxed by the minute they closed. Every label's a time.", "curious"]],
  [CIVIC_WALLS.BUREAU_BOARD]: [["ARIA", "The Bureau's board. Your plate's on it, signed off by noon. 'Time reveals all.' Their motto. Not a threat. Probably.", "warm"]],
};

/**
 * What ARIA says, once, when you come near someone the breach caught: on the
 * way past, never a stop.
 */
const NOTICES = [
  {
    id: "nand",
    steps: ["cover", "patch", "shield", "chrono"],
    who: "nand",
    r: 3.4,
    lines: [["ARIA", "The clerk from the corridor this morning. She isn't breathing. She isn't dead, either. She's stuck at six forty-seven.", "afraid"]],
  },
  {
    id: "breakroom",
    steps: ["vents", "slowFire", "breaker", "toLift"],
    who: "mendez",
    r: 3.2,
    lines: [["ARIA", "Mendez. Off shift. He only came in for the coffee. He's still pouring it.", "sad"]],
  },
  {
    id: "dispatch",
    steps: ["breaker", "toLift"],
    who: "cole",
    r: 4,
    lines: [["ARIA", "Dispatch. Headsets on, mid-call. The whole city's waiting on a minute that won't end.", "sad"]],
  },
];

/**
 * The sim hall's exhibits (the "lab" step): holograms of what patrols have
 * met, one at a time, each with its briefing.
 */
const EXHIBITS = [
  {
    type: "drone",
    name: "GLITCHED DRONE",
    lines: [["ARIA", "Glitched drone. Fast, fragile, and it circles while it shoots. Lead it a little.", "curious"]],
  },
  {
    type: "henchman",
    name: "SYNDICATE HENCHMAN",
    lines: [
      ["ARIA", "Syndicate muscle. Watch for the glint and the whine before it fires. That's your cue to step aside.", "curious"],
      ["LIN", "We keep finding their kit in sealed rooms. Nobody knows how they get in.", "worried"],
    ],
  },
  {
    type: "sentinel",
    name: "CHRONO SENTINEL",
    lines: [
      ["ARIA", "Chrono Sentinel. The shield soaks most of what hits it. Go round it: from the side or behind, the head and the core on its back are exposed.", "curious"],
      ["ARIA", "Odd. Every one of these sightings is logged at the same minute. Six forty-seven.", "worried"],
    ],
  },
];
/**
 * Lin's briefing from her booth, the first time you come into the sim hall
 * with the combat trial still on the sheet. She starts it when you tell her
 * (interact with her or her desk), never before.
 */
const LIN_BRIEF = [
  ["LIN", "Over here, the booth. Teo Lin. I run the sim; it's all light.", "happy"],
  ["LIN", "Its rounds hit the sim, not you. Exhibits, cover, then the real thing. Say when.", "calm"],
];

/** Where an exhibit stands in the arena, and where you stand to study it. */
const EXHIBIT_AT = { x: 29.5, y: 4.5 };

/** The simulation's waves, at the arena's ends, and the cover each raises. */
const SIM_WAVES = [
  [
    [10.5, 4.5, "drone"],
    [49.5, 4.5, "drone"],
    [10.5, 9.5, "henchman"],
    [49.5, 9.5, "drone"],
  ],
  [
    [10.5, 6.5, "henchman"],
    [49.5, 6.5, "henchman"],
    [29.5, 3.5, "sentinel"],
  ],
];
const SIM_COVER = ["lanes", "scatter"];
/** What a simulated hit costs: the sim hits harder than the real ones do in the prologue, but only its integrity. */
const SIM_DAMAGE = { drone: 7, henchman: 9, sentinel: 14, glitchling: 6 };

/** The steps after which ARIA may say a word of encouragement. */
const ENCOURAGE_AFTER = new Set(["fire", "ads", "moving", "shotgun", "slide", "dash", "cover", "vents"]);

const SHOTGUN = 1;
const PISTOL = 0;

/**
 * Where the marker sends you for each trial still on the sheet: to the
 * person who runs it (the range's first bench, for the Supervisor's).
 * What starts each is in the "certify" step: being on the range; reaching
 * Vale in the training hall; telling Lin you're ready.
 */
const TRIAL_START = {
  weapons: { x: 38.5, y: 42.5 },
  mobility: { x: LANES[4], y: 52.5 },
  combat: BOOTH_FRONT,
};
/** How close to Vale starts her warm-up, and to Lin (or her desk) to tell her to go. */
const VALE_REACH = 3.2;
const LIN_REACH = 2.8;

/** The mobility warm-up's goals: seconds sprinted, metres crouch-walked. */
const WARM_SPRINT = 2;
const WARM_CROUCH = 1.5;

/**
 * The mobility run, in the training hall (src/data/levels/rooms/track.js):
 * its gates in order, each a line across a lane (x0..x1 exclusive, at y).
 * The start line at the top of lane one; down it, up lane two under the
 * bars (a gate halfway, so the bars are the way), down lane three through
 * the tunnel and over the pit, to the finish. Each step of the trial runs
 * to its last gate: SEGMENT_END.
 */
const RUN_GATES = [
  { x: LANES[1], y: 51.5, x0: 1, x1: 4 }, // the start line
  { x: LANES[1], y: 78.0, x0: 1, x1: 4 }, // the bottom of lane one: 27 cells, more than a bar of sprint
  { x: LANES[2], y: 67.0, x0: 5, x1: 8 }, // halfway up lane two, between the bars
  { x: LANES[2], y: 51.5, x0: 5, x1: 8 }, // the top of lane two
  { x: LANES[3], y: 59.5, x0: 9, x1: 12 }, // out of the tunnel
  { x: LANES[3], y: 68.5, x0: 9, x1: 12 }, // over the pit
  { x: LANES[3], y: 78.0, x0: 9, x1: 12 }, // the finish line
];
const SEGMENT_END = { sprint: 1, slide: 3, tunnel: 4, dash: 5, runHome: 6 };
/** How far either side of its line a gate counts you through. */
const RUN_GATE_DY = 0.9;
/**
 * Seconds Vale counts you in on the start line, once she has finished
 * talking. Step off it before "Go" and the count starts again.
 */
const RUN_COUNTDOWN = 3;
/** Every cell with something at 0.9 m across it, the bars and the tunnel: only low gets through. */
const LOW_CELLS = new Set([...TRACK_BARS, ...TRACK_TUNNEL].map(([x, y]) => `${x},${y}`));
/**
 * Floor you only cross mid-dash: the atrium bridge's missing section
 * (crossed east-west) and the training hall's foam pit (north-south).
 */
const GAPS = [
  { x0: ATRIUM_GAP.x, x1: ATRIUM_GAP.x, y0: ATRIUM_GAP.y0, y1: ATRIUM_GAP.y1, axis: "x", pit: false },
  { ...TRACK_PIT, axis: "y", pit: true },
];
/** After a dash ends you still carry over a gap for this long. */
const DASH_CARRY = 0.3;

/** Orr at the sign-off: the suit's anchor reading what it shouldn't. */
const ANCHOR_LINES = [
  ["DR. ORR", "Before he signs. Your suit's anchor is reading the Engine.", "worried"],
  ["DR. ORR", "It shouldn't be able to see the Engine from here.", "worried"],
];

/** Seconds the rig takes to calibrate the suit, standing still on its pad. */
const READ_TIME = 9;
/**
 * Orr's commentary as the calibration goes: [fraction read, line]. Said
 * only if nothing else is being said by then (her walk's lines can run
 * long): the reading itself is on the card.
 */
const READ_LINES = [
  [0.15, ["DR. ORR", "Body's in. Pulse is up. Fair enough.", "calm"]],
  [0.45, ["DR. ORR", "Same frame as the squads' plate. Theirs only half takes the anchor.", "curious"]],
  [0.75, ["DR. ORR", "Now your head. Neural lock... come on.", "worried"]],
];
/** What the card says the rig is reading, by how far it has got. */
const READ_STAGES = [[0.4, "BODY"], [0.75, "NERVES"], [1, "MIND"]];

/**
 * The cover drill (the "coverDrill" step): its holo targets at the hall's
 * north end, the one up close for blind fire, and how often the targets
 * put a round into your cover while you are down behind it.
 */
const DRILL_TARGETS = [[41.5, 4.5], [46.5, 4.5]];
const DRILL_BLIND_AT = [43.5, 6.5];
const DRILL_VOLLEY = 1.1;
/** Blind shots that earn the blind-fire part without a kill: it's about keeping heads down. */
const DRILL_BLIND_SHOTS = 8;

/** The range's reload drill: active reloads it wants, and the Supervisor's word on a jam. */
const RELOAD_GOAL = 2;
const JAM_LINES = [
  "Jammed. The band, Cadet, not near it. Again.",
  "That's a jam. It happens out there too. Clear it and go.",
  "Again.",
];

/**
 * The plasma vents across the main corridor (cols 27-32): two strips, two
 * rows deep. Each is hot for VENT_ON of every VENT_CYCLE seconds, offset so
 * the second strip's gap opens just after the first's. A 0.35 s gap is too
 * short to cross two rows even sprinting. Under Chrono Shift the cycle runs
 * at VENT_CHRONO of real time (as the campaign's vents do), so each gap lasts
 * over a second: walk through the first as it opens and the second opens
 * as you reach it. (On the world's clock alone a shift stretched the gap to
 * 0.8 s, which a walk across two rows did not fit.)
 */
const VENT_STRIPS = [
  { rows: [22, 23], phase: 0 },
  { rows: [25, 26], phase: 1.52 },
];
const VENT_COLS = [27, 32];
const VENT_CYCLE = 1.75;
const VENT_ON = 1.4;
const VENT_DAMAGE = 12;

/**
 * Training targets: no sight, no gun, no feet. Drones by default; a
 * humanoid hologram where the drill needs a head to aim at.
 */
function makeTarget(x, y, { health = 20, track = null, type = "drone" } = {}) {
  const e = new Enemy(x, y, type);
  if (type !== "drone") e._holo = true;
  e.health = e.maxHealth = health;
  e.speed = 0;
  e.def = { ...e.def, damage: 0, speed: 0, sightRange: 0, score: 25 };
  // The alert range was copied from the type before the def above blinded
  // it: left alone, a "target" woke up and shot at you.
  e.alertRange = 0;
  e.state = "idle";
  e._target = true;
  if (track) e._track = { x0: x, y0: y, ...track };
  return e;
}

/**
 * A hologram for the sim hall: a hostile in every way, drawn flickering, whose
 * hits land on the sim's integrity instead of on you (TutorialSystem.simHit).
 */
function makeHolo(x, y, type) {
  const e = makeHostile(x, y, type);
  e._holo = true;
  if (SIM_DAMAGE[type]) e.def = { ...e.def, damage: SIM_DAMAGE[type] };
  return e;
}

/** A real hostile, tuned down for a cadet's first fights. */
function makeHostile(x, y, type) {
  const e = new Enemy(x, y, type);
  const tune = {
    drone: { health: 20, damage: 4, speed: 0.6, attackRate: 1400 },
    glitchling: { health: 18, damage: 4, speed: 0.9, attackRate: 700 },
    henchman: { health: 45, damage: 5, speed: 0.7, attackRate: 1400 },
    sentinel: { health: 80, damage: 8, speed: 0.85, attackRate: 2000 },
  }[type];
  if (tune) {
    e.health = e.maxHealth = tune.health;
    e.def = { ...e.def, damage: tune.damage, speed: e.def.speed * tune.speed, attackRate: tune.attackRate };
    // The AI moves on e.speed, copied from the def at construction.
    e.speed = e.def.speed;
  }
  // A cadet's Sentinel has its front shield, not the energy shield over it:
  // regenerating, that out-healed a pistol at the front, and the evac's
  // Sentinel comes straight at you, so there was no getting round it.
  if (type === "sentinel") e.def = { ...e.def, shieldRegen: false };
  return e;
}

/**
 * Every round in the air gone. Shots live in the entity list as well as
 * g.projectiles: clearing only the latter left a sim's last rounds hanging,
 * drawn and stopped, after it ended.
 */
function clearShots(g) {
  g.projectiles = [];
  g.entities = g.entities.filter((e) => !(e instanceof Projectile));
}

/** Run `fn` `seconds` from now on the prologue's clock (it stops when the game does). */
function setTimeoutGame(t, seconds, fn) {
  t._timers.push({ at: t.clock + seconds, fn });
}

/**
 * A walking route over open floor from (x, y) to (tx, ty): the BFS field the
 * enemies steer by (src/systems/ai-nav.js), followed downhill, kept only at
 * its turns. Falls back to the straight line when there is no way.
 */
function route(map, x, y, tx, ty) {
  const f = buildNavField(map, tx, ty);
  let cx = Math.floor(x);
  let cy = Math.floor(y);
  let d = f.dist[cy * f.w + cx];
  if (!(d >= 0)) return [[tx, ty]];
  const cells = [];
  for (let guard = 0; d > 0 && guard < 600; guard++) {
    let best = null;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = cx + ox;
        const ny = cy + oy;
        const nd = f.dist[ny * f.w + nx];
        if (!(nd >= 0) || nd >= (best?.d ?? d)) continue;
        // No corner cutting: both side cells of a diagonal must be open.
        if (ox && oy && (!(f.dist[cy * f.w + nx] >= 0) || !(f.dist[ny * f.w + cx] >= 0))) continue;
        best = { x: nx, y: ny, d: nd };
      }
    }
    if (!best) break;
    cx = best.x;
    cy = best.y;
    d = best.d;
    cells.push([cx + 0.5, cy + 0.5]);
  }
  // Keep the turns: a point where the direction changes.
  const out = [];
  for (let i = 0; i < cells.length - 1; i++) {
    const [ax, ay] = i ? cells[i - 1] : [Math.floor(x) + 0.5, Math.floor(y) + 0.5];
    const [bx, by] = cells[i];
    const [nx, ny] = cells[i + 1];
    if (Math.sign(bx - ax) !== Math.sign(nx - bx) || Math.sign(by - ay) !== Math.sign(ny - by)) out.push(cells[i]);
  }
  out.push([tx, ty]);
  return out;
}

/**
 * Per-step logic. `enter(t, g)` runs when the step begins (and again when a
 * checkpoint puts you back into it); `update(t, g, dt)` returns true when the
 * step is done. `t.c` is the step's own scratch state, fresh on every enter.
 * `progress(t, g)` is the card's live counter, when it has one.
 */
const LOGIC = {
  arrive: {
    enter(t, g) {
      t.c.phase = "chatter";
      t.lockerShut(g);
      // Facing the door, so the Supervisor walks in where you can see him.
      g.player.angle = -0.1;
      // The squad at their lockers, turned toward each other and the cadet.
      t.squad = SQUAD_AT.map(([x, y], i) => {
        const n = new Npc(x, y, "officer", { name: SQUAD_NAMES[i] ?? null });
        n.faceTo(g.player);
        g.entities.push(n);
        return n;
      });
      t.warmNpc(g, "officerKit");
      t.warmNpc(g, "rasczakKit");
      t.warmNpc(g, "kaelKit");
      t.warmNpc(g, "staff");
      t.warmNpc(g, "clerk");
      if (!t.sup) {
        t.sup = new Npc(SUP_ROUTES.enter[0][0], SUP_ROUTES.enter[0][1], "supervisor", { name: "Supervisor Simon" });
        // Out in the corridor behind the shut door until he comes in. (An
        // inactive entity is swept from the world, so he waits active.)
        t.sup.faceTo({ x: 20, y: 41.5 });
        g.entities.push(t.sup);
      }
    },
    update(t, g) {
      const c = t.c;
      if (c.phase === "chatter" && t.clock > 5) {
        // The Supervisor comes in. Everyone straightens up.
        c.phase = "enter";
        t.openDoors(g, "door1");
        g.audio.doorOpen?.();
        t.sup.active = true;
        t.sup.walk(SUP_ROUTES.enter.slice(1), {
          then: (sup) => {
            // He returns the lieutenant's salute, then turns and returns the
            // cadet's, held a half-beat longer than anyone's. Nothing is
            // said about it; it reads only after he's gone.
            sup.faceTo(t.squad[3]);
            for (const o of t.squad) {
              o.faceTo(sup);
              o.pose("salute", 2.4);
            }
            sup.pose("salute", 1.1);
            setTimeoutGame(t, 1.4, () => {
              sup.faceTo(g.player);
              sup.pose("salute", 1.9);
            });
            c.phase = "orders";
            t.say([
              ["OFFICER", "Sir!", "calm"],
              ["SUPERVISOR", "As you were.", "calm"],
              ["SUPERVISOR", "Engineering's running the Engine hot again this morning. Calibration, they call it. The Bureau wants our people on the chamber door till it's done.", "calm"],
              ["SUPERVISOR", "Lieutenant Rasczak, take both squads down. Kit up. Nobody goes in or out of that chamber without my say-so. Report in on the hour.", "calm"],
              ["LT. RASCZAK", "You heard the man. Everyone in their heavy armor.", "urgent"],
              ["LT. RASCZAK", "We likely won't need it. Keep your heads on a swivel until this thing is done.", "calm"],
            ], { cut: true });
          },
        });
      }
      if (c.phase === "orders" && t.scriptIdle()) {
        // Each to their locker, back to the room; the heavy plate goes on.
        c.phase = "kit";
        c.kitted = 0;
        t.squad.forEach((o, i) => {
          const [kx, ky] = KIT_AT[i];
          setTimeoutGame(t, i * 0.2, () =>
            o.walk([[kx, ky]], {
              speed: 2.0,
              then: (n) => {
                n.faceTo({ x: kx, y: ky < 42 ? ky - 2 : ky + 2 });
                setTimeoutGame(t, 1.6 + (i % 3) * 0.45, () => {
                  n.dress(i === 3 ? "rasczakKit" : i === 1 ? "kaelKit" : "officerKit");
                  g.audio.armorClank?.(g.audio.calculatePan?.(n.x, n.y, g.player.x, g.player.y, g.player.angle) ?? 0);
                  setTimeoutGame(t, 0.5, () => {
                    n.faceTo(t.sup);
                    c.kitted++;
                  });
                });
              },
            }),
          );
        });
      }
      if (c.phase === "kit" && c.kitted >= t.squad.length && t.scriptIdle()) {
        // Kitted up, someone notices the lieutenant's plate isn't the
        // standard issue. The squad has a go; the Supervisor ends it.
        c.phase = "banter";
        const [kael, lt, brandt, okafor] = [t.squad[1], t.squad[3], t.squad[4], t.squad[6]];
        brandt?.faceTo(lt);
        lt?.faceTo(brandt);
        okafor?.faceTo(brandt);
        t.say([
          ["OFFICER", "LT, how come your suit's so much better than the standard issue?", "curious", { as: "OFC. BRANDT" }],
          ["LT. RASCZAK", "Top performers need elite equipment, Brandt. Dedicate yourself to the craft and one day you might earn one too.", "happy"],
          ["OFFICER", "He's dedicated. Mostly to the vending machine.", "happy", { as: "OFC. OKAFOR" }],
          ["SGT. KAEL", "Fancy plate's for people who get shot at, Lieutenant. I'm the one who gets shot.", "calm"],
          ["LT. RASCZAK", "And we're all very grateful, Sergeant. That's why yours weighs more than Brandt's car.", "happy"],
          ["SUPERVISOR", "When you've finished admiring each other, Lieutenant.", "calm"],
          ["LT. RASCZAK", "Sir. Moving out.", "calm"],
        ]);
        kael?.faceTo(lt);
      }
      if (c.phase === "banter" && t.scriptIdle()) {
        // The squads leave for the Engine level, one after another. The
        // Supervisor keeps the cadet back, and two of them have a word for
        // the cadet about it on the way past.
        c.phase = "leave";
        t.squad.forEach((o, i) => {
          o.faceTo(null);
          setTimeoutGame(t, i * 0.6, () => o.walk(OUT_OF_LOCKERS(o.x, o.y), { leave: true, speed: 2.2 }));
        });
        t.say([
          ["SUPERVISOR", "Not you, Cadet. You're staying with me.", "calm"],
          ["OFFICER", "Six years and you're still a cadet. Ugh.", "calm"],
          ["OFFICER", "Hold the fort, Cadet. Somebody's got to mind the coffee.", "happy"],
          ["SUPERVISOR", "R&D sent something up for you this morning. It's in your locker. Put it on, get used to it, and meet me at the range.", "calm"],
        ]);
      }
      return c.phase === "leave" && t.scriptIdle();
    },
  },

  suitUp: {
    waypoint: MY_LOCKER,
    enter(t, g) {
      t.lockerLight(g, true);
      t.c.suited = false;
      setTimeoutGame(t, 0.8, () => t.supWalk(g, "ahead"));
    },
    update: (t) => t.c.suited,
    exit(t, g) {
      t.lockerLight(g, false);
      // The clock the first-shot target is measured from.
      t.suitedAt = t.runClock;
    },
  },

  boot: {
    update: (t) => t.clock > 2.4,
  },

  look: {
    enter(t, g) {
      t.c.prevAngle = g.player.angle;
      t.c.turned = 0;
    },
    update(t, g) {
      let d = g.player.angle - t.c.prevAngle;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      t.c.turned += Math.abs(d);
      t.c.prevAngle = g.player.angle;
      return t.c.turned > 2.5 && t.clock > 3;
    },
  },

  walk: {
    // The marker is the corridor door; any way out of the locker room counts.
    waypoint: { x: 24.5, y: 41.5 },
    enter(t, g) {
      t.openDoors(g, "door1", "door4");
      // The office's clerk, up from the front desk with the post, crossing
      // the corridor ahead of you.
      const nand = t.person(g, "nand");
      nand.x = NAND_ROUTE[0][0];
      nand.y = NAND_ROUTE[0][1] + 1.5;
      setTimeoutGame(t, 1.5, () => nand.walk(NAND_ROUTE, { then: (n) => n.faceTo({ x: 39.5, y: 15 }) }));
    },
    update: (t, g) => !inArea(g.player, "lockers"),
  },

  toRange: {
    waypoint: { x: 36.5, y: 41.5 },
    enter(t, g) {
      t.openDoors(g, "door2");
      // He went on ahead from the locker room; a checkpoint puts him there.
      if (!t.sup?.path?.length) t.supWalk(g, "atRange");
    },
    update: (t, g) => inArea(g.player, "range"),
  },

  // ── Trial: calibration (R&D, first) ────────────────────────────

  /**
   * The Supervisor hands you to Orr, and she walks you to R&D the long way
   * round, talking: what calibration does, that it might not take, and why
   * it's you. Done when you're in the bay, by whichever way you came.
   */
  toLab: {
    waypoint: { x: 62.5, y: 10.5 },
    enter(t, g) {
      t.openDoors(g, "door2", "door4", "door15");
      if (t.cert.run?.trial !== "calibration") t._beginTrial("calibration");
      if (!t.sup?.path?.length) t.supWalk(g, "atRange");
      const orr = t.person(g, "orr");
      orr.faceTo(g.player);
      t.c.go = false;
      t.c.waited = 0;
      t.c.rest = null;
    },
    update(t, g) {
      const c = t.c;
      const p = g.player;
      const orr = t.person(g, "orr");
      // She lets him say his piece and waits for you: she sets off once she
      // is talking (or, if the comms never free up, after a while).
      if (!c.go) {
        orr.faceTo(p);
        c.waited += g.deltaTime || 0;
        if (g.ariaComms?.message?.speaker === "DR. ORR" || c.waited > ORR_WAIT_MAX) c.go = true;
        return inArea(p, "rnd");
      }
      // Then she walks with you: ahead of you and out of earshot, she stops
      // and waits; caught up, she goes on.
      const s = STATIONS.orr;
      const there = Math.hypot(orr.x - s.x, orr.y - s.y) < 0.45;
      const behind = !there && t.leftBehind(orr, s, ORR_LEASH - ESCORT_LEASH);
      if (behind && orr.walking) {
        c.rest = orr.path.map((q) => [q.x, q.y]);
        orr.path = [];
        orr.faceTo(p);
        if (!c.called) {
          c.called = true;
          t.say([["DR. ORR", "This way, Cadet. R&D's at the top of the east wing.", "calm"]], { first: true });
        }
      } else if (!behind && !orr.walking && !there) {
        orr.speed = ORR_WALK;
        if (c.rest?.length) orr.walk(c.rest, { then: (m) => m.faceTo(s.face) });
        else t.toStation(g, "orr");
        c.rest = null;
      }
      return inArea(p, "rnd");
    },
  },

  /**
   * The rig tunes the suit to the cadet: stand on its pad, in the lit ring,
   * and hold still while Orr reads body, nerves and mind. Off the pad, or
   * moving on it, the reading waits; it never resets.
   */
  calibrate: {
    waypoint: RIG_AT,
    enter(t, g) {
      t.c.read = 0;
      t.c.said = 0;
      t.c.lastX = g.player.x;
      t.c.lastY = g.player.y;
      t.toStation(g, "orr", { snap: true });
      t.c.rig = g.entities.find((e) => e.type === "prop" && e.propType === "telemetry_rig");
      if (t.c.rig) t.c.rig.wait = 1;
    },
    update(t, g) {
      const p = g.player;
      const still = Math.hypot(p.x - t.c.lastX, p.y - t.c.lastY) < 0.02;
      t.c.lastX = p.x;
      t.c.lastY = p.y;
      const on = t.near(g, RIG_AT.x, RIG_AT.y, 0.75);
      if (on && still) t.c.read += g.deltaTime;
      if (t.c.rig) {
        t.c.rig.scan = on ? 1 : 0;
        t.c.rig.wait = on ? 0 : 1;
      }
      const k = t.c.read / READ_TIME;
      while (t.c.said < READ_LINES.length && k >= READ_LINES[t.c.said][0]) {
        const line = READ_LINES[t.c.said++][1];
        if (t.scriptIdle()) t.say([line]);
      }
      return k >= 1;
    },
    progress: (t, g) => {
      if (!t.near(g, RIG_AT.x, RIG_AT.y, 0.75)) return t.c.read > 0 ? "BACK ON THE PAD · THE READING WAITS" : "STAND ON THE PAD · INSIDE THE LIT RING";
      const k = t.c.read / READ_TIME;
      const stage = READ_STAGES.find(([at]) => k < at)?.[1] ?? "MIND";
      return `CALIBRATING ${Math.min(100, Math.round(k * 100))}% · ${stage} · HOLD STILL`;
    },
    exit(t) {
      if (t.c.rig) t.c.rig.scan = t.c.rig.wait = 0;
      t.say([["DR. ORR", "There. It took. It's yours now.", "happy"]], { keep: true });
    },
  },

  // ── Certification Day: the hub ─────────────────────────────────

  /**
   * The sheet, with three trials on it, each started with the one who runs
   * it: the Supervisor when you're on his range; Vale when you reach her in
   * the training hall; Lin when you tell her you're ready (interact, at her
   * booth), after she has told you what the sim is.
   */
  certify: {
    get waypoint() {
      return null; // the nearest trial still to do, set in update
    },
    enter(t, g) {
      // The floor opens up: every trial's way in.
      t.openDoors(g, "door2", "door3", "door4", "door5", "door9", "door13", "door15", "door16");
      const cert = t.cert;
      if (!cert.done.weapons && !g.player.weapons.includes(PISTOL)) {
        t.place(g, "pistol", new Pickup(TRIAL_START.weapons.x, TRIAL_START.weapons.y, "weapon", { weaponId: PISTOL }));
      }
      if (!cert.briefed) {
        cert.briefed = true;
        t.say(t.def.brief, { keep: true });
      }
    },
    update(t, g) {
      const p = g.player;
      const cert = t.cert;
      const todo = PROLOGUE_TRIALS.filter((tr) => !cert.done[tr.id] && TRIAL_START[tr.id]);
      const nearest = todo
        .map((tr) => ({ id: tr.id, ...TRIAL_START[tr.id] }))
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      g.objectiveWaypoint = nearest ? { x: nearest.x, y: nearest.y } : null;
      const vale = t.people.vale;
      const lin = t.people.lin;
      // Into the hall, Vale calls you over; into the sim hall, Lin briefs you from her booth.
      if (!cert.done.mobility && inArea(p, "track") && !cert.valeCalled && vale && !t.near(g, vale.x, vale.y, VALE_REACH + 2)) {
        cert.valeCalled = true;
        vale.faceTo(p);
        t.say([["VALE", "Cadet! Over here, lane four. Warm up first.", "happy"]]);
      }
      if (!cert.done.combat && inArea(p, "arena") && !cert.linBriefed) {
        cert.linBriefed = true;
        lin?.faceTo(p);
        // She's in front of you: ahead of whatever the station has to say.
        t.say(LIN_BRIEF, { first: true });
      }
      const starts = {
        weapons: () => inArea(p, "range"),
        mobility: () => inArea(p, "track") && !!vale && t.near(g, vale.x, vale.y, VALE_REACH),
        combat: () => !!t.c.simGo,
      };
      for (const tr of todo) {
        if (starts[tr.id]()) {
          t.c.pick = tr.id;
          return true;
        }
      }
      return false;
    },
    progress: (t, g) => t.sheetText() + (t.cert.linBriefed && !t.cert.done.combat && inArea(g.player, "arena") ? "\nLIN · READY WHEN YOU ARE" : ""),
  },

  // ── Trial: weapons (the range) ─────────────────────────────────

  pistol: {
    waypoint: { x: 38.5, y: 42.5 },
    enter(t, g) {
      if (!g.player.weapons.includes(PISTOL)) t.place(g, "pistol", new Pickup(38.5, 42.5, "weapon", { weaponId: PISTOL }));
      if (!t.sup?.path?.length) t.supWalk(g, "atRange");
    },
    update: (t, g) => g.player.weapons.includes(PISTOL),
  },

  fire: {
    waypoint: { x: 52.5, y: 42.5 },
    enter(t, g) {
      t.spawnTargets(g, "fire", [
        [51.5, 41.5],
        [51.5, 42.5],
        [51.5, 43.5],
      ]);
    },
    update: (t) => t.c.kills >= 3,
    progress: (t) => `TARGETS ${Math.min(3, t.c.kills)} / 3`,
    exit: (t, g) => t.clearTargets(g, "fire"),
  },

  ads: {
    waypoint: { x: 53.5, y: 42.5 },
    enter(t, g) {
      t.spawnTargets(g, "ads", [
        [53.5, 39.5],
        [53.5, 45.5],
      ]);
    },
    update(t, g) {
      // Missed with the hip? The drill re-racks until two fall to aimed fire.
      if (t.alive(g, "ads") === 0 && t.c.aimedKills < 2) t.spawnTargets(g, "ads", [[53.5, 41.5], [53.5, 43.5]]);
      return t.c.aimedKills >= 2;
    },
    progress: (t) => `AIMED KILLS ${Math.min(2, t.c.aimedKills)} / 2`,
    exit: (t, g) => t.clearTargets(g, "ads"),
  },

  moving: {
    waypoint: { x: 52.5, y: 42.5 },
    enter(t, g) {
      t.c.wave = 0;
    },
    update(t, g) {
      if (t.alive(g, "moving") === 0 && t.c.heads < 2) {
        // A fresh pair each time both are down, sliding the length of the lane.
        const phase = t.c.wave++;
        t.spawnTargets(
          g,
          "moving",
          [
            [52.5, 42.5, { amp: 2.6, speed: 1.3, phase }],
            [54.5, 42.5, { amp: 2.6, speed: 1.0, phase: phase + Math.PI }],
          ],
          // Humanoid holograms, so there is a head to aim at: one pistol
          // headshot (37.5) drops one, a body shot (15) does not.
          30,
          "henchman",
        );
      }
      return t.c.heads >= 2;
    },
    progress: (t) => `HEADSHOT KILLS ${Math.min(2, t.c.heads)} / 2`,
    exit: (t, g) => t.clearTargets(g, "moving"),
  },

  shotgun: {
    waypoint: { x: 43.5, y: 42.5 },
    enter(t, g) {
      if (!g.player.weapons.includes(SHOTGUN)) t.place(g, "shotgun", new Pickup(43.5, 42.5, "weapon", { weaponId: SHOTGUN }));
      t.c.racked = false;
    },
    update(t, g) {
      const p = g.player;
      const has = p.weapons.includes(SHOTGUN);
      if (has && !t.c.racked) {
        t.c.racked = true;
        t.spawnTargets(g, "shotgun", [
          [47.5, 41.5],
          [47.5, 43.5],
        ]);
      }
      if (t.c.racked && t.alive(g, "shotgun") === 0 && t.c.shotgunKills < 2) {
        t.spawnTargets(g, "shotgun", [[47.5, 42.5]]);
      }
      return t.c.shotgunKills >= 2;
    },
    progress: (t, g) =>
      g.player.weapons.includes(SHOTGUN) ? `SHOTGUN KILLS ${Math.min(2, t.c.shotgunKills)} / 2` : "PICK UP THE SHOTGUN",
    exit: (t, g) => t.clearTargets(g, "shotgun"),
  },

  /**
   * The active reload, on the pistol (src/systems/reload.js): two landed in
   * the band and the trial goes on. Targets stay up down the lane to empty
   * the mag on; a jam gets a word from the Supervisor and another go. The
   * counts are the game's (activeReload.stats), taken from here on.
   */
  reloadDrill: {
    enter(t, g) {
      const p = g.player;
      // Shotgun away: the drill is the sidearm's.
      if (p.weapons.includes(PISTOL)) p.currentWeapon = p.weapons.indexOf(PISTOL);
      const s = g.activeReload?.stats ?? {};
      t.c.seen = { hits: s.hits ?? 0, jams: s.jams ?? 0 };
      t.c.landed = 0;
      t.c.jammed = 0;
    },
    update(t, g) {
      const ar = g.activeReload;
      if (!ar) return true;
      const s = ar.stats;
      if (s.hits > t.c.seen.hits) {
        if (ar.last?.weaponId === PISTOL) t.c.landed += s.hits - t.c.seen.hits;
        t.c.seen.hits = s.hits;
      }
      if (s.jams > t.c.seen.jams) {
        t.c.seen.jams = s.jams;
        t.say([["SUPERVISOR", JAM_LINES[t.c.jammed++ % JAM_LINES.length], "calm"]]);
      }
      if (t.alive(g, "reloadDrill") === 0) {
        t.spawnTargets(g, "reloadDrill", [
          [51.5, 41.5],
          [51.5, 42.5],
          [51.5, 43.5],
        ], 30);
      }
      return t.c.landed >= RELOAD_GOAL;
    },
    progress: (t) => `ACTIVE RELOADS ${Math.min(RELOAD_GOAL, t.c.landed ?? 0)} / ${RELOAD_GOAL}${t.c.jammed ? ` · JAMS ${t.c.jammed}` : ""}`,
    exit(t, g) {
      t.clearTargets(g, "reloadDrill");
      t.say([["SUPERVISOR", "That's the rhythm. Keep it.", "calm"]]);
    },
  },

  ammo: {
    waypoint: { x: 37.5, y: 45.5 },
    enter(t, g) {
      t.pickupsOpen = true;
      t.place(g, "ammo", new Pickup(37.5, 45.5, "ammo"));
      t.pickedUp = false;
    },
    update: (t) => t.pickedUp,
  },

  // ── Trial: mobility (the training hall: Vale's warm-up, then the run) ──

  warmSprint: {
    enter(t, g) {
      t.people.vale?.faceTo(g.player);
    },
    update(t, g) {
      if (g.player.isSprinting) t.c.sprint = (t.c.sprint || 0) + g.deltaTime;
      return t.c.sprint > WARM_SPRINT;
    },
    progress: (t) => `SPRINT ${Math.min(WARM_SPRINT, t.c.sprint || 0).toFixed(1)} / ${WARM_SPRINT.toFixed(1)} s`,
  },

  warmCrouch: {
    enter(t, g) {
      t.c.x = g.player.x;
      t.c.y = g.player.y;
      t.c.moved = 0;
    },
    update(t, g) {
      const p = g.player;
      if (p.isCrouching) t.c.moved += Math.hypot(p.x - t.c.x, p.y - t.c.y);
      t.c.x = p.x;
      t.c.y = p.y;
      return t.c.moved > WARM_CROUCH;
    },
    progress: (t) => `CROUCH-WALK ${Math.min(WARM_CROUCH, t.c.moved || 0).toFixed(1)} / ${WARM_CROUCH.toFixed(1)} m`,
  },

  warmSlide: {
    update: (t) => t.c.slides >= 1,
    progress: (t) => `SLIDES ${Math.min(1, t.c.slides)} / 1`,
  },

  warmDash: {
    update: (t) => t.c.dashes >= 1,
    progress: (t) => `DASHES ${Math.min(1, t.c.dashes)} / 1`,
  },

  // The run: the clock waits for the start line (startCourse's `held`).
  sprint: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      t.startCourse(g, 0);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.sprint),
    progress: (t) => t.courseText(),
  },

  slide: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      // Picked up past the start (a checkpoint, a skip): the clock's running.
      if (!t.course || t.course.held) t.startCourse(g, SEGMENT_END.sprint + 1);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.slide),
    progress: (t) => t.courseText(),
  },

  tunnel: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      if (!t.course || t.course.held) t.startCourse(g, SEGMENT_END.slide + 1);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.tunnel),
    progress: (t) => t.courseText(),
  },

  dash: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      if (!t.course || t.course.held) t.startCourse(g, SEGMENT_END.tunnel + 1);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.dash),
    progress: (t) => t.courseText(),
  },

  runHome: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      if (!t.course || t.course.held) t.startCourse(g, SEGMENT_END.dash + 1);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.runHome),
    progress: (t) => t.courseText(),
    exit: (t, g) => t.endCourse(g),
  },

  // ── Trial: combat (the sim hall) ───────────────────────────────

  lab: {
    waypoint: { x: 29.5, y: 9.5 },
    enter(t, g) {
      t.sim = { integrity: null }; // the exhibits cannot hurt you, and cannot fail you
      t.c.i = -1;
      t.c.wait = 0.8;
      t.toStation(g, "lin", { snap: true });
      // Combat before the range: the sim needs something to point.
      // (Lin already said what it is, from the booth: the hub's LIN_BRIEF.)
      const p = g.player;
      if (!p.weapons.includes(PISTOL)) {
        t.place(g, "simPistol", new Pickup(p.x, p.y, "weapon", { weaponId: PISTOL }));
        t.say([["LIN", "Range first, usually. Here: standard issue. Point the loud end at the holograms.", "happy"]]);
      }
    },
    update(t, g) {
      if (t.alive(g, "lab") > 0) return false;
      t.c.wait -= g.deltaTime;
      if (t.c.wait > 0) return false;
      t.c.i++;
      if (t.c.i >= EXHIBITS.length) return true;
      const ex = EXHIBITS[t.c.i];
      t.spawnHostiles(g, "lab", [[EXHIBIT_AT.x, EXHIBIT_AT.y, ex.type]], makeHolo, true);
      t.people.lin?.pose("point", 1.6);
      g.audio.powerFlicker?.();
      t.say(ex.lines);
      t.c.wait = 1.4;
      return false;
    },
    progress: (t) => {
      const ex = EXHIBITS[Math.max(0, Math.min(EXHIBITS.length - 1, t.c.i))];
      return `EXHIBIT ${Math.max(1, t.c.i + 1)} / ${EXHIBITS.length} · ${ex.name}`;
    },
    exit(t, g) {
      t.sim = null;
      t.clearTag(g, "lab");
    },
  },

  /**
   * Cover (src/systems/cover-play.js), on two holo blocks before the waves:
   * take the first, pop up and drop two targets, blind-fire one more, then
   * slide to the second. The targets fire into the block while you are down
   * behind it, so a stopped round is felt, and a hit while you're up lands
   * on the sim, not you. The counts are the game's (coverStats), taken from
   * here on.
   */
  coverDrill: {
    enter(t, g) {
      t.sim = { integrity: null };
      t.raiseCover(g, "drill");
      t.c.stage = "take";
      t.c.base = { ...g.coverStats };
      t.c.blindShots = 0;
      t.c.shots = g.shotsFired || 0;
      t.c.volley = DRILL_VOLLEY;
      t.c.retry = 1;
    },
    update(t, g) {
      const p = g.player;
      const c = t.c;
      const got = (k) => (g.coverStats?.[k] ?? 0) - (c.base[k] ?? 0);
      // Someone stood where a block wanted to rise: try again once they move.
      if (t._cover.length < COVER_LAYOUTS.drill.length && (c.retry -= g.deltaTime) <= 0) {
        c.retry = 1;
        t.raiseCover(g, "drill");
      }
      // Rounds fired from cover without the sights up: blind fire.
      const fired = (g.shotsFired || 0) - c.shots;
      c.shots = g.shotsFired || 0;
      if (fired > 0 && p.cover && !p.isAiming) c.blindShots += fired;
      if (got("shotsBlocked") > 0 && !c.feltIt) {
        c.feltIt = true;
        t.say([["ARIA", "Hear that? That one had your name on it.", "happy"]]);
      }
      if (c.stage === "take") {
        g.objectiveWaypoint = DRILL_COVER.first;
        if (got("tookCover") + got("coverDashes") < 1) return false;
        c.stage = "peek";
        t.spawnTargets(g, "coverDrill", DRILL_TARGETS, 20, "henchman");
        t.say([["LIN", "They shoot back now. Stay down and it hits the block. Aim to pop up, fire, drop.", "calm"]]);
      } else if (c.stage === "peek") {
        if (got("peekKills") < 2) {
          if (t.alive(g, "coverDrill") === 0) t.spawnTargets(g, "coverDrill", DRILL_TARGETS, 20, "henchman");
        } else {
          c.stage = "blind";
          t.clearTargets(g, "coverDrill");
          t.spawnTargets(g, "coverDrill", [DRILL_BLIND_AT], 10, "henchman");
          c.blindShots = 0;
          t.say([["LIN", "Now don't aim. Fire over the top. It's wild, but it keeps their heads down.", "excited"]]);
        }
      } else if (c.stage === "blind") {
        if (got("blindFireKills") >= 1 || c.blindShots >= DRILL_BLIND_SHOTS) {
          c.stage = "dash";
          t.say([["LIN", "Next block, on your left. Look at it and go. Stay low.", "calm"]]);
        } else if (t.alive(g, "coverDrill") === 0) t.spawnTargets(g, "coverDrill", [DRILL_BLIND_AT], 10, "henchman");
      } else if (c.stage === "dash") {
        g.objectiveWaypoint = DRILL_COVER.second;
        if (got("coverDashes") >= 1) return true;
      }
      t.drillVolley(g);
      return false;
    },
    progress: (t, g) => {
      const c = t.c;
      if (!c.base) return "";
      const got = (k) => (g.coverStats?.[k] ?? 0) - (c.base[k] ?? 0);
      const at = ["take", "peek", "blind", "dash"].indexOf(c.stage);
      const n = (i, have, of) => `${at > i ? of : Math.min(of, have)}/${of}`;
      return [
        `COVER ${n(0, got("tookCover") + got("coverDashes"), 1)}`,
        `PEEK KILLS ${n(1, got("peekKills"), 2)}`,
        `BLIND FIRE ${n(2, got("blindFireKills"), 1)}`,
        `COVER DASH ${n(3, got("coverDashes"), 1)}`,
      ].join(" · ");
    },
    exit(t, g) {
      t.sim = null;
      t.clearTag(g, "coverDrill");
      clearShots(g);
      t.say([["ARIA", "Like you've been doing it all your life.", "warm"]]);
    },
  },

  sim: {
    enter(t, g) {
      t.sim = { integrity: 100, failed: false };
      t.c.wave = 0;
      t.c.delay = 2;
      t.c.fails = 0;
      t.raiseCover(g, SIM_COVER[0]);
    },
    update(t, g) {
      const sim = t.sim;
      if (sim.failed) {
        // Integrity gone: the sim resets, and so do you.
        t.c.fails++;
        t.clearTag(g, "sim");
        clearShots(g);
        sim.integrity = 100;
        sim.failed = false;
        t.c.wave = 0;
        t.c.spawned = false;
        t.c.delay = 2.5;
        t.raiseCover(g, SIM_COVER[0]);
        g.glitchEffect = 0.7;
        t.say([["ARIA", t.c.fails === 1 ? "Simulation failed. You'd be dead twice over. Again, and use the cover this time." : "Again. Pick a target, break line of sight, reload your nerve.", "worried"]], { cut: true });
        return false;
      }
      if (t.c.wave < SIM_WAVES.length) {
        if (!t.c.spawned) {
          t.c.delay -= g.deltaTime;
          if (t.c.delay <= 0) t.spawnHostiles(g, "sim", SIM_WAVES[t.c.wave], makeHolo, true);
          return false;
        }
        if (t.alive(g, "sim") > 0) return false;
        t.c.wave++;
        t.c.spawned = false;
        t.c.delay = 2.5;
        if (t.c.wave < SIM_WAVES.length) {
          // The floor rearranges itself for the next wave.
          t.raiseCover(g, SIM_COVER[t.c.wave]);
          t.say([["LIN", "Wave down. New layout coming up. Next one's heavier.", "excited"]]);
        }
        return false;
      }
      return true;
    },
    progress: (t) => `WAVE ${Math.min(t.c.wave + 1, SIM_WAVES.length)} / ${SIM_WAVES.length} · SIM INTEGRITY ${Math.max(0, Math.round(t.sim?.integrity ?? 0))}%`,
    exit(t, g) {
      t.sim = null;
      t.clearTag(g, "sim");
      clearShots(g);
      // The sim's off: its holo cover sinks with it.
      t.raiseCover(g, null);
    },
  },

  // ── Six forty-seven ────────────────────────────────────────────

  signOff: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      t.openDoors(g, "door5", "door13");
      // The Supervisor, Orr and Lin by Lift B, waiting on the courier.
      t.supTo(g, SUP_AT_LIFT.x, SUP_AT_LIFT.y);
      t.toStation(g, "orr", { at: { x: 31.4, y: 7.2, face: LIFT_CAR } });
      t.toStation(g, "lin", { at: { x: 26.5, y: 8.6, face: LIFT_CAR } });
      // He noticed the best of the trials, and says so while you walk over.
      const line = t.bestTrialLine();
      if (line) setTimeoutGame(t, 0.1, () => t.say([["SUPERVISOR", line, "calm"]]));
    },
    update(t, g) {
      const sup = t.sup;
      g.objectiveWaypoint = sup ? { x: sup.x, y: sup.y } : SUP_AT_LIFT;
      // In the sim hall, Orr checks the suit one last time as you cross to
      // him: the anchor sees what it shouldn't. The setup for the minute.
      if (!t.c.orrSaid && inArea(g.player, "arena")) {
        t.c.orrSaid = true;
        t.say(ANCHOR_LINES);
      }
      if (!sup) return t.near(g, SUP_AT_LIFT.x, SUP_AT_LIFT.y, 2.6);
      return t.near(g, sup.x, sup.y, 2.6) && inArea(g.player, "arena");
    },
    exit(t) {
      // Straight to him (or a skip): she still says it, before the doors open.
      if (!t.c.orrSaid) t._anchorLate = true;
    },
  },

  sixFortySeven: {
    enter(t, g) {
      t.c.phase = "wait";
      t.c.at = 0;
      if (t._anchorLate) t.say(ANCHOR_LINES);
      t._anchorLate = false;
    },
    update(t, g) {
      const c = t.c;
      if (c.phase === "wait" && t.clock > 1.5 && (t.scriptIdle() || t.clock > 8)) {
        // Lift B opens on its own. What steps out of it isn't the courier.
        c.phase = "lift";
        c.at = t.clock;
        t.lift(g, true);
        g.audio.doorOpen?.();
        t.say(t.def.lines, { cut: true });
        const e = makeHostile(LIFT_CAR.x, LIFT_CAR.y + 0.2, "glitchling");
        e._tutTag = "glitch";
        e._corrupt = true;
        e.state = "chase";
        e.lastAttackTime = g.time + 1500;
        e._lastSeen = { x: g.player.x, y: g.player.y };
        // The open doors are its telegraph: there at once, held from firing a moment.
        startArrival(g, { x: e.x, y: e.y, enemy: e, via: "lift", tag: "glitch" });
        g.totalEnemies = (g.totalEnemies || 0) + 1;
        g.audio.powerFlicker?.();
        t.flickerUntil = t.clock + 0.5;
        // Orr goes to look.
        t.people.orr?.walk([[32.4, 5.6]], { speed: 1.2, then: (n) => n.faceTo(LIFT_CAR) });
      }
      if (c.phase === "lift" && t.clock - c.at > 3) {
        // 06:47. The Engine pulses, and everyone on the floor without an
        // anchor stops where they stand. The cadet doesn't.
        c.phase = "stopped";
        t.minute(g);
      }
      if (c.phase === "wait") return false;
      return t.alive(g, "glitch") === 0 || t.clock - c.at > 12;
    },
    exit(t, g) {
      t.clearTag(g, "glitch");
      if (t.c.phase !== "stopped") t.minute(g);
      t.say([["SUPERVISOR", "Doctor Orr? ...Orr. Cadet, don't touch her. Don't anybody touch her.", "afraid"]]);
    },
  },

  // ── The vest: the Supervisor to his armour, and back ───────────

  /**
   * He can barely walk: slow, the minute catching him every few steps. He
   * won't go far ahead of you, and stops while anything that came through
   * is still up. Done when he's at his locker and you're in the room.
   */
  escort: {
    get waypoint() {
      return null; // on him, set in update
    },
    enter(t, g) {
      t.warmNpc(g, "supervisorKit");
      t.supLocker(g, false);
      const sup = t.supFree(g);
      // Put back at the lift by a checkpoint, or found there after the minute.
      if (t._respawning || !sup.active) {
        sup.x = SUP_AT_LIFT.x;
        sup.y = SUP_AT_LIFT.y;
      }
      sup.dress("supervisor");
      t.c.wave = 0;
      t.c.stutter = ESCORT_STUTTER;
      t.c.rest = route(g.map, sup.x, sup.y, SUP_LOCKER.x, SUP_LOCKER.y);
      sup.walk(t.c.rest, { speed: ESCORT_SPEED });
    },
    update(t, g, dt) {
      const sup = t.sup;
      if (!sup) return true;
      const c = t.c;
      const p = g.player;
      // Things come through ahead of him as he gets down the corridor.
      const next = ESCORT_WAVES[c.wave];
      if (next && sup.y > next.after) {
        c.wave++;
        t.arrive(g, "escort", next.spots, { again: true });
        if (c.wave === 1) t.say([["ARIA", "Tear, ahead of him. Keep it off him.", "urgent"]]);
      }
      const foes = t.alive(g, "escort");
      const there = Math.hypot(sup.x - SUP_LOCKER.x, sup.y - SUP_LOCKER.y) < 0.45;
      // The minute catches at him: half a second stopped, then he goes on.
      if (!sup.frozen && !there && (c.stutter -= g.deltaTime || 0) <= 0) {
        c.stutter = ESCORT_STUTTER;
        t.supHold(sup);
        sup.freeze();
        g.glitchEffect = Math.max(g.glitchEffect || 0, 0.2);
        setTimeoutGame(t, 0.5, () => sup.frozen && sup.thaw());
      }
      const wait = foes > 0 || t.leftBehind(sup, SUP_LOCKER);
      if (wait && sup.walking) {
        t.supHold(sup);
        sup.faceTo(foes ? g.entities.find((e) => e._tutTag === "escort" && e.type === "enemy" && e.health > 0) ?? p : p);
        if (!foes && !c.called) {
          c.called = true;
          t.say([["SUPERVISOR", "Cadet. With me.", "calm"]]);
        }
      } else if (!wait && !sup.walking && !sup.frozen && !there) {
        if (!c.rest?.length) c.rest = route(g.map, sup.x, sup.y, SUP_LOCKER.x, SUP_LOCKER.y);
        sup.walk(c.rest, { speed: ESCORT_SPEED });
      }
      g.objectiveWaypoint = { x: sup.x, y: sup.y };
      return there && c.wave >= ESCORT_WAVES.length && foes === 0 && inArea(p, "lockers");
    },
    progress: (t, g) => (t.alive(g, "escort") ? `HOSTILES ${t.alive(g, "escort")} · KEEP THEM OFF HIM` : "STAY WITH THE SUPERVISOR"),
  },

  /**
   * At his locker: the door open, his coat off, the plate on. One line, and
   * he's himself again. A moment to watch, not a fight.
   */
  kitUp: {
    enter(t, g) {
      const sup = t.supFree(g);
      if (Math.hypot(sup.x - SUP_LOCKER.x, sup.y - SUP_LOCKER.y) > 0.6) {
        sup.x = SUP_LOCKER.x;
        sup.y = SUP_LOCKER.y;
      }
      sup.path = [];
      sup.faceTo({ x: SUP_LOCKER.x, y: SUP_LOCKER_CELL.y - 1 });
      t.c.dressed = false;
      setTimeoutGame(t, 0.6, () => {
        t.supLocker(g, true);
        g.audio.doorOpen?.();
        // He says it to the locker, getting the plate out.
        t.say([["SUPERVISOR", "If Rasczak's people couldn't hold in that plate, I'm not going down there without mine.", "calm"]], { cut: true });
      });
      setTimeoutGame(t, 2.6, () => {
        sup.dress("supervisorKit");
        g.audio.armorClank?.(g.audio.calculatePan?.(sup.x, sup.y, g.player.x, g.player.y, g.player.angle) ?? 0);
        g.screenShake = Math.max(g.screenShake || 0, 1);
      });
      setTimeoutGame(t, 3.2, () => {
        sup.faceTo(g.player);
        t.c.dressed = true;
      });
    },
    update: (t) => t.c.dressed && t.scriptIdle() && t.clock > 4,
  },

  /** Back to Lift B, at his pace now: the suit carries him. Done when he's at the lift and you're in the sim hall. */
  escortBack: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      const sup = t.supFree(g);
      sup.dress("supervisorKit");
      t.supLocker(g, true);
      t.c.rest = route(g.map, sup.x, sup.y, SUP_AT_LIFT.x, SUP_AT_LIFT.y);
      sup.walk(t.c.rest, { speed: NPC_TYPES.supervisorKit.speed });
    },
    update(t, g) {
      const sup = t.sup;
      if (!sup) return true;
      const p = g.player;
      const there = Math.hypot(sup.x - SUP_AT_LIFT.x, sup.y - SUP_AT_LIFT.y) < 0.6;
      const far = t.leftBehind(sup, SUP_AT_LIFT, 2);
      if (far && sup.walking) t.supHold(sup);
      else if (!far && !sup.walking && !there) {
        if (!t.c.rest?.length) t.c.rest = route(g.map, sup.x, sup.y, SUP_AT_LIFT.x, SUP_AT_LIFT.y);
        sup.walk(t.c.rest, { speed: NPC_TYPES.supervisorKit.speed });
      }
      if (there && !sup.walking) sup.faceTo(p);
      g.objectiveWaypoint = { x: sup.x, y: sup.y };
      return there && inArea(p, "arena");
    },
  },

  alarm: {
    // He calls the lift and steps in; the marker is the car, beside him.
    // Once he has refused you, nothing: you watch the doors close.
    get waypoint() {
      return null;
    },
    // The klaxon cuts in under the Supervisor.
    enter(t, g) {
      t.c.armed = false;
      t.openDoors(g, "door4");
    },
    update(t, g) {
      const c = t.c;
      const p = g.player;
      const sup = t.sup;
      if (!c.armed && t.clock > 1 && (t.scriptIdle() || t.clock > 3)) {
        c.armed = true;
        c.at = t.clock;
        g.audio.alarmKlaxon?.();
        g.screenShake = 4;
        g.glitchEffect = 0.6;
        t.alert = true;
        t.say(t.def.lines, { cut: true });
        // Into Lift B at a run, holding it for you; you think you're going too.
        t.lift(g, true);
        sup?.thaw?.(); // torn free of 06:47 by now, however fast you got here
        sup?.walk(SUP_ROUTES.leave, {
          speed: 3.4,
          then: (n) => {
            n.faceTo(g.player);
            c.inCar = true;
            c.carAt = t.clock;
          },
        });
      }
      if (!c.armed) return false;
      const toCar = Math.hypot(p.x - LIFT_CAR.x, p.y - LIFT_CAR.y);
      // You go to step in with him (or hang back): he puts you out of the
      // car and locks it to his badge.
      if (c.inCar && !c.refused && (toCar < ALARM_REFUSE_AT || t.clock - c.carAt > ALARM_REFUSE_WAIT)) {
        c.refused = true;
        c.refusedAt = t.clock;
        t.say(ALARM_REFUSAL, { cut: true });
        if (toCar < ALARM_REFUSE_AT + 0.6) {
          shovePlayer(p, Math.atan2(p.y - LIFT_CAR.y, p.x - LIFT_CAR.x), 1.4, g.map);
          g.screenShake = Math.max(g.screenShake || 0, 3);
          g.audio.armorClank?.(0);
        }
      }
      // Until the doors shut, the car is his: step back in and he puts you out again.
      if (c.refused && !c.shut && toCar < ALARM_REFUSE_AT - 0.4) {
        shovePlayer(p, Math.atan2(p.y - LIFT_CAR.y, p.x - LIFT_CAR.x), 1.0, g.map);
      }
      if (c.refused && !c.shut && t.clock - c.refusedAt > ALARM_DOORS_AFTER) {
        c.shut = true;
        c.shutAt = t.clock;
        t.liftWant = false;
        t.supDown = true;
      }
      g.objectiveWaypoint = !c.refused && sup ? { x: LIFT_CAR.x, y: LIFT_CAR.y + 1.2 } : null;
      // The doors close on him, and the floor tears open between you and them.
      return c.shut && t.clock - c.shutAt > 1.2;
    },
  },

  // ── The breach ─────────────────────────────────────────────────

  cover: {
    // First the sim hall, where the lift just shut; then his office, where
    // the override is, through the rest of them.
    get waypoint() {
      return null;
    },
    enter(t, g) {
      t.alert = true;
      t.lift(g, false);
      t.c.wave = 0;
      // Through tears in the hall: each glows and crackles before it opens.
      t.arrive(g, "cover", COVER_WAVES[0]);
    },
    update(t, g) {
      const c = t.c;
      if (c.wave === 0 && t.cleared(g, "cover")) {
        c.wave = 1;
        t.say(COVER_TO_OFFICE, { cut: true });
        t.arrive(g, "cover", COVER_WAVES[1], { again: true });
        return false;
      }
      if (c.wave === 1) g.objectiveWaypoint = { x: 37.5, y: 20.5 };
      return c.wave === 1 && t.cleared(g, "cover");
    },
    progress: (t, g) => `HOSTILES ${t.alive(g, "cover")}`,
  },

  patch: {
    waypoint: { x: 44.5, y: 21.5 },
    enter(t, g) {
      t.alert = false;
      t.pickupsOpen = true;
      t.openDoors(g, "door6");
      t.place(g, "patch", new Pickup(44.5, 21.5, "health"));
      t.place(g, "patchAmmo", new Pickup(48.5, 21.5, "ammo"));
      t.pickedUp = false;
    },
    update: (t) => t.pickedUp,
  },

  shield: {
    enter(t, g) {
      t.arrive(g, "shield", [[54.5, 20.5, "sentinel"]]);
    },
    update: (t, g) => t.cleared(g, "shield"),
  },

  chrono: {
    enter(t, g) {
      g.player.chronoEnergy = g.player.maxChronoEnergy;
      t.c.held = 0;
    },
    update(t, g) {
      if (g.player.chronoActive) t.c.held += g.deltaTime;
      return t.c.held > 1.5;
    },
    progress: (t) => `SHIFT ${Math.min(1.5, t.c.held).toFixed(1)} / 1.5 s`,
  },

  vents: {
    waypoint: { x: 29.5, y: 29.5 },
    enter(t, g) {
      t.vents = { clock: 0, cooldown: 0, puff: 0, lights: [] };
    },
    update(t, g, dt) {
      t.updateVents(g, dt);
      return g.player.y > 27.6 && g.player.x > 26.5 && g.player.x < 33.5;
    },
    exit(t, g) {
      t.clearVents(g);
    },
  },

  slowFire: {
    waypoint: { x: 29.5, y: 36.5 },
    enter(t, g) {
      // Out of the corridor's grilles: each bangs before the drone drops.
      t.arrive(g, "slowFire", [
        [27.5, 36.5, "drone", "vent"],
        [32.5, 43.5, "drone", "vent"],
        [29.5, 40.5, "drone"],
      ]);
    },
    update: (t, g) => t.cleared(g, "slowFire"),
    progress: (t, g) => `DRONES ${t.alive(g, "slowFire")}`,
    exit(t) {
      if (t.c.chronoKills > 0) t.say([["ARIA", "Did you see that? They never knew what time it was.", "excited"]]);
    },
  },

  // ── Lights out ─────────────────────────────────────────────────

  breaker: {
    waypoint: { x: BREAKER_CELL.x + 0.5, y: BREAKER_CELL.y - 0.8 },
    enter(t, g) {
      t.blackout = true;
      g.audio.powerDown?.();
      g.glitchEffect = 0.8;
      t.openDoors(g, "door5", "door13", "door15");
      t.ensureExit(g, true);
      t.c.thrown = false;
      // The dark brings them out of the ducts by the north hall and R&D.
      t.arrive(g, "breaker", [
        [56.5, 9.5, "henchman", "vent"],
        [77.5, 2.5, "drone", "vent"],
      ], { lead: 2 });
    },
    update: (t) => t.c.thrown,
    progress: (t, g) => (t.alive(g, "breaker") ? `BREAKER · R&D BAY · HOSTILES ${t.alive(g, "breaker")}` : "BREAKER · R&D BAY"),
  },

  toLift: {
    waypoint: { x: 29.5, y: 10.5 },
    enter(t, g) {
      t.blackout = false;
      t.ensureExit(g, true); // charging: live once the arena is held
      const grid = g.map?.grid;
      if (grid) grid[BREAKER_CELL.y][BREAKER_CELL.x] = RND_WALLS.BREAKER_LIVE;
      t.openDoors(g, "door5", "door13");
    },
    update: (t, g) => inArea(g.player, "arena"),
  },

  // ── Evac ───────────────────────────────────────────────────────

  wave1: {
    enter(t, g) {
      t.c.delay = 1.5;
      // The first of them is someone you saw this morning.
      setTimeoutGame(t, 0.6, () => t.turn(g, "orr", "wave1", "glitchling"));
    },
    update(t, g) {
      return t.wave(g, "wave1", [
        [10.5, 4.5, "drone"],
        [10.5, 9.5, "drone"],
        [49.5, 4.5, "drone"],
        [49.5, 9.5, "drone"],
      ]);
    },
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave1")} · LIFT ▲ 30%`,
  },

  wave2: {
    enter(t, g) {
      t.c.delay = 2.5;
    },
    update(t, g) {
      // In from both ends: through the north hall's door, and the air.
      return t.wave(g, "wave2", [
        [10.5, 6.5, "henchman"],
        [49.5, 8.5, "henchman"],
        [20.5, 3.5, "drone"],
        [39.5, 3.5, "drone"],
      ]);
    },
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave2")} · LIFT ▲ 60%`,
  },

  wave3: {
    enter(t, g) {
      t.c.delay = 2.5;
    },
    update(t, g) {
      return t.wave(g, "wave3", [
        [49.5, 6.5, "sentinel"],
        [10.5, 4.5, "henchman"],
        [10.5, 9.5, "henchman"],
      ]);
    },
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave3")} · LIFT ▲ 90%`,
  },

  extract: {
    waypoint: LIFT_CAR,
    enter(t, g) {
      // Lift B is back up, and the doors open on an empty car. The beacon
      // goes inside it.
      t.lift(g, true);
      g.audio.doorOpen?.();
      t.ensureExit(g, false);
      g.exitEntity.x = LIFT_CAR.x;
      g.exitEntity.y = LIFT_CAR.y;
      g.powerCells = { total: 2, found: 2 }; // the HUD chip: EXTRACTION LIVE
    },
    update: (t, g) => t.near(g, LIFT_CAR.x, LIFT_CAR.y + 0.3, 1.2),
  },

  reveal: {
    enter(t, g) {
      g.player.chronoActive = false;
      g.screenShake = 2;
    },
    update(t, g) {
      // The lift rumbles while ARIA talks.
      if (Math.random() < g.deltaTime * 0.6) g.screenShake = Math.max(g.screenShake || 0, 1.5);
      return t.clock > 6 && t.scriptIdle() && t.clock - t.idleSince > 2;
    },
  },
};

export class TutorialSystem {
  constructor(game) {
    this.game = game;
    this.step = 0;
    this.stepTime = 0;
    this._resetState();
    this.menuSelection = 1; // Default to "Begin Campaign" for better funnel
    this.showCompletionMenu = false;
  }

  /** Every per-run field, as a new run starts it. */
  _resetState() {
    // Step progression: `clock` is the step's age in real seconds (it runs
    // on the game's frame time, so it pauses with the game). `runClock` is
    // the whole chapter's, for the pacing measures.
    this.clock = 0;
    this.runClock = 0;
    this.suitedAt = null;
    this.firstShotAt = null;
    this.c = {};
    // Interaction flags, set by the game as they happen (game.tutorialX).
    this.pickedUp = false;
    this.weaponPickedUp = false;
    this.weaponSwapped = false;
    this.secondWeaponPickedUp = false;
    this.doorOpened = false;
    this.dashed = false;
    this.crouched = false;
    this.slid = false;
    this.fired = false;
    this.chronoUsed = false;
    // Health and ammo pickups stay shut until the range teaches them.
    this.pickupsOpen = false;
    // People: the squad in the locker room, and the Supervisor (js/npc.js).
    this.squad = [];
    this.sup = null;
    /** The floor's other people, by PEOPLE key, and who ARIA has noticed. */
    this.people = {};
    this._noticed = new Set();
    this._talked = {};
    this._read = new Set();
    /** True from 06:47: the floor's people are stopped where they stood. */
    this.frozen = false;
    /**
     * The certification sheet: each finished trial's result ({ time, acc,
     * grade }), the order they were done in, and the trial running now.
     */
    this.cert = { done: {}, order: [], briefed: false, run: null };
    /** The mobility run while it lasts: its gates, and whether the clock still waits for the start line. */
    this.course = null;
    this._barBumped = false;
    this._falseStart = false;
    /** The holo cover standing in the sim hall: [row, col] cells. */
    this._cover = [];
    /** Lift B's doors: wanted open, and open now. */
    this.liftWant = false;
    this.liftOpen = false;
    /** The Supervisor is in Lift B, going down: gone when its doors shut. */
    this.supDown = false;
    this._timers = [];
    // Set pieces.
    this.alert = false;
    /** The sim hall: hits land here, not on you. { integrity: number|null, failed } */
    this.sim = null;
    this.flickerUntil = 0;
    this._events = new Set();
    this.blackout = false;
    this.vents = null;
    this._alertLights = null;
    this._lastPA = null;
    // Dialogue still to play: { line: [speaker, text, emotion], step }.
    this.script = [];
    this._lineGap = 0;
    this._ourLine = null;
    this.idleSince = 0;
    this.checkpoint = null;
    this.deaths = 0;
    this._cardSerial = this._cardSerial || 0;
    // Post-chapter.
    this.sandboxInit = false;
    this.originPlayed = false;
    this.showCompletionMenu = false;
  }

  /**
   * Sync-when-warm: the opening cutscene lives in a lazily-split chunk, so this
   * only awaits on the very first entry. Callers that cannot await (menu click,
   * playtest harness) see tutorial state applied in the same tick thereafter.
   */
  start() {
    const g = this.game;
    g.mode = "tutorial";
    g.ariaComms?.flush();
    g.player.reset();
    if (!g.cutsceneEngine) {
      return g._ensureCutsceneEngine().then(() => this._begin());
    }
    this._begin();
    return Promise.resolve();
  }

  _begin() {
    const g = this.game;
    if (g.hasCutsceneScript("clocking_in")) {
      g.startCutscene("clocking_in", () => {
        g.ariaEnabled = true;
        this.initLevel();
      });
    } else {
      g.ariaEnabled = true;
      this.initLevel();
    }
  }

  initLevel() {
    const g = this.game;
    g.map = structuredClone(TUTORIAL_MAP);
    // The training hall's bars and tunnel: only low gets under (_updateBars).
    g.map.lowCells = LOW_CELLS;
    g.world = null;
    g.player.x = TUTORIAL_MAP.playerStart.x;
    g.player.y = TUTORIAL_MAP.playerStart.y;
    g.player.angle = TUTORIAL_MAP.playerStart.dir;
    g.player.alive = true;
    g.player.weapons = [];
    g.player.currentWeapon = -1;
    g.entities = [];
    g.dustMotes = null;
    clearShots(g);
    clearArrivals(g);

    for (const p of TUTORIAL_MAP.pickups) {
      g.entities.push(new Pickup(p.x, p.y, p.type, p));
    }
    if (TUTORIAL_MAP.props) {
      for (const p of TUTORIAL_MAP.props) {
        const pos = validatePropPosition(p.x, p.y, TUTORIAL_MAP.grid, TUTORIAL_MAP.width, TUTORIAL_MAP.height);
        if (!pos) continue;
        const prop = new Prop(pos.x + 0.5, pos.y + 0.5, p.type);
        if (p.variant) prop.variant = p.variant;
        g.entities.push(prop);
      }
    }

    g.killedEnemies = 0;
    g.totalEnemies = 0;
    g.exitEntity = null;
    g.powerCells = null;

    this._clearLights();
    this._resetState();
    this.menuSelection = 1;
    this._enter(0);

    g.state = GameState.PLAYING;
    g.roundStartTime = performance.now() + 99999; // suppress controls overlay
    g.audio.startTrack("campaign", 130);
    g.audio.startAmbient("industrial");
    g.lockPointer();
  }

  // ── Step machinery ──────────────────────────────────────────────

  /** The current step's definition (copy) and logic. */
  get def() {
    return PROLOGUE_STEPS[this.step] ?? null;
  }

  get logic() {
    return LOGIC[this.def?.id] ?? null;
  }

  /** The beat the current step belongs to, and its index. */
  get beat() {
    const b = this.def?.beat ?? PROLOGUE_BEATS.length - 1;
    return { index: b, ...PROLOGUE_BEATS[b] };
  }

  _enter(index) {
    const g = this.game;
    // The two steps before this one: their lines may still finish.
    this._recentSteps = [this.step, ...(this._recentSteps ?? [])].slice(0, 2);
    this.step = index;
    this.stepTime = performance.now();
    this.clock = 0;
    this.c = { kills: 0, heads: 0, aimedKills: 0, shotgunKills: 0, chronoKills: 0, slides: 0, dashes: 0 };
    // What the last step called in and hasn't come yet stays away.
    this._dropArrivals(g);
    this._postCard(index);
    this.doorOpened = false;
    this.pickedUp = false;
    this._events = new Set();
    const def = this.def;
    if (!def) return;
    // A beat's first step is where you come back to (or its first that
    // allows it: nobody wants to sit through the alarm twice).
    const first = PROLOGUE_STEPS.findIndex((s) => s.beat === def.beat && s.checkpoint !== false);
    if (first === index && index > 0) this._saveCheckpoint();
    this.logic?.enter?.(this, g);
    this._stagePeople(g);
    if (def.lines && !def.defer) this.say(def.lines, { cut: def.cut });
  }

  /**
   * The step's card holds the message director's headline lane (it never
   * waits for ARIA: her lines move to the comms lane below it instead).
   */
  _postCard(index) {
    const d = this.game.messages;
    if (!d) return;
    if (this.cardKey) d.done(this.cardKey);
    this.cardKey = PROLOGUE_STEPS[index]?.title ? `prologue:${index}:${++this._cardSerial}` : null;
    if (this.cardKey) d.post(this.cardKey, "teach", null, { top: false, minHold: 0, priority: 120 });
  }

  /**
   * Where the chapter goes from the step just finished: on through a trial,
   * from the hub into the trial picked (or the first not done, when a step
   * is skipped), from a trial's last step back to the hub, and after the
   * fourth trial on to the sign-off.
   */
  _nextIndex() {
    const def = this.def;
    const signOff = PROLOGUE_STEPS.findIndex((s) => s.id === "signOff");
    if (def?.id === "certify") {
      const pick = this.c.pick ?? PROLOGUE_TRIALS.find((tr) => !this.cert.done[tr.id])?.id;
      return pick ? trialStart(pick) : signOff;
    }
    if (def?.trial && PROLOGUE_STEPS[this.step + 1]?.trial !== def.trial) {
      const left = PROLOGUE_TRIALS.some((tr) => !this.cert.done[tr.id]);
      return left ? PROLOGUE_STEPS.findIndex((s) => s.id === "certify") : signOff;
    }
    return this.step + 1;
  }

  advanceStep() {
    const g = this.game;
    const prev = this.def;
    this.logic?.exit?.(this, g);
    g.audio.menuConfirm();
    if (prev && ENCOURAGE_AFTER.has(prev.id) && this.script.length === 0 && Math.random() < 0.5) {
      const line = drawLine("tutorialEncouragement", ARIA_COMMS.tutorialEncouragement);
      if (line) this.say([["ARIA", line, "happy"]]);
    }
    if (this.step + 1 >= TUTORIAL_SANDBOX_STEP) {
      this._finish();
      return;
    }
    // A trial is timed from leaving the hub to its last step's end.
    const pick = prev?.id === "certify" ? (this.c.pick ?? PROLOGUE_TRIALS.find((tr) => !this.cert.done[tr.id])?.id) : null;
    if (prev?.trial && PROLOGUE_STEPS[this.step + 1]?.trial !== prev.trial) this._finishTrial(prev.trial);
    const next = this._nextIndex();
    if (pick) this._beginTrial(pick);
    this._enter(next);
  }

  /** Debug and test hook: complete the current step as if its goal were met. */
  skipStep() {
    if (this.step >= TUTORIAL_SANDBOX_STEP) return;
    this.advanceStep();
  }

  update(dt) {
    const g = this.game;
    const now = performance.now();
    this.clock += g.deltaTime || 0;
    this.runClock += g.deltaTime || 0;
    if (this.cert.run && !this.def?.untimed && !this.course?.held) this.cert.run.clock += g.deltaTime || 0;
    if (this.firstShotAt == null && this.suitedAt != null && g.shotsFired > 0) this.firstShotAt = this.runClock;

    // Respawn collected pickups after a delay. Health and ammo stay shut
    // (and off the map) until the range teaches them.
    for (const e of g.entities) {
      if (!e.active && e._respawnAt && now >= e._respawnAt) {
        e.active = true;
        e._respawnAt = 0;
      }
      if (e.type === "health" || e.type === "ammo") e._shut = !this.pickupsOpen;
    }

    this._updateScript(g.deltaTime || 0);
    this._updateTargets(g);
    this._updateAlert(g);
    this._syncRoomLights(g);
    this._updateLift(g);
    this._updateNotices(g);
    this._updateGap(g);
    this._updateBars(g);
    for (const e of g.entities) if (e.type === "npc") e.update(g.deltaTime || 0);
    for (let i = this._timers.length - 1; i >= 0; i--) {
      if (this.clock >= this._timers[i].at) this._timers.splice(i, 1)[0].fn();
    }

    if (this.step === TUTORIAL_SANDBOX_STEP) {
      this._updateSandbox();
      return;
    }

    // Events the game reported since last frame become this step's counts.
    if (this.slid) {
      this.c.slides++;
      this.slid = false;
    }
    if (this.dashed) {
      this.c.dashes++;
      this.dashed = false;
    }

    this._updateEvents(g);
    const logic = this.logic;
    g.objectiveWaypoint = logic?.waypoint ?? null;
    if (logic?.update?.(this, g, dt)) this.advanceStep();
  }

  /**
   * The morning going wrong around the drills (a step's `events`): station
   * announcements, the lights stuttering, the floor shuddering.
   */
  _updateEvents(g) {
    const events = this.def?.events;
    if (!events) return;
    events.forEach(([at, kind, text], i) => {
      if (this._events.has(i) || this.clock < at) return;
      this._events.add(i);
      if (kind === "pa") this.announce(text);
      else if (kind === "flicker") this.flicker(g);
      else if (kind === "tremor") {
        g.screenShake = Math.max(g.screenShake || 0, 5);
        g.audio.tremor?.();
      }
    });
  }

  /** A station announcement (remembered: the calibration makes the PA repeat itself). */
  announce(text) {
    this._lastPA = text;
    this.say([["PA", text, "calm"]], { keep: true });
  }

  /** The lights stutter. */
  flicker(g, seconds = 0.45) {
    this.flickerUntil = this.clock + seconds;
    g.glitchEffect = Math.max(g.glitchEffect || 0, 0.35);
    g.audio.powerFlicker?.();
  }

  /** Whether the station's lights are out or stuttering right now (the overlay's darkness). */
  get dark() {
    return this.blackout || this.clock < this.flickerUntil;
  }

  /**
   * A hit taken in the sim hall: it lands on the sim, not on you. The damage
   * indicator and the flinch still play, so it teaches what a hit feels
   * like. Returns true when the sim took it.
   */
  simHit(amount, attacker) {
    if (!this.sim) return false;
    const g = this.game;
    const p = g.player;
    p.hurtTime = g.time;
    if (attacker && typeof attacker.x === "number") p.lastDamageAngle = Math.atan2(attacker.y - p.y, attacker.x - p.x);
    g.glitchEffect = Math.max(g.glitchEffect || 0, 0.25);
    g.screenShake = Math.max(g.screenShake || 0, 2);
    if (this.sim.integrity != null) {
      this.sim.integrity -= amount;
      if (this.sim.integrity <= 0) this.sim.failed = true;
    }
    return true;
  }

  /** Before the suit goes on: no HUD, no ARIA (the step's `preSuit`). */
  get preSuit() {
    return !!this.def?.preSuit;
  }

  /**
   * Whether the Supervisor is with you (in person, within earshot) rather
   * than on the suit channel.
   */
  get supPresent() {
    const s = this.sup;
    const p = this.game.player;
    return !!s?.active && Math.hypot(s.x - p.x, s.y - p.y) < 9;
  }

  /** Send the Supervisor along his route for this step, then have him wait for you. */
  supWalk(g, route) {
    const sup = this.sup;
    if (!sup) return;
    if (!sup.active || !g.entities.includes(sup)) {
      // A checkpoint (or a skipped scene) put you past his entrance: he is
      // simply there.
      const [x, y] = SUP_ROUTES[route][0];
      sup.x = x;
      sup.y = y;
      sup.active = true;
      if (!g.entities.includes(sup)) g.entities.push(sup);
    }
    sup.walk(SUP_ROUTES[route], { then: (s) => s.faceTo(g.player) });
  }

  /**
   * Send the Supervisor to (x, y) by the floor's own corridors; if he is out
   * of your sight and far off, he is simply there already.
   */
  supTo(g, x, y) {
    if (!this.sup) {
      this.sup = new Npc(x, y, "supervisor", { name: "Supervisor Simon" });
      g.entities.push(this.sup);
    }
    this.goTo(g, this.sup, x, y, g.player);
  }

  /** Walk someone to (x, y) by the floor's corridors, or put them there if you can't see them. */
  goTo(g, n, x, y, face = null, { snap = false } = {}) {
    n.active = true;
    if (!g.entities.includes(n)) g.entities.push(n);
    const p = g.player;
    const far = Math.hypot(n.x - p.x, n.y - p.y) > 12 || !hasLineOfSight(g.map, p.x, p.y, n.x, n.y);
    const there = Math.hypot(n.x - x, n.y - y) < 0.4;
    if (there) {
      n.path = [];
      if (face) n.faceTo(face);
      return;
    }
    // Snapping is only allowed where nobody sees it happen.
    const unseenAt = Math.hypot(x - p.x, y - p.y) > 12 || !hasLineOfSight(g.map, p.x, p.y, x, y);
    if ((snap || far) && far && unseenAt) {
      n.x = x;
      n.y = y;
      n.path = [];
      if (face) n.faceTo(face);
      return;
    }
    n.walk(route(g.map, n.x, n.y, x, y), { then: (m) => face && m.faceTo(face) });
  }

  /**
   * The Supervisor after 06:47: torn free, in the world, moving again
   * (for the escort steps, and a checkpoint into them).
   */
  supFree(g) {
    if (!this.sup) this.sup = new Npc(SUP_AT_LIFT.x, SUP_AT_LIFT.y, "supervisor", { name: "Supervisor Simon" });
    const sup = this.sup;
    if (!g.entities.includes(sup)) g.entities.push(sup);
    sup.active = true;
    sup.thaw();
    return sup;
  }

  /**
   * Whether the Supervisor has got ahead of you on the way to `goal`: you
   * are further from it than he is, and more than the leash from him. (You
   * ahead of him is fine: he keeps coming.)
   */
  leftBehind(sup, goal, slack = 0) {
    const p = this.game.player;
    const behind = Math.hypot(goal.x - p.x, goal.y - p.y) > Math.hypot(goal.x - sup.x, goal.y - sup.y) + 1;
    return behind && Math.hypot(sup.x - p.x, sup.y - p.y) > ESCORT_LEASH + slack;
  }

  /** Stop him where he is, keeping the rest of his route for when he goes on. */
  supHold(sup) {
    if (sup.path.length) this.c.rest = sup.path.map((q) => [q.x, q.y]);
    sup.path = [];
  }

  /** His locker: shut, or open with his coat in it. */
  supLocker(g, open) {
    const row = g.map?.grid?.[SUP_LOCKER_CELL.y];
    if (row) row[SUP_LOCKER_CELL.x] = open ? STATION_WALLS.LOCKERS_SUP_OPEN : STATION_WALLS.LOCKERS_SUP;
  }

  /** One of R&D to their trial's station (or `at`), walking or already there. */
  toStation(g, id, { snap = false, at = null } = {}) {
    if (this.frozen) return;
    const n = this.person(g, id);
    const s = at ?? STATIONS[id];
    this.goTo(g, n, s.x, s.y, s.face, { snap });
  }

  /** The light on the cadet's locker, so you know which one is yours. */
  /**
   * The cadet's locker, as the morning has it: shut, then lit while it calls
   * you (its seams glow, its status light is on), then open on your things
   * once the suit is out. The locker is the wall cell, painted three ways
   * (src/rendering/env/locker-art.js), so this swaps the cell.
   */
  lockerLight(g, on) {
    const row = g.map?.grid?.[MY_LOCKER_CELL.y];
    if (!row) return;
    const x = MY_LOCKER_CELL.x;
    if (on) row[x] = STATION_WALLS.LOCKERS_MINE_LIT;
    else if (row[x] === STATION_WALLS.LOCKERS_MINE_LIT) row[x] = this.c?.suited ? STATION_WALLS.LOCKERS_MINE_OPEN : STATION_WALLS.LOCKERS_MINE;
  }

  /**
   * Rasterise an NPC look now, a few layers a frame, before a scene changes
   * someone into it: left to the swap, the new sprite blinked out while its
   * layers decoded.
   */
  warmNpc(g, kind) {
    const ctx = g.renderer?.ctx;
    const viewH = g.renderer?.height;
    if (!ctx || !viewH || getArtStyle() === ART_LEGACY || typeof requestAnimationFrame !== "function") return;
    const halfHeights = [viewH / 2.4, viewH / 5];
    const until = performance.now() + 8000;
    const step = () => {
      if (performance.now() > until || prefetchEnemyModel(ctx, kind, halfHeights, undefined, 2)) return;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** The cadet's locker shut, as it is first thing. */
  lockerShut(g) {
    const row = g.map?.grid?.[MY_LOCKER_CELL.y];
    if (row) row[MY_LOCKER_CELL.x] = STATION_WALLS.LOCKERS_MINE;
  }

  /**
   * The interact key, before the game's own doors and secret walls: the
   * locker during "Suit Up", the breaker in the blackout, and otherwise
   * whoever you are facing (talk) or what is on the wall in front of you
   * (read). Returns true when it was used here.
   */
  onInteract() {
    const g = this.game;
    const id = this.def?.id;
    if (id === "suitUp") return this._openLocker();
    if (id === "breaker" && this._throwBreaker()) return true;
    if (id === "certify" && this._tellLin()) return true;
    // A door or a secret panel in front of you is the game's to open.
    const ahead = this._cellAhead(1.5);
    if (ahead && (ahead.v === 5 || ahead.v === 6)) return false;
    if (this._talk()) return true;
    if (ahead && READABLE[ahead.v]) return this._readWall(ahead.v);
    return false;
  }

  _openLocker() {
    const g = this.game;
    if (this.c.opening) return false;
    const p = g.player;
    const dx = MY_LOCKER.x - p.x;
    const dy = MY_LOCKER.y - p.y;
    if (Math.hypot(dx, dy) > 2.8) return false;
    let diff = Math.atan2(dy, dx) - p.angle;
    diff -= 2 * Math.PI * Math.round(diff / (2 * Math.PI));
    if (Math.abs(diff) > 1.1) return false;
    this.c.opening = true;
    g.audio.doorOpen?.();
    const done = () => {
      this.c.suited = true;
      g.state = GameState.PLAYING;
      g.lockPointer?.();
    };
    // The cadet makes the suit theirs first (the creator, pre-filled with the
    // saved agent), then puts it on (the suit-up film), and ARIA comes
    // online after, in the locker room.
    const putOn = () => {
      if (g.hasCutsceneScript?.("suit_up")) g.startCutscene("suit_up", done);
      else done();
    };
    g.unlockPointer?.();
    g.creatorCategory = 0;
    g._creatorSaveCallback = putOn;
    g.state = GameState.CHARACTER_CREATE;
    return true;
  }

  /**
   * At Lin's booth, facing her or her desk, once she has briefed you: the
   * sim starts (the hub picks the combat trial).
   */
  _tellLin() {
    const g = this.game;
    if (!this.cert.linBriefed || this.cert.done.combat) return false;
    const lin = this.people.lin;
    const p = g.player;
    const ahead = this._cellAhead(LIN_REACH);
    const atDesk = ahead && (ahead.v === ARENA_WALLS.BOOTH_DESK || ahead.v === ARENA_WALLS.BOOTH_CONSOLE);
    let facing = false;
    if (lin && Math.hypot(lin.x - p.x, lin.y - p.y) < LIN_REACH) {
      let diff = Math.atan2(lin.y - p.y, lin.x - p.x) - p.angle;
      diff -= 2 * Math.PI * Math.round(diff / (2 * Math.PI));
      facing = Math.abs(diff) < 0.7;
    }
    if (!atDesk && !facing) return false;
    this.c.simGo = true;
    // Whatever was left of her briefing, she skips.
    this.say([["LIN", "Going live.", "excited"]], { cut: true });
    g.audio.menuConfirm?.();
    return true;
  }

  /** The first wall cell within `reach` straight ahead, as { x, y, v }. */
  _cellAhead(reach) {
    const g = this.game;
    const p = g.player;
    const grid = g.map?.grid;
    if (!grid) return null;
    for (let d = 0.4; d <= reach; d += 0.2) {
      const x = Math.floor(p.x + Math.cos(p.angle) * d);
      const y = Math.floor(p.y + Math.sin(p.angle) * d);
      const v = grid[y]?.[x];
      if (v == null) return null;
      if (v !== 0) return { x, y, v };
    }
    return null;
  }

  /** The breaker, if you are at it and facing it: thrown, and the lights come back. */
  _throwBreaker() {
    const g = this.game;
    if (this.c.thrown) return false;
    const p = g.player;
    const bx = BREAKER_CELL.x + 0.5;
    const by = BREAKER_CELL.y + 0.5;
    if (Math.hypot(bx - p.x, by - p.y) > 2.3) return false;
    let diff = Math.atan2(by - p.y, bx - p.x) - p.angle;
    diff -= 2 * Math.PI * Math.round(diff / (2 * Math.PI));
    if (Math.abs(diff) > 1.2) return false;
    this.c.thrown = true;
    g.map.grid[BREAKER_CELL.y][BREAKER_CELL.x] = RND_WALLS.BREAKER_LIVE;
    g.audio.armorClank?.(0);
    g.screenShake = Math.max(g.screenShake || 0, 2);
    return true;
  }

  /**
   * Talk to whoever you are facing, close by: their next line, or before
   * anything else is being said. After 06:47, ARIA says a word instead.
   */
  _talk() {
    const g = this.game;
    const p = g.player;
    let who = null;
    for (const [id, n] of Object.entries(this.people)) {
      if (!n?.active || !g.entities.includes(n)) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d > 2.4) continue;
      let diff = Math.atan2(n.y - p.y, n.x - p.x) - p.angle;
      diff -= 2 * Math.PI * Math.round(diff / (2 * Math.PI));
      if (Math.abs(diff) > 0.6) continue;
      if (!who || d < who.d) who = { id, n, d };
    }
    if (!who) return false;
    // Never over the story: a busy channel just swallows the press.
    if (!this.scriptIdle()) return true;
    if (this.frozen) {
      const k = (this._talked.__frozen = (this._talked.__frozen ?? -1) + 1);
      if (k < FROZEN_TALK.length) this.say([FROZEN_TALK[k]]);
      return true;
    }
    const lines = TALK[who.id];
    if (!lines) return false;
    const k = this._talked[who.id] ?? 0;
    this._talked[who.id] = k + 1;
    who.n.faceTo(p);
    // Said in their own voice, under their own name.
    const [voice, text] = lines[k % lines.length];
    this.say([[voice, text, "calm", { as: who.n.name.toUpperCase() }]]);
    return true;
  }

  /** ARIA reads out something on the wall (a board, a poster), once each. */
  _readWall(v) {
    if (!this.scriptIdle() || this._read.has(v)) return true;
    this._read.add(v);
    this.say(READABLE[v]);
    return true;
  }

  /** The card's live counter for the current step ("TARGETS 2 / 3"), or null. */
  progressText() {
    try {
      return this.logic?.progress?.(this, this.game) ?? null;
    } catch {
      return null;
    }
  }

  // ── Events from the game ────────────────────────────────────────

  /** An enemy died: count it for the step's drill. */
  noteKill(enemy, head = false) {
    const p = this.game.player;
    this.c.kills = (this.c.kills || 0) + 1;
    if (head) this.c.heads = (this.c.heads || 0) + 1;
    if (p.isAiming) this.c.aimedKills = (this.c.aimedKills || 0) + 1;
    if (p.weapons[p.currentWeapon] === SHOTGUN) this.c.shotgunKills = (this.c.shotgunKills || 0) + 1;
    if (p.chronoActive) this.c.chronoKills = (this.c.chronoKills || 0) + 1;
  }

  // ── Certification Day ───────────────────────────────────────────

  /** A trial starts from the hub: its clock, its shot count and its active reloads from now. */
  _beginTrial(id) {
    const g = this.game;
    this.cert.run = { trial: id, clock: 0, shots: g.shotsFired || 0, hits: g.shotsHit || 0, reloads: g.activeReload?.stats.hits ?? 0 };
  }

  /**
   * A trial's last step is done: grade it onto the sheet, then make the
   * calibration a little stranger for it.
   */
  _finishTrial(id) {
    const g = this.game;
    const landed = g.activeReload?.stats.hits ?? 0;
    const run = this.cert.run?.trial === id ? this.cert.run : { clock: 0, shots: g.shotsFired || 0, hits: g.shotsHit || 0, reloads: landed };
    const shots = (g.shotsFired || 0) - run.shots;
    const hits = (g.shotsHit || 0) - run.hits;
    const acc = shots > 0 ? Math.min(1, hits / shots) : null;
    const trial = PROLOGUE_TRIALS.find((tr) => tr.id === id);
    const reloads = trial?.reloads ? landed - (run.reloads ?? landed) : 0;
    const result = { time: run.clock, acc, reloads, grade: gradeTrial(trial, run.clock, acc, { reloads }) };
    this.cert.done[id] = result;
    this.cert.order.push(id);
    this.cert.run = null;
    const n = this.cert.order.length;
    if (n < PROLOGUE_TRIALS.length) {
      // The one who ran it grades it, in person (calibration has no grade to give).
      if (trial?.par != null) this.say([[trial.lead, trialComment(trial, result), "calm"]], { keep: true });
      this.escalate(n);
    }
  }

  /**
   * The calibration's oddity for the nth trial finished (src/data/prologue.js
   * PROLOGUE_ODDITIES), staged wherever you are.
   */
  escalate(n) {
    const g = this.game;
    const odd = PROLOGUE_ODDITIES[n - 1];
    if (!odd) return;
    if (n === 1) {
      // The corridor clocks read 06:47 for a moment, then right again.
      this.announce(odd.pa);
      setTimeoutGame(this, 2.5, () => {
        this.setClocks(g, true);
        setTimeoutGame(this, 1.6, () => {
          if (!this.frozen) this.setClocks(g, false);
        });
      });
    } else if (n === 2) {
      // The PA says its last again, word for word; Mendez pours the same
      // coffee twice.
      // It skips, too, so it reads as the station and not as a repeat.
      if (this._lastPA) {
        const cut = this._lastPA.slice(0, Math.floor(this._lastPA.length * 0.7)).trimEnd();
        this.say([["PA", `${cut}— ${this._lastPA}`, "calm"]], { keep: true });
        g.glitchEffect = Math.max(g.glitchEffect || 0, 0.4);
        g.audio.powerFlicker?.();
      }
      const mendez = this.person(g, "mendez");
      const at = PEOPLE.mendez.at;
      const pour = () => {
        mendez.x = at[0] + 0.9;
        mendez.y = at[1] + 0.6;
        mendez.walk([at], { speed: 1.1, then: (m) => {
          m.faceTo({ x: PEOPLE.mendez.face[0], y: PEOPLE.mendez.face[1] });
          m.pose("point", 1.4);
        } });
      };
      pour();
      setTimeoutGame(this, 2.6, pour);
      const p = g.player;
      const sees = Math.hypot(at[0] - p.x, at[1] - p.y) < 10 && hasLineOfSight(g.map, p.x, p.y, at[0], at[1]);
      setTimeoutGame(this, 4, () => !this.frozen && this.say(sees ? odd.lines : odd.away, { keep: true }));
    } else if (n === 3) {
      // A hologram the sim never loaded, by Lift B; the lights stutter on
      // the Engine's beat.
      const e = makeTarget(EXHIBIT_AT.x + 2, EXHIBIT_AT.y, { type: "glitchling", health: 999 });
      e._holo = true;
      e._corrupt = true;
      // A projection the sim never loaded: shots go through it.
      e._phased = true;
      e._oddity = true;
      e._tutTag = "oddity";
      g.entities.push(e);
      setTimeoutGame(this, 14, () => this.clearTag(g, "oddity"));
      for (const k of [0, 0.9, 1.8]) setTimeoutGame(this, k, () => this.flicker(g, 0.3));
      // Lin says it if you're in her hall; anywhere else, ARIA hears it on the floor channel.
      setTimeoutGame(this, 1.2, () => !this.frozen && this.say(inArea(g.player, "arena") ? odd.lines : odd.away, { keep: true }));
    }
  }

  /** Every station clock on the floor: stopped at 06:47, or right. */
  setClocks(g, stopped) {
    const grid = g.map?.grid;
    if (!grid) return;
    const from = stopped ? HALL_WALLS.CLOCK : HALL_WALLS.CLOCK_STOPPED;
    const to = stopped ? HALL_WALLS.CLOCK_STOPPED : HALL_WALLS.CLOCK;
    for (const row of grid) for (let x = 0; x < row.length; x++) if (row[x] === from) row[x] = to;
  }

  /** The certification sheet, one line per trial, for the hub's card. */
  sheetText() {
    return PROLOGUE_TRIALS.map((tr) => {
      const r = this.cert.done[tr.id];
      if (!r) return `${tr.name} — ${tr.where}`;
      const bits = [`${tr.name} ✓ ${r.grade}`];
      if (tr.par != null) bits.push(`${Math.round(r.time)} s`);
      if (r.acc != null) bits.push(`${Math.round(r.acc * 100)}%`);
      if (r.reloads) bits.push(`${r.reloads} ACTIVE`);
      return bits.join(" · ");
    }).join("\n");
  }

  /** The Supervisor's word on the best of the four, for the sign-off. */
  bestTrialLine() {
    const best = PROLOGUE_TRIALS.filter((tr) => tr.par != null && this.cert.done[tr.id])
      .map((tr) => ({ tr, r: this.cert.done[tr.id] }))
      .sort((a, b) => TRIAL_GRADES.indexOf(a.r.grade) - TRIAL_GRADES.indexOf(b.r.grade) || a.r.time / a.tr.par - b.r.time / b.tr.par)[0];
    if (!best) return null;
    const name = best.tr.name.charAt(0) + best.tr.name.slice(1).toLowerCase();
    const time = `${Math.round(best.r.time)} seconds`;
    if (best.r.grade === "S") return `${name}, ${time}. I've seen instructors do worse. I'll be putting that in writing.`;
    if (best.r.grade === "A") return `${name}, ${time}. Somebody upstairs is going to notice that.`;
    return `${name} was your best. It'll do. The Bureau grades on a curve.`;
  }

  /** The run begins (or picks up at gate `from` after a checkpoint): its gates go up. */
  startCourse(g, from = 1) {
    this.endCourse(g);
    const gates = RUN_GATES.map(({ x, y }, i) => {
      const gate = new Prop(x, y, "course_gate");
      gate.gate = { num: i, state: "ahead" };
      gate._tutTag = "gates";
      g.entities.push(gate);
      return gate;
    });
    // Until Vale's count on the start line runs out, the clock holds
    // (update()). `count`: seconds left of it, null until it starts.
    this.course = { gate: from, gates, held: from === 0, count: null };
  }

  /** The run is over: its gates come down. */
  endCourse(g) {
    this.clearTag(g, "gates");
    this.course = null;
  }

  /**
   * One tick of the run, up to gate `last`: the next gate lit and pointed
   * at. A gate is a line across its lane; you are through it anywhere on
   * that line. Returns true once `last` is run.
   */
  runCourse(g, last) {
    const c = this.course;
    if (!c) return true;
    const p = g.player;
    const gate = RUN_GATES[c.gate];
    g.objectiveWaypoint = gate;
    let on = p.x >= gate.x0 && p.x < gate.x1 && Math.abs(p.y - gate.y) < RUN_GATE_DY;
    if (c.gate === 0 && !this._countIn(g, on)) on = false;
    c.gates.forEach((prop, i) => {
      prop.gate.state = i < c.gate ? "done" : i === c.gate ? "next" : "ahead";
      prop.gate.label = i === RUN_GATES.length - 1 && i >= c.gate ? "END" : i === 0 && c.gate === 0 && c.count != null ? String(Math.ceil(c.count)) : undefined;
    });
    if (on) {
      g.audio.menuConfirm?.();
      if (c.gate === 0) {
        c.held = false;
        this.say([["VALE", "Go!", "excited"]], { cut: true });
      }
      c.gate++;
      if (c.gate > last) return true;
    }
    return false;
  }

  /**
   * The start line: Vale counts you in once you are on it and she has said
   * her piece (this step's lines: other chatter doesn't hold it), a tick a
   * second. Step off and the count starts over. True on
   * the frame the count runs out: go.
   */
  _countIn(g, on) {
    const c = this.course;
    if (!on) {
      if (c.count != null && !this._falseStart) {
        this._falseStart = true;
        this.say([["VALE", "Back on the line. Wait for it.", "calm"]]);
      }
      c.count = null;
      return false;
    }
    if (c.count == null) {
      if (!this.stepLinesDone()) return false;
      c.count = RUN_COUNTDOWN;
      g.audio.menuNav?.();
      return false;
    }
    const was = Math.ceil(c.count);
    c.count -= g.deltaTime || 0;
    if (c.count <= 0) return true;
    if (Math.ceil(c.count) !== was) g.audio.menuNav?.();
    return false;
  }

  /** The run's line on the card: the gate, and the clock. */
  courseText() {
    const c = this.course;
    const time = (this.cert.run?.clock ?? 0).toFixed(1);
    if (!c) return `${time} s`;
    if (c.held) {
      if (c.count != null) return `ON YOUR MARK · ${Math.ceil(c.count)}`;
      const s = RUN_GATES[0];
      const p = this.game.player;
      const on = p.x >= s.x0 && p.x < s.x1 && Math.abs(p.y - s.y) < RUN_GATE_DY;
      return on ? "ON THE LINE · VALE COUNTS YOU IN" : "TO THE START LINE · TOP OF LANE ONE";
    }
    const n = Math.min(c.gate, RUN_GATES.length - 1);
    return `GATE ${n} / ${RUN_GATES.length - 1} · ${time} s · PAR ${PROLOGUE_TRIALS.find((tr) => tr.id === "mobility").par} s`;
  }

  /**
   * The training hall's bars and tunnel: only low gets under them (sliding,
   * or crouched). They are the map's lowCells, which the player's movement
   * honours (src/systems/player-update.js): standing, a bar stops you like a
   * wall; once under, you stay low until you are out, so a slide that runs
   * out under a bar, or crouch let go in the tunnel, leaves you crouch-walking
   * rather than pinned where you stood up. Here: a bump the first frame you
   * walk into one upright, and Vale's word the first time.
   */
  _updateBars(g) {
    const p = g.player;
    const bumped = !!p.lowBlocked;
    p.lowBlocked = false;
    if (bumped && !this._barBumped) {
      g.screenShake = Math.max(g.screenShake || 0, 1.5);
      g.audio.menuBack?.();
      if (!this._barWarned) {
        this._barWarned = true;
        this.say([["VALE", "Under it, not through it. Slide, or crouch and walk.", "warm"]]);
      }
    }
    this._barBumped = bumped;
  }

  /**
   * Floor you only cross mid-dash (GAPS): walk into it and you are set back
   * on the side you came from. Mid-dash, or carried by one just ended, you
   * are over.
   */
  _updateGap(g) {
    const p = g.player;
    if (p.isDashing) this._dashAt = this.runClock;
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    this._gapSide ??= {};
    for (const [i, gap] of GAPS.entries()) {
      const inGap = cx >= gap.x0 && cx <= gap.x1 && cy >= gap.y0 && cy <= gap.y1;
      const lo = gap.axis === "x" ? gap.x0 : gap.y0;
      const hi = gap.axis === "x" ? gap.x1 : gap.y1;
      const at = gap.axis === "x" ? p.x : p.y;
      if (!inGap) {
        this._gapSide[i] = at < lo ? -1 : 1;
        continue;
      }
      if (p.isDashing || this.runClock - (this._dashAt ?? -9) < DASH_CARRY) continue;
      // Back to the edge you came from, a beat to collect yourself.
      const back = this._gapSide[i] > 0 ? hi + 1.4 : lo - 0.4;
      if (gap.axis === "x") p.x = back;
      else p.y = back;
      g.screenShake = Math.max(g.screenShake || 0, 3);
      g.glitchEffect = Math.max(g.glitchEffect || 0, 0.3);
      g.audio.menuBack?.();
      const key = gap.pit ? "pit" : "gap";
      this._gapWarned ??= {};
      if (!this._gapWarned[key]) {
        this._gapWarned[key] = true;
        this.say([gap.pit ? ["VALE", "Into the foam. That's time. Dash it, right at the edge.", "calm"] : ["ARIA", "Caught you. Don't walk it: dash it, right at the edge.", "worried"]]);
      }
    }
  }

  // ── Checkpoints ─────────────────────────────────────────────────

  _saveCheckpoint() {
    const p = this.game.player;
    this.checkpoint = {
      step: this.step,
      x: p.x,
      y: p.y,
      angle: p.angle,
      weapons: [...p.weapons],
      currentWeapon: p.currentWeapon,
      pickupsOpen: this.pickupsOpen,
    };
  }

  /**
   * The cadet died: back to the start of this beat, healed and re-armed,
   * with the beat's set piece set up again. Never a game over in the prologue.
   */
  respawn() {
    const g = this.game;
    const p = g.player;
    const cp = this.checkpoint ?? { step: 1, x: TUTORIAL_MAP.playerStart.x, y: TUTORIAL_MAP.playerStart.y, angle: TUTORIAL_MAP.playerStart.dir, weapons: [], currentWeapon: -1, pickupsOpen: false };
    this.logic?.exit?.(this, g);
    this.deaths++;
    g.entities = g.entities.filter((e) => e.type !== "enemy" && !e._tutTag);
    clearShots(g);
    clearArrivals(g);
    this.course = null;
    p.alive = true;
    p.health = p.maxHealth;
    p.stamina = p.maxStamina ?? p.stamina;
    p.chronoEnergy = p.maxChronoEnergy;
    p.chronoActive = false;
    p.x = cp.x;
    p.y = cp.y;
    p.angle = cp.angle;
    p.weapons = [...cp.weapons];
    p.currentWeapon = cp.currentWeapon;
    p.ammo = Math.max(p.ammo || 0, 60);
    g.deathTimer = 0;
    g.timeScale = 1;
    g.slowMoTimer = 0;
    g.killedEnemies = 0;
    g.totalEnemies = 0;
    this.pickupsOpen = cp.pickupsOpen;
    this.alert = false;
    this.blackout = false;
    this.sim = null;
    this.script = [];
    g.ariaComms.message = null;
    g.audio.stopSpeech?.("comms");
    // A trial run from its first step again is timed from there.
    const trial = PROLOGUE_STEPS[cp.step]?.trial;
    if (trial) this._beginTrial(trial);
    // A step that stages people (the escort) puts them back where it starts.
    this._respawning = true;
    this._enter(cp.step);
    this._respawning = false;
    // The beat's lines already played once; ARIA just picks you back up.
    this.script = [];
    this.say([["ARIA", this.deaths === 1 ? "Suit rebooted you. That's what it's for. Once more, from the top of this one." : "Back on your feet. Again. I'm not counting. I'm absolutely counting.", "worried"]]);
  }

  // ── Dialogue ────────────────────────────────────────────────────

  /**
   * Queue lines to play in order once the comms are free. `cut` drops what
   * was still to come and cuts off the line in progress (an alarm).
   */
  say(lines, { cut = false, keep = false, first = false } = {}) {
    const g = this.game;
    if (!lines) return;
    if (cut) {
      this.script = [];
      if (g.ariaComms?.message) g.ariaComms.message = null;
      g.audio?.stopSpeech?.("comms");
      this._lineGap = 0.2;
    }
    // Each line remembers its step: a fast player outruns the story, and a
    // line about the range is no use in the gym (see _updateScript). A
    // `keep` line (the sheet, the calibration's oddities) is never stale.
    // `first`: someone in front of you, ahead of the queue (not over the line being said).
    const queued = lines.map((line) => ({ line, step: keep ? null : this.step, from: this.step }));
    if (first) this.script.unshift(...queued);
    else this.script.push(...queued);
  }

  /** Whether the current step's own lines have all been said (other chatter aside). */
  stepLinesDone() {
    // As in scriptIdle, a line waiting for you to come within earshot holds nothing up.
    return !this.script.some((q) => q.step === this.step && this._audible(q.line[0])) && !(this._ourLine && this._ourLineStep === this.step);
  }

  /** Whether every queued line has been said and the last has finished. */
  scriptIdle() {
    // A line waiting for you to come within earshot holds nothing up.
    return !this._ourLine && this.script.every((s) => !this._audible(s.line[0]));
  }

  _updateScript(dt) {
    const comms = this.game.ariaComms;
    if (!comms) return;
    if (this._ourLine && comms.message?._prologue !== this._ourLine) {
      this._ourLine = null;
      this.idleSince = this.clock;
    }
    if (this._lineGap > 0) this._lineGap -= dt;
    // Lines from steps long gone are stale: drop them rather than play them
    // over a step they no longer describe. (The hub sends you back and forth
    // between steps far apart in the list, so "long gone" is two steps of
    // play, not two places in it.)
    const recent = this._recentSteps ?? [];
    const stale = (s) => s !== null && s !== this.step && !recent.includes(s);
    // A `keep` line is never stale, except one still waiting on someone you
    // walked away from: once its step is long gone, it would only play out of context.
    this.script = this.script.filter((s) => !stale(s.step) && !(s.step === null && stale(s.from) && !this._audible(s.line[0])));
    if (this._ourLine || comms.message || comms.queue?.length || this._lineGap > 0 || !this.script.length) return;
    // Someone out of earshot keeps their line until you are back in it (or
    // it goes stale); whoever you can hear goes on meanwhile. Dropping it
    // lost whole briefings: Orr's walk, Lin's calls across the sim hall.
    const at = this.script.findIndex((s) => this._audible(s.line[0]));
    if (at < 0) return;
    const [next] = this.script.splice(at, 1);
    this._ourLineStep = next.step;
    const [speaker, text, emotion, opts] = next.line;
    const style = SPEAKER_STYLE[speaker] ?? SPEAKER_STYLE.ARIA;
    const radio = style.radioVoice && (opts?.radio || !this.supPresent);
    const id = {};
    comms.queueLine?.({
      // `as`: a voice speaking under someone's own name (the floor's people).
      speaker: opts?.as ?? speaker,
      text,
      color: style.color,
      voice: radio ? style.radioVoice : style.voice,
      emotion: emotion ?? null,
      duration: lineDuration(text),
      prominent: true,
      _prologue: id,
    });
    this._ourLine = id;
    this._lineGap = 0.35;
  }

  /**
   * Whether you can hear R&D's people from where you are: they talk in
   * person, with no suit channel, so a line of theirs you have walked away
   * from (out of their room, and out of earshot) waits for you to come back.
   */
  _audible(speaker) {
    const id = EARSHOT_OF[speaker];
    const n = id && this.people[id];
    if (!n?.active) return true;
    const p = this.game.player;
    if (Math.hypot(n.x - p.x, n.y - p.y) < EARSHOT) return true;
    if (ROOM_OF[id] && inArea(p, ROOM_OF[id])) return true;
    return Object.keys(AREAS).some((a) => inArea(p, a) && inArea(n, a));
  }

  // ── Helpers the steps use ───────────────────────────────────────

  near(g, x, y, r) {
    return Math.hypot(g.player.x - x, g.player.y - y) < r;
  }

  isOpen(g, doors) {
    return doors.every((d) => g.map.grid[d.y][d.x] === 0);
  }

  openDoors(g, ...names) {
    for (const n of names) {
      for (const d of TUTORIAL_MAP.doors[n] || []) g.map.grid[d.y][d.x] = 0;
    }
  }

  /** Put one of the step's pickups down, replacing an earlier copy. */
  place(g, tag, pickup) {
    g.entities = g.entities.filter((e) => e._tutTag !== tag);
    pickup._tutTag = tag;
    g.entities.push(pickup);
  }

  /** Training targets for a drill; `track` entries make them slide along the lane. */
  spawnTargets(g, tag, spots, health = 20, type = "drone") {
    for (const [x, y, track] of spots) {
      const e = makeTarget(x, y, { health, type, track: track ? { axis: "y", ...track } : null });
      e._tutTag = tag;
      g.entities.push(e);
    }
  }

  /**
   * A step's holograms, once (or every time, with `again`). Marks the step's
   * `spawned` so its count can be checked. Real hostiles go through arrive().
   */
  spawnHostiles(g, tag, spots, make = makeHolo, again = false) {
    if (this.c.spawned && !again) return;
    if (make !== makeHolo) return this.arrive(g, tag, spots, { make });
    this.c.spawned = true;
    for (const [x, y, type] of spots) this._spawn(g, tag, x, y, type, make);
  }

  _spawn(g, tag, x, y, type, make) {
    const e = make(x, y, type);
    e._tutTag = tag;
    // A scripted fight comes at you: hunting from the start (the AI's
    // ctx.hunt keeps it on you), its first shot a beat away.
    e.state = "chase";
    e.lastAttackTime = g.time;
    e._lastSeen = { x: g.player.x, y: g.player.y };
    g.entities.push(e);
    g.totalEnemies = (g.totalEnemies || 0) + 1;
    return e;
  }

  /**
   * Real hostiles, each coming in through a way you can see coming
   * (src/systems/arrival.js): a tear (the air cracks, glows and crackles,
   * then opens and it steps out) or a vent ("vent": the grille bangs, and
   * it drops). Spots are [x, y, type, via?]; `lead` overrides how long the
   * warning runs. Each joins the world as it steps out, unable to fire for
   * a moment; until then it is pending, and alive() counts it, so a step
   * can't be cleared while any are still coming. `again`: another lot for a
   * step that has had one (the escort's, as he gets down the corridor).
   */
  arrive(g, tag, spots, { lead = null, make = makeHostile, via = "tear", again = false } = {}) {
    if (this.c.spawned && !again) return;
    this.c.spawned = true;
    for (const [x, y, type, how = via] of spots) {
      const e = make(x, y, type);
      e._tutTag = tag;
      // A scripted fight comes at you: hunting from the moment it's out.
      e.state = "chase";
      e._lastSeen = { x: g.player.x, y: g.player.y };
      g.totalEnemies = (g.totalEnemies || 0) + 1;
      startArrival(g, { x, y, enemy: e, via: how, telegraph: lead, tag });
    }
  }

  /** Drop what is still on its way from a step that's over (or a checkpoint's restart). */
  _dropArrivals(g) {
    if (!g.arrivals) return;
    g.arrivals = g.arrivals.filter((a) => !(a.enemy?._tutTag && (a.phase === "wait" || a.phase === "telegraph")));
  }

  /** A step's arrivals have all come, and all are down. */
  cleared(g, tag) {
    return !!this.c.spawned && this.alive(g, tag) === 0;
  }

  /**
   * The cover drill's targets put a round into the player every
   * DRILL_VOLLEY seconds: down behind the block it stops there (and
   * cover-play counts it), stood up over it it lands on the sim.
   */
  drillVolley(g) {
    if ((this.c.volley -= g.deltaTime || 0) > 0) return;
    this.c.volley = DRILL_VOLLEY;
    const p = g.player;
    if (!inArea(p, "arena")) return;
    const from = g.entities.find((e) => e._tutTag === "coverDrill" && e.type === "enemy" && e.health > 0);
    if (!from) return;
    const a = Math.atan2(p.y - from.y, p.x - from.x);
    const bolt = new Projectile(from.x + Math.cos(a) * 0.4, from.y + Math.sin(a) * 0.4, Math.cos(a), Math.sin(a), 5, 7, "enemy");
    bolt.color = "#7dfff0";
    g.projectiles.push(bolt);
    g.entities.push(bolt);
    g.audio.enemyShoot?.(g.audio.calculatePan?.(from.x, from.y, p.x, p.y, p.angle) ?? 0);
  }

  /** Where one of them steps out of the minute: a violet burst, the lights catching. */
  tear(g, x, y) {
    g._spawnParticlesAt?.(null, (ps) => spawnEnergyBurst(ps, x, y, { count: 14, r: 190, g: 90, b: 255 }));
    g.glitchEffect = Math.max(g.glitchEffect || 0, 0.25);
  }

  /**
   * The sim hall's holo cover in `layout` (COVER_LAYOUTS): the last layout's
   * blocks sink, the new ones rise waist-high, never on top of anyone.
   */
  raiseCover(g, layout) {
    const map = g.map;
    if (!map?.grid || !map.heightMap) return;
    for (const [r, c] of this._cover) {
      if (map.grid[r][c] === ARENA_WALLS.HOLO_BLOCK) {
        map.grid[r][c] = 0;
        map.heightMap[r][c] = LAYER.FULL;
      }
    }
    this._cover = [];
    const bodies = [g.player, ...g.entities.filter((e) => e.active && (e.type === "enemy" || e.type === "npc"))];
    for (const [r, c] of COVER_LAYOUTS[layout] ?? []) {
      if (map.grid[r][c] !== 0) continue;
      if (bodies.some((e) => Math.abs(e.x - (c + 0.5)) < 0.9 && Math.abs(e.y - (r + 0.5)) < 0.9)) continue;
      map.grid[r][c] = ARENA_WALLS.HOLO_BLOCK;
      map.heightMap[r][c] = LAYER.WAIST;
      this._cover.push([r, c]);
      g._spawnParticlesAt?.(null, (ps) => spawnEnergyBurst(ps, c + 0.5, r + 0.5, { count: 6, r: 70, g: 240, b: 255 }));
    }
  }

  // ── The floor's people ──────────────────────────────────────────

  /** One of PEOPLE, put in the world where the morning has them if they aren't there yet. */
  person(g, id) {
    let n = this.people[id];
    if (!n) {
      const d = PEOPLE[id];
      n = new Npc(d.at[0], d.at[1], NPC_TYPES[d.kind] ? d.kind : "officer", { name: d.name, look: d.look ?? null });
      n.faceTo({ x: d.face[0], y: d.face[1] });
      n.caught = d.caught;
      this.people[id] = n;
    }
    n.active = true;
    if (!g.entities.includes(n)) g.entities.push(n);
    return n;
  }

  /** Someone gone: no body, no trace but what they left. */
  gone(g, id) {
    const n = this.people[id];
    if (!n) return;
    n.active = false;
    g.entities = g.entities.filter((e) => e !== n);
  }

  /**
   * Someone as the breach left them, held in a pose for good: at (x, y), or
   * with `stay` where they already stood when it caught them.
   */
  hold(g, id, x, y, pose, face = null, { stay = false } = {}) {
    const was = this.people[id]?.active && g.entities.includes(this.people[id]);
    const n = this.person(g, id);
    n.path = [];
    if (!(stay && was)) {
      n.x = x;
      n.y = y;
    }
    // Stopped by the pulse: the instant itself, no turn or settle after.
    if (pose === "frozen") n.freeze({ face });
    else {
      if (face) n.faceTo(face);
      n.pose(pose, Infinity);
    }
    return n;
  }

  /**
   * A person the breach caught comes apart, and what steps out of where they
   * stood is one of the things you fight: tagged into the step's count.
   */
  turn(g, id, tag, type) {
    const n = this.people[id];
    if (!n?.active) return;
    const { x, y } = n;
    this.gone(g, id);
    const e = makeHostile(x, y, type);
    e._tutTag = tag;
    e.state = "chase";
    e.lastAttackTime = g.time;
    e._lastSeen = { x: g.player.x, y: g.player.y };
    g.entities.push(e);
    g.totalEnemies = (g.totalEnemies || 0) + 1;
    this.tear(g, x, y);
    g.glitchEffect = Math.max(g.glitchEffect || 0, 0.7);
    g.audio.powerFlicker?.();
  }

  /**
   * 06:47: the Engine pulses. Everyone on the floor without an anchor is
   * caught where they stand, mid-whatever; every clock stops on the minute.
   */
  minute(g) {
    if (this.frozen) return;
    this.frozen = true;
    // What the morning still had to say (an oddity's lines, a trial's
    // comment) is stale now: the people who'd say it are stopped.
    this.script = this.script.filter((s) => s.step !== null);
    this.say([["PA", "The time is six forty-seven.", "calm"]]);
    g.screenShake = Math.max(g.screenShake || 0, 6);
    g.glitchEffect = 1;
    g.audio.tremor?.();
    playChronoSound(g.audio, "timeStop");
    this.flicker(g, 0.6);
    this.setClocks(g, true);
    // Mid-step, mid-stamp, mid-pour: each stops in the instant, not after it.
    for (const id of Object.keys(PEOPLE)) this.person(g, id).freeze();
    this._stillLife(g);
    // The Supervisor stops with them, then tears free: he wore one of R&D's
    // resist vests under his shirt, not trusting the calibration, and it
    // barely held. The first sign of what "half held" means.
    const sup = this.sup;
    if (sup?.active) {
      sup.freeze();
      setTimeoutGame(this, 2.4, () => {
        if (!sup.active) return;
        sup.thaw();
        g.glitchEffect = Math.max(g.glitchEffect || 0, 0.5);
        g.audio.powerFlicker?.();
        this.say([
          ["ARIA", "The Supervisor's moving. Barely.", "afraid"],
          ["SUPERVISOR", "Resist vest. One of Orr's, under the shirt. I didn't trust their calibration.", "afraid"],
          ["SUPERVISOR", "It barely held.", "afraid"],
        ]);
      });
    }
  }

  /** What the pulse caught in the air, put back where it hangs. */
  _stillLife(g) {
    this.place(g, "frozenPour", new Prop(FROZEN_POUR.x, FROZEN_POUR.y, "frozen_pour"));
    const paper = new Prop(FROZEN_PAPER.x, FROZEN_PAPER.y, "frozen_paper");
    paper.lift = FROZEN_PAPER.lift;
    this.place(g, "frozenPaper", paper);
  }

  /**
   * The people, as the step finds them (and as a checkpoint puts them back):
   * the morning's routine from the walk until 06:47, stopped from then on.
   */
  _stagePeople(g) {
    const at = (s) => PROLOGUE_STEPS.findIndex((d) => d.id === s);
    if (this.step >= at("alarm") || this.frozen) this.aftermath(g);
    else if (this.step >= at("walk")) for (const k of Object.keys(PEOPLE)) this.person(g, k);
  }

  /**
   * The floor after 06:47: everyone where it caught them, mid-stamp,
   * mid-sentence, mid-pour; Orr at Lift B until the evac turns her. (A
   * checkpoint puts back anyone who wasn't on the floor at their spot.)
   */
  aftermath(g) {
    this.frozen = true;
    this.setClocks(g, true);
    this._stillLife(g);
    for (const [id, d] of Object.entries(PEOPLE)) {
      if (id === "orr") continue;
      this.hold(g, id, d.at[0], d.at[1], "frozen", { x: d.face[0], y: d.face[1] }, { stay: true });
    }
    if (this.step <= PROLOGUE_STEPS.findIndex((d) => d.id === "wave1")) this.hold(g, "orr", 32.4, 5.6, "frozen", LIFT_CAR, { stay: true });
    else this.gone(g, "orr");
    // Gone down the shaft, whatever the alarm got to show.
    if (this.step > PROLOGUE_STEPS.findIndex((d) => d.id === "alarm") && this.sup?.active && this.sup.x < 36 && this.sup.y < 12) this.sup.active = false;
  }

  /** Lift B's doors: open now, or shut as soon as nobody stands in them. */
  lift(g, open) {
    this.liftWant = open;
    this._updateLift(g);
  }

  _updateLift(g) {
    const grid = g.map?.grid;
    if (!grid || this.liftWant === this.liftOpen) return;
    if (!this.liftWant) {
      // Never shut on someone: the player, or a person stepping out.
      const inDoor = (e) => Math.floor(e.y) === LIFT_DOORS[0].y && e.x >= LIFT_DOORS[0].x - 0.3 && e.x < LIFT_DOORS[1].x + 1.3;
      if (inDoor(g.player) || g.entities.some((e) => e.type === "enemy" && e.active && e.health > 0 && inDoor(e))) return;
    }
    for (const d of LIFT_DOORS) grid[d.y][d.x] = this.liftWant ? 0 : d.shut;
    this.liftOpen = this.liftWant;
    // The doors shut on the Supervisor; then he is gone down the shaft.
    if (this.supDown && !this.liftOpen && this.sup?.active) {
      this.sup.active = false;
      g.audio.doorOpen?.();
      g.screenShake = Math.max(g.screenShake || 0, 2);
    }
  }

  /** ARIA, once, as you pass someone the breach caught (NOTICES). */
  _updateNotices(g) {
    const id = this.def?.id;
    for (const n of NOTICES) {
      if (this._noticed.has(n.id) || !n.steps.includes(id)) continue;
      const who = this.people[n.who];
      if (!who?.active || !this.near(g, who.x, who.y, n.r)) continue;
      this._noticed.add(n.id);
      this.say(n.lines);
    }
  }

  /** Everything a step put down with this tag goes. */
  clearTag(g, tag) {
    g.entities = g.entities.filter((e) => e._tutTag !== tag);
  }

  /** A finished drill's targets leave the range, so the next drill starts clean. */
  clearTargets(g, tag) {
    g.entities = g.entities.filter((e) => !(e._target && e._tutTag === tag));
  }

  /** How many of a step's enemies are still up, or still on their way in (arrive()). */
  alive(g, tag) {
    let n = pendingArrivals(g, (e) => e._tutTag === tag);
    for (const e of g.entities) if (e._tutTag === tag && e.type === "enemy" && e.active && e.state !== "dead" && e.health > 0) n++;
    return n;
  }

  /** An evac wave: a short breath, then the wave through its tears; done when it is down. */
  wave(g, tag, spots) {
    if (!this.c.spawned) {
      this.c.delay -= g.deltaTime;
      if (this.c.delay <= 0) {
        this.arrive(g, tag, spots);
        g.audio.alarmKlaxon?.();
      }
      return false;
    }
    return this.cleared(g, tag);
  }

  /** Lift B's beacon, in front of its doors: sealed until the power's on and the car is back up. */
  ensureExit(g, sealed) {
    if (!g.exitEntity || !g.entities.includes(g.exitEntity)) {
      g.exitEntity = { x: 29.5, y: 3.5, type: "exit", active: true, sealed, _tutTag: "exit" };
      g.entities.push(g.exitEntity);
    }
    g.exitEntity.sealed = sealed;
  }

  // ── Set pieces ──────────────────────────────────────────────────

  /** Moving targets glide along their lane; holograms flicker. */
  _updateTargets(g) {
    for (const e of g.entities) {
      if (e._holo && e.type === "enemy" && e.health > 0) {
        e.renderAlpha = e._corrupt
          ? 0.35 + Math.random() * 0.55
          : 0.62 + 0.18 * Math.sin(this.clock * 9 + e.x * 3) - (Math.random() < 0.02 ? 0.3 : 0);
      }
      const tr = e._track;
      if (!tr || e.type !== "enemy" || e.health <= 0) continue;
      const s = Math.sin(this.clock * tr.speed + (tr.phase || 0)) * tr.amp;
      if (tr.axis === "x") e.x = tr.x0 + s;
      else e.y = tr.y0 + s;
    }
  }

  /**
   * A room's own lamps (TUTORIAL_MAP.roomLights), lit while the player is in
   * or beside the room and dropped when they leave: the wall pass lights at
   * most 16 at once, and the station has more lamps than that.
   */
  _syncRoomLights(g) {
    if (!g.lights) return;
    this._roomLights ??= (TUTORIAL_MAP.roomLights || []).map((d) => ({
      room: d.room, x: d.x, y: d.y, color: d.color, radius: d.radius,
      baseIntensity: d.intensity, intensity: d.intensity, life: 1e9, maxLife: 1e9,
    }));
    const p = g.player;
    const near = (b) => p.x > b.x0 - 3 && p.x < b.x1 + 3 && p.y > b.y0 - 3 && p.y < b.y1 + 3;
    // The blackout puts the room lamps out with the rest of the station.
    const dark = this.blackout;
    for (const L of this._roomLights) {
      const box = TUTORIAL_MAP.rooms?.[L.room];
      const on = !dark && box && near(box);
      const i = g.lights.indexOf(L);
      if (on) {
        L.life = L.maxLife = 1e9;
        L.intensity = L.baseIntensity * (this.clock < this.flickerUntil ? 0.35 : 1);
        if (i < 0) g.lights.unshift(L);
      } else if (i >= 0) g.lights.splice(i, 1);
    }
  }

  /** The alarm's red emergency lights, pulsing down the corridor and the office. */
  _updateAlert(g) {
    if (!this.alert) {
      if (this._alertLights) this._clearLights("alert");
      return;
    }
    if (!this._alertLights) {
      const spots = [
        [29.5, 24.5],
        [29.5, 18.5],
        [38.5, 20.5],
        [46.5, 17.5],
        [46.5, 24.5],
      ];
      this._alertLights = spots.map(([x, y]) => ({ x, y, color: [255, 30, 50], radius: 4, baseIntensity: 1, intensity: 1, life: 1e9, maxLife: 1e9 }));
      for (const L of this._alertLights) g.lights?.unshift(L);
    }
    const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(this.clock * 4));
    for (const L of this._alertLights) {
      L.intensity = L.baseIntensity = pulse;
      L.life = L.maxLife = 1e9;
      if (g.lights && !g.lights.includes(L)) g.lights.unshift(L);
    }
  }

  /** Whether a vent strip is firing at its own phase of the cycle. */
  ventHot(strip) {
    const t = ((this.vents?.clock ?? 0) + strip.phase) % VENT_CYCLE;
    return t < VENT_ON;
  }

  updateVents(g, dt) {
    const v = this.vents;
    if (!v) return;
    // Chrono Shift slows the vents, not you; the puffs thin out with them.
    const step = g.player.chronoActive ? g.deltaTime * VENT_CHRONO : dt;
    const wasHot = VENT_STRIPS.map((strip) => this.ventHot(strip));
    v.clock += step;
    v.cooldown -= g.deltaTime;
    v.puff -= step;
    if (!v.lights.length) {
      for (const strip of VENT_STRIPS) {
        for (const x of [28.5, 31.5]) {
          const L = { x, y: strip.rows[0] + 1, color: [255, 110, 30], radius: 2.4, baseIntensity: 1, intensity: 1, life: 1e9, maxLife: 1e9, _strip: strip };
          v.lights.push(L);
          g.lights?.unshift(L);
        }
      }
    }
    const p = g.player;
    const puff = v.puff <= 0;
    if (puff) v.puff = 0.05;
    for (const [i, strip] of VENT_STRIPS.entries()) {
      const hot = this.ventHot(strip);
      const [top, bottom] = strip.rows;
      if (hot && !wasHot[i]) {
        playChronoSound(g.audio, g.player.chronoActive ? "ventSlow" : "ventIgnite", { x: 29.5, y: top + 1, player: p });
      }
      // The glow sinks over a burn's last moments: the cue to go.
      const left = VENT_ON - ((v.clock + strip.phase) % VENT_CYCLE);
      const sink = Math.max(0.3, Math.min(1, left / 0.4));
      for (const L of v.lights) {
        if (L._strip !== strip) continue;
        L.intensity = L.baseIntensity = hot ? 1.5 * sink : 0.12;
        L.life = L.maxLife = 1e9;
        if (g.lights && !g.lights.includes(L)) g.lights.unshift(L);
      }
      if (hot && puff) {
        g._spawnParticlesAt?.(null, (ps) =>
          spawnEnergyBurst(ps, VENT_COLS[0] + Math.random() * (VENT_COLS[1] - VENT_COLS[0] + 1), top + Math.random() * 2, { count: 2, r: 255, g: 120, b: 40 }),
        );
      }
      const row = Math.floor(p.y);
      const inStrip = row >= top && row <= bottom && p.x >= VENT_COLS[0] && p.x < VENT_COLS[1] + 1;
      if (hot && inStrip && v.cooldown <= 0 && p.alive) {
        v.cooldown = 0.6;
        g.damagePlayer(VENT_DAMAGE, { x: p.x, y: bottom + 1.5 });
        // Blown back to the near side of the strip.
        p.y = top - 0.35;
        g.screenShake = Math.max(g.screenShake || 0, 3);
        if (!v.warned) {
          v.warned = true;
          this.say([["ARIA", "Ow. For both of us. Hold the Shift and time it.", "worried"]]);
        }
      }
    }
  }

  clearVents(g) {
    if (!this.vents) return;
    for (const L of this.vents.lights) {
      const i = g.lights?.indexOf(L) ?? -1;
      if (i >= 0) g.lights.splice(i, 1);
    }
    this.vents = null;
  }

  _clearLights(which = null) {
    const g = this.game;
    const drop = (L) => {
      const i = g.lights?.indexOf(L) ?? -1;
      if (i >= 0) g.lights.splice(i, 1);
    };
    if (!which || which === "alert") {
      for (const L of this._alertLights || []) drop(L);
      this._alertLights = null;
    }
    if (!which && this.vents) this.clearVents(g);
  }

  // ── The end of the chapter ──────────────────────────────────────

  _finish() {
    const g = this.game;
    g.achievementStats.tutorialComplete = true;
    g.checkAchievements();
    this.originPlayed = true;
    g.audio.stopMusic();
    this._clearLights();
    this.alert = false;
    this.blackout = false;
    this.sim = null;
    g.powerCells = null;
    g.exitEntity = null;
    g.entities = g.entities.filter((e) => e.type !== "exit" && e.type !== "npc");
    this.sup = null;
    this.squad = [];
    this.people = {};
    this.lockerLight(g, false);
    this.step = TUTORIAL_SANDBOX_STEP;
    this.stepTime = performance.now();
    this.clock = 0;
    this._postCard(TUTORIAL_SANDBOX_STEP);
    g.objectiveWaypoint = null;
  }

  _updateSandbox() {
    const g = this.game;
    g.objectiveWaypoint = null;
    if (!this.sandboxInit) {
      this.sandboxInit = true;
      this.spawnDummies();
      this.showCompletionMenu = true;
      g.state = GameState.TUTORIAL_COMPLETE;
      g.unlockPointer();
    }
    const dummies = g.entities.filter((e) => e.type === "enemy" && e.active && e.state !== "dead");
    if (dummies.length === 0 && this.sandboxInit) this.spawnDummies();
  }

  spawnDummies() {
    const g = this.game;
    g.entities = g.entities.filter((e) => e.type !== "enemy" || (e.active && e.state !== "dead"));
    const positions = [
      { x: 20.5, y: 6.5 },
      { x: 39.5, y: 6.5 },
      { x: 29.5, y: 4.5 },
    ];
    for (const pos of positions) {
      const dummy = new Enemy(pos.x, pos.y, "drone");
      dummy.health = 20;
      dummy.maxHealth = 20;
      dummy.speed = 0;
      dummy.def = { ...dummy.def, damage: 0, speed: 0, sightRange: 0 };
      dummy.alertRange = 0;
      dummy.state = "idle";
      g.entities.push(dummy);
    }
    g.totalEnemies = 3;
    g.killedEnemies = 0;
  }

  executeMenuChoice(choice) {
    const g = this.game;
    g.unlockPointer();
    g.audio.stopMusic();
    g.mode = null;
    switch (choice) {
      case 0: g.startCampaign(); break;
      case 1: g.startArena(); break;
      case 2: g.startTutorial(); break;
      case 3:
      default:
        g.state = GameState.TITLE;
        g.audio.stopMusic();
        g.audio.startTrack("menu");
        g.audio.startAmbient("menu");
        break;
    }
  }

  executeCompletionChoice(choice) {
    const g = this.game;
    this.showCompletionMenu = false;
    switch (choice) {
      case 0: // Continue Training — back into the sandbox step
        this.step = TUTORIAL_SANDBOX_STEP;
        this.stepTime = performance.now();
        this.sandboxInit = false;
        g.state = GameState.PLAYING;
        g.audio.startTrack("campaign", 130);
        g.audio.startAmbient("industrial");
        g.lockPointer();
        break;
      case 1: // Begin Campaign
        g.unlockPointer();
        g.startCampaign();
        break;
      case 2: // Customize Agent
        g.creatorReturnState = GameState.TUTORIAL_COMPLETE;
        g.state = GameState.CHARACTER_CREATE;
        break;
      case 3: // Main Menu
      default:
        g.unlockPointer();
        g.mode = null;
        g.state = GameState.TITLE;
        g.audio.stopMusic();
        g.audio.startTrack("menu");
        g.audio.startAmbient("menu");
        break;
    }
  }

  shouldShow() {
    const g = this.game;
    if (g.alwaysShowTutorial) return true;
    return !g.achievementStats.tutorialComplete;
  }
}

/** The word on a trial just finished, from whoever ran it, after its grade. */
function trialComment(trial, r) {
  const name = trial.name.charAt(0) + trial.name.slice(1).toLowerCase();
  const good = r.grade === "S" || r.grade === "A";
  if (trial.lead === "VALE") return good ? `That's an ${r.grade}. I'm putting you on the board.` : `${r.grade}. You'll get faster. Everyone does.`;
  if (trial.lead === "LIN") return good ? `Combat: ${r.grade}. The sim's sulking.` : `Combat: ${r.grade}. It's on the sheet. Go on.`;
  if (good) return `${name}: ${r.grade}. Don't let it go to your head.`;
  return `${name}: ${r.grade}. It's on the sheet now, Cadet. Next.`;
}

/** Step logic ids, for the tests: every prologue step must have logic. */
export const PROLOGUE_LOGIC_IDS = Object.keys(LOGIC);
