import {
  SnapshotObjectPlugin,
  createPostgresSnapshotObjectPlugin,
} from "@/modules/snapshots/model";

export const reportingSnapshotObjectPlugins: SnapshotObjectPlugin[] = [
  createPostgresSnapshotObjectPlugin({
    resourceName: "tracking_event",
    readSqlQuery: `
        select * from tracking_event
        where language_id = $1
      `,
    deleteSqlQuery: `
        delete from tracking_event
        where language_id = $1
      `,
  }),
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
