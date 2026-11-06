/**
 * Wardrobe theme "issue" (Field Issue): the art for
 * src/data/wardrobe-themes/issue.js, by id. See ./index.js for what each
 * painter is given and returns.
 *
 *   standard  — the field suit as issued
 *   strider   — lean under-suit, modular kit, a jump-kit behind the shoulders
 *   vanguard  — sleek sculpted plate, panel lines, glowing seams
 *   operator  — soft kit: fabric sleeves and trousers, chest rig, elbow pads
 *   wraith    — hooded long coat over wrapped forearms and shins
 *   breacher  — ballistic chest, riot vambrace, grenade belt, heavy boots
 *
 * Helmets: standard, wide (Bastion, open), angular, mohawk (Centurion,
 * open), crested (Vanguard), ordnance, bucket, crusader, sealed, reaper
 * (balaclava), pilot (tri-lens), bandana (do-rag).
 *
 * Shoulders: none (bare cap), pads, spikes (Jagged), pauldrons, armored
 * (Bulwark), slab, dome, ordnance (Launcher), layered.
 */
import { INK, RIM, f, pt, lerp, mirror, shape, line, part, energy, muscle, armJoints, polar, heading, LIMB } from "../models/hero.js";
import { STEEL, STEEL_DK, SUIT, CANDY, CANDY_HI, AMBER, plateAt, lineAt, mirrorIf, k, T, S } from "../frame-kit.js";

const NONE = { under: "", legs: "", torso: "", arms: "", glow: "" };

// ── Helmets: outlines and table (painters at the end) ──────────────────────

/** Shell outlines, by helmet id. */
const SHELLS = {
  standard:
    "M0,-95 C7.6,-95 11.4,-89.8 11.4,-82.5 L11,-77 C10.6,-73.4 8.6,-70.6 5,-69 C3,-68.2 1.5,-68 0,-68 " +
    "C-1.5,-68 -3,-68.2 -5,-69 C-8.6,-70.6 -10.6,-73.4 -11,-77 L-11.4,-82.5 C-11.4,-89.8 -7.6,-95 0,-95 Z",
  angular: "M0,-96 L7.8,-94.4 L12,-88.4 L12.3,-79 L9.8,-72 L4.6,-68.2 L0,-67.6 L-4.6,-68.2 L-9.8,-72 L-12.3,-79 L-12,-88.4 L-7.8,-94.4 Z",
  crested:
    "M0,-95.6 C7.8,-95 11.6,-89.8 11.6,-82.5 L11.2,-77 C10.8,-73 8.6,-70.4 5,-68.8 L0,-67.6 L-5,-68.8 " +
    "C-8.6,-70.4 -10.8,-73 -11.2,-77 L-11.6,-82.5 C-11.6,-89.8 -7.8,-95 0,-95.6 Z",
  wide:
    "M0,-96.4 C9.6,-96.4 14.2,-90.6 14.2,-82.8 L14.4,-75.4 C14,-71.6 11.2,-69.2 7.4,-68.4 L4.8,-68.2 L4.8,-71.6 " +
    "C6.8,-73.2 8,-75.8 8.2,-79 L8.4,-87 L-8.4,-87 L-8.2,-79 C-8,-75.8 -6.8,-73.2 -4.8,-71.6 L-4.8,-68.2 L-7.4,-68.4 " +
    "C-11.2,-69.2 -14,-71.6 -14.4,-75.4 L-14.2,-82.8 C-14.2,-90.6 -9.6,-96.4 0,-96.4 Z",
  mohawk:
    "M0,-95 C7.8,-95 11.8,-89.8 11.8,-82.5 L11.6,-76 C11.4,-72 9.8,-69.6 6.8,-68.6 L4.2,-68.4 C3.8,-71.4 3.6,-74 4.6,-76.6 " +
    "L6.6,-80 L6.8,-86.6 L-6.8,-86.6 L-6.6,-80 L-4.6,-76.6 C-3.6,-74 -3.8,-71.4 -4.2,-68.4 L-6.8,-68.6 " +
    "C-9.8,-69.6 -11.4,-72 -11.6,-76 L-11.8,-82.5 C-11.8,-89.8 -7.8,-95 0,-95 Z",
  // Ordnance: hard faceted brow over a narrow jaw, built around a raised
  // centre ridge that carries the targeting spine.
  ordnance:
    "M0,-97.4 L6.4,-95.6 L11.8,-90.4 L12.6,-82 L11.4,-76.6 L7.2,-71.2 L3.2,-68.2 L0,-67.8 " +
    "L-3.2,-68.2 L-7.2,-71.2 L-11.4,-76.6 L-12.6,-82 L-11.8,-90.4 L-6.4,-95.6 Z",
  // Bucket: low, wide and round, sunk deep so the collar swallows the neck.
  bucket:
    "M0,-93.2 C9,-93.2 13.6,-88.4 13.8,-81.6 L13.6,-75.4 C13.2,-71.6 10.4,-69 6.2,-68.2 " +
    "L0,-67.6 L-6.2,-68.2 C-10.4,-69 -13.2,-71.6 -13.6,-75.4 L-13.8,-81.6 C-13.6,-88.4 -9,-93.2 0,-93.2 Z",
  // Crusader: a beaked snout under a domed skull, cut for a vertical slit.
  crusader:
    "M0,-97 C8,-96.4 11.8,-90.8 11.8,-83.4 L11.4,-79 C11,-76.2 9.6,-74.2 7.4,-73 " +
    "L5.6,-68.2 C3.6,-66.6 -3.6,-66.6 -5.6,-68.2 L-7.4,-73 C-9.6,-74.2 -11,-76.2 -11.4,-79 " +
    "L-11.8,-83.4 C-11.8,-90.8 -8,-96.4 0,-97 Z",
  // Sealed: one continuous teardrop shell, no ear cups, no seams.
  sealed:
    "M0,-95.8 C8.2,-95.8 12,-90.2 11.8,-82.6 L11.2,-76.2 C10.6,-72.4 8,-69.6 4.4,-68.4 " +
    "L0,-67.8 L-4.4,-68.4 C-8,-69.6 -10.6,-72.4 -11.2,-76.2 L-11.8,-82.6 C-12,-90.2 -8.2,-95.8 0,-95.8 Z",
};
/** A helmet's art: its anchors, a painter that is given them, and the accessory seats it turns off. */
const helmet = (anchors, draw, seats) => ({ anchors, paint: (c, K) => draw(c, K, anchors), ...(seats && { seats }) });
/** Where every Field Issue helmet wears the badge: high on the left of the dome. */
const BADGE = { x: -8.6, y: -90, rot: -8, size: 4.6 };
/** Anchors for a shell `top`, `half` wide, with the side rail at `rail`. */
const at = (top, half, rail = -86.4) => ({ top, half, rail, badge: BADGE });

/** The plated jaw under a visor that leaves one (closedVisor's `jaw`). */
const JAW = "M-6.6,-76.1 L-3.3,-76.8 L0,-75.7 L3.3,-76.8 L6.6,-76.1 L5.3,-71 C3.6,-69.5 1.8,-68.9 0,-68.8 C-1.8,-68.9 -3.6,-69.5 -5.3,-71 Z";

