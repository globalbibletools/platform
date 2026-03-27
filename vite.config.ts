import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    rollupOptions: {
      external: ["@google-cloud/translate"],
    },
  },
  environments: {
    client: {
      build: {
        rollupOptions: {
          plugins: [
            visualizer({
              filename: ".output/stats/client.html",
              gzipSize: true,
            }),
          ],
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          plugins: [
            visualizer({
              filename: ".output/stats/ssr.html",
              gzipSize: true,
            }),
          ],
        },
      },
    },
    nitro: {
      build: {
        rollupOptions: {
          plugins: [
            visualizer({
              filename: ".output/stats/server.html",
              gzipSize: true,
            }),
          ],
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projectDiscovery: "lazy" }),
    tanstackStart({
      router: {
        semicolons: true,
        quoteStyle: "double",
      },
    }),
    nitro({
      compressPublicAssets: true,
    }),
    viteReact(),
    {
      name: "show-config",
      configResolved(config) {
        console.log("Resolved Vite Config:", config);
        // You might want to stringify for better readability
        // console.log("Resolved Vite Config:", JSON.stringify(config, null, 2));
      },
    },
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit (server)",
          environment: "node",
          include: ["**/*.unit.ts"],
          exclude: [...configDefaults.exclude, "**/*.client.unit.ts"],
          setupFiles: ["./tests/vitest/testSetup.ts"],
          mockReset: true,
        },
      },
      {
        extends: true,
        test: {
          name: "unit (client)",
          environment: "jsdom",
          include: ["**/*.client.unit.{ts,tsx}"],
          setupFiles: ["./tests/vitest/testSetup.ts"],
          globalSetup: ["./tests/vitest/tzSetup.ts"],
          mockReset: true,
        },
      },
      {
        extends: true,
        test: {
          name: "integration (server)",
          environment: "node",
          include: ["**/*.test.ts"],
          setupFiles: ["./tests/vitest/testSetup.ts"],
          globalSetup: ["./tests/vitest/dbSetup.ts"],
          mockReset: true,
        },
      },
    ],
  },
});
