import { Upload } from "@aws-sdk/lib-storage";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PassThrough, Readable } from "stream";
import { ZipArchive } from "archiver";
import { createHash } from "crypto";
import { createLogger } from "@/logging";
import { getS3Client } from "@/shared/s3";

const EXPORT_BUCKET = process.env.STATIC_ASSET_BUCKET ?? "gbt-static-assets";

const s3Client = getS3Client();

export interface UploadResult {
  key: string;
  size: number;
  sha256: string;
  location: string;
}

export const exportStorageRepository = {
  async upload({
    key,
    source,
    type,
  }: {
    key: string;
    source: Readable | Buffer;
    type: string;
  }): Promise<UploadResult> {
    const logger = createLogger({ bucket: EXPORT_BUCKET, key });

    const hash = createHash("sha256");
    let size = 0;

    let body: Readable | Buffer;
    if (Buffer.isBuffer(source)) {
      size = source.length;
      hash.update(source);
      body = source;
    } else {
      const counter = new PassThrough({
        transform(chunk, _encoding, cb) {
          size += chunk.length;
          hash.update(chunk);
          cb(null, chunk);
        },
      });
      body = source.pipe(counter);
    }

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: EXPORT_BUCKET,
        Key: key,
        Body: body,
        ContentType: type,
      },
    });

    await upload.done();

    const location = this.publicUrl({ key });
    logger.info(`Uploaded ${key} to ${location} (${size} bytes)`);

    return { key, size, sha256: hash.digest("hex"), location };
  },

  async uploadZip({
    key,
    archive,
  }: {
    key: string;
    archive: ZipArchive;
  }): Promise<UploadResult> {
    return this.upload({
      key,
      source: archive,
      type: "application/zip",
    });
  },

  async *streamFiles({
    prefix,
  }: {
    prefix: string;
  }): AsyncGenerator<{ key: string; body: Readable }> {
    let continuationToken: string | undefined;
    do {
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: EXPORT_BUCKET,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of response.Contents ?? []) {
        if (!object.Key) continue;

        const { Body } = await s3Client.send(
          new GetObjectCommand({
            Bucket: EXPORT_BUCKET,
            Key: object.Key,
          }),
        );
        if (!Body) continue;

        yield { key: object.Key, body: Body as Readable };
      }

      continuationToken =
        response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);
  },

  publicUrl({ key }: { key: string }): string {
    if (process.env.NODE_ENV === "production") {
      return `https://assets.globalbibletools.com/${key}`;
    } else {
      return `${process.env.EXPORT_PUBLIC_S3_ENDPOINT}/${EXPORT_BUCKET}/${key}`;
    }
  },
};
