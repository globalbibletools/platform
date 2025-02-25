import { query } from "@/db";
import { UserClaims } from "./model";

const claimsRepository = {
  async findUserClaims(userId: string): Promise<UserClaims> {
    const result = await query<UserClaims>(
      `
        select
          u.id as "userId",
          (
            select coalesce(json_agg(r.role), '[]')
            from user_system_role r
            where r.user_id = u.id
          ) as "systemRoles"
        from users u
        where u.id = $1
      `,
      [userId],
    );

    return (
      result.rows[0] ?? {
        id: userId,
        systemRoles: [],
      }
    );
  },

  async findUserClaimsWithLanguage(
    userId: string,
    languageCode: string,
  ): Promise<UserClaims> {
    const result = await query<UserClaims>(
      `
        select
          u.id as "userId",
          (
            select coalesce(json_agg(r.role), '[]')
            from user_system_role r
            where r.user_id = u.id
          ) as "systemRoles",
          (
            select coalesce(json_agg(r.role), '[]')
            from language_member_role r
            where r.user_id = u.id
              and r.language_id = (select id from language where code = $2)
          ) as "languageRoles"
        from users u
        where u.id = $1
      `,
      [userId, languageCode],
    );

    return (
      result.rows[0] ?? {
        id: userId,
        systemRoles: [],
        languageRoles: [],
      }
    );
  },
};
export default claimsRepository;
