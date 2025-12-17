import { NotFoundError } from "@/shared/errors";
import phraseRepository from "../data-access/PhraseRepository";
import { GlossApprovalMethodRaw, GlossStateRaw } from "../types";
import glossRepository from "../data-access/GlossRepository";
import languageRepository from "@/modules/languages/data-access/languageRepository";
import trackingClient from "@/modules/reporting/public/trackingClient";

export interface ApproveAllUseCaseRequest {
  languageCode: string;
  phrases: {
    id: number;
    gloss: string;
    method?: GlossApprovalMethodRaw;
  }[];
  userId: string;
}

export async function approveAllUseCase(request: ApproveAllUseCaseRequest) {
  const phrasesExist = await phraseRepository.existsForLanguage(
    request.languageCode,
    request.phrases.map((phrase) => phrase.id),
  );
  if (!phrasesExist) {
    throw new NotFoundError("Phrase");
  }

  const glosses = await glossRepository.findManyByPhraseId(
    request.phrases.map((phrase) => phrase.id),
  );

  await glossRepository.approveMany({
    phrases: request.phrases.map((phrase) => ({
      phraseId: phrase.id,
      gloss: phrase.gloss,
    })),
    updatedBy: request.userId,
  });

  const language = await languageRepository.findByCode(request.languageCode);
  await trackingClient.trackManyEvents(
    request.phrases
      .filter((phrase) => {
        if (!phrase.method) return false;

        const gloss = glosses.find((gloss) => gloss.phraseId === phrase.id);
        return !gloss || gloss.state === GlossStateRaw.Unapproved;
      })
      .map((phrase) => ({
        type: "approve_gloss",
        userId: request.userId,
        languageId: language?.id,
        phraseId: phrase.id,
        method: phrase.method,
      })),
  );
}
