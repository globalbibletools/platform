import { NotFoundError } from "@/shared/errors";
import { enqueueJob } from "@/shared/jobs/enqueueJob";
import { resolveLanguageByCode } from "@/modules/languages";

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

  const job = await enqueueJob({
    type: "import_ai_glosses",
    payload: {
      languageCode: request.languageCode,
    },
  });

  return { jobId: job.id };
}
