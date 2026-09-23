import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tokenDeclarations } from "../../src/ui/design-tokens.js";

// style.css carries a static copy of the basic --cc-* tokens so the title
// screen paints correctly before any module runs. It must match the source.
describe("design tokens", () => {
  const css = readFileSync(fileURLToPath(new URL("../../style.css", import.meta.url)), "utf8");
  const block = css.match(/:root\[data-art-style="modern"\]\s*\{([^}]*)\}/)[1];
  const norm = (v) => v.replace(/\s+/g, " ").trim();
  const decl = tokenDeclarations();

  it("style.css first-paint copy matches design-tokens.js", () => {
    const pairs = [...block.matchAll(/(--cc-[\w-]+)\s*:\s*([^;]+);/g)];
    expect(pairs.length).toBeGreaterThan(5);
    for (const [, name, value] of pairs) {
      expect(decl[name], name).toBeDefined();
      expect(norm(value), name).toBe(norm(decl[name]));
    }
  });

  it("exposes the shared chrome tokens", () => {
    for (const k of ["--cc-panel-menu", "--cc-keycap", "--cc-primary", "--cc-caption-cream", "--cc-chamfer-lg", "--cc-dur-fast", "--cc-ease"]) {
      expect(decl[k], k).toBeTruthy();
    }
  });
});
