import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { voidReact } from "@void/react/plugin";
import { defineConfig, lazyPlugins } from "vite-plus";
import { voidPlugin } from "void";

export default defineConfig({
  staged: { "*": "vp check --fix" },
  fmt: { sortImports: true },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.tsx", "src/modules/*/__tests__/*.test.tsx"],
  },
  plugins: lazyPlugins(() => [
    voidPlugin(),
    voidReact(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ]),
  resolve: { tsconfigPaths: true },
  server: { open: true },
});
