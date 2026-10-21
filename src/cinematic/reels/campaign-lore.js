/**
 * The campaign lore video: a briefing on an encrypted channel, about 57 s, after the comic and
 * the creator on a player's first new campaign, then the prologue prompt. The
 * comic is the cadet's story; this is the background it skips — the station,
 * the Chronos Engine fired, the eleven seconds, what came
 * through, the wings it took — closing on the agent the player just made. It
 * carries the premise the "intro" cutscene used to retell at campaign start.
 * Slower than the sizzle: 72 bpm, so a beat is 0.83 s and a bar 3.3 s; every
 * time below is in beats. Its lore beats fade through black, the rift tears
 * in on glitches, and it shows Act I only.
 *
 * The score is the menu's ambient arpeggio slowed to the reel's tempo, the
 * campaign's dark pentatonic under the rift and the agent, then silence and
 * the clock's own ticking into the act title.
 *
 * The agent close-up is the player's own `game.character` (the default agent
 * when they backed out of the creator), so the shot has no looks of its own.
 * The boot, rift, agent and clock shots are lore scenes (scenes/lore.js),
 * registered by films.js; the wings are the prologue's station rooms
 * (scenes/station.js), lit by their own lamps.
 */

export const CAMPAIGN_LORE = {
  id: "lore",
  bpm: 72,
  bars: 17, // 68 beats = 57 s
  letterbox: { in: 2, out: 2 },
  music: [
    { at: 4, track: "menu" },
    { at: 26, track: "campaign" },
    { at: 58, stop: true },
  ],
  narration: [
    { at: 5, len: 5, text: "Chronos Station. Humanity's last anchor in time.", voice: "lyra" },
    { at: 10, len: 4, text: "Chrono-Corp built a door through time.", voice: "lyra" },
    { at: 15, len: 3, text: "They said it was safe.", voice: "lyra" },
    { at: 18, len: 4, text: "Then someone fired the Chronos Engine.", voice: "lyra" },
    { at: 22, len: 4, text: "Eleven seconds. Past, present and future hit the same wall.", voice: "lyra" },
    { at: 28, len: 6, text: "And something walked through.", voice: "lyra" },
    { at: 37, len: 6, text: "Security. Research. Containment. Every wing's a crime scene.", voice: "lyra" },
    { at: 46, len: 4, text: "You're the last agent still standing.", voice: "lyra" },
    { at: 52, len: 4, text: "Get up, Agent. Somebody has to.", voice: "lyra" },
  ],
  captions: [{ at: 61, len: 6, kind: "title", text: "ACT I — THE FALL" }],
  shots: [
    // 0:00 — black; an encrypted channel opens, typed in amber, over a clock
    // ticking on the beat. Not ARIA: the player meets her when the visor
    // comes down. The voice is the stranger at the reactor (Lyra, II-1).
    {
      id: "boot", at: 0, len: 4,
      scene: { kind: "loreBoot", text: "[ ENCRYPTED CHANNEL ]", tint: "255,176,72" },
      events: [0, 1, 2, 3].map((at) => ({ at, type: "tick" })),
      transitionOut: "fade",
    },
    // 0:03 — the station, turning slowly in the dark.
    {
      id: "station", at: 4, len: 10,
      // Legacy draws its station small and high: brought down into the frame.
      scene: { kind: "art", bg: "deep_space", art: "station", pan: { from: [0, 0, 1], to: [0.015, -0.005, 1.16] } },
      transitionOut: "fade",
    },
    // 0:12 — the Chronos Engine: the rift's first light, eleven seconds of it.
    {
      id: "engine", at: 14, len: 12,
      scene: { kind: "art", bg: "deep_space", art: "rift", pan: { from: [0, 0, 1.05], to: [0, -0.01, 1.3] } },
      events: [
        { at: 4, type: "glitch" },
        { at: 8, type: "glitch" },
        { at: 8.5, type: "shake", amount: 0.3 },
        { at: 10, type: "glitch" },
      ],
      transitionOut: "glitch",
    },
    // 0:22 — the rift tears open and the Paradox Lord steps through.
    {
      id: "rift", at: 26, len: 10,
      scene: { kind: "loreRift", bg: "temporal_rift", art: "villain", openBeats: 3, stepBeats: 2.5 },
      events: [
        { at: 0.5, type: "glitch" },
        { at: 2, type: "glitch" },
        { at: 2.5, type: "shake", amount: 0.5 },
        { at: 5.5, type: "glitch" },
        { at: 6, type: "shake", amount: 0.35 },
      ],
      transitionOut: "fade",
    },
    // 0:30 — the station's wings, empty under stuttering lamps, one to each
    // word: Security (a truck behind the range's booths, the partitions
    // sliding past the lit bullet trap)...
    {
      id: "security", at: 36, len: 3,
      scene: { kind: "station", weapon: false, dim: 0.8, camera: { keys: [[0, 36.3, 41.3, 0.12], [3, 38.0, 43.7, -0.1]], ease: 0.2 } },
      events: [{ at: 1.5, type: "flicker", len: 0.8 }],
    },
    // ...Research (through the sim hall to the extraction lift)...
    {
      id: "research", at: 39, len: 3,
      scene: { kind: "station", weapon: false, dim: 0.8, camera: { keys: [[0, 29.8, 15.0, -1.57], [3, 28.8, 6.2, -1.5]], ease: 0.2 } },
    },
    // ...Containment (inside the evidence cage, past the shelves to its table).
    {
      id: "containment", at: 42, len: 3,
      scene: { kind: "station", weapon: false, dim: 0.85, camera: { keys: [[0, 14.6, 23.9, Math.PI * 0.9], [3, 13.6, 23.6, Math.PI * 1.04]], ease: 0.3 } },
      events: [{ at: 2, type: "glitch" }],
      transitionOut: "fade",
    },
    // 0:37 — the locker room, slowly up to the cadet's own locker.
    {
      id: "locker", at: 45, len: 5,
      scene: {
        kind: "station", weapon: false, doors: "shut", dim: 0.85,
        camera: { keys: [[0, 14.3, 41.2, Math.PI / 2 - 0.22], [5, 14.5, 44.9, Math.PI / 2]], ease: 0.6 },
        lamps: [{ x: 14.5, y: 44.5, radius: 4, intensity: 0.45 }],
      },
      events: [{ at: 3.5, type: "flicker", len: 0.7 }],
      transitionOut: "fade",
    },
    // 0:42 — the player's own agent, close up; the visor lights.
    {
      id: "agent", at: 50, len: 8,
      scene: { kind: "loreAgent", view: "bust", push: 0.12 },
      events: [{ at: 2, type: "visor", len: 3 }],
      transitionOut: "fade",
    },
    // 0:48 — clock hands spin down onto twelve as the act title lands.
    {
      id: "clock", at: 58, len: 10,
      scene: { kind: "loreClock", landAt: 3 },
      events: [{ at: 3, type: "flash" }, { at: 3, type: "boom" }],
      transitionOut: "fade",
    },
  ],
};
