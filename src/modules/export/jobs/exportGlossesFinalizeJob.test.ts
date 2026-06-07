import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, expect, test, vitest } from "vitest";
import { getDb, kyselyTransaction } from "@/db";
import { JobStatus } from "@/shared/jobs/model";
import { ulid } from "@/shared/ulid";
import { exportGlossesFinalizeJob } from "./exportGlossesFinalizeJob";

const { createCommitMock } = vitest.hoisted(() => ({
  createCommitMock: vitest.fn(),
}));

vitest.mock("../data-access/githubExportService", () => ({
  githubExportService: {
    createCommit: createCommitMock,
  },
}));

initializeDatabase();

beforeEach(() => {
  createCommitMock.mockReset().mockResolvedValue({ sha: "commit-sha" });
});

test("collects child tree items and creates a commit", async () => {
  const parentJobId = ulid();

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
        id: ulid(),
        parent_job_id: parentJobId,
        type: "export_glosses_child",
        status: JobStatus.Complete,
        payload: { languageCode: "eng" } as any,
        data: {
          treeItems: [
            {
              path: "eng/37-Hag.json",
              mode: "100644",
              type: "blob",
              sha: "sha-eng",
            },
          ],
        } as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: ulid(),
        parent_job_id: parentJobId,
        type: "export_glosses_child",
        status: JobStatus.Complete,
        payload: { languageCode: "spa" } as any,
        data: {
          treeItems: [
            {
              path: "spa/37-Hag.json",
              mode: "100644",
              type: "blob",
              sha: "sha-spa",
            },
          ],
        } as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: ulid(),
        parent_job_id: parentJobId,
        type: "export_glosses_child",
        status: JobStatus.Complete,
        payload: { languageCode: "hin" } as any,
        data: {
          treeItems: [
            {
              path: "hin/37-Hag.json",
              mode: "100644",
              type: "blob",
              sha: "sha-hin",
            },
          ],
        } as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    .execute();

  const finalizeJob = {
    id: ulid(),
    parentJobId,
    type: "export_glosses_finalize" as const,
    status: JobStatus.Pending,
    payload: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await exportGlossesFinalizeJob.handler(finalizeJob);

  expect(createCommitMock).toHaveBeenCalledExactlyOnceWith({
    items: [
      {
        path: "eng/37-Hag.json",
        mode: "100644",
        type: "blob",
        sha: "sha-eng",
      },
      {
        path: "spa/37-Hag.json",
        mode: "100644",
        type: "blob",
        sha: "sha-spa",
      },
      {
        path: "hin/37-Hag.json",
        mode: "100644",
        type: "blob",
        sha: "sha-hin",
      },
    ],
    message: expect.stringContaining("Export from Global Bible Tools"),
  });
});

test("returns early if another finalize job is in progress", async () => {
  const parentJobId = ulid();

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
        id: ulid(),
        parent_job_id: parentJobId,
        type: "export_glosses_child",
        status: JobStatus.Complete,
        payload: { languageCode: "eng" } as any,
        data: {
          treeItems: [
            {
              path: "eng/37-Hag.json",
              mode: "100644",
              type: "blob",
              sha: "sha-eng",
            },
          ],
        } as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: ulid(),
        parent_job_id: parentJobId,
        type: "export_glosses_child",
        status: JobStatus.Complete,
        payload: { languageCode: "spa" } as any,
        data: {
          treeItems: [
            {
              path: "spa/37-Hag.json",
              mode: "100644",
              type: "blob",
              sha: "sha-spa",
            },
          ],
        } as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: ulid(),
        parent_job_id: parentJobId,
        type: "export_glosses_child",
        status: JobStatus.Complete,
        payload: { languageCode: "hin" } as any,
        data: {
          treeItems: [
            {
              path: "hin/37-Hag.json",
              mode: "100644",
              type: "blob",
              sha: "sha-hin",
            },
          ],
        } as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    .execute();

  const finalizeJob = {
    id: ulid(),
    parentJobId,
    type: "export_glosses_finalize" as const,
    status: JobStatus.Pending,
    payload: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // We wrap this in a transaction, so that the lock is transaction bound rather than session bound.
  // In lambdas, session level locks are ok because handlers run in isolated lambdas with their own session.
  await kyselyTransaction(async (trx) => {
    await trx
      .selectNoFrom((eb) =>
        eb
          .fn("pg_try_advisory_xact_lock", [
            eb.fn("hashtextextended", [eb.val(parentJobId), eb.val(0)]),
          ])
          .as("locked"),
      )
      .execute();

    await exportGlossesFinalizeJob.handler(finalizeJob);
  });

  expect(createCommitMock).not.toHaveBeenCalled();
});
