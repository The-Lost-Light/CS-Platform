import { defineConfig } from "void/config";

export default defineConfig({
  target: "cloudflare",
  inference: {
    appType: "spa",
    build: "pnpm build",
    outputDir: "dist",
  },
  cloudflare: {
    name: "cap",
  },
});
