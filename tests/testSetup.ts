import { webcrypto } from "node:crypto";
import "./matchers";

// Necessary for @oslo/password to run in tests
// We can remove this after we upgrade from node 18
// @ts-ignore
globalThis.crypto = webcrypto;

process.env.ORIGIN = "globalbibletools.com";

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.log(`FAILED TO HANDLE PROMISE REJECTION`);
  throw reason;
});
