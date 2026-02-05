import { sendEmailJob } from "@/mailer";
import { Job } from "./model";
import { exportAnalyticsJob } from "@/modules/reporting/jobs/exportAnalyticsJob";
import { REPORTING_JOB_TYPES } from "@/modules/reporting/jobs/jobTypes";
import { SNAPSHOT_JOB_TYPES } from "@/modules/snapshots/jobs/jobTypes";
import { createSnapshotJob } from "@/modules/snapshots/jobs/createSnapshotJob";
import { restoreSnapshotJob } from "@/modules/snapshots/jobs/restoreSnapshotJob";
import { EXPORT_JOB_TYPES } from "@/modules/export/jobs/jobTypes";
import exportInterlinearPdfJob from "@/modules/export/jobs/exportInterlinearPdfJob";
import { TRANSLATION_JOB_TYPES } from "@/modules/translation/jobs/jobType";
import { importAIGlosses } from "@/modules/translation/jobs/importAIGlosses";

export type JobHandler<Payload, Data = unknown> = (
  job: Job<Payload, Data>,
) => Promise<Data>;

type JobMapEntry<Payload, Data = unknown> =
  | {
      handler: JobHandler<Payload, Data>;
      timeout?: number;
    }
  | JobHandler<Payload, Data>;

const jobMap: Record<string, JobMapEntry<any>> = {
  send_email: {
    handler: sendEmailJob,
    timeout: 60 * 5, // 5 minutes
  },
  [REPORTING_JOB_TYPES.EXPORT_ANALYTICS]: {
    handler: exportAnalyticsJob,
    timeout: 60 * 5, // 5 minutes
  },
  [EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF]: {
    handler: exportInterlinearPdfJob,
    timeout: 60 * 5, // 5 minutes
  },
  [SNAPSHOT_JOB_TYPES.CREATE_SNAPSHOT]: {
    handler: createSnapshotJob,
    timeout: 60 * 15, // 15 minutes
  },
  [SNAPSHOT_JOB_TYPES.RESTORE_SNAPSHOT]: {
    handler: restoreSnapshotJob,
    timeout: 60 * 15, // 15 minutes
  },
  [TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES]: {
    handler: importAIGlosses,
    timeout: 60 * 15, // 15 minutes
  },
};

export default jobMap;
