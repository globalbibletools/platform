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

    await dbClient.query(`drop database if exists ${DATABASE_NAME}`);
    await dbClient.query(
      `create database ${DATABASE_NAME} template test_template`,
    );

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

interface DbUser {
  id: string;
  name?: string;
  hashedPassword?: string;
  email: string;
  emailStatus: EmailStatusRaw;
  status: UserStatusRaw;
}

interface DbSystemRole {
  userId: string;
  role: string;
}

interface DbInvitation {
  userId: string;
  token: string;
  expiresAt: Date;
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

interface DbPasswordReset {
  userId: string;
  token: string;
  expiresAt: Date;
}

interface DbLanguage {
  id: string;
  code: string;
  name: string;
}

interface DatabaseSeed {
  users?: DbUser[];
  systemRoles?: DbSystemRole[];
  sessions?: DbSession[];
  passwordResets?: DbPasswordReset[];
  invitations?: DbInvitation[];
  languages?: DbLanguage[];
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

  if (seed.systemRoles) {
    await query(
      `
        insert into user_system_role (user_id, role)
        select unnest($1::uuid[]), unnest($2::system_role[])
      `,
      [
        seed.systemRoles.map((r) => r.userId),
        seed.systemRoles.map((r) => r.role),
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

  if (seed.passwordResets) {
    await query(
      `
        insert into reset_password_token (user_id, token, expires)
        select unnest($1::uuid[]), unnest($2::text[]), unnest($3::bigint[])
      `,
      [
        seed.passwordResets.map((reset) => reset.userId),
        seed.passwordResets.map((reset) => reset.token),
        seed.passwordResets.map((reset) => reset.expiresAt.valueOf()),
      ],
    );
  }

  if (seed.invitations) {
    await query(
      `
        insert into user_invitation (user_id, token, expires)
        select unnest($1::uuid[]), unnest($2::text[]), unnest($3::bigint[])
      `,
      [
        seed.invitations.map((reset) => reset.userId),
        seed.invitations.map((reset) => reset.token),
        seed.invitations.map((reset) => reset.expiresAt.valueOf()),
      ],
    );
  }

  if (seed.languages) {
    await query(
      `
        insert into language (id, code, name)
        select unnest($1::uuid[]), unnest($2::text[]), unnest($3::text[])
      `,
      [
        seed.languages.map((lang) => lang.id),
        seed.languages.map((lang) => lang.code),
        seed.languages.map((lang) => lang.name),
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

export async function findUsers(): Promise<DbUser[]> {
  const result = await query<DbUser>(
    `
        select id, name, hashed_password as "hashedPassword", email, email_status as "emailStatus", status
        from users
    `,
    [],
  );

  return result.rows;
}

export async function findInvitations(): Promise<DbInvitation[]> {
  const result = await query<DbInvitation>(
    `
        select user_id as "userId", token,
            timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000) as "expiresAt"
        from user_invitation
    `,
    [],
  );

  return result.rows;
}

export async function findSessions(): Promise<DbSession[]> {
  const result = await query<DbSession>(
    `
        select id, user_id as "userId", expires_at as "expiresAt"
        from session
    `,
    [],
  );

  return result.rows;
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

export async function findPasswordResets(): Promise<DbPasswordReset[]> {
  const result = await query<DbPasswordReset>(
    `
        select user_id as "userId", token,
            timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000) as "expiresAt"
        from reset_password_token
    `,
    [],
  );

  return result.rows;
}

export async function findLanguages(): Promise<DbLanguage[]> {
  const result = await query<DbLanguage>(
    `
        select id, code, name
        from language
    `,
    [],
  );
  return result.rows;
}
