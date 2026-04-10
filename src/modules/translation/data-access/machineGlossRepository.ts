import { copyStreamV2, getDb } from "@/db";
import { Readable } from "stream";

interface StreamedMachineGloss {
  wordId: string;
  gloss: string;
}

export const machineGlossRepository = {
  async updateAllForLanguage({
    languageId,
    modelCode,
    stream,
  }: {
    languageId: string;
    modelCode: string;
    stream: Readable;
  }): Promise<void> {
    const model = await getDb()
      .selectFrom("machine_gloss_model")
      .select("id")
      .where("code", "=", modelCode)
      .executeTakeFirstOrThrow();

    await getDb()
      .deleteFrom("machine_gloss")
      .where("language_id", "=", languageId)
      .execute();

    await copyStreamV2<StreamedMachineGloss, "machine_gloss">({
      table: "machine_gloss",
      stream,
      fields: {
        word_id: (record) => record.wordId,
        language_id: () => languageId,
        model_id: () => model.id.toString(),
        gloss: (record) => record.gloss,
      },
    });
  },
};
