import { Language } from "../model";

export interface LanguageRepository {
  existsByCode(code: string): Promise<boolean>;
  // findIdIdByCode(code: string): Promise<string | undefined>;
  // findByCode(code: string): Promise<Language | undefined>;
  update(language: Omit<Language, "id">): Promise<void>;
  create(language: Language): Promise<void>;
}
