import assert from "node:assert/strict";
import {
  isCompactPhone,
  pauseLayout,
  settingsLayout,
  upgradeLayout,
  tutorialMenuLayout,
} from "./layout.js";

function testIsCompactPhone() {
  assert.equal(isCompactPhone(419), true, "h=419 should be compact");
  assert.equal(isCompactPhone(420), false, "h=420 is the threshold, not compact");
  assert.equal(isCompactPhone(375), true, "iPhone SE portrait (375px) should be compact");
  assert.equal(isCompactPhone(568), false, "iPhone SE landscape (568px) should NOT be compact");
  assert.equal(isCompactPhone(0), true, "h=0 should be compact");
}

function testPauseLayoutCompact() {
  // Landscape compact phone: w=568, h=375
  const compact = pauseLayout(568, 375, "campaign");
  assert.equal(compact.compact, true, "should flag as compact");
  assert.ok(compact.btnH < 50, "compact button height should be less than normal 50px");
  assert.ok(compact.buttons[0].w >= 44, "compact button width must be >= 44 (touch target)");
  assert.ok(compact.btnY < 375, "button y must fit within viewport height");
  assert.ok(compact.saveBtn, "campaign mode compact should still include save button");

  // Just above threshold: not compact
  const normal = pauseLayout(568, 420, "arena");
  assert.equal(normal.compact, false, "h=420 should not be compact");
  assert.equal(normal.btnH, 50, "normal button height should be 50");
}

function testSettingsLayoutCompact() {
  // Touch + compact phone
  const compact = settingsLayout(568, 375, 0, true);
  assert.equal(compact.panelW <= 380, true, "compact panel width should be <= 380");
  assert.equal(compact.barH, 4, "compact barH should be 4");
  assert.ok(compact.barW < 200, "compact barW should be less than normal 200");

  // Touch but NOT compact (above threshold)
  const normal = settingsLayout(1024, 768, 0, true);
  assert.equal(normal.barH, 6, "non-compact barH should be 6");
  assert.equal(normal.barW, 200, "non-compact barW should be 200");
}

function testUpgradeLayoutCompact() {
  // Compact phone viewport (isTouchDevice=true, h < 420)
  const compact = upgradeLayout(568, 375, 6, true);
  assert.equal(compact.compact, true, "should flag as compact");
  assert.equal(compact.cardH, 40, "compact cardH should be 40");
  assert.equal(compact.cardGap, 3, "compact cardGap should be 3");

  // Non-touch compact phone (isTouchDevice=false → compact stays false)
  const nonTouch = upgradeLayout(568, 375, 6, false);
  assert.equal(nonTouch.compact, false, "non-touch device should not be compact");
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
  assert.equal(layout.panelW, 440);
  assert.ok(Array.isArray(layout.itemHeights), "itemHeights should be array");
  assert.ok(layout.itemHeights.length > 0, "should have at least one item");
  assert.equal(
    layout.totalH,
    layout.itemHeights.reduce((a, b) => a + b, 0),
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

function run() {
  testIsCompactPhone();
  testPauseLayoutCompact();
  testSettingsLayoutCompact();
  testUpgradeLayoutCompact();
  testPauseLayout();
  testSettingsLayout();
  testUpgradeLayout();
  testTutorialMenuLayout();
  console.log("layout.test.js: all tests passed");
}

run();
