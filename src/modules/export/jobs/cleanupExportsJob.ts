import { logger } from "@/logging";
import { query } from "@/db";
import exportStorageRepository from "@/modules/export/data-access/ExportStorageRepository";
import { Job } from "@/shared/jobs/model";
import { EXPORT_JOB_TYPES } from "./jobTypes";
import { getStorageEnvironment } from "@/shared/storageEnvironment";

const DEFAULT_EXPIRY_FALLBACK_DAYS = 7;

function getExpiryFallbackDays(): number {
  const raw = process.env.EXPORT_EXPIRY_FALLBACK_DAYS;
  if (!raw) return DEFAULT_EXPIRY_FALLBACK_DAYS;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_EXPIRY_FALLBACK_DAYS;
  }
  return parsed;
}

export async function cleanupExportsJob(job: Job<void>) {
  const jobLogger = logger.child({
    jobId: job.id,
    jobType: EXPORT_JOB_TYPES.CLEANUP_EXPORTS,
  });
  const environment = getStorageEnvironment();
  const expiryFallbackDays = getExpiryFallbackDays();

  const expiredKeys = await query<{
    jobId: string;
    exportKey: string;
  }>(
    `with expired as (
        select j.id,
               j.data->>'exportKey' as export_key
        from job j
        join job_type jt on jt.id = j.type_id
        where jt.name = $1
          and j.status = 'complete'
          and (j.data->>'exportKey') is not null
          and (
            ((j.data->>'expiresAt') is not null and (j.data->>'expiresAt')::timestamptz < now())
            or ((j.data->>'expiresAt') is null and j.created_at < now() - ($2 * interval '1 day'))
          )
      )
      update job j
      set data = (coalesce(j.data, '{}'::jsonb) - 'downloadUrl' - 'exportKey' - 'expiresAt')
      from expired e
      where j.id = e.id
      returning j.id as "jobId", e.export_key as "exportKey"`,
    [EXPORT_JOB_TYPES.EXPORT_INTERLINEAR_PDF, expiryFallbackDays],
  );

  for (const row of expiredKeys.rows) {
    try {
      await exportStorageRepository.deleteObject({
        environment,
        key: row.exportKey,
      });
      jobLogger.info({ key: row.exportKey }, "Deleted expired export");
    } catch (error) {
      jobLogger.error(
        { err: error, key: row.exportKey },
        "Failed deleting expired export",
      );
    }
  }

  return { deleted: expiredKeys.rows.length };
}

export default cleanupExportsJob;
