import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, "share-src"),
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "Word-Caster-分享版"),
    emptyOutDir: true,
    assetsDir: "assets",
    modulePreload: { polyfill: false },
    target: "es2020",
    minify: "esbuild",
  },
});
