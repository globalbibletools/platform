import { getDb } from "@/db";
import { TRANSLATION_JOB_TYPES } from "../jobs/jobType";
import { JobStatus } from "@/shared/jobs/model";

interface AIGlossImportJobReadModel {
  updatedAt: Date;
  status: JobStatus;
}

export async function getAIGlossImportJobReadModel(
  code: string,
): Promise<AIGlossImportJobReadModel | undefined> {
  const job = await getDb()
    .selectFrom("job")
    .where("type", "=", TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES)
    .where("payload", "@>", { languageCode: code })
    .orderBy("created_at", "desc")
    .limit(1)
    .select(["status", "updated_at as updatedAt"])
    .executeTakeFirst();

  return job;
}
