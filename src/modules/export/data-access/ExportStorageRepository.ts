import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { createLogger } from "@/logging";
import { getS3Client } from "@/shared/s3";

const EXPORT_BUCKET_PREFIX = process.env.EXPORT_BUCKET_PREFIX ?? "gbt-exports";

const s3Client = getS3Client();

export interface ExportStorageOptions {
  environment: "prod" | "local";
}

function exportBucketName(environment: "prod" | "local"): string {
  return `${EXPORT_BUCKET_PREFIX}-${environment}`;
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path, normalizedBase).toString();
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
    const bucket = exportBucketName(environment);
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

  publicPdfUrl({
    environment,
    key,
  }: ExportStorageOptions & { key: string }): string {
    const bucket = exportBucketName(environment);
    const encodedKey = encodeObjectKey(key);

    const publicBaseUrl = process.env.EXPORT_PUBLIC_BASE_URL;
    if (publicBaseUrl) {
      return joinUrl(publicBaseUrl, encodedKey);
    }

    const publicS3Endpoint = process.env.EXPORT_PUBLIC_S3_ENDPOINT;
    if (publicS3Endpoint) {
      return joinUrl(publicS3Endpoint, `${bucket}/${encodedKey}`);
    }

    const region = process.env.AWS_REGION ?? "us-east-1";
    if (region === "us-east-1") {
      return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  },
};

export default exportStorageRepository;
