import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["**/*.unit.ts?(x)"],
    globalSetup: ["./tests/dbSetup.ts"],
  },
});
