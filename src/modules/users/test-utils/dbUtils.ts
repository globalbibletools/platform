import { query } from "@/db";
import {
  DbEmailVerification,
  DbInvitation,
  DbPasswordReset,
  DbSession,
  DbSystemRole,
  DbUser,
} from "../data-access/types";

export async function findUserById(id: string): Promise<DbUser | undefined> {
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

export async function findUserByEmail(
  email: string,
): Promise<DbUser | undefined> {
  const result = await query<DbUser>(
    `
      select id, name, hashed_password as "hashedPassword", email, email_status as "emailStatus", status
      from users
      where email = $1
    `,
    [email.toLowerCase()],
  );

  return result.rows[0];
}

export async function findInvitationsForUser(
  userId: string,
): Promise<DbInvitation[]> {
  const result = await query<DbInvitation>(
    `
        select user_id as "userId", token,
            timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000) as "expiresAt"
        from user_invitation
        where user_id = $1
        order by expires
    `,
    [userId],
  );

  return result.rows;
}

export async function findEmailVerificationForUser(
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

export async function findPasswordResetsForUser(
  userId: string,
): Promise<DbPasswordReset[]> {
  const result = await query<DbPasswordReset>(
    `
        select user_id as "userId", token,
            timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000) as "expiresAt"
        from reset_password_token
        where user_id = $1
    `,
    [userId],
  );

  return result.rows;
}

export async function findSystemRolesForUser(
  userId: string,
): Promise<DbSystemRole[]> {
  const result = await query<DbSystemRole>(
    `
      select user_id as "userId", role
      from user_system_role
      where user_id = $1
    `,
    [userId],
  );
  return result.rows;
}

export async function findSessionsForUser(
  userId: string,
): Promise<DbSession[]> {
  const result = await query<DbSession>(
    `
        select id, user_id as "userId", expires_at as "expiresAt"
        from session
        where user_id = $1
    `,
    [userId],
  );

  return result.rows;
}
