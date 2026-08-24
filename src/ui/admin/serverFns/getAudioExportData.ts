import { sql } from "kysely";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getDb } from "@/db";
import { createServerFn } from "@tanstack/react-start";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export interface AudioExportJob {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  speaker: string;
  bookIds: number[];
}

export interface RecordingReadModel {
  id: string;
  name: string;
  testament: string;
}

export interface BookReadModel {
  id: number;
  name: string;
}

export const getAudioExportData = createServerFn()
  .middleware([
    createPolicyMiddleware({
      policy,
    }),
  ])
  .handler(async () => {
    const [latestJob, recordings, books] = await Promise.all([
      getLatestAudioExportJob(),
      getRecordings(),
      getBooks(),
    ]);

    return { latestJob, recordings, books };
  });

async function getLatestAudioExportJob(): Promise<AudioExportJob | undefined> {
  const row = await getDb()
    .selectFrom("job")
    .where("type", "=", "export_audio_resources")
    .orderBy("created_at", "desc")
    .select([
      "id",
      "status",
      "created_at as createdAt",
      "updated_at as updatedAt",
      (eb) =>
        sql<string>`(${eb.ref("job.payload")}->'speakers'->0->>'speaker')`.as(
          "speaker",
        ),
      (eb) =>
        sql<number[]>`(${eb.ref("job.payload")}->'speakers'->0->'bookIds')`.as(
          "bookIds",
        ),
    ])
    .limit(1)
    .executeTakeFirst();

  if (!row) return undefined;

  return row;
}

async function getRecordings(): Promise<RecordingReadModel[]> {
  return getDb()
    .selectFrom("recording")
    .select(["id", "name", "testament"])
    .orderBy("name")
    .execute();
}

async function getBooks(): Promise<BookReadModel[]> {
  return getDb()
    .selectFrom("book")
    .select(["id", "name"])
    .orderBy("id")
    .execute();
}
