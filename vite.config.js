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
          if (id.endsWith("/js/cutscene.js")) return "cutscene";
          if (id.endsWith("/js/builder.js")) return "builder";
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
    exclude: ["tests/unit/layout.test.js"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/systems/**", "src/utils/**", "src/core/**"],
      reporter: ["text", "text-summary"],
    },
  },
});
