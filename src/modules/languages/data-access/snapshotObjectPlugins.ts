import { copyStream, query, queryStream } from "@/db";
import { Readable, Transform } from "stream";
import { SnapshotObjectPlugin } from "@/modules/snapshots/model";

export const languageSnapshotObjectPlugins: SnapshotObjectPlugin[] = [
  {
    resourceName: "language",
    async read(languageId: string): Promise<Readable> {
      return queryStream(
        `
          select
            id,
            code,
            name,
            font,
            translation_ids,
            text_direction,
            reference_language_id
          from language
          where id = $1
        `,
        [languageId],
      );
    },
    async write(languageId: string, stream: Readable): Promise<void> {
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
  {
    resourceName: "language_member_role",
    async read(languageId: string): Promise<Readable> {
      return queryStream(
        `
          select
            user_id,
            language_id,
            role
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
    async write(languageId: string, stream: Readable): Promise<void> {
      await copyStream(
        "language_member_role",
        stream.pipe(new PostgresTextFormatTransform()),
      );
    },
  },
];

class PostgresTextFormatTransform extends Transform {
  constructor() {
    super({
      readableObjectMode: true,
    });
  }

  override _transform(
    record: any,
    encoding: string,
    cb: (err?: Error) => void,
  ) {
    this.push(record.user_id);
    this.push("\\t");

    this.push(record.language_id);
    this.push("\\t");

    this.push(record.role);
    this.push("\\n");

    cb();
  }

  override _flush(cb: (err?: Error) => void) {
    this.push("\\.");
    cb();
  }
}

type FieldMapper = (record: any) => any;

class PostgresTextFormatTransformV2 extends Transform {
  constructor(private fieldMappers: FieldMapper[]) {
    super({
      readableObjectMode: true,
    });
  }

  override _transform(
    record: any,
    encoding: string,
    cb: (err?: Error) => void,
  ) {
    for (let i = 0; i < this.fieldMappers.length; i++) {
      this.push(this.fieldMappers[i](record));

      if (i < this.fieldMappers.length - 1) {
        this.push("\\t");
      }
    }

    this.push("\\n");

    cb();
  }

  override _flush(cb: (err?: Error) => void) {
    this.push("\\.");
    cb();
  }
}
