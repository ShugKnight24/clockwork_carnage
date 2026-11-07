/**
 * Scoped SVG ids for piece painters (wardrobe frames, helmets, shoulders, gloves and
 * accessories). Several figures share a page (the creator grid, the title
 * hero beside the HUD portrait) and looks are cached, so a painter never
 * writes a bare id: it asks its kit for one and registers what it defines.
 *
 *   K.uid(name)    -> "<piece>-<name>", where <piece> is the piece's slot and
 *                     id ("shoulder-pods"), so two pieces of one figure never
 *                     share an id even when their ids match ("ordnance" is a
 *                     helmet and a shoulder). The figure's own idPrefix is
 *                     added when the figure is scoped (agent-rig.js scopeIds),
 *                     giving "<idPrefix><piece>-<name>" in the page.
 *   K.defs(markup) -> registers gradients, clips, masks or patterns in the
 *                     figure's own <defs>. A piece drawn twice (both
 *                     shoulders) may register the same markup twice; it is
 *                     kept once. One id with two different definitions is a
 *                     painter bug (left and right need their own names) and
 *                     throws.
 *
 * Defs are not recoloured with the body: paint them from the resolved look.
 */

const ID = /\bid="([^"]+)"/g;

/**
 * A figure's collector of piece defs.
 * @returns {{ kit(piece: string): { uid(name: string): string, defs(markup: string): void }, markup(): string }}
 */
export function idScope() {
  const chunks = [];
  const seen = new Set();
  const owner = new Map(); // id -> the markup that defines it
  const add = (markup) => {
    if (!markup || seen.has(markup)) return;
    for (const [, id] of markup.matchAll(ID)) {
      if (owner.has(id)) throw new Error(`K.defs: id "${id}" is defined twice with different markup`);
      owner.set(id, markup);
    }
    seen.add(markup);
    chunks.push(markup);
  };
  return {
    kit: (piece) => ({ uid: (name) => `${piece}-${name}`, defs: add }),
    markup: () => chunks.join(""),
  };
}
