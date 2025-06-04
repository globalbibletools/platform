import { ulid } from "@/shared/ulid";
import trackingEventRepository from "../data-access/TrackingEventRepository";
import { logger } from "@/logging";

export type EventData = {
  [key: string]: any;
  userId?: string;
  languageId?: string;
};

export type BulkEvent = EventData & {
  type: string;
};

export interface TrackingClient {
  trackEvent(event: string, data?: any): Promise<void>;

  trackManyEvents(events: BulkEvent[]): Promise<void>;
}

const trackingClient = {
  async trackEvent(event: string, data?: any): Promise<void> {
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

  async trackManyEvents(events: BulkEvent[]): Promise<void> {
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
