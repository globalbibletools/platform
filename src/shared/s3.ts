import { S3Client } from "@aws-sdk/client-s3";

let cachedS3Client: S3Client | undefined;

export function getS3Client(): S3Client {
  if (cachedS3Client) return cachedS3Client;

  cachedS3Client = new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
  });
  return cachedS3Client;
}
