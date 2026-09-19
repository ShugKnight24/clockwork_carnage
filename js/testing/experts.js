/**
 * Clockwork Carnage — Expert Review Engine
 *
 * Simulates ruthless industry experts tearing the game apart from
 * every professional angle. Each expert runs automated audits and
 * produces structured findings with severity ratings.
 *
 * Findings: { severity: "critical"|"major"|"minor"|"nit", area, finding, evidence }
 *
 * PROPRIETARY — not shipped with the game.
 */

// ── Severity Levels ──────────────────────────────────────
const SEV = {
  CRITICAL: "critical",
  MAJOR: "major",
  MINOR: "minor",
  NIT: "nit",
};

// ══════════════════════════════════════════════════════════
//  EXPERT: UX Designer — "Does this feel good to use?"
// ══════════════════════════════════════════════════════════
export function auditUX(page, dom) {
  const findings = [];

  // ── Touch target sizes (WCAG: minimum 44x44px) ────────
  const buttons = dom.querySelectorAll("button, .mode-btn, .back-btn");
  buttons.forEach((btn) => {
    const rect = btn.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      findings.push({
        severity: SEV.MAJOR,
        area: "touch-targets",
        finding: `Button "${btn.textContent.trim().slice(0, 30)}" touch target too small`,
        evidence: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          min: 44,
        },
      });
    }
  });

  // ── Text readability — font sizes under 12px ──────────
  const allText = dom.querySelectorAll("h1, h2, p, div, span, button");
  allText.forEach((el) => {
    const style = window.getComputedStyle(el);
    const size = parseFloat(style.fontSize);
    if (
      size > 0 &&
      size < 12 &&
      el.textContent.trim().length > 0 &&
      el.offsetParent !== null
    ) {
      findings.push({
        severity: SEV.MINOR,
        area: "readability",
        finding: `Text "${el.textContent.trim().slice(0, 40)}" font-size ${size}px < 12px minimum`,
        evidence: {
          element: el.tagName,
          fontSize: size,
          text: el.textContent.trim().slice(0, 60),
        },
      });
    }
  });

  // ── Color contrast — check key text elements ──────────
  const contrastTargets = dom.querySelectorAll(
    "h1, h2, .mode-desc, .start-prompt, .coming-soon, .back-btn",
  );
  contrastTargets.forEach((el) => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bg = style.backgroundColor;
    // Parse rgb values
    const fg = parseRGB(color);
    const bgc = parseRGB(bg);
    if (fg && bgc) {
      const ratio = contrastRatio(luminance(fg), luminance(bgc));
      if (ratio < 4.5) {
        findings.push({
          severity: ratio < 3 ? SEV.MAJOR : SEV.MINOR,
          area: "contrast",
          finding: `"${el.textContent.trim().slice(0, 30)}" contrast ratio ${ratio.toFixed(1)}:1 (need 4.5:1)`,
          evidence: {
            foreground: color,
            background: bg,
            ratio: +ratio.toFixed(2),
          },
        });
      }
    }
  });

  // ── Interactive element focus indicators ───────────────
  buttons.forEach((btn) => {
    const style = window.getComputedStyle(btn);
    const outline = style.outlineStyle;
    const hasFocusVisible =
      dom.querySelector(`${btn.tagName}:focus-visible`) !== null;
    // Check base outline — if set to "none" with no replacement
    if (outline === "none" && !style.boxShadow.includes("rgb")) {
      findings.push({
        severity: SEV.MINOR,
        area: "focus-indicators",
        finding: `Button "${btn.textContent.trim().slice(0, 30)}" may lack visible focus indicator`,
        evidence: { outline, boxShadow: style.boxShadow },
      });
    }
  });

  // ── Clickable area dead zones ──────────────────────────
  const modeSelect = dom.querySelector("#modeSelect");
  if (modeSelect) {
    const msRect = modeSelect.getBoundingClientRect();
    const btnEls = modeSelect.querySelectorAll(".mode-btn:not(.hidden)");
    let totalBtnArea = 0;
    btnEls.forEach((b) => {
      const r = b.getBoundingClientRect();
      totalBtnArea += r.width * r.height;
    });
    const screenArea = msRect.width * msRect.height;
    const btnCoverage = totalBtnArea / screenArea;
    if (btnCoverage < 0.08) {
      findings.push({
        severity: SEV.MINOR,
        area: "layout",
        finding: `Mode select buttons cover only ${(btnCoverage * 100).toFixed(1)}% of screen — lots of dead space`,
        evidence: {
          buttonArea: Math.round(totalBtnArea),
          screenArea: Math.round(screenArea),
        },
      });
    }
  }

  // ── Loading time perception ────────────────────────────
  // Checked externally in Playwright (see expert spec)

  return { expert: "UX Designer", findings };
}

