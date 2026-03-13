import { getDb } from "@/db";
import type { Selectable } from "kysely";
import type {
  ResetPasswordTokenTable,
  SessionTable,
  UserEmailVerificationTable,
  UserInvitationTable,
  UserSystemRoleTable,
  UserTable,
} from "../data-access/types";

export async function findUserById(
  id: string,
): Promise<Selectable<UserTable> | undefined> {
  return getDb()
    .selectFrom("users")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function findUserByEmail(
  email: string,
): Promise<Selectable<UserTable> | undefined> {
  return getDb()
    .selectFrom("users")
    .selectAll()
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
}

export async function findInvitationsForUser(
  userId: string,
): Promise<Selectable<UserInvitationTable>[]> {
  return getDb()
    .selectFrom("user_invitation")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("expires_at")
    .execute();
}

export async function findEmailVerificationForUser(
  userId: string,
): Promise<Selectable<UserEmailVerificationTable> | undefined> {
  return getDb()
    .selectFrom("user_email_verification")
    .selectAll()
    .where("user_id", "=", userId)
    .executeTakeFirst();
}

export async function findPasswordResetsForUser(
  userId: string,
): Promise<Selectable<ResetPasswordTokenTable>[]> {
  return getDb()
    .selectFrom("reset_password_token")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("expires_at")
    .execute();
}

export async function findSystemRolesForUser(
  userId: string,
): Promise<Selectable<UserSystemRoleTable>[]> {
  return getDb()
    .selectFrom("user_system_role")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("role")
    .execute();
}

export async function findSessionsForUser(
  userId: string,
): Promise<Selectable<SessionTable>[]> {
  return getDb()
    .selectFrom("session")
    .selectAll()
    .where("user_id", "=", userId)
    .execute();
}
