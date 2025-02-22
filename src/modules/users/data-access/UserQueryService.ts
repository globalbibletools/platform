import { query } from "@/db";
import { SimpleUserView } from "./types";

const userQueryService = {
  async resetPasswordTokenExists(token: string): Promise<boolean> {
      const tokenQuery = await query(
        `select 1 from reset_password_token where token = $1
                and expires > (extract(epohc from current_timestamp)::bigint * 1000::bigint)
            `,
        [token],
      );
      return tokenQuery.rows.length > 0
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
