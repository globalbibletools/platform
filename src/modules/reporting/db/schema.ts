import { Generated, JSONColumnType } from "kysely";

export interface TrackingEventTable {
  id: Generated<string>;
  type: string;
  data: JSONColumnType<object>;
  user_id: string | null;
  language_id: string | null;
  created_at: Date;
}
