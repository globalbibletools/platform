import { getDb } from "@/db";

export interface ReadLanguageReadModel {
  code: string;
  englishName: string;
  localName: string;
  isMember: boolean;
}

export async function getReadLanguagesReadModel(
  userId?: string,
): Promise<Array<ReadLanguageReadModel>> {
  const results = await getDb()
    .selectFrom("language as l")
    .select(({ exists, selectFrom, lit }) => [
      "code",
      "english_name as englishName",
      "local_name as localName",
      userId ?
        exists(
          selectFrom("language_member")
            .whereRef("language_id", "=", "l.id")
            .where("user_id", "=", userId),
        ).as("isMember")
      : lit(false).as("isMember"),
    ])
    .orderBy("local_name")
    .execute();

  return results.map((r) => ({
    ...r,
    isMember: Boolean(r.isMember),
  }));
}
