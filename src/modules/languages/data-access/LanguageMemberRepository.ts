import { query } from "@/db";
import { LanguageMember } from "../model";

const languageMemberRepository = {
  async create(member: LanguageMember): Promise<void> {
    await query(
      `
        insert into language_member_role (language_id, user_id, role)
        select $1, $2, unnest($3::language_role[])
      `,
      [member.languageId, member.userId, ["VIEWER", ...member.roles]],
    );
  },

  async delete(languageId: string, userId: string): Promise<void> {
    await query(
      `
        delete from language_member_role
        where language_id = $1 and user_id = $2
      `,
      [languageId, userId],
    );
  },
};
export default languageMemberRepository;
