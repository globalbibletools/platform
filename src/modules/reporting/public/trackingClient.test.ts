import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import trackingClient from "./trackingClient";
import { ulid } from "@/shared/ulid";
import { DbTrackingEvent } from "../data-access/types";
import { query } from "@/db";

initializeDatabase();

describe("trackEvent", () => {
  const untypedTrackEvent = trackingClient.trackEvent.bind(
    trackingClient,
  ) as any;

  test("saves new event with data and IDs in the database", async () => {
    const userId = ulid();
    const languageId = ulid();
    await untypedTrackEvent("test", {
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

  test("saves new event with no user or language ID in the database", async () => {
    await untypedTrackEvent("test", { someData: true });

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
    await untypedTrackEvent("test");

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
  const untypedTrackManyEvents = trackingClient.trackManyEvents.bind(
    trackingClient,
  ) as any;

  test("saves new events in the database", async () => {
    const fullEvent = {
      type: "one",
      userId: ulid(),
      languageId: ulid(),
      otherData: true,
    };
    const eventWithIds = {
      type: "two",
      userId: ulid(),
      languageId: ulid(),
    };
    const eventWithData = {
      type: "three",
      otherData: true,
    };
    const simpleEvent = {
      type: "four",
    };
    await untypedTrackManyEvents([
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
