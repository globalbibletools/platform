import { copyStreamV2, getDb } from "@/db";
import { Readable } from "stream";

interface StreamedMachineGloss {
  wordId: string;
  gloss: string;
}

export const machineGlossRepository = {
  async updateAllForLanguage({
    languageId,
    stream,
  }: {
    languageId: string;
    stream: Readable;
  }): Promise<void> {
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
        gloss: (record) => record.gloss,
      },
    });
  },
};
