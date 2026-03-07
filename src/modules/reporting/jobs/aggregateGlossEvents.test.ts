import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { getDb } from "@/db";
import { sql } from "kysely";
import { ulid } from "@/shared/ulid";
import { JobStatus } from "@/shared/jobs/model";
import { bibleFactory } from "@/modules/bible-core/test-utils/bibleFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { phraseFactory } from "@/modules/translation/test-utils/phraseFactory";
import { GlossStateRaw } from "@/modules/translation/types";
import { aggregateGlossEventsJob } from "./aggregateGlossEvents";
import { REPORTING_JOB_TYPES } from "./jobTypes";

initializeDatabase();

const DAY = "2026-03-06";
const DAY_START = new Date("2026-03-06T00:00:00Z");

async function insertGlossEvent(options: {
  languageId: string;
  userId: string;
  wordIds: string[];
  timestamp: Date;
  prevState: GlossStateRaw;
  prevGloss: string;
  newState: GlossStateRaw;
  newGloss: string;
}): Promise<void> {
  const { phrase } = await phraseFactory.build({
    languageId: options.languageId,
    wordIds: options.wordIds,
  });

  await getDb()
    .insertInto("gloss_event")
    .values({
      id: ulid(),
      phrase_id: phrase.id,
      language_id: options.languageId,
      user_id: options.userId,
      word_ids: sql`${options.wordIds}::text[]`,
      timestamp: options.timestamp,
      prev_state: options.prevState,
      prev_gloss: options.prevGloss,
      new_state: options.newState,
      new_gloss: options.newGloss,
      approval_method: null,
    } as any)
    .execute();
}

test("reads gloss events and writes contribution snapshots", async () => {
  const { user: userA } = await userFactory.build();
  const { user: userB } = await userFactory.build();
  const { language } = await languageFactory.build({
    members: [userA.id, userB.id],
  });
  const words = await bibleFactory.words({ count: 3 });

  // userA approves word 0
  await insertGlossEvent({
    languageId: language.id,
    userId: userA.id,
    wordIds: [words[0].id],
    timestamp: new Date("2026-03-06T09:00:00Z"),
    prevState: GlossStateRaw.Unapproved,
    prevGloss: "",
    newState: GlossStateRaw.Approved,
    newGloss: "hello",
  });

  // userA approves word 1
  await insertGlossEvent({
    languageId: language.id,
    userId: userA.id,
    wordIds: [words[1].id],
    timestamp: new Date("2026-03-06T10:00:00Z"),
    prevState: GlossStateRaw.Unapproved,
    prevGloss: "",
    newState: GlossStateRaw.Approved,
    newGloss: "world",
  });

  // userB edits the approved gloss on word 1
  await insertGlossEvent({
    languageId: language.id,
    userId: userB.id,
    wordIds: [words[1].id],
    timestamp: new Date("2026-03-06T11:00:00Z"),
    prevState: GlossStateRaw.Approved,
    prevGloss: "world",
    newState: GlossStateRaw.Approved,
    newGloss: "earth",
  });

  // userA revokes word 2
  await insertGlossEvent({
    languageId: language.id,
    userId: userA.id,
    wordIds: [words[2].id],
    timestamp: new Date("2026-03-06T12:00:00Z"),
    prevState: GlossStateRaw.Approved,
    prevGloss: "foo",
    newState: GlossStateRaw.Unapproved,
    newGloss: "foo",
  });

  await aggregateGlossEventsJob({
    id: ulid(),
    type: REPORTING_JOB_TYPES.AGGREGATE_GLOSS_EVENTS,
    status: JobStatus.InProgress,
    payload: { day: DAY },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const snapshots = await getDb()
    .selectFrom("contribution_snapshot")
    .selectAll()
    .where("day", "=", DAY_START)
    .orderBy("user_id")
    .execute();
  expect(snapshots).toEqual([
    {
      id: expect.toBeUlid(),
      day: DAY_START,
      language_id: language.id,
      user_id: userA.id,
      book_id: 37,
      approved_count: 2,
      revoked_count: 1,
      edited_approved_count: 0,
      edited_unapproved_count: 0,
    },
    {
      id: expect.toBeUlid(),
      day: DAY_START,
      language_id: language.id,
      user_id: userB.id,
      book_id: 37,
      approved_count: 0,
      revoked_count: 0,
      edited_approved_count: 1,
      edited_unapproved_count: 0,
    },
  ]);
});
