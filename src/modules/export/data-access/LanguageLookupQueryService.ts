import { query } from "@/db";
import { TextDirectionRaw } from "@/modules/languages/model";

export interface ExportLanguageRow {
  id: string;
  code: string;
  name: string;
  textDirection: TextDirectionRaw;
}

const languageLookupQueryService = {
  async findByCode(code: string): Promise<ExportLanguageRow | undefined> {
    const result = await query<ExportLanguageRow>(
      `
        select id,
               code,
               name,
               text_direction as "textDirection"
        from language
        where code = $1
        limit 1
      `,
      [code],
    );
    return result.rows[0];
  },
};

export default languageLookupQueryService;
