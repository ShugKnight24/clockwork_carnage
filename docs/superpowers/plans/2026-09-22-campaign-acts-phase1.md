# Campaign Acts, Phase 1: Data-Driven Acts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An act becomes a row in an `ACTS` table. Today's campaign (three acts that each replay the nine station maps) is expressed as that table, and every campaign branch on `act === N` or on nine levels reads it instead. Nothing the player sees or hears changes.

**Architecture:** `src/data/campaign/acts.js` is pure data plus lookups (`getAct`, `getActLevel`, `isLastAct`) and imports no maps, so light modules (squad comms, unlocks, spawner) can read it. Maps move into a `MAPS` registry keyed by id; `campaignMap(entry)` applies the level entry's own cover seed and rotation, so the prepared grid is byte-identical to today's `CAMPAIGN_LEVELS[i]`. `CampaignManager` resolves the current act row and level entry and drives briefings, boss form, name card, squad chime, lore barks, palette and act transitions from them. A parity test, captured from the unchanged code first, drives all 27 slots, the three boss kills, NG+ and Continue through the real `CampaignManager` and must match byte for byte.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium (e2e, headless via `ccDebug`).

**Spec:** `docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md`, §15 CODE IMPACT and §16 phase 1. The "Decisions (answered 2026-09-22)" section overrides the body; none of its answers land in phase 1 (four acts, Act I at eight levels, save v2 with "restart the current act" are phase 2).

## Global Constraints

- Branch off `feat/v0.8.0`. Never commit to `master`. Conventional Commits, no AI attribution.
- **No player-visible change.** The parity fixture is the proof. If it diffs, the refactor is wrong, not the fixture.
- **No save change** (spec §16.1: "indices keep their meaning"). `SAVE_VERSION` stays 1. Keep `sanitizeCampaignSave` and the hardened `load()` from f70ebfe.
- Phase-2 fixes stay out, even where the data now makes them one-liners: the squad still talks at the Act I boss (problem 4), `act1Ambient` stays dead (Act I `ambient: null`), no Shield Commander, no number fixes. The data carries today's values with a comment naming the phase that changes them.
- Hands off (other agents): `js/audio.js`, `src/audio/*`, `src/ui/hud*.js`, `src/world/*`, `src/rendering/voxel/*`, `js/forge.js`. In `src/systems/aria-comms.js` touch only `setNarrativeContext` / `_pickIdlePool`.
- Baseline: 1115 unit tests across 74 files. `npx vitest run` before every commit.

## Review Focus

1. **Cover variation mutates its input.** `varyCover` edits the grid in place. A registry map shared by two level entries with different seeds would compound. `campaignMap` must clone before varying, and memoise by `(map, seed, rotation)`. *(Task 2)*
2. **Texture salt is the old level index + 1.** `generateModernEnv` salts wall and deck painting with `level + 1`. Keying `LEVEL_ENVS` by env id must carry that salt, or every wall repaints differently. *(Task 4)*
3. **An act-2 level 0 is the act-2 palette with the Entry env**, not Entry's act-1 look. The palette id comes from the act, the env from the level. *(Task 4)*
4. **NG+ bark fires at level 0 of every act**, not only act 1. It moves into data on each act's first level with `minNgPlus: 1`. *(Task 5)*
5. **A Continue save naming an act that does not exist.** Today it loads with act-1 rosters as fallback. With lookups it has no level entry; treat it like an out-of-range level (clear, return false) rather than crash. *(Task 5)*

---

## File Structure

