/** Frame outline (`outer`) and enamel field (`inner`) in a -50..50 box. */
const f = (n) => Math.round(n * 100) / 100;

const circle = (r) => `M${-r},0 A${r},${r} 0 1 0 ${r},0 A${r},${r} 0 1 0 ${-r},0 Z`;
const polygon = (n, r, rot = 0) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * r)},${f(Math.sin(a) * r)} `;
  }
  return d + "Z";
};
const cog = (r, teeth, depth) => {
  let d = "";
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i * 2 * Math.PI) / steps - Math.PI / 2;
    const rr = i % 4 < 2 ? r : r - depth;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * rr)},${f(Math.sin(a) * rr)} `;
  }
  return d + "Z";
};
const shield = (s) => `M0,${f(-46 * s)} L${f(40 * s)},${f(-32 * s)} L${f(40 * s)},${f(-2 * s)} C${f(40 * s)},${f(24 * s)} ${f(22 * s)},${f(40 * s)} 0,${f(48 * s)} C${f(-22 * s)},${f(40 * s)} ${f(-40 * s)},${f(24 * s)} ${f(-40 * s)},${f(-2 * s)} L${f(-40 * s)},${f(-32 * s)} Z`;
const chevron = (s) => `M${f(-44 * s)},${f(-30 * s)} L0,${f(-12 * s)} L${f(44 * s)},${f(-30 * s)} L${f(44 * s)},${f(16 * s)} L0,${f(40 * s)} L${f(-44 * s)},${f(16 * s)} Z`;
const tag = (s) => `M${f(-46 * s)},${f(-26 * s)} Q${f(-46 * s)},${f(-34 * s)} ${f(-38 * s)},${f(-34 * s)} L${f(38 * s)},${f(-34 * s)} Q${f(46 * s)},${f(-34 * s)} ${f(46 * s)},${f(-26 * s)} L${f(46 * s)},${f(26 * s)} Q${f(46 * s)},${f(34 * s)} ${f(38 * s)},${f(34 * s)} L${f(-38 * s)},${f(34 * s)} Q${f(-46 * s)},${f(34 * s)} ${f(-46 * s)},${f(26 * s)} Z`;

export const FRAME_PATHS = {
  disc: { outer: circle(46), inner: circle(36) },
  shield: { outer: shield(1), inner: shield(0.78) },
  hex: { outer: polygon(6, 47, -Math.PI / 2), inner: polygon(6, 37, -Math.PI / 2) },
  chevron: { outer: chevron(1), inner: chevron(0.78) },
  tag: { outer: tag(1), inner: tag(0.8) },
  cog: { outer: cog(48, 12, 6), inner: circle(33) },
};
