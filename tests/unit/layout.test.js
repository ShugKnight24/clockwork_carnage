import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  isCompactPhone,
  pauseLayout,
  settingsLayout,
  settingsCategoryRects,
  resolveSettingsHit,
  upgradeLayout,
  tutorialMenuLayout,
} from "../../js/layout.js";

function testIsCompactPhone() {
  assert.equal(isCompactPhone(419), true, "h=419 should be compact");
  assert.equal(
    isCompactPhone(420),
    false,
    "h=420 is the threshold, not compact",
  );
  assert.equal(
    isCompactPhone(375),
    true,
    "iPhone SE portrait (375px) should be compact",
  );
  assert.equal(
    isCompactPhone(568),
    false,
    "iPhone SE landscape (568px) should NOT be compact",
  );
  assert.equal(isCompactPhone(0), true, "h=0 should be compact");
}

function testPauseLayoutCompact() {
  // Landscape compact phone: w=568, h=375
  const compact = pauseLayout(568, 375, "campaign");
  assert.equal(compact.compact, true, "should flag as compact");
  assert.ok(
    compact.btnH < 50,
    "compact button height should be less than normal 50px",
  );
  assert.ok(
    compact.buttons[0].w >= 44,
    "compact button width must be >= 44 (touch target)",
  );
  assert.ok(compact.btnY < 375, "button y must fit within viewport height");
  assert.ok(
    compact.saveBtn,
    "campaign mode compact should still include save button",
  );

  // Just above threshold: not compact
  const normal = pauseLayout(568, 420, "arena");
  assert.equal(normal.compact, false, "h=420 should not be compact");
  assert.equal(normal.btnH, 50, "normal button height should be 50");
}

function testSettingsLayoutCompact() {
  // Touch + compact phone
  const compact = settingsLayout(568, 375, 0, true);
  assert.equal(compact.sideW, 90, "compact sideW should be 90");
  assert.equal(compact.headerH, 36, "compact headerH should be 36");
  assert.equal(compact.barH, 6, "barH should be 6");
  assert.ok(compact.panelW > 0, "panelW should be positive");

  // Touch but NOT compact (above threshold)
  const normal = settingsLayout(1024, 768, 0, true);
  assert.equal(normal.sideW, 160, "non-compact sideW should be 160");
  assert.equal(normal.headerH, 52, "non-compact headerH should be 52");
  assert.equal(normal.barH, 6, "non-compact barH should be 6");
}

function testUpgradeLayoutCompact() {
  // Compact phone viewport (isTouchDevice=true, h < 420)
  const compact = upgradeLayout(568, 375, 6, true);
  assert.equal(compact.compact, true, "should flag as compact");
  assert.equal(compact.cardH, 40, "compact cardH should be 40");
  assert.equal(compact.cardGap, 3, "compact cardGap should be 3");

  // Non-touch compact phone (isTouchDevice=false → compact stays false)
  const nonTouch = upgradeLayout(568, 375, 6, false);
  assert.equal(
    nonTouch.compact,
    false,
    "non-touch device should not be compact",
  );
  assert.equal(nonTouch.cardH, 64, "non-touch cardH should be 64");

  // Normal viewport for comparison
  const normal = upgradeLayout(1280, 720, 6, false);
  assert.equal(normal.cols, 2);
  assert.equal(normal.cardH, 64);
}

function testPauseLayout() {
  const mobile = pauseLayout(320, 568, "campaign");
  assert.equal(mobile.buttons.length, 4);
  assert.equal(mobile.buttons[0].label, "RESUME");
  assert.ok(mobile.buttons[0].w >= 44, "pause button width must be >= 44");
  assert.ok(mobile.saveBtn, "campaign mode should include save button");

  const arena = pauseLayout(1024, 768, "arena");
  assert.equal(arena.saveBtn, null, "non-campaign mode should not show save");
}

