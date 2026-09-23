# Campaign Acts, Phase 6: Act IV, Eleven Seconds and the Ending

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Act IV, *The Sacrifice*. Seven levels on their own maps, one ally staying behind per level in the reverse of the order they joined, each leaving a last upgrade to their power. The Paradox Lord's Final Form stops time and loses because you are the fixed point. The epilogue closes the reactor-voice loop left open in Act II. NG+ gets harder and stranger: hunters and set pieces bite more, and the recruits half-remember you. The true ending opens at NG+1 with all twelve memory fragments.

**Architecture:** The Act IV maps live in `src/data/levels/act4-maps.js`, built with `map-helpers.js`; the remixes start from the station builders' finished grids (`STATION_MAPS`, cloned) and re-carve them. The file also exports the Act IV set pieces, which `set-pieces.js` spreads into `SET_PIECES`. Parting gifts are a level-entry field (`gifts`) read by `giftsFor` in `chrono-powers.js`, the same way `grants` feed `powersFor`. Form 3 lives in `src/systems/eleven-seconds.js`, a runtime owned by `ChronoPowers`; the AI, projectile, damage and player loops each ask it one question ("is this frozen?", "what does a hit on him do?"). NG+ scene variants are a map in the `NG_PLUS` row, applied at the one place scenes are played (`CampaignManager._playScenes`).

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium (e2e, headless via `ccDebug`, GPU flags for captures).

**Spec:** `docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md`, §6 (Form 3), §7 Act IV, §8, §9, §10, §16.6 and "Decisions (answered 2026-09-22)", which override the body: true ending at NG+1 with twelve fragments (2), parting gifts only from recruited allies (9), NG+ harder with déjà-vu twists (10), twelve fragments (11).

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution.
- Other agents are building Act II maps and the Hound, Act III maps and Form 2, and a HUD message director. In shared files (`acts.js`, `cutscene-scripts.js`, `palettes.js`, `spawner.js`, `ai.js`, `campaign-manager.js`, `hud-*.js`) touch only Act IV, Form 3, NG+ and ending blocks, and keep hooks to a line or two.
- Act II scenes are not rewritten. Their NG+ versions are new keys (`*_echo`).
- Every new spoken line resolves a voice and names a real emotion (`campaign-story.test.js` walks every script).
- Baseline: 1665 unit tests. `npx vitest run --testTimeout=60000` before every commit.

## Decisions taken while planning

1. **IV-5 and IV-6 are built as their own grids.** The spec makes them variants of III-5 and III-6, whose maps are being built in parallel and do not exist on this branch. They are authored here as the Archive and the Engine in their Act IV state, on the same 60×60 skeleton; whoever merges Act III can re-base them as overlays on the III-5/III-6 grids or keep them as distinct places.
2. **Where a gift sits.** An ally gives their gift in the briefing of the level where they stay behind, so `gifts` on that level entry means "yours from the start of this level": Kael IV-3, Nova IV-4, Rook IV-5, Lyra IV-6. A gift counts only when its power is yours at that slot and its giver has been present in a squad list at or before it (`giftsFor`); in a linear run that is always true, and a table where someone never joins gets nothing from them.
3. **The gifts.**

   | From | Power | Gift | Line |
   |---|---|---|---|
   | Kael (IV-3) | Time-Lock | lasts 6 s, not 4 | "Take the rest of it." |
   | Nova (IV-4) | Rewind | cooldown 7 s, echo stands 4 s | "Keep the head start." |
   | Rook (IV-5) | Chrono Dash | costs 12, rings nothing | "Last tune. It doesn't ring anymore." |
   | Lyra (IV-6) | Foresight | works without a shift, sees 0.9 s ahead | "You won't have to ring the bell to see." |

   Lyra's is the one Form 3 needs: shifting is the wrong answer there, and her gift lets you read him without it.
