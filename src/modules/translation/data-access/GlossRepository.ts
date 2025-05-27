import { query } from "@/db";
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

const glossRepository = {
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

  async update(options: UpdateGlossOptions) {
    await query(
      `insert into gloss (phrase_id, state, gloss, updated_at, updated_by, source)
        values ($1, $2, $3, now(), $4, $5)
        on conflict (phrase_id) do update set
          state = coalesce(excluded.state, gloss.state),
          gloss = coalesce(excluded.gloss, gloss.gloss),
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by, 
          source = excluded.source
          where excluded.state <> gloss.state or excluded.gloss <> gloss.gloss
      `,
      [
        options.phraseId,
        options.state,
        options.gloss,
        options.updatedBy,
        options.source,
      ],
    );
  },

  async approveMany(options: ApproveManyGlossesOptions) {
    await query(
      `
        insert into gloss (phrase_id, gloss, state, updated_at, updated_by, source)
        select ph.id, data.gloss, 'APPROVED', now(), $3, 'USER'
        from unnest($1::integer[], $2::text[]) data (phrase_id, gloss)
        join phrase as ph on ph.id = data.phrase_id
        where ph.deleted_at is null
        on conflict (phrase_id)
            do update set
                gloss = coalesce(excluded.gloss, gloss.gloss),
                state = excluded.state,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by, 
                source = excluded.source
                where excluded.state <> gloss.state or excluded.gloss <> gloss.gloss
        `,
      [
        options.phrases.map((ph) => ph.phraseId),
        options.phrases.map((ph) => ph.gloss),
        options.updatedBy,
      ],
    );
  },
};
export default glossRepository;
