import { getDb } from "@/db";

export interface AIGlossImportLanguageReadModel {
  code: string;
  name: string;
}

export async function getAIGlossImportLanguagesReadModel(): Promise<
  Array<AIGlossImportLanguageReadModel>
> {
  return getDb()
    .selectFrom("ai_gloss_language")
    .select(["code", "name"])
    .orderBy("name")
    .execute();
}
