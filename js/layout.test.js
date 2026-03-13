import assert from "node:assert/strict";
import {
  pauseLayout,
  settingsLayout,
  upgradeLayout,
  tutorialMenuLayout,
} from "./layout.js";

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
  testPauseLayout();
  testSettingsLayout();
  testUpgradeLayout();
  testTutorialMenuLayout();
  console.log("layout.test.js: all tests passed");
}

run();
