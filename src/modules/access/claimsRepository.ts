import { getDb } from "@/db";
import { LanguageClaims, ActorClaims } from "./model";

const claimsRepository = {
  async findActorClaims(userId: string): Promise<ActorClaims> {
    const result = await getDb()
      .selectFrom("user_system_role")
      .where("user_id", "=", userId)
      .select("role")
      .execute();

    return {
      id: userId,
      systemRoles: result.map((r) => r.role),
    };
  },

  async findLanguageClaims(
    languageCode: string,
    actorId: string,
  ): Promise<LanguageClaims> {
    const result = await getDb()
      .selectFrom("language_member")
      .where("user_id", "=", actorId)
      .where(({ eb, selectFrom }) =>
        eb(
          "language_id",
          "=",
          selectFrom("language").select("id").where("code", "=", languageCode),
        ),
      )
      .executeTakeFirst();

    return {
      code: languageCode,
      isMember: Boolean(result),
    };
  },
};
export default claimsRepository;
