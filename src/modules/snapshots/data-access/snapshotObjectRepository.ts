import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { Readable, Transform, TransformCallback } from "stream";
import {
  createPostgresSnapshotObjectPlugin,
  Snapshot,
  SnapshotObjectPlugin,
} from "../model";
import { createLogger } from "@/logging";

const SNAPSHOT_BUCKET_PREFIX = "gbt-snapshots";
const SNAPSHOT_OBJECT_PLUGINS: SnapshotObjectPlugin[] = [
  createPostgresSnapshotObjectPlugin({
    resourceName: "language",
    readSqlQuery: `
        select * from language
        where id = $1
      `,
  }),
];

export const snapshotObjectRepository = {
  async upload({
    environment,
    snapshot,
  }: {
    environment: "prod" | "local";
    snapshot: Snapshot;
  }): Promise<void> {
    const logger = createLogger({
      environment,
      languageId: snapshot.languageId,
      snapshotId: snapshot.id,
    });

    for (const plugin of SNAPSHOT_OBJECT_PLUGINS) {
      logger.info(`Starting snapshot for ${plugin.resourceName}`);

      const objectStream = await plugin.createReadStream(snapshot.languageId);

      await uploadJson({
        key: `${snapshot.languageId}/${snapshot.id}/${plugin.resourceName}.json`,
        bucket: `${SNAPSHOT_BUCKET_PREFIX}-${environment}`,
        stream: objectStream.pipe(new JsonArrayTransform()),
      });

      logger.info(`Finished snapshot for ${plugin.resourceName}`);
    }

    logger.info(`Snapshot upload complete`);
  },
};

export class JsonArrayTransform extends Transform {
  private started = false;

  constructor() {
    super({ writableObjectMode: true });
  }

  override _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    let json = "";

    if (!this.started) {
      json += "[";
      this.started = true;
    } else {
      json += ",";
    }

    json += JSON.stringify(chunk);
    this.push(json);
    callback();
  }

  override _final(callback: TransformCallback): void {
    if (!this.started) {
      // If no data was ever written, still output a valid empty array
      this.push("[]");
    } else {
      this.push("]");
    }
    callback();
  }
}

const s3Client = new S3Client();

async function uploadJson({
  stream,
  key,
  bucket,
}: {
  stream: Readable;
  key: string;
  bucket: string;
}) {
  const uploadToS3 = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: stream,
    },
  });

  await uploadToS3.done();
}
