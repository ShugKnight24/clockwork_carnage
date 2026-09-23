# HUD Message Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The campaign's transient messages stop stacking at the top of the screen. Today an unlock toast, a Chronos teach card, ARIA's comms plate, the boss intro plate and an achievement toast can all be up at once (II-7 opens with four of them), each placing itself with no idea the others exist. One message director owns the screen real estate: a headline lane that holds one message at a time, a comms lane that never overlaps it, and a side chip lane for unlocks and achievements that waits out the intense moments. When ARIA's line is about the lesson on the card, it becomes the card's voiced narration instead of a second plate.

**Architecture:** Two pure modules and thin glue. `src/ui/message-director.js` holds the kinds table (lane, priority, duration, time-to-live, deferral), the `MessageDirector` (per-lane priority queues on its own clock that pauses with the game, preemption of a sticky headline once it has been read, expiry, queue caps, chip deferral), the comms rules (`commsRule`, `pickNext`, `pruneQueue`, `commsPlacement`), the fold rule (`teachFolds`, `foldsInto`) and `combatIntense`. `src/ui/message-lanes.js` is geometry: `hudReserved(opts)` lists the rectangles each HUD layout already owns (compass and boss bar, minimap and kill feed, corner stacks, the DOOM console, Vanguard's vitals gauge, weapon block and arsenal strip, phone touch buttons), and `messageLanes(opts)` places the headline, comms, low comms and chip lanes around them, for every HUD style at every size. The game owns one director (`game.messages`), updates it and the lanes once per HUD frame, and each producer asks it before drawing. Nothing about a message's content changes; only when and where it appears.

**Tech Stack:** Vanilla ES modules, Canvas 2D HUD layer, one DOM toast element, Vitest, Playwright + Chromium with GPU flags.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution. Do not push.
- Other agents are building the Act II–IV maps (acts.js, cutscene scripts, palettes, ai.js, boss logic, small boss-bar additions in hud-modern.js / hud-vanguard.js). Stay out of map and boss code: `js/campaign-manager.js` is not edited, the boss intro is adopted from `game.bossNameCard` where the HUD draws it.
- Keep ARIA's three presentations (projected, prominent, subtle); the director only places them.
- Boss bar, compass, minimap, kill feed, corner stacks and the pickup toasts keep their places; the lanes are fitted around them.
- Baseline: 1665 unit tests; `tests/smoke.spec.js`, `aria.spec.js`, `mobile-layout.spec.js`, `playtest-gate.spec.js` green.

## Producers found

| Producer | Where it drew | Lane |
|---|---|---|
| Chronos teach card (`game.renderTeachCard` → `tutorial-ui.renderTeachCard`) | game canvas, fixed `y = 60` | headline |
| Boss intro plate (`game.bossNameCard`, `hud.drawBossNameCard` / `drawModernBossNameCard`) | centre, `0.35 h` | headline |
| Level title | none is drawn in play today; the kind is reserved in the table | headline |
| ARIA and squad comms (`AriaCommsSystem`, `SquadCommsController` queue into it) | prominent `0.135 h` or under the card; subtle above the vitals; projected on the left | comms |
| Unlock and gear toasts (`unlock-toast.js`, DOM) | fixed top-centre over everything | chip |
| Achievement toast (`AchievementSystem.renderToast`) | top-right, over the minimap | chip |
| Vanguard pickup captions ("WEAPON ACQUIRED · …", `+ammo`) | above the weapon block | unchanged; reserved so chips clear them |
| Tutorial step cards (tutorial mode) | game canvas | unchanged; comms still keep below them |
| Meltdown ARIA line, kill-streak banner, arena stage-cleared | other modes / combat feedback | unchanged |

## Rules

**Headline lane (top centre, one at a time).** Priority `teach 100 > bossIntro 90 > levelTitle 80`. Nothing is interrupted while it is fresh: a waiting item goes next by priority, then by age. A teach card is sticky (up until its lesson lands); once it has been up for its 6 s read, a waiting boss intro or level title may take the lane for its turn and the card comes back after. A boss intro that could not show within 8 s, or a level title within 6 s, is dropped (the moment has passed). A teach card also waits for a prominent ARIA plate already up in the top slot to finish (her next line goes low instead). The headline's rectangle starts below the compass and boss bar of the HUD in use, so the card no longer sits on Vanguard's compass.

**Comms lane.** ARIA's queue becomes a priority queue with expiry: projected 70 (30 s), prominent 50 (20 s), squad 40 (12 s), idle/subtle 20 (6 s); equal priorities keep their order, stale lines are dropped before the next one is picked. Where a line goes is decided when it starts and kept for its life:
- no headline → its usual place (prominent plate top-centre, below the compass/boss bar; subtle above the vitals; projected on the left);
- a boss intro or level title up, or posted and about to show → **hold**: the line waits and plays (voice included) as soon as the plate clears;
- a teach card up and the line is about the lesson → **fold**: spoken on the comms channel as usual, drawn inside the card as a narration row, no plate;
- a teach card up otherwise → **low**: the plate drops to the low comms slot above the vitals (projected keeps its figure on the left, caption kept below the card).

**Folding.** A teach card folds `powerUnlocked` (ARIA's "new pattern in the shard" line that fires as the card comes up) for every power, and the first-shift lines (`chronoShiftActivated`, `chronoShiftLoud`) for Foresight, whose lesson is shifting.

**Chip lane (right side, under the minimap / kill feed).** One chip at a time, priority `achievement 50 > unlock 40 > gear 30`, 3.2–3.5 s each. A new chip does not start while a boss intro or level title is up, while a teach card is in its first 6 s, or in heavy combat (hurt in the last 2.5 s, slow-mo, or three hostiles engaged within 12 tiles). An unlock or achievement waits at most 25 s of that before it shows anyway (never over a boss intro); a gear pickup chip is dropped after 12 s. With three or more waiting, each chip plays at 0.6× its time (at least 1.8 s), so a first session's burst of unlocks clears quickly; the lane holds at most 16, past that the lowest-priority, oldest one goes. Outside play (the customize screen) the unlock toast keeps its old top-centre place.

## Lanes

| Lane | Desktop | Phone (landscape, < 420 px tall) |
|---|---|---|
| headline | `min(720, w − 80)` wide, centred, top below the reserved top-centre strip (≥ 60) | between the top-left vitals and the minimap, compact type; on a small phone it may cover the kill feed rather than the reticle |
| comms (top) | `min(460, w − 24)` wide, `max(0.135 h, strip + 22)` | the low slot: the top belongs to the clusters and the headline |
| commsLow | same width, bottom at the existing subtle-plate anchor, raised above any bottom block it would touch | above the compact console, between the touch clusters |
| chips | 300 wide at the right margin, below the minimap (and kill feed / pickup captions on Vanguard) | 240 × 30 one-line chip under the minimap; it may share the headline's row, so chips wait for any headline to clear |

Tested for no overlap between lanes and against every reserved rectangle at 1280×720, 1920×1080, 2560×1440, 844×390 and 667×375, for DOOM, Vanguard, Minimal, Tactical and Legacy, with and without a boss bar.

## File Structure

| File | Responsibility |
|---|---|
| `src/ui/message-director.js` | **New.** `MESSAGE_KINDS`, `MessageDirector`, `commsRule`, `pickNext`, `pruneQueue`, `commsPlacement`, `teachFolds`, `foldsInto`, `combatIntense` |
| `src/ui/message-lanes.js` | **New.** `hudReserved`, `messageLanes`, `commsBottom`, `overlaps`, `CHIP_H` |
| `js/game.js` | `this.messages`; `updateMessages()` per HUD frame (lanes, intensity, pause, level change); teach card through the director on the HUD canvas; achievement toast through it |
| `src/rendering/render-pipeline.js` | the teach card draws on the HUD canvas after the HUD |
| `src/ui/tutorial-ui.js` | `renderTeachCard` takes the lane (top, width) and an optional narration row |
| `src/systems/aria-comms.js` | queue picks and expiry from the director; placement latched per line; renderers anchor to the lane (top / low / fold) |
| `src/ui/hud.js` | the boss intro plate asks the director before it shows |
| `src/systems/achievement-system.js` | toast queued through the director, drawn as a chip in the lane |
| `src/ui/unlock-toast.js` | the DOM toast is a view of the director's chip lane, placed by it in play |
| `tests/unit/message-director.test.js`, `message-lanes.test.js` | New tests |

---

### Task 1: The director (pure)

- [x] **Failing tests** (`tests/unit/message-director.test.js`): one headline at a time, next by priority then age; a fresh headline is never interrupted; a sticky teach card yields to a waiting boss intro only after its 6 s and resumes after; a boss intro that waited 8 s expires; timed items finish on their duration; the clock does not run while paused and a long frame is clamped; chips are one at a time, deferred by intensity, a boss intro and a fresh teach card, shown after 25 s of deferral, never over a boss intro; gear chips expire after 12 s; the chip lane caps at 16, drops the lowest priority first and plays a backlog faster; re-posting a key is a no-op; `commsRule` ranks projected > prominent > squad > subtle; `pickNext` is priority then FIFO; `pruneQueue` drops stale lines by rule; `commsPlacement` gives top / hold / fold / low; `foldsInto` folds `powerUnlocked` into any teach card and the shift lines only into Foresight's; `combatIntense` reads hurt, slow-mo and engaged count.
- [x] **Implement** `src/ui/message-director.js`. Commit `feat(ui): message director for headline, comms and chip lanes`.

### Task 2: Lanes (pure geometry)

- [x] **Failing tests** (`tests/unit/message-lanes.test.js`): for each size × style × boss, the four lanes lie on screen, do not overlap one another (headline/commsLow/chips, comms/chips) nor any reserved rectangle; the chip lane fits a chip; the headline sits below Vanguard's compass and boss bar; the phone headline stays between the top clusters and clear of the touch buttons; `commsBottom` matches the old subtle anchors where they were already clear.
- [x] **Implement** `src/ui/message-lanes.js`. Commit `feat(ui): message lanes fitted around every HUD layout`.

### Task 3: Glue

- [ ] `game.messages` + `updateMessages()`; the teach card on the HUD canvas through the director with its lane and narration; the boss intro plate through the director; ARIA's queue, placement and anchors; achievement and unlock chips. Commit per producer.

### Task 4: Verification

- [ ] `npx vitest run --testTimeout=60000`; the four e2e specs on port 5195; headless GPU captures of II-7's opening with an unlock, an achievement and an ARIA line fired at once, DOOM and Vanguard at 1920×1080 and 1280×720, before and after, into the session scratchpad `hud-director/`.

## Done when

- II-7's opening reads as a sequence: the Hound's plate, then the Time-Lock card with ARIA's line folded in as its narration, then ARIA's boss line; the unlock and achievement arrive as side chips once the card has been read, and nothing overlaps.
- All unit and e2e suites above green.

## Deferred

- A level title card in play: the kind and its priority are in place; nothing draws one yet.
- Tutorial step cards stay on the game canvas with their own anchor; the tutorial has one message at a time already.
- Legacy Tactical / Custom are mapped to the Minimal reservations (same corners); a Custom layout the player has rearranged in the HUD editor is not read.
