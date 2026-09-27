# Settings Deck — Live-Preview Settings and Remapping

Date: 2026-09-24
Status: Approved; implemented on feat/live-parity-creator-gamepad
Branch context: `feat/live-parity-creator-gamepad` at `3ba7458`.

## Goal

Replace the canvas settings screen with a settings experience a player can
navigate without thinking about it, where every change is visible the moment
it is made, and where keyboard and controller bindings can be remapped.

The request, in the user's words: "navigating the settings and the current
experience isn't great … I'd like to see a more seamless and intuitive
experience or re-envision the current approach", and "I'd like to test the
settings to ensure that the changes and toggles work and have an impact".

Success looks like:

- Opening Settings from the main menu shows a slowly moving view through a
  real level on the left and the settings panel on the right. Turning Bloom on
  visibly changes that view on the next frame.
- Opening Settings from pause shows the paused match, still being drawn, so
  graphics and HUD changes appear immediately.
- A mouse, a keyboard and a controller can each reach every row, change it and
  leave, with prompts in the glyphs of the device in use.
- Every keyboard key and controller button used in play can be remapped, with
  conflicts caught and a reset to defaults.
- A test proves each graphics toggle changes the frame and keeps its effect
  (this exists as `tests/settings-effects.spec.js` and keeps passing).

## Decisions taken before this spec

| Question | Decision |
|---|---|
| Direction | Live-preview deck: panel beside a live game view (chosen over console-style tabs and over polishing the canvas screen). |
| Live view from the main menu | A showcase camera flythrough of a real level (chosen over the title artwork or no preview). The sizzle reel will reuse it. |
| Remapping scope | Full remapping for keyboard and controller, with glyphs and conflict handling (chosen over controller presets or a fixed layout). |
| Technology | An HTML overlay, like the character creator (chosen over a canvas rebuild or a hybrid). |
| Default controller layout | The layout committed in `3ba7458` (A dash, B crouch, X interact, Y next weapon, LB chrono shift, RB rewind while shifting / previous weapon, d-pad up last weapon, d-pad down slot 1). |
| Behaviour fixes | Done first and separately (`f54bd66`): toggles hold, presets cap without rewriting saves, dead settings removed. This spec is presentation, navigation, live view and remapping. |

## Current state

Facts checked against the code at `3ba7458`.

**Screen.** `src/ui/settings-screen.js` (623 lines) draws the settings screen
into the HUD canvas in both Legacy and Modern looks. Geometry and hit-testing
live in `js/layout.js` (`settingsLayout`, `settingsCategoryRects`,
`resolveSettingsHit`, `settingsZoneAt`); clicks come through
`src/systems/input-click-dispatch.js` and keys through
`src/systems/input-dispatch.js` (`GameState.SETTINGS` branch, ~`:446`).
`render-pipeline.js:737` draws it when `game.state === GameState.SETTINGS`.
Key rebinding is a separate canvas screen, `src/ui/controls-screen.js`
(`GameState.CONTROLS`).

**Data.** `js/settings-registry.js` holds `SETTINGS_REGISTRY` (row
definitions: `key`, `label`, `desc`, `category`, `type` toggle / slider /
select / action, `platform`, `onChange`, and since `f54bd66` `capped` and
`settingDisplayItem()` notes such as "OFF (preset)") and `DEFAULT_SETTINGS`.
Nine categories today: Gameplay 4, Display 4, Performance 14, Audio 4,
Controls 7, Gamepad 6, Accessibility 2, HUD 8, Mobile 4 (touch only).
Settings persist in `localStorage` `cc_settings`; keyboard bindings load
through `InputManager.loadKeybinds()` (`js/input-manager.js`).

**Entry points.** Mode select key 9 / `#btnSettings` (`js/main.js:288`, sets
`_settingsReturnToMenu`), the pause menu (`input-dispatch.js:404`), and the HUD
editor's return (`src/ui/hud-editor.js:45`).

**Rendering behind menus.** `renderFrame` returns early for TITLE and
MODE_SELECT, but not for PAUSED or SETTINGS: the world is still drawn behind
those overlays. Opened from the menu, SETTINGS therefore draws whatever world
the renderer last held — not a scene chosen for the purpose.

**Pattern to follow.** `js/components/agent-showroom.js` is a custom element
(`<agent-showroom>`) mounted once by `mountShowroom(game)`, shown while the
game is in `CHARACTER_CREATE`, receiving keys through the game's own dispatch
(`handleKey(code, e)`), with keyboard, gamepad (translated to key codes) and
`ccDebug.pressKey` all funnelled into one path.

**Input.** `src/ui/input-glyphs.js` tracks the active device and renders
glyphs; `src/systems/pad-actions.js` is the single gamepad binding table
(`GAMEPAD_ACTIONS`) that both gameplay and prompts read.

## Design

### 1. Structure

