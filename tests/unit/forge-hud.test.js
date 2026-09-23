import { describe, it, expect, vi } from "vitest";
import * as hud from "../../src/ui/forge-hud.js";

/** A canvas context that records calls instead of drawing. */
function recordingCtx() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls,
    save: rec("save"), restore: rec("restore"), beginPath: rec("beginPath"),
    closePath: rec("closePath"), fill: rec("fill"), stroke: rec("stroke"),
    fillRect: rec("fillRect"), strokeRect: rec("strokeRect"), clearRect: rec("clearRect"),
    roundRect: rec("roundRect"), rect: rec("rect"), arc: rec("arc"),
    moveTo: rec("moveTo"), lineTo: rec("lineTo"), fillText: rec("fillText"),
    strokeText: rec("strokeText"), translate: rec("translate"), rotate: rec("rotate"),
    scale: rec("scale"), drawImage: rec("drawImage"), setLineDash: rec("setLineDash"),
    measureText: () => ({ width: 10 }),
    canvas: { width: 1280, height: 720 },
  };
}

describe("forge-hud exports", () => {
  it("exposes the render entry point", () => {
    expect(typeof hud.renderForge).toBe("function");
  });

  it("draws nothing without a world", () => {
    const ctx = recordingCtx();
    hud.renderForge({ world: null }, ctx, 1280, 720);
    expect(ctx.calls.length).toBe(0);
  });

  it("never mutates the forge it is handed", async () => {
    const { World } = await import("../../src/world/world.js");
    const forge = {
      world: new World(), player: { x: 64, y: 64, z: 32, angle: 0, pitch: 0 },
      settings: { forgeFov: 120 }, tile: 1, toolMode: "block", target: null,
      overhead: false, showHelp: false, suppressHelp: true, notice: null,
      saveFlash: 0, noclip: false, cursorZ: 32, history: [], historyIndex: -1,
      mapIndex: [{ id: 0 }], currentSlot: 0, selectedEnemy: 0, selectedPickup: 0,
      survival: null, craftOpen: false, craftIndex: 0, breakProgress: 0,
      stationsNear: new Set(), storageFailed: false,
      _palette: () => [1, 2, 3], _craftRows: () => [],
    };
    const before = JSON.stringify({ ...forge, world: undefined, _palette: undefined, _craftRows: undefined });
    hud.renderForge(forge, recordingCtx(), 1280, 720);
    const after = JSON.stringify({ ...forge, world: undefined, _palette: undefined, _craftRows: undefined });
    expect(after).toBe(before);
  });
});
