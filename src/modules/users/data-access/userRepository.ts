import { Database, getDb } from "@/db";
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
    await getDb()
      .transaction()
      .execute(async (tx) => {
        await tx
          .insertInto("users")
          .values({
            id: user.id,
            name: user.name,
            email: user.email.address,
            email_status: user.email.status.value,
            hashed_password: user.password?.hash,
            status: user.status.value,
          })
          .onConflict((oc) =>
            oc.column("id").doUpdateSet({
              name: sql`excluded.name`,
              email: sql`excluded.email`,
              email_status: sql`excluded.email_status`,
              hashed_password: sql`excluded.hashed_password`,
              status: sql`excluded.status`,
            }),
          )
          .execute();

        if (user.invitations.length === 0) {
          await tx
            .deleteFrom("user_invitation")
            .where("user_id", "=", user.id)
            .execute();
        } else {
          await tx
            .deleteFrom("user_invitation")
            .where("user_id", "=", user.id)
            .where(
              "token",
              "not in",
              user.invitations.map((inv) => inv.token),
            )
            .execute();

          await tx
            .insertInto("user_invitation")
            .values(
              user.invitations.map((inv) => ({
                user_id: user.id,
                token: inv.token,
                expires: inv.expiresAt.valueOf(),
              })),
            )
            .onConflict((oc) =>
              oc.column("token").doUpdateSet({
                expires: sql`excluded.expires`,
              }),
            )
            .execute();
        }

        await tx
          .deleteFrom("user_email_verification")
          .where("user_id", "=", user.id)
          .execute();

        if (user.emailVerification) {
          await tx
            .insertInto("user_email_verification")
            .values({
              user_id: user.id,
              email: user.emailVerification.email,
              token: user.emailVerification.token,
              expires: user.emailVerification.expiresAt.valueOf(),
            })
            .execute();
        }

        if (user.passwordResets.length === 0) {
          await tx
            .deleteFrom("reset_password_token")
            .where("user_id", "=", user.id)
            .execute();
        } else {
          await tx
            .deleteFrom("reset_password_token")
            .where("user_id", "=", user.id)
            .where(
              "token",
              "not in",
              user.passwordResets.map((reset) => reset.token),
            )
            .execute();

          await tx
            .insertInto("reset_password_token")
            .values(
              user.passwordResets.map((reset) => ({
                user_id: user.id,
                token: reset.token,
                expires: reset.expiresAt.valueOf(),
              })),
            )
            .onConflict((oc) =>
              oc.column("token").doUpdateSet({
                expires: sql`excluded.expires`,
              }),
            )
            .execute();
        }

        if (user.systemRoles.length === 0) {
          await tx
            .deleteFrom("user_system_role")
            .where("user_id", "=", user.id)
            .execute();
        } else {
          await tx
            .deleteFrom("user_system_role")
            .where("user_id", "=", user.id)
            .where(
              "role",
              "not in",
              user.systemRoles.map((role) => role.value),
            )
            .execute();

          await tx
            .insertInto("user_system_role")
            .values(
              user.systemRoles.map((role) => ({
                user_id: user.id,
                role: role.value,
              })),
            )
            .onConflict((oc) => oc.doNothing())
            .execute();
        }
      });
  },
};
export default userRepository;

function selectUserFields(
  query: SelectQueryBuilder<Database, "users", any>,
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
