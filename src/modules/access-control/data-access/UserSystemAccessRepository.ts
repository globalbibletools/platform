import { Pool } from "pg";
import UserSystemAccess from "../model/UserSystemAccess";
import SystemRole from "../model/SystemRole";

export default class UserSystemAccessRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<UserSystemAccess> {
    const result = await this.pool.query(
      `
        select json_agg(role) AS roles
        from user_system_role
        where user_id = $1::uuid
      `,
      [userId],
    );

    return new UserSystemAccess({
      userId,
      systemRoles: (result.rows[0]?.roles ?? []).map(SystemRole.fromRaw),
    });
  }
}
