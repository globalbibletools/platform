import UserSystemAccess from "../model/UserSystemAccess";
import SystemRole from "../model/SystemRole";
import { query } from "@/db";

const userSystemAccessRepository = {
  async findByUserId(userId: string): Promise<UserSystemAccess> {
    const result = await query(
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
  },

  async commit(userAccess: UserSystemAccess): Promise<void> {
    await query(
      `
        with delete_step AS (
            delete from user_system_role
            where user_id = $1 and role != all($2::system_role[])
        )
        insert into user_system_role (user_id, role)
        select $1, unnest($2::system_role[])
        on conflict do nothing
      `,
      [userAccess.userId, userAccess.systemRoles.map((role) => role.value)],
    );
  },
};
export default userSystemAccessRepository;
