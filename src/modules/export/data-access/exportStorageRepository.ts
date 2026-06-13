import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { createLogger } from "@/logging";
import { getS3Client } from "@/shared/s3";

const EXPORT_BUCKET = process.env.STATIC_ASSET_BUCKET ?? "gbt-static-assets";

const s3Client = getS3Client();

export const exportStorageRepository = {
  async upload({
    key,
    source,
    type,
  }: {
    key: string;
    source: Readable | Buffer;
    type: string;
  }): Promise<string> {
    const logger = createLogger({ bucket: EXPORT_BUCKET, key });

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: EXPORT_BUCKET,
        Key: key,
        Body: source,
        ContentType: type,
      },
    });

    await upload.done();

    const location = `s3://${EXPORT_BUCKET}/${key}`;
    logger.info(`Export PDF uploaded to ${location}`);

    return location;
  },

  publicUrl({ key }: { key: string }): string {
    if (process.env.NODE_ENV === "production") {
      return `https://assets.globalbibletools.com/${key}`;
    } else {
      return `${process.env.EXPORT_PUBLIC_S3_ENDPOINT}/${key}`;
    }
  },
};
