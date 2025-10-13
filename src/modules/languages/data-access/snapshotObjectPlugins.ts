import {
  SnapshotObjectPlugin,
  createPostgresSnapshotObjectPlugin,
} from "@/modules/snapshots/model";

export const languageSnapshotObjectPlugins: SnapshotObjectPlugin[] = [
  createPostgresSnapshotObjectPlugin({
    resourceName: "language",
    readSqlQuery: `
        select * from language
        where id = $1
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "language_member_role",
    readSqlQuery: `
        select * from language_member_role
        where language_id = $1
      `,
  }),
];
