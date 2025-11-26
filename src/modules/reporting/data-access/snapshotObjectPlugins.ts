import { Readable } from "stream";
import { copyStream, query, queryStream } from "@/db";
import {
  PostgresTextFormatTransform,
  SnapshotObjectPlugin,
  createPostgresSnapshotObjectPlugin,
} from "@/modules/snapshots/model";

export const reportingSnapshotObjectPlugins: SnapshotObjectPlugin[] = [
  {
    resourceName: "tracking_event",
    async read(languageId: string): Promise<Readable> {
      return queryStream(
        `
          select * from tracking_event
          where language_id = $1
        `,
        [languageId],
      );
    },
    async clear(languageId: string): Promise<void> {
      await query(
        `
          delete from tracking_event
          where language_id = $1
        `,
        [languageId],
      );
    },
    async write(stream: Readable): Promise<void> {
      await copyStream(
        "tracking_event",
        stream.pipe(
          new PostgresTextFormatTransform([
            (event) => event.id,
            (event) => event.type,
            (event) => JSON.stringify(event.data),
            (event) => event.user_id,
            (event) => event.language_id,
            (event) => event.created_at,
          ]),
        ),
      );
    },
  },
  createPostgresSnapshotObjectPlugin({
    resourceName: "weekly_contribution_statistics",
    readSqlQuery: `
        select * from weekly_contribution_statistics
        where language_id = $1
      `,
    deleteSqlQuery: `
        delete from weekly_contribution_statistics
        where language_id = $1
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "weekly_gloss_statistics",
    readSqlQuery: `
        select * from weekly_gloss_statistics
        where language_id = $1
      `,
    deleteSqlQuery: `
        delete from weekly_gloss_statistics
        where language_id = $1
      `,
  }),
];
