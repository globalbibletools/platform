import { ulid } from "@/shared/ulid";
import trackingEventRepository from "../data-access/TrackingEventRepository";
import { logger } from "@/logging";
import { TrackingEvent } from "../model";

export type EventData = {
  [key: string]: any;
  userId?: string;
  languageId?: string;
};

export interface TrackingClient {
  trackEvent<EventType extends TrackingEvent["type"]>(
    event: EventType,
    data?: Omit<
      Extract<TrackingEvent, { type: EventType }>,
      "type" | "createdAt"
    >,
  ): Promise<void>;

  trackManyEvents(events: Omit<TrackingEvent, "createdAt">[]): Promise<void>;
}

const trackingClient = {
  async trackEvent<EventType extends TrackingEvent["type"]>(
    event: EventType,
    data?: Omit<
      Extract<TrackingEvent, { type: EventType }>,
      "type" | "createdAt"
    >,
  ): Promise<void> {
    const childLogger = logger.child({
      module: "trackingClient",
    });
    try {
      const { userId = null, languageId = null, ...rest } = data ?? {};

      await trackingEventRepository.createMany([
        {
          id: ulid(),
          type: event,
          data: rest,
          userId,
          languageId,
        },
      ]);
    } catch (error) {
      console.log(error);
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
      await trackingEventRepository.createMany(
        events.map(({ type, userId = null, languageId = null, ...rest }) => ({
          id: ulid(),
          type,
          data: rest,
          userId,
          languageId,
        })),
      );
    } catch (error) {
      childLogger.error({ err: error }, "Failed to log event");
    }
  },
} satisfies TrackingClient;
export default trackingClient;
