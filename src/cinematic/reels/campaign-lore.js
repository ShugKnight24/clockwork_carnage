/**
 * The campaign lore video: ARIA's briefing, about 53 s, after the comic and
 * the creator on a player's first new campaign, then the prologue prompt. The
 * comic is the cadet's story; this is the background it skips — the station,
 * the Chronos Engine fired with no clearance, the eleven seconds, what came
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
 * registered by films.js.
 */

export const CAMPAIGN_LORE = {
  id: "lore",
  bpm: 72,
  bars: 16, // 64 beats = 53 s
  letterbox: { in: 2, out: 2 },
  music: [
    { at: 4, track: "menu" },
    { at: 26, track: "campaign" },
    { at: 54, stop: true },
  ],
  narration: [
    { at: 5, len: 5, text: "Chronos Station. Humanity's last anchor in time.", voice: "aria" },
    { at: 10, len: 4, text: "Chrono-Corp built a door through time.", voice: "aria" },
    { at: 15, len: 3, text: "They said it was safe.", voice: "aria" },
    { at: 18, len: 4, text: "Then someone fired the Chronos Engine. No clearance. No name.", voice: "aria" },
    { at: 22, len: 4, text: "Eleven seconds. Past, present and future hit the same wall.", voice: "aria" },
    { at: 28, len: 6, text: "And something walked through.", voice: "aria" },
    { at: 37, len: 6, text: "Security. Research. Containment. Every wing's a crime scene.", voice: "aria" },
    { at: 45, len: 5, text: "You're the last agent still standing.", voice: "aria" },
    { at: 50, len: 4, text: "Let's take our station back.", voice: "aria" },
  ],
  captions: [{ at: 57, len: 6, kind: "title", text: "ACT I — THE FALL" }],
  shots: [
    // 0:00 — black; ARIA wakes, typed, over a clock ticking on the beat.
    {
      id: "boot", at: 0, len: 4,
      scene: { kind: "loreBoot", text: "ARIA online" },
      events: [0, 1, 2, 3].map((at) => ({ at, type: "tick" })),
      transitionOut: "fade",
    },
    // 0:03 — the station, turning slowly in the dark.
    {
      id: "station", at: 4, len: 10,
      // Legacy draws its station small and high: brought down into the frame.
      scene: { kind: "art", bg: "deep_space", art: "station", artAt: { legacy: [0, 0.16, 1.3] }, pan: { from: [0, 0, 1], to: [0.015, -0.005, 1.16] } },
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
    // 0:30 — a slow glide down the empty Act I research labs; the lights stutter.
    {
      id: "labs", at: 36, len: 8,
      scene: { kind: "campaign", act: 1, level: 2, enemies: false, weapon: false, camera: { kind: "keys", keys: [[0, 12.4, 18.6, 0.07], [8, 15.6, 18.7, -0.05]] } },
      events: [{ at: 5.5, type: "glitch" }, { at: 7, type: "glitch" }],
      transitionOut: "glitch",
    },
    // 0:37 — the player's own agent, close up; the visor lights.
    {
      id: "agent", at: 44, len: 10,
      scene: { kind: "loreAgent", view: "bust", push: 0.12 },
      events: [{ at: 3, type: "visor", len: 3 }],
      transitionOut: "fade",
    },
    // 0:45 — clock hands spin down onto twelve as the act title lands.
    {
      id: "clock", at: 54, len: 10,
      scene: { kind: "loreClock", landAt: 3 },
      events: [{ at: 3, type: "flash" }, { at: 3, type: "boom" }],
      transitionOut: "fade",
    },
  ],
};
