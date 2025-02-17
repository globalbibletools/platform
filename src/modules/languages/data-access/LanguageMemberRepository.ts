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
};
export default languageMemberRepository;
