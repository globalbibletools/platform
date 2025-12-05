import { copyStream, query, queryStream } from "@/db";
import { Readable } from "stream";
import {
  IdMapper,
  PostgresTextFormatTransform,
  SnapshotObjectPlugin,
  WriteConfig,
} from "@/modules/snapshots/model";
import { ulid } from "@/shared/ulid";

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
    async write(stream: Readable, writeConfig?: WriteConfig): Promise<void> {
      return new Promise((resolve, reject) => {
        stream.on("readable", async () => {
          let language;
          while (null !== (language = stream.read())) {
            if (writeConfig?.type === "import") {
              const newId = this.idMapper!.mapId(language.id);

              await query(
                `
                insert into language(id, code, name, font, translation_ids, text_direction)
                values ($1, $2, $3, $4, $5, $6)
              `,
                [
                  newId,
                  writeConfig.languageCode,
                  language.name,
                  language.font,
                  language.translation_ids,
                  language.text_direction,
                  // We ignore the reference language on import since it may not exist when transferring between environments.
                ],
              );
            } else {
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
    idMapper: new IdMapper(() => ulid()),
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
    async write(stream: Readable, config?: WriteConfig): Promise<void> {
      // When importing, we may not have the same users as the source language so we import with none.
      if (config?.type === "import") {
        return;
      }

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
    idMapper: new IdMapper((x) => x),
  },
};
