import { getDb } from "@/db";

export interface UpsertAIGlossLanguageInput {
  code: string;
  name: string;
}

export const aiGlossLanguageRepository = {
  async upsertAll(languages: Array<UpsertAIGlossLanguageInput>): Promise<void> {
    if (languages.length === 0) {
      return;
    }

    await getDb()
      .insertInto("ai_gloss_language")
      .values(languages)
      .onConflict((oc) =>
        oc.column("code").doUpdateSet((eb) => ({
          name: eb.ref("excluded.name"),
        })),
      )
      .execute();
  },
};
