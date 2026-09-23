# Forge Hotbar and Inventory — A Clickable Screen, and a Split

Date: 2026-09-22
Status: Draft for review
Sub-project 4 of the Forge/RPG roadmap. Spec 3 of 5; specs 1 (survival core) and
2 (stations and durability) are built.

## Goal

Give the Forge a hotbar that shows what you are actually carrying, and a
clickable inventory screen to arrange it. Split the HUD out of `js/forge.js`
first, so the new UI lands somewhere that is not already the largest file in
the repo.

Success looks like:

- In survival the hotbar shows your real stacks — counts, and a wear bar on a
  worn pickaxe — not a fixed list of every block in the game.
- Pressing `I` opens an inventory screen, the cursor comes back, and you can
  click a slot to select it and drag a stack from the backpack to the hotbar.
- Closing it returns you to play with the mouse captured again.
- Selecting a hotbar slot is what decides the block you place, so a crafted
  Workbench is placed the same way as anything else you are carrying.
- Creative is unchanged where it matters: the palette is still every block,
  still unlimited, still the level editor.
- `js/forge.js` is smaller after this change than before it.

## Current state

- `js/forge.js` is **2046 lines**. Ten `_render*` methods occupy roughly its
  last 530 (lines 1513–2046) and are a clean seam.
- `_renderHotbar` draws the *palette*: flat `BLOCKS[id].color` swatches windowed
  by `hotbarWindow`. In survival the palette is `SURVIVAL_BLOCKS`, 17 entries,
  so stations sit past the reach of the digit keys and need wheel-cycling.
- `this.heldItem` exists and is read by `placeBlock`, but **nothing assigns it**
  except tests. Survival placement currently falls back to
  `itemForBlock(this.tile)`, which is why the palette had to grow.
- `Inventory` is 36 slots, deliberately `HOTBAR_SLOTS = 9` plus 27 backpack —
  sized for this spec in spec 1.
- Pointer lock: the Forge requests it on start and releases it for overhead
  (`js/forge.js:584`). So a cursor-free mode already exists.
- `js/input-manager.js` only accumulates `movementX`/`movementY`. **No absolute
  cursor position is exposed anywhere.**
- The settings screen — the one clickable full-screen UI in the game — gets its
  coordinates from its own `mousemove` listener converting `clientX/Y` through
  `getBoundingClientRect()` into `hudW`/`hudH` space (`js/game.js:309`).
- `js/layout.js` is the house pattern: `settingsLayout` builds rects,
  `resolveSettingsHit` reads them, and the renderer and the mouse handler share
  both so they cannot drift. The sprint notes record that a duplicated copy of
  that geometry was a live bug, and that hit-testing against the DPR-scaled
  backing store made every tap land at 2x on retina.

## Scope

This spec: the HUD split, the inventory screen with click and drag, a
stack-based survival hotbar, the coordinate plumbing it needs, and wiring
`heldItem` to the hotbar selection.

Out of scope, their own later specs: guided onboarding (spec 4), shared-build
discovery (spec 5). Also out of scope: touch support for the inventory screen,
and any change to the campaign or arena.

## Decisions taken before this spec

| Question | Decision |
|---|---|
| How clicking works under pointer lock | A dedicated inventory screen that releases the cursor, as overhead already does. The in-play hotbar stays keys and wheel. |
| Creative | Keeps its unlimited palette; it is a level editor and wants every block, not the ones you hold. It gains the same screen as a block picker. |
| The file split | Done as part of this spec, before the new UI is written. |

## Design

### 1. The split, first

Three moves, in this order, each with the suite green before the next:

| New file | Takes |
|---|---|
| `src/ui/forge-hud.js` | the ten `_render*` methods as pure functions `(forge, ctx, w, h)` |
| `js/layout.js` (extend) | `inventoryLayout(w, h, mode)` and `resolveInventoryHit(layout, x, y)` |
| `src/ui/forge-inventory.js` | the screen's drawing, reading rects from `inventoryLayout` |

The render methods read `this` heavily, so they become functions taking the
forge as their first argument rather than a class — the smallest change that
moves them, and the easiest to test without constructing a `ForgeMode`.

`js/forge.js` keeps input, state and world operations, and its `render` becomes
a delegation. This is a pure refactor: **no behaviour changes in the split
commits**, and the existing 15 Forge e2e tests are the proof.

### 2. Geometry and hit-testing live together

`inventoryLayout(w, h, mode)` returns every rect the screen needs — the 9
hotbar cells, the 27 backpack cells, the panel, the close affordance — and
`resolveInventoryHit(layout, x, y)` maps a point to `{kind, index}`. The
renderer and the mouse handler both read those rects and neither computes its
own. This is not a preference: the sprint notes record a duplicated copy of the
settings geometry as a real, shipped bug.

`hitRect` already exists in `layout.js` and is reused.

### 3. Coordinates

