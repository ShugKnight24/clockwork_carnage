# Campaign Acts, Phase 2: Four Acts and the Gathering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The campaign becomes four acts and 29 levels on placeholder maps. Act I loses the Nexus and runs eight levels. Act II, *the Gathering*, recruits Lyra, Rook, Nova and Kael one chapter at a time and ends on the Hound. Acts III and IV run on their remix sources as-is. Every existing scene moves to the slot the spec gives it. The party art draws only the people who have joined. Kael, Nova and Rook get solo art. Problems 4-7 are fixed. A v1 save restarts its act instead of being deleted.

**Architecture:** Everything slot-shaped stays in `src/data/campaign/acts.js`: the four acts, each level's map, briefing chain, squad and callsigns. The scenes are data in `cutscene-scripts.js`. Party frames name their members (`party: ["lyra", "you"]`); the cutscene engine turns that into an art key `party:lyra+you`, which both renderers understand, so the raster cache key carries the member set. Frames that name no members fall back to the current slot's squad plus the player. The Hound is a placeholder enemy type (beast stats, `boss: true`) drawn with the beast art in its own colours. Save v2 lives on the campaign save only; the arena save keeps v1.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium (e2e, headless via `ccDebug`).

**Spec:** `docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md`, §16.2, §7, §9, §11, §12, the Problems list and "Decisions (answered 2026-09-22)", which overrides the body.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution.
- Hands off (other agents): `src/world/*`, `src/rendering/voxel/*`, `js/forge.js`, `src/rpg/*`, `src/audio/*`, `js/audio.js`, `src/ui/hud*.js`.
- No phase-3 work: no Chronos powers, Resonance, hazards or teach rooms. `grants` stays out of the table until phase 3 needs it.
- No new maps. Placeholders per §16.2; Acts III and IV reuse the station maps their remixes will start from.
- Every spoken line resolves a voice (`src/audio/voice.js` `voiceKeyFor`): a `SPEAKER:` prefix, or a quoted line whose frame art or explicit `voice` names the speaker. Party frames always set `voice` per line. `emotion` where the feeling matters. Narration stays silent.
- Keep `sanitizeCampaignSave` and the hardened `CampaignManager.load()`.
- Baseline: 1153 unit tests across 78 files. `npx vitest run` before every commit.

## Decisions taken while planning

1. **Act II's on-screen title stays "The Bonds".** Decision 1 says the Act II card and flipbook keep it; "the Gathering" is the design name and the scene keys (`gathering_*`). The Act II end card reads END OF ACT II — THE BONDS. Act III's card is THE HUNT.
2. **Save migration follows the spec's table**, which Decision 12 approves ("as proposed"): Act I levels 0-6 keep their slot (same maps, same seeds), old 7/8 land on the Core (I-8), old act 2 restarts Act II, old act 3 restarts Act IV. A migrated save always starts its level fresh (no mid-level grid or entity state) and ARIA says why once.
3. **The reactor voice is not Lyra, yet.** The spec's II-1 line "I told you I'd find you" contradicts `epilogue_message`, where a later Lyra records the reactor warning and sends it back ("So that's who it was"). Present-day Lyra says "Found you." and, in the lift, denies sending the reactor message while ARIA matches the voiceprint. The loop stays open for phase 6. `encryptedChannelReveal` leaves the table for the same reason, and `analystLMReveal` with it: the lift scene now says what that bark said.
4. **Lyra's comms callsign is UNKNOWN in II-1.** She is present from II-1 (spec §9), but she has no name until the lift. Level entries may carry `callsigns: { lyra: "UNKNOWN" }`.
5. **Boss-phase squad chatter is chosen from the members present** and voiced as the member who speaks. `boss.squadPool` becomes a pool key: Act I `null`, Act II `houndSquad` (new), Act III `bossPhase2Squad`, Act IV `null` (nobody is present at IV-7).
6. **Memory reconstruction numbers count fragments**, four per person as the finished game will have: Miri 25% → 50% (II-5), Kai 50% → 75% (III-2), Voss 50% → 75% (III-4). The Voss–Lord signature is 67% at III-4, 94% from III-5's briefing on.
7. **Act III and Act IV connective scenes are written short** so the story reads end to end on placeholders: `hunt_transition_fb`, `hunt_intro`, `archive_briefing`, `engine_briefing`, `nova_decoy`. Keys are named for content; the spec's `bonds_*` became `hunt_*` with Decision 1. `epilogue_message` is phase 6.
8. **IV-2 The Loop borrows the Server Farm** (its rack aisles repeat). The spec names no placeholder for it.
9. **The phase-1 parity fixture retires.** It pinned the three-act campaign; this phase changes it on purpose. `acts.test.js` and the new story tests replace it.

