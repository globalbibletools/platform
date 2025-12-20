import { getDb, query } from "@/db";
import { LanguageMember } from "../model";

const languageMemberRepository = {
  async exists(languageId: string, userId: string): Promise<boolean> {
    const result = await query(
      `
        select 1 from language_member_role
        where language_id = $1 and user_id = $2
        limit 1
      `,
      [languageId, userId],
    );

    return result.rows.length > 0;
  },

  async create(member: LanguageMember): Promise<void> {
    await getDb()
      .insertInto("language_member")
      .values({
        language_id: member.languageId,
        user_id: member.userId,
        invited_at: new Date(),
      })
      .execute();
    await query(
      `
        insert into language_member_role (language_id, user_id, role)
        select $1, $2, unnest($3::language_role[])
      `,
      [member.languageId, member.userId, ["VIEWER", ...member.roles]],
    );
  },

  async update(member: LanguageMember): Promise<void> {
    await query(
      `
        with del as (
            delete from language_member_role AS r
            where r.language_id = $1 and r.user_id = $2
              and r.role != all($3::language_role[])
        )
        insert into language_member_role (language_id, user_id, role)
        select $1, $2, unnest($3::language_role[])
        on conflict do nothing
      `,
      [member.languageId, member.userId, ["VIEWER", ...member.roles]],
    );
  },

  async delete(languageId: string, userId: string): Promise<void> {
    await getDb()
      .deleteFrom("language_member")
      .where("language_id", "=", languageId)
      .where("user_id", "=", userId)
      .execute();
    await query(
      `
        delete from language_member_role
        where language_id = $1 and user_id = $2
      `,
      [languageId, userId],
    );
  },

  async deleteAll(userId: string): Promise<void> {
    await getDb()
      .deleteFrom("language_member")
      .where("user_id", "=", userId)
      .execute();
    await query(
      `
        delete from language_member_role
        where user_id = $1
      `,
      [userId],
    );
  },
};
export default languageMemberRepository;
