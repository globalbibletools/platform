import { Database, getDb, query, transaction } from "@/db";
import { SelectQueryBuilder, sql } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import PasswordReset from "../model/PasswordReset";
import EmailVerification from "../model/EmailVerification";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import Invitation from "../model/Invitation";
import UserStatus from "../model/UserStatus";
import SystemRole from "../model/SystemRole";
import {
  DbEmailVerification,
  DbInvitation,
  DbPasswordReset,
  DbSystemRole,
  DbUser,
} from "./types";

type DbUserModel = DbUser & {
  passwordResets: Omit<DbPasswordReset, "userId">[] | null;
  emailVerification: Omit<DbEmailVerification, "userId"> | null;
  invitations: Omit<DbInvitation, "userId">[] | null;
  systemRoles: DbSystemRole["role"][] | null;
};

const userRepository = {
  async existsByEmail(email: string): Promise<boolean> {
    const result = await getDb()
      .selectFrom("users")
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst();
    return Boolean(result);
  },

  async findById(id: string) {
    const query = selectUserFields(
      getDb().selectFrom("users").where("id", "=", id),
    );

    const result = await query.executeTakeFirst();
    if (!result) return;

    return dbToUser(result);
  },

  async findByEmail(email: string) {
    const query = selectUserFields(
      getDb().selectFrom("users").where("email", "=", email.toLowerCase()),
    );

    const result = await query.executeTakeFirst();
    if (!result) return;

    return dbToUser(result);
  },

  async findByInvitationToken(token: string) {
    const query = selectUserFields(
      getDb()
        .selectFrom("users")
        .where("id", "in", (eb) =>
          eb
            .selectFrom("user_invitation")
            .select("user_id")
            .where("token", "=", token),
        ),
    );

    const result = await query.executeTakeFirst();
    if (!result) return;

    return dbToUser(result);
  },

  async findByResetPasswordToken(token: string) {
    const query = selectUserFields(
      getDb()
        .selectFrom("users")
        .where("id", "in", (eb) =>
          eb
            .selectFrom("reset_password_token")
            .select("user_id")
            .where("token", "=", token),
        ),
    );

    const result = await query.executeTakeFirst();
    if (!result) return;

    return dbToUser(result);
  },

  async findByEmailVerificationToken(token: string) {
    const query = selectUserFields(
      getDb()
        .selectFrom("users")
        .where("id", "in", (eb) =>
          eb
            .selectFrom("user_email_verification")
            .select("user_id")
            .where("token", "=", token),
        ),
    );

    const result = await query.executeTakeFirst();
    if (!result) return;

    return dbToUser(result);
  },

  async commit(user: User): Promise<void> {
    await transaction(async (query) => {
      await query(
        `
          insert into users (id, name, email, email_status, hashed_password, status)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (id) do update set
            name = excluded.name,
            email = excluded.email,
            email_status = excluded.email_status,
            hashed_password = excluded.hashed_password,
            status = excluded.status
        `,
        [
          user.id,
          user.name,
          user.email.address,
          user.email.status.value,
          user.password?.hash,
          user.status.value,
        ],
      );

      await query(
        `
            with data as (
                select
                    unnest($2::text[]) as token,
                    unnest($3::bigint[]) as expires
            ),
            del as (
                delete from user_invitation t
                where user_id = $1
                    and not exists (
                        select 1 from data
                        where data.token = t.token
                    )
            )
            insert into user_invitation (user_id, token, expires)
            select $1, data.token, data.expires from data
            on conflict (token) do update set
                expires = excluded.expires
        `,
        [
          user.id,
          user.invitations.map((reset) => reset.token),
          user.invitations.map((reset) => reset.expiresAt.valueOf()),
        ],
      );

      // Delete all existing email verification records for the user
      await query(
        `
          delete from user_email_verification
          where user_id = $1
        `,
        [user.id],
      );

      // Insert the new email verification if present
      if (user.emailVerification) {
        await query(
          `
            insert into user_email_verification (user_id, email, token, expires)
            values ($1, $2, $3, $4)
          `,
          [
            user.id,
            user.emailVerification.email,
            user.emailVerification.token,
            user.emailVerification.expiresAt.valueOf(),
          ],
        );
      }

      await query(
        `
            with data as (
                select
                    unnest($2::text[]) as token,
                    unnest($3::bigint[]) as expires
            ),
            del as (
                delete from reset_password_token t
                where user_id = $1
                    and not exists (
                        select 1 from data
                        where data.token = t.token
                    )
            )
            insert into reset_password_token (user_id, token, expires)
            select $1, data.token, data.expires from data
            on conflict (token) do update set
                expires = excluded.expires
        `,
        [
          user.id,
          user.passwordResets.map((reset) => reset.token),
          user.passwordResets.map((reset) => reset.expiresAt.valueOf()),
        ],
      );

      await query(
        `
            with data as (
                select unnest($2::system_role[]) as role
            ),
            del as (
                delete from user_system_role r
                where user_id = $1
                    and not exists (
                        select 1 from data
                        where data.role = r.role
                    )
            )
            insert into user_system_role (user_id, role)
            select $1, data.role from data
            on conflict do nothing
        `,
        [user.id, user.systemRoles.map((role) => role.value)],
      );
    });
  },
};
export default userRepository;

