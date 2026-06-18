import { createJobModel } from "./model";
import { SendEmailJob } from "@/shared/email/jobs/SendEmailJob";
import { ExportAnalyticsJob } from "@/modules/reporting/jobs/ExportAnalyticsJob";
import { UpdateBookCompletionProgressJob } from "@/modules/reporting/jobs/UpdateBookCompletionProgressJob";
import { ExportInterlinearPdfJob } from "@/modules/export/jobs/ExportInterlinearPdfJob";
import { ExportGlossesJob } from "@/modules/export/jobs/ExportGlossesJob";
import { ExportGlossesChildJob } from "@/modules/export/jobs/ExportGlossesChildJob";
import { ExportGlossesFinalizeJob } from "@/modules/export/jobs/ExportGlossesFinalizeJob";
import { ImportAIGlossesJob } from "@/modules/translation/jobs/ImportAIGlossesJob";
import { SyncAIGlossLanguagesJob } from "@/modules/translation/jobs/SyncAIGlossLanguagesJob";
import { ExportGlossesSqliteJob } from "@/modules/export/jobs/ExportGlossesSqliteJob";

export const jobRegistry = {
  [SendEmailJob.type]: SendEmailJob,
  [ExportAnalyticsJob.type]: ExportAnalyticsJob,
  [UpdateBookCompletionProgressJob.type]: UpdateBookCompletionProgressJob,
  [ExportInterlinearPdfJob.type]: ExportInterlinearPdfJob,
  [ExportGlossesJob.type]: ExportGlossesJob,
  [ExportGlossesChildJob.type]: ExportGlossesChildJob,
  [ExportGlossesFinalizeJob.type]: ExportGlossesFinalizeJob,
  [ImportAIGlossesJob.type]: ImportAIGlossesJob,
  [SyncAIGlossLanguagesJob.type]: SyncAIGlossLanguagesJob,
  [ExportGlossesSqliteJob.type]: ExportGlossesSqliteJob,
} satisfies Record<
  string,
  ReturnType<typeof createJobModel<any, any, any, any>>
>;

export type JobRegistry = typeof jobRegistry;
export type JobType = keyof JobRegistry;
export type Job = InstanceType<JobRegistry[JobType]>;

export type JobPayload<T extends JobType> =
  JobRegistry[T] extends { "~types"?: { Payload: infer Payload } } ? Payload
  : never;
export type JobPayloadInput<T extends JobType> =
  JobRegistry[T] extends { "~types"?: { Input: infer Input } } ? Input : never;
export type JobData<T extends JobType> =
  JobRegistry[T] extends { "~types"?: { Data: infer Data } } ? Data : never;
