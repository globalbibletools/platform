import { query } from "@/db";
import { LanguageClaims, ActorClaims } from "./model";

const claimsRepository = {
  async findActorClaims(userId: string): Promise<ActorClaims> {
    const result = await query<ActorClaims>(
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

  async findLanguageClaims(
    languageCode: string,
    actorId: string,
  ): Promise<LanguageClaims> {
    const result = await query<LanguageClaims>(
      `
        select
          $1 as code,
          coalesce(json_agg(r.role), '[]') as roles
        from language_member_role r
        where r.user_id = $2
          and r.language_id = (select id from language where code = $1)
        group by r.language_id
      `,
      [languageCode, actorId],
    );

    return (
      result.rows[0] ?? {
        id: "unknown",
        roles: [],
      }
    );
  },
};
export default claimsRepository;
