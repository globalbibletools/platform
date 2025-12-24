import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable, Transform, TransformCallback } from "stream";
import { Snapshot, SnapshotObjectPlugin } from "../model";
import { createLogger, logger } from "@/logging";
import { languageSnapshotObjectPlugins } from "@/modules/languages/data-access/snapshotObjectPlugins";
import { translationSnapshotObjectPlugins } from "@/modules/translation/data-access/snapshotObjectPlugins";
import { reportingSnapshotObjectPlugins } from "@/modules/reporting/data-access/snapshotObjectPlugins";
import type { StorageEnvironment } from "@/shared/storageEnvironment";
import { getS3Client, s3BodyToReadable } from "@/shared/s3";
import { snapshotBucketName } from "./snapshotBucket";

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
    environment: StorageEnvironment;
    snapshot: Snapshot;
  }): Promise<void> {
    const logger = createLogger({
      environment,
      languageId: snapshot.languageId,
      snapshotId: snapshot.id,
    });
    const bucket = snapshotBucketName(environment);

    for (const plugin of SNAPSHOT_OBJECT_PLUGINS) {
      if (!plugin.read) {
        logger.info(`Skipping snapshot for ${plugin.resourceName}`);
        continue;
      }

      logger.info(`Starting snapshot for ${plugin.resourceName}`);

      const objectStream = await plugin.read(snapshot.languageId);

      await uploadJson({
        key: `${snapshot.languageId}/${snapshot.id}/${plugin.resourceName}.jsonl`,
        bucket,
        stream: objectStream.pipe(new SerializeJsonLTransform()),
      });

      logger.info(`Finished snapshot for ${plugin.resourceName}`);
    }

    logger.info(`Snapshot upload complete`);
  },
  async restore({
    environment,
    snapshot,
  }: {
    environment: StorageEnvironment;
    snapshot: Snapshot;
  }): Promise<void> {
    const logger = createLogger({
      environment,
      snapshotId: snapshot.id,
      languageId: snapshot.languageId,
    });
    const bucket = snapshotBucketName(environment);

    for (let i = SNAPSHOT_OBJECT_PLUGINS.length - 1; i >= 0; i--) {
      const plugin = SNAPSHOT_OBJECT_PLUGINS[i];
      await plugin.clear?.(snapshot.languageId);
    }

    for (const plugin of SNAPSHOT_OBJECT_PLUGINS) {
      const maybeStream = await downloadJson({
        bucket,
        key: `${snapshot.languageId}/${snapshot.id}/${plugin.resourceName}.jsonl`,
      });

      if (!maybeStream) {
        logger.info(`Snapshot file for ${plugin.resourceName} not found`);
        continue;
      }

      await plugin.write?.(maybeStream.pipe(new DeserializeJsonLTransform()));

      logger.info(`Finished restoring snapshot for ${plugin.resourceName}`);
    }

    logger.info(`Snapshot restore complete`);
  },
};

export class SerializeJsonLTransform extends Transform {
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

export class DeserializeJsonLTransform extends Transform {
  public buffer: string = "";

  constructor() {
    super({ readableObjectMode: true });
  }

  override _transform(
    chunk: any,
    _encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    this.buffer += chunk;

    let nextIndex;
    while (0 <= (nextIndex = this.buffer.indexOf("\n"))) {
      const recordString = this.buffer.slice(0, nextIndex);
      const parsedRecord = JSON.parse(recordString);
      logger.info(`PARSED: ${parsedRecord}`);
      this.push(parsedRecord);

      this.buffer = this.buffer.slice(nextIndex + 1);
    }

    callback();
  }

  override _flush(callback: TransformCallback) {
    if (this.buffer.length > 0) {
      const parsedRecord = JSON.parse(this.buffer);
      this.push(parsedRecord);
    }

    callback();
  }
}

const s3Client = getS3Client();

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

  let response;
  try {
    response = await s3Client.send(command);
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") {
      return;
    }
    throw error;
  }
  const body = response.Body;
  if (!body) return undefined;

  const stream = await s3BodyToReadable(body);
  if (!stream) {
    throw new Error("Unsupported S3 Body type");
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
