# Sizzle Reel and Campaign Lore Video — One Director, Live and Exported

Date: 2026-09-24
Status: Draft for review
Branch context: `feat/live-parity-creator-gamepad` (after the settings deck).

## Goal

Show off the game and set up its world with two short films made from the
game itself:

- a **sizzle reel** (about 75 s) that plays as the title screen's attract loop,
  from a Watch Trailer entry in mode select, and as exported video files for
  the README, the Pages site and socials;
- a **campaign lore video** (about 40 s) that opens a player's first new
  campaign and wows them before the story starts.

The request, in the user's words: "a brief sizzle reel video / animation or a
cool cinematic of the universe to prepare the player for the world they're
about to enter", then "start on the sizzle reel / gameplay video that
highlights cool sections, game functionality, etc", and "a new lore video that
… wow[s] the audience on the start of the campaign".

Success looks like:

- Leaving the title screen alone for about 25 s starts the reel; any input
  returns to the title exactly as it was.
- Mode select has **Watch Trailer**; the reel plays with sound and returns to
  mode select.
- A first new campaign goes Creator → **lore video** → flipbook → prologue; the
  lore video shows the agent the player just built. It can be replayed from
  the Archive.
- `docs/media/sizzle.mp4` and `sizzle.webm` exist at 1920×1080 60 fps with
  the game's music and narration, no dropped frames, each ≤ 25 MB, plus a
  poster image.
- Both films follow the player's art style, quality and volume, and a
  reduced-motion version plays when the system asks for it.

## Decisions taken before this spec

| Question | Decision |
|---|---|
| What it is | Both in-game and exported, from one source (over in-game only or exported only). |
| Structure | Lore opening (15–20 s) + music-cut montage, ending on the logo (over a pure montage or a lore-only film). |
| Where it plays | Title attract after idle + Watch Trailer in mode select; plus a separate lore video at the start of the first new campaign. |
| Flipbook | Kept: the lore video plays first and hands off to it (over replacing it or making it optional). |
| Export | 1080p 60 fps MP4 + WebM (over adding a vertical cut, or WebM only). `ffmpeg` via Homebrew, installed only after asking. |
| Architecture | An in-engine director playing shot timelines (over shipping pre-recorded files, or a Remotion project). |
| Content | The shot lists in §2, approved in chat. Narration lines are drafts in data. |

## Current state

Facts checked against the code at `66a7321`.

- **Campaign start** (`js/main.js:201`): `#btnCampaign` → `playCreatorThen` (the
  agent customizer) → `playIntroFlipbookThen` (`game.startCutscene("intro_flipbook")`,
  writes `cc_seen_intro_flipbook`) → `game.showCampaignPrompt()` (prologue).
- **Cutscenes** (`js/cutscene.js`, scripts in `src/data/cutscene-scripts.js`):
  frame/panel/flipbook players with typewriter text, `audio.speak()` voices,
  the AUTO chip and cinematic pacing (`src/systems/cutscene-pacing.js`).
  Backdrops come from `src/rendering/svg-art/models/backdrops.js` (deep space,
  reactor, rift, the Lair) and scenes from `scenes.js`.
- **Audio** (`js/audio.js`): procedural music via `startTrack(track, tempo)`
  (defaults campaign 130, arena 145, boss 155, menu 90, meltdown 160 BPM) with
  a beat callback (`_dispatchBeat`); `speak(text, voice, opts)`; SFX methods;
  `musicSting()` (settings deck). Buses: master, music, SFX, voice.
- **Sandbox scene** (`src/systems/showcase.js`): the settings deck's showcase
  swaps a fixed list of game fields (`SHOWCASE_FIELDS`), builds a curated
  campaign level with idle enemies and a camera path
  (`src/systems/showcase-path.js`), and restores everything exactly on stop.
- **States** (`src/types.js`): TITLE, MODE_SELECT, PLAYING, PAUSED, SETTINGS,
  CUTSCENE, CHARACTER_CREATE, ARCHIVE, … — no cinematic state.
- **Archive** (`src/ui/archive-screen.js`): two tabs, BESTIARY and MEMORIES; no
  film replay.
- **Recording**: no `ffmpeg` on the machine; Playwright is installed.

## Design

### 1. Structure

