import { query, transaction } from "@/db";
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
  language: {
    id: DbLanguage["id"];
    code: DbLanguage["code"];
  };
  wordIds: DbPhraseWord["wordId"][];
};

const phraseRepository = {
  async findWithinLanguageById(
    languageCode: string,
    id: number,
  ): Promise<Phrase | undefined> {
    const result = await query<Phrase>(
      `
        select
          id,
          json_build_object(
              'id', phrase.language_id,
              'code', (select code from language where language.id = phrase.language_id)
          ) as language,
          (select json_agg(phrase_word.word_id) from phrase_word where phrase_word.phrase_id = phrase.id) as "wordIds",
          created_at as "createdAt",
          created_by as "createdBy",
          deleted_at as "deletedAt",
          deleted_by as "deletedBy"
        from phrase
        where id = $2
          and language_id = (select id from language where code = $1)
      `,
      [languageCode, id],
    );

    return result.rows[0];
  },
  async findById(id: number): Promise<Phrase | undefined> {
    const result = await query<Phrase>(
      `
        select
          id,
          json_build_object(
              'id', phrase.language_id,
              'code', (select code from language where language.id = phrase.language_id)
          ) as language,
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

  async linkWords({
    code,
    wordIds,
    userId,
  }: {
    code: string;
    wordIds: string[];
    userId: string;
  }) {
    await transaction(async (query) => {
      const phrasesQuery = await query(
        `
          select from phrase as ph
          join phrase_word as phw on phw.phrase_id = ph.id
          join lateral (
            select count(*) as count from phrase_word as phw
            where phw.phrase_id = ph.id
          ) as words on true
          where ph.language_id = (select id from language where code = $1)
            and ph.deleted_at is null
            and phw.word_id = any($2::text[])
            and words.count > 1
          `,
        [code, wordIds],
      );
      if (phrasesQuery.rows.length > 0) {
        throw new Error("Words already linked");
      }

      await query(
        `
          update phrase as ph
            set deleted_at = now(),
              deleted_by = $3
          from phrase_word as phw
          where phw.phrase_id = ph.id
            and phw.word_id = any($2::text[])
            and ph.deleted_at is null
            and ph.language_id = (select id from language where code = $1)
          `,
        [code, wordIds, userId],
      );

      await query(
        `
          with phrase as (
            insert into phrase (language_id, created_by, created_at)
            values ((select id from language where code = $1), $3, now())
            returning id
          )
          insert into phrase_word (phrase_id, word_id)
          select phrase.id, unnest($2::text[]) from phrase
        `,
        [code, wordIds, userId],
      );
    });
  },

  async unlink({
    code,
    phraseId,
    userId,
  }: {
    code: string;
    phraseId: number;
    userId: string;
  }) {
    await query(
      `
        update phrase as ph
          set
            deleted_at = now(),
            deleted_by = $3
        where ph.language_id = (select id from language where code = $1)
          and ph.id = $2
      `,
      [code, phraseId, userId],
    );
  },
};
export default phraseRepository;
