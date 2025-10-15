import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { Readable, Transform, TransformCallback } from "stream";
import { Snapshot, SnapshotObjectPlugin } from "../model";
import { createLogger } from "@/logging";
import { languageSnapshotObjectPlugins } from "@/modules/languages/data-access/snapshotObjectPlugins";
import { translationSnapshotObjectPlugins } from "@/modules/translation/data-access/snapshotObjectPlugins";
import { reportingSnapshotObjectPlugins } from "@/modules/reporting/data-access/snapshotObjectPlugins";

const SNAPSHOT_BUCKET_PREFIX = "gbt-snapshots";
const SNAPSHOT_OBJECT_PLUGINS: SnapshotObjectPlugin[] = [
  ...languageSnapshotObjectPlugins,
  /*
  ...translationSnapshotObjectPlugins,
  ...reportingSnapshotObjectPlugins,
  */
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

      await uploadFile({
        key: `${snapshot.languageId}/${snapshot.id}/${plugin.resourceName}.tsv`,
        bucket: `${SNAPSHOT_BUCKET_PREFIX}-${environment}`,
        stream: objectStream.pipe(new TsvTransform(plugin.fields)),
      });

      logger.info(`Finished snapshot for ${plugin.resourceName}`);
    }

    logger.info(`Snapshot upload complete`);
  },
};

export class TsvTransform extends Transform {
  started: boolean = false;

  constructor(public headers: string[]) {
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
      this.push(this.headers.join("\t"));
      this.push("\n");
      this.started = true;
    }

    for (let i = 0; i < this.headers.length; i++) {
      if (i > 0) {
        this.push("\t");
      }
      this.push(chunk[this.headers[i]]);
    }
    callback();
  }
}

const s3Client = new S3Client();

async function uploadFile({
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
