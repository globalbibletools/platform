import { logger } from "@/logging";
import bookKeys from "@/data/book-keys.json";
import { ZipArchive } from "archiver";
import { ExportAudioResourcesJob } from "./ExportAudioResourceJob";
import { exportStorageRepository } from "../data-access/exportStorageRepository";
import { Logger } from "pino";
import { getDb } from "@/db";

export async function exportAudioResourcesHandler(
  job: ExportAudioResourcesJob,
) {
  const jobLogger = logger.child({
    job: {
      id: job.id,
      type: job.type,
    },
  });

  for (const speaker of job.payload.speakers) {
    for (const bookId of speaker.bookIds) {
      await uploadTimingsForBook({
        speaker: speaker.speaker,
        bookId,
        logger: jobLogger,
      });

      await zipBookDirectory({
        speaker: speaker.speaker,
        bookId,
        logger: jobLogger,
      });

      // TODO: update manifest data
    }
  }

  // TODO: write new manifest
}

async function uploadTimingsForBook({
  speaker,
  bookId,
  logger,
}: {
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
    key: `audio/v1/${speaker}/${bookCode}/timings.bin`,
    source: Buffer.from(bytes.buffer),
    type: "application/octet-stream",
  });

  logger.info(
    { speaker, bookId, bookCode, count: timings.length },
    "Uploaded audio timings",
  );
}

async function zipBookDirectory({
  speaker,
  bookId,
  logger,
}: {
  speaker: string;
  bookId: number;
  logger: Logger;
}) {
  const bookCode = bookKeys[bookId - 1];
  const prefix = `audio/v1/${speaker}/${bookCode}/`;

  const archive = new ZipArchive();
  let fileCount = 0;

  for await (const { key, body } of exportStorageRepository.streamFiles({
    prefix,
  })) {
    const relativePath = key.slice(prefix.length);
    archive.append(body, { name: `${bookCode}/${relativePath}` });
    fileCount += 1;
  }

  archive.finalize();

  await exportStorageRepository.uploadZip({
    key: `audio/v1/${speaker}/${bookCode}.zip`,
    archive,
  });

  logger.info(
    { speaker, bookId, bookCode, fileCount },
    "Uploaded audio book zip",
  );
}
