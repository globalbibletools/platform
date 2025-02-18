import languageMemberRepository from "../data-access/LanguageMemberRepository";
import RemoveUserFromLanguages from "../use-cases/RemoveUserFromLanguages";

const removeUserFromLanguagesUseCase = new RemoveUserFromLanguages(
  languageMemberRepository,
);

export const languageClient = {
  // Eventually, this should be handled by an event from the user system
  // rather than a direct call.
  async removeUserFromLanguages(userId: string): Promise<void> {
    await removeUserFromLanguagesUseCase.execute({ userId });
  },
};
