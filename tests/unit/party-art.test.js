import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  PARTY_ORDER,
  FULL_PARTY,
  orderParty,
  partyKey,
  partyMembers,
  partyLayout,
} from "../../src/rendering/party.js";
import { MODELS, partyModel } from "../../src/rendering/svg-art/models/cast.js";
import { hasSvgArt } from "../../src/rendering/svg-art/index.js";
import { drawCutsceneArt } from "../../src/rendering/cutscene-art.js";
import { setArtStyle, getArtStyle, ART_LEGACY } from "../../src/rendering/art-style.js";

// The party art draws only the people who have joined, in every art style:
// the vector lineup (Comic and Modern) and the Legacy silhouettes.

describe("member lists", () => {
  it("keeps the lineup order and drops unknown names and repeats", () => {
    expect(orderParty(["rook", "you", "lyra", "rook", "ghost"])).toEqual(["lyra", "you", "rook"]);
  });

  it("round-trips through the art key; everyone is the plain party key", () => {
    expect(partyKey(["you", "lyra"])).toBe("party:lyra+you");
    expect(partyMembers("party:lyra+you")).toEqual(["lyra", "you"]);
    expect(partyKey(FULL_PARTY)).toBe("party");
    expect(partyKey(undefined)).toBe("party");
    expect(partyMembers("party")).toEqual(PARTY_ORDER);
    expect(partyMembers("lyra")).toBeNull();
    expect(partyMembers("party:nobody")).toBeNull();
  });

  it("keeps the full lineup exactly where it was drawn", () => {
    expect(partyLayout(FULL_PARTY)).toEqual({ kael: -84, lyra: -44, you: 0, nova: 44, rook: 84 });
  });

  it("re-centres a smaller group, the player in the middle of three", () => {
    expect(partyLayout(["lyra", "you", "rook"])).toEqual({ lyra: -44, you: 0, rook: 44 });
    expect(partyLayout(["lyra", "you"])).toEqual({ lyra: -22, you: 22 });
    const four = partyLayout(["lyra", "you", "nova", "rook"]);
    expect(Object.values(four).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe("vector party model (Comic and Modern)", () => {
  // The ground ring under each member is drawn in their colour.
  const RING = { kael: "#4488ff", lyra: "#ffaa44", you: "#00ffcc", nova: "#ff4488", rook: "#44ff88" };
  const markup = (m) => m.layers.map((l) => l.markup).join("");
  const rings = (m) =>
    Object.entries(RING)
      .filter(([, col]) => markup(m).includes(`stroke="${col}" stroke-width="0.9" opacity="0.8"`))
      .map(([id]) => id);

  it("draws exactly the members it is given", () => {
    for (const members of [["lyra", "you"], ["lyra", "you", "rook"], ["lyra", "you", "nova", "rook"], FULL_PARTY]) {
      const m = partyModel(members);
      expect(m.members).toEqual(orderParty(members));
      expect(rings(m).sort()).toEqual([...members].sort());
    }
  });

  it("is the registered full lineup when nobody is missing", () => {
    expect(MODELS.party.members).toEqual(PARTY_ORDER);
    expect(rings(MODELS.party).sort()).toEqual([...PARTY_ORDER].sort());
  });

  it("resolves a lineup key without registering every combination", () => {
    expect(hasSvgArt("party:lyra+you+rook")).toBe(true);
    expect(hasSvgArt("party:nobody")).toBe(false);
    expect("party:lyra+you+rook" in MODELS).toBe(false);
  });
});

describe("solo portraits", () => {
  it("exist for Kael, Nova and Rook next to Lyra's", () => {
    for (const id of ["kael", "nova", "rook", "lyra"]) {
      expect(MODELS[id]?.layers.length, id).toBeGreaterThan(2);
      expect(hasSvgArt(id)).toBe(true);
    }
  });

  it("gives Kael the Supervisor's radio", () => {
    expect(MODELS.kael.layers.map((l) => l.markup).join("")).toContain("#ff3a2a");
  });
});

describe("Legacy art", () => {
  let before;
  beforeAll(() => {
    before = getArtStyle();
    setArtStyle(ART_LEGACY);
  });
  afterAll(() => setArtStyle(before));

  /** A 2D context that records the labels it is asked to write. */
  function recordingCtx() {
    const text = [];
    const grad = { addColorStop() {} };
    const ctx = new Proxy(
      { text },
      {
        get(target, prop) {
          if (prop in target) return target[prop];
          if (prop === "fillText") return (t) => text.push(t);
          if (prop === "createRadialGradient" || prop === "createLinearGradient") return () => grad;
          if (prop === "measureText") return () => ({ width: 10 });
          return () => {};
        },
        set() {
          return true;
        },
      },
    );
    return ctx;
  }

  it("labels only the members a lineup key names", () => {
    const ctx = recordingCtx();
    drawCutsceneArt(ctx, 1600, 900, "party:lyra+you+rook", 2);
    expect(ctx.text).toEqual(["LYRA", "YOU", "ROOK"]);
  });

  it("still draws all five for the plain party key", () => {
    const ctx = recordingCtx();
    drawCutsceneArt(ctx, 1600, 900, "party", 2);
    expect(ctx.text).toEqual(["KAEL", "LYRA", "YOU", "NOVA", "ROOK"]);
  });

  it("draws the solos without throwing", () => {
    for (const id of ["kael", "nova", "rook"]) {
      expect(() => drawCutsceneArt(recordingCtx(), 1600, 900, id, 1.5)).not.toThrow();
    }
  });
});
