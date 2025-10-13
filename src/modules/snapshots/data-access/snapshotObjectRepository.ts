import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { Snapshot, SnapshotObjectPlugin } from "../model";

const SNAPSHOTS_BUCKET = "gbt-snapshots";

const SNAPSHOT_OBJECT_PLUGINS: SnapshotObjectPlugin[] = [];

export const snapshotObjectRepository = {
  async upload({
    environment,
    snapshot,
  }: {
    environment: "prod" | "local";
    snapshot: Snapshot;
  }): Promise<void> {
    for (const plugin of SNAPSHOT_OBJECT_PLUGINS) {
      console.log(`Starting snapshot for ${plugin.resourceName}`);

      await uploadJson({
        key: `${environment}/${snapshot.languageId}/${snapshot.id}/${plugin.resourceName}.json`,
        bucket: SNAPSHOTS_BUCKET,
        stream: await plugin.createReadStream(snapshot.languageId),
      });

      console.log(`Finished snapshot for ${plugin.resourceName}`);
    }

    console.log(`Snapshot complete`);
  },
};

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
    client: new S3Client({}),
    params: {
      Bucket: bucket,
      Key: key,
      Body: stream,
    },
  });

  await uploadToS3.done();
}
