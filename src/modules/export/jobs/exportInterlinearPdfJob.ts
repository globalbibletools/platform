import { Job } from "@/shared/jobs/model";
import { logger } from "@/logging";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";

export async function exportInterlinearPdfJob(
  job: Job<ExportInterlinearPdfJobPayload>,
): Promise<ExportInterlinearPdfJobData> {
  const jobLogger = logger.child({ jobId: job.id, jobType: job.type });

  if (job.type !== EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF) {
    jobLogger.error(
      `received job type ${job.type}, expected ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}`,
    );
    throw new Error(
      `Expected job type ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}, but received ${job.type}`,
    );
  }

  try {
    jobLogger.info("Interlinear export job completed (noop)");
    return {};
  } catch (error) {
    jobLogger.error({ err: error }, "Interlinear export job failed");
    throw error;
  }
}

export default exportInterlinearPdfJob;
