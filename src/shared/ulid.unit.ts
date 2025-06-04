import { test, expect } from "vitest";
import { decodeTime, ulid } from "./ulid";

test("ulids for the same millesecond are incremented by one", async () => {
  const now = new Date().valueOf();
  const first = ulid(now);
  const second = ulid(now);

  const firstUnformatted = first.replaceAll("-", "");
  const secondUnformatted = second.replaceAll("-", "");
  expect(BigInt(`0x${secondUnformatted}`)).toEqual(
    BigInt(1) + BigInt(`0x${firstUnformatted}`),
  );
});

test("generates valid ulids", async () => {
  const date = new Date();
  const uuid = ulid(date.valueOf());
  expect(uuid).toHaveLength(36);
  const timestamp = decodeTime(uuid);
  expect(timestamp).toEqual(date);
});
