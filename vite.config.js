import { defineConfig } from "vite";

const isProd = process.env.NODE_ENV === "production";
const base = process.env.CC_BASE ?? (isProd ? "/clockwork_carnage/" : "/");

export default defineConfig({
  base,
  root: ".",

  server: {
    port: 3000,
    open: false,
  },

  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: !isProd || process.env.CC_SOURCEMAP === "1",
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: "index.html",
      output: {
        // Split heavy modules out of the boot bundle. Each chunk caches
        // independently — editing a chunk module doesn't invalidate the
        // main bundle for returning visitors.
        manualChunks(id) {
          if (id.includes("/src/rendering/enemies/") && !id.endsWith("/index.js")) {
            return "enemy-renderers";
          }
          return undefined;
        },
      },
    },
  },

  resolve: {
    extensions: [".js"],
  },

  test: {
    include: ["tests/unit/**/*.test.js", "tests/unit/**/*.spec.js"],
    environment: "node",
    // Whole-world sweeps (terrain generation, meshing, save round trips) take
    // a second or two on a laptop and can pass 5 s on a shared 2-core runner.
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/systems/**", "src/utils/**", "src/core/**"],
      reporter: ["text", "text-summary"],
    },
  },
});
