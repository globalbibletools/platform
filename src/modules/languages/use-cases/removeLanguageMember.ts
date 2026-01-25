import { NotFoundError } from "@/shared/errors";
import languageRepository from "../data-access/languageRepository";
import languageMemberRepository from "../data-access/languageMemberRepository";

export interface RemoveLanguageMemberRequest {
  code: string;
  userId: string;
}

export async function removeLanguageMember(
  request: RemoveLanguageMemberRequest,
): Promise<void> {
  const language = await languageRepository.findByCode(request.code);
  if (!language) throw new NotFoundError("Language");

  await languageMemberRepository.delete(language.id, request.userId);
}
