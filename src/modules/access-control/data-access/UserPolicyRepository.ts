import { query } from "@/db";
import UserPolicy from "../model/UserPolicy";

const userPolicyRepository = {
  async findByUserId(userId: string): Promise<UserPolicy> {
    const result = await query(
      `
        select json_agg(role) AS roles
        from user_system_role
        where user_id = $1::uuid
      `,
      [userId],
    );

    return new UserPolicy({
      systemRoles: result.rows[0]?.roles ?? [],
    });
  },
};
export default userPolicyRepository;
