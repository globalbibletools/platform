import { copyStream, getDb } from "@/db";
import { Readable, Transform } from "stream";

export interface StreamedMachineGloss {
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
    const words = await getDb().selectFrom("word").select("id").execute();
    const wordIdSet = buildWordIdsSet(words);

    const model = await getDb()
      .selectFrom("machine_gloss_model")
      .select("id")
      .where("code", "=", modelCode)
      .executeTakeFirstOrThrow();

    await getDb()
      .deleteFrom("machine_gloss")
      .where("language_id", "=", languageId)
      .execute();

    await copyStream<StreamedMachineGloss, "machine_gloss">({
      table: "machine_gloss",
      stream: stream.pipe(new FilterMissingWordsTransform(wordIdSet)),
      fields: {
        word_id: (record) => record.wordId,
        language_id: () => languageId,
        model_id: () => model.id.toString(),
        gloss: (record) => record.gloss,
      },
    });
  },
};

export class FilterMissingWordsTransform extends Transform {
  constructor(private readonly existingWordIds: ReadonlySet<number>) {
    super({
      writableObjectMode: true,
      readableObjectMode: true,
    });
  }

  override _transform(
    chunk: StreamedMachineGloss | Array<StreamedMachineGloss>,
    _encoding: BufferEncoding,
    cb: (error?: Error | null) => void,
  ) {
    const records = Array.isArray(chunk) ? chunk : [chunk];
    const filteredRecords = records.filter((record) =>
      this.existingWordIds.has(normalizeWordIdToNumber(record.wordId)),
    );

    if (filteredRecords.length === 0) {
      cb();
      return;
    }

    this.push(filteredRecords);
    cb();
  }
}

function buildWordIdsSet(words: Array<{ id: string }>): Set<number> {
  const set = new Set<number>();
  for (const { id } of words) {
    const normalized = normalizeWordIdToNumber(id);
    if (!Number.isNaN(normalized)) {
      set.add(normalized);
    }
  }
  return set;
}

export function normalizeWordIdToNumber(wordId: string): number {
  if (wordId.includes("-")) {
    return Number(wordId.replaceAll("-", ""));
  } else {
    return Number(wordId);
  }
}