4. **The Loop breaks on a rewind.** Spec §7 IV-2: "a rewind through the seam breaks it". A loop hazard with `breaksOn: "rewind"` breaks when you rewind within a few seconds of being thrown back, which takes you back through the seam in time. Loops without it still break on a shifted crossing.
5. **Nova's decoy is a rule, not a crowd.** IV-4's set piece names a `decoy`: while it stands, a hunter response that would have opened a rift is Nova's instead, and she says so on comms. The meter still fills and still warns; nothing comes through.
6. **Eleven Seconds.**
   - Thresholds at 75%, 50% and 25% of his health, one stop each, in order. A telegraph first: 1.4 s where he raises a hand, the clock ticks and a white ring closes on the screen; he takes no damage in it.
   - *First stop, scripted (6 s):* everything freezes, you too. He walks to you and lands a heavy hit that is never lethal (it leaves at least 1 health). His line on the comms plate. Then Lyra's recorded line, and time comes back.
   - *Later stops, the window (11 s):* everything but the two of you freezes: other enemies, their rounds, bombs. His armour freezes with the rest: he takes double damage and drags it at 0.6× speed. He still comes for you with a telegraphed lunge (0.8 s windup, red line). ARIA's `elevenSeconds` lines play.
   - Rounds in flight when he stops time hang where they are and resume when it ends; Foresight (with Lyra's gift, even unshifted) shows their paths.
   - He is unaffected by your shift (`chronoMultiplier: 1`). Form 2's Counter-shift is being built in parallel; it should apply to him too when the two land together.
7. **True ending.** `NG_PLUS.trueEndingCycle` becomes 1 and `NG_PLUS.fragments` 12: finishing any NG+ cycle with every fragment plays `ng_plus_true_ending`. Without them the run offers another loop, as NG+2 and NG+3 always did. The victory screen reads the ending that played, not the cycle number.
8. **NG+ is harder where the spec says.** Per cycle (capped at three): one more hunter response allowed per level, a pack one bigger, 10 s less cooldown (floor 25 s); set pieces faster: collapses and rotors ×(1 + 0.25c), vents and laser gates burn longer, turrets fire faster.
9. **The déjà-vu twist.** `NG_PLUS.scenes` maps six Act II scenes to their echoes. Allies half-remember; lines change; and Nova is recruited out of order: in NG+ it is Nova, not the collapse, that pulls you out of the Core at the start of Act II ("Not this time"), before she has ever met you. She cannot say why.
10. **The NG+ hook for extra levels.** `NG_PLUS` gains `extraLevels: {}` (act id → level entries inserted for cycles ≥ 1), read by nothing yet but documented, so future NG+ levels are data.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/levels/act4-maps.js` | **New**: the seven Act IV maps and `ACT4_SET_PIECES` |
| `src/data/levels/campaign.js` | `MAPS` registers them |
| `src/data/campaign/set-pieces.js` | spreads the Act IV pieces; the placeholder `the_loop` moves out |
| `src/data/campaign/acts.js` | Act IV block (maps, envs, palette 4, gifts, set pieces, card, outro); `NG_PLUS` |
| `src/rendering/env/palettes.js`, `textures.js`, `js/renderer.js`, `render-pipeline.js`, `weather.js`, `env/paint.js`, `env/wall-art.js` | palette 4 and the seven envs; act-3 looks extend to 4 |
| `src/systems/chrono-powers.js` | gifts, NG+ hunters, decoy, passive Foresight, the Form 3 runtime |
| `src/systems/chrono-hazards.js` | rewind-broken loops, NG+ set pieces |
| `src/systems/eleven-seconds.js` | **New**: Form 3 |
| `src/rendering/chrono-fx.js` | stopped time on screen |
| `src/systems/ai.js`, `projectile-update.js`, `combat-orchestrator.js`, `js/game.js` | one-line freeze and damage hooks |
| `src/data/enemies.js` | `boss_form3` unaffected by the shift |
| `src/data/cutscene-scripts.js`, `cutscene-keys.js`, `dialogue.js` | Act IV lines, `epilogue_message`, the echoes, gift and Form 3 lines |
| `src/data/memory-fragments.js` | voss_4, miri_4, kai_4 |
| `js/campaign-manager.js` | scene variants, gift lines, true-ending gate |
| `src/ui/game-over-screens.js` | victory title from the ending |
| `tests/unit/*` | act4-maps, eleven-seconds, gifts, NG+, fragments, story |

## Tasks

### Task 1: The maps

Each map serves its beat; all are 60×60 with a `heightMap`, secrets and props, and pass `map-integrity.test.js`.

| # | Map | Beat | Layout and pacing |
|---|---|---|---|
| IV-1 | `entry_last` (Entry remix) | the airlock where it began, falling toward the rift | Turned to run west. A rift chasm tears the atrium diagonally, so the old straight corridor is gone and the way leads through the offices; the lobby collapses behind you into rift (collapse, rift wall) |
| IV-2 | `the_loop` (new) | "one wing at a time"; the loop | A repeating mile: a straight boulevard built in identical segments between a west tenement block and an east market; the seam at its end throws you back to its start until you rewind through it. A stasis flat behind a secret wall holds voss_4 |
| IV-3 | `containment_last` (Containment remix) | Kael's last stand, a fighting retreat to the doors | Run backwards: start in the north breach, retreat south to the airlock blast doors while rift eats the spine behind you (slow collapse, rift wall). Cell walls blown open into a second lane. Temporal Summoner in the guard station. miri_4 in a hidden medbay |
| IV-4 | `nexus_decoy` (Nexus touch-up) | Nova runs toward them | The Nexus turned east-west, sanctum gates blown, north chamber half-collapsed, two secrets it never had; hunters are Nova's (decoy) |
| IV-5 | `archive_burns` (new, the Archive in its Act IV state) | Rook burns the Archive | Stack galleries; a fire front of burning cores closes the aisles behind you (collapse, energy wall); a loop room that throws you back toward the flames until you shift through its seam. kai_4 on completion |
| IV-6 | `engine_firing` (new, the Engine in its Act IV state) | Lyra fires the Engine | The Engine hall, awake: a ring of discharge vents around the Engine on her countdown (vents on offset cycles), Lyra's calls as you close on the Core door |
| IV-7 | `core_endgame` (Core remix) | alone | Rings gone: one open floor with rift walls, sparse waist-high cover so the stop's lunges read, few adds |

- [ ] Tests (`act4-maps.test.js`): each Act IV slot names its own map; every map has a secret, props and a heightMap with low cover; exits reachable; the Loop's seam and back are on floor; the collapses never fill the exit; hidden fragments have secrets on their maps.
- [ ] Commit: `feat(levels): build Act IV's seven maps`.

### Task 2: Palette 4 and the envs

- [ ] `ENV_PALETTES[4]`: the Act 3 violet bleached by white-hot rift light; seven `LEVEL_ENVS` with distinct salts; act-3 render branches cover act 4.
- [ ] Commit: `feat(render): Act IV's white-hot palette`.

### Task 3: The Act IV table, gifts and NG+ rules

- [ ] Tests: gifts only from recruited allies, only for powers held, monotonic; gifted numbers; NG+ hunter caps, pack sizes and cooldowns; NG+ hazards faster; decoy suppresses packs; the loop breaks on a rewind after a throw-back and not before.
- [ ] Commit per area: `feat(chronos): parting gifts from the allies who stay`, `feat(chronos): harder hunters and set pieces in NG+`, `feat(chronos): break the Loop by rewinding through its seam`.

### Task 4: Eleven Seconds

- [ ] Tests (`eleven-seconds.test.js`): thresholds fire once each, in order; telegraph before every stop, invulnerable in it; the first stop freezes the player and lands a non-lethal hit and both lines; later stops freeze every other enemy and every enemy round, never the player; double damage in a window; rounds resume after; lunge telegraphs before it lands; a kill in a window releases everything; nothing outside the campaign or before Form 3.
- [ ] Commit: `feat(boss): Form 3 stops time for eleven seconds`.

### Task 5: The words

- [ ] Act IV scenes: the four gifts, Rook's anchor (closing kai_2), Lyra's recording in IV-6, the Final Form card ELEVEN SECONDS, `epilogue_message` after `true_victory`, `ng_plus_true_ending` for two passes and twelve memories.
- [ ] Fragments voss_4 (IV-2, hidden), miri_4 (IV-3, hidden), kai_4 (IV-5, visible).
- [ ] NG+ echoes of six Act II scenes.
- [ ] Commits: `feat(story): ...` per beat.

### Task 6: Verification

- [ ] `npx vitest run --testTimeout=60000`; smoke, playtest-gate, level-looks on port 5194.
- [ ] Headless GPU captures at 1920×1080 in Comic art: each Act IV map (entry and set piece), Form 3's stopped time, the epilogue, a parting-gift scene.

## Results (2026-09-23)

- `npx vitest run --testTimeout=60000`: 1754 passed (baseline 1665), with `act4-maps`, `act4-chronos` and `eleven-seconds` added.
- `smoke`, `playtest-gate` and `level-looks` e2e: 27 passed on port 5194.
- GPU captures (Comic, 1920×1080, WebGL2 active, no console errors): every Act IV map at entry and at its set piece, the three phases of Eleven Seconds, the gift scenes, Lyra's recording, the epilogue and an NG+ echo.
- Found while capturing: the raycaster stops at the first solid cell, low walls included, so nothing behind waist- or knee-high cover is drawn (floor and ceiling show through). It predates this work and touches every map with low cover; Act IV keeps its main sightlines clear of it.

## Deferred

- Re-basing IV-5/IV-6 on the III-5/III-6 grids once they exist (Decision 1).
- Drawing walls behind low cover in the raycaster (see Results).
- Counter-shift on Form 3 (it ships with Form 2).
- NG+ extra levels (the `extraLevels` hook only), `origin_panels` as the NG+ opener.
- A gift marker on the HUD's power chips (HUD files are another agent's this sprint).
