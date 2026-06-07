import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import jobRepository from "./jobRepository";
import { ulid } from "@/shared/ulid";
import { getDb } from "@/db";
import { Insertable } from "kysely";
import { JobTable } from "../db/schema";
import { JobStatus } from "../model";

initializeDatabase();

describe("getById", () => {
  test("returns undefined if the job does not exist", async () => {
    const result = await jobRepository.getById(ulid());
    expect(result).toBeUndefined();
  });

  test("returns the job if it exists", async () => {
    const job: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job" as any,
      status: JobStatus.Complete,
      payload: { payloadData: "asdf" },
      data: { data: true },
      created_at: new Date(),
      updated_at: new Date(),
    };
    await getDb().insertInto("job").values(job).execute();

    const result = await jobRepository.getById(job.id);
    expect(result).toEqual({
      id: job.id,
      type: job.type,
      status: job.status,
      payload: job.payload,
      data: job.data,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
  });

  test("returns empty payload and data if not set", async () => {
    const job: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job" as any,
      status: JobStatus.Complete,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await getDb().insertInto("job").values(job).execute();

    const result = await jobRepository.getById(job.id);
    expect(result).toEqual({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
  });

  test("returns parent job ID", async () => {
    const parentJob: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job" as any,
      status: JobStatus.Complete,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const job: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job" as any,
      status: JobStatus.Complete,
      created_at: new Date(),
      updated_at: new Date(),
      parent_job_id: parentJob.id,
    };
    await getDb().insertInto("job").values([parentJob, job]).execute();

    const result = await jobRepository.getById(job.id);
    expect(result).toEqual({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      parentJobId: job.parent_job_id,
    });
  });
});

describe("commit", () => {
  test("inserts a new job into the database", async () => {
    const job = {
      id: ulid(),
      type: "test_job",
      status: JobStatus.Pending,
      payload: { payloadData: "hello" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await jobRepository.commit(job as any);

    const jobs = await getDb().selectFrom("job").selectAll().execute();
    expect(jobs).toEqual([
      {
        id: job.id,
        type: job.type,
        status: job.status,
        payload: job.payload,
        data: null,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
        parent_job_id: null,
      },
    ]);
  });

  test("updates status, data, and updated_at on conflict", async () => {
    const existingJob: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job" as any,
      status: JobStatus.Pending,
      payload: { key: "value" },
      created_at: new Date(),
      updated_at: new Date(),
    };
    await getDb().insertInto("job").values(existingJob).execute();

    const updatedJob = {
      id: existingJob.id!,
      type: "test_job" as const,
      status: JobStatus.InProgress,
      payload: { key: "value" },
      data: { progress: 50 },
      createdAt: existingJob.created_at!,
      updatedAt: new Date(),
    };

    await jobRepository.commit(updatedJob as any);

    const result = await getDb()
      .selectFrom("job")
      .where("id", "=", existingJob.id!)
      .selectAll()
      .executeTakeFirst();
    expect(result).toEqual({
      id: existingJob.id,
      type: "test_job",
      status: JobStatus.InProgress,
      payload: { key: "value" },
      data: { progress: 50 },
      created_at: existingJob.created_at,
      updated_at: updatedJob.updatedAt,
      parent_job_id: null,
    });
  });

  test("does not overwrite immutable fields on conflict", async () => {
    const originalPayload = { original: true };
    const existingJob: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job" as any,
      status: JobStatus.Pending,
      payload: originalPayload,
      created_at: new Date("2025-01-01"),
      updated_at: new Date("2025-01-01"),
    };
    await getDb().insertInto("job").values(existingJob).execute();

    const updatedJob = {
      id: existingJob.id!,
      type: "test_job",
      status: JobStatus.Complete,
      payload: { different: true },
      createdAt: new Date("2025-12-31"),
      updatedAt: new Date("2025-06-01"),
    };

    await jobRepository.commit(updatedJob as any);

    const result = await getDb()
      .selectFrom("job")
      .where("id", "=", existingJob.id!)
      .selectAll()
      .executeTakeFirst();
    // Immutable fields (payload, created_at) should remain from the original insert
    expect(result).toEqual({
      id: existingJob.id,
      type: "test_job",
      status: JobStatus.Complete,
      payload: originalPayload,
      data: null,
      created_at: existingJob.created_at,
      updated_at: updatedJob.updatedAt,
      parent_job_id: null,
    });
  });

  test("inserts a new job with parent job ID", async () => {
    const parentJob: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job" as any,
      status: JobStatus.Complete,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await getDb().insertInto("job").values(parentJob).execute();

    const job = {
      id: ulid(),
      type: "test_job" as const,
      status: JobStatus.Pending,
      payload: undefined as undefined,
      data: undefined as undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentJobId: parentJob.id!,
    };

    await jobRepository.commit(job as any);

    const jobs = await getDb().selectFrom("job").selectAll().execute();
    expect(jobs).toEqual([
      {
        ...parentJob,
        data: null,
        payload: null,
        parent_job_id: null,
      },
      {
        id: job.id,
        type: job.type,
        status: job.status,
        payload: null,
        data: null,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
        parent_job_id: parentJob.id,
      },
    ]);
  });
});
