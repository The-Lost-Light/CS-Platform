import { defineConfig } from "void/config";

export default defineConfig({
  target: "cloudflare",
  head: {
    title: "Course Assignment Platform",
    meta: [
      {
        name: "description",
        content:
          "Course Assignment Platform - A course assignment and architecture visualization platform.",
      },
    ],
    link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    htmlAttrs: { lang: "en" },
    bodyAttrs: {
      class:
        "bg-canvas text-on-surface antialiased selection:bg-secondary selection:text-on-secondary",
    },
  },
  cloudflare: {
    name: "cap",
  },
});
