import { getDb } from "@/db";
import { Job, JobStatus } from "../model";
import { JobData, JobPayload, jobRegistry, JobType } from "../jobRegistry";

const jobRepository = {
  async getById<Type extends JobType>(
    id: string,
  ): Promise<Job<Type, JobPayload<Type>, JobData<Type>> | undefined> {
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

    const jobDefinition = jobRegistry[job.type];
    if (!jobDefinition) {
      throw new Error(`Missing job definition for job ${job.type}`);
    }

    // I'm not sure how to avoid the type casts here,
    // but this should ensure the result matches the job type.
    return {
      ...job,
      type: job.type as Type,
      parentJobId: job.parentJobId ?? undefined,
      payload: jobDefinition.payloadSchema.parse(job.payload),
      data: jobDefinition.dataSchema?.parse(job.data) as JobData<Type>,
    };
  },

  async create(job: Job<any, any, any>) {
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
