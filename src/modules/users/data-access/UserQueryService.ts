import { query } from "@/db";
import { SimpleUserView } from "./types";

const userQueryService = {
  async findByEmail(email: string): Promise<SimpleUserView | undefined> {
    const result = await query<SimpleUserView>(
      `
        select id, name, email from users where email = $1
      `,
      [email.toLowerCase()],
    );

    return result.rows[0];
  },

  async findById(id: string): Promise<SimpleUserView | undefined> {
    const result = await query<SimpleUserView>(
      `
        select id, name, email from users where id = $1
      `,
      [id],
    );

    return result.rows[0];
  },
};
export default userQueryService;
