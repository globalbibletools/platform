import { copyStream, query, queryStream } from "@/db";
import { Readable } from "stream";
import {
  PostgresTextFormatTransform,
  SnapshotObjectPlugin,
} from "@/modules/snapshots/model";

export const languageSnapshotObjectPlugins: Record<
  string,
  SnapshotObjectPlugin
> = {
  language: {
    resourceName: "language",
    async read(languageId: string): Promise<Readable> {
      return queryStream(
        `
          select *
          from language
          where id = $1
        `,
        [languageId],
      );
    },
    async write(stream: Readable): Promise<void> {
      return new Promise((resolve, reject) => {
        stream.on("readable", async () => {
          let language;
          while (null !== (language = stream.read())) {
            await query(
              `
                update language set
                  code = $2,
                  name = $3,
                  font = $4,
                  translation_ids = $5,
                  text_direction = $6,
                  reference_language_id = $7
                where id = $1
              `,
              [
                language.id,
                language.code,
                language.name,
                language.font,
                language.translation_ids,
                language.text_direction,
                language.reference_language_id,
              ],
            );
          }
        });

        stream.on("end", () => {
          resolve();
        });
        stream.on("error", (err) => {
          reject(err);
        });
      });
    },
  },
  languageMemberRole: {
    resourceName: "language_member_role",
    async read(languageId: string): Promise<Readable> {
      return queryStream(
        `
          select *
          from language_member_role
          where language_id = $1
        `,
        [languageId],
      );
    },
    async clear(languageId: string): Promise<void> {
      await query(
        `
          delete from language_member_role
          where language_id = $1
        `,
        [languageId],
      );
    },
    async write(stream: Readable): Promise<void> {
      await copyStream(
        "language_member_role",
        stream.pipe(
          new PostgresTextFormatTransform([
            (role) => role.user_id,
            (role) => role.language_id,
            (role) => role.role,
          ]),
        ),
      );
    },
  },
};
