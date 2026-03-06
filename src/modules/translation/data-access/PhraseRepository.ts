import { Database, getDb, kyselyTransaction, query, transaction } from "@/db";
import { DbLanguage } from "@/modules/languages/data-access/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import PhraseModel from "../model/Phrase";
import Gloss from "../model/Gloss";
import { trackingClient } from "@/modules/reporting";
import { Selectable, SelectQueryBuilder, Transaction } from "kysely";
import { GlossTable, PhraseTable, PhraseWordTable } from "../db/schema";

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
  async findByWordIdsWithinLanguage({
    languageId,
    wordIds,
    trx,
  }: {
    languageId: string;
    wordIds: string[];
    trx?: Transaction<Database>;
  }): Promise<PhraseModel[]> {
    const rows = await selectPhraseFields(
      (trx ?? getDb())
        .selectFrom("phrase")
        .where((eb) =>
          eb.exists(
            eb
              .selectFrom("phrase_word")
              .whereRef("phrase_word.phrase_id", "=", "phrase.id")
              .where("phrase_word.word_id", "in", wordIds),
          ),
        )
        .where("language_id", "=", languageId)
        .where("deleted_at", "is", null),
    ).execute();

    return rows.map((row) => dbToPhrase(row));
  },

  async findWithinLanguage({
    languageId,
    phraseId,
    trx,
  }: {
    languageId: string;
    phraseId: number;
    trx?: Transaction<Database>;
  }): Promise<PhraseModel | undefined> {
    const row = await selectPhraseFields(
      (trx ?? getDb())
        .selectFrom("phrase")
        .where("id", "=", phraseId)
        .where("language_id", "=", languageId)
        .where("deleted_at", "is", null),
    ).executeTakeFirst();
    if (!row) return undefined;

    return dbToPhrase(row);
  },

  async existsWithinLanguage({
    languageId,
    phraseId,
  }: {
    languageId: string;
    phraseId: number;
  }): Promise<boolean> {
    const row = await getDb()
      .selectFrom("phrase")
      .where("id", "=", phraseId)
      .where("language_id", "=", languageId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return row !== undefined;
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

  async commit(
    phrase: PhraseModel,
    trx?: Transaction<Database>,
  ): Promise<void> {
    const run = async (trx: Transaction<Database>) => {
      if (!phrase.props.id) {
        const row = await trx
          .insertInto("phrase")
          .values({
            language_id: phrase.props.languageId,
            created_at: phrase.props.createdAt,
            created_by: phrase.props.createdBy,
            deleted_at: phrase.props.deletedAt,
            deleted_by: phrase.props.deletedBy,
          })
          .returning("id")
          .executeTakeFirstOrThrow();
        phrase.props.id = row.id;

        await trx
          .insertInto("phrase_word")
          .values(
            phrase.props.wordIds.map((wordId) => ({
              phrase_id: phrase.props.id,
              word_id: wordId,
            })),
          )
          .execute();
      } else {
        await trx
          .insertInto("phrase")
          .values({
            id: phrase.props.id,
            language_id: phrase.props.languageId,
            created_at: phrase.props.createdAt,
            created_by: phrase.props.createdBy,
            deleted_at: phrase.props.deletedAt,
            deleted_by: phrase.props.deletedBy,
          })
          .onConflict((oc) =>
            oc.column("id").doUpdateSet({
              deleted_at: (eb) => eb.ref("excluded.deleted_at"),
              deleted_by: (eb) => eb.ref("excluded.deleted_by"),
            }),
          )
          .execute();
      }

      if (phrase.props.gloss) {
        await trx
          .insertInto("gloss")
          .values({
            phrase_id: phrase.props.id,
            gloss: phrase.props.gloss.props.gloss,
            state: phrase.props.gloss.props.state,
            source: phrase.props.gloss.props.source,
            updated_at: phrase.props.gloss.props.updatedAt,
            updated_by: phrase.props.gloss.props.updatedBy,
          })
          .onConflict((oc) =>
            oc.column("phrase_id").doUpdateSet((eb) => ({
              gloss: eb.ref("excluded.gloss"),
              state: eb.ref("excluded.state"),
              source: eb.ref("excluded.source"),
              updated_at: eb.ref("excluded.updated_at"),
              updated_by: eb.ref("excluded.updated_by"),
            })),
          )
          .execute();
      }

      if (phrase.events.length > 0) {
        await trackingClient.trackMany(
          phrase.events.map((event) => ({
            ...event,
            phraseId: phrase.props.id,
          })),
          trx,
        );
      }
    };

    if (trx) {
      await run(trx);
    } else {
      await kyselyTransaction(run);
    }
  },
};
export default phraseRepository;

type PhraseData = Selectable<PhraseTable> & {
  word_ids: Omit<Selectable<PhraseWordTable>, "phrase_id">[];
  gloss: Omit<Selectable<GlossTable>, "phrase_id"> | null;
};

function selectPhraseFields(
  query: SelectQueryBuilder<Database, "phrase", {}>,
): SelectQueryBuilder<Database, "phrase", PhraseData> {
  const result = query.select((eb) => [
    "id",
    "language_id",
    "created_at",
    "created_by",
    "deleted_at",
    "deleted_by",
    jsonArrayFrom(
      eb
        .selectFrom("phrase_word")
        .select("word_id")
        .whereRef("phrase_word.phrase_id", "=", "phrase.id"),
    ).as("word_ids"),
    jsonObjectFrom(
      eb
        .selectFrom("gloss")
        .select(["gloss", "state", "source", "updated_at", "updated_by"])
        .whereRef("gloss.phrase_id", "=", "phrase.id"),
    ).as("gloss"),
  ]);

  return result;
}

function dbToPhrase(dbModel: PhraseData): PhraseModel {
  return new PhraseModel({
    id: dbModel.id,
    languageId: dbModel.language_id,
    wordIds: dbModel.word_ids.map((w) => w.word_id),
    createdAt: dbModel.created_at,
    createdBy: dbModel.created_by,
    deletedAt: dbModel.deleted_at,
    deletedBy: dbModel.deleted_by,
    gloss:
      dbModel.gloss ?
        new Gloss({
          gloss: dbModel.gloss.gloss,
          state: dbModel.gloss.state,
          source: dbModel.gloss.source,
          updatedAt: new Date(dbModel.gloss.updated_at),
          updatedBy: dbModel.gloss.updated_by,
        })
      : null,
  });
}
