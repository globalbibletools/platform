import { getDb } from "@/db";

export interface LanguageDashboardContributionReadModel {
  userId: string | null;
  name: string | null;
  bookId: number;
  approvedGlossCount: number;
}

export async function getLanguageDashboardContributionsReadModel(
  languageId: string,
): Promise<LanguageDashboardContributionReadModel[]> {
  return getDb()
    .selectFrom("book_completion_progress")
    .leftJoin("users", "users.id", "book_completion_progress.user_id")
    .where("book_completion_progress.language_id", "=", languageId)
    .select([
      "book_completion_progress.user_id as userId",
      "users.name as name",
      "book_completion_progress.book_id as bookId",
      (eb) =>
        eb.fn
          .coalesce("book_completion_progress.word_count", eb.lit(0))
          .as("approvedGlossCount"),
    ])
    .orderBy("book_completion_progress.book_id")
    .orderBy("approvedGlossCount", "desc")
    .execute();
}
