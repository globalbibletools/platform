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

export interface DbFootnote {
  phraseId: number;
  content: string;
  authorId: string;
  timestamp: Date;
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

export async function findFootnoteForPhrase(
  phraseId: number,
): Promise<DbFootnote | undefined> {
  const result = await query<DbFootnote>(
    `
      select 
        content,
        timestamp,
        author_id as "authorId",
        phrase_id as "phraseId"
      from footnote
      where phrase_id = $1
    `,
    [phraseId],
  );

  return result.rows[0];
}
