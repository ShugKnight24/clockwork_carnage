import { describe, it, expect } from "vitest";
import { portraitIdFor, isRadioLine, PORTRAIT_IDS } from "../../src/ui/comms-portraits.js";

describe("comms portraits", () => {
  it("gives each named voice its own bust", () => {
    expect(portraitIdFor("ARIA")).toBe("aria");
    expect(portraitIdFor("SUPERVISOR")).toBe("simon");
    expect(portraitIdFor("SIMON (LOG)")).toBe("simon");
    expect(portraitIdFor("LT. RASCZAK")).toBe("rasczak");
    expect(portraitIdFor("RASCZAK (LOG)")).toBe("rasczak");
    expect(portraitIdFor("SGT. KAEL")).toBe("kael");
    expect(portraitIdFor("KAEL")).toBe("kael");
    expect(portraitIdFor("DR. ORR")).toBe("orr");
    expect(portraitIdFor("LIN")).toBe("lin");
    expect(portraitIdFor("VALE")).toBe("vale");
    expect(portraitIdFor("LYRA · RECORDED")).toBe("lyra");
    expect(portraitIdFor("PARADOX LORD")).toBe("lord");
    expect(portraitIdFor("PA")).toBe("pa");
    expect(portraitIdFor("STAFF")).toBe("staff");
  });

  it("puts a plain officer under any other station name", () => {
    expect(portraitIdFor("OFFICER")).toBe("officer");
    expect(portraitIdFor("OFC. BRANDT")).toBe("officer");
    // "LIN" must match the word, not a substring.
    expect(portraitIdFor("DISPATCH LINE")).toBe("officer");
  });

  it("only ever answers with a bust it can paint", () => {
    for (const s of ["ARIA", "VOSS", "ROOK", "NOVA", "SQUAD", "UNKNOWN", "MIRI", "KAI", "STAFF_M", "ANYONE"]) {
      expect(PORTRAIT_IDS).toContain(portraitIdFor(s));
    }
  });

  it("puts static on lines that come over the air", () => {
    expect(isRadioLine({ speaker: "SUPERVISOR", voice: "supervisor" })).toBe(true);
    expect(isRadioLine({ speaker: "SUPERVISOR", voice: "supervisorLive" })).toBe(false);
    expect(isRadioLine({ speaker: "SIMON (LOG)" })).toBe(true);
    expect(isRadioLine({ speaker: "ARIA", voice: "aria" })).toBe(false);
    expect(isRadioLine({ speaker: "DR. ORR", voice: "miri", radio: true })).toBe(true);
  });
});
