import { beforeEach, vitest } from "vitest";
import { BulkEvent, TrackingClient } from "../trackingClient";

const trackingClient = {
  trackEvent: vitest.fn<(event: string, data?: any) => Promise<void>>(),
  trackManyEvents: vitest.fn<(events: BulkEvent[]) => Promise<void>>(),
} satisfies TrackingClient;
export default trackingClient;

beforeEach(() => {
  trackingClient.trackEvent.mockReset();
  trackingClient.trackManyEvents.mockReset();
});
