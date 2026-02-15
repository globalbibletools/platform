import { PDFDocument } from "pdf-lib";
import { Readable } from "stream";
import { logger } from "@/logging";
import { Job } from "@/shared/jobs/model";
import { getStorageEnvironment } from "@/shared/storageEnvironment";
import exportStorageRepository from "../data-access/ExportStorageRepository";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";
import { EXPORT_JOB_TYPES } from "./jobTypes";

export async function exportInterlinearPdfJob(
  job: Job<ExportInterlinearPdfJobPayload>,
): Promise<ExportInterlinearPdfJobData> {
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

    const url = await exportStorageRepository.presignPdf({
      environment,
      key: exportKey,
      expiresInSeconds: 60 * 60 * 24,
    });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    jobLogger.info({ url, exportKey }, "Interlinear placeholder PDF uploaded");
    return { exportKey, downloadUrl: url, expiresAt };
  } catch (error) {
    jobLogger.error({ err: error }, "Interlinear export job failed");
    throw error;
  }
}

export default exportInterlinearPdfJob;
