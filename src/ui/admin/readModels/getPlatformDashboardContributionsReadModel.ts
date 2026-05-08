import { getDb } from "@/db";

export interface PlatformDashboardContributionReadModel {
  userId: string;
  approvedGlossCount: number;
}

export async function getPlatformDashboardContributionsReadModel(): Promise<
  PlatformDashboardContributionReadModel[]
> {
  return getDb()
    .selectFrom("book_completion_progress")
    .where("book_completion_progress.user_id", "is not", null)
    .groupBy("book_completion_progress.user_id")
    .select([
      (eb) =>
        eb.ref("book_completion_progress.user_id").$notNull().as("userId"),
      (eb) =>
        eb.fn
          .sum<number>("book_completion_progress.word_count")
          .as("approvedGlossCount"),
    ])
    .orderBy("approvedGlossCount", "desc")
    .execute();
}
