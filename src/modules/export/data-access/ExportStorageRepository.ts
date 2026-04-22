import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";
import { createLogger } from "@/logging";
import { getS3Client } from "@/shared/s3";

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
};

export default exportStorageRepository;