// ══════════════════════════════════════════════════════════
//  EXPERT: Accessibility Specialist — "Can everyone play?"
// ══════════════════════════════════════════════════════════
export function auditAccessibility(page, dom) {
  const findings = [];

  // ── Missing ARIA labels on interactive elements ────────
  const interactives = dom.querySelectorAll(
    "button, canvas, [role], a, input, select",
  );
  interactives.forEach((el) => {
    const hasLabel =
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby") ||
      el.getAttribute("title") ||
      (el.tagName === "BUTTON" && el.textContent.trim());
    if (!hasLabel) {
      findings.push({
        severity: SEV.MAJOR,
        area: "aria-labels",
        finding: `${el.tagName}#${el.id || "(no id)"} missing accessible name`,
        evidence: { tag: el.tagName, id: el.id, role: el.getAttribute("role") },
      });
    }
  });

  // ── Canvas accessibility — no alt text or ARIA ─────────
  const canvases = dom.querySelectorAll("canvas");
  canvases.forEach((c) => {
    if (!c.getAttribute("aria-label") && !c.getAttribute("role")) {
      findings.push({
        severity: SEV.MAJOR,
        area: "canvas-a11y",
        finding: `Canvas#${c.id} has no aria-label or role — screen readers see nothing`,
        evidence: { id: c.id },
      });
    }
  });

  // ── Keyboard navigation ────────────────────────────────
  const focusables = dom.querySelectorAll(
    "button:not(.hidden), a, input, [tabindex]",
  );
  const tabOrder = [];
  focusables.forEach((el) => {
    const idx = el.tabIndex;
    if (idx >= 0)
      tabOrder.push({ el: el.tagName + "#" + el.id, tabIndex: idx });
  });
  // Check for positive tabindex (anti-pattern)
  const positiveTab = tabOrder.filter((t) => t.tabIndex > 0);
  if (positiveTab.length > 0) {
    findings.push({
      severity: SEV.MINOR,
      area: "tab-order",
      finding: `${positiveTab.length} element(s) with positive tabIndex — disrupts natural tab order`,
      evidence: positiveTab,
    });
  }

  // ── Language attribute ─────────────────────────────────
  const html = dom.querySelector("html");
  if (html && !html.getAttribute("lang")) {
    findings.push({
      severity: SEV.MAJOR,
      area: "language",
      finding:
        "HTML element missing lang attribute — screen readers can't determine language",
      evidence: {},
    });
  }

  // ── Heading hierarchy ──────────────────────────────────
  const headings = Array.from(dom.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  let lastLevel = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1]);
    if (level > lastLevel + 1 && lastLevel > 0) {
      findings.push({
        severity: SEV.MINOR,
        area: "heading-hierarchy",
        finding: `Heading jump from h${lastLevel} to h${level} — skipped level(s)`,
        evidence: {
          from: `h${lastLevel}`,
          to: h.tagName,
          text: h.textContent.trim(),
        },
      });
    }
    lastLevel = level;
  });

  // ── Reduced motion preference ──────────────────────────
  const styleSheets = Array.from(dom.styleSheets || []);
  let hasReducedMotion = false;
  try {
    for (const sheet of styleSheets) {
      const rules = Array.from(sheet.cssRules || []);
      for (const rule of rules) {
        if (
          rule.media &&
          rule.media.mediaText.includes("prefers-reduced-motion")
        ) {
          hasReducedMotion = true;
        }
      }
    }
  } catch (e) {
    /* cross-origin sheet */
  }
  if (!hasReducedMotion) {
    findings.push({
      severity: SEV.MINOR,
      area: "motion",
      finding:
        "No @media (prefers-reduced-motion) — animations can't be disabled",
      evidence: {},
    });
  }

  // ── Color-only information ─────────────────────────────
  // The game relies on color for health bars, enemy types, etc.
  findings.push({
    severity: SEV.MINOR,
    area: "color-only",
    finding:
      "Game HUD uses color-coded health/ammo bars — no shape/pattern alternative for color-blind players",
    evidence: { note: "Needs pattern fills or icon supplements" },
  });

  return { expert: "Accessibility Specialist", findings };
}

