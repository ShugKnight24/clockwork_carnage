/**
 * TutorialSystem — the prologue chapter (src/data/prologue.js): state,
 * progression, set pieces and checkpoints.
 *
 * Each step of PROLOGUE_STEPS has logic here, keyed by its id: `enter` sets
 * the step up (opens doors, spawns targets or hostiles, starts a hazard) and
 * `update` says when it is done. A beat's first step is a checkpoint: dying
 * puts you back there with the beat set up again, never back to the start.
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
import { PROLOGUE_STEPS, PROLOGUE_BEATS, lineDuration } from "../src/data/prologue.js";
import { ARIA_COMMS } from "../src/data/dialogue.js";
import { drawLine } from "../src/systems/aria-comms.js";
import { spawnEnergyBurst } from "./particle-system.js";
import { VENT_CHRONO } from "../src/systems/chrono-hazards.js";
import { playChronoSound } from "../src/audio/chrono-sounds.js";
import { Npc } from "./npc.js";
import { NPC_TYPES } from "../src/data/npcs.js";
import { ARENA_WALLS } from "../src/data/levels/rooms/arena.js";
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
  toGym: [[34.5, 41.5], [29.5, 41.5], [29.5, 21.5], [25.5, 20.8], [23.2, 17.5]],
  toLab: [[25.5, 20.8], [29.5, 20.5], [29.5, 12.5], [33.5, 10.0]],
  // At the alarm he goes down to his people the only way there is: Lift B,
  // the car the thing came up in. He turns in it to look at you.
  leave: [[33.5, 4.4], [30.0, 3.6], [30.0, 2.45]],
};

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
 * The floor's people that morning, who aren't police on the Engine detail:
 * the front desk, an admin clerk, two off-duty officers, R&D's sim techs.
 * `at` is where the morning has them, `face` what they're turned to; after
 * the breach (TutorialSystem.aftermath) some are frozen where they stood,
 * one is slumped, the rest are simply gone. Kinds the NPC rig doesn't have
 * yet stand in as officers.
 */
const PEOPLE = {
  pike: { kind: "clerk", name: "Dana Pike", look: 1, at: [29.0, 52.4], face: [29.0, 56] }, // front desk
  nand: { kind: "clerk", name: "Priya Nand", look: 0, at: [39.5, 17.3], face: [39.5, 15] }, // the office's clerk, at her cabinets
  brooks: { kind: "clerk", name: "Hal Brooks", look: 1, at: [20.5, 30.5], face: [20.5, 29] }, // at the coffee
  mendez: { kind: "officer", name: "Ofc. Mendez", at: [22.0, 30.8], face: [20.5, 30.5] }, // off shift, talking to Hal
  varga: { kind: "officer", name: "Ofc. Varga", at: [20.6, 19.2], face: [19.5, 18.5] }, // off shift, at the bags
  orr: { kind: "staff", name: "Dr. Nadia Orr", look: 0, at: [36.5, 9.7], face: [29.5, 4.5] }, // R&D, running the sim
  lin: { kind: "staff", name: "Teo Lin", look: 1, at: [22.5, 9.7], face: [29.5, 4.5] },
};
/** Up the corridor from the front desk to her cabinets, while you cross to the range. */
const NAND_ROUTE = [[29.5, 46.5], [29.5, 20.6], [34.6, 20.6], [37.5, 18.6], [39.5, 17.3]];

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
    steps: ["cells", "toLift"],
    who: "mendez",
    r: 3.2,
    lines: [
      ["ARIA", "Mendez. Off shift. He only came in for the coffee.", "sad"],
      ["ARIA", "There were two of them in here this morning. One cup's still on the counter.", "sad"],
    ],
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
      ["SUPERVISOR", "We keep finding their kit in sealed rooms. Nobody knows how they get in.", "worried"],
    ],
  },
  {
    type: "sentinel",
    name: "CHRONO SENTINEL",
    lines: [
      ["ARIA", "Chrono Sentinel. The shield soaks most of what hits it. Go round it: from the side or behind, the head and the core on its back are exposed.", "curious"],
      ["ARIA", "Odd. Every one of these sightings is logged at the same minute. Six forty-seven.", "worried"],
      ["SUPERVISOR", "Sensor fault. Shoot the hologram, Cadet.", "angry"],
    ],
  },
];
/** Where an exhibit stands in the arena, and where you stand to study it. */
const EXHIBIT_AT = { x: 29.5, y: 4.5 };

