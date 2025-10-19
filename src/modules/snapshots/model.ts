import { query, queryStream } from "@/db";
import { Readable, Writable } from "stream";

export interface Snapshot {
  id: string;
  languageId: string;
  timestamp: Date;
}

export interface SnapshotObjectPlugin {
  resourceName: string;
  read(languageId: string): Promise<Readable>;
  clear?(languageId: string): Promise<void>;
  write?(languageId: string, stream: Readable): Promise<void>;
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

export function createPostgresSnapshotObjectPluginV2({
  fields,
  tableName,
  filter,
}: {
  fields: string[];
  tableName: string;
  filter: string;
}): SnapshotObjectPlugin {
  return {
    resourceName: tableName,
    async read(languageId: string) {
      return queryStream(
        `select ${fields.join(", ")} from ${tableName} ${filter}`,
        [languageId],
      );
    },
    async write(languageId: string, stream: Readable) {
      // TODO: write stream into database using fields array
    },
  };
}
