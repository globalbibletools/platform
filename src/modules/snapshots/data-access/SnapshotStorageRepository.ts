import { Upload } from "@aws-sdk/lib-storage";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { createLogger } from "@/logging";
import type { StorageEnvironment } from "@/shared/storageEnvironment";
import { getS3Client, s3BodyToUint8Array } from "@/shared/s3";
import { snapshotBucketName } from "./snapshotBucket";

const s3Client = getS3Client();

export const snapshotStorageRepository = {
  bucketName(environment: StorageEnvironment) {
    return snapshotBucketName(environment);
  },

  async uploadPdf({
    environment,
    key,
    stream,
  }: {
    environment: StorageEnvironment;
    key: string;
    stream: Readable;
  }): Promise<string> {
    const bucket = this.bucketName(environment);
    const logger = createLogger({ bucket, key });

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: stream,
        ContentType: "application/pdf",
      },
    });

    await upload.done();
    logger.info("Snapshot PDF uploaded");

    return `s3://${bucket}/${key}`;
  },

  async fetchBuffer({
    environment,
    key,
  }: {
    environment: StorageEnvironment;
    key: string;
  }): Promise<Uint8Array | undefined> {
    const bucket = this.bucketName(environment);
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    return s3BodyToUint8Array(res.Body);
  },

  async deleteObject({
    environment,
    key,
  }: {
    environment: StorageEnvironment;
    key: string;
  }): Promise<void> {
    const bucket = this.bucketName(environment);
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};

export default snapshotStorageRepository;