// ══════════════════════════════════════════════════════════
//  EXPERT: Game Journalist — "Is this fun? Would I recommend it?"
// ══════════════════════════════════════════════════════════
export function auditGameplay(game) {
  const findings = [];

  // ── First 30 seconds — is there action? ────────────────
  // Check tutorial — how many steps before first combat?
  if (game.tutorialSteps) {
    const combatStep = game.tutorialSteps.findIndex(
      (s) =>
        s.text &&
        (s.text.toLowerCase().includes("shoot") ||
          s.text.toLowerCase().includes("fire") ||
          s.text.toLowerCase().includes("attack")),
    );
    if (combatStep > 4) {
      findings.push({
        severity: SEV.MAJOR,
        area: "pacing",
        finding: `Tutorial delays combat until step ${combatStep + 1} — players want action by step 3`,
        evidence: {
          firstCombatStep: combatStep + 1,
          totalSteps: game.tutorialSteps.length,
        },
      });
    }
  }

  // ── Upgrade variety per round ──────────────────────────
  const upgrades = game.getUpgradePool ? game.getUpgradePool() : null;
  if (upgrades && upgrades.length < 3) {
    findings.push({
      severity: SEV.MAJOR,
      area: "upgrades",
      finding: `Only ${upgrades.length} upgrade(s) offered per round — minimum 3 for meaningful choice`,
      evidence: { count: upgrades.length },
    });
  }

  // ── Enemy variety in early rounds ──────────────────────
  // Campaign level 0 should introduce 2+ enemy types
  const level0 = game.getCampaignLevel ? game.getCampaignLevel(0) : null;
  if (level0) {
    const enemyTypes = new Set(
      level0.entities
        ?.filter((e) => e.type === "enemy")
        .map((e) => e.enemyType),
    );
    if (enemyTypes.size < 2) {
      findings.push({
        severity: SEV.MINOR,
        area: "variety",
        finding: `Level 0 has only ${enemyTypes.size} enemy type(s) — introduce variety early`,
        evidence: { types: [...enemyTypes] },
      });
    }
  }

  // ── Death fairness — instant kills? ────────────────────
  // Players should rarely die in < 2 seconds from full health in early rounds
  // This is measured via telemetry (check rapid deaths)

  // ── Score feedback — is it clear what gives points? ────
  findings.push({
    severity: SEV.NIT,
    area: "feedback",
    finding:
      "No visible score breakdown — players can't see what actions give how many points",
    evidence: { suggestion: "Add floating +50, +100 numbers on kills" },
  });

  // ── Weapon balance — is there a dominant weapon? ───────
  // Checked via bot telemetry in simulation runs

  return { expert: "Game Journalist", findings };
}

// ══════════════════════════════════════════════════════════
//  EXPERT: Performance Engineer — "Does it run smoothly?"
// ══════════════════════════════════════════════════════════
export function auditPerformance(game, frames) {
  const findings = [];

  if (frames && frames.length > 0) {
    const frameTimes = frames.map((f) => f.dt);
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const max = Math.max(...frameTimes);
    const p99 = frameTimes.sort((a, b) => a - b)[
      Math.floor(frameTimes.length * 0.99)
    ];

    // ── Average frame time ─────────────────────────────
    if (avg > 16.67) {
      findings.push({
        severity: SEV.CRITICAL,
        area: "frame-time",
        finding: `Average frame time ${avg.toFixed(1)}ms > 16.67ms — below 60fps target`,
        evidence: { avg: +avg.toFixed(1), target: 16.67 },
      });
    }

    // ── Frame spikes ───────────────────────────────────
    if (max > 50) {
      findings.push({
        severity: SEV.MAJOR,
        area: "frame-spikes",
        finding: `Worst frame ${max.toFixed(0)}ms — visible hitching (>50ms)`,
        evidence: { maxMs: +max.toFixed(0), p99Ms: +p99.toFixed(1) },
      });
    }

    // ── Frame time variance ────────────────────────────
    const variance =
      frameTimes.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) /
      frameTimes.length;
    const stddev = Math.sqrt(variance);
    if (stddev > 5) {
      findings.push({
        severity: SEV.MINOR,
        area: "frame-consistency",
        finding: `Frame time stddev ${stddev.toFixed(1)}ms — inconsistent frame pacing feels janky`,
        evidence: { stddev: +stddev.toFixed(1), avg: +avg.toFixed(1) },
      });
    }

    // ── Long frames percentage ─────────────────────────
    const longFrames = frameTimes.filter((t) => t > 33.33).length;
    const longPct = (longFrames / frameTimes.length) * 100;
    if (longPct > 5) {
      findings.push({
        severity: SEV.MAJOR,
        area: "frame-drops",
        finding: `${longPct.toFixed(1)}% of frames > 33ms — frequent drops below 30fps`,
        evidence: {
          longFrames,
          total: frameTimes.length,
          pct: +longPct.toFixed(1),
        },
      });
    }
  }

  // ── Memory / entity growth ───────────────────────────
  const entities = game.entities ? game.entities.length : 0;
  const projectiles = game.projectiles ? game.projectiles.length : 0;
  if (entities > 100) {
    findings.push({
      severity: SEV.MINOR,
      area: "entity-count",
      finding: `${entities} active entities — consider pooling or culling`,
      evidence: { entities, projectiles },
    });
  }

  return { expert: "Performance Engineer", findings };
}

