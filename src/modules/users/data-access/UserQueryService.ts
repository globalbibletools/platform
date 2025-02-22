import { query } from "@/db";
import { InviteView, SimpleUserView } from "./types";

const userQueryService = {
  async resetPasswordTokenExists(token: string): Promise<boolean> {
    const result = await query(
      `
        select 1 from reset_password_token
        where token = $1
            and expires > (extract(epohc from current_timestamp)::bigint * 1000::bigint)
      `,
      [token],
    );
    return result.rows.length > 0;
  },

  async findInviteByToken(token: string): Promise<InviteView> {
    const result = await query<InviteView>(
      `
        select u.email, i.token
        from user_invitation as i
        join users as u on u.id = i.user_id
        where i.token = $1
      `,
      [token],
    );
    return result.rows[0];
  },

  async findByEmail(email: string): Promise<SimpleUserView> {
    const result = await query<SimpleUserView>(
      `
        select id from users where email = $1
      `,
      [email.toLowerCase()],
    );

    return result.rows[0];
  },
};
export default userQueryService;
