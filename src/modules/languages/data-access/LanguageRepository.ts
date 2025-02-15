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
};
export default languageRepository;
