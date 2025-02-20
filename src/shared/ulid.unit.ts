import { test, expect } from "vitest";
import { decodeTime, ulid } from "./ulid";

test("ulids for the same millesecond are not the same", async () => {
  const now = new Date("2025-01-01").valueOf();
  const first = ulid(now);
  const second = ulid(now);
  expect(first).not.toEqual(second);
});

test("generates valid ulids", async () => {
  const date = new Date();
  const uuid = ulid(date.valueOf());
  expect(uuid).toHaveLength(36);
  const timestamp = decodeTime(uuid);
  expect(timestamp).toEqual(date);
});
