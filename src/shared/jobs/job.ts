import { query } from "@/db";

export enum JobStatus {
  Pending = "pending",
  InProgress = "in-progress",
  Complete = "complete",
  Failed = "failed",
}

export interface Job<Payload, Data = unknown> {
  id: string;
  type: string;
  status: JobStatus;
  payload: Payload;
  data?: Data;
  createdAt: Date;
  updatedAt: Date;
}

export async function createJob(job: Job<any>) {
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
}

export async function startJob(jobId: string): Promise<void> {
  await query(
    `
      update job set
        status = 'in-progress',
        updated_at = now()
      where id = $1
    `,
    [jobId],
  );
}

export async function completeJob(jobId: string, data?: any): Promise<void> {
  await query(
    `
      update job set
        status = 'complete',
        data = $2,
        updated_at = now()
      where id = $1
    `,
    [jobId, data],
  );
}

export async function failJob(jobId: string, data?: any): Promise<void> {
  await query(
    `
      update job set
        status = 'failed',
        data = $2,
        updated_at = now()
      where id = $1
    `,
    [jobId, data],
  );
}
