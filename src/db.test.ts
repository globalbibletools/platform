import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { beforeEach, describe, expect, test } from "vitest";
import { copyStreamV2, query } from "./db";
import { Readable } from "stream";

initializeDatabase();

describe("copyStreamV2", () => {
  const sourceData: Array<{
    id: number;
    flag: boolean;
    content: string;
    total: number;
    createdAt: Date;
  }> = [];
  for (let i = 0; i < 100; i++) {
    sourceData.push({
      id: i + 1,
      flag: Math.random() > 0.5,
      content: String.fromCharCode(Math.floor(Math.random() * 26) + 65),
      total: Math.floor(Math.random() * 1000),
      createdAt: new Date(),
    });
  }

  beforeEach(async () => {
    await query(
      `
        create table test (
          id serial primary key,
          flag bool not null default false,
          content text,
          total int not null,
          created_at timestamptz default now()
        )
      `,
      [],
    );
  });

  test("can stream data into a table", async () => {
    await copyStreamV2<any, any>({
      table: "test",
      stream: Readable.from(sourceData),
      fields: {
        id: (record: any) => record.id.toString(),
        flag: (record: any) => record.flag.toString(),
        content: (record: any) => record.content,
        total: (record: any) => record.total.toString(),
        created_at: (record: any) => record.createdAt.toISOString(),
      },
    });

    const insertedRows = await query(`select * from test order by id;`, []);
    expect(insertedRows.rows).toEqual(
      sourceData.map((record) => ({
        id: record.id,
        flag: record.flag,
        content: record.content,
        total: record.total,
        created_at: record.createdAt,
      })),
    );
  });

  test("can stream a subset of columns into a table", async () => {
    await copyStreamV2<any, any>({
      table: "test",
      stream: Readable.from(sourceData),
      fields: {
        content: (record: any) => record.content,
        total: (record: any) => record.total.toString(),
      },
    });

    const insertedRows = await query(`select * from test order by id;`, []);
    expect(insertedRows.rows).toEqual(
      sourceData.map((record, i) => ({
        id: i + 1,
        flag: false,
        content: record.content,
        total: record.total,
        created_at: expect.toBeNow(),
      })),
    );
  });

  test("can stream data in chunks into a table", async () => {
    const chunks = [];
    for (let i = 0; i < 10; i++) {
      chunks.push(sourceData.slice(10 * i, 10 * (i + 1)));
    }

    await copyStreamV2<any, any>({
      table: "test",
      stream: Readable.from(chunks),
      fields: {
        id: (record: any) => record.id.toString(),
        flag: (record: any) => record.flag.toString(),
        content: (record: any) => record.content,
        total: (record: any) => record.total.toString(),
        created_at: (record: any) => record.createdAt.toISOString(),
      },
    });

    const insertedRows = await query(`select * from test order by id;`, []);
    expect(insertedRows.rows).toEqual(
      sourceData.map((record) => ({
        id: record.id,
        flag: record.flag,
        content: record.content,
        total: record.total,
        created_at: record.createdAt,
      })),
    );
  });
});
