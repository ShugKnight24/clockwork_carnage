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
import { spawnEnergyBurst } from "./particle-system.js";
import { Npc } from "./npc.js";

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
  walk: [[23.0, 43.5], [24.5, 41.5], [27.5, 41.5]],
  toRange: [[29.5, 41.5], [34.5, 41.5], [37.5, 44.8]],
  toGym: [[34.5, 41.5], [29.5, 41.5], [29.5, 21.5], [25.5, 20.8], [23.2, 17.5]],
  toLab: [[25.5, 20.8], [29.5, 20.5], [29.5, 12.5], [33.5, 10.0]],
  // At the alarm he runs for the Engine level, down the corridor past the gym.
  leave: [[29.5, 10.5], [29.5, 12.5], [29.5, 30.5]],
};

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
      ["ARIA", "Chrono Sentinel. The shield soaks most of what hits it. Go round it, or over it: the head is exposed.", "curious"],
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
 * rows deep. Each is hot for VENT_ON of every VENT_CYCLE seconds of game
 * time, offset so the gaps never line up. A quarter-second gap is too short
 * to cross two rows even sprinting; under Chrono Shift it lasts most of a
 * second.
 */
const VENT_STRIPS = [
  { rows: [22, 23], phase: 0 },
  { rows: [25, 26], phase: 0.85 },
];
const VENT_COLS = [27, 32];
const VENT_CYCLE = 1.75;
const VENT_ON = 1.5;
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
        const n = new Npc(x, y, "officer", { name: i === 3 ? "Lt. Rasczak" : i === 1 ? "Sgt. Kael" : null });
        n.faceTo(g.player);
        g.entities.push(n);
        return n;
      });
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
            sup.faceTo(g.player);
            for (const o of t.squad) {
              o.faceTo(sup);
              o.pose("salute", 2.4);
            }
            sup.pose("salute", 1.2);
            c.phase = "orders";
            t.say([
              ["OFFICER", "Sir!", "calm"],
              ["SUPERVISOR", "As you were.", "calm"],
              ["SUPERVISOR", "Engineering lost contact with the Engine level twenty minutes ago. Nobody down there is answering.", "worried"],
              ["SUPERVISOR", "Lieutenant Rasczak, take both squads down. Full kit. Find out what's going on and report back to me.", "calm"],
              ["LT. RASCZAK", "Sir. You heard him, people. Move out!", "urgent"],
            ], { cut: true });
          },
        });
      }
      if (c.phase === "orders" && t.scriptIdle()) {
        // The squads leave for the Engine level, one after another.
        c.phase = "leave";
        t.squad.forEach((o, i) => {
          o.faceTo(null);
          setTimeoutGame(t, i * 0.45, () => o.walk(OUT_OF_LOCKERS(o.x, o.y), { leave: true, speed: 2.2 }));
        });
        t.say([
          ["SUPERVISOR", "Not you, Cadet. You're staying with me.", "calm"],
          ["SUPERVISOR", "R&D sent something up for you this morning. It's in your locker. Open it.", "calm"],
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
      t.openDoors(g, "door1");
      t.supWalk(g, "walk");
    },
    update: (t, g) => t.near(g, 23.5, 41.5, 2.2),
  },

  toRange: {
    waypoint: { x: 36.5, y: 41.5 },
    enter(t, g) {
      t.openDoors(g, "door2");
      t.supWalk(g, "toRange");
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
      t.openDoors(g, "door3");
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
      // Both waves down: something the sim did not load steps out of it.
      if (t.c.glitchAt == null) {
        t.c.glitchAt = t.clock;
        t.spawnHostiles(g, "glitch", [[EXHIBIT_AT.x, EXHIBIT_AT.y, "glitchling"]], makeHolo, true);
        for (const e of g.entities) if (e._tutTag === "glitch") e._corrupt = true;
        g.glitchEffect = 1;
        g.audio.powerFlicker?.();
        t.flickerUntil = t.clock + 0.5;
        t.say([
          ["ARIA", "Wait. That one isn't in the library. Where did it come from?", "afraid"],
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
      t.say([["SUPERVISOR", "...Sim's down. Not bad, Cadet. Come to my office. We need to talk about your—", "worried"]]);
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
      // He tells you to stay, and goes: down the corridor, at a run.
      if (t.c.armed && !t.c.gone && t.clock - t.c.at > 8 && t.sup?.active) {
        t.c.gone = true;
        t.sup.walk(SUP_ROUTES.leave, { leave: true, speed: 3.4 });
      }
      return t.c.armed && t.clock - t.c.at > 4 && t.scriptIdle();
    },
  },

  cover: {
    waypoint: { x: 37.5, y: 20.5 },
    enter(t, g) {
      t.alert = true;
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
    },
    update(t, g) {
      return t.wave(g, "wave1", [
        [10.5, 4.5, "drone"],
        [10.5, 9.5, "drone"],
        [49.5, 4.5, "drone"],
        [49.5, 9.5, "drone"],
      ]);
    },
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave1")} · LIFT 30%`,
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
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave2")} · LIFT 60%`,
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
    progress: (t, g) => `HOSTILES ${t.alive(g, "wave3")} · LIFT 90%`,
  },

  extract: {
    waypoint: { x: 29.5, y: 3.5 },
    enter(t, g) {
      t.ensureExit(g, false);
      g.powerCells = { total: 2, found: 2 }; // the HUD chip: EXTRACTION LIVE
      g.audio.roundComplete?.();
    },
    update: (t, g) => t.near(g, 29.5, 3.5, 1.1),
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
      const pool = ARIA_COMMS.tutorialEncouragement || [];
      if (pool.length) this.say([["ARIA", pool[Math.floor(Math.random() * pool.length)], "happy"]]);
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

    // Respawn collected pickups after a delay.
    for (const e of g.entities) {
      if (!e.active && e._respawnAt && now >= e._respawnAt) {
        e.active = true;
        e._respawnAt = 0;
      }
    }

    this._updateScript(g.deltaTime || 0);
    this._updateTargets(g);
    this._updateAlert(g);
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
    if (g.hasCutsceneScript?.("suit_up")) g.startCutscene("suit_up", done);
    else done();
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
    }
    g.totalEnemies = (g.totalEnemies || 0) + spots.length;
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

  /** The evac lift's extraction beacon, sealed until the cells are in. */
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
    v.clock += dt; // game time: Chrono Shift slows the vents, not you
    v.cooldown -= g.deltaTime;
    v.puff -= g.deltaTime;
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
    for (const strip of VENT_STRIPS) {
      const hot = this.ventHot(strip);
      const [top, bottom] = strip.rows;
      for (const L of v.lights) {
        if (L._strip !== strip) continue;
        L.intensity = L.baseIntensity = hot ? 1.5 : 0.12;
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
