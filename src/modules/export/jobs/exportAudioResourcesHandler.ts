import { logger } from "@/logging";
import bookKeys from "@/data/book-keys.json";
import { ZipArchive } from "archiver";
import { Readable } from "stream";
import { ExportAudioResourcesJob } from "./ExportAudioResourceJob";
import { exportStorageRepository } from "../data-access/exportStorageRepository";
import {
  audioBookExportRepository,
  AudioBookExportRow,
} from "../data-access/audioBookExportRepository";
import { Logger } from "pino";
import { getDb } from "@/db";
import { once } from "events";
import { Testament, TestamentName } from "@/modules/bible-core/types";

export async function exportAudioResourcesHandler(
  job: ExportAudioResourcesJob,
) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  const updatedAt = new Date();

  for (const speaker of job.payload.speakers) {
    const testament = await getTestament(speaker.speaker);

    for (const bookId of speaker.bookIds) {
      await uploadTimingsForBook({
        testament,
        speaker: speaker.speaker,
        bookId,
        logger: jobLogger,
      });

      const result = await zipBookDirectory({
        testament,
        speaker: speaker.speaker,
        bookId,
        logger: jobLogger,
      });

      await audioBookExportRepository.upsertAudioBookExport({
        recordingId: speaker.speaker,
        bookId,
        s3Key: result.key,
        sha256: result.sha256,
        size: result.size,
        updatedAt,
      });
    }
  }

  await uploadAudioManifest();
}

async function uploadAudioManifest(): Promise<void> {
  const manifestStream = Readable.from(
    manifestLines(audioBookExportRepository.streamAudioBookExports()),
  );

  await exportStorageRepository.upload({
    key: "audio/v1/manifest.jsonl",
    source: manifestStream,
    type: "application/jsonl",
  });
}

async function* manifestLines(
  rows: AsyncIterableIterator<AudioBookExportRow>,
): AsyncGenerator<string> {
  // Rows are ordered by recording_id then book_id, so consecutive rows with
  // the same recording_id form one speaker group. Emit a parent resource for
  // the speaker, followed by a child resource for each exported book.
  let currentRecording: string | null = null;
  let group: AudioBookExportRow[] = [];

  const flush = function* (): Generator<string> {
    if (group.length === 0) return;

    const testament = group[0].testament as Testament;
    const recordingId = `${testament}/${group[0].recordingId}`;
    const recordingName = group[0].recordingName || recordingId;

    yield JSON.stringify({
      id: recordingId,
      resourceName: recordingName,
    }) + "\n";

    for (const row of group) {
      const bookCode = bookKeys[row.bookId - 1];
      yield JSON.stringify({
        id: `${recordingId}/${bookCode}`,
        resourceName: row.bookName,
        updatedAt: row.updatedAt.toISOString(),
        sha256: row.sha256,
        size: row.size,
        url: row.s3Key,
      }) + "\n";
    }
  };

  // Emit the testament resource groups first.
  yield JSON.stringify({
    id: Testament.OldTestament,
    resourceName: "Old Testament",
  }) + "\n";
  yield JSON.stringify({
    id: Testament.NewTestament,
    resourceName: "New Testament",
  }) + "\n";

  for await (const row of rows) {
    if (currentRecording !== row.recordingId) {
      yield* flush();
      group = [];
      currentRecording = row.recordingId;
    }
    group.push(row);
  }
  yield* flush();
}

async function getTestament(speaker: string): Promise<Testament> {
  const row = await getDb()
    .selectFrom("recording")
    .where("id", "=", speaker)
    .select("testament")
    .executeTakeFirstOrThrow();

  return row.testament;
}

async function uploadTimingsForBook({
  testament,
  speaker,
  bookId,
  logger,
}: {
  testament: Testament;
  speaker: string;
  bookId: number;
  logger: Logger;
}) {
  const timings = await getDb()
    .selectFrom("verse_audio_timing as t")
    .innerJoin("verse as v", "v.id", "t.verse_id")
    .where("t.recording_id", "=", speaker)
    .where("v.book_id", "=", bookId)
    .where("t.start", "is not", null)
    .select([
      "v.chapter as chapter",
      "v.number as verse",
      (eb) => eb.ref("t.start").$notNull().as("start"),
      "t.end as end",
    ])
    .orderBy("v.chapter")
    .orderBy("v.number")
    .execute();

  const NO_END = 0xffffffff;

  const bytes = new DataView(new ArrayBuffer(timings.length * 11));
  for (let i = 0; i < timings.length; i++) {
    const timing = timings[i];
    const offset = i * 11;

    bytes.setUint8(offset, bookId);
    bytes.setUint8(offset + 1, timing.chapter);
    bytes.setUint8(offset + 2, timing.verse);
    bytes.setUint32(offset + 3, Math.trunc(timing.start * 100));
    bytes.setUint32(
      offset + 7,
      timing.end == null ? NO_END : Math.trunc(timing.end * 100),
    );
  }

  const bookCode = bookKeys[bookId - 1];
  await exportStorageRepository.upload({
    key: `audio/v1/${testament}/${speaker}/${bookCode}/timings.bin`,
    source: Buffer.from(bytes.buffer),
    type: "application/octet-stream",
  });

  logger.info(
    { speaker, bookId, bookCode, count: timings.length },
    "Uploaded audio timings",
  );
}

async function zipBookDirectory({
  testament,
  speaker,
  bookId,
  logger,
}: {
  testament: Testament;
  speaker: string;
  bookId: number;
  logger: Logger;
}) {
  const bookCode = bookKeys[bookId - 1];
  const prefix = `audio/v1/${testament}/${speaker}/${bookCode}/`;

  const archive = new ZipArchive();
  let fileCount = 0;

  archive.on("warning", function (err) {
    if (err.code === "ENOENT") {
      logger.warn(`Error in zip file: ${err}`);
    } else {
      logger.error(`Error in zip file: ${err}`);
      throw err;
    }
  });
  archive.on("error", function (err) {
    logger.error(`Error in zip file: ${err}`);
    throw err;
  });

  // Start the upload stream to put it in a flowing state,
  // since it is pulling from the archive stream
  const upload = exportStorageRepository.uploadZip({
    key: `audio/v1/${testament}/${speaker}/${bookCode}.zip`,
    archive,
  });

  // Loop over each file in the in directory,
  // blocking until each is read into the archive stream
  for await (const { key, body } of exportStorageRepository.streamFiles({
    prefix,
  })) {
    const relativePath = key.slice(prefix.length);

    archive.append(body, { name: `${bookCode}/${relativePath}` });
    await once(archive, "entry");

    fileCount += 1;
    logger.info(`Appended file: ${bookCode}/${relativePath}`);
  }

  logger.info(`Added ${fileCount} files`);

  // Nothing more to add.
  // Finalize the archive, and wait for the upload to finish.
  await archive.finalize();
  const result = await upload;

  logger.info(
    { speaker, bookId, bookCode, fileCount },
    "Uploaded audio book zip",
  );

  return result;
}
