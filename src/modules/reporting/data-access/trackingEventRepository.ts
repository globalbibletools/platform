import { getDb } from "@/db";
import { TrackingEvent } from "../model";
import { ulid } from "@/shared/ulid";

const trackingEventRepository = {
  async createMany(
    events: Omit<TrackingEvent, "createdAt" | "id">[],
    createdAt = new Date(),
  ): Promise<void> {
    await getDb()
      .insertInto("tracking_event")
      .values(
        events.map(({ type, languageId, userId, ...data }) => ({
          id: ulid(),
          type,
          created_at: createdAt,
          user_id: userId,
          language_id: languageId,
          data: JSON.stringify(data),
        })),
      )
      .execute();
  },
};
export default trackingEventRepository;
