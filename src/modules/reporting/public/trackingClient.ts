import { ulid } from "@/shared/ulid";
import trackingEventRepository from "../data-access/TrackingEventRepository";
import { logger } from "@/logging";

export type EventData<Data> = Data & {
  userId?: string;
  languageId?: string;
};

export interface BulkEvent {
  [key: string]: any;
  type: string;
  userId?: string;
  languageId?: string;
}

export interface TrackingClient {
  trackEvent(event: string): Promise<void>;
  trackEvent<Data>(event: string, data: EventData<Data>): Promise<void>;

  trackManyEvents(events: BulkEvent[]): Promise<void>;
}

const trackingClient = {
  async trackEvent<Data = undefined>(
    event: string,
    data?: EventData<Data>,
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

  async trackManyEvents(events: BulkEvent[]): Promise<void> {
    const childLogger = logger.child({
      module: "trackingClient",
    });
    for (const event of events) {
      try {
        const { type, userId = null, languageId = null, ...rest } = event ?? {};

        await trackingEventRepository.createMany([
          {
            id: ulid(),
            type,
            data: rest,
            userId,
            languageId,
          },
        ]);
      } catch (error) {
        childLogger.error({ err: error }, "Failed to log event");
      }
    }
  },
} satisfies TrackingClient;
export default trackingClient;
