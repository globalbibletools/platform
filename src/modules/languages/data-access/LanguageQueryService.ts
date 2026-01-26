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

type LanguageProgressQueryResult = {
  name: string;
  wordCount: number;
  approvedCount: number;
  nextVerse: string | null;
};

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
  async findById(id: string): Promise<LanguageQueryResult | undefined> {
    const result = await query<LanguageQueryResult>(
      `
        select id, code, english_name as "englishName", local_name as "localName"
        from language
        where id = $1
      `,
      [id],
    );
    return result.rows[0];
  },

  async findByCode(code: string): Promise<LanguageQueryResult | undefined> {
    const result = await query<LanguageQueryResult>(
      `
        select id, code, english_name as "englishName", local_name as "localName"
        from language
        where code = $1
      `,
      [code],
    );
    return result.rows[0];
  },

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

  async findProgressByCode(
    code: string,
  ): Promise<LanguageProgressQueryResult[]> {
    const request = await query<LanguageProgressQueryResult>(
      `
        select
          b.name,
          count(*) as "wordCount",
          count(*) filter (where ph.word_id is not null) as "approvedCount",
          min(v.id) filter (where ph.word_id is null) as "nextVerse"
        from book as b
        join verse as v on v.book_id = b.id
        join word as w on w.verse_id = v.id
        left join (
          select phw.word_id from phrase_word as phw
          join phrase as ph on ph.id = phw.phrase_id
          join gloss as g on g.phrase_id = ph.id
          where ph.deleted_at is null
            and g.state = 'APPROVED'
            and ph.language_id = (select id from language where code = $1)
        ) as ph on ph.word_id = w.id
        group by b.id
        order by b.id
      `,
      [code],
    );
    return request.rows;
  },
};
