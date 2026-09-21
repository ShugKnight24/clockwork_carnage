# Suit Customization — Badges, Accessories, Armour Variants

Date: 2026-09-21
Status: Draft for review
Sub-project 1 of 4 in the Forge/RPG roadmap (order: suit customization, vertical
engine, Forge usability, skills and crafting).

## Goal

Make the agent's suit something players shape and earn. Badges become
configurable enamel-and-brass insignia with a curated library, earned designs
and per-armour treatments. Six accessory slots add silhouette-changing gear,
many with small perks. Each armour gains one earned unique variant.

Success looks like:

- A player can pick a library badge or configure one (symbol, frame, colours,
  metal, finish, placement) and see it on the agent in every art style, in the
  showroom, cutscenes, the fallen pose and the portrait.
- A player can equip up to six accessories, see them on the figure, and feel
  the perk where the item has one.
- Badges, finishes, accessories and variants give players concrete goals tied
  to existing achievements and progression.
- Saves from before this change load with the same look.

## Current state

- `BADGES` (`src/data/cosmetics.js`) is 8 flat entries (`none` plus 7 icons).
  `badgeIcon()` and `decal()` in `src/rendering/svg-art/agent-rig.js` draw each
  icon on one dark disc; the chest placement is fixed and a shoulder copy
  appears only with the `pauldrons` and `armored` shoulders.
- The Legacy creator (`src/ui/character-creator.js`) draws badges as Unicode
  glyphs.
- The character record stores indices; `loadCharacter`
  (`src/core/save-system.js`) clamps indices and drops any value whose type
  differs from `DEFAULT_CHARACTER`.
- Capes and kit come bundled with the armour choice. There are no accessory
  slots.
- Gear perks: `gearBonuses()` sums `bonuses` over `GEAR_SLOTS`, and
  `Game.applyGearBonuses()` applies six stats: `maxHealthAdd`,
  `maxChronoEnergyAdd`, `maxStaminaAdd`, `dashCostAdd`, `armorAdd`,
  `moveSpeedAdd`.
- Unlocks: `src/systems/unlocks.js` evaluates rules (`tutorial`,
  `campaignLevels`, `arenaRound`, `dashes`, `weaponKills`, `achievement`,
  `anyOf`) for the items in `LOCKABLE`.

## Scope

Stage 1 (this spec): data model and save migration, badge composer, accessory
painters, Badge tab (Library and Configure modes), Gear tab, armour variants,
Legacy parity through rasterized SVG, unlock rules, tests.

Stage 2 (separate spec, later): the free layer editor — multiple layers with
position, scale and rotation. Stage 1's data format already supports it.

Out of scope: gameplay perks beyond the stats listed under Perks, and any
change to the Forge, campaign or arena.

## Design

### 1. Data model

All new references are string ids, so reordering a table never breaks a save.

**`src/data/badges.js`** (new)

| Export | Contents |
|---|---|
| `SYMBOLS` | ~30 at launch: `{id, name, set, unlock?}`. Sets: `faction`, `rank`, `act`, `earned`. Includes the 7 current icons, redrawn. |
| `FRAMES` | `disc`, `shield`, `hex`, `chevron`, `tag`, `cog`: `{id, name}` |
| `ENAMELS` | ~12 named field colours: `{id, name, color}` |
| `METALS` | `brass`, `steel`, `blackened`, `gold`: `{id, name, ramp}` |
| `FINISHES` | `insignia` (default, free), `stencil`, `patch`, `holo`: `{id, name, unlock?}` |
| `PLACEMENTS` | `chest`, `shoulder`, `helmet`, `forearm` |
| `BADGE_PRESETS` | ~24 curated library entries: `{id, name, set, badge, unlock?}` |

**`src/data/accessories.js`** (new)

- `ACCESSORY_SLOTS`: `back`, `waist`, `helmet`, `arms`, `neck`, `legs`.
- `ACCESSORIES[slot]`: `{id, name, desc, tier?, unlock?, bonuses?}`. Entry 0 of
  every slot is `{id: "none"}`.

**`src/data/cosmetics.js`** (changed)

- Each `ARMOR_STYLES` entry gains `badgeTreatment: { finish, metal }` (ids
  from `FINISHES` and `METALS`; e.g. Ghost → insignia/blackened, Reliquary →
  insignia/gold, Trencher → patch/brass, Engineer → stencil/steel). A
  treatment's `metal` replaces the layer's metal only when `finish` is
  `"auto"`. Each entry also gains `variant: {id, name, desc, trim, wear,
  badgeTreatment, unlock}`.
- `BADGES` is kept only as the migration map from old `badgeIndex` values.
- `GEAR_SLOTS`/`gearBonuses()` also sum equipped accessories.

