# Campaign Acts, Phase 4: Act II Maps, the Hound, and the Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Act II. The seven placeholder slots get their own places: six new maps and the Precinct, a remix of the tutorial station. Each map is built around its beat and its teach room. The Hound (suit C-0016) gets its own art in every style, its own moves (a telegraphed lunge and quill volleys) and a boss bar. The Evac Shafts collapse stops being a damage-over-time chase that could take 70 HP from a player who never shifts: it catches you once, throws you back to the last landing and starts again.

**Architecture:** The new builders live in `src/data/levels/act2-maps.js` (same `map-helpers.js` idiom as `station-maps.js`) and join `MAPS`. A level entry names its map; `level()` in `acts.js` accepts a non-station map with its own seed. Set pieces are re-authored in the new maps' coordinates (`set-pieces.js`); the phase-3 teach rooms move with them. `chrono-hazards.js` gains checkpoint landings and a catch for `collapse`, and a `piston` hazard (cells that slam shut on a cycle) for the Maintenance Spine. The Hound keeps phase 3's phasing (`_phased`, the shimmer) and gets its own behaviour block in `ai.js` (`_updateHound`): a lunge with a long visible windup line, and quill volleys fired in a fan. Its sprite is a new creature in `svg-art/sprites/creatures.js`, a hunched empty suit; Legacy draws it procedurally in `rendering/enemies/hound.js`; the cutscenes get a `hound` model.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium (e2e, headless via `ccDebug`).

**Spec:** `docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md` §6 (the Hound), §7 Act II, §8 (fragments), §14 and §16.4, and the Decisions at the end, which override the body.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution.
- Other agents are building Act III and Act IV maps and the HUD message director. Shared files (`acts.js`, `set-pieces.js`, `palettes.js`, `cutscene-scripts.js`, `dialogue.js`, `hud-*.js`, `spawner.js`) are touched only in their Act II / Hound blocks, and minimally.
- All maps 60×60 with a `heightMap`; `tests/unit/map-integrity.test.js` covers them automatically through `campaignMaps()`.
- Spoken lines carry `voice` or a `SPEAKER:` prefix (the story test walks every script).
- Baseline 1665 unit tests. `npx vitest run --testTimeout=60000` before every commit.

## Decisions taken while planning

1. **Act II keeps palette 2** (rust and amber). The spec gives palette 4 to Act IV only. Each map gets its own env in `LEVEL_ENVS` (steel shift, accent, fog); the Greenhouse is the one green, warm env, the Precinct the darkest.
2. **Roster.** Act II's roster gains the types its levels name in §7: `glitchling` and `phantom` (II-1's Act I leftovers, II-5's glitchlings), `sentinel` (II-6), `riftLeaper` and `echoDrone` (II-7). They leave `substitutes`.
3. **The collapse (user feedback).** No damage over time. Each collapse has landings (checkpoints) along its path. If the front reaches you: one hit (Easy 5, Normal 10, Hard/Nightmare 20), never below 1 HP, a shake, and you are put down on the last landing you passed with the rubble ahead of it cleared and the front re-armed 1.6 s behind you. The second catch in a level brings up a "HOLD Q" card and ARIA's hint. Backing out of the start of a collapse before you finish it re-arms it rather than sealing you out. Pace: 4.5 rows/s after a 1 s delay, so a sprinter who never shifts reaches the top about a second ahead, a walker is caught mid-shaft, and one full shift buys several seconds.
4. **Pistons** are a new `piston` hazard: cells that are wall for `on` of every `period` seconds, never closing on the player or an enemy (you are hit and shoved instead). It is a pure function of the clock like the rest.
5. **Train crossings** stay `gate` lasers in the data, drawn as a train (`kind: "train"`) instead of a red beam.
6. **The Hound's moves.** Lunge: a 0.9 s windup that draws a bright line down the lane it will run (always, not only under Foresight), then a sprint along that line; a Chrono Dash goes through it. Quill volley: every ~5 s at range, a 0.7 s bristle, then five quills in a 40° fan (slow rounds a Time-Lock can catch). Both land while it is phased (spec §6). At half health it fires two volleys back to back.
7. **The Hound's look.** C-0016 is an earlier suit of the same line as yours: a hunched, long-armed empty exosuit that runs low like a hound, its helmet open on nothing, a ridge of heat-sink quills down its back. Comic and Modern share the SVG creature; Legacy has its own procedural drawing.
8. **Boss bar.** `findBoss` in the HUDs reads the `boss` def flag (so the Hound gets a bar); a boss without a `form` shows PHASED / SOLID instead of FORM n.

