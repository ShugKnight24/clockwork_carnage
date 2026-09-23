# Campaign Acts, Phase 5: Act III Maps and Form 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Act III, *The Hunt*. Its seven levels stop standing on the Act I maps: five remixes (the Rewritten Wing, Server Farm Siege, Reactor Overload, the Lord's Laboratory, the Paradox Core's second visit) and two new maps (the Archive of Rewinds, the Chronos Engine), each with the set piece its beat asks for. The Paradox Lord's Form 2 learns the two tricks that make the loud, long shift of Act II a mistake: Counter-shift and Replay.

**Architecture:** The seven maps live in a new `src/data/levels/act3-maps.js`, built with `map-helpers.js`; a remix starts from a clone of the station map it changes. `campaign.js` registers them in `MAPS`. Their set pieces sit beside them in the same file (`ACT3_SET_PIECES`) and `set-pieces.js` spreads them into `SET_PIECES`. Four small additions to `chrono-hazards.js` carry the new set pieces: `rewrite` walls that close and open on the level clock, a `vent` with a long `warn` for the Archive's replaying blast, a `stasis` field that `holds` enemies until you leave it, and an `objective` (burn the racks, turn the valves against a heat clock) whose card reuses the teach card. Form 2 is `src/systems/boss-form2.js`: pure Counter-shift and Replay steps the AI calls for a boss whose def asks for them, plus the player's half-speed while he holds your shift.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium (e2e, headless via `ccDebug`).

**Spec:** `docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md`, §6 (Form 2), §7 Act III, §8, §9, §16.5 and "Decisions (answered 2026-09-22)".

## Global Constraints

- Other agents are building Act II (+ the Hound), Act IV (+ Form 3) and a HUD message director at the same time. Shared files (`acts.js`, `palettes.js`, `set-pieces.js`, `chrono-hazards.js`, `chrono-fx.js`, `ai.js`, `game.js`, `enemies.js`, `dialogue.js`) get small additions confined to Act III or Form 2. No `hud-*.js` edits.
- Only Act III's block of `acts.js` changes. Other acts keep their placeholder maps.
- Every map passes `map-integrity.test.js`; set pieces sit on open floor of the turned map.
- Baseline: 1665 unit tests. `npx vitest run --testTimeout=60000` before every commit.

## Decisions taken while planning

1. **Level entries keep `level()`.** An Act III entry spreads its own map, env, rotation and seed over `level(<source>, …)`, so the shared helper and the `STATION` table do not change.
2. **Act III's roster gains the types its levels name.** The spec's roster line ("today's Act 2 roster plus wardens") disagrees with its own level lists (Temporal Summoner in III-3 and III-4, phantoms in III-4, echo drones and rift leapers in III-5, sentinels in III-6). The level lists win: `temporalSummoner`, `phantom`, `echoDrone`, `riftLeaper` and `sentinel` join the roster and leave `substitutes`.
3. **Objectives reuse the teach card.** Racks and valves are not powers, so they are `objective`, not `teach` (a teach names the power its level grants). The card, its fade and its placement are the teach card's; the hint is rewritten each frame with progress and heat.
4. **The heat clock runs on the level clock.** That is how "a shift stretches the window" falls out for free: the clock runs at 0.15× while you shift. Overheating is a pulse (20 damage, heat back to 55), never a fail state.
5. **The Engine's field breaks on leaving it north, or on hurting anything it holds.** Held enemies are frozen with the EMP gate (`_empDisabledUntil = Infinity`), which the AI already skips.
6. **Counter-shift counts real seconds of one continuous shift** while a Form 2 boss is alive and engaged. Release resets it; tapping is the answer. The take ends your shift, blocks a new one and halves your movement for 2 s; his multiplier is 1.0 so your shift never slowed him.
7. **Replay re-fires his last four seconds of firing**, not of the clock: the shots from his last volley back 4 s. So a boss you hid from still replays something. Each ghost round leaves from where it was first fired, in its first direction, on its first timing, after a 1 s telegraph of marks at every origin. Foresight draws their paths during the telegraph.
8. **Squad lines are set-piece `scripted` zones and objective progress lines**, one ally leading each operation (III-1 Lyra, III-2 Rook, III-3 Kael) and a debrief line by each exit.

## Numbers

| Form 2 | Value |
|---|---|
| Chrono multiplier | 1.0 (unaffected by your shift) |
| Counter-shift warning | at 1.0 s of continuous shift: ring on him, tick, ARIA `counterShift` once |
| Counter-shift take | at 2.0 s: shift ends, no new shift and 0.5× movement for 2.0 s |
| Replay thresholds | 66% and 33% health, once each |
| Replay window | his last 4 s of firing, at most 24 rounds |
| Replay telegraph | 1.0 s of origin marks, then the rounds on their original timing |
| Ghost round | 0.75× damage, violet |

