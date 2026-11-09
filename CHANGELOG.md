# Changelog

What changed in each release of Clockwork Carnage. Pull request numbers refer to [ShugKnight24/clockwork_carnage](https://github.com/ShugKnight24/clockwork_carnage/pulls?q=is%3Apr+is%3Amerged). Playtest builds are tagged `v0.9.0-playtest.N` by `npm run release:playtest`.

## Unreleased: v0.9.0 "Ready for Players"

Getting the game ready for outside playtesters: fixing what a stranger would hit, and making sure we hear about it.

### For players
- **Certification Day prologue, a lived-in station, cover combat** (#14).
  - A 47-step prologue with walk-and-talk NPCs and comms busts.
  - A civic wing with the city seen through its glass.
  - Cover you can fight from, and a faster Modern renderer.
- **Phones** (#15, #16).
  - The prologue stays under iOS's canvas memory cap.
  - Centred touch aim and an analog stick.
  - The reticle and the shot line up.
  - Deeper look-down, and props are no longer cut off when looking down.
  - Weapon swipes are off by default.
  - Quest cards fold and open on tap.
- **Saves.** Saves survive map changes between builds: you keep your progress and the level starts fresh. Corrupt saves are cleared. Continuing twice keeps your health and loadout. Closing the tab mid-prologue resumes at the last beat (#17).
- **Controllers.** A connected pad no longer blocks mouse fire and aim (#17).
- **Build number** on the title and pause screens (#18).
- **Playtest log**, kept on your device. **J** (RB on a pad, "Session" on touch) copies and saves your session. **F8** saves a bug report with a screenshot (#19).
- **Analytics.** Level events are sent only after consent, with a privacy note and a "Share Play Data" setting to withdraw (#19).
- **Soft locks.** Fixed two: the Foundry's sentry staying silent after a retry (II-7), and a collapse walling you into a side room (IV-1) (#20).
- **Hitches.** The station arrival and level starts no longer re-upload the wall art or build the lamp field mid-play (#20).
- **Prologue.** Calibration no longer leaves you endless stamina when you step off the pad mid-reading; the Supervisor opens the range door instead of walking through it; skipping the locker room's lines no longer leaves most of the squad standing at their lockers.
- **Wardrobe themes.** Eight themed sets join the Field Issue suit, each with its own frame, helmet, shoulders and glove: Exo-Frame, Frontier Marshal, Ronin, Horologist, Neon Runner, Abyssal Diver, Void Ranger and Chronomancer. Pieces mix freely across sets, and they unlock across the acts.
  - **Creator.** Pieces are grouped by theme with one-tap sets. Hair colour is picked apart from the cut. New Eyewear and Face slots (shades, an eyepatch, a monocle, war paint in a colour you pick, a cigar, piercings, a beard and more). A mouth expression shows on bare faces and on the LED Mask. The canvas creator draws its preview from the same rig as the showroom.
  - **Hands.** Every hand is drawn from one posed rig, in the glove its suit names, and the first-person hands wear that glove too: its material and cuff, with bare fingertips for fingerless gloves.
  - **Do-Rag.** Eyewear and face items now show under it. It takes a headset, but nothing that mounts on a helmet shell.
  - **Gunslinger** fires 10% faster instead of 10% slower.
  - **Saves** store every look by piece id, so new pieces never shuffle an old look. Saves from earlier builds keep their look.
- **Only gear you can see counts.** A piece your look keeps but does not draw gives no stats:
  - shoulders on a frame that wears none (the Operator frame no longer counts shoulder stats);
  - a visor on a helmet that has no visor (the Cockpit and the other visorless helmets ignore visor stats);
  - helmet gear on a helmet with no place for it (nothing on the Bubble's glass; only a headset on the Do-Rag);
  - eyewear and face items under a closed helmet, or where an open helmet has no room for them (anything on the face under the LED Mask, or a face item under the Marshal's Brim).
  - A frame that covers the chest kit, the collar or the cape keeps every stat: it changes the look, not the gear.
- **Gear on a continued run.** Continuing a campaign or arena run counts your gear once: gear changed since the save swaps its stats cleanly, and a piece picked up later no longer adds your whole kit's stats again. Saves from earlier builds move to the new gear stats on their first continue. An arena continue also keeps your class's and gear's stamina.
- **Gear stats that fit the piece.** Plate gives armour, a gun belt carries rounds, a heavy suit slows you down, chrono hardware feeds chrono energy. A piece nothing fits is cosmetic, and its tile says "Looks only". Gear can now also raise ammo capacity, fire rate, stamina regen and health regen; dropping ammo capacity mid-run trims your rounds to the new cap, and putting the gear back on adds room, not rounds. Every tile states the real effect (move speed as a percent of your base speed). Old gear that changed:
  - Engineer armour: +25 chrono energy, +10 max health → +25 chrono energy, +0.2 health per second.
  - Bucket helmet: +18 max health → +6 armour.
  - Vanguard helmet: +20 stamina, +3% move speed → +3 armour.
  - Sealed helmet: +12 stamina, +2% move speed → +20% stamina regen.
  - Pilot helmet: +10 stamina → +3% fire rate.
  - Slit visor: +10 chrono energy → +2 armour.
  - Dual Lens visor: +10 stamina → +3% fire rate.
  - Layered shoulders: +14 stamina, +3% move speed → +4 armour.
  - Launcher shoulders: +6 armour, +10 max health, -3% move speed → +6 armour, +10% ammo capacity, -3% move speed.
  - Tactical Backpack: +8 stamina → +10% ammo capacity.
  - Utility Belt: +5 max health → +0.1 health per second.
  - Drop Holster: +1% move speed (shown as +3%) → +5% ammo capacity.
  - Thigh Holster: +1% move speed (shown as +2%) → +5% ammo capacity.
  - Bandolier: +5 stamina → +10% ammo capacity.
  - Forearm Screen: -2 stamina per dash → +2% fire rate.
  - Grenade Rig: +3 armour → looks only.
  - Dog Tags: +3 max health → looks only.

### For developers
- `?debug` and `?bench` no longer load the dev tools on the live site: they load only on the Vite dev server (#18).
- CI is one job. It runs unit tests, the build, smoke, and a **Pages test** of the site served the way GitHub Pages serves it (#18).
- `dist/` is no longer tracked (#18).
- Wardrobe pieces live in theme modules (`src/data/wardrobe-themes/` for data, `src/rendering/svg-art/wardrobe-themes/` for art) behind a validated contract, and every rig piece is pinned by an SVG golden snapshot.
- A 29-level fighting bot sweep: `ccTest.sweep`, `CC_SWEEP=1 npm run test:sweep` (#20).
- Phase 4 code health:
  - dead code removed;
  - shared math, colour, RNG, scheduling and text helpers;
  - one byte-budgeted sprite cache;
  - `renderHUD` split into per-style modules;
  - the remaining `js/` modules moved into `src/`;
  - PR and nightly test tiers, a WebKit iPhone project, ESLint, a map validator and a bundle size budget.

## v0.8.1 (2026-09-27)

Live-site performance, controllers, the settings deck, a trailer and a lore video (#13).

## v0.8.0 (2026-09-23)

The biggest update so far: a graphics overhaul with three art styles (Legacy, Comic, Modern), a four-act, 29-level campaign, the Forge voxel builder with survival, a hero-showroom character creator, a new HUD and message system, procedural voices, and a new brand (#12).

## v0.7.x (March 2026)

Mobile and iOS fixes: fullscreen, touch controls, the character creator on touch, and PWA support (#5–#11).

## v0.7.0 (2026-03-09)

(#4)
