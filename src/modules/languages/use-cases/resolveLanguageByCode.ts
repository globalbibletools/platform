import { query } from "@/db";
import { TextDirectionRaw } from "../model";

export interface ResolvedLanguage {
  id: string;
  code: string;
  name: string;
  textDirection: TextDirectionRaw;
}

export async function resolveLanguageByCode(
  code: string,
): Promise<ResolvedLanguage | undefined> {
  const result = await query<ResolvedLanguage>(
    `
      select id,
             code,
             local_name as name,
             text_direction as "textDirection"
      from language
      where code = $1
      limit 1
    `,
    [code],
  );

  return result.rows[0];
}