// ══════════════════════════════════════════════════════════
//  EXPERT: Mobile Specialist — "Does this work on a phone?"
// ══════════════════════════════════════════════════════════
export function auditMobile(dom) {
  const findings = [];

  // ── Viewport meta tag ──────────────────────────────────
  const viewport = dom.querySelector('meta[name="viewport"]');
  if (!viewport) {
    findings.push({
      severity: SEV.CRITICAL,
      area: "viewport",
      finding: "Missing viewport meta tag — mobile scaling broken",
      evidence: {},
    });
  } else {
    const content = viewport.getAttribute("content") || "";
    if (
      !content.includes("user-scalable=no") &&
      !content.includes("maximum-scale=1")
    ) {
      findings.push({
        severity: SEV.MINOR,
        area: "viewport",
        finding:
          "Viewport allows pinch-zoom — interferes with touch controls in an FPS",
        evidence: { content },
      });
    }
  }

  // ── Touch target spacing ───────────────────────────────
  const btns = Array.from(dom.querySelectorAll(".mode-btn:not(.hidden)"));
  for (let i = 1; i < btns.length; i++) {
    const prevRect = btns[i - 1].getBoundingClientRect();
    const currRect = btns[i].getBoundingClientRect();
    const gap = currRect.top - prevRect.bottom;
    if (gap < 8) {
      findings.push({
        severity: SEV.MINOR,
        area: "touch-spacing",
        finding: `Buttons "${btns[i - 1].textContent.trim().slice(0, 20)}" and "${btns[i].textContent.trim().slice(0, 20)}" gap ${Math.round(gap)}px < 8px — fat-finger risk`,
        evidence: { gap: Math.round(gap) },
      });
    }
  }

  // ── Orientation handling ───────────────────────────────
  const orientationPrompt = dom.querySelector("#orientationPrompt");
  if (!orientationPrompt) {
    findings.push({
      severity: SEV.MAJOR,
      area: "orientation",
      finding:
        "No portrait orientation prompt — FPS unplayable in portrait mode",
      evidence: {},
    });
  }

  // ── Canvas resolution scaling ──────────────────────────
  // Checked via debug bridge in Playwright test

  // ── Touch event handling ───────────────────────────────
  const hasTouch =
    dom.querySelector("script[src*='touch']") ||
    dom.querySelector("[ontouchstart]");
  // We know touch.js exists from the imports

  // ── Gesture conflicts (prevent default) ────────────────
  findings.push({
    severity: SEV.NIT,
    area: "gestures",
    finding:
      "Verify pull-to-refresh and swipe-back are disabled during gameplay",
    evidence: { suggestion: "Use touch-action: none on game canvas" },
  });

  return { expert: "Mobile Specialist", findings };
}