**Character record**

```js
badge: {
  layers: [{ frame, symbol, enamel, metal, x: 0, y: 0, scale: 1, rot: 0 }],
  finish: "auto",          // "auto" follows the armour's badgeTreatment
  placements: ["chest"],   // any subset of PLACEMENTS; [] means no badge
},
accessories: { back: "none", waist: "none", helmet: "none",
               arms: "none", neck: "none", legs: "none" },
armorVariant: 0,           // 0 = standard, 1 = the armour's unique variant
```

Stage 1 writes exactly one layer. Stage 2 lifts that limit.

**Loading and migration** (`src/core/save-system.js`)

- Object-valued fields get dedicated validators instead of the generic type
  check: each id is checked against its table and unknown ids fall back to the
  default; numeric layer fields are clamped; `placements` is filtered to known
  values.
- A save with `badgeIndex` and no `badge` migrates once: the old icon maps to
  its redrawn symbol on a brass `disc` with insignia finish. Placement
  reproduces the old behaviour: `["chest"]`, plus `"shoulder"` when the saved
  shoulders are `pauldrons` or `armored`. `badgeIndex` 0 (None) migrates to
  `placements: []`.
- `armorVariant` is clamped to 0–1 and reset to 0 if the variant is locked.

**Unlocks** (`src/systems/unlocks.js`)

- `LOCKABLE` extends to badge symbols, finishes, presets, accessories and
  armour variants. Keys for id-based items are resolved by id.
- Rules reuse the existing types. A new rule type is added only where a badge
  needs one that cannot be expressed with them.
- Previously owned badges (all 7 current icons) are grandfathered through the
  existing `owned` mechanism.

### 2. Rendering

**Badge composer — `src/rendering/svg-art/insignia/`**

- `symbols.js`: symbol paths in a -50..50 box.
- `frames.js`: frame outline and inner field shape per frame.
- `finishes.js`: one renderer per finish.
  - insignia: machined metal ring, enamel field, raised metal symbol, gloss.
  - patch: twill fill, merrowed border, stitched symbol.
  - holo: glow outlines on dark glass.
  - stencil: flat sprayed paint with overspray.
