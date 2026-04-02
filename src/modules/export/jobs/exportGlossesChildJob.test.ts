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
import { ExportLanguageBlobsJobPayload } from "../model";

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

  const job: Job<ExportLanguageBlobsJobPayload> = {
    id: ulid(),
    parentJobId,
    type: EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD,
    status: JobStatus.Pending,
    payload: {
      languageCodes: [language.code],
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
  expect(mockedCreateBlob).toHaveBeenCalledOnce();
  expect(mockedCreateBlob.mock.lastCall).toMatchSnapshot();
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

  const job: Job<ExportLanguageBlobsJobPayload> = {
    id: ulid(),
    parentJobId,
    type: EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD,
    status: JobStatus.Pending,
    payload: {
      languageCodes: [language.code],
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
