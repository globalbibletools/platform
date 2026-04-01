import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, expect, test, vitest } from "vitest";
import { enqueueJob } from "@/shared/jobs/__mocks__/enqueueJob";
import { Job, JobStatus } from "@/shared/jobs/model";
import { ulid } from "@/shared/ulid";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { phraseFactory } from "@/modules/translation/test-utils/phraseFactory";
import { GlossStateRaw } from "@/modules/translation/types";
import { getDb } from "@/db";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import { exportGlossesChildJob } from "./exportGlossesChildJob";
import { githubExportService } from "../data-access/githubExportService";

vitest.mock("@/shared/jobs/enqueueJob");
vitest.mock("../data-access/githubExportService", () => ({
  githubExportService: {
    createBlob: vitest.fn(),
  },
}));

initializeDatabase();

const mockedCreateBlob = vitest.mocked(githubExportService.createBlob);

beforeEach(() => {
  mockedCreateBlob.mockReset().mockResolvedValue({
    path: "eng/37-Hag.json",
    mode: "100644",
    type: "blob",
    sha: "blob-sha",
  });
  enqueueJob.mockReset();
  enqueueJob.mockResolvedValue({ id: ulid() } as any);
});

test("creates blobs for Haggai glosses and then enqueues the finalize job", async () => {
  const { language } = await languageFactory.build();
  await phraseFactory.build({
    languageId: language.id,
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "test gloss",
      updated_at: new Date(),
    },
  });

  const parentJobId = ulid();

  const job: Job<{ languageCode: string }> = {
    id: ulid(),
    parentJobId,
    type: EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD,
    status: JobStatus.Pending,
    payload: {
      languageCode: language.code,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await getDb()
    .insertInto("job")
    .values([
      {
        id: parentJobId,
        type: EXPORT_JOB_TYPES.EXPORT_GLOSSES,
        status: JobStatus.Complete,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: job.id,
        parent_job_id: parentJobId,
        type: job.type,
        status: job.status,
        payload: job.payload,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      },
    ])
    .execute();

  await exportGlossesChildJob(job);

  const expectedBook = {
    id: 37,
    name: "Hag",
    chapters: [
      {
        id: 1,
        verses: [
          {
            id: "37001001",
            words: [{ id: "3700100101", gloss: "test gloss" }],
          },
          { id: "37001002", words: [] },
          { id: "37001003", words: [] },
          { id: "37001004", words: [] },
          { id: "37001005", words: [] },
          { id: "37001006", words: [] },
          { id: "37001007", words: [] },
          { id: "37001008", words: [] },
          { id: "37001009", words: [] },
          { id: "37001010", words: [] },
          { id: "37001011", words: [] },
          { id: "37001012", words: [] },
          { id: "37001013", words: [] },
          { id: "37001014", words: [] },
          { id: "37001015", words: [] },
        ],
      },
      {
        id: 2,
        verses: [
          { id: "37002001", words: [] },
          { id: "37002002", words: [] },
          { id: "37002003", words: [] },
          { id: "37002004", words: [] },
          { id: "37002005", words: [] },
          { id: "37002006", words: [] },
          { id: "37002007", words: [] },
          { id: "37002008", words: [] },
          { id: "37002009", words: [] },
          { id: "37002010", words: [] },
          { id: "37002011", words: [] },
          { id: "37002012", words: [] },
          { id: "37002013", words: [] },
          { id: "37002014", words: [] },
          { id: "37002015", words: [] },
          { id: "37002016", words: [] },
          { id: "37002017", words: [] },
          { id: "37002018", words: [] },
          { id: "37002019", words: [] },
          { id: "37002020", words: [] },
          { id: "37002021", words: [] },
          { id: "37002022", words: [] },
          { id: "37002023", words: [] },
        ],
      },
    ],
  };

  const updatedJob = await getDb()
    .selectFrom("job")
    .where("id", "=", job.id)
    .select(["id", "status", "parent_job_id as parentJobId", "data"])
    .executeTakeFirst();
  expect(updatedJob).toEqual({
    id: job.id,
    status: JobStatus.Pending,
    parentJobId,
    data: {
      treeItems: [
        {
          path: `${language.code}/37-Hag.json`,
          mode: "100644",
          type: "blob",
          sha: "blob-sha",
        },
      ],
    },
  });
  expect(mockedCreateBlob).toHaveBeenCalledExactlyOnceWith({
    path: `${language.code}/37-Hag.json`,
    content: JSON.stringify(expectedBook, null, 2),
  });
  expect(enqueueJob).toHaveBeenCalledExactlyOnceWith(
    EXPORT_JOB_TYPES.EXPORT_GLOSSES_FINALIZE,
    {},
    {
      parentJobId,
    },
  );
});

test("doesn't enqueue the finalize job if there are other child jobs are in progress", async () => {
  const { language } = await languageFactory.build();
  await phraseFactory.build({
    languageId: language.id,
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      gloss: "test gloss",
      updated_at: new Date(),
    },
  });

  const parentJobId = ulid();

  const job: Job<{ languageCode: string }> = {
    id: ulid(),
    parentJobId,
    type: EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD,
    status: JobStatus.Pending,
    payload: {
      languageCode: language.code,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await getDb()
    .insertInto("job")
    .values([
      {
        id: parentJobId,
        type: EXPORT_JOB_TYPES.EXPORT_GLOSSES,
        status: JobStatus.Complete,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: job.id,
        parent_job_id: parentJobId,
        type: job.type,
        status: job.status,
        payload: job.payload,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      },
      {
        id: ulid(),
        parent_job_id: parentJobId,
        type: EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD,
        status: JobStatus.InProgress,
        payload: { languageCode: "hin" },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    .execute();

  await exportGlossesChildJob(job);

  expect(mockedCreateBlob).toHaveBeenCalledExactlyOnceWith({
    path: `${language.code}/37-Hag.json`,
    content: expect.any(String),
  });
  expect(enqueueJob).not.toHaveBeenCalled();
});
