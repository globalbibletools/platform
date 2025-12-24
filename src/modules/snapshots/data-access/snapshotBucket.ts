import type { StorageEnvironment } from "@/shared/storageEnvironment";

const SNAPSHOT_BUCKET_PREFIX =
  process.env.SNAPSHOT_BUCKET_PREFIX ?? "gbt-snapshots";

export function snapshotBucketName(environment: StorageEnvironment): string {
  return `${SNAPSHOT_BUCKET_PREFIX}-${environment}`;
}
