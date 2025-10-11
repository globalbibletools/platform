export enum JobStatus {
  Pending = "pending",
  InProgress = "in-progress",
  Complete = "complete",
  Failed = "error",
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
