import { Pool } from "pg";
import UserPolicy, { SystemRolePolicy } from "../model/UserPolicy";

export default class UserPolicyRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<UserPolicy> {
    const result = await this.pool.query(
      `
        select role
        from user_system_role
        where user_id = $1::uuid
      `,
      [userId],
    );

    return new UserPolicy({
      policies: result.rows.map((role) => new SystemRolePolicy(role.role)),
    });
  }
}
