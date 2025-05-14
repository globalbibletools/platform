import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import trackingClient, { BulkEvent } from "./trackingClient";
import { ulid } from "@/shared/ulid";
import { DbTrackingEvent } from "../data-access/types";
import { query } from "@/db";

initializeDatabase();

describe("trackEvent", () => {
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
});

describe("trackManyEvents", () => {
  test("saves new events in the database", async () => {
    const fullEvent: BulkEvent = {
      type: "one",
      userId: ulid(),
      languageId: ulid(),
      otherData: true,
    };
    const eventWithIds: BulkEvent = {
      type: "two",
      userId: ulid(),
      languageId: ulid(),
    };
    const eventWithData: BulkEvent = {
      type: "three",
      otherData: true,
    };
    const simpleEvent: BulkEvent = {
      type: "four",
    };
    await trackingClient.trackManyEvents([
      fullEvent,
      eventWithIds,
      eventWithData,
      simpleEvent,
    ]);

    const events = await findTrackingEvents();
    expect(events).toEqual([
      {
        id: expect.toBeUlid(),
        type: fullEvent.type,
        data: { otherData: true },
        userId: fullEvent.userId,
        languageId: fullEvent.languageId,
        createdAt: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: eventWithIds.type,
        data: {},
        userId: eventWithIds.userId,
        languageId: eventWithIds.languageId,
        createdAt: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: eventWithData.type,
        data: { otherData: true },
        userId: null,
        languageId: null,
        createdAt: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: simpleEvent.type,
        data: {},
        userId: null,
        languageId: null,
        createdAt: expect.toBeNow(),
      },
    ]);
  });
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
