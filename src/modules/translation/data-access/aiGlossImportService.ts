import * as z from "zod";
import verseCounts from "@/data/verse-counts.json";

const API_KEY = process.env.BIBLE_SYSTEMS_API_KEY;

export interface Language {
  code: string;
  name: string;
  glossCount: number;
}

export interface AIGloss {
  wordId: string;
  gloss: string | undefined;
}

export const aiGlossImportService = {
  async getAvailableLanguages(): Promise<Array<Language>> {
    const response = await fetch(
      "https://global-tools.bible.systems/api-chirho/v1-chirho/languages-chirho",
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      },
    );
    const rawData = await response.json();
    return getLanguagesResponseSchema.parse(rawData);
  },

  async *streamGlosses(languageCode: string): AsyncGenerator<Array<AIGloss>> {
    for (let bookId = 0; bookId < verseCounts.length; bookId++) {
      const chapters = verseCounts[bookId];
      for (let chapter = 0; chapter < chapters.length; chapter++) {
        const response = await fetch(
          `https://global-tools.bible.systems/api-chirho/v1-chirho/glosses-upstream-chirho/${languageCode}/${bookId + 1}/${chapter + 1}?format=plain`,
          {
            headers: {
              Authorization: `Bearer ${API_KEY}`,
            },
          },
        );
        const rawData = await response.json();
        yield getChapterGlossesResponseSchema.parse(rawData);
      }
    }
  },
};

const getLanguagesResponseSchema = z
  .object({
    languages_chirho: z.array(
      z
        .object({
          name_chirho: z.string(),
          code_chirho: z.string(),
          gloss_count_chirho: z.number(),
        })
        .transform<Language>((language) => ({
          name: language.name_chirho,
          code: language.code_chirho,
          glossCount: language.gloss_count_chirho,
        })),
    ),
  })
  .transform<Array<Language>>((response) => response.languages_chirho);

const getChapterGlossesResponseSchema = z
  .object({
    verses_chirho: z.array(
      z.object({
        words_chirho: z.array(
          z
            .object({
              id_chirho: z.string(),
              gloss_chirho: z.string().optional().nullable(),
            })
            .transform((word) => ({
              wordId: word.id_chirho,
              gloss: word.gloss_chirho ?? undefined,
            })),
        ),
      }),
    ),
  })
  .transform<Array<AIGloss>>((response) =>
    response.verses_chirho.flatMap((verse) => verse.words_chirho),
  );