- `compose.js`: `renderBadge(badge, { size, treatment, detail })` returns an
  SVG `<g>` string. `finish: "auto"` resolves to `treatment` (the armour's
  `badgeTreatment`, or the variant's). `detail: "low"` drops fine strokes for
  small draws (shoulder copies, the 40px portrait). Results are memoized by a
  hash of the stack plus size, treatment and detail.
- Modern (realistic) relighting adds the metal and enamel colours to the
  `keep` map in `realOpts` so brass, gold and enamel are not desaturated.

**Accessory painters — `src/rendering/svg-art/accessories/`**

- One module per slot: `back.js`, `waist.js`, `helmet.js`, `arms.js`,
  `neck.js`, `legs.js`. Each exports `{ [itemId]: paint(anchors, pose, look) }`
  returning SVG markup.
- `agent-rig.js` exposes an anchor table per pose: shoulder line, chest
  centre, belt line, hips, forearms, knees, and helmet crown, sides and brow
  (helmet anchors per helmet style, since the 9 shapes differ).
- Draw order: back items draw behind the torso; all others in front. A
  back-slot cape replaces the armour's built-in cape; with `back: "none"` the
  armour cape stays.
- Poses: `standing`, `armed`, `fallen`. Fallen painters add damage (torn cloth,
  scattered pouches).
- `agent-rig.js` grows only by the anchor table and one call per slot; the art
  lives in the painter modules.

**Armour variants** stay in the rig's armour code as a trim, wear and colour
layer over the base armour, plus the variant's `badgeTreatment`.

**Consumers**: showroom figure and thumbnails, cutscene cast (standing, armed,
fallen), Modern portrait bust, and the Legacy creator (rasterizes the same SVG
through `svg-art/raster.js`). The cast look hash (`CAST_FIELDS` in
`svg-art/index.js`) and `portrait-modern.js` include `badge`, `accessories`
and `armorVariant`.

**Performance**: badge markup memoized per stack; agent models rebuild only on
look-hash change; showroom tiles reuse the thumbnail cache; nothing rebuilds
per frame.

### 3. Creator UI

**Showroom** (`js/components/agent-showroom.js`)

- Tabs: Identity · Suit · Helmet · **Gear** · **Badge** · Colors · Loadout,
  added to `CATEGORIES` so Q/E cycling, keyboard, gamepad and touch keep
  working. The tab bar becomes icon-only with labels on hover/focus so seven
  tabs fit at 1280px and on phones.
- **Badge tab**
  - Header: a ~160px live badge and mode chips **Library · Configure ·
    Editor**; Editor shows "Coming soon" until Stage 2.
  - Library: preset grid grouped by set. Locked presets show the lock and the
    rule's progress (e.g. "Survive arena round 10 · 6/10"). Selecting a preset
    loads its stack.
  - Configure: rows for Symbol, Frame, Enamel, Metal, Finish (Auto shows the
    armour treatment it follows) and Placement (multi-select chips).
  - All changes update the large badge and the figure live, and go through
    the existing undo, reset and randomize paths.
- **Gear tab**: six slot sections (Back, Waist, Helmet, Arms, Neck, Legs).
  Tiles reuse the armour card style: thumbnail, tier pip, perk line, lock and
  rule. Selecting a tile turns the figure so the item is visible (back items
  swing to a three-quarter rear view).
- **Armour variants**: a Standard / Variant toggle under each armour card on
  the Suit tab.
- Preset looks (Regulation, Juggernaut, …) gain matching badges and
  accessories. Randomize draws only from unlocked items. The unlock toast
  announces newly earned badges, finishes, accessories and variants.

**Legacy creator** (`src/ui/character-creator.js`)

- New BADGE and GEAR tabs with the same data, previews rasterized from the
  shared SVG. The Unicode badge glyphs are removed.
- Its geometry and hit-testing follow the shared layout-function pattern used
  by the settings screen (`js/layout.js`): one pure layout function read by
  the renderer and by mouse and touch handlers.

### 4. Content

**Badges**

- Factions (8): Chrono Corps, Temporal Shield, Rift Walkers, Dead Squad,
  Clockwork Guard, Paradox Hunters, Station Crew, ARIA Liaison. Free.
- Ranks (6): Recruit → Commander chevrons, earned by campaign levels cleared.
- Act emblems (3): earned by clearing each act.
- Earned (~12): tied to existing achievements — e.g. `lordSlayer`,
  `untouchable`, `centurion`, `speedDemon`, `roundVeteran`, `campaignClear` —
  plus the 7 current icons redrawn (grandfathered for existing owners).
- Library presets: ~24.
- Finishes: insignia free; stencil earned by the tutorial; patch by clearing
  Act 1; holo by clearing the campaign.

**Accessories** — 4–6 per slot, ~30 in total. Back, waist and helmet receive
the most polish.

| Slot | Launch items |
|---|---|
| Back | tactical backpack, rift antenna, sheathed blade, long cloak |
| Waist | utility belt, drop holster, grenade rig, chrono canister |
| Helmet | night-vision mount, whip antenna, head lamp, plume |
| Arms | gauntlets, forearm screen, wrist launcher |
| Neck | scarf, dog tags, bandolier |
| Legs | knee pads, thigh holster, shin guards |

**Perks**

- Use the six applied stats, at roughly half an armour tier's magnitude.
- About a third of accessories are cosmetic only.
- At most three new stats (candidates: grenade capacity, weapon swap time,
  pickup radius), each wired into `Game.applyGearBonuses()` with a unit test.
- Tiered accessories use `TIER_UNLOCKS`.

**Armour variants** — nine, one per armour, each earned by an achievement or
milestone that suits it (e.g. Ghost Nightfall ← `untouchable`, Juggernaut
Siegebreaker ← `centurion`).

## Error handling

- Invalid or unknown ids in a save fall back to defaults without discarding
  the rest of the character.
- A missing painter or symbol renders nothing for that item and logs one
  warning in dev builds; it never throws inside the model build.
- A locked item found equipped in a save (for example after a rule change) is
  kept if it is in `owned`, otherwise reset to the slot default.

## Testing

Unit (vitest):

- Migration from `badgeIndex` for every old value, including None and the
  shoulder-copy cases.
- Validators: junk types, unknown ids, out-of-range layer numbers, bad
  placements.
- `gearBonuses` including accessories; each new stat applied by
  `applyGearBonuses`.
- Unlock rules for every new locked item.
- `renderBadge` returns well-formed SVG for every symbol × frame × finish, and
  its memo key is stable.
- Every accessory has a painter for every pose.

Playwright:

- Open the creator, go through the Badge and Gear tabs, save, reload, and
  assert the look persisted.
- Screenshots in Comic, Modern and Legacy.
- No console errors while going through the tabs.

Manual, in-browser: the fallen pose and one cutscene with accessories
equipped.

## Risks

- `agent-rig.js` is large; the anchor table must come from the existing
  geometry rather than new hard-coded offsets, or accessories will drift when
  the rig changes.
- Seven showroom tabs at phone width depend on the icon-only tab bar.
- The Legacy creator's canvas UI grows by two tabs; reusing the layout-function
  pattern avoids a second copy of hit-test geometry.
