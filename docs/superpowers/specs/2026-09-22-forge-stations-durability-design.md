# Forge Stations and Durability — Tool Wear, Repair, and Crafting Stations

Date: 2026-09-22
Status: Draft for review
Sub-project 4 of the Forge/RPG roadmap. This is spec 2 of 5 within it; spec 1
(`2026-09-22-forge-survival-core-design.md`) is built and merged.

## Goal

Turn the tool tier from a one-time unlock into an economy, and give Construction
somewhere to go past level 10. Tools wear out and are repaired at a station;
stations are blocks you gather for, place, and stand near to unlock deeper
recipe tiers.

Success looks like:

- A pickaxe wears with use, visibly, and stops helping when it reaches zero —
  without vanishing out of the pack.
- A player builds a Workbench, an Anvil and a Forge, each a real block they
  placed, and each opening recipes that were greyed out before.
- Standing near a station changes what the craft menu offers, and walking away
  changes it back.
- Repairing a worn pickaxe costs a fraction of building a new one, so returning
  to base is cheaper than re-gathering.
- Construction has a ladder past 10: stations gate the tiers above it.
- Creative mode is unchanged, again. Stations are survival-only.

## Current state

- `src/rpg/tools.js` has three tiers (`HAND`, `PICK_STONE`, `PICK_METAL`) with a
  speed `mult`. Nothing wears. `bestTool(inventory)` returns the highest tier
  held and nothing else.
- `src/rpg/inventory.js` slots are `{item, n}`. Every item shares
  `STACK_MAX = 64`, tools included, so two pickaxes stack into one slot.
- `src/rpg/recipes.js` already carries a `station` field and
  `availableRecipes(skills, station, table)` already filters on it. Every
  shipped recipe is `station: null`. This was built in spec 1 for exactly this.
- `BLOCKS` (`src/world/blocks.js`) has 16 entries, ids 0–15, Bedrock last.
  `tests/unit/world.test.js` asserts both the length and the exact name list.
- Block art is procedural: `paintNatural` in
  `src/rendering/voxel/natural-art.js` takes a name and a style and returns a
  canvas. `atlasLayerTable`/`faceKeys` derive everything from `BLOCKS`, so a new
  block needs no image file and no atlas wiring — only a painter case.
  Its `default:` branch falls back to rock, so a missing case is ugly, not fatal.
- Blocks are stored in a `Uint8Array`, so ids up to 255 are free.
- `PLACEABLE_BLOCKS` in `js/forge.js` is the creative palette, ids 1–14.

## Scope

This spec: per-slot tool durability, worn-tool behaviour, three station blocks
with their art, station proximity detection, station-gated recipe tiers, repair
recipes, and the craft-menu changes that surface all of it.

Out of scope, each its own later spec: the clickable hotbar redesign; guided
onboarding; shared-build discovery.

Deliberately not done here: the v5 codec that would persist the placed-block
bitset (spec 1 §6 accepted that loop), and the `js/forge.js` split — that file
is now 1937 lines and the hotbar spec should own the split.

## Decisions taken before this spec

| Question | Decision |
|---|---|
| What happens at zero durability | The tool stays in the pack as worn and stops helping — its multiplier falls back to bare hands. It never vanishes. |
| How it comes back | Repair at a station, costing one third of the build cost, rounded up, restoring full durability. |
| How many stations | Three: Workbench, Anvil, Forge. |
| What each gates | Workbench: the mid tier and the other two stations. Anvil: repair and tool upgrades. Forge: smelting and the high tier. |
| Are stations blocks or markers | Real placeable blocks, because the art is procedural and costs no asset work. |
| Creative | Unchanged. Stations stay out of `PLACEABLE_BLOCKS`; they are survival-only. |

## Design

### 1. Per-slot durability

Slots gain an optional third field:

```js
{ item: "pick_stone", n: 1, dur: 87 }   // tools
{ item: "stone",      n: 64 }            // everything else, unchanged
```

`ITEMS` gains a per-item `stack`, which is `STACK_MAX` for materials and **1**
for tools, plus `durability` on tools. Two pickaxes therefore occupy two slots
and can wear independently. Materials are untouched — their slots never carry
`dur`, and their merge path is exactly today's.

`Inventory` changes:

