import { query } from "@/db";
import { DbLanguage, DbLanguageRole } from "../data-access/types";

export async function findLanguageByCode(
  code: string,
): Promise<DbLanguage | undefined> {
  const result = await query<DbLanguage>(
    `
        select id, code, english_name, local_name, font,
          text_direction as "textDirection",
          coalesce(translation_ids, '{}') as "translationIds",
          reference_language_id as "referenceLanguageId"
        from language
        where code = $1
    `,
    [code],
  );
  return result.rows[0];
}

export async function findLanguageRolesForUser(
  userId: string,
): Promise<DbLanguageRole[]> {
  const result = await query<DbLanguageRole>(
    `
        select language_id as "languageId", user_id as "userId", role
        from language_member_role
        where user_id = $1
    `,
    [userId],
  );
  return result.rows;
}

export async function findLanguageRolesForLanguage(
  languageId: string,
): Promise<DbLanguageRole[]> {
  const result = await query<DbLanguageRole>(
    `
        select language_id as "languageId", user_id as "userId", role
        from language_member_role
        where language_id = $1
    `,
    [languageId],
  );
  return result.rows;
}
