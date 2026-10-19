/**
 * The prologue: the tutorial as the game's first chapter.
 *
 * Seven beats across Chronos Station HQ on the morning of the breach, one or
 * two mechanics each with room to practise them in a real fight before the
 * next arrives. Each step has its instruction card (title + hint, per input
 * device) and the dialogue that carries the story while you play; the logic
 * that drives each step lives in js/tutorial-system.js, keyed by `id`.
 *
 * Pure data: the copy is read by the card renderer (src/ui/tutorial-ui.js)
 * and the unit tests, neither of which should pull in the game.
 */

/** The chapter's beats, in order. A beat's first step is its checkpoint. */
export const PROLOGUE_BEATS = [
  { id: "clockingIn", title: "CLOCKING IN" },
  { id: "range", title: "THE RANGE" },
  { id: "course", title: "THE COURSE" },
  { id: "lab", title: "KNOW YOUR ENEMY" },
  { id: "sim", title: "SIMULATION" },
  { id: "breach", title: "BREACH" },
  { id: "borrowedTime", title: "BORROWED TIME" },
  { id: "lightsOut", title: "LIGHTS OUT" },
  { id: "evac", title: "EVAC" },
];

const ARIA = "ARIA";
const SUP = "SUPERVISOR";
/** The station's public address: announcements that say more than they mean to. */
const PA = "PA";

/**
 * Dialogue: [speaker, text, emotion?]. Lines play in order, one after the
 * other, from when their step begins; a step's lines wait for the last
 * step's to finish unless the step says `cut: true` (an alarm cuts in).
 *
 * Events: [seconds into the step, kind, text?], the morning going wrong a
 * little at a time around the drills: "pa" (a station announcement),
 * "flicker" (the lights stutter) and "tremor" (the floor shudders).
 *
 * Hints: `key` for keyboard and mouse, `touch` for touch (no key names),
 * `pad(b)` for a controller, where b(action) is that pad's button legend.
 * A hint without a variant is the same on every device.
 */
