import { Readable } from "stream";
import { copyStream, query, queryStream } from "@/db";
import {
  PostgresTextFormatTransform,
  SnapshotObjectPlugin,
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
  {
    resourceName: "weekly_contribution_statistics",
    async read(languageId: string): Promise<Readable> {
      return queryStream(
        `
          select * from weekly_contribution_statistics
          where language_id = $1
        `,
        [languageId],
      );
    },
    async clear(languageId: string): Promise<void> {
      await query(
        `
          delete from weekly_contribution_statistics
          where language_id = $1
        `,
        [languageId],
      );
    },
    async write(stream: Readable): Promise<void> {
      await copyStream(
        "weekly_contribution_statistics",
        stream.pipe(
          new PostgresTextFormatTransform([
            (stat) => stat.id,
            (stat) => stat.week,
            (stat) => stat.language_id,
            (stat) => stat.user_id,
            (stat) => stat.approved_count.toString(),
            (stat) => stat.revoked_count.toString(),
            (stat) => stat.edited_approved_count.toString(),
            (stat) => stat.edited_unapproved_count.toString(),
          ]),
        ),
      );
    },
  },
  {
    resourceName: "weekly_gloss_statistics",
    async read(languageId: string): Promise<Readable> {
      return queryStream(
        `
          select * from weekly_gloss_statistics
          where language_id = $1
        `,
        [languageId],
      );
    },
    async clear(languageId: string): Promise<void> {
      await query(
        `
          delete from weekly_gloss_statistics
          where language_id = $1
        `,
        [languageId],
      );
    },
    async write(stream: Readable): Promise<void> {
      await copyStream(
        "weekly_gloss_statistics",
        stream.pipe(
          new PostgresTextFormatTransform([
            (stat) => stat.id,
            (stat) => stat.language_id,
            (stat) => stat.book_id.toString(),
            (stat) => stat.user_id,
            (stat) => stat.approved_count.toString(),
            (stat) => stat.unapproved_count.toString(),
          ]),
        ),
      );
    },
  },
];
