import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  staged: { "*": "vp check --fix" },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.tsx"],
  },
  plugins: lazyPlugins(() => [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()]),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@auth": path.resolve(import.meta.dirname, "./src/auth"),
      "@data": path.resolve(import.meta.dirname, "./src/data"),
      "@domain": path.resolve(import.meta.dirname, "./src/domain"),
      "@hooks": path.resolve(import.meta.dirname, "./src/hooks"),
      "@i18n": path.resolve(import.meta.dirname, "./src/i18n"),
      "@pages": path.resolve(import.meta.dirname, "./src/pages"),
      "@services": path.resolve(import.meta.dirname, "./src/services"),
      "@theme": path.resolve(import.meta.dirname, "./src/theme"),
    },
  },
  server: { open: true },
});
