import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, expect, test, vitest } from "vitest";
import { enqueueJob } from "@/shared/jobs/__mocks__/enqueueJob";
import { JobStatus } from "@/shared/jobs/types";
import { ulid } from "@/shared/ulid";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { phraseFactory } from "@/modules/translation/test-utils/phraseFactory";
import { GlossStateRaw } from "@/modules/translation/types";
import { getDb } from "@/db";
import { exportGlossesChildHandler } from "./exportGlossesChildHandler";
import { ExportGlossesChildJob } from "./ExportGlossesChildJob";
import { githubExportService } from "../data-access/githubExportService";

vitest.mock("@/shared/jobs/enqueueJob");
vitest.mock("../data-access/githubExportService", () => ({
  githubExportService: {
    createBlob: vitest.fn(),
    createSubtree: vitest.fn(),
  },
}));

initializeDatabase();

const mockedCreateBlob = vitest.mocked(githubExportService.createBlob);
const mockedCreateSubtree = vitest.mocked(githubExportService.createSubtree);

beforeEach(() => {
  mockedCreateBlob.mockReset().mockResolvedValue({
    path: "37-Hag.json",
    mode: "100644",
    type: "blob",
    sha: "blob-sha",
  });
  mockedCreateSubtree.mockReset().mockResolvedValue("tree-sha");
  enqueueJob.mockReset();
  enqueueJob.mockResolvedValue({ id: ulid() } as any);
});

test("creates a language subtree from blobs and then enqueues the finalize job", async () => {
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

  const job = ExportGlossesChildJob.fromRaw({
    id: ulid(),
    parentJobId,
    type: "export_glosses_child",
    status: JobStatus.Pending,
    payload: {
      languageCodes: [language.code],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await getDb()
    .insertInto("job")
    .values([
      {
        id: parentJobId,
        type: "export_glosses",
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

  await exportGlossesChildHandler(job);

  const updatedJob = await getDb()
    .selectFrom("job")
    .where("id", "=", job.id)
    .select(["data"])
    .executeTakeFirstOrThrow();

  expect(updatedJob.data).toEqual({
    treeItems: [
      {
        path: language.code,
        mode: "040000",
        type: "tree",
        sha: "tree-sha",
      },
    ],
  });

  expect(mockedCreateBlob).toHaveBeenCalledOnce();
  expect(mockedCreateBlob.mock.lastCall).toMatchSnapshot();
  expect(mockedCreateSubtree).toHaveBeenCalledExactlyOnceWith({
    tree: [
      {
        path: "37-Hag.json",
        mode: "100644",
        type: "blob",
        sha: "blob-sha",
      },
    ],
  });
  expect(enqueueJob).toHaveBeenCalledExactlyOnceWith({
    type: "export_glosses_finalize",
    parentJobId,
  });
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

  const job = ExportGlossesChildJob.fromRaw({
    id: ulid(),
    parentJobId,
    type: "export_glosses_child",
    status: JobStatus.Pending,
    payload: {
      languageCodes: [language.code],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await getDb()
    .insertInto("job")
    .values([
      {
        id: parentJobId,
        type: "export_glosses",
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
        type: "export_glosses_child",
        status: JobStatus.InProgress,
        payload: { languageCode: "hin" },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    .execute();

  await exportGlossesChildHandler(job);

  expect(mockedCreateBlob).toHaveBeenCalledExactlyOnceWith({
    path: "37-Hag.json",
    content: expect.any(String),
  });
  expect(mockedCreateSubtree).toHaveBeenCalledExactlyOnceWith({
    tree: [
      {
        path: "37-Hag.json",
        mode: "100644",
        type: "blob",
        sha: "blob-sha",
      },
    ],
  });
  expect(enqueueJob).not.toHaveBeenCalled();
});
