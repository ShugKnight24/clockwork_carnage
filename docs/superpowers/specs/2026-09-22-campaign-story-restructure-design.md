# Campaign Story Restructure: Four Acts, a Slow Gathering, and a Stolen Eleven Seconds

Date: 2026-09-22
Status: Draft for review
A narrative and level-structure spec for the campaign. It changes what the
campaign is about and how it is built. It does not change arena, meltdown or the
Forge.

## Goal

Turn the campaign from "the same nine rooms, three times, with the crew dropped
on you in a single scene" into a four-act story where every act has its own job
and its own places, where every ally joins for a reason you watch happen, and
where the time power in your hands is finally part of the plot. Right now it is
just a button the tutorial taught you.

Success looks like:

- Each act has its own map list, and after Act I you are never asked to replay
  a level you have already cleared. The Paradox Core comes back on purpose, three
  times, as the place the story keeps returning to. It stops being the room every
  act happens to end in.
- Act II, *The Gathering*, recruits one ally per chapter: Lyra, then Rook, then
  Nova, then Kael. Each gets a mission, a scene and a moment where they choose
  you. Each ally's tagline appears once. No cutscene introduces anyone twice.
- The party art only ever shows the people who have actually joined.
- The player can say in one sentence what Chrono Shift *is*. It is a stolen
  shard of the Chronos Engine, the same eleven seconds that broke time. The
  player can also say why using it is dangerous: Voss can hear every shift.
- Each ally gives the suit a new Chronos power when they join. Each power is
  taught in the level where you get it and used again before that act ends.
- The Paradox Lord and a new Act II boss use time against you. The last fight is
  won because you are a fixed point, and the fight itself makes you prove it.
- The ARIA `chronoShiftActivated` lines finally play.
- Under the hood, an act is a row in a table. Nothing in the code assumes three
  acts or nine levels.

## Current state

### Structure

- There are **nine maps**, not twenty-seven. The files are named as if there
  were three per act (`act1-maps.js`, `act2-maps.js`, `act3-maps.js`), but each
  holds three maps (`act1-maps.js:738`, `act2-maps.js:585`, `act3-maps.js:541`).
  `src/data/levels/campaign.js:25` joins them into one nine-entry
  `CAMPAIGN_LEVELS`, and every act plays all nine. `NOTES.md` states this
  outright ("9 authored levels, played once per act (27 in a full run)"). So
  does `ROADMAP.md`, whose Current Priority 4 is "Decide whether 27 levels is the
  right length."
- The act is a counter on `CampaignManager` (`js/campaign-manager.js:23`).
  `loadLevel(index)` reads `CAMPAIGN_LEVELS[index]` whatever the act is (`:178`).
  The act changes only three things:
  - the boss form, which is the act number (`:242`; `src/systems/spawner.js:232-235`)
  - the enemy roster, `ACT_ROSTERS` plus `ACT_SUBSTITUTES` (`spawner.js:350-406`), with a flat `1 + (act-1)*0.4` health and damage scale (`:237`)
  - the briefing, from an act-by-level table (`campaign-manager.js:334-365`)
- `handleBossKill` hard-codes the act transitions: `act === 1` (`:390`),
  `act === 2` (`:409`), and `else` means the game is won (`:430`). The boss name
  card is a three-entry `BOSS_NAMES` (`:256`).
- Map 9 (the Paradox Core) is the only map with a boss (`act3-maps.js:491, :529`),
  so every act ends in the same room.
- Per-level rotations are indexed 0-8 (`campaign.js:23`), and so are the
  cover-variation seeds (`campaign.js:30`, `7919 + i * 104729`). Per-level
  palettes (`LEVEL_ENVS`, `src/rendering/env/palettes.js:74`) are also indexed
  0-8 and shared across acts. Only the base palette changes by act
  (`ENV_PALETTES`, `:13-56`).
- Maps are 60×60 grids with a `heightMap` for waist-high cover. They are built in
  code with `map-helpers.js` (`carve`, `room`, `lowWall`, `door`...), and
  `tests/unit/map-integrity.test.js` checks reachability, secrets, exits and that
  levels do not all run along one axis.
- The playtest gate walks one pass of the nine maps, then kills the boss once for
  each of `[1, 2, 3]` and asserts that "act N boss opens act N+1 at level 0"
  (`js/testing/playtest-gate.js:243-266`).

### The story as written

- **Act I (alone, ARIA only).** Chronos Station, 2181. Someone ran the Chronos
  Engine for eleven seconds and broke time. You are a cadet, Badge 11235, in suit
  C-0017. Along the way:
  - The Research Wing tape plays "Stay three steps ahead" (`cutscene-scripts.js:644`).
  - The Server Farm names Dr. Elias Voss (`:760`).
  - At the Reactor you learn the suit is Voss's design (`:827`), and an encrypted
    voice says "I've seen how this ends. I'll find you" (`:839-847`).
  - Voss's lab reveals he *is* the Paradox Lord (`:980-982`). There you also
    find a file flagged by "Analyst L.M.": "Come find me" (`:993-1011`).
  - At the Core you kill Form 1, and then the false victory. ARIA overrides the
    safety limits and fires Chrono Shift to save you (`:1592-1627`).
- **Act II ("The Bonds").** `act2_intro` (`:1647`) wakes you in the medbay
  beside an unnamed woman: "They don't drift". Then it presents Kael, Nova and
  Rook, one tagline each (`:1729-1747`), under party art that draws all five of
  you. Nova is introduced again in `act2_level2` (`:1837`), and so is Rook in
  `act2_level4` (`:2021`). Kael never gets a scene of his own. Three
  memory-reconstruction beats return Voss, Miri and Kai, your squad from an
  erased timeline. The Form 2 fight ends with "You actually hurt me" (`:2396`).
- **Act II → III.** `lyra_reveal` (`:2469`) explains that you are a **fixed
  point**: "Time bends around you. It can't bend you" (`:2555`). Voss built
  C-0017 for a fixed point and never found one until you (`:2568`).
- **Act III ("The Sacrifice").** Each ally stays behind:
  - Kael holds the doors (`:2972`).
  - Rook fries the data cores (`:3036`).
  - Lyra fires the reactor (`:3072`).
  - Nova takes point (`:3186`).

  Then you walk into the Core alone and beat the Final Form. You wake in the
  medbay with Lyra holding your hand (`true_victory`, `:3293`). NG+ loops 1-3
  lead to `ng_plus_true_ending` (`:3729`), where Voss, Miri and Kai come back.

### Continuity problems found

1. **The crew dump.** `act2_intro` introduces three people in three lines.
   Two of them are introduced again later with near-identical taglines, and the
   one with the best wound (Kael, "lost a squad once") never gets a scene.
2. **Lyra is revealed an act late.** She is in the squad from `act2_intro`
   onward. But ARIA only connects Analyst L.M. to Lyra in Act 3, level 2
   (`campaign-manager.js:276`, `dialogue.js:322`), and the encrypted channel to a
   future Lyra in Act 3, level 1 (`:274`, `dialogue.js:316`).
3. **The fixed point is explained after the player has used it for two acts.**
   The tutorial teaches Chrono Shift before the campaign even starts
   (`js/tutorial-system.js:276-279`, `src/ui/tutorial-ui.js:269`).
4. **The squad talks during the Act I boss.** `onBossPhase`
   (`src/systems/squad-comms.js:136-144`) never checks who is present. At the Act
   I boss the player, who is alone, hears "Kael: Front line's mine…"
   (`dialogue.js:337-341`).
5. **The squad-comms canon comment disagrees with the script.** It says Kael,
   Nova and Rook are present from the start of Act 2 and Lyra from mid-act
   (`squad-comms.js:5-8, :38-48`). The script introduces Lyra first.
6. **Act I promises a Shield Commander that never appears.**
   `containment_briefing` says "Shield Commander. Don't shoot the shield, flank
   it" (`:699`). No map places one, and `ACT_SUBSTITUTES[1]` would turn one into
   a sentinel anyway (`spawner.js:380`).
7. **The numbers drift.** Memory reconstruction jumps 8→67%, 12→71% and 5→73%
   (`:1887, :2065, :2139`). The Voss–Lord signature match is 67% in one place
   (`:1916`) and 94% in three others.
8. **`the_hunt_begins` contradicts `clocking_in`.** In the first, the other
   Alpha candidates washed out and you are what's left (`:4118`). In the second,
   you failed the Alpha exam twice (`:4236`).
9. **Scene slots are off by one.** `origin_panels` (the comic origin of the
   player) plays before Act 3's Voss Lab level (`campaign-manager.js:362`), while
   `act3_level7`, which was written for that slot, never plays.
10. **"Seven wings to the Core"** (`:2803`) is only true by accident of the
    nine-map loop.

### Scenes written but never triggered

| Key | Line | What it is | Reuse |
|---|---|---|---|
| `act2_level7` | 2213 | The Lord's Laboratory: rewind logs, "the same eleven seconds, thousands of takes… Except one." | **Yes.** The Act III mid-act turn (III-4). |
| `act3_level7` | 3089 | The Laboratory: Origins. "Voss. Miri. Kai. You lost people too… You could have become him." | **Yes.** The last quiet beat before the final Core (IV-7). |
| `level3_briefing` | 1226 | Alternate Core briefing with the Lord's parable: "There was a man who taught time to sit and stay… He could save anyone. Except himself." | **Yes.** Reframed as the Lord mocking his better self, squad-Voss, before Form 2 (III-7). |
| `the_hunt_begins` | 4106 | Alpha program: "The others broke so easily. You put on the suit." | **Yes, as a recording.** Rook finds it inside the suit (II-3). It fixes problem 8: the Alpha candidates who "broke" were the ones who drifted. |
| `intro_memory_01_extended` | 349 | A longer version of the first memory scene. | **Yes.** NG+ opener variant, when you remember more each loop. |
| `coming_soon` | 164 | "Episode 1 — To be continued." | **Maybe.** An end card while acts ship one at a time (see phased delivery), then retire it. |
| `level2_briefing` | 112 | Duplicate Temporal Nexus briefing with an ARIA quip. | **Lines only.** Fold the ARIA quip into IV-4, retire the key. |
| `intro_memory_01_es` | 477 | Spanish localization stub. | **Not a story scene.** Leave it for a localization spec. |

Two dialogue pools are also dead:

- `chronoShiftActivated` (`dialogue.js:393`) is never queued.
- `act1Ambient` (`dialogue.js:400`) is never picked. `_pickIdlePool` only knows
  acts 2 and 3 (`src/systems/aria-comms.js:183-191`).

### Chronos in the code, and in the story

- **Input.** Hold `Q` (`js/input-manager.js:43`), gamepad `Y`
  (`js/gamepad.js:228`), or touch `SLOW` (`js/touch.js:433, :590`).
