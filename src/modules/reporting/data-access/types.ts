import { Generated } from "kysely";

export interface DbTrackingEvent<Data = unknown> {
  id: string;
  type: string;
  data: Data;
  userId?: string | null;
  languageId?: string | null;
  createdAt: Date;
}

export interface WeeklyGlossStatisticsTable {
  id: Generated<number>;
  week: Date;
  language_id: string;
  book_id: number;
  user_id: string | null;
  approved_count: number;
  unapproved_count: number;
}
