import { beforeEach } from "vitest";
import { Language } from "../model";

const mockLanguageRepo = {
  languages: [] as Language[],

  async existsById(id: string): Promise<boolean> {
    return this.languages.some((l) => l.id === id);
  },

  async existsByCode(code: string): Promise<boolean> {
    return this.languages.some((l) => l.code === code);
  },

  async findByCode(code: string): Promise<Language | undefined> {
    return this.languages.find((l) => l.code === code);
  },

  async update(lang: Language): Promise<void> {
    const index = this.languages.findIndex((l) => l.code === lang.code);
    this.languages[index] = {
      ...this.languages[index],
      ...lang,
    };
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
