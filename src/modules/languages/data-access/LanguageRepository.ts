import { query } from "@/db";
import { Language } from "../model";

const languageRepository = {
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
          id, code, name, font,
          text_direction as "textDirection",
          translation_ids as "translationIds",
          gt_source_lang as "gtSourceLanguage"
        from language
        where code = $1
      `,
      [code],
    );

    return result.rows[0];
  },

  async create(
    language: Pick<Language, "id" | "code" | "name">,
  ): Promise<void> {
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
          translation_ids = $5::text[],
          gt_source_lang = $6
        where code = $1
      `,
      [
        language.code,
        language.name,
        language.font,
        language.textDirection,
        language.translationIds,
        language.gtSourceLanguage,
      ],
    );
  },
};
export default languageRepository;
