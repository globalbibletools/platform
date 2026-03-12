import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { getDb } from "@/db";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { HAGGAI_BOOK_ID } from "@/modules/bible-core/test-utils/bibleFactory";
import { getLanguageBookProgressReadModel } from "./getLanguageBookProgressReadModel";

initializeDatabase();

test("collects book progress and contributors for single language", async () => {
  const { user: user1 } = await userFactory.build();
  const { user: user2 } = await userFactory.build();
  const { language } = await languageFactory.build({
    members: [user1.id, user2.id],
  });

  await getDb()
    .insertInto("book_completion_progress")
    .values([
      {
        language_id: language.id,
        book_id: HAGGAI_BOOK_ID,
        user_id: user1.id,
        word_count: 3,
        refreshed_at: new Date(),
      },
      {
        language_id: language.id,
        book_id: HAGGAI_BOOK_ID,
        user_id: user2.id,
        word_count: 1,
        refreshed_at: new Date(),
      },
    ])
    .execute();

  const result = await getLanguageBookProgressReadModel(language.id);

  expect(result).toEqual([
    {
      bookId: HAGGAI_BOOK_ID,
      name: "Hag",
      totalWords: 608,
      approvedWords: 4,
      progress: expect.closeTo(4 / 608, 5),
      contributors: [
        { userId: user1.id, name: user1.name, wordCount: 3 },
        { userId: user2.id, name: user2.name, wordCount: 1 },
      ],
    },
  ]);
});

test("returns empty array if no language progress", async () => {
  const { language } = await languageFactory.build();

  const result = await getLanguageBookProgressReadModel(language.id);

  expect(result).toEqual([]);
});