- **Numbers.** It engages at 15 energy or more and drains 33/s, giving 0.3× time
  (`js/game.js:1873-1893, :1923-1948`). Energy regenerates at 5/s. Kills add 20,
  or 30 on a streak (`src/systems/kill-streak.js:41` via
  `combat-orchestrator.js:306`). Class max energy runs from 80 to 130
  (`game.js:1344-1363`).
- **Enemies.** Each enemy type reacts through `chronoMultiplier`: drones freeze
  (`enemies.js:61`), phantoms resist (`:80`), beasts speed up (`:104`), and the
  default is 0.15 (`src/systems/ai.js:108-112`).
- **HUD.** The chrono bar is drawn in eight places: `hud-modern.js:361-379`,
  `:656-679`, `:811-825`, `:962-969`; `hud.js:1025, :1411, :2050`; and
  `hud-vanguard.js:411`.
- **The boss.** Its three forms charge, stomp, fire missile spreads and teleport
  (`ai.js` from about line 480). **None of them touch time.**
- **The story.** It mentions Chrono Shift exactly once, when ARIA fires it in
  `false_victory`. The Reactor briefing says the suit "drinks temporal energy"
  (`:821`). Nothing says what the module is or where it came from.

### Art

- `party` art draws a fixed five-person lineup: Kael, Lyra, you, Nova, Rook.
  The Comic/Modern version is `svg-art/models/cast.js:836`, the Legacy version
  is `cutscene-art.js:1747`. It is used in 19 frames.
- The cast model registry (`cast.js:1513-1529`) has solo art for ARIA, Lyra,
  Voss, Miri, Kai and the Supervisor. **There is none for Kael, Nova or Rook.**

## Decisions taken before this spec

| Question | Decision |
|---|---|
| How many acts | Four or five. This spec picks **four** (§1). |
| Act II | *The Gathering*: one ally per chapter, in the order Lyra, Rook, Nova, Kael. No crew dump, each tagline once, and party art shows recruited members only. |
| Maps | Acts get their own maps rather than replaying nine. Act I may keep the existing ones. |
| Chrono Shift in the story | A stolen shard of the Chronos Engine, the same eleven seconds, built into C-0017. Every use lets Voss sense you. Lyra's fixed point is why you don't drift. |
| Ally powers | Lyra: see enemies' future paths. Rook: Chrono Dash and shift tuning. Nova: rewind echo. Kael: time-lock shield. |
| Voices | Procedural "babble" voices are coming. This spec gives only short per-character notes for that audio spec. |

## Design

### 1. Four acts, not five

**Four acts, 29 levels (8 + 7 + 7 + 7).** Each act has one job, in the order a
story like this wants them:

| Act | Title | Job | Finale |
|---|---|---|---|
| I | **The Fall** | Alone. Learn who did this. Get beaten. | Paradox Lord, Form 1, and the false victory |
| II | **The Gathering** | Earn four people, one at a time. | **The Hound**, a new boss |
| III | **The Hunt** | Fight as one squad. Learn what Voss was, and what you could become. | Paradox Lord, Form 2 |
| IV | **The Sacrifice** | Let them go, one at a time. Walk in alone. | Paradox Lord, Final Form |

Why not five:

- **The Gathering fits in one act.** Seven levels give each recruit about one
  and a half levels of their own, plus a mid-act turn and a finale. Splitting it
  over two acts would pad the recruitment the user asked to feel slow, not
  stretched.
- **The only strong candidate for a fifth act is the River of Time.** That is
  the DBZ "Snake Way" idea in `archive/v0.7.0-closing/IDEAS.md:540`. It needs a
  whole new visual language: void, eras, parallax, and the unarmoured
  `hero_human`. It would also compete with Act IV's own death-and-waking beat.
  It is parked in Non-goals as a possible post-launch act, not folded in here.
- **The boss ladder works at four:** Form 1, then the Hound, then Form 2, then
  Form 3. The Core becomes somewhere you *return* to, in Acts I, III and IV, and
  Act II's finale happens somewhere else. That makes the second visit mean
  something.
- **The budget works at four.** 29 levels is about today's 27, but built from 9
  new maps, 10 remixes and 2 variants instead of 27 replays. A fifth act adds
  7-8 more levels to every NG+ pass.

The act-end cards follow. `false_victory` currently closes on "END OF ACT I —
THE SHIFT" (`:1635`) and should read "THE FALL". The existing "ACT II — THE
BONDS" card and flipbook move to Act III, where the bonds are actually tested.

### 2. The spine in one paragraph

A cadet nobody rated puts on a suit nobody signed for, walks into a station
where time is broken, and learns who broke it. That was Dr. Elias Voss, who
became the Paradox Lord. The cadet fights him and loses. To save them, ARIA
tears the safety governor off the suit's time module. In that moment Voss feels
something he has not felt in years: his own eleven seconds, running in someone
else's hands. From then on, every time the cadet bends time, he hears it.

Lyra is the analyst who has been steering the case from inside the Bureau. She
pulls the cadet out and explains why they didn't come apart: they are a fixed
point, the one thing time can't rewrite. One by one the cadet earns four people,
and each leaves something of themselves in the suit. Together they hunt Voss
back through his own rewound station, down to the Engine that started it. There
they find the one take, out of ten thousand, where the station survives: the one
where a fixed point walks into the Core alone. So the cadet does. The others
each hold a door so they can.

### 3. What Chrono Shift really is

**The lore.** C-0017 was built by Voss as a vessel for something only he knew
how to make: a shard of the Chronos Engine. It holds a sliver of the same eleven
seconds that broke time, bottled, with a governor on top so the wearer doesn't
dissolve into it.

- **Suit C-0016 and the earlier prototypes** went to Alpha candidates through
  the Bureau. They drifted. They came apart in time. This is what
  `the_hunt_begins` means by "The others broke so easily" (§8, II-3).
- **Lyra routed C-0017 to you.** She watched your readings for months and saw
  that they never drift (`act2_intro`, `:1688`). Voss built the suit. Lyra put
  your name on the crate. Both are true.
- **The governor.** Through Act I the suit's "time-dilation module" runs
  governed. ARIA can't open it ("Your dilation module's sealed. Even I can't get
  in there. I don't love that."). Shifts are short and quiet. In `false_victory`
  ARIA overrides it (`:1594`, "OVERRIDING SAFETY LIMITS") and the governor burns
  out. That is the first *loud* shift.

**The first ring.** Add one line to `false_victory`, in the frozen moment when
the killing blow hangs an inch from your visor. The Lord, softly: *"…There. I
felt that. My eleven seconds, in someone else's hands."* It turns the existing
Act II line "He could have finished you. He didn't. That's a message." into a
reason: he let you live because he wants to know what can carry his eleven
seconds without breaking.

**The fixed point.** Lyra introduces it in Act II, chapter 1: *"Anyone else who
did what you do would come apart. You don't drift. You're a fixed point."* The
full weight of it lands at the end of Act II in `lyra_reveal` (existing, moved):
it is also why you remember a squad nobody else does.

#### Resonance: Voss can hear you

A light mechanic that keeps the story tension in the player's hands, tuned to
be fun rather than punishing.

- **Where it lives.** A hidden meter from 0 to 100. From Act II onward the HUD
  shows it as a thin crimson "eye" beside the chrono bar. It is off in Act I,
  where the governor is on.
- **What fills it:**
  - a shift: +6/s for the first 1.5 s, +20/s after that, so short taps are
    quiet and long holds are loud
  - Chrono Dash: +4
  - Rewind: +10
  - Time-Lock: +8
- **Decay.** −8/s after 2 s of not shifting.
- **At 50**, ARIA warns you ("He's listening. Keep it short.").
- **At 75**, the Lord whispers on the comms plate, speaker *VOSS*, crimson:
  "There you are."
- **At 100, the hunter response.** A rift opens 8-12 tiles away, out of your
  line of sight, and a small hunter pack drops in: two to four of the act's
  hunter types, which are rift leapers, echo drones and time wardens.
  - Hunters are marked, drop a guaranteed chrono cell (+40) and roll gear, so
    being heard pays out.
  - The meter resets to 0, and a 45 s cooldown starts before another hunter
    response can happen.
  - Caps per level: 1 on Easy, 2 on Normal, 3 on Hard and Nightmare.
  - There are no hunter responses in boss arenas. There, bosses read Resonance
    their own way (§6).
  - Hunters never count toward `totalEnemies`, so kill stats and completion are
    unaffected.
- **A setting** "Hunter response: On / Story only / Off". *Story only* keeps
  the whispers and the scripted responses and drops the random ones.

### 4. The four powers

Every power runs on the one chrono energy pool, so there is no new resource.
Kills already feed the pool with +20 or +30 each, so powers are affordable in a
fight and scarce out of one. That is the right shape.

| Power | From | When | Input: keyboard / pad / touch | Cost | Cooldown |
|---|---|---|---|---|---|
| **Chrono Shift** (base) | the suit | always | hold `Q` / hold `Y` / hold `SLOW` | engage at 15, drain 33/s (Rook: 10 and 28/s) | none |
| **Foresight** | Lyra | end of II-1 | passive while shifting | none | none |
| **Chrono Dash** | Rook | start of II-3 | dash while shifting (double-tap a direction / `B` / dash button while `SLOW` is held) | 20, no stamina | 1.0 s |
| **Rewind Echo** | Nova | end of II-5 | double-tap `Q` / double-tap `Y` / double-tap `SLOW`, or an optional `chronoRewind` key | 40 | 12 s |
| **Time-Lock** | Kael | end of II-6 | `V` / `R3` / a `LOCK` button that appears after unlock | 30 | 10 s |

**Foresight (Lyra).** "Everyone studies the fights. I study the gaps" (existing,
`:2496`). While you shift:

- every enemy in view casts a translucent ghost of where it will be in 0.6 s
- telegraphed attacks draw a thin red line to their target during windup
- projectiles show a dotted path

Story: Lyra loads her predictive model into ARIA. It costs nothing extra, and it
makes each shift worth more, which matters now that shifting is loud.

- **Taught** in the first room of II-2. Phase stalkers blink between pillars,
  and a card says "FORESIGHT — while shifting, you see where they're going." The
  door opens once you kill two stalkers while shifting.
- **Code.** `ai.js` needs to expose each enemy's intent (target point, windup
  state, charge line) instead of keeping it in locals. There is a new ghost
  sprite pass in the renderer and a new dotted-path draw in projectile
  rendering.

**Chrono Dash and tuning (Rook).** Rook can't put the governor back ("It's
slag"), but he can make it quieter.

- Activation cost drops from 15 to 10, and drain from 33/s to 28/s.
- A dash while shifting becomes a Chrono Dash: about 2.2× the distance, costs
  20 chrono instead of stamina, and gives i-frames the whole way. It passes
  through hazards flagged `dashable`, such as frozen fan blades and closing
  gates.
- Resonance +4, so it is the quiet way to move.

Details:

