import { queryStream } from "@/db";
import { Readable } from "stream";

export interface Snapshot {
  id: string;
  languageId: string;
  timestamp: Date;
}

export interface SnapshotObjectPlugin {
  resourceName: string;
  fields: string[];
  createReadStream(languageId: string): Promise<Readable>;
}

export function createPostgresSnapshotObjectPlugin({
  resourceName,
  fields,
  readSqlQuery,
}: {
  resourceName: string;
  fields: string[];
  readSqlQuery: string;
}): SnapshotObjectPlugin {
  return {
    resourceName,
    fields,
    async createReadStream(languageId: string) {
      return queryStream(readSqlQuery, [languageId]);
    },
  };
}