const HELMETS = {
  // Standard: a raised ridge down the crown.
  standard: helmet(at(-95, 11.2), closedHelm(SHELLS.standard, { crown: shape("M-2,-94.8 C-1.2,-95.4 1.2,-95.4 2,-94.8 L1.5,-86.6 L-1.5,-86.6 Z", "url(#steelDk)", 0.5) })),
  // Bastion: wide, open-faced, a painted crown plate.
  wide: helmet(
    at(-96.4, 14.2),
    openHelm(
      SHELLS.wide,
      -86.6,
      () =>
        line("M-14.2,-82.8 C-10,-84.6 -8.8,-86 -8.4,-87", INK, 0.5, 0.6) +
        line("M14.2,-82.8 C10,-84.6 8.8,-86 8.4,-87", INK, 0.5, 0.6) +
        line("M-12.8,-76 L-8.8,-76.6 M12.8,-76 L8.8,-76.6", INK, 0.45, 0.55) +
        shape("M-4.8,-96 L4.8,-96 L4.2,-92.6 L-4.2,-92.6 Z", "url(#paint)", 0.5),
    ),
  ),
  // Angular: faceted, a sharper jaw.
  angular: helmet(
    at(-96, 12.2),
    closedHelm(SHELLS.angular, {
      jaw: "M-6.8,-76.4 L0,-75.2 L6.8,-76.4 L5,-70 L0,-68.4 L-5,-70 Z",
      detail: () => line("M-12,-88.4 L0,-90.6 L12,-88.4 M-7.8,-94.4 L0,-90.6 L7.8,-94.4 M0,-96 L0,-90.6", INK, 0.45, 0.55) + line("M-11.4,-88.8 L-1,-90.6", "#f4faff", 0.45, 0.5),
    }),
  ),
  // Centurion: painted bristle crest front-to-back, cheek guard rivets.
  // The crest takes the crown, so a plume does not seat there.
  mohawk: helmet(
    at(-95, 11.7),
    openHelm(
      SHELLS.mohawk,
      -86.4,
      (c, K) =>
        shape("M-2.9,-94.6 C-3.6,-100.6 -2.6,-105.6 0,-107.4 C2.6,-105.6 3.6,-100.6 2.9,-94.6 Z", "url(#paint)", 0.8) +
        line("M-1.4,-95 L-1.6,-104.4 M0,-95 L0,-106.6 M1.4,-95 L1.6,-104.4", K.mix(c.pal.dark, "#000000", 0.4), 0.35, 0.8) +
        line("M-2,-96 C-2.6,-100 -2,-103.6 -0.4,-105.8", K.mix(c.pal.primary, "#ffffff", 0.5), 0.45, 0.7) +
        `<g fill="#9fb2c4"><circle cx="-8.4" cy="-74" r=".55"/><circle cx="8.4" cy="-74" r=".55"/><circle cx="-9.2" cy="-78.2" r=".55"/><circle cx="9.2" cy="-78.2" r=".55"/></g>`,
    ),
    { crown: false },
  ),
  // Vanguard: swept cheek fins and a forward crest blade.
  crested: helmet(
    at(-95.6, 11.4),
    closedHelm(SHELLS.crested, {
      fins: (c) => {
        const cheek = "M-11,-85 L-17.6,-93.4 L-16.2,-86.4 L-11.4,-78.6 Z";
        return shape(cheek, "url(#steelDk)", 0.7) + shape(mirror(cheek), "url(#steelDk)", 0.7) + line("M-16.8,-91.6 L-12,-84.6", c.pal.accent, 0.4, 0.55);
      },
      detail: () =>
        shape("M-1.6,-94.8 L-1,-103 L0,-105.2 L1,-103 L1.6,-94.8 Z", "url(#steel)", 0.7) +
        shape("M-0.8,-95 L-0.5,-102 L0,-103.4 L0.5,-102 L0.8,-95 Z", "url(#paint)", 0.3) +
        line("M-1.6,-94.8 L-1.5,-88.6 M1.6,-94.8 L1.5,-88.6", INK, 0.4, 0.5),
    }),
  ),
  // Ordnance: targeting spine down the centre ridge, plus a stubby sensor
  // stalk on the side rail, so side gear drops to the ear cup.
  ordnance: helmet(
    at(-97.4, 12.5, -79.4),
    closedHelm(SHELLS.ordnance, {
      detail: () =>
        line("M0,-96.4 L0,-69", INK, 1.5, 0.75) +
        line("M0,-95.6 L0,-70", "#c9d6e2", 0.6, 0.6) +
        shape("M-12.4,-88.6 L-16.8,-90.6 L-17.4,-86.2 L-12.6,-84.6 Z", "url(#steelDk)", 0.7) +
        line("M-5.4,-93.6 L-9.6,-89.4 M5.4,-93.6 L9.6,-89.4", INK, 0.55, 0.6),
    }),
  ),
  // Bucket: riveted brow band and a chin vent — utilitarian, not sculpted.
  bucket: helmet(
    at(-93.2, 13.7),
    closedHelm(SHELLS.bucket, {
      detail: (c, w) =>
        line(`M${f(-w + 1.4)},-85.6 C-6,-88.4 6,-88.4 ${f(w - 1.4)},-85.6`, INK, 0.7, 0.75) +
        `<g fill="#0a0f16">` +
        [-9.4, -4.8, 4.8, 9.4].map((x) => `<circle cx="${f(x)}" cy="-84.2" r=".75"/>`).join("") +
        `</g>` +
        line("M-5.6,-72 L5.6,-72 M-4.8,-70.2 L4.8,-70.2", INK, 0.55, 0.65),
    }),
  ),
  // Crusader: one cast shell (no ear cups). Beak ridge and a rim of rivets
  // around the dome, monastic rather than military.
  crusader: helmet(
    at(-97, 11.7),
    closedHelm(SHELLS.crusader, {
      ears: false,
      detail: () =>
        line("M0,-96 L0,-73.4", INK, 1.2, 0.7) +
        shape("M-2.4,-74.8 L2.4,-74.8 L1.8,-67.2 L-1.8,-67.2 Z", "url(#steelDk)", 0.7) +
        `<g fill="#c8102e">` +
        [-8.6, 0, 8.6].map((x) => `<circle cx="${f(x)}" cy="-91.4" r=".9"/>`).join("") +
        `</g>` +
        line("M-9.8,-88.4 C-5,-91 5,-91 9.8,-88.4", "#c8102e", 0.7, 0.85),
    }),
  ),
  // Sealed: one continuous shell, no ear cups; one soft crown highlight is
  // the whole point.
  sealed: helmet(at(-95.8, 11.7), closedHelm(SHELLS.sealed, { ears: false, detail: () => line("M-6.6,-92.4 C-2.6,-94.2 2.6,-94.2 6.6,-92.4", "#f4fbfa", 0.8, 0.5) })),
  reaper: helmet(at(-95, 11.2), reaper),
  pilot: helmet(at(-95, 11.2), pilot),
  bandana: helmet(at(-95, 11.2), bandana),
};

// ── Shoulders ───────────────────────────────────────────────────────────────

/** A painted rim stripe with an ink edge, along a right-side path. */
const trim = (c, M, d) => line(M(d), INK, 2.2, 0.9) + line(M(d), c.pal.primary, 1.4, 1);

