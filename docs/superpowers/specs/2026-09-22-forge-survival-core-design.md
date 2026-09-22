# Forge Survival Core — Items, Inventory, Skills, Gathering, Crafting

Date: 2026-09-22
Status: Draft for review (revision 2)
Sub-project 4 of the Forge/RPG roadmap (order: suit customization, vertical
engine, Forge usability, skills and crafting). This is spec 1 of 5 within that
fourth sub-project.

## Goal

Turn the Forge from a creative-only level editor into a place that also holds a
survival loop: break a block, get an item, refine it into a building material or
a tool, and build with what you made. The editor keeps working exactly as it
does today.

Success looks like:

- A player starts a Survival world, mines Dirt and Rock, watches a break-progress
  ring fill, and sees items land in an inventory.
- Mining grants Mining XP; the skill levels; higher levels break blocks
  measurably faster and unlock blocks that were refused before.
- A player refines raw drops into building materials and crafts a pickaxe, which
  visibly speeds up mining. Crafting grants Construction XP.
- Construction level gates which recipes are available, so levelling opens new
  things to build rather than only making old things faster.
- Placing a block spends it. Running out means you cannot place.
- Refusals say why ("Requires Mining 15", "Inventory full"), never nothing.
- Progression and inventory persist across worlds, so nothing earned is lost by
  loading a different map.
- Every existing Creative world loads unchanged, with the unlimited palette and
  instant break it has today.

## Current state

- `js/forge.js` (1616 lines) is one `ForgeMode` class. `this.tile` holds the one
  selected block id; `PLACEABLE_BLOCKS` is a fixed array of 14 ids, all always
  available and infinite.
- `placeBlock()` (line 806) and `removeBlock()` (line 814) are the only two block
  mutators, each a short method that calls `_editBlock()`. They are clean seams.
- `handleMouseDown(button)` (line 526) is the whole mouse story. There is **no**
  `handleMouseUp` and no held-button state, so breaking is instant on click.
- `BLOCKS` (`src/world/blocks.js`) already carries a `hardness` per block
  (Dirt 0.5 … Ore 2, Bedrock Infinity). Nothing reads it yet.
- `World.meta` is spread from an object literal and `structuredClone`d wholesale
  by `encodeWorld` (`src/world/world-codec.js`), so new meta fields persist with
  no format change.
- Saves live in IndexedDB `cc_worlds` via `WorldStore`. There is no player record
  of any kind.
- `this.notice` is an existing transient on-screen message with a countdown,
  already drawn by the HUD.

## Scope

This spec: the item model, inventory, skills ledger, gathering rules, the basic
crafting tier, tools, the per-character store, the Creative/Survival mode flag,
and the hold-to-break input plumbing.

Out of scope, each its own later spec in this order: crafting **stations** and
the station-gated recipe tiers; the clickable hotbar redesign; guided onboarding
with contextual hints; shared-build discovery. Also out of scope: any change to
campaign or arena, which stay FPS.

Deliberately deferred: the hotbar stays keys-only for now. Inventory is designed
9 + 27 so the redesign lands against real stacks and is not built twice — a
decision already on record. Tool durability is deferred with stations.

## Decisions taken before this spec

| Question | Decision |
|---|---|
| Creative vs survival | Both. `world.meta.mode` is `'creative'` or `'survival'`, defaulting to `'creative'` so old saves are unchanged. |
| What Mining levelling does | Speed **and** gating. Higher level breaks faster and unlocks harder blocks. |
| What Construction is | A **crafting** skill. XP comes from crafting building materials and tools, never from placing blocks. Level gates which recipes exist. |
| Skills at launch | Two — Mining and Construction — in a data-driven table so later skills need no ledger change. |
| Where progression lives | Per-character, carried across worlds. New `cc_player` store; the v4 world codec is untouched. |
| How it attaches | Thin session adapter (approach A), below. |
| Crafting boundary | Recipes with `station: null` ship here. Station-gated recipes are spec 2; the field exists now and non-null entries are filtered out. |

## Design

### 1. Module layout

Seven new modules under `src/rpg/`. None may import the renderer or
`js/forge.js`; every rule stays testable without a GL context.

| File | Owns |
|---|---|
| `items.js` | `ITEMS` table, stack sizes, block↔item mapping |
| `tools.js` | `TOOLS` table, speed multipliers, best-tool selection |
| `inventory.js` | `Inventory` class — slots, add/remove/merge/split, capacity checks |
| `skills.js` | `SKILLS` table, XP curve, `levelFor(xp)`, `grantXp()` |
| `gather.js` | `canMine()`, `breakTime()`, `dropsFor()`, `xpFor()` |
| `recipes.js` | `RECIPES` table, availability by skill level and station |
| `crafting.js` | `canCraft()`, `craft()` — consumes inputs, yields output, grants XP |

