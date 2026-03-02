import { beforeEach, MockedObject, vitest } from "vitest";
import trackingEventRepository from "../data-access/trackingEventRepository";

const trackingClient: MockedObject<typeof trackingEventRepository> = {
  trackOne: vitest.fn(),
  trackMany: vitest.fn(),
};
export default trackingClient;

beforeEach(() => {
  trackingClient.trackOne.mockReset();
  trackingClient.trackMany.mockReset();
});