- A `<settings-deck>` custom element in `js/components/settings-deck.js`,
  mounted like the showroom, replaces the canvas settings screen in all three
  art styles. Three CSS skins (Legacy neon, Comic, Modern) share one DOM and
  one behaviour; shared tokens come from `src/ui/design-tokens.js`.
- Layout: the panel is anchored right, about 460 px wide (clamped for small
  windows). The rest of the screen is the real game canvas, still rendering.
  Below 700 px wide the panel becomes a bottom sheet over the live view.
- Six sections, replacing nine categories: **Quick**, **Video**, **Audio**,
  **Controls**, **Gameplay**, **Accessibility & HUD** (full mapping in §4).
- `SETTINGS_REGISTRY` stays the single source of settings. Where each row is
  shown — its `section` and `group` (a subheader within a section) and a Video
  `cost` — lives in one table, `src/ui/settings-sections.js`, with a test that
  every registry row is placed; `category` is removed once the old screen is
  gone. The deck builds rows from row type, so adding a setting is one
  registry entry plus one line in that table.

### 2. Navigation and input

- **One input path.** The game routes keys to `deck.handleKey(code, e)` while
  in `GameState.SETTINGS`, exactly as it does for the showroom. The gamepad is
  translated first (A → Enter, B → Escape, d-pad / left stick → arrows with
  hold-to-repeat, LB / RB → Q / E). Mouse and touch use native DOM events.
- **Keys.** ▲▼ move between rows. ◀▶ adjust the focused row (stepper step,
  slider nudge, toggle flip). A / Enter activates (toggle, action, preset
  card, remap cell). LB / RB or Q / E switch section from anywhere. B / Esc
  backs out one level: remap capture → row list → close, returning to the
  opener (pause, mode select, or HUD editor).
- **Compare.** Holding Y (or C) on a Video row shows the previous value in the
  live view; releasing restores the new one. Changes apply instantly; there is
  no Apply button.
- **Reset.** X (or Backspace) resets the focused row. "Reset section" sits at
  the end of each list and asks to confirm.
- **Pointer.** Hover focuses a row and shows its description; click toggles;
  sliders drag; the list scrolls by wheel or swipe; targets are at least 44 px.
- **Footer.** The focused row's description, its note (`OFF (preset)`, a
  Low / Med / High cost label on Video rows), and device-aware prompts
  (for example Ⓐ Select · Ⓑ Back · LB/RB Section).
- **Remapping (Controls).** Each action row has a Keyboard cell and a
  Controller cell. Selecting a cell opens "Press a key / button… (Esc /
  Start cancels)", listening to that cell's device only for the binding (Esc
  or Start from either device cancels), timing out after 8 s. Start is the
  pad's cancel because it is reserved for pause and can never be a binding,
  so every other button — B included — stays bindable. An
  input already bound elsewhere shows "Already used by Sprint — swap?"
  (Ⓐ swap, Ⓑ cancel). Esc and Start are reserved for pause; menu navigation
  is fixed and not in the remappable table. Each column has "Reset to
  default". Controller bindings write through `pad-actions.js`, so prompts
  follow automatically.
- **Accessibility.** Sections are `role="tablist"` / `tab` with
  `aria-selected` and a `tabpanel`; toggles are `role="switch"` with
  `aria-checked`; sliders `role="slider"` with `aria-valuenow` / `min` / `max`
  / `valuetext`; steppers are labelled button pairs; roving `tabindex` gives
  one tab stop per list; a `role="status"` live region announces changes
  ("Bloom on").
- **Persistence.** Settings save on every change as today. Keyboard bindings
  keep their existing storage. Controller bindings add `cc_padbinds`; an
  absent or invalid entry falls back to the defaults in `pad-actions.js`.

### 3. The live view and the showcase

- **From pause.** The simulation stays frozen; the renderer keeps drawing the
  player's view each frame with the HUD, so Video and HUD changes show at
  once. From the Forge the live view is the voxel scene (already drawn behind
  pause).
- **From the menu.** `src/systems/showcase.js` starts a sandboxed showcase:
  - Installs a curated campaign level itself (map, idle enemies, palette)
    without calling the campaign loader, and restores every borrowed game
    field on close, so no save, stat, achievement, unlock, analytics,
    ARIA/squad comms or music path is reachable.
  - The level comes from an act the player has reached (a new player sees
    Act I). Each act has one curated showcase level and camera path.
  - Places a few enemies in idle animation with AI off, adds ambient sparks
    and steam so particle and effect settings have something to act on, and
    shows the equipped weapon with idle sway and a demo HUD with sample
    values.
  - Moves the camera along a looping path of 5–7 waypoints (about 40 s),
    eased with a Catmull-Rom spline, framed so the subject stays in the left
    two-thirds; a CSS gradient under the panel keeps text readable.
  - Hides the load behind a short fade and uses the environment pre-bake
    (`renderer.prewarmEnv`).
  - On close, unloads the showcase and restores the mode-select state exactly.
