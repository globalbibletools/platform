import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { describe, expect, test } from "vitest";
import jobRepository from "./jobRepository";
import { ulid } from "@/shared/ulid";
import { getDb } from "@/db";
import { Insertable } from "kysely";
import { JobTable } from "../db/schema";
import { Job, JobStatus } from "../model";

initializeDatabase();

describe("getById", () => {
  test("returns undefined if the job does not exist", async () => {
    const result = await jobRepository.getById(ulid());
    expect(result).toBeUndefined();
  });

  test("returns the job if it exists", async () => {
    const job: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job",
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
      type: "test_job",
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
      payload: null,
      data: null,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    });
  });
});

describe("create", () => {
  test("inserts a new job with payload into the database", async () => {
    const job: Job<{ payloadData: string }> = {
      id: ulid(),
      type: "test_job",
      status: JobStatus.Complete,
      payload: { payloadData: "asdf" },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await jobRepository.create(job);

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
      },
    ]);
  });

  test("inserts a new job with empty payload into the database", async () => {
    const job: Job<void> = {
      id: ulid(),
      type: "test_job",
      status: JobStatus.Complete,
      payload: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await jobRepository.create(job);

    const jobs = await getDb().selectFrom("job").selectAll().execute();
    expect(jobs).toEqual([
      {
        id: job.id,
        type: job.type,
        status: job.status,
        payload: null,
        data: null,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      },
    ]);
  });
});

describe("update", () => {
  test("updates the job's status", async () => {
    const job: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job",
      status: JobStatus.Pending,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await getDb().insertInto("job").values(job).execute();

    const newStatus = JobStatus.InProgress;
    await jobRepository.update(job.id, newStatus);

    const updatedJob = await getDb()
      .selectFrom("job")
      .where("id", "=", job.id)
      .selectAll()
      .executeTakeFirst();
    expect(updatedJob).toEqual({
      id: job.id,
      type: job.type,
      status: newStatus,
      payload: null,
      data: null,
      created_at: job.created_at,
      updated_at: expect.toBeNow(),
    });
  });

  test("updates the job's status and data", async () => {
    const job: Insertable<JobTable> = {
      id: ulid(),
      type: "test_job",
      status: JobStatus.Pending,
      data: { updated: false },
      created_at: new Date(),
      updated_at: new Date(),
    };
    await getDb().insertInto("job").values(job).execute();

    const newStatus = JobStatus.InProgress;
    const newData = { updated: true };
    await jobRepository.update(job.id, newStatus, newData);

    const updatedJob = await getDb()
      .selectFrom("job")
      .where("id", "=", job.id)
      .selectAll()
      .executeTakeFirst();
    expect(updatedJob).toEqual({
      id: job.id,
      type: job.type,
      status: newStatus,
      payload: null,
      data: newData,
      created_at: job.created_at,
      updated_at: expect.toBeNow(),
    });
  });
});
