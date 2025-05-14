import { query } from "@/db";
import { DbTrackingEvent } from "./types";

const trackingEventRepository = {
  async create(event: Omit<DbTrackingEvent, "createdAt">): Promise<void> {
    await query(
      `
        insert into tracking_event (id, type, data, user_id, language_id, created_at)
        values ($1, $2, $3, $4, $5, now())
      `,
      [event.id, event.type, event.data, event.userId, event.languageId],
    );
  },
};
export default trackingEventRepository;
