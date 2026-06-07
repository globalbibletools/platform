import type { JobRegistry, JobType } from "./jobRegistry";
import { exportGlossesHandler } from "@/modules/export/jobs/exportGlossesHandler";
import { exportGlossesChildHandler } from "@/modules/export/jobs/exportGlossesChildHandler";
import { exportGlossesFinalizeHandler } from "@/modules/export/jobs/exportGlossesFinalizeHandler";
import { exportInterlinearPdfHandler } from "@/modules/export/jobs/exportInterlinearPdfHandler";
import { exportAnalyticsHandler } from "@/modules/reporting/jobs/exportAnalyticsHandler";
import { updateBookCompletionProgressHandler } from "@/modules/reporting/jobs/updateBookCompletionProgressHandler";
import { importAIGlossesHandler } from "@/modules/translation/jobs/importAIGlossesHandler";
import { syncAIGlossLanguagesHandler } from "@/modules/translation/jobs/syncAIGlossLanguagesHandler";
import { sendEmailHandler } from "@/shared/email/jobs/sendEmailHandler";

export type JobHandlerRegistry = {
  [Type in JobType]: {
    handler: (job: InstanceType<JobRegistry[Type]>) => Promise<void>;
    timeout?: number;
  };
};

export const jobHandlerRegistry: JobHandlerRegistry = {
  send_email: {
    handler: sendEmailHandler,
    timeout: 60 * 5,
  },
  export_analytics: {
    handler: exportAnalyticsHandler,
    timeout: 60 * 5,
  },
  update_book_completion_progress: {
    handler: updateBookCompletionProgressHandler,
    timeout: 60 * 15,
  },
  export_interlinear_pdf: {
    handler: exportInterlinearPdfHandler,
    timeout: 60 * 15,
  },
  export_glosses: {
    handler: exportGlossesHandler,
    timeout: 60 * 15,
  },
  export_glosses_child: {
    handler: exportGlossesChildHandler,
    timeout: 60 * 15,
  },
  export_glosses_finalize: {
    handler: exportGlossesFinalizeHandler,
    timeout: 60 * 5,
  },
  import_ai_glosses: {
    handler: importAIGlossesHandler,
    timeout: 60 * 15,
  },
  sync_ai_gloss_languages: {
    handler: syncAIGlossLanguagesHandler,
    timeout: 60 * 5,
  },
};
