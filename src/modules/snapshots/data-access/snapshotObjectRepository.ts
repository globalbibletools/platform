import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable, Transform, TransformCallback } from "stream";
import { Snapshot, SnapshotObjectPlugin } from "../model";
import { createLogger } from "@/logging";
import { languageSnapshotObjectPlugins } from "@/modules/languages/data-access/snapshotObjectPlugins";
import { translationSnapshotObjectPlugins } from "@/modules/translation/data-access/snapshotObjectPlugins";
import { reportingSnapshotObjectPlugins } from "@/modules/reporting/data-access/snapshotObjectPlugins";

const SNAPSHOT_BUCKET_PREFIX = "gbt-snapshots";
const SNAPSHOT_OBJECT_PLUGINS: SnapshotObjectPlugin[] = [
  ...languageSnapshotObjectPlugins,
  ...translationSnapshotObjectPlugins,
  ...reportingSnapshotObjectPlugins,
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

      const objectStream = await plugin.read(snapshot.languageId);

      await uploadJson({
        key: `${snapshot.languageId}/${snapshot.id}/${plugin.resourceName}.jsonl`,
        bucket: `${SNAPSHOT_BUCKET_PREFIX}-${environment}`,
        stream: objectStream.pipe(new JsonLTransform()),
      });

      logger.info(`Finished snapshot for ${plugin.resourceName}`);
    }

    logger.info(`Snapshot upload complete`);
  },
  async restore({
    environment,
    snapshot,
  }: {
    environment: "prod" | "local";
    snapshot: Snapshot;
  }): Promise<void> {
    const logger = createLogger({
      environment,
      snapshotId: snapshot.id,
      languageId: snapshot.languageId,
    });

    for (const plugin of SNAPSHOT_OBJECT_PLUGINS) {
      const maybeStream = await downloadJson({
        bucket: `${SNAPSHOT_BUCKET_PREFIX}-${environment}`,
        key: `${snapshot.languageId}/${snapshot.id}/${plugin.resourceName}.jsonl`,
      });

      if (!maybeStream) {
        logger.info(`Snapshot file for ${plugin.resourceName} not found`);
        continue;
      }

      logger.info(`Finished restoring snapshot for ${plugin.resourceName}`);
    }

    logger.info(`Snapshot restore complete`);
  },
};

export class JsonLTransform extends Transform {
  started: boolean = false;

  constructor() {
    super({ writableObjectMode: true });
  }

  override _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    if (this.started) {
      this.push("\n");
    } else {
      this.started = true;
    }

    this.push(JSON.stringify(chunk));
    callback();
  }
}

const s3Client = new S3Client();

async function downloadJson({
  key,
  bucket,
}: {
  key: string;
  bucket: string;
}): Promise<Readable | undefined> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body;

  // Typescript doesn't know that the response type is always a stream when used in nodejs.
  if (stream && !(stream instanceof Readable)) {
    throw new Error("Expected Body to be a Readable stream in Node.js");
  }

  return stream;
}

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
