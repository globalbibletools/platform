import { query } from "@/db";
import { DbLanguage } from "./types";

// TODO: move this once there is a more appropriate module
export interface DbBook {
  id: number;
  name: string;
}

export type LanguageQueryResult = Pick<
  DbLanguage,
  "id" | "code" | "englishName" | "localName"
>;

export type LanguageSettingsQueryResult = Pick<
  DbLanguage,
  | "englishName"
  | "localName"
  | "code"
  | "font"
  | "textDirection"
  | "translationIds"
  | "referenceLanguageId"
>;

export const languageQueryService = {
  async findSettingsByCode(
    code: string,
  ): Promise<LanguageSettingsQueryResult | undefined> {
    const result = await query<LanguageSettingsQueryResult>(
      `
        select
          english_name as "englishName", local_name as "localName", code, font,
          text_direction as "textDirection",
          translation_ids as "translationIds",
          reference_language_id as "referenceLanguageId"
        from language
        where code = $1
      `,
      [code],
    );

    return result.rows[0];
  },
};
