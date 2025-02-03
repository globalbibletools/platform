import { Client } from "pg";
import { afterAll, beforeEach } from "vitest";

const DATABASE_HOST_REGEX = /^(.+)\/.+$/;

const DATABASE_HOST = DATABASE_HOST_REGEX.exec(
  process.env.TEST_DATABASE_URL ?? "",
)?.[1];

export function initializeDatabase(uniqueName: string) {
  const databaseName = `vitest_${uniqueName}`;
  const databaseUrl = `${DATABASE_HOST}/${databaseName}`;

  beforeEach(async () => {
    let dbClient = new Client(process.env.TEST_DATABASE_URL);
    await dbClient.connect();
    await dbClient.query(`drop database if exists ${databaseName}`);
    await dbClient.query(
      `create database ${databaseName} template test_template`,
    );
    await dbClient.end();
  });

  afterAll(async () => {
    const dbClient = new Client(process.env.TEST_DATABASE_URL);
    await dbClient.connect();
    await dbClient.query(`drop database if exists ${databaseName}`);
    await dbClient.end();
  });

  process.env.DATABASE_URL = databaseUrl;

  return databaseUrl;
}