**Commit order.** Tasks are written in dependency order; commits land data-first (enemies, comms, art, scenes) and switch the table last, so no commit names a scene, pool or enemy that does not exist yet.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/campaign/acts.js` | Four acts, 29 slots, `callsigns`, `RECRUITS`, `sceneSlots()`, `levelsBefore()` |
| `src/data/cutscene-scripts.js`, `cutscene-keys.js` | Act II scenes, re-slotted and reworded scenes, voice and emotion fields |
| `src/data/dialogue.js` | `gatheringAmbient`, `houndSquad`, `storyRestructured` |
| `src/data/enemies.js`, `src/systems/spawner.js`, `src/systems/combat.js` | `hound`; boss checks read the def flag |
| `src/rendering/enemies/index.js`, `svg-art/sprites/creatures.js`, `enemies.js`, `humanoids.js` | Hound placeholder art in all styles |
| `src/data/levels/station-maps.js` | Shield Commander placed in Containment |
| `src/systems/squad-comms.js`, `src/systems/aria-comms.js` | Presence-gated boss chatter, callsigns, a squad line with explicit text |
| `src/rendering/party.js` (new) | Member lists: canonical order, layout, art keys |
| `src/rendering/svg-art/models/cast.js`, `svg-art/index.js` | `partyModel(members)`, solo `kael` / `nova` / `rook` |
| `src/rendering/cutscene-art.js`, `js/cutscene.js`, `js/game.js` | Legacy party by members, Legacy solos, frame → art key, slot fallback |
| `src/core/save-system.js`, `js/campaign-manager.js` | Campaign save v2, v1 migration, one-time notice |
| `src/data/memory-fragments.js` | Tags for the new slots |
| `src/systems/unlocks.js` | Levels cleared counted across the campaign |
| `js/testing/playtest-gate.js` | Kill any boss by the flag |
| `tests/unit/*` | See each task |

---

### Task 1: Four acts in the table

**Files:** `src/data/campaign/acts.js`, `tests/unit/acts.test.js`, `tests/unit/campaign-acts-readers.test.js`; delete `tests/unit/campaign-acts-parity.test.js` and its fixture.

- [ ] **Step 1:** Rewrite the act tests for the new shape: 4 acts, 8 + 7 + 7 + 7 = 29 slots; Act I has no squad; in Act II each member first appears at their join slot, in the order Lyra, Rook, Nova, Kael, and presence never shrinks; Act III is everyone; in Act IV presence only shrinks, in the reverse of the join order; every level's map id resolves in `MAPS`; act transitions I → II → III → IV → victory.
- [ ] **Step 2:** Build the table. Station entries are looked up by map id so a placeholder keeps its map's seed and rotation. Act I: the eight station maps without the Nexus; `squadPool: null`; `ambient: "act1Ambient"`; roster gains `shieldCommander` and `temporalSummoner`. Act II: roster per spec §7, scale 1.2, palette 2, boss `hound`. Act III: today's act-2 roster plus `timeWarden`, scale 1.4, palette 3, boss `boss_form2`. Act IV: today's act 3, scale 1.8, palette 3 (palette 4 is phase 6), boss `boss_form3`.
- [ ] **Step 3:** Run, commit `feat(campaign): lay out four acts and 29 slots on placeholder maps`.

### Task 2: The Hound placeholder, boss flag, Shield Commander

- [ ] `ENEMY_TYPES.hound`: beast stats scaled for a boss, `boss: true`, pale heat colours. Renderers: Legacy through `renderBeast`, Comic/Modern through the beast creature build with its own rim, aura and jitter.
- [ ] Spawner: act scale and roster skipping read `ENEMY_TYPES[t].boss`, not the `boss` name prefix. Playtest gate kills the boss by `isBossEnemy`.
- [ ] Containment's sub-boss arena gets its Shield Commander (problem 6).
- [ ] Tests: the hound is a boss, the spawner puts it in Act II's boss slot unscaled, Act I keeps the Shield Commander. Commit `feat(enemies): add a placeholder Hound and place Act I's Shield Commander`.

### Task 3: Squad comms and ARIA pools (problems 4, 5)

- [ ] `onBossPhase(poolKey)` does nothing when nobody is present; picks only lines whose `Name:` prefix is present; speaks as that member. `queueSquadMessage` takes optional explicit text.
- [ ] Callsigns: a level entry's `callsigns` rename a member's comms label (Lyra is UNKNOWN in II-1).
- [ ] Dialogue: `gatheringAmbient` (Act II idle, nobody named before they join), `houndSquad`, `storyRestructured`. The squad-comms header comment states the new canon (problem 5).
- [ ] Tests: no squad line at the Act I boss; `act1Ambient` is picked in Act I; boss lines only from present members; callsign in II-1. Commit `fix(comms): silence the squad where nobody is present and wire act1Ambient`.

### Task 4: Party art takes members; solo portraits

- [ ] `src/rendering/party.js`: `PARTY_ORDER` (kael, lyra, you, nova, rook), `partyKey(members)`, `partyMembers(key)`, `partyLayout(members)` (the five keep today's exact positions; fewer re-centre).
- [ ] SVG: `partyModel(members)`, built lazily per key in `svg-art/index.js` (`art:party:lyra+you`). Legacy: the silhouettes filter and re-centre. New solo models `kael`, `nova`, `rook` (standing figure over a coloured ground glow, like `lyra`), with Legacy procedural versions.
- [ ] `js/cutscene.js` resolves a frame's art key (`party` + `frame.party`, else the slot's squad from `getParty`), for drawing and for warming.
- [ ] Tests: layout for 1-5 members, keys round-trip, the model draws exactly the members named, every solo key exists in both renderers. Commit `feat(art): draw only recruited members in party art and add squad solos`.

### Task 5: The Gathering scenes

Act II's slots and chains:

| Slot | Map | Briefing chain | Squad |
|---|---|---|---|
| intro | | `act2_transition_fb`, `gathering_extraction` | |
| II-1 Evac Shafts | reactor | (intro) | lyra (as UNKNOWN) |
| II-2 Salvage Deck | containment | `gathering_lyra`, `gathering_rook` | lyra |
| II-3 Maintenance Spine | server_farm | `gathering_rook_shard`, `the_hunt_begins` | lyra, rook |
| II-4 Transit Loop | nexus | `gathering_nova` | lyra, rook |
| II-5 Greenhouse | research | `gathering_greenhouse` | lyra, rook, nova |
| II-6 Precinct | checkpoint | `hound_attack`, `gathering_kael` | lyra, rook, nova |
| II-7 Foundry | core (Hound) | `gathering_kael_joins`, `hound_intro` | all four |
| outro | | `gathering_finale`, `lyra_reveal` | |

- [ ] Write the eleven scenes. `act2_intro` is split and retired: Lyra's bedside lines move into her lift scene, the taglines into each recruit's scene, the montage into `gathering_finale`. `act2_level2` keeps only "Same corridors. Better company" (III-1); its Nova frames move to `gathering_nova` and `hound_attack`. `act2_level3` keeps only the Voss reconstruction (III-4); the every-screen taunt goes to `hound_attack` re-cast for who is there, "You talk too much" to `gathering_kael_joins`. `act2_level4` retires into `gathering_rook`. `act2_level5` swaps its Miri reconstruction (to `gathering_greenhouse`) for Kai's (from `act2_level6`). `the_hunt_begins` becomes the recording Rook pulls from the suit.
- [ ] `cutscene-keys.js` in the same commit. Commit per chapter: `feat(story): ...`.

### Task 6: Re-slot and reword the other acts; seed lines

- [ ] Act I seeds: the sealed dilation module (`reactor_briefing`), the bench note (`voss_lab_briefing`), the Nexus line in `paradox_core_briefing`, "I felt that" and THE FALL in `false_victory`.
- [ ] Act III: `hunt_transition_fb`, `hunt_intro`, `act2_level2` (III-1), `act2_level5` (III-2), `act2_level6` (III-3), `act2_level7` + `voss_confrontation` + `act2_level3` (III-4, with Lyra closing the screen), `archive_briefing` (III-5, 94%), `engine_briefing` (III-6), `level3_briefing` + `act2_level9` (III-7, the parable aimed at squad-Voss), `act2_victory` (END OF ACT III — THE HUNT).
- [ ] Act IV: `act3_transition_fb` (ACT IV), `act3_intro`, `act3_level2` ("Six wings"), `act3_boss`, `act3_level4`, `nexus_briefing` + `act2_level8` + `nova_decoy`, `act3_level5` (the Archive), `act3_level6` (the Engine) + `act3_level8` (Lyra alone), `act3_level7` + `act3_level9`, `true_victory`. `origin_panels`, `level2_briefing`, `coming_soon` leave the table.
- [ ] Numbers (problem 7) per Decision 6.
- [ ] Commit `feat(story): re-slot the existing scenes into four acts`.

### Task 7: Voices and the story tests

- [ ] `tests/unit/campaign-story.test.js`: every scene key the table names exists; no script is referenced but missing; every party frame names members, and only members present in the slot it plays in (plus "you"); every quoted or `SPEAKER:` line in every script resolves a voice via `voiceKeyFor`; every `emotion` is a real emotion.
- [ ] Add `voice` (and `emotion` where it matters) to every existing line the test flags.
- [ ] Commit `test(story): walk every script for voices, party members and scene slots`.

### Task 8: Save v2

- [ ] `CAMPAIGN_SAVE_VERSION = 2`; `migrateCampaignSave(v1)` maps the slot, drops mid-level state and flags `migrated`. `loadCampaignData` migrates instead of deleting; a save it cannot read is still cleared. Arena saves stay v1.
- [ ] `CampaignManager.load()` queues `storyRestructured` once after a migrated load.
- [ ] Tests: v1 fixtures for each old act and edge levels, NG+ and stats carried, unknown versions cleared. Commit `feat(save): migrate v1 campaign saves by restarting the act`.

### Task 9: Fragments

- [ ] Retag per spec §8: voss_2 II-6 hidden, miri_2 II-5 visible, kai_2 II-3 hidden, voss_3 III-4, miri_3 III-5, kai_3 III-6. `archive.test.js` already pins them to real slots with secrets and exits.
- [ ] Commit `refactor(fragments): tag memory fragments to the four-act slots`.

---

### Task 10: Levels cleared across acts

- [ ] Act I at eight levels and the rest at seven left "Clear 8 campaign levels" out of reach until the end: `campaignLevelsCleared` and the save backfill count from the start of the campaign (`levelsBefore(act) + level`). Older per-act marks are smaller and still stand.
- [ ] Commit `fix(unlocks): count campaign levels cleared across acts`.

## Deferred

- Chronos powers, Resonance, hazards, teach rooms, `grants` (phase 3). The Hound's phasing and heat-shimmer look (phase 4, with the real Hound art and boss bar: the HUD's boss list lives in files other agents own).
- New maps and remixes (phases 4-6). Palette 4.
- Badges and cosmetics re-keyed to Lord defeats ("Second Incursion" now falls to the Hound, "Final Incursion" to Form 2), and "Act II · The Precinct" level names: they need a stats migration and HUD files. Levels cleared is already counted across acts (Task 10).
- NG+1-with-twelve-fragments true ending, `epilogue_message`, déjà-vu recruit scenes, Act IV fragments and parting gifts (phase 6).
- Lyra in field gear and the Hound as cutscene art.

## Done when

- `npx vitest run` passes.
- `smoke`, `playtest-gate`, `level-looks` and `cold-start` e2e pass against this worktree's dev server.
- A headless GPU run plays every Act II scene in Comic art with no console errors, and every party frame shows only recruited members.
