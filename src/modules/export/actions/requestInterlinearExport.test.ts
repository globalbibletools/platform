import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { expect, test, vi } from "vitest";
import { requestInterlinearExport } from "./requestInterlinearExport";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { sessionFactory } from "@/modules/users/test-utils/sessionFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";

const { enqueueJobMock } = vi.hoisted(() => ({
  enqueueJobMock: vi.fn(),
}));

vi.mock("@/shared/jobs/enqueueJob", () => ({
  enqueueJob: enqueueJobMock,
}));

initializeDatabase();

test("rejects unauthenticated requests", async () => {
  const data = { languageCode: "spa" };
  await expect(
    runServerFn(requestInterlinearExport, { data }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
  expect(enqueueJob).not.toHaveBeenCalled();
});

test("returns validation error for unknown language before enqueue", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const data = { languageCode: "missing" };

  await expect(
    runServerFn(requestInterlinearExport, {
      data,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: export_failed]`);
  expect(enqueueJob).not.toHaveBeenCalled();
});

test("denies non-members", async () => {
  const { user: outsider } = await userFactory.build();
  const { language } = await languageFactory.build();
  const session = await sessionFactory.build(outsider.id);

  const data = { languageCode: language.code };

  await expect(
    runServerFn(requestInterlinearExport, {
      data,
      sessionId: session.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
  expect(enqueueJob).not.toHaveBeenCalled();
});

test("creates export request for language", async () => {
  const { user: translator, session } = await userFactory.build({
    session: true,
  });
  const { language } = await languageFactory.build({
    members: [translator.id],
  });

  (enqueueJob as any).mockResolvedValueOnce({ id: "job-123" });

  const data = { languageCode: language.code };

  const { response } = await runServerFn(requestInterlinearExport, {
    data,
    sessionId: session!.id,
  });

  expect(response.status).toBe(204);
  expect(enqueueJob).toHaveBeenCalledExactlyOnceWith("export_interlinear_pdf", {
    languageId: language.id,
    languageCode: language.code,
    requestedBy: translator.id,
  });
});
