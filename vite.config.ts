import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
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
    viteReact(),
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
          include: ["**/*.client.unit.ts"],
          setupFiles: ["./tests/vitest/testSetup.ts"],
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
