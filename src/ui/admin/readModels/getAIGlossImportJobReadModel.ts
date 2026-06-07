import { getDb } from "@/db";
import { JobStatus } from "@/shared/jobs/model";
import { sql } from "kysely";

interface AIGlossImportJobReadModel {
  id: string;
  updatedAt: Date;
  status: JobStatus;
  bookId?: number;
}

export async function getAIGlossImportJobReadModel(
  code: string,
): Promise<AIGlossImportJobReadModel | undefined> {
  const job = await getDb()
    .selectFrom("job")
    .where("type", "=", "import_ai_glosses")
    .where("payload", "@>", { languageCode: code })
    .orderBy("created_at", "desc")
    .limit(1)
    .select([
      "id",
      "status",
      "updated_at as updatedAt",
      (eb) =>
        sql<number | undefined>`(${eb.ref("data")}->>'bookId')::int`.as(
          "bookId",
        ),
    ])
    .executeTakeFirst();

  return job;
}
