import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test } from "vitest";
import trackingClient from "./trackingClient";
import { ulid } from "@/shared/ulid";
import { DbTrackingEvent } from "../data-access/types";
import { query } from "@/db";

initializeDatabase();

test("saves new event with data and IDs in the database", async () => {
  const userId = ulid();
  const languageId = ulid();
  await trackingClient.trackEvent("test", {
    otherData: true,
    userId,
    languageId,
  });

  const events = await findTrackingEvents();
  expect(events).toEqual([
    {
      id: expect.toBeUlid(),
      type: "test",
      data: { otherData: true },
      userId,
      languageId,
      createdAt: expect.toBeNow(),
    },
  ]);
});

test("saves new event with no data in the database", async () => {
  const userId = ulid();
  const languageId = ulid();
  await trackingClient.trackEvent("test", {
    userId,
    languageId,
  });

  const events = await findTrackingEvents();
  expect(events).toEqual([
    {
      id: expect.toBeUlid(),
      type: "test",
      data: {},
      userId,
      languageId,
      createdAt: expect.toBeNow(),
    },
  ]);
});

test("saves new event with no user or language ID in the database", async () => {
  await trackingClient.trackEvent("test", { someData: true });

  const events = await findTrackingEvents();
  expect(events).toEqual([
    {
      id: expect.toBeUlid(),
      type: "test",
      data: { someData: true },
      userId: null,
      languageId: null,
      createdAt: expect.toBeNow(),
    },
  ]);
});

test("saves new event with no extra metadata in the database", async () => {
  await trackingClient.trackEvent("test");

  const events = await findTrackingEvents();
  expect(events).toEqual([
    {
      id: expect.toBeUlid(),
      type: "test",
      data: {},
      userId: null,
      languageId: null,
      createdAt: expect.toBeNow(),
    },
  ]);
});

async function findTrackingEvents(): Promise<DbTrackingEvent[]> {
  const result = await query<DbTrackingEvent>(
    `
      select id, type, data, user_id as "userId", language_id as "languageId", created_at as "createdAt"
      from tracking_event
      order by id
    `,
    [],
  );
  return result.rows;
}
