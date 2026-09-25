/**
 * The sizzle reel (spec §2): a lore opening, the logo slam, then a montage
 * cut to the music, ending on the logo card. 120 bpm, so a beat is 0.5 s and
 * a bar 2 s; every time below is in beats (the spec's seconds × 2), and
 * every cut lands on a whole beat.
 *
 * The montage escalates: guns (pistol, then the shotgun up close), Chrono
 * Shift slowing a fight mid-swing, a rewind and a Time-Lock, the squad, the
 * Hound, Meltdown, the Forge, the creator, the three art styles, and the
 * Paradox Lord's final form. Late-game bosses are silhouettes and cards only.
 *
 * Montage cameras are keyed (`keys: [[beat, x, y, angle], ...]`) against
 * each level's own layout, so every shot looks down a lit hall at whatever
 * the shot spawns in front of it, not at a wall.
 */

const keys = (...k) => ({ kind: "keys", keys: k });
const N = -Math.PI / 2; // facing north (up the level map); east is 0

export const SIZZLE = {
  id: "sizzle",
  bpm: 120,
  bars: 38, // 152 beats = 76 s
  letterbox: { in: 2, out: 2 },
  music: [
    { at: 0, track: "campaign" },
    // The logo drops the music into the boss track, still on the reel's tempo.
    { at: 32, track: "boss", sting: true },
    // Silence under the end card's cut, and one last hit on it.
    { at: 138, stop: true, sting: true },
  ],
  narration: [{ at: 7, len: 7, text: "Someone broke time.", voice: "aria" }],
  captions: [
    { at: 1, len: 5, text: "Chrono-Corp Station." },
    { at: 20, len: 11, text: "And he keeps coming back." },
    { at: 39, len: 10, text: "Four acts. Twenty-nine levels." },
    { at: 51, len: 8, text: "Bend time." },
    { at: 61, len: 8, text: "Rewind it. Lock it." },
    { at: 70, len: 8, text: "Gather your squad." },
    { at: 79, len: 8, kind: "card", text: "The Hound", sub: "SUIT C-0016. NOBODY INSIDE." },
    { at: 89, len: 8, text: "Meltdown: how long can you last?" },
    { at: 99, len: 10, text: "Build anything." },
    { at: 111, len: 7, text: "Make the agent yours." },
    { at: 119, len: 8, text: "Three art styles." },
    { at: 129, len: 8, kind: "card", text: "The Paradox Lord", sub: "Final form · 00:11" },
  ],
  shots: [
    // 0:00 — the station out in the dark, ARIA's boot line.
    { id: "boot", at: 0, len: 6, scene: { kind: "art", bg: "deep_space", art: "station", pan: { from: [0, 0, 1], to: [0.01, 0, 1.12] } }, transitionOut: "fade" },
    // 0:03 — slow flight down the Act I reactor, the lights stuttering.
    {
      id: "reactor", at: 6, len: 12,
      scene: { kind: "campaign", act: 1, level: 5, enemies: false, weapon: false, camera: keys([0, 25.5, 55, N + 0.04], [12, 25.5, 45, N + 0.1]) },
      events: [{ at: 5, type: "glitch" }, { at: 9.5, type: "glitch" }],
      transitionOut: "glitch",
    },
    // 0:09 — the rift, and who comes through it.
    {
      id: "rift", at: 18, len: 14,
      scene: { kind: "art", bg: "temporal_rift", art: "villain", silhouette: true, artAt: [0, 0.14, 0.7], pan: { from: [0, 0, 1], to: [0, 0.01, 1.06] } },
      events: [{ at: 2, type: "glitch" }, { at: 8, type: "glitch" }, { at: 12, type: "glitch" }],
    },
    // 0:16 — logo slam out of a white flash, on bar 8.
    { id: "logo", at: 32, len: 6, scene: { kind: "title", lines: [] }, events: [{ at: 0, type: "flash" }, { at: 0, type: "shake", amount: 0.6 }] },

    // 0:19 — the Chrono Pistol into drones and henchmen down the research hall...
    {
      id: "pistol", at: 38, len: 6,
      scene: { kind: "campaign", act: 1, level: 2, enemies: false, camera: keys([0, 13.5, 18.6, 0.02], [6, 14.6, 18.7, -0.03]) },
      events: [
        { at: 0, type: "spawn", enemy: "henchman", pos: [18.5, 18.6], count: 2, spread: 2.2 },
        { at: 0, type: "spawn", enemy: "drone", pos: [20.5, 18.4], count: 2, spread: 3.4 },
        { at: 0.5, type: "attack", target: "all" },
        { at: 1, type: "fire", weapon: 0, dur: 5 },
      ],
    },
    // ...then the shotgun, up close.
    {
      id: "shotgun", at: 44, len: 6,
      scene: { kind: "campaign", act: 1, level: 2, enemies: false, camera: keys([0, 16, 50.8, 0.02], [6, 17.2, 50.6, 0.05]) },
      events: [
        { at: 0, type: "spawn", enemy: "henchman", pos: [20.6, 50.6], count: 3, spread: 1.2 },
        { at: 0.5, type: "attack", target: "all" },
        { at: 1, type: "fire", weapon: 1, dur: 5 },
      ],
    },
    // 0:25 — Chrono Shift mid-fight: the strikes and the tracers crawl, the music drops.
    {
      id: "chrono", at: 50, len: 10,
      scene: { kind: "campaign", act: 2, level: 1, enemies: false, camera: keys([0, 30.5, 16.8, N], [10, 30.5, 15.6, N - 0.04]) },
      events: [
        { at: 0, type: "spawn", enemy: "henchman", pos: [30.5, 12.2], count: 2, spread: 3 },
        { at: 0, type: "spawn", enemy: "drone", pos: [30.5, 10.5], count: 2, spread: 4.6 },
        { at: 1, type: "attack", target: "all" },
        { at: 2, type: "chrono", on: true },
        { at: 2.5, type: "fire", weapon: 0, dur: 7 },
      ],
    },
    // 0:30 — Nova's rewind: the push up the greenhouse snaps back...
    {
      id: "rewind", at: 60, len: 5,
      scene: { kind: "campaign", act: 3, level: 2, enemies: false, camera: keys([0, 8, 42.5, 0], [5, 14, 42.5, 0]) },
      events: [
        { at: 0, type: "spawn", enemy: "henchman", pos: [17.5, 42.5], count: 2, spread: 2.4 },
        { at: 0.5, type: "fire", weapon: 0, dur: 2.5 },
        { at: 3.5, type: "rewind" },
      ],
    },
    // ...and Kael's Time-Lock stops a charging beast mid-stride.
    {
      id: "lock", at: 65, len: 5,
      scene: { kind: "campaign", act: 1, level: 7, enemies: false, camera: { kind: "fixed", x: 33.5, y: 26, angle: N } },
      events: [
        { at: 0, type: "spawn", enemy: "beast", pos: [33.5, 21], state: "chase" },
        { at: 0.5, type: "attack" },
        { at: 2, type: "freeze", target: "nearest" },
      ],
    },
    // 0:35 — the squad, one a bar-half, over the Act I core.
    {
      id: "squad", at: 70, len: 8,
      scene: { kind: "campaign", act: 1, level: 7, enemies: false, weapon: false, camera: keys([0, 26, 31, N + 0.25], [8, 27, 29, N + 0.1]) },
      events: [{ at: 0, type: "squad", members: ["lyra", "rook", "nova", "kael"], len: 8 }],
    },
    // 0:39 — the Hound: its card, then the charge.
    {
      id: "hound", at: 78, len: 10,
      scene: { kind: "art", bg: "boss_lair", art: "hound", silhouette: true, artAt: { legacy: [0, 0.1, 1.1], default: [0, 0.22, 0.78] }, pan: { from: [0, 0, 1], to: [0, -0.03, 1.22] } },
      events: [{ at: 0, type: "shake", amount: 0.8 }, { at: 6, type: "shake", amount: 1 }, { at: 8, type: "shake", amount: 1.2 }],
    },
    // 0:44 — Meltdown: pick an upgrade on the beat, then the swarm.
    {
      id: "meltdown", at: 88, len: 10,
      scene: { kind: "meltdown", pickBeats: 4, pick: 1, cardScale: 1.6, heat: [30, 75] },
      events: [
        { at: 4, type: "spawn", enemy: "glitchling", count: 4, dist: 7, spread: 1.4 },
        { at: 4, type: "spawn", enemy: "drone", count: 3, dist: 10, spread: 2.2 },
        { at: 4.5, type: "attack", target: "all" },
        { at: 4.5, type: "fire", weapon: 1, dur: 5.5 },
      ],
    },
    // 0:49 — the Forge: a clock tower rising on the beat, seen from low and
    // close under a clear sky, then the pull-back to the whole of it.
    { id: "forge", at: 98, len: 12, scene: { kind: "forge", build: "tower", act: 1, orbit: { from: 0.05, turns: 0.12 } } },
    // 0:55 — the creator: a new suit on every other beat, then in close.
    {
      id: "creator", at: 110, len: 4,
      scene: { kind: "creator", looks: "curated", view: "knee" },
      events: [{ at: 2, type: "look", index: 1 }],
    },
    {
      id: "creator-bust", at: 114, len: 4,
      scene: { kind: "creator", looks: "curated", view: "bust" },
      events: [{ at: 0, type: "look", index: 2 }, { at: 2, type: "look", index: 3 }],
    },
    // 0:59 — one shot, three art styles, flipping on the beat.
    {
      id: "styles", at: 118, len: 10,
      scene: { kind: "campaign", act: 4, level: 1, camera: keys([0, 9, 10.2, 0.05], [10, 12.5, 10.2, 0.02]) },
      events: [
        { at: 0, type: "artStyle", style: 0 },
        { at: 0, type: "spawn", enemy: "henchman", pos: [16, 10.2], count: 2, spread: 1.8 },
        { at: 1, type: "fire", weapon: 0, dur: 8 },
        { at: 3, type: "artStyle", style: 1 },
        { at: 6, type: "artStyle", style: 2 },
      ],
    },
    // 1:04 — the Paradox Lord's final form: silhouette and card only.
    {
      id: "finale", at: 128, len: 10,
      scene: { kind: "art", bg: "temporal_rift", art: "villain_final", silhouette: true, artAt: { legacy: [0, 0.155, 0.5], default: [0, 0.3, 0.6] }, pan: { from: [0, 0, 1], to: [0, 0.01, 1.08] } },
      events: [{ at: 0, type: "glitch" }, { at: 4, type: "shake", amount: 0.5 }, { at: 8, type: "glitch" }],
      transitionOut: "flash",
    },
    // 1:09 — the end card: logo, "Play free in your browser", the address, the controls.
    { id: "end", at: 138, len: 14, scene: { kind: "title", pan: { from: [0, 0, 1], to: [0, 0, 1.06] } } },
  ],
};
