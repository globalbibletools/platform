export type ExportLayout = "standard" | "parallel";

export enum ExportRequestStatusRaw {
  Pending = "PENDING",
  InProgress = "IN_PROGRESS",
  Complete = "COMPLETE",
  Failed = "FAILED",
}

export type ExportRequestStatus =
  | ExportRequestStatusRaw.Pending
  | ExportRequestStatusRaw.InProgress
  | ExportRequestStatusRaw.Complete
  | ExportRequestStatusRaw.Failed;

export interface ExportRequest {
  id: string;
  languageId: string;
  bookId?: number;
  chapters?: number[];
  layout: ExportLayout;
  status: ExportRequestStatus;
  jobId?: string;
  downloadUrl?: string;
  expiresAt?: Date;
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
}
