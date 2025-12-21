import { getDb } from "@/db";

export interface UserLanguageReadModel {
  id: string;
  name: string;
  code: string;
}

export async function getUserLanguagesReadModel(
  userId: string,
): Promise<Array<UserLanguageReadModel>> {
  const result = getDb()
    .selectFrom("language")
    .where(({ exists, selectFrom }) =>
      exists(
        selectFrom("language_member")
          .whereRef("language_id", "=", "language.id")
          .where("user_id", "=", userId),
      ),
    )
    .orderBy("name")
    .select(["id", "name", "code"])
    .execute();
  return result;
}