function testSettingsLayout() {
  const sel = 0;
  const layout = settingsLayout(1280, 720, sel, false);
  assert.equal(layout.sideW, 160, "desktop sideW should be 160");
  assert.equal(layout.panelX, 161, "panelX = sideW + 1");
  assert.equal(layout.panelW, 1280 - 161 - 12, "panelW = w - panelX - 12");
  assert.ok(Array.isArray(layout.itemHeights), "itemHeights should be array");
  assert.ok(layout.itemHeights.length > 0, "should have at least one item");
  assert.equal(
    layout.totalH,
    layout.itemHeights.reduce((a, b) => a + b, 0),
  );

  // With category filter — fewer items
  const hudLayout = settingsLayout(1280, 720, sel, false, "HUD");
  assert.ok(
    hudLayout.itemHeights.length < layout.itemHeights.length,
    "category filter should produce fewer items",
  );
}

function testUpgradeLayout() {
  const upgradeCount = 18;
  const layout = upgradeLayout(1280, 720, upgradeCount, false);
  assert.equal(layout.cols, 2);
  assert.equal(layout.cardH, 64);
  assert.equal(layout.cardGap, 6);
  assert.equal(layout.totalRows, Math.ceil(upgradeCount / 2));
  assert.ok(layout.rightX > layout.leftX);
}

function testTutorialMenuLayout() {
  const small = tutorialMenuLayout(320, 568, 4);
  assert.equal(small.menuW, 280, "small viewport should clamp menu width");
  assert.equal(small.itemH, 52);
  assert.equal(small.menuH, 224);

  const large = tutorialMenuLayout(1280, 720, 4);
  assert.equal(large.menuW, 360, "large viewport should use max menu width");
}


function testSettingsScrollClamp() {
  // Performance is the longest category and overflows a short window.
  const short = settingsLayout(1280, 520, 0, false, "Performance", 0, false);
  assert.ok(short.maxScroll > 0, "long category on a short window must scroll");
  assert.equal(
    settingsLayout(1280, 520, 0, false, "Performance", -500, false).scrollY,
    0,
    "negative scroll clamps to 0",
  );
  assert.equal(
    settingsLayout(1280, 520, 0, false, "Performance", 99999, false).scrollY,
    short.maxScroll,
    "overscroll clamps to maxScroll",
  );

  // A tall window fits everything, so there is nothing to scroll.
  const tall = settingsLayout(1280, 2000, 0, false, "Performance", 0, false);
  assert.equal(tall.maxScroll, 0, "tall window should not scroll");
}

function testSettingsScrollFollowsSelection() {
  const last =
    settingsLayout(1280, 520, 0, false, "Performance", 0, false).rows.length - 1;
  const followed = settingsLayout(1280, 520, last, false, "Performance", 0, true);
  const row = followed.rows[last];
  assert.ok(followed.scrollY > 0, "selecting the last row must scroll down");
  assert.ok(row.visible, "the selected row must end up inside the view band");
  assert.ok(
    row.y + row.h <= followed.viewTop + followed.viewH + 0.5,
    "the selected row must sit above the footer band",
  );

  // Rows scrolled past the top are not drawn and not hit-testable.
  assert.equal(followed.rows[0].visible, false, "first row scrolls out of view");
}

function testSettingsFooterReservesSpace() {
  const layout = settingsLayout(1280, 720, 0, false, "Performance", 0, false);
  assert.ok(layout.footerH > 0, "footer band must be reserved");
  assert.equal(
    layout.viewH,
    720 - layout.viewTop - layout.footerH,
    "view band must exclude the footer",
  );
}

function testSettingsTouchTargets() {
  const touch = settingsLayout(740, 360, 0, true, "Performance", 0, false);
  assert.ok(touch.backBtn.h >= 44, "touch back button must be >= 44px tall");
  for (const row of touch.rows) {
    assert.ok(row.decZone.w >= 44, "decrement zone must be >= 44px wide");
    assert.ok(row.incZone.w >= 44, "increment zone must be >= 44px wide");
    assert.ok(
      row.incZone.x >= row.decZone.x + row.decZone.w,
      "stepper zones must not overlap",
    );
  }
}