- `src/cinematic/timeline.js` — pure data model and evaluation. A reel is
  `{ id, bpm, bars, music: Cue[], narration: Line[], captions: Caption[],
  shots: Shot[] }`. A shot is `{ id, at, len, scene, camera, events[],
  transitionOut }` with `at`/`len` in beats. `stateAt(reel, t)` returns the
  active shot, local time, visible captions and letterbox amount;
  `eventsBetween(reel, t0, t1)` returns events due in the interval.
- `src/cinematic/director.js` — runtime. Builds each shot's scene in a sandbox
  (the showcase's snapshot/restore, extended to the scene kinds below), drives
  the camera, fires events, draws the cinematic overlay (letterbox, captions,
  title cards, logo, transitions) on the HUD canvas, and handles skip. Two
  clocks: real time (in game) and a fixed 1/60 s step (recording).
- `src/cinematic/scenes/*.js` — one adapter per scene kind: `campaign` (a level
  with posed enemies), `art` (a cutscene backdrop or scene), `forge` (voxel
  world with a scripted build), `meltdown` (swarm + upgrade cards), `creator`
  (the agent render), `title` (logo). Each exposes `build(game, spec)`,
  `update(game, dt)`, `event(game, ev)`, `teardown(game)`.
- `src/cinematic/reels/sizzle.js`, `reels/campaign-lore.js` — the two scripts
  as data.
- A new `GameState.CINEMATIC`; title idle attract; **Watch Trailer** in mode
  select; campaign flow Creator → lore (first new campaign only, flag
  `cc_seen_lore_video`) → flipbook → prologue; an Archive **FILMS** tab lists
  both films for replay.
- Export: `scripts/reel/record.mjs` (tracked) — see §4.

### 2. Content

Sizzle reel (≈75 s):

| Time | Shot | Caption / narration |
|---|---|---|
| 0:00 | Black, clock ticking, ARIA boot text | "Chrono-Corp Station." |
| 0:03 | Slow flight down Act I Reactor, lights stuttering | ARIA: "Someone broke time." |
| 0:09 | Rift backdrop, glitch cut, Paradox Lord silhouette | "And he keeps coming back." |
| 0:15 | Logo slam, white flash, music drops | — |
| 0:19 | Chrono Pistol and shotgun vs drones and henchmen | "Four acts. Twenty-nine levels." |
| 0:25 | Chrono Shift: world desaturates, shots crawl | "Bend time." |
| 0:30 | Rewind, then Time-Lock freezing an enemy mid-leap | "Rewind it. Lock it." |
| 0:35 | Squad cards: Lyra, Rook, Nova, Kael | "Gather your squad." |
| 0:39 | The Hound boss card and charge | "SUIT C-0016. NOBODY INSIDE." |
| 0:44 | Meltdown: upgrade picks → swarm | "Meltdown: how long can you last?" |
| 0:49 | Forge build timelapse, mining, the endless world | "Build anything." |
| 0:55 | Character creator: suits, haircuts, badges on the beat | "Make the agent yours." |
| 0:59 | One shot flipping Legacy → Comic → Modern on the beat | "Three art styles." |
| 1:04 | Paradox Lord final form, eleven-second countdown (silhouette/card) | — |
| 1:09 | Logo, "Play free in your browser", URL, "Keyboard · Mouse · Controller" | — |

Campaign lore video (≈40 s):

| Time | Shot | ARIA |
|---|---|---|
| 0:00 | Black; "ARIA online" typed | — |
| 0:03 | Deep-space backdrop, the station turning slowly | "Chrono-Corp built a door through time." |
| 0:10 | Flight through the Act I research labs | "They said it was safe." |
| 0:17 | The rift tears open; the Paradox Lord steps through | "Then something walked through it." |
| 0:25 | The player's own agent (the suit just built), close-up, visor lighting | "You're the last agent still standing." |
| 0:33 | Clock hands spin into "ACT I — THE FALL", hand off to the flipbook | — |

Late-game bosses appear only as silhouettes or title cards; the lore video
shows Act I only.

### 3. Timing and feel

- **Beat-true.** Reels are authored in beats; the director starts the reel's
  music at the reel's tempo (about 120 BPM) and converts beats to time from the
  same clock, so cuts, the logo slam and style flips land on beats and music
  cues cannot drift.
- **Transitions.** Hard cut (montage default); white flash (logo only);
  glitch (chromatic tearing, rift/villain beats); fade through black (lore).
  Letterbox bars ease in to 2.39:1 at the start and out at the end. The
  director enforces at most 3 flashes per second regardless of the script.
- **Captions.** Short, bold, bottom-left, 250 ms slide-in/out, styled by art
  profile; narration always subtitled; size follows Font Scale.
- **Skip.** Attract: any key/click/touch/button returns to the title at once.
  Watch Trailer: same, returning to mode select. Lore video: the cutscene
  rule — first press shows "Hold A / Space to skip", holding skips to the
  flipbook.
- **Settings.** Scenes render in the player's art style (except the deliberate
  style-flip shot), graphics quality and volumes. Reduced motion
  (`prefers-reduced-motion`): no shake, glitch or flashes; dissolves and
  slower camera moves. A hidden tab pauses the reel.