const SHOULDER_PAINTERS = {
  // Bare: a soft cap over the joint, no plate. The Strider wears it on
  // the right whatever the pick (rightShoulder).
  none: (c, s, K) => {
    const { M, rot, lit } = K;
    const cap = "M11,-66.8 C15.6,-68.8 21.6,-67.8 23.8,-63 C25,-60.2 24.6,-57.4 23.4,-55.4 C21,-56.8 18.4,-57.2 16,-56.6 C15.8,-60.6 14,-64 11,-65.6 Z";
    return rot(
      shape(M(cap), "url(#steel)", 0.9) +
        line(M("M13.4,-65.6 C17,-67 21,-66.4 22.8,-63"), "#f4faff", 0.7, lit ? 0.8 : 0.4) +
        (lit ? "" : line("M23.8,-62 C24.8,-59.6 24.6,-57.4 23.6,-55.8", c.rim, 0.7, 0.85)),
    );
  },
  // Combat Pads: the hero pauldron with a painted rim stripe.
  pads: (c, s, K) => {
    const { M, rot } = K;
    return K.pauldron(s) + rot(trim(c, M, "M13.8,-64.2 C18.6,-66.2 24.2,-65.4 27,-60.8"));
  },
  spikes: (c, s, K) => {
    const { M, rot } = K;
    const spikes = [
      ["M14.6,-66.2 L15.6,-76.8 L19.4,-67.6 Z"],
      ["M20.2,-67.8 L23.8,-79 L25.2,-66.2 Z"],
      ["M25.4,-65 L32.6,-72.8 L29,-61.4 Z"],
    ]
      .map(([d]) => shape(M(d), "url(#steelDk)", 0.8) + line(M(d.split(" L")[0] + " L" + d.split(" L")[1]), "#eaf4ff", 0.4, 0.5))
      .join("");
    const jag = "M16.6,-43.6 L19.4,-39.6 L21.8,-43 L24.6,-39.2 L26.8,-42.6 L27.4,-44 Z";
    return rot(spikes) + K.pauldron(s) + rot(shape(M(jag), "url(#steelDk)", 0.7) + trim(c, M, "M13.8,-64.2 C18.6,-66.2 24.2,-65.4 27,-60.8"));
  },
  pauldrons: (c, s, K) => {
    const { M, rot, lit } = K;
    const plate = "M9.8,-68.6 L27.4,-72 L35,-60.6 L33.6,-44.4 L16.2,-46.6 C17.2,-55 14.8,-62.2 9.8,-65 Z";
    const lameA = "M16.4,-46.8 L33.8,-44.4 L32.8,-39.4 L17,-41.6 Z";
    const lameB = "M17,-42 L32.8,-39.8 L31.4,-35.2 L17.6,-37.2 Z";
    return rot(
      shape(M(lameB), "url(#steelDk)", 0.8) +
        shape(M(lameA), "url(#steel)", 0.8) +
        shape(M(plate), "url(#steel)") +
        shape(M("M12.4,-67.2 L27,-70.2 L29.6,-66.4 L14.6,-63.4 Z"), "url(#paint)", 0.6) +
        line(M("M17.6,-60.4 L32.6,-58"), INK, 0.5, 0.6) +
        line(M("M15.4,-62.8 L30.4,-60.4"), "#f4faff", 0.55, lit ? 0.8 : 0.4) +
        `<g fill="#0a0f16"><circle cx="${f(s * 30.6)}" cy="-50" r=".7"/><circle cx="${f(s * 21)}" cy="-50.8" r=".7"/></g>` +
        (lit ? `<ellipse cx="-24" cy="-56" rx="6" ry="4" fill="url(#sheen)"/>` : line("M35.2,-60 L33.8,-44.6", c.rim, 0.8, 0.9)),
    );
  },
  armored: (c, s, K) => {
    const { M, rot, lit } = K;
    const block = "M10.4,-67.8 L30.4,-70.4 L34.4,-66.2 L34.4,-48.6 L30.2,-44.8 L15.6,-46.8 C16.8,-55 14.6,-61.8 10.4,-64.4 Z";
    const face = "M15.4,-64.6 L29.6,-66.4 L31.4,-64 L31.4,-50.4 L29,-48.2 L18,-49.6 C18.4,-55 17.6,-60.6 15.4,-64.6 Z";
    return rot(
      shape(M(block), "url(#steelDk)") +
        shape(M(face), "url(#steel)", 0.7) +
        shape(M("M22.6,-65.6 L25.2,-65.9 L25.2,-48.8 L22.6,-49.2 Z"), "url(#paint)", 0.5) +
        line(M("M16.6,-63.6 L29.2,-65.4"), "#f4faff", 0.55, lit ? 0.85 : 0.4) +
        `<g fill="#0a0f16"><circle cx="${f(s * 18.6)}" cy="-61.8" r=".6"/><circle cx="${f(s * 29.4)}" cy="-63.2" r=".6"/><circle cx="${f(s * 29.4)}" cy="-51.4" r=".6"/><circle cx="${f(s * 19.6)}" cy="-50.8" r=".6"/></g>` +
        (lit ? "" : line("M34.6,-65.6 L34.6,-49", c.rim, 0.8, 0.9)),
    );
  },
  slab: (c, s, K) => {
    const { M, rot, lit } = K;
    // Oversized rounded slab — the single widest silhouette in the set. It
    // overhangs the arm rather than capping it, so the shoulders read first.
    const plate = "M8.6,-69.4 C20,-74.6 33,-72.2 38.4,-62 C41.4,-56.2 41,-48.6 38.2,-42.4 " +
      "C31.6,-38.4 22.4,-38.2 15.4,-41.6 C17.4,-51.2 14.6,-62.4 8.6,-66.2 Z";
    const lip = "M12.6,-66.8 C22.6,-70.6 32.6,-68.2 37,-60.2";
    return rot(
      shape(M(plate), "url(#steel)") +
        shape(M("M16.4,-45.6 C23.6,-42.4 32,-42.6 38,-46"), "url(#steelDk)", 0.9) +
        line(M(lip), INK, 2.4, 0.9) +
        line(M(lip), c.pal.primary, 1.5, 1) +
        line(M("M14.4,-63.2 C23.4,-67 32.2,-64.8 36,-57.6"), "#f4faff", 0.7, lit ? 0.85 : 0.4) +
        // Unit indicator, the one bright mark on a very large plate.
        `<circle cx="${f(s * 27)}" cy="-55" r="3.4" fill="url(#steelDk)" stroke="${INK}" stroke-width=".8"/>` +
        `<circle cx="${f(s * 27)}" cy="-55" r="1.7" fill="${c.pal.primary}" stroke="${INK}" stroke-width=".4"/>` +
        (lit
          ? `<ellipse cx="-26" cy="-60" rx="8" ry="5" fill="url(#sheen)"/>`
          : line("M40.2,-58 C41.4,-50 40.6,-45.4 38.6,-42.8", c.rim, 0.9, 0.9)),
    );
  },
  dome: (c, s, K) => {
    const { M, rot, lit } = K;
    // Domed crusader pauldron: a deep half-shell with a raised rim, the
    // heraldic surface of the suit.
    const shell = "M9.4,-68.6 C21,-76 34.6,-71.4 38,-58.8 C39.8,-52 38.4,-45.6 35.4,-41.4 " +
      "C28,-38.6 20,-39.6 15.8,-42.8 C17.8,-52.4 15.2,-63.6 9.4,-66.6 Z";
    const rim = "M9.6,-67.4 C21.4,-74.2 33.6,-69.8 36.8,-58.4 C38.4,-52.4 37.2,-46.8 34.6,-42.8";
    return rot(
      shape(M(shell), "url(#steel)") +
        line(M(rim), INK, 3.6, 1) +
        line(M(rim), CANDY, 2.2, 1) +
        line(M("M13.8,-62.8 C22.4,-67.6 30.6,-64.4 33.8,-56"), CANDY_HI, 0.7, lit ? 0.8 : 0.35) +
        // Heraldic drop on the face of the plate.
        `<path d="M${f(s * 26)},-61.6 L${f(s * 30.4)},-53.4 L${f(s * 26)},-45.6 L${f(s * 21.6)},-53.4 Z" fill="${CANDY}" stroke="${INK}" stroke-width=".7"/>` +
        `<circle cx="${f(s * 26)}" cy="-53.4" r="1.4" fill="#e8d9a4" stroke="${INK}" stroke-width=".35"/>` +
        (lit ? "" : line("M37.4,-52 C38,-46.6 36.8,-43.4 35,-41.6", c.rim, 0.9, 0.9)),
    );
  },
  ordnance: (c, s, K) => {
    const { M, rot, lit } = K;
    // Boxy launcher housing rather than a plate: vents, a lift handle and a
    // rail along the top.
    const box = "M10.4,-68.6 L29.6,-71.8 L35.2,-66.4 L35.6,-48.2 L30,-43.4 L15.6,-45.4 C17,-54.4 14.8,-63.4 10.4,-65.6 Z";
    return rot(
      shape(M(box), "url(#steelDk)") +
        shape(M("M15,-64.2 L29.4,-66.4 L31.8,-63.6 L32,-49.6 L29.2,-47 L18.2,-48.4 C18.8,-55.4 17.6,-60.4 15,-64.2 Z"), "url(#steel)", 0.8) +
        // Vent louvres
        [0, 1, 2].map((i) => line(M(`M19.4,${f(-60.6 + i * 4.4)} L30,${f(-62 + i * 4.4)}`), INK, 1.1, 0.75)).join("") +
        line(M("M12.4,-69 L30.2,-72"), INK, 2.6, 1) +
        line(M("M12.4,-69 L30.2,-72"), AMBER, 1.4, 0.9) +
        // Lift handle
        line(M("M21,-73.4 C24,-77.2 28.6,-77.6 31,-74.4"), INK, 2.4) +
        line(M("M21,-73.4 C24,-77.2 28.6,-77.6 31,-74.4"), "#9aa3ad", 1.3) +
        (lit ? "" : line("M35.8,-65.4 L36.2,-48.6", c.rim, 0.9, 0.9)),
    );
  },
  layered: (c, s, K) => {
    const { M, rot, lit } = K;
    // Three angular plates stepping down the arm, the sealed-suit answer to
    // a pauldron: light, overlapping, no bulk.
    const p1 = "M10.6,-68 L26.4,-70.4 L31.6,-63.4 L29.4,-57.4 L13.4,-58.6 C14.4,-62.4 13,-66 10.6,-68 Z";
    const p2 = "M13.8,-57 L29.6,-55.8 L32.4,-50.2 L29.2,-46.6 L15.4,-47.4 Z";
    const p3 = "M15.8,-46 L29.4,-45.2 L31,-41 L27.8,-38.4 L16.8,-39.4 Z";
    return rot(
      shape(M(p3), "url(#steelDk)", 0.9) +
        shape(M(p2), "url(#steel)", 0.9) +
        shape(M(p1), "url(#steel)", 1) +
        line(M("M13.4,-65.6 L25.6,-67.4 L29.6,-62.4"), "#f4fbfa", 0.65, lit ? 0.85 : 0.4) +
        line(M("M13.8,-57 L29.6,-55.8"), INK, 0.55, 0.7) +
        line(M("M15.8,-46 L29.4,-45.2"), INK, 0.55, 0.7) +
        (lit ? "" : line("M31.4,-62.8 L32.6,-50 L30.8,-40.6", c.rim, 0.8, 0.9)),
    );
  },
};

