import { query } from "@/db";
import { Job, JobStatus } from "./model";

const jobRepository = {
  async create(job: Job<any>) {
    await query(
      `
      insert into job (id, status, payload, created_at, updated_at, type_id)
      values (
        $1, $2, $3, $4, $5,
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
