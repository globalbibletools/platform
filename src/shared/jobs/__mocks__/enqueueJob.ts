import { ulid } from "@/shared/ulid";
import { beforeEach, vitest } from "vitest";
import { JobStatus } from "../types";

export const enqueueJob = vitest.fn(
  (options: { type: string; payload?: any; parentJobId?: string }) => {
    const date = new Date();
    return {
      id: ulid(),
      type: options.type,
      parentJobId: options.parentJobId,
      status: JobStatus.Pending,
      payload: options.payload,
      createdAt: date,
      updatedAt: date,
    };
  },
);

beforeEach(() => {
  enqueueJob.mockReset();
});
