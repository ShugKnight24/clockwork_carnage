# Clockwork Carnage — Episode 1: The Alpha Protocol

A retro-style first-person shooter built entirely with vanilla JavaScript, HTML5 Canvas, and procedural art. No frameworks. No hand-drawn art. Every pixel drawn in code.

## Play

```bash
npm install
npm run dev
```

Then open the URL Vite prints. A production build is committed to `dist/`, so you can also serve that directory over HTTP. Opening `index.html` straight from disk will not work.

## Features

**Campaign Mode** — 3-act story through the 9 levels of Chronos Station. Each act revisits the station with a new enemy roster, new briefings and a stronger form of the Paradox Lord. Cutscenes, a comic book origin sequence, and ARIA, your AI companion, who provides tactical callouts, idle chatter, and personality.

**Arena Mode** — Endless wave survival with 4 difficulty settings, 18 upgrades, kill streaks (DOUBLE KILL → GODLIKE), slow-mo last kills, and stats tracking.

**Builder Mode (Temporal Forge)** — Design your own levels with a multi-layer editor. Undo/redo, export/import as JSON, multi-map save slots, spawn point placement, and play-test your creations.

**Character Creator** — Customize across 5 categories, pick a loadout class that sets your starting weapons and stat bonuses, and earn gear from campaign kills.

- Work in progress - Still improving graphical fidelity, making selections impact gameplay, and adding more options.

**Archive** — A bestiary that fills in as you kill each enemy type, and Dead Squad memory fragments recovered by finishing levels and breaking open secret walls. Progress is account-wide.

**Three art styles** — Comic (default) draws cutscenes, the title, viewmodels, sprites and the HUD as inked, runtime-generated vector art. Modern is the realistic take on the same world: physically shaded materials with no ink lines, filmic tonemapping, lamps that pool light on the floor, enemies and props lit by the light they stand in, contact shadows, and a thin translucent HUD. Legacy is the original procedural canvas look. Switch on the title screen or in Settings; only the chosen style is ever drawn.

**Hybrid renderer** — Floor and ceiling can render through a WebGL2 shader and composite onto the Canvas2D frame; walls, sprites and HUD stay Canvas2D. Set it to Auto, 2D or WebGL in Settings, and it falls back to the software path wherever WebGL2 is unavailable.

**Accessibility** — Colorblind mode, font scaling, mobile touch controls, orientation lock.

## Controls

| Action         | Key                    |
| -------------- | ---------------------- |
| Move           | WASD                   |
| Look           | Mouse                  |
| Shoot          | Left Click             |
| Aim (ADS)      | Hold Right Click       |
| Sprint         | Shift                  |
| Dash           | Double-tap WASD        |
| Crouch         | Ctrl                   |
| Slide          | Ctrl while sprinting   |
| Chrono Shift   | Hold Q                 |
| Interact       | E                      |
| Weapons 1-8    | 1-8                    |
| Cycle weapons  | Mouse wheel            |
| Pause          | ESC / P                |
| Toggle FPS     | F                      |

All controls are rebindable in Settings → Controls.

**Settings** is reachable from the pause menu and from the mode-select screen (key `9`). Every row carries a one-line description, the list scrolls, and the whole screen is clickable with the mouse.

**Builder:** WASD to move, Mouse to look, Left Click to place, Right Click to remove, Q/E to switch layers, T for spawn points, Ctrl+Z/Ctrl+Shift+Z for undo/redo, Ctrl+E/I for export/import.

**Mobile:** Full touch control support with virtual joystick and action buttons.

## Credits

Built as an AI-augmented development experiment. Open to suggestions.
