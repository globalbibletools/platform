import { close, reconnect } from "@/db";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach } from "vitest";

export const DATABASE_NAME = `test${process.env.VITEST_POOL_ID}`;
export const DATABASE_URL = createDatabaseUrl(DATABASE_NAME);

function createDatabaseUrl(name: string) {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "");
  url.pathname = name;
  return url.toString();
}

export function initializeDatabase(destroyAfter = true) {
  const dbClient = new Client(process.env.TEST_DATABASE_URL);

  process.env.DATABASE_URL = DATABASE_URL;

  beforeAll(async () => {
    await dbClient.connect();
  });

  beforeEach(async () => {
    // We have to close the database connection so that we can drop the database between tests.
    try {
      await close();
    } catch (error) {}

    await dbClient.query(`drop database if exists ${DATABASE_NAME}`);
    await dbClient.query(
      `create database ${DATABASE_NAME} template test_template`,
    );

    reconnect();
  });

  if (destroyAfter) {
    afterAll(async () => {
      await dbClient.query(`drop database if exists ${DATABASE_NAME}`);
    });
  }

  afterAll(async () => {
    await dbClient.end();
  });
}

interface DatabaseUser {
  id: string;
  name?: string;
  hashedPassword?: string;
  email: string;
  emailStatus: EmailStatusRaw;
  userStatus: UserStatusRaw;
}

interface DatabaseSeed {
  users: DatabaseUser[];
}

export async function seedDatabase(seed: DatabaseSeed) {
  const dbClient = new Client(DATABASE_URL);
  try {
    await dbClient.connect();

    if (seed.users.length > 0) {
      await dbClient.query(
        `
        insert into users (id, name, hashed_password, email, email_status, status)
        select unnest($1::uuid[]), unnest($2::text[]), unnest($3::text[]), unnest($4::text[]), unnest($5::email_status[]), unnest($6::user_status[])
      `,
        [
          seed.users.map((user) => user.id),
          seed.users.map((user) => user.name),
          seed.users.map((user) => user.hashedPassword),
          seed.users.map((user) => user.email),
          seed.users.map((user) => user.emailStatus),
          seed.users.map((user) => user.userStatus),
        ],
      );
    }
  } finally {
    await dbClient.end();
  }
}
