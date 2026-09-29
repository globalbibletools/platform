import { getDb } from "@/db";

export interface LanguageReadModel {
  code: string;
  englishName: string;
  isMember: boolean;
}

export async function getLanguagesReadModel(
  userId?: string,
): Promise<Array<LanguageReadModel>> {
  const results = await getDb()
    .selectFrom("language as l")
    .select(({ exists, selectFrom, lit }) => [
      "code",
      "english_name as englishName",
      userId ?
        exists(
          selectFrom("language_member")
            .whereRef("language_id", "=", "l.id")
            .where("user_id", "=", userId),
        ).as("isMember")
      : lit(false).as("isMember"),
    ])
    .orderBy("english_name")
    .execute();

  return results.map((r) => ({
    ...r,
    isMember: Boolean(r.isMember),
  }));
}
