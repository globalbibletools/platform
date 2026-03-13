import { NotFoundError } from "@/shared/errors";
import { phraseRepository } from "../data-access/phraseRepository";
import { GlossApprovalMethodRaw, GlossStateRaw } from "../types";
import { resolveLanguageByCode } from "@/modules/languages";
import { kyselyTransaction } from "@/db";

export interface ApproveAllUseCaseRequest {
  languageCode: string;
  phrases: {
    id: number;
    gloss: string;
    method?: GlossApprovalMethodRaw;
  }[];
  userId: string;
}

export interface ApproveAllUseCaseResponse {
  notFound: number[];
}

export async function approveAllUseCase(
  request: ApproveAllUseCaseRequest,
): Promise<ApproveAllUseCaseResponse> {
  const language = await resolveLanguageByCode(request.languageCode);
  if (!language) {
    throw new NotFoundError("Language");
  }

  const notFound: number[] = [];

  await kyselyTransaction(async (trx) => {
    for (const requestPhrase of request.phrases) {
      const phrase = await phraseRepository.findWithinLanguage({
        languageId: language.id,
        phraseId: requestPhrase.id,
        trx,
      });

      if (!phrase) {
        notFound.push(requestPhrase.id);
        continue;
      }

      phrase.updateGloss({
        gloss: requestPhrase.gloss,
        state: GlossStateRaw.Approved,
        userId: request.userId,
        approvalMethod: requestPhrase.method,
      });

      await phraseRepository.commit(phrase, trx);
    }
  });

  return { notFound };
}
