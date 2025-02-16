import { query } from "@/db";
import { Language } from "../model";

const languageRepository = {
  async existsByCode(code: string): Promise<boolean> {
    const result = await query(`select 1 from language where code = $1`, [
      code,
    ]);

    return result.rows.length > 0;
  },

  async create(language: Language): Promise<void> {
    await query(
      `
        INSERT INTO language (id, code, name)
        VALUES ($1, $2, $3)
      `,
      [language.id, language.code, language.name],
    );
  },

  async update(language: Omit<Language, "id">): Promise<void> {
    await query(
      `
        update language set
          name = $2,
          font = $3,
          text_direction = $4,
          translation_ids = $5::text[]
        where code = $1
      `,
      [
        language.code,
        language.name,
        language.font,
        language.textDirection,
        language.translationIds,
      ],
    );
  },
};
export default languageRepository;
