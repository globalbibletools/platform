import { vi, vitest, afterEach } from "vitest";
import "./matchers";
import { cleanup } from "@testing-library/react";

vitest.mock("@/logging");

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

afterEach(cleanup);
