import { describe, test, expect } from "vitest";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { GlossEventAggregatorTransform } from "./aggregateGlossEvents";
import { GlossStateRaw } from "@/modules/translation/types";

const TEST_DAY = new Date("2026-03-06");

interface RowOverrides {
  language_id?: string;
  user_id?: string;
  timestamp?: Date;
  word_id?: string;
  book_id?: number;
  prev_gloss?: string;
  prev_state?: GlossStateRaw;
  new_gloss?: string;
  new_state?: GlossStateRaw;
}

function makeRow(overrides: RowOverrides = {}) {
  return {
    language_id: "lang-1",
    user_id: "user-1",
    timestamp: new Date("2026-03-06T10:00:00Z"),
    word_id: "word-1",
    book_id: 1,
    prev_gloss: "",
    prev_state: GlossStateRaw.Unapproved,
    new_gloss: "hello",
    new_state: GlossStateRaw.Unapproved,
    ...overrides,
  };
}

async function runTransform(rows: ReturnType<typeof makeRow>[]) {
  const transform = new GlossEventAggregatorTransform(TEST_DAY);
  await pipeline(Readable.from(rows), transform);
  return transform.getRows();
}

describe("GlossEventAggregatorTransform", () => {
  test("empty stream produces empty tallies", async () => {
    const rows = await runTransform([]);
    expect(rows).toEqual([]);
  });

  test("no state or gloss change produces no tally entry", async () => {
    const rows = await runTransform([
      makeRow({
        prev_state: GlossStateRaw.Unapproved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Unapproved,
        new_gloss: "hello",
      }),
    ]);

    expect(rows).toEqual([]);
  });

  test("UNAPPROVED to APPROVED produces approved_count", async () => {
    const rows = await runTransform([
      makeRow({
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("APPROVED to UNAPPROVED produces revoked_count", async () => {
    const rows = await runTransform([
      makeRow({
        prev_state: GlossStateRaw.Approved,
        new_state: GlossStateRaw.Unapproved,
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        approved_count: 0,
        revoked_count: 1,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("gloss change while APPROVED produces edited_approved_count", async () => {
    const rows = await runTransform([
      makeRow({
        prev_state: GlossStateRaw.Approved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Approved,
        new_gloss: "hi",
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        approved_count: 0,
        revoked_count: 0,
        edited_approved_count: 1,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("gloss change while UNAPPROVED produces edited_unapproved_count", async () => {
    const rows = await runTransform([
      makeRow({
        prev_state: GlossStateRaw.Unapproved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Unapproved,
        new_gloss: "hi",
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        approved_count: 0,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 1,
      },
    ]);
  });

  test("user A approves then user B revokes", async () => {
    const rows = await runTransform([
      makeRow({
        user_id: "user-a",
        timestamp: new Date("2026-03-06T09:00:00Z"),
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
        new_gloss: "hello",
      }),
      makeRow({
        user_id: "user-b",
        timestamp: new Date("2026-03-06T11:00:00Z"),
        prev_state: GlossStateRaw.Approved,
        new_state: GlossStateRaw.Unapproved,
        new_gloss: "hello",
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-a",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-b",
        book_id: 1,
        approved_count: 0,
        revoked_count: 1,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("user A approves then user B edits the approved gloss", async () => {
    const rows = await runTransform([
      makeRow({
        user_id: "user-a",
        timestamp: new Date("2026-03-06T09:00:00Z"),
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
        new_gloss: "hello",
      }),
      makeRow({
        user_id: "user-b",
        timestamp: new Date("2026-03-06T11:00:00Z"),
        prev_state: GlossStateRaw.Approved,
        new_state: GlossStateRaw.Approved,
        new_gloss: "hi",
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-a",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-b",
        book_id: 1,
        approved_count: 0,
        revoked_count: 0,
        edited_approved_count: 1,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("multiple events for the same user are collapsed into one", async () => {
    const rows = await runTransform([
      makeRow({
        user_id: "user-a",
        timestamp: new Date("2026-03-06T09:00:00Z"),
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Unapproved,
        new_gloss: "hello",
      }),
      makeRow({
        user_id: "user-a",
        timestamp: new Date("2026-03-06T09:00:00Z"),
        prev_state: GlossStateRaw.Unapproved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Approved,
        new_gloss: "hello",
      }),
      makeRow({
        user_id: "user-b",
        timestamp: new Date("2026-03-06T11:00:00Z"),
        prev_state: GlossStateRaw.Approved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Approved,
        new_gloss: "hi",
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-a",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-b",
        book_id: 1,
        approved_count: 0,
        revoked_count: 0,
        edited_approved_count: 1,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("interleaved events are collapsed", async () => {
    const rows = await runTransform([
      makeRow({
        user_id: "user-a",
        timestamp: new Date("2026-03-06T06:00:00Z"),
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Unapproved,
        new_gloss: "hello",
      }),
      makeRow({
        user_id: "user-b",
        timestamp: new Date("2026-03-06T8:00:00Z"),
        prev_state: GlossStateRaw.Approved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Approved,
        new_gloss: "hello",
      }),
      makeRow({
        user_id: "user-a",
        timestamp: new Date("2026-03-06T09:00:00Z"),
        prev_state: GlossStateRaw.Approved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Unapproved,
        new_gloss: "hello",
      }),
      makeRow({
        user_id: "user-b",
        timestamp: new Date("2026-03-06T11:00:00Z"),
        prev_state: GlossStateRaw.Unapproved,
        prev_gloss: "hello",
        new_state: GlossStateRaw.Approved,
        new_gloss: "hi",
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-a",
        book_id: 1,
        approved_count: 0,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 1,
      },
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-b",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("multiple words for the same user and language accumulate", async () => {
    const rows = await runTransform([
      makeRow({
        word_id: "word-1",
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        word_id: "word-2",
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        word_id: "word-3",
        prev_state: GlossStateRaw.Approved,
        new_state: GlossStateRaw.Unapproved,
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        approved_count: 2,
        revoked_count: 1,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("words in different books produce separate tally entries", async () => {
    const rows = await runTransform([
      makeRow({
        word_id: "word-1",
        book_id: 1,
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        word_id: "word-2",
        book_id: 40,
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 40,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("different languages produce separate tally entries", async () => {
    const rows = await runTransform([
      makeRow({
        language_id: "lang-1",
        word_id: "word-1",
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        language_id: "lang-2",
        word_id: "word-2",
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
    ]);

    expect(rows).toEqual([
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-2",
        user_id: "user-1",
        book_id: 1,
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });
});
