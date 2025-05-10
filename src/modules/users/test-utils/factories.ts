import { Async } from "factory.ts";
import {
  DbEmailVerification,
  DbInvitation,
  DbPasswordReset,
  DbSession,
  DbSystemRole,
  DbUser,
} from "../data-access/types";
import { faker } from "@faker-js/faker/locale/en";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import { ulid } from "@/shared/ulid";
import { query } from "@/db";

export const sessionFactory = Async.makeFactoryWithRequired<
  DbSession,
  "userId"
>({
  id: Async.each(() => ulid()),
  expiresAt: Async.each(() => faker.date.soon()),
}).transform(async (session) => {
  await query(
    `
      insert into session (id, user_id, expires_at)
      values ($1, $2, $3)
    `,
    [session.id, session.userId, session.expiresAt],
  );
  return session;
});

export const userFactory = Async.makeFactory<DbUser>({
  id: Async.each(() => ulid()),
  name: Async.each(() => faker.person.fullName()),
  email: Async.each(() => faker.internet.email().toLowerCase()),
  hashedPassword: "hashedpassword",
  emailStatus: EmailStatusRaw.Verified,
  status: UserStatusRaw.Active,
}).transform(async (user) => {
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
  return user;
});

export const passwordResetFactory = Async.makeFactoryWithRequired<
  DbPasswordReset,
  "userId"
>({
  token: Async.each(() => faker.string.alphanumeric(20)),
  expiresAt: Async.each(() => faker.date.soon()),
}).transform(async (reset) => {
  await query(
    `
      insert into reset_password_token (user_id, token, expires)
      values ($1, $2, $3)
    `,
    [reset.userId, reset.token, reset.expiresAt.valueOf()],
  );
  return reset;
});

export const invitationFactory = Async.makeFactoryWithRequired<
  DbInvitation,
  "userId"
>({
  token: Async.each(() => faker.string.alphanumeric(20)),
  expiresAt: Async.each(() => faker.date.soon()),
}).transform(async (invite) => {
  await query(
    `
        insert into user_invitation (user_id, token, expires)
        values ($1, $2, $3)
      `,
    [invite.userId, invite.token, invite.expiresAt.valueOf()],
  );
  return invite;
});

export const emailVerificationFactory = Async.makeFactoryWithRequired<
  DbEmailVerification,
  "userId"
>({
  token: Async.each(() => faker.string.alphanumeric(20)),
  expiresAt: Async.each(() => faker.date.soon()),
  email: Async.each(() => faker.internet.email().toLowerCase()),
}).transform(async (verification) => {
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
  return verification;
});

export const systemRoleFactory = Async.makeFactoryWithRequired<
  DbSystemRole,
  "userId" | "role"
>({}).transform(async (role) => {
  await query(
    `
      insert into user_system_role (user_id, role)
      values ($1, $2)
    `,
    [role.userId, role.role],
  );
  return role;
});
