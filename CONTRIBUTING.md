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

I have a detailed roadmap (see `ROADMAP.md`) and a large backlog. Your suggestion may already be planned, deferred, or intentionally excluded. I'll do my best to respond, but no guarantees on timeline.

---

## 🔧 Development Setup

### Playing the Game
```
Open index.html in a modern browser. That's it. No build step required.
```

### Running Tests (Optional — For Contributors)
The test infrastructure uses Playwright and is intentionally **not part of the public game**. All testing files (`tests/`, `package.json`, `node_modules/`, `playwright.config.js`, etc.) are gitignored.

If you're contributing code and want to run tests locally:
```bash
npm install
npx playwright install
npx playwright test
```

### Project Structure
```
index.html          — Entry point (open in browser)
style.css           — All UI styling
js/game.js          — Core game engine (~9,600 lines)
js/data.js          — Game data (maps, enemies, weapons, dialogue)
js/renderer.js      — DDA raycaster + sprite rendering
js/audio.js         — Procedural Web Audio synthesis
js/main.js          — Boot, game loop, HTML wiring
js/builder.js       — Builder mode (Temporal Forge)
js/meltdown.js      — Meltdown: Reactor Run (endless runner)
js/cutscene.js      — Cutscene engine
js/touch.js         — Mobile touch controls
js/entities.js      — Entity classes
js/settings-registry.js — Settings system
js/layout.js        — Shared geometry helpers
```

---

## 📋 Pull Request Guidelines

If you do open a PR:

1. **Keep it small and focused.** One fix per PR. Don't bundle unrelated changes.
2. **Describe what you changed and why.** Include before/after screenshots for visual changes.
3. **Test on at least 2 browsers** (Chrome + one other).
4. **Don't modify core architecture** without prior discussion in an issue.
5. **Don't add external dependencies.** This is a zero-dependency vanilla JS project. That's intentional.
6. **Don't commit** `node_modules/`, `package.json`, `package-lock.json`, test results, or any gitignored files.

---

## 📜 Code of Conduct

Be respectful. Be constructive. We're all here to make a great game. Toxic behavior, harassment, or bad-faith contributions will result in a ban. No exceptions.

---

## ❤️ Thank You

Even if your contribution doesn't get merged, the fact that you took the time to play, report bugs, or suggest improvements means a lot. Every stack trace, every screenshot, every "hey this is broken on my phone" message helps make Clockwork Carnage better for everyone.

Let's build something great. 🎮
