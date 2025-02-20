import { query } from "@/db";
import { SimpleUserView } from "./types";

const userQueryService = {
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