// ══════════════════════════════════════════════════════════
//  EXPERT: Security Reviewer — "What's exposed?"
// ══════════════════════════════════════════════════════════
export function auditSecurity(dom) {
  const findings = [];

  // ── External scripts ───────────────────────────────────
  const scripts = dom.querySelectorAll("script[src]");
  scripts.forEach((s) => {
    const src = s.getAttribute("src");
    if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
      if (!s.hasAttribute("integrity")) {
        findings.push({
          severity: SEV.MINOR,
          area: "sri",
          finding: `External script "${src.slice(0, 60)}" missing Subresource Integrity hash`,
          evidence: { src },
        });
      }
    }
  });

  // ── Content Security Policy ────────────────────────────
  const cspMeta = dom.querySelector(
    'meta[http-equiv="Content-Security-Policy"]',
  );
  if (!cspMeta) {
    findings.push({
      severity: SEV.MINOR,
      area: "csp",
      finding:
        "No Content-Security-Policy meta tag — consider adding for defense-in-depth",
      evidence: {},
    });
  }

  // ── localStorage exposure ──────────────────────────────
  // Save data is in localStorage — check what's stored
  const keys = Object.keys(localStorage);
  const sensitivePatterns = /token|password|secret|key|auth/i;
  keys.forEach((k) => {
    if (sensitivePatterns.test(k)) {
      findings.push({
        severity: SEV.MAJOR,
        area: "storage",
        finding: `Potentially sensitive localStorage key: "${k}"`,
        evidence: { key: k },
      });
    }
  });

  // ── Debug bridge in production ─────────────────────────
  if (window.ccDebug) {
    findings.push({
      severity: SEV.NIT,
      area: "debug-exposure",
      finding:
        "Debug bridge (window.ccDebug) is loaded — ensure this is stripped in production deploys",
      evidence: {
        note: "Dynamic import with catch fallback should prevent loading if files absent",
      },
    });
  }

  return { expert: "Security Reviewer", findings };
}

// ══════════════════════════════════════════════════════════
//  EXPERT: Retention Analyst — "Will they come back?"
// ══════════════════════════════════════════════════════════
export function auditRetention(game) {
  const findings = [];

  // ── Save/Load system ───────────────────────────────────
  const saves = game.getSaveInfo ? game.getSaveInfo() : [];
  const hasSave = saves.length > 0;
  // Check if save prompts exist
  // Player should never lose > 5 minutes of progress
  findings.push({
    severity: SEV.NIT,
    area: "save-frequency",
    finding:
      "Verify auto-save triggers: after every round, after upgrades, and before cutscenes",
    evidence: { currentSaves: saves.length },
  });

  // ── Session end hooks ──────────────────────────────────
  // Does closing the tab lose progress?
  const hasBeforeUnload =
    typeof window.onbeforeunload === "function" ||
    window.__ccBeforeUnloadRegistered;
  if (!hasBeforeUnload) {
    findings.push({
      severity: SEV.MINOR,
      area: "beforeunload",
      finding:
        "No beforeunload save — closing tab mid-round loses all progress since last checkpoint",
      evidence: { suggestion: "Add window.onbeforeunload auto-save" },
    });
  }

  // ── Return flow — is Continue prominent? ───────────────
  // Covered in UX audit (continue button visibility)

  // ── Difficulty cliff ───────────────────────────────────
  // If death rate spikes > 80% at a certain round, that's a wall
  findings.push({
    severity: SEV.NIT,
    area: "difficulty-curve",
    finding:
      "Use telemetry death heatmaps to identify difficulty walls — check round 3-5 death rate",
    evidence: {
      note: "Run: node simulations/run.mjs --persona casual --iterations 20",
    },
  });

  // ── Second session hooks ───────────────────────────────
  const hasAchievements =
    game.achievements && Object.keys(game.achievements).length > 0;
  if (!hasAchievements) {
    findings.push({
      severity: SEV.MAJOR,
      area: "meta-progression",
      finding:
        "No persistent achievements visible — players need a reason to return",
      evidence: {},
    });
  }

  return { expert: "Retention Analyst", findings };
}

// ══════════════════════════════════════════════════════════
//  MASTER REVIEW — Run all experts
// ══════════════════════════════════════════════════════════
export function runFullReview(game, dom, perfFrames) {
  const reviews = [
    auditUX(null, dom),
    auditAccessibility(null, dom),
    auditGameplay(game),
    auditPerformance(game, perfFrames),
    auditMobile(dom),
    auditSecurity(dom),
    auditRetention(game),
  ];

  // Aggregate
  const summary = {
    experts: reviews.length,
    totalFindings: 0,
    critical: 0,
    major: 0,
    minor: 0,
    nit: 0,
    reviews: [],
  };

  for (const review of reviews) {
    const counts = { critical: 0, major: 0, minor: 0, nit: 0 };
    for (const f of review.findings) {
      counts[f.severity]++;
      summary[f.severity]++;
      summary.totalFindings++;
    }
    summary.reviews.push({
      expert: review.expert,
      total: review.findings.length,
      ...counts,
      findings: review.findings,
    });
  }

  return summary;
}

// ── Utility: parse CSS rgb() ─────────────────────────────
function parseRGB(str) {
  if (!str) return null;
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [+m[1], +m[2], +m[3]];
}

function luminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