`gather.js` is the only one that imports `blocks.js`; it is the seam between the
world's block table and the RPG's item table.

### 2. Attachment — the thin session adapter

`ForgeMode` gains exactly one field:

```js
this.survival = world.meta.mode === "survival"
  ? new SurvivalSession({ player, inventory, skills })
  : null;
```

`SurvivalSession` owns the modules and exposes five methods to the Forge:
`beginBreak(cell)`, `tickBreak(dt)`, `cancelBreak()`, `tryPlace(cell, itemId)`
and `craft(recipeId)`. `placeBlock()` and `removeBlock()` each grow one branch:
when `this.survival` is null they behave exactly as today.

Rejected alternatives: subclassing `ForgeMode`, because the split points sit
inside methods and overrides would duplicate bodies of an already 1616-line
file; and an event bus, because mining must be able to *refuse*, and a veto is
awkward over an emitter for two call sites.

### 3. Data model

```js
Item       { id, name, stack: 64, blockId? }   // blockId absent => not placeable
Tool       { id, name, mult, tier }            // mult < 1 is faster
Recipe     { id, inputs: [[itemId, n]], output: [itemId, n],
             requires: { construction: L }, xp, station: null }
Inventory  36 slots = 9 hotbar + 27 backpack
Skills     { mining: { xp }, construction: { xp } }   // level always derived
```

Levels are never stored, only derived from XP, so the curve can be retuned
without migrating a single save.

**Player record v1**, in IndexedDB `cc_player`, store `players`, keyPath `id`:

```js
{ id, name, version: 1, skills: { mining: 0, construction: 0 }, inventory: [...], updatedAt }
```

### 4. XP curve, block table, recipe table

Cumulative XP to reach level `L`, shared by both skills, capped at 50:

```
XP(L) = floor(8 * (L - 1) ** 1.85)
```

L5 = 103, L15 = 1,055, L50 = 10,714. In gathered blocks that is about 21 Dirt
to reach Mining 5 (which unlocks Rock, and so the first pickaxe) and about 71
Rock to reach Mining 15 for Ore.

**Gathering** values extend the existing `BLOCKS` entries rather than living in a
parallel table:

| Block | hardness | minLevel | XP |
|---|---|---|---|
| Dirt, Grass, Sand | 0.4–0.6 | 1 | 5 |
| Stone, Tech, Energy, Glass | 0.5–1 | 1 | 10 |
| Door | 1 | 1 | 10 |
| Rock | 1.5 | 5 | 15 |
| Metal | 1.5 | 10 | 20 |
| Ore | 2 | 15 | 35 |
| Secret | 1 | 20 | 30 |
| Boss, Rift | 1–2 | 25 | 50 |
| Bedrock | Infinity | — | never minable |

**Basic crafting tier.** Every recipe refines into a block that already exists,
so this spec adds no new atlas art:

| Recipe | Inputs | Output | Construction | XP |
|---|---|---|---|---|
| Cut Stone | Rock ×2 | Stone ×1 | 1 | 10 |
| Melt Glass | Sand ×4 | Glass ×1 | 1 | 15 |
| Stone Pickaxe | Stone ×3, Rock ×2 | Stone Pickaxe | 1 | 25 |
| Smelt Metal | Ore ×2 | Metal ×1 | 5 | 30 |
| Metal Pickaxe | Metal ×3, Rock ×2 | Metal Pickaxe | 10 | 60 |

**Tools.** `TOOLS.HAND` has `mult: 1.0`; Stone Pickaxe `0.75`; Metal Pickaxe
`0.55`. The best tool held is selected automatically by `tools.js` — there is no
equip UI before the hotbar redesign, deliberately.

Every number in these three tables is a tuning knob in one place, to be set by
playtest. None may be inlined at a call site.

### 5. The loop

**Breaking.** Holding the left button over a block starts a timer:

```
breakTime = hardness * 1000 * tool.mult / (1 + level * 0.03)   // ms
```

`breakTime(block, level, tool = TOOLS.HAND)` takes the tool from the start, so
adding tiers later changes no signature and sweeps no call sites.

A progress ring draws at the cursor. Releasing the button, or looking at a
different cell, cancels and resets progress — partial progress is never banked.
On completion the block becomes `AIR`, `dropsFor()` puts an item in the
inventory, and `xpFor()` grants Mining XP.

