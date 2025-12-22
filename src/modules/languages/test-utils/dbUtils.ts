import { getDb, query } from "@/db";
import { DbLanguage } from "../data-access/types";

export async function findLanguageByCode(
  code: string,
): Promise<DbLanguage | undefined> {
  const result = await query<DbLanguage>(
    `
        select id, code, name, font,
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

export async function findLanguageMembersForUser(userId: string) {
  const result = await getDb()
    .selectFrom("language_member")
    .where("user_id", "=", userId)
    .orderBy("language_id")
    .selectAll()
    .execute();
  return result;
}

export async function findLanguageMembersForLanguage(languageId: string) {
  const result = await getDb()
    .selectFrom("language_member")
    .where("language_id", "=", languageId)
    .orderBy("language_id")
    .selectAll()
    .execute();
  return result;
}