const SHOULDERS = Object.fromEntries(Object.entries(SHOULDER_PAINTERS).map(([id, paint]) => [id, { paint }]));

export default {
  id: "issue",
  frames: {
    standard: { shape: { width: 1, shoulder: 1, hides: [] }, layers: () => NONE },
    // The right shoulder stays bare (the soft cap) for the asymmetric kit.
    strider: { shape: { width: 0.93, shoulder: 0.92, rightShoulder: "none", hides: [] }, layers: strider },
    vanguard: { shape: { width: 1, shoulder: 1.04, hides: [] }, layers: vanguard },
    // softTorso: fabric over the chest, so no chest trim or core light;
    // sleeves and wraps cover the limbs' energy channels (limbGlow).
    operator: { shape: { width: 0.97, shoulder: 1, softTorso: true, hides: ["shoulders", "limbGlow"] }, layers: operator },
    wraith: { shape: { width: 1, shoulder: 0.96, hides: ["cape", "limbGlow"] }, layers: wraith },
    breacher: { shape: { width: 1.04, shoulder: 1.12, hides: [] }, layers: breacher },
  },
  helmets: HELMETS,
  shoulders: SHOULDERS,
};

// ── Strider: lean, modular, a jump-kit ──────────────────────────────────────

function strider(P, c) {
  // Jump-kit: two exhaust stacks rising behind the shoulders from a pack on
  // the back, vents glowing at the tips.
  const stack = (s) =>
    shape(mirrorIf(s, "M8.6,-64 L9.4,-79.6 C9.6,-81.2 11,-82.2 12.6,-82 L15.8,-81.4 C17.2,-81 18,-79.8 17.8,-78.4 L16.6,-63 Z"), STEEL_DK, 1) +
    shape(mirrorIf(s, "M10.4,-66 L11,-77.6 L15.6,-77 L15,-65.4 Z"), STEEL, 0.6) +
    line(mirrorIf(s, "M10.8,-74 L15.4,-73.4 M10.6,-70.4 L15.2,-69.8"), "#0a0f16", 0.7, 0.9) +
    shape(mirrorIf(s, "M9.6,-80.4 L17.6,-79.2 L17.2,-82.4 L10.2,-83.4 Z"), "#0a0f16", 0.6);
  const under = stack(-1) + stack(1);
  const vent = (s) => `<path d="${mirrorIf(s, "M10.6,-82.2 L16.8,-81.3")}" fill="none" stroke-width="1.1" stroke-linecap="round"/>`;
  const glow = energy(vent(-1) + vent(1), c.energy);
  const legs = P.legs
    .map(({ hip, kn, an }, i) => {
      const s = i === 0 ? -1 : 1;
      // Fabric sleeve over the shin plate, a rubber knee pad, a thigh holster on the right.
      let out =
        part(lerp(kn, an, 0.18), lerp(kn, an, 0.86), 10.2, 7.2, { fill: SUIT, bulge: 1.2, hi: 0.2, rim: 0.45 }) +
        plateAt(kn, kn, an, "M-5.2,-5 C-2,-6 2,-6 5.2,-5 L5,3.4 C2,4.6 -2,4.6 -5,3.4 Z", "#22262b", 0.9) +
        lineAt(kn, kn, an, "M-4.2,-1 L4.2,-1", "#3c434b", 0.6, 0.9);
      if (s > 0)
        out += lineAt(lerp(hip, kn, 0.5), hip, kn, "M-7.6,-3.6 L9.8,-3.6 M-7.6,4 L9.8,4", "#1a1d21", 1.4, 1) + plateAt(lerp(hip, kn, 0.5), hip, kn, "M2.6,-6 L9.6,-6 L9.2,6.6 L3,6.6 Z", STEEL_DK, 0.8);
      return out;
    })
    .join("");
  // Fitted under-suit torso, a plate carrier with straps, three mag pouches.
  const torso =
    shape("M-14.8,-64.6 C-16.8,-56 -16.4,-46 -14.4,-38 C-13.4,-34 -13,-30 -13.2,-27.6 L13.2,-27.6 C13,-30 13.4,-34 14.4,-38 C16.4,-46 16.8,-56 14.8,-64.6 C8,-66.2 -8,-66.2 -14.8,-64.6 Z", SUIT, 1) +
    line("M-14.4,-61 C-15.6,-54 -15.4,-46 -13.8,-40", "#3a4d61", 0.6, 0.6) +
    line("M-11.4,-62.4 L-13.2,-68 M11.4,-62.4 L13.2,-68", "#1a1d21", 2.4, 1) +
    shape("M-12.4,-62.6 L12.4,-62.6 L11.8,-39 L-11.8,-39 Z", STEEL, 1) +
    line("M-11,-61 L11,-61", "#eaf4ff", 0.5, 0.45) +
    line("M12.4,-61.6 L11.8,-40", RIM, 0.6, 0.7) +
    [-10.4, -3.3, 3.8]
      .map((x) => shape(`M${f(x)},-45.6 L${f(x + 6.6)},-45.6 L${f(x + 6.4)},-34.6 L${f(x + 0.2)},-34.6 Z`, "#2a2f35", 0.8) + line(`M${f(x + 0.6)},-43.4 L${f(x + 6)},-43.4`, "#5c6773", 0.5, 0.8))
      .join("") +
    `<circle cx="0" cy="-54" r="3" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.6" fill="#0b7c90"/>`;
  return { under, legs, torso, arms: "", glow };
}

// ── Vanguard: sleek sculpted plate ─────────────────────────────────────────