| Method | Change |
|---|---|
| `add(itemId, n, dur)` | Third argument, only meaningful for tools. Items with `stack: 1` never merge into an existing slot. |
| `fits` | Respects the item's own `stack`, not the global `STACK_MAX`. |
| `remove` | Removes the **most worn** matching tool first, so repairing then crafting does not consume the fresh one. |
| `toJSON`/`fromJSON` | Round-trip `dur`; drop a `dur` that is not a finite number in range. |

`STACK_MAX` stays exported and stays 64; it becomes the default rather than the
law.

### 2. Tools wear

`TOOLS` entries gain `durability` and a `repair` cost:

| Tool | mult | durability | repair cost |
|---|---|---|---|
| Stone Pickaxe | 0.75 | 120 | Stone ×1, Rock ×1 |
| Metal Pickaxe | 0.55 | 400 | Metal ×1, Rock ×1 |

Repair cost is one third of the build cost, rounded up.

`bestTool(inventory)` changes shape, because wear has to be applied to a
specific slot:

```js
bestTool(inventory) -> { tool, slot }   // slot is -1 for TOOLS.HAND
```

It skips any tool whose slot `dur <= 0`, so a worn pickaxe is passed over in
favour of a lesser intact one, and bare hands are the floor. Every caller
updates; there are two.

`SurvivalSession` decrements the used tool's slot by 1 on each completed break,
and emits `worn: true` in the `tickBreak` result on the transition to zero so
the Forge can say so once rather than every frame.

### 3. The three stations

Three new blocks, ids 16–18, appended so every existing id is untouched:

| id | Name | kind | hardness | Recipe | Construction | XP |
|---|---|---|---|---|---|---|
| 16 | Workbench | solid | 1 | Stone ×10, Metal ×2 | 5 | 100 |
| 17 | Anvil | solid | 1.5 | Metal ×6, Stone ×4 | 8 | 200 |
| 18 | Forge | solid | 1.5 | Stone ×12, Metal ×8, Energy ×2 | 15 | 400 |

The Workbench is craftable by hand; the Anvil and Forge require a Workbench.
Each has a `paintNatural` case and a distinct top face, so a station reads
differently from the side and from above:

- `nat:workbench_top` plank grain, `nat:workbench` planks with a darker frame
- `nat:anvil_top` a dark metal face, `nat:anvil` banded iron
- `nat:forge_top` glowing coals, `nat:forge` soot-darkened brick

`tests/unit/world.test.js` must be updated: 16 → 19 entries, three names
appended. That is a deliberate, expected change to a test that exists precisely
to catch accidental ones.

Stations are gathered like any block, so they carry `GATHER` entries and drop
themselves. Because the player placed them, the spec 1 §6 bitset already means
breaking one back down pays no Mining XP.

### 4. Proximity

```js
stationsInRange(world, player, radius = STATION_RADIUS) -> Set<"workbench"|"anvil"|"forge">
```

`STATION_RADIUS` is 5 — inside the 6-block build reach, so a station you can
place is a station you can use. The search is a bounded scan of the cells in
that radius, run once per craft-menu open and once per second while it is open,
not per frame. Line of sight is not required: a bench behind a wall you built is
still your bench.

Every station in range contributes its rows — not just the highest tier. A base
with all three built is the case that matters, and "highest wins" would have
hidden the Anvil's repair rows exactly there. `nearestStation` is therefore
really `stationsInRange(world, player, radius) -> Set<string>`, and
`availableRecipes` widens its second parameter from a single station to
`string | string[] | Set<string> | null`. Spec 1 passes `null` and keeps
working unchanged.

### 5. The recipe tiers

Existing spec 1 recipes keep their ids. `smelt_metal` **moves** behind the
Workbench — not the Forge, despite the name fitting better there. Ore is
minable at Mining 15 and Metal is minable directly at Mining 10, so putting
smelting behind a Construction-15 Forge would leave Ore as dead weight for the
entire middle of the game with a cheaper path to its only product already open.
The Forge takes the exotic tier instead, which has no other source.

