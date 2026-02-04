import * as z from "zod";

const API_KEY = process.env.BIBLE_SYSTEMS_API_KEY;

export interface Language {
  code: string;
  glossCount: number;
}

export const machineGlossGenerationService = {
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
};

const getLanguagesResponseSchema = z
  .object({
    languages_chirho: z.array(
      z
        .object({
          code_chirho: z.string(),
          gloss_count_chirho: z.number(),
        })
        .transform<Language>((language) => ({
          code: language.code_chirho,
          glossCount: language.gloss_count_chirho,
        })),
    ),
  })
  .transform<Array<Language>>((response) => response.languages_chirho);
