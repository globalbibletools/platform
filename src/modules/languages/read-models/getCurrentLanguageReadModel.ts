import { getDb } from "@/db";
import { sql } from "kysely";
import { MachineGlossStrategy } from "../model";

export interface CurrentLanguageReadModel {
  code: string;
  localName: string;
  englishName: string;
  font: string;
  textDirection: string;
  translationIds: string[];
  referenceLanguage: string | null;
  isMember: boolean;
  machineGlossStrategy: MachineGlossStrategy;
}

export async function getCurrentLanguageReadModel(
  languageCode: string,
  userId?: string,
): Promise<CurrentLanguageReadModel | null> {
  const result = await getDb()
    .selectFrom("language as l")
    .where("code", "=", languageCode)
    .select(({ selectFrom, lit, exists, fn }) => [
      "code",
      "english_name as englishName",
      "local_name as localName",
      "font",
      "text_direction as textDirection",
      fn
        .coalesce("translation_ids", sql<string[]>`'{}'::text[]`)
        .as("translationIds"),
      selectFrom("language as ref_l")
        .whereRef("ref_l.id", "=", "l.reference_language_id")
        .select("ref_l.code as referenceLanguage")
        .as("referenceLanguage"),
      userId ?
        exists(
          selectFrom("language_member")
            .whereRef("language_id", "=", "l.id")
            .where("user_id", "=", userId),
        ).as("isMember")
      : lit(false).as("isMember"),
      "machine_gloss_strategy as machineGlossStrategy",
    ])
    .executeTakeFirst();

  if (!result) {
    return null;
  }

  return {
    ...result,
    // Have to coerce this to a bool since the database type is boolean | number.
    isMember: Boolean(result.isMember),
  };
}
