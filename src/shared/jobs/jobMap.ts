import { sendEmailJob } from "@/mailer";
import { Job } from "./model";
import { exportAnalyticsJob } from "@/modules/reporting/jobs/exportAnalyticsJob";
import { updateBookCompletionProgressJob } from "@/modules/reporting/jobs/updateBookCompletionProgress";
import { REPORTING_JOB_TYPES } from "@/modules/reporting/jobs/jobTypes";
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
  [REPORTING_JOB_TYPES.UPDATE_BOOK_COMPLETION_PROGRESS]: {
    handler: updateBookCompletionProgressJob,
    timeout: 60 * 15, // 15 minutes
  },
  [EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF]: {
    handler: exportInterlinearPdfJob,
    timeout: 60 * 5, // 5 minutes
  },
  [TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES]: {
    handler: importAIGlosses,
    timeout: 60 * 15, // 15 minutes
  },
};

export default jobMap;
