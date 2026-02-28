import { createRepository, query } from "@/db";
import { GlossSourceRaw, GlossStateRaw } from "../types";

export interface DbGloss {
  gloss: string | null;
  state: GlossStateRaw;
  updatedAt: Date;
  updatedBy: string | null;
  phraseId: number;
  source: GlossSourceRaw | null;
}
export interface DbGlossHistoryEntry {
  id: number;
  gloss: string | null;
  state: GlossStateRaw;
  updatedAt: Date;
  updatedBy: string | null;
  phraseId: number;
  source: GlossSourceRaw | null;
}

export type UpdateGlossOptions = Pick<
  DbGloss,
  "phraseId" | "updatedBy" | "source"
> & {
  gloss?: DbGloss["gloss"];
  state?: DbGloss["state"];
};

export interface ApproveManyGlossesOptions {
  updatedBy: DbGloss["updatedBy"];
  phrases: Pick<DbGloss, "gloss" | "phraseId">[];
}

const glossRepository = createRepository((getDb) => ({
  async findByPhraseId(phraseId: number): Promise<DbGloss | undefined> {
    const result = await query<DbGloss>(
      `
        select
          phrase_id as "phraseId",
          gloss,
          state,
          updated_at as "updatedAt",
          updated_by as "updatedBy",
          source
        from gloss
        where phrase_id = $1
      `,
      [phraseId],
    );
    return result.rows[0];
  },

  async findManyByPhraseId(phraseIds: number[]): Promise<DbGloss[]> {
    const result = await query<DbGloss>(
      `
        select
          phrase_id as "phraseId",
          gloss,
          state,
          updated_at as "updatedAt",
          updated_by as "updatedBy",
          source
        from gloss
        where phrase_id = ANY($1)
      `,
      [phraseIds],
    );
    return result.rows;
  },

  async findNextUnapproved(
    languageCode: string,
    verseId: string,
  ): Promise<string | undefined> {
    let result = await query<{ nextUnapprovedVerseId: string }>(
      `
        SELECT w.verse_id as "nextUnapprovedVerseId"
        FROM word AS w
        LEFT JOIN LATERAL (
          SELECT g.state AS state FROM phrase_word AS phw
          JOIN phrase AS ph ON ph.id = phw.phrase_id
          LEFT JOIN gloss AS g ON g.phrase_id = ph.id
          WHERE phw.word_id = w.id
			      AND ph.language_id = (SELECT id FROM language WHERE code = $1)
			      AND ph.deleted_at IS NULL
        ) AS g ON true
        WHERE w.verse_id > $2
          AND (g.state = 'UNAPPROVED' OR g.state IS NULL)
        ORDER BY w.id
        LIMIT 1
        `,
      [languageCode, verseId],
    );

    if (result.rows.length === 0) {
      result = await query<{ nextUnapprovedVerseId: string }>(
        `
            SELECT w.verse_id as "nextUnapprovedVerseId"
            FROM word AS w
            LEFT JOIN LATERAL (
              SELECT g.state AS state FROM phrase_word AS phw
              JOIN phrase AS ph ON ph.id = phw.phrase_id
              LEFT JOIN gloss AS g ON g.phrase_id = ph.id
              WHERE phw.word_id = w.id
                      AND ph.language_id = (SELECT id FROM language WHERE code = $1)
                      AND ph.deleted_at IS NULL
            ) AS g ON true
            WHERE (g.state = 'UNAPPROVED' OR g.state IS NULL)
            ORDER BY w.id
            LIMIT 1
            `,
        [languageCode],
      );
    }

    return result.rows[0]?.nextUnapprovedVerseId;
  },

  async update(options: UpdateGlossOptions) {
    await getDb()
      .insertInto("gloss")
      .values({
        phrase_id: options.phraseId,
        state: options.state,
        gloss: options.gloss,
        updated_by: options.updatedBy,
        updated_at: new Date(),
        source: options.source,
      })
      .onConflict((oc) =>
        oc
          .column("phrase_id")
          .doUpdateSet((eb) => ({
            state: eb.fn.coalesce("excluded.state", "gloss.state"),
            gloss: eb.fn.coalesce("excluded.gloss", "gloss.gloss"),
            updated_at: eb.ref("excluded.updated_at"),
            updated_by: eb.ref("excluded.updated_by"),
            source: eb.ref("excluded.source"),
          }))
          .where((eb) =>
            eb.or([
              eb("excluded.state", "<>", eb.ref("gloss.state")),
              eb("excluded.gloss", "<>", eb.ref("gloss.gloss")),
            ]),
          ),
      )
      .execute();
  },

  async approveMany(options: ApproveManyGlossesOptions) {
    const now = new Date();
    await getDb()
      .insertInto("gloss")
      .values(
        options.phrases.map((gloss) => ({
          phrase_id: gloss.phraseId,
          state: GlossStateRaw.Approved,
          gloss: gloss.gloss,
          updated_by: options.updatedBy,
          updated_at: now,
          source: GlossSourceRaw.User,
        })),
      )
      .onConflict((oc) =>
        oc
          .column("phrase_id")
          .doUpdateSet((eb) => ({
            state: eb.fn.coalesce("excluded.state", "gloss.state"),
            gloss: eb.fn.coalesce("excluded.gloss", "gloss.gloss"),
            updated_at: eb.ref("excluded.updated_at"),
            updated_by: eb.ref("excluded.updated_by"),
            source: eb.ref("excluded.source"),
          }))
          .where((eb) =>
            eb.or([
              eb("excluded.state", "<>", eb.ref("gloss.state")),
              eb("excluded.gloss", "<>", eb.ref("gloss.gloss")),
            ]),
          ),
      )
      .execute();
  },
}));
export default glossRepository;
