import { describe, it, expect } from "vitest";
import { announcements, ownedKey } from "../../src/systems/unlocks.js";
import { SYMBOLS, BADGE_PRESETS, FINISHES, indexOfId } from "../../src/data/badges.js";
import { ACCESSORIES } from "../../src/data/accessories.js";
import { ARMOR_STYLES, HELMET_STYLES, LOADOUT_CLASSES } from "../../src/data/cosmetics.js";

/**
 * `initUnlockToasts` marks every freshly earned id as seen before it announces
 * anything, so an id the announcement pass drops is never mentioned again —
 * which is what happened to every badge, finish, accessory and armour variant
 * while only loadout classes and tiered gear had a branch.
 */
describe("unlock toast announcements", () => {
  const variant = ARMOR_STYLES.find((a) => a.variant).variant;

  it("gives every earned badge part, finish, accessory and variant its own plate", () => {
    const symbol = indexOfId(SYMBOLS, "lordslayer");
    const preset = indexOfId(BADGE_PRESETS, "p_lordslayer");
    const finish = indexOfId(FINISHES, "holo");
    const acc = indexOfId(ACCESSORIES.back, "antenna");
    const ids = [
      ownedKey("badge.symbol", symbol),
      ownedKey("badge.preset", preset),
      ownedKey("badge.finish", finish),
      ownedKey("acc.back", acc),
      `armorVariant:#${variant.id}`,
    ];
    expect(announcements(ids)).toEqual([
      { kind: "Badge symbol", name: SYMBOLS[symbol].name },
      { kind: "Badge", name: BADGE_PRESETS[preset].name },
      { kind: "Badge finish", name: FINISHES[finish].name },
      { kind: "Back gear", name: ACCESSORIES.back[acc].name },
      { kind: "Armour variant", name: variant.name },
    ]);
  });

  it("names a loadout class on its own", () => {
    const i = LOADOUT_CLASSES.findIndex((c) => c.unlock);
    expect(announcements([ownedKey("loadoutIndex", i)])).toEqual([
      { kind: "Loadout class", name: LOADOUT_CLASSES[i].name },
    ]);
  });

  it("collapses the tier-gated armour slots into one plate per tier", () => {
    const ids = [
      ownedKey("armorIndex", ARMOR_STYLES.findIndex((x) => x.tier === 2)),
      ownedKey("helmetIndex", HELMET_STYLES.findIndex((x) => x.tier === 2)),
    ];
    expect(announcements(ids)).toEqual([
      { kind: "Gear tier", name: "MK II armor, helmets, visors & shoulders" },
    ]);
  });

  it("skips an id whose table entry has gone", () => {
    expect(announcements(["badge.symbol:#no-such-symbol", "nonsense:4"])).toEqual([]);
  });
});
