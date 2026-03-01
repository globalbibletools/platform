import { vi } from "vitest";
import { close, reconnect } from "@/db";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { execSync } from "child_process";

// We have to hoist this so the database url env var is available when "@/db" is imported
const { DATABASE_NAME, DATABASE_URL } = vi.hoisted(() => {
  const DATABASE_NAME = `test${process.env.VITEST_POOL_ID}`;
  const DATABASE_URL = createDatabaseUrl(DATABASE_NAME);

  process.env.DATABASE_URL = DATABASE_URL;

  return { DATABASE_NAME, DATABASE_URL };
});

export { DATABASE_NAME, DATABASE_URL };

function createDatabaseUrl(name: string) {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "");
  url.pathname = name;
  return url.toString();
}

export type SeedType = "none" | "minimal" | "full";

const SEED_DUMP_FILES: Record<SeedType, string | null> = {
  none: null,
  minimal: "./db/scripts/test_seed_minimal.dump",
  full: "./db/scripts/test_seed_full.dump",
};

export function initializeDatabase({
  seed = "none",
  destroyAfter = true,
}: {
  /** Seed to load after each test DB is created. Defaults to `"none"`. */
  seed?: SeedType;
  /** Drop the per-worker database after all tests in this file complete. Defaults to `true`. */
  destroyAfter?: boolean;
} = {}) {
  const dbClient = new Client(process.env.TEST_DATABASE_URL);

  beforeAll(async () => {
    await dbClient.connect();
  });

  beforeEach(async () => {
    // We have to close the database connection so that we can drop the database between tests.
    await close();

    await dbClient.query(`drop database if exists ${DATABASE_NAME}`);
    await dbClient.query(
      `create database ${DATABASE_NAME} template test_template`,
    );

    const seedFile = SEED_DUMP_FILES[seed];
    if (seedFile) {
      execSync(
        `pg_restore -Fc --disable-triggers -d ${DATABASE_URL} ${seedFile}`,
      );
    }

    await reconnect();
  });

  afterAll(async () => {
    await close();

    if (destroyAfter) {
      await dbClient.query(`drop database if exists ${DATABASE_NAME}`);
    }

    await dbClient.end();
  });
}
