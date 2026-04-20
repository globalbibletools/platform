import { getDb } from "@/db";

export interface CurrentReadLanguageReadModel {
  code: string;
  localName: string;
  englishName: string;
  font: string;
  textDirection: string;
}

export async function getCurrentReadLanguageReadModel(
  code: string,
): Promise<CurrentReadLanguageReadModel | undefined> {
  const result = await getDb()
    .selectFrom("language")
    .where("code", "=", code)
    .select([
      "code",
      "local_name as localName",
      "english_name as englishName",
      "font",
      "text_direction as textDirection",
    ])
    .executeTakeFirst();

  return result;
}
