import { webcrypto } from "node:crypto";

// Necessary for @oslo/password to run in tests
// We can remove this after we upgrade from node 18
// @ts-ignore
globalThis.crypto = webcrypto;
