import * as z from "zod";
import { NextRequest, NextResponse } from "next/server";
import { BibleClient } from "@gracious.tech/fetch-client";
import { query } from "@/db";
import { parseVerseId } from "@/verse-utils";
import bookKeys from "@/data/book-keys.json" assert { type: "json" };

const requestSchema = z.object({
  verseIds: z.array(z.string()),
  code: z.string(),
});

const bibleClient = new BibleClient();

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const request = requestSchema.safeParse({
    code: params.get("code") ?? "",
    verseIds: params.get("verseIds")?.split(",") ?? [],
  });
  if (!request.success) {
    return new NextResponse(undefined, { status: 400 });
  }

  const languageQuery = await query<{ bibleTranslationIds: string[] }>(
    `
        SELECT COALESCE("translation_ids", '{}') AS "bibleTranslationIds" FROM language WHERE code = $1
        `,
    [request.data.code],
  );
  const language = languageQuery.rows[0];
  if (!language) {
    return new NextResponse(undefined, { status: 404 });
  }

  console.log(language);

  const verseQuery = await query<{ id: string; text: string }>(
    `
        SELECT
            w.verse_id AS id,
            STRING_AGG(w.text, ' ' ORDER BY w.id) AS text
        FROM word AS w
        WHERE w.verse_id = ANY($1::text[])
        GROUP BY w.verse_id
        `,
    [request.data.verseIds],
  );

  const translations = await Promise.all(
    request.data.verseIds.map(async (verseId) => {
      const { bookId, chapterNumber, verseNumber } = parseVerseId(verseId);
      const bookKey = bookKeys[bookId - 1].toLowerCase();
      const collection = await bibleClient.fetch_collection();
      for (const translationId of language.bibleTranslationIds) {
        try {
          const book = await collection.fetch_book(
            translationId,
            bookKey,
            "txt",
          );
          const text = book.get_verse(chapterNumber, verseNumber, {
            attribute: false,
            verse_nums: false,
            headings: false,
            notes: false,
          });
          return { verseId, text };
        } catch (e) {
          console.log(e);
          // There was some issue getting the verse in this translation, try the
          // next translation.
          continue;
        }
      }
      // Must return null, not undefined, so that this will work with useQuery
      return { verseId, text: "" };
    }),
  );

  return NextResponse.json({
    verses: request.data.verseIds.map((verseId) => ({
      id: verseId,
      original: verseQuery.rows.find((v) => v.id === verseId)?.text ?? "",
      translation: translations.find((t) => t.verseId === verseId)?.text ?? "",
    })),
  });
}
