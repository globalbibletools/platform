import { NotFoundError } from "@/shared/errors";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { resolveLanguageByCode } from "@/modules/languages";
import { TRANSLATION_JOB_TYPES } from "../jobs/jobType";

export interface EnqueueAIGlossImportJobRequest {
  languageCode: string;
}

export interface EnqueueAIGlossImportJobResult {
  jobId: string;
}

export async function enqueueAIGlossImportJob(
  request: EnqueueAIGlossImportJobRequest,
): Promise<EnqueueAIGlossImportJobResult> {
  const language = await resolveLanguageByCode(request.languageCode);
  if (!language) {
    throw new NotFoundError("Language");
  }

  const job = await enqueueJob(TRANSLATION_JOB_TYPES.IMPORT_AI_GLOSSES, {
    languageCode: request.languageCode,
  });

  return { jobId: job.id };
}
