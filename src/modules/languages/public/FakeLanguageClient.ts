import { beforeEach } from "vitest";

interface LanguageMember {
  userId: string;
}

interface Language {
  id: string;
  code: string;
  name: string;
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
