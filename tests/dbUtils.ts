import { vi } from "vitest";
import { close, query, reconnect } from "@/db";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach } from "vitest";

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

export function initializeDatabase(destroyAfter = true) {
  const dbClient = new Client(process.env.TEST_DATABASE_URL);

  beforeAll(async () => {
    await dbClient.connect();
  });

  beforeEach(async () => {
    // We have to close the database connection so that we can drop the database between tests.
    await close();

    await dbClient.query(
      `drop database if exists ${DATABASE_NAME} with (force)`,
    );
    await dbClient.query(
      `create database ${DATABASE_NAME} template test_template`,
    );

    await reconnect();
  });

  afterAll(async () => {
    if (destroyAfter) {
      await dbClient.query(`drop database if exists ${DATABASE_NAME}`);
    }
    await dbClient.end();
    console.log("closed 1");
  });

  afterAll(async () => {
    await close();
    console.log("closed 2");
  });
}

interface DbUser {
  id: string;
  name?: string;
  hashedPassword?: string;
  email: string;
  emailStatus: EmailStatusRaw;
  status: UserStatusRaw;
}

interface DbSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

interface DbEmailVerification {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

interface DatabaseSeed {
  users?: DbUser[];
  sessions?: DbSession[];
}

export async function seedDatabase(seed: DatabaseSeed) {
  if (seed.users) {
    await query(
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
        seed.users.map((user) => user.status),
      ],
    );
  }

  if (seed.sessions) {
    await query(
      `
        insert into session (id, user_id, expires_at)
        select unnest($1::uuid[]), unnest($2::uuid[]), unnest($3::timestamp[])
      `,
      [
        seed.sessions.map((session) => session.id),
        seed.sessions.map((session) => session.userId),
        seed.sessions.map((session) => session.expiresAt),
      ],
    );
  }
}

export async function findUser(id: string): Promise<DbUser | undefined> {
  const result = await query<DbUser>(
    `
        select id, name, hashed_password as "hashedPassword", email, email_status as "emailStatus", status
        from users
        where id = $1
    `,
    [id],
  );

  return result.rows[0];
}

export async function findEmailVerification(
  userId: string,
): Promise<DbEmailVerification | undefined> {
  const result = await query<DbEmailVerification>(
    `
        select user_id as "userId", email, token,
            timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000) as "expiresAt"
        from user_email_verification
        where user_id = $1
    `,
    [userId],
  );

  return result.rows[0];
}
