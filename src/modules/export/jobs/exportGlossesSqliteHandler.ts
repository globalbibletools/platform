import { logger } from "@/logging";
import { ExportGlossesSqliteJob } from "./ExportGlossesSqliteJob";
import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";
import { resolveLanguageByCode } from "@/modules/languages";
import { Logger } from "pino";
import { pipeline } from "stream/promises";
import { AppGlossRepository } from "../data-access/AppGlossRepository";
import { exportStorageRepository } from "../data-access/exportStorageRepository";

export async function exportGlossesSqliteHandler(job: ExportGlossesSqliteJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  const { languageCodes } = job.payload;

  for (const languageCode of languageCodes) {
    const buffer = await createSqliteDb(languageCode, jobLogger);
    if (buffer) {
      await exportStorageRepository.uploadZip({
        key: `glosses/v1/${languageCode}.db.zip`,
        source: buffer,
        fileName: `${languageCode}.db`,
      });
    }

    jobLogger.info(
      { languageCode },
      `Finished exporting glosses SQLite for language ${languageCode}`,
    );
  }

  jobLogger.info(
    { languageCount: languageCodes.length },
    "Glosses SQLite export complete",
  );
}

async function createSqliteDb(
  languageCode: string,
  logger: Logger,
): Promise<Buffer | undefined> {
  const language = await resolveLanguageByCode(languageCode);

  if (!language) {
    logger.error({ languageCode }, "Could not find language to export");
    return;
  }

  const appGlossRepository = new AppGlossRepository();

  const glossStream = streamGlossesForLanguage(language.id);

  let nextTextId = 1;
  const textIdMap = new Map<string, number>();

  await pipeline(
    glossStream,
    async function* (stream) {
      for await (const row of stream) {
        if (!row.gloss) continue;

        // The database format does not support word ids with hyphens yet,
        // so we skip these for now.
        if (row.wordId.includes("-")) continue;

        let textId = textIdMap.get(row.gloss);
        if (!textId) {
          textId = nextTextId;
          nextTextId += 1;
          textIdMap.set(row.gloss, textId);
        }

        yield {
          _id: row.wordId,
          text: textId,
        };
      }
    },
    appGlossRepository.getVerseWritableStream(),
  );

  await pipeline(async function* () {
    for (const [text, _id] of textIdMap.entries()) {
      yield { _id, text };
    }
  }, appGlossRepository.getTextWritableStream());

  return appGlossRepository.serialize();
}

interface GlossExportRow {
  wordId: string;
  gloss: string | null;
}

function streamGlossesForLanguage(
  languageId: string,
): AsyncIterableIterator<GlossExportRow> {
  return getDb()
    .with("completed_books", (db) =>
      db
        .selectFrom("book_completion")
        .where("language_id", "=", languageId)
        .where("completed_at", "is not", null)
        .select("book_id"),
    )
    .with("gloss_word", (db) =>
      db
        .selectFrom("phrase_word as pw")
        .innerJoin("phrase as ph", "ph.id", "pw.phrase_id")
        .innerJoin("gloss as g", "g.phrase_id", "ph.id")
        .innerJoin("book_word_map as w", "w.word_id", "pw.word_id")
        .innerJoin("completed_books as b", "b.book_id", "w.book_id")
        .where("ph.language_id", "=", languageId)
        .where("ph.deleted_at", "is", null)
        .where("g.state", "=", GlossStateRaw.Approved)
        .select(["pw.word_id", "g.gloss"]),
    )
    .selectFrom("word")
    .leftJoin("gloss_word", "gloss_word.word_id", "word.id")
    .select(["word.id as wordId", "gloss_word.gloss"])
    .orderBy("word.id")
    .stream();
}
