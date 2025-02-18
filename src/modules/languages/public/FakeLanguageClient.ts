import { beforeEach } from "vitest";
import { LanguageMemberRoleRaw } from "../model";

interface LanguageMember {
  userId: string;
  roles: LanguageMemberRoleRaw[];
}

interface Language {
  id: string;
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
};
export default fakeLanguageClient;

beforeEach(() => {
  fakeLanguageClient.reset();
});
