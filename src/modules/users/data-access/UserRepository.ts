import { query, transaction } from "@/db";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import PasswordReset from "../model/PasswordReset";
import EmailVerification from "../model/EmailVerification";
import EmailStatus, { EmailStatusRaw } from "../model/EmailStatus";
import Password from "../model/Password";

interface DbUser {
  id: string;
  name: string | null;
  email: string;
  email_status: EmailStatusRaw;
  hashed_password: string | null;
  password_resets: { token: string; expiresAt: Date }[] | null;
  email_verification: { email: string; token: string; expiresAt: Date } | null;
}

function dbToUser(dbModel: DbUser): User {
  return new User({
    id: dbModel.id,
    name: dbModel.name ?? undefined,
    email: new UserEmail({
      address: dbModel.email,
      status: EmailStatus.fromRaw(dbModel.email_status),
    }),
    emailVerification:
      dbModel.email_verification ?
        new EmailVerification({
          ...dbModel.email_verification,
          expiresAt: new Date(dbModel.email_verification.expiresAt),
        })
      : undefined,
    password:
      dbModel.hashed_password ?
        new Password({ hash: dbModel.hashed_password })
      : undefined,
    passwordResets:
      dbModel.password_resets?.map(
        (reset) =>
          new PasswordReset({
            ...reset,
            expiresAt: new Date(reset.expiresAt),
          }),
      ) ?? [],
  });
}

const userRepository = {
  async findById(id: string) {
    const result = await query<DbUser>(
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
    const result = await query<DbUser>(
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

  async findByResetPasswordToken(token: string) {
    const result = await query<DbUser>(
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
    const result = await query<DbUser>(
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
          insert into users (id, name, email, email_status, hashed_password)
          values ($1, $2, $3, $4, $5)
          on conflict (id) do update set
            name = excluded.name,
            email = excluded.email,
            email_status = excluded.email_status,
            hashed_password = excluded.hashed_password
        `,
        [
          user.id,
          user.name,
          user.email.address,
          user.email.status.value,
          user.password?.hash,
        ],
      );

      if (user.emailVerification) {
        await query(
          `
            insert into user_email_verification (user_id, email, token, expires)
            values ($1, $2, $3, $4)
            on conflict (token) do update set
              email = excluded.email,
              expires = excluded.expires
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
    });
  },
};
export default userRepository;

const USER_SELECT = `
    select
        u.id,
        u.name,
        u.hashed_password,
        u.email,
        u.email_status,
        (
            select json_agg(json_build_object(
                'token', token,
                'expiresAt', timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)
            ))
            from reset_password_token
            where user_id = u.id
        ) as password_resets,
        (
            select json_build_object(
                'email', email,
                'token', token,
                'expiresAt', timestamp '1970-01-01' + make_interval(0, 0, 0, 0, 0, 0, expires / 1000)
            )
            from user_email_verification
            where user_id = u.id
        ) as email_verification
    from users u
`;
