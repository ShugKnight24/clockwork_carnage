/**
 * The prologue: the tutorial as the game's first chapter.
 *
 * Certification Day at Chronos Station HQ, the morning of the breach. After
 * the locker room, R&D hands the cadet four trials for the new suit, done in
 * any order from a certification sheet (the hub): weapons at the range, a
 * mobility run across the floor, combat in the sim hall, telemetry in R&D's
 * rig. Each finished trial makes the Engine's calibration a little stranger;
 * after the fourth, 06:47. Then the breach, and the way out.
 *
 * Each step has its instruction card (title + hint, per input device) and
 * the dialogue that carries the story while you play; the logic that drives
 * each step lives in js/tutorial-system.js, keyed by `id`. A trial's steps
 * carry its `trial` id: the hub starts a trial at its first step, and its
 * last step hands back to the hub.
 *
 * Pure data: the copy is read by the card renderer (src/ui/tutorial-ui.js)
 * and the unit tests, neither of which should pull in the game.
 */

/** The chapter's beats, in order. A beat's first step is its checkpoint. */
export const PROLOGUE_BEATS = [
  { id: "clockingIn", title: "CLOCKING IN" },
  { id: "certify", title: "CERTIFICATION DAY" },
  { id: "weapons", title: "TRIAL · WEAPONS" },
  { id: "mobility", title: "TRIAL · MOBILITY" },
  { id: "combat", title: "TRIAL · COMBAT" },
  { id: "telemetry", title: "TRIAL · TELEMETRY" },
  { id: "sixFortySeven", title: "SIX FORTY-SEVEN" },
  { id: "breach", title: "BREACH" },
  { id: "borrowedTime", title: "BORROWED TIME" },
  { id: "lightsOut", title: "LIGHTS OUT" },
  { id: "evac", title: "LIFT B" },
];

/**
 * The certification sheet: the four trials, where each starts, and the time
 * that earns each grade (`par`, seconds; null: graded pass or fail). Done in
 * any order from the hub.
 */
export const PROLOGUE_TRIALS = [
  { id: "weapons", name: "WEAPONS", where: "THE RANGE", par: 75 },
  { id: "mobility", name: "MOBILITY", where: "LOBBY START GATE", par: 55 },
  { id: "combat", name: "COMBAT", where: "SIM HALL", par: 110 },
  { id: "telemetry", name: "TELEMETRY", where: "R&D BAY", par: null },
];

const ARIA = "ARIA";
const SUP = "SUPERVISOR";
/** The station's public address: announcements that say more than they mean to. */
const PA = "PA";
/** The squad leaving for the Engine level, and its lieutenant. */
const OFF = "OFFICER";
const RASCZAK = "LT. RASCZAK";
/** Sergeant Kael, on the squad that morning: Act II finds him holding the Precinct. */
const KAEL = "SGT. KAEL";
/** R&D: Dr. Orr runs the suit programme, Lin the sim hall, Vale the timing. */
const ORR = "DR. ORR";
const LIN = "LIN";
const VALE = "VALE";

/**
 * The calibration going wrong, one oddity for each trial you finish (not on
 * a timer), wherever you happen to be. `pa` is what the station announces;
 * the logic stages the rest (js/tutorial-system.js escalate()). The fourth
 * trial's is the breach itself.
 */
export const PROLOGUE_ODDITIES = [
  // 1: the corridor clocks read 06:47 for a moment, then right again. Nobody notices.
  { pa: "Engineering: calibration thirty-one percent. Thank you for your patience." },
  // 2: the PA says it again, word for word; Mendez pours the same coffee twice.
  { repeat: true, lines: [[ARIA, "Did he just...?", "curious"]], away: [[ARIA, "Did the PA just say that twice?", "curious"]] },
  // 3: a hologram the sim hall never loaded; the lights stutter on the Engine's beat.
  {
    lines: [
      [LIN, "Uh. Sim hall just loaded a profile nobody asked for.", "worried"],
      [SUP, "Sensor fault.", "worried", { radio: true }],
    ],
  },
];

/**
 * Dialogue: [speaker, text, emotion?, { radio }?]. The Supervisor speaks in
 * person while he is near you, and over the suit channel when not (or with
 * `radio: true`). Lines play in order, one after the other, from when their
 * step begins; a step's lines wait for the last step's to finish unless the
 * step says `cut: true` (an alarm cuts in).
 *
 * Events: [seconds into the step, kind, text?]: "pa" (a station
 * announcement), "flicker" (the lights stutter) and "tremor" (the floor
 * shudders).
 *
 * Hints: `key` for keyboard and mouse, `touch` for touch (no key names),
 * `pad(b)` for a controller, where b(action) is that pad's button legend.
 * A hint without a variant is the same on every device.
 */
