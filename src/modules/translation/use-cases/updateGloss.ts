import { trackingClient } from "@/modules/reporting";
import glossRepository from "../data-access/GlossRepository";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";
import phraseRepository from "../data-access/PhraseRepository";
import { NotFoundError } from "@/shared/errors";

export interface UpdateGlossUseCaseRequest {
  languageCode: string;
  phraseId: number;
  gloss?: string;
  state?: GlossStateRaw;
  userId: string;
  method?: GlossApprovalMethodRaw;
}

export async function updateGlossUseCase(request: UpdateGlossUseCaseRequest) {
  const phrase = await phraseRepository.findWithinLanguageById(
    request.languageCode,
    request.phraseId,
  );
  if (!phrase) {
    throw new NotFoundError("Phrase");
  }

  const existingGloss = await glossRepository.findByPhraseId(request.phraseId);
  const wasUnapproved =
    !existingGloss || existingGloss.state === GlossStateRaw.Unapproved;

  await glossRepository.update({
    phraseId: request.phraseId,
    gloss: request.gloss,
    state: request.state,
    updatedBy: request.userId,
    source: GlossSourceRaw.User,
  });

  if (
    wasUnapproved &&
    request.state === GlossStateRaw.Approved &&
    request.method
  ) {
    await trackingClient.trackOne({
      type: "approved_gloss",
      languageId: phrase.language.id,
      userId: request.userId,
      phraseId: request.phraseId,
      method: request.method,
    });
  }
}
