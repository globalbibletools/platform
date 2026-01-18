import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import { pollInterlinearExportStatus } from "./pollInterlinearExportStatus";
import { createScenario } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { query } from "@/db";
import { ulid } from "@/shared/ulid";
import { JobStatus } from "@/shared/jobs/model";
import { EXPORT_JOB_TYPES } from "../jobs/jobTypes";

initializeDatabase();

async function createExportJob({
  languageId,
  languageCode,
  requestedBy,
  status = JobStatus.Pending,
  downloadUrl = null,
  expiresAt = null,
}: {
  languageId: string;
  languageCode: string;
  requestedBy: string;
  status?: JobStatus;
  downloadUrl?: string | null;
  expiresAt?: string | null;
}) {
  const id = ulid();

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
       now(),
       now(),
       (select id from job_type where name = $5)
     )`,
    [
      id,
      status,
      {
        languageId,
        languageCode,
        requestedBy,
        books: [{ bookId: 1, chapters: [1] }],
        layout: "standard",
      },
      {
        downloadUrl,
        expiresAt,
      },
      EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF,
    ],
  );
  return id;
}

describe("pollInterlinearExportStatus", () => {
  test("requires authentication", async () => {
    const formData = new FormData();
    formData.set("id", "non-existent");
    await expect(pollInterlinearExportStatus(formData)).toBeNextjsNotFound();
  });

  test("allows authorized language member to read their request", async () => {
    const scenario = await createScenario({
      users: { member: {} },
      languages: {
        language: {
          members: ["member"],
        },
      },
    });
    const language = scenario.languages.language;
    const user = scenario.users.member;
    await logIn(user.id);
    const expiresAt = new Date().toISOString();
    const jobId = await createExportJob({
      languageId: language.id,
      languageCode: language.code,
      requestedBy: user.id,
      status: JobStatus.Complete,
      downloadUrl: "https://example.com/file.pdf",
      expiresAt,
    });

    const formData = new FormData();
    formData.set("id", jobId);
    const response = await pollInterlinearExportStatus(formData);

    expect(response).toEqual({
      id: jobId,
      status: JobStatus.Complete,
      bookId: 1,
      downloadUrl: "https://example.com/file.pdf",
      expiresAt,
    });
  });

  test("rejects users not in the language", async () => {
    const scenario = await createScenario(
      {
        users: { member: {} },
        languages: {
          language: {
            members: ["member"],
          },
        },
      },
      {
        users: { outsider: {} },
      },
    );
    const language = scenario.languages.language;
    const jobId = await createExportJob({
      languageId: language.id,
      languageCode: language.code,
      requestedBy: scenario.users.member.id,
      status: JobStatus.InProgress,
    });

    await logIn(scenario.users.outsider.id);
    const formData = new FormData();
    formData.set("id", jobId);

    await expect(pollInterlinearExportStatus(formData)).toBeNextjsNotFound();
  });
});
