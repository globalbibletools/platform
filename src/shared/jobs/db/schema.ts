import { JobStatus } from "../model";

/**
 * A background job managed by the job worker process.
 * Jobs are created by the application and picked up asynchronously by workers.
 */
export interface JobTable {
  /** Unique identifier for the job, typically a UUID. */
  id: string;
  /** The job type string that determines which worker handler processes it. */
  type: string;
  /** The current execution status of the job (e.g. pending, running, done, failed). */
  status: JobStatus;
  /** The input payload passed to the worker when the job was enqueued. */
  payload: unknown | null;
  /** Output or intermediate data written by the worker during execution. */
  data: unknown | null;
  /** Timestamp of when the job was created. */
  created_at: Date;
  /** Timestamp of the last status or data update to the job. */
  updated_at: Date;
}
