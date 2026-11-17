import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  server: { port: 5173, open: true },
});