## Maps

| # | Map id | Source | Rotation | Set piece | Beat |
|---|---|---|---|---|---|
| III-1 | `rewritten_wing` | Checkpoint (south) + Research (north), stitched | 270 | `rewritten_walls`: three staggered `rewrite` gates twice, one always open; walls in the lab that re-arrange cover | First op, Lyra leads; Shield Commander in the exit lab |
| III-2 | `server_siege` | Server Farm | 90 | `rack_burn`: four rack banks, burn in any order, north door sealed until all four | Rook leads; lanes cut from the rack rooms to the spine |
| III-3 | `reactor_overload` | Reactor Access | 180 | `coolant_valves`: heat clock from the core, three valves in order, the Vent Gallery and a coolant gallery required | Kael takes the blast doors; Temporal Summoner |
| III-4 | `lords_lab` | Voss Lab | 0 | `surviving_take`: a stasis hologram of one figure walking into the Core alone | Runs backwards from the old exit to the theatre; Temporal Summoner |
| III-5 | `archive` | New | 0 | `archive_takes`: two loop rooms with an eleven-second replaying blast, two stasis galleries | miri_3 gallery on the path |
| III-6 | `engine` | New | 90 | `engine_stasis`: a 36-tile stasis processional holding wardens and sentinels mid-step, the two Vosses at the console; breaks on leaving north | kai_3 gallery in an arcade |
| III-7 | `core_broken` | Paradox Core | 0 | none | Broken ring, new waist-high cover for Form 2 |

---

### Task 1: Hazards for Act III

**Files:** `src/systems/chrono-hazards.js`, `src/data/campaign/set-pieces.js`, `tests/unit/chrono-hazards-act3.test.js`

- [ ] Tests: `rewrite` state is a pure function of the clock; a closing cell waits for the player and any enemy on it; it only ever reopens cells it closed; a `vent` with `warn` primes that long before; a holding stasis freezes its enemies at load and wakes them on leaving north or on a hit; an objective counts holds on sim time, respects `order`, drops heat, pulses on overheat and opens its seal on completion; set pieces rotate their new fields.
- [ ] Commit `feat(chronos): rewriting walls, holding stasis and objectives for Act III`.

### Task 2: The maps

**Files:** `src/data/levels/act3-maps.js` (new), `src/data/levels/campaign.js`, `src/data/campaign/set-pieces.js`, `src/data/campaign/acts.js` (Act III block), `src/rendering/env/palettes.js` (Act III envs), `tests/unit/acts.test.js`, `tests/unit/act3-maps.test.js` (new)

- [ ] Tests: every Act III level names its own map and env; maps are distinct from the station maps and from each other; each set piece's gates always leave one route open; the objective seals the only way to the exit; the Archive's loop rooms sit on the critical path; the Engine's field covers the processional and holds at least four enemies; the Core keeps its boss and gains low cover; every non-boss map has at least one secret.
- [ ] Commit per map or pair: `feat(levels): ...`.

### Task 3: Form 2

**Files:** `src/systems/boss-form2.js` (new), `src/data/enemies.js` (boss_form2 fields), `src/systems/ai.js` (two calls), `js/game.js` (movement scale, no engage while held), `src/systems/chrono-powers.js` (reset on level start), `src/rendering/chrono-fx.js` (ring, marks, vignette), `src/audio/chrono-sounds.js` (two cues), `tests/unit/boss-form2.test.js` (new)

- [ ] Tests: warn at 1.0 s, take at 2.0 s, release resets, no take with no boss; the slow lasts 2 s at 0.5× and blocks a new shift; replay fires once at each threshold, only rounds from the last 4 s of firing, from their origins, after the telegraph; through `AISystem.update` a Form 2 boss takes the shift and replays.
- [ ] Commit `feat(boss): Form 2 takes your shift and replays his volleys`.

### Task 4: Comms and verification

- [ ] ARIA pools for the new set pieces (`rewriteWalls`, `racksBurning`, `reactorHeat`, `reactorOverload`, `stasisBreaks`, `replayVolley`) with emotions; `counterShift` wired.
- [ ] `npx vitest run --testTimeout=60000`; smoke, playtest-gate, level-looks on port 5193; GPU captures of every Act III map and Form 2's Counter-shift.

## Deferred

- IV-5 and IV-6 (variants of the Archive and the Engine) belong to the Act IV maps.
- A true fire clock for the Archive Burns; the Engine awake.
- HUD-side readouts of heat and Counter-shift (the HUD files belong to the message-director work); both read from the world pass and the teach card here.
