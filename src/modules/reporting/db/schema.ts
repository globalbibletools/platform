import { Generated, JSONColumnType } from "kysely";

export interface BookWordMapView {
  word_id: string;
  book_id: number;
}

export interface TrackingEventTable {
  id: Generated<string>;
  type: string;
  data: JSONColumnType<object>;
  user_id: string | null;
  language_id: string | null;
  created_at: Date;
}

export interface BookCompletionProgressTable {
  id: Generated<number>;
  language_id: string;
  book_id: number;
  user_id: string | null;
  word_count: number;
  refreshed_at: Date;
}
