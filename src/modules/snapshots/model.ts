import { query, queryStream } from "@/db";
import { Readable, Transform } from "stream";

export interface Snapshot {
  id: string;
  languageId: string;
  timestamp: Date;
}

export interface SnapshotObjectPlugin {
  resourceName: string;
  read?(languageId: string): Promise<Readable>;
  clear?(languageId: string): Promise<void>;
  write?(stream: Readable): Promise<void>;
}

export function createPostgresSnapshotObjectPlugin({
  resourceName,
  readSqlQuery,
  deleteSqlQuery,
}: {
  resourceName: string;
  readSqlQuery: string;
  deleteSqlQuery: string;
}): SnapshotObjectPlugin {
  return {
    resourceName,
    async read(languageId: string) {
      return queryStream(readSqlQuery, [languageId]);
    },
    async clear(languageId: string) {
      await query(deleteSqlQuery, [languageId]);
    },
  };
}

type FieldMapper = (record: any) => any;

export class PostgresTextFormatTransform extends Transform {
  constructor(private fieldMappers: FieldMapper[]) {
    super({
      writableObjectMode: true,
    });
  }

  override _transform(
    record: any,
    encoding: string,
    cb: (err?: Error) => void,
  ) {
    for (let i = 0; i < this.fieldMappers.length; i++) {
      this.push(this.fieldMappers[i](record) ?? "\\N");

      if (i < this.fieldMappers.length - 1) {
        this.push("\t");
      }
    }

    this.push("\n");

    cb();
  }

  override _flush(cb: (err?: Error) => void) {
    this.push("\\.\n");
    cb();
  }
}
