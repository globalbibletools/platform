import { getDb, query, transaction } from "@/db";
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

const userRepository = {
  async existsByEmail(email: string): Promise<boolean> {
    const result = await getDb()
      .selectFrom("users")
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst();
    return Boolean(result);
  },

  async findById(id: string) {
    const result = await query<DbUserModel>(
      `
        ${USER_SELECT}
        where u.id = $1
      `,
      [id],
    );

    const dbModel = result.rows[0];
    if (!dbModel) return;

    return dbToUser(dbModel);
  },

  async findByEmail(email: string) {
    const result = await query<DbUserModel>(
      `
        ${USER_SELECT}
        where u.email = $1
      `,
      [email.toLowerCase()],
    );

    const dbModel = result.rows[0];
    if (!dbModel) return;

    return dbToUser(dbModel);
  },

  async findByInvitationToken(token: string) {
    const result = await query<DbUserModel>(
      `
        ${USER_SELECT}
        where u.id = (
            select user_id from user_invitation
            where token = $1
        )
      `,
      [token],
    );

    const dbModel = result.rows[0];
    if (!dbModel) return;

    return dbToUser(dbModel);
  },

  async findByResetPasswordToken(token: string) {
    const result = await query<DbUserModel>(
      `
        ${USER_SELECT}
        where u.id = (
            select user_id from reset_password_token
            where token = $1
        )
      `,
      [token],
    );

    const dbModel = result.rows[0];
    if (!dbModel) return;

    return dbToUser(dbModel);
  },

  async findByEmailVerificationToken(token: string) {
    const result = await query<DbUserModel>(
      `
        ${USER_SELECT}
        where u.id = (
            select user_id from user_email_verification
            where token = $1
        )
      `,
      [token],
    );

    const dbModel = result.rows[0];
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

const USER_SELECT = `
    select
        u.id,
        u.name,
        u.hashed_password as "hashedPassword",
        u.email,
        u.email_status as "emailStatus",
        u.status,
        (
            select json_agg(json_build_object(
                'token', token,
                'expiresAt', timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)
            ))
            from reset_password_token
            where user_id = u.id
        ) as "passwordResets",
        (
            select json_build_object(
                'email', email,
                'token', token,
                'expiresAt', timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)
            )
            from user_email_verification
            where user_id = u.id
            limit 1
        ) as "emailVerification",
        (
            select json_agg(json_build_object(
                'token', token,
                'expiresAt', timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)
            ))
            from user_invitation
            where user_id = u.id
        ) as invitations,
        (
            select json_agg(role)
            from user_system_role
            where user_id = u.id
        ) as "systemRoles"
    from users u
`;
