import { query } from "@/db";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import UserAuthentication from "../model/UserAuthentication";
import PasswordReset from "../model/PasswordReset";
import EmailVerification from "../model/EmailVerification";

const userRepository = {
  async findByEmail(email: string) {
    const result = await query(
      `
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
                where u.email = $1
            `,
      [email],
    );

    const dbModel = result.rows[0];
    if (!dbModel) return;

    return new User({
      id: dbModel.id,
      name: dbModel.name ?? undefined,
      email: new UserEmail({
        address: dbModel.email,
        status: dbModel.email_status,
        verification:
          dbModel.verification ?
            new EmailVerification(dbModel.verification)
          : undefined,
      }),
      auth:
        dbModel.hashed_password ?
          new UserAuthentication({
            hashedPassword: dbModel.hashed_password,
            resets: dbModel.password_resets?.map(
              (reset: any) => new PasswordReset(reset),
            ),
          })
        : undefined,
    });
  },
};
export default userRepository;
