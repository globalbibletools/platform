import { S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";

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

export function mergeUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged;
}

async function readableToUint8Array(stream: Readable): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === "string") {
      parts.push(Uint8Array.from(Buffer.from(chunk)));
    } else if (chunk instanceof Uint8Array) {
      parts.push(chunk);
    } else {
      parts.push(Uint8Array.from(chunk));
    }
  }
  return mergeUint8Arrays(parts);
}

async function webStreamToUint8Array(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) parts.push(value);
  }
  return mergeUint8Arrays(parts);
}

export async function s3BodyToUint8Array(
  body: unknown,
): Promise<Uint8Array | undefined> {
  if (!body) return undefined;
  if (body instanceof Uint8Array) return body;
  if (body instanceof Readable) return readableToUint8Array(body);

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return new Uint8Array(await body.arrayBuffer());
  }

  if (typeof (body as ReadableStream).getReader === "function") {
    return webStreamToUint8Array(body as ReadableStream<Uint8Array>);
  }

  return undefined;
}

export async function s3BodyToReadable(
  body: unknown,
): Promise<Readable | undefined> {
  if (!body) return undefined;
  if (body instanceof Readable) return body;

  if (body instanceof Uint8Array) {
    return Readable.from([body]);
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    const bytes = new Uint8Array(await body.arrayBuffer());
    return Readable.from([bytes]);
  }

  if (typeof (body as ReadableStream).getReader === "function") {
    const webStream = body as ReadableStream<Uint8Array>;
    const maybeFromWeb = (
      Readable as unknown as { fromWeb?: (s: any) => Readable }
    ).fromWeb;
    if (typeof maybeFromWeb === "function") {
      return maybeFromWeb(webStream);
    }
    const bytes = await webStreamToUint8Array(webStream);
    return Readable.from([bytes]);
  }

  return undefined;
}
