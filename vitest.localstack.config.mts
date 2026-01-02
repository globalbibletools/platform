import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["**/*.localstack.test.ts?(x)"],
    globalSetup: ["./tests/vitest/dbSetup.ts"],
    setupFiles: ["./tests/vitest/testSetup.ts"],
    mockReset: true,
    environmentMatchGlobs: [
      ["**/*.client.test.ts?(x)", "jsdom"],
      ["**/*.react.test.ts?(x)", "jsdom"],
    ],
  },
});
