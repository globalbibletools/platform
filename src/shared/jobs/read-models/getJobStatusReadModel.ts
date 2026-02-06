import { getDb } from "@/db";
import { JobStatus } from "../model";

export interface JobStatusReadModel {
  id: string;
  type: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
}

export async function getJobStatusReadModel(
  jobId: string,
): Promise<JobStatusReadModel | undefined> {
  return await getDb()
    .selectFrom("job")
    .where("id", "=", jobId)
    .select([
      "id",
      "type",
      "status",
      "created_at as createdAt",
      "updated_at as updatedAt",
    ])
    .executeTakeFirst();
}
