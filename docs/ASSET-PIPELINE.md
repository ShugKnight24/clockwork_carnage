# Asset Pipeline

Status: mostly superseded. Almost all art is generated at runtime in code. The
file-based pipeline described here survives in two places only — HUD weapon
icons and upgrade card icons — and its build scripts cannot run from a clean
clone.

Read this before adding an image file to the repo. In most cases the answer is
"draw it in code instead".

## Where art actually comes from

**Modern art style (default).** `src/rendering/svg-art/` builds SVG markup at
runtime from the game data and rasterises it to bitmaps through
`svg-art/raster.js`, which caches decoded images per size bucket. This covers
cutscenes, the title screen, viewmodels, enemy sprites, props, pickups and the
HUD. Subdirectories: `models/` (cast, villain, scenes, backdrops), `sprites/`
(boss, enemies, humanoids, creatures, props, pickups), `viewmodel/` (hands and
weapon geometry), plus `agent-rig.js` for the player character.

**Legacy art style.** The original procedural Canvas2D drawing code, still
live under `src/rendering/` (`textures.js`, `props.js`, `pickups.js`,
`enemies/`, `cutscene-art.js`). `src/rendering/art-style.js` holds the switch;
several of those modules branch on `isModernArt()` and fall through to the
Legacy path. The value is stored in the normal settings blob
(`cc_settings.artStyle`) and mirrored onto `<html data-art-style>`.

Neither path reads anything from `assets/`.

## What the file pipeline still covers

`src/assets/loader.js` fetches `assets/manifest.json` once and resolves ids to
`HTMLImageElement`s, returning `null` until an image is decoded so callers can
fall back to procedural art. It has exactly three live callers:

- `getWeaponSprite` — `src/ui/hud.js`, `src/ui/hud-modern.js`
- `getUpgradeSprite` — `src/ui/upgrade-screen.js`

`getEnemySprite` and `prefetchBucket` are exported but nothing calls them, so
the 18 files in `assets/enemies/` are dead weight at present.

## What is on disk

```
assets/
  enemies/      18 SVG portraits — in the manifest, not read by any code
  ui/           18 upgrade card icons — read by the upgrade screen
  weapons/       8 weapon icons — read by both HUDs
  manifest.json  generated index (version 1)
  og-image.svg   social preview, referenced from index.html
```

There is no `assets/props/` or `assets/backdrops/`. Earlier revisions of this
document listed both; they were never created, and the art they were meant to
hold is now generated in code.

`assets/manifest.json` carries `generatedAt: 2026-05-01`, which predates all of
the September art work. That is expected — nothing in the September work
touched these folders.

## Regenerating the manifest

```bash
npm run assets:generate   # scripts/generate-sprites.mjs
npm run assets:manifest   # scripts/build-assets.mjs → assets/manifest.json
npm run assets:build      # both, in order
```

**These do not work from a clean clone.** `scripts/` is gitignored, so the
`.mjs` files these scripts invoke are not in the repository. If you need to
regenerate `assets/manifest.json` you will have to write the scanner yourself
or get the scripts directory out of band.

## If you are adding a file-based asset anyway

- Only `weapons` and `ui` are wired up. Adding a `props` or `backdrops` bucket
  means writing the consumer as well as the files.
- Keep filenames stable; code keys off the manifest `id`. Weapon icons are
  keyed by weapon slug, upgrade icons by `upgrade-<id.toLowerCase()>`.
- SVG for icons; WebP or PNG with transparency for anything raster.
- Keep the procedural fallback. `getSprite` returns `null` on a miss and every
  caller must still render without the image.
- Track licence and source for anything purchased or third-party.

## Delivered from the old "First Targets" list

- Weapon pickup icons — `assets/weapons/`, live in both HUDs.
- Upgrade card icons — `assets/ui/`, live in the upgrade screen.
- Enemy role silhouettes — delivered, but procedurally via
  `src/rendering/svg-art/sprites/enemies.js`, not as files.
- Boss intro backdrops — delivered procedurally via
  `src/rendering/svg-art/models/backdrops.js` and `sprites/boss.js`.
- Objective/exit marker art — drawn in code
  (`src/rendering/svg-art/sprites/pickups.js`, `src/rendering/pickups.js`).

Nothing on that list is still outstanding as a file-pipeline task.