| Station | Recipe | Inputs | Output | Construction | XP |
|---|---|---|---|---|---|
| — | (spec 1 tier) | | | | |
| — | Workbench | Stone ×10, Metal ×2 | Workbench | 5 | 100 |
| Workbench | Anvil | Metal ×6, Stone ×4 | Anvil | 8 | 200 |
| Workbench | Forge | Stone ×12, Metal ×8, Energy ×2 | Forge | 15 | 400 |
| Workbench | Reinforce Stone | Stone ×4, Metal ×1 | Tech ×2 | 6 | 40 |
| Workbench | Smelt Metal | Ore ×2 | Metal ×1 | 5 | 30 |
| Anvil | Repair Stone Pickaxe | Stone ×1, Rock ×1 | *(restores)* | 1 | 15 |
| Anvil | Repair Metal Pickaxe | Metal ×1, Rock ×1 | *(restores)* | 10 | 35 |
| Forge | Cast Energy | Ore ×4, Glass ×2 | Energy ×1 | 18 | 90 |
| Forge | Bind Rift | Energy ×4, Secret ×1 | Rift ×1 | 25 | 200 |

Every output is a block that already exists apart from the three stations, so
the art budget for this spec is exactly the three painters in §3.

**Repair is a recipe with no output item.** It gets a `repairs: "<toolId>"`
field instead of `output`, consumes its inputs, and restores the most worn
matching tool in the pack to full. It refuses when no worn tool is held, with
the reason `Nothing to repair`.

### 6. Craft menu

The menu already lists locked rows greyed with their reason. It gains:

- A header line naming the stations in range, or `No station` when none is.
- Rows whose station is not in range are hidden, not greyed — a Forge recipe is
  not a goal you can act on from across the map, and showing all three tiers at
  once would triple the list. Locked-by-level rows for the station you *are* at
  stay visible, because those are goals.
- A durability readout on the skill panel: the best tool's name and a wear bar,
  or nothing when bare-handed.

### 7. Error handling

- A recipe naming a station that no longer exists in `BLOCKS`: filtered out of
  the menu rather than throwing, same as an unknown item id in spec 1.
- A slot whose `dur` is missing on a tool (an older record from spec 1, where
  tools had no durability): treated as **full**, never as broken. A spec 1 save
  must not turn every tool to scrap on upgrade.
- A slot whose `dur` exceeds the tool's durability: clamped down on load.
- Repair with no worn tool: refused, inputs untouched, `Nothing to repair`.
- `stationsInRange` with no world or a null player: returns an empty set, never throws.

### 8. Testing

Vitest, extending the existing per-module files plus two new ones:

- durability: wear to zero, `bestTool` skipping a worn tool, falling back to a
  lesser intact one, then to hands; the `worn` transition emitted once
- tools no longer stacking; two pickaxes in two slots wearing independently
- `remove` taking the most worn tool first
- `fits` honouring a per-item `stack` of 1
- `dur` round-tripping, and each §7 malformed case
- `stationsInRange`: empty, one station, all three at once, one just outside the
  radius, one exactly at it
- station-gated availability: a Forge row is hidden at a Workbench and visible
  at a Forge
- repair: restores to full, consumes inputs, refuses with nothing worn, and
  picks the most worn of two
- a spec 1 player record loading with tools at full durability

Playwright extends `tests/forge.spec.js`: craft a Workbench, place it, stand
near it, assert a previously hidden row appears, craft the Anvil from it, wear a
pickaxe to zero and repair it. Creative must still pass unchanged.

Baseline to hold: 956 unit tests across 64 files, 12 Forge e2e.

## Risks

- **Inventory is load-bearing and this changes its shape.** Spec 1's crafting
  fit-probe clones through `toJSON`/`fromJSON`; if `dur` does not survive that
  round trip, a probe could report a repair possible that is not. The round trip
  needs a test of its own before crafting is touched.
- **`smelt_metal` moving behind the Forge** is a progression change to a shipped
  recipe. Nothing is hard-blocked, but a player mid-run finds a recipe they used
  yesterday now needs a building.
- **Construction 15 for a Forge** is a long climb at spec 1's XP rates; the
  station recipes themselves grant most of it. This is the number most likely to
  need retuning after one playtest.
- **Three painters is the real art risk.** A workbench that reads as noisy rock
  makes the whole feature feel unfinished, and `paintNatural`'s fallback hides
  that failure rather than surfacing it.
