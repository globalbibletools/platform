import { getDb } from "@/db";

export interface LanguageByCodeReadModel {
  id: string;
  code: string;
  englishName: string;
  localName: string;
}

export async function getLanguageByCodeReadModel(
  code: string,
): Promise<LanguageByCodeReadModel | null> {
  const result = await getDb()
    .selectFrom("language")
    .where("code", "=", code)
    .select([
      "id",
      "code",
      "english_name as englishName",
      "local_name as localName",
    ])
    .executeTakeFirst();

  return result ?? null;
}
