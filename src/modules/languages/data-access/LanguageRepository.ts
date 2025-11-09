import { query } from "@/db";
import { Language } from "../model";

const languageRepository = {
  async existsById(id: string): Promise<boolean> {
    const result = await query(`select 1 from language where id = $1`, [id]);

    return result.rows.length > 0;
  },

  async existsByCode(code: string): Promise<boolean> {
    const result = await query(`select 1 from language where code = $1`, [
      code,
    ]);

    return result.rows.length > 0;
  },

  async findByCode(code: string): Promise<Language | undefined> {
    const result = await query<Language>(
      `
        select
          id, code, english_name, local_name, font,
          text_direction as "textDirection",
          translation_ids as "translationIds",
          reference_language_id as "referenceLanguage"
        from language
        where code = $1
      `,
      [code],
    );

    return result.rows[0];
  },

  async create(
    language: Pick<Language, "id" | "code" | "english_name" | "local_name">,
  ): Promise<void> {
    await query(
      `
        INSERT INTO language (id, code, english_name, local_name)
        VALUES ($1, $2, $3, $4)
      `,
      [language.id, language.code, language.english_name, language.local_name],
    );
  },

  async update(language: Omit<Language, "id">): Promise<void> {
    await query(
      `
        update language set
          english_name = $2,
          font = $3,
          text_direction = $4,
          translation_ids = $5::text[],
          reference_language_id = $6,
          local_name = $7
        where code = $1
      `,
      [
        language.code,
        language.english_name,
        language.font,
        language.textDirection,
        language.translationIds,
        language.referenceLanguageId,
        language.local_name,
      ],
    );
  },
};
export default languageRepository;
