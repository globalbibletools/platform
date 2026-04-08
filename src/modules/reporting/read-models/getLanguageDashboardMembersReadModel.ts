import { getDb } from "@/db";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";

export interface LanguageDashboardMemberReadModel {
  id: string;
  name: string | null;
}

export async function getLanguageDashboardMembersReadModel(
  languageId: string,
): Promise<LanguageDashboardMemberReadModel[]> {
  return getDb()
    .selectFrom("language_member")
    .innerJoin("users", "users.id", "language_member.user_id")
    .where("language_member.language_id", "=", languageId)
    .where("users.status", "<>", UserStatusRaw.Disabled)
    .select(["users.id", "users.name"])
    .orderBy("users.name")
    .execute();
}
