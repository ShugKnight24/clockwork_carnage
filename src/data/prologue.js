/**
 * The prologue: the tutorial as the game's first chapter.
 *
 * Certification Day at Chronos Station HQ, the morning of the breach. After
 * the locker room, Dr. Orr walks the cadet to R&D to calibrate the suit to
 * them (the first trial), then hands over the certification sheet: the other
 * three in any order (the hub), each run in person by the one who owns it.
 * Weapons with the Supervisor at the range, mobility with Vale on the track
 * off the gym, combat with Lin in the sim hall. Each finished trial makes the
 * Engine's calibration a little stranger; after the last, 06:47. Then the
 * Supervisor's walk to his armour and down Lift B, the breach, and the way out.
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
  { id: "calibration", title: "TRIAL · CALIBRATION" },
  { id: "certify", title: "CERTIFICATION DAY" },
  { id: "weapons", title: "TRIAL · WEAPONS" },
  { id: "mobility", title: "TRIAL · MOBILITY" },
  { id: "combat", title: "TRIAL · COMBAT" },
  { id: "sixFortySeven", title: "SIX FORTY-SEVEN" },
  { id: "escort", title: "THE VEST" },
  { id: "breach", title: "BREACH" },
  { id: "borrowedTime", title: "BORROWED TIME" },
  { id: "lightsOut", title: "LIGHTS OUT" },
  { id: "evac", title: "LIFT B" },
];

/**
 * The certification sheet: the four trials, where each is run, who runs it,
 * and the time that earns each grade (`par`, seconds; null: graded pass or
 * fail). Calibration comes first, before the sheet is handed over; the rest
 * are done in any order from the hub. A trial with `reloads` counts its
 * active reloads toward the grade (gradeTrial).
 */
