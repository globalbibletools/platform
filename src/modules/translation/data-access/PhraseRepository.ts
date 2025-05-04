import { query } from "@/db";

interface Phrase {
  id: number;
  languageCode: string;
  wordIds: string[];
  createdAt: Date;
  createdBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

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
          updated_at as "updatedAt",
          updated_by as "updatedBy"
        from phrase
        where id = $1
      `,
      [id],
    );

    return result.rows[0];
  },
};
export default phraseRepository;
