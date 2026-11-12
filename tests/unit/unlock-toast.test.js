import { describe, it, expect } from "vitest";
import { announcements, ownedKey } from "../../src/systems/unlocks.js";
import { SYMBOLS, BADGE_PRESETS, FINISHES, byId } from "../../src/data/badges.js";
import { ACCESSORIES } from "../../src/data/accessories.js";
import { ARMOR_STYLES, BODY_FRAMES, HELMET_STYLES, LOADOUT_CLASSES } from "../../src/data/cosmetics.js";

/**
 * `initUnlockToasts` marks every freshly earned id as seen before it announces
 * anything, so an id the announcement pass drops is never mentioned again —
 * which is what happened to every badge, finish, accessory and armour variant
 * while only loadout classes and tiered gear had a branch.
 */
describe("unlock toast announcements", () => {
  const variant = ARMOR_STYLES.find((a) => a.variant).variant;

  it("gives every earned badge part, finish, accessory and variant its own plate", () => {
    const symbol = "lordslayer";
    const preset = "p_lordslayer";
    const finish = "holo";
    const acc = "antenna";
    const ids = [
      ownedKey("badge.symbol", symbol),
      ownedKey("badge.preset", preset),
      ownedKey("badge.finish", finish),
      ownedKey("acc.back", acc),
      `armorVariant:#${variant.id}`,
    ];
    expect(announcements(ids)).toEqual([
      { kind: "Badge symbol", name: byId(SYMBOLS, symbol).name },
      { kind: "Badge", name: byId(BADGE_PRESETS, preset).name },
      { kind: "Badge finish", name: byId(FINISHES, finish).name },
      { kind: "Back gear", name: byId(ACCESSORIES.back, acc).name },
      { kind: "Armour variant", name: variant.name },
    ]);
  });

  it("names a loadout class on its own", () => {
    const cls = LOADOUT_CLASSES.find((c) => c.unlock);
    expect(announcements([ownedKey("loadout", cls.id)])).toEqual([
      { kind: "Loadout class", name: cls.name },
    ]);
  });

  it("collapses the tier-gated armour slots into one plate per tier", () => {
    const ids = [
      ownedKey("armor", ARMOR_STYLES.find((x) => x.tier === 2).id),
      ownedKey("helmet", HELMET_STYLES.find((x) => x.tier === 2).id),
    ];
    expect(announcements(ids)).toEqual([
      { kind: "Gear tier", name: "MK II armor, frames, helmets, visors & shoulders" },
    ]);
  });

  it("tier toast batches frames with helmets", () => {
    const ids = [
      ownedKey("frame", BODY_FRAMES.find((x) => x.tier === 2).id),
      ownedKey("helmet", HELMET_STYLES.find((x) => x.tier === 2).id),
      ownedKey("frame", BODY_FRAMES.find((x) => x.tier === 3).id),
    ];
    expect(announcements(ids)).toEqual([
      { kind: "Gear tier", name: "MK II armor, frames, helmets, visors & shoulders" },
      { kind: "Gear tier", name: "MK III armor, frames, helmets, visors & shoulders" },
    ]);
  });

  it("names Acts 3 and 4's tiers in Roman numerals, MK IV and MK V", () => {
    const ids = [4, 5].map((tier) => ownedKey("frame", BODY_FRAMES.find((x) => x.tier === tier).id));
    expect(announcements(ids).map((a) => a.name.split(" ").slice(0, 2).join(" "))).toEqual(["MK IV", "MK V"]);
  });

  it("skips an id whose table entry has gone", () => {
    expect(announcements(["badge.symbol:#no-such-symbol", "nonsense:4"])).toEqual([]);
  });
});