- **Autoplay.** Before the page has had a user gesture the attract loop plays
  muted with captions; after one it has sound. Watch Trailer and the lore
  video always have sound.
- **Determinism.** Every shot seeds its randomness; Chrono slow-motion runs on
  the reel clock; live playback and recording show the same frames.
- **Cost.** The attract loop is capped at 30 fps and honours Battery Saver.

### 4. Export

`node scripts/reel/record.mjs sizzle` (and `lore`):

1. **Video pass.** Chromium with GPU flags, 1920×1080, DPR 1, Ultra quality,
   `?record=sizzle`. The director runs on the fixed clock; per frame it steps
   1/60 s, composites game + HUD + overlay into one canvas and hands a PNG to
   `ffmpeg` over a pipe (≈4,500 frames for the sizzle).
2. **Audio pass.** A real-time run of the same timeline records the master bus
   through a `MediaStreamAudioDestinationNode` + `MediaRecorder`. If headless
   capture proves unreliable, this pass runs in a headed window.
3. **Mux.** `ffmpeg` writes `docs/media/sizzle.mp4` (H.264 + AAC, faststart,
   yuv420p) and `sizzle.webm` (VP9 + Opus), and `sizzle-poster.png` from the
   logo frame. Budget ≤ 25 MB each; files are overwritten, not versioned.
4. The README shows the poster linking to the Pages-hosted video (GitHub only
   plays README video uploaded as an attachment).

`ffmpeg` is installed with `brew install ffmpeg` only after the user approves.

## Delivery

1. **Core.** Timeline, director, overlay, `GameState.CINEMATIC`, title attract,
   Watch Trailer, first sizzle draft using `campaign` and `art` scenes.
2. **Scenes and events.** Chrono Shift / Rewind / Time-Lock, boss cards,
   `meltdown`, `forge` timelapse, `creator`, art-style flips — the full sizzle.
3. **Lore video.** The lore reel, campaign hand-off, first-time flag, Archive
   FILMS tab.
4. **Export.** Record script, `ffmpeg` (after approval), output files, README
   poster.

## Testing

- Unit: beat↔time conversion; `stateAt` and `eventsBetween` at boundaries;
  flash-rate cap; caption timing; letterbox easing; each scene adapter's
  teardown restores the game fields it borrowed; reel data validity (shots
  contiguous, in-range scene specs, all captions inside the reel).
- Browser (GPU flags): attract starts after idle (fake clock) and any input
  returns to the title unchanged; Watch Trailer returns to mode select; first
  new campaign plays lore then flipbook, second doesn't; Archive FILMS replays
  both; reduced-motion variant has no flash/glitch; no `localStorage` writes
  other than the seen flag; no console errors across all three art styles.
- Visual: a contact sheet of every shot in all three art styles; a 10-frame
  recording smoke run of the export script.

## Risks

| Risk | Mitigation |
|---|---|
| Scenes the game wasn't built to script (Forge timelapse, Meltdown upgrade UI, boss reveals) | One adapter per kind; a shot that proves too costly falls back to cutscene art rather than blocking the reel. |
| Headless audio capture | Fall back to a headed audio pass. |
| Spoilers | Late bosses as silhouettes/cards only; lore video is Act I only. |
| Idle attract cost | 30 fps cap, Battery Saver respected, paused when the tab is hidden. |
| Repo growth from video files | Overwrite in place; move to a GitHub Release if history grows too much. |
| Sandbox leaks into real state | Same snapshot/restore discipline and storage-identical tests as the settings showcase. |

## Non-goals

- A vertical 9:16 cut (possible later from the same timeline).
- Recorded voice acting or licensed music.
- A general-purpose cutscene editor.
