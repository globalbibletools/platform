import { getDb } from "@/db";
import { sql } from "kysely";

export interface LanguageSettingsReadModel {
  englishName: string;
  localName: string;
  code: string;
  font: string;
  textDirection: string;
  translationIds: string[];
  referenceLanguageId: string | null;
}

export async function getLanguageSettingsReadModel(
  code: string,
): Promise<LanguageSettingsReadModel | null> {
  const result = await getDb()
    .selectFrom("language")
    .where("code", "=", code)
    .select((eb) => [
      "english_name as englishName",
      "local_name as localName",
      "code",
      "font",
      "text_direction as textDirection",
      eb.fn
        .coalesce("translation_ids", sql<string[]>`'{}'`)
        .as("translationIds"),
      "reference_language_id as referenceLanguageId",
    ])
    .executeTakeFirst();

  return result ?? null;
}
