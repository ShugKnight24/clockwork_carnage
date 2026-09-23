# Campaign Acts, Phase 3: Chronos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The time power in the player's hands becomes part of the story. From Act II every shift is loud: a Resonance meter fills, ARIA warns, Voss whispers, and at the top a capped hunter pack drops out of a rift. Each ally leaves a power in the suit as they join: Lyra's Foresight, Rook's Chrono Dash and quieter shift, Nova's Rewind Echo, Kael's Time-Lock. Each is taught in a room on its placeholder map with a card, on keyboard, gamepad and touch. Rooms you get through by bending time (collapse, blade, vent, gate, stasis, loop) run from one level clock. The placeholder Hound is a heat-shimmer you can see but not hurt until you shift.

**Architecture:** `src/systems/chrono-powers.js` owns everything about the powers: the unlock rule (`powersFor(act, level, ngPlus)` over `grants` on the level entries), shift thresholds, Resonance (a pure step function), hunter policy and caps, the rewind ring buffer, the Time-Lock plane geometry, Foresight prediction, and a `ChronoPowers` runtime the game calls from `_updateChronoEnergy`, `_updateTimeScale`, `triggerDash` and its update loop. `src/systems/chrono-hazards.js` derives every hazard's state from a level clock that advances on `dt × (shifting ? 0.15 : 1)`, the enemy convention, and applies it (damage, grid writes, teleports). Set pieces are data (`src/data/campaign/set-pieces.js`), authored in station-map coordinates and turned with the level's rotation; a level entry names its set piece and its `grants`. The world pass draws chrono effects in `src/rendering/chrono-fx.js`; the HUD cluster (Resonance eye, power chips, cooldown rings) is `src/ui/chrono-hud.js`, placed by each HUD layout beside its chrono bar. New sounds are `src/audio/chrono-sounds.js` on AudioManager's tone and noise primitives.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium (e2e, headless via `ccDebug`).

**Spec:** `docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md`, §3 (Resonance), §4 (powers), §5 (set pieces), §6 (the Hound), §15 (CODE IMPACT), §16.3 and "Decisions (answered 2026-09-22)", which override the body.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution.
- Hands off: `src/world/*`, `src/rendering/voxel/*`, `js/forge.js`, `src/rpg/*`, `src/audio/voice.js`, `js/audio.js` core.
- Keep the powers out of `js/game.js`: it gets thin calls into `ChronoPowers` and `ChronoHazards`, nothing more.
- No powers in arena, meltdown, the tutorial or the builder play-test (Decision 5). No Resonance in Act I (the governor is on).
- Maps do not change by a tile for any other slot: seals, teach enemies and hazards are overlays on one level entry.
- Baseline: 1535 unit tests. `npx vitest run --testTimeout=60000` before every commit.

## Decisions taken while planning

1. **Where a grant sits.** `grants` on a level entry means "yours from the start of this level". The spec's "in the scene after the level" becomes the next level's entry: Foresight on II-2, Chrono Dash + tuning on II-3, Rewind on II-6, Time-Lock on II-7. Each power is then taught in the first room of the level that grants it, as the spec asks. Acts III and IV inherit all four; NG+ grants all four everywhere.
2. **Inputs (Decision 4).** Rewind: `X` / `LB` while shifting / a `REWIND` touch button. Time-Lock: `V` / `R3` / a `LOCK` touch button. Chrono Dash: the existing dash (double-tap a direction / `B` / `DASH`) while shifting. `X` and `V` are unbound in play; both are rebindable (`chronoRewind`, `chronoLock`). The touch buttons appear only once the power is yours.
3. **Hunter response setting.** `hunterResponse`: Auto (Story only on Easy, On otherwise, Decision 3) / On / Story only / Off. *Story only* keeps the meter, the warnings, the whispers and II-1's scripted pack, and drops the random packs. *Off* switches Resonance off: no meter, no lines, no packs.
4. **Resonance lines rearm.** ARIA's 50 warning and Voss's 75 whisper fire once per climb; they rearm when the meter falls back under 40 and 65.
5. **Time-Lock catches enemy rounds only.** Your own fire passes, so the line is Kael's cover, not a wall between you and the target. Enemies inside the slab run at 0.1×. Captured rounds hang until the lock ends, then drop.
6. **The echo decoy** pulls every enemy nearer to it than to you for its 2 s: melee swings hit the echo, ranged enemies aim at it.
7. **Collapse never traps.** Cells at or ahead of the player in the collapse path wait while the player is in it; the front crushes (damage per second) instead. Cells under an enemy wait for it to move.
8. **Hazard state is a pure function of the clock and trigger times**; the runtime serialises to `{ clock, triggers }` and restores to the same state. Campaign saves are written at level start only, so nothing is added to the save file.
9. **The Hound's shimmer** is drawn from the real sprite at a stuttered position (sampled every 0.12 s) with three afterimages and scorched footprints, at 35% alpha, plus a tick. It is `_phased` (rounds and splash pass through) whenever the player is not shifting; shifting makes it solid and it runs at 1.5× (its beast `chronoMultiplier`).
10. **Hunters** are marked, pay +40 chrono on the kill and roll gear as an elite; they never touch `totalEnemies` or `killedEnemies`.
11. **Counter-shift and Eleven Seconds pools** are written now with the other pools (spec §4 lists them) and wired with Form 2 and Form 3 in phases 5 and 6.

