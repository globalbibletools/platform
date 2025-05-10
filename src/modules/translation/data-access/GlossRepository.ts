import { query } from "@/db";

export enum GlossStateRaw {
  Approved = "APPROVED",
  Unapproved = "UNAPPROVED",
}
export enum GlossSourceRaw {
  User = "USER",
  Import = "IMPORT",
}

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

const glossRepository = {
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
};
export default glossRepository;
