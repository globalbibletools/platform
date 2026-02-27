import { ulid } from "@/shared/ulid";
import trackingEventRepository from "../data-access/trackingEventRepository";
import { logger } from "@/logging";
import { TrackingEvent } from "../model";

const trackingClient = {
  async trackEvent<EventType extends TrackingEvent["type"]>(
    event: EventType,
    data: Omit<
      Extract<TrackingEvent, { type: EventType }>,
      "type" | "createdAt"
    >,
  ): Promise<void> {
    const childLogger = logger.child({
      module: "trackingClient",
    });
    try {
      await trackingEventRepository.createMany([
        {
          type: event,
          ...data,
        },
      ]);
    } catch (error) {
      childLogger.error({ err: error }, "Failed to log event");
    }
  },

  async trackManyEvents(
    events: Omit<TrackingEvent, "createdAt">[],
  ): Promise<void> {
    const childLogger = logger.child({
      module: "trackingClient",
    });
    try {
      await trackingEventRepository.createMany(events);
    } catch (error) {
      childLogger.error({ err: error }, "Failed to log event");
    }
  },
};
export default trackingClient;