- **Taught** in the opening corridor of II-3, a fan gallery where the blades are
  too fast for a normal dash. The card reads "CHRONO DASH — hold Q, double-tap a
  direction." You use it again on a collapsing catwalk mid-level, and in combat
  through a beast's lunge.
- **Code:**
  - `triggerDash` (`game.js:2130-2148` →
    `src/systems/player-update.js:367-393`) branches on `player.chronoActive`
    and the unlock
  - the thresholds in `_updateChronoEnergy` (`game.js:1923`) and
    `_updateTimeScale` (`:1873`) come from player stats instead of literals
  - the dash cooldown is kept separate from the stamina dash's 0.4 s

**Rewind Echo (Nova).** "Going back isn't running. Going back is how you get
there first."

- You snap to where you were 3.0 s ago, facing the way you faced.
- Health is restored to the higher of now and then, capped at +35, so it is not
  a free full heal.
- A glowing echo of you stays where you left for 2 s and draws enemy fire.
- It never crosses a level load. It is a move, not a save-scum.
- Resonance +10.

Details:

- **Taught** in the first room of II-6. An old precinct sentry turret fires a
  burst you cannot dodge. Nova: "Take the hit. Then un-take it." The card reads
  "REWIND — double-tap Q: go back three seconds." The door opens after a rewind
  that follows at least 20 damage. Then the echo decoy is taught for real
  against the same turret.
- **Input risk.** Double-tap collides with hold-to-shift. The first tap starts a
  shift that lasts about 0.1 s and costs about 3 energy, which is acceptable,
  but it is Open question 4.
- **Code:**
  - a 3 s ring buffer of `{x, y, angle, health}` in a new
    `src/systems/chrono-powers.js`
  - the double-tap detector reuses the dash's (`input-manager.js`)
  - the echo decoy is an entity that AI targets through the existing aggro path

**Time-Lock (Kael).** "Hold it with me, then. Not for me."

- **What it is.** A 3-tile-wide plane of frozen time appears 1.5 tiles ahead,
  facing where you look, and lasts 4 s. It does not need a shift. It is Kael's
  line, not a hiding place.
- **Projectiles** that enter it stop and hang in the air, then drop harmlessly
  when it ends.
- **Enemies** crossing it move at 0.1×.
- Resonance +8.

Details:

- **Taught** in the opening corridor of II-7, the Foundry: a sentry line of fire
  you cannot cross. The card reads "TIME-LOCK — press V: freeze a wall of time."
  The door opens once it has caught five rounds.
- **Code:**
  - projectile capture in `projectile-update.js`
  - the plane as a world-space sprite quad
  - a new `chronoShield` keybind (`input-manager.js:43`)
  - `R3` in `gamepad.js`, which is currently unused (mapping at `:161-252`,
    labels at `:331-344`)
  - a `LOCK` button in `touch.js` layout and labels (`:1102, :1230`)
  - a new row in `controls-screen.js:46`

**The HUD, across all eight chrono bar sites.** Add:

- the Resonance eye
- cooldown rings for Rewind and Time-Lock
- the current `CHRONO [HOLD Q]` / `SHIFT` labels, extended with a small unlocked-power row

Each power gets a teach card that reuses the tutorial's step-card rendering
(`src/ui/tutorial-ui.js`), not a new overlay.

**Where unlocks live.** Nothing new is saved. Each level entry in the act table
carries a `grants` list, and `powersFor(act, level)` returns everything granted
up to that slot. A loaded save always has exactly the powers its position
implies. NG+ grants everything.

**Wiring the dead ARIA pool.**

- `chronoShiftActivated` fires on the first activation per level, the same way
  `dashUsed` does via `triggerAriaOnce` at `game.js:2146`. Its three lines are
  right for Act I, where the governor is on.
- From Act II a new pool `chronoShiftLoud` takes over. Example: "Every shift
  rings his bell. Make them count."
- Further new pools:
  - `resonanceRising`
  - `lordHearsYou` (Voss speaker)
  - `hunterResponse` ("Rift opening behind you. He sent something to fetch you.")
  - `powerUnlocked`
  - `counterShift`
  - `elevenSeconds`

### 5. Chrono set pieces

Rooms you can only get through by bending time. They need one small new system:
a `hazards` array on each level, driven by `src/systems/chrono-hazards.js`.

- Each hazard advances on `dt × (player.chronoActive ? hazard.chronoMultiplier ?? 0.15 : 1)`,
  the same convention enemies already use.
- Every hazard's state is derived from one level clock, so saving and loading
  keeps them in step.

| Hazard | What it does | Built from |
|---|---|---|
| `collapse` | A sequence of grid cells fills with wall, one after another, along a path. It is triggered by a zone and chases you. | Timed writes to `map.grid`, which is already mutable and saved |
| `blade` | A sweeping damage sprite with a period, like fan blades or rotors. Readable in a shift, passable with Chrono Dash. | A damage entity plus a sprite |
| `vent` | A periodic damage zone: plasma, steam or coolant. | A zone plus particles |
| `gate` | A laser line that toggles, or a turret stream. Time-Lock can stop what it fires. | A zone plus a projectile emitter |
| `stasis` | A room frozen at one instant: debris hanging, a figure mid-step. It is story, not threat, and it is where memory fragments live. | Frozen props and sprites, with the palette desaturated |
| `loop` | Leaving a zone puts you back at its start, until you break the seam. | A teleport zone plus a condition |

**Act I gets exactly one, and it is optional:** the Vent Gallery in Reactor
Access, a side room with timed plasma vents and a gear cache. Shifting makes the
gaps readable. It teaches the idea with nothing at stake. Required set pieces
start in Act II. The full list is in §7.

### 6. Bosses who use time against you

- **Form 1 (Act I).** Unchanged. The false-victory shockwave is the only time
  trick, and it is scripted. Act I's job is to beat you, not to teach you his
  tricks.
- **The Hound (Act II).**
  - *Name card:* "THE HOUND: SUIT C-0016. NOBODY INSIDE." The prototype before
    yours, empty, walking. Its wearer drifted out of it years ago, and now it
    hunts by the sound of the Engine.
  - *How you see it:* always. At normal speed it is a heat-shimmer silhouette
    that stutters between positions a few frames apart, trailing afterimages
    like a bad frame rate, with scorched footprints and a clock-tick you hear
    before you see it. It can be seen and tracked, just not hurt. Its attacks
    still land and still telegraph.
  - *How it works:* it is phased (translucent, and your rounds pass through it)
    until you shift. The moment you shift it turns solid and hittable, but it
    runs at 1.5×, the way beasts already do (`enemies.js:104`). The fight is a
    rhythm of short, deliberate shifts.
  - *How the powers answer it:* Foresight shows its lunge line, Chrono Dash goes
    through the lunge, Time-Lock catches its quill volleys, and Rewind undoes the
    hit you didn't see coming.
  - It is the final exam for all four powers, and the only boss that is not
    Voss.
- **Form 2 (Act III).**
  - *Counter-shift:* he is unaffected by your shift (multiplier 1.0). After 2 s
    of continuous shifting he takes it from you: you move at 0.5× for 2 s while
    he moves at normal speed. This is the time-slow-the-player idea from
    `archive/v0.3.0/REVIEW.md:466` and `IDEAS.md:137`.
  - *Replay:* at 66% and 33% health he re-fires his last four seconds of
    projectiles as ghost volleys from where they were first fired. Foresight
    shows them coming.
  - The lesson is that the loud, long shift that carried you through Act II is
    now how he beats you.
- **Form 3, the Final Form (Act IV): "Eleven Seconds."**
  - *The first time* he stops time (at 75% health), you are frozen too. It is
    scripted, with no input. He walks up and lands a heavy hit that is never
    lethal: *"Eleven seconds, Cadet. Mine. Everything holds still for me."*
  - Then Lyra's voice comes back as a recorded line. It is the last thing she
    told you before she stayed behind: *"It can bend everything. Except you."*
  - *Every later time-stop* (at 50% and 25%) freezes everything but the two of
    you, and his armour freezes with the rest. His own time-stop becomes your
    window.
  - The last phase is won by being the fixed point. It pays off the reveal,
    mechanically, in the final minute of the game.
  - Counter-shift carries over from Form 2, so shifting is still a risk. The
    answer is to *not* shift and to wait for his stop.

### 7. Act by act

Map sources: **Reuse** means the existing map as-is. **Remix** means a new
builder that starts from an existing builder and re-carves rooms, adds hazards
and places a fresh encounter list, with its own rotation and seed. **New** means
a new builder. **Variant** means an Act III map in a later state, with the same
grid plus hazard and entity overlays.

---

#### ACT I — THE FALL (8 levels, all reused)

Roster: drone, glitchling, phantom, corruptCop, sentinel, plus Shield Commander
and Temporal Summoner as sub-bosses. Palette: Act 1, blue steel and cyan. Squad
comms: none, only ARIA. Resonance: off, because the governor is on.

| # | Level | Map | Briefing (existing) | Boss / sub-boss | Fragment |
|---|---|---|---|---|---|
| I-1 | Chronos Station — Entry | Reuse map 1 | `intro` (+ flipbook, prologue, memory) | none | none |
| I-2 | Security Checkpoint | Reuse map 2 | `security_briefing` | none | kai_1 (visible) |
| I-3 | Research Wing | Reuse map 3 | `research_briefing` | none | voss_1 (visible) |
| I-4 | Containment Block | Reuse map 4 | `containment_briefing` | **Shield Commander** (actually placed now) | miri_1 (hidden) |
| I-5 | Server Farm | Reuse map 5 | `server_briefing` | none | none |
| I-6 | Reactor Access | Reuse map 6 | `reactor_briefing` | none; optional Vent Gallery | none |
| I-7 | Dr. Voss' Laboratory | Reuse map 7 | `voss_lab_briefing` | Temporal Summoner | none |
| I-8 | The Paradox Core | Reuse map 9 | `paradox_core_briefing` | **Paradox Lord, Form 1** | none |

The Temporal Nexus (map 8) leaves Act I and becomes Act IV's gauntlet. The Core
is one level closer and the run is one level shorter. The Nexus briefing's best
line ("He's never met the stubborn idiot inside it. That's our edge.") moves
into `paradox_core_briefing`.

**Beat sheet.**

- **Opening:** `intro_flipbook` → `clocking_in` → `intro` →
  `intro_memory_01`, unchanged.
- **Chapters:** the investigation beats as written: the tape, the name, the
  suit's author, the lab.
- **New seeds, one line each, all in existing scenes:**
  - `reactor_briefing`: ARIA can't open the dilation module.
  - `voss_lab_briefing`: a bench note, *"C-0017: governor mandatory. The shard
    sings."*
  - The Analyst L.M. file stays exactly as it is. It is the hook Act II pays off
    first.
- **Mid-act turn:** the Voss Lab reveal. "Not a match. The same man."
- **Finale:** Form 1, then `false_victory`, with the new "I felt that" line and
  the end card changed to "THE FALL".
