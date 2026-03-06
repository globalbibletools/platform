import { Database, getDb, kyselyTransaction } from "@/db";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import Phrase from "../model/Phrase";
import Gloss from "../model/Gloss";
import { trackingClient } from "@/modules/reporting";
import { Selectable, SelectQueryBuilder, Transaction } from "kysely";
import { GlossTable, PhraseTable, PhraseWordTable } from "../db/schema";

export const phraseRepository = {
  async findByWordIdsWithinLanguage({
    languageId,
    wordIds,
    trx,
  }: {
    languageId: string;
    wordIds: string[];
    trx?: Transaction<Database>;
  }): Promise<Phrase[]> {
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
  }): Promise<Phrase | undefined> {
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

  async commit(phrase: Phrase, trx?: Transaction<Database>): Promise<void> {
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

type DbPhrase = Selectable<PhraseTable> & {
  word_ids: Omit<Selectable<PhraseWordTable>, "phrase_id">[];
  gloss: Omit<Selectable<GlossTable>, "phrase_id"> | null;
};

function selectPhraseFields(
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  query: SelectQueryBuilder<Database, "phrase", {}>,
): SelectQueryBuilder<Database, "phrase", DbPhrase> {
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

function dbToPhrase(dbModel: DbPhrase): Phrase {
  return new Phrase({
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
