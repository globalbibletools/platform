import { EXPORT_JOB_TYPES } from "../jobs/jobTypes";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";
import jobRepository from "@/shared/jobs/JobRepository";

export async function getInterlinearExportStatus(jobId: string) {
  const job = await jobRepository.getById<
    ExportInterlinearPdfJobPayload,
    ExportInterlinearPdfJobData
  >(jobId);

  if (!job || job.type !== EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF) {
    return undefined;
  }

  return job;
}