- **Fixes that ship with the restructure:**
  - Act I boss chatter is ARIA-only (problem 4).
  - `act1Ambient` becomes pickable in act 1.
  - The Shield Commander is placed (problem 6).

---

#### ACT II — THE GATHERING (7 levels: 6 new, 1 remix)

Roster: henchman, corruptCop, drone, phaseStalker, chronoBomber,
temporalEngineer, beast. Hunters: riftLeaper, echoDrone. Palette: Act 2, rust and
amber. These are the outer rings and underdecks, the parts of the station the
Lord hasn't bothered to rewrite. Resonance: on from II-1.

**II-1 · Evac Shafts** (New)

- **Setting.** Service shafts under the Paradox Core, still collapsing from the
  false victory. Narrow, vertical-feeling runs with ledges built from the
  heightMap.
- **Story.** The encrypted voice from Act I's reactor is back and guiding you
  out: "I told you I'd find you." You never see her until the lift at the end.
  She hauls you in, and the doors close on the hunters.
- **Play.** A wounded escape. The **collapse** hazard chases you through two
  shafts, and shifting is the only way to outrun it. A scripted first hunter
  response comes at the midpoint, with Lyra on the channel explaining what just
  happened: "Every time you shift, you ring a bell he built."
- **Enemies.** Act I leftovers (drones, glitchlings, phantoms), then the first
  rift leaper pack.
- **Boss.** None.
- **Grants.** **Foresight**, in the scene after the level.

**II-2 · Salvage Deck** (New)

- **Setting.** A scrap hangar on the docking ring, where Rook has walled himself
  in with turrets and welded blast doors.
- **Story.** You need a working suit. The armour split in the Core. Lyra knows
  one person who could fix it, and he doesn't want visitors. Rook is welding the
  doors as the looters come. Don't thank him: he's protecting the doors, not
  you. He hands you a battery anyway. This is the existing `act2_level4` Rook
  frames, used once and only here.
- **Play.** Foresight's teach room first. Then a defend-and-fetch: hold the
  hangar while Rook's turrets cover one flank, and run out to the dock cranes
  for a power coupling.
- **Enemies.** Henchmen, temporal engineers who repair the looters' shields,
  phase stalkers.
- **Sub-boss.** Shield Commander, the looters' foreman.

**II-3 · Maintenance Spine** (New)

- **Setting.** The kilometre-long spine between the rings: fan galleries,
  crusher pistons, catwalks over nothing.
- **Story.** Rook has opened your suit in the scene before this level
  (`gathering_rook_shard`): *"This isn't a battery. It's a piece of the Engine.
  Eleven seconds, bottled. Somebody put a storm in your chest and called it a
  feature."* A recording he pulls from the suit's memory is Voss's voice: "The
  others broke so easily. You put on the suit." This is `the_hunt_begins`,
  reused. The Alpha candidates who "broke" wore the earlier prototypes and
  drifted.
- **Play.** Chrono Dash's teach corridor (blades), then the first **required**
  set pieces: a collapsing catwalk and a piston hall. A pump hall holds the
  sub-boss.
- **Enemies.** Temporal engineers, chrono-bombers, drones.
- **Sub-boss.** Temporal Summoner.
- **Grants.** **Chrono Dash** and shift tuning, at level start.
- **Fragment.** kai_2, hidden: Kai's anchor blueprint. Rook pockets a copy:
  "The math's right. He checked it twice. I'll check it a third time."

**II-4 · Transit Loop** (New)

- **Setting.** The monorail ring: long platforms, tunnels, a junction where
  trains still run on a schedule nobody wrote.
- **Story.** Something blurs past, and the target dummies are already down.
  **Nova**, fastest thing on the station, is the only one who knows the ring
  well enough to get the squad to the far side. She doesn't wait for you: "Keep
  up or keep out of my way." This is the existing `act2_level2` frames, with the
  tagline used once. She joins on comms mid-level, and by the exit she's
  agreed to "run with you, for now."
- **Play.** A speed level. It has long sightlines and beasts, which *speed up*
  when you shift, so the level teaches that the shift is not always the answer.
  There is a train-crossing set piece at the junction.
- **Enemies.** Beasts, henchmen, corrupt transit cops.
- **Boss.** None.

**II-5 · The Greenhouse** (New) — *the mid-act turn*

- **Setting.** The hydroponics ring. Green, quiet, the only warm light in the
  act.
- **Story.**
  - The squad of three rests here. It is somewhere green, and it brings back
    Miri, who wanted a clinic "somewhere green". The existing Miri
    reconstruction frames play here, along with miri_2, "The Promise".
  - A **stasis** room holds a greenhouse frozen at the instant of the collapse,
    with water hanging in the air.
  - At the exit the Lord takes every screen: "Oh. You found some strays. How
    sentimental. Friends just give me more to break." This is `act2_level3`,
    with the reactions re-cast for who is actually there. Rook yanks the power.
    Lyra: "He's rattled."
  - Then the Hound comes through the glass, and **Nova runs**.
  - The claw comes down, and then there is a blur *backwards*. Nova is there,
    three seconds ago, pulling you out of where you were about to be: "Not this
    time." After that, her confession: "Last time the world ended, I ran.
    Everyone I left stayed gone." These are existing lines (`:1869-1874`).
- **Play.** Gentler combat. The stasis room, and a garden maze of chrono-bombers.
- **Enemies.** Chrono-bombers, phase stalkers, glitchlings.
- **Boss.** None. The Hound is scene-only here.
- **Grants.** **Rewind Echo**, in the scene after the level.
- **Fragment.** miri_2, visible.

