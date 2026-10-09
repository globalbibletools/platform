import { createPolicyMiddleware, Policy } from "@/modules/access";
import { createServerFn } from "@tanstack/react-start";
import { parseVerseId } from "@/verse-utils";
import { getDb } from "@/db";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import * as z from "zod";

const requestSchema = z.object({
  verseId: z.string(),
});

const policy = new Policy({ authenticated: true });

export interface ChapterVerseWord {
  id: string;
  text: string;
}

export interface ChapterVerse {
  id: string;
  number: number;
  words: ChapterVerseWord[];
}

export const getChapterWords = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const { bookId, chapterNumber } = parseVerseId(data.verseId);
    const db = getDb();

    const result = await db
      .selectFrom("verse as v")
      .where("v.book_id", "=", bookId)
      .where("v.chapter", "=", chapterNumber)
      .orderBy("v.number")
      .select((eb) => [
        "v.id",
        "v.number",
        jsonArrayFrom(
          eb
            .selectFrom("word as w")
            .whereRef("w.verse_id", "=", "v.id")
            .orderBy("w.id")
            .select(["w.id", "w.text"]),
        ).as("words"),
      ])
      .execute();

    return result as ChapterVerse[];
  });
