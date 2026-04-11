import { PDFDocument } from "pdf-lib";
import { Readable } from "stream";
import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import jobRepository from "@/shared/jobs/data-access/jobRepository";
import { getStorageEnvironment } from "@/shared/storageEnvironment";
import exportStorageRepository from "../data-access/ExportStorageRepository";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";
import { EXPORT_JOB_TYPES } from "./jobTypes";

export async function exportInterlinearPdfJob(
  job: Job<ExportInterlinearPdfJobPayload>,
): Promise<void> {
  const jobLogger = logger.child({ jobId: job.id, jobType: job.type });

  const environment = getStorageEnvironment();

  if (job.type !== EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF) {
    jobLogger.error(
      `received job type ${job.type}, expected ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}`,
    );
    throw new Error(
      `Expected job type ${EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF}, but received ${job.type}`,
    );
  }

  const exportKey = `interlinear/${job.payload.languageCode}/${job.id}.pdf`;

  try {
    const placeholderPdf = await PDFDocument.create();
    placeholderPdf.addPage();
    const bytes = await placeholderPdf.save();
    await exportStorageRepository.uploadPdf({
      environment,
      key: exportKey,
      stream: Readable.from([bytes]),
    });

    const data: ExportInterlinearPdfJobData = { exportKey };
    await jobRepository.updateData(job.id, data);

    jobLogger.info({ exportKey }, "Interlinear placeholder PDF uploaded");
  } catch (error) {
    jobLogger.error({ err: error }, "Interlinear export job failed");
    throw error;
  }
}

export default exportInterlinearPdfJob;
