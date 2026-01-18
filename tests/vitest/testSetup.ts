import { webcrypto } from "node:crypto";
import "./matchers";

// Necessary for @oslo/password to run in tests
// We can remove this after we upgrade from node 18
if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = webcrypto;
}

process.env.ORIGIN = "globalbibletools.com";
process.env.LOG_LEVEL = "silent";
