import { GlossApprovalMethodRaw, GlossStateRaw } from "../types";
import { phraseRepository } from "../data-access/phraseRepository";
import { NotFoundError } from "@/shared/errors";
import { resolveLanguageByCode } from "@/modules/languages";

export interface UpdateGlossUseCaseRequest {
  languageCode: string;
  phraseId: number;
  gloss?: string;
  state?: GlossStateRaw;
  userId: string;
  method?: GlossApprovalMethodRaw;
}

export async function updateGlossUseCase(request: UpdateGlossUseCaseRequest) {
  const language = await resolveLanguageByCode(request.languageCode);
  if (!language) {
    throw new NotFoundError("Language");
  }

  const phrase = await phraseRepository.findWithinLanguage({
    languageId: language.id,
    phraseId: request.phraseId,
  });
  if (!phrase) {
    throw new NotFoundError("Phrase");
  }

  phrase.updateGloss({
    gloss: request.gloss ?? phrase.gloss?.gloss ?? null,
    state: request.state ?? phrase.gloss?.state ?? GlossStateRaw.Unapproved,
    userId: request.userId,
    approvalMethod: request.method,
  });

  await phraseRepository.commit(phrase);
}
