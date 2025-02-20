import { randomBytes } from "crypto";

export interface ULID {
  (seedTime?: number): string;
}

export class UlidError extends Error {}

export function decodeTime(id: string): Date {
  const cleaned = id.replaceAll("-", "");
  const timestamp = cleaned.slice(0, 12);
  const parsed = parseInt(timestamp, 16);
  if (cleaned.length !== 32 || isNaN(parsed)) {
    throw new UlidError("malformed ulid");
  }

  return new Date(parsed);
}

function format(ulid: string): string {
  return `${ulid.slice(0, 8)}-${ulid.slice(8, 12)}-${ulid.slice(12, 16)}-${ulid.slice(16, 20)}-${ulid.slice(20, 32)}`.toLowerCase();
}

export function ulid(seedTime: number = Date.now()): string {
  const timestamp = seedTime.toString(16).padStart(12, "0");
  const random = randomBytes(10).toString("hex");
  return format(timestamp + random);
}
