import type jobRepository from "@/shared/jobs/JobRepository";
import { EXPORT_JOB_TYPES } from "../jobs/jobTypes";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";

export default class GetInterlinearExportStatus {
  constructor(
    private readonly deps: {
      jobRepository: typeof jobRepository;
    },
  ) {}

  async execute(jobId: string) {
    const job = await this.deps.jobRepository.getById<
      ExportInterlinearPdfJobPayload,
      ExportInterlinearPdfJobData
    >(jobId);

    if (!job || job.type !== EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF) {
      return undefined;
    }

    return job;
  }
}