export const PROLOGUE_STEPS = [
  // ── 1. CLOCKING IN ───────────────────────────────────────────────
  { id: "boot", beat: 0 }, // the HUD boot animation; no card
  {
    id: "look",
    beat: 0,
    title: "SYSTEMS ONLINE — LOOK AROUND",
    color: "#00ccff",
    hint: {
      key: "Move the mouse to look around.",
      touch: "Drag on the right of the screen to look around.",
      pad: () => "Push the right stick to look around.",
    },
    lines: [
      [ARIA, "Neural link's holding. Hello, Cadet. I'm ARIA. I live in your suit now. Sorry about the cold hands.", "warm"],
      [ARIA, "Have a look around. Everything you see, I see. Try not to look at anything embarrassing.", "warm"],
    ],
  },
  {
    id: "walk",
    beat: 0,
    title: "MOVE — TEST THE SUIT",
    color: "#00ccff",
    hint: {
      key: "W A S D to walk. Head for the bulkhead at the end of the room.",
      touch: "Use the left stick to walk. Head for the bulkhead at the end of the room.",
      pad: () => "Left stick to walk. Head for the bulkhead at the end of the room.",
    },
    lines: [
      [ARIA, "Walk with me. The suit's a prototype. Servo assist, plating, and a module they wouldn't tell me about.", "curious"],
      [SUP, "Cadet. You're late, and you're wearing my prototype. Range. Now.", "angry"],
    ],
    events: [[7, "pa", "Good morning, Chronos Station. Engineering reminds all staff that the Engine level is closed for today's calibration."]],
  },
  {
    id: "door",
    beat: 0,
    title: "OPEN THE BULKHEAD",
    color: "#ff8844",
    hint: {
      key: "Face the door and press E.",
      touch: "Face the door and tap USE.",
      pad: (b) => `Face the door and press ${b("interact")}.`,
    },
    lines: [[ARIA, "Doors, lockers, the odd hollow wall: if it opens, you open it.", "warm"]],
  },
  {
    id: "toRange",
    beat: 0,
    title: "REPORT TO THE RANGE",
    color: "#00ccff",
    hint: "Follow the marker down the corridor to the firing range.",
    lines: [
      [SUP, "That suit cost more than this building. The Bureau wants it certified by noon. You want to keep your badge. So we certify it.", "calm"],
      [ARIA, "He likes you. That was him liking you.", "happy"],
      [SUP, "Engineering's been running something downstairs all night. If the lights flicker, ignore it. That's an order.", "worried"],
    ],
    events: [[16, "flicker"]],
  },

  // ── 2. THE RANGE ─────────────────────────────────────────────────
  {
    id: "pistol",
    beat: 1,
    title: "ARM YOURSELF",
    color: "#ff6600",
    hint: "Walk over the Chrono Pistol on the first bench to pick it up.",
    lines: [[SUP, "Chrono Pistol. Standard issue. Point the loud end away from me.", "calm"]],
  },
  {
    id: "fire",
    beat: 1,
    title: "PUT ROUNDS ON TARGET",
    color: "#ff8844",
    hint: {
      key: "CLICK to fire. Destroy the training drones at the end of the lane.",
      touch: "Tap FIRE. Destroy the training drones at the end of the lane.",
      pad: (b) => `Pull ${b("fire")} to fire. Destroy the training drones at the end of the lane.`,
    },
    lines: [[ARIA, "Holo-drones. They can't shoot back. Enjoy that while it lasts.", "happy"]],
    events: [[9, "tremor"]],
  },
  {
    id: "ads",
    beat: 1,
    title: "AIM DOWN SIGHTS",
    color: "#66eeff",
    hint: {
      key: "Hold RIGHT MOUSE to aim down sights, then fire. Slower feet, tighter shots.",
      touch: "Hold AIM to aim down sights, then fire. Slower feet, tighter shots.",
      pad: (b) => `Hold ${b("aim")} to aim down sights, then fire. Slower feet, tighter shots.`,
    },
    lines: [
      [SUP, "Long lane. Hip fire won't cut it. Use the sights.", "calm"],
      [ARIA, "Every kill counts while you're aimed in. Every miss, I'm writing down.", "happy"],
      [ARIA, "Did you feel that, before? The floor. Probably the range's air handlers. Probably.", "curious"],
    ],
  },
  {
    id: "moving",
    beat: 1,
    title: "MOVING TARGETS — GO FOR THE HEAD",
    color: "#ffcc33",
    hint: "These ones move. Lead them, and aim high: a headshot does over double damage and drops a target in one.",
    lines: [
      [SUP, "Real targets don't hold still and they don't fall over politely. Head shots.", "calm"],
      [ARIA, "Listen for the crack. That's the sound of a headshot. The thump after it is the kill.", "curious"],
    ],
  },
  {
    id: "shotgun",
    beat: 1,
    title: "RIGHT TOOL — THE SHOTGUN",
    color: "#ff6600",
    hint: {
      key: "Pick up the Temporal Shotgun, switch to it with 1/2 or the scroll wheel, and clear the close targets.",
      touch: "Pick up the Temporal Shotgun, swipe the weapon panel to switch to it, and clear the close targets.",
      pad: (b) => `Pick up the Temporal Shotgun, press ${b("weaponNext")} to switch to it, and clear the close targets.`,
    },
    lines: [
      [SUP, "Shotgun's for when they're close enough to smell. Which, in this job, is often.", "calm"],
      [ARIA, "Pistol for reach, shotgun for faces. You'll find more on the way. I'll tell you which end is which.", "happy"],
    ],
  },
  {
    id: "ammo",
    beat: 1,
    title: "RESUPPLY",
    color: "#44ff88",
    hint: "Your ammo is under the weapon readout. Grab the ammo crate by the window before you leave.",
    lines: [
      [ARIA, "Rounds don't grow on trees. They grow in crates. Take that one.", "warm"],
      [SUP, "Certified for shooting. Next, the gym. And Cadet: the suit's faster than you are. Try to keep up with it.", "calm"],
    ],
    events: [[3, "pa", "Calibration cycle one, complete. Cycle two in five minutes."]],
  },

  // ── 3. THE COURSE ────────────────────────────────────────────────
  {
    id: "toGym",
    beat: 2,
    title: "THE GYM",
    color: "#ff44ff",
    hint: "Head up the corridor to the fitness centre.",
    lines: [
      [ARIA, "The Bureau has a gym. Your file says you know where it is. Your file is generous.", "happy"],
      [ARIA, "Funny. The station's drawing twice its normal power. Everything's going downstairs.", "curious"],
    ],
  },
  {
    id: "sprint",
    beat: 2,
    title: "SPRINT — WATCH YOUR STAMINA",
    color: "#ff44ff",
    hint: {
      key: "Hold SHIFT to sprint. Sprinting burns the stamina bar; stop and it refills.",
      touch: "Tap RUN to sprint. Sprinting burns the stamina bar; stop and it refills.",
      pad: (b) => `Hold ${b("sprint")} to sprint. Sprinting burns the stamina bar; stop and it refills.`,
    },
    lines: [[ARIA, "Run until you feel it. Stamina's the bar under your health. Empty, and you're walking.", "warm"]],
  },
  {
    id: "crouch",
    beat: 2,
    title: "CROUCH — STAY LOW",
    color: "#66dd66",
    hint: {
      key: "Hold CTRL to crouch and move a few steps. Smaller target, quieter feet, steadier aim.",
      touch: "Hold CROUCH and move a few steps. Smaller target, quieter feet, steadier aim.",
      pad: (b) => `Hold ${b("crouch")} and move a few steps. Smaller target, quieter feet, steadier aim.`,
    },
    lines: [[ARIA, "Low and slow. When it's raining bullets, be shorter than the rain.", "calm"]],
  },
  {
    id: "slide",
    beat: 2,
    title: "SLIDE — KEEP YOUR MOMENTUM",
    color: "#66ff99",
    hint: {
      key: "While sprinting, tap CTRL to slide. Slide twice.",
      touch: "While running, tap CROUCH to slide. Slide twice.",
      pad: (b) => `While sprinting, tap ${b("crouch")} to slide. Slide twice.`,
    },
    lines: [[ARIA, "Momentum is armour. A sliding target is a missed target.", "excited"]],
  },
  {
    id: "dash",
    beat: 2,
    title: "PHASE DASH — BLINK",
    color: "#ff44ff",
    hint: {
      key: "Press C, or double-tap a movement key, to phase-dash the way you are moving. Dash twice. Mid-dash, hits pass through you; it costs stamina.",
      touch: "Double-tap a direction on the stick to phase-dash. Dash twice. Mid-dash, hits pass through you; it costs stamina.",
      pad: (b) => `Tap ${b("dash")} to phase-dash. Dash twice. Mid-dash, hits pass through you; it costs stamina.`,
    },
    lines: [[ARIA, "The suit can skip you a few metres through space. Don't ask me how. I asked. They didn't say.", "curious"]],
  },
  {
    id: "course",
    beat: 2,
    title: "THE COURSE — BEAT THE CLOCK",
    color: "#ffcc33",
    hint: "Hit every gate before the clock runs out. Sprint the straights, slide and dash the corners, and save stamina for the last stretch.",
    lines: [
      [SUP, "Four gates. The clock starts when you leave the first. Fail it and you run it again. I've got all morning.", "calm"],
      [ARIA, "Off the record: there's an old evidence room off the gym's south side. One of its wall panels sounds hollow. Press it.", "curious"],
    ],
    events: [
      [14, "pa", "Calibration cycle two. Engine output at one hundred and forty percent."],
      [15, "flicker"],
    ],
  },

  // ── 4. KNOW YOUR ENEMY ───────────────────────────────────────────
  {
    id: "toLab",
    beat: 3,
    title: "THE SIM HALL",
    color: "#7dfff0",
    hint: "Head north up the corridor to the combat arena. Today it's running as a simulator.",
    lines: [
      [SUP, "Sim hall, Cadet. Targets don't shoot back. The things in there will. Holographically.", "calm"],
      [ARIA, "The sim loads field profiles from patrol reports. Real things, recorded. Let's meet them.", "curious"],
    ],
  },
  {
    id: "lab",
    beat: 3,
    title: "KNOW YOUR ENEMY",
    color: "#7dfff0",
    hint: "Holograms of what our patrols have met. Study each one, then put it down. In here their shots can't hurt you.",
    // Each exhibit's briefing plays when it appears (js/tutorial-system.js).
  },

  // ── 5. SIMULATION ────────────────────────────────────────────────
  {
    id: "sim",
    beat: 4,
    title: "SIMULATED BATTLE",
    color: "#7dfff0",
    hint: "Clear both waves. Hits drain SIM INTEGRITY, not your health; at zero the sim restarts. Use the pillars, keep moving, and go for heads.",
    lines: [
      [SUP, "Full sim. Two waves, everything you just met. Integrity hits zero, you run it again.", "calm"],
      [ARIA, "It's only light. But fight it like it isn't, and the real thing won't surprise you.", "warm"],
    ],
    events: [
      [6, "pa", "Calibration cycle three. All personnel stand clear of the Engine chamber."],
      [20, "tremor"],
    ],
  },

  // ── 6. BREACH ────────────────────────────────────────────────────
  {
    id: "alarm",
    beat: 5,
    title: "⚡ ALERT — INTRUSION DETECTED",
    color: "#ff2244",
    hint: "Something has gone very wrong. Listen.",
    // The logic plays these when the klaxon goes, and the beat's checkpoint
    // is the fight after it.
    defer: true,
    checkpoint: false,
    lines: [
      [SUP, "All units, all units, we have a breach on the lower levels. They're coming out of the Engine chamber. They're not, they're not human, they—", "afraid"],
      [SUP, "Breach, every sector, they're already insi—", "afraid"],
      [ARIA, "Lost him. I've lost the whole network. Cadet, his office. Now. Weapon up.", "urgent"],
    ],
  },
  {
    id: "cover",
    beat: 5,
    title: "TAKE COVER — FIGHT BACK",
    color: "#ff2244",
    hint: {
      key: "They shoot back. Put walls between you and them, then lean out to fire. The red arc shows where you're hit from. Hold CTRL to crouch behind low cover.",
      touch: "They shoot back. Put walls between you and them, then lean out to fire. The red arc shows where you're hit from. Hold CROUCH behind low cover.",
      pad: (b) => `They shoot back. Put walls between you and them, then lean out to fire. The red arc shows where you're hit from. Hold ${b("crouch")} behind low cover.`,
    },
    lines: [
      [ARIA, "Hostiles in the Supervisor's office. These are not drills. Use the inner office walls.", "urgent"],
      [ARIA, "They pause before they fire. That glint and whine is your cue to duck.", "urgent"],
    ],
  },
  {
    id: "patch",
    beat: 5,
    title: "PATCH UP",
    color: "#44ff88",
    hint: "Grab the med pack on the Supervisor's desk. Your suit also mends small wounds if you stay out of fire.",
    lines: [
      [ARIA, "His desk. Coffee's still warm. He left in a hurry, or something took him.", "worried"],
      [ARIA, "Med pack. Take it. I like you with all your blood inside.", "tender"],
    ],
  },
  {
    id: "shield",
    beat: 5,
    title: "FLANK THE SHIELD",
    color: "#88aacc",
    hint: {
      key: "Shots off its shield do nothing. It turns slower than you move: circle it, or double-tap to dash past it, and hit it from the side or behind.",
      touch: "Shots off its shield do nothing. It turns slower than you move: circle it, or dash past it, and hit it from the side or behind.",
      pad: (b) => `Shots off its shield do nothing. It turns slower than you move: circle it, or ${b("dash")} past it, and hit it from the side or behind.`,
    },
    lines: [
      [ARIA, "Big one. Chrono Sentinel, shield up front. Don't trade with the shield. Get round it.", "urgent"],
      [ARIA, "It's slow to turn. You're not.", "excited"],
    ],
  },

  // ── 7. BORROWED TIME ─────────────────────────────────────────────
  {
    id: "chrono",
    beat: 6,
    title: "CHRONO SHIFT — BEND TIME",
    color: "#8844ff",
    hint: {
      key: "Hold Q to Chrono Shift: the world slows, you don't. It drains the violet energy bar, which refills when you let go.",
      touch: "Hold SLOW to Chrono Shift: the world slows, you don't. It drains the violet energy bar, which refills when you let go.",
      pad: (b) => `Hold ${b("chronoShift")} to Chrono Shift: the world slows, you don't. It drains the violet energy bar, which refills when you let go.`,
    },
    lines: [
      [ARIA, "Found it. The module they wouldn't tell me about. It's a time-dilation core. In a suit. Who builds that?", "excited"],
      [ARIA, "Hold it, and the world crawls. Let go before it runs dry, or it runs dry for you.", "excited"],
    ],
  },
  {
    id: "vents",
    beat: 6,
    title: "PLASMA VENTS",
    color: "#ff7733",
    hint: {
      key: "The vents burst faster than you can cross. Hold Q to slow them, then go through the gaps.",
      touch: "The vents burst faster than you can cross. Hold SLOW to slow them, then go through the gaps.",
      pad: (b) => `The vents burst faster than you can cross. Hold ${b("chronoShift")} to slow them, then go through the gaps.`,
    },
    lines: [
      [ARIA, "Coolant mains have ruptured. Plasma, at intervals. Not survivable intervals.", "worried"],
      [ARIA, "Slow it down. Watch the rhythm. Go on the gap.", "calm"],
    ],
  },
  {
    id: "slowFire",
    beat: 6,
    title: "OUTPACE THE BULLETS",
    color: "#8844ff",
    hint: "Drones down the corridor. Shift, sidestep their shots while they crawl, and put them down.",
    lines: [
      [ARIA, "Incoming. Shift, and watch their shots hang in the air. Step aside. Rude, but effective.", "urgent"],
    ],
  },

  // ── 8. LIGHTS OUT ────────────────────────────────────────────────
  {
    id: "cells",
    beat: 7,
    title: "LIGHTS OUT — RESTORE POWER",
    color: "#ffb028",
    hint: {
      key: "Main power is gone. Find the two power cells, marked amber on your minimap, in the break room and the armory. Press E to open doors.",
      touch: "Main power is gone. Find the two power cells, marked amber on your minimap, in the break room and the armory. Tap USE to open doors.",
      pad: (b) => `Main power is gone. Find the two power cells, marked amber on your minimap, in the break room and the armory. Press ${b("interact")} to open doors.`,
    },
    cut: true,
    lines: [
      [ARIA, "And there go the lights. Whatever's downstairs just drank the whole grid.", "worried"],
      [ARIA, "The evac lift's in the arena, north end. It's dead without power. Two backup cells, break room and armory. I've marked them.", "urgent"],
      [ARIA, "Every level of this station runs on cells. Get used to finding them. Exits stay sealed until you do.", "calm"],
    ],
  },
  {
    id: "toLift",
    beat: 7,
    title: "TO THE LIFT",
    color: "#22e6c0",
    hint: "Power's routed. Get to the evac lift in the arena at the north end of the corridor.",
    lines: [[ARIA, "That's both. The lift's charging. It'll need a minute, and they'll know we're here.", "urgent"]],
  },

  // ── 9. EVAC ──────────────────────────────────────────────────────
  {
    id: "wave1",
    beat: 8,
    title: "HOLD THE LIFT — WAVE 1/3",
    color: "#ff2244",
    hint: "Hold the arena while the lift charges. Use the pillars for cover; health and ammo are by the south door.",
    lines: [[ARIA, "Here they come. Everything I taught you, Cadet. All of it, at once.", "urgent"]],
  },
  {
    id: "wave2",
    beat: 8,
    title: "HOLD THE LIFT — WAVE 2/3",
    color: "#ff2244",
    hint: "Henchmen flank. Keep moving, keep cover between you, and Shift when they bunch up.",
    lines: [[ARIA, "Lift at sixty percent. More coming in from both ends.", "urgent"]],
  },
  {
    id: "wave3",
    beat: 8,
    title: "HOLD THE LIFT — WAVE 3/3",
    color: "#ff2244",
    hint: "A shield and its escort. Thin the escort, then flank the shield.",
    lines: [[ARIA, "Last push. Ninety percent. Don't you dare die at ninety percent.", "afraid"]],
  },
  {
    id: "extract",
    beat: 8,
    title: "EXTRACT",
    color: "#22e6c0",
    hint: "The lift is live. Get to the extraction beacon.",
    lines: [[ARIA, "Lift's live! The beacon, go, go!", "excited"]],
  },
  {
    id: "reveal",
    beat: 8,
    title: "SIGNAL TRACE",
    color: "#00ffcc",
    hint: "Extraction underway.",
    cut: true,
    lines: [
      [ARIA, "Doors sealed. We're moving. You did it, {AGENT}. You actually did it.", "tender"],
      [ARIA, "While we ride: I traced the Supervisor's last call. It didn't come from his office. It came from the Engine chamber.", "curious"],
      [ARIA, "The chamber logged one entry this morning. Eleven seconds before the breach. No clearance. No name.", "worried"],
      [ARIA, "Just a badge number. Eleven, two, three, five.", "worried"],
      [ARIA, "{AGENT}... that's your badge. And you were with me the whole time.", "afraid"],
    ],
  },
];

/** The step index of `id`, or -1. */
export function prologueStepIndex(id) {
  return PROLOGUE_STEPS.findIndex((s) => s.id === id);
}

/** How long a line stays up: long enough to be read and spoken. */
export function lineDuration(text) {
  return Math.max(3.2, Math.min(9, String(text).length / 15 + 1.4));
}
