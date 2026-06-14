import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
    watch: {
      ignored: ["**/bindings/**", "**/.bindings-tmp-*"],
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      "$lib": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
  },
  esbuild: {
    target: "esnext",
  },
});
