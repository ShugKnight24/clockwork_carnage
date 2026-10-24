/**
 * TutorialSystem — the prologue chapter (src/data/prologue.js): state,
 * progression, set pieces and checkpoints.
 *
 * Each step of PROLOGUE_STEPS has logic here, keyed by its id: `enter` sets
 * the step up (opens doors, spawns targets or hostiles, starts a hazard) and
 * `update` says when it is done. A beat's first step is a checkpoint: dying
 * puts you back there with the beat set up again, never back to the start.
 *
 * Certification Day runs as a hub: the "certify" step holds the sheet and
 * starts whichever trial you walk into; a trial's last step hands back to
 * it, and each trial finished makes the calibration a little stranger
 * (escalate). After the fourth, the sign-off at Lift B, and 06:47.
 *
 * Receives a `game` reference for the shared state (player, entities, audio,
 * map, comms).
 */
import { TUTORIAL_MAP } from "./data.js";
import { STATION_WALLS } from "../src/data/walls.js";
import { Enemy, Pickup, Prop } from "./entities.js";
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
import { ARENA_WALLS, COVER_LAYOUTS } from "../src/data/levels/rooms/arena.js";
import { HALL_WALLS } from "../src/data/levels/rooms/halls.js";
import { RND_WALLS, RIG_AT, BREAKER_CELL } from "../src/data/levels/rooms/rnd.js";
import { ATRIUM_GAP } from "../src/data/levels/rooms/atrium.js";
import { CORRIDOR_WALLS } from "../src/data/levels/rooms/corridor.js";
import { DISPATCH_WALLS } from "../src/data/levels/rooms/dispatch.js";
import { HOLDING_WALLS } from "../src/data/levels/rooms/holding.js";
import { INTERVIEW_WALLS } from "../src/data/levels/rooms/interview.js";
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
  // R&D meet you at the range, then go to their trials.
  orr: { kind: "staff", name: "Dr. Nadia Orr", look: 0, at: [37.2, 38.8], face: [34.5, 41.5], caught: "stepping" },
  lin: { kind: "staff", name: "Teo Lin", look: 1, at: [38.8, 38.7], face: [34.5, 41.5], caught: "watching" },
  vale: { kind: "staff", name: "Ines Vale", look: 1, at: [36.2, 39.7], face: [34.5, 41.5], caught: "timing" },
  // The east wing.
  booker: { kind: "clerk", name: "Clerk Ruiz", look: 0, at: [68.5, 53.4], face: [68.5, 56], caught: "stamping" },
  detainee: { kind: "clerk", name: "Detainee", look: 1, at: [63.5, 53.4], face: [63.5, 57], caught: "posing" },
  haas: { kind: "officer", name: "Det. Haas", at: [44.5, 53.9], face: [44.5, 56.6], caught: "asking" },
  suspect: { kind: "clerk", name: "Suspect", look: 1, at: [44.5, 56.6], face: [44.5, 53.9], caught: "answering" },
  cole: { kind: "clerk", name: "Dispatcher Cole", look: 0, at: [78.8, 21.5], face: [84, 21.5], caught: "radio" },
  imani: { kind: "staff", name: "Dispatcher Imani", look: 0, at: [78.8, 23.5], face: [84, 23.5], caught: "radio" },
};
/** Up the corridor from the front desk to her cabinets, while you cross to the range. */
const NAND_ROUTE = [[29.5, 46.5], [29.5, 20.6], [34.6, 20.6], [37.5, 18.6], [39.5, 17.3]];
/** Where R&D go when they've handed you the sheet: to run their trials. */
const STATIONS = {
  orr: { x: 73.5, y: 8.5, face: RIG_AT },
  lin: { x: 22.5, y: 9.7, face: { x: 29.5, y: 4.5 } },
  vale: { x: 31.2, y: 50.6, face: { x: 29.5, y: 49.5 } },
};

/**
 * What the floor's people say if you talk to them (press interact facing
 * them): a line each, in turn. Never a stop; nobody waits on it.
 */
