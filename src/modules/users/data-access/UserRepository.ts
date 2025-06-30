import { db, query, transaction } from "@/db";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import PasswordReset from "../model/PasswordReset";
import EmailVerification from "../model/EmailVerification";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import Invitation from "../model/Invitation";
import UserStatus from "../model/UserStatus";
import SystemRole from "../model/SystemRole";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { InferResult, sql } from "kysely";

type DbUserModel = InferResult<ReturnType<typeof selectUser>>[number];

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
      dbModel.systemRoles?.map(({ role }) => SystemRole.fromRaw(role)) ?? [],
  });
}

const userRepository = {
  async existsByEmail(email: string): Promise<boolean> {
    const user = await db
      .selectFrom("users")
      .where("email", "=", email)
      .select("id")
      .executeTakeFirst();

    return !!user;
  },

  async findById(id: string) {
    const dbModel = await selectUser().where("id", "=", id).executeTakeFirst();

    if (!dbModel) return;
    return dbToUser(dbModel);
  },

  async findByEmail(email: string) {
    const dbModel = await selectUser()
      .where("email", "=", email)
      .executeTakeFirst();

    if (!dbModel) return;
    return dbToUser(dbModel);
  },

  async findByInvitationToken(token: string) {
    const dbModel = await selectUser()
      .where(({ eb, selectFrom }) =>
        eb(
          "email",
          "=",
          selectFrom("user_invitation")
            .where("token", "=", token)
            .select("user_id"),
        ),
      )
      .executeTakeFirst();

    if (!dbModel) return;
    return dbToUser(dbModel);
  },

  async findByResetPasswordToken(token: string) {
    const dbModel = await selectUser()
      .where(({ eb, selectFrom }) =>
        eb(
          "email",
          "=",
          selectFrom("reset_password_token")
            .where("token", "=", token)
            .select("user_id"),
        ),
      )
      .executeTakeFirst();

    if (!dbModel) return;
    return dbToUser(dbModel);
  },

  async findByEmailVerificationToken(token: string) {
    const dbModel = await selectUser()
      .where(({ eb, selectFrom }) =>
        eb(
          "email",
          "=",
          selectFrom("user_email_verification")
            .where("token", "=", token)
            .select("user_id"),
        ),
      )
      .executeTakeFirst();

    if (!dbModel) return;
    return dbToUser(dbModel);
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

      if (user.emailVerification) {
        await query(
          `
            insert into user_email_verification (user_id, email, token, expires)
            values ($1, $2, $3, $4)
            on conflict (token) do nothing
          `,
          [
            user.id,
            user.emailVerification.email,
            user.emailVerification.token,
            user.emailVerification.expiresAt.valueOf(),
          ],
        );
      } else {
        await query(
          `
            delete from user_email_verification
            where user_id = $1
          `,
          [user.id],
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

function selectUser() {
  return db.selectFrom("users").select(({ selectFrom }) => [
    "id",
    "name",
    "hashed_password as hashedPassword",
    "email",
    "email_status as emailStatus",
    "status",
    jsonArrayFrom(
      selectFrom("reset_password_token")
        .whereRef("user_id", "=", "users.id")
        .select([
          "token",
          sql<Date>`timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)`.as(
            "expiresAt",
          ),
        ]),
    ).as("passwordResets"),
    jsonObjectFrom(
      selectFrom("user_email_verification")
        .whereRef("user_id", "=", "users.id")
        .select([
          "email",
          "token",
          sql<Date>`timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)`.as(
            "expiresAt",
          ),
        ])
        .limit(1),
    ).as("emailVerification"),
    jsonArrayFrom(
      selectFrom("user_invitation")
        .whereRef("user_id", "=", "users.id")
        .select([
          "token",
          sql<Date>`timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)`.as(
            "expiresAt",
          ),
        ]),
    ).as("invitations"),
    jsonArrayFrom(
      selectFrom("user_system_role")
        .whereRef("user_id", "=", "users.id")
        .select("role"),
    ).as("systemRoles"),
  ]);
}
