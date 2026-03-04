import { getDb } from "@/db";
import type { Selectable } from "kysely";
import type { LanguageMemberTable, LanguageTable } from "../db/schema";

export async function findLanguageByCode(
  code: string,
): Promise<Selectable<LanguageTable> | undefined> {
  return getDb()
    .selectFrom("language")
    .selectAll()
    .where("code", "=", code)
    .executeTakeFirst();
}

export async function findLanguageMembersForUser(
  userId: string,
): Promise<Selectable<LanguageMemberTable>[]> {
  return getDb()
    .selectFrom("language_member")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("language_id")
    .execute();
}

export async function findLanguageMembersForLanguage(
  languageId: string,
): Promise<Selectable<LanguageMemberTable>[]> {
  return getDb()
    .selectFrom("language_member")
    .selectAll()
    .where("language_id", "=", languageId)
    .orderBy("user_id")
    .execute();
}
