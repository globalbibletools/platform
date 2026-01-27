import { reinviteUser } from "@/modules/users";
import { NotFoundError } from "@/shared/errors";
import languageRepository from "../data-access/languageRepository";
import languageMemberRepository from "../data-access/languageMemberRepository";

export interface ReinviteLanguageMemberRequest {
  code: string;
  userId: string;
}

export async function reinviteLanguageMember(
  request: ReinviteLanguageMemberRequest,
): Promise<void> {
  const language = await languageRepository.findByCode(request.code);
  if (!language) throw new NotFoundError("Language");

  const isMember = await languageMemberRepository.exists(
    language.id,
    request.userId,
  );
  if (!isMember) {
    throw new Error("User is not a member of this language");
  }

  await reinviteUser({ userId: request.userId });
}
