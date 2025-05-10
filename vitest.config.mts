import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["**/*.{unit,test}.ts?(x)"],
    globalSetup: ["./tests/vitest/dbSetup.ts"],
    setupFiles: ["./tests/vitest/testSetup.ts"],
    mockReset: true,
  },
  resolve: {
    alias: {
      react: "next/dist/compiled/react/cjs/react.development.js",
    },
  },
});
