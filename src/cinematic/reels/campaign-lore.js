/**
 * The campaign lore video (spec §2, second table): about 40 s that open a
 * player's first new campaign, then hand off to the flipbook. Slower than the
 * sizzle: 72 bpm, so a beat is 0.83 s and a bar 3.3 s; every time below is
 * in beats. Its lore beats fade through black, the rift tears in on glitches,
 * and it shows Act I only.
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
  bars: 12, // 48 beats = 40 s
  letterbox: { in: 2, out: 2 },
  music: [
    { at: 4, track: "menu" },
    { at: 20, track: "campaign" },
    { at: 40, stop: true },
  ],
  narration: [
    { at: 5, len: 6, text: "Chrono-Corp built a door through time.", voice: "aria" },
    { at: 13, len: 5, text: "They said it was safe.", voice: "aria" },
    { at: 23, len: 6, text: "Then something walked through it.", voice: "aria" },
    { at: 31, len: 7, text: "You're the last agent still standing.", voice: "aria" },
  ],
  captions: [{ at: 43, len: 5, kind: "title", text: "ACT I — THE FALL" }],
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
      id: "station", at: 4, len: 8,
      // Legacy draws its station small and high: brought down into the frame.
      scene: { kind: "art", bg: "deep_space", art: "station", artAt: { legacy: [0, 0.16, 1.3] }, pan: { from: [0, 0, 1], to: [0.015, -0.005, 1.16] } },
      transitionOut: "fade",
    },
    // 0:10 — a slow glide down the empty Act I research labs; the lights stutter.
    {
      id: "labs", at: 12, len: 8,
      scene: { kind: "campaign", act: 1, level: 2, enemies: false, weapon: false, camera: { kind: "keys", keys: [[0, 12.4, 18.6, 0.07], [8, 15.6, 18.7, -0.05]] } },
      events: [{ at: 5.5, type: "glitch" }, { at: 7, type: "glitch" }],
      transitionOut: "glitch",
    },
    // 0:17 — the rift tears open and the Paradox Lord steps through.
    {
      id: "rift", at: 20, len: 10,
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
    // 0:25 — the player's own agent, close up; the visor lights.
    {
      id: "agent", at: 30, len: 10,
      scene: { kind: "loreAgent", view: "bust", push: 0.12 },
      events: [{ at: 3, type: "visor", len: 3 }],
      transitionOut: "fade",
    },
    // 0:33 — clock hands spin down onto twelve as the act title lands.
    {
      id: "clock", at: 40, len: 8,
      scene: { kind: "loreClock", landAt: 3 },
      events: [{ at: 3, type: "flash" }, { at: 3, type: "boom" }],
      transitionOut: "fade",
    },
  ],
};
