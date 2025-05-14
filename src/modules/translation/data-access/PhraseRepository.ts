import { query } from "@/db";
import { DbLanguage } from "@/modules/languages/data-access/types";

export interface DbPhrase {
  id: number;
  languageId: string;
  createdAt: Date;
  createdBy?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export interface DbPhraseWord {
  phraseId: string;
  wordId: string;
}

export type Phrase = Omit<DbPhrase, "languageId"> & {
  languageCode: DbLanguage["code"];
  wordIds: DbPhraseWord["wordId"][];
};

const phraseRepository = {
  async findById(id: number): Promise<Phrase | undefined> {
    const result = await query<Phrase>(
      `
        select
          id,
          (select code from language where language.id = phrase.language_id) as "languageCode",
          (select json_agg(phrase_word.word_id) from phrase_word where phrase_word.phrase_id = phrase.id) as "wordIds",
          created_at as "createdAt",
          created_by as "createdBy",
          deleted_at as "deletedAt",
          deleted_by as "deletedBy"
        from phrase
        where id = $1
      `,
      [id],
    );

    return result.rows[0];
  },

  async existsForLanguage(
    languageCode: string,
    phraseIds: number[],
  ): Promise<boolean> {
    if (phraseIds.length === 0) {
      throw new Error("[existsForLanguage] expected at least one phrase ID");
    }

    const result = await query<{ exists: boolean }>(
      `
        select
            (count(*) filter (where phrase.id is null)) = 0 as exists
        from unnest($2::int[]) data (phrase_id)
        left join phrase on phrase.id = data.phrase_id
          and phrase.language_id = (select id from language where code = $1)
      `,
      [languageCode, phraseIds],
    );

    return result.rows[0].exists;
  },
};
export default phraseRepository;