function selectUserFields(
  query: SelectQueryBuilder<Database, "users", {}>,
): SelectQueryBuilder<Database, "users", DbUserModel> {
  return query.select((eb) => [
    "users.id",
    "users.name",
    "users.hashed_password as hashedPassword",
    "users.email",
    "users.email_status as emailStatus",
    "users.status",
    jsonArrayFrom(
      eb
        .selectFrom("reset_password_token")
        .select((eb) => [
          "token",
          sql<Date>`to_timestamp(${eb.ref("expires")} / 1000)`.as("expiresAt"),
        ])
        .whereRef("reset_password_token.user_id", "=", "users.id"),
    ).as("passwordResets"),
    jsonObjectFrom(
      eb
        .selectFrom("user_email_verification")
        .select((eb) => [
          "email",
          "token",
          sql<Date>`to_timestamp(${eb.ref("expires")} / 1000)`.as("expiresAt"),
        ])
        .whereRef("user_email_verification.user_id", "=", "users.id")
        .limit(1),
    ).as("emailVerification"),
    jsonArrayFrom(
      eb
        .selectFrom("user_invitation")
        .select((eb) => [
          "token",
          sql<Date>`to_timestamp(${eb.ref("expires")} / 1000)`.as("expiresAt"),
        ])
        .whereRef("user_invitation.user_id", "=", "users.id"),
    ).as("invitations"),
    eb
      .selectFrom("user_system_role")
      .select((eb) => [eb.fn.jsonAgg("role").as("roles")])
      .whereRef("user_system_role.user_id", "=", "users.id")
      .as("systemRoles"),
  ]);
}

function dbToUser(dbModel: DbUserModel): User {
  return new User({
    id: dbModel.id,
    name: dbModel.name ?? undefined,
    email: new UserEmail({
      address: dbModel.email,
      status: EmailStatus.fromRaw(dbModel.emailStatus),
    }),
    emailVerification:
      dbModel.emailVerification ?
        new EmailVerification({
          ...dbModel.emailVerification,
          expiresAt: new Date(dbModel.emailVerification.expiresAt),
        })
      : undefined,
    password:
      dbModel.hashedPassword ?
        new Password({ hash: dbModel.hashedPassword })
      : undefined,
    passwordResets:
      dbModel.passwordResets?.map(
        (reset) =>
          new PasswordReset({
            ...reset,
            expiresAt: new Date(reset.expiresAt),
          }),
      ) ?? [],
    invitations:
      dbModel.invitations?.map(
        (invite) =>
          new Invitation({
            token: invite.token,
            expiresAt: new Date(invite.expiresAt),
          }),
      ) ?? [],
    status: UserStatus.fromRaw(dbModel.status),
    systemRoles:
      dbModel.systemRoles?.map((role) => SystemRole.fromRaw(role)) ?? [],
  });
}
