import { test, expect, vi, beforeEach } from "vitest";
import { enqueueAIGlossImportJob } from "./enqueueAIGlossImportJob";
import { NotFoundError } from "@/shared/errors";
import { ulid } from "@/shared/ulid";
import { TextDirectionRaw } from "@/modules/languages/model";
import { ResolvedLanguage } from "@/modules/languages";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { TRANSLATION_JOB_TYPES } from "../jobs/jobType";
import { initLanguageModuleMock } from "@/modules/languages/__mocks__";

vi.mock("@/modules/languages");
vi.mock("@/shared/jobs/enqueueJob");

const mockEnqueueJob = vi.mocked(enqueueJob);

const languages: Array<ResolvedLanguage> = [
  {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    textDirection: TextDirectionRaw.LTR,
  },
];

beforeEach(() => {
  initLanguageModuleMock({ languages });
});

test("throws NotFoundError if language does not exist", async () => {
  const request = {
    languageCode: "nonexistent",
  };

  await expect(enqueueAIGlossImportJob(request)).rejects.toThrow(
    new NotFoundError("Language"),
  );
  expect(mockEnqueueJob).not.toHaveBeenCalled();
});

test("enqueues job when language exists", async () => {
  const request = {
    languageCode: "spa",
  };

  const result = await enqueueAIGlossImportJob(request);

  expect(mockEnqueueJob).toHaveBeenCalledWith(
    TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES,
    {
      languageCode: "spa",
    },
  );

  const job = await mockEnqueueJob.mock.results[0].value;
  expect(result).toEqual({ jobId: job.id });
});
