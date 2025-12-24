import { webcrypto } from "node:crypto";
import { vi } from "vitest";
import "./matchers";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  const fallbackCache =
    // basic memoizer for tests; avoids relying on Next's experimental cache
    actual.cache ??
    (<Args extends any[], Return>(fn: (...args: Args) => Return) => {
      const map = new Map<string, Return>();
      return (...args: Args) => {
        const key = JSON.stringify(args);
        if (!map.has(key)) {
          map.set(key, fn(...args));
        }
        return map.get(key)!;
      };
    });
  // Ensure classic runtime users can access global React
  (globalThis as any).React = actual;
  return { ...actual, cache: fallbackCache, default: actual as any };
});

// Necessary for @oslo/password to run in tests
// We can remove this after we upgrade from node 18
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

process.env.ORIGIN = "globalbibletools.com";
process.env.LOG_LEVEL = "silent";
