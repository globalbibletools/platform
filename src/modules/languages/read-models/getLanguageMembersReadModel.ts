import { sql } from "kysely";
import { getDb } from "@/db";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";

export interface LanguageMembersReadModel {
  id: string;
  name: string | null;
  email: string;
  invite: null | {
    token: string;
    expiresAt: string;
  };
}

export async function getLanguageMembersReadModel(
  languageCode: string,
): Promise<Array<LanguageMembersReadModel>> {
  const result = await getDb()
    .selectFrom("language_member")
    .innerJoin("users", "users.id", "user_id")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("user_invitation")
          .whereRef("user_id", "=", "users.id")
          .select(({ ref }) =>
            sql<{ token: string; expiresAt: string }>`
              json_build_object(
                'token', ${ref("token")}
              )
            `.as("json"),
          )
          .orderBy("expires_at", "desc")
          .limit(1)
          .as("invitation"),
      (join) => join.onTrue(),
    )
    .where(({ eb, selectFrom }) =>
      eb(
        "language_id",
        "=",
        selectFrom("language").select("id").where("code", "=", languageCode),
      ),
    )
    .where("users.status", "<>", UserStatusRaw.Disabled)
    .select([
      "users.id",
      "users.name",
      "users.email",
      "invitation.json as invite",
    ])
    .orderBy("users.name")
    .execute();
  return result;
}
