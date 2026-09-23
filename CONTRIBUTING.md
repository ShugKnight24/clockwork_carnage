# Contributing to Clockwork Carnage

Thanks for your interest in Clockwork Carnage! Please read this before opening issues or pull requests.

---

## 🚀 How This Project Works

Clockwork Carnage is an **AI-assisted solo developer project**. Development moves fast and priorities shift constantly. This means:

- **I may not have time to review or merge your PR.** This isn't personal — things are moving quickly and I need to stay focused on the roadmap.
- **Large overhauls will almost certainly not be accepted** unless they're extremely targeted, well-documented, and backed by evidence (benchmarks, user reports, focus group data, etc.).
- **Small, targeted contributions** — bug fixes, typo corrections, accessibility improvements — have the best chance of being reviewed.

> **TL;DR:** Before spending hours on a feature PR, open an issue first to discuss it. I'd rather save you the effort than reject a large PR after the fact.

---

## 🐛 Bug Reports — YES PLEASE

Bug reports are **incredibly valuable**. The more information you provide, the faster I can fix it. A great bug report includes:

### Required Information

- **Device & OS** — e.g., iPhone 14 / iOS 17.2, Samsung Galaxy S23 / Android 14, Windows 11 PC
- **Browser & Version** — e.g., Chrome 124, Safari 17.4, Firefox 125
- **Screen Resolution** — e.g., 1920×1080, 390×844 (mobile)
- **Game Mode** — Campaign (which act/level?), Arena (which round?), Builder, Meltdown

### Highly Appreciated (The More The Better)

- **Steps to reproduce** — Exact sequence of actions that trigger the bug
- **Stack traces** — Open browser DevTools (F12) → Console tab → copy any red error messages
- **Screenshots** — What does it look like when it breaks?
- **Screen recordings / testing videos** — These are gold. Even a phone recording of your screen helps enormously
- **Frequency** — Does it happen every time, or intermittently?

### Why This Matters

This game runs on many different devices, browsers, and screen sizes. I can't own every phone or tablet. **Cross-device testing from real users is critical.** If you can reproduce a bug reliably and provide evidence, that saves me hours of debugging.

---

## 💡 Feature Requests

Feature requests are welcome as GitHub Issues. Please include:

- **What** you'd like to see
- **Why** — What problem does it solve? What's the player experience improvement?
- **Evidence** — Links to similar features in other games, user feedback, benchmarks, etc.
- **Scope** — Is this a small tweak or a major system? Be honest about the effort involved.

I have a detailed roadmap and a large backlog, but they live in local planning files (`ROADMAP.md`, `REVIEW.md`, `TESTING.md`, `NOTES.md`, `IDEAS.md`) that are gitignored and therefore not visible in a clone. For an outside contributor, [GitHub Issues](../../issues) is the only public view of what's being worked on — open one and I'll say whether it's already planned, deferred, or intentionally excluded. I'll do my best to respond, but no guarantees on timeline.

---

## 🔧 Development Setup

### Running the Game

This is a Vite app. Opening `index.html` from disk no longer works — the page sets a `default-src 'self'` CSP and the boot script reads `import.meta.env.BASE_URL`.

```bash
npm install
npm run dev     # Vite dev server on http://localhost:3000
```

A production build is committed to `dist/` and refreshed in explicit "build: refresh dist bundle" commits. To rebuild it:

```bash
npm run build
```

### Running the Tests

`tests/`, `package.json`, `package-lock.json`, `playwright.config.js` and `vite.config.js` are all tracked, so a fresh clone can install and run everything below.

```bash
npm install
npx playwright install                   # once, for the browser binaries

npm run test:unit                        # vitest — 51 files, 843 tests
npx playwright test tests/smoke.spec.js  # 17 smoke checks
npm run build                            # the vite build must succeed
```

`npx playwright test` with no arguments runs all 24 specs, which takes considerably longer. CI (`.github/workflows/ci.yml`) runs four stages on push: syntax-check, unit-tests, build, smoke-test.

**Caveat:** `scripts/` is gitignored, so the npm scripts that shell into it — `assets:manifest`, `assets:generate`, `assets:build`, `review`, `review:strict` — cannot run from a clean clone. Neither can `simulate`, which needs the gitignored `simulations/`.

**WebGL2 in CI:** plain headless Chromium has no WebGL2, so `playwright.config.js` launches Chromium with `--use-gl=angle --enable-gpu`. Without those flags the Forge (and the WebGL2 hybrid renderer) can't initialize and its specs fail.

### Project Structure

```
index.html          — Vite entry; boots js/main.js and the title web components
style.css           — DOM/menu styling
vite.config.js      — build config and vitest config
dist/               — committed production build

js/                 — app shell and entry point (23 top-level modules)
  main.js           — boot, frame loop, dev-tool wiring
  game.js           — game object and state machine (~3,100 lines)
  renderer.js       — DDA raycaster, sprite rendering, WebGL2 init and the hybrid GL path
  audio.js          — procedural Web Audio synthesis
  forge.js          — Forge (voxel builder)
  meltdown.js       — Meltdown: Reactor Run (endless runner)
  cutscene.js       — cutscene engine
  touch.js          — mobile touch controls
  input-manager.js  — keyboard/mouse state, keybinds, pointer lock
  layout.js         — shared screen geometry and hit-testing
  settings-registry.js — settings definitions
  entities.js       — entity classes
  data.js           — 18-line barrel re-exporting src/data/
  components/       — web components used in the title markup
  testing/          — debug bridge and bots; loaded only when dev tools are on
  net/              — multiplayer prototype; currently referenced by nothing

src/                — the bulk of the code (129 modules, ~57,700 lines)
  constants.js      — shared tuning values
  core/             — save system and persistence
  data/             — weapons, enemies, walls, dialogue, cosmetics, achievements, levels/
  world/            — voxel world data, physics, saves, legacy conversion
  rendering/        — render pipeline, textures, post-FX, props, weather,
                      plus enemies/, env/, svg-art/ (Comic and Modern art) and webgl/
    voxel/          — WebGL2 chunk renderer, mesher, atlas, shaders (the Forge)
  systems/          — AI, aim, combat, physics, player and projectile updates,
                      spawner, input dispatch, archive, unlocks
  ui/               — HUD variants, settings, character creator, archive,
                      upgrade and game-over screens
  utils/            — math, seeded RNG, pooling, profiling
  assets/           — manifest-backed image loader
```

---

## 📋 Pull Request Guidelines

If you do open a PR:

1. **Keep it small and focused.** One fix per PR. Don't bundle unrelated changes.
2. **Describe what you changed and why.** Include before/after screenshots for visual changes.
3. **Test on at least 2 browsers** (Chrome + one other).
4. **Don't modify core architecture** without prior discussion in an issue.
5. **Don't add runtime dependencies.** The shipped game imports nothing but its own modules, and that's intentional. Dev tooling is fine — there are four devDependencies (`vite`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`) — but adding a fifth needs a good reason.
6. **Don't commit** `node_modules/`, test results, screenshots, or anything else matched by `.gitignore`. `package.json` and `package-lock.json` *are* tracked; update them when you change dependencies.

---

## 📜 Code of Conduct

Be respectful. Be constructive. We're all here to make a great game. Toxic behavior, harassment, or bad-faith contributions will result in a ban. No exceptions.

---

## ❤️ Thank You

Even if your contribution doesn't get merged, the fact that you took the time to play, report bugs, or suggest improvements means a lot. Every stack trace, every screenshot, every "hey this is broken on my phone" message helps make Clockwork Carnage better for everyone.

Let's build something great. 🎮
