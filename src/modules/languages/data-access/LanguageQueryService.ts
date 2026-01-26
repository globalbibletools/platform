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

export const languageQueryService = {
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
