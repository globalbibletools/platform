import { JobType } from "../jobRegistry";
import { JobStatus } from "../model";

export interface JobTable {
  id: string;
  parent_job_id: string | null;
  type: JobType;
  status: JobStatus;
  payload: unknown | null;
  data: unknown | null;
  created_at: Date;
  updated_at: Date;
}
