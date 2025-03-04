import { vi } from "vitest";
import { close, query, reconnect } from "@/db";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach } from "vitest";
import {
  LanguageMemberRoleRaw,
  TextDirectionRaw,
} from "@/modules/languages/model";

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
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  gtSourceLanguage?: string;
}

interface DbLanguageMember {
  languageId: string;
  userId: string;
  role: LanguageMemberRoleRaw | "VIEWER";
}

interface DatabaseSeed {
  users?: DbUser[];
  systemRoles?: DbSystemRole[];
  sessions?: DbSession[];
  passwordResets?: DbPasswordReset[];
  invitations?: DbInvitation[];
  languages?: DbLanguage[];
  languageMemberRoles?: DbLanguageMember[];
  emailVerifications?: DbEmailVerification[];
}

export async function seedDatabase(seed: DatabaseSeed) {
  if (seed.users) {
    for (const user of seed.users) {
      await insertUser(user);
    }
  }
  if (seed.systemRoles) {
    for (const role of seed.systemRoles) {
      await insertSystemRole(role);
    }
  }
  if (seed.sessions) {
    for (const session of seed.sessions) {
      await insertSession(session);
    }
  }
  if (seed.passwordResets) {
    for (const reset of seed.passwordResets) {
      await insertPasswordReset(reset);
    }
  }
  if (seed.invitations) {
    for (const invite of seed.invitations) {
      await insertInvitation(invite);
    }
  }
  if (seed.languages) {
    for (const language of seed.languages) {
      await insertLanguage(language);
    }
  }
  if (seed.languageMemberRoles) {
    for (const role of seed.languageMemberRoles) {
      await insertLanguageMemberRole(role);
    }
  }
  if (seed.emailVerifications) {
    for (const verification of seed.emailVerifications) {
      await insertEmailVerification(verification);
    }
  }
}

export async function insertUser(user: DbUser): Promise<void> {
  await query(
    `
      insert into users (id, name, hashed_password, email, email_status, status)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      user.id,
      user.name,
      user.hashedPassword,
      user.email,
      user.emailStatus,
      user.status,
    ],
  );
}

export async function insertSystemRole(role: DbSystemRole): Promise<void> {
  await query(
    `
      insert into user_system_role (user_id, role)
      values ($1, $2)
    `,
    [role.userId, role.role],
  );
}

export async function insertSession(session: DbSession): Promise<void> {
  await query(
    `
      insert into session (id, user_id, expires_at)
      values ($1, $2, $3)
    `,
    [session.id, session.userId, session.expiresAt],
  );
}

export async function insertPasswordReset(
  reset: DbPasswordReset,
): Promise<void> {
  await query(
    `
      insert into reset_password_token (user_id, token, expires)
      values ($1, $2, $3)
    `,
    [reset.userId, reset.token, reset.expiresAt.valueOf()],
  );
}

export async function insertInvitation(invite: DbInvitation): Promise<void> {
  await query(
    `
        insert into user_invitation (user_id, token, expires)
        values ($1, $2, $3)
      `,
    [invite.userId, invite.token, invite.expiresAt.valueOf()],
  );
}

export async function insertLanguage(lang: DbLanguage): Promise<void> {
  await query(
    `
        insert into language (id, code, name, font, text_direction, translation_ids, gt_source_lang)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
    [
      lang.id,
      lang.code,
      lang.name,
      lang.font,
      lang.textDirection,
      lang.translationIds,
      lang.gtSourceLanguage,
    ],
  );
}

export async function insertLanguageMemberRole(
  role: DbLanguageMember,
): Promise<void> {
  await query(
    `
        insert into language_member_role (language_id, user_id, role)
        values ($1, $2, $3)
      `,
    [role.languageId, role.userId, role.role],
  );
}

export async function insertEmailVerification(
  verification: DbEmailVerification,
): Promise<void> {
  await query(
    `
      insert into user_email_verification (user_id, email, token, expires)
      values ($1, $2, $3, $4)
    `,
    [
      verification.userId,
      verification.email,
      verification.token,
      verification.expiresAt.valueOf(),
    ],
  );
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

export async function findEmailVerifications(): Promise<DbEmailVerification[]> {
  const result = await query<DbEmailVerification>(
    `
        select user_id as "userId", email, token,
            timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000) as "expiresAt"
        from user_email_verification
    `,
    [],
  );
  return result.rows;
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

export async function findSystemRoles(): Promise<DbSystemRole[]> {
  const result = await query<DbSystemRole>(
    `
        select user_id as "userId", role
        from user_system_role
    `,
    [],
  );
  return result.rows;
}

export async function findLanguages(): Promise<DbLanguage[]> {
  const result = await query<DbLanguage>(
    `
        select id, code, name, font,
          text_direction as "textDirection",
          coalesce(translation_ids, '{}') as "translationIds",
          gt_source_lang as "gtSourceLanguage"
        from language
    `,
    [],
  );
  return result.rows;
}

export async function findLanguageMembers(): Promise<DbLanguageMember[]> {
  const result = await query<DbLanguageMember>(
    `
        select language_id as "languageId", user_id as "userId", role
        from language_member_role
    `,
    [],
  );
  return result.rows;
}
