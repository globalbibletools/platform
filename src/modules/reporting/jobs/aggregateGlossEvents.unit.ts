import { describe, test, expect } from "vitest";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { GlossEventAggregatorTransform } from "./aggregateGlossEvents";
import { GlossStateRaw } from "@/modules/translation/types";

const TEST_DAY = new Date("2026-03-06");

interface RowOverrides {
  language_id?: string;
  user_id?: string;
  book_id?: number;
  prev_state?: GlossStateRaw;
  new_state?: GlossStateRaw;
}

function makeRow(overrides: RowOverrides = {}) {
  return {
    language_id: "lang-1",
    user_id: "user-1",
    book_id: 1,
    prev_state: GlossStateRaw.Unapproved,
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
  test("UNAPPROVED to APPROVED increments approved_count", async () => {
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

  test("APPROVED to UNAPPROVED increments revoked_count", async () => {
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

  test("no state change produces no tally entry", async () => {
    const rows = await runTransform([
      makeRow({
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Unapproved,
      }),
      makeRow({
        prev_state: GlossStateRaw.Approved,
        new_state: GlossStateRaw.Approved,
      }),
    ]);

    expect(rows).toEqual([]);
  });

  test("multiple events accumulate counts independently per row", async () => {
    const rows = await runTransform([
      makeRow({
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        prev_state: GlossStateRaw.Approved,
        new_state: GlossStateRaw.Unapproved,
      }),
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
        approved_count: 2,
        revoked_count: 1,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("different (language, user, book) combinations produce separate tally entries", async () => {
    const rows = await runTransform([
      makeRow({
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 1,
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        language_id: "lang-1",
        user_id: "user-2",
        book_id: 1,
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        language_id: "lang-2",
        user_id: "user-1",
        book_id: 1,
        prev_state: GlossStateRaw.Unapproved,
        new_state: GlossStateRaw.Approved,
      }),
      makeRow({
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 40,
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
        approved_count: 1,
        revoked_count: 0,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-2",
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
      {
        id: expect.toBeUlid(),
        day: TEST_DAY,
        language_id: "lang-1",
        user_id: "user-1",
        book_id: 40,
        approved_count: 0,
        revoked_count: 1,
        edited_approved_count: 0,
        edited_unapproved_count: 0,
      },
    ]);
  });

  test("empty stream produces no rows", async () => {
    const rows = await runTransform([]);
    expect(rows).toEqual([]);
  });
});
