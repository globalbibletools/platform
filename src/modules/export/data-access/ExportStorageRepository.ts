import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { createLogger } from "@/logging";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, s3BodyToUint8Array } from "@/shared/s3";

const EXPORT_BUCKET_PREFIX = process.env.EXPORT_BUCKET_PREFIX ?? "gbt-exports";

const s3Client = getS3Client();

export interface ExportStorageOptions {
  environment: "prod" | "local";
}

export const exportStorageRepository = {
  async uploadPdf({
    environment,
    key,
    stream,
  }: ExportStorageOptions & {
    key: string;
    stream: Readable;
  }): Promise<string> {
    const bucket = `${EXPORT_BUCKET_PREFIX}-${environment}`;
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
    logger.info("Export PDF uploaded");

    return `s3://${bucket}/${key}`;
  },

  bucketName(environment: "prod" | "local") {
    return `${EXPORT_BUCKET_PREFIX}-${environment}`;
  },

  async presignPdf({
    environment,
    key,
    expiresInSeconds,
  }: ExportStorageOptions & {
    key: string;
    expiresInSeconds: number;
  }): Promise<string> {
    const bucket = `${EXPORT_BUCKET_PREFIX}-${environment}`;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    });
    const publicEndpoint = process.env.EXPORT_PUBLIC_S3_ENDPOINT;
    if (publicEndpoint) {
      try {
        const parsed = new URL(url);
        const target = new URL(publicEndpoint);
        parsed.protocol = target.protocol;
        parsed.host = target.host;
        return parsed.toString();
      } catch {
        return url;
      }
    }
    return url;
  },

  async fetchBuffer({
    environment,
    key,
  }: ExportStorageOptions & { key: string }): Promise<Uint8Array | undefined> {
    const bucket = `${EXPORT_BUCKET_PREFIX}-${environment}`;
    const res = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    return s3BodyToUint8Array(res.Body);
  },

  async deleteObject({
    environment,
    key,
  }: ExportStorageOptions & { key: string }): Promise<void> {
    const bucket = `${EXPORT_BUCKET_PREFIX}-${environment}`;
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};

export default exportStorageRepository;
