/**
 * One renderer per finish. Colour only — no gradients, filters or ids — so a
 * badge can repeat inside one SVG and survives scopeIds / realizeMarkup.
 * Inputs: frame paths (-50..50), symbol painter (-5..5), enamel colour and a
 * metal ramp [hi, mid, lo, edge]. `detail: "low"` drops fine strokes.
 */
import { FRAME_PATHS } from "./frames.js";
import { symbolMarkup } from "./symbols.js";

const SYM = (id, fg, bg) => `<g transform="scale(6.2)">${symbolMarkup(id, fg, bg)}</g>`;

function insignia({ frame, symbol, enamel, ramp, detail }) {
  const { outer, inner } = FRAME_PATHS[frame];
  const [hi, mid, lo, edge] = ramp;
  const fine = detail === "high"
    ? `<path d="${outer}" fill="none" stroke="${hi}" stroke-width="2" opacity=".55" transform="translate(-1.2,-1.6)"/>` +
      `<path d="${inner}" fill="none" stroke="${lo}" stroke-width="2.4"/>` +
      `<g transform="translate(.8,1.2)" opacity=".45">${SYM(symbol, edge, edge)}</g>` +
      `<ellipse cx="-6" cy="-20" rx="26" ry="12" fill="#ffffff" opacity=".14"/>`
    : "";
  return (
    `<path d="${outer}" fill="${mid}" stroke="${edge}" stroke-width="3"/>` +
    `<path d="${inner}" fill="${enamel}"/>` +
    fine +
    SYM(symbol, detail === "high" ? hi : mid, enamel)
  );
}

function patch({ frame, symbol, enamel, ramp, detail }) {
  const { outer, inner } = FRAME_PATHS[frame];
  const thread = ramp[0];
  const stitch = detail === "high"
    ? `<path d="${inner}" fill="none" stroke="${thread}" stroke-width="1.6" stroke-dasharray="4 3" opacity=".8"/>` +
      `<path d="${outer}" fill="none" stroke="#000000" stroke-width="1" opacity=".35" transform="scale(.93)"/>`
    : "";
  return (
    `<path d="${outer}" fill="#23261c" stroke="#15170f" stroke-width="7"/>` +
    `<path d="${inner}" fill="${enamel}" opacity=".85"/>` +
    stitch +
    SYM(symbol, thread, "#23261c")
  );
}

function holo({ frame, symbol, enamel, ramp, detail }) {
  const { outer, inner } = FRAME_PATHS[frame];
  const light = ramp[0];
  const halo = detail === "high"
    ? `<path d="${outer}" fill="none" stroke="${enamel}" stroke-width="7" opacity=".35"/>` +
      `<g opacity=".35" transform="scale(1.06)">${SYM(symbol, enamel, "#05080c")}</g>` +
      `<path d="${inner}" fill="none" stroke="${light}" stroke-width=".8" stroke-dasharray="1 5" opacity=".6"/>`
    : "";
  return (
    `<path d="${outer}" fill="#05080c" opacity=".85"/>` +
    halo +
    `<path d="${outer}" fill="none" stroke="${light}" stroke-width="2.4"/>` +
    SYM(symbol, light, "#05080c")
  );
}

function stencil({ frame, symbol, enamel, ramp, detail }) {
  const { outer } = FRAME_PATHS[frame];
  const paint = ramp[1];
  const spray = detail === "high"
    ? `<path d="${outer}" fill="none" stroke="${paint}" stroke-width="5" opacity=".18" transform="scale(1.04)"/>`
    : "";
  return (
    spray +
    `<path d="${outer}" fill="none" stroke="${paint}" stroke-width="4" stroke-dasharray="22 5"/>` +
    `<g opacity=".92">${SYM(symbol, paint, enamel)}</g>`
  );
}

const FINISH = { insignia, patch, holo, stencil };

export function renderFinish(finishId, args) {
  return (FINISH[finishId] || insignia)(args);
}
