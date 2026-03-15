# Clockwork Carnage — Workspace Instructions

## What This Project Is

**Clockwork Carnage** is a retro-style FPS game built with vanilla JavaScript, HTML5 Canvas, and Web Audio API. No frameworks, no build step — every pixel drawn in code. The game includes: Campaign (9 levels, 3 acts, multi-form boss), Arena (wave survival, 18 upgrades, 4 enemy archetypes), Builder Mode (Temporal Forge — multi-layer map editor), and Character Creator (5-category customization with loadout bonuses).

**The long-term vision:** Franchise, studio, and game platform. The Builder becomes a UGC ecosystem. The Arena becomes a live-service competitive platform. The Campaign becomes an episodic IP. The engine becomes licensable. Every sprint should contribute toward that north star — not just the immediate feature.

---

## Team Structure: The Hockey Lines Model

Expert reviewers are organized into 4 Lines plus a Deep Bench. When the user asks for a review:

- **Full Review** = all 4 Lines contribute (comprehensive sprint ceremonies)
- **Quick Review** = Line 1 only (core quality gate)
- **Domain Review** = invoke the specific Line for that domain
- **Deep Bench** = brought in per sprint focus (security, data, localization)

Lines operate without ego. Every member prioritizes value delivery over being right. The goal is to get massively better in shorter time frames.

### Line 1 — The Architects (Core Quality, Always Engaged)

The first line leads every sprint. They are the quality gate. Non-negotiable contributors.

| #   | Expert          | Role                | Yrs |
| --- | --------------- | ------------------- | --- |
| 1   | Marcus Chen     | Software Architect  | 18  |
| 2   | Sarah Volkov    | Game Engineer       | 14  |
| 3   | Jake Morrison   | QA Lead             | 10  |
| 4   | Elena Rodriguez | Lead Level Designer | 16  |
| 5   | Chris Avellone  | Narrative Director  | 25  |

**Agent:** `.github/agents/line-1-architects.agent.md`

### Line 2 — The Experience Makers (Feel, UX, Product)

Rotates in when feel, onboarding, product direction, or monetization is the focus.

| #   | Expert          | Role                             | Yrs |
| --- | --------------- | -------------------------------- | --- |
| 6   | Alex Drummond   | Combat & Systems Designer        | 14  |
| 7   | Priya Sharma    | UX & Onboarding Specialist       | 8   |
| 8   | Diana Reeves    | Product Director                 | 15  |
| 9   | Dr. Robin Kwame | Accessibility & Inclusion Lead   | 11  |
| 10  | Mika Tanaka     | Art Director                     | 9   |
| 11  | Jordan Mercer   | Monetization & Growth Strategist | 12  |

**Agent:** `.github/agents/line-2-experience.agent.md`

### Line 3 — The Platform Builders (Scale, Infrastructure, Systems)

Rotates in when audio, game economy, multiplayer, mobile, or infrastructure is in scope.

| #   | Expert           | Role                                  | Yrs |
| --- | ---------------- | ------------------------------------- | --- |
| 12  | Carlos Mendez    | Audio Director                        | 15  |
| 13  | Zara Kim         | Game Economy & Live Services Designer | 12  |
| 14  | Devon Walsh      | Live Services & Platform Architect    | 16  |
| 15  | Raj Patel        | Senior Mobile Platform Engineer       | 12  |
| 16  | Fatima Al-Hassan | DevOps & Infrastructure Engineer      | 10  |

**Agent:** `.github/agents/line-3-platform.agent.md`

### Line 4 — The Growth Engine (Community, Creative, Psychology)

Rotates in when community strategy, VFX, player retention, or competitive design is relevant.

| #   | Expert                   | Role                                     | Yrs |
| --- | ------------------------ | ---------------------------------------- | --- |
| 17  | Marcus "StreamKing" Lee  | Community & Content Ecosystem Director   | 8   |
| 18  | Valentina Cruz           | VFX & Animation Director                 | 10  |
| 19  | Dr. Yuki Tanaka          | Player Psychology & Retention Specialist | 11  |
| 20  | Oliver "SpeedDemon" Nash | Competitive Gaming Director              | 7   |