export const PROLOGUE_STEPS = [
  // ── 1. CLOCKING IN ───────────────────────────────────────────────
  // The locker room before the suit goes on: no HUD, no ARIA, the morning
  // shift. The scene (officers, the Supervisor walking in, the salute, the
  // squads sent down) is played by the logic; these are its words.
  {
    id: "arrive",
    beat: 0,
    preSuit: true,
    lines: [
      [OFF, "Third alarm this week. Engineering's going to blow us all to the moon.", "calm"],
      [OFF, "Lift B's been up and down all night. Log says nobody's on it.", "curious"],
      [KAEL, "You're early, Cadet. Don't make it a habit.", "calm"],
    ],
  },
  {
    id: "suitUp",
    beat: 0,
    preSuit: true,
    title: "SUIT UP",
    color: "#ffb028",
    hint: {
      key: (k) => `Your locker is the one with the light on. Face it and press ${k("interact")}.`,
      touch: "Your locker is the one with the light on. Face it and tap USE.",
      pad: (b) => `Your locker is the one with the light on. Face it and press ${b("interact")}.`,
    },
  },
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
      [ARIA, "Link's holding. Sorry about the cold hands.", "warm"],
      [ARIA, "Have a look around. Everything you see, I see. Try not to look at anything embarrassing.", "warm"],
    ],
  },
  {
    id: "walk",
    beat: 0,
    title: "MOVE — GET USED TO THE SUIT",
    color: "#00ccff",
    hint: {
      key: "W A S D to walk. Head out of the locker room.",
      touch: "Use the left stick to walk. Head out of the locker room.",
      pad: () => "Left stick to walk. Head out of the locker room.",
    },
    lines: [
      [ARIA, "The suit's a prototype. Servo assist, plating, and a module they wouldn't tell me about.", "curious"],
      [ARIA, "The Supervisor's on the suit channel, by the way. He can hear you breathing.", "warm"],
    ],
    events: [[7, "pa", "Good morning, Chronos Station. Engineering reminds all staff that the Engine level is closed for today's calibration."]],
  },
  {
    id: "toRange",
    beat: 0,
    title: "REPORT TO THE RANGE",
    color: "#00ccff",
    hint: "Follow the marker down the corridor to the firing range.",
    lines: [
      [SUP, "It suits you. Don't let it go to your head. That suit cost more than this building. The Bureau wants it certified by noon. You want to keep your badge. So we certify it.", "calm"],
      [SUP, "You never froze on patrol. Don't make me regret it.", "calm"],
      [ARIA, "He likes you. That was him liking you.", "happy"],
      [SUP, "If the lights flicker, ignore it. That's an order.", "worried"],
    ],
    events: [[16, "flicker"]],
  },

  // ── 2. CERTIFICATION DAY: the hub ────────────────────────────────
  {
    id: "certify",
    beat: 1,
    title: "CERTIFICATION DAY",
    color: "#22e6c0",
    hint: "Four trials, any order. The sheet keeps your grades; the marker shows the nearest trial you haven't done.",
    // R&D's welcome, said once (the first time the sheet comes up), while
    // you are free to start: the pistol is on the first bench.
    brief: [
      [ORR, "Cadet. Nadia Orr, R&D. That suit is mine, so be nice to it.", "warm"],
      [ORR, "Four trials by noon. Weapons here, a run from the lobby, the sim hall with Lin, then telemetry with me. Any order.", "calm"],
      [VALE, "I'm timing your run. Start gate's in the lobby.", "happy"],
      [SUP, "Range is right here, Cadet. Pistol's on the first bench.", "calm"],
    ],
  },

  // ── 3. TRIAL: WEAPONS (the range) ────────────────────────────────
  {
    id: "pistol",
    beat: 2,
    trial: "weapons",
    title: "ARM YOURSELF",
    color: "#ff6600",
    hint: "Walk over the Chrono Pistol on the first bench to pick it up.",
    lines: [[SUP, "Chrono Pistol. Standard issue. Point the loud end away from me.", "calm"]],
  },
  {
    id: "fire",
    beat: 2,
    trial: "weapons",
    title: "PUT ROUNDS ON TARGET",
    color: "#ff8844",
    hint: {
      key: "CLICK to fire. Destroy the training drones at the end of the lane.",
      touch: "Tap FIRE. Destroy the training drones at the end of the lane.",
      pad: (b) => `Pull ${b("fire")} to fire. Destroy the training drones at the end of the lane.`,
    },
    lines: [[ARIA, "Holo-drones. They can't shoot back. Enjoy that while it lasts.", "happy"]],
  },
  {
    id: "ads",
    beat: 2,
    trial: "weapons",
    title: "AIM DOWN SIGHTS",
    color: "#66eeff",
    hint: {
      key: (k) => `Hold RIGHT MOUSE or ${k("aim")} to aim down sights, then fire. Slower feet, tighter shots. (Settings > Controls > Toggle Aim if holding is awkward.)`,
      touch: "Hold AIM to aim down sights, then fire. Slower feet, tighter shots.",
      pad: (b) => `Hold ${b("aim")} to aim down sights, then fire. Slower feet, tighter shots.`,
    },
    lines: [
      [SUP, "Long lane. Hip fire won't cut it. Use the sights.", "calm"],
      [ARIA, "Every kill counts while you're aimed in. Every miss, I'm writing down.", "happy"],
    ],
  },
  {
    id: "moving",
    beat: 2,
    trial: "weapons",
    title: "MOVING TARGETS — GO FOR THE HEAD",
    color: "#ffcc33",
    hint: "Holo-dummies, and they move. Lead them, and aim for the head: a headshot does over double damage and drops one in a single round.",
    lines: [
      [SUP, "Real targets don't hold still and they don't fall over politely. Head shots.", "calm"],
      [ARIA, "Listen for the crack. That's the sound of a headshot.", "curious"],
    ],
  },
  {
    id: "shotgun",
    beat: 2,
    trial: "weapons",
    title: "RIGHT TOOL — THE SHOTGUN",
    color: "#ff6600",
    hint: {
      key: (k) => `Pick up the Temporal Shotgun, switch to it with ${k("weapon1")}/${k("weapon2")} or the scroll wheel, and clear the close targets.`,
      touch: "Pick up the Temporal Shotgun, swipe the weapon panel to switch to it, and clear the close targets.",
      pad: (b) => `Pick up the Temporal Shotgun, press ${b("weaponNext")} to switch to it, and clear the close targets.`,
    },
    lines: [[SUP, "Shotgun's for when they're close enough to smell. Which, in this job, is often.", "calm"]],
  },
  // The armorer's reload drill goes here (active reload): a hook, no card
  // yet. It completes as soon as it starts.
  { id: "reloadDrill", beat: 2, trial: "weapons" },
  {
    id: "ammo",
    beat: 2,
    trial: "weapons",
    title: "RESUPPLY",
    color: "#44ff88",
    hint: "Your ammo is under the weapon readout. Grab the ammo crate by the window before you leave.",
    lines: [[ARIA, "Rounds don't grow on trees. They grow in crates. Take that one.", "warm"]],
  },

  // ── 4. TRIAL: MOBILITY (a marked run across the floor) ───────────
  // One run, timed from the start gate in the lobby to the same gate:
  // up the corridor, through the gym, the office, down the spine, across
  // the atrium's bridge and home. Each step is a stretch of it with the
  // move it needs; the clock runs across all four.
  {
    id: "sprint",
    beat: 3,
    trial: "mobility",
    title: "SPRINT — PACE THE STRAIGHTS",
    color: "#ff44ff",
    hint: {
      key: (k) => `Run the gates in order. Hold ${k("sprint")} to sprint: it drains the stamina bar under your health. Ease off before it's empty and it comes back.`,
      touch: "Run the gates in order. Tap RUN to sprint: it drains the stamina bar under your health. Ease off before it's empty and it comes back.",
      pad: (b) => `Run the gates in order. Hold ${b("sprint")} to sprint: it drains the stamina bar under your health. Ease off before it's empty and it comes back.`,
    },
    lines: [
      [VALE, "Clock's running. The next gate lights up.", "happy"],
      [ARIA, "Long straight. Don't spend it all at once.", "warm"],
    ],
  },
  {
    id: "slide",
    beat: 3,
    trial: "mobility",
    title: "SLIDE UNDER THE SHUTTERS",
    color: "#66ff99",
    hint: {
      key: (k) => `The calibration has the shutters half down. Sprint at one and tap ${k("crouch")} to slide under it, or hold ${k("crouch")} and walk it, slower.`,
      touch: "The calibration has the shutters half down. Run at one and tap CROUCH to slide under it, or hold CROUCH and walk it, slower.",
      pad: (b) => `The calibration has the shutters half down. Sprint at one and tap ${b("crouch")} to slide under it, or hold ${b("crouch")} and walk it, slower.`,
    },
    lines: [[VALE, "Shutters are stuck for the calibration. Go under.", "calm"]],
  },
  {
    id: "dash",
    beat: 3,
    trial: "mobility",
    title: "PHASE DASH — CROSS THE GAP",
    color: "#ff44ff",
    hint: {
      key: (k) => `The bridge is out in the middle. Run at the gap and press ${k("dash")}, or double-tap forward, at the edge: the dash carries you over.`,
      touch: "The bridge is out in the middle. Run at the gap and double-tap forward on the stick at the edge: the dash carries you over.",
      pad: (b) => `The bridge is out in the middle. Tap ${b("dash")} at its edge as you run at it: the dash carries you over.`,
    },
    lines: [[ARIA, "Don't look down. I'm looking down. Don't look down.", "excited"]],
  },
  {
    id: "runHome",
    beat: 3,
    trial: "mobility",
    title: "HOME STRETCH",
    color: "#ffcc33",
    hint: "The last gate is the start gate, back in the lobby. The clock's still running.",
    lines: [[VALE, "Home stretch. Don't coast.", "excited"]],
  },

  // ── 5. TRIAL: COMBAT (the sim hall) ──────────────────────────────
  {
    id: "lab",
    beat: 4,
    trial: "combat",
    title: "KNOW YOUR ENEMY",
    color: "#7dfff0",
    hint: "Holograms of what our patrols have met. Study each one, then put it down. In here their shots can't hurt you.",
    // Each exhibit's briefing plays when it appears (js/tutorial-system.js).
    lines: [[LIN, "Sim hall. Field profiles from patrol reports: real things, recorded. One at a time first.", "calm"]],
  },
  // The cover lesson goes here (cover system): a hook, no card yet. It
  // completes as soon as it starts.
  { id: "coverDrill", beat: 4, trial: "combat" },
  {
    id: "sim",
    beat: 4,
    trial: "combat",
    title: "SIMULATED BATTLE",
    color: "#7dfff0",
    hint: "Clear both waves. Holo blocks rise out of the floor: get behind them, then lean out to fire. Hits drain SIM INTEGRITY, not your health; at zero the sim restarts.",
    lines: [
      [LIN, "Full sim. Two waves. Cover comes up out of the floor; use it.", "calm"],
      [ARIA, "It's only light. Fight it like it isn't, and the real thing won't surprise you.", "warm"],
    ],
  },

  // ── 6. TRIAL: TELEMETRY (R&D's rig) ──────────────────────────────
  {
    id: "telemetry",
    beat: 5,
    trial: "telemetry",
    title: "SUIT TELEMETRY",
    color: "#46e0ff",
    hint: "Stand on the rig's pad in the middle of the bay and hold still while Dr. Orr reads the suit.",
    lines: [[ORR, "On the pad. Arms down. It's a suit, not a confessional.", "warm"]],
  },

  // ── 7. SIX FORTY-SEVEN ───────────────────────────────────────────
  {
    id: "signOff",
    beat: 6,
    title: "SIGN-OFF AT LIFT B",
    color: "#22e6c0",
    hint: "Take your sheet to the Supervisor, at Lift B in the sim hall.",
    lines: [[SUP, "That's four. Bring me the sheet, Cadet. Lift B. The Bureau's sending someone up for it.", "calm"]],
  },
  {
    id: "sixFortySeven",
    beat: 6,
    title: "06:47",
    color: "#ff2244",
    hint: "Lift B opened by itself. Whatever came up in it, put it down.",
    // The logic plays the minute itself (the lift, the pulse, the floor
    // stopping): these lines are its words, said as the doors open.
    defer: true,
    lines: [
      [ARIA, "Lift B just opened. Nobody called it.", "afraid"],
      [SUP, "Cadet. Put it down.", "afraid"],
    ],
  },
  {
    id: "alarm",
    beat: 6,
    title: "⚡ ALERT — INTRUSION DETECTED",
    color: "#ff2244",
    hint: "Something has gone very wrong. Listen.",
    // The logic plays these when the klaxon goes, and the beat's checkpoint
    // is the fight after it.
    defer: true,
    checkpoint: false,
    lines: [
      [SUP, "Rasczak, report. Rasczak! ...All units, all units: breach on the Engine level. Something is coming up out of the chamber.", "afraid"],
      [SUP, "Cadet, you stay here. That's an order. Those are my people down there.", "urgent"],
      [SUP, "Breach, every sector, they're already insi—", "afraid", { radio: true }],
      [ARIA, "Lost him. Lost the whole network. Whatever came up that shaft, more will follow. His office has the lift override. Move.", "urgent"],
    ],
  },

  // ── 8. BREACH ────────────────────────────────────────────────────
  {
    id: "cover",
    beat: 7,
    title: "TAKE COVER — FIGHT BACK",
    color: "#ff2244",
    hint: {
      key: (k) => `They shoot back. Put walls between you and them, then lean out to fire. The red arc shows where you're hit from. Hold ${k("crouch")} to crouch behind low cover.`,
      touch: "They shoot back. Put walls between you and them, then lean out to fire. The red arc shows where you're hit from. Hold CROUCH behind low cover.",
      pad: (b) => `They shoot back. Put walls between you and them, then lean out to fire. The red arc shows where you're hit from. Hold ${b("crouch")} behind low cover.`,
    },
    lines: [
      [ARIA, "Watch the air. Where it cracks and glows, something's coming through.", "urgent"],
      [ARIA, "They pause before they fire. That glint and whine is your cue to duck.", "urgent"],
    ],
    // How it reached this floor: up from the Engine level, a floor at a time.
    events: [[2, "pa", "Containment breach, Engine level. Temporal wavefront rising. All floors, shelter in place. Do not use the lifts."]],
  },
  {
    id: "patch",
    beat: 7,
    title: "PATCH UP",
    color: "#44ff88",
    hint: "Grab the med pack on the Supervisor's desk. Your suit also mends small wounds if you stay out of fire.",
    lines: [
      [ARIA, "Your transfer's on top of his pile. Only signature on it is his.", "sad"],
      [ARIA, "Med pack. Take it. Please.", "tender"],
    ],
  },
  {
    id: "shield",
    beat: 7,
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

  // ── 9. BORROWED TIME ─────────────────────────────────────────────
  {
    id: "chrono",
    beat: 8,
    title: "CHRONO SHIFT — BEND TIME",
    color: "#8844ff",
    hint: {
      key: (k) => `Hold ${k("chronoShift")} to Chrono Shift: the world slows, you don't. It drains the violet energy bar, which refills when you let go.`,
      touch: "Hold SLOW to Chrono Shift: the world slows, you don't. It drains the violet energy bar, which refills when you let go.",
      pad: (b) => `Hold ${b("chronoShift")} to Chrono Shift: the world slows, you don't. It drains the violet energy bar, which refills when you let go.`,
    },
    lines: [
      [ARIA, "The anchor Orr found. It does more than hold. It's a time-dilation core. In a suit. Who builds that?", "excited"],
      [ARIA, "Hold it, and the world crawls. Let go before it runs dry, or it runs dry for you.", "excited"],
    ],
  },
  {
    id: "vents",
    beat: 8,
    title: "PLASMA VENTS",
    color: "#ff7733",
    hint: {
      key: (k) => `The vents burst faster than you can cross. Hold ${k("chronoShift")} to slow them, then go through the gaps.`,
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
    beat: 8,
    title: "OUTPACE THE BULLETS",
    color: "#8844ff",
    hint: "Drones dropping out of the vents. Shift, sidestep their shots while they crawl, and put them down.",
    lines: [
      [ARIA, "The grilles. Something's in the ducts.", "urgent"],
      [ARIA, "Shift, and watch their shots hang in the air. Then step out of their way.", "urgent"],
    ],
  },

  // ── 10. LIGHTS OUT ───────────────────────────────────────────────
  {
    id: "breaker",
    beat: 9,
    title: "LIGHTS OUT — THE BREAKER",
    color: "#ffb028",
    hint: {
      key: (k) => `Main power's gone. Lift B runs off R&D's main breaker: get to the R&D bay, at the north end of the east wing, face the breaker and press ${k("interact")}.`,
      touch: "Main power's gone. Lift B runs off R&D's main breaker: get to the R&D bay, at the north end of the east wing, face the breaker and tap USE.",
      pad: (b) => `Main power's gone. Lift B runs off R&D's main breaker: get to the R&D bay, at the north end of the east wing, face the breaker and press ${b("interact")}.`,
    },
    cut: true,
    lines: [
      [ARIA, "And there go the lights. Whatever's downstairs just drank the whole grid.", "worried"],
      [ARIA, "I've got his override. Lift B runs off R&D's breaker. Throw it and I can call the car.", "urgent"],
      [ARIA, "{AGENT}. Roll call just came through. Rasczak's squads aren't answering.", "sad"],
      [ARIA, "Everyone on this floor stopped at six forty-seven. You didn't.", "sad"],
      [ARIA, "Your anchor held. Theirs... half held.", "afraid"],
      [ARIA, "The Supervisor's beacon. It's gone flat. ...I'm sorry, {AGENT}.", "sad"],
    ],
    // Every clock on the floor stopped at the breach. So did the announcer.
    events: [[30, "pa", "Good morning, Chronos Station. The time is six forty-seven. The time is six forty-seven."]],
  },
  {
    id: "toLift",
    beat: 9,
    title: "TO THE LIFT",
    color: "#22e6c0",
    hint: "Power's on. Back to Lift B, through the north hall into the sim hall.",
    lines: [[ARIA, "That's it. Calling Lift B back up. It'll take a minute, and it won't be quiet.", "urgent"]],
  },

  // ── 11. EVAC ─────────────────────────────────────────────────────
  {
    id: "wave1",
    beat: 10,
    title: "HOLD THE LIFT — WAVE 1/3",
    color: "#ff2244",
    hint: "Hold the sim hall while the lift climbs back up. The holo blocks are still up: use them. Health and ammo are by the south door.",
    lines: [[ARIA, "Orr's moving. {AGENT}, that isn't Orr any more. Don't let it close.", "afraid"]],
  },
  {
    id: "wave2",
    beat: 10,
    title: "HOLD THE LIFT — WAVE 2/3",
    color: "#ff2244",
    hint: "Henchmen flank. Keep moving, keep cover between you, and Shift when they bunch up.",
    lines: [[ARIA, "Lift at sixty percent. More coming in from both ends.", "urgent"]],
  },
  {
    id: "wave3",
    beat: 10,
    title: "HOLD THE LIFT — WAVE 3/3",
    color: "#ff2244",
    hint: "A shield and its escort. Thin the escort, then flank the shield.",
    lines: [[ARIA, "Last push. Ninety percent. Don't you dare die at ninety percent.", "afraid"]],
  },
  {
    id: "extract",
    beat: 10,
    title: "GET IN",
    color: "#22e6c0",
    hint: "The lift is back up and open. Step inside.",
    lines: [[ARIA, "Lift's here. Empty. Get in, {AGENT}.", "sad"]],
  },
  {
    id: "reveal",
    beat: 10,
    title: "SIGNAL TRACE",
    color: "#00ffcc",
    hint: "Going down.",
    cut: true,
    lines: [
      [ARIA, "Doors sealed. Going down. Same car he took.", "sad"],
      [ARIA, "I traced his last call. He never stopped at the chamber door. He called from inside the Engine chamber.", "worried"],
      [ARIA, "The chamber logged one entry this morning. Eleven seconds long, at the minute of the breach. No clearance. No name.", "worried"],
      [ARIA, "Just a badge number. Eleven, two, three, five.", "worried"],
      [ARIA, "{AGENT}... that's your badge. And you were with me the whole time.", "afraid"],
    ],
  },
];

/** Grades, best first ("PASS": a trial graded pass or fail). */
export const TRIAL_GRADES = ["S", "A", "B", "C", "PASS"];

/**
 * A trial's grade from its time against par, nudged by accuracy where shots
 * were fired: S under 80% of par, A at par, B within a third over, C after;
 * under half the shots landing drops a grade, four in five lifts one.
 */
export function gradeTrial(trial, time, acc) {
  if (trial?.par == null) return "PASS";
  const k = time / trial.par;
  let i = k <= 0.8 ? 0 : k <= 1 ? 1 : k <= 1.33 ? 2 : 3;
  if (acc != null && acc < 0.5) i = Math.min(3, i + 1);
  if (acc != null && acc >= 0.8) i = Math.max(0, i - 1);
  return TRIAL_GRADES[i];
}

/** The step index of `id`, or -1. */
export function prologueStepIndex(id) {
  return PROLOGUE_STEPS.findIndex((s) => s.id === id);
}

/** A trial's first step's index (where the hub starts it), or -1. */
export function trialStart(trial) {
  return PROLOGUE_STEPS.findIndex((s) => s.trial === trial);
}

/** How long a line stays up: long enough to be read and spoken. */
export function lineDuration(text) {
  return Math.max(3.2, Math.min(9, String(text).length / 15 + 1.4));
}
