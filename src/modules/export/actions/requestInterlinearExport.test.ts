import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test, vi } from "vitest";
import { requestInterlinearExport } from "./requestInterlinearExport";
import { createScenario } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { LanguageMemberRoleRaw } from "@/modules/languages/model";
import { query } from "@/db";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";

vi.mock("@/shared/jobs/enqueueJob");

initializeDatabase();

async function findExportRequest(id: string) {
  const result = await query(
    `select id,
            language_id as "languageId",
            book_id as "bookId",
            chapters,
            layout,
            status,
            requested_by as "requestedBy"
     from export_request
     where id = any($1)`,
    [[id]],
  );
  return result.rows[0];
}

async function findExportRequestBooks(id: string) {
  const result = await query(
    `select request_id as "requestId",
            book_id as "bookId",
            chapters
       from export_request_book
       where request_id = $1
       order by book_id`,
    [id],
  );
  return result.rows;
}
describe("requestInterlinearExport", () => {
  test("rejects unauthenticated requests", async () => {
    const formData = new FormData();
    await expect(requestInterlinearExport(formData)).toBeNextjsNotFound();
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  test("validates chapters input", async () => {
    const scenario = await createScenario({
      users: { translator: {} },
      languages: {
        language: {
          members: [
            {
              userId: "translator",
              roles: [LanguageMemberRoleRaw.Translator],
            },
          ],
        },
      },
    });
    const user = scenario.users.translator;
    const language = scenario.languages.language;
    await logIn(user.id);

    const formData = new FormData();
    formData.set("languageCode", language.code);
    formData.set("bookIds", "1");
    formData.set("chapters", "one,two");
    formData.set("layout", "standard");

    const response = await requestInterlinearExport(formData);
    expect(response).toEqual({
      state: "error",
      validation: { chapters: ["Chapters must be numeric or ranges."] },
    });
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  test("returns validation error for unknown language before enqueue", async () => {
    const scenario = await createScenario({
      users: { admin: { systemRoles: [SystemRoleRaw.Admin] } },
    });
    await logIn(scenario.users.admin.id);

    const formData = new FormData();
    formData.set("languageCode", "missing");
    formData.set("bookIds", "1");
    formData.set("chapters", "1");
    formData.set("layout", "standard");

    const response = await requestInterlinearExport(formData);
    expect(response).toEqual({
      state: "error",
      validation: { languageCode: ["Language not found."] },
    });
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  test("denies non-members", async () => {
    const scenario = await createScenario({
      users: { outsider: {} },
      languages: { language: {} },
    });
    const user = scenario.users.outsider;
    const language = scenario.languages.language;
    await logIn(user.id);

    const formData = new FormData();
    formData.set("languageCode", language.code);
    formData.set("bookIds", "1");
    formData.set("chapters", "1");
    formData.set("layout", "standard");

    await expect(requestInterlinearExport(formData)).toBeNextjsNotFound();
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  test("creates export request with parsed options", async () => {
    const scenario = await createScenario({
      users: { translator: {} },
      languages: {
        language: {
          members: [
            {
              userId: "translator",
              roles: [LanguageMemberRoleRaw.Translator],
            },
          ],
        },
      },
    });
    const user = scenario.users.translator;
    const language = scenario.languages.language;
    await logIn(user.id);

    await query(
      `insert into book (id, name) values ($1, $2) on conflict (id) do nothing`,
      [4, "Test Book"],
    );
    await query(
      `insert into verse (id, number, book_id, chapter) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      ["4-1-1", 1, 4, 1],
    );
    await query(
      `insert into verse (id, number, book_id, chapter) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      ["4-2-1", 1, 4, 2],
    );

    const formData = new FormData();
    formData.set("languageCode", language.code);
    formData.set("bookIds", "4");
    formData.set("chapters", "1, 2");
    formData.set("layout", "parallel");

    const response = await requestInterlinearExport(formData);
    expect(response.state).toBe("success");
    expect(response.requestIds?.[0].id).toBeDefined();
    expect(enqueueJob).toHaveBeenCalledTimes(1);
    expect(enqueueJob).toHaveBeenCalledWith("export_interlinear_pdf", {
      books: [{ bookId: 4, chapters: [1, 2] }],
      languageCode: language.code,
      layout: "parallel",
      requestId: response.requestIds?.[0].id,
    });

    const request = await findExportRequest(response.requestIds?.[0].id!);
    expect(request).toMatchObject({
      id: response.requestIds?.[0].id,
      languageId: language.id,
      layout: "parallel",
      status: "PENDING",
      requestedBy: user.id,
    });

    const books = await findExportRequestBooks(response.requestIds?.[0].id!);
    expect(books).toEqual([
      { requestId: response.requestIds?.[0].id, bookId: 4, chapters: [1, 2] },
    ]);
  });

  test("silently skips invalid chapters for selected books", async () => {
    const scenario = await createScenario({
      users: { translator: {} },
      languages: {
        language: {
          members: [
            {
              userId: "translator",
              roles: [LanguageMemberRoleRaw.Translator],
            },
          ],
        },
      },
    });
    const user = scenario.users.translator;
    const language = scenario.languages.language;
    await logIn(user.id);

    await query(
      `insert into book (id, name) values ($1, $2) on conflict (id) do nothing`,
      [5, "Test Book"],
    );
    await query(
      `insert into verse (id, number, book_id, chapter) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      ["5-1-1", 1, 5, 1],
    );

    const formData = new FormData();
    formData.set("languageCode", language.code);
    formData.set("bookIds", "5");
    formData.set("chapters", "1,2");
    formData.set("layout", "standard");

    const response = await requestInterlinearExport(formData);
    expect(response.state).toBe("success");

    const requestId = response.requestIds?.[0].id!;
    expect(enqueueJob).toHaveBeenCalledWith("export_interlinear_pdf", {
      books: [{ bookId: 5, chapters: [1] }],
      languageCode: language.code,
      layout: "standard",
      requestId,
    });

    const books = await findExportRequestBooks(requestId);
    expect(books).toEqual([{ requestId, bookId: 5, chapters: [1] }]);
  });

  test("returns a validation error when no chapters match", async () => {
    const scenario = await createScenario({
      users: { translator: {} },
      languages: {
        language: {
          members: [
            {
              userId: "translator",
              roles: [LanguageMemberRoleRaw.Translator],
            },
          ],
        },
      },
    });
    const user = scenario.users.translator;
    const language = scenario.languages.language;
    await logIn(user.id);

    await query(
      `insert into book (id, name) values ($1, $2) on conflict (id) do nothing`,
      [6, "Test Book"],
    );
    await query(
      `insert into verse (id, number, book_id, chapter) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      ["6-1-1", 1, 6, 1],
    );

    const formData = new FormData();
    formData.set("languageCode", language.code);
    formData.set("bookIds", "6");
    formData.set("chapters", "99");
    formData.set("layout", "standard");

    const response = await requestInterlinearExport(formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        chapters: ["No matching chapters found for the selected books."],
      },
    });
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  test("defaults to all books and chapters when none provided", async () => {
    const scenario = await createScenario({
      users: { translator: {} },
      languages: {
        language: {
          members: [
            {
              userId: "translator",
              roles: [LanguageMemberRoleRaw.Translator],
            },
          ],
        },
      },
    });
    const user = scenario.users.translator;
    const language = scenario.languages.language;
    await logIn(user.id);

    await query(
      `insert into book (id, name) values (1, 'Book One'), (2, 'Book Two')
       on conflict (id) do nothing`,
      [],
    );
    await query(
      `insert into verse (id, number, book_id, chapter) values 
        ('1-1-1', 1, 1, 1),
        ('1-1-2', 2, 1, 2),
        ('2-1-1', 1, 2, 1)
       on conflict (id) do nothing`,
      [],
    );

    const formData = new FormData();
    formData.set("languageCode", language.code);
    formData.set("layout", "standard");

    const response = await requestInterlinearExport(formData);
    expect(response.state).toBe("success");
    expect(response.requestIds).toHaveLength(1);
    expect(enqueueJob).toHaveBeenCalledTimes(1);

    const requestIds = response.requestIds ?? [];
    const requests = await Promise.all(
      requestIds.map((r) => findExportRequest(r.id)),
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bookId: null, chapters: null }),
      ]),
    );

    const books = await findExportRequestBooks(requestIds[0].id);
    expect(books).toEqual([
      { requestId: requestIds[0].id, bookId: 1, chapters: [1, 2] },
      { requestId: requestIds[0].id, bookId: 2, chapters: [1] },
    ]);
  });
});
