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
    exportKey: string;
  }>(
    `with expired as (
       select id, export_key
       from export_request
       where export_key is not null
         and (
           (expires_at is not null and expires_at < now())
           or (expires_at is null and requested_at < now() - ($1 * interval '1 day'))
         )
     )
     update export_request er
     set download_url = null,
         export_key = null
     from expired e
     where er.id = e.id
     returning e.export_key as "exportKey"`,
    [expiryFallbackDays],
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

  await query(
    `delete from export_request
     where coalesce(expires_at, requested_at) < now() - ($1 * interval '1 day')`,
    [expiryFallbackDays],
  );

  return { deleted: expiredKeys.rows.length };
}

export default cleanupExportsJob;
