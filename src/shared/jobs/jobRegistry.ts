import { JobDefinition } from "./JobDefinition";
import { sendEmailJob } from "@/mailer";
import { exportAnalyticsJob } from "@/modules/reporting/jobs/exportAnalyticsJob";
import { updateBookCompletionProgressJob } from "@/modules/reporting/jobs/updateBookCompletionProgress";
import { exportInterlinearPdfJob } from "@/modules/export/jobs/exportInterlinearPdfJob";
import { exportGlossesJob } from "@/modules/export/jobs/exportGlossesJob";
import { exportGlossesChildJob } from "@/modules/export/jobs/exportGlossesChildJob";
import { exportGlossesFinalizeJob } from "@/modules/export/jobs/exportGlossesFinalizeJob";
import { importAIGlossesJob } from "@/modules/translation/jobs/importAIGlosses";
import { syncAIGlossLanguagesJob } from "@/modules/translation/jobs/syncAIGlossLanguages";
import * as z from "zod";

export const jobRegistry = {
  [sendEmailJob.type]: sendEmailJob,
  [exportAnalyticsJob.type]: exportAnalyticsJob,
  [updateBookCompletionProgressJob.type]: updateBookCompletionProgressJob,
  [exportInterlinearPdfJob.type]: exportInterlinearPdfJob,
  [exportGlossesJob.type]: exportGlossesJob,
  [exportGlossesChildJob.type]: exportGlossesChildJob,
  [exportGlossesFinalizeJob.type]: exportGlossesFinalizeJob,
  [importAIGlossesJob.type]: importAIGlossesJob,
  [syncAIGlossLanguagesJob.type]: syncAIGlossLanguagesJob,
} satisfies Record<string, JobDefinition<any, any, any, any>>;

export type JobRegistry = typeof jobRegistry;
export type JobType = keyof JobRegistry;

export type JobPayload<T extends JobType> = z.output<
  JobRegistry[T]["payloadSchema"]
>;
export type JobPayloadInput<T extends JobType> = z.input<
  JobRegistry[T]["payloadSchema"]
>;
export type JobData<T extends JobType> =
  JobRegistry[T] extends { dataSchema: z.ZodType<infer D> } ? D : undefined;

export type IsChildJob<T extends JobType> =
  JobRegistry[T] extends { isChildJob: true } ? true : false;
export type HasVoidPayload<T extends JobType> =
  JobPayload<T> extends void ? true : false;