function vanguard(P, c) {
  let glow = "";
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      // Thin moulded shells that follow the muscle, with a panel line and a
      // glowing seam on the outside of each.
      const seamA = T(leg, 0.3);
      const seamB = T(leg, 0.56);
      const shinA = S(leg, 0.28);
      const shinB = S(leg, 0.6);
      glow += energy(
        `<path d="M${pt(seamA[0] + s * 5.2, seamA[1])}L${pt(seamB[0] + s * 4.8, seamB[1])} M${pt(shinA[0] + s * 3.4, shinA[1])}L${pt(shinB[0] + s * 3, shinB[1])}" fill="none" stroke-width=".8" stroke-linecap="round"/>`,
        c.energy,
      );
      return (
        muscle(T(leg, 0.08), T(leg, 0.66), k(LIMB.THIGH.out, 0.88), k(LIMB.THIGH.in, 0.84), s, { hi: 0.65 }) +
        line(`M${pt(...T(leg, 0.14))}L${pt(...T(leg, 0.6))}`, INK, 0.5, 0.5) +
        muscle(S(leg, 0.2), S(leg, 0.66), k(LIMB.CALF.out, 0.86), k(LIMB.CALF.in, 0.84), s, { hi: 0.6 }) +
        line(`M${pt(...S(leg, 0.24))}L${pt(...S(leg, 0.62))}`, INK, 0.45, 0.5)
      );
    })
    .join("");
  const chest =
    "M-15.4,-64.6 C-8,-67 8,-67 15.4,-64.6 C17.6,-58 17.4,-50 15.8,-45 L11.6,-41.4 L0,-38.6 L-11.6,-41.4 L-15.8,-45 C-17.4,-50 -17.6,-58 -15.4,-64.6 Z";
  const torso =
    shape("M-9.2,-72.4 C-4.4,-74 4.4,-74 9.2,-72.4 L13.4,-66.2 C7,-64.2 -7,-64.2 -13.4,-66.2 Z", STEEL_DK, 0.9) +
    shape(chest, STEEL, 1.1) +
    line("M-12.6,-60.4 L-3,-55.4 L0,-55 L3,-55.4 L12.6,-60.4", INK, 0.6, 0.6) +
    line("M-13.4,-49 C-9,-45 -4,-43.4 0,-43 C4,-43.4 9,-45 13.4,-49", INK, 0.5, 0.5) +
    line("M-14.2,-61 C-10,-63.6 -5,-64 -1.6,-63.6", "#ffffff", 0.8, 0.65) +
    line("M16.6,-58 C17,-53 16.4,-48.6 15,-45.6", RIM, 0.7, 0.8) +
    `<circle cx="0" cy="-54" r="3.4" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.8" fill="#0b7c90"/>` +
    shape("M-9.6,-37.6 C-5,-36.6 5,-36.6 9.6,-37.6 L9,-33.2 C5,-32.4 -5,-32.4 -9,-33.2 Z", STEEL_DK, 0.8) +
    shape("M-9,-32.4 C-5,-31.6 5,-31.6 9,-32.4 L8.6,-28.6 C5,-28 -5,-28 -8.6,-28.6 Z", STEEL_DK, 0.8);
  glow += energy(`<path d="M-15.6,-58 L-14.8,-50.4 L-12.2,-45.4 M15.6,-58 L14.8,-50.4 L12.2,-45.4 M-8.6,-35.2 L8.6,-35.2" fill="none" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/>`, c.energy);
  return { under: "", legs, torso, arms: "", glow };
}

// ── Operator: soft kit ─────────────────────────────────────────────────────

function operator(P, c) {
  const pad = "#2a2e33";
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      // Combat trousers over the plates: fabric thigh and shin, the knee pad
      // still strapped on top; a drop-leg holster on the right.
      let out =
        muscle(T(leg, 0.04), T(leg, 0.9), k(LIMB.THIGH.out, 1.02), k(LIMB.THIGH.in, 1.0), s, { fill: SUIT, hi: 0.14, rim: 0.3, weave: true }) +
        line(`M${pt(T(leg, 0.5)[0] + s * 5, T(leg, 0.5)[1])} l${f(s * 0.6)},5`, "#000000", 0.5, 0.4) +
        muscle(S(leg, 0.3), S(leg, 0.66), k(LIMB.CALF.out, 1.02), k(LIMB.CALF.in, 1.0), s, { fill: SUIT, hi: 0.12, rim: 0.3, weave: true }) +
        // Cargo pocket.
        plateAt(T(leg, 0.48), leg.hip, leg.kn, `M${f(s * 2.4)},-3.6 L${f(s * 7.4)},-3.4 L${f(s * 7.2)},4 L${f(s * 2.6)},4 Z`, SUIT, 0.6) +
        lineAt(T(leg, 0.48), leg.hip, leg.kn, `M${f(s * 2.6)},-2 L${f(s * 7.2)},-1.8`, "#000000", 0.45, 0.5) +
        // Knee pad on top of the trousers.
        plateAt(S(leg, 0.08), leg.kn, leg.an, "M0,-5.2 C3.4,-5.2 5,-3.2 5,-0.4 C5,2.6 3,4.6 0,5.2 C-3,4.6 -5,2.6 -5,-0.4 C-5,-3.2 -3.4,-5.2 0,-5.2 Z", pad, 1) +
        lineAt(S(leg, 0.08), leg.kn, leg.an, "M-3.4,-1 C-1.4,-2.4 1.4,-2.4 3.4,-1", "#4a5058", 0.5, 0.8);
      if (s > 0)
        out +=
          lineAt(T(leg, 0.55), leg.hip, leg.kn, "M-7.6,-3.6 L9.8,-3.6 M-7.6,4 L9.8,4", "#1a1d21", 1.4, 1) +
          plateAt(T(leg, 0.55), leg.hip, leg.kn, "M2.4,-6.4 L9.8,-6.4 L9.4,7 L2.8,7 Z", "#22262a", 0.8);
      return out;
    })
    .join("");
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      const up = heading(sh, el);
      // Fabric sleeves from the shoulder (no pauldron), rolled at the
      // forearm, an elbow pad on the point.
      return (
        muscle(polar(sh, up, -4.4), el, k(LIMB.UPPER_ARM.out, 1.06), k(LIMB.UPPER_ARM.in, 1.04), s, { fill: SUIT, hi: 0.18, rim: 0.35, weave: true }) +
        muscle(el, lerp(el, wr, 0.5), k(LIMB.FOREARM.out, 1.06), k(LIMB.FOREARM.in, 1.04), s, { fill: SUIT, hi: 0.14, rim: 0.3, weave: true }) +
        plateAt(lerp(el, wr, 0.5), el, wr, "M-5,-1.2 L5,-1.2 L5.2,1.4 L-5.2,1.4 Z", SUIT, 0.7) +
        lineAt(lerp(el, wr, 0.5), el, wr, "M-4.6,0 L4.6,0", "#000000", 0.4, 0.5) +
        plateAt(el, sh, el, `M${f(s * 1.2)},-3.4 C${f(s * 5.4)},-3.8 ${f(s * 6.8)},-0.6 ${f(s * 6)},2.8 C${f(s * 4.6)},4 ${f(s * 2.4)},3.6 ${f(s * 1)},2.6 Z`, pad, 0.8)
      );
    })
    .join("");
  // A shirt over the chest plate, and a chest rig: a row of mag pouches on a
  // harness, a radio on the left.
  const rig = "#2f3329";
  const torso =
    shape("M-15.6,-64.8 C-17.4,-56 -17,-46 -15,-38 C-14,-34 -13.6,-30 -13.8,-27.6 L13.8,-27.6 C13.6,-30 14,-34 15,-38 C17,-46 17.4,-56 15.6,-64.8 C8,-66.6 -8,-66.6 -15.6,-64.8 Z", SUIT, 1) +
    `<path d="M-15.6,-64.8 C-17.4,-56 -17,-46 -15,-38 C-14,-34 -13.6,-30 -13.8,-27.6 L13.8,-27.6 C13.6,-30 14,-34 15,-38 C17,-46 17.4,-56 15.6,-64.8 C8,-66.6 -8,-66.6 -15.6,-64.8 Z" fill="url(#weave)"/>` +
    line("M-4,-66 L-2.6,-60 M4,-66 L2.6,-60", "#000000", 0.5, 0.4) +
    line("M-11.6,-64.4 L-9.4,-50.6 M11.6,-64.4 L9.4,-50.6", INK, 2.6) +
    line("M-11.6,-64.4 L-9.4,-50.6 M11.6,-64.4 L9.4,-50.6", rig, 1.8) +
    shape("M-14.2,-50.8 L14.2,-50.8 L13.8,-40.4 L-13.8,-40.4 Z", rig, 1) +
    [-12.8, -6.6, -0.4, 5.8].map((x) => shape(`M${f(x)},-50.2 L${f(x + 5.6)},-50.2 L${f(x + 5.4)},-41.2 L${f(x + 0.2)},-41.2 Z`, "#292c24", 0.7) + line(`M${f(x + 0.4)},-48.6 L${f(x + 5.2)},-48.6`, "#5c6248", 0.45, 0.85)).join("") +
    shape("M-15.4,-62.2 L-12.2,-62.8 L-11.8,-55 L-15,-54.6 Z", "#22262a", 0.8) +
    line("M-14.8,-62.4 L-15.8,-69.6", INK, 1.1) +
    line("M-14.8,-62.4 L-15.8,-69.6", "#3c4147", 0.5);
  return { under: "", legs, torso, arms, glow: "" };
}

