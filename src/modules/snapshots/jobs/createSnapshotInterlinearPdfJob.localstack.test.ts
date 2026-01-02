import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { createScenario } from "@/tests/scenarios";
import { query } from "@/db";
import { ulid } from "@/shared/ulid";
import { s3BodyToUint8Array } from "@/shared/s3";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { PDFDocument } from "pdf-lib";

initializeDatabase();

describe("create_snapshot_interlinear_pdf (localstack)", () => {
  const localstackEndpoint =
    process.env.AWS_ENDPOINT_URL_S3 ?? "http://localhost:4566";
  const region = process.env.AWS_REGION ?? "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? "test";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? "test";
  const snapshotBucketPrefix =
    process.env.SNAPSHOT_BUCKET_PREFIX ?? "gbt-snapshots";
  const environment = "local";
  const bucket = `${snapshotBucketPrefix}-${environment}`;

  const s3 = new S3Client({
    region,
    endpoint: localstackEndpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AWS_REGION", region);
    vi.stubEnv("AWS_ACCESS_KEY_ID", accessKeyId);
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", secretAccessKey);
    vi.stubEnv("AWS_ENDPOINT_URL_S3", localstackEndpoint);
    vi.stubEnv("AWS_S3_FORCE_PATH_STYLE", "true");
    vi.stubEnv("SNAPSHOT_BUCKET_PREFIX", snapshotBucketPrefix);

    await ensureBucket(s3, bucket);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("processes the job and uploads a merged PDF to snapshot storage", async () => {
    const scenario = await createScenario({ languages: { language: {} } });
    const language = scenario.languages.language;

    await query(
      `insert into job_type (name) values ($1) on conflict (name) do nothing`,
      ["create_snapshot_interlinear_pdf"],
    );

    await query(
      `insert into book (id, name) values (1, 'Genesis'), (2, 'Exodus')`,
      [],
    );
    await query(
      `
        insert into verse (id, number, book_id, chapter)
        values
          ('1-1-1', 1, 1, 1),
          ('2-1-1', 1, 2, 1)
      `,
      [],
    );
    await query(`insert into lemma (id) values ('l1')`, []);
    await query(
      `insert into lemma_form (id, grammar, lemma_id) values ('f1', 'g', 'l1')`,
      [],
    );
    await query(
      `
        insert into word (id, text, verse_id, form_id)
        values
          ('w1', 'λόγος', '1-1-1', 'f1'),
          ('w2', 'θεοῦ', '2-1-1', 'f1')
      `,
      [],
    );

    const phrase1 = await query<{ id: number }>(
      `insert into phrase (language_id, created_at) values ($1, now()) returning id`,
      [language.id],
    );
    await query(
      `insert into phrase_word (phrase_id, word_id) values ($1, $2)`,
      [phrase1.rows[0].id, "w1"],
    );
    await query(
      `insert into gloss (gloss, state, phrase_id, updated_at) values ($1, $2, $3, now())`,
      ["word", "APPROVED", phrase1.rows[0].id],
    );

    const phrase2 = await query<{ id: number }>(
      `insert into phrase (language_id, created_at) values ($1, now()) returning id`,
      [language.id],
    );
    await query(
      `insert into phrase_word (phrase_id, word_id) values ($1, $2)`,
      [phrase2.rows[0].id, "w2"],
    );
    await query(
      `insert into gloss (gloss, state, phrase_id, updated_at) values ($1, $2, $3, now())`,
      ["of God", "APPROVED", phrase2.rows[0].id],
    );

    const snapshotId = ulid();
    const jobId = ulid();
    const payload = {
      languageId: language.id,
      languageCode: language.code,
      snapshotId,
    };
    const createdAt = new Date();

    await query(
      `
        insert into job (id, status, payload, created_at, updated_at, type_id)
        values (
          $1, $2, $3, $4, $5,
          (select id from job_type where name = $6)
        )
      `,
      [
        jobId,
        "pending",
        payload,
        createdAt,
        createdAt,
        "create_snapshot_interlinear_pdf",
      ],
    );

    const { processJob } = await import("@/shared/jobs/processJob");
    await processJob({
      body: JSON.stringify({
        id: jobId,
        type: "create_snapshot_interlinear_pdf",
        payload,
      }),
      receiptHandle: "localstack-test",
    } as any);

    const jobResult = await query<{ status: string; data: any }>(
      `select status, data from job where id = $1`,
      [jobId],
    );
    expect(jobResult.rows[0]?.status).toBe("complete");
    expect(jobResult.rows[0]?.data).toMatchObject({
      uploaded: true,
      key: `${language.id}/${snapshotId}/interlinear/standard.pdf`,
      books: 2,
    });

    const key = `${language.id}/${snapshotId}/interlinear/standard.pdf`;
    const pdfBytes = await fetchObjectBytes(s3, { bucket, key });
    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);

    const partsPrefix = `${language.id}/${snapshotId}/interlinear/parts/`;
    const parts = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: partsPrefix }),
    );
    const partKeys = (parts.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => typeof k === "string");
    expect(partKeys).toEqual([]);
  });
});

async function ensureBucket(s3Client: S3Client, bucket: string) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch {
    // fallthrough
  }

  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "BucketAlreadyExists" || name === "BucketAlreadyOwnedByYou") {
      return;
    }
    throw error;
  }
}

async function fetchObjectBytes(
  s3Client: S3Client,
  { bucket, key }: { bucket: string; key: string },
): Promise<Uint8Array> {
  const res = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await s3BodyToUint8Array(res.Body);
  if (!bytes) throw new Error("Expected GetObjectCommand Body");
  return bytes;
}
