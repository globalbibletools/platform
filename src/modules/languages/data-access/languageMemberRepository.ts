import { getDb } from "@/db";
import { LanguageMember } from "../model";

const languageMemberRepository = {
  async exists(languageId: string, userId: string): Promise<boolean> {
    const result = await getDb()
      .selectFrom("language_member")
      .where("language_id", "=", languageId)
      .where("user_id", "=", userId)
      .executeTakeFirst();
    return Boolean(result);
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
  },

  async delete(languageId: string, userId: string): Promise<void> {
    await getDb()
      .deleteFrom("language_member")
      .where("language_id", "=", languageId)
      .where("user_id", "=", userId)
      .execute();
  },

  async deleteAll(userId: string): Promise<void> {
    await getDb()
      .deleteFrom("language_member")
      .where("user_id", "=", userId)
      .execute();
  },
};
export default languageMemberRepository;