const TALK = {
  pike: [["STAFF", "Front desk. If it's lost property, it's Thursday's problem."], ["STAFF", "Lift B again? The log says nobody's on it. It's said that all night."]],
  nand: [["STAFF", "Post for the Supervisor. Mostly the Bureau, wanting things by noon."]],
  brooks: [["STAFF_M", "Mendez says you won't pass. I've got five on you."]],
  mendez: [["OFFICER", "Coffee's terrible. I came in on my day off for it anyway."]],
  varga: [["OFFICER", "Pace the run. Everyone sprints the first straight and walks the last."]],
  orr: [["DR. ORR", "Telemetry's the easy one. You stand there and I worry."]],
  lin: [["LIN", "The sim's only light. It still hurts your pride."]],
  vale: [["VALE", "The clock starts the moment you cross the gate. No pressure."]],
  booker: [["STAFF_M", "Booking's quiet till nine. Unless you've brought me someone."]],
  detainee: [["STAFF", "What time is it? No, really. What time is it?"]],
  haas: [["OFFICER", "Close the door, Cadet. We're nearly there with this one."]],
  suspect: [["STAFF", "I told him already. I keep losing the same minute."]],
  cole: [["STAFF_M", "Engine level's not answering check-ins. They say it's the calibration."]],
  imani: [["STAFF", "Heavy A and B, both on the chamber door. Quiet morning, apart from that."]],
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
  [HALL_WALLS.CERT_BOARD]: [["ARIA", "R&D's board. Four trials, your badge at the top. Somebody drew a smiley next to telemetry.", "happy"]],
  [HALL_WALLS.DIRECTORY]: [["ARIA", "Floor plan. R&D's up the east side, past dispatch. Holding's at the bottom.", "calm"]],
  [HALL_WALLS.MEMORIAL]: [["ARIA", "The heavy squads, in C-series plate. The suit before yours. Rasczak's in the middle.", "calm"]],
  [HALL_WALLS.PT_POSTER]: [["ARIA", "Varga's poster. 'Pace yourself.' Annoyingly good advice.", "warm"]],
  [CORRIDOR_WALLS.NOTICE]: [["ARIA", "Softball against the fire department, Saturday. You're not on the team sheet. Yet.", "warm"]],
  [RND_WALLS.WHITEBOARD]: [["ARIA", "Orr's maths. 'C: a half. D: one?' And six forty-seven, circled twice.", "curious"]],
  [RND_WALLS.LIFT_A]: [["ARIA", "Lift A. R&D's freight car to the Engine level. Locked out for the calibration.", "calm"]],
  [RND_WALLS.SUIT_RACK]: [["ARIA", "C-series. The squads' heavy plate. Same frame as yours, two generations back.", "curious"]],
  [RND_WALLS.BREAKER]: [["ARIA", "R&D's main breaker. It feeds Lift B, apparently.", "calm"]],
  [DISPATCH_WALLS.DUTY_BOARD]: [["ARIA", "Both heavy squads on the Engine level. And you: trials.", "calm"]],
  [DISPATCH_WALLS.CITY_MAP]: [["ARIA", "Every unit in the city. One red one hasn't checked in.", "worried"]],
  [HOLDING_WALLS.RIGHTS]: [["ARIA", "'You may know the time of your arrest.' Funny thing to promise.", "curious"]],
  [INTERVIEW_WALLS.ONE_WAY]: [["ARIA", "One-way glass. From in there it's a mirror. They still wave at it.", "warm"]],
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
 * Where each trial starts from the hub, and what starts it: the pistol on
 * the range's first bench, the start gate in the lobby, walking into the
 * sim hall, walking into R&D.
 */
const TRIAL_START = {
  weapons: { x: 38.5, y: 42.5 },
  mobility: { x: 29.5, y: 49.5 },
  combat: { x: 29.5, y: 10.0 },
  telemetry: { x: 63.5, y: 10.5 },
};
const inSimHall = (p) => p.x > 9 && p.x < 51 && p.y > 3 && p.y < 10.6;
const inRnd = (p) => p.x > 61.6 && p.y < 14;

/**
 * The mobility run (src/data/prologue.js, beat 3): its gates in order, from
 * the start gate in the lobby round the floor and back to it. Each step of
 * the trial runs to its last gate: SEGMENT_END.
 */
const RUN_GATES = [
  { x: 29.5, y: 49.5 }, // start, in the lobby
  { x: 29.5, y: 22.5 }, // the top of the corridor: a straight longer than a sprint
  { x: 5.5, y: 20.5 }, // the gym's far wall
  { x: 29.5, y: 16.5 }, // out of the gym's north door, under its shutter
  { x: 58.5, y: 21.0 }, // through the office into the spine
  { x: 62.9, y: 41.5 }, // down the spine, under its shutter, to the bridge
  { x: 83.5, y: 41.5 }, // across the bridge, over the gap
  { x: 29.5, y: 49.5 }, // home: the start gate
];
const SEGMENT_END = { sprint: 2, slide: 5, dash: 6, runHome: 7 };
const RUN_GATE_R = 1.25;
/** The shutters stuck half down across the run, one prop per cell. */
const SHUTTERS = [
  { x: 25, y: 16 },
  { x: 25, y: 17 },
  { x: 58, y: 27 },
  { x: 59, y: 27 },
];
/** After a dash ends you still carry over the gap for this long. */
const DASH_CARRY = 0.3;

/** Seconds the rig takes to read the suit, standing still on its pad. */
const READ_TIME = 7;
/** Orr's commentary as the reading goes: [fraction read, line]. */
const READ_LINES = [
  [0.3, ["DR. ORR", "Servo load nominal. Plating nominal. Pulse... a bit high.", "calm"]],
  [0.65, ["DR. ORR", "Same frame as the squads' heavy plate. The C-series. Theirs only half takes the module.", "curious"]],
];

/** How long a telegraphed arrival glows before it opens (seconds). */
const ARRIVE_LEAD = 1.5;

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
                  n.dress("officerKit");
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
    update: (t, g) => t.near(g, 23.5, 41.5, 2.2),
  },

  toRange: {
    waypoint: { x: 36.5, y: 41.5 },
    enter(t, g) {
      t.openDoors(g, "door2");
      // He went on ahead from the locker room; a checkpoint puts him there.
      if (!t.sup?.path?.length) t.supWalk(g, "atRange");
    },
    update: (t, g) => t.near(g, 36.5, 41.5, 1.8),
  },

  // ── Certification Day: the hub ─────────────────────────────────

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
      if (!cert.done.mobility) t.startGate(g);
      if (!cert.briefed) {
        cert.briefed = true;
        t.say(t.def.brief, { keep: true });
        // R&D hand over the sheet and go to their trials as they talk.
        setTimeoutGame(t, 5, () => t.toStation(g, "vale"));
        setTimeoutGame(t, 8, () => t.toStation(g, "lin"));
        setTimeoutGame(t, 11, () => t.toStation(g, "orr"));
      }
    },
    update(t, g) {
      const p = g.player;
      const todo = PROLOGUE_TRIALS.filter((tr) => !t.cert.done[tr.id]);
      const nearest = todo
        .map((tr) => ({ id: tr.id, ...TRIAL_START[tr.id] }))
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      g.objectiveWaypoint = nearest ? { x: nearest.x, y: nearest.y } : null;
      const starts = {
        weapons: () => t.near(g, TRIAL_START.weapons.x, TRIAL_START.weapons.y, 1.3),
        mobility: () => t.near(g, TRIAL_START.mobility.x, TRIAL_START.mobility.y, RUN_GATE_R),
        combat: () => inSimHall(p),
        telemetry: () => inRnd(p),
      };
      for (const tr of todo) {
        if (starts[tr.id]()) {
          t.c.pick = tr.id;
          return true;
        }
      }
      return false;
    },
    progress: (t) => t.sheetText(),
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
   * Hook: the armorer's active-reload drill (another builder's system). Its
   * step sits between the shotgun and the resupply; until the drill exists
   * it completes at once.
   */
  reloadDrill: {
    update: () => true,
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

  // ── Trial: mobility (the run) ──────────────────────────────────

  sprint: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      t.openDoors(g, "door3", "door4", "door15", "door16");
      t.startCourse(g);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.sprint),
    progress: (t) => t.courseText(),
  },

  slide: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      if (!t.course) t.startCourse(g, SEGMENT_END.sprint + 1);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.slide),
    progress: (t) => t.courseText(),
  },

  dash: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      if (!t.course) t.startCourse(g, SEGMENT_END.slide + 1);
    },
    update: (t, g) => t.runCourse(g, SEGMENT_END.dash),
    progress: (t) => t.courseText(),
  },

  runHome: {
    get waypoint() {
      return null;
    },
    enter(t, g) {
      if (!t.course) t.startCourse(g, SEGMENT_END.dash + 1);
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
   * Hook: the cover lesson (another builder's cover system), taught here in
   * the sim hall before the waves. Until it exists the step completes at
   * once; the waves already raise holo cover (TutorialSystem.raiseCover).
   */
  coverDrill: {
    update: () => true,
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
        g.projectiles = [];
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
      g.projectiles = [];
    },
  },

  // ── Trial: telemetry (R&D's rig) ───────────────────────────────

  telemetry: {
    waypoint: RIG_AT,
    enter(t, g) {
      t.c.read = 0;
      t.c.said = 0;
      t.c.lastX = g.player.x;
      t.c.lastY = g.player.y;
      t.toStation(g, "orr", { snap: true });
      t.c.rig = g.entities.find((e) => e.type === "prop" && e.propType === "telemetry_rig");
    },
    update(t, g) {
      const p = g.player;
      const still = Math.hypot(p.x - t.c.lastX, p.y - t.c.lastY) < 0.02;
      t.c.lastX = p.x;
      t.c.lastY = p.y;
      const on = t.near(g, RIG_AT.x, RIG_AT.y, 0.75);
      // Off the pad, or walking about on it, the reading waits; it never resets.
      if (on && still) t.c.read += g.deltaTime;
      if (t.c.rig) t.c.rig.scan = on ? 1 : 0;
      const k = t.c.read / READ_TIME;
      while (t.c.said < READ_LINES.length && k >= READ_LINES[t.c.said][0]) t.say([READ_LINES[t.c.said++][1]]);
      return k >= 1;
    },
    progress: (t, g) => (t.near(g, RIG_AT.x, RIG_AT.y, 0.75) ? `READING ${Math.min(100, Math.round((t.c.read / READ_TIME) * 100))}% · HOLD STILL` : "STAND ON THE RIG'S PAD"),
    exit(t) {
      if (t.c.rig) t.c.rig.scan = 0;
      // The setup for the minute to come: the anchor sees what it shouldn't.
      t.say([
        ["DR. ORR", "That's odd. Your suit's anchor is reading the Engine.", "worried"],
        ["DR. ORR", "It shouldn't be able to see the Engine from here.", "worried"],
      ], { keep: true });
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
    },
    update(t, g) {
      const sup = t.sup;
      g.objectiveWaypoint = sup ? { x: sup.x, y: sup.y } : SUP_AT_LIFT;
      if (!sup) return t.near(g, SUP_AT_LIFT.x, SUP_AT_LIFT.y, 2.6);
      return t.near(g, sup.x, sup.y, 2.6) && inSimHall(g.player);
    },
    exit(t) {
      // He noticed the best of the four.
      const line = t.bestTrialLine();
      if (line) t.say([["SUPERVISOR", line, "calm"]], { keep: true });
    },
  },

  sixFortySeven: {
    enter(t, g) {
      t.c.phase = "wait";
      t.c.at = 0;
    },
    update(t, g) {
      const c = t.c;
      if (c.phase === "wait" && t.clock > 2 && (t.scriptIdle() || t.clock > 7)) {
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
        g.entities.push(e);
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

  alarm: {
    // Once he's on his way down, the marker points at his office: the
    // override, and the fight. (Until then you watch him go.)
    get waypoint() {
      return null;
    },
    // The klaxon cuts in under the Supervisor.
    enter(t, g) {
      t.c.armed = false;
      t.openDoors(g, "door4");
    },
    update(t, g) {
      if (!t.c.armed && t.clock > 1 && (t.scriptIdle() || t.clock > 3)) {
        t.c.armed = true;
        t.c.at = t.clock;
        g.audio.alarmKlaxon?.();
        g.screenShake = 4;
        g.glitchEffect = 0.6;
        t.alert = true;
        t.say(t.def.lines, { cut: true });
      }
      // He tells you to stay, and goes: into Lift B, at a run. He turns in
      // the car to look at you, and the doors close on him (_updateLift).
      if (t.c.armed && !t.c.gone && t.clock - t.c.at > 6 && t.sup?.active) {
        t.c.gone = true;
        t.lift(g, true);
        t.sup.walk(SUP_ROUTES.leave, {
          speed: 3.4,
          then: (sup) => {
            sup.faceTo(g.player);
            setTimeoutGame(t, 1.6, () => {
              t.liftWant = false;
              t.supDown = true;
            });
          },
        });
      }
      if (t.c.armed && t.clock - t.c.at > 5) g.objectiveWaypoint = { x: 37.5, y: 20.5 };
      // Once he's gone the fight is on; his last lines play over it.
      return t.c.armed && t.clock - t.c.at > 9;
    },
  },

  // ── The breach ─────────────────────────────────────────────────

  cover: {
    waypoint: { x: 37.5, y: 20.5 },
    enter(t, g) {
      t.alert = true;
      t.lift(g, false);
      // Through tears in the office: each glows and crackles before it opens.
      t.arrive(g, "cover", [
        [53.5, 24.5, "henchman"],
        [53.5, 16.5, "henchman"],
        [48.5, 24.5, "henchman"],
      ]);
    },
    update: (t, g) => t.cleared(g, "cover"),
    progress: (t, g) => `HOSTILES ${t.alive(g, "cover") + (t.c.pending || 0)}`,
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
    progress: (t, g) => `DRONES ${t.alive(g, "slowFire") + (t.c.pending || 0)}`,
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
    update: (t, g) => t.near(g, 29.5, 10.0, 2.0),
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
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave1") + (t.c.pending || 0)} · LIFT ▲ 30%`,
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
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave2") + (t.c.pending || 0)} · LIFT ▲ 60%`,
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
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave3") + (t.c.pending || 0)} · LIFT ▲ 90%`,
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
    /** The mobility run while it lasts: its gates, shutters and clock. */
    this.course = null;
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
    g.world = null;
    g.player.x = TUTORIAL_MAP.playerStart.x;
    g.player.y = TUTORIAL_MAP.playerStart.y;
    g.player.angle = TUTORIAL_MAP.playerStart.dir;
    g.player.alive = true;
    g.player.weapons = [];
    g.player.currentWeapon = -1;
    g.entities = [];
    g.dustMotes = null;
    g.projectiles = [];

    for (const p of TUTORIAL_MAP.pickups) {
      g.entities.push(new Pickup(p.x, p.y, p.type, p));
    }
    if (TUTORIAL_MAP.props) {
      for (const p of TUTORIAL_MAP.props) {
        const pos = validatePropPosition(p.x, p.y, TUTORIAL_MAP.grid, TUTORIAL_MAP.width, TUTORIAL_MAP.height);
        if (pos) g.entities.push(new Prop(pos.x + 0.5, pos.y + 0.5, p.type));
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
    if (this.cert.run) this.cert.run.clock += g.deltaTime || 0;
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
    // Dressed, the cadet gets a look at themself: the creator, pre-filled
    // with the saved agent, then back to the locker room.
    const fitting = () => {
      g.unlockPointer?.();
      g.creatorCategory = 0;
      g._creatorSaveCallback = done;
      g.state = GameState.CHARACTER_CREATE;
    };
    if (g.hasCutsceneScript?.("suit_up")) g.startCutscene("suit_up", fitting);
    else fitting();
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
    this.say([lines[k % lines.length]]);
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

  /** A trial starts from the hub: its clock and its shot count from now. */
  _beginTrial(id) {
    const g = this.game;
    this.cert.run = { trial: id, clock: 0, shots: g.shotsFired || 0, hits: g.shotsHit || 0 };
  }

  /**
   * A trial's last step is done: grade it onto the sheet, then make the
   * calibration a little stranger for it.
   */
  _finishTrial(id) {
    const g = this.game;
    const run = this.cert.run?.trial === id ? this.cert.run : { clock: 0, shots: g.shotsFired || 0, hits: g.shotsHit || 0 };
    const shots = (g.shotsFired || 0) - run.shots;
    const hits = (g.shotsHit || 0) - run.hits;
    const acc = shots > 0 ? Math.min(1, hits / shots) : null;
    const trial = PROLOGUE_TRIALS.find((tr) => tr.id === id);
    const result = { time: run.clock, acc, grade: gradeTrial(trial, run.clock, acc) };
    this.cert.done[id] = result;
    this.cert.order.push(id);
    this.cert.run = null;
    const n = this.cert.order.length;
    if (n < PROLOGUE_TRIALS.length) {
      this.say([["SUPERVISOR", trialComment(trial, result), "calm"]], { keep: true });
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
      if (this._lastPA) this.say([["PA", this._lastPA, "calm"]], { keep: true });
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
      setTimeoutGame(this, 4, () => this.say(sees ? odd.lines : odd.away, { keep: true }));
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
      setTimeoutGame(this, 1.2, () => this.say(odd.lines, { keep: true }));
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

  /** The hub's start gate in the lobby, lit, until the run is done. */
  startGate(g) {
    if (g.entities.some((e) => e._tutTag === "startGate")) return;
    const gate = new Prop(RUN_GATES[0].x, RUN_GATES[0].y, "course_gate");
    gate.gate = { num: 0, state: "next" };
    gate._tutTag = "startGate";
    g.entities.push(gate);
  }

  /** The run begins (or picks up at gate `from` after a checkpoint): its gates and shutters go up. */
  startCourse(g, from = 1) {
    this.endCourse(g);
    this.clearTag(g, "startGate");
    const gates = RUN_GATES.slice(0, -1).map(({ x, y }, i) => {
      const gate = new Prop(x, y, "course_gate");
      gate.gate = { num: i, state: "ahead" };
      gate._tutTag = "gates";
      g.entities.push(gate);
      return gate;
    });
    for (const s of SHUTTERS) {
      const sh = new Prop(s.x + 0.5, s.y + 0.5, "shutter");
      sh._tutTag = "gates";
      g.entities.push(sh);
    }
    this.course = { gate: from, gates, safe: { x: g.player.x, y: g.player.y }, warned: {} };
  }

  /** The run is over: gates and shutters come down. */
  endCourse(g) {
    this.clearTag(g, "gates");
    this.course = null;
  }

  /**
   * One tick of the run, up to gate `last`: the next gate lit and pointed
   * at, the shutters only gone under low. Returns true once `last` is run.
   */
  runCourse(g, last) {
    const c = this.course;
    if (!c) return true;
    const p = g.player;
    const gate = RUN_GATES[c.gate];
    g.objectiveWaypoint = gate;
    c.gates.forEach((prop, i) => {
      const finish = c.gate === RUN_GATES.length - 1 && i === 0;
      prop.gate.state = finish ? "next" : i < c.gate ? "done" : i === c.gate ? "next" : "ahead";
      prop.gate.label = finish ? "END" : undefined;
    });
    // A shutter stops you unless you go under it: sliding, or crouched.
    const low = p.isSliding || p.isCrouching || p.crouchBlend > 0.6;
    const under = SHUTTERS.find((s) => Math.floor(p.x) === s.x && Math.floor(p.y) === s.y);
    if (under && !low) {
      p.x = c.safe.x;
      p.y = c.safe.y;
      g.screenShake = Math.max(g.screenShake || 0, 1.5);
      g.audio.menuBack?.();
      if (!c.warned.shutter) {
        c.warned.shutter = true;
        this.say([["ARIA", "Under it, not through it. Slide, or crouch and walk.", "warm"]]);
      }
    } else if (!under) {
      c.safe = { x: p.x, y: p.y };
    }
    if (this.near(g, gate.x, gate.y, RUN_GATE_R)) {
      g.audio.menuConfirm?.();
      if (c.gate >= last) {
        c.gate++;
        return true;
      }
      c.gate++;
    }
    return false;
  }

  /** The run's line on the card: the gate, and the clock. */
  courseText() {
    const c = this.course;
    const time = (this.cert.run?.clock ?? 0).toFixed(1);
    if (!c) return `${time} s`;
    const n = Math.min(c.gate, RUN_GATES.length - 1);
    return `GATE ${n} / ${RUN_GATES.length - 1} · ${time} s · PAR ${PROLOGUE_TRIALS.find((tr) => tr.id === "mobility").par} s`;
  }

  /**
   * The atrium bridge's missing section: walk into it and you are set back
   * on the near side. Mid-dash (or carried by one just ended) you are over.
   */
  _updateGap(g) {
    const p = g.player;
    if (p.isDashing) this._dashAt = this.clock;
    const inGap = Math.floor(p.x) === ATRIUM_GAP.x && Math.floor(p.y) >= ATRIUM_GAP.y0 && Math.floor(p.y) <= ATRIUM_GAP.y1;
    if (!inGap) {
      this._gapSide = p.x < ATRIUM_GAP.x ? -1 : 1;
      return;
    }
    if (p.isDashing || this.clock - (this._dashAt ?? -9) < DASH_CARRY) return;
    // Back to the edge you came from, a beat to collect yourself.
    p.x = this._gapSide > 0 ? ATRIUM_GAP.x + 1.4 : ATRIUM_GAP.x - 0.4;
    g.screenShake = Math.max(g.screenShake || 0, 3);
    g.glitchEffect = Math.max(g.glitchEffect || 0, 0.3);
    g.audio.menuBack?.();
    if (!this._gapWarned) {
      this._gapWarned = true;
      this.say([["ARIA", "Caught you. Don't walk it: dash it, right at the edge.", "worried"]]);
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
    g.projectiles = [];
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
    this._enter(cp.step);
    // The beat's lines already played once; ARIA just picks you back up.
    this.script = [];
    this.say([["ARIA", this.deaths === 1 ? "Suit rebooted you. That's what it's for. Once more, from the top of this one." : "Back on your feet. Again. I'm not counting. I'm absolutely counting.", "worried"]]);
  }

  // ── Dialogue ────────────────────────────────────────────────────

  /**
   * Queue lines to play in order once the comms are free. `cut` drops what
   * was still to come and cuts off the line in progress (an alarm).
   */
  say(lines, { cut = false, keep = false } = {}) {
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
    for (const line of lines) this.script.push({ line, step: keep ? null : this.step });
  }

  /** Whether every queued line has been said and the last has finished. */
  scriptIdle() {
    return this.script.length === 0 && !this._ourLine;
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
    while (this.script.length && stale(this.script[0].step)) this.script.shift();
    if (this._ourLine || comms.message || comms.queue?.length || this._lineGap > 0 || !this.script.length) return;
    const [speaker, text, emotion, opts] = this.script.shift().line;
    const style = SPEAKER_STYLE[speaker] ?? SPEAKER_STYLE.ARIA;
    const radio = style.radioVoice && (opts?.radio || !this.supPresent);
    const id = {};
    comms.queueLine?.({
      speaker: speaker === "STAFF" || speaker === "STAFF_M" ? "STATION" : speaker,
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
   * Real hostiles, each coming in through a way you can see coming: a tear
   * (the air cracks, glows and crackles for `lead` seconds, then opens) or
   * a vent ("vent": the grille bangs, dust, and it drops). Spots are
   * [x, y, type, via?]. The step's `pending` counts the ones still on the
   * way; `cleared` waits for them. This is the one door every post-breach
   * arrival goes through, so a telegraphed-arrival system can replace it.
   */
  arrive(g, tag, spots, { lead = ARRIVE_LEAD, make = makeHostile, via = "tear" } = {}) {
    if (this.c.spawned) return;
    this.c.spawned = true;
    this.c.pending = (this.c.pending || 0) + spots.length;
    const step = this.step;
    for (const [x, y, type, how = via] of spots) {
      const ticks = Math.ceil(lead / 0.25);
      for (let k = 0; k < ticks; k++) setTimeoutGame(this, k * 0.25, () => this.step === step && this._telegraph(g, x, y, how, k / ticks));
      setTimeoutGame(this, lead, () => {
        if (this.step !== step) return;
        this.c.pending = Math.max(0, (this.c.pending || 0) - 1);
        this._spawn(g, tag, x, y, type, make);
        if (how === "vent") {
          g.screenShake = Math.max(g.screenShake || 0, 2);
          playChronoSound(g.audio, "collapse", { x, y, player: g.player });
        } else {
          this.tear(g, x, y);
          playChronoSound(g.audio, "rift", { x, y, player: g.player });
        }
      });
    }
  }

  /** One beat of an arrival's warning: the tear brightening, or the vent rattling. */
  _telegraph(g, x, y, how, k) {
    if (how === "vent") {
      g._spawnParticlesAt?.(null, (ps) => spawnEnergyBurst(ps, x, y, { count: 3, r: 150, g: 150, b: 150 }));
      if (k > 0.5) playChronoSound(g.audio, "tick", { x, y, player: g.player });
      return;
    }
    g._spawnParticlesAt?.(null, (ps) => spawnEnergyBurst(ps, x, y, { count: 3 + Math.round(k * 8), r: 190, g: 90, b: 255 }));
    playChronoSound(g.audio, "tick", { x, y, player: g.player });
    const L = { x, y, color: [190, 90, 255], radius: 2 + k * 2, baseIntensity: 0.4 + k, intensity: 0.4 + k, life: 0.3, maxLife: 0.3 };
    g.lights?.push(L);
  }

  /** A step's arrivals have all come, and all are down. */
  cleared(g, tag) {
    return !!this.c.spawned && !(this.c.pending > 0) && this.alive(g, tag) === 0;
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
    if (face) n.faceTo(face);
    n.pose(pose, Infinity);
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
    this.say([["PA", "The time is six forty-seven.", "calm"]]);
    g.screenShake = Math.max(g.screenShake || 0, 6);
    g.glitchEffect = 1;
    g.audio.tremor?.();
    playChronoSound(g.audio, "timeStop");
    this.flicker(g, 0.6);
    this.setClocks(g, true);
    for (const id of Object.keys(PEOPLE)) {
      const n = this.person(g, id);
      n.path = [];
      n.pose("frozen", Infinity);
    }
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

  /** How many of a step's enemies are still up. */
  alive(g, tag) {
    let n = 0;
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

/** The Supervisor's word on a trial just finished, after its grade. */
function trialComment(trial, r) {
  const name = trial.name.charAt(0) + trial.name.slice(1).toLowerCase();
  if (r.grade === "PASS") return `${name}: pass. Orr's happy, which is a first.`;
  if (r.grade === "S" || r.grade === "A") return `${name}: ${r.grade}. Don't let it go to your head.`;
  return `${name}: ${r.grade}. It's on the sheet now, Cadet. Next.`;
}

/** Step logic ids, for the tests: every prologue step must have logic. */
export const PROLOGUE_LOGIC_IDS = Object.keys(LOGIC);
