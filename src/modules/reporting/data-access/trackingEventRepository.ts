import { Database, getDb } from "@/db";
import { TrackingEvent } from "../model";
import { ulid } from "@/shared/ulid";
import { Transaction } from "kysely";

type DistributiveOmit<T, K extends keyof T> =
  T extends unknown ? Omit<T, K> : never;

type InsertableTrackingEvent = DistributiveOmit<
  TrackingEvent,
  "createdAt" | "id"
> & { createdAt?: Date };

const trackingEventRepository = {
  async trackOne(
    event: InsertableTrackingEvent,
    trx?: Transaction<Database>,
  ): Promise<void> {
    await this.trackMany([event], trx);
  },

  async trackMany(
    events: InsertableTrackingEvent[],
    trx?: Transaction<Database>,
  ): Promise<void> {
    const now = new Date();
    const queryRoot = trx ?? getDb();

    await queryRoot
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
};
export default trackingEventRepository;