## Maps

| Slot | Map id | Beat | Set piece | Fragment |
|---|---|---|---|---|
| II-1 | `evac_shafts` | wounded escape, the channel voice | two collapse chases with landings; scripted first hunt in the pump hall | none |
| II-2 | `salvage_deck` | Rook's hangar, defend and fetch | Foresight teach hall (sealed, 3 stalkers) | none |
| II-3 | `maintenance_spine` | the storm in your chest | Chrono Dash fan gallery; collapsing catwalk; piston hall; pump hall sub-boss | kai_2 (secret) |
| II-4 | `transit_loop` | speed; Nova blurs past | train crossings at the junction | none |
| II-5 | `greenhouse` | rest, Miri, the mid-act turn | stasis glasshouse; bomber garden maze | miri_2 (visible) |
| II-6 | `precinct` | Kael's line | Rewind teach in the locker room; turret stream across the lobby | voss_2 (secret, the evidence room) |
| II-7 | `foundry` | into the den | Time-Lock teach corridor; the Hound | none |

## Tasks

### Task 1: Maps and slots
- [ ] `act2-maps.js` with seven builders; `ACT2_MAPS` joins `MAPS`.
- [ ] `level()` takes non-station maps; Act II's block names the new maps and envs; roster per decision 2.
- [ ] `LEVEL_ENVS` gains the seven Act II envs.
- [ ] Set pieces re-authored on the new maps; chrono-hazard tests read coordinates from the pieces.
- [ ] Tests: map integrity (automatic), acts (map ids), env palettes (distinct looks), fragments (automatic).

### Task 2: The collapse redesign
- [ ] `landings`, catch, reset, hint card, re-arm on backing out.
- [ ] Tests: a non-shifting sprinter finishes both shafts; a walker is caught; a caught player is never killed (health 1 stays 1); the catch puts you on the last landing, clears the rubble ahead of it and re-arms the front; the second catch shows the hint; save/restore mid-collapse.

### Task 3: Pistons and trains
- [ ] `piston` hazard in the runtime and the renderer; train drawing.
- [ ] Tests: a piston's cells follow its cycle, never close on the player, pass in a shift.

### Task 4: The Hound
- [ ] `ai.js` `_updateHound`: lunge and quill volleys, telegraphed; intent exposed for Foresight.
- [ ] SVG creature (Comic, Modern), Legacy procedural, cutscene `hound` model in both renderers; frames in `hound_attack`, `hound_intro`, `gathering_finale`.
- [ ] Boss bar reads the def flag.
- [ ] Tests: telegraph precedes every lunge and volley; volleys land while phased; lunge line equals the sprint lane; the model builds every pose; the boss bar finds the Hound.

### Task 5: Verification
- [ ] Unit suite; smoke, playtest-gate, level-looks e2e on 5192.
- [ ] Headless GPU captures (Comic, 1920×1080): each map entry and set piece, overhead minimaps, the Hound shimmering / solid / attacking, the collapse chase.

## Outcome

- Collapse, measured with real key input in the game (Normal): a walker who never shifts is caught twice (100 → 80 HP) and gets out with the hint card up; a sprinter who never shifts clears Shaft A in 7.9 s with the front three steps behind; a sprinter who shifts once keeps four or more steps clear.
- The Hound: 900 HP (unscaled by act), lunge every ~4.2 s at range, quills every ~5.5 s; the tells were checked in GPU captures in all three art styles.

## Deferred

- Rook's friendly turrets in the Salvage Deck and scripted waves in the Precinct (both need a wave/ally system; the maps hold the space for them).
- Hound art in the Realistic (Modern) lighting profile uses the same creature through the realistic build; no bespoke realistic pass.
