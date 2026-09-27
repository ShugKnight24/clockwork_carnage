import { describe, it, expect } from "vitest";
import { PlayerUpdateSystem } from "../../src/systems/player-update.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { Player } from "../../js/entities.js";

// Hit-stop holds the rest of the update but calls look(), so the mouse keeps
// turning the view instead of piling up into one jump.
describe("PlayerUpdateSystem.look", () => {
  it("turns a voxel view and consumes the delta", () => {
    const sys = new PlayerUpdateSystem();
    const p = new Player(20.5, 20.5);
    p.angle = 0;
    p.pitch = 0;
    const mouse = { dx: 40, dy: 0 };
    sys.look({ player: p, mouse, settings: {}, world: generateWorld({ terrain: false }) });
    expect(p.angle).toBeGreaterThan(0);
    expect(mouse.dx).toBe(0);
  });

  it("moves the grid reticle and consumes the delta", () => {
    const sys = new PlayerUpdateSystem();
    const p = new Player(5.5, 5.5);
    const mouse = { dx: 12, dy: -8 };
    sys.look({ player: p, mouse, settings: {}, world: null });
    expect(p.aimOffsetX).not.toBe(0);
    expect(mouse.dx).toBe(0);
    expect(mouse.dy).toBe(0);
  });
});
