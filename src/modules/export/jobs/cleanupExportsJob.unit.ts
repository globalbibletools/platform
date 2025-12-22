import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, describe, expect, test, vi } from "vitest";
import cleanupExportsJob from "./cleanupExportsJob";
import { query } from "@/db";
import { ulid } from "@/shared/ulid";
import { JobStatus } from "@/shared/jobs/model";
import { EXPORT_JOB_TYPES } from "./jobTypes";

const { mockDeleteObject } = vi.hoisted(() => ({
  mockDeleteObject: vi.fn(),
}));

vi.mock("@/modules/export/data-access/ExportStorageRepository", () => {
  const repo = {
    deleteObject: mockDeleteObject,
    uploadPdf: vi.fn(),
    presignPdf: vi.fn(),
    fetchBuffer: vi.fn(),
    bucketName: vi.fn(),
  };
  return { __esModule: true, exportStorageRepository: repo, default: repo };
});

initializeDatabase();

async function insertExportJob({
  id = ulid(),
  exportKey,
  downloadUrl,
  expiresAt,
  createdAt = new Date(),
}: {
  id?: string;
  exportKey: string;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt?: Date;
}): Promise<string> {
  await query(
    `insert into job_type (name)
     values ($1)
     on conflict (name) do nothing`,
    [EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF],
  );

  await query(
    `insert into job (id, status, payload, data, created_at, updated_at, type_id)
     values (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       (select id from job_type where name = $7)
     )`,
    [
      id,
      JobStatus.Complete,
      {
        languageId: "lang-1",
        languageCode: "spa",
        requestedBy: "user-1",
        books: [{ bookId: 1, chapters: [1] }],
        layout: "standard",
      },
      {
        exportKey,
        downloadUrl,
        expiresAt,
      },
      createdAt,
      createdAt,
      EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF,
    ],
  );

  return id;
}

describe("cleanupExportsJob", () => {
  beforeEach(async () => {
    mockDeleteObject.mockReset();
  });

  test("removes expired exports from storage and clears DB fields", async () => {
    const exportId = await insertExportJob({
      exportKey: "path/to/export.pdf",
      downloadUrl: "https://example.com/export.pdf",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    await cleanupExportsJob({
      id: "job-1",
      type: EXPORT_JOB_TYPES.CLEANUP_EXPORTS,
      payload: undefined,
      createdAt: new Date(),
      status: JobStatus.Pending,
      updatedAt: new Date(),
    });

    expect(mockDeleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: "path/to/export.pdf" }),
    );
    const result = await query(
      `select data->>'exportKey' as export_key, data->>'downloadUrl' as download_url from job where id = $1`,
      [exportId],
    );
    expect(result.rows[0]).toEqual({ export_key: null, download_url: null });
  });

  test("uses fallback when expires_at is missing", async () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const exportId = await insertExportJob({
      exportKey: "path/to/stale.pdf",
      downloadUrl: "https://example.com/stale.pdf",
      expiresAt: null,
      createdAt: oldDate,
    });

    await cleanupExportsJob({
      id: "job-2",
      type: EXPORT_JOB_TYPES.CLEANUP_EXPORTS,
      payload: undefined,
      createdAt: new Date(),
      status: JobStatus.Pending,
      updatedAt: new Date(),
    });

    expect(mockDeleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: "path/to/stale.pdf" }),
    );
    const remaining = await query(
      `select data->>'exportKey' as export_key from job where id = $1`,
      [exportId],
    );
    expect(remaining.rows[0].export_key).toBeNull();
  });
});
