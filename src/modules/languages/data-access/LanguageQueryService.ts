import { query } from "@/db";
import { DbLanguage } from "./types";
import { DbUser } from "@/modules/users/data-access/types";

// TODO: move this once there is a more appropriate module
export interface DbBook {
  id: number;
  name: string;
}

export type LanguageQueryResult = Pick<DbLanguage, "id" | "code" | "name">;

export type PaginatedLanguage = Pick<DbLanguage, "code" | "name"> & {
  otProgress: number;
  ntProgress: number;
};

interface LanguagePageQueryResult {
  total: number;
  page: PaginatedLanguage[];
}

type LanguageProgressQueryResult = Pick<DbLanguage, "name"> & {
  wordCount: number;
  approvedCount: number;
  nextVerse: string | null;
};

export type LanguageSettingsQueryResult = Pick<
  DbLanguage,
  | "name"
  | "code"
  | "font"
  | "textDirection"
  | "translationIds"
  | "referenceLanguageId"
>;

export const languageQueryService = {
  async search(options: {
    page: number;
    limit: number;
  }): Promise<LanguagePageQueryResult> {
    const languagesQuery = await query<LanguagePageQueryResult>(
      `
        select
          (
            select count(*) from language
          ) as total,
          (
            select
              coalesce(json_agg(l.json), '[]')
            from (
              select
                json_build_object(
                  'name', l.name, 
                  'code', l.code,
                  'otProgress', coalesce(p.ot_progress, 0),
                  'ntProgress', coalesce(p.nt_progress, 0)
                ) as json
              from language as l
              left join language_progress as p on p.code = l.code
              order by l.name
              offset $1
              limit $2
            ) as l
          ) as page
        `,
      [options.page * options.limit, options.limit],
    );
    return languagesQuery.rows[0];
  },

  async findAll(): Promise<LanguageQueryResult[]> {
    const result = await query<LanguageQueryResult>(
      `
        select id, code, name
        from language
        order by name
      `,
      [],
    );
    return result.rows;
  },

  async findById(id: string): Promise<LanguageQueryResult | undefined> {
    const result = await query<LanguageQueryResult>(
      `
        select id, code, name
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
        select id, code, name
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
          name, code, font,
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
