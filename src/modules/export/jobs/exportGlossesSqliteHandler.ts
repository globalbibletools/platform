import { logger } from "@/logging";
import { ExportGlossesSqliteJob } from "./ExportGlossesSqliteJob";
import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";
import { resolveLanguageByCode } from "@/modules/languages";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import { AppGlossRepository } from "../data-access/AppGlossRepository";
import { exportStorageRepository } from "../data-access/exportStorageRepository";
import {
  glossesSqliteExportRepository,
  GlossDbExportRow,
} from "../data-access/glossesSqliteExportRepository";

export async function exportGlossesSqliteHandler(job: ExportGlossesSqliteJob) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  const { languageCodes } = job.payload;

  for (const languageCode of languageCodes) {
    const language = await resolveLanguageByCode(languageCode);
    if (!language) {
      jobLogger.error({ languageCode }, "Could not find language to export");
      continue;
    }

    const buffer = await createSqliteDb(language.id);

    const archive = new ZipArchive();
    archive.append(buffer, { name: `${languageCode}.db` });
    archive.finalize();

    const { key, size, sha256 } = await exportStorageRepository.uploadZip({
      key: `glosses/v1/${languageCode}.db.zip`,
      archive,
    });

    await glossesSqliteExportRepository.upsertGlossDbExport({
      languageId: language.id,
      s3Key: key,
      sha256,
      size,
      updatedAt: new Date(),
    });

    jobLogger.info(
      { languageCode },
      `Finished exporting glosses SQLite for language ${languageCode}`,
    );
  }

  jobLogger.info(
    { languageCount: languageCodes.length },
    "Glosses SQLite export complete",
  );

  await uploadGlossesManifest();
}

async function uploadGlossesManifest(): Promise<void> {
  const manifestStream = Readable.from(
    manifestLines(glossesSqliteExportRepository.streamGlossDbExports()),
  );

  await exportStorageRepository.upload({
    key: "glosses/v1/manifest.jsonl",
    source: manifestStream,
    type: "application/jsonl",
  });
}

async function* manifestLines(
  rows: AsyncIterableIterator<GlossDbExportRow>,
): AsyncGenerator<string> {
  for await (const row of rows) {
    yield JSON.stringify({
      id: row.code,
      updatedAt: row.updatedAt.toISOString(),
      sha256: row.sha256,
      size: row.size,
      url: row.s3Key,
      resourceName: row.localName,
    }) + "\n";
  }
}

async function createSqliteDb(languageId: string): Promise<Buffer> {
  const appGlossRepository = new AppGlossRepository();

  const glossStream = streamGlossesForLanguage(languageId);

  let nextTextId = 1;
  const textIdMap = new Map<string, number>();

  await pipeline(
    glossStream,
    async function* (stream) {
      for await (const row of stream) {
        if (!row.gloss) continue;

        let textId = textIdMap.get(row.gloss);
        if (!textId) {
          textId = nextTextId;
          nextTextId += 1;
          textIdMap.set(row.gloss, textId);
        }

        // Early versions of the gloss database used an _id column that was an integer.
        // That is no longer compatible now that wordIds are not necessarily numbers.
        // We keep writing to this column for backwards compatibility with older app versions.
        const legacyWordId = row.wordId.includes("-") ? undefined : row.wordId;

        yield {
          _id: legacyWordId,
          text: textId,
          wordId: row.wordId,
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
