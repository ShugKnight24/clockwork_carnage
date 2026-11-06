/**
 * Wardrobe theme "issue" (Field Issue): the pieces the suit shipped with.
 * Painted by src/rendering/svg-art/wardrobe-themes/issue.js under the same ids.
 */
export default {
  id: "issue",
  name: "Field Issue",
  /** Body frames: the silhouette the suit is built on. Any armour style can be worn on any frame. */
  frames: [
    { id: "standard", name: "Field", desc: "The suit as issued: balanced, familiar" },
    { id: "strider", name: "Strider", desc: "Lean under-suit, modular kit, a jump-kit behind the shoulders" },
    { id: "vanguard", name: "Vanguard", desc: "Sleek sculpted plate, panel lines and glowing seams" },
    { id: "operator", name: "Operator", desc: "Soft kit: fabric sleeves and trousers, chest rig, elbow pads" },
    { id: "wraith", name: "Wraith", desc: "Hooded long coat, wrapped forearms and shins" },
    { id: "breacher", name: "Breacher", desc: "Ballistic chest plate, riot vambrace, grenade belt, heavy boots" },
  ],
};
