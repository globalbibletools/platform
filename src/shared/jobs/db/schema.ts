import { JSONColumnType } from "kysely";
import { JobStatus } from "../model";

export interface JobTable {
  id: string;
  parent_job_id: string | null;
  type: string;
  status: JobStatus;
  payload: JSONColumnType<any> | null;
  data: JSONColumnType<any> | null;
  created_at: Date;
  updated_at: Date;
}
