import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test, vi } from "vitest";
import { requestInterlinearExport } from "./requestInterlinearExport";
import { createScenario } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { query } from "@/db";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";

vi.mock("@/shared/jobs/enqueueJob");

initializeDatabase();

describe("requestInterlinearExport", () => {
  test("rejects unauthenticated requests", async () => {
    const formData = new FormData();
    await expect(requestInterlinearExport(formData)).toBeNextjsNotFound();
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  test("returns validation error for unknown language before enqueue", async () => {
    const scenario = await createScenario({
      users: { admin: { systemRoles: [SystemRoleRaw.Admin] } },
    });
    await logIn(scenario.users.admin.id);

    const formData = new FormData();
    formData.set("languageCode", "missing");

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

    await expect(requestInterlinearExport(formData)).toBeNextjsNotFound();
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  test("creates export request for all books with standard layout", async () => {
    const scenario = await createScenario({
      users: { translator: {} },
      languages: {
        language: {
          members: ["translator"],
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

    (enqueueJob as any).mockResolvedValueOnce({ id: "job-123" });
    const response = await requestInterlinearExport(formData);
    expect(response.state).toBe("success");
    expect(response.requestIds?.[0].id).toBe("job-123");
    expect(enqueueJob).toHaveBeenCalledTimes(1);
    expect(enqueueJob).toHaveBeenCalledWith("export_interlinear_pdf", {
      languageId: language.id,
      books: [{ bookId: 4, chapters: [1, 2] }],
      languageCode: language.code,
      requestedBy: user.id,
      layout: "standard",
    });
  });

  test("returns a validation error when no chapters are available", async () => {
    const scenario = await createScenario({
      users: { translator: {} },
      languages: {
        language: {
          members: ["translator"],
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

    const formData = new FormData();
    formData.set("languageCode", language.code);
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
          members: ["translator"],
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

    (enqueueJob as any).mockResolvedValueOnce({ id: "job-789" });
    const response = await requestInterlinearExport(formData);
    expect(response.state).toBe("success");
    expect(response.requestIds).toHaveLength(1);
    expect(enqueueJob).toHaveBeenCalledTimes(1);

    expect(response.requestIds?.[0].id).toBe("job-789");
    expect(enqueueJob).toHaveBeenCalledWith("export_interlinear_pdf", {
      languageId: language.id,
      languageCode: language.code,
      requestedBy: user.id,
      books: [
        { bookId: 1, chapters: [1, 2] },
        { bookId: 2, chapters: [1] },
      ],
      layout: "standard",
    });
  });
});