## Numbers

| Power | Cost | Cooldown | Resonance | Notes |
|---|---|---|---|---|
| Chrono Shift | engage 15, drain 33/s (tuned: 10, 28/s) | none | +6/s for 1.5 s, then +20/s | Rook's tuning with the Chrono Dash grant |
| Foresight | none | none | none | ghosts at +0.6 s, windup lines, projectile paths, while shifting |
| Chrono Dash | 20 chrono, no stamina | 1.0 s | +4 | 2.2× distance, i-frames the whole dash |
| Rewind Echo | 40 | 12 s | +10 | back 3.0 s, health max(now, then) capped +35, echo decoy 2 s |
| Time-Lock | 30 | 10 s | +8 | 3 tiles wide, 1.5 ahead, 4 s, enemies 0.1× |

Resonance decays 8/s after 2 s without a shift. Hunter caps per level: Easy 1, Normal 2, Hard and Nightmare 3. 45 s cooldown. Rift 8-12 tiles away, out of sight. No random packs on boss levels.

## Set pieces

| Slot (placeholder) | Set piece |
|---|---|
| I-6 Reactor Access (reactor) | **Vent Gallery**, optional: the north-west side room gets three plasma vents on offset timers and a gear cache |
| II-1 Evac Shafts (reactor) | Centre route sealed by rift wall; a **collapse** chases you up each side shaft; scripted hunter pack at the midpoint with the channel voice's bell line |
| II-2 Salvage Deck (containment) | **Foresight teach**: the first hall is sealed and holds three phase stalkers; two kills while shifting open it |
| II-3 Maintenance Spine (server farm) | **Chrono Dash teach**: a fan gallery of three rotors across the start room's mouth; a **collapse** along the central catwalk |
| II-4 Transit Loop (nexus) | Train crossings: toggling **gates** across both side shafts |
| II-5 The Greenhouse (research) | A **stasis** room: the west greenhouse frozen at the instant of the collapse |
| II-6 The Precinct (checkpoint) | **Rewind teach**: sealed start room, a precinct sentry **turret** whose burst you cannot dodge; a rewind after 20+ damage opens it |
| II-7 The Foundry (core) | **Time-Lock teach**: a sentry stream across the start room's mouth; five caught rounds open the seal and stop it |
| IV-2 The Loop (server farm) | A **loop** on the central catwalk, broken by crossing its seam while shifting |

---

### Task 1: Grants and the unlock rule

**Files:** `src/data/campaign/acts.js`, `src/systems/chrono-powers.js` (new), `tests/unit/chrono-powers.test.js` (new)

- [ ] Tests: `powersFor` is empty through Act I and II-1; Foresight from II-2, Chrono Dash from II-3, Rewind from II-6, Time-Lock from II-7; Acts III-IV have all four; NG+ has all four at I-1; grants are unique and `powersFor` is monotonic across the campaign; shift tuning is base before II-3 and tuned after; no powers outside campaign mode.
- [ ] ACTS rows gain `resonance` and `hunters`; level entries gain `grants` and `setPiece`.
- [ ] Commit `feat(chronos): grant ally powers by recruit slot`.

