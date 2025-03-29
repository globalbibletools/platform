import { beforeEach, vitest } from "vitest";

export const enqueueJob = vitest.fn();

beforeEach(() => {
  enqueueJob.mockReset();
});
