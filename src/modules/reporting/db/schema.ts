import { Generated, JSONColumnType } from "kysely";

/**
 * An analytics event recorded when a user performs a tracked action in the
 * application. Events are append-only and never updated.
 */
export interface TrackingEventTable {
  /** Auto-generated unique identifier for this event. */
  id: Generated<string>;
  /** The event type identifier (e.g. "verse.viewed", "gloss.approved"). */
  type: string;
  /** Arbitrary JSON payload containing event-specific data. */
  data: JSONColumnType<object>;
  /** The user who triggered the event, or null for anonymous or system events. */
  user_id: string | null;
  /** The language context in which the event occurred, if applicable. */
  language_id: string | null;
  /** Timestamp of when the event was recorded. */
  created_at: Date;
}
