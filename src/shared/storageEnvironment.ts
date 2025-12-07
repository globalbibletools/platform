export type StorageEnvironment = "prod" | "local";

export function getStorageEnvironment(): StorageEnvironment {
  return process.env.NODE_ENV === "production" ? "prod" : "local";
}
