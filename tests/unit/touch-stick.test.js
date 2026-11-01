import { describe, it, expect } from "vitest";
import { TouchControls, lookCurve } from "../../js/touch.js";

/** A stick pushed (dx, dy) px from where the thumb went down, on a compact phone's 45 px stick. */
function stick(dx, dy) {
  const tc = Object.create(TouchControls.prototype);
  tc.joyRadius = 45;
  tc.joyActive = true;
  tc.joyOrigin = { x: 100, y: 300 };
  tc.joyPos = { x: 100 + dx, y: 300 + dy };
  return tc;
}

describe("touch stick", () => {
  it("reads nothing inside its dead zone", () => {
    expect(stick(4, -5).moveAxis()).toBeNull();
    expect(Object.assign(stick(0, -40), { joyActive: false }).moveAxis()).toBeNull();
  });

  it("goes the way the thumb points, not one of eight ways", () => {
    const a = stick(25, -30).moveAxis();
    const deg = (Math.atan2(a.y, a.x) * 180) / Math.PI;
    expect(deg).toBeGreaterThan(48);
    expect(deg).toBeLessThan(52);
  });

  it("snaps a thumb a little off straight to straight", () => {
    // ~13° right of straight ahead: the 8-way stick made this a 45° diagonal.
    const a = stick(9, -40).moveAxis();
    expect(a.x).toBeCloseTo(0, 6);
    expect(a.y).toBeGreaterThan(0.8);
  });

  it("dashes straight across the foam pit with a thumb a little off straight", () => {
    const tc = stick(9, -40);
    const dashes = [];
    const g = { player: { angle: Math.PI / 2 }, keybinds: {}, keys: {}, triggerDash: (code, x, y) => dashes.push([x, y]) };
    tc.triggerDirectionalDash(g, true);
    const [[x, y]] = dashes;
    // Facing +y (south, the pit's axis): all of the dash goes across it.
    expect(Math.abs(x)).toBeLessThan(1e-9);
    expect(y).toBeGreaterThan(0.8);
  });

  it("walks slower with the stick part way out", () => {
    expect(Math.hypot(...Object.values(stick(0, -20).moveAxis()))).toBeLessThan(0.6);
    expect(Math.hypot(...Object.values(stick(0, -45).moveAxis()))).toBeCloseTo(1, 6);
  });
});

describe("touch look pads", () => {
  it("turns nothing while a thumb on FIRE only rolls, then steers by the drag", () => {
    const tc = Object.create(TouchControls.prototype);
    const looks = [];
    tc.look = (dx, dy) => looks.push([dx, dy]);
    const last = { x: 500, y: 300, slop: true, x0: 500, y0: 300 };
    tc.padLook(last, 503, 302);
    tc.padLook(last, 505, 304);
    expect(looks).toEqual([]);
    tc.padLook(last, 510, 300); // 2 px past the slop: those 2 px steer, then the drag does
    tc.padLook(last, 520, 300);
    expect(looks).toEqual([[2, 0], [10, 0]]);
  });

  it("keeps all of a fast swipe but the slop, even one that crosses it in one move", () => {
    const tc = Object.create(TouchControls.prototype);
    const looks = [];
    tc.look = (dx, dy) => looks.push([dx, dy]);
    const last = { x: 500, y: 300, slop: true, x0: 500, y0: 300 };
    tc.padLook(last, 470, 300);
    tc.padLook(last, 440, 300);
    expect(looks).toEqual([[-22, 0], [-30, 0]]);
  });

  it("aims finer on a slow drag than a fast swipe", () => {
    expect(lookCurve(1)).toBeLessThan(0.6);
    expect(lookCurve(25)).toBeGreaterThan(1.2);
  });
});
