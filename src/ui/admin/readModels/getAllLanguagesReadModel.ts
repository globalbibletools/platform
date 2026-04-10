import { getDb } from "@/db";

export interface LanguageReadModel {
  id: string;
  code: string;
  englishName: string;
  localName: string;
}

export async function getAllLanguagesReadModel(): Promise<
  Array<LanguageReadModel>
> {
  const result = await getDb()
    .selectFrom("language")
    .select([
      "id",
      "code",
      "english_name as englishName",
      "local_name as localName",
    ])
    .orderBy("english_name")
    .execute();

  return result;
}
