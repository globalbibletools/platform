import {
  SnapshotObjectPlugin,
  createPostgresSnapshotObjectPlugin,
} from "@/modules/snapshots/model";

export const languageSnapshotObjectPlugins: SnapshotObjectPlugin[] = [
  createPostgresSnapshotObjectPlugin({
    resourceName: "language",
    fields: [
      "id",
      "code",
      "name",
      "font",
      "translation_ids",
      "text_direction",
      "reference_language_id",
    ],
    readSqlQuery: `
        select id, code, name, font, translation_ids::text, text_direction, reference_language_id from language
        where id = $1
      `,
  }),
  createPostgresSnapshotObjectPlugin({
    resourceName: "language_member_role",
    fields: ["user_id", "language_id", "role"],
    readSqlQuery: `
        select user_id, language_id, role from language_member_role
        where language_id = $1
      `,
  }),
];