This needs new input plumbing: a `handleMouseUp(button)` on `ForgeMode` and a
held-button flag. `js/game.js:691` already routes `handleMouseDown` and is the
one place a matching mouse-up listener is added. `handleMouseDown` keeps its
current instant behaviour in Creative.

**Crafting.** A craft menu lists every recipe whose `station` is null and whose
`requires` the player meets; recipes that are known but out of reach show greyed
with their requirement, so levelling has a visible destination. Crafting
consumes inputs, yields the output, and grants Construction XP.

**Placing.** Consumes one unit of the selected stack. No XP, no skill gate — you
may build with anything you have managed to obtain.

**Refusals** reuse the existing `this.notice`, and each names its reason:

| Condition | Message |
|---|---|
| Mining level too low | `Requires Mining 15` |
| Construction level too low | `Requires Construction 10` |
| No free slot or stack | `Inventory full` |
| Missing inputs | `Need 2 Rock` |
| Empty stack on place | `Out of Stone` |
| Bedrock | `Unbreakable` |

### 6. The place-and-break XP loop

Placing grants no XP, so there is no two-sided loop. One remains: place a block
you already hold (free), then break it for Mining XP, indefinitely.

Guard: a `placed` bitset, one bit per cell (128 × 128 × 64 ÷ 8 = 131 KB).
Breaking a player-placed block returns the item but grants **no** Mining XP.

Open, and called out rather than buried: the bitset is in-memory only in this
spec, because persisting it means touching the v4 codec that this spec otherwise
leaves alone. A reload therefore clears the flags and the loop reopens. For a
single-player sandbox that is an acceptable trade; if it ever matters, the bitset
RLE-compresses well and can join a v5 codec later.

Crafting needs no equivalent guard: no recipe is reversible, so no cycle of
crafts returns its own inputs. Any future recipe that would close such a cycle
must not be added without one.

### 7. Error handling

- `cc_player` unavailable (private mode, quota refusal): the session runs
  in-memory with a one-time notice that progress will not be saved. `IdbBackend`
  already drops its cached promise on error so a later call retries; the new
  backend follows that same shape.
- A player record from a future version: refuse to load it rather than coerce,
  and start a fresh in-memory session, so a newer build's save is never
  overwritten by an older one.
- An unknown block id in `dropsFor()`: drop nothing, grant nothing, and do not
  throw — the world may outlive a block table edit.
- An unknown or malformed recipe id in `craft()`: refuse and consume nothing.
  Inputs are consumed only after the output is confirmed to fit, so a full
  inventory can never destroy materials.

### 8. Testing

Vitest, one file per module, covering:

- curve boundaries either side of every level threshold, and the level-50 cap
- stack merge, overflow into a second slot, and add-into-full-inventory
- every refusal path in §5 by its own case
- drop tables, including the unknown-id case
- the §6 exploit guard: place, break, assert Mining XP unchanged
- break-time monotonicity: higher level is never slower; better tool never slower
- crafting: exact-inputs success, one-short failure, output-does-not-fit leaves
  inputs untouched, level gate refuses, `station: 'workbench'` entries are
  filtered out of the spec-1 menu
- best-tool selection with no tool, one tool, and two tiers held at once

Playwright extends `tests/forge.spec.js` with the end-to-end mine → craft →
place loop, and asserts a Creative world still breaks instantly. Per project
convention Chromium runs with GPU flags, since headless has no WebGL2.

Baseline to hold: 856 unit tests across 52 files, currently passing.

## Risks

- **This is the larger slice.** Crafting was pulled in from spec 2 by explicit
  choice, after the smaller Mining-only slice was offered and declined. The
  trade accepted: longer before anything is playable, in exchange for a survival
  loop that closes in one cycle.
- **`forge.js` growth.** It is 1616 lines before this change and gains roughly
  200 with the craft menu. The adapter keeps rules out of it, but the file is a
  standing candidate for a split and the hotbar spec should plan one.
- **Tuning.** All three tables in §4 are first guesses. Gating Ore at Mining 15
  is only correct if the curve and XP values make 15 reachable in a session, and
  the pickaxe multipliers decide whether crafting one feels worth the detour.
  Expect to retune after the first playtest.
- **The first tool sits behind Mining 5.** Stone Pickaxe needs Rock ×2, and Rock
  is gated at Mining 5, so the whole opening stretch is bare-handed. That is
  either a satisfying first goal or a tedious wall depending entirely on the
  curve; it is the single most important thing to watch in the first playtest.
- **No durability.** Tools last forever in this spec, so one Metal Pickaxe ends
  tool progression permanently. Durability belongs with stations in spec 2; if
  it is never added, the tool tier collapses to a one-time unlock.