| File | Responsibility |
|---|---|
| `tests/unit/campaign-acts-parity.test.js` | **New**: drives the real `CampaignManager` over every slot; file-snapshot fixture |
| `tests/unit/fixtures/campaign-acts-phase1.json` | **New**: captured from the pre-refactor code |
| `src/data/campaign/acts.js` | **New**: `ACTS`, `NG_PLUS`, `getAct`, `getActLevel`, `isLastAct`, `totalActs`, `maxActLevels` |
| `src/data/levels/station-maps.js` | **Renamed** from `act1-maps.js`, with `act2-maps.js` and `act3-maps.js` folded in; exports `STATION_MAPS` by id |
| `src/data/levels/campaign.js` | `MAPS` registry, `campaignMap(entry)`, `campaignLevelMap(act, level)`, `campaignMaps()` |
| `src/rendering/env/palettes.js` | `LEVEL_ENVS` keyed by env id, each with its texture `salt` |
| `src/rendering/textures.js`, `js/renderer.js` | The level argument is an env id |
| `src/systems/spawner.js` | Rosters, substitutes, scale and boss type from `ACTS` |
| `src/systems/combat.js`, `src/data/enemies.js` | `isBossEnemy` reads a `boss` flag on the enemy def |
| `src/systems/squad-comms.js` | `getPresentSquad` reads `level.squad` |
| `src/systems/aria-comms.js` | Idle ambient pool comes in with the narrative context |
| `js/campaign-manager.js` | Everything act-shaped reads the act row and level entry |
| `src/systems/unlocks.js` | Backfill totals from `ACTS` |
| `js/testing/playtest-gate.js`, `harness.js`, `debug-bridge.js` | Iterate `ACTS` / `MAPS` |
| `src/data/memory-fragments.js`, `tests/unit/archive.test.js` | Tags resolve against `ACTS` slots |

---

### Task 0: Capture the parity fixture

**Files:**
- Create: `tests/unit/campaign-acts-parity.test.js`, `tests/unit/fixtures/campaign-acts-phase1.json`

- [ ] **Step 1:** Write a test that builds a recording stand-in for the game (cutscenes run their callback at once and are logged; ARIA, squad, palette, music calls are logged with fake-timer offsets) and drives the real `CampaignManager`:
  - every `(act, level)` for acts 1-3, levels 0-8: level 0 through `loadLevel(0)`, the rest through `nextLevel()` from the level before, so the briefing is in the log
  - `handleBossKill()` for acts 1, 2, 3 and act 3 at NG+3
  - `startNgPlus()`, and `load()` from three stored saves (valid, boss level, out of range)
  - `applyActEnemyRoster` over every enemy type per act, `getPresentSquad` per slot, `unlockContext` backfill
  Per slot it records map name, start, exit, a hash of grid and heights, enemies (type, position, health, damage), the boss name card, the resolved palette and texture salt, the idle pools at fixed rolls, and the event log.
- [ ] **Step 2:** Run it on the unchanged code; `toMatchFileSnapshot` writes the fixture. Run again: it must pass unchanged.
- [ ] **Step 3:** Commit: `test(campaign): pin the three-act campaign before acts become data`.

### Task 1: The ACTS table

**Files:** Create `src/data/campaign/acts.js`; test `tests/unit/acts.test.js`.

- [ ] **Step 1:** Write `acts.test.js` from spec §Testing, scoped to phase 1: every map id resolves in `MAPS`; every briefing and outro key is in `CUTSCENE_KEYS`; each act has exactly one boss level and it is the last; squad lists name only cast members; every act has a palette, roster, boss card and outro; presence never shrinks inside an act.
- [ ] **Step 2:** Build `ACTS` for today's 3 × 9 from the constants in `campaign-manager.js` (`actBriefings`, `BOSS_NAMES`, the ARIA boss key per form, the outro chains in `handleBossKill`, the Act 3 lore barks, the NG+ bark), `spawner.js` (`ACT_ROSTERS`, `ACT_SUBSTITUTES`, `1 + (act-1)*0.4`, `boss_formN`), `squad-comms.js` (`getPresentSquad`), `aria-comms.js` (the act 2/3 ambient pools) and `campaign.js` (`ROTATIONS`, `7919 + i * 104729`). Each act's `levels` is the same nine station maps with that act's briefings.
- [ ] **Step 3:** Commit: `feat(campaign): describe the three acts as an ACTS table`.

### Task 2: MAPS registry and the renamed map file

