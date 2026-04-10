import { getDb } from "@/db";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";

export type LanguageMemberStatus = "active" | "invited" | "removed";

export interface LanguageDashboardMemberReadModel {
  id: string;
  name: string | null;
  email: string;
  status: LanguageMemberStatus;
}

export async function getLanguageDashboardMembersReadModel(
  languageId: string,
): Promise<LanguageDashboardMemberReadModel[]> {
  return getDb()
    .with("invited_user", (db) =>
      db.selectFrom("user_invitation").select("user_id").distinct(),
    )
    .with("contributor", (db) =>
      db
        .selectFrom("gloss")
        .innerJoin("phrase", "phrase.id", "gloss.phrase_id")
        .where("phrase.language_id", "=", languageId)
        .select("gloss.updated_by as user_id")
        .distinct(),
    )
    .with("member", (db) =>
      db
        .selectFrom("language_member")
        .where("language_id", "=", languageId)
        .select("user_id"),
    )
    .with("combined", (db) =>
      db
        .selectFrom("contributor")
        .fullJoin("member", "member.user_id", "contributor.user_id")
        .select([
          (eb) =>
            eb.fn
              .coalesce("member.user_id", "contributor.user_id")
              .as("user_id"),
          (eb) => eb("member.user_id", "is not", null).as("is_member"),
        ]),
    )
    .selectFrom("combined")
    .innerJoin("users", "users.id", "combined.user_id")
    .leftJoin("invited_user", "invited_user.user_id", "users.id")
    .where("users.status", "<>", UserStatusRaw.Disabled)
    .select([
      "users.id",
      "users.name",
      "users.email",
      (eb) =>
        eb
          .case()
          .when("combined.is_member", "=", false)
          .then<LanguageMemberStatus>("removed")
          .when("invited_user.user_id", "is not", null)
          .then<LanguageMemberStatus>("invited")
          .else<LanguageMemberStatus>("active")
          .end()
          .as("status"),
    ])
    .orderBy("users.name")
    .execute();
}
