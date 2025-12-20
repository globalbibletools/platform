import languageMemberRepository from "../data-access/languageMemberRepository";
import { languageQueryService } from "../data-access/LanguageQueryService";
import RemoveUserFromLanguages from "../use-cases/RemoveUserFromLanguages";
import { PublicLanguageView } from "./types";

const removeUserFromLanguagesUseCase = new RemoveUserFromLanguages(
  languageMemberRepository,
);

export const languageClient = {
  // Eventually, this should be handled by an event from the user system
  // rather than a direct call.
  async removeUserFromLanguages(userId: string): Promise<void> {
    await removeUserFromLanguagesUseCase.execute({ userId });
  },

  async findAllForUser(userId: string): Promise<PublicLanguageView[]> {
    const languages = await languageQueryService.findForMember(userId);

    return languages.map((lang) => ({
      id: lang.id,
      name: lang.name,
      code: lang.code,
    }));
  },
};
