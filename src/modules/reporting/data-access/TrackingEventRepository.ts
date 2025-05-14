import { query } from "@/db";
import { DbTrackingEvent } from "./types";

const trackingEventRepository = {
  async createMany(
    events: Omit<DbTrackingEvent, "createdAt">[],
  ): Promise<void> {
    await query(
      `
        insert into tracking_event (id, type, data, user_id, language_id, created_at)
        select id, type, data, user_id, language_id, now()
        from unnest($1::uuid[], $2::text[], $3::jsonb[], $4::uuid[], $5::uuid[]) data (id, type, data, user_id, language_id)
      `,
      [
        events.map((event) => event.id),
        events.map((event) => event.type),
        events.map((event) => event.data),
        events.map((event) => event.userId),
        events.map((event) => event.languageId),
      ],
    );
  },
};
export default trackingEventRepository;
