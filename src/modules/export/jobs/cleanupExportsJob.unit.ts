import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, describe, expect, test, vi } from "vitest";
import cleanupExportsJob from "./cleanupExportsJob";
import { query } from "@/db";
import { createScenario } from "@/tests/scenarios";
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

async function insertExportRequest({
  id = ulid(),
  languageId,
  requestedBy,
  exportKey,
  downloadUrl,
  expiresAt,
  requestedAt = new Date(),
  bookId = null,
  chapters = [1],
}: {
  id?: string;
  languageId: string;
  requestedBy: string;
  exportKey: string | null;
  downloadUrl: string | null;
  expiresAt: Date | null;
  requestedAt?: Date;
  bookId?: number | null;
  chapters?: number[];
}): Promise<string> {
  await query(
    `insert into export_request (
       id, language_id, book_id, chapters, layout, status, requested_by, requested_at, export_key, download_url, expires_at
     ) values ($1, $2, $3, $4, 'standard', 'COMPLETE', $5, $6, $7, $8, $9)`,
    [
      id,
      languageId,
      bookId,
      chapters,
      requestedBy,
      requestedAt,
      exportKey,
      downloadUrl,
      expiresAt,
    ],
  );
  return id;
}

describe("cleanupExportsJob", () => {
  beforeEach(async () => {
    mockDeleteObject.mockReset();
    await query(`delete from export_request`, []);
  });

  test("removes expired exports from storage and clears DB fields", async () => {
    const scenario = await createScenario({
      users: { user: {} },
      languages: { language: {} },
    });
    const language = scenario.languages.language;
    const user = scenario.users.user;

    const exportId = await insertExportRequest({
      languageId: language.id,
      requestedBy: user.id,
      exportKey: "path/to/export.pdf",
      downloadUrl: "https://example.com/export.pdf",
      expiresAt: new Date(Date.now() - 1000),
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
      `select export_key, download_url from export_request where id = $1`,
      [exportId],
    );
    expect(result.rows[0]).toEqual({ export_key: null, download_url: null });
  });

  test("uses fallback when expires_at is missing", async () => {
    const scenario = await createScenario({
      users: { user: {} },
      languages: { language: {} },
    });
    const language = scenario.languages.language;
    const user = scenario.users.user;
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const exportId = await insertExportRequest({
      languageId: language.id,
      requestedBy: user.id,
      exportKey: "path/to/stale.pdf",
      downloadUrl: "https://example.com/stale.pdf",
      expiresAt: null,
      requestedAt: oldDate,
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
      `select count(*)::int as count from export_request where id = $1`,
      [exportId],
    );
    expect(remaining.rows[0].count).toBe(0);
  });
});
