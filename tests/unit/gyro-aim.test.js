import { describe, it, expect } from "vitest";
import { gyroLookDelta, gyroActive, GYRO_OFF, GYRO_WHILE_AIMING, GYRO_ALWAYS } from "../../src/systems/gyro-aim.js";

const DEG = Math.PI / 180;

describe("gyro aim", () => {
  it("maps landscape turns onto the screen, signed by which way the phone is held", () => {
    // 90 deg/s about the device's x axis for 1/60 s, held landscape at 90.
    const a = gyroLookDelta({ beta: 90, gamma: 0 }, 90, 1 / 60);
    expect(a.yaw).toBeCloseTo(-90 * DEG / 60, 6);
    expect(a.pitch).toBeCloseTo(0, 6);
    // The other landscape flips both.
    const b = gyroLookDelta({ beta: 90, gamma: 30 }, 270, 1 / 60);
    expect(b.yaw).toBeCloseTo(90 * DEG / 60, 6);
    expect(b.pitch).toBeCloseTo(30 * DEG / 60, 6);
    expect(gyroLookDelta({ beta: 0, gamma: 30 }, 90, 1 / 60).pitch).toBeCloseTo(-30 * DEG / 60, 6);
  });

  it("treats -90 as 270 and portrait as the device's own axes", () => {
    expect(gyroLookDelta({ beta: 60 }, -90, 0.01)).toEqual(gyroLookDelta({ beta: 60 }, 270, 0.01));
    const p = gyroLookDelta({ beta: 60, gamma: 60 }, 0, 0.01);
    expect(p.yaw).toBeCloseTo(-60 * DEG * 0.01, 6);
    expect(p.pitch).toBeCloseTo(60 * DEG * 0.01, 6);
  });

  it("drops stalls and bad samples instead of snapping the view", () => {
    expect(gyroLookDelta({ beta: 90 }, 90, 2).yaw).toBeCloseTo(-90 * DEG * 0.05, 6);
    expect(gyroLookDelta({ beta: 90 }, 90, -1).yaw).toBeCloseTo(0, 9);
    expect(gyroLookDelta(null, 90, 0.016)).toEqual({ yaw: -0, pitch: -0 });
    expect(gyroLookDelta({ beta: null, gamma: null }, 90, 0.016).yaw).toBeCloseTo(0, 9);
  });

  it("reads WebKit's order on an iPhone: alpha about x, beta about y", () => {
    // A tilt (about the device's y axis) arrives as beta there: it pitches, it does not turn.
    const tilt = gyroLookDelta({ alpha: 0, beta: 90, gamma: 0 }, 90, 1 / 60, true);
    expect(tilt.yaw).toBeCloseTo(0, 9);
    expect(tilt.pitch).toBeCloseTo(-90 * DEG / 60, 6);
    const turn = gyroLookDelta({ alpha: 90, beta: 0, gamma: 0 }, 90, 1 / 60, true);
    expect(turn.yaw).toBeCloseTo(-90 * DEG / 60, 6);
    expect(turn.pitch).toBeCloseTo(0, 9);
  });

  it("runs always, only while aiming, or never", () => {
    expect(gyroActive(GYRO_OFF, true)).toBe(false);
    expect(gyroActive(GYRO_WHILE_AIMING, false)).toBe(false);
    expect(gyroActive(GYRO_WHILE_AIMING, true)).toBe(true);
    expect(gyroActive(GYRO_ALWAYS, false)).toBe(true);
  });
});
