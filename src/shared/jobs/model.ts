export enum JobStatus {
  Pending = "pending",
  InProgress = "in-progress",
  Complete = "complete",
  Failed = "error",
}

export interface Job<
  Type extends string = string,
  Payload = unknown,
  Data = unknown,
> {
  id: string;
  parentJobId?: string;
  type: Type;
  status: JobStatus;
  payload: Payload;
  data?: Data;
  createdAt: Date;
  updatedAt: Date;
}
