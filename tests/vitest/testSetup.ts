import { webcrypto } from "node:crypto";
import { vi, vitest } from "vitest";
import "./matchers";

vitest.mock("@/logging");

// Necessary for @oslo/password to run in tests
// We can remove this after we upgrade from node 18
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

process.env.ORIGIN = "globalbibletools.com";
process.env.LOG_LEVEL = "silent";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache:
      typeof actual.cache === "function" ?
        actual.cache
      : <T extends (...args: any[]) => any>(fn: T) => fn,
  };
});
