import { sendEmailJob } from "@/mailer";
import { Job } from "./model";
import { exportAnalyticsJob } from "@/modules/reporting/jobs/exportAnalyticsJob";
import { REPORTING_JOB_TYPES } from "@/modules/reporting/jobs/jobTypes";
import { TRANSLATION_JOB_TYPES } from "@/modules/translation/jobs/jobTypes";
import { exportLanguagesJob } from "@/modules/translation/jobs/exportLanguagesJob";
import { exportLanguageJob } from "@/modules/translation/jobs/exportLanguageJob";

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
  [TRANSLATION_JOB_TYPES.EXPORT_LANGUAGES]: {
    handler: exportLanguagesJob,
    timeout: 60 * 5, // 5 minutes
  },
  [TRANSLATION_JOB_TYPES.EXPORT_LANGUAGE]: {
    handler: exportLanguageJob,
    timeout: 60 * 10, // 10 minutes
  },
};

export default jobMap;
