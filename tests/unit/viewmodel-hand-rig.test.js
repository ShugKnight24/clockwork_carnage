import { describe, it, expect } from "vitest";
import { gripHand, cupHand, handguardHand, gripZ, len, sub } from "../../src/rendering/svg-art/viewmodel/hand-rig.js";
import { viewmodelLayers } from "../../src/rendering/svg-art/viewmodels.js";

// The pilot weapons' grips (weapons.js: Chrono Pistol, Phase Rifle).
const PISTOL = { yTop: -12, yBot: -92, zfT: 55, zbT: 5, zfB: 6, zbB: -40, hw: 14.5 };
const RIFLE = { yTop: -14, yBot: -80, zfT: 100, zbT: 55, zfB: 76, zbB: 30, hw: 14 };
const HANDGUARD = { y0: -14, y1: 32, hw: 22, zc: 290 };

/** Signed distance from a point to a pistol grip's rounded section at the point's height. */
function gripDist(g, [x, y, z]) {
  const zf = gripZ(g, y, "front");
  const zb = gripZ(g, y, "back");
  const c = 5;
  const qx = Math.abs(x) - (g.hw - c);
  const qz = Math.abs(z - (zf + zb) / 2) - ((zf - zb) / 2 - c);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - c;
}
function guardDist({ y0, y1, hw }, [x, y]) {
  const c = Math.min(8, (y1 - y0) * 0.2);
  const qx = Math.abs(x) - (hw - c);
  const qy = Math.abs(y - (y0 + y1) / 2) - ((y1 - y0) / 2 - c);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - c;
}

describe("articulated viewmodel hands", () => {
  const hands = [gripHand(PISTOL, { thumb: "forward" }), cupHand(PISTOL), gripHand(RIFLE, { frameHw: 20 }), handguardHand(HANDGUARD)];

  it("have four three-phalanx fingers and an opposed two-phalanx thumb", () => {
    for (const h of hands) {
      expect(h.digits.map((d) => d.id)).toEqual(["index", "middle", "ring", "little", "thumb"]);
      for (const d of h.digits) {
        expect(d.j).toHaveLength(d.id === "thumb" ? 3 : 4);
        expect(d.r).toHaveLength(d.j.length);
        // Joints taper toward the tip.
        for (let i = 1; i < d.r.length; i++) expect(d.r[i]).toBeLessThan(d.r[i - 1]);
      }
      expect(h.palm.caps.length).toBeGreaterThan(4);
    }
  });

  it("keep human phalanx proportions, about 5 : 3 : 2, each finger about as long as the palm", () => {
    for (const h of hands) {
      for (const d of h.digits.filter((x) => x.id !== "thumb")) {
        const L = [0, 1, 2].map((i) => len(sub(d.j[i + 1], d.j[i])));
        expect(L[0] / L[1]).toBeGreaterThan(1.4);
        expect(L[0] / L[1]).toBeLessThan(2.1);
        expect(L[1]).toBeGreaterThan(L[2]);
      }
    }
  });

  it("wrap the fingers round the grip: every joint on its surface, none through it or floating off it", () => {
    for (const [h, g] of [[hands[0], PISTOL], [hands[2], RIFLE]]) {
      for (const d of h.digits.filter((x) => x.id !== "index" && x.id !== "thumb")) {
        d.j.forEach((p, i) => {
          const gap = gripDist(g, p);
          expect(gap, `${d.id} joint ${i}`).toBeGreaterThan(d.r[i] * 0.8);
          expect(gap, `${d.id} joint ${i}`).toBeLessThan(d.r[i] * 1.2);
        });
        // The middle and distal bones, which the eye sees on the left flank,
        // never cut through the grip: rounding its front-left corner they
        // press into the glove, the bone's axis always outside the grip. The proximal bone, longer than the grip is wide,
        // crosses the front strap pressing into the glove at its corners,
        // its axis at most a few millimetres inside the grip's edge.
        for (let i = 0; i < 3; i++) {
          for (const t of [0.25, 0.5, 0.75]) {
            const p = d.j[i].map((v, k) => v + (d.j[i + 1][k] - v) * t);
            expect(gripDist(g, p), `${d.id} bone ${i}`).toBeGreaterThan(i === 0 ? -3 : d.r[i + 1] * 0.25);
          }
        }
        // Knuckles on the right flank, fingertips round on the left.
        expect(d.j[0][0]).toBeGreaterThan(g.hw);
        expect(d.j[3][0]).toBeLessThan(0);
      }
    }
    for (const d of hands[3].digits.filter((x) => x.id !== "thumb")) {
      d.j.forEach((p, i) => {
        const gap = guardDist(HANDGUARD, p);
        expect(gap, `${d.id} joint ${i}`).toBeGreaterThan(d.r[i] * 0.8);
        expect(gap, `${d.id} joint ${i}`).toBeLessThan(d.r[i] * 1.2);
      });
      // Fingertips up the far flank, at most round its upper corner: never over onto the near half.
      expect(d.j[3][0]).toBeGreaterThan(HANDGUARD.hw * 0.5);
      expect(d.j[2][0]).toBeGreaterThan(HANDGUARD.hw);
    }
  });

  it("cup the sidearm: support fingers wrap over the firing fingers, both thumbs along the left of the frame", () => {
    const [fire, cup] = hands;
    for (const d of cup.digits.filter((x) => x.id !== "thumb")) {
      d.j.forEach((p) => expect(gripDist(PISTOL, p)).toBeGreaterThan(fire.digits[1].r[1] * 1.5));
    }
    for (const h of [fire, cup]) {
      const t = h.digits[4].j;
      expect(t[2][0]).toBeLessThan(-PISTOL.hw);
      expect(t[2][2]).toBeGreaterThan(t[0][2]);
    }
  });

  // Two hands of 14 phalanges on the pistol, one on the rifle grip.
  it("draw every phalanx of the pilot weapons' hands as its own outlined capsule", () => {
    for (const [w, layerName, min] of [[0, "handR", 28], [2, "handR", 14]]) {
      for (const pose of ["hip", "ads"]) {
        const L = viewmodelLayers(w, "#36c6ff", pose, "hi", false).layers.find((x) => x.name === layerName);
        const arcs = (L.markup.match(/<path d="M[^"]*A[^"]*Z" fill="none"/g) || []).length;
        expect(arcs, `${w} ${pose}`).toBeGreaterThanOrEqual(min);
      }
    }
  });
});