The screen is drawn in `hudW`/`hudH` CSS pixels, so hit-testing must be in the
same space. Cursor position comes from a `mousemove` listener converting
`clientX/Y` through `getBoundingClientRect()` exactly as `js/game.js:309` does
for settings — **not** from the DPR-scaled backing store, which is the bug that
made every tap land at 2x on retina.

The Forge gains `handleMouseMove(x, y)` taking HUD-space coordinates. It is
only meaningful while the inventory is open; during play the existing
`feedMouse(dx, dy, locked)` delta path is untouched.

### 4. The hotbar during play

| Mode | Shows | Keys |
|---|---|---|
| Survival | `inventory.slots[0..8]` — swatch, count, wear bar on a tool | 1–9 select, wheel cycles |
| Creative | today's palette, unchanged | 1–9, wheel, unchanged |

In survival the selected slot sets `this.heldItem`, which `placeBlock` already
reads. That is what this spec is really for: `heldItem` finally has an assigner,
and a crafted Workbench is placed like anything else you carry. Once that
lands, `SURVIVAL_BLOCKS` exists only to keep creative's array untouched and
should be removed from the survival path.

An empty selected slot means nothing is held and placing does nothing, with the
existing `notice` saying so.

### 5. The inventory screen

`I` toggles it; `Esc` closes it. Opening releases pointer lock, closing
re-requests it — the keypress is the user gesture browsers require, and
overhead already relies on that.

Layout is 9 hotbar cells on a bottom row and 27 backpack cells in three rows of
nine above, one grid, so a drag between them is the same operation as a drag
within either.

- **Click** a slot: select it if it is a hotbar slot; otherwise begin a drag.
- **Drag**: press picks the stack up, the cursor carries it, release drops it.
  Dropping on a slot holding the same item merges up to that item's `stack`
  and leaves the remainder on the cursor; dropping on any other slot swaps;
  dropping outside the panel returns the stack to where it came from. Nothing
  is ever destroyed by a drag.
- **Shift-click**: move the whole stack to the first free slot in the other
  region, hotbar to backpack or back.
- A tool draws its wear bar here too, so you can see which pickaxe is the worn
  one before you drag it to an Anvil.

In creative the same screen lists the block palette instead of stacks; clicking
picks the block. That fixes creative's own problem — 17 blocks past ten digit
keys — without giving the editor a fiction of finite resources.

### 6. Error handling

- A drag in progress when the screen closes, the world is swapped, or the mode
  toggles: the carried stack returns to its origin slot before the screen tears
  down. A carried stack must never be lost.
- Pointer lock refused on close (browsers may refuse without a gesture): the
  screen still closes and play resumes unlocked; the next click re-locks, which
  is the existing behaviour everywhere else in the game.
- `handleMouseMove` called while the screen is shut: ignored.
- A hotbar slot emptied while selected — the last stone placed, a tool
  scrapped: selection stays on the slot index and simply holds nothing, rather
  than jumping, which would move the player's hand without them asking.
- An inventory smaller than 36 slots (a truncated record): the screen renders
  the slots that exist and hit-testing never resolves past them.

### 7. Testing

Vitest:

- `inventoryLayout`: cell counts, no overlapping rects, the whole grid inside
  the panel, and stability across a few window sizes
- `resolveInventoryHit`: each region, the gaps between cells, outside the
  panel, and the exact boundary pixel of a cell
- drag semantics as pure functions over an `Inventory`: merge with remainder,
  swap, drop-outside-returns, shift-click to the other region, and that total
  item counts are conserved across every one of them
- hotbar selection sets `heldItem`; an empty slot holds nothing
- the creative path still lists the palette and never reads the inventory

Playwright extends `tests/forge.spec.js`: open the screen with `I`, confirm the
cursor is released, drag a stack from backpack to hotbar, close, and place the
dragged block with a click — **driven by real key and mouse events, not by
assigning fields**. Two features have now shipped in this project complete,
tested and unreachable by a player; this test exists because of that.

Baseline to hold: 1028 unit tests across 65 files, 15 Forge e2e.

## Risks

- **The split is the risky part, not the feature.** Moving 530 lines of drawing
  code can only be verified by the e2e screenshots and by reading; a subtle
  regression in the HUD will not fail a unit test. The split lands in its own
  commits with no behaviour change so it can be reverted alone.
- **Pointer lock is browser-dependent.** Re-locking without a user gesture is
  refused by some browsers; §6 says play resumes unlocked rather than trapping
  the player in a broken state, but it will feel like a hitch when it happens.
- **Drag-and-drop is where items get destroyed.** Every failure path must
  conserve item counts, which is why the tests assert conservation rather than
  just the happy path.
- **`js/forge.js` must actually end up smaller.** If the split is done and the
  file still grows past 2046 lines, the split did not work and should be
  reconsidered before the feature is built on top of it.
