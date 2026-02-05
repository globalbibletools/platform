import { JobStatus } from "../model";

export interface JobTable {
  id: string;
  type: string;
  status: JobStatus;
  payload: unknown | null;
  data: unknown | null;
  created_at: Date;
  updated_at: Date;
}
