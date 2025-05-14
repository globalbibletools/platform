import { ulid } from "@/shared/ulid";
import trackingEventRepository from "../data-access/TrackingEventRepository";
import { logger } from "@/logging";

export type EventData<Data> = Data & {
  userId?: string;
  languageId?: string;
};

export interface TrackingClient {
  trackEvent(event: string): Promise<void>;
  trackEvent<Data>(event: string, data: EventData<Data>): Promise<void>;
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

      await trackingEventRepository.create({
        id: ulid(),
        type: event,
        data: rest,
        userId,
        languageId,
      });
    } catch (error) {
      childLogger.error({ err: error }, "Failed to log event");
    }
  },
} satisfies TrackingClient;
export default trackingClient;
