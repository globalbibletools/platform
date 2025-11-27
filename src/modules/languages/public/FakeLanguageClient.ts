import { beforeEach } from "vitest";
import { LanguageMemberRoleRaw } from "../model";
import { PublicLanguageView } from "./types";

interface LanguageMember {
  userId: string;
  roles: LanguageMemberRoleRaw[];
}

interface Language {
  id: string;
  code: string;
  englishName: string;
  localName: string;
  members: LanguageMember[];
}

const fakeLanguageClient = {
  languages: [] as Language[],

  reset() {
    this.languages = [];
  },

  async removeUserFromLanguages(userId: string): Promise<void> {
    for (const language of this.languages) {
      language.members = language.members.filter(
        (member) => member.userId !== userId,
      );
    }
  },

  async findAllForUser(userId: string): Promise<PublicLanguageView[]> {
    return this.languages
      .filter((lang) => lang.members.some((member) => member.userId === userId))
      .map((lang) => ({
        id: lang.id,
        englishName: lang.englishName,
        localName: lang.localName,
        code: lang.code,
      }));
  },
};
export default fakeLanguageClient;

beforeEach(() => {
  fakeLanguageClient.reset();
});
