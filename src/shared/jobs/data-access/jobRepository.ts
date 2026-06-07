import { getDb } from "@/db";
import { jobRegistry, Job } from "../jobRegistry";

const jobRepository = {
  async getById(id: string): Promise<Job | undefined> {
    const raw = await getDb()
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

    if (!raw) return;

    const JobModel = jobRegistry[raw.type];
    if (!JobModel) {
      throw new Error(`Missing job model for job type ${raw.type}`);
    }

    const job = JobModel.fromRaw({
      id: raw.id,
      parentJobId: raw.parentJobId ?? undefined,
      type: raw.type,
      status: raw.status,
      payload: raw.payload,
      data: raw.data,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });

    return job;
  },

  async commit(job: Job): Promise<void> {
    await getDb()
      .insertInto("job")
      .values({
        id: job.id,
        parent_job_id: job.parentJobId ?? null,
        type: job.type,
        status: job.status,
        payload: job.payload ?? null,
        data: job.data ?? null,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          status: job.status,
          data: job.data ?? null,
          updated_at: job.updatedAt,
        }),
      )
      .execute();
  },
};
export default jobRepository;
