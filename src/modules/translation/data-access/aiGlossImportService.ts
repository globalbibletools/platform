import * as z from "zod";

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

  async getGlossesForChapter({
    bookId,
    chapter,
    languageCode,
  }: {
    bookId: number;
    chapter: number;
    languageCode: string;
  }): Promise<Array<AIGloss>> {
    const response = await fetch(
      `https://global-tools.bible.systems/api-chirho/v1-chirho/glosses-chirho/${languageCode}/${bookId}/${chapter}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      },
    );
    const rawData = await response.json();
    return getChapterGlossesResponseSchema.parse(rawData);
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
              text_chirho: z.string().optional(),
            })
            .transform((word) => ({
              wordId: word.id_chirho,
              gloss: word.text_chirho,
            })),
        ),
      }),
    ),
  })
  .transform<Array<AIGloss>>((response) =>
    response.verses_chirho.flatMap((verse) => verse.words_chirho),
  );
