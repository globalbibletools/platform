import { beforeEach } from "vitest";
import { Language } from "../model";

const mockLanguageRepo = {
  languages: [] as Language[],

  async existsByCode(code: string): Promise<boolean> {
    return this.languages.some((l) => l.code === code);
  },

  async create(lang: Language): Promise<void> {
    this.languages.push(lang);
  },

  reset() {
    this.languages = [];
  },
};
export default mockLanguageRepo;

beforeEach(() => {
  mockLanguageRepo.reset();
});
