# Testing and benchmarking on another machine

Two ways to look at a machine that plays badly. The benchmark needs only a
browser. The full suite needs a clone of the repo.

## 1. Benchmark in the browser (no install)

Open the live game with `?bench`:

```
https://shugknight24.github.io/clockwork_carnage/?bench
```

Leave the tab in front and keep the mouse still for about 35 seconds. The game
loads Act I, level 1, and plays four phases: looking around, firing at nothing,
firing into tough targets, then killing waves of drones. A panel then shows the
results. **Copy report** and **Download JSON** give the full report to share.

| Option | Effect |
| --- | --- |
| `?bench&art=2` | Run in a given art style: 0 Legacy, 1 Comic, 2 Modern |
| `?bench&fixed` | Hold the render scale at 1, to measure the raw cost with no adaptive downscaling |

How to read the table:

- **p50 / p95 / p99** are frame times in ms. At 60 Hz a frame has 16.7 ms.
  **>33ms** counts frames that missed two refreshes, which you feel as a stutter.
- **CPU ms** is the game's own update + render work per frame. When p50 is well
  above CPU ms, the GPU (or the browser's compositor) is the bottleneck, not the
  game's code.
- **long** counts main-thread tasks over 50 ms: freezes, not slow frames.
- **scale** is the adaptive render scale at the end of the phase. Below 1 means
  the game lowered its resolution to keep up.

The report also records the GPU, core count, screen, device pixel ratio,
renderer path and graphics settings.

## 2. Full test suite

Requires Node 24 (the version CI uses) and git.

```bash
git clone https://github.com/ShugKnight24/clockwork_carnage.git
cd clockwork_carnage
npm ci
npx playwright install chromium
```

On Linux, add `--with-deps` to the last command.

| Command | What runs |
| --- | --- |
| `npm run test:unit` | Vitest unit tests, no browser (about 10 s) |
| `npm run test:smoke` | Boot, menus and a level in Chromium |
| `npm test` | Every Playwright spec (tens of minutes) |
| `npm run test:perf` | Frame budgets across device profiles, one worker |
| `npm run bench` | The benchmark above, in a Playwright window |

Playwright starts its own Vite server on port 3100. If something else holds that
port, or `npm run dev` is already running, point the tests at it with
`CC_TEST_PORT` (`$env:CC_TEST_PORT=5173` in PowerShell):

```bash
CC_TEST_PORT=5173 npm test
```

Failures leave a trace, screenshot and video in `test-results/`.
`npm run report` opens the HTML report.

Known flaky specs, unrelated to machine speed:

- `bots.spec.js`
- `aim-bot.spec.js`
- the "exactly one callback per frame" test in `loop.spec.js`
- the "smuggle in a locked symbol" test in `customization.spec.js`

### Benchmark from the command line

`npm run bench` opens a browser window, runs the benchmark, prints the table and
saves the JSON in `bench-results/`.

| Flag | Effect |
| --- | --- |
| *(none)* | Local dev server (`npm run dev` first; port from `CC_TEST_PORT`, default 5173) |
| `--live` | The GitHub Pages build |
| `--url <url>` | Any deployment |
| `--chrome` | Installed Google Chrome instead of Playwright's Chromium: closest to what a player runs |
| `--art 0\|1\|2`, `--fixed` | As the query options above |
| `--headless` | No window. CPU figures only: a headless browser may render on the CPU |
| `--out <file>` | Where to write the report |

Example: `npm run bench -- --live --chrome`.

The browser's performance panel (DevTools, then Performance, then Record while
playing) shows where a stutter's time goes: long yellow blocks are scripts,
green blocks are painting and the GPU.
