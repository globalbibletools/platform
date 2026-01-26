import { getDb } from "@/db";

export interface SearchLanguagesReadModelRequest {
  page: number;
  limit: number;
}

export interface SearchLanguagesReadModel {
  total: number;
  page: Array<{
    code: string;
    englishName: string;
    localName: string;
    otProgress: number;
    ntProgress: number;
  }>;
}

export async function searchLanguagesReadModel(
  options: SearchLanguagesReadModelRequest,
): Promise<SearchLanguagesReadModel> {
  const [totalResult, page] = await Promise.all([
    getDb()
      .selectFrom("language")
      .select(({ fn }) => fn.countAll<number>().as("total"))
      .executeTakeFirst(),
    getDb()
      .selectFrom("language as l")
      .leftJoin("language_progress as p", "p.code", "l.code")
      .select((eb) => [
        "l.code",
        "l.english_name as englishName",
        "l.local_name as localName",
        eb.fn.coalesce("p.ot_progress", eb.lit(0)).as("otProgress"),
        eb.fn.coalesce("p.nt_progress", eb.lit(0)).as("ntProgress"),
      ])
      .orderBy("l.english_name")
      .offset(options.page * options.limit)
      .limit(options.limit)
      .execute(),
  ]);

  return { total: totalResult?.total ?? 0, page };
}
