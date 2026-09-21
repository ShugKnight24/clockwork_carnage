# Three-Player Playtest Gate

Purpose: catch broken modes, stuck states, unprogressable sequences, and invalid game state before manual playtest.

## Players

- `scout`: deterministic route checker. Skips cutscenes, clears blockers, verifies each mode can enter and finish a minimal loop.
- `striker`: combat-forward checker. Uses more input variation while still clearing objectives.
- `gremlin`: stress player. Adds seeded movement, key, and mouse noise while verifying the game remains recoverable.

## Modes Covered

- `tutorial`: reaches training complete, then verifies campaign handoff.
- `campaign`: loads each of the 8 non-boss levels in Act 1, clears enemies and reaches the exits, then fights the boss level once per act and asserts the transitions: the act-1 and act-2 bosses must open the next act at Level 1, and the act-3 boss must reach `VICTORY`.
- `arena`: clears three rounds and verifies upgrade-to-next-round flow.
- `meltdown`: starts an endless run and verifies forward progress through upgrade interruptions.
- `builder`: enters Forge, starts playtest, clears/returns, then quits without stale mode state.
- `customize`: enters creator, changes/saves, and returns to mode select.

## Run

```bash
npm run test:gate
```

Browser console equivalent:

```js
ccTest.gate({ players: ["scout", "striker", "gremlin"], modes: "all" })
```

`window.ccTest` only exists when dev tools are enabled — that is, under `npm run dev`, or on any build loaded with a `?debug` query parameter. `js/main.js` skips loading `js/testing/` entirely otherwise, so on a plain production page `ccTest` is undefined.

## Failure Rules

The gate fails on invalid game states, page errors, non-finite player values, player outside map, dead player stuck in `playing`, no progress for the stuck window, or mode-specific completion failure.

Chaos is deterministic per `player:mode`, so a failure should reproduce with the same gate inputs.

When adding a new mode, add one scenario to `js/testing/playtest-gate.js` and include it in `DEFAULT_MODES` after the mode can enter, make progress, and exit safely.
