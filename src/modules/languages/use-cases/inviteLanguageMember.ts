import { inviteUser } from "@/modules/users";
import { NotFoundError } from "@/shared/errors";
import languageRepository from "../data-access/languageRepository";
import languageMemberRepository from "../data-access/languageMemberRepository";

export interface InviteLanguageMemberRequest {
  code: string;
  email: string;
}

export interface InviteLanguageMemberResponse {
  userId: string;
}

export async function inviteLanguageMember(
  request: InviteLanguageMemberRequest,
): Promise<InviteLanguageMemberResponse> {
  const language = await languageRepository.findByCode(request.code);
  if (!language) throw new NotFoundError("Language");

  const { userId } = await inviteUser({
    email: request.email,
    returnIfActive: true,
  });

  await languageMemberRepository.create({
    languageId: language.id,
    userId,
  });

  return { userId };
}
