import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { getDb } from "@/db";
import { Selectable } from "kysely";
import { phraseFactory } from "@/modules/translation/test-utils/phraseFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { GlossStateRaw } from "@/modules/translation/types";
import { JobStatus } from "@/shared/jobs/model";
import { REPORTING_JOB_TYPES } from "./jobTypes";
import {
  updateBookCompletionProgressJob,
  UpdateBookCompletionProgressJob,
  UpdateBookCompletionProgressPayload,
} from "./updateBookCompletionProgress";
import type { BookCompletionProgressTable } from "../db/schema";
import { ulid } from "@/shared/ulid";
import { faker } from "@faker-js/faker/locale/en";
import {
  bibleFactory,
  HAGGAI_BOOK_ID,
} from "@/modules/bible-core/test-utils/bibleFactory";

initializeDatabase();

function makeJob(
  payload: UpdateBookCompletionProgressPayload = {},
): UpdateBookCompletionProgressJob {
  return {
    id: ulid(),
    type: REPORTING_JOB_TYPES.UPDATE_BOOK_COMPLETION_PROGRESS,
    status: JobStatus.InProgress,
    payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const job = makeJob();

async function findProgress(): Promise<
  Selectable<BookCompletionProgressTable>[]
> {
  return getDb()
    .selectFrom("book_completion_progress")
    .selectAll()
    .orderBy("language_id")
    .orderBy("book_id")
    .orderBy("user_id")
    .execute();
}

test("aggregates book progress for all languages", async () => {
  const { user: user1 } = await userFactory.build();
  const { user: user2 } = await userFactory.build();

  const { language: language1 } = await languageFactory.build({
    members: [user1.id, user2.id],
  });
  const { language: language2 } = await languageFactory.build({
    members: [user1.id],
  });

  await phraseFactory.buildMany({
    scope: 3,
    languageId: language1.id,
    gloss: [
      { state: GlossStateRaw.Approved, updated_by: user1.id },
      { state: GlossStateRaw.Approved, updated_by: user1.id },
      { state: GlossStateRaw.Approved, updated_by: user2.id },
    ],
    events: true,
  });
  await phraseFactory.buildMany({
    scope: 3,
    languageId: language2.id,
    gloss: [
      { state: GlossStateRaw.Approved, updated_by: user1.id },
      { state: GlossStateRaw.Approved, updated_by: user1.id },
      { state: GlossStateRaw.Approved, updated_by: user1.id },
    ],
    events: true,
  });

  const result = await updateBookCompletionProgressJob(job);
  expect(result).toBeUndefined();

  const progressRows = await findProgress();
  expect(progressRows).toEqual([
    {
      id: expect.any(Number),
      language_id: language1.id,
      book_id: HAGGAI_BOOK_ID,
      user_id: user1.id,
      word_count: 2,
      refreshed_at: expect.toBeNow(),
    },
    {
      id: expect.any(Number),
      language_id: language1.id,
      book_id: HAGGAI_BOOK_ID,
      user_id: user2.id,
      word_count: 1,
      refreshed_at: expect.toBeNow(),
    },
    {
      id: expect.any(Number),
      language_id: language2.id,
      book_id: HAGGAI_BOOK_ID,
      user_id: user1.id,
      word_count: 3,
      refreshed_at: expect.toBeNow(),
    },
  ]);
});

test("counts each word of a multi-word phrase", async () => {
  const { user } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [user.id] });

  const words = await bibleFactory.words({ count: 3 });
  await phraseFactory.build({
    languageId: language.id,
    wordIds: words.map((w) => w.id),
    gloss: { state: GlossStateRaw.Approved, updated_by: user.id },
    events: true,
  });

  const result = await updateBookCompletionProgressJob(job);
  expect(result).toBeUndefined();

  const progressRows = await findProgress();
  expect(progressRows).toEqual([
    {
      id: expect.any(Number),
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      user_id: user.id,
      word_count: 3,
      refreshed_at: expect.toBeNow(),
    },
  ]);
});

test("doesn't update a language if no events have occurred", async () => {
  const { language } = await languageFactory.build();

  const existingProgressRows = await getDb()
    .insertInto("book_completion_progress")
    .values({
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      user_id: null,
      word_count: 5,
      refreshed_at: faker.date.recent(),
    })
    .returningAll()
    .execute();

  const result = await updateBookCompletionProgressJob(job);
  expect(result).toBeUndefined();

  const progressRows = await findProgress();
  expect(progressRows).toEqual(existingProgressRows);
});

test("replaces previous progress entries", async () => {
  const { user } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [user.id] });

  // This is for a different book and should be removed when the job runs.
  await getDb().insertInto("book").values({ id: 1, name: "Gen" }).execute();
  await getDb()
    .insertInto("book_completion_progress")
    .values({
      language_id: language.id,
      book_id: 1,
      user_id: null,
      word_count: 5,
      refreshed_at: new Date(0),
    })
    .returningAll()
    .execute();

  await phraseFactory.build({
    languageId: language.id,
    gloss: { state: GlossStateRaw.Approved, updated_by: user.id },
    events: true,
  });

  const result = await updateBookCompletionProgressJob(job);
  expect(result).toBeUndefined();

  const progressRows = await findProgress();
  expect(progressRows).toEqual([
    {
      id: expect.any(Number),
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      user_id: user.id,
      word_count: 1,
      refreshed_at: expect.toBeNow(),
    },
  ]);
});

test("processes all languages when allLanguages is true", async () => {
  const { user } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [user.id] });

  await phraseFactory.build({
    languageId: language.id,
    gloss: { state: GlossStateRaw.Approved, updated_by: user.id },
    events: true,
  });

  await updateBookCompletionProgressJob(makeJob());
  const firstProgressRows = await findProgress();

  // Run again without new events — normally this language would be skipped,
  // but allLanguages: true forces it to be reprocessed.
  const result = await updateBookCompletionProgressJob(
    makeJob({ allLanguages: true }),
  );
  expect(result).toBeUndefined();

  const progressRows = await findProgress();
  expect(progressRows).toEqual([
    {
      id: expect.any(Number),
      language_id: language.id,
      book_id: HAGGAI_BOOK_ID,
      user_id: user.id,
      word_count: 1,
      refreshed_at: expect.toBeNow(),
    },
  ]);
  expect(progressRows[0].refreshed_at).not.toEqual(
    firstProgressRows[0].refreshed_at,
  );
});
