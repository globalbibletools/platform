import languageMemberRepository from "../data-access/languageMemberRepository";

export interface RemoveUserFromLanguagesRequest {
  userId: string;
}

export async function removeUserFromLanguages(
  request: RemoveUserFromLanguagesRequest,
): Promise<void> {
  await languageMemberRepository.deleteAll(request.userId);
}
