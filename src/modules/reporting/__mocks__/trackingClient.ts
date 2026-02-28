import { beforeEach, vitest } from "vitest";
import trackingEventRepository from "../data-access/trackingEventRepository";
import { createMockRepository } from "@/db";

const trackingClient = createMockRepository<typeof trackingEventRepository>({
  trackOne: vitest.fn(),
  trackMany: vitest.fn(),
});
export default trackingClient;

beforeEach(() => {
  trackingClient.trackOne.mockReset();
  trackingClient.trackMany.mockReset();
});
