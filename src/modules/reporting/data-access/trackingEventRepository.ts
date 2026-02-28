import { createRepository } from "@/db";
import { TrackingEvent } from "../model";
import { ulid } from "@/shared/ulid";

type DistributiveOmit<T, K extends keyof T> =
  T extends unknown ? Omit<T, K> : never;

type InsertableTrackingEvent = DistributiveOmit<
  TrackingEvent,
  "createdAt" | "id"
> & { createdAt?: Date };

const trackingEventRepository = createRepository((getDb) => ({
  async trackOne(event: InsertableTrackingEvent): Promise<void> {
    await this.trackMany([event]);
  },

  async trackMany(events: InsertableTrackingEvent[]): Promise<void> {
    const now = new Date();
    await getDb()
      .insertInto("tracking_event")
      .values(
        events.map(({ type, languageId, userId, createdAt, ...data }) => ({
          id: ulid(),
          type,
          created_at: createdAt ?? now,
          user_id: userId,
          language_id: languageId,
          data: JSON.stringify(data),
        })),
      )
      .execute();
  },
}));
export default trackingEventRepository;
