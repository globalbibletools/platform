import { getDb } from "@/db";
import { Selectable } from "kysely";
import type { TrackingEventTable } from "../db/schema";

export async function findTrackingEvents(): Promise<
  Selectable<TrackingEventTable>[]
> {
  return getDb()
    .selectFrom("tracking_event")
    .selectAll()
    .orderBy("created_at")
    .execute();
}
