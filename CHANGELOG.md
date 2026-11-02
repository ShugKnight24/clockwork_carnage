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

### For developers
- `?debug` and `?bench` no longer load the dev tools on the live site: they load only on the Vite dev server (#18).
- CI is one job. It runs unit tests, the build, smoke, and a **Pages test** of the site served the way GitHub Pages serves it (#18).
- `dist/` is no longer tracked (#18).
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
