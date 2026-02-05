import { ulid } from "@/shared/ulid";
import { beforeEach, vitest } from "vitest";
import { JobStatus } from "../model";

export const enqueueJob = vitest.fn((type: string, payload?: any) => {
  const date = new Date();
  return {
    id: ulid(),
    type,
    status: JobStatus.Pending,
    payload,
    createdAt: date,
    updatedAt: date,
  };
});

beforeEach(() => {
  enqueueJob.mockReset();
});
