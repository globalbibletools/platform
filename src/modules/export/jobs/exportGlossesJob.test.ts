import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { expect, test, vitest } from "vitest";
import { enqueueJob } from "@/shared/jobs/__mocks__/enqueueJob";
import { Job, JobStatus } from "@/shared/jobs/model";
import { ulid } from "@/shared/ulid";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { phraseFactory } from "@/modules/translation/test-utils/phraseFactory";
import { GlossStateRaw } from "@/modules/translation/types";
import { subDays } from "date-fns";
import { exportGlossesJob } from "./exportGlossesJob";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import type { QueueGithubExportRunJobPayload } from "../model";

vitest.mock("@/shared/jobs/enqueueJob");

initializeDatabase();

test("queues child jobs only for languages with changes in the default window", async () => {
  const { language: changedLanguage } = await languageFactory.build();
  const { language: unchangedLanguage } = await languageFactory.build();

  await phraseFactory.build({
    languageId: changedLanguage.id,
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      updated_at: subDays(new Date(), 1),
    },
  });

  // This change is too old for the language to need to be exported
  await phraseFactory.build({
    languageId: unchangedLanguage.id,
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      updated_at: subDays(new Date(), 10),
    },
  });

  const job: Job<QueueGithubExportRunJobPayload> = {
    id: ulid(),
    type: EXPORT_JOB_TYPES.EXPORT_GLOSSES,
    status: JobStatus.Pending,
    payload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await exportGlossesJob(job);

  expect(enqueueJob).toHaveBeenCalledExactlyOnceWith(
    EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD,
    {
      languageCode: changedLanguage.code,
    },
    {
      parentJobId: job.id,
    },
  );
});

test("queues child jobs only for languages with changes in the specified window", async () => {
  const { language: changedLanguage } = await languageFactory.build();
  const { language: unchangedLanguage } = await languageFactory.build();

  await phraseFactory.build({
    languageId: changedLanguage.id,
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      updated_at: subDays(new Date(), 1),
    },
  });

  // This change is too old for the language to need to be exported
  await phraseFactory.build({
    languageId: unchangedLanguage.id,
    events: true,
    gloss: {
      state: GlossStateRaw.Approved,
      updated_at: subDays(new Date(), 6),
    },
  });

  const job: Job<QueueGithubExportRunJobPayload> = {
    id: ulid(),
    type: EXPORT_JOB_TYPES.EXPORT_GLOSSES,
    status: JobStatus.Pending,
    payload: {
      windowDays: 4,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await exportGlossesJob(job);

  expect(enqueueJob).toHaveBeenCalledExactlyOnceWith(
    EXPORT_JOB_TYPES.EXPORT_GLOSSES_CHILD,
    {
      languageCode: changedLanguage.code,
    },
    {
      parentJobId: job.id,
    },
  );
});
