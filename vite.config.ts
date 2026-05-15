// Cloudflare Pages / Workers deployment.
// @lovable.dev/vite-tanstack-config includes: tanstackStart, viteReact,
// tailwindcss, tsConfigPaths, @cloudflare/vite-plugin (build-only), and
// the @ path alias. Do NOT add those plugins manually.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
