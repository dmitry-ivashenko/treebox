import { defineConfig } from "vite";

export default defineConfig({
  base: "/divashchenko/treebox/",
  esbuild: {
    jsxImportSource: "react",
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/test/setup.ts",
  },
});
