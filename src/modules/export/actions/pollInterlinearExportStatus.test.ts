import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import { pollInterlinearExportStatus } from "./pollInterlinearExportStatus";
import { createScenario } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { LanguageMemberRoleRaw } from "@/modules/languages/model";
import { query } from "@/db";
import { ulid } from "@/shared/ulid";

initializeDatabase();

async function createExportRequest({
  languageId,
  requestedBy,
  status = "PENDING",
  downloadUrl = null,
  expiresAt = null,
}: {
  languageId: string;
  requestedBy: string;
  status?: string;
  downloadUrl?: string | null;
  expiresAt?: Date | null;
}) {
  await query(
    `insert into book (id, name) values ($1, $2) on conflict (id) do nothing`,
    [1, "Test Book"],
  );
  const id = ulid();
  await query(
    `insert into export_request (
       id, language_id, book_id, chapters, layout, status, requested_by, requested_at, download_url, expires_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, now(), $8, $9)`,
    [
      id,
      languageId,
      1,
      [1],
      "standard",
      status,
      requestedBy,
      downloadUrl,
      expiresAt,
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
          members: [
            { userId: "member", roles: [LanguageMemberRoleRaw.Translator] },
          ],
        },
      },
    });
    const language = scenario.languages.language;
    const user = scenario.users.member;
    await logIn(user.id);
    const expiresAt = new Date();
    const requestId = await createExportRequest({
      languageId: language.id,
      requestedBy: user.id,
      status: "COMPLETE",
      downloadUrl: "https://example.com/file.pdf",
      expiresAt,
    });

    const formData = new FormData();
    formData.set("id", requestId);
    const response = await pollInterlinearExportStatus(formData);

    expect(response).toEqual({
      id: requestId,
      status: "COMPLETE",
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
            members: [
              { userId: "member", roles: [LanguageMemberRoleRaw.Translator] },
            ],
          },
        },
      },
      {
        users: { outsider: {} },
      },
    );
    const language = scenario.languages.language;
    const requestId = await createExportRequest({
      languageId: language.id,
      requestedBy: scenario.users.member.id,
      status: "IN_PROGRESS",
    });

    await logIn(scenario.users.outsider.id);
    const formData = new FormData();
    formData.set("id", requestId);

    await expect(pollInterlinearExportStatus(formData)).toBeNextjsNotFound();
  });
});
