import { JobStatus } from "../model";

export interface JobTable {
  id: string;
  parent_job_id: string | null;
  type: string;
  status: JobStatus;
  payload: unknown | null;
  data: unknown | null;
  created_at: Date;
  updated_at: Date;
}
