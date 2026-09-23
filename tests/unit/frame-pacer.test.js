import { describe, it, expect } from "vitest";
import {
  FramePacer,
  frameCapFor,
  qualityTargetFPS,
} from "../../src/systems/frame-pacer.js";

/** Run one second of frames at `hz` and count the renders a `cap` allows. */
function rendersPerSecond(hz, cap, { jitter = 0.001 } = {}) {
  const pacer = new FramePacer();
  const period = 1000 / hz;
  let rendered = 0;
  for (let i = 0; i < hz; i++) {
    // Real vsync timestamps are not exact multiples of the period.
    const now = i * period + (i % 2 ? -jitter : jitter);
    if (pacer.shouldRender(now, cap)) rendered++;
  }
  return rendered;
}

describe("FramePacer", () => {
  it("renders every frame when uncapped", () => {
    expect(rendersPerSecond(60, 0)).toBe(60);
  });

  it("holds the cap when it equals the refresh rate", () => {
    // The naive `now - last >= 1000 / cap` test drops to ~30 here.
    expect(rendersPerSecond(60, 60)).toBeGreaterThanOrEqual(59);
  });

  it("holds a 60 fps cap on a 120 Hz panel", () => {
    expect(rendersPerSecond(120, 60)).toBeGreaterThanOrEqual(59);
    expect(rendersPerSecond(120, 60)).toBeLessThanOrEqual(61);
  });

  it("holds a 30 fps cap on a 60 Hz panel", () => {
    const n = rendersPerSecond(60, 30);
    expect(n).toBeGreaterThanOrEqual(29);
    expect(n).toBeLessThanOrEqual(31);
  });

  it("cannot exceed the refresh rate when the cap is higher", () => {
    expect(rendersPerSecond(60, 120)).toBe(60);
  });

  it("does not burst-render to catch up after a stall", () => {
    const pacer = new FramePacer();
    for (let i = 0; i < 10; i++) pacer.shouldRender(i * 16.667, 30);
    // Tab hidden for two seconds, then frames resume.
    let rendered = 0;
    for (let i = 0; i < 6; i++) {
      if (pacer.shouldRender(2000 + i * 16.667, 30)) rendered++;
    }
    expect(rendered).toBeLessThanOrEqual(4);
  });

  it("reports the measured refresh rate", () => {
    const pacer = new FramePacer();
    for (let i = 0; i < 120; i++) pacer.shouldRender(i * 16.667, 0);
    expect(pacer.displayHz).toBeGreaterThan(55);
    expect(pacer.displayHz).toBeLessThan(65);
  });
});

describe("frameCapFor", () => {
  it("maps the settings index to fps", () => {
    expect(frameCapFor({ frameTarget: 0 })).toBe(0);
    expect(frameCapFor({ frameTarget: 1 })).toBe(30);
    expect(frameCapFor({ frameTarget: 2 })).toBe(60);
    expect(frameCapFor({ frameTarget: 4 })).toBe(120);
  });

  it("lets battery saver win", () => {
    expect(frameCapFor({ batterySaver: true, frameTarget: 4 })).toBe(30);
  });
});

describe("qualityTargetFPS", () => {
  it("keeps the uncapped target", () => {
    expect(qualityTargetFPS(0, 60)).toBe(55);
  });

  it("follows a low cap so battery saver is not read as a slow machine", () => {
    expect(qualityTargetFPS(30, 60)).toBe(25);
  });

  it("never asks for more than the uncapped target", () => {
    expect(qualityTargetFPS(120, 60)).toBe(55);
    expect(qualityTargetFPS(90, 144)).toBe(55);
  });
});
