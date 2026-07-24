// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

function requirePublicCloudBuildEnvironment(): Plugin {
  return {
    name: "no-more-copium-require-public-cloud-build-environment",
    config(_, environment) {
      if (environment.command !== "build") return;
      const loaded = loadEnv(environment.mode, process.cwd(), "");
      const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
      const missing = required.filter((name) => !(process.env[name] || loaded[name]));
      if (missing.length > 0) {
        throw new Error(
          `Missing build-time Lovable Cloud variable(s): ${missing.join(
            ", ",
          )}. Reconnect Lovable Cloud or regenerate the ignored local environment before building.`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [requirePublicCloudBuildEnvironment()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