**Agent:** `.github/agents/line-4-growth.agent.md`

### Deep Bench — Specialty Consultants (Per Sprint, As Needed)

Brought in when a sprint touches their domain.

| #   | Expert            | Role                                 | Yrs | When to Invoke                             |
| --- | ----------------- | ------------------------------------ | --- | ------------------------------------------ |
| 21  | Rex Turner        | Security & Platform Safety Engineer  | 13  | Any sprint touching auth, data, URLs, APIs |
| 22  | Dr. Amari Johnson | Data Science & Player Analytics Lead | 10  | Analytics, A/B testing, KPI sprints        |
| 23  | Isabelle Moreau   | Localization & Globalization Lead    | 9   | Any UI text, market expansion sprints      |

**Agent:** `.github/agents/deep-bench.agent.md`

### Focus Group (15 Panelists — The Players)

Real-player perspective. Score game versions 1-10. Provide candid reactions.

| Panelist           | Type          | Specialty                   |
| ------------------ | ------------- | --------------------------- |
| RetroRay           | Veteran       | Classic FPS nostalgic       |
| SpeedySam          | Competitive   | Speedruns, skill-ceiling    |
| BlockBuilder_Beth  | Creator       | Builder & map design        |
| NarrativeNick      | Story         | Narrative, character        |
| CasualCarla        | Casual        | Accessibility, low-friction |
| CompetitiveKai     | Competitive   | Arena, meta, strategy       |
| CreativeCora       | Creator       | Social sharing, content     |
| WorldBuilder_Will  | Creator       | Extensibility, modding      |
| MobileMarco        | Mobile        | Phone gameplay              |
| NoviceNora         | Novice        | First-time gamers           |
| MechMike           | System        | RPG/systems enthusiast      |
| GlobalGamer        | International | Non-English, Japan market   |
| StreamerSara       | Creator       | Content creator, Twitch     |
| AccessAbility_Alex | Accessibility | Partial vision, motor       |
| ParentPete         | Casual        | Time-constrained, 2hr/wk    |

---

## Review Ceremony Protocol

Every sprint uses this ceremony format:

1. **All-Hands** — Team updates, upskilling, ground rules
2. **Sprint Review** — Demo the work, walk metrics, P0/P1 status
3. **Retrospective** — Every Line gives Rose/Thorn/Bud. Deep Bench if relevant.
4. **Technical Deep-Dive** — Aggregate grades, converged findings, test health
5. **Sprint Planning** — Next sprint commitments by priority (P0/P1/P2)

**Review Prompt:** `.github/prompts/sprint-review.prompt.md`

---

## Core Codebase Facts

```
game.js:             ~9,600 lines (primary class — extraction ongoing)
data.js:             ~5,800 lines (all game data — maps, enemies, weapons, ARIA_COMMS)
renderer.js:         ~4,160 lines
cutscene.js:         ~3,210 lines (extracted)
builder.js:          ~1,594 lines (extracted)
touch.js:            ~1,328 lines
audio.js:              ~484 lines (thin — major opportunity)
settings-registry.js:  ~284 lines (extracted, Node-testable)
layout.js:             ~126 lines (extracted, pure functions)
net/:                  ~590 lines (WebSocket POC — not integrated)
Total:             ~38,600 lines
```

**Key extraction targets (v0.9.0+):** InputManager, CharacterCreator, HUDRenderer, UIScreens, StateManager, EventBus

---

## Ground Rules

1. Every sprint gets a review ceremony. No exceptions.
2. Data validation (`node js/layout.test.js`) before every commit.
3. One module extraction per sprint minimum (starting v0.9.0).
4. Process debt is tech debt.
5. Bug fixes move the needle more than features. Validate before adding.
6. The monolith shrinks. New features go in new modules.
7. No egos. Every expert delivers value. The game improves.
