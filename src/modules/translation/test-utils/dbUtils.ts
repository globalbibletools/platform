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

export async function findGlossForPhrase(
  phraseId: number,
): Promise<DbGloss | undefined> {
  const result = await query<DbGloss>(
    `
      select 
        gloss,
        state,
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        phrase_id as "phraseId",
        source
      from gloss
      where phrase_id = $1
    `,
    [phraseId],
  );

  return result.rows[0];
}

export async function findGlossHistoryForPhrase(
  phraseId: number,
): Promise<DbGlossHistoryEntry[]> {
  const result = await query<DbGlossHistoryEntry>(
    `
      select 
        id,
        gloss,
        state,
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        phrase_id as "phraseId",
        source
      from gloss_history
      where phrase_id = $1
    `,
    [phraseId],
  );

  return result.rows;
}