function testResolveSettingsHit() {
  const cats = ["Gameplay", "Display", "Performance"];
  const layout = settingsLayout(1280, 720, 0, false, "Performance", 0, false);
  const rects = settingsCategoryRects(layout, cats);

  assert.equal(
    resolveSettingsHit(layout, rects, rects[1].x + 10, rects[1].y + 5).cat,
    "Display",
    "sidebar click resolves to its category",
  );
  assert.equal(
    resolveSettingsHit(
      layout,
      rects,
      layout.backBtn.x + 4,
      layout.backBtn.y + 4,
    ).kind,
    "back",
    "back button is hit before anything else",
  );

  const row = layout.rows[1];
  const inc = resolveSettingsHit(
    layout,
    rects,
    row.incZone.x + 2,
    row.y + row.h / 2,
  );
  assert.equal(inc.kind, "row");
  assert.equal(inc.index, 1);
  assert.equal(inc.zone, "inc");

  const dec = resolveSettingsHit(
    layout,
    rects,
    row.decZone.x + 2,
    row.y + row.h / 2,
  );
  assert.equal(dec.zone, "dec", "left stepper zone decrements");

  // The label area selects the row without changing its value.
  assert.equal(
    resolveSettingsHit(layout, rects, layout.panelX + 20, row.y + row.h / 2)
      .zone,
    "row",
  );

  // A click in the footer band hits nothing.
  assert.equal(
    resolveSettingsHit(layout, rects, layout.panelX + 20, 719).kind,
    "none",
  );
}

function testResolveSettingsHitSlider() {
  const layout = settingsLayout(1280, 720, 0, false, "Audio", 0, false);
  const rects = settingsCategoryRects(layout, ["Audio"]);
  const row = layout.rows.find((r) => r.slider);
  assert.ok(row, "Audio should contain a slider row");

  const mid = resolveSettingsHit(
    layout,
    rects,
    row.slider.x + row.slider.w / 2,
    row.slider.hitY + 2,
  );
  assert.equal(mid.zone, "slider");
  assert.ok(
    Math.abs(mid.pct - 0.5) < 0.02,
    `slider pct should read ~0.5, got ${mid.pct}`,
  );

  const left = resolveSettingsHit(
    layout,
    rects,
    row.slider.x - 200,
    row.slider.hitY + 2,
  );
  assert.equal(left.pct, undefined, "outside the bar is not a slider hit");
}

function testSettingsCategoryRectsFit() {
  // Nine categories on a short window must still clear the back button.
  const cats = [
    "Gameplay", "Display", "Performance", "Audio", "Controls",
    "Gamepad", "Accessibility", "HUD", "Mobile",
  ];
  const layout = settingsLayout(760, 420, 0, true, "Gameplay", 0, false);
  const rects = settingsCategoryRects(layout, cats);
  assert.equal(rects.length, cats.length);
  const last = rects[rects.length - 1];
  assert.ok(
    last.y + last.h <= layout.backBtn.y,
    `last category (bottom ${last.y + last.h}) must sit above the back button (${layout.backBtn.y})`,
  );
  for (let i = 1; i < rects.length; i++) {
    assert.equal(rects[i].y, rects[i - 1].y + rects[i - 1].h, "rects must abut");
  }

  // A tall window keeps the full-size rows.
  const tall = settingsCategoryRects(
    settingsLayout(1280, 1000, 0, false, "Gameplay", 0, false),
    cats,
  );
  assert.equal(tall[0].h, 38, "desktop rows stay 38px when there is room");
}

describe("layout", () => {
  it("flags compact phone heights", testIsCompactPhone);
  it("lays out the pause menu on a compact phone", testPauseLayoutCompact);
  it("lays out settings on a compact phone", testSettingsLayoutCompact);
  it("lays out upgrades on a compact phone", testUpgradeLayoutCompact);
  it("lays out the pause menu on desktop", testPauseLayout);
  it("lays out settings on desktop", testSettingsLayout);
  it("lays out upgrades on desktop", testUpgradeLayout);
  it("sizes the tutorial menu to the viewport", testTutorialMenuLayout);
  it("clamps settings scroll to the list length", testSettingsScrollClamp);
  it("keeps the selected setting inside the view band", testSettingsScrollFollowsSelection);
  it("reserves the footer band out of the row view", testSettingsFooterReservesSpace);
  it("gives touch 44px steppers and back button", testSettingsTouchTargets);
  it("resolves pointer hits to category, row, zone or back", testResolveSettingsHit);
  it("reads a slider position from a pointer hit", testResolveSettingsHitSlider);
  it("fits every category above the back button", testSettingsCategoryRectsFit);
});
