import { query } from "@/db";
import { JobStatus } from "@/shared/jobs/model";
import type {
  ExportInterlinearPdfJobData,
  ExportInterlinearPdfJobPayload,
} from "../model";
import { EXPORT_JOB_TYPES } from "../jobs/jobTypes";

export interface ExportJobRow {
  id: string;
  type: string;
  status: JobStatus;
  payload: ExportInterlinearPdfJobPayload;
  data?: ExportInterlinearPdfJobData;
  createdAt: Date;
  updatedAt: Date;
}

const exportJobQueryService = {
  async findRecentForLanguage(
    languageCode: string,
    limit = 10,
  ): Promise<ExportJobRow[]> {
    const result = await query<ExportJobRow>(
      `
        select
          job.id,
          job.status,
          job.payload,
          job.data,
          job.created_at as "createdAt",
          job.updated_at as "updatedAt",
          job.type
        from job
        where job.type = $1
          and job.payload->>'languageCode' = $2
        order by job.created_at desc
        limit $3
      `,
      [EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF, languageCode, limit],
    );

    return result.rows;
  },

  async findPendingForLanguage(
    languageCode: string,
  ): Promise<ExportJobRow | undefined> {
    const result = await query<ExportJobRow>(
      `
        select
          job.id,
          job.status,
          job.payload,
          job.data,
          job.created_at as "createdAt",
          job.updated_at as "updatedAt",
          job.type
        from job
        where job.type = $1
          and job.payload->>'languageCode' = $2
          and job.status in ($3, $4)
        order by job.created_at desc
        limit 1
      `,
      [
        EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF,
        languageCode,
        JobStatus.Pending,
        JobStatus.InProgress,
      ],
    );

    return result.rows[0];
  },
};

export default exportJobQueryService;
