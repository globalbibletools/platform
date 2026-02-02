import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test, vi } from "vitest";

const { enqueueJobMock } = vi.hoisted(() => ({
  enqueueJobMock: vi.fn(),
}));

vi.mock("@/shared/jobs/enqueueJob", () => ({
  enqueueJob: enqueueJobMock,
}));

import { requestInterlinearExport } from "./requestInterlinearExport";
import { createScenario } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";

initializeDatabase();

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
    error: "Export failed.",
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

test("creates export request for language", async () => {
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

  const formData = new FormData();
  formData.set("languageCode", language.code);

  (enqueueJob as any).mockResolvedValueOnce({ id: "job-123" });
  const response = await requestInterlinearExport(formData);
  expect(response.state).toBe("success");
  expect(enqueueJob).toHaveBeenCalledTimes(1);
  expect(enqueueJob).toHaveBeenCalledWith("export_interlinear_pdf", {
    languageId: language.id,
    languageCode: language.code,
    requestedBy: user.id,
  });
});
