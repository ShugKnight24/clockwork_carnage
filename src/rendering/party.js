/**
 * Who stands in a `party` frame.
 *
 * The party art only draws people who have joined (spec: "The party art only
 * ever shows the people who have actually joined"). A frame names its
 * members (`party: ["lyra", "you", "rook"]`); the cutscene engine turns that
 * into an art key such as `party:lyra+you+rook`, which both renderers read,
 * so every member set rasterises and caches as its own bitmap.
 *
 * The lineup always keeps the same left-to-right order, with the player in
 * the middle of whoever is there. The full five keep the positions the
 * lineup was drawn with; fewer spread out from the centre.
 */

/** Left to right. "you" is the player. */
export const PARTY_ORDER = ["kael", "lyra", "you", "nova", "rook"];

/** Everyone: the lineup a bare `party` key draws. */
export const FULL_PARTY = [...PARTY_ORDER];

/** Art-unit x of each member in the full lineup. */
const FULL_X = { kael: -84, lyra: -44, you: 0, nova: 44, rook: 84 };
const GAP = 44;

/** Members in lineup order, unknown names and repeats dropped. */
export function orderParty(members) {
  const set = new Set(members);
  return PARTY_ORDER.filter((m) => set.has(m));
}

/** Art key for a member list: "party" for everyone, "party:a+b" otherwise. */
export function partyKey(members) {
  const list = orderParty(members ?? FULL_PARTY);
  return list.length === PARTY_ORDER.length ? "party" : `party:${list.join("+")}`;
}

/** Members an art key draws, or null when the key is not a party key. */
export function partyMembers(key) {
  if (key === "party") return [...FULL_PARTY];
  if (typeof key !== "string" || !key.startsWith("party:")) return null;
  const list = orderParty(key.slice(6).split("+"));
  return list.length ? list : null;
}

export const isPartyKey = (key) => partyMembers(key) !== null;

/**
 * x position of each member (art units, 0 = centre of frame). The player
 * stays central when present; the group as a whole is centred.
 * @param {string[]} members
 * @returns {Record<string, number>}
 */
export function partyLayout(members) {
  const list = orderParty(members);
  if (list.length === PARTY_ORDER.length) return { ...FULL_X };
  const mid = (list.length - 1) / 2;
  return Object.fromEntries(list.map((m, i) => [m, (i - mid) * GAP]));
}
