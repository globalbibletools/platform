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
  };
};

export const jobHandlerRegistry: JobHandlerRegistry = {
  send_email: {
    handler: sendEmailHandler,
  },
  export_analytics: {
    handler: exportAnalyticsHandler,
  },
  update_book_completion_progress: {
    handler: updateBookCompletionProgressHandler,
  },
  export_interlinear_pdf: {
    handler: exportInterlinearPdfHandler,
  },
  export_glosses: {
    handler: exportGlossesHandler,
  },
  export_glosses_child: {
    handler: exportGlossesChildHandler,
  },
  export_glosses_finalize: {
    handler: exportGlossesFinalizeHandler,
  },
  import_ai_glosses: {
    handler: importAIGlossesHandler,
  },
  sync_ai_gloss_languages: {
    handler: syncAIGlossLanguagesHandler,
  },
};