// ── Wraith: a hooded long coat ─────────────────────────────────────────────

function wraith(P, c) {
  const coat = "#2e2924";
  const coatHi = "#4a433a";
  const wrap = "#5c574a";
  // The back of the coat hangs behind the legs, ragged at the knee.
  const back =
    "M-15.6,-62 L15.6,-62 L18.4,8 L14.6,13.6 L10.6,10 L6,14.8 L1.6,11 L-3,15 L-7.6,10.6 L-11.8,14.6 L-15.4,10.2 L-18.4,8 Z";
  const under = shape(back, coat, 1) + `<path d="${back}" fill="url(#weave)" opacity=".6"/>` + line("M-8,-40 L-10.4,8 M8,-40 L10.4,8", "#000000", 0.6, 0.45);
  // Wraps up the shins.
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      let out = muscle(S(leg, 0.22), S(leg, 0.66), k(LIMB.CALF.out, 1.04), k(LIMB.CALF.in, 1.02), s, { fill: wrap, hi: 0.2, rim: 0.3, weave: true });
      for (let t = 0.26; t < 0.64; t += 0.075) out += lineAt(S(leg, t), leg.kn, leg.an, "M-5.4,-1.2 L5.4,1.2", "#2e2b24", 0.55, 0.8);
      return out;
    })
    .join("");
  // Front panels, open down the middle, a hood behind the head, a strap
  // cinching the coat at the waist.
  const panel = "M-18.2,-66 C-14,-67.8 -9,-67.8 -5.4,-66.6 C-4,-52 -3.2,-40 -4,-28 L-5.6,12 L-9.6,15.6 L-13.4,11.6 L-17.2,14.6 L-19.6,10.8 L-19.4,-28 C-20.4,-42 -20.4,-56 -18.2,-66 Z";
  const hood = "M-12.2,-64 C-15.4,-73 -13,-84.6 -6,-88.6 C-2,-90.6 2,-90.6 6,-88.6 C13,-84.6 15.4,-73 12.2,-64 C8,-66.4 -8,-66.4 -12.2,-64 Z";
  const torso =
    shape(hood, coat, 1) +
    `<path d="${hood}" fill="url(#weave)" opacity=".5"/>` +
    line("M-10.4,-66 C-12.6,-74 -10.6,-83 -5,-86.6", coatHi, 0.6, 0.8) +
    shape(panel, coat, 1) +
    shape(mirror(panel), coat, 1) +
    `<path d="${panel}" fill="url(#weave)" opacity=".6"/><path d="${mirror(panel)}" fill="url(#weave)" opacity=".6"/>` +
    line("M-5.4,-66.6 C-4,-52 -3.2,-40 -4,-28 L-5.6,12 M5.4,-66.6 C4,-52 3.2,-40 4,-28 L5.6,12", coatHi, 0.8, 0.9) +
    // Lapels folded back at the chest.
    shape("M-5.4,-66.6 L-9.6,-66.8 L-7.2,-54 L-4.6,-56.4 Z", coatHi, 0.6) +
    shape("M5.4,-66.6 L9.6,-66.8 L7.2,-54 L4.6,-56.4 Z", coatHi, 0.6) +
    line("M-18.4,-62.6 C-19.6,-52 -19.6,-40 -18.8,-28", coatHi, 0.5, 0.6) +
    line("M-13,-40 L-14,8 M13,-40 L14,8", "#000000", 0.5, 0.4) +
    line("M-17.8,-29.6 L17.8,-29.6", INK, 2.6) +
    line("M-17.8,-29.6 L17.8,-29.6", "#2a2622", 1.8) +
    shape("M-2.2,-31.2 L2.2,-31.2 L2.2,-28 L-2.2,-28 Z", "url(#steel)", 0.6);
  // Wrapped forearms.
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { el, wr } = armJoints(arm, s);
      let out = muscle(lerp(el, wr, 0.2), lerp(el, wr, 0.88), k(LIMB.FOREARM.out, 1.06), k(LIMB.FOREARM.in, 1.04), s, { fill: wrap, hi: 0.2, rim: 0.3, weave: true });
      for (let t = 0.26; t < 0.86; t += 0.09) out += lineAt(lerp(el, wr, t), el, wr, "M-5,-1.1 L5,1.1", "#2e2b24", 0.5, 0.8);
      return out;
    })
    .join("");
  return { under, legs, torso, arms, glow: "" };
}

// ── Breacher: built to go through the door first ───────────────────────────

function breacher(P, c) {
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      return (
        // Reinforced knee cap over the pad.
        plateAt(S(leg, 0.06), leg.kn, leg.an, "M0,-6.4 C4.2,-6.4 6.2,-4 6.2,-0.6 C6.2,3 3.8,5.6 0,6.4 C-3.8,5.6 -6.2,3 -6.2,-0.6 C-6.2,-4 -4.2,-6.4 0,-6.4 Z", STEEL, 1.1) +
        lineAt(S(leg, 0.06), leg.kn, leg.an, "M-4.6,-2.4 C-2,-4.4 2,-4.4 4.6,-2.4 M0,-6 L0,5.8", INK, 0.5, 0.5) +
        // Heavy boots up the shin, with a toe cap.
        muscle(S(leg, 0.52), S(leg, 1.02), [[0, 5.2], [1, 5.4]], [[0, 5], [1, 5.2]], s, { fill: STEEL_DK, hi: 0.35, rim: 0.5 }) +
        lineAt(S(leg, 0.6), leg.kn, leg.an, "M-5,0 L5,0 M-5.1,3 L5.1,3 M-5.2,6 L5.2,6", "#05070a", 0.9, 0.85) +
        plateAt(leg.an, leg.kn, leg.an, `M${f(s * 1.2 - 5)},3.4 L${f(s * 1.2 + 5)},3.4 L${f(s * 1.2 + 6.2)},6.4 L${f(s * 1.2 - 6.2)},6.4 Z`, STEEL, 0.6)
      );
    })
    .join("");
  // Ballistic chest plate with a heavy collar; a belt of grenades.
  const torso =
    shape("M-12.6,-72 L12.6,-72 L16.4,-64.2 L-16.4,-64.2 Z", STEEL_DK, 1) +
    line("M-11.6,-70.8 L11.6,-70.8", "#eaf4ff", 0.5, 0.5) +
    shape("M-14.8,-64.4 C-6,-66 6,-66 14.8,-64.4 L15.6,-44 C14.6,-41.4 12.6,-40.4 10.4,-40.2 L-10.4,-40.2 C-12.6,-40.4 -14.6,-41.4 -15.6,-44 Z", STEEL, 1.1) +
    shape("M-11.6,-61 C-5,-62.2 5,-62.2 11.6,-61 L12,-46 C6,-44.8 -6,-44.8 -12,-46 Z", STEEL_DK, 0.7) +
    line("M-13.6,-62.4 C-8,-63.8 -3,-64 0,-64", "#f4faff", 0.7, 0.6) +
    `<g fill="#0c1013">${[-13.2, 13.2].flatMap((x) => [-60, -52, -45].map((y) => `<circle cx="${x}" cy="${y}" r=".7"/>`)).join("")}</g>` +
    `<circle cx="0" cy="-54" r="3.2" fill="#070c12" stroke="${INK}" stroke-width=".6"/><circle cx="0" cy="-54" r="1.7" fill="#0b7c90"/>` +
    [-12.4, -7.6, 7.6, 12.4].map((x) => `<ellipse cx="${x}" cy="-31.6" rx="2" ry="2.5" fill="#3d4436" stroke="${INK}" stroke-width=".7"/>` + line(`M${f(x - 1.2)},-33.4 L${f(x + 1.2)},-33.4`, "#7a8266", 0.5, 0.9) + `<rect x="${f(x - 0.7)}" y="-35.2" width="1.4" height="1.4" fill="#22262a" stroke="${INK}" stroke-width=".35"/>`).join("");
  // Riot vambrace on the off-hand: a broad plate down the forearm.
  const arms = P.arms
    .map((arm, i) => {
      if (i === 0) return "";
      const { el, wr } = armJoints(arm, 1);
      return (
        plateAt(lerp(el, wr, 0.52), el, wr, "M-6.6,-10 L6.6,-10 L7.2,8.6 L-7.2,8.6 Z", STEEL, 1.1) +
        lineAt(lerp(el, wr, 0.52), el, wr, "M0,-9.4 L0,8 M-6,-8.6 L6,-8.6", INK, 0.5, 0.5) +
        lineAt(lerp(el, wr, 0.52), el, wr, "M-5.6,-8.4 L-5.8,7.4", "#f4faff", 0.6, 0.55)
      );
    })
    .join("");
  return { under: "", legs, torso, arms, glow: "" };
}

