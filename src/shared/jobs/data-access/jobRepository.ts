import { getDb } from "@/db";
import { Job, JobStatus } from "../model";

const jobRepository = {
  async getById<Payload, Data = unknown>(
    id: string,
  ): Promise<Job<Payload, Data> | undefined> {
    const job = await getDb()
      .selectFrom("job")
      .where("id", "=", id)
      .select([
        "id",
        "parent_job_id as parentJobId",
        "type",
        "status",
        "payload",
        "data",
        "created_at as createdAt",
        "updated_at as updatedAt",
      ])
      .executeTakeFirst();

    if (!job) return;

    return {
      ...job,
      parentJobId: job.parentJobId ?? undefined,
      payload: (job.payload ?? undefined) as Payload,
      data: (job.data as Data) ?? undefined,
    };
  },

  async create(job: Job<any>) {
    await getDb()
      .insertInto("job")
      .values({
        id: job.id,
        parent_job_id: job.parentJobId,
        type: job.type,
        status: job.status,
        payload: job.payload,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      })
      .execute();
  },

  async update(jobId: string, status: JobStatus, data?: any): Promise<void> {
    await getDb()
      .updateTable("job")
      .where("id", "=", jobId)
      .set({
        status,
        updated_at: new Date(),
        ...(data && { data }),
      })
      .execute();
  },

  async updateData(jobId: string, data: any): Promise<void> {
    await getDb()
      .updateTable("job")
      .where("id", "=", jobId)
      .set({
        updated_at: new Date(),
        data,
      })
      .execute();
  },
};
export default jobRepository;
