import { getDb } from "@/db";

export interface LanguageReadModel {
  code: string;
  englishName: string;
}

export async function getLanguagesReadModel(): Promise<
  Array<LanguageReadModel>
> {
  const query = getDb()
    .selectFrom("language")
    .select(["code", "english_name as englishName"])
    .orderBy("english_name");

  return query.execute();
}
