import { Pool } from "pg";
import UserPolicy from "../model/UserPolicy";

export default class UserPolicyRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<UserPolicy> {
    const result = await this.pool.query(
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
  }
}
