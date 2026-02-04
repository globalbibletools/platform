import { query } from "@/db";
import { Job, JobStatus } from "./model";

const jobRepository = {
  async getById<Payload, Data = unknown>(
    id: string,
  ): Promise<Job<Payload, Data> | undefined> {
    const result = await query<Job<Payload, Data>>(
      `
        select
            id,
            (select name from job_type where id = job.type_id) as type,
            status,
            payload,
            data,
            created_at as "createdAt",
            updated_at as "updatedAt"
        from job
        where id = $1
      `,
      [id],
    );

    return result.rows[0];
  },

  async create(job: Job<any>) {
    await query(
      `
      insert into job (id, status, payload, created_at, updated_at, type, type_id)
      values (
        $1, $2, $3, $4, $5, $6,
        (select id from job_type where name = $6)
      )
    `,
      [job.id, job.status, job.payload, job.createdAt, job.updatedAt, job.type],
    );
  },

  async update(jobId: string, status: JobStatus, data?: any): Promise<void> {
    await query(
      `
      update job set
        status = $2,
        data = $3,
        updated_at = now()
      where id = $1
    `,
      [jobId, status, data],
    );
  },
};
export default jobRepository;