### Task 2: Resonance and hunter responses (pure)

- [ ] Tests: shift gain +6/s for 1.5 s then +20/s; event gains; decay only after 2 s idle; warn at 50 and whisper at 75 once per climb; hunt at 100 resets to 0 and starts 45 s cooldown; caps per difficulty; Story only never hunts at random but still warns; Off never fills; Auto is Story only on Easy; no random hunts on a boss level; the rift cell is 8-12 tiles out and out of sight.
- [ ] Commit `feat(chronos): Resonance and capped hunter responses`.

### Task 3: The four powers (pure parts)

- [ ] Tests: rewind buffer keeps 3 s and returns the sample from 3 s ago; health rule (max, +35 cap); Chrono Dash cost, cooldown and distance; Time-Lock geometry, capture of a crossing round, release drops every captured round and none vanish before; enemies in the slab at 0.1×; Foresight predicts along the exposed intent, stops at walls and at attack range; costs and cooldowns gate each power.
- [ ] `ai.js` exposes each enemy's intent (`_moveAngle`, `_moveSpeed`) and honours the lock slab and the echo decoy.
- [ ] Commit `feat(chronos): Foresight, Chrono Dash, Rewind Echo and Time-Lock`.

### Task 4: Chrono hazards

**Files:** `src/systems/chrono-hazards.js`, `src/data/campaign/set-pieces.js`, `tests/unit/chrono-hazards.test.js`

- [ ] Tests: each hazard's state is a pure function of `(clock, triggers)`; serialise mid-collapse, restore, identical; collapse fills in path order after its trigger and never traps; blade hits a normal crossing at every phase, a shifted crossing has safe phases, a Chrono Dash always passes; vents and gates have safe windows that a shift widens; turret streams fire enemy rounds a lock can catch; stasis never damages; loop teleports back until crossed while shifting; set pieces rotate with their level and every hazard sits on open floor.
- [ ] Commit `feat(chronos): level-clock hazards and set pieces`.

### Task 5: Game glue, the Hound, inputs

- [ ] `game.js`: thresholds and drain from `ChronoPowers`; first shift per level queues `chronoShiftActivated` (Act I) or `chronoShiftLoud`; update and hazards in the loop; `chronoRewind()`, `chronoLock()`; i-frames on a Chrono Dash.
- [ ] `CampaignManager.loadLevel` starts the level's powers and set piece (seals, teach spawns, cleared rooms) before counting enemies.
- [ ] Inputs: keybinds, `input-dispatch.js`, `gamepad.js` (`R3`), LB-while-shifting, touch `REWIND` / `LOCK` in `touch-layout.js` (the layout test covers the new buttons), controls overlay and bindings screen.
- [ ] The Hound: `phased` def flag; rounds and splash pass through while `_phased`.
- [ ] Commit per area.

### Task 6: HUD, teach cards, world effects, sounds, ARIA

- [ ] `chrono-hud.js` in all eight chrono-bar sites; teach cards reuse the tutorial step card.
- [ ] `chrono-fx.js`: ghosts, windup and charge lines, dotted projectile paths, the lock plane, the echo, hazards, rifts, the Hound's shimmer.
- [ ] Pools: `chronoShiftLoud`, `resonanceRising`, `lordHearsYou`, `hunterResponse`, `powerUnlocked`, `counterShift`, `elevenSeconds`, with emotions.
- [ ] Commits per area.

### Task 7: Verification

- [ ] `npx vitest run --testTimeout=60000`; smoke, playtest-gate, level-looks, weapon-fire e2e on port 5191.
- [ ] Headless GPU captures: each power used with real key presses in its teach room; HUD in DOOM (1) and Vanguard (4) at 1920×1080; the Hound shimmering and solid.

## Deferred

- Real Act II maps, pistons and the train set piece proper (phase 4); the real Hound art and quill volleys (phase 4).
- Counter-shift, Replay (Form 2) and Eleven Seconds (Form 3), where `counterShift` and `elevenSeconds` get wired (phases 5, 6).
- III-3's Vent Gallery as a required path, III-5's loop rooms and IV-2's seam-by-rewind (with their maps).
- Parting gifts (Time-Lock 6 s after IV-3), NG+ harder set pieces (phase 6).
- Powers in arena (Decision 5).
