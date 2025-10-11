import { query } from "@/db";
import { Snapshot } from "../model";

export const snapshotRepository = {
  async create(snapshot: Snapshot): Promise<void> {
    await query(
      `
        insert into language_snapshot (id, language_id, timestamp)
        values ($1, $2, $3)
      `,
      [snapshot.id, snapshot.languageId, snapshot.timestamp],
    );
  },
};
