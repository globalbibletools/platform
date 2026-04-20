import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getReadAudioTimingsReadModel } from "../readModels/getReadAudioTimingsReadModel";

const requestSchema = z.object({
  chapterId: z.string(),
  speaker: z.string(),
});

export const getReadAudioTimings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const bookId = parseInt(data.chapterId.slice(0, 2)) || 1;
    const chapterNumber = parseInt(data.chapterId.slice(2, 5)) || 1;

    const verseTimings = await getReadAudioTimingsReadModel(
      data.speaker,
      bookId,
      chapterNumber,
    );

    if (!verseTimings.length) {
      throw notFound();
    }

    return verseTimings;
  });
