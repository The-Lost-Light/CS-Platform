import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";
const require = createRequire(import.meta.url);
const pyodideDir = path.dirname(require.resolve("pyodide/package.json"));
const assetDir = path.resolve("public/pyodide");
mkdirSync(assetDir, { recursive: true });
for (const file of [
  "pyodide.mjs",
  "pyodide.mjs.map",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
]) {
  cpSync(path.join(pyodideDir, file), path.join(assetDir, file));
}

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["pyodide"] },
  css: { postcss: { plugins: [tailwindcss(), autoprefixer()] } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