- [ ] **Step 1:** `git mv src/data/levels/act1-maps.js src/data/levels/station-maps.js`, fold in the act 2 and act 3 builders, delete those files, export `STATION_MAPS` keyed by id.
- [ ] **Step 2:** `campaign.js` exports `MAPS`, `campaignMap(entry)` (clone, `varyCover` with the entry's seed, `rotateLevel` by its rotation, memoised), `campaignLevelMap(act, level)` and `campaignMaps()` (each distinct prepared map once, in act order). `CAMPAIGN_LEVELS` goes; `src/data/index.js` and `js/data.js` re-export the new names.
- [ ] **Step 3:** Point `map-integrity.test.js`, `archive.test.js`, `harness.js` and `debug-bridge.js` (`listCampaignLevels(act = 1)`) at them.
- [ ] **Step 4:** Commit: `refactor(levels): register maps by id and rename the station map file`.

### Task 3: Spawner, boss flag, squad presence, ARIA idle pool

- [ ] `applyActEnemyRoster` and `createCampaignEntities` read `roster`, `substitutes`, `scale` and `boss.type` from the act row (unknown act: act-1 roster, no substitutes, scale 1, as today).
- [ ] `ENEMY_TYPES.boss`, `boss_form2`, `boss_form3` get `boss: true`; `isBossEnemy` reads it. The other nine copies of the list are in files other agents own this sprint, so they wait.
- [ ] `getPresentSquad(act, level)` returns the level entry's `squad`.
- [ ] `setNarrativeContext` takes `ambient`; `_pickIdlePool` returns it at the same 35% roll. Act I passes `null`, so `act1Ambient` stays dead until phase 2.
- [ ] Commit: `refactor(campaign): read rosters, squad and ambient pools from ACTS`.

### Task 4: Palettes by env id

- [ ] `LEVEL_ENVS` keyed by env id, each entry keeping its old index + 1 as `salt`. `resolveEnvPalette(palette, env)`; `generateModernEnv` salts with `envSalt(env)`. `renderer.applyActPalette(palette, env)`.
- [ ] Update `env-palettes.test.js` to iterate the act slots from `ACTS`.
- [ ] Commit: `refactor(render): key level environments by env id`.

### Task 5: CampaignManager on ACTS

- [ ] `loadLevel`, `nextLevel`, `load` resolve `getActLevel(this.act, index)` and `campaignMap(entry)`; bounds come from the act's level count.
- [ ] Boss: `isBossEnemy`, `act.boss.aria`, `act.boss.squadPool`, `act.boss.card`.
- [ ] Squad chime when `entry.squad.length > 0`. Lore barks from `entry.onStart` (`{ aria, delay, minNgPlus? }`).
- [ ] Briefing: `entry.briefing` chain. Boss kill: `act.outro` chain; then next act at level 0 with the next act's `intro` chain, or victory when `isLastAct`. The NG+ true-ending gate reads `NG_PLUS`.
- [ ] Parity fixture passes unchanged. Commit: `refactor(campaign): drive acts from the ACTS table`.

### Task 6: Unlocks, memory fragments, playtest gate

- [ ] `unlockContext` backfills `campaignComplete` with `maxActLevels()` levels and `totalActs()` acts. Cumulative `campaignLevelsCleared` waits for phase 2, where the cosmetics move to `campaignActs` rules; switching now would unlock "Clear Act 2" items after Act 1.
- [ ] Memory-fragment comments say "level is 1-based within its act"; `archive.test.js` resolves every tag with `getActLevel` and asserts no visible fragment sits on a boss level.
- [ ] The playtest gate iterates `ACTS`: every non-boss level of every act, each act's boss, next act at level 0, VICTORY after the last.
- [ ] Commit: `test(campaign): walk every act in the playtest gate`.

---

## Deferred to phase 2 (by the spec, or by ownership)

- Save v2 and "restart the current act" migration; four acts; Act I at eight levels.
- Squad silence at the Act I boss, `act1Ambient`, Shield Commander, number drift.
- Palette fields instead of act numbers in `renderer.js` fog, `render-pipeline.js` horizon, `weather.js`, `paint.js`, `wall-art.js`: all receive the palette id, which equals the act id while there are three acts.
- The boss-type list in HUD, AI and sprite files (other agents' files).
- Badges re-keyed to Lord defeats, cosmetics to `campaignActs`, cumulative levels cleared.
- "Act II · The Precinct" level names in `main.js` and the HUDs.

## Done when

- `npx vitest run` passes: 1115 + the new tests, including the parity fixture and `cutscene-keys`.
- `smoke`, `playtest-gate` and `level-looks` e2e pass against this worktree's dev server.
- A headless run kills the Act I boss at level 8 and lands in act 2, level 0 with the same briefing, roster and log as the base commit.
- `grep -rn "CAMPAIGN_LEVELS\|ACT_ROSTERS\|BOSS_NAMES\|actBriefings" js src` finds nothing.
