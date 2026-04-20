import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getCurrentReadLanguageReadModel } from "../readModels/getCurrentReadLanguageReadModel";
import { getReadChapterVersesReadModel } from "../readModels/getReadChapterVersesReadModel";

const requestSchema = z.object({
  chapterId: z.string(),
  code: z.string(),
});

export const getReadChapterData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const bookId = parseInt(data.chapterId.slice(0, 2)) || 1;
    const chapterNumber = parseInt(data.chapterId.slice(2, 5)) || 1;

    const [chapterVerses, currentLanguage] = await Promise.all([
      getReadChapterVersesReadModel(bookId, chapterNumber, data.code),
      getCurrentReadLanguageReadModel(data.code),
    ]);

    if (!currentLanguage) {
      throw notFound();
    }

    return { chapterVerses, currentLanguage };
  });
