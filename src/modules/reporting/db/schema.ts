import { Generated, JSONColumnType } from "kysely";

export interface TrackingEventTable {
  id: Generated<string>;
  type: string;
  data: JSONColumnType<object>;
  user_id: string | null;
  language_id: string | null;
  created_at: Date;
}

export interface ContributionSnapshotTable {
  id: Generated<string>;
  day: Date;
  language_id: string;
  user_id: string;
  book_id: number;
  approved_count: number;
  revoked_count: number;
  edited_approved_count: number;
  edited_unapproved_count: number;
}
