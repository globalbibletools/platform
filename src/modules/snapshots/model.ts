import { queryStream } from "@/db";
import { Readable, Writable } from "stream";

export interface Snapshot {
  id: string;
  languageId: string;
  timestamp: Date;
}

export interface SnapshotObjectPlugin {
  resourceName: string;
  read(languageId: string): Promise<Readable>;
  write?(languageId: string, stream: Readable): Promise<void>;
}

export function createPostgresSnapshotObjectPlugin({
  resourceName,
  readSqlQuery,
}: {
  resourceName: string;
  readSqlQuery: string;
}): SnapshotObjectPlugin {
  return {
    resourceName,
    async read(languageId: string) {
      return queryStream(readSqlQuery, [languageId]);
    },
  };
}
