import { getDb } from "@/db";

export interface ReadLanguageReadModel {
  code: string;
  englishName: string;
  localName: string;
}

export async function getReadLanguagesReadModel(): Promise<
  Array<ReadLanguageReadModel>
> {
  const result = await getDb()
    .selectFrom("language")
    .select(["code", "english_name as englishName", "local_name as localName"])
    .orderBy("local_name")
    .execute();

  return result;
}