// ── Helmet painters ────────────────────────────────────────────────────────

/**
 * A closed helmet: the shell, a brow seam, the visor pick drawn down with
 * the jaw plated under it, ear cups. `fins` go behind the shell, `crown`
 * before the brow seam, `detail(c, w)` over the jaw; `jaw` is the jaw plate.
 */
function closedHelm(path, opts = {}) {
  const { ears = true, jaw = JAW, crown = "", fins = () => "", detail = () => "" } = opts;
  return (c, K, { half: w }) => {
    const s = K.helmetShell(c, { path, half: w, ears });
    const visor = K.closedVisor(c);
    let details = line(`M${f(-w + 0.3)},-86 C-6,-88.4 6,-88.4 ${f(w - 0.3)},-86`, INK, 0.6, 0.7);
    if (visor.jaw) {
      details +=
        line(`M${f(-w + 0.4)},-78 C-8.8,-75 -7.6,-72.6 -5.2,-70.6`, INK, 0.5, 0.6) +
        line(`M${f(w - 0.4)},-78 C8.8,-75 7.6,-72.6 5.2,-70.6`, INK, 0.5, 0.6) +
        shape(jaw, "url(#steelDk)", 0.6) +
        line("M-2.2,-74 L2.2,-74 M-2.4,-72.5 L2.4,-72.5 M-2,-71 L2,-71", "#020306", 0.55, 0.9);
    }
    return {
      front: fins(c) + s.shell + s.dome + crown + details + detail(c, w) + s.ears + visor.body,
      glow: s.earGlow + visor.glow + (visor.eyeGlints ? K.eyeGlow(c, 0.9, true) : ""),
    };
  };
}

/**
 * An open helmet: the face and hair under a lined shell, the visor pick
 * flipped up onto the brow at `visorY`, `extra(c, K)` over the shell.
 */
function openHelm(path, visorY, extra) {
  return (c, K, { half: w }) => {
    const s = K.helmetShell(c, { path, half: w });
    const liner = `<path d="M${f(-w + 1.2)},-86 C${f(-w + 1.2)},-92 -5,-94.4 0,-94.4 C5,-94.4 ${f(w - 1.2)},-92 ${f(w - 1.2)},-86 L${f(w - 1.6)},-70 L${f(-w + 1.6)},-70 Z" fill="#070a10"/>`;
    const visorUp = K.raisedVisor(c, visorY);
    // Eyes and face items on the face, under the hair and the shell, so the
    // cheek guards close over them.
    const acc = K.faceAccessories();
    return {
      front: K.hairBack(c) + liner + K.face(c) + acc.front + K.hair(c, true) + s.shell + s.dome + extra(c, K) + s.ears + visorUp.body,
      glow: s.earGlow + visorUp.glow + K.eyeGlow(c, 0.35) + acc.glow,
    };
  };
}


/**
 * Reaper: a knit balaclava with a painted skull, the agent's own eyes looking
 * out of the sockets, a comms headset and a field scarf bunched at the neck.
 */
function reaper(c, K) {
  const knit = "#141513";
  const bone = "#cfc8b6";
  const boneLo = "#8f8776";
  const hood =
    "M0,-95.6 C6.9,-95.6 10.1,-90.8 10.1,-84 C10.1,-78 9.4,-72.6 7,-68.6 L8.4,-64.8 L-8.4,-64.8 L-7,-68.6 " +
    "C-9.4,-72.6 -10.1,-78 -10.1,-84 C-10.1,-90.8 -6.9,-95.6 0,-95.6 Z";
  // Gaunt, angular skull: sharp temples, a brow that cuts down toward the
  // nose (a scowl), hollow cheeks, a long grimace from cheek to cheek.
  const cranium =
    "M-7,-85.6 C-7.2,-90.6 -4.2,-93.6 0,-93.6 C4.2,-93.6 7.2,-90.6 7,-85.6 L6.4,-81.6 C5.2,-82.6 3.4,-83.4 1.2,-82 " +
    "L0,-80.6 L-1.2,-82 C-3.4,-83.4 -5.2,-82.6 -6.4,-81.6 Z";
  const jaw =
    "M-6.2,-81 L-6.8,-77.6 L-5.4,-74.8 L-4,-72.4 L-2.6,-69.8 L2.6,-69.8 L4,-72.4 L5.4,-74.8 L6.8,-77.6 L6.2,-81 " +
    "C5,-79.8 3.6,-79.2 2.4,-79 L-2.4,-79 C-3.6,-79.2 -5,-79.8 -6.2,-81 Z";
  // Sockets slant down toward the nose; the top edge is the scowl.
  const socket = "M-6.2,-84.6 C-4.6,-84.4 -2.6,-83.4 -1.1,-81.8 C-1.2,-80.2 -2.4,-79.2 -3.8,-79.2 C-5.6,-79.4 -6.6,-81.4 -6.2,-84.6 Z";
  // Eyes behind the mask: black eye paint, only a cold glint shows.
  const eye = (x) =>
    `<ellipse cx="${x}" cy="-81.4" rx="1.05" ry=".42" fill="#2a2620" opacity=".9"/>` +
    `<circle cx="${x}" cy="-81.4" r=".42" fill="${K.mix(c.eyes, "#000000", 0.35)}"/><circle cx="${x}" cy="-81.4" r=".2" fill="#020202"/>` +
    `<circle cx="${f(x - 0.16)}" cy="-81.6" r=".11" fill="#fff"/>`;
  let teeth = "";
  // A long grimace: narrow teeth across the whole jaw, dark gaps between.
  for (let i = -4; i <= 4; i++) {
    const x = i * 0.78;
    const h = 1.9 - Math.abs(i) * 0.14;
    const y = -75.6 + Math.abs(i) * Math.abs(i) * 0.05;
    teeth +=
      `<rect x="${f(x - 0.3)}" y="${f(y)}" width=".6" height="${f(h)}" rx=".22" fill="${bone}"/>` +
      `<rect x="${f(x - 0.28)}" y="${f(y + h + 0.35)}" width=".56" height="${f(h * 0.85)}" rx=".22" fill="${boneLo}"/>`;
  }
  const mouth = "M-3.9,-75.8 C-2,-76.4 2,-76.4 3.9,-75.8 L3.4,-72.2 C1.6,-71.4 -1.6,-71.4 -3.4,-72.2 Z";
  const scarf =
    "M-9.8,-70.2 C-6,-67 6,-67 9.8,-70.2 C11.6,-68.4 12.8,-66.4 12.6,-64.6 C10.4,-63.4 8.6,-63.6 7,-62.4 " +
    "C4.6,-61 2.4,-62.2 0,-61 C-2.4,-62.2 -4.6,-61 -7,-62.4 C-8.6,-63.6 -10.4,-63.4 -12.6,-64.6 C-12.8,-66.4 -11.6,-68.4 -9.8,-70.2 Z";
  const front =
    shape(hood, knit, 1) +
    `<path d="${hood}" fill="url(#weave)" opacity=".6"/>` +
    `<ellipse cx="-4.4" cy="-90.6" rx="4" ry="2.4" fill="#fff" opacity=".05"/>` +
    // The print, worn into the knit.
    `<path d="${cranium}" fill="${bone}"/>` +
    `<path d="${jaw}" fill="${bone}"/>` +
    `<path d="M-6.6,-85.6 C-6.4,-89.8 -3.6,-92.4 0,-92.8" fill="none" stroke="#fff" stroke-width=".55" stroke-opacity=".35"/>` +
    // Temple and cheek hollows.
    `<path d="M6.8,-87.6 C6.2,-85.6 5.8,-84.4 5.2,-83.6 L6.6,-82.4 Z" fill="#141513" opacity=".55"/>` +
    `<path d="M-6.8,-87.6 C-6.2,-85.6 -5.8,-84.4 -5.2,-83.6 L-6.6,-82.4 Z" fill="#141513" opacity=".55"/>` +
    `<path d="M-6.4,-79.6 C-5.6,-78.4 -4.6,-77.4 -3.4,-76.8 L-5.2,-75.4 C-5.8,-76.6 -6.4,-78 -6.4,-79.6 Z" fill="#141513" opacity=".7"/>` +
    `<path d="M6.4,-79.6 C5.6,-78.4 4.6,-77.4 3.4,-76.8 L5.2,-75.4 C5.8,-76.6 6.4,-78 6.4,-79.6 Z" fill="#141513" opacity=".7"/>` +
    `<path d="${socket}" fill="#070707"/><path d="${mirror(socket)}" fill="#070707"/>` +
    eye(-3.4) +
    eye(3.4) +
    // Grime running down from the sockets.
    line("M-4.6,-79.2 C-4.8,-77.6 -4.6,-76.6 -4.9,-75.6 M-3.2,-79.2 L-3.3,-77.8 M4.4,-79.2 C4.6,-77.8 4.4,-77 4.6,-76.2", "#3a352a", 0.45, 0.55) +
    `<path d="M-0.75,-79.2 L0,-81 L0.75,-79.2 L0.45,-77 L-0.45,-77 Z" fill="#070707"/>` +
    `<path d="${mouth}" fill="#070707"/>` +
    teeth +
    `<g opacity=".25"><path d="${cranium}" fill="url(#weave)"/><path d="${jaw}" fill="url(#weave)"/></g>` +
    `<g fill="#2e2a22" opacity=".3"><ellipse cx="4.8" cy="-89.4" rx="1.6" ry=".8"/><ellipse cx="-5.4" cy="-73.6" rx="1.1" ry=".6"/><ellipse cx="1.4" cy="-92" rx=".9" ry=".45"/></g>` +
    // Comms headset.
    line("M-9.6,-85 C-9.8,-95 9.8,-95 9.6,-85", INK, 1.8, 1) +
    line("M-9.6,-85 C-9.8,-95 9.8,-95 9.6,-85", "#25282a", 1.1, 1) +
    shape("M-12,-84.6 C-12,-86.2 -10.8,-86.8 -9.6,-86.8 L-8.8,-86.8 L-8.8,-76.6 L-9.6,-76.6 C-10.8,-76.6 -12,-77.2 -12,-78.8 Z", "#202326", 0.8) +
    shape("M12,-84.6 C12,-86.2 10.8,-86.8 9.6,-86.8 L8.8,-86.8 L8.8,-76.6 L9.6,-76.6 C10.8,-76.6 12,-77.2 12,-78.8 Z", "#202326", 0.8) +
    line("M-11.4,-85 L-11.4,-78.4 M11.4,-85 L11.4,-78.4", "#3a3f44", 0.5, 0.8) +
    line("M-9.2,-79.6 C-8.6,-76.6 -7.4,-74.8 -5,-74.2", INK, 1, 1) +
    line("M-9.2,-79.6 C-8.6,-76.6 -7.4,-74.8 -5,-74.2", "#30353a", 0.55, 1) +
    `<ellipse cx="-4.8" cy="-74.2" rx=".8" ry=".65" fill="#111" stroke="${INK}" stroke-width=".35"/>` +
    // Field scarf, drab and worn.
    shape(scarf, "#34392a", 1) +
    `<path d="${scarf}" fill="url(#weave)"/>` +
    line("M-8.8,-67.8 C-5,-65 5,-65 8.8,-67.8 M-10.6,-66 C-7.4,-63.8 -4,-64.4 -1.6,-63 M10.6,-66 C7.4,-63.8 4,-64.4 1.6,-63", "#1c1f16", 0.6, 0.8) +
    line("M-10.4,-69.4 C-6,-66.2 -2,-65.6 1,-65.6", "#5c624a", 0.5, 0.55);
  return { front, glow: K.eyeGlow(c, 0.12) };
}

