/**
 * The sizzle reel (spec §2): a lore opening, the logo slam, then a montage
 * cut to the music, ending on the logo card. 120 bpm, so a beat is 0.5 s and
 * a bar 2 s; every time below is in beats (the spec's seconds × 2).
 *
 * DRAFT: the opening and the logo are final in shape; the montage shots are
 * live campaign levels standing in for the scenes and events later work adds
 * (combat and Chrono powers, squad cards, Meltdown, the Forge, the creator,
 * the art-style flip). Late-game bosses are silhouettes and cards only.
 */

const path = (from, loop = 34) => ({ kind: "path", from, loop });

export const SIZZLE = {
  id: "sizzle",
  bpm: 120,
  bars: 38, // 152 beats = 76 s
  letterbox: { in: 2, out: 2 },
  music: [
    { at: 0, track: "campaign" },
    // The logo drops the music into the boss track, still on the reel's tempo.
    { at: 32, track: "boss", sting: true },
    { at: 138, stop: true },
    { at: 140, sting: true },
  ],
  narration: [{ at: 7, len: 7, text: "Someone broke time.", voice: "aria" }],
  captions: [
    { at: 1, len: 5, text: "Chrono-Corp Station." },
    { at: 20, len: 9, text: "And he keeps coming back." },
    { at: 32, len: 6, kind: "title", text: "Clockwork Carnage", logo: true },
    { at: 38, len: 10, text: "Four acts. Twenty-nine levels." },
    { at: 50, len: 8, text: "Bend time." },
    { at: 60, len: 8, text: "Rewind it. Lock it." },
    { at: 70, len: 7, text: "Gather your squad." },
    { at: 79, len: 8, kind: "card", text: "The Hound", sub: "SUIT C-0016. NOBODY INSIDE." },
    { at: 88, len: 9, text: "Meltdown: how long can you last?" },
    { at: 98, len: 10, text: "Build anything." },
    { at: 110, len: 7, text: "Make the agent yours." },
    { at: 118, len: 9, text: "Three art styles." },
    { at: 129, len: 8, kind: "card", text: "The Paradox Lord", sub: "Final form · 00:11" },
    // The logo's tagline sits where the caption lane is, so the end card
    // carries no captions; "Keyboard · Mouse · Controller" waits for the
    // title scene's own end-card layout.
    { at: 139, len: 13, kind: "title", text: "Clockwork Carnage", logo: true, sub: "Play free in your browser · shugknight24.github.io/clockwork_carnage" },
  ],
  shots: [
    // 0:00 — the station out in the dark, ARIA's boot line.
    { id: "boot", at: 0, len: 6, scene: { kind: "art", bg: "deep_space", art: "station", pan: { from: [0, 0, 1], to: [0.01, 0, 1.12] } }, transitionOut: "fade" },
    // 0:03 — slow flight down the Act I reactor.
    { id: "reactor", at: 6, len: 12, scene: { kind: "campaign", act: 1, level: 5, enemies: false, camera: path(0, 60) }, transitionOut: "glitch" },
    // 0:09 — the rift, and who comes through it.
    {
      id: "rift", at: 18, len: 14,
      scene: { kind: "art", bg: "temporal_rift", art: "villain", silhouette: true, artAt: [0, 0.1, 0.78], pan: { from: [0, 0, 1], to: [0, 0, 1.06] } },
      events: [{ at: 2, type: "glitch" }, { at: 8, type: "glitch" }],
    },
    // 0:16 — logo slam out of a white flash, on bar 8.
    { id: "logo", at: 32, len: 6, scene: { kind: "art", bg: "deep_space" }, events: [{ at: 0, type: "flash" }, { at: 0, type: "shake", amount: 0.6 }] },
    // Montage (placeholders until their scenes exist).
    { id: "guns", at: 38, len: 12, scene: { kind: "campaign", act: 1, level: 2, camera: path(0.1) } },
    { id: "chrono", at: 50, len: 10, scene: { kind: "campaign", act: 2, level: 1, camera: path(0.3) } },
    { id: "rewind", at: 60, len: 10, scene: { kind: "campaign", act: 2, level: 4, camera: path(0.5) } },
    { id: "squad", at: 70, len: 8, scene: { kind: "campaign", act: 1, level: 7, camera: path(0.2) } },
    { id: "hound", at: 78, len: 10, scene: { kind: "art", bg: "boss_lair", art: "hound", silhouette: true, pan: { from: [0, 0, 1], to: [0, 0.02, 1.1] } }, events: [{ at: 0, type: "shake", amount: 0.8 }] },
    { id: "meltdown", at: 88, len: 10, scene: { kind: "campaign", act: 3, level: 1, camera: path(0.4) } },
    { id: "forge", at: 98, len: 12, scene: { kind: "campaign", act: 2, level: 6, enemies: false, camera: path(0.6) } },
    { id: "creator", at: 110, len: 8, scene: { kind: "campaign", act: 1, level: 0, enemies: false, camera: path(0.15) } },
    { id: "styles", at: 118, len: 10, scene: { kind: "campaign", act: 1, level: 4, camera: path(0.35) } },
    { id: "finale", at: 128, len: 10, scene: { kind: "art", bg: "temporal_rift", art: "villain_final", silhouette: true, artAt: [0, 0.1, 0.78], pan: { from: [0, 0, 1], to: [0, 0, 1.08] } }, events: [{ at: 0, type: "glitch" }], transitionOut: "flash" },
    // 1:09 — the end card.
    { id: "end", at: 138, len: 14, scene: { kind: "art", bg: "deep_space", pan: { from: [0, 0, 1], to: [0, 0, 1.06] } } },
  ],
};
