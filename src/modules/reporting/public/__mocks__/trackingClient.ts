import { beforeEach, MockedObject, vitest } from "vitest";
import originalTrackingClient from "../trackingClient";

const trackingClient: MockedObject<typeof originalTrackingClient> = {
  trackEvent: vitest.fn(),
  trackManyEvents: vitest.fn(),
};
export default trackingClient;

beforeEach(() => {
  trackingClient.trackEvent.mockReset();
  trackingClient.trackManyEvents.mockReset();
});