/** Do-rag: a tied head wrap over the skull, the face bare. */
function bandana(c, K) {
  const cloth = "#2c3036";
  const wrap =
    "M-7.8,-84.4 C-8.2,-91.2 -4.6,-94.6 0,-94.6 C4.6,-94.6 8.2,-91.2 7.8,-84.4 C6.6,-86.8 4,-87.8 0,-87.9 C-4,-87.8 -6.6,-86.8 -7.8,-84.4 Z";
  const knot = "M7.2,-89.6 C9.6,-90.6 11,-89.4 10.4,-87.6 C9.8,-86.4 8.4,-86.6 7.6,-87.4 Z";
  const tails = "M9.6,-87.6 C11.4,-85 12.4,-81 12,-77.4 L10.6,-77.8 C10.8,-81 10.2,-84.4 8.8,-86.8 Z M10.2,-88 C12.6,-86.8 14.2,-84 14.4,-81.2 L13.2,-81 C12.8,-83.4 11.6,-85.6 9.6,-86.8 Z";
  let dots = "";
  for (let i = 0; i < 16; i++) {
    const x = -6.4 + (i % 8) * 1.8 + (i > 7 ? 0.9 : 0);
    const y = i > 7 ? -89.6 : -92.2;
    dots += `<circle cx="${f(x)}" cy="${f(y + Math.abs(x) * 0.08)}" r=".32" fill="#5a6068"/>`;
  }
  return {
    front:
      K.face(c) +
      shape(tails, cloth, 0.7) +
      shape(wrap, cloth, 0.8) +
      `<path d="${wrap}" fill="url(#weave)" opacity=".5"/>` +
      dots +
      line("M-6.8,-86.6 C-3.6,-88.6 3.6,-88.6 6.8,-86.6", "#4a5058", 0.5, 0.8) +
      line("M-6,-91 C-3.6,-93 0,-93.4 2.6,-93", "#ffffff", 0.5, 0.18) +
      shape(knot, cloth, 0.7),
    glow: K.eyeGlow(c, 0.3),
  };
}

/** Pilot: a sealed shell with a dark face plate and three round optics, glazed per the visor pick. */
function pilot(c, K, { half }) {
  const plate = "M-9.6,-87.2 C-4.6,-88.8 4.6,-88.8 9.6,-87.2 L9.4,-77.8 C8,-74 5,-71.6 0,-70.8 C-5,-71.6 -8,-74 -9.4,-77.8 Z";
  const lenses = [[0, -82.6, 2.5], [-5, -83.2, 1.9], [5, -83.2, 1.9]];
  const optics = K.visorLenses(c, lenses);
  const ring = lenses.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${f(r + 0.7)}" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/><circle cx="${x}" cy="${y}" r="${r}" fill="${optics.glass}" stroke="${INK}" stroke-width=".35"/>`).join("");
  return {
    front:
      K.helmetShell(c, { path: SHELLS.standard, half, ears: false }).shell +
      `<ellipse cx="-5.2" cy="-89.6" rx="4.4" ry="2.8" fill="url(#sheen)"/>` +
      shape("M-2,-94.8 C-1.2,-95.4 1.2,-95.4 2,-94.8 L1.5,-88.6 L-1.5,-88.6 Z", "url(#steelDk)", 0.5) +
      shape(plate, "#0c0f13", 0.8) +
      ring +
      optics.glint +
      line("M-2.6,-75.4 L2.6,-75.4 M-3,-73.8 L3,-73.8", "#2a3038", 0.6, 1) +
      line("M-1.2,-84.2 C-0.6,-84.8 0.4,-84.9 1,-84.6", "#ffffff", 0.45, 0.8) +
      `<circle cx="-11" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/><circle cx="11" cy="-80.6" r="2.3" fill="url(#steelDk)" stroke="${INK}" stroke-width=".6"/>`,
    glow: optics.glow,
  };
}
