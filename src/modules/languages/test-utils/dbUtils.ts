import { getDb } from "@/db";
import { DbLanguage } from "../data-access/types";
import { sql } from "kysely";

export async function findLanguageByCode(
  code: string,
): Promise<DbLanguage | undefined> {
  const query = getDb()
    .selectFrom("language")
    .where("code", "=", code)
    .select((eb) => [
      "id",
      "code",
      "english_name as englishName",
      "local_name as localName",
      "font",
      "text_direction as textDirection",
      eb.fn
        .coalesce("translation_ids", sql<string[]>`'{}'`)
        .as("translationIds"),
      "reference_language_id as referenceLanguageId",
      "machine_gloss_strategy as machineGlossStrategy",
    ]);
  return query.executeTakeFirst();
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