**II-6 · The Precinct** (Remix of the tutorial map, "Chronos PD — Temporal
Crimes Division HQ", `tutorial.js:224`)

- **Setting.** Where you clocked in, three days ago. The locker room, the range,
  the supervisor's office. Now it's barricaded and dark.
- **Story.**
  - **Kael** has held this building alone for three days. The morning of the
    collapse, his squad was upstairs. He hesitated at a door. The Supervisor's
    last transmission to you in the tutorial, "they're already insi—", was the
    moment it happened. He still wears the Supervisor's radio.
  - He refuses: *"I held this door once. I held it wrong. I don't do squads
    anymore."*
  - So you hold his line without him: the lobby, then the same door. He watches
    from the mezzanine. When the wave breaks through, he steps in.
- **Play.** Rewind's teach room (the turret). Then a defend-the-line level,
  wave by wave. A **gate** set piece: a turret stream across the lobby.
- **Enemies.** Corrupt SWAT, his old colleagues gone wrong. Also henchmen and
  sentinels.
- **Sub-boss.** Shield Commander, "the Captain".
- **Grants.** **Time-Lock**, in the scene after the level. Rook wires Kael's
  shield emitter into the shard. Kael gets the line the Lord's screen deserves:
  "You talk too much." It is moved from `act2_level3`, and here it is the moment
  he chooses to join.
- **Fragment.** voss_2, hidden. "If the Paradox Lord is wearing my pattern, then
  I'm the key."

**II-7 · The Foundry** (New, borrowing the layout language of the arena map
"The Chrono Foundry", `arena.js:117`)

- **Setting.** The fabrication hall where the C-series suits were built. Empty
  suit frames hang on racks, and one rack is missing.
- **Story.** You go on the offensive for the first time: into the Hound's den,
  all five of you.
- **Play.** Time-Lock's teach corridor, then the boss.
- **Enemies.** Echo drones, rift leapers, phase stalkers.
- **Boss.** **The Hound (C-0016).**

| # | Level | Map | Recruit | Grants | Boss |
|---|---|---|---|---|---|
| II-1 | Evac Shafts | New | **Lyra** joins | Foresight | none |
| II-2 | Salvage Deck | New | **Rook** met | none | Shield Commander |
| II-3 | Maintenance Spine | New | Rook joins | Chrono Dash + tuning | Temporal Summoner |
| II-4 | Transit Loop | New | **Nova** met | none | none |
| II-5 | The Greenhouse | New | Nova runs, comes back | Rewind Echo | none (Hound in scene) |
| II-6 | The Precinct | Remix (tutorial) | **Kael** earned | Time-Lock | Shield Commander |
| II-7 | The Foundry | New | full squad | none | **The Hound** |

**Beat sheet.**

- **Opening:** `act2_transition_fb`, recaptioned "ACT II — THE GATHERING". Its
  panel "This time, you don't walk back in alone" is kept. Then
  `gathering_extraction`: the collapse, the channel voice.
- **Chapter 1, Lyra.** `gathering_lyra`: the lift, and her face at last. She
  introduces herself as Analyst L.M.: "You found my flag. Good. I've been
  steering this case from inside Bureau ops since before you put the suit on."
  She is the one who routed it to you. This fixes problem 2. Here come the fixed
  point, the bell, and Foresight.
- **Chapter 2, Rook.** `gathering_rook` (the welding) → II-2 →
  `gathering_rook_shard` (the shard, the Alpha recording) → II-3.
- **Chapter 3, Nova.** `gathering_nova` (the blur) → II-4 →
  `gathering_greenhouse` (the quiet, Miri) → II-5.
- **Mid-act turn:** `hound_attack`: every screen shows one face, then the Hound,
  Nova runs, Nova rewinds back. She was the one most likely to leave, and she
  is the one who proves the Gathering holds.
- **Chapter 4, Kael.** `gathering_kael` (the Precinct, the refusal) → II-6 →
  `gathering_kael_joins` (the door, "You talk too much", Time-Lock).
- **Finale.** `hound_intro` → the Hound → `gathering_finale`:
  - The empty suit falls open.
  - The Lord: *"You took my first draft apart. How rude. How… interesting."*
  - Then the found-family montage from `act2_intro` (`:1760-1801`), which now
    means something: "Nobody gives a speech", Lyra and the coffee, "He never
    counted the people next to you".
  - END OF ACT II — THE GATHERING.
  - Then `lyra_reveal`, existing and moved here: the fixed point in full, and why
    you remember a squad nobody else does.

---

#### ACT III — THE HUNT (7 levels: 2 new, 5 remixes)

Roster: corruptCop, henchman, beast, phaseStalker, chronoBomber,
temporalEngineer, shieldCommander, timeWarden. That is today's Act 2 roster plus
wardens. Hunters: riftLeaper, echoDrone, timeWarden. Palette: Act 3's
violet-crimson moves here, and Act IV gets a new, harsher palette. Squad comms:
all four.

The station has been rewritten. "There's architecture in here nobody built"
(`act2Ambient`, `dialogue.js:298`). Every remix in this act is a place from Act
I, *changed*. That is the point of it.

**III-1 · The Rewritten Wing** (Remix: Checkpoint and Research merged)

- **Story.** "Same corridors. Better company" (existing `act2_level2`, `:1818`).
  It is the squad's first operation together.
- **Play.** Walls that re-arrange on a timer (a slow `collapse` that opens as
  well as closes). Shift to read them.
- **Enemies.** Corrupt SWAT, henchmen, phase stalkers.
- **Sub-boss.** Shield Commander.

**III-2 · Server Farm Siege** (Remix of Server Farm)

- **Story.** `act2_level5` as written: "Every rack we burn, he loses a century
  of stolen timelines." Nova: "Then let's bankrupt him." The Kai reconstruction
  frames play here.
- **Play.** Burn the racks while the squad holds lanes.
- **Enemies.** Temporal engineers, chrono-bombers, wardens.

**III-3 · Reactor Overload** (Remix of Reactor Access)

- **Story.** `act2_level6`: "If it blows, this sector loops. Same explosion.
  Every day. Forever." Kael takes the blast doors. This sets up his last stand.
- **Play.** A coolant-valve sequence against a heat clock, where a shift
  stretches the window. The Vent Gallery is now a required path.
- **Enemies.** Beasts, chrono-bombers.
- **Sub-boss.** Temporal Summoner.

**III-4 · The Lord's Laboratory** (Remix of Voss Lab) — *the mid-act turn*

- **Story:**
  - `act2_level7`, unused until now: rewind logs everywhere, the same eleven
    seconds, thousands of takes, the station gone in every one. *Except one.*
  - Then `voss_confrontation`: "You read my file… I wasn't wrong. Just early."
  - The turn is what the one surviving take shows: **a fixed point walks into
    the Core alone.** Lyra reads it first. You see her close the screen. She
    says nothing, and that silence is Act IV's fuse.
  - The Voss reconstruction frames play here ("your tactician. Younger. Kinder
    eyes."), with the signature match at 67%.
- **Enemies.** Time wardens, phantoms.
- **Sub-boss.** Temporal Summoner.
- **Fragment.** voss_3, visible, "Ninety-Four Percent". The match climbs to 94%
  on this level's debrief, and it stays 94 everywhere after. This fixes problem 7.

**III-5 · The Archive of Rewinds** (New)

- **Setting.** Where Voss keeps his takes: room after room replaying the same
  eleven seconds.
- **Story.** Every room is a version of the night, and some versions include
  you. You watch yourself lose, again and again.
- **Play.** **Loop rooms**, where an explosion replays every eleven seconds.
  Foresight shows the next one and Rewind lets you retry a crossing.
  **Stasis** galleries hold the story.
- **Enemies.** Echo drones, which are the echoes; rift leapers.
- **Fragment.** miri_3, visible.

**III-6 · The Chronos Engine** (New)

- **Setting.** The Engine hall itself, stopped at T-00:00:11.
- **Story.** You walk through the frozen instant the experiment ran. Voss is at
  the console, one hand on the lever. In the stasis you see what nobody else can
  see: *two* of him. One is reaching for the lever. One is reaching to stop him.
  Same man, different choice, and you are standing in the moment it split.
- **Play.** A long **stasis** walk that becomes a fight when you leave the
  frozen field. Wardens guard the Engine.
- **Enemies.** Time wardens, sentinels, rift leapers.
- **Fragment.** kai_3, visible, "The Door Holds".

**III-7 · The Paradox Core, second visit** (Remix of the Core: broken rings, new
cover)

- **Story:**
  - `level3_briefing`, unused until now: the Lord's parable, "There was a man
    who taught time to sit and stay… He could save anyone. Except himself." Now
    the player knows who he means: squad-Voss, the better self who became the
    cage (voss_3). The Lord is mocking him.
  - Then `act2_level9`: "You brought them to watch." Kael: "Then we'll make one."
  - Then **Form 2**.
  - Then `act2_victory`: "You actually hurt me… I'll need to revise… Meet what
    I became." Lyra: "We can do this. Us."
- **Boss.** **Paradox Lord, Form 2** (Counter-shift, Replay).

**Beat sheet.**

- **Opening:** a new `bonds_transition_fb` flipbook ("ACT III — THE HUNT"),
  then `bonds_intro`: the squad plans an offensive for the first time. "The Lord
  thinks this is a numbers game. He's counting wrong."
- **Chapters:** III-1 to III-3 are operations. Each one features one ally
  leading, and each ends in a debrief line.
- **Mid-act turn:** III-4, the one surviving take.
- **The descent:** III-5 and III-6, into his past and to the moment of the split.
- **Finale:** III-7, then `act2_victory`, then END OF ACT III — THE HUNT.

---

#### ACT IV — THE SACRIFICE (7 levels: 1 new, 4 remixes, 2 variants)

Roster: beast, riftLeaper, timeWarden, temporalSummoner, echoDrone, sentinel,
phaseStalker (today's Act 3 roster). Palette: a new Act 4 base, a white-hot rift
light bleaching the Act 3 violet. Squad comms: shrinking, one voice at a time
(§9).

**IV-1 · Entry — Last Time** (Remix of Entry)

- **Story.** `act3_transition_fb` (recaptioned "ACT IV"), then `act3_intro` (he
  has rewound this war more times than you've breathed; Lyra: "someone walks
  into the Core alone"), then `act3_level2` ("You're not going alone" / "Don't
  you DARE"). The line "Seven wings" changes to **"Six wings"**.
- **Play.** The airlock where the game began, now falling toward the rift. The
  lobby collapses around the fight.
- **Enemies.** Beasts, sentinels, phase stalkers.

**IV-2 · The Loop** (New)

- **Story.** `act3_boss`: his voice on every speaker: "I'll take them from you
  one wing at a time. And save you for last."
- **Play.** A district caught in a loop. The corridor repeats. Foresight shows
  the seam where the loop doesn't match itself, and a rewind through the seam
  breaks it.
- **Enemies.** Echo drones, rift leapers.

**IV-3 · Containment — Last Stand** (Remix of Containment)

- **Story.** `act3_level4`: Kael's shield splits. "I lost my last squad because
  I hesitated. Not today." He stays at the blast doors. That is his arc closed
  at the same kind of door he failed at.
- **Play.** A fighting retreat to the doors.
- **Enemies.** Time wardens, beasts.
- **Sub-boss.** Temporal Summoner.
- **Parting gift (Open question 9).** Time-Lock lasts 6 s from here on: "Take
  the rest of it."

**IV-4 · Temporal Nexus — The Decoy** (Reuse of the Nexus, map 8, lightly
remixed)

- **Story.** `act2_level8` (Nova's running echo: "Still not this time"), then a
  new `nova_decoy`. This time Nova runs *on purpose*, toward the hunters, pulling
  every one of them off your path: "Race you. Spoiler: I already won." Running
  becomes her gift instead of her flight.
- **Play.** Four approach corridors. The hunter pack peels away with her, and
  the rest of the level is yours.
- **Enemies.** Rift leapers, phase stalkers.

**IV-5 · The Archive Burns** (Variant of III-5)

- **Story.** `act3_level5`: Rook wires charges. "Fry his data cores and he
  loses the precognition. For once, he won't see us coming." He stays to blow
  it. He also hands you Kai's anchor, finished: *"Kai's math was right. I
  checked it a third time."* This closes the kai_2 thread. The anchor is what
  seals the Core at the end.
- **Play.** The Archive with a spreading fire clock. The loop rooms now loop
  toward the flames.
- **Enemies.** Echo drones, wardens.

**IV-6 · The Engine — Firing** (Variant of III-6)

- **Story.** `act3_level6`, reworded so the reactor becomes the Engine: "The
  Engine fires once. Enough to crack his armour. Someone stays behind to pull
  the trigger. That's me." Then `act3_level8`: "Lyra's window opens once… her
  voice in your ear: coordinates, then your name." She knew since III-4. She
  records one line for you before you go. You will hear it in the Core.
- **Play.** The Engine hall, now awake. Fight to the Core door on her countdown.
- **Enemies.** Wardens, sentinels, summoners.

**IV-7 · The Paradox Core — Endgame** (Remix of the Core: rings gone, open
floor, rift walls)

- **Story:**
  - First `act3_level7`, unused until now: "Voss. Miri. Kai. You lost people
    too… You could have become him. You found new people. He burned the rest
    down."
  - Then `act3_level9`: you walk in alone. "The comms go quiet. You're not alone
    anyway."
  - Then **Form 3, Eleven Seconds**.
  - Then `true_victory` and the new `epilogue_message` (§10).
- **Boss.** **Paradox Lord, Final Form.**

| # | Level | Map | Who stays behind | Boss |
|---|---|---|---|---|
| IV-1 | Entry — Last Time | Remix (Entry) | none | none |
| IV-2 | The Loop | New | none | none |
| IV-3 | Containment — Last Stand | Remix (Containment) | **Kael** | Temporal Summoner |
| IV-4 | Temporal Nexus — The Decoy | Reuse+ (Nexus) | **Nova** | none |
| IV-5 | The Archive Burns | Variant (III-5) | **Rook** | none |
| IV-6 | The Engine — Firing | Variant (III-6) | **Lyra** | none |
| IV-7 | Paradox Core — Endgame | Remix (Core) | you, alone | **Final Form** |

They leave in exactly the reverse of the order they joined. Lyra, first in, is
the last to let go.

### 8. Memory fragments by act

The nine existing fragments keep their text. Their `(act, level)` tags move with
the new table. A new set of three for Act IV is proposed (Open question 11).

| Act | Voss | Miri | Kai |
|---|---|---|---|
| I | voss_1 "The Last Briefing": I-3, visible | miri_1 "Field Sutures": I-4, hidden | kai_1 "Impossible Machines": I-2, visible |
| II | voss_2 "Echoes in the Signal": II-6, hidden | miri_2 "The Promise": II-5, visible | kai_2 "Blueprint for Tomorrow": II-3, hidden |
| III | voss_3 "Ninety-Four Percent": III-4, visible | miri_3 "Last Breath, Longest Reach": III-5, visible | kai_3 "The Door Holds": III-6, visible |
| IV (new) | voss_4 "The Other Choice": a stasis room in IV-2 | miri_4 "The Lullaby" (the words ARIA never learned): IV-3 | kai_4 "The Anchor": IV-5, when Rook hands it over |

- Act I's placements are unchanged, because its level numbers are unchanged.
- The rule in `memory-fragments.js:1-9` still holds: a visible fragment can't
  sit on a boss level.
- Act II pairs each fragment with the recruit who echoes it:
  - Kai's blueprint is found with Rook, the other engineer.
  - Miri's promise is found in the green place.
  - Voss's warning is found where Kael, the other leader, joins.

### 9. Squad comms presence

This replaces `getPresentSquad` (`squad-comms.js:38-48`) with a `squad` list on
every level entry. The same list drives the party art in that slot's scenes.

| Act | Who is on comms |
|---|---|
| I | nobody (ARIA only; boss chatter ARIA-only) |
| II-1 | Lyra (as the channel voice, then by name) |
| II-2 | Lyra (Rook's first comms line at the exit) |
| II-3 | Lyra, Rook |
| II-4 | Lyra, Rook (Nova from mid-level) |
| II-5 | Lyra, Rook, Nova |
| II-6 | Lyra, Rook, Nova (Kael silent until the end) |
| II-7 | all four |
| III | all four |
| IV-1 to IV-3 | all four (Kael silent after IV-3's exit) |
| IV-4 | Nova, Rook, Lyra (Nova silent after IV-4's exit) |
| IV-5 | Rook, Lyra |
| IV-6 | Lyra |
| IV-7 | nobody. Then her recorded line, once, in the Form 3 phase (§6). |

Boss-phase squad chatter (`bossPhase1Squad` to `bossPhase3Squad`) is keyed to
the fight, not the form number:

- The Act I Lord is ARIA-only.
- The Hound gets a new `houndSquad` pool.
- Form 2 uses the existing phase-2 and phase-3 lines.
- Form 3 is silence, then Lyra's recording.

### 10. The ending, and the NG+ hook

- **The ending stays.** `true_victory`:
  - The Final Form shatters, and "That was never in the math."
  - You wake in the medbay with a full room: Kael in the next bed, Nova who
    dragged him out, Rook's nod, Lyra's hand.
  - The observation deck, "…my idiot."
  - The names of the dead.

  It already matches the new Act IV exactly: Kael held the doors, Nova ran, Rook
  burned the Archive, Lyra fired the Engine.
- **One new beat after it, `epilogue_message`.**
  - Lyra alone at the Engine console, weeks later, recording: *"Agent. Don't
    touch the reactor. I've seen how this ends. Keep moving. I'll find you. I
    always do."*
  - She sends it back through the last of the rift, to a cadet in Act I.
  - ARIA: "So that's who it was."

  This closes the encrypted-channel loop that `encryptedChannelReveal` gestures
  at (`dialogue.js:316`), on screen instead of in an idle bark.
- **The NG+ hook.** "His death left an echo. It's rewinding the station.
  Everything resets. Everything except you" (existing `ng_plus_cycle_1`).
  - In NG+ you keep all four powers. They are in the suit, and you are the fixed
    point.
  - **Your allies do not remember you.** The recruit scenes play déjà-vu
    variants: shorter, and each ally stops once as if they almost know you. Nova:
    "Have we raced before?"
  - `origin_panels` ("Chronos Station. 06:47. A routine shift…") becomes the NG+
    opener. It is the loop restarting, told as a comic. `ng_plus_intro` stays as
    the fallback.
- **The true ending needs a shorter gate.** With a 29-level campaign, NG+3 means
  116 levels before `ng_plus_true_ending`. Proposed: completing **NG+1 with all
  twelve fragments** unlocks `ng_plus_true_ending`, where Voss, Miri and Kai
  come back. NG+2 and NG+3 stay as challenge loops with their existing scenes.
  This is Open question 2.

### 11. Scene ledger: what happens to every existing cutscene

Keys stay as they are. The act table is the one place that says which key plays
in which slot. That means no renames, no drift in `cutscene-keys.js`, and no save
churn. New keys are named for their content, never for an act number, so they
can never again be wrong about where they play.

| Existing key | New home |
|---|---|
| `intro_flipbook`, `clocking_in`, `intro`, `intro_memory_01` | Act I opening, unchanged |
| `security_briefing` … `voss_lab_briefing` | I-2 … I-7, unchanged, plus two seed lines |
| `nexus_briefing` | its lines fold into I-8. The key moves to IV-4 as an optional pre-brief. |
| `paradox_core_briefing` | I-8 |
| `false_victory` | I-8 end. Add the "I felt that" line and change the end card to THE FALL. |
| `act2_transition_fb` | Act II opener, recaptioned THE GATHERING |
| `act2_intro` | **Split.** Lyra's bedside frame becomes her lift scene (II-1). The crew taglines go into each recruit's own scene. The montage frames (`:1760-1801`) go to `gathering_finale`. |
| `act2_level2` | Nova's blur and tagline: `gathering_nova` (II-4). Her confession: after II-5. "Same corridors. Better company": III-1. |
| `act2_level3` | Voss reconstruction: III-4. Every-screen taunt: II-5 (re-cast). Kael's "You talk too much": II-6. |
| `act2_level4` | Rook welding and tagline: `gathering_rook` (II-2). Miri reconstruction: II-5. |
| `act2_level5` | III-2, including the Kai reconstruction |
| `act2_level6` | III-3 |
| `act2_level7` *(unused)* | III-4, the mid-act turn |
| `voss_confrontation` | III-4 |
| `act2_level8` | IV-4 |
| `act2_level9` | III-7 |
| `act2_victory` | Act III end. The card becomes END OF ACT III — THE HUNT. |
| `lyra_reveal` | Act II end, after `gathering_finale` |
| `act3_transition_fb` | Act IV opener, recaptioned ACT IV |
| `act3_intro`, `act3_level2` | IV-1 ("Six wings") |
| `act3_boss` | IV-2 |
| `act3_level4` | IV-3 |
| `act3_level5` | IV-5 |
| `act3_level6` | IV-6 (reactor becomes the Engine) |
| `act3_level7` *(unused)* | before IV-7 |
| `act3_level8` | IV-6 (the window) |
| `act3_level9` | IV-7 |
| `level3_briefing` *(unused)* | III-7, the parable reframed |
| `the_hunt_begins` *(unused)* | II-3, as the Alpha recording inside the suit |
| `origin_panels` | NG+ opener (it leaves Act 3, slot 7) |
| `intro_memory_01_extended` *(unused)* | NG+ memory variant |
| `true_victory`, `ng_plus_*` | unchanged, plus the new `epilogue_message` |
| `level2_briefing`, `coming_soon` | retired (see the table in Current state) |

New keys, about 17:

- **Act II:** `gathering_extraction`, `gathering_lyra`, `gathering_rook`,
  `gathering_rook_shard`, `gathering_nova`, `gathering_greenhouse`,
  `hound_attack`, `gathering_kael`, `gathering_kael_joins`, `hound_intro`,
  `gathering_finale`
- **Act III:** `bonds_transition_fb`, `bonds_intro`, `archive_briefing`,
  `engine_briefing`
- **Act IV:** `nova_decoy`, `epilogue_message`

Each one goes in `cutscene-keys.js` in the same commit that adds the script.

### 12. Cast bible

**The Cadet ({AGENT}, Badge 11235).** *Want:* to do the job. Show up, clear
the scene, go home. *Wound:* three years a cadet, the Alpha exam failed twice,
"too slow, too stubborn." Worse, they remember a squad the records say never
existed. *Voice:* almost silent. Dry inner narration in cutscene captions ("You
live. Barely. Mostly out of spite."). *Arc:* from lone wolf, to the person four
strangers decide to follow, to the one who walks into the Core alone because
they have people worth doing it for. Not despite them. The stubbornness that
failed the exam is the thing time can't bend.

**ARIA.** *Want:* keep this one cadet alive. Sample size, one. *Wound:* the
new one. ARIA is the one who burned out the governor in the Core, and every time
the Lord finds you, that's on her. *"I'd do it again. I just want you to know I
know."* Underneath, she remembers things she shouldn't. "I came online this
morning," yet she recognises Voss's briefing (voss_1). *Voice:* quick, warm,
teasing, and precise under stress. *Arc:* from wisecracking assistant, to the
one who confesses she made you audible, to the last voice left when all the
others go quiet in IV-7: "I'm still here. I'm always here."

**Dr. Elias Voss, the Paradox Lord.** *Want:* control. To have been right.
*Wound:* seven years of "no". Then eleven seconds holding all of time, and ten
thousand rewinds of a station that dies every take, until he stopped trying to
save it. *Voice:* amused, vain, patient, cruel in a courtly way. He monologues
and knows he's doing it ("How very mortal of me"). *Arc:*
- In Act I he is untouchable.
- In Act II he is curious about the thing he can't model.
- In Act III he is hurt for the first time and has to revise.
- In Act IV he is desperate, spending his own eleven seconds as a weapon, and
  then undone by the one variable he never ran: someone walking in knowing they
  won't walk out.

**Voss, your tactician (the other choice).** *Want:* the right fights, not
every fight. *Wound:* he knew what the Lord was to him and kept quiet. *Voice:*
steady, dry, one finger on the map. "We don't win every fight. We win the right
ones." *Arc:* seen only in fragments. He fed himself into the paradox and became
the cage holding his other self in place. The Lord mocks him in III-7 and fails
to understand him. He is the proof, all game long, that the same man could
choose differently.

**Lyra Marsden (Analyst L.M.).** *Want:* for someone to listen to the end.
*Wound:* she was right about Voss three times, and three times her reports were
deleted. She watches timelines die for a living. *Voice:* amber, low, exact. She
drops lore sideways, then goes very quiet when it's personal. *Arc:*
- She is the first to join, because she was already there. She routed you the
  suit, she was the voice at the reactor, and she pulls you out of the Core.
- She mirrors Voss: both brilliant, both ignored. He chose time. She chose
  people.
- She finds the one surviving take in III-4 and carries it alone. Then she
  stays behind to fire the Engine that broke the world, on purpose, for you.
- She is also the last to let go, and the one who wakes you: "You promised."

**Rook.** *Want:* machines that work and doors that hold. *Wound:* he was on
the Chronos Engine maintenance crew. His safety interlocks were the ones Voss
walked through that night, and he has not trusted a person since. *Voice:*
gravel, terse, gallows-dry ("Systems nominal. Mostly."). *Arc:*
- He protects the doors, not you. Then he opens your suit and finds the storm
  inside. Then he trusts you enough to tune it.
- He pockets Kai's blueprint in Act II and finishes it in Act IV. One engineer
  completes another's work across an erased timeline.
- He burns the Archive he helped power: *"Machines I built for him. Time I
  unbuilt some."*

**Nova.** *Want:* to never be the last one standing again. *Wound:* the day
the world ended, she ran, and everyone she left stayed gone. *Voice:* fast,
cocky, generous under the sarcasm ("Race you. Spoiler: I already won."). *Arc:*
- She runs when the Hound comes, which is her flaw at the worst moment.
- She comes back by going backwards, which is her gift.
- In Act IV she runs one last time, *toward* the danger, as the decoy. Running
  stops being what she does to survive and becomes what she does for you.

**Kael.** *Want:* to hold the line, alone if he has to, because that way nobody
else pays. *Wound:* his squad died upstairs in the Precinct the morning of the
collapse, while he hesitated at a door. You heard it happen, on the Supervisor's
radio, in the prologue. *Voice:* deep, even, few words. Orders that sound like
promises ("Nobody falls today. That's not a hope. That's an order."). *Arc:*
- He is the last to join, because he refuses. You earn him by holding his line
  without him until he can't stand watching.
- He gives you the power to hold a line.
- In Act IV he holds a door again, this time without hesitating, and lives
  (Nova drags him out).

**Miri** and **Kai** (the dead squad). Miri was the medic who hummed a lullaby
and spent her last stabiliser on you. She wanted a clinic somewhere green. Kai
was the engineer who built impossible machines and held a door shut from the
wrong side. They exist only as fragments, stasis-room echoes and, at the true
ending, as the three people at the table who shouldn't be there.

**The Hound (Suit C-0016).** The prototype before yours. Its wearer drifted out
of it years ago. It has no voice. It *listens*. It is what you would have been
without the fixed point, and the Gathering's proof that you're not alone in the
suit anymore.

### 13. Voice notes for the audio spec

Short identity notes for the procedural babble voices, nothing more:

- **ARIA:** bright, bell-like synth blips. Quick syllable rate, a small upward
  lilt at phrase ends, very slight pitch jitter. Digital, not cold.
- **Voss, the Lord:** low, slow and detuned, with a sub-octave double and a short
  *reversed* tail on each syllable, as if the sound runs backwards into itself.
  A glitch stutter on form changes.
- **Voss, the tactician (memories):** the same base pitch as the Lord, but warm,
  in tune, with no reverse tail. The player should feel the resemblance before
  they understand it.
- **Lyra:** mid-low, soft triangle tone, gentle vibrato, measured pace. Real
  pauses between clauses.
- **Rook:** gravelly square-wave, low, clipped. Fewest syllables per line,
  flat intonation.
- **Nova:** high, fastest rate, short bursts, rising pitch, and she clips her own
  endings.
- **Kael:** deep and steady, even tempo, almost no pitch variance. A wall that
  talks.
- **The player:** silent by default. In the rare spoken moments, a neutral mid
  voice pitched from the agent creator's settings.
- **Miri / Kai (memories):** Miri warm and hummed. Kai bouncy mid, a little
  fast. Both run through a light "memory" filter.

### 14. Map budget and build order

| Act | Levels | Reuse | Remix | New | Variant |
|---|---|---|---|---|---|
| I | 8 | 8 | none | none | none |
| II | 7 | none | 1 (Precinct, from tutorial) | 6 | none |
| III | 7 | none | 5 | 2 (Archive, Engine) | none |
| IV | 7 | 1 (Nexus, light touch) | 3 (Entry, Containment, Core) | 1 (Loop) | 2 |
| **Total** | **29** | 9 | 9 | **9** | 2 |

That is **9 brand-new grids and 9 remixes, 18 grids to author**, plus two cheap
variants and the Nexus touch-up. Today there are 9 grids, played 27 times.

- **All maps stay code-built** with `map-helpers.js`, at 60×60 with a
  `heightMap`, and pass `tests/unit/map-integrity.test.js`. A remix is a
  builder that calls the original builder, then re-carves, adds hazards and
  replaces the entity list.
- **The Forge's legacy converter does not help here.**
  `src/world/legacy-convert.js` goes the other way: 2D map to voxel world.
  Nothing converts a Forge world back into a campaign grid.
- **Build order follows shipping order:** Act II's six new maps first, since
  they carry the most story; then Act III's two new maps and five remixes; then
  Act IV. Within an act, build the finale arena first. It has the most
  mechanical risk, and every other level can be played on a placeholder while
  it is being built.

### 15. CODE IMPACT

**An act becomes data.** New `src/data/campaign/acts.js`:

```js
export const ACTS = [
  {
    id: 1, title: "THE FALL", palette: 1, resonance: false,
    roster: [...], substitutes: {...}, scale: 1.0, hunters: [],
    boss: { type: "boss", card: { title: "PARADOX LORD", subtitle: "FIRST INCURSION" },
            aria: "bossEncounter", squadPool: null },
    outro: ["false_victory"], ambient: "act1Ambient",
    levels: [
      { map: "entry", rotation: 0, seed: 7919, env: "entry",
        briefing: null, squad: [], grants: [], onStart: [] },
      { map: "checkpoint", rotation: 90, seed: 7919 + 104729, env: "checkpoint",
        briefing: ["security_briefing"], squad: [], grants: [] },
      // ...
    ],
  },
  // acts 2..4
];
```

- Maps are registered by id in a `MAPS` registry, not by index.
- `LEVEL_ENVS` is keyed by env id.
- Rotation and seed live on the level entry. Phase 1 copies today's values
  exactly, so no existing map changes by a single tile.
- `onStart` carries the one-shot lore barks that are hard-coded today, for
  example `{ aria: "encryptedChannelReveal", delay: 3000 }`.

**Every hard-coded act or level count to generalize:**

| Where | What | Becomes |
|---|---|---|
| `js/campaign-manager.js:170, :178, :318` | `CAMPAIGN_LEVELS[index]` and `.length` bounds, the same list every act | `ACTS[act].levels[level]` and its length |
| `campaign-manager.js:234-240` | boss detected by three type names | `isBossEnemy` reading a `def.boss` flag |
| `campaign-manager.js:242-248` | `form = this.act`, ARIA key per form | `act.boss.aria`, `act.boss.squadPool` |
| `campaign-manager.js:256-260` | `BOSS_NAMES` 1-3 | `act.boss.card` |
| `campaign-manager.js:266` | squad chime at `act >= 2` | `level.squad.length > 0` |
| `campaign-manager.js:272-282` | Act 3 lore reveals and NG+ bark hard-coded | `level.onStart` |
| `campaign-manager.js:286` | `applyActPalette(act, level)` | `(act.palette, level.env)` |
| `campaign-manager.js:315` | `campaignLevelsCleared = max(…, this.level)`: a per-act index, so it never passes 9 and means something different in every act | cumulative progress, the levels in cleared acts plus the current level |
| `campaign-manager.js:334-365` | `actBriefings` act×level table | `level.briefing` (a chain of keys) |
| `campaign-manager.js:390-432` | `handleBossKill` branches `act === 1`, `=== 2`, else | `act.outro` chain, then `act + 1`, or victory when it is the last act |
| `campaign-manager.js:458-484` | NG+ restarts at act 1 level 0; true ending at `ngPlusCycle >= 3` (`:437`) | data-driven start and gate (§10) |
| `src/systems/spawner.js:232-235` | `boss` becomes `boss_form2`/`boss_form3` by act number | the level names its boss type directly |
| `spawner.js:237` | `actScale = 1 + (act-1)*0.4` | `act.scale` |
| `spawner.js:350-416` | `ACT_ROSTERS`, `ACT_SUBSTITUTES`, fallback to act 1 | `act.roster`, `act.substitutes` |
| `src/systems/squad-comms.js:38-48` | `getPresentSquad(act, level)` hard-codes acts 1-3 | reads `level.squad` |
| `squad-comms.js:136-144` | `onBossPhase` ignores presence | gated on presence, pool from the act |
| `src/systems/aria-comms.js:183-191` | `_pickIdlePool` knows acts 2 and 3 only | `act.ambient` (fixes dead `act1Ambient`) |
| `src/data/memory-fragments.js` (comment `:4-9`) and `js/game.js:1623-1628, :2074-2078` | act 1-3 × level 1-9, `level + 1` | the same shape, with numbers from `ACTS`; a unit test pins every tag to a real non-boss slot |
| `src/data/levels/campaign.js:23, :25-31` | `ROTATIONS[9]`, seeds by index, `CAMPAIGN_LEVELS` concat | `MAPS` registry; rotation and seed per level entry |
| `src/data/levels/act1-maps.js`, `act2-maps.js`, `act3-maps.js` | misnamed (each holds three of the nine Act I maps) | rename to `station-maps.js` (or one file per map) in phase 1 |
| `src/rendering/env/palettes.js:13-58, :74, :185-187` | `ENV_PALETTES` 1-3 with fallback to 1; `LEVEL_ENVS` by level index | add palette 4; key envs by id |
| `js/renderer.js:522-526, :697-701` | `actFog` branches for acts 2 and 3 | read `fogNear` from the resolved palette |
| `src/rendering/render-pipeline.js:523-530` | `actHorizon` branches | the same, from the palette |
| `src/rendering/weather.js:109-120` | weather by act 1/2/3 | `act.weather` |
| `src/rendering/env/paint.js:506, :515, :536, :767` and `wall-art.js:67-84, :215-216, :404, :572` | act-number branches in texture painting | palette fields (for example `rust`, `sky`, `bronze`), not act numbers |
| `src/data/enemies.js:111-165`; `combat.js:127-131`; `hud-modern.js:279`; `hud.js:929-930, :1782`; `ai.js:478-479`; `rendering/enemies/index.js:23-24`; `svg-art/sprites/boss.js:120-121`; `forge-hud.js:22` | boss type lists repeated in ten places | one `def.boss` flag and `isBossEnemy`; add `hound` |
| `src/systems/unlocks.js:73-91` | backfill assumes 9 levels (`campaignComplete ? 9`) and 3 acts (`? 3`) | totals from `ACTS` |
| `src/data/badges.js:37-39, :90, :134-136` | "Second/Final Incursion" = acts 2/3 | re-key to *Lord defeats*: I, III, IV. Add a Hound badge for II. Earned badges are never revoked. |
| `src/data/cosmetics.js:217, :264, :307`; `accessories.js:13` | "Clear Act 1" = 3 levels, "Clear Act 2" = 6: stale from three-level acts | switch to `campaignActs` rules |
| `src/core/save-system.js:16, :245, :296` | `SAVE_VERSION = 1`; a mismatch **silently deletes** the campaign save | v2 with a v1→v2 **migration**, not a wipe (see below) |
| `js/main.js:127`; `src/ui/hud.js:836` | "Level N" with no act | "Act II · The Precinct" |
| `js/testing/playtest-gate.js:243-266` | `[1, 2, 3]`, one boss map, "act+1 at level 0" | iterate `ACTS`: every level, each act's boss, victory after the last |
| `js/testing/harness.js:376-382, :593, :697`; `debug-bridge.js:569` | `CAMPAIGN_LEVELS` list and boss type list | `MAPS` / `ACTS` |
| `src/data/cutscene-keys.js` | key list | plus about 17 new keys |

**Required art and code change: party art shows recruited members only.**

- Both renderers take a member list:
  - `partyModel()` (`svg-art/models/cast.js:836`), which hard-places K/L/Y/N/R
  - the Legacy `party` case (`cutscene-art.js:1747`)
- They re-centre whoever is present: two, three, four or five figures.
- A frame can name its members (`party: ["lyra", "you", "rook"]`). If it
  doesn't, the list comes from `level.squad` for that slot plus the player.
- The rasterised SVG cache key must include the member set.
- **New art is needed:**
  - solo portraits for Kael, Nova and Rook (none exist, `cast.js:1513-1529`)
  - Lyra in field gear for the lift scene
  - the Hound (C-0016) as cutscene art and as a boss sprite
  - Act IV's palette
- All of it is needed in Comic, Modern and Legacy.

**Chronos powers.** Keep them out of `js/game.js`, which is already about 3,000
lines and the ROADMAP's standing concern. The new pure module is
`src/systems/chrono-powers.js`, which owns:

- the thresholds
- Resonance
- the rewind buffer
- the dash branch
- the time-lock plane

`game.js` calls it from:

- `_updateChronoEnergy` (`:1923`)
- `_updateTimeScale` (`:1873`)
- `triggerDash` (`:2130`)

The input layer touches:

- `input-manager.js:43`
- `gamepad.js:161-252, :331-344`
- `touch.js:433, :590, :1102, :1230`
- `controls-screen.js:46`

Other touch points:

- **Player state:** `js/entities.js:102-104, :145`
- **AI intent and hunters:** `src/systems/ai.js:108-112`
- **Projectile capture and replay:** `src/systems/projectile-update.js`
- **HUD:** the eight chrono-bar sites listed in Current state
- **Dialogue pools:** `src/data/dialogue.js`
- **Hazards:** a new `src/systems/chrono-hazards.js`

**Save migration (v1 → v2).**

- Old act 1, levels 0-6, map to Act I, levels 0-6. Old act 1, levels 7 or 8
  (Nexus, Core), map to Act I, level 7 (Core).
- Old act 2 maps to Act II, level 0. The Gathering is a different story; there
  is no honest mid-point to land on.
- Old act 3 maps to Act IV, level 0.
- NG+ cycle, player stats and gear carry over.
- A one-time notice says the act was restarted because the story changed.

This is Open question 12. Anything is better than today's silent delete.

### 16. Phased delivery

Every phase leaves the game fully playable end to end and the suites green.

1. **Data-driven acts, content unchanged.**
   - Build `ACTS` for today's 3 × 9 and the `MAPS` registry. Rename the map
     files.
   - Move briefings, boss cards, rosters, scales, palettes, squad presence and
     the lore barks into data.
   - Replace every hard-coded branch in the table above.
   - A parity test proves the new tables produce the old outputs for all 27
     slots. The playtest gate iterates `ACTS`.
   - There is no save change: indices keep their meaning. **No player-visible
     change.**
2. **The four-act skeleton and the Gathering, on placeholder maps.**
   - Build the ACTS table for I-IV (29 slots) and write the Act II scenes.
   - Re-slot the existing scenes per §11 and add the story seed lines.
   - Party art takes members; the solo portraits come in.
   - Fix problems 4-7 (Act I chatter, `act1Ambient`, the Shield Commander, the
     numbers). Save v2 with migration.
   - Placeholder maps:

     | New level | Placeholder |
     |---|---|
     | Evac Shafts | Reactor Access |
     | Salvage Deck | Containment |
     | Maintenance Spine | Server Farm |
     | Transit Loop | Temporal Nexus |
     | Greenhouse | Research Wing |
     | Precinct | Security Checkpoint |
     | Foundry | the Core, with a placeholder Hound (beast-derived stats, `boss` flag) |

   - Acts III and IV run on their remix sources as-is, with the Archive and the
     Engine standing in on Research and Nexus. The story is complete here; only
     the places are borrowed.
3. **Chronos.**
   - Build `chrono-powers.js`: Resonance and hunter responses, the four powers
     with their inputs on all three devices, the HUD, and the teach cards.
   - Wire the ARIA pools.
   - Build `chrono-hazards.js` with collapse, blade, vent, gate, stasis and
     loop.
   - Teach rooms go into the placeholder maps. Act I's optional Vent Gallery
     goes in.
4. **Act II maps.** The six new grids, the Precinct remix, and the real Hound.
   **Ship Act II.**
5. **Act III maps.** The Archive, the Engine and five remixes, plus Form 2's
   Counter-shift and Replay. **Ship Act III.**
6. **Act IV maps.** The Loop, three remixes, two variants and the Nexus
   touch-up, plus Form 3's Eleven Seconds, `epilogue_message`, the NG+ rework and
   the Act IV fragments. **Ship Act IV.**

`coming_soon` can stand as a "to be continued" card at the end of the last
finished act between phases 4 and 6, if a build ships between them.

## Non-goals

- **Arena, meltdown and the Forge.** No story, maps or powers change there.
  Whether the powers appear in arena is Open question 5.
- **The babble voice system itself.** §13 is notes for that spec, not a design.
- **Branching choices or multiple Act IVs.** IDEAS.md's "choice at Act 2 → two
  different Act 3s" is not part of this.
- **The River of Time / Snake Way** (`IDEAS.md:540`). It is a good idea for a
  post-launch Act V, with the Architect teaching a power. It needs its own art
  language and would compete with Act IV's death-and-waking beat.
- **Localization** (`intro_memory_01_es`).
- **New weapons, a gear rebalance, or new enemy types beyond the Hound.** The
  rosters above use only enemies that already exist.
- **Story triggers inside levels.** Every scene still plays between levels,
  except boss intros. This keeps phase 2 free of a new zone-to-cutscene system.

## Risks

- **Volume is the risk.** 18 grids, about 17 new scenes, three new portraits, a
  new boss and three boss-form reworks is several times the story content the
  project has shipped at once. Act-by-act shipping is the mitigation. The phase
  2 placeholders mean the story can be judged before any map is built.
- **Resonance can feel like a punishment.** If hunters arrive while you are
  already losing, the mechanic reads as the game piling on. Mitigations:
  - hunters pay out energy and gear
  - they are capped per level and never come in boss arenas
  - the setting has a *Story only* mode
  - short shifts are nearly silent

  Tune it against a real playtest, not a spreadsheet.
- **The powers can trivialize combat.** Four powers on one pool, fed by
  +20/+30 per kill, could make Act III easy. Form 2's Counter-shift exists
  partly to put the price back on shifting. Watch the numbers in the playtest
  gate's telemetry.
- **Double-tap rewind fights hold-to-shift.** It may feel mushy on gamepad and
  touch. A dedicated binding is the fallback (Open question 4).
- **Save migration.** Getting it wrong deletes progress silently, which is what
  the current version check already does (`save-system.js:245, :296`).
  Migration needs its own tests from recorded v1 saves.
- **Badges and unlocks change meaning.** "Final Incursion" moves from act 3 to
  act 4. Counts must only go up. A player who finished the old campaign
  (`campaignComplete`) is treated as having cleared all four acts.
- **Three art styles.** Every new portrait, the party re-layout, the Hound and
  palette 4 are needed in Comic, Modern and Legacy. HUD work lands in eight draw
  sites.
- **`game.js` growth.** The powers must land in `src/systems/`, or the
  ROADMAP's "decide the js/ vs src/ endgame" gets harder.
- **The WebGL blind spot.** Foresight ghosts, the time-lock plane and the
  palette 4 fog must be checked with GPU-flag captures. Default headless has no
  WebGL and misses GL-only bugs.

## Testing

**Vitest** (`tests/unit`, local tooling, gitignored):

- **`acts.test.js`, the shape of the story as data:**
  - every level's map id resolves in `MAPS`
  - every briefing key is in `CUTSCENE_KEYS`
  - each act has exactly one boss level, and it is the last one
  - squad lists only name cast members
  - in Act II, nobody is present before their join slot and presence never
    shrinks
  - in Act IV, presence only shrinks
  - `grants` are unique, and `powersFor` is monotonic
  - every act has a palette, roster, boss card and outro
- **Phase-1 parity:** for all 27 old slots, the ACTS-derived briefing key,
  roster, substitutes, boss type, scale, squad, palette, rotation and seed equal
  the pre-refactor values. They are captured as a fixture before the refactor.
- **Memory fragments:** every `(act, level)` tag resolves to a real slot, and no
  visible fragment sits on a boss level. This extends `archive.test.js`.
- **`chrono-powers.test.js`:**
  - Resonance gain, decay and thresholds
  - hunter caps per difficulty, and the 45 s cooldown
  - the rewind buffer (3 s window, health rule, cap +35)
  - Chrono Dash cost, cooldown and distance
  - time-lock capture and release, with projectiles conserved (none vanish)
  - Rook's thresholds apply only after II-3
- **`chrono-hazards.test.js`:** hazard state as a pure function of the level
  clock, so a save and load mid-collapse resumes identically.
- **Save migration:** v1 fixtures for act 1/2/3 at several levels, plus NG+,
  each migrates to the documented slot with stats intact.
- **Unlocks and badges** with four acts: backfill from `campaignComplete`, and
  no badge ever lost.
- **Party art:** the member list for each scene slot matches `level.squad`.

**Playtest gate** (`js/testing/playtest-gate.js`):

- Iterate `ACTS`: run every non-boss level, kill each act's boss, assert the
  next act opens at level 0, and assert VICTORY after the last act.
- From phase 3, also assert the power set at each slot and that no hunter
  response fires in Act I.

**E2E** (Playwright, run with `CC_TEST_PORT=5173`):

- `tests/playtest-gate.spec.js`, unchanged in spirit.
- New `tests/campaign-acts.spec.js`, **driven by real key and gamepad events,
  not by assigning fields**:
  - hold `Q` and see `chronoShiftActivated`
  - in II-3, hold `Q` and double-tap `D` for a Chrono Dash through a blade
  - double-tap `Q` for a rewind
  - press `V` and see a projectile hang
- Party-art frame captures in II-2 (two figures) and II-7 (five).
- A v1 save continues into the migrated slot.
- The hidden-pane rule applies: drive headless with `ccDebug`, and use
  GPU-flag captures for anything drawn in WebGL.

## Decisions (answered 2026-09-22)

These supersede anything above that disagrees.

1. **Act III is "The Hunt".** The Act II card and flipbook keep "The Bonds".
2. **True ending at NG+1 with all twelve fragments** (was NG+3). Longer term,
   NG+ adds extra levels rather than only replaying, for replayability and a
   deeper story. That is future scope, not this spec's phases.
3. **Hunter responses default to *Story only* on Easy.**
4. **Rewind gets its own input** (`X` / `LB`-while-shifting / a touch button).
   No double-tap; key combinations stay few.
5. **No powers in arena or meltdown for now.**
6. **Kael's invented backstory stays**, as long as the Precinct tie-in is
   paid off: the Supervisor's radio he carries is the one cut off in the
   tutorial alert, and he recognises your badge number from the duty roster.
7. **The Hound is always visible**, as a stuttering heat-shimmer with
   afterimages, footprints and a tick you can hear; it is only *solid* while
   you shift (see its entry in the boss section). C-0016 as an empty earlier
   suit stays.
8. **Act I runs eight levels**; the Temporal Nexus moves to Act IV.
9. **Parting gifts:** an ally who stays behind in Act IV leaves a final upgrade
   to their power, and only the allies the player has actually recruited do.
10. **NG+:** hunter responses and set pieces get harder, and the recruit scenes
    get a déjà-vu *twist* (allies half-remember you, lines change, one
    recruit happens out of order) rather than being shortened copies.
11. **Write the three Act IV fragments** (voss_4, miri_4, kai_4): twelve in all.
12. **Save migration: restart the current act**, as proposed.