export const PROLOGUE_TRIALS = [
  { id: "calibration", name: "CALIBRATION", where: "R&D BAY", lead: "DR. ORR", par: null },
  { id: "weapons", name: "WEAPONS", where: "THE RANGE", lead: "SUPERVISOR", par: 75, reloads: true },
  { id: "mobility", name: "MOBILITY", where: "TRAINING HALL, THROUGH THE GYM", lead: "VALE", par: 34 },
  { id: "combat", name: "COMBAT", where: "SIM HALL, LIN'S BOOTH", lead: "LIN", par: 110 },
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
/** R&D: Dr. Orr runs the suit programme, Lin the sim hall, Vale the track. */
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
  { repeat: true, lines: [[ARIA, "The PA just said that twice. And Mendez... did he just pour that again?", "curious"]], away: [[ARIA, "Did the PA just say that twice?", "curious"]] },
  // 3: a hologram the sim hall never loaded; the lights stutter on the Engine's beat.
  // (Away from the sim hall, ARIA catches Lin saying it on the floor channel.)
  {
    lines: [
      [LIN, "Uh. Sim hall just loaded a profile nobody asked for.", "worried"],
      [SUP, "Sensor fault.", "worried", { radio: true }],
    ],
    away: [
      [ARIA, "Lin, on the floor channel: the sim just loaded a profile nobody asked for.", "curious"],
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

  // ── 2. TRIAL: CALIBRATION (R&D, before anything else) ────────────
  // At the range the Supervisor hands the cadet to Orr, who walks them to
  // R&D and talks on the way: what calibration is, and why them.
  {
    id: "toLab",
    beat: 1,
    trial: "calibration",
    title: "WALK WITH DR. ORR",
    color: "#46e0ff",
    hint: "Dr. Orr is taking you up to R&D, at the north end of the east wing. Walk with her, or follow the marker.",
    lines: [
      [SUP, "Not yet, Cadet. Orr wants that suit tuned to you first.", "calm"],
      [ORR, "Nadia Orr, R&D. Walk with me. Right now the suit's guessing at you; calibration teaches it you.", "warm"],
      [ORR, "Your body, your nerves, how your head runs. I'll be honest: it might not take.", "worried"],
      [ORR, "We read every officer on the force. Biomarkers, neural frequencies. You were the best match, by a distance.", "calm"],
      [ARIA, "She's not exaggerating. I've seen the numbers.", "warm"],
    ],
  },
  {
    id: "calibrate",
    beat: 1,
    trial: "calibration",
    title: "SUIT CALIBRATION",
    color: "#46e0ff",
    hint: "Stand on the rig's pad, inside the lit ring in the middle of the bay. Hold still for the frame, look at each beacon as it lights, then hold still for the anchor.",
    lines: [[ORR, "That's the rig. On the pad, inside the ring. It tunes the suit to you: frame, eyes, then the anchor.", "calm"]],
  },

  // ── 3. CERTIFICATION DAY: the hub ────────────────────────────────
  {
    id: "certify",
    beat: 2,
    title: "CERTIFICATION DAY",
    color: "#22e6c0",
    hint: {
      key: (k) => `Three trials left, any order: the Supervisor at the range, Vale in the training hall through the gym, Lin in the sim hall. Lin starts the sim when you tell her: face her and press ${k("interact")}.`,
      touch: "Three trials left, any order: the Supervisor at the range, Vale in the training hall through the gym, Lin in the sim hall. Lin starts the sim when you tell her: face her and tap USE.",
      pad: (b) => `Three trials left, any order: the Supervisor at the range, Vale in the training hall through the gym, Lin in the sim hall. Lin starts the sim when you tell her: face her and press ${b("interact")}.`,
    },
    // Orr hands over the sheet, once, as the calibration ends.
    brief: [
      [ORR, "There. You're on the sheet. Three more by noon, any order.", "warm"],
      [ORR, "Weapons with the Supervisor at the range. Vale has the track, through the gym. Lin runs the sim hall.", "calm"],
      [ORR, "I'll see you at Lift B when you're done. Go on.", "warm"],
    ],
  },

  // ── 4. TRIAL: WEAPONS (the range) ────────────────────────────────
  {
    id: "pistol",
    beat: 3,
    trial: "weapons",
    // The Supervisor's welcome is off the clock: it starts when you arm.
    untimed: true,
    title: "ARM YOURSELF",
    color: "#ff6600",
    hint: "Walk over the Chrono Pistol on the first bench to pick it up.",
    lines: [
      [SUP, "Tuned? Good. Chrono Pistol, first bench. Clock starts when you pick it up.", "calm"],
      [SUP, "Point the loud end away from me.", "calm"],
    ],
  },
  {
    id: "fire",
    beat: 3,
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
    beat: 3,
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
    beat: 3,
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
    beat: 3,
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
  {
    id: "reloadDrill",
    beat: 3,
    trial: "weapons",
    title: "ACTIVE RELOAD",
    color: "#ffd24a",
    hint: {
      key: (k) => `Pistol. Empty it, or press ${k("reload")} to reload. Press ${k("reload")} again as the marker crosses the bright band: a faster reload, and the next mag hits harder. Miss and it jams.`,
      touch: "Pistol. Empty it, or tap USE to reload. Tap USE again as the marker crosses the bright band: a faster reload, and the next mag hits harder. Miss and it jams.",
      pad: (b) => `Pistol. Empty it, or press ${b("reload")} to reload. Press ${b("reload")} again as the marker crosses the bright band: a faster reload, and the next mag hits harder. Miss and it jams.`,
    },
    lines: [[SUP, "Reload, then hit it again in the band. Quicker, and the next mag bites harder.", "calm"]],
  },
  {
    id: "ammo",
    beat: 3,
    trial: "weapons",
    title: "RESUPPLY",
    color: "#44ff88",
    hint: "Your ammo is under the weapon readout. Grab the ammo crate by the window before you leave.",
    lines: [[ARIA, "Rounds don't grow on trees. They grow in crates. Take that one.", "warm"]],
  },

  // ── 5. TRIAL: MOBILITY (the training hall, off the gym) ──────────
  // Vale walks you through the moves, one at a time and off the clock, in
  // the warm-up lane; then the run uses them, one lane each. (`untimed`:
  // the trial's clock waits.)
  {
    id: "warmSprint",
    beat: 4,
    trial: "mobility",
    untimed: true,
    title: "WARM-UP — SPRINT",
    color: "#ff44ff",
    hint: {
      key: (k) => `Hold ${k("sprint")} while you walk to sprint. The bar under your health is stamina: it drains while you sprint and comes back when you ease off.`,
      touch: "Tap RUN while you walk to sprint. The bar under your health is stamina: it drains while you sprint and comes back when you ease off.",
      pad: (b) => `Hold ${b("sprint")} while you walk to sprint. The bar under your health is stamina: it drains while you sprint and comes back when you ease off.`,
    },
    lines: [
      [VALE, "Ines Vale. I'm timing you. Clock's not running yet, so loosen up: sprint the lane.", "happy"],
      [ARIA, "Watch the bar under your health. That's your lungs.", "warm"],
    ],
  },
  {
    id: "warmCrouch",
    beat: 4,
    trial: "mobility",
    untimed: true,
    title: "WARM-UP — CROUCH",
    color: "#66ff99",
    hint: {
      key: (k) => `Hold ${k("crouch")} and walk: low and slow, under things and behind low cover.`,
      touch: "Hold CROUCH and walk: low and slow, under things and behind low cover.",
      pad: (b) => `Hold ${b("crouch")} and walk: low and slow, under things and behind low cover.`,
    },
    lines: [[VALE, "Good. Now get low and walk it, like there's a ceiling on you. There will be.", "calm"]],
  },
  {
    id: "warmSlide",
    beat: 4,
    trial: "mobility",
    untimed: true,
    title: "WARM-UP — SLIDE",
    color: "#66ff99",
    hint: {
      key: (k) => `Sprint, then tap ${k("crouch")}: you slide, low and fast.`,
      touch: "Run, then tap CROUCH: you slide, low and fast.",
      pad: (b) => `Sprint, then tap ${b("crouch")}: you slide, low and fast.`,
    },
    lines: [[VALE, "From a sprint, drop into it. That's how you get under the bars.", "excited"]],
  },
  {
    id: "warmDash",
    beat: 4,
    trial: "mobility",
    untimed: true,
    title: "WARM-UP — PHASE DASH",
    color: "#ff44ff",
    hint: {
      key: (k) => `Press ${k("dash")} (or double-tap a direction) to phase-dash the way you're moving.`,
      touch: "Double-tap a direction on the stick to phase-dash that way.",
      pad: (b) => `Press ${b("dash")} to phase-dash the way you're moving.`,
    },
    lines: [
      [VALE, "Last one's the suit, not your legs. A phase dash. Go on.", "curious"],
      [ARIA, "A short phase. I'll hold your hand. Metaphorically.", "warm"],
    ],
  },
  // One timed run, a lane each: down lane one at a sprint, up lane two
  // under the bars, down lane three through the tunnel and over the pit.
  // The clock starts on the start line and runs across all five steps.
  {
    id: "sprint",
    beat: 4,
    trial: "mobility",
    title: "SPRINT — LANE ONE",
    color: "#ff44ff",
    hint: {
      key: (k) => `Stand on the start line, top of lane one: Vale counts you in. On "Go", hold ${k("sprint")}: the bar won't last the straight. Ease off before it's empty and it comes back.`,
      touch: "Stand on the start line, top of lane one: Vale counts you in. On \"Go\", tap RUN: the bar won't last the straight. Ease off before it's empty and it comes back.",
      pad: (b) => `Stand on the start line, top of lane one: Vale counts you in. On "Go", hold ${b("sprint")}: the bar won't last the straight. Ease off before it's empty and it comes back.`,
    },
    lines: [
      [VALE, "That's the warm-up. Take a breath. Lane one, on the line, and I'll count you in.", "happy"],
      [ARIA, "Long straight. Don't spend it all at once.", "warm"],
    ],
  },
  {
    id: "slide",
    beat: 4,
    trial: "mobility",
    title: "SLIDE — LANE TWO",
    color: "#66ff99",
    hint: {
      key: (k) => `Up lane two, under the bars: sprint at one and tap ${k("crouch")}, or hold ${k("crouch")} and walk it, slower.`,
      touch: "Up lane two, under the bars: run at one and tap CROUCH, or hold CROUCH and walk it, slower.",
      pad: (b) => `Up lane two, under the bars: sprint at one and tap ${b("crouch")}, or hold ${b("crouch")} and walk it, slower.`,
    },
    lines: [[VALE, "Lane two. Under the bars, not over.", "calm"]],
  },
  {
    id: "tunnel",
    beat: 4,
    trial: "mobility",
    title: "CROUCH — THE TUNNEL",
    color: "#66ff99",
    hint: {
      key: (k) => `Down lane three: hold ${k("crouch")} through the tunnel. Slide into it and you're halfway.`,
      touch: "Down lane three: hold CROUCH through the tunnel. Slide into it and you're halfway.",
      pad: (b) => `Down lane three: hold ${b("crouch")} through the tunnel. Slide into it and you're halfway.`,
    },
    lines: [[VALE, "Tunnel. Get low and stay low.", "calm"]],
  },
  {
    id: "dash",
    beat: 4,
    trial: "mobility",
    title: "PHASE DASH — THE PIT",
    color: "#ff44ff",
    hint: {
      key: (k) => `The pit is a dash wide. Run at it and press ${k("dash")}, or double-tap forward, at the edge.`,
      touch: "The pit is a dash wide. Run at it and double-tap forward on the stick at the edge.",
      pad: (b) => `The pit is a dash wide. Tap ${b("dash")} at its edge as you run at it.`,
    },
    lines: [[VALE, "The pit's all foam. Dash it anyway. Falling in costs you time.", "excited"]],
  },
  {
    id: "runHome",
    beat: 4,
    trial: "mobility",
    title: "HOME STRETCH",
    color: "#ffcc33",
    hint: "Down to the finish line, the chequers at the bottom of lane three. The clock's still running.",
    lines: [[VALE, "Home stretch. Don't coast.", "excited"]],
  },

  // ── 6. TRIAL: COMBAT (the sim hall) ──────────────────────────────
  // Lin briefs you from her booth first (the hub, js/tutorial-system.js),
  // and starts the sim when you tell her.
  {
    id: "lab",
    beat: 5,
    trial: "combat",
    title: "KNOW YOUR ENEMY",
    color: "#7dfff0",
    hint: "Holograms of what our patrols have met. Study each one, then put it down. In here their shots can't hurt you.",
    // Each exhibit's briefing plays when it appears (js/tutorial-system.js).
    lines: [[LIN, "Sim's live. First profile coming up.", "excited"]],
  },
  {
    id: "coverDrill",
    beat: 5,
    trial: "combat",
    title: "COVER — DOWN, UP, MOVE",
    color: "#7dfff0",
    hint: {
      key: (k) => `Face the holo block and press ${k("cover")}. Hold RIGHT MOUSE to pop up and fire; fire without it to shoot blind. Look at the next block and press ${k("dash")} to slide to it.`,
      touch: "Face the holo block and tap DASH (it reads COVER). Hold AIM to pop up and fire; fire without it to shoot blind. Look at the next block and tap DASH to slide to it.",
      pad: (b) => `Face the holo block and press ${b("dash")}. Hold ${b("aim")} to pop up and fire; fire without it to shoot blind. Look at the next block and press ${b("dash")} to slide to it.`,
    },
    lines: [[LIN, "Before the full sim: cover. Get on that block.", "calm"]],
  },
  {
    id: "sim",
    beat: 5,
    trial: "combat",
    title: "SIMULATED BATTLE",
    color: "#7dfff0",
    hint: "Clear both waves. Holo blocks rise out of the floor: get behind them, then lean out to fire. Hits drain SIM INTEGRITY, not your health; at zero the sim restarts.",
    lines: [
      [LIN, "Full sim. Two waves. Cover comes up out of the floor; use it.", "calm"],
      [ARIA, "It's only light. Fight it like it isn't, and the real thing won't surprise you.", "warm"],
    ],
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
    // The logic plays the minute itself (Orr's reading, the lift, the
    // pulse, the floor stopping): these lines are its words, said as the
    // doors open.
    defer: true,
    lines: [
      [ARIA, "Lift B just opened. Nobody called it.", "afraid"],
      [SUP, "Cadet. Put it down.", "afraid"],
    ],
  },

  // ── 8. THE VEST ──────────────────────────────────────────────────
  // The Supervisor tore free of the minute: an R&D resist vest under his
  // shirt, which barely held. He won't go down to his people without his
  // own plate, so the cadet walks him to the locker room for it, and back.
  {
    id: "escort",
    beat: 7,
    title: "ESCORT — TO THE LOCKER ROOM",
    color: "#ffb028",
    hint: "The Supervisor can barely walk. Stay with him to the locker room, and put down anything that comes through on the way.",
    lines: [
      [SUP, "Rasczak, report. ...Rasczak. Kael?", "afraid"],
      [SUP, "Nothing from either squad.", "afraid"],
      [SUP, "Their plate's two generations old. If this is what the minute did to me in a vest...", "afraid"],
      [SUP, "Walk me to the locker room, Cadet. My legs aren't mine yet.", "calm"],
    ],
  },
  {
    id: "kitUp",
    beat: 7,
    title: "HEAVY PLATE",
    color: "#ffb028",
    hint: "The Supervisor is putting on his own heavy suit. Keep watch.",
    // The logic plays the suiting-up and its line (js/tutorial-system.js).
  },
  {
    id: "escortBack",
    beat: 7,
    title: "ESCORT — BACK TO LIFT B",
    color: "#ffb028",
    hint: "Walk the Supervisor back to Lift B, in the sim hall.",
    lines: [
      [SUP, "Better. Servos do the walking.", "calm"],
      [SUP, "Lift B. We go down, we bring my people up.", "calm"],
      [ARIA, "We. He said we.", "worried"],
    ],
  },
  {
    id: "alarm",
    beat: 7,
    title: "⚡ ALERT — INTRUSION DETECTED",
    color: "#ff2244",
    hint: "The Supervisor is taking Lift B down. Go with him.",
    // The logic plays these when the klaxon goes, then his refusal at the
    // car (js/tutorial-system.js ALARM_REFUSAL); the beat's checkpoint is
    // the fight after it.
    defer: true,
    checkpoint: false,
    lines: [
      [SUP, "All units, all units: breach on the Engine level. It's coming up the shaft.", "afraid"],
      [SUP, "Cadet, with me. Lift B, now.", "urgent"],
    ],
  },

  // ── 9. BREACH ────────────────────────────────────────────────────
  {
    id: "cover",
    beat: 8,
    title: "TAKE COVER — FIGHT BACK",
    color: "#ff2244",
    hint: {
      key: (k) => `These ones are real. Press ${k("cover")} at a wall or a low block to take cover, aim to pop out and fire. The red arc shows where you're hit from.`,
      touch: "These ones are real. Tap COVER at a wall or a low block to take cover, aim to pop out and fire. The red arc shows where you're hit from.",
      pad: (b) => `These ones are real. Push into a wall or a low block and press ${b("dash")} to take cover, aim to pop out and fire. The red arc shows where you're hit from.`,
    },
    lines: [
      [ARIA, "Tears, in the hall. Between us and the lift. Watch the air: where it cracks and glows, something's coming through.", "urgent"],
      [ARIA, "They pause before they fire. That glint and whine is your cue to duck.", "urgent"],
    ],
    // How it reached this floor: up from the Engine level, a floor at a time.
    events: [[2, "pa", "Containment breach, Engine level. Temporal wavefront rising. All floors, shelter in place. Do not use the lifts."]],
  },
  {
    id: "patch",
    beat: 8,
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
    beat: 8,
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

  // ── 10. BORROWED TIME ─────────────────────────────────────────────
  {
    id: "chrono",
    beat: 9,
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
    beat: 9,
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
    beat: 9,
    title: "OUTPACE THE BULLETS",
    color: "#8844ff",
    hint: "Drones dropping out of the vents. Shift, sidestep their shots while they crawl, and put them down.",
    lines: [
      [ARIA, "The grilles. Something's in the ducts.", "urgent"],
      [ARIA, "Shift, and watch their shots hang in the air. Then step out of their way.", "urgent"],
    ],
  },

  // ── 11. LIGHTS OUT ───────────────────────────────────────────────
  {
    id: "breaker",
    beat: 10,
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
    beat: 10,
    title: "TO THE LIFT",
    color: "#22e6c0",
    hint: "Power's on. Back to Lift B, through the north hall into the sim hall.",
    lines: [[ARIA, "That's it. Calling Lift B back up. It'll take a minute, and it won't be quiet.", "urgent"]],
  },

  // ── 12. EVAC ─────────────────────────────────────────────────────
  {
    id: "wave1",
    beat: 11,
    title: "HOLD THE LIFT — WAVE 1/3",
    color: "#ff2244",
    hint: "Hold the sim hall while the lift climbs back up. The holo blocks are still up: use them. Health and ammo are by the south door.",
    lines: [[ARIA, "Orr's moving. {AGENT}, that isn't Orr any more. Don't let it close.", "afraid"]],
  },
  {
    id: "wave2",
    beat: 11,
    title: "HOLD THE LIFT — WAVE 2/3",
    color: "#ff2244",
    hint: "Henchmen flank. Keep moving, keep cover between you, and Shift when they bunch up.",
    lines: [[ARIA, "Lift at sixty percent. More coming in from both ends.", "urgent"]],
  },
  {
    id: "wave3",
    beat: 11,
    title: "HOLD THE LIFT — WAVE 3/3",
    color: "#ff2244",
    hint: "A shield and its escort. Thin the escort, then flank the shield.",
    lines: [[ARIA, "Last push. Ninety percent. Don't you dare die at ninety percent.", "afraid"]],
  },
  {
    id: "extract",
    beat: 11,
    title: "GET IN",
    color: "#22e6c0",
    hint: "The lift is back up and open. Step inside.",
    lines: [[ARIA, "Lift's here. Empty. Get in, {AGENT}.", "sad"]],
  },
  {
    id: "reveal",
    beat: 11,
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

/** Seconds off a trial's graded time for each active reload landed in it (a trial with `reloads`). */
export const RELOAD_CREDIT = 2;

/**
 * A trial's grade from its time against par, nudged by accuracy where shots
 * were fired: S under 80% of par, A at par, B within a third over, C after;
 * under half the shots landing drops a grade, four in five lifts one. In a
 * trial that counts them, each active reload landed takes RELOAD_CREDIT
 * seconds off the time.
 */
export function gradeTrial(trial, time, acc, { reloads = 0 } = {}) {
  if (trial?.par == null) return "PASS";
  const k = Math.max(0, time - (trial.reloads ? reloads * RELOAD_CREDIT : 0)) / trial.par;
  let i = k <= 0.8 ? 0 : k <= 1 ? 1 : k <= 1.33 ? 2 : 3;
  if (acc != null && acc < 0.5) i = Math.min(3, i + 1);
  if (acc != null && acc >= 0.8) i = Math.max(0, i - 1);
  return TRIAL_GRADES[i];
}

/** The step index of `id`, or -1. */
export function prologueStepIndex(id) {
  return PROLOGUE_STEPS.findIndex((s) => s.id === id);
}

/** A trial's first step's index (where the hub, or for calibration the walk to R&D, starts it), or -1. */
export function trialStart(trial) {
  return PROLOGUE_STEPS.findIndex((s) => s.trial === trial);
}

/** How long a line stays up: long enough to be read and spoken. */
export function lineDuration(text) {
  return Math.max(3.2, Math.min(9, String(text).length / 15 + 1.4));
}
