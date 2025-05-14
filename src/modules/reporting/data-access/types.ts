export interface DbTrackingEvent<Data = unknown> {
  id: string;
  type: string;
  data: Data;
  userId?: string | null;
  languageId?: string | null;
  createdAt: Date;
}
