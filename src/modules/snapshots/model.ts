import { queryStream } from "@/db";
import { Readable } from "stream";

export interface Snapshot {
  id: string;
  languageId: string;
  timestamp: Date;
}

export interface SnapshotObjectPlugin {
  resourceName: string;
  createReadStream(languageId: string): Promise<Readable>;
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
    async createReadStream(languageId: string) {
      return queryStream(readSqlQuery, [languageId]);
    },
  };
}
