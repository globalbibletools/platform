import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import trackingEventRepository from "./trackingEventRepository";
import { ulid } from "@/shared/ulid";
import { getDb, unitOfWork } from "@/db";

initializeDatabase();

describe("trackOne", () => {
  test("saves new event with data and IDs in the database", async () => {
    const userId = ulid();
    const languageId = ulid();
    await trackingEventRepository.trackOne({
      type: "test",
      otherData: true,
      userId,
      languageId,
    } as any);

    const events = await findTrackingEvents();
    expect(events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "test",
        data: { otherData: true },
        user_id: userId,
        language_id: languageId,
        created_at: expect.toBeNow(),
      },
    ]);
  });

  test("saves new event with no user or language ID in the database", async () => {
    await trackingEventRepository.trackOne({
      type: "test",
      someData: true,
    } as any);

    const events = await findTrackingEvents();
    expect(events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "test",
        data: { someData: true },
        user_id: null,
        language_id: null,
        created_at: expect.toBeNow(),
      },
    ]);
  });

  test("saves new event with no extra metadata in the database", async () => {
    await trackingEventRepository.trackOne({
      type: "test",
    } as any);

    const events = await findTrackingEvents();
    expect(events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "test",
        data: {},
        user_id: null,
        language_id: null,
        created_at: expect.toBeNow(),
      },
    ]);
  });

  test("saves new event within a transaction", async () => {
    const userId = ulid();
    const languageId = ulid();

    await unitOfWork(async (trx) => {
      trackingEventRepository.trackOne(
        {
          type: "test",
          otherData: true,
          userId,
          languageId,
        } as any,
        trx,
      );

      const events = await findTrackingEvents();
      expect(events).toEqual([]);
    });

    const events = await findTrackingEvents();
    expect(events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "test",
        data: { otherData: true },
        user_id: userId,
        language_id: languageId,
        created_at: expect.toBeNow(),
      },
    ]);
  });
});

describe("trackMany", () => {
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
    await trackingEventRepository.trackMany([
      fullEvent,
      eventWithIds,
      eventWithData,
      simpleEvent,
    ] as any);

    const events = await findTrackingEvents();
    expect(events).toEqual([
      {
        id: expect.toBeUlid(),
        type: fullEvent.type,
        data: { otherData: true },
        user_id: fullEvent.userId,
        language_id: fullEvent.languageId,
        created_at: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: eventWithIds.type,
        data: {},
        user_id: eventWithIds.userId,
        language_id: eventWithIds.languageId,
        created_at: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: eventWithData.type,
        data: { otherData: true },
        user_id: null,
        language_id: null,
        created_at: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: simpleEvent.type,
        data: {},
        user_id: null,
        language_id: null,
        created_at: expect.toBeNow(),
      },
    ]);
  });

  test("saves new events in the database within a transaction", async () => {
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

    await unitOfWork(async (trx) => {
      await trackingEventRepository.trackMany(
        [fullEvent, eventWithIds, eventWithData, simpleEvent] as any,
        trx,
      );

      const events = await findTrackingEvents();
      expect(events).toEqual([]);
    });

    const events = await findTrackingEvents();
    expect(events).toEqual([
      {
        id: expect.toBeUlid(),
        type: fullEvent.type,
        data: { otherData: true },
        user_id: fullEvent.userId,
        language_id: fullEvent.languageId,
        created_at: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: eventWithIds.type,
        data: {},
        user_id: eventWithIds.userId,
        language_id: eventWithIds.languageId,
        created_at: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: eventWithData.type,
        data: { otherData: true },
        user_id: null,
        language_id: null,
        created_at: expect.toBeNow(),
      },
      {
        id: expect.toBeUlid(),
        type: simpleEvent.type,
        data: {},
        user_id: null,
        language_id: null,
        created_at: expect.toBeNow(),
      },
    ]);
  });
});

function findTrackingEvents() {
  return getDb()
    .selectFrom("tracking_event")
    .selectAll()
    .orderBy("id")
    .execute();
}