/** The simulation's waves, at the arena's ends. */
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
/** What a simulated hit costs: the sim hits harder than the real ones do in the prologue, but only its integrity. */
const SIM_DAMAGE = { drone: 7, henchman: 9, sentinel: 14, glitchling: 6 };

/** The steps after which ARIA may say a word of encouragement. */
const ENCOURAGE_AFTER = new Set(["fire", "ads", "moving", "shotgun", "slide", "dash", "cover", "vents"]);

const SHOTGUN = 1;
const PISTOL = 0;

/** The gym course's gates: the start, then four to hit in order. */
const COURSE_GATES = [
  { x: 22.5, y: 20.5 }, // the start, by the door (21.5 was inside a column)
  { x: 4.5, y: 16.5 },
  { x: 5.5, y: 24.5 },
  { x: 22.5, y: 24.5 },
  { x: 22.5, y: 16.5 },
];
const COURSE_LIMIT = 20; // seconds; +3 for each failed run, up to +9
const GATE_R = 1.25;

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

  pistol: {
    waypoint: { x: 38.5, y: 42.5 },
    enter(t, g) {
      t.place(g, "pistol", new Pickup(38.5, 42.5, "weapon", { weaponId: PISTOL }));
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
        [53.5, 42.5],
        [53.5, 45.5],
      ]);
    },
    update(t, g) {
      // Missed with the hip? The drill re-racks until three fall to aimed fire.
      if (t.alive(g, "ads") === 0 && t.c.aimedKills < 3) t.spawnTargets(g, "ads", [[53.5, 41.5], [53.5, 43.5]]);
      return t.c.aimedKills >= 3;
    },
    progress: (t) => `AIMED KILLS ${Math.min(3, t.c.aimedKills)} / 3`,
    exit: (t, g) => t.clearTargets(g, "ads"),
  },

  moving: {
    waypoint: { x: 52.5, y: 42.5 },
    enter(t, g) {
      t.c.wave = 0;
    },
    update(t, g) {
      if (t.alive(g, "moving") === 0 && t.c.heads < 3) {
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
      return t.c.heads >= 3;
    },
    progress: (t) => `HEADSHOT KILLS ${Math.min(3, t.c.heads)} / 3`,
    exit: (t, g) => t.clearTargets(g, "moving"),
  },

  shotgun: {
    waypoint: { x: 43.5, y: 42.5 },
    enter(t, g) {
      t.place(g, "shotgun", new Pickup(43.5, 42.5, "weapon", { weaponId: SHOTGUN }));
      t.c.racked = false;
    },
    update(t, g) {
      const p = g.player;
      const has = p.weapons.includes(SHOTGUN);
      if (has && !t.c.racked) {
        t.c.racked = true;
        t.spawnTargets(g, "shotgun", [
          [47.5, 41.5],
          [47.5, 42.5],
          [47.5, 43.5],
        ]);
      }
      if (t.c.racked && t.alive(g, "shotgun") === 0 && t.c.shotgunKills < 3) {
        t.spawnTargets(g, "shotgun", [[47.5, 41.5], [47.5, 43.5]]);
      }
      return t.c.shotgunKills >= 3;
    },
    progress: (t, g) =>
      g.player.weapons.includes(SHOTGUN) ? `SHOTGUN KILLS ${Math.min(3, t.c.shotgunKills)} / 3` : "PICK UP THE SHOTGUN",
    exit: (t, g) => t.clearTargets(g, "shotgun"),
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

  toGym: {
    waypoint: { x: 22.5, y: 20.5 },
    enter(t, g) {
      // The break room's door stands open: two of the off-shift, at the coffee.
      t.openDoors(g, "door3", "door9");
      t.supWalk(g, "toGym");
    },
    update: (t, g) => t.near(g, 22.0, 20.5, 1.8),
  },

  sprint: {
    update(t, g, dt) {
      if (g.player.isSprinting) t.c.sprint = (t.c.sprint || 0) + g.deltaTime;
      return t.c.sprint > 2.5;
    },
    progress: (t) => `SPRINT ${Math.min(2.5, t.c.sprint || 0).toFixed(1)} / 2.5 s`,
  },

  crouch: {
    enter(t, g) {
      t.c.x = g.player.x;
      t.c.y = g.player.y;
      t.c.moved = 0;
    },
    update(t, g) {
      const p = g.player;
      const d = Math.hypot(p.x - t.c.x, p.y - t.c.y);
      if (p.isCrouching) t.c.moved += d;
      t.c.x = p.x;
      t.c.y = p.y;
      return t.c.moved > 2.5;
    },
    progress: (t) => `CROUCH-WALK ${Math.min(2.5, t.c.moved).toFixed(1)} / 2.5 m`,
  },

  slide: {
    update: (t) => t.c.slides >= 2,
    progress: (t) => `SLIDES ${Math.min(2, t.c.slides)} / 2`,
  },

  dash: {
    update: (t) => t.c.dashes >= 2,
    progress: (t) => `DASHES ${Math.min(2, t.c.dashes)} / 2`,
  },

  course: {
    enter(t, g) {
      t.c.gate = 0;
      t.c.time = 0;
      t.c.fails = t.c.fails ?? 0;
      t.c.limit = COURSE_LIMIT;
      // The gates themselves, numbered, on the floor (src/rendering/props.js).
      t.c.gates = COURSE_GATES.map(({ x, y }, i) => {
        const gate = new Prop(x, y, "course_gate");
        gate.gate = { num: i, state: "ahead" };
        gate._tutTag = "gates";
        g.entities.push(gate);
        return gate;
      });
    },
    get waypoint() {
      return null; // set per gate in update
    },
    update(t, g) {
      const c = t.c;
      const gate = COURSE_GATES[c.gate];
      g.objectiveWaypoint = gate;
      t.c.gates?.forEach((p, i) => {
        p.gate.state = i < c.gate ? "done" : i === c.gate ? "next" : "ahead";
      });
      if (c.gate > 0) {
        c.time += g.deltaTime;
        if (c.time > c.limit) {
          c.fails++;
          c.limit = COURSE_LIMIT + Math.min(9, c.fails * 3);
          c.gate = 0;
          c.time = 0;
          g.audio.menuBack?.();
          t.say([["ARIA", c.fails === 1 ? "Too slow. Back to the start. Sprint the straights, dash the corners." : `Again. You've got ${c.limit} seconds this time. Don't tell him I gave you extra.`, "warm"]]);
          return false;
        }
      }
      if (t.near(g, gate.x, gate.y, GATE_R)) {
        g.audio.menuConfirm?.();
        if (c.gate === COURSE_GATES.length - 1) {
          c.best = c.time;
          return true;
        }
        c.gate++;
      }
      return false;
    },
    progress(t) {
      const c = t.c;
      if (c.gate === 0) return `GO TO THE START GATE · LIMIT ${c.limit} s`;
      return `GATE ${c.gate} / ${COURSE_GATES.length - 1} · ${c.time.toFixed(1)} / ${c.limit} s`;
    },
    exit(t, g) {
      t.clearTag(g, "gates");
      if (t.c.best != null) t.say([["SUPERVISOR", `${t.c.best.toFixed(1)} seconds. Not bad, Cadet. Not good either. Sim hall's next.`, "calm"]]);
    },
  },

  toLab: {
    waypoint: { x: 29.5, y: 10.5 },
    enter(t, g) {
      t.openDoors(g, "door5");
      t.supWalk(g, "toLab");
    },
    update: (t, g) => t.near(g, 29.5, 10.5, 1.8),
  },

  lab: {
    waypoint: { x: 29.5, y: 9.5 },
    enter(t, g) {
      t.sim = { integrity: null }; // the exhibits cannot hurt you, and cannot fail you
      t.c.i = -1;
      t.c.wait = 0.8;
    },
    update(t, g) {
      if (t.alive(g, "lab") > 0) return false;
      t.c.wait -= g.deltaTime;
      if (t.c.wait > 0) return false;
      t.c.i++;
      if (t.c.i >= EXHIBITS.length) return true;
      const ex = EXHIBITS[t.c.i];
      t.spawnHostiles(g, "lab", [[EXHIBIT_AT.x, EXHIBIT_AT.y, ex.type]], makeHolo, true);
      t.people.orr?.pose("point", 1.6);
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

  sim: {
    enter(t, g) {
      t.sim = { integrity: 100, failed: false };
      t.c.wave = 0;
      t.c.delay = 2;
      t.c.fails = 0;
      t.c.glitchAt = null;
    },
    update(t, g) {
      const sim = t.sim;
      if (sim.failed) {
        // Integrity gone: the sim resets, and so do you.
        t.c.fails++;
        t.clearTag(g, "sim");
        t.clearTag(g, "glitch");
        g.projectiles = [];
        sim.integrity = 100;
        sim.failed = false;
        t.c.wave = 0;
        t.c.spawned = false;
        t.c.delay = 2.5;
        t.c.glitchAt = null;
        g.glitchEffect = 0.7;
        t.say([["ARIA", t.c.fails === 1 ? "Simulation failed. You'd be dead twice over. Again, and use the pillars this time." : "Again. Pick a target, break line of sight, reload your nerve.", "worried"]], { cut: true });
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
        if (t.c.wave < SIM_WAVES.length) t.say([["ARIA", "Wave down. Next one's heavier.", "excited"]]);
        return false;
      }
      // Both waves down: Lift B opens on its own, and something the sim did
      // not load steps out of it. Orr goes to look, and stops: mid-step,
      // for good. Lin gets down behind the crates.
      if (t.c.glitchAt == null) {
        t.c.glitchAt = t.clock;
        t.lift(g, true);
        g.audio.doorOpen?.();
        t.spawnHostiles(g, "glitch", [[LIFT_CAR.x, LIFT_CAR.y, "glitchling"]], makeHolo, true);
        for (const e of g.entities) if (e._tutTag === "glitch") e._corrupt = true;
        g.glitchEffect = 1;
        g.audio.powerFlicker?.();
        t.flickerUntil = t.clock + 0.5;
        const orr = t.people.orr;
        orr?.walk([[33.0, 6.5], [31.6, 4.3]], { speed: 1.2, then: (n) => n.faceTo(LIFT_CAR) });
        setTimeoutGame(t, 3.2, () => {
          if (!orr?.active) return;
          orr.path = [];
          orr.faceTo(LIFT_CAR);
          orr.pose("frozen", Infinity);
          g.glitchEffect = Math.max(g.glitchEffect || 0, 0.6);
          g.audio.powerFlicker?.();
        });
        t.people.lin?.pose("cower", Infinity);
        t.say([
          ["ARIA", "Lift B just opened. Nobody called it. And that one isn't in the library.", "afraid"],
          ["SUPERVISOR", "Cadet, end the sim. End it now.", "afraid"],
        ], { cut: true });
        return false;
      }
      return t.alive(g, "glitch") === 0 || t.clock - t.c.glitchAt > 10;
    },
    progress(t) {
      if (t.c.glitchAt != null) return "SIM INTEGRITY ??%";
      return `WAVE ${Math.min(t.c.wave + 1, SIM_WAVES.length)} / ${SIM_WAVES.length} · SIM INTEGRITY ${Math.max(0, Math.round(t.sim?.integrity ?? 0))}%`;
    },
    exit(t, g) {
      t.sim = null;
      t.clearTag(g, "sim");
      t.clearTag(g, "glitch");
      g.projectiles = [];
      t.say([["SUPERVISOR", "Doctor Orr? ...Orr. Cadet, don't touch her. Don't anybody touch her.", "afraid"]]);
    },
  },

  alarm: {
    // The Supervisor finishes his line about your course time, and the
    // klaxon is what cuts him off.
    enter(t, g) {
      t.c.armed = false;
      t.openDoors(g, "door4");
    },
    update(t, g) {
      if (!t.c.armed && t.clock > 1 && t.scriptIdle()) {
        t.c.armed = true;
        t.c.at = t.clock;
        g.audio.alarmKlaxon?.();
        g.screenShake = 4;
        g.glitchEffect = 0.6;
        t.alert = true;
        t.say(t.def.lines, { cut: true });
      }
      // He tells you to stay, and goes: into Lift B, at a run. He turns in
      // the car to look at you, and the doors close on him.
      if (t.c.armed && !t.c.gone && t.clock - t.c.at > 8 && t.sup?.active) {
        t.c.gone = true;
        t.lift(g, true);
        t.sup.walk(SUP_ROUTES.leave, {
          speed: 3.4,
          then: (sup) => {
            sup.faceTo(g.player);
            setTimeoutGame(t, 1.6, () => {
              t.liftWant = false;
              t.c.supDown = true;
            });
          },
        });
      }
      // The doors shut on him; then he is gone down the shaft.
      if (t.c.supDown && !t.liftOpen && t.sup?.active) {
        t.sup.active = false;
        g.audio.doorOpen?.();
        g.screenShake = Math.max(g.screenShake || 0, 2);
      }
      return t.c.armed && t.clock - t.c.at > 4 && t.scriptIdle();
    },
  },

  cover: {
    waypoint: { x: 37.5, y: 20.5 },
    enter(t, g) {
      t.alert = true;
      t.lift(g, false);
      t.spawnHostiles(g, "cover", [
        [53.5, 24.5, "henchman"],
        [53.5, 16.5, "henchman"],
        [48.5, 24.5, "henchman"],
      ]);
    },
    update: (t, g) => t.c.spawned && t.alive(g, "cover") === 0,
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
      t.spawnHostiles(g, "shield", [[54.5, 20.5, "sentinel"]]);
    },
    update: (t, g) => t.c.spawned && t.alive(g, "shield") === 0,
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
      t.spawnHostiles(g, "slowFire", [
        [29.5, 37.5, "drone"],
        [30.5, 40.5, "drone"],
        [28.5, 43.5, "drone"],
      ]);
    },
    update: (t, g) => t.c.spawned && t.alive(g, "slowFire") === 0,
    progress: (t, g) => `DRONES ${t.alive(g, "slowFire")}`,
    exit(t) {
      if (t.c.chronoKills > 0) t.say([["ARIA", "Did you see that? They never knew what time it was.", "excited"]]);
    },
  },

  cells: {
    enter(t, g) {
      t.blackout = true;
      g.audio.powerDown?.();
      g.glitchEffect = 0.8;
      t.place(g, "cell1", new Pickup(19.5, 30.5, "powerCell"));
      t.place(g, "cell2", new Pickup(39.5, 30.5, "powerCell"));
      g.powerCells = { total: 2, found: 0 };
      t.ensureExit(g, true);
      t.spawnHostiles(g, "cells", [
        [22.5, 33.5, "henchman"],
        [37.5, 31.5, "drone"],
      ]);
    },
    get waypoint() {
      return null;
    },
    update(t, g) {
      // Point at the nearer cell still out there.
      const left = g.entities.filter((e) => e.type === "powerCell" && e.active);
      const p = g.player;
      left.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
      g.objectiveWaypoint = left[0] ? { x: left[0].x, y: left[0].y } : null;
      return (g.powerCells?.found ?? 0) >= 2;
    },
    progress: (t, g) => `POWER CELLS ${g.powerCells?.found ?? 0} / 2`,
  },

  toLift: {
    waypoint: { x: 29.5, y: 10.5 },
    enter(t, g) {
      t.blackout = false;
      t.ensureExit(g, true); // charging: live once the arena is held
      // The cells are in (a skipped step leaves them lying about): their chip
      // goes until the lift is live.
      for (const e of g.entities) if (e.type === "powerCell") e.active = false;
      g.powerCells = null;
      t.openDoors(g, "door5");
    },
    update: (t, g) => t.near(g, 29.5, 10.0, 2.0),
  },

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
      return t.wave(g, "wave2", [
        [10.5, 6.5, "henchman"],
        [49.5, 6.5, "henchman"],
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
    // on the game's frame time, so it pauses with the game).
    this.clock = 0;
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
    /** Lift B's doors: wanted open, and open now. */
    this.liftWant = false;
    this.liftOpen = false;
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
    this._enter(this.step + 1);
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
      if (kind === "pa") this.say([["PA", text, "calm"]]);
      else if (kind === "flicker") {
        this.flickerUntil = this.clock + 0.45;
        g.glitchEffect = Math.max(g.glitchEffect || 0, 0.35);
        g.audio.powerFlicker?.();
      } else if (kind === "tremor") {
        g.screenShake = Math.max(g.screenShake || 0, 5);
        g.audio.tremor?.();
      }
    });
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

  /** Whether the Supervisor is with you (in person) rather than on the radio. */
  get supPresent() {
    return !!this.sup?.active;
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

  /** The cadet's locker shut, as it is first thing. */
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

  lockerShut(g) {
    const row = g.map?.grid?.[MY_LOCKER_CELL.y];
    if (row) row[MY_LOCKER_CELL.x] = STATION_WALLS.LOCKERS_MINE;
  }

  /**
   * The interact key, before the game's own doors and secret walls: the
   * locker during "Suit Up". Returns true when it was used here.
   */
  onInteract() {
    const g = this.game;
    if (this.def?.id !== "suitUp" || this.c.opening) return false;
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
  say(lines, { cut = false } = {}) {
    const g = this.game;
    if (cut) {
      this.script = [];
      if (g.ariaComms?.message) g.ariaComms.message = null;
      g.audio?.stopSpeech?.("comms");
      this._lineGap = 0.2;
    }
    // Each line remembers its step: a fast player outruns the story, and a
    // line about the range is no use in the gym (see _updateScript).
    for (const line of lines) this.script.push({ line, step: this.step });
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
    // Lines from more than a step back are stale: drop them rather than play
    // them over the step they no longer describe.
    while (this.script.length && this.script[0].step < this.step - 1) this.script.shift();
    if (this._ourLine || comms.message || comms.queue?.length || this._lineGap > 0 || !this.script.length) return;
    const [speaker, text, emotion, opts] = this.script.shift().line;
    const style = SPEAKER_STYLE[speaker] ?? SPEAKER_STYLE.ARIA;
    const radio = style.radioVoice && (opts?.radio || !this.supPresent);
    const id = {};
    comms.queueLine?.({
      speaker,
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
   * A step's hostiles, once (or every time, with `again`). Marks the step's
   * `spawned` so its count can be checked.
   */
  spawnHostiles(g, tag, spots, make = makeHostile, again = false) {
    if (this.c.spawned && !again) return;
    this.c.spawned = true;
    for (const [x, y, type] of spots) {
      const e = make(x, y, type);
      e._tutTag = tag;
      // A scripted fight comes at you: hunting from the start (the AI's
      // ctx.hunt keeps it on you), its first shot a beat away.
      e.state = "chase";
      e.lastAttackTime = g.time;
      e._lastSeen = { x: g.player.x, y: g.player.y };
      g.entities.push(e);
      // The real ones don't come through doors: they step out of the air.
      if (!e._holo) this.tear(g, x, y);
    }
    g.totalEnemies = (g.totalEnemies || 0) + spots.length;
  }

  /** Where one of them steps out of the minute: a violet burst, the lights catching. */
  tear(g, x, y) {
    g._spawnParticlesAt?.(null, (ps) => spawnEnergyBurst(ps, x, y, { count: 14, r: 190, g: 90, b: 255 }));
    g.glitchEffect = Math.max(g.glitchEffect || 0, 0.25);
  }

  // ── The floor's people ──────────────────────────────────────────

  /** One of PEOPLE, put in the world where the morning has them if they aren't there yet. */
  person(g, id) {
    let n = this.people[id];
    if (!n) {
      const d = PEOPLE[id];
      n = new Npc(d.at[0], d.at[1], NPC_TYPES[d.kind] ? d.kind : "officer", { name: d.name, look: d.look ?? null });
      n.faceTo({ x: d.face[0], y: d.face[1] });
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
   * The people, as the step finds them (and as a checkpoint puts them back):
   * the morning's routine from the walk to the range until the breach, its
   * aftermath from the office on.
   */
  _stagePeople(g) {
    const at = (s) => PROLOGUE_STEPS.findIndex((d) => d.id === s);
    if (this.step >= at("cover")) this.aftermath(g);
    else if (this.step >= at("walk") && this.step < at("alarm")) for (const k of Object.keys(PEOPLE)) this.person(g, k);
  }

  /**
   * The floor after the wave came up through it: the clerk frozen mid-step at
   * her cabinets, an off-duty officer slumped by the vending machine, Orr
   * still standing at the lift until the evac, and everyone else (the front
   * desk, the other at the coffee, the one at the bags, Lin) gone.
   */
  aftermath(g) {
    for (const k of ["pike", "brooks", "varga", "lin"]) this.gone(g, k);
    this.hold(g, "nand", 40.1, 17.6, "frozen", { x: 38.5, y: 15 }, { stay: true });
    this.hold(g, "mendez", 19.6, 33.3, "slumped", { x: 22, y: 33 });
    if (this.step <= PROLOGUE_STEPS.findIndex((d) => d.id === "wave1")) this.hold(g, "orr", 32.4, 5.6, "frozen", LIFT_CAR, { stay: true });
    else this.gone(g, "orr");
    // Gone down the shaft, whatever the alarm got to show.
    if (this.sup?.active && this.sup.x < 34 && this.sup.y < 12) this.sup.active = false;
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

  /** An evac wave: a short breath, then the wave; done when it is down. */
  wave(g, tag, spots) {
    if (!this.c.spawned) {
      this.c.delay -= g.deltaTime;
      if (this.c.delay <= 0) {
        this.spawnHostiles(g, tag, spots);
        g.audio.alarmKlaxon?.();
      }
      return false;
    }
    return this.alive(g, tag) === 0;
  }

  /** Lift B's beacon, in front of its doors: sealed until the cells are in and the car is back up. */
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

/** Step logic ids, for the tests: every prologue step must have logic. */
export const PROLOGUE_LOGIC_IDS = Object.keys(LOGIC);
