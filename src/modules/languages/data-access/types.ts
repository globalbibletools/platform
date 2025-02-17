import { Language, LanguageMember } from "../model";

export interface LanguageRepository {
  existsByCode(code: string): Promise<boolean>;
  findByCode(code: string): Promise<Language | undefined>;
  update(language: Omit<Language, "id">): Promise<void>;
  create(language: Language): Promise<void>;
}

export interface LanguageMemberRepository {
  create(member: LanguageMember): Promise<void>;
  delete(languageId: string, memberId: string): Promise<void>;
}