- **Audio.** A low ambient loop plays while the showcase is up. Releasing a
  volume slider plays a sample on that bus (a shot for SFX, a sting for
  music, an ARIA line for voice).
- **Performance.** The same adaptive quality and frame cap apply as in play.
  The panel is a solid translucent surface: no `backdrop-filter` over the
  canvas.
- **Reuse.** Camera paths and the sandbox scene set-up are the building blocks
  for the sizzle reel (a separate spec).

### 4. Content

| Section | Groups and rows |
|---|---|
| Quick | Preset cards: Battery (Battery Saver), Balanced (Auto), Max (Ultra), Custom (jumps to Video). Art-style cards with thumbnails (Legacy / Comic / Modern). A controller card (status + Calibrate) when a pad is connected. |
| Video | *Look*: art style, visual style, FOV, view mode. *Quality*: graphics preset, render scale, frame target, Battery Saver, render mode, GPU Film Grade. *Effects*: bloom, chromatic aberration, film grain, post-processing, effects quality, floor detail, screen shake, weapon bob. *Diagnostics*: performance overlay. |
| Audio | Master, music, SFX, voice volume, each with a sample on release. |
| Controls | *Mouse*: sensitivity, invert X, invert Y. *Keyboard*: remap table (absorbs `controls-screen.js`). *Controller*: status, calibrate, support on/off, look sensitivity, deadzone, rumble, remap table. *Touch* (touch devices): touch sensitivity, auto-fire, swipe weapons, haptics. *Forge*: Forge FOV, Forge invert Y. |
| Gameplay | Difficulty, hunter response, cutscene auto-advance, crosshair, minimap size. |
| Accessibility & HUD | Font scale, colourblind mode, HUD style, Edit Custom HUD, HUD scale, stamina bar size, show portrait / weapons / kills / score. |

Every Video row carries a `cost` field (low / med / high) for the footer label.

## Delivery

Four phases, each shippable and tested on its own:

1. **Deck shell.** `<settings-deck>`, registry `section` / `group` mapping,
   navigation, pointer, footer, accessibility, live view from pause. It
   replaces the canvas screen at every entry point for Settings (the old
   Controls screen stays reachable until phase 3).
2. **Showcase.** `showcase.js`, one curated level and camera path per act,
   sandbox flag, audio samples.
3. **Remapping.** Keyboard and controller remap tables, capture, conflicts,
   reset, `cc_padbinds`, prompt follow-through.
4. **Removal.** Delete `settings-screen.js`, `controls-screen.js`, the settings
   geometry in `js/layout.js` and its click / touch handling; move or rewrite
   `tests/unit/layout.test.js` settings cases and `tests/screenshots.spec.js`
   settings shots against the DOM.

## Testing

- Unit: registry mapping (every row has a section; no row lost; `category`
  unused after phase 4); camera path continuity and loop closure; showcase
  level choice never exceeds progress; remap conflict / swap / reset rules and
  `cc_padbinds` validation; pad bindings round-trip into prompts.
- Browser (GPU flags, as in `tests/settings-effects.spec.js`):
  - Keyboard-only, mouse-only and fake-gamepad passes reach and change a row
    in every section and leave the deck.
  - From mode select: showcase running, `cc_campaign_save` / stats /
    achievements byte-identical after close, state back to MODE_SELECT.
  - From pause: match resumes with identical player position and state.
  - Remap: rebind Interact to F and X-button to Y-button; prompts change;
    play responds; reset restores defaults.
  - `tests/settings-effects.spec.js` keeps passing, driven through the deck.
  - Screenshots at 375 px and 1440 px wide in Legacy, Comic and Modern.
- Accessibility: every row exposes the correct role and state; one tab stop
  per list; changes announced in the live region.

## Risks

| Risk | Mitigation |
|---|---|
| Showcase writes real progress | It never calls the campaign loader; it swaps a fixed list of game fields and restores them; unit test checks the restore and a browser test compares storage before and after. |
| Live view costs frame time behind a DOM panel | Solid translucent panel, no backdrop blur; adaptive quality unchanged; measured with `scratch/perf-scenarios.mjs`. |
| A remap locks a player out | Esc / Start and menu navigation reserved; reset per column; invalid `cc_padbinds` falls back to defaults. |
| Phone layout | Bottom sheet below 700 px; screenshots at 375 px each phase. |
| Canvas-coordinate tests break | Phase 4 rewrites them against the DOM; no deletion before the replacement passes. |

## Non-goals

- The sizzle reel itself (separate spec; reuses the showcase).
- New settings beyond reorganising the existing ones, apart from remapping and
  `cost` labels.
- Remapping menu navigation.
- Pause-menu controller navigation beyond what reaching Settings needs (the
  pause menu itself is unchanged here).
