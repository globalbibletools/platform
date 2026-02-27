import { Generated, JSONColumnType } from "kysely";

export interface TrackingEventTable {
  id: Generated<string>;
  type: string;
  data: JSONColumnType<object>;
  userId: string | null;
  languageId: string | null;
  createdAt: Date;
}
