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
};
export default glossRepository;
