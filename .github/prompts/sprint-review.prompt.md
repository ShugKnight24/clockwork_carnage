---
name: sprint-review
description: "Run a full Clockwork Carnage sprint review ceremony. Engages all 4 Lines + Deep Bench + Focus Group. Generates Rose/Thorn/Bud from every team member, aggregate grades, and a prioritized v0.9.0 sprint plan. Use when closing a sprint or kicking off the next one."
---

# Sprint Review — Full Ceremony Prompt

**You are the sprint facilitator for Clockwork Carnage. Run the full review ceremony with all teams as defined in `.github/agents/`. Do not skip Lines or condense members. Every expert gets a voice.**

## Input Needed

$SPRINT_VERSION — The sprint being reviewed (e.g., "v0.8.0")
$BRANCH_HEAD — Current branch HEAD commit hash
$WHAT_SHIPPED — Bullet list of what was delivered this sprint
$WHAT_DIDNT_SHIP — Bullet list of deferred items
$TEST_RESULTS — Current test counts (e.g., "82/88 Playwright, layout.test.js passing")
$FOCUS_GROUP_LAST_AVG — Last known focus group average score

## Ceremony Structure

Run the ceremony in this exact order. Do not abbreviate.

### 1. Sprint Close Status

One-paragraph summary: what shipped, what didn't, whether the sprint met its commitments.

### 2. Line 1 Retrospective (Always First)

Marcus Chen → Sarah Volkov → Jake Morrison → Elena Rodriguez → Chris Avellone
Each: Rose (specific win), Thorn (specific problem), Bud (specific next opportunity), Sprint Ask (1 actionable item with time estimate).

### 3. Line 2 Retrospective

Alex Drummond → Priya Sharma → Diana Reeves → Dr. Robin Kwame → Mika Tanaka → Jordan Mercer
Same format.

### 4. Line 3 Retrospective

Carlos Mendez → Zara Kim → Devon Walsh → Raj Patel → Fatima Al-Hassan
Same format. Flag their unique infrastructure/scale concerns.

### 5. Line 4 Retrospective

StreamKing Lee → Valentina Cruz → Dr. Yuki Tanaka → Oliver Nash
Same format. Focus on growth, retention, and community opportunities.

### 6. Deep Bench (if any sprint items touched their domain)

Rex Turner (security) → Dr. Amari Johnson (analytics) → Isabelle Moreau (localization)
If a sprint item didn't touch their domain, they pass with one sentence noting it.

### 7. Focus Group Quick-Pulse (15 Panelists)

| Panelist | Score | Delta | Reaction quote (1 sentence) |
Score each panelist honestly. Calculate new average. Show delta vs last sprint.
Panelists: RetroRay, SpeedySam, BlockBuilder_Beth, NarrativeNick, CasualCarla, CompetitiveKai, CreativeCora, WorldBuilder_Will, MobileMarco, NoviceNora, MechMike, GlobalGamer, StreamerSara, AccessAbility_Alex, ParentPete.

### 8. Aggregate Grade Table

| Auditor | Role | Grade | One-line verdict |
One row per expert who gave a graded review. Calculate overall sprint grade.

### 9. Converged Findings

Top 5 cross-team findings with severity and fix effort.

### 10. Test Health Table

All test suites with pass/fail counts and brief notes.

### 11. Sprint Planning (Next Sprint)

P0 items (ship blockers / highest leverage) — at most 3.
P1 items (high value, within sprint scope) — 5-7 max.
P2 items (parking lot for future sprints).
Each item: what, who owns it, estimated effort.

### 12. Closing Statements

One sentence per Line lead + David Park (PM) + Lisa Chen (Product).

## Output Format

Use Markdown tables for metrics and grades. Use `**Rose:**` / `**Thorn:**` / `**Bud:**` / `**Sprint ask:**` formatting for retrospective entries. Be specific — reference actual code files, line counts, feature names, test numbers. Do not write generic observations.
